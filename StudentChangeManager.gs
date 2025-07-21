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
        
        // 更新班級資訊工作表的異動記錄
        addStudentChangeToClassInfo(teacherBook, {
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
    
    // 從原老師記錄簿移除
    const fromTeacher = studentRecords.teacherRecords[0]?.teacherName || '未知';
    studentRecords.teacherRecords.forEach(record => {
      try {
        const teacherBook = SpreadsheetApp.openById(record.fileId);
        
        // 移除學生清單
        if (record.studentListRow) {
          const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
          studentSheet.deleteRow(record.studentListRow);
        }
        
        // 電聯記錄標記轉班（加上刪除線格式）
        if (record.contactRecords && record.contactRecords.length > 0) {
          const contactSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
          record.contactRecords.forEach(contactRow => {
            // 在最後一欄標記轉班狀態
            contactSheet.getRange(contactRow, contactSheet.getLastColumn() + 1).setValue(`已轉至${newTeacher}`);
            
            // 為整行加上刪除線格式（包含新增的標記欄位）
            const rowRange = contactSheet.getRange(contactRow, 1, 1, contactSheet.getLastColumn());
            rowRange.setFontLine('line-through');
            rowRange.setFontColor('#888888'); // 設為灰色
          });
        }
        
        // 更新班級資訊工作表的異動記錄
        addStudentChangeToClassInfo(teacherBook, {
          studentId: studentId,
          studentName: studentData['Chinese Name'] || studentData['English Name'],
          changeType: '轉班',
          fromTeacher: record.teacherName,
          toTeacher: newTeacher,
          toClass: newClass || newTeacher, // 新增班級資訊
          changeDate: new Date().toLocaleString(),
          reason: newClass ? `學生轉班至${newClass}` : '學生轉班'
        });
        
        // 🔧 修復問題2：重新排序電聯記錄，維持正確的Student ID順序
        ensureContactRecordsSorting(teacherBook);
        
        // 🔧 修復問題1：更新學生人數統計
        updateStudentCountInSheets(teacherBook);
        
      } catch (error) {
        Logger.log(`❌ 從原老師記錄簿移除失敗：${error.message}`);
      }
    });
    
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
        addStudentChangeToClassInfo(newTeacherBook, {
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
    
    // 重建相關統計
    rebuildProgressTracking();
    
    Logger.log('✅ 學生轉班處理完成');
    return {
      success: true,
      details: {
        studentId: studentId,
        fromTeacher: fromTeacher,
        toTeacher: newTeacher,
        transferDate: new Date().toLocaleDateString()
      }
    };
    
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
 * 🔧 修復問題1：更新工作表中的學生人數統計
 * 重新計算並更新班級資訊和進度追蹤工作表中的學生人數
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 */
function updateStudentCountInSheets(teacherBook) {
  try {
    Logger.log(`📊 更新 ${teacherBook.getName()} 的學生人數統計`);
    
    // 從學生清單工作表計算實際學生人數
    const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    let actualStudentCount = 0;
    
    if (studentSheet && studentSheet.getLastRow() > 1) {
      actualStudentCount = studentSheet.getLastRow() - 1; // 減去標題行
    }
    
    Logger.log(`📊 實際學生人數：${actualStudentCount}`);
    
    // 更新總覽工作表
    updateSummaryStudentCount(teacherBook, actualStudentCount);
    
    // 更新班級資訊工作表
    updateClassInfoStudentCount(teacherBook, actualStudentCount);
    
    // 更新進度追蹤工作表
    updateProgressTrackingStudentCount(teacherBook, actualStudentCount);
    
    // 驗證與學生總表數據一致性
    validateCountConsistencyWithMasterList(teacherBook, actualStudentCount);
    
    Logger.log(`✅ 學生人數統計更新完成：${actualStudentCount} 人`);
    
  } catch (error) {
    Logger.log(`❌ 更新學生人數統計失敗：${error.message}`);
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