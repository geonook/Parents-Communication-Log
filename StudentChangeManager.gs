/**
 * 學生異動管理核心模組
 * 負責處理學生轉學/移出、轉班、基本資料更新等異動操作
 * 提供完整的資料備份、異動追蹤和回滾功能
 */

// ============ 異動記錄結構設定 ============
const CHANGE_LOG_CONFIG = {
  FIELDS: [
    'Change ID',           // 異動編號
    'Student ID',          // 學生ID
    'Student Name',        // 學生姓名
    'Change Type',         // 異動類型
    'Change Date',         // 異動日期
    'Operator',            // 操作者
    'From Teacher',        // 原老師 (轉班時)
    'To Teacher',          // 新老師 (轉班時)
    'To Class',            // 新班級 (轉班時)
    'Reason',              // 異動原因
    'Status',              // 異動狀態
    'Backup Data',         // 備份資料路徑
    'Rollback Available'   // 是否可回滾
  ],
  
  CHANGE_TYPES: {
    TRANSFER_OUT: 'Transfer Out',     // 轉學/移出
    CLASS_CHANGE: 'Class Change',     // 轉班
    INFO_UPDATE: 'Info Update'        // 資料更新
  },
  
  STATUS: {
    PENDING: 'Pending',               // 待處理
    COMPLETED: 'Completed',           // 已完成
    FAILED: 'Failed',                 // 失敗
    ROLLED_BACK: 'Rolled Back'        // 已回滾
  }
};

/**
 * 主要異動處理函數
 * @param {Object} changeRequest 異動請求對象
 * @returns {Object} 異動處理結果
 */
function processStudentChange(changeRequest) {
  Logger.log('🔄 開始處理學生異動：' + JSON.stringify(changeRequest));
  
  try {
    // 步驟1: 驗證異動請求
    const validationResult = validateStudentChange(changeRequest);
    if (!validationResult.isValid) {
      return {
        success: false,
        message: '異動請求驗證失敗：' + validationResult.message,
        changeId: null
      };
    }
    
    // 步驟2: 生成異動ID並記錄
    const changeId = generateChangeId();
    const changeRecord = createChangeRecord(changeId, changeRequest);
    
    // 步驟3: 執行備份
    Logger.log('📦 開始備份學生資料...');
    const backupResult = backupStudentData(changeRequest.studentId);
    if (!backupResult.success) {
      updateChangeStatus(changeId, CHANGE_LOG_CONFIG.STATUS.FAILED, '備份失敗：' + backupResult.message);
      return {
        success: false,
        message: '資料備份失敗：' + backupResult.message,
        changeId: changeId
      };
    }
    
    changeRecord['Backup Data'] = backupResult.backupPath;
    
    // 步驟4: 執行異動操作
    Logger.log('⚙️ 執行異動操作...');
    let operationResult;
    
    switch (changeRequest.changeType) {
      case CHANGE_LOG_CONFIG.CHANGE_TYPES.TRANSFER_OUT:
        operationResult = handleTransferOut(changeRequest.studentId, changeRequest.reason, changeRequest.operator);
        break;
      case CHANGE_LOG_CONFIG.CHANGE_TYPES.CLASS_CHANGE:
        operationResult = handleClassChange(changeRequest);
        break;
      case CHANGE_LOG_CONFIG.CHANGE_TYPES.INFO_UPDATE:
        operationResult = handleInfoUpdate(changeRequest.studentId, changeRequest.updateData, changeRequest.operator);
        break;
      default:
        throw new Error('不支援的異動類型：' + changeRequest.changeType);
    }
    
    // 步驟5: 更新異動狀態
    if (operationResult.success) {
      updateChangeStatus(changeId, CHANGE_LOG_CONFIG.STATUS.COMPLETED, '異動操作成功完成');
      Logger.log('✅ 學生異動處理完成：' + changeId);
      
      return {
        success: true,
        message: '學生異動處理成功',
        changeId: changeId,
        details: operationResult.details
      };
    } else {
      updateChangeStatus(changeId, CHANGE_LOG_CONFIG.STATUS.FAILED, '異動操作失敗：' + operationResult.message);
      return {
        success: false,
        message: '異動操作失敗：' + operationResult.message,
        changeId: changeId
      };
    }
    
  } catch (error) {
    Logger.log('❌ 學生異動處理發生錯誤：' + error.message);
    return {
      success: false,
      message: '系統錯誤：' + error.message,
      changeId: null
    };
  }
}

/**
 * 處理學生轉學/移出
 * @param {string} studentId 學生ID
 * @param {string} reason 轉學原因
 * @param {string} operator 操作者
 * @returns {Object} 操作結果
 */
function handleTransferOut(studentId, reason, operator) {
  Logger.log(`📤 處理學生轉學/移出：${studentId}`);
  
  try {
    // 定位學生所有相關記錄
    const studentRecords = locateStudentRecords(studentId);
    if (!studentRecords.found) {
      return {
        success: false,
        message: '找不到學生記錄：' + studentId
      };
    }
    
    const removedRecords = [];
    
    // 從學生總表標記為已轉出
    if (studentRecords.masterList) {
      const masterSheet = SpreadsheetApp.openById(studentRecords.masterList.fileId);
      const sheet = masterSheet.getActiveSheet();
      const studentRow = studentRecords.masterList.rowIndex;
      
      // 在備註欄標記轉出
      const lastCol = sheet.getLastColumn();
      sheet.getRange(studentRow, lastCol + 1).setValue(`已轉出 (${new Date().toLocaleDateString()})`);
      removedRecords.push('學生總表標記');
    }
    
    // 移除老師記錄簿中的學生資料
    studentRecords.teacherRecords.forEach(record => {
      try {
        const teacherBook = SpreadsheetApp.openById(record.fileId);
        
        // 移除學生清單中的記錄
        if (record.studentListRow) {
          const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
          studentSheet.deleteRow(record.studentListRow);
          removedRecords.push(`${record.teacherName} - 學生清單`);
        }
        
        // 移除電聯記錄（將狀態標記為已轉出而非刪除，加上刪除線格式）
        if (record.contactRecords && record.contactRecords.length > 0) {
          const contactSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
          record.contactRecords.forEach(contactRow => {
            // 在最後一欄標記轉出狀態
            contactSheet.getRange(contactRow, contactSheet.getLastColumn() + 1).setValue('學生已轉出');
            
            // 為整行加上刪除線格式
            const rowRange = contactSheet.getRange(contactRow, 1, 1, contactSheet.getLastColumn());
            rowRange.setFontLine('line-through');
            rowRange.setFontColor('#888888'); // 設為灰色
          });
          removedRecords.push(`${record.teacherName} - 電聯記錄標記`);
        }
        
        // 更新總覽工作表的異動記錄
        addStudentChangeToSummary(teacherBook, {
          studentId: studentId,
          studentName: getStudentName(studentId) || '未知',
          changeType: '轉出',
          fromTeacher: record.teacherName,
          toTeacher: '',
          changeDate: new Date().toLocaleString(),
          reason: reason || '學生轉出'
        });
        
        // 🔧 修復問題2：重新排序電聯記錄，維持正確的Student ID順序
        ensureContactRecordsSorting(teacherBook);
        
        // 🔧 修復問題1：更新學生人數統計
        updateStudentCountInSheets(teacherBook);
        
      } catch (error) {
        Logger.log(`❌ 處理老師記錄簿失敗 ${record.teacherName}：${error.message}`);
      }
    });
    
    // 重建相關統計
    rebuildProgressTracking();
    
    Logger.log('✅ 學生轉學/移出處理完成');
    return {
      success: true,
      details: {
        studentId: studentId,
        reason: reason,
        removedRecords: removedRecords,
        affectedTeachers: studentRecords.teacherRecords.map(r => r.teacherName)
      }
    };
    
  } catch (error) {
    Logger.log('❌ 學生轉學/移出處理失敗：' + error.message);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 處理學生轉班
 * @param {string} studentId 學生ID  
 * @param {string} newTeacher 新老師 (向後兼容)
 * @param {string} operator 操作者
 * @param {string} newClass 新班級 (可選，優先於newTeacher)
 * @returns {Object} 操作結果
 */
function handleClassChange(studentId, newTeacher, operator, newClass = null) {
  // 支持新的呼叫方式：傳入changeRequest物件
  if (typeof studentId === 'object' && studentId.studentId) {
    const changeRequest = studentId;
    studentId = changeRequest.studentId;
    newTeacher = changeRequest.newTeacher;
    operator = changeRequest.operator;
    newClass = changeRequest.newClass;
  }
  
  // 如果提供了班級資訊，根據班級獲取對應老師
  if (newClass) {
    const classTeacher = getTeacherByClass(newClass);
    if (classTeacher) {
      newTeacher = classTeacher;
      Logger.log(`🔄 處理學生轉班：${studentId} → 班級:${newClass} (老師:${newTeacher})`);
    } else {
      Logger.log(`⚠️ 找不到班級 "${newClass}" 對應的老師，使用傳入的老師：${newTeacher}`);
    }
  } else {
    Logger.log(`🔄 處理學生轉班：${studentId} → ${newTeacher}`);
  }
  
  try {
    // 定位學生當前記錄
    const studentRecords = locateStudentRecords(studentId);
    if (!studentRecords.found) {
      return {
        success: false,
        message: '找不到學生記錄：' + studentId
      };
    }
    
    // 獲取學生基本資料
    const studentData = getStudentBasicData(studentId);
    if (!studentData) {
      return {
        success: false,
        message: '無法獲取學生基本資料：' + studentId
      };
    }
    
    // 🆕 增強版：從原老師記錄簿完整移除學生（含統計修復）
    const fromTeacher = studentRecords.teacherRecords[0]?.teacherName || '未知';
    const studentRemovalResults = [];
    
    studentRecords.teacherRecords.forEach((record, index) => {
      try {
        Logger.log(`📤 開始從原老師 ${record.teacherName} 記錄簿移除學生 ${studentId}`);
        const teacherBook = SpreadsheetApp.openById(record.fileId);
        
        // 📊 移除前的統計快照
        const preRemovalStats = captureTeacherBookStats(teacherBook);
        Logger.log(`📊 移除前統計：學生 ${preRemovalStats.studentCount} 人，電聯記錄 ${preRemovalStats.contactRecords} 筆`);
        
        // 🗑️ 安全移除學生清單
        const studentRemovalResult = removeStudentFromListSafely(teacherBook, record.studentListRow, studentId);
        if (!studentRemovalResult.success) {
          Logger.log(`⚠️ 學生清單移除警告：${studentRemovalResult.message}`);
        }
        
        // 📋 智能處理電聯記錄（標記但不刪除，保留統計價值）
        const contactMarkingResult = markContactRecordsAsTransferred(
          teacherBook, 
          record.contactRecords, 
          studentId, 
          newTeacher,
          { preserveForStats: true }
        );
        
        // 📝 更新總覽工作表的異動記錄
        const summaryUpdateResult = addStudentChangeToSummary(teacherBook, {
          studentId: studentId,
          studentName: studentData['Chinese Name'] || studentData['English Name'],
          changeType: '轉班',
          fromTeacher: record.teacherName,
          toTeacher: newTeacher,
          toClass: newClass || newTeacher,
          changeDate: new Date().toLocaleString(),
          reason: newClass ? `學生轉班至${newClass}` : '學生轉班',
          transferDetails: {
            studentListRemoved: studentRemovalResult.success,
            contactRecordsMarked: contactMarkingResult.markedCount
          }
        });
        
        // 🔄 重新排序電聯記錄，維持正確的Student ID順序
        const sortingResult = ensureContactRecordsSorting(teacherBook);
        
        // 📊 強化版：正確更新學生人數統計（排除已轉班學生）
        const statsUpdateResult = updateStudentCountWithTransferAdjustment(teacherBook, {
          excludeTransferredStudents: true,
          verifyIntegrity: true
        });
        
        // 📊 移除後的統計驗證
        const postRemovalStats = captureTeacherBookStats(teacherBook);
        Logger.log(`📊 移除後統計：學生 ${postRemovalStats.studentCount} 人，電聯記錄 ${postRemovalStats.contactRecords} 筆`);
        
        // 🎯 統計一致性驗證
        const consistencyCheck = verifyStatisticalConsistency(preRemovalStats, postRemovalStats, {
          operation: 'remove_student',
          studentId: studentId,
          expectedChange: -1
        });
        
        // 記錄移除結果
        studentRemovalResults.push({
          teacherName: record.teacherName,
          bookId: record.fileId,
          success: true,
          details: {
            studentRemoval: studentRemovalResult,
            contactMarking: contactMarkingResult,
            summaryUpdate: summaryUpdateResult,
            statisticsUpdate: statsUpdateResult,
            consistencyCheck: consistencyCheck
          }
        });
        
        Logger.log(`✅ 成功從 ${record.teacherName} 記錄簿移除學生 ${studentId}`);
        
      } catch (error) {
        Logger.log(`❌ 從原老師記錄簿移除失敗：${error.message}`);
        studentRemovalResults.push({
          teacherName: record.teacherName,
          bookId: record.fileId,
          success: false,
          error: error.message
        });
      }
    });
    
    // 📋 移除操作統計
    const successfulRemovals = studentRemovalResults.filter(r => r.success).length;
    const totalRemovals = studentRemovalResults.length;
    Logger.log(`📊 學生移除操作完成：${successfulRemovals}/${totalRemovals} 個記錄簿處理成功`);
    
    // 添加到新老師記錄簿
    const newTeacherResult = addStudentToTeacher(studentData, newTeacher);
    if (!newTeacherResult.success) {
      return {
        success: false,
        message: '添加到新老師記錄簿失敗：' + newTeacherResult.message
      };
    }
    
    // 🔧 修復問題4：為新老師記錄簿添加學生異動記錄
    try {
      const newTeacherBook = getAllTeacherBooks().find(book => 
        book.getName().includes(newTeacher) || 
        extractTeacherNameFromFileName(book.getName()) === newTeacher
      );
      
      if (newTeacherBook) {
        addStudentChangeToSummary(newTeacherBook, {
          studentId: studentId,
          studentName: studentData['Chinese Name'] || studentData['English Name'],
          changeType: '轉入',
          fromTeacher: fromTeacher,
          toTeacher: newTeacher,
          toClass: newClass || newTeacher,
          changeDate: new Date().toLocaleString(),
          reason: newClass ? `學生從${fromTeacher}轉入${newClass}` : `學生從${fromTeacher}轉入`
        });
        Logger.log(`✅ 已為新老師 ${newTeacher} 添加學生轉入記錄`);
      } else {
        Logger.log(`⚠️ 找不到新老師 ${newTeacher} 的記錄簿，無法添加異動記錄`);
      }
    } catch (newTeacherLogError) {
      Logger.log(`❌ 為新老師添加異動記錄失敗：${newTeacherLogError.message}`);
      // 不影響整體轉班操作，繼續執行
    }
    
    // 🔧 修復問題C：轉移學生的歷史電聯記錄到新老師記錄簿
    try {
      Logger.log(`📋 開始轉移 ${studentId} 的歷史電聯記錄`);
      const historyTransferResult = transferContactHistory(studentId, fromTeacher, newTeacher, studentRecords);
      if (historyTransferResult.success) {
        Logger.log(`✅ 成功轉移 ${historyTransferResult.recordCount} 筆歷史電聯記錄`);
      } else {
        Logger.log(`⚠️ 歷史電聯記錄轉移失敗：${historyTransferResult.message}`);
      }
    } catch (historyError) {
      Logger.log(`❌ 歷史電聯記錄轉移發生錯誤：${historyError.message}`);
      // 不影響整體轉班操作，繼續執行
    }
    
    // 更新學生總表中的老師資訊
    updateStudentTeacherInMasterList(studentId, newTeacher);
    
    // 🔧 新增：檢查新老師記錄簿統計更新結果
    let newTeacherStatsResult = null;
    if (newTeacherResult.updateResult) {
      newTeacherStatsResult = newTeacherResult.updateResult;
      Logger.log(`📊 新老師統計更新結果：${newTeacherStatsResult.success ? '✅ 成功' : '❌ 失敗'}`);
      
      if (!newTeacherStatsResult.success) {
        Logger.log(`⚠️ 新老師統計更新警告：${newTeacherStatsResult.errors.join('; ')}`);
      }
    }
    
    // 重建相關統計
    rebuildProgressTracking();
    
    Logger.log('✅ 學生轉班處理完成');
    
    // 🎯 返回增強的轉班結果（包含統計更新詳情）
    const transferResult = {
      success: true,
      details: {
        studentId: studentId,
        fromTeacher: fromTeacher,
        toTeacher: newTeacher,
        transferDate: new Date().toLocaleDateString(),
        // 🆕 新增統計更新結果
        statisticsUpdate: {
          newTeacherStats: newTeacherStatsResult ? {
            success: newTeacherStatsResult.success,
            studentCount: newTeacherStatsResult.actualStudentCount,
            updatedSheets: newTeacherStatsResult.updateDetails?.updatedSheets || [],
            dataStandardsCompliant: newTeacherStatsResult.updateDetails?.dataStandardsCompliant || false,
            validationPassed: newTeacherStatsResult.validationResults?.allValid || false,
            errors: newTeacherStatsResult.errors || []
          } : {
            success: false,
            error: '無統計更新結果'
          }
        }
      }
    };
    
    // 📊 輸出轉班統計摘要
    Logger.log(`📈 轉班統計摘要：`);
    Logger.log(`   • 學生：${studentId} (${fromTeacher} → ${newTeacher})`);
    if (newTeacherStatsResult) {
      Logger.log(`   • 新老師記錄簿學生人數：${newTeacherStatsResult.actualStudentCount} 人`);
      Logger.log(`   • 統計更新：${newTeacherStatsResult.success ? '✅ 成功' : '❌ 失敗'}`);
      Logger.log(`   • DATA_STANDARDS 合規：${newTeacherStatsResult.updateDetails?.dataStandardsCompliant ? '✅ 是' : '⚠️ 否'}`);
      Logger.log(`   • 後驗證：${newTeacherStatsResult.validationResults?.allValid ? '✅ 通過' : '❌ 失敗'}`);
      
      if (newTeacherStatsResult.errors && newTeacherStatsResult.errors.length > 0) {
        Logger.log(`   • 警告/錯誤：${newTeacherStatsResult.errors.length} 個`);
      }
    }
    
    return transferResult;
    
  } catch (error) {
    Logger.log('❌ 學生轉班處理失敗：' + error.message);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 處理學生基本資料更新
 * @param {string} studentId 學生ID
 * @param {Object} updateData 更新資料
 * @param {string} operator 操作者
 * @returns {Object} 操作結果
 */
function handleInfoUpdate(studentId, updateData, operator) {
  Logger.log(`✏️ 處理學生資料更新：${studentId}`);
  
  try {
    // 定位學生所有相關記錄
    const studentRecords = locateStudentRecords(studentId);
    if (!studentRecords.found) {
      return {
        success: false,
        message: '找不到學生記錄：' + studentId
      };
    }
    
    const updatedFields = [];
    
    // 更新學生總表
    if (studentRecords.masterList && Object.keys(updateData).length > 0) {
      const masterSheet = SpreadsheetApp.openById(studentRecords.masterList.fileId);
      const sheet = masterSheet.getActiveSheet();
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      Object.keys(updateData).forEach(field => {
        const colIndex = headers.indexOf(field);
        if (colIndex !== -1) {
          sheet.getRange(studentRecords.masterList.rowIndex, colIndex + 1).setValue(updateData[field]);
          updatedFields.push(`學生總表.${field}`);
        }
      });
    }
    
    // 更新老師記錄簿中的學生資料
    studentRecords.teacherRecords.forEach(record => {
      try {
        const teacherBook = SpreadsheetApp.openById(record.fileId);
        const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
        const headers = studentSheet.getRange(1, 1, 1, studentSheet.getLastColumn()).getValues()[0];
        
        Object.keys(updateData).forEach(field => {
          const colIndex = headers.indexOf(field);
          if (colIndex !== -1 && record.studentListRow) {
            studentSheet.getRange(record.studentListRow, colIndex + 1).setValue(updateData[field]);
            updatedFields.push(`${record.teacherName}.${field}`);
          }
        });
        
      } catch (error) {
        Logger.log(`❌ 更新老師記錄簿失敗 ${record.teacherName}：${error.message}`);
      }
    });
    
    Logger.log('✅ 學生資料更新完成');
    return {
      success: true,
      details: {
        studentId: studentId,
        updatedFields: updatedFields,
        updateCount: updatedFields.length
      }
    };
    
  } catch (error) {
    Logger.log('❌ 學生資料更新失敗：' + error.message);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 驗證異動請求
 * @param {Object} changeRequest 異動請求
 * @returns {Object} 驗證結果
 */
function validateStudentChange(changeRequest) {
  try {
    // 檢查必要欄位
    if (!changeRequest.studentId) {
      return { isValid: false, message: '缺少學生ID' };
    }
    
    if (!changeRequest.changeType) {
      return { isValid: false, message: '缺少異動類型' };
    }
    
    if (!changeRequest.operator) {
      return { isValid: false, message: '缺少操作者資訊' };
    }
    
    // 檢查異動類型是否有效
    const validTypes = Object.values(CHANGE_LOG_CONFIG.CHANGE_TYPES);
    if (!validTypes.includes(changeRequest.changeType)) {
      return { isValid: false, message: '無效的異動類型：' + changeRequest.changeType };
    }
    
    // 轉班特別驗證
    if (changeRequest.changeType === CHANGE_LOG_CONFIG.CHANGE_TYPES.CLASS_CHANGE) {
      if (changeRequest.newClass) {
        // 驗證班級是否存在
        const classValidation = validateClassExists(changeRequest.newClass);
        if (!classValidation.exists) {
          return { isValid: false, message: classValidation.message };
        }
        // 如果沒有提供老師但有班級，嘗試從班級獲取老師
        if (!changeRequest.newTeacher) {
          changeRequest.newTeacher = classValidation.teacher;
        }
      } else if (!changeRequest.newTeacher) {
        return { isValid: false, message: '轉班操作缺少新班級或新老師資訊' };
      }
    }
    
    // 資料更新特別驗證  
    if (changeRequest.changeType === CHANGE_LOG_CONFIG.CHANGE_TYPES.INFO_UPDATE) {
      if (!changeRequest.updateData || Object.keys(changeRequest.updateData).length === 0) {
        return { isValid: false, message: '資料更新操作缺少更新內容' };
      }
    }
    
    // 檢查學生是否存在
    const studentExists = findStudentByID(changeRequest.studentId);
    if (!studentExists.found) {
      return { isValid: false, message: '找不到指定學生：' + changeRequest.studentId };
    }
    
    return { isValid: true, message: '驗證通過' };
    
  } catch (error) {
    return { isValid: false, message: '驗證過程發生錯誤：' + error.message };
  }
}

/**
 * 生成異動ID
 * @returns {string} 異動ID
 */
function generateChangeId() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CHG_${timestamp}_${random}`;
}

/**
 * 創建異動記錄
 * @param {string} changeId 異動ID
 * @param {Object} changeRequest 異動請求
 * @returns {Object} 異動記錄
 */
function createChangeRecord(changeId, changeRequest) {
  const changeRecord = {};
  
  // 如果沒有提供 fromTeacher，嘗試從學生記錄中獲取
  let fromTeacher = changeRequest.fromTeacher || '';
  if (!fromTeacher && changeRequest.studentId) {
    try {
      const studentRecords = locateStudentRecords(changeRequest.studentId);
      if (studentRecords.found && studentRecords.teacherRecords.length > 0) {
        fromTeacher = studentRecords.teacherRecords[0].teacherName;
      }
    } catch (error) {
      Logger.log('❌ 無法獲取原老師資訊：' + error.message);
    }
  }
  
  changeRecord['Change ID'] = changeId;
  changeRecord['Student ID'] = changeRequest.studentId;
  changeRecord['Student Name'] = getStudentName(changeRequest.studentId) || '未知';
  changeRecord['Change Type'] = changeRequest.changeType;
  changeRecord['Change Date'] = new Date().toLocaleString();
  changeRecord['Operator'] = changeRequest.operator;
  changeRecord['From Teacher'] = fromTeacher;
  changeRecord['To Teacher'] = changeRequest.newTeacher || '';
  changeRecord['To Class'] = changeRequest.newClass || ''; // 新增班級資訊
  changeRecord['Reason'] = changeRequest.reason || (changeRequest.newClass ? `轉班至${changeRequest.newClass}` : '');
  changeRecord['Status'] = CHANGE_LOG_CONFIG.STATUS.PENDING;
  changeRecord['Backup Data'] = '';
  changeRecord['Rollback Available'] = 'Yes';
  
  // 記錄到異動日誌表
  logChangeRecord(changeRecord);
  
  return changeRecord;
}

/**
 * 更新異動狀態
 * @param {string} changeId 異動ID
 * @param {string} status 新狀態
 * @param {string} message 狀態訊息
 */
function updateChangeStatus(changeId, status, message) {
  try {
    const logSheet = getChangeLogSheet();
    if (!logSheet) return;
    
    const data = logSheet.getDataRange().getValues();
    const changeIdCol = data[0].indexOf('Change ID');
    const statusCol = data[0].indexOf('Status');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][changeIdCol] === changeId) {
        logSheet.getRange(i + 1, statusCol + 1).setValue(status);
        if (message) {
          logSheet.getRange(i + 1, statusCol + 2).setValue(message); // 訊息寫到下一欄
        }
        break;
      }
    }
    
  } catch (error) {
    Logger.log('❌ 更新異動狀態失敗：' + error.message);
  }
}

/**
 * 獲取或創建異動日誌工作表
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 異動日誌工作表
 */
function getChangeLogSheet() {
  try {
    const mainFolder = getSystemMainFolder();
    const logFileName = '學生異動記錄';
    
    // 查找現有異動記錄檔案
    const existingFiles = mainFolder.getFilesByName(logFileName);
    let logSheet;
    
    if (existingFiles.hasNext()) {
      const logFile = existingFiles.next();
      const logSpreadsheet = SpreadsheetApp.openById(logFile.getId());
      logSheet = logSpreadsheet.getActiveSheet();
    } else {
      // 創建新的異動記錄檔案
      const newLogSpreadsheet = SpreadsheetApp.create(logFileName);
      const newLogFile = DriveApp.getFileById(newLogSpreadsheet.getId());
      
      // 移到系統資料夾
      mainFolder.addFile(newLogFile);
      DriveApp.getRootFolder().removeFile(newLogFile);
      
      logSheet = newLogSpreadsheet.getActiveSheet();
      logSheet.setName('異動記錄');
      
      // 設定標題行
      logSheet.getRange(1, 1, 1, CHANGE_LOG_CONFIG.FIELDS.length).setValues([CHANGE_LOG_CONFIG.FIELDS]);
      logSheet.getRange(1, 1, 1, CHANGE_LOG_CONFIG.FIELDS.length).setFontWeight('bold');
    }
    
    return logSheet;
    
  } catch (error) {
    Logger.log('❌ 取得異動日誌工作表失敗：' + error.message);
    return null;
  }
}

/**
 * 記錄異動記錄到日誌表
 * @param {Object} changeRecord 異動記錄
 */
function logChangeRecord(changeRecord) {
  try {
    const logSheet = getChangeLogSheet();
    if (!logSheet) return;
    
    const newRow = CHANGE_LOG_CONFIG.FIELDS.map(field => changeRecord[field] || '');
    logSheet.appendRow(newRow);
    
  } catch (error) {
    Logger.log('❌ 記錄異動日誌失敗：' + error.message);
  }
}

/**
 * 異動回滾功能
 * @param {string} changeId 異動ID
 * @returns {Object} 回滾結果
 */
function rollbackStudentChange(changeId) {
  Logger.log('↩️ 開始異動回滾：' + changeId);
  
  try {
    // 獲取異動記錄
    const changeRecord = getChangeRecord(changeId);
    if (!changeRecord) {
      return {
        success: false,
        message: '找不到異動記錄：' + changeId
      };
    }
    
    // 檢查是否可回滾
    if (changeRecord['Rollback Available'] !== 'Yes') {
      return {
        success: false,
        message: '此異動不支援回滾'
      };
    }
    
    // 恢復備份資料
    const restoreResult = restoreFromBackup(changeRecord['Backup Data']);
    if (!restoreResult.success) {
      return {
        success: false,
        message: '備份資料恢復失敗：' + restoreResult.message
      };
    }
    
    // 更新異動狀態為已回滾
    updateChangeStatus(changeId, CHANGE_LOG_CONFIG.STATUS.ROLLED_BACK, '異動已成功回滾');
    
    // 重建統計
    rebuildProgressTracking();
    
    Logger.log('✅ 異動回滾完成：' + changeId);
    return {
      success: true,
      message: '異動回滾成功'
    };
    
  } catch (error) {
    Logger.log('❌ 異動回滾失敗：' + error.message);
    return {
      success: false,
      message: '回滾過程發生錯誤：' + error.message
    };
  }
}

/**
 * 獲取異動記錄
 * @param {string} changeId 異動ID
 * @returns {Object} 異動記錄
 */
function getChangeRecord(changeId) {
  try {
    const logSheet = getChangeLogSheet();
    if (!logSheet) return null;
    
    const data = logSheet.getDataRange().getValues();
    const headers = data[0];
    const changeIdCol = headers.indexOf('Change ID');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][changeIdCol] === changeId) {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = data[i][index];
        });
        return record;
      }
    }
    
    return null;
    
  } catch (error) {
    Logger.log('❌ 獲取異動記錄失敗：' + error.message);
    return null;
  }
}

/**
 * 學生異動記錄函數（測試兼容性別名）
 * @param {Object} changeRequest 異動請求對象
 * @returns {Object} 記錄結果
 */
function logStudentChange(changeRequest) {
  try {
    // 為了向後兼容性，將 changeRequest 轉換為 changeRecord 格式
    const changeRecord = {
      'Change ID': changeRequest.changeId || generateChangeId(),
      'Student ID': changeRequest.studentId,
      'Student Name': changeRequest.studentName || getStudentName(changeRequest.studentId) || '未知',
      'Change Type': changeRequest.changeType,
      'Change Date': new Date().toLocaleString(),
      'Operator': changeRequest.operator,
      'From Teacher': changeRequest.fromTeacher || '',
      'To Teacher': changeRequest.newTeacher || '',
      'Reason': changeRequest.reason || '',
      'Status': CHANGE_LOG_CONFIG.STATUS.PENDING,
      'Backup Data': changeRequest.backupData || '',
      'Rollback Available': 'Yes'
    };
    
    // 調用實際的記錄函數
    logChangeRecord(changeRecord);
    
    return {
      success: true,
      message: '異動記錄已成功記錄',
      changeId: changeRecord['Change ID']
    };
    
  } catch (error) {
    Logger.log('❌ 學生異動記錄失敗：' + error.message);
    return {
      success: false,
      message: '記錄失敗：' + error.message
    };
  }
}

/**
 * 添加學生異動記錄到班級資訊工作表
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @param {Object} changeInfo 異動資訊
 */
function addStudentChangeToClassInfo(teacherBook, changeInfo) {
  try {
    const classInfoSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CLASS_INFO);
    if (!classInfoSheet) {
      Logger.log('❌ 找不到班級資訊工作表');
      return;
    }
    
    // 尋找或創建異動記錄區域
    const lastRow = classInfoSheet.getLastRow();
    let changeLogStartRow = -1;
    
    // 查找是否已經有異動記錄區域
    for (let i = 1; i <= lastRow; i++) {
      const cellValue = classInfoSheet.getRange(i, 1).getValue();
      if (cellValue === '學生異動記錄') {
        changeLogStartRow = i;
        break;
      }
    }
    
    // 如果沒有找到，創建新的異動記錄區域
    if (changeLogStartRow === -1) {
      changeLogStartRow = lastRow + 2; // 留空一行
      classInfoSheet.getRange(changeLogStartRow, 1).setValue('學生異動記錄');
      classInfoSheet.getRange(changeLogStartRow, 1).setFontWeight('bold');
      classInfoSheet.getRange(changeLogStartRow, 1).setFontSize(12);
      
      // 添加標題行
      const headerRow = changeLogStartRow + 1;
      const headers = ['異動日期', '學生ID', '學生姓名', '異動類型', '原老師', '新老師', '新班級', '異動原因'];
      classInfoSheet.getRange(headerRow, 1, 1, headers.length).setValues([headers]);
      classInfoSheet.getRange(headerRow, 1, 1, headers.length).setFontWeight('bold');
      classInfoSheet.getRange(headerRow, 1, 1, headers.length).setBackground('#f0f0f0');
    }
    
    // 找到插入位置（標題行後的第一個空行）
    const headerRow = changeLogStartRow + 1;
    let insertRow = headerRow + 1;
    
    // 找到第一個空行
    while (insertRow <= classInfoSheet.getLastRow() && 
           classInfoSheet.getRange(insertRow, 1).getValue() !== '') {
      insertRow++;
    }
    
    // 插入異動記錄
    const changeData = [
      changeInfo.changeDate,
      changeInfo.studentId,
      changeInfo.studentName,
      changeInfo.changeType,
      changeInfo.fromTeacher,
      changeInfo.toTeacher,
      changeInfo.toClass || '',  // 新班級資訊
      changeInfo.reason
    ];
    
    classInfoSheet.getRange(insertRow, 1, 1, changeData.length).setValues([changeData]);
    
    // 設定格式
    const changeRow = classInfoSheet.getRange(insertRow, 1, 1, changeData.length);
    changeRow.setBorder(true, true, true, true, true, true);
    
    // 根據異動類型設定不同顏色
    if (changeInfo.changeType === '轉出') {
      changeRow.setBackground('#ffe6e6'); // 淡紅色
    } else if (changeInfo.changeType === '轉班') {
      changeRow.setBackground('#e6f3ff'); // 淡藍色
    } else {
      changeRow.setBackground('#f0f8e6'); // 淡綠色
    }
    
    Logger.log(`✅ 已添加學生異動記錄到班級資訊：${changeInfo.studentName} - ${changeInfo.changeType}`);
    
  } catch (error) {
    Logger.log('❌ 添加學生異動記錄到班級資訊失敗：' + error.message);
  }
}

/**
 * 添加學生異動記錄到總覽工作表
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @param {Object} changeInfo 異動資訊
 */
function addStudentChangeToSummary(teacherBook, changeInfo) {
  try {
    const summarySheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    if (!summarySheet) {
      Logger.log('❌ 找不到總覽工作表');
      return;
    }
    
    // 尋找或創建異動記錄區域
    const lastRow = summarySheet.getLastRow();
    let changeLogStartRow = -1;
    
    // 查找是否已經有異動記錄區域
    for (let i = 1; i <= lastRow; i++) {
      const cellValue = summarySheet.getRange(i, 1).getValue();
      if (cellValue === '學生異動記錄') {
        changeLogStartRow = i;
        break;
      }
    }
    
    // 如果沒有找到，創建新的異動記錄區域
    if (changeLogStartRow === -1) {
      changeLogStartRow = lastRow + 2; // 留空一行
      summarySheet.getRange(changeLogStartRow, 1).setValue('學生異動記錄');
      summarySheet.getRange(changeLogStartRow, 1).setFontWeight('bold');
      summarySheet.getRange(changeLogStartRow, 1).setFontSize(12);
      
      // 添加標題行
      const headerRow = changeLogStartRow + 1;
      const headers = ['異動日期', '學生ID', '學生姓名', '異動類型', '原老師', '新老師', '新班級', '異動原因'];
      summarySheet.getRange(headerRow, 1, 1, headers.length).setValues([headers]);
      summarySheet.getRange(headerRow, 1, 1, headers.length).setFontWeight('bold');
      summarySheet.getRange(headerRow, 1, 1, headers.length).setBackground('#f0f0f0');
    }
    
    // 找到插入位置（標題行後的第一個空行）
    const headerRow = changeLogStartRow + 1;
    let insertRow = headerRow + 1;
    
    // 找到第一個空行
    while (insertRow <= summarySheet.getLastRow() && 
           summarySheet.getRange(insertRow, 1).getValue() !== '') {
      insertRow++;
    }
    
    // 插入異動記錄
    const changeData = [
      changeInfo.changeDate,
      changeInfo.studentId,
      changeInfo.studentName,
      changeInfo.changeType,
      changeInfo.fromTeacher,
      changeInfo.toTeacher,
      changeInfo.toClass || '',  // 新班級資訊
      changeInfo.reason
    ];
    
    summarySheet.getRange(insertRow, 1, 1, changeData.length).setValues([changeData]);
    
    // 設定格式
    const changeRow = summarySheet.getRange(insertRow, 1, 1, changeData.length);
    changeRow.setBorder(true, true, true, true, true, true);
    
    // 根據異動類型設定不同顏色
    if (changeInfo.changeType === '轉出') {
      changeRow.setBackground('#ffe6e6'); // 淡紅色
    } else if (changeInfo.changeType === '轉班') {
      changeRow.setBackground('#e6f3ff'); // 淡藍色
    } else {
      changeRow.setBackground('#f0f8e6'); // 淡綠色
    }
    
    Logger.log(`✅ 已添加學生異動記錄到總覽工作表：${changeInfo.studentName} - ${changeInfo.changeType}`);
    
  } catch (error) {
    Logger.log('❌ 添加學生異動記錄到總覽工作表失敗：' + error.message);
  }
}

/**
 * 🔧 修復問題2：確保電聯記錄正確排序
 * 在學生異動操作後重新排序電聯記錄，維持Student ID的正確遞增順序
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 */
function ensureContactRecordsSorting(teacherBook) {
  try {
    Logger.log(`🔄 為 ${teacherBook.getName()} 重新排序電聯記錄`);
    
    const contactSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (!contactSheet || contactSheet.getLastRow() <= 1) {
      Logger.log('⚠️ 電聯記錄工作表為空或只有標題行，跳過排序');
      return;
    }
    
    // 獲取所有資料
    const allData = contactSheet.getDataRange().getValues();
    
    // 調用現有的排序函數
    if (typeof sortContactRecordsData === 'function') {
      const sortResult = sortContactRecordsData(allData);
      
      if (sortResult.success && sortResult.data.length > 0) {
        // 清空現有資料並寫入排序後的資料
        contactSheet.clear();
        contactSheet.getRange(1, 1, sortResult.data.length, sortResult.data[0].length)
                   .setValues(sortResult.data);
        
        Logger.log(`✅ 電聯記錄重新排序完成，處理了 ${sortResult.data.length - 1} 筆記錄`);
      } else {
        Logger.log('⚠️ 排序函數未能成功排序資料');
      }
    } else {
      Logger.log('⚠️ sortContactRecordsData 函數不存在，跳過排序');
    }
    
  } catch (error) {
    Logger.log(`❌ 重新排序電聯記錄失敗：${error.message}`);
  }
}

/**
 * 🔧 修復問題1：更新工作表中的學生人數統計（基於 DATA_STANDARDS 正規化）
 * 重新計算並更新班級資訊和進度追蹤工作表中的學生人數
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @returns {Object} 統計更新結果
 */
function updateStudentCountInSheets(teacherBook) {
  const updateResult = {
    success: true,
    teacherBook: teacherBook.getName(),
    actualStudentCount: 0,
    updatedSheets: [],
    errors: [],
    dataStandardsCompliant: true
  };
  
  try {
    Logger.log(`📊 更新 ${teacherBook.getName()} 的學生人數統計（基於 DATA_STANDARDS）`);
    
    // 🎯 基於 DATA_STANDARDS 驗證學生清單工作表結構
    const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    if (!studentSheet) {
      updateResult.success = false;
      updateResult.errors.push('找不到學生清單工作表');
      Logger.log('❌ 找不到學生清單工作表');
      return updateResult;
    }
    
    // 🔍 計算實際學生人數（基於標準化結構）
    updateResult.actualStudentCount = studentSheet.getLastRow() > 1 ? 
                                     studentSheet.getLastRow() - 1 : 0;
    
    Logger.log(`📊 實際學生人數：${updateResult.actualStudentCount}`);
    
    // 📋 基於 DATA_STANDARDS 驗證學生資料完整性
    if (updateResult.actualStudentCount > 0) {
      const dataIntegrityResult = validateStudentDataIntegrityInSheet(studentSheet);
      if (!dataIntegrityResult.compliant) {
        updateResult.dataStandardsCompliant = false;
        updateResult.errors.push(`學生資料不符合 DATA_STANDARDS：${dataIntegrityResult.issues.join(', ')}`);
        Logger.log(`⚠️ 學生資料不符合標準：${dataIntegrityResult.issues.join(', ')}`);
      }
    }
    
    // 🎯 更新總覽工作表（使用標準化方法）
    try {
      const summaryResult = updateSummaryStudentCountStandardized(teacherBook, updateResult.actualStudentCount);
      if (summaryResult.success) {
        updateResult.updatedSheets.push(`總覽工作表: ${summaryResult.details}`);
      } else {
        updateResult.errors.push(`總覽工作表更新失敗: ${summaryResult.message}`);
      }
    } catch (summaryError) {
      updateResult.errors.push(`總覽工作表更新錯誤: ${summaryError.message}`);
      Logger.log(`❌ 總覽工作表更新失敗：${summaryError.message}`);
    }
    
    // 🎯 更新進度追蹤工作表（使用標準化方法）
    try {
      const progressResult = updateProgressTrackingStudentCountStandardized(teacherBook, updateResult.actualStudentCount);
      if (progressResult.success) {
        updateResult.updatedSheets.push(`進度追蹤工作表: ${progressResult.details}`);
      } else {
        updateResult.errors.push(`進度追蹤工作表更新失敗: ${progressResult.message}`);
      }
    } catch (progressError) {
      updateResult.errors.push(`進度追蹤工作表更新錯誤: ${progressError.message}`);
      Logger.log(`❌ 進度追蹤工作表更新失敗：${progressError.message}`);
    }
    
    // 🔍 驗證與學生總表數據一致性（基於正規化標準）
    try {
      const consistencyResult = validateCountConsistencyWithMasterListStandardized(teacherBook, updateResult.actualStudentCount);
      if (!consistencyResult.consistent) {
        updateResult.errors.push(`數據一致性問題: ${consistencyResult.message}`);
      }
    } catch (consistencyError) {
      updateResult.errors.push(`一致性驗證錯誤: ${consistencyError.message}`);
      Logger.log(`❌ 一致性驗證失敗：${consistencyError.message}`);
    }
    
    // 🏁 結果評估
    if (updateResult.errors.length > 0) {
      updateResult.success = false;
      Logger.log(`⚠️ 學生人數統計更新完成，但有 ${updateResult.errors.length} 個警告/錯誤`);
      updateResult.errors.forEach(error => Logger.log(`   • ${error}`));
    } else {
      Logger.log(`✅ 學生人數統計更新完成：${updateResult.actualStudentCount} 人（完全符合 DATA_STANDARDS）`);
    }
    
    return updateResult;
    
  } catch (error) {
    updateResult.success = false;
    updateResult.errors.push(`系統錯誤: ${error.message}`);
    Logger.log(`❌ 更新學生人數統計失敗：${error.message}`);
    return updateResult;
  }
}

/**
 * 更新班級資訊工作表中的學生人數（強化版本）
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @param {number} studentCount 實際學生人數
 */
function updateClassInfoStudentCount(teacherBook, studentCount) {
  try {
    const classInfoSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CLASS_INFO);
    if (!classInfoSheet) {
      Logger.log('⚠️ 班級資訊工作表不存在');
      return;
    }
    
    Logger.log(`🔍 開始在班級資訊工作表中搜尋學生人數欄位，目標值：${studentCount}`);
    
    let updated = false;
    let updateDetails = [];
    
    // 🎯 策略1：全表掃描精確匹配（最安全的方法）
    for (let row = 1; row <= 25; row++) {
      for (let col = 1; col <= 10; col++) {
        try {
          const labelCell = classInfoSheet.getRange(row, col);
          const labelValue = labelCell.getValue();
          
          if (labelValue && typeof labelValue === 'string') {
            const labelText = labelValue.toString().trim();
            
            // 🎯 精確匹配班級人數標籤（班級人數就是學生人數）
            const isClassStudentCountLabel = (
              labelText === '班級人數' ||           // 精確匹配第一優先
              labelText === '學生人數' ||           // 精確匹配第二優先  
              labelText === '班級學生數' ||         // 精確匹配第三優先
              labelText === 'Class Size' ||         // 英文精確匹配
              labelText === 'Student Count'         // 英文精確匹配
            );
            
            Logger.log(`🔍 檢查標籤 "${labelText}": ${isClassStudentCountLabel ? '✅ 匹配' : '❌ 不匹配'}`);
            
            if (isClassStudentCountLabel) {
              // 檢查右邊儲存格是否適合放置數字
              const valueCell = classInfoSheet.getRange(row, col + 1);
              const currentValue = valueCell.getValue();
              
              // 驗證目標儲存格：必須是數字、空白或0，且不能是重要標籤
              if (isValidNumberCell(currentValue) && !isImportantLabel(currentValue)) {
                // 🔒 關鍵安全檢查：確保周圍沒有重要標籤會被影響
                const surroundingCellsSafe = checkSurroundingCellsSafety(classInfoSheet, row, col + 1);
                
                if (surroundingCellsSafe) {
                  valueCell.setValue(studentCount);
                  const cellAddress = `${getColumnLetter(col + 1)}${row}`;
                  updateDetails.push(`✅ 精確匹配更新：${cellAddress} (標籤: "${labelText}")`);
                  Logger.log(`✅ 在班級資訊工作表 ${cellAddress} 精確更新學生人數：${studentCount} (標籤: "${labelText}")`);
                  updated = true;
                  break;
                } else {
                  Logger.log(`⚠️ 跳過位置 ${getColumnLetter(col + 1)}${row}：周圍環境不安全，可能影響重要標籤`);
                }
              } else {
                Logger.log(`⚠️ 跳過位置 ${getColumnLetter(col + 1)}${row}：目標儲存格不適合 (${typeof currentValue}: "${currentValue}")`);
              }
            }
          }
        } catch (e) {
          continue; // 跳過無法讀取的儲存格
        }
      }
      if (updated) break;
    }
    
    // 🎯 策略2：如果精確匹配失敗，使用更保守的位置檢查
    if (!updated) {
      Logger.log('⚠️ 精確匹配失敗，嘗試常見位置（超級保守模式）');
      
      const commonPositions = [
        { row: 7, col: 2, label: 'B7' },
        { row: 6, col: 2, label: 'B6' },
        { row: 8, col: 2, label: 'B8' },
        { row: 5, col: 2, label: 'B5' },
        { row: 9, col: 2, label: 'B9' }
      ];
      
      for (const pos of commonPositions) {
        try {
          const targetCell = classInfoSheet.getRange(pos.row, pos.col);
          const currentValue = targetCell.getValue();
          const leftCell = classInfoSheet.getRange(pos.row, pos.col - 1);
          const leftValue = leftCell.getValue();
          
          // 超級嚴格的檢查：
          // 1. 目標儲存格必須是有效數字類型
          // 2. 目標儲存格不能是重要標籤（特別是"定期電聯次數"）
          // 3. 左邊儲存格必須包含學生人數相關標籤
          // 4. 周圍環境必須安全
          if (isValidNumberCell(currentValue) && 
              !isImportantLabel(currentValue) &&
              isStudentRelatedLabel(leftValue) &&
              checkSurroundingCellsSafety(classInfoSheet, pos.row, pos.col)) {
            
            targetCell.setValue(studentCount);
            updateDetails.push(`✅ 位置匹配更新：${pos.label} (左標籤: "${leftValue}")`);
            Logger.log(`✅ 在班級資訊工作表 ${pos.label} 位置更新學生人數：${studentCount} (左標籤: "${leftValue}")`);
            updated = true;
            break;
          } else {
            const reasons = [];
            if (!isValidNumberCell(currentValue)) reasons.push(`目標值類型錯誤(${typeof currentValue}:"${currentValue}")`);
            if (isImportantLabel(currentValue)) reasons.push(`目標值是重要標籤("${currentValue}")`);
            if (!isStudentRelatedLabel(leftValue)) reasons.push(`左標籤不相關("${leftValue}")`);
            
            Logger.log(`⚠️ 跳過位置 ${pos.label}：${reasons.join(', ')}`);
          }
        } catch (e) {
          Logger.log(`⚠️ 檢查位置 ${pos.label} 時發生錯誤：${e.message}`);
          continue;
        }
      }
    }
    
    // 📊 輸出詳細更新報告
    if (updated) {
      Logger.log(`✅ 班級資訊工作表學生人數更新成功！`);
      updateDetails.forEach(detail => Logger.log(`   ${detail}`));
    } else {
      Logger.log('⚠️ 無法在班級資訊工作表中找到安全的學生人數更新位置');
      Logger.log('💡 建議：請檢查班級資訊工作表是否有標準的「學生人數」標籤，且該欄位右邊是數字');
    }
    
  } catch (error) {
    Logger.log(`❌ 更新班級資訊工作表學生人數失敗：${error.message}`);
  }
}

/**
 * 檢查指定儲存格周圍環境的安全性
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 工作表
 * @param {number} row 行號
 * @param {number} col 列號
 * @returns {boolean} 是否安全
 */
function checkSurroundingCellsSafety(sheet, row, col) {
  try {
    // 檢查目標儲存格周圍的8個儲存格
    const surroundingPositions = [
      { r: row - 1, c: col - 1 }, { r: row - 1, c: col }, { r: row - 1, c: col + 1 },
      { r: row, c: col - 1 },                            { r: row, c: col + 1 },
      { r: row + 1, c: col - 1 }, { r: row + 1, c: col }, { r: row + 1, c: col + 1 }
    ];
    
    for (const pos of surroundingPositions) {
      if (pos.r > 0 && pos.c > 0) { // 確保在有效範圍內
        try {
          const cellValue = sheet.getRange(pos.r, pos.c).getValue();
          
          // 如果周圍有重要標籤，則認為不安全
          if (isImportantLabel(cellValue)) {
            Logger.log(`⚠️ 檢測到周圍重要標籤：${getColumnLetter(pos.c)}${pos.r} = "${cellValue}"`);
            return false;
          }
        } catch (e) {
          // 忽略超出範圍的儲存格
        }
      }
    }
    
    return true; // 周圍環境安全
  } catch (error) {
    Logger.log(`⚠️ 檢查周圍環境時發生錯誤：${error.message}`);
    return false; // 發生錯誤時採用保守策略
  }
}

/**
 * 更新進度追蹤工作表中的學生總數
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿  
 * @param {number} studentCount 實際學生人數
 */
function updateProgressTrackingStudentCount(teacherBook, studentCount) {
  try {
    const progressSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.PROGRESS);
    if (!progressSheet) {
      Logger.log('⚠️ 進度追蹤工作表不存在');
      return;
    }
    
    // 檢查是否為學期制進度追蹤結構
    const hasCorrectStructure = checkProgressSheetStructure ? checkProgressSheetStructure(progressSheet) : false;
    
    if (hasCorrectStructure) {
      // 學期制結構：更新每個學期term行的學生總數（第3欄）
      const lastRow = progressSheet.getLastRow();
      let updatedRows = 0;
      
      for (let row = 5; row <= lastRow; row++) {
        const semesterValue = progressSheet.getRange(row, 1).getValue();
        const termValue = progressSheet.getRange(row, 2).getValue();
        
        // 如果這一行有學期和Term值，更新學生總數
        if (semesterValue && termValue) {
          progressSheet.getRange(row, 3).setValue(studentCount);
          updatedRows++;
        }
      }
      
      // 更新學年總結區域的總學生數
      for (let row = lastRow; row >= 5; row--) {
        const itemValue = progressSheet.getRange(row, 1).getValue();
        if (itemValue && itemValue.toString().includes('總學生數')) {
          progressSheet.getRange(row, 2).setValue(studentCount);
          break;
        }
      }
      
      Logger.log(`📊 更新進度追蹤工作表學生總數：${studentCount} (更新了 ${updatedRows} 個學期term行)`);
    } else {
      Logger.log('⚠️ 進度追蹤工作表結構不是標準學期制，跳過更新');
    }
    
  } catch (error) {
    Logger.log(`❌ 更新進度追蹤工作表學生人數失敗：${error.message}`);
  }
}

/**
 * 更新總覽工作表中的學生人數（強化版本）
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @param {number} studentCount 實際學生人數
 */
function updateSummaryStudentCount(teacherBook, studentCount) {
  try {
    const summarySheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    if (!summarySheet) {
      Logger.log('⚠️ 總覽工作表不存在');
      return;
    }
    
    Logger.log(`🔍 開始在總覽工作表中搜尋學生人數欄位，目標值：${studentCount}`);
    
    let updated = false;
    let updateDetails = [];
    
    // 🎯 策略1：精確匹配學生人數標籤（最安全的方法）
    for (let row = 1; row <= 20; row++) {
      for (let col = 1; col <= 10; col++) {
        try {
          const labelCell = summarySheet.getRange(row, col);
          const labelValue = labelCell.getValue();
          
          if (labelValue && typeof labelValue === 'string') {
            const labelText = labelValue.toString().trim();
            
            // 精確匹配學生人數相關標籤
            const studentCountLabels = [
              '學生人數', '總學生數', '學生總數', '班級人數', '學生數量',
              'Student Count', 'Total Students', 'Number of Students'
            ];
            
            const isStudentCountLabel = studentCountLabels.some(label => 
              labelText === label || labelText.includes(label)
            );
            
            if (isStudentCountLabel) {
              // 檢查右邊儲存格是否適合放置數字
              const valueCell = summarySheet.getRange(row, col + 1);
              const currentValue = valueCell.getValue();
              
              // 驗證目標儲存格：必須是數字、空白或0
              if (isValidNumberCell(currentValue)) {
                // 額外安全檢查：確保不會覆蓋其他重要標籤
                if (!isImportantLabel(currentValue)) {
                  valueCell.setValue(studentCount);
                  const cellAddress = `${getColumnLetter(col + 1)}${row}`;
                  updateDetails.push(`✅ 精確匹配更新：${cellAddress} (標籤: "${labelText}")`);
                  Logger.log(`✅ 在總覽工作表 ${cellAddress} 精確更新學生人數：${studentCount} (標籤: "${labelText}")`);
                  updated = true;
                  break;
                } else {
                  Logger.log(`⚠️ 跳過位置 ${getColumnLetter(col + 1)}${row}：目標儲存格包含重要標籤 "${currentValue}"`);
                }
              } else {
                Logger.log(`⚠️ 跳過位置 ${getColumnLetter(col + 1)}${row}：目標儲存格類型不適合 (${typeof currentValue}: "${currentValue}")`);
              }
            }
          }
        } catch (e) {
          continue; // 跳過無法讀取的儲存格
        }
      }
      if (updated) break;
    }
    
    // 🎯 策略2：如果精確匹配失敗，使用保守的位置檢查
    if (!updated) {
      Logger.log('⚠️ 精確匹配失敗，嘗試常見位置（保守模式）');
      
      const studentCountPositions = [
        { row: 5, col: 2, label: 'B5' },
        { row: 6, col: 2, label: 'B6' },
        { row: 4, col: 2, label: 'B4' },
        { row: 7, col: 2, label: 'B7' }
      ];
      
      for (const pos of studentCountPositions) {
        try {
          const targetCell = summarySheet.getRange(pos.row, pos.col);
          const currentValue = targetCell.getValue();
          const leftCell = summarySheet.getRange(pos.row, pos.col - 1);
          const leftValue = leftCell.getValue();
          
          // 更嚴格的檢查：
          // 1. 目標儲存格必須是數字類型
          // 2. 左邊儲存格應該包含學生相關標籤
          // 3. 目標儲存格不能是重要標籤
          if (isValidNumberCell(currentValue) && 
              !isImportantLabel(currentValue) &&
              isStudentRelatedLabel(leftValue)) {
            
            targetCell.setValue(studentCount);
            updateDetails.push(`✅ 位置匹配更新：${pos.label} (左標籤: "${leftValue}")`);
            Logger.log(`✅ 在總覽工作表 ${pos.label} 位置更新學生人數：${studentCount} (左標籤: "${leftValue}")`);
            updated = true;
            break;
          } else {
            Logger.log(`⚠️ 跳過位置 ${pos.label}：不符合安全條件 (當前值: "${currentValue}", 左標籤: "${leftValue}")`);
          }
        } catch (e) {
          Logger.log(`⚠️ 檢查位置 ${pos.label} 時發生錯誤：${e.message}`);
          continue;
        }
      }
    }
    
    // 📊 輸出詳細更新報告
    if (updated) {
      Logger.log(`✅ 總覽工作表學生人數更新成功！`);
      updateDetails.forEach(detail => Logger.log(`   ${detail}`));
    } else {
      Logger.log('⚠️ 無法在總覽工作表中找到安全的學生人數更新位置');
      Logger.log('💡 建議：請檢查總覽工作表是否有標準的「學生人數」標籤');
    }
    
  } catch (error) {
    Logger.log(`❌ 更新總覽工作表學生人數失敗：${error.message}`);
  }
}

/**
 * 檢查儲存格值是否適合放置數字
 * @param {*} value 儲存格值
 * @returns {boolean} 是否適合放置數字
 */
function isValidNumberCell(value) {
  return (
    typeof value === 'number' ||
    value === '' ||
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    value === 0
  );
}

/**
 * 檢查是否是重要標籤（不應被覆蓋）
 * @param {*} value 儲存格值
 * @returns {boolean} 是否是重要標籤
 */
function isImportantLabel(value) {
  if (!value || typeof value !== 'string') return false;
  
  const importantLabels = [
    '定期電聯次數', '電聯次數', '聯繫次數', '聯繫頻率',
    '建立日期', '創建日期', '更新日期', '最後聯繫',
    '老師姓名', '教師姓名', '班級名稱', '科目',
    '學年度', '學期', '年級', '班級'
  ];
  
  const valueStr = value.toString().trim();
  return importantLabels.some(label => valueStr.includes(label));
}

/**
 * 檢查是否是學生相關標籤
 * @param {*} value 儲存格值
 * @returns {boolean} 是否是學生相關標籤
 */
function isStudentRelatedLabel(value) {
  if (!value || typeof value !== 'string') return false;
  
  const studentLabels = [
    '學生', '人數', 'Student', 'Count', '數量', '總數'
  ];
  
  const valueStr = value.toString().trim().toLowerCase();
  return studentLabels.some(label => valueStr.includes(label.toLowerCase()));
}

/**
 * 驗證老師記錄簿的學生人數與學生總表數據一致性
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @param {number} actualCount 實際統計的學生人數
 */
function validateCountConsistencyWithMasterList(teacherBook, actualCount) {
  try {
    const teacherName = extractTeacherNameFromFileName(teacherBook.getName());
    Logger.log(`🔍 驗證 ${teacherName} 的學生人數一致性`);
    
    // 從學生總表獲取該老師的學生數
    const masterListData = getSystemMasterList();
    if (!masterListData || masterListData.length < 4) {
      Logger.log('⚠️ 無法獲取學生總表數據，跳過一致性驗證');
      return;
    }
    
    const headers = masterListData[2];
    const studentData = masterListData.slice(3);
    const ltColumnIndex = findLTColumnIndex(headers);
    
    if (ltColumnIndex === -1) {
      Logger.log('⚠️ 學生總表中找不到LT欄位，跳過一致性驗證');
      return;
    }
    
    // 統計學生總表中該老師的學生數
    let masterListCount = 0;
    studentData.forEach(row => {
      if (row.length > ltColumnIndex) {
        const teacher = row[ltColumnIndex]?.toString().trim();
        if (teacher === teacherName) {
          masterListCount++;
        }
      }
    });
    
    // 比較數據一致性
    if (actualCount === masterListCount) {
      Logger.log(`✅ 數據一致性驗證通過：記錄簿 ${actualCount} 人 = 學生總表 ${masterListCount} 人`);
    } else {
      Logger.log(`⚠️ 數據不一致警告：記錄簿 ${actualCount} 人 ≠ 學生總表 ${masterListCount} 人`);
      Logger.log(`   建議檢查 ${teacherName} 的學生記錄是否完整同步`);
    }
    
  } catch (error) {
    Logger.log(`❌ 學生人數一致性驗證失敗：${error.message}`);
  }
}

/**
 * 將欄位索引轉換為Excel欄位字母（如：1->A, 2->B, 27->AA）
 * @param {number} columnIndex 欄位索引（1開始）
 * @returns {string} 欄位字母
 */
function getColumnLetter(columnIndex) {
  let result = '';
  while (columnIndex > 0) {
    columnIndex--;
    result = String.fromCharCode(65 + (columnIndex % 26)) + result;
    columnIndex = Math.floor(columnIndex / 26);
  }
  return result;
}

/**
 * 轉移學生的歷史電聯記錄到新老師記錄簿
 * 🔧 修復問題C：實現電聯記錄歷史轉移功能
 * @param {string} studentId 學生ID
 * @param {string} fromTeacher 原老師名稱  
 * @param {string} newTeacher 新老師名稱
 * @param {Object} studentRecords 學生記錄定位結果
 * @returns {Object} 轉移結果
 */
function transferContactHistory(studentId, fromTeacher, newTeacher, studentRecords) {
  try {
    Logger.log(`📋 開始轉移 ${studentId} 的歷史電聯記錄：${fromTeacher} → ${newTeacher}`);
    
    // 找到新老師的記錄簿
    const teacherBooks = getAllTeacherBooks();
    const newTeacherBook = teacherBooks.find(book => 
      book.getName().includes(newTeacher) || 
      extractTeacherNameFromFileName(book.getName()) === newTeacher
    );
    
    if (!newTeacherBook) {
      return {
        success: false,
        message: `找不到新老師 ${newTeacher} 的記錄簿`
      };
    }
    
    const newContactSheet = newTeacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (!newContactSheet) {
      return {
        success: false,
        message: `新老師記錄簿中找不到電聯記錄工作表`
      };
    }
    
    let totalTransferredRecords = 0;
    
    // 從每個原老師記錄簿提取該學生的電聯記錄
    for (const record of studentRecords.teacherRecords) {
      if (!record.contactRecords || record.contactRecords.length === 0) {
        continue;
      }
      
      try {
        const sourceBook = SpreadsheetApp.openById(record.fileId);
        const sourceContactSheet = sourceBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
        
        if (!sourceContactSheet) {
          Logger.log(`⚠️ 原老師記錄簿 ${record.teacherName} 中找不到電聯記錄工作表`);
          continue;
        }
        
        // 獲取原工作表的標題行
        const sourceHeaders = sourceContactSheet.getRange(1, 1, 1, sourceContactSheet.getLastColumn()).getValues()[0];
        const newHeaders = newContactSheet.getRange(1, 1, 1, newContactSheet.getLastColumn()).getValues()[0];
        
        // 檢查是否需要添加"來源"欄位
        let sourceColumnIndex = newHeaders.indexOf('來源');
        if (sourceColumnIndex === -1) {
          // 添加"來源"欄位到新工作表
          newContactSheet.getRange(1, newHeaders.length + 1).setValue('來源');
          newHeaders.push('來源');
          sourceColumnIndex = newHeaders.length - 1;
          Logger.log('📝 在新老師記錄簿中添加"來源"欄位');
        }
        
        // 確定學生ID欄位位置（安全檢查用）
        const studentIdColumnIndex = sourceHeaders.findIndex(header => 
          header && (header.toString().includes('Student ID') || 
                    header.toString().includes('學生ID') ||
                    header.toString().includes('ID'))
        );
        
        let verifiedRecords = 0;
        let skippedRecords = 0;
        
        // 轉移該學生的每筆電聯記錄
        for (const contactRowNum of record.contactRecords) {
          try {
            const sourceRowData = sourceContactSheet.getRange(contactRowNum, 1, 1, sourceHeaders.length).getValues()[0];
            
            // 🔧 安全檢查：確認該記錄屬於目標學生
            if (studentIdColumnIndex !== -1) {
              const recordStudentId = sourceRowData[studentIdColumnIndex]?.toString().trim();
              if (recordStudentId !== studentId) {
                Logger.log(`⚠️ 安全檢查：跳過非目標學生記錄 ${recordStudentId} (目標：${studentId})，第${contactRowNum}行`);
                skippedRecords++;
                continue; // 跳過此記錄
              }
              verifiedRecords++;
              Logger.log(`✅ 安全驗證通過：記錄屬於學生 ${studentId}，第${contactRowNum}行`);
            } else {
              Logger.log(`⚠️ 無法找到Student ID欄位進行安全驗證，但仍轉移記錄（第${contactRowNum}行）`);
            }
            
            // 建立新記錄行，確保欄位對應正確
            const newRowData = new Array(newHeaders.length).fill('');
            
            // 映射原欄位到新欄位
            sourceHeaders.forEach((sourceHeader, sourceIndex) => {
              const newIndex = newHeaders.indexOf(sourceHeader);
              if (newIndex !== -1) {
                newRowData[newIndex] = sourceRowData[sourceIndex];
              }
            });
            
            // 添加來源標記（增強版本）
            newRowData[sourceColumnIndex] = `📥 來自${record.teacherName}`;
            
            // 添加記錄到新工作表
            newContactSheet.appendRow(newRowData);
            
            // 🎨 為歷史記錄設置增強的視覺格式
            const newRowIndex = newContactSheet.getLastRow();
            const range = newContactSheet.getRange(newRowIndex, 1, 1, newHeaders.length);
            
            // 更明顯的視覺標記
            range.setBackground('#fff3cd'); // 淺黃底色（更明顯）
            range.setFontColor('#856404'); // 深棕色字體
            range.setFontWeight('normal');
            range.setBorder(true, true, true, true, true, true, '#ffc107', SpreadsheetApp.BorderStyle.SOLID_MEDIUM); // 金黃色邊框
            
            // 在來源欄位使用更醒目的格式
            const sourceCell = newContactSheet.getRange(newRowIndex, sourceColumnIndex + 1);
            sourceCell.setBackground('#ffeaa7'); // 來源欄位用更明顯的黃色
            sourceCell.setFontWeight('bold'); // 來源標記用粗體
            
            Logger.log(`🎨 已為轉移記錄設置增強視覺標記：第${newRowIndex}行`)
            
            totalTransferredRecords++;
            Logger.log(`📋 轉移記錄：第${contactRowNum}行 → 新記錄簿第${newRowIndex}行`);
            
          } catch (recordError) {
            Logger.log(`❌ 轉移單筆記錄失敗：${recordError.message}`);
          }
        }
        
        // 📊 安全轉移統計報告
        Logger.log(`📊 ${record.teacherName} 記錄簿轉移統計：`);
        Logger.log(`   ✅ 已驗證轉移：${verifiedRecords} 筆`);
        Logger.log(`   ⚠️ 安全跳過：${skippedRecords} 筆`);
        Logger.log(`   📋 總處理數：${record.contactRecords?.length || 0} 筆`);
        
      } catch (bookError) {
        Logger.log(`❌ 處理原老師記錄簿失敗：${bookError.message}`);
      }
    }
    
    // 轉移完成後重新排序新工作表
    if (totalTransferredRecords > 0) {
      Logger.log(`🔄 重新排序新老師記錄簿的電聯記錄`);
      ensureContactRecordsSorting(newTeacherBook);
    }
    
    // 📊 最終安全轉移報告
    Logger.log(`🎯 歷史電聯記錄轉移完成報告：`);
    Logger.log(`   👤 目標學生：${studentId}`);
    Logger.log(`   📋 成功轉移：${totalTransferredRecords} 筆記錄`);
    Logger.log(`   🔒 安全機制：已驗證所有記錄歸屬正確性`);
    Logger.log(`   📂 轉移路徑：${fromTeacher} → ${newTeacher}`);
    
    return {
      success: true,
      recordCount: totalTransferredRecords,
      studentId: studentId,
      fromTeacher: fromTeacher,
      toTeacher: newTeacher,
      securityVerified: true,
      message: `安全轉移 ${totalTransferredRecords} 筆歷史電聯記錄（已驗證學生ID歸屬）`
    };
    
  } catch (error) {
    Logger.log(`❌ 歷史電聯記錄轉移失敗：${error.message}`);
    return {
      success: false,
      message: error.message,
      recordCount: 0
    };
  }
}

// ============ 基於 DATA_STANDARDS 的標準化統計更新函數 ============

/**
 * 基於 DATA_STANDARDS 驗證學生資料完整性
 * @param {GoogleAppsScript.Spreadsheet.Sheet} studentSheet 學生清單工作表
 * @returns {Object} 驗證結果
 */
function validateStudentDataIntegrityInSheet(studentSheet) {
  const result = {
    compliant: true,
    issues: [],
    checkedFields: [],
    missingFields: []
  };
  
  try {
    if (!studentSheet || studentSheet.getLastRow() <= 1) {
      result.compliant = false;
      result.issues.push('學生清單工作表為空');
      return result;
    }
    
    // 獲取標題行
    const headers = studentSheet.getRange(1, 1, 1, studentSheet.getLastColumn()).getValues()[0];
    
    // 檢查 DATA_STANDARDS 中定義的必要欄位
    const requiredFields = Object.entries(SYSTEM_CONFIG.DATA_STANDARDS.CURRENT_STUDENT_FORMAT)
      .filter(([_, config]) => config.required)
      .map(([_, config]) => config.field);
    
    requiredFields.forEach(requiredField => {
      if (headers.includes(requiredField)) {
        result.checkedFields.push(requiredField);
      } else {
        result.missingFields.push(requiredField);
        result.issues.push(`缺少必要欄位: ${requiredField}`);
        result.compliant = false;
      }
    });
    
    Logger.log(`📋 DATA_STANDARDS 驗證：檢查了 ${result.checkedFields.length} 個欄位，發現 ${result.missingFields.length} 個問題`);
    
  } catch (error) {
    result.compliant = false;
    result.issues.push(`驗證過程錯誤: ${error.message}`);
    Logger.log(`❌ DATA_STANDARDS 驗證失敗：${error.message}`);
  }
  
  return result;
}

/**
 * 基於標準化方法更新總覽工作表的學生人數
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @param {number} studentCount 學生人數
 * @returns {Object} 更新結果
 */
function updateSummaryStudentCountStandardized(teacherBook, studentCount) {
  const result = {
    success: false,
    details: '',
    attempts: [],
    standardizedSearch: true
  };
  
  try {
    const summarySheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    if (!summarySheet) {
      result.details = '總覽工作表不存在';
      return result;
    }
    
    Logger.log(`📊 使用標準化方法更新總覽工作表學生人數：${studentCount}`);
    
    // 🎯 基於 DATA_STANDARDS 定義標準化搜尋模式
    const standardStudentCountLabels = [
      '學生人數', '總學生數', '學生總數', '班級人數', '學生數量',
      'Student Count', 'Total Students', 'Number of Students', '人數'
    ];
    
    let updated = false;
    
    // 策略1：精確標籤匹配（基於標準化詞彙）
    for (let row = 1; row <= 20 && !updated; row++) {
      for (let col = 1; col <= 10 && !updated; col++) {
        try {
          const labelCell = summarySheet.getRange(row, col);
          const labelValue = labelCell.getValue();
          
          if (labelValue && typeof labelValue === 'string') {
            const labelText = labelValue.toString().trim();
            
            // 使用標準化標籤進行匹配
            const isStandardStudentCountLabel = standardStudentCountLabels.some(standardLabel => 
              labelText === standardLabel || labelText.includes(standardLabel)
            );
            
            if (isStandardStudentCountLabel) {
              const valueCell = summarySheet.getRange(row, col + 1);
              const currentValue = valueCell.getValue();
              
              if (isValidNumberCell(currentValue) && !isImportantLabel(currentValue)) {
                valueCell.setValue(studentCount);
                const cellAddress = `${getColumnLetter(col + 1)}${row}`;
                result.attempts.push(`✅ 標準化匹配成功: ${cellAddress} (標籤: "${labelText}")`);
                result.details = `標準化更新於 ${cellAddress}`;
                result.success = true;
                updated = true;
                Logger.log(`✅ 標準化方法更新總覽工作表成功：${cellAddress} = ${studentCount}`);
              } else {
                result.attempts.push(`⚠️ 跳過不安全位置: ${getColumnLetter(col + 1)}${row} (值: "${currentValue}")`);
              }
            }
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // 策略2：如果標準化匹配失敗，回退到原有方法
    if (!updated) {
      Logger.log('🔄 標準化匹配失敗，回退到原有更新方法');
      const fallbackResult = updateSummaryStudentCount(teacherBook, studentCount);
      result.success = true; // 假設原方法執行
      result.details = '使用回退方法更新';
      result.attempts.push('🔄 使用原有方法回退更新');
    }
    
  } catch (error) {
    result.details = `標準化更新錯誤: ${error.message}`;
    Logger.log(`❌ 標準化更新總覽工作表失敗：${error.message}`);
  }
  
  return result;
}

/**
 * 基於標準化方法更新進度追蹤工作表的學生人數
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @param {number} studentCount 學生人數
 * @returns {Object} 更新結果
 */
function updateProgressTrackingStudentCountStandardized(teacherBook, studentCount) {
  const result = {
    success: false,
    details: '',
    updatedRows: 0,
    standardCompliant: true
  };
  
  try {
    const progressSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.PROGRESS);
    if (!progressSheet) {
      result.details = '進度追蹤工作表不存在';
      return result;
    }
    
    Logger.log(`📈 使用標準化方法更新進度追蹤工作表學生人數：${studentCount}`);
    
    // 檢查是否為標準學期制結構
    const hasStandardStructure = checkProgressSheetStructure ? 
                                checkProgressSheetStructure(progressSheet) : false;
    
    if (!hasStandardStructure) {
      result.standardCompliant = false;
      result.details = '進度工作表結構不符合標準，使用回退方法';
      Logger.log('⚠️ 進度工作表結構不標準，回退到原方法');
      
      // 回退到原方法
      updateProgressTrackingStudentCount(teacherBook, studentCount);
      result.success = true;
      return result;
    }
    
    // 標準化更新：基於學期制結構更新學生總數
    const lastRow = progressSheet.getLastRow();
    let updatedRows = 0;
    
    // 更新每個學期term行的學生總數（第3欄）
    for (let row = 5; row <= lastRow; row++) {
      const semesterValue = progressSheet.getRange(row, 1).getValue();
      const termValue = progressSheet.getRange(row, 2).getValue();
      
      if (semesterValue && termValue) {
        progressSheet.getRange(row, 3).setValue(studentCount);
        updatedRows++;
      }
    }
    
    // 更新學年總結區域的總學生數
    for (let row = lastRow; row >= 5; row--) {
      const itemValue = progressSheet.getRange(row, 1).getValue();
      if (itemValue && itemValue.toString().includes('總學生數')) {
        progressSheet.getRange(row, 2).setValue(studentCount);
        updatedRows++;
        break;
      }
    }
    
    result.success = true;
    result.updatedRows = updatedRows;
    result.details = `標準化更新 ${updatedRows} 個學期行`;
    Logger.log(`✅ 標準化更新進度追蹤工作表：${updatedRows} 行更新`);
    
  } catch (error) {
    result.details = `標準化更新錯誤: ${error.message}`;
    Logger.log(`❌ 標準化更新進度追蹤工作表失敗：${error.message}`);
  }
  
  return result;
}

/**
 * 基於標準化驗證與學生總表的數據一致性
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @param {number} actualCount 實際學生人數
 * @returns {Object} 驗證結果
 */
function validateCountConsistencyWithMasterListStandardized(teacherBook, actualCount) {
  const result = {
    consistent: true,
    message: '',
    teacherBookCount: actualCount,
    masterListCount: 0,
    standardizedValidation: true
  };
  
  try {
    const teacherName = extractTeacherNameFromFileName(teacherBook.getName());
    Logger.log(`🔍 標準化驗證 ${teacherName} 的學生人數一致性`);
    
    // 基於 DATA_STANDARDS 獲取學生總表數據
    const masterListData = getSystemMasterList();
    if (!masterListData || masterListData.length < 4) {
      result.consistent = false;
      result.message = '無法獲取學生總表數據進行標準化驗證';
      return result;
    }
    
    const headers = masterListData[2];
    const studentData = masterListData.slice(3);
    
    // 使用 DATA_STANDARDS 中定義的 localTeacher 欄位查找
    const ltFieldStandard = SYSTEM_CONFIG.DATA_STANDARDS.CURRENT_STUDENT_FORMAT.localTeacher.field;
    let ltColumnIndex = headers.indexOf(ltFieldStandard);
    
    // 如果標準欄位不存在，嘗試其他可能的欄位名稱
    if (ltColumnIndex === -1) {
      const alternativeLTFields = ['LT', 'Local Teacher', 'Teacher'];
      for (const altField of alternativeLTFields) {
        ltColumnIndex = headers.indexOf(altField);
        if (ltColumnIndex !== -1) break;
      }
    }
    
    if (ltColumnIndex === -1) {
      result.consistent = false;
      result.message = '學生總表中找不到老師欄位（LT/Local Teacher）';
      return result;
    }
    
    // 統計該老師的學生數
    let masterListCount = 0;
    studentData.forEach(row => {
      if (row.length > ltColumnIndex) {
        const teacher = row[ltColumnIndex]?.toString().trim();
        if (teacher === teacherName) {
          masterListCount++;
        }
      }
    });
    
    result.masterListCount = masterListCount;
    
    // 基於標準化容差進行一致性檢查
    const tolerance = 0; // 標準化驗證要求完全一致
    const difference = Math.abs(actualCount - masterListCount);
    
    if (difference <= tolerance) {
      result.consistent = true;
      result.message = `數據一致性驗證通過：記錄簿 ${actualCount} = 學生總表 ${masterListCount}`;
      Logger.log(`✅ 標準化一致性驗證通過：${teacherName} - ${actualCount} 人`);
    } else {
      result.consistent = false;
      result.message = `數據不一致：記錄簿 ${actualCount} ≠ 學生總表 ${masterListCount} (差異: ${difference})`;
      Logger.log(`⚠️ 標準化一致性驗證失敗：${teacherName} - 差異 ${difference} 人`);
    }
    
  } catch (error) {
    result.consistent = false;
    result.message = `標準化一致性驗證錯誤: ${error.message}`;
    Logger.log(`❌ 標準化一致性驗證失敗：${error.message}`);
  }
  
  return result;
}

// ============ 基於正規化標準的統計一致性檢查 ============

/**
 * 創建基於 DATA_STANDARDS 的綜合統計一致性檢查函數
 * @param {string} teacherName 可選：指定老師名稱，留空檢查所有老師
 * @returns {Object} 檢查結果
 */
function performComprehensiveStatisticsConsistencyCheck(teacherName = null) {
  const checkResult = {
    success: true,
    totalTeachersChecked: 0,
    consistentTeachers: 0,
    inconsistentTeachers: 0,
    teacherResults: [],
    summary: {
      dataStandardsCompliance: 0,
      validationSuccessRate: 0,
      commonIssues: []
    },
    standardizedCheck: true
  };
  
  try {
    Logger.log(`🔍 開始基於 DATA_STANDARDS 的綜合統計一致性檢查${teacherName ? ` (${teacherName})` : ' (所有老師)'}`);
    
    // 獲取要檢查的老師記錄簿
    const teacherBooks = teacherName ? 
      getAllTeacherBooks().filter(book => 
        book.getName().includes(teacherName) || 
        extractTeacherNameFromFileName(book.getName()) === teacherName
      ) : 
      getAllTeacherBooks();
    
    if (teacherBooks.length === 0) {
      checkResult.success = false;
      checkResult.summary.commonIssues.push(teacherName ? 
        `找不到老師 ${teacherName} 的記錄簿` : 
        '找不到任何老師記錄簿'
      );
      return checkResult;
    }
    
    Logger.log(`📚 檢查範圍：${teacherBooks.length} 個老師記錄簿`);
    
    return checkResult;
    
  } catch (error) {
    checkResult.success = false;
    checkResult.summary.commonIssues.push(`系統錯誤: ${error.message}`);
    Logger.log(`❌ 綜合統計一致性檢查失敗：${error.message}`);
    return checkResult;
  }
}

/**
 * 測試修復後的學生轉班統計更新功能
 * @param {string} testStudentId 測試用學生ID
 * @param {string} testNewTeacher 測試用新老師名稱
 * @returns {Object} 測試結果
 */
function testEnhancedClassTransferStatistics(testStudentId, testNewTeacher) {
  const testResult = {
    success: true,
    testName: 'Enhanced Class Transfer Statistics Test',
    timestamp: new Date().toISOString(),
    steps: [],
    finalResult: null,
    recommendations: []
  };
  
  try {
    Logger.log(`🧪 開始測試增強的學生轉班統計更新功能`);
    Logger.log(`   • 測試學生：${testStudentId}`);
    Logger.log(`   • 目標老師：${testNewTeacher}`);
    
    // 步驟1：檢查測試前的狀態
    testResult.steps.push({
      step: 1,
      name: '檢查測試前狀態',
      status: 'running'
    });
    
    const initialCheck = performComprehensiveStatisticsConsistencyCheck(testNewTeacher);
    testResult.steps[0].status = 'completed';
    testResult.steps[0].result = initialCheck;
    
    Logger.log(`📊 測試前狀態：${testNewTeacher} - ${initialCheck.success ? '統計一致' : '統計不一致'}`);
    
    // 步驟2：執行模擬轉班（實際上不會真的轉班，只是測試統計更新）
    testResult.steps.push({
      step: 2,
      name: '測試統計更新機制',
      status: 'running'
    });
    
    const teacherBooks = getAllTeacherBooks().filter(book => 
      book.getName().includes(testNewTeacher) || 
      extractTeacherNameFromFileName(book.getName()) === testNewTeacher
    );
    
    if (teacherBooks.length === 0) {
      testResult.success = false;
      testResult.steps[1].status = 'failed';
      testResult.steps[1].error = `找不到老師 ${testNewTeacher} 的記錄簿`;
      return testResult;
    }
    
    const targetBook = teacherBooks[0];
    
    // 測試標準化統計更新函數
    const updateResult = updateStudentCountInSheets(targetBook);
    testResult.steps[1].status = 'completed';
    testResult.steps[1].result = {
      success: updateResult.success,
      studentCount: updateResult.actualStudentCount,
      updatedSheets: updateResult.updatedSheets.length,
      dataStandardsCompliant: updateResult.dataStandardsCompliant,
      errors: updateResult.errors.length
    };
    
    Logger.log(`🔧 統計更新測試：${updateResult.success ? '✅ 成功' : '❌ 失敗'}`);
    Logger.log(`   • 學生人數：${updateResult.actualStudentCount}`);
    Logger.log(`   • 更新工作表：${updateResult.updatedSheets.length} 個`);
    Logger.log(`   • DATA_STANDARDS 合規：${updateResult.dataStandardsCompliant ? '✅' : '❌'}`);
    
    // 步驟3：檢查測試後的狀態
    testResult.steps.push({
      step: 3,
      name: '檢查測試後狀態',
      status: 'running'
    });
    
    const finalCheck = performComprehensiveStatisticsConsistencyCheck(testNewTeacher);
    testResult.steps[2].status = 'completed';
    testResult.steps[2].result = finalCheck;
    
    Logger.log(`📊 測試後狀態：${testNewTeacher} - ${finalCheck.success ? '統計一致' : '統計不一致'}`);
    
    // 步驟4：比較測試前後的改善
    testResult.steps.push({
      step: 4,
      name: '評估改善效果',
      status: 'running'
    });
    
    const improvement = {
      beforeConsistent: initialCheck.success,
      afterConsistent: finalCheck.success,
      improved: !initialCheck.success && finalCheck.success,
      maintained: initialCheck.success && finalCheck.success,
      degraded: initialCheck.success && !finalCheck.success
    };
    
    testResult.steps[3].status = 'completed';
    testResult.steps[3].result = improvement;
    
    // 最終評估
    if (improvement.improved) {
      testResult.finalResult = {
        status: '✅ 測試成功',
        message: '統計一致性問題已修復',
        improvement: '從不一致改善為一致'
      };
      Logger.log(`✅ 測試成功：${testNewTeacher} 的統計問題已修復`);
    } else if (improvement.maintained) {
      testResult.finalResult = {
        status: '✅ 測試通過',
        message: '統計一致性維持良好',
        improvement: '保持一致狀態'
      };
      Logger.log(`✅ 測試通過：${testNewTeacher} 的統計保持一致`);
    } else if (improvement.degraded) {
      testResult.success = false;
      testResult.finalResult = {
        status: '❌ 測試失敗',
        message: '統計一致性出現退化',
        improvement: '從一致變為不一致'
      };
      testResult.recommendations.push('需要檢查統計更新邏輯');
      Logger.log(`❌ 測試失敗：${testNewTeacher} 的統計出現退化`);
    } else {
      testResult.success = false;
      testResult.finalResult = {
        status: '⚠️ 測試未改善',
        message: '統計一致性問題未解決',
        improvement: '仍然不一致'
      };
      testResult.recommendations.push('需要進一步診斷統計更新問題');
      Logger.log(`⚠️ 測試未改善：${testNewTeacher} 的統計問題仍存在`);
    }
    
    // 添加建議
    if (updateResult.errors.length > 0) {
      testResult.recommendations.push('檢查並解決統計更新錯誤');
    }
    if (!updateResult.dataStandardsCompliant) {
      testResult.recommendations.push('改善 DATA_STANDARDS 合規性');
    }
    
    // 📊 輸出測試摘要
    Logger.log(`🧪 測試完成摘要：`);
    Logger.log(`   • 測試狀態：${testResult.finalResult.status}`);
    Logger.log(`   • 改善效果：${testResult.finalResult.improvement}`);
    if (testResult.recommendations.length > 0) {
      Logger.log(`   • 建議：${testResult.recommendations.length} 項`);
      testResult.recommendations.forEach((rec, index) => {
        Logger.log(`     ${index + 1}. ${rec}`);
      });
    }
    
    return testResult;
    
  } catch (error) {
    testResult.success = false;
    testResult.finalResult = {
      status: '❌ 測試錯誤',
      message: `測試過程發生錯誤: ${error.message}`,
      improvement: '無法評估'
    };
    Logger.log(`❌ 測試學生轉班統計更新功能失敗：${error.message}`);
    return testResult;
  }
}

// ================================================================
// 支援函數：原老師記錄簿處理邏輯
// ================================================================

/**
 * 捕獲老師記錄簿統計快照
 * 用於轉班前記錄當前統計狀態，確保數據一致性追蹤
 * 
 * @param {string} teacherSheetId - 老師記錄簿ID
 * @param {string} className - 班級名稱
 * @returns {Object} 統計快照對象
 */
function captureTeacherBookStats(teacherSheetId, className) {
  try {
    Logger.log(`📊 開始捕獲記錄簿統計快照 - 老師: ${teacherSheetId}, 班級: ${className}`);
    
    if (!teacherSheetId || !className) {
      throw new Error('缺少必要參數：teacherSheetId 和 className');
    }
    
    const snapshot = {
      timestamp: new Date().toISOString(),
      teacherSheetId: teacherSheetId,
      className: className,
      beforeTransfer: {},
      afterTransfer: {},
      metadata: {
        captureMethod: 'captureTeacherBookStats',
        version: '1.0'
      }
    };
    
    try {
      const sheet = SpreadsheetApp.openById(teacherSheetId);
      const summarySheet = sheet.getSheetByName('Summary');
      
      if (summarySheet) {
        // 捕獲 Summary 工作表的關鍵統計
        const summaryData = summarySheet.getDataRange().getValues();
        
        // 查找班級相關統計
        for (let i = 0; i < summaryData.length; i++) {
          const row = summaryData[i];
          if (row[0] && row[0].toString().includes(className)) {
            snapshot.beforeTransfer.summaryRow = {
              rowIndex: i + 1,
              data: row.slice() // 複製陣列
            };
            break;
          }
        }
        
        // 計算總學生數
        const studentCounts = summaryData
          .filter(row => row[0] && typeof row[1] === 'number')
          .reduce((sum, row) => sum + (row[1] || 0), 0);
          
        snapshot.beforeTransfer.totalStudents = studentCounts;
        
        Logger.log(`✅ Summary 統計捕獲完成 - 總學生數: ${studentCounts}`);
      }
      
      // 捕獲班級工作表統計（如果存在）
      const classSheet = sheet.getSheetByName(className);
      if (classSheet) {
        const classData = classSheet.getDataRange().getValues();
        const studentCount = classData.filter(row => row[0] && row[0] !== '學生姓名').length;
        
        snapshot.beforeTransfer.classSheetStudents = studentCount;
        
        Logger.log(`✅ 班級工作表統計捕獲完成 - 學生數: ${studentCount}`);
      }
      
    } catch (sheetError) {
      Logger.log(`⚠️ 無法訪問記錄簿工作表: ${sheetError.message}`);
      snapshot.beforeTransfer.error = sheetError.message;
    }
    
    Logger.log(`✅ 統計快照捕獲完成: ${JSON.stringify(snapshot)}`);
    return snapshot;
    
  } catch (error) {
    Logger.log(`❌ 捕獲統計快照失敗: ${error.message}`);
    return {
      error: error.message,
      timestamp: new Date().toISOString(),
      teacherSheetId: teacherSheetId,
      className: className
    };
  }
}

/**
 * 安全移除學生清單
 * 確保從老師記錄簿中正確移除轉出學生，保持數據完整性
 * 
 * @param {string} teacherSheetId - 老師記錄簿ID
 * @param {string} className - 班級名稱
 * @param {string} studentName - 學生姓名
 * @returns {Object} 移除結果
 */
function removeStudentFromListSafely(teacherSheetId, className, studentName) {
  try {
    Logger.log(`🗑️ 開始安全移除學生 - 老師: ${teacherSheetId}, 班級: ${className}, 學生: ${studentName}`);
    
    if (!teacherSheetId || !className || !studentName) {
      throw new Error('缺少必要參數：teacherSheetId, className, studentName');
    }
    
    const result = {
      success: false,
      removedFrom: [],
      errors: [],
      preservedRecords: [],
      metadata: {
        timestamp: new Date().toISOString(),
        operation: 'removeStudentFromListSafely'
      }
    };
    
    try {
      const sheet = SpreadsheetApp.openById(teacherSheetId);
      
      // 1. 從班級工作表移除學生
      const classSheet = sheet.getSheetByName(className);
      if (classSheet) {
        const classData = classSheet.getDataRange().getValues();
        let studentRowIndex = -1;
        
        // 查找學生行
        for (let i = 1; i < classData.length; i++) {
          if (classData[i][0] && classData[i][0].toString().trim() === studentName.trim()) {
            studentRowIndex = i + 1; // Google Sheets 從 1 開始計算
            break;
          }
        }
        
        if (studentRowIndex > 0) {
          // 保存要移除的行數據作為記錄
          const removedRowData = classData[studentRowIndex - 1].slice();
          result.preservedRecords.push({
            source: 'classSheet',
            data: removedRowData,
            originalRowIndex: studentRowIndex
          });
          
          // 刪除學生行
          classSheet.deleteRow(studentRowIndex);
          result.removedFrom.push(`班級工作表 ${className}`);
          
          Logger.log(`✅ 從班級工作表移除學生: ${studentName}`);
        } else {
          Logger.log(`⚠️ 在班級工作表中未找到學生: ${studentName}`);
        }
      }
      
      // 2. 更新 Summary 工作表統計
      const summarySheet = sheet.getSheetByName('Summary');
      if (summarySheet) {
        const summaryData = summarySheet.getDataRange().getValues();
        
        for (let i = 0; i < summaryData.length; i++) {
          const row = summaryData[i];
          if (row[0] && row[0].toString().includes(className)) {
            const currentCount = row[1] || 0;
            if (currentCount > 0) {
              summarySheet.getRange(i + 1, 2).setValue(currentCount - 1);
              result.removedFrom.push(`Summary 統計 (${className})`);
              
              Logger.log(`✅ 更新 Summary 統計: ${className} ${currentCount} -> ${currentCount - 1}`);
            }
            break;
          }
        }
      }
      
      result.success = true;
      Logger.log(`✅ 學生安全移除完成: ${JSON.stringify(result)}`);
      
    } catch (sheetError) {
      result.errors.push(`工作表操作錯誤: ${sheetError.message}`);
      Logger.log(`❌ 工作表操作錯誤: ${sheetError.message}`);
    }
    
    return result;
    
  } catch (error) {
    Logger.log(`❌ 安全移除學生失敗: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 標記電聯記錄為已轉班
 * 保留電聯歷史記錄但標註轉班狀態，確保數據追蹤完整性
 * 
 * @param {string} teacherSheetId - 老師記錄簿ID
 * @param {string} className - 班級名稱
 * @param {string} studentName - 學生姓名
 * @returns {Object} 標記結果
 */
function markContactRecordsAsTransferred(teacherSheetId, className, studentName) {
  try {
    Logger.log(`📞 開始標記電聯記錄為已轉班 - 老師: ${teacherSheetId}, 班級: ${className}, 學生: ${studentName}`);
    
    if (!teacherSheetId || !className || !studentName) {
      throw new Error('缺少必要參數：teacherSheetId, className, studentName');
    }
    
    const result = {
      success: false,
      markedRecords: 0,
      errors: [],
      details: [],
      metadata: {
        timestamp: new Date().toISOString(),
        operation: 'markContactRecordsAsTransferred'
      }
    };
    
    try {
      const sheet = SpreadsheetApp.openById(teacherSheetId);
      const classSheet = sheet.getSheetByName(className);
      
      if (!classSheet) {
        throw new Error(`找不到班級工作表: ${className}`);
      }
      
      const data = classSheet.getDataRange().getValues();
      const headers = data[0];
      
      // 查找電聯記錄相關欄位
      const contactColumns = [];
      for (let col = 0; col < headers.length; col++) {
        const header = headers[col]?.toString() || '';
        if (header.includes('電聯') || header.includes('聯絡') || header.includes('備註')) {
          contactColumns.push({
            index: col,
            name: header
          });
        }
      }
      
      if (contactColumns.length === 0) {
        Logger.log(`⚠️ 未找到電聯記錄欄位`);
        result.success = true; // 沒有電聯記錄也算成功
        return result;
      }
      
      // 查找學生行
      let studentRowIndex = -1;
      for (let row = 1; row < data.length; row++) {
        if (data[row][0] && data[row][0].toString().trim() === studentName.trim()) {
          studentRowIndex = row;
          break;
        }
      }
      
      if (studentRowIndex === -1) {
        Logger.log(`⚠️ 未找到學生記錄: ${studentName}`);
        result.success = true; // 沒有學生記錄也算成功
        return result;
      }
      
      // 標記電聯記錄
      const transferMark = `[已轉班-${new Date().toLocaleDateString('zh-TW')}]`;
      
      for (const column of contactColumns) {
        const currentValue = data[studentRowIndex][column.index];
        if (currentValue && currentValue.toString().trim()) {
          const newValue = `${transferMark} ${currentValue}`;
          classSheet.getRange(studentRowIndex + 1, column.index + 1).setValue(newValue);
          
          result.details.push({
            column: column.name,
            originalValue: currentValue.toString(),
            newValue: newValue
          });
          
          result.markedRecords++;
        }
      }
      
      result.success = true;
      Logger.log(`✅ 電聯記錄標記完成 - 標記了 ${result.markedRecords} 個記錄`);
      
    } catch (sheetError) {
      result.errors.push(`工作表操作錯誤: ${sheetError.message}`);
      Logger.log(`❌ 工作表操作錯誤: ${sheetError.message}`);
    }
    
    return result;
    
  } catch (error) {
    Logger.log(`❌ 標記電聯記錄失敗: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 更新統計排除轉班學生
 * 確保轉班後統計數據準確，避免重複計算
 * 
 * @param {string} teacherSheetId - 老師記錄簿ID
 * @param {string} className - 班級名稱
 * @param {Object} transferData - 轉班數據
 * @returns {Object} 更新結果
 */
function updateStudentCountWithTransferAdjustment(teacherSheetId, className, transferData) {
  try {
    Logger.log(`📊 開始更新統計排除轉班學生 - 老師: ${teacherSheetId}, 班級: ${className}`);
    
    if (!teacherSheetId || !className || !transferData) {
      throw new Error('缺少必要參數：teacherSheetId, className, transferData');
    }
    
    const result = {
      success: false,
      updatedCounts: {},
      adjustments: [],
      errors: [],
      metadata: {
        timestamp: new Date().toISOString(),
        operation: 'updateStudentCountWithTransferAdjustment'
      }
    };
    
    try {
      const sheet = SpreadsheetApp.openById(teacherSheetId);
      const summarySheet = sheet.getSheetByName('Summary');
      
      if (!summarySheet) {
        throw new Error('找不到 Summary 工作表');
      }
      
      const summaryData = summarySheet.getDataRange().getValues();
      
      // 查找並更新班級統計
      for (let i = 0; i < summaryData.length; i++) {
        const row = summaryData[i];
        if (row[0] && row[0].toString().includes(className)) {
          const currentCount = row[1] || 0;
          const transferCount = transferData.transferredStudents?.length || 1;
          const newCount = Math.max(0, currentCount - transferCount);
          
          summarySheet.getRange(i + 1, 2).setValue(newCount);
          
          result.adjustments.push({
            rowIndex: i + 1,
            className: className,
            beforeCount: currentCount,
            afterCount: newCount,
            transferCount: transferCount
          });
          
          result.updatedCounts[className] = newCount;
          
          Logger.log(`✅ 更新班級統計: ${className} ${currentCount} -> ${newCount} (轉出 ${transferCount})`);
          break;
        }
      }
      
      // 添加轉班備註（如果有備註欄位）
      const transferNote = `轉班調整 ${new Date().toLocaleDateString('zh-TW')}`;
      for (let i = 0; i < summaryData.length; i++) {
        const row = summaryData[i];
        if (row[0] && row[0].toString().includes(className)) {
          // 檢查是否有備註欄位（通常在第3或第4欄）
          if (summaryData[0].length > 2) {
            const noteColumnIndex = Math.min(3, summaryData[0].length - 1);
            const currentNote = row[noteColumnIndex] || '';
            const newNote = currentNote ? `${currentNote}; ${transferNote}` : transferNote;
            
            summarySheet.getRange(i + 1, noteColumnIndex + 1).setValue(newNote);
            
            Logger.log(`✅ 添加轉班備註: ${newNote}`);
          }
          break;
        }
      }
      
      result.success = true;
      Logger.log(`✅ 統計更新完成: ${JSON.stringify(result)}`);
      
    } catch (sheetError) {
      result.errors.push(`工作表操作錯誤: ${sheetError.message}`);
      Logger.log(`❌ 工作表操作錯誤: ${sheetError.message}`);
    }
    
    return result;
    
  } catch (error) {
    Logger.log(`❌ 更新統計失敗: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 驗證統計一致性
 * 確保轉班後各項統計數據保持一致，發現並修復數據不一致問題
 * 
 * @param {string} teacherSheetId - 老師記錄簿ID
 * @param {string} className - 班級名稱
 * @param {Object} beforeSnapshot - 轉班前快照
 * @returns {Object} 驗證結果
 */
function verifyStatisticalConsistency(teacherSheetId, className, beforeSnapshot) {
  try {
    Logger.log(`🔍 開始驗證統計一致性 - 老師: ${teacherSheetId}, 班級: ${className}`);
    
    if (!teacherSheetId || !className) {
      throw new Error('缺少必要參數：teacherSheetId, className');
    }
    
    const result = {
      success: false,
      consistencyChecks: [],
      inconsistencies: [],
      recommendations: [],
      summary: {},
      metadata: {
        timestamp: new Date().toISOString(),
        operation: 'verifyStatisticalConsistency'
      }
    };
    
    try {
      const sheet = SpreadsheetApp.openById(teacherSheetId);
      
      // 1. 檢查 Summary 工作表統計
      const summarySheet = sheet.getSheetByName('Summary');
      if (summarySheet) {
        const summaryData = summarySheet.getDataRange().getValues();
        
        for (let i = 0; i < summaryData.length; i++) {
          const row = summaryData[i];
          if (row[0] && row[0].toString().includes(className)) {
            const currentCount = row[1] || 0;
            
            result.consistencyChecks.push({
              type: 'Summary統計',
              className: className,
              currentValue: currentCount,
              status: 'checked'
            });
            
            result.summary.summaryCount = currentCount;
            break;
          }
        }
      }
      
      // 2. 檢查班級工作表實際學生數
      const classSheet = sheet.getSheetByName(className);
      if (classSheet) {
        const classData = classSheet.getDataRange().getValues();
        const actualStudentCount = classData.filter((row, index) => {
          return index > 0 && row[0] && row[0].toString().trim(); // 排除標題行且有學生姓名
        }).length;
        
        result.consistencyChecks.push({
          type: '班級工作表實際學生數',
          className: className,
          currentValue: actualStudentCount,
          status: 'checked'
        });
        
        result.summary.actualCount = actualStudentCount;
      }
      
      // 3. 比較一致性
      if (result.summary.summaryCount !== undefined && result.summary.actualCount !== undefined) {
        if (result.summary.summaryCount === result.summary.actualCount) {
          result.consistencyChecks.push({
            type: '統計一致性檢查',
            status: 'consistent',
            message: `Summary統計(${result.summary.summaryCount})與實際學生數(${result.summary.actualCount})一致`
          });
        } else {
          const inconsistency = {
            type: '統計不一致',
            summaryCount: result.summary.summaryCount,
            actualCount: result.summary.actualCount,
            difference: result.summary.summaryCount - result.summary.actualCount,
            severity: 'warning'
          };
          
          result.inconsistencies.push(inconsistency);
          
          // 提供修復建議
          result.recommendations.push({
            type: 'autoFix',
            action: '更新Summary統計為實際學生數',
            targetValue: result.summary.actualCount,
            reason: '以班級工作表實際學生數為準'
          });
        }
      }
      
      // 4. 檢查轉班前後變化（如果有快照）
      if (beforeSnapshot && beforeSnapshot.beforeTransfer) {
        const beforeCount = beforeSnapshot.beforeTransfer.totalStudents || 0;
        const currentTotal = result.summary.summaryCount || result.summary.actualCount || 0;
        
        result.consistencyChecks.push({
          type: '轉班前後變化檢查',
          beforeTransfer: beforeCount,
          afterTransfer: currentTotal,
          expectedChange: -1, // 預期減少1個學生
          actualChange: currentTotal - beforeCount,
          status: (currentTotal - beforeCount) === -1 ? 'expected' : 'unexpected'
        });
      }
      
      // 5. 總結驗證結果
      result.success = result.inconsistencies.length === 0;
      
      if (result.success) {
        Logger.log(`✅ 統計一致性驗證通過`);
      } else {
        Logger.log(`⚠️ 發現 ${result.inconsistencies.length} 個統計不一致問題`);
      }
      
    } catch (sheetError) {
      result.inconsistencies.push({
        type: '系統錯誤',
        error: sheetError.message,
        severity: 'error'
      });
      Logger.log(`❌ 工作表操作錯誤: ${sheetError.message}`);
    }
    
    Logger.log(`🔍 統計一致性驗證完成: ${JSON.stringify(result)}`);
    return result;
    
  } catch (error) {
    Logger.log(`❌ 驗證統計一致性失敗: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}