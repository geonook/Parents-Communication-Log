/**
 * 資料同步管理模組
 * 負責學生異動後的資料同步、進度重建、完整性檢查
 * 確保異動操作後所有相關資料的一致性
 */

/**
 * 同步學生資料到所有相關記錄
 * @param {string} studentId 學生ID
 * @param {Object} updateData 更新資料
 * @returns {Object} 同步結果
 */
function syncStudentData(studentId, updateData) {
  Logger.log(`🔄 開始同步學生資料：${studentId}`);
  
  try {
    const syncResult = {
      success: true,
      studentId: studentId,
      updatedRecords: [],
      errors: []
    };
    
    // 定位學生所有記錄
    const studentRecords = locateStudentRecords(studentId);
    if (!studentRecords.found) {
      return {
        success: false,
        message: '找不到學生記錄：' + studentId
      };
    }
    
    // 同步學生總表
    if (studentRecords.masterList) {
      const masterSyncResult = syncStudentInMasterList(studentId, updateData, studentRecords.masterList);
      if (masterSyncResult.success) {
        syncResult.updatedRecords.push('學生總表');
      } else {
        syncResult.errors.push('學生總表同步失敗：' + masterSyncResult.message);
      }
    }
    
    // 同步老師記錄簿
    studentRecords.teacherRecords.forEach(record => {
      const teacherSyncResult = syncStudentInTeacherBook(studentId, updateData, record);
      if (teacherSyncResult.success) {
        syncResult.updatedRecords.push(record.teacherName);
      } else {
        syncResult.errors.push(`${record.teacherName} 同步失敗：${teacherSyncResult.message}`);
      }
    });
    
    // 如果有錯誤，將整體結果標記為部分成功
    if (syncResult.errors.length > 0) {
      syncResult.success = false;
      syncResult.message = `部分同步失敗，成功：${syncResult.updatedRecords.length}，失敗：${syncResult.errors.length}`;
    }
    
    Logger.log(`✅ 學生資料同步完成：${syncResult.updatedRecords.length} 個記錄更新`);
    return syncResult;
    
  } catch (error) {
    Logger.log('❌ 同步學生資料失敗：' + error.message);
    return {
      success: false,
      message: '同步過程發生錯誤：' + error.message
    };
  }
}

/**
 * 同步老師記錄簿資料
 * @param {string} teacherId 老師ID
 * @param {Object} updates 更新內容
 * @returns {Object} 同步結果
 */
function syncTeacherRecords(teacherId, updates) {
  Logger.log(`🔄 開始同步老師記錄簿：${teacherId}`);
  
  try {
    const syncResult = {
      success: true,
      teacherId: teacherId,
      updatedSections: [],
      errors: []
    };
    
    // 獲取老師記錄簿
    const teacherBook = getTeacherBookById(teacherId);
    if (!teacherBook) {
      return {
        success: false,
        message: '找不到老師記錄簿：' + teacherId
      };
    }
    
    // 同步各個工作表
    const sectionsToSync = [
      { name: SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST, data: updates.studentList },
      { name: SYSTEM_CONFIG.SHEET_NAMES.CLASS_INFO, data: updates.classInfo },
      { name: SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG, data: updates.contactLog }
    ];
    
    sectionsToSync.forEach(section => {
      if (section.data) {
        const sectionSyncResult = syncTeacherBookSection(teacherBook, section.name, section.data);
        if (sectionSyncResult.success) {
          syncResult.updatedSections.push(section.name);
        } else {
          syncResult.errors.push(`${section.name} 同步失敗：${sectionSyncResult.message}`);
        }
      }
    });
    
    // 重建進度統計
    const progressResult = rebuildProgressTracking(teacherId);
    if (progressResult.success) {
      syncResult.updatedSections.push('進度統計');
    } else {
      syncResult.errors.push('進度統計重建失敗：' + progressResult.message);
    }
    
    if (syncResult.errors.length > 0) {
      syncResult.success = false;
      syncResult.message = `部分同步失敗，成功：${syncResult.updatedSections.length}，失敗：${syncResult.errors.length}`;
    }
    
    Logger.log(`✅ 老師記錄簿同步完成：${syncResult.updatedSections.length} 個區段更新`);
    return syncResult;
    
  } catch (error) {
    Logger.log('❌ 同步老師記錄簿失敗：' + error.message);
    return {
      success: false,
      message: '同步過程發生錯誤：' + error.message
    };
  }
}

/**
 * 同步學生總表資料
 * @param {Object} updates 更新內容
 * @returns {Object} 同步結果
 */
function syncMasterList(updates) {
  Logger.log('🔄 開始同步學生總表');
  
  try {
    const mainFolder = getSystemMainFolder();
    const masterListFiles = mainFolder.getFilesByName('學生總表');
    
    if (!masterListFiles.hasNext()) {
      return {
        success: false,
        message: '找不到學生總表檔案'
      };
    }
    
    const masterListFile = masterListFiles.next();
    const masterSheet = SpreadsheetApp.openById(masterListFile.getId());
    const sheet = masterSheet.getActiveSheet();
    
    const syncResult = {
      success: true,
      updatedRows: 0,
      errors: []
    };
    
    // 處理批量更新
    if (updates.batchUpdates && Array.isArray(updates.batchUpdates)) {
      updates.batchUpdates.forEach(update => {
        try {
          const updateResult = updateRowInSheet(sheet, update.condition, update.data);
          if (updateResult.success) {
            syncResult.updatedRows += updateResult.updatedRows;
          } else {
            syncResult.errors.push(updateResult.message);
          }
        } catch (error) {
          syncResult.errors.push('批量更新失敗：' + error.message);
        }
      });
    }
    
    // 處理新增記錄
    if (updates.newRecords && Array.isArray(updates.newRecords)) {
      updates.newRecords.forEach(record => {
        try {
          const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
          const newRow = headers.map(header => record[header] || '');
          sheet.appendRow(newRow);
          syncResult.updatedRows++;
        } catch (error) {
          syncResult.errors.push('新增記錄失敗：' + error.message);
        }
      });
    }
    
    if (syncResult.errors.length > 0) {
      syncResult.success = false;
      syncResult.message = `部分同步失敗，成功更新：${syncResult.updatedRows} 行`;
    }
    
    Logger.log(`✅ 學生總表同步完成：${syncResult.updatedRows} 行更新`);
    return syncResult;
    
  } catch (error) {
    Logger.log('❌ 同步學生總表失敗：' + error.message);
    return {
      success: false,
      message: '同步過程發生錯誤：' + error.message
    };
  }
}

/**
 * 重建進度統計
 * @param {string} teacherId 老師ID（可選，留空則重建所有）
 * @returns {Object} 重建結果
 */
function rebuildProgressTracking(teacherId = null) {
  Logger.log('🔄 開始重建進度統計');
  
  try {
    const rebuildResult = {
      success: true,
      rebuiltBooks: [],
      errors: []
    };
    
    let teacherBooks = [];
    
    if (teacherId) {
      // 重建指定老師的進度統計
      const teacherBook = getTeacherBookById(teacherId);
      if (teacherBook) {
        teacherBooks = [teacherBook];
      } else {
        return {
          success: false,
          message: '找不到指定老師記錄簿：' + teacherId
        };
      }
    } else {
      // 重建所有老師的進度統計
      teacherBooks = getAllTeacherBooks();
    }
    
    teacherBooks.forEach(book => {
      try {
        const bookRebuildResult = rebuildProgressForTeacherBook(book);
        if (bookRebuildResult.success) {
          rebuildResult.rebuiltBooks.push(book.getName());
        } else {
          rebuildResult.errors.push(`${book.getName()} 重建失敗：${bookRebuildResult.message}`);
        }
      } catch (error) {
        rebuildResult.errors.push(`${book.getName()} 處理失敗：${error.message}`);
      }
    });
    
    if (rebuildResult.errors.length > 0) {
      rebuildResult.success = false;
      rebuildResult.message = `部分重建失敗，成功：${rebuildResult.rebuiltBooks.length}，失敗：${rebuildResult.errors.length}`;
    }
    
    Logger.log(`✅ 進度統計重建完成：${rebuildResult.rebuiltBooks.length} 本記錄簿`);
    return rebuildResult;
    
  } catch (error) {
    Logger.log('❌ 重建進度統計失敗：' + error.message);
    return {
      success: false,
      message: '重建過程發生錯誤：' + error.message
    };
  }
}

/**
 * 重建所有統計資料
 * @returns {Object} 重建結果
 */
function rebuildAllStatistics() {
  Logger.log('🔄 開始重建所有統計資料');
  
  try {
    const rebuildResult = {
      success: true,
      rebuiltSections: [],
      errors: []
    };
    
    // 重建進度統計
    const progressResult = rebuildProgressTracking();
    if (progressResult.success) {
      rebuildResult.rebuiltSections.push('進度統計');
    } else {
      rebuildResult.errors.push('進度統計重建失敗：' + progressResult.message);
    }
    
    // 重建系統統計
    const systemStatsResult = rebuildSystemStatistics();
    if (systemStatsResult.success) {
      rebuildResult.rebuiltSections.push('系統統計');
    } else {
      rebuildResult.errors.push('系統統計重建失敗：' + systemStatsResult.message);
    }
    
    // 重建老師列表
    const teacherListResult = rebuildTeachersList();
    if (teacherListResult.success) {
      rebuildResult.rebuiltSections.push('老師列表');
    } else {
      rebuildResult.errors.push('老師列表重建失敗：' + teacherListResult.message);
    }
    
    if (rebuildResult.errors.length > 0) {
      rebuildResult.success = false;
      rebuildResult.message = `部分重建失敗，成功：${rebuildResult.rebuiltSections.length}，失敗：${rebuildResult.errors.length}`;
    }
    
    Logger.log(`✅ 所有統計資料重建完成：${rebuildResult.rebuiltSections.length} 個區段`);
    return rebuildResult;
    
  } catch (error) {
    Logger.log('❌ 重建所有統計資料失敗：' + error.message);
    return {
      success: false,
      message: '重建過程發生錯誤：' + error.message
    };
  }
}

/**
 * 驗證資料完整性
 * @param {string} studentId 學生ID（可選）
 * @returns {Object} 驗證結果
 */
function validateDataIntegrity(studentId = null) {
  Logger.log('🔍 開始驗證資料完整性');
  
  try {
    const validationResult = {
      success: true,
      issues: [],
      checkedRecords: 0,
      integrityScore: 100
    };
    
    if (studentId) {
      // 驗證特定學生的資料完整性
      const studentValidation = validateStudentDataIntegrity(studentId);
      validationResult.issues.push(...studentValidation.issues);
      validationResult.checkedRecords = 1;
    } else {
      // 驗證所有學生的資料完整性
      const allStudentsValidation = validateAllStudentsDataIntegrity();
      validationResult.issues.push(...allStudentsValidation.issues);
      validationResult.checkedRecords = allStudentsValidation.checkedRecords;
    }
    
    // 計算完整性分數
    if (validationResult.issues.length > 0) {
      const criticalIssues = validationResult.issues.filter(issue => issue.severity === 'critical').length;
      const warningIssues = validationResult.issues.filter(issue => issue.severity === 'warning').length;
      
      validationResult.integrityScore = Math.max(0, 100 - (criticalIssues * 20) - (warningIssues * 5));
      
      if (validationResult.integrityScore < 80) {
        validationResult.success = false;
      }
    }
    
    Logger.log(`✅ 資料完整性驗證完成：${validationResult.checkedRecords} 條記錄，完整性分數：${validationResult.integrityScore}%`);
    return validationResult;
    
  } catch (error) {
    Logger.log('❌ 資料完整性驗證失敗：' + error.message);
    return {
      success: false,
      message: '驗證過程發生錯誤：' + error.message,
      integrityScore: 0
    };
  }
}

/**
 * 備份學生資料
 * @param {string} studentId 學生ID
 * @returns {Object} 備份結果
 */
function backupStudentData(studentId) {
  Logger.log(`📦 開始備份學生資料：${studentId}`);
  
  try {
    const backupData = {
      studentId: studentId,
      backupDate: new Date().toISOString(),
      masterList: null,
      teacherRecords: [],
      contactRecords: []
    };
    
    // 定位學生記錄
    const studentRecords = locateStudentRecords(studentId);
    if (!studentRecords.found) {
      return {
        success: false,
        message: '找不到學生記錄，無法備份'
      };
    }
    
    // 備份學生總表資料
    if (studentRecords.masterList) {
      backupData.masterList = backupStudentFromMasterList(studentId, studentRecords.masterList);
    }
    
    // 備份老師記錄簿資料
    studentRecords.teacherRecords.forEach(record => {
      const teacherBackup = backupStudentFromTeacherBook(studentId, record);
      if (teacherBackup) {
        backupData.teacherRecords.push(teacherBackup);
      }
    });
    
    // 備份電聯記錄
    const contactRecords = getStudentContactRecords(studentId);
    backupData.contactRecords = contactRecords;
    
    // 儲存備份資料
    const backupPath = saveBackupData(backupData);
    
    Logger.log(`✅ 學生資料備份完成：${backupPath}`);
    return {
      success: true,
      backupPath: backupPath,
      backupSize: JSON.stringify(backupData).length
    };
    
  } catch (error) {
    Logger.log('❌ 備份學生資料失敗：' + error.message);
    return {
      success: false,
      message: '備份過程發生錯誤：' + error.message
    };
  }
}

/**
 * 恢復備份資料
 * @param {string} backupPath 備份路徑
 * @returns {Object} 恢復結果
 */
function restoreFromBackup(backupPath) {
  Logger.log(`📂 開始恢復備份資料：${backupPath}`);
  
  try {
    // 載入備份資料
    const backupData = loadBackupData(backupPath);
    if (!backupData) {
      return {
        success: false,
        message: '無法載入備份資料'
      };
    }
    
    const restoreResult = {
      success: true,
      restoredSections: [],
      errors: []
    };
    
    // 恢復學生總表資料
    if (backupData.masterList) {
      const masterRestoreResult = restoreStudentToMasterList(backupData.studentId, backupData.masterList);
      if (masterRestoreResult.success) {
        restoreResult.restoredSections.push('學生總表');
      } else {
        restoreResult.errors.push('學生總表恢復失敗：' + masterRestoreResult.message);
      }
    }
    
    // 恢復老師記錄簿資料
    backupData.teacherRecords.forEach(record => {
      const teacherRestoreResult = restoreStudentToTeacherBook(backupData.studentId, record);
      if (teacherRestoreResult.success) {
        restoreResult.restoredSections.push(record.teacherName);
      } else {
        restoreResult.errors.push(`${record.teacherName} 恢復失敗：${teacherRestoreResult.message}`);
      }
    });
    
    // 恢復電聯記錄
    if (backupData.contactRecords && backupData.contactRecords.length > 0) {
      const contactRestoreResult = restoreContactRecords(backupData.studentId, backupData.contactRecords);
      if (contactRestoreResult.success) {
        restoreResult.restoredSections.push('電聯記錄');
      } else {
        restoreResult.errors.push('電聯記錄恢復失敗：' + contactRestoreResult.message);
      }
    }
    
    if (restoreResult.errors.length > 0) {
      restoreResult.success = false;
      restoreResult.message = `部分恢復失敗，成功：${restoreResult.restoredSections.length}，失敗：${restoreResult.errors.length}`;
    }
    
    Logger.log(`✅ 備份資料恢復完成：${restoreResult.restoredSections.length} 個區段`);
    return restoreResult;
    
  } catch (error) {
    Logger.log('❌ 恢復備份資料失敗：' + error.message);
    return {
      success: false,
      message: '恢復過程發生錯誤：' + error.message
    };
  }
}

/**
 * 同步學生在總表中的資料
 * @param {string} studentId 學生ID
 * @param {Object} updateData 更新資料
 * @param {Object} masterListLocation 總表位置資訊
 * @returns {Object} 同步結果
 */
function syncStudentInMasterList(studentId, updateData, masterListLocation) {
  try {
    const masterSheet = SpreadsheetApp.openById(masterListLocation.fileId);
    const sheet = masterSheet.getActiveSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    let updatedFields = 0;
    
    Object.keys(updateData).forEach(field => {
      const colIndex = headers.indexOf(field);
      if (colIndex !== -1) {
        sheet.getRange(masterListLocation.rowIndex, colIndex + 1).setValue(updateData[field]);
        updatedFields++;
      }
    });
    
    return {
      success: true,
      updatedFields: updatedFields
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 同步學生在老師記錄簿中的資料
 * @param {string} studentId 學生ID
 * @param {Object} updateData 更新資料
 * @param {Object} teacherRecord 老師記錄資訊
 * @returns {Object} 同步結果
 */
function syncStudentInTeacherBook(studentId, updateData, teacherRecord) {
  try {
    const teacherBook = SpreadsheetApp.openById(teacherRecord.fileId);
    const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    
    if (!studentSheet) {
      return {
        success: false,
        message: '找不到學生清單工作表'
      };
    }
    
    const headers = studentSheet.getRange(1, 1, 1, studentSheet.getLastColumn()).getValues()[0];
    
    let updatedFields = 0;
    
    Object.keys(updateData).forEach(field => {
      const colIndex = headers.indexOf(field);
      if (colIndex !== -1 && teacherRecord.studentListRow) {
        studentSheet.getRange(teacherRecord.studentListRow, colIndex + 1).setValue(updateData[field]);
        updatedFields++;
      }
    });
    
    return {
      success: true,
      updatedFields: updatedFields
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 為指定老師記錄簿重建進度統計
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @returns {Object} 重建結果
 */
function rebuildProgressForTeacherBook(teacherBook) {
  try {
    // 獲取或創建進度追蹤工作表
    let progressSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.PROGRESS);
    if (!progressSheet) {
      progressSheet = teacherBook.insertSheet(SYSTEM_CONFIG.SHEET_NAMES.PROGRESS);
    }
    
    // 清空現有資料
    progressSheet.clear();
    
    // 重新計算進度統計
    const progressData = calculateProgressForTeacherBook(teacherBook);
    
    // 寫入新的進度資料
    if (progressData && progressData.length > 0) {
      progressSheet.getRange(1, 1, progressData.length, progressData[0].length).setValues(progressData);
    }
    
    return {
      success: true,
      recordsProcessed: progressData.length - 1 // 減去標題行
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 重建系統統計資料
 * @returns {Object} 重建結果
 */
function rebuildSystemStatistics() {
  try {
    // 更新管理控制台的統計資料
    const stats = calculateSystemStats();
    
    // 這裡可以添加更新控制台資料的邏輯
    
    return {
      success: true,
      stats: stats
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 重建老師列表
 * @returns {Object} 重建結果
 */
function rebuildTeachersList() {
  try {
    // 調用現有的更新老師列表函數
    updateTeachersList();
    
    return {
      success: true
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 驗證學生資料完整性
 * @param {string} studentId 學生ID
 * @returns {Object} 驗證結果
 */
function validateStudentDataIntegrity(studentId) {
  const issues = [];
  
  try {
    // 檢查學生是否存在於學生總表
    const masterListResult = findStudentInMasterList(studentId);
    if (!masterListResult.found) {
      issues.push({
        severity: 'critical',
        type: 'missing_master_record',
        message: `學生 ${studentId} 在學生總表中不存在`
      });
    }
    
    // 檢查學生是否存在於老師記錄簿
    const teacherBooksResult = findStudentInTeacherBooks(studentId);
    if (!teacherBooksResult.found) {
      issues.push({
        severity: 'warning',
        type: 'missing_teacher_record',
        message: `學生 ${studentId} 在老師記錄簿中不存在`
      });
    }
    
    // 檢查資料一致性
    if (masterListResult.found && teacherBooksResult.found) {
      const masterData = masterListResult.student;
      const teacherData = teacherBooksResult.student;
      
      // 比較關鍵欄位
      const keyFields = ['Chinese Name', 'English Name', 'English Class'];
      keyFields.forEach(field => {
        if (masterData[field] !== teacherData[field]) {
          issues.push({
            severity: 'warning',
            type: 'data_inconsistency',
            message: `學生 ${studentId} 的 ${field} 在不同記錄中不一致`
          });
        }
      });
    }
    
    return {
      issues: issues
    };
    
  } catch (error) {
    return {
      issues: [{
        severity: 'critical',
        type: 'validation_error',
        message: '驗證過程發生錯誤：' + error.message
      }]
    };
  }
}

/**
 * 驗證所有學生的資料完整性
 * @returns {Object} 驗證結果
 */
function validateAllStudentsDataIntegrity() {
  const issues = [];
  let checkedRecords = 0;
  
  try {
    // 獲取所有學生ID
    const allStudentIds = getAllStudentIds();
    
    allStudentIds.forEach(studentId => {
      const studentValidation = validateStudentDataIntegrity(studentId);
      issues.push(...studentValidation.issues);
      checkedRecords++;
    });
    
    return {
      issues: issues,
      checkedRecords: checkedRecords
    };
    
  } catch (error) {
    return {
      issues: [{
        severity: 'critical',
        type: 'validation_error',
        message: '批量驗證過程發生錯誤：' + error.message
      }],
      checkedRecords: checkedRecords
    };
  }
}

/**
 * 獲取所有學生ID
 * @returns {Array} 學生ID列表
 */
function getAllStudentIds() {
  const studentIds = new Set();
  
  try {
    // 從學生總表獲取
    const mainFolder = getSystemMainFolder();
    const masterListFiles = mainFolder.getFilesByName('學生總表');
    
    if (masterListFiles.hasNext()) {
      const masterListFile = masterListFiles.next();
      const masterSheet = SpreadsheetApp.openById(masterListFile.getId());
      const sheet = masterSheet.getActiveSheet();
      
      const data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        const headers = data[0];
        const idCol = headers.indexOf('ID');
        
        if (idCol !== -1) {
          for (let i = 1; i < data.length; i++) {
            if (data[i][idCol]) {
              studentIds.add(data[i][idCol]);
            }
          }
        }
      }
    }
    
    // 從老師記錄簿獲取（補充）
    const teacherBooks = getAllTeacherBooks();
    teacherBooks.forEach(book => {
      try {
        const studentSheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
        if (studentSheet) {
          const data = studentSheet.getDataRange().getValues();
          if (data.length > 1) {
            const headers = data[0];
            const idCol = headers.indexOf('ID') !== -1 ? headers.indexOf('ID') : headers.indexOf('Student ID');
            
            if (idCol !== -1) {
              for (let i = 1; i < data.length; i++) {
                if (data[i][idCol]) {
                  studentIds.add(data[i][idCol]);
                }
              }
            }
          }
        }
      } catch (error) {
        Logger.log(`❌ 處理老師記錄簿失敗：${book.getName()} - ${error.message}`);
      }
    });
    
  } catch (error) {
    Logger.log('❌ 獲取學生ID列表失敗：' + error.message);
  }
  
  return Array.from(studentIds);
}

/**
 * 儲存備份資料
 * @param {Object} backupData 備份資料
 * @returns {string} 備份路徑
 */
function saveBackupData(backupData) {
  try {
    const mainFolder = getSystemMainFolder();
    const backupFolder = getOrCreateBackupFolder(mainFolder);
    
    const backupFileName = `學生備份_${backupData.studentId}_${formatDateTimeForFilename()}`;
    const backupSheet = SpreadsheetApp.create(backupFileName);
    
    // 將備份資料寫入工作表
    const sheet = backupSheet.getActiveSheet();
    sheet.getRange('A1').setValue('備份資料');
    sheet.getRange('A2').setValue(JSON.stringify(backupData, null, 2));
    
    // 移動到備份資料夾
    const backupFile = DriveApp.getFileById(backupSheet.getId());
    backupFolder.addFile(backupFile);
    DriveApp.getRootFolder().removeFile(backupFile);
    
    return backupFile.getId();
    
  } catch (error) {
    Logger.log('❌ 儲存備份資料失敗：' + error.message);
    return null;
  }
}

/**
 * 載入備份資料
 * @param {string} backupPath 備份路徑
 * @returns {Object} 備份資料
 */
function loadBackupData(backupPath) {
  try {
    const backupSheet = SpreadsheetApp.openById(backupPath);
    const sheet = backupSheet.getActiveSheet();
    
    const backupDataString = sheet.getRange('A2').getValue();
    return JSON.parse(backupDataString);
    
  } catch (error) {
    Logger.log('❌ 載入備份資料失敗：' + error.message);
    return null;
  }
}

/**
 * 添加學生到新老師記錄簿
 * @param {Object} studentData 學生資料
 * @param {string} newTeacher 新老師名稱
 * @returns {Object} 添加結果
 */
function addStudentToTeacher(studentData, newTeacher) {
  try {
    // 查找新老師的記錄簿
    const teacherBooks = getAllTeacherBooks();
    const targetBook = teacherBooks.find(book => 
      book.getName().includes(newTeacher) || 
      extractTeacherNameFromFileName(book.getName()) === newTeacher
    );
    
    if (!targetBook) {
      return {
        success: false,
        message: '找不到目標老師記錄簿：' + newTeacher
      };
    }
    
    // 添加學生到學生清單
    const studentSheet = targetBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    if (!studentSheet) {
      return {
        success: false,
        message: '目標記錄簿缺少學生清單工作表'
      };
    }
    
    const headers = studentSheet.getRange(1, 1, 1, studentSheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => studentData[header] || '');
    studentSheet.appendRow(newRow);
    
    return {
      success: true,
      teacherName: newTeacher,
      bookId: targetBook.getId()
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 更新學生總表中的老師資訊
 * @param {string} studentId 學生ID
 * @param {string} newTeacher 新老師名稱
 * @returns {Object} 更新結果
 */
function updateStudentTeacherInMasterList(studentId, newTeacher) {
  try {
    const masterListLocation = locateStudentInMasterList(studentId);
    if (!masterListLocation.found) {
      return {
        success: false,
        message: '在學生總表中找不到學生記錄'
      };
    }
    
    const masterSheet = SpreadsheetApp.openById(masterListLocation.fileId);
    const sheet = masterSheet.getActiveSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // 更新相關老師欄位
    const teacherFields = ['Previous Teacher', 'LT']; // 根據實際欄位調整
    teacherFields.forEach(field => {
      const colIndex = headers.indexOf(field);
      if (colIndex !== -1) {
        sheet.getRange(masterListLocation.rowIndex, colIndex + 1).setValue(newTeacher);
      }
    });
    
    return {
      success: true
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}