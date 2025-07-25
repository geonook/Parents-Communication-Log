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
 * 重要修復：保持原有進度追蹤工作表的學期制結構，只更新計算數據
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @returns {Object} 重建結果
 */
function rebuildProgressForTeacherBook(teacherBook) {
  try {
    Logger.log(`🔄 開始重建進度統計：${teacherBook.getName()}`);
    
    // 獲取進度追蹤工作表
    let progressSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.PROGRESS);
    
    if (!progressSheet) {
      Logger.log('⚠️ 進度追蹤工作表不存在，使用標準創建函數重新創建');
      // 如果不存在，使用 TeacherManagement.gs 的標準函數創建
      const teacherInfo = extractTeacherInfoFromBook(teacherBook);
      return createProgressSheetWithTeacherInfo(teacherBook, teacherInfo);
    }
    
    // 檢查工作表是否有正確的學期制結構
    const hasCorrectStructure = checkProgressSheetStructure(progressSheet);
    
    if (!hasCorrectStructure) {
      Logger.log('⚠️ 進度追蹤工作表結構不正確，重新創建標準結構');
      // 備份現有工作表名稱後刪除
      const backupName = `${SYSTEM_CONFIG.SHEET_NAMES.PROGRESS}_backup_${new Date().getTime()}`;
      progressSheet.setName(backupName);
      
      // 重新創建正確結構
      const teacherInfo = extractTeacherInfoFromBook(teacherBook);
      return createProgressSheetWithTeacherInfo(teacherBook, teacherInfo);
    }
    
    Logger.log('✅ 進度追蹤工作表結構正確，僅更新計算數據');
    
    // 結構正確，只需要觸發公式重新計算
    // 強制重新計算所有公式（與 TeacherManagement.gs 中成功模式相同）
    SpreadsheetApp.flush();
    Utilities.sleep(1000);
    
    // 觸發特定範圍的重新計算
    const lastRow = progressSheet.getLastRow();
    if (lastRow > 4) {
      // 獲取包含公式的範圍（已完成電聯、完成率、狀態欄位）
      const formulaRange = progressSheet.getRange(5, 4, lastRow - 4, 3); // D5:F列
      const formulas = formulaRange.getFormulas();
      
      // 重新設定公式觸發計算
      formulaRange.setFormulas(formulas);
      SpreadsheetApp.flush();
    }
    
    Logger.log('✅ 進度統計重建完成，保持原有結構');
    
    return {
      success: true,
      action: 'preserved_structure_updated_data',
      message: '已保持原有學期制結構並更新計算數據'
    };
    
  } catch (error) {
    Logger.log('❌ 重建進度統計失敗：' + error.message);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 檢查進度追蹤工作表是否有正確的學期制結構
 * @param {GoogleAppsScript.Spreadsheet.Sheet} progressSheet 進度追蹤工作表
 * @returns {boolean} 是否有正確結構
 */
function checkProgressSheetStructure(progressSheet) {
  try {
    // 檢查標題是否正確
    const titleCell = progressSheet.getRange('A1').getValue();
    if (!titleCell || !titleCell.toString().includes('電聯進度追蹤')) {
      return false;
    }
    
    // 檢查是否有學期制表頭
    const headerRow = 4;
    if (progressSheet.getLastRow() < headerRow) {
      return false;
    }
    
    const headers = progressSheet.getRange(headerRow, 1, 1, 7).getValues()[0];
    const expectedHeaders = ['學期', 'Term', '學生總數', '已完成電聯', '完成率', '狀態', '備註'];
    
    for (let i = 0; i < expectedHeaders.length; i++) {
      if (headers[i] !== expectedHeaders[i]) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    Logger.log('❌ 檢查進度工作表結構失敗：' + error.message);
    return false;
  }
}

/**
 * 從老師記錄簿中提取老師資訊
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @returns {Object} 老師資訊
 */
function extractTeacherInfoFromBook(teacherBook) {
  try {
    // 從記錄簿名稱提取老師姓名
    const bookName = teacherBook.getName();
    const teacherName = bookName.replace(/[_\-\s]*記錄簿/, '').trim();
    
    // 嘗試從班級資訊工作表獲取詳細資訊
    let studentCount = 0;
    let classes = [];
    
    const classInfoSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CLASS_INFO);
    if (classInfoSheet) {
      // 從班級資訊工作表讀取
      try {
        const classData = classInfoSheet.getRange('B5').getValue(); // English Class
        if (classData) {
          classes = [classData.toString()];
        }
      } catch (error) {
        Logger.log('⚠️ 無法從班級資訊讀取詳細資料：' + error.message);
      }
    }
    
    // 從學生清單工作表計算學生數量
    const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    if (studentSheet && studentSheet.getLastRow() > 1) {
      studentCount = studentSheet.getLastRow() - 1; // 減去標題行
    }
    
    return {
      teacherName: teacherName,
      studentCount: studentCount,
      classes: classes.length > 0 ? classes : ['未知班級']
    };
    
  } catch (error) {
    Logger.log('❌ 提取老師資訊失敗：' + error.message);
    return {
      teacherName: '未知老師',
      studentCount: 0,
      classes: ['未知班級']
    };
  }
}

/**
 * 使用標準函數創建進度追蹤工作表
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @param {Object} teacherInfo 老師資訊
 * @returns {Object} 創建結果
 */
function createProgressSheetWithTeacherInfo(teacherBook, teacherInfo) {
  try {
    Logger.log(`📋 為 ${teacherInfo.teacherName} 創建標準進度追蹤工作表`);
    
    // 調用 TeacherManagement.gs 中的標準創建函數
    createProgressSheet(teacherBook, teacherInfo);
    
    return {
      success: true,
      action: 'created_standard_structure',
      message: '已創建標準學期制進度追蹤工作表'
    };
    
  } catch (error) {
    Logger.log('❌ 創建標準進度工作表失敗：' + error.message);
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
    
    // 🔧 修復問題4：獲取新老師的班級資訊 (English Class)
    // 轉班邏輯：原班級 → 新班級 → 新老師
    let newEnglishClass = '';
    
    // 優先從總覽工作表獲取
    const summarySheet = targetBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    if (summarySheet) {
      try {
        const teacherClasses = summarySheet.getRange('B5').getValue();
        if (teacherClasses && teacherClasses.toString().trim() !== '') {
          newEnglishClass = teacherClasses.toString().trim();
          Logger.log(`📚 從總覽工作表獲取新班級：${newEnglishClass}`);
        }
      } catch (error) {
        Logger.log('無法從總覽工作表獲取班級資訊：' + error.message);
      }
    }
    
    // 備用：從班級資訊工作表獲取（向後兼容）
    if (!newEnglishClass) {
      const classInfoSheet = targetBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CLASS_INFO);
      if (classInfoSheet) {
        try {
          // 嘗試從班級資訊工作表獲取 English Class (通常在B5)
          const classData = classInfoSheet.getRange('B5').getValue();
          if (classData && classData.toString().trim() !== '') {
            newEnglishClass = classData.toString().trim();
            Logger.log(`📚 從班級資訊工作表獲取新班級：${newEnglishClass}（向後兼容模式）`);
          }
        } catch (error) {
          Logger.log('從班級資訊工作表獲取班級失敗：' + error.message);
        }
      }
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
    
    // 🔧 修復問題4：正確更新學生的班級資訊 (English Class) 和 LT 欄位
    const updatedStudentData = { ...studentData };
    const originalClass = studentData['English Class'] || '未知班級';
    const originalLT = studentData['LT'] || studentData['Local Teacher'] || '未知老師';
    
    if (newEnglishClass) {
      updatedStudentData['English Class'] = newEnglishClass;
      Logger.log(`📚 學生班級轉換：${originalClass} → ${newEnglishClass}`);
    } else {
      Logger.log('⚠️ 未能獲取新班級資訊，保持原有班級');
    }
    
    // 🔧 修復問題B：確保LT欄位更新為新老師
    if (updatedStudentData['LT'] !== undefined) {
      updatedStudentData['LT'] = newTeacher;
      Logger.log(`👨‍🏫 學生LT欄位更新：${originalLT} → ${newTeacher}`);
    }
    if (updatedStudentData['Local Teacher'] !== undefined) {
      updatedStudentData['Local Teacher'] = newTeacher;
      Logger.log(`👨‍🏫 學生Local Teacher欄位更新：${originalLT} → ${newTeacher}`);
    }
    
    const newRow = headers.map(header => {
      // 確保LT相關欄位使用新老師名稱
      if (header === 'LT' || header === 'Local Teacher') {
        return newTeacher;
      }
      return updatedStudentData[header] || '';
    });
    studentSheet.appendRow(newRow);
    
    // 同步更新學生總表中的 English Class 和 LT 欄位
    if (newEnglishClass) {
      updateStudentEnglishClassInMasterList(studentData.ID || studentData['Student ID'], newEnglishClass);
    }
    
    // 同步更新學生總表中的 LT (Leading Teacher) 欄位
    updateStudentTeacherInMasterList(studentData.ID || studentData['Student ID'], newTeacher);
    
    // 🔧 修復問題5：更新新老師記錄簿的學生人數統計（增強版）
    const statsUpdateResult = updateStudentCountInNewTeacherBook(targetBook);
    
    // 🆕 新增：同步轉移學生的 Scheduled Contact 記錄
    Logger.log(`📋 開始為轉班學生 ${updatedStudentData.ID || updatedStudentData['Student ID']} 同步 Scheduled Contact 記錄`);
    let contactTransferResult = null;
    try {
      contactTransferResult = transferScheduledContactRecords(updatedStudentData, targetBook, newTeacher);
      if (contactTransferResult.success) {
        Logger.log(`✅ 成功轉移 ${contactTransferResult.recordCount} 筆 Scheduled Contact 記錄`);
      } else {
        Logger.log(`⚠️ Scheduled Contact 記錄轉移失敗：${contactTransferResult.message}`);
      }
    } catch (contactError) {
      Logger.log(`❌ Scheduled Contact 記錄轉移發生錯誤：${contactError.message}`);
      contactTransferResult = {
        success: false,
        message: contactError.message,
        recordCount: 0
      };
      // 不影響整體轉班操作，繼續執行
    }
    
    // 🎯 返回增強的結果（包含統計更新詳情）
    return {
      success: true,
      teacherName: newTeacher,
      bookId: targetBook.getId(),
      details: {
        newEnglishClass: newEnglishClass,
        updatedFields: newEnglishClass ? ['English Class'] : []
      },
      // 🆕 新增統計更新結果
      updateResult: statsUpdateResult,
      // 🆕 新增電聯記錄轉移結果
      contactTransferResult: contactTransferResult
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

/**
 * 更新學生總表中的 English Class 資訊
 * @param {string} studentId 學生ID
 * @param {string} newEnglishClass 新的 English Class
 * @returns {Object} 更新結果
 */
function updateStudentEnglishClassInMasterList(studentId, newEnglishClass) {
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
    
    // 更新 English Class 欄位
    const englishClassCol = headers.indexOf('English Class');
    if (englishClassCol !== -1) {
      sheet.getRange(masterListLocation.rowIndex, englishClassCol + 1).setValue(newEnglishClass);
      Logger.log(`✅ 已更新學生總表中的 English Class：${studentId} → ${newEnglishClass}`);
    }
    
    return {
      success: true,
      updatedField: 'English Class',
      newValue: newEnglishClass
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// ============ 備份相關輔助函數 ============

/**
 * 從學生總表備份學生資料
 * @param {string} studentId 學生ID
 * @param {Object} masterListLocation 學生總表位置資訊
 * @returns {Object} 備份資料
 */
function backupStudentFromMasterList(studentId, masterListLocation) {
  try {
    const masterSheet = SpreadsheetApp.openById(masterListLocation.fileId);
    const sheet = masterSheet.getActiveSheet();
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const studentRow = data[masterListLocation.rowIndex - 1];
    
    const backupData = {
      source: 'masterList',
      fileId: masterListLocation.fileId,
      fileName: masterListLocation.fileName,
      rowIndex: masterListLocation.rowIndex,
      studentData: {}
    };
    
    // 備份學生資料
    headers.forEach((header, index) => {
      backupData.studentData[header] = studentRow[index];
    });
    
    return backupData;
    
  } catch (error) {
    Logger.log('❌ 從學生總表備份失敗：' + error.message);
    return null;
  }
}

/**
 * 從老師記錄簿備份學生資料
 * @param {string} studentId 學生ID
 * @param {Object} teacherRecord 老師記錄資訊
 * @returns {Object} 備份資料
 */
function backupStudentFromTeacherBook(studentId, teacherRecord) {
  try {
    const teacherBook = SpreadsheetApp.openById(teacherRecord.fileId);
    const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    
    if (!studentSheet) {
      return null;
    }
    
    const data = studentSheet.getDataRange().getValues();
    const headers = data[0];
    const studentRow = data[teacherRecord.studentListRow - 1];
    
    const backupData = {
      source: 'teacherBook',
      fileId: teacherRecord.fileId,
      fileName: teacherRecord.fileName,
      teacherName: teacherRecord.teacherName,
      studentListRow: teacherRecord.studentListRow,
      studentData: {}
    };
    
    // 備份學生資料
    headers.forEach((header, index) => {
      backupData.studentData[header] = studentRow[index];
    });
    
    return backupData;
    
  } catch (error) {
    Logger.log('❌ 從老師記錄簿備份失敗：' + error.message);
    return null;
  }
}

/**
 * 恢復學生資料到學生總表
 * @param {string} studentId 學生ID
 * @param {Object} backupData 備份資料
 * @returns {Object} 恢復結果
 */
function restoreStudentToMasterList(studentId, backupData) {
  try {
    const masterSheet = SpreadsheetApp.openById(backupData.fileId);
    const sheet = masterSheet.getActiveSheet();
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // 恢復學生資料
    headers.forEach((header, index) => {
      const value = backupData.studentData[header];
      if (value !== undefined) {
        sheet.getRange(backupData.rowIndex, index + 1).setValue(value);
      }
    });
    
    return {
      success: true,
      message: '學生總表資料恢復成功'
    };
    
  } catch (error) {
    Logger.log('❌ 恢復學生總表資料失敗：' + error.message);
    return {
      success: false,
      message: '恢復學生總表資料失敗：' + error.message
    };
  }
}

/**
 * 恢復學生資料到老師記錄簿
 * @param {string} studentId 學生ID
 * @param {Object} backupData 備份資料
 * @returns {Object} 恢復結果
 */
function restoreStudentToTeacherBook(studentId, backupData) {
  try {
    const teacherBook = SpreadsheetApp.openById(backupData.fileId);
    const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    
    if (!studentSheet) {
      return {
        success: false,
        message: '找不到學生清單工作表'
      };
    }
    
    const headers = studentSheet.getRange(1, 1, 1, studentSheet.getLastColumn()).getValues()[0];
    
    // 恢復學生資料
    headers.forEach((header, index) => {
      const value = backupData.studentData[header];
      if (value !== undefined) {
        studentSheet.getRange(backupData.studentListRow, index + 1).setValue(value);
      }
    });
    
    return {
      success: true,
      message: '老師記錄簿資料恢復成功'
    };
    
  } catch (error) {
    Logger.log('❌ 恢復老師記錄簿資料失敗：' + error.message);
    return {
      success: false,
      message: '恢復老師記錄簿資料失敗：' + error.message
    };
  }
}

/**
 * 恢復電聯記錄
 * @param {string} studentId 學生ID
 * @param {Array} contactRecords 電聯記錄備份
 * @returns {Object} 恢復結果
 */
function restoreContactRecords(studentId, contactRecords) {
  try {
    let restoredCount = 0;
    
    contactRecords.forEach(record => {
      try {
        const teacherBook = SpreadsheetApp.openById(record.teacherBookId);
        const contactSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
        
        if (contactSheet) {
          const headers = contactSheet.getRange(1, 1, 1, contactSheet.getLastColumn()).getValues()[0];
          const newRow = headers.map(header => record[header] || '');
          contactSheet.appendRow(newRow);
          restoredCount++;
        }
      } catch (error) {
        Logger.log(`❌ 恢復電聯記錄失敗：${record.teacherName} - ${error.message}`);
      }
    });
    
    return {
      success: true,
      message: `成功恢復 ${restoredCount} 條電聯記錄`
    };
    
  } catch (error) {
    Logger.log('❌ 恢復電聯記錄失敗：' + error.message);
    return {
      success: false,
      message: '恢復電聯記錄失敗：' + error.message
    };
  }
}

/**
 * 獲取或創建備份資料夾
 * @param {GoogleAppsScript.Drive.Folder} mainFolder 主資料夾
 * @returns {GoogleAppsScript.Drive.Folder} 備份資料夾
 */
function getOrCreateBackupFolder(mainFolder) {
  try {
    const backupFolderName = '學生異動備份';
    const backupFolders = mainFolder.getFoldersByName(backupFolderName);
    
    if (backupFolders.hasNext()) {
      return backupFolders.next();
    } else {
      return mainFolder.createFolder(backupFolderName);
    }
    
  } catch (error) {
    Logger.log('❌ 創建備份資料夾失敗：' + error.message);
    return mainFolder; // 返回主資料夾作為後備
  }
}

/**
 * 更新工作表中的行資料
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 工作表
 * @param {Object} condition 更新條件
 * @param {Object} updateData 更新資料
 * @returns {Object} 更新結果
 */
function updateRowInSheet(sheet, condition, updateData) {
  try {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let updatedRows = 0;
    
    // 查找符合條件的行
    for (let i = 1; i < data.length; i++) {
      let matchCondition = true;
      
      Object.keys(condition).forEach(fieldName => {
        const colIndex = headers.indexOf(fieldName);
        if (colIndex === -1 || data[i][colIndex] !== condition[fieldName]) {
          matchCondition = false;
        }
      });
      
      if (matchCondition) {
        // 更新資料
        Object.keys(updateData).forEach(fieldName => {
          const colIndex = headers.indexOf(fieldName);
          if (colIndex !== -1) {
            sheet.getRange(i + 1, colIndex + 1).setValue(updateData[fieldName]);
          }
        });
        updatedRows++;
      }
    }
    
    return {
      success: true,
      updatedRows: updatedRows
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 計算老師記錄簿進度資料
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @returns {Array} 進度資料
 */
function calculateProgressForTeacherBook(teacherBook) {
  try {
    const contactSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (!contactSheet) {
      return [['Student ID', 'Student Name', 'Contact Count', 'Last Contact']];
    }
    
    const data = contactSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return [['Student ID', 'Student Name', 'Contact Count', 'Last Contact']];
    }
    
    const headers = data[0];
    const studentIdCol = headers.indexOf('Student ID');
    const contactDateCol = headers.indexOf('Contact Date');
    
    const progressData = [['Student ID', 'Student Name', 'Contact Count', 'Last Contact']];
    const studentStats = {};
    
    // 統計每個學生的電聯次數
    for (let i = 1; i < data.length; i++) {
      const studentId = data[i][studentIdCol];
      const contactDate = data[i][contactDateCol];
      
      if (studentId) {
        if (!studentStats[studentId]) {
          studentStats[studentId] = {
            count: 0,
            lastContact: null
          };
        }
        
        studentStats[studentId].count++;
        
        if (contactDate && (!studentStats[studentId].lastContact || contactDate > studentStats[studentId].lastContact)) {
          studentStats[studentId].lastContact = contactDate;
        }
      }
    }
    
    // 生成進度資料
    Object.keys(studentStats).forEach(studentId => {
      const studentName = getStudentName(studentId);
      const stats = studentStats[studentId];
      
      progressData.push([
        studentId,
        studentName,
        stats.count,
        stats.lastContact ? stats.lastContact.toDateString() : ''
      ]);
    });
    
    return progressData;
    
  } catch (error) {
    Logger.log('❌ 計算老師記錄簿進度失敗：' + error.message);
    return [['Student ID', 'Student Name', 'Contact Count', 'Last Contact']];
  }
}

/**
 * 計算系統統計資料
 * @returns {Object} 系統統計
 */
// calculateSystemStats 函數已移動到 DashboardController.gs
// 避免重複定義導致函數調用衝突

/**
 * 批量修復所有老師記錄簿的進度追蹤工作表
 * 修復因為異動管理系統導致的進度表結構問題
 * @returns {Object} 修復結果
 */
function batchFixProgressTrackingSheets() {
  Logger.log('🔧 開始批量修復進度追蹤工作表');
  
  const ui = SpreadsheetApp.getUi();
  const fixResults = {
    totalBooks: 0,
    fixedBooks: 0,
    skippedBooks: 0,
    errorBooks: 0,
    details: []
  };
  
  try {
    // 獲取所有老師記錄簿
    const teacherBooks = getAllTeacherBooks();
    fixResults.totalBooks = teacherBooks.length;
    
    if (teacherBooks.length === 0) {
      const message = '系統中沒有找到任何老師記錄簿';
      Logger.log(message);
      ui.alert('提醒', message, ui.ButtonSet.OK);
      return fixResults;
    }
    
    Logger.log(`📊 找到 ${teacherBooks.length} 個老師記錄簿，開始批量修復`);
    
    // 逐一檢查和修復每個記錄簿
    teacherBooks.forEach((book, index) => {
      try {
        Logger.log(`🔄 處理第 ${index + 1}/${teacherBooks.length} 個記錄簿：${book.getName()}`);
        
        const progressSheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.PROGRESS);
        if (!progressSheet) {
          Logger.log(`⚠️ ${book.getName()} 沒有進度追蹤工作表，跳過`);
          fixResults.skippedBooks++;
          fixResults.details.push({
            teacherName: book.getName(),
            action: 'skipped',
            reason: '沒有進度追蹤工作表'
          });
          return;
        }
        
        // 檢查結構是否正確
        const hasCorrectStructure = checkProgressSheetStructure(progressSheet);
        
        if (hasCorrectStructure) {
          Logger.log(`✅ ${book.getName()} 進度追蹤工作表結構正確，跳過`);
          fixResults.skippedBooks++;
          fixResults.details.push({
            teacherName: book.getName(),
            action: 'skipped',
            reason: '結構已正確'
          });
          return;
        }
        
        Logger.log(`🔧 修復 ${book.getName()} 的進度追蹤工作表`);
        
        // 執行修復
        const fixResult = rebuildProgressForTeacherBook(book);
        
        if (fixResult.success) {
          fixResults.fixedBooks++;
          fixResults.details.push({
            teacherName: book.getName(),
            action: 'fixed',
            result: fixResult.action || 'success'
          });
          Logger.log(`✅ ${book.getName()} 修復成功`);
        } else {
          fixResults.errorBooks++;
          fixResults.details.push({
            teacherName: book.getName(),
            action: 'error',
            error: fixResult.message
          });
          Logger.log(`❌ ${book.getName()} 修復失敗：${fixResult.message}`);
        }
        
      } catch (error) {
        fixResults.errorBooks++;
        fixResults.details.push({
          teacherName: book.getName(),
          action: 'error',
          error: error.message
        });
        Logger.log(`❌ 處理 ${book.getName()} 時發生錯誤：${error.message}`);
      }
    });
    
    // 生成修復報告
    const reportMessage = generateFixReport(fixResults);
    Logger.log('📋 批量修復完成');
    Logger.log(reportMessage);
    
    ui.alert(
      '進度追蹤工作表批量修復完成！',
      reportMessage,
      ui.ButtonSet.OK
    );
    
    return fixResults;
    
  } catch (error) {
    const errorMessage = `批量修復過程發生錯誤：${error.message}`;
    Logger.log('❌ ' + errorMessage);
    ui.alert('錯誤', errorMessage, ui.ButtonSet.OK);
    
    fixResults.details.push({
      teacherName: 'System',
      action: 'error',
      error: error.message
    });
    
    return fixResults;
  }
}

/**
 * 生成批量修復報告
 * @param {Object} fixResults 修復結果
 * @returns {string} 報告文字
 */
function generateFixReport(fixResults) {
  let report = `📊 批量修復結果：\n\n`;
  report += `總記錄簿數：${fixResults.totalBooks}\n`;
  report += `成功修復：${fixResults.fixedBooks}\n`;
  report += `跳過處理：${fixResults.skippedBooks}\n`;
  report += `修復失敗：${fixResults.errorBooks}\n\n`;
  
  if (fixResults.fixedBooks > 0) {
    report += `✅ 已修復的記錄簿：\n`;
    fixResults.details
      .filter(detail => detail.action === 'fixed')
      .forEach(detail => {
        report += `• ${detail.teacherName} - ${detail.result}\n`;
      });
    report += '\n';
  }
  
  if (fixResults.errorBooks > 0) {
    report += `❌ 修復失敗的記錄簿：\n`;
    fixResults.details
      .filter(detail => detail.action === 'error')
      .forEach(detail => {
        report += `• ${detail.teacherName} - ${detail.error}\n`;
      });
    report += '\n';
  }
  
  if (fixResults.fixedBooks > 0) {
    report += `🎉 修復成功！所有受影響的進度追蹤工作表已恢復為標準的學期制結構。\n`;
    report += `現在您可以看到正確的學期+Term組合進度追蹤表。`;
  } else if (fixResults.skippedBooks === fixResults.totalBooks) {
    report += `✅ 所有進度追蹤工作表結構都是正確的，無需修復。`;
  }
  
  return report;
}

/**
 * 🔧 修復問題5：更新新老師記錄簿的學生人數統計
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 新老師記錄簿
 */
function updateStudentCountInNewTeacherBook(teacherBook) {
  const updateResult = {
    success: false,
    teacherBook: teacherBook.getName(),
    actualStudentCount: 0,
    updateDetails: {},
    validationResults: {},
    errors: [],
    recommendedActions: []
  };
  
  try {
    Logger.log(`📊 [強化版] 更新新老師記錄簿的學生人數統計：${teacherBook.getName()}`);
    
    // 🎯 使用改進後的標準化統計更新函數
    if (typeof updateStudentCountInSheets === 'function') {
      const detailedUpdateResult = updateStudentCountInSheets(teacherBook);
      
      if (detailedUpdateResult && typeof detailedUpdateResult === 'object') {
        // 新版本函數返回詳細結果
        updateResult.success = detailedUpdateResult.success;
        updateResult.actualStudentCount = detailedUpdateResult.actualStudentCount;
        updateResult.updateDetails = {
          updatedSheets: detailedUpdateResult.updatedSheets || [],
          dataStandardsCompliant: detailedUpdateResult.dataStandardsCompliant || false,
          errors: detailedUpdateResult.errors || []
        };
        
        // 📊 詳細日誌輸出
        Logger.log(`📈 統計更新結果詳情：`);
        Logger.log(`   • 成功狀態：${detailedUpdateResult.success ? '✅ 成功' : '❌ 失敗'}`);
        Logger.log(`   • 學生人數：${detailedUpdateResult.actualStudentCount} 人`);
        Logger.log(`   • 更新工作表：${detailedUpdateResult.updatedSheets.length} 個`);
        Logger.log(`   • DATA_STANDARDS 合規：${detailedUpdateResult.dataStandardsCompliant ? '✅ 是' : '⚠️ 否'}`);
        
        if (detailedUpdateResult.errors && detailedUpdateResult.errors.length > 0) {
          Logger.log(`   • 錯誤/警告：${detailedUpdateResult.errors.length} 個`);
          detailedUpdateResult.errors.forEach((error, index) => {
            Logger.log(`     ${index + 1}. ${error}`);
          });
          updateResult.errors.push(...detailedUpdateResult.errors);
        }
        
      } else {
        // 舊版本函數或無返回值，使用備用驗證
        Logger.log('⚠️ updateStudentCountInSheets 未返回詳細結果，使用備用驗證');
        updateResult.success = true; // 假設執行成功
        updateResult.actualStudentCount = getActualStudentCountFromSheet(teacherBook);
        updateResult.recommendedActions.push('建議升級到新版統計更新函數');
      }
      
    } else {
      // 🔄 備用實現（如果主函數不存在）
      Logger.log('⚠️ updateStudentCountInSheets 函數不存在，使用備用實現');
      
      const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
      if (!studentSheet) {
        updateResult.errors.push('找不到學生清單工作表');
        Logger.log('❌ 找不到學生清單工作表');
        return updateResult;
      }
      
      updateResult.actualStudentCount = studentSheet.getLastRow() > 1 ? 
                                       studentSheet.getLastRow() - 1 : 0;
      
      // 使用基本方法更新統計
      try {
        updateSummaryStudentCount(teacherBook, updateResult.actualStudentCount);
        updateProgressTrackingStudentCount(teacherBook, updateResult.actualStudentCount);
        updateResult.success = true;
        updateResult.updateDetails.updatedSheets = ['總覽工作表（基本版）', '進度追蹤工作表（基本版）'];
        updateResult.recommendedActions.push('建議安裝完整的 updateStudentCountInSheets 函數');
        Logger.log(`📊 備用實現完成 - 新老師記錄簿學生人數：${updateResult.actualStudentCount}`);
      } catch (basicUpdateError) {
        updateResult.errors.push(`備用實現失敗: ${basicUpdateError.message}`);
        Logger.log(`❌ 備用實現失敗：${basicUpdateError.message}`);
      }
    }
    
    // 🔍 執行後驗證（關鍵步驟）
    if (updateResult.success) {
      Logger.log('🔍 執行統計更新後驗證...');
      
      const validationResult = performPostUpdateValidation(teacherBook, updateResult.actualStudentCount);
      updateResult.validationResults = validationResult;
      
      if (!validationResult.allValid) {
        updateResult.success = false;
        updateResult.errors.push(`後驗證失敗: ${validationResult.issues.join('; ')}`);
        updateResult.recommendedActions.push('需要手動檢查和修復統計數據');
        Logger.log(`❌ 後驗證失敗：發現 ${validationResult.issues.length} 個問題`);
      } else {
        Logger.log(`✅ 後驗證通過：所有統計數據正確更新`);
      }
    }
    
    // 🏁 最終結果報告
    const statusIcon = updateResult.success ? '✅' : '❌';
    const complianceIcon = updateResult.updateDetails.dataStandardsCompliant ? '🎯' : '⚠️';
    
    Logger.log(`${statusIcon} 新老師記錄簿統計更新${updateResult.success ? '完成' : '失敗'}：${updateResult.actualStudentCount} 人 ${complianceIcon}`);
    
    if (updateResult.recommendedActions.length > 0) {
      Logger.log(`💡 建議行動：`);
      updateResult.recommendedActions.forEach((action, index) => {
        Logger.log(`   ${index + 1}. ${action}`);
      });
    }
    
    return updateResult;
    
  } catch (error) {
    updateResult.errors.push(`系統錯誤: ${error.message}`);
    Logger.log(`❌ 更新新老師記錄簿學生人數統計失敗：${error.message}`);
    return updateResult;
  }
}

/**
 * 階段2：轉移學生的 Scheduled Contact 記錄到新老師記錄簿
 * @param {Object} studentData 學生資料（已更新班級資訊）
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} targetBook 新老師記錄簿
 * @param {string} newTeacher 新老師名稱
 * @returns {Object} 轉移結果
 */
function transferScheduledContactRecords(studentData, targetBook, newTeacher) {
  try {
    Logger.log(`📋 開始為學生 ${studentData.ID || studentData['Student ID']} 轉移 Scheduled Contact 記錄到 ${newTeacher}`);
    
    // 獲取或創建電聯記錄工作表
    let contactSheet = targetBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (!contactSheet) {
      Logger.log('⚠️ 目標記錄簿沒有電聯記錄工作表，嘗試創建...');
      // 如果沒有電聯記錄工作表，調用創建函數
      if (typeof createContactLogSheet === 'function') {
        createContactLogSheet(targetBook, { name: newTeacher, studentCount: 0, classes: [] });
        contactSheet = targetBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
      }
      
      if (!contactSheet) {
        return {
          success: false,
          message: '無法創建或找到電聯記錄工作表'
        };
      }
    }
    
    // 生成該學生的完整 Scheduled Contact 記錄
    const scheduledContacts = generateScheduledContactsForStudent(studentData);
    
    if (scheduledContacts.length === 0) {
      return {
        success: false,
        message: '無法生成 Scheduled Contact 記錄'
      };
    }
    
    // 將記錄添加到電聯記錄工作表
    const startRow = contactSheet.getLastRow() + 1;
    const numCols = scheduledContacts[0].length;
    
    contactSheet.getRange(startRow, 1, scheduledContacts.length, numCols)
               .setValues(scheduledContacts);
    
    Logger.log(`📝 成功添加 ${scheduledContacts.length} 筆 Scheduled Contact 記錄到第 ${startRow} 行開始`);
    
    // 執行排序以確保記錄順序正確
    if (typeof ensureContactRecordsSorting === 'function') {
      ensureContactRecordsSorting(targetBook);
      Logger.log('✅ 電聯記錄排序完成');
    }
    
    return {
      success: true,
      recordCount: scheduledContacts.length,
      message: `成功為學生 ${studentData.ID || studentData['Student ID']} 添加 ${scheduledContacts.length} 筆 Scheduled Contact 記錄`
    };
    
  } catch (error) {
    Logger.log(`❌ 轉移 Scheduled Contact 記錄失敗：${error.message}`);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 階段3：為單一學生生成完整的 Scheduled Contact 記錄
 * @param {Object} studentData 學生資料（包含更新後的班級資訊）
 * @returns {Array} Scheduled Contact 記錄陣列
 */
function generateScheduledContactsForStudent(studentData) {
  try {
    const studentId = studentData.ID || studentData['Student ID'];
    const studentName = studentData['Chinese Name'] || studentData.Name || '未知姓名';
    const englishName = studentData['English Name'] || '未知英文名';
    const englishClass = studentData['English Class'] || '未知班級';
    
    Logger.log(`📝 為學生 ${studentId} (${studentName}) 生成 Scheduled Contact 記錄，班級：${englishClass}`);
    
    const scheduledContacts = [];
    
    // 根據學期制結構創建記錄：Fall/Spring × Beginning/Midterm/Final = 6筆
    const semesters = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS; // ['Fall', 'Spring']
    const terms = SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS; // ['Beginning', 'Midterm', 'Final']
    
    semesters.forEach(semester => {
      terms.forEach(term => {
        // 創建一筆 Scheduled Contact 記錄 (11欄位格式)
        const contactRecord = [
          studentId,                                    // A: Student ID
          studentName,                                  // B: Name  
          englishName,                                  // C: English Name
          englishClass,                                // D: English Class
          '',                                          // E: Date (留空待填)
          semester,                                    // F: Semester
          term,                                        // G: Term
          SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER,       // H: Contact Type = "Scheduled Contact"
          '',                                          // I: Teachers Content (留空待填)
          '',                                          // J: Parents Responses (留空待填)
          ''                                           // K: Contact Method (留空待填)
        ];
        
        scheduledContacts.push(contactRecord);
      });
    });
    
    Logger.log(`✅ 成功生成 ${scheduledContacts.length} 筆 Scheduled Contact 記錄 (${semesters.length} 學期 × ${terms.length} Terms)`);
    
    return scheduledContacts;
    
  } catch (error) {
    Logger.log(`❌ 生成 Scheduled Contact 記錄失敗：${error.message}`);
    return [];
  }
}

// ============ 支援函數：統計更新驗證相關 ============

/**
 * 從學生清單工作表獲取實際學生人數
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @returns {number} 實際學生人數
 */
function getActualStudentCountFromSheet(teacherBook) {
  try {
    const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    if (!studentSheet) {
      Logger.log('⚠️ 找不到學生清單工作表，返回 0');
      return 0;
    }
    
    const studentCount = studentSheet.getLastRow() > 1 ? studentSheet.getLastRow() - 1 : 0;
    Logger.log(`📊 從學生清單工作表獲取學生人數：${studentCount}`);
    return studentCount;
    
  } catch (error) {
    Logger.log(`❌ 獲取實際學生人數失敗：${error.message}`);
    return 0;
  }
}

/**
 * 執行統計更新後驗證
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @param {number} expectedCount 預期學生人數
 * @returns {Object} 驗證結果
 */
function performPostUpdateValidation(teacherBook, expectedCount) {
  const validationResult = {
    allValid: true,
    issues: [],
    validatedSheets: [],
    expectedCount: expectedCount,
    summarySheetCount: null,
    progressSheetCount: null,
    consistencyCheck: null
  };
  
  try {
    Logger.log(`🔍 執行統計更新後驗證 - 預期學生人數：${expectedCount}`);
    
    // 🎯 驗證1：總覽工作表中的學生人數
    try {
      const summaryValidation = validateSummarySheetCount(teacherBook, expectedCount);
      validationResult.summarySheetCount = summaryValidation.actualCount;
      validationResult.validatedSheets.push('總覽工作表');
      
      if (!summaryValidation.valid) {
        validationResult.allValid = false;
        validationResult.issues.push(`總覽工作表學生人數不正確: 預期 ${expectedCount}, 實際 ${summaryValidation.actualCount}`);
      }
    } catch (summaryError) {
      validationResult.allValid = false;
      validationResult.issues.push(`總覽工作表驗證失敗: ${summaryError.message}`);
    }
    
    // 🎯 驗證2：進度追蹤工作表中的學生人數
    try {
      const progressValidation = validateProgressSheetCount(teacherBook, expectedCount);
      validationResult.progressSheetCount = progressValidation.actualCount;
      validationResult.validatedSheets.push('進度追蹤工作表');
      
      if (!progressValidation.valid) {
        validationResult.allValid = false;
        validationResult.issues.push(`進度追蹤工作表學生人數不正確: 預期 ${expectedCount}, 實際 ${progressValidation.actualCount}`);
      }
    } catch (progressError) {
      validationResult.allValid = false;
      validationResult.issues.push(`進度追蹤工作表驗證失敗: ${progressError.message}`);
    }
    
    // 🎯 驗證3：與學生總表的一致性檢查
    try {
      const consistencyValidation = validateConsistencyWithMasterList(teacherBook, expectedCount);
      validationResult.consistencyCheck = consistencyValidation;
      
      if (!consistencyValidation.consistent) {
        validationResult.allValid = false;
        validationResult.issues.push(`與學生總表不一致: ${consistencyValidation.message}`);
      }
    } catch (consistencyError) {
      validationResult.allValid = false;
      validationResult.issues.push(`一致性檢查失敗: ${consistencyError.message}`);
    }
    
    // 📊 輸出驗證結果
    if (validationResult.allValid) {
      Logger.log(`✅ 統計更新後驗證通過 - 所有工作表學生人數正確: ${expectedCount}`);
    } else {
      Logger.log(`❌ 統計更新後驗證失敗 - 發現 ${validationResult.issues.length} 個問題:`);
      validationResult.issues.forEach((issue, index) => {
        Logger.log(`   ${index + 1}. ${issue}`);
      });
    }
    
  } catch (error) {
    validationResult.allValid = false;
    validationResult.issues.push(`驗證過程錯誤: ${error.message}`);
    Logger.log(`❌ 統計更新後驗證過程失敗：${error.message}`);
  }
  
  return validationResult;
}

/**
 * 驗證總覽工作表中的學生人數
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @param {number} expectedCount 預期學生人數
 * @returns {Object} 驗證結果
 */
function validateSummarySheetCount(teacherBook, expectedCount) {
  const result = {
    valid: false,
    actualCount: null,
    foundAt: null
  };
  
  try {
    const summarySheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    if (!summarySheet) {
      result.actualCount = -1;
      return result;
    }
    
    // 搜尋學生人數欄位
    const standardStudentCountLabels = [
      '學生人數', '總學生數', '學生總數', '班級人數', '學生數量', '人數'
    ];
    
    for (let row = 1; row <= 20; row++) {
      for (let col = 1; col <= 10; col++) {
        try {
          const labelValue = summarySheet.getRange(row, col).getValue();
          
          if (labelValue && typeof labelValue === 'string') {
            const labelText = labelValue.toString().trim();
            
            const isStudentCountLabel = standardStudentCountLabels.some(label => 
              labelText.includes(label)
            );
            
            if (isStudentCountLabel) {
              const valueCell = summarySheet.getRange(row, col + 1);
              const actualValue = valueCell.getValue();
              
              if (typeof actualValue === 'number') {
                result.actualCount = actualValue;
                result.foundAt = `${String.fromCharCode(65 + col)}${row + 1}`;
                result.valid = (actualValue === expectedCount);
                Logger.log(`🔍 總覽工作表學生人數驗證：${result.foundAt} = ${actualValue} (標籤: "${labelText}")`);
                return result;
              }
            }
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // 如果沒找到，設為未找到
    result.actualCount = -2; // 表示未找到學生人數欄位
    
  } catch (error) {
    Logger.log(`❌ 驗證總覽工作表學生人數失敗：${error.message}`);
    result.actualCount = -3; // 表示驗證過程出錯
  }
  
  return result;
}

/**
 * 驗證進度追蹤工作表中的學生人數
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @param {number} expectedCount 預期學生人數
 * @returns {Object} 驗證結果
 */
function validateProgressSheetCount(teacherBook, expectedCount) {
  const result = {
    valid: false,
    actualCount: null,
    checkedRows: 0
  };
  
  try {
    const progressSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.PROGRESS);
    if (!progressSheet) {
      result.actualCount = -1;
      return result;
    }
    
    // 檢查是否為標準學期制結構
    const hasStandardStructure = checkProgressSheetStructure ? 
                                checkProgressSheetStructure(progressSheet) : false;
    
    if (!hasStandardStructure) {
      result.actualCount = -2; // 結構不標準
      return result;
    }
    
    // 驗證學期行中的學生總數（第3欄）
    const lastRow = progressSheet.getLastRow();
    let foundCount = null;
    
    for (let row = 5; row <= lastRow; row++) {
      const semesterValue = progressSheet.getRange(row, 1).getValue();
      const termValue = progressSheet.getRange(row, 2).getValue();
      
      if (semesterValue && termValue) {
        const studentCountValue = progressSheet.getRange(row, 3).getValue();
        if (typeof studentCountValue === 'number') {
          if (foundCount === null) {
            foundCount = studentCountValue;
            result.checkedRows++;
          } else if (foundCount !== studentCountValue) {
            // 如果不同行的學生人數不一致，這是個問題
            Logger.log(`⚠️ 進度工作表學生人數不一致：第 ${row} 行 = ${studentCountValue}, 預期 = ${foundCount}`);
          }
        }
      }
    }
    
    result.actualCount = foundCount;
    result.valid = (foundCount === expectedCount);
    
    Logger.log(`🔍 進度追蹤工作表學生人數驗證：檢查了 ${result.checkedRows} 行，找到學生人數 ${result.actualCount}`);
    
  } catch (error) {
    Logger.log(`❌ 驗證進度追蹤工作表學生人數失敗：${error.message}`);
    result.actualCount = -3; // 表示驗證過程出錯
  }
  
  return result;
}

/**
 * 驗證與學生總表的一致性
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} teacherBook 老師記錄簿
 * @param {number} expectedCount 預期學生人數
 * @returns {Object} 驗證結果
 */
function validateConsistencyWithMasterList(teacherBook, expectedCount) {
  const result = {
    consistent: false,
    message: '',
    teacherBookCount: expectedCount,
    masterListCount: 0
  };
  
  try {
    const teacherName = extractTeacherNameFromFileName(teacherBook.getName());
    
    // 獲取學生總表數據
    const masterListData = getSystemMasterList();
    if (!masterListData || masterListData.length < 4) {
      result.message = '無法獲取學生總表數據';
      return result;
    }
    
    const headers = masterListData[2];
    const studentData = masterListData.slice(3);
    const ltColumnIndex = findLTColumnIndex(headers);
    
    if (ltColumnIndex === -1) {
      result.message = '學生總表中找不到LT欄位';
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
    result.consistent = (expectedCount === masterListCount);
    result.message = result.consistent ? 
                    `數據一致：記錄簿 ${expectedCount} = 學生總表 ${masterListCount}` :
                    `數據不一致：記錄簿 ${expectedCount} ≠ 學生總表 ${masterListCount}`;
    
    Logger.log(`🔍 一致性驗證：${teacherName} - ${result.message}`);
    
  } catch (error) {
    result.message = `一致性驗證錯誤: ${error.message}`;
    Logger.log(`❌ 一致性驗證失敗：${error.message}`);
  }
  
  return result;
}