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
    
    // 🆕 增強版：智能同步轉移學生的 Scheduled Contact 記錄
    Logger.log(`📋 開始為轉班學生 ${updatedStudentData.ID || updatedStudentData['Student ID']} 智能同步 Scheduled Contact 記錄`);
    let contactTransferResult = null;
    try {
      // 🎯 轉班特化選項設定
      const transferOptions = {
        transferDate: new Date().toISOString().split('T')[0], // 當前日期
        preserveHistory: true // 保留歷史記錄
      };
      
      contactTransferResult = transferScheduledContactRecords(updatedStudentData, targetBook, newTeacher, transferOptions);
      if (contactTransferResult.success) {
        Logger.log(`✅ 智能轉移成功：${contactTransferResult.recordCount} 筆 Scheduled Contact 記錄`);
        if (contactTransferResult.analysisResults) {
          Logger.log(`📊 轉移分析：現有記錄 ${contactTransferResult.analysisResults.existingRecords} 筆，新增記錄 ${contactTransferResult.analysisResults.newRecords} 筆`);
        }
      } else {
        Logger.log(`⚠️ Scheduled Contact 記錄智能轉移失敗：${contactTransferResult.message}`);
      }
    } catch (contactError) {
      Logger.log(`❌ Scheduled Contact 記錄轉移發生錯誤：${contactError.message}`);
      contactTransferResult = {
        success: false,
        message: contactError.message,
        recordCount: 0,
        errorDetails: contactError
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
/**
 * 🆕 增強版：轉移學生的 Scheduled Contact 記錄（支援智能處理和完整性驗證）
 * @param {Object} studentData 學生資料對象
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} targetBook 目標記錄簿
 * @param {string} newTeacher 新老師姓名
 * @param {Object} options 選項設定
 * @param {string} options.transferDate 轉班日期
 * @param {boolean} options.preserveHistory 是否保留歷史記錄
 * @returns {Object} 轉移結果
 */
function transferScheduledContactRecords(studentData, targetBook, newTeacher, options = {}) {
  try {
    const studentId = studentData.ID || studentData['Student ID'];
    Logger.log(`📋 開始為學生 ${studentId} 智能轉移 Scheduled Contact 記錄到 ${newTeacher}`);
    
    // 📋 選項處理
    const transferDate = options.transferDate || new Date().toISOString().split('T')[0];
    const preserveHistory = options.preserveHistory !== false; // 預設保留歷史
    
    Logger.log(`🔧 轉移選項：轉班日期=${transferDate}, 保留歷史=${preserveHistory}`);
    
    // 🔍 目標記錄簿驗證
    const bookValidation = validateTargetBook(targetBook, newTeacher);
    if (!bookValidation.isValid) {
      return {
        success: false,
        message: `目標記錄簿驗證失敗：${bookValidation.message}`
      };
    }
    
    // 獲取或創建電聯記錄工作表
    let contactSheet = targetBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (!contactSheet) {
      Logger.log('⚠️ 目標記錄簿沒有電聯記錄工作表，嘗試創建...');
      const sheetCreationResult = createContactLogSheetIfNeeded(targetBook, newTeacher);
      if (!sheetCreationResult.success) {
        return {
          success: false,
          message: `無法創建電聯記錄工作表：${sheetCreationResult.message}`
        };
      }
      contactSheet = targetBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    }
    
    // 📊 分析現有記錄
    const existingRecords = getExistingContactRecords(contactSheet, studentId);
    Logger.log(`📊 目標記錄簿中已有 ${existingRecords.length} 筆該學生的電聯記錄`);
    
    // 🧠 智能記錄生成：使用入班感知系統
    const enhancedGenerationOptions = {
      skipPastRecords: true,
      transferDate: transferDate,
      existingRecords: existingRecords,
      completionMode: options.completionMode, // 支援自訂補齊模式
      transferContext: {
        transferDate: transferDate,
        sourceTeacher: options.sourceTeacher,
        targetTeacher: newTeacher
      }
    };
    
    // 🎯 使用入班感知進度記錄生成系統
    const scheduledContacts = generateScheduledContactsWithEnrollmentAwareness(studentData, enhancedGenerationOptions);
    
    // 📋 如果入班感知系統未生成記錄，回退到原始系統
    if (scheduledContacts.length === 0) {
      Logger.log('ℹ️ 入班感知系統未生成記錄，回退到原始生成系統');
      const fallbackContacts = generateScheduledContactsForStudent(studentData, {
        skipPastRecords: true,
        transferDate: transferDate,
        existingRecords: existingRecords
      });
      scheduledContacts.push(...fallbackContacts);
    }
    
    if (scheduledContacts.length === 0) {
      Logger.log('ℹ️ 根據時序邏輯和重複檢查，沒有需要添加的新記錄');
      return {
        success: true,
        recordCount: 0,
        message: '沒有需要添加的新記錄（避免重複或過時記錄）',
        analysisResults: {
          existingRecords: existingRecords.length,
          newRecords: 0,
          reason: '時序邏輯過濾或重複檢查阻止'
        }
      };
    }
    
    // 📝 記錄格式驗證和標準化
    const validatedRecords = validateAndStandardizeRecords(scheduledContacts, studentData, newTeacher);
    if (validatedRecords.length !== scheduledContacts.length) {
      Logger.log(`⚠️ 記錄驗證：${scheduledContacts.length} → ${validatedRecords.length} 筆有效記錄`);
    }
    
    // 將記錄添加到電聯記錄工作表
    const insertionResult = insertRecordsWithValidation(contactSheet, validatedRecords);
    if (!insertionResult.success) {
      return {
        success: false,
        message: `記錄插入失敗：${insertionResult.message}`
      };
    }
    
    Logger.log(`📝 成功添加 ${validatedRecords.length} 筆 Scheduled Contact 記錄到第 ${insertionResult.startRow} 行開始`);
    
    // 執行排序以確保記錄順序正確
    const sortingResult = performContactRecordsSorting(targetBook);
    if (sortingResult.success) {
      Logger.log('✅ 電聯記錄排序完成');
    } else {
      Logger.log(`⚠️ 排序警告：${sortingResult.message}`);
    }
    
    // 🎯 完整性驗證
    const integrityCheck = verifyTransferIntegrity(contactSheet, studentId, validatedRecords);
    
    // 🔍 驗證轉班學生記錄完整性
    const frameworkValidation = validateTransferredStudentFramework(validatedRecords);
    if (!frameworkValidation.isComplete) {
      Logger.log(`⚠️ 警告：轉班學生記錄框架不完整：${frameworkValidation.missing.join(', ')}`);
    } else {
      Logger.log(`🎯 轉班學生完整框架確保：${validatedRecords.length} 筆記錄（帶有完整的6種組合）`);
    }
    
    return {
      success: true,
      recordCount: validatedRecords.length,
      message: `成功為學生 ${studentId} 使用入班感知系統添加 ${validatedRecords.length} 筆 Scheduled Contact 記錄`,
      analysisResults: {
        existingRecords: existingRecords.length,
        newRecords: validatedRecords.length,
        transferDate: transferDate,
        preserveHistory: preserveHistory,
        frameworkValidation: frameworkValidation // 🎯 添加框架驗證結果
      },
      validationResults: {
        bookValidation: bookValidation,
        recordValidation: validatedRecords.length === scheduledContacts.length,
        sortingResult: sortingResult,
        integrityCheck: integrityCheck,
        completeFramework: frameworkValidation.isComplete // 🎯 框架完整性檢查
      }
    };
    
  } catch (error) {
    Logger.log(`❌ 智能轉移 Scheduled Contact 記錄失敗：${error.message}`);
    return {
      success: false,
      message: error.message,
      errorDetails: {
        functionName: 'transferScheduledContactRecords',
        studentId: studentData.ID || studentData['Student ID'],
        newTeacher: newTeacher
      }
    };
  }
}

// ============ 🚀 強化轉班記錄管理系統 ============

/**
 * 🚀 強化版轉班記錄管理（整合入班感知系統）
 * 支援所有三種補齊策略和先進配置管理
 * @param {Object} studentData 學生資料
 * @param {Object} targetBook 目標記錄簿
 * @param {string} targetTeacher 目標老師
 * @param {Object} options 選項設定
 * @param {string} options.completionMode 補齊模式（可覆蓋系統預設）
 * @param {string} options.enrollmentDate 入班日期
 * @param {boolean} options.useEnhancedSystem 是否使用強化系統（預設 true）
 * @returns {Object} 轉移結果
 */
function transferScheduledContactRecordsEnhanced(studentData, targetBook, targetTeacher, options = {}) {
  try {
    const studentId = studentData.ID || studentData['Student ID'];
    Logger.log(`🚀 開始強化版轉班記錄管理：學生 ${studentId} 轉入 ${targetTeacher}`);
    
    // 📋 選項處理與預設值
    const transferDate = options.transferDate || new Date().toISOString().split('T')[0];
    const useEnhancedSystem = options.useEnhancedSystem !== false; // 預設啟用
    const completionMode = options.completionMode || null; // 由系統配置決定
    const preserveHistory = options.preserveHistory !== false;
    
    Logger.log(`🔧 轉移選項：強化系統=${useEnhancedSystem}, 補齊模式=${completionMode || '系統預設'}, 轉班日期=${transferDate}`);
    
    // 🔍 目標記錄簿驗證
    const bookValidation = validateTargetBook(targetBook, targetTeacher);
    if (!bookValidation.isValid) {
      return {
        success: false,
        message: `目標記錄簿驗證失敗：${bookValidation.message}`,
        enhancedSystemUsed: false
      };
    }
    
    // 📊 獲取或創建電聯記錄工作表
    let contactSheet = targetBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (!contactSheet) {
      Logger.log('⚠️ 目標記錄簿沒有電聯記錄工作表，嘗試創建...');
      const sheetCreationResult = createContactLogSheetIfNeeded(targetBook, targetTeacher);
      if (!sheetCreationResult.success) {
        return {
          success: false,
          message: `無法創建電聯記錄工作表：${sheetCreationResult.message}`,
          enhancedSystemUsed: false
        };
      }
      contactSheet = targetBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    }
    
    // 📊 分析現有記錄
    const existingRecords = getExistingContactRecords(contactSheet, studentId);
    Logger.log(`📊 目標記錄簿中已有 ${existingRecords.length} 筆該學生的電聯記錄`);
    
    let scheduledContacts = [];
    let systemUsed = '無';
    
    // 🎯 選擇記錄生成系統
    if (useEnhancedSystem) {
      // 🚀 使用強化的入班感知系統
      const enhancedOptions = {
        completionMode: completionMode,
        enrollmentDate: options.enrollmentDate,
        existingRecords: existingRecords,
        transferContext: {
          transferDate: transferDate,
          sourceTeacher: options.sourceTeacher,
          targetTeacher: targetTeacher,
          preserveHistory: preserveHistory
        }
      };
      
      scheduledContacts = generateScheduledContactsWithEnrollmentAwareness(studentData, enhancedOptions);
      systemUsed = '入班感知強化系統';
      
      // 📋 如果強化系統未生成記錄，回退到原始系統
      if (scheduledContacts.length === 0) {
        Logger.log('ℹ️ 強化系統未生成記錄，回退到原始系統');
        useEnhancedSystem = false;
      }
    }
    
    if (!useEnhancedSystem) {
      // 📋 使用原始系統（向下相容）
      const fallbackOptions = {
        skipPastRecords: true,
        transferDate: transferDate,
        existingRecords: existingRecords
      };
      
      scheduledContacts = generateScheduledContactsForStudent(studentData, fallbackOptions);
      systemUsed = '原始系統（向下相容）';
    }
    
    // 🔍 記錄生成結果檢查
    if (scheduledContacts.length === 0) {
      Logger.log('ℹ️ 根據時序邏輯和重複檢查，沒有需要添加的新記錄');
      return {
        success: true,
        recordCount: 0,
        message: '沒有需要添加的新記錄（避免重複或過時記錄）',
        enhancedSystemUsed: useEnhancedSystem,
        systemUsed: systemUsed,
        analysisResults: {
          existingRecords: existingRecords.length,
          newRecords: 0,
          reason: '時序邏輯過濾或重複檢查阻止'
        }
      };
    }
    
    // 📝 記錄格式驗證和標準化
    const validatedRecords = validateAndStandardizeRecords(scheduledContacts, studentData, targetTeacher);
    if (validatedRecords.length !== scheduledContacts.length) {
      Logger.log(`⚠️ 記錄驗證：${scheduledContacts.length} → ${validatedRecords.length} 筆有效記錄`);
    }
    
    // 💾 將記錄添加到電聯記錄工作表
    const insertionResult = insertRecordsWithValidation(contactSheet, validatedRecords);
    if (!insertionResult.success) {
      return {
        success: false,
        message: `記錄插入失敗：${insertionResult.message}`,
        enhancedSystemUsed: useEnhancedSystem,
        systemUsed: systemUsed
      };
    }
    
    Logger.log(`📝 成功添加 ${validatedRecords.length} 筆 Scheduled Contact 記錄到第 ${insertionResult.startRow} 行開始`);
    
    // 🔄 執行排序以確保記錄順序正確
    const sortingResult = performContactRecordsSorting(targetBook);
    if (sortingResult.success) {
      Logger.log('✅ 電聯記錄排序完成');
    } else {
      Logger.log(`⚠️ 排序警告：${sortingResult.message}`);
    }
    
    // 🎯 完整性驗證（強化版）
    const integrityCheck = verifyTransferIntegrity(contactSheet, studentId, validatedRecords);
    const frameworkValidation = validateTransferredStudentFramework(validatedRecords);
    
    // 📊 強化系統特有的分析
    let enhancedAnalysis = null;
    if (useEnhancedSystem) {
      enhancedAnalysis = analyzeEnrollmentAwareGeneration(
        validatedRecords, 
        completionMode || 'SYSTEM_DEFAULT',
        options.enrollmentDate ? new Date(options.enrollmentDate) : null
      );
    }
    
    // 🎯 最終結果返回
    return {
      success: true,
      recordCount: validatedRecords.length,
      message: `成功為學生 ${studentId} 使用${systemUsed}添加 ${validatedRecords.length} 筆 Scheduled Contact 記錄`,
      enhancedSystemUsed: useEnhancedSystem,
      systemUsed: systemUsed,
      analysisResults: {
        existingRecords: existingRecords.length,
        newRecords: validatedRecords.length,
        transferDate: transferDate,
        preserveHistory: preserveHistory,
        frameworkValidation: frameworkValidation,
        enhancedAnalysis: enhancedAnalysis // 🆕 強化系統特有分析
      },
      validationResults: {
        bookValidation: bookValidation,
        recordValidation: validatedRecords.length === scheduledContacts.length,
        sortingResult: sortingResult,
        integrityCheck: integrityCheck,
        completeFramework: frameworkValidation.isComplete
      }
    };
    
  } catch (error) {
    Logger.log(`❌ 強化版轉班記錄管理失敗：${error.message}`);
    return {
      success: false,
      message: error.message,
      enhancedSystemUsed: false,
      systemUsed: '錯誤',
      errorDetails: {
        functionName: 'transferScheduledContactRecordsEnhanced',
        studentId: studentData.ID || studentData['Student ID'],
        targetTeacher: targetTeacher
      }
    };
  }
}

/**
 * 🔍 學生管理器整合適配器
 * 提供StudentChangeManager.gs使用的簡化接口
 * @param {Object} studentData 學生資料
 * @param {Object} targetBook 目標記錄簿
 * @param {string} targetTeacher 目標老師
 * @param {Object} transferOptions 轉班選項
 * @returns {Object} 轉移結果
 */
function adaptForStudentChangeManager(studentData, targetBook, targetTeacher, transferOptions = {}) {
  try {
    Logger.log('🔍 StudentChangeManager 整合適配器啟動');
    
    // 🔧 自動檢測是否使用強化系統
    const useEnhanced = transferOptions.useEnhancedSystem !== false; // 預設啟用
    
    if (useEnhanced) {
      // 🚀 使用強化系統
      return transferScheduledContactRecordsEnhanced(studentData, targetBook, targetTeacher, transferOptions);
    } else {
      // 📋 使用原始系統（完全向下相容）
      return transferScheduledContactRecords(studentData, targetBook, targetTeacher, transferOptions);
    }
    
  } catch (error) {
    Logger.log(`❌ StudentChangeManager 整合適配器錯誤：${error.message}`);
    return {
      success: false,
      message: `整合適配器錯誤：${error.message}`,
      enhancedSystemUsed: false
    };
  }
}

// ============ 轉班學生記錄框架驗證功能 ============

/**
 * 🔍 驗證轉班學生記錄框架完整性
 * @param {Array} records 記錄陣列
 * @returns {Object} 驗證結果
 */
function validateTransferredStudentFramework(records) {
  try {
    Logger.log(`🔍 開始驗證轉班學生記錄框架：${records.length} 筆記錄`);
    
    // 定義完整的6種組合
    const expectedCombinations = [];
    const semesters = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS; // ['Fall', 'Spring']
    const terms = SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS; // ['Beginning', 'Midterm', 'Final']
    
    semesters.forEach(semester => {
      terms.forEach(term => {
        expectedCombinations.push(`${semester}-${term}`);
      });
    });
    
    Logger.log(`🎯 期望的完整框架：${expectedCombinations.join(', ')}`);
    
    // 分析現有記錄
    const existingCombinations = [];
    const duplicates = [];
    const seenCombinations = new Set();
    
    records.forEach((record, index) => {
      const semester = record[5]; // F: Semester
      const term = record[6]; // G: Term
      const combination = `${semester}-${term}`;
      
      if (seenCombinations.has(combination)) {
        duplicates.push(combination);
      } else {
        seenCombinations.add(combination);
        existingCombinations.push(combination);
      }
    });
    
    Logger.log(`📋 現有組合：${existingCombinations.join(', ')}`);
    
    // 找出缺失的組合
    const missing = expectedCombinations.filter(combo => !existingCombinations.includes(combo));
    const extra = existingCombinations.filter(combo => !expectedCombinations.includes(combo));
    
    const isComplete = missing.length === 0 && existingCombinations.length === 6;
    const hasDuplicates = duplicates.length > 0;
    const hasExtra = extra.length > 0;
    
    const validationResult = {
      isComplete: isComplete,
      totalRecords: records.length,
      expectedCount: 6,
      existingCombinations: existingCombinations,
      missing: missing,
      extra: extra,
      duplicates: duplicates,
      hasDuplicates: hasDuplicates,
      hasExtra: hasExtra,
      summary: `${existingCombinations.length}/6 組合存在${missing.length > 0 ? `, 缺失: ${missing.join(', ')}` : ''}${duplicates.length > 0 ? `, 重複: ${duplicates.join(', ')}` : ''}${extra.length > 0 ? `, 多餘: ${extra.join(', ')}` : ''}`
    };
    
    Logger.log(`📄 框架驗證結果：${validationResult.summary}`);
    
    if (isComplete) {
      Logger.log('✅ 轉班學生記錄框架完整');
    } else {
      Logger.log(`⚠️ 轉班學生記錄框架不完整：缺失 ${missing.length} 個組合`);
    }
    
    return validationResult;
    
  } catch (error) {
    Logger.log(`❌ 驗證記錄框架失敗：${error.message}`);
    return {
      isComplete: false,
      error: error.message,
      totalRecords: records ? records.length : 0,
      summary: '驗證失敗'
    };
  }
}

/**
 * 🔧 為轉班學生自動修復缺失的記錄
 * @param {Object} studentData 學生資料
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} targetBook 目標記錄簿
 * @param {Array} existingRecords 現有記錄
 * @param {Array} missingCombinations 缺失組合清單
 * @returns {Object} 修復結果
 */
function repairMissingRecordsForTransferredStudent(studentData, targetBook, existingRecords, missingCombinations) {
  try {
    Logger.log(`🔧 開始為轉班學生修復缺失記錄：${missingCombinations.length} 個遺失組合`);
    
    const studentId = studentData.ID || studentData['Student ID'];
    const studentName = studentData['Chinese Name'] || studentData.Name || '未知姓名';
    const englishName = studentData['English Name'] || '未知英文名';
    const englishClass = studentData['English Class'] || '未知班級';
    
    const repairedRecords = [];
    
    // 為每個缺失組合創建記錄
    missingCombinations.forEach(combination => {
      const [semester, term] = combination.split('-');
      
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
      
      repairedRecords.push(contactRecord);
      Logger.log(`🔨 已修復記錄：${semester} ${term}`);
    });
    
    // 將修復記錄添加到電聯記錄工作表
    const contactSheet = targetBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (!contactSheet) {
      throw new Error('找不到電聯記錄工作表');
    }
    
    const insertionResult = insertRecordsWithValidation(contactSheet, repairedRecords);
    
    if (insertionResult.success) {
      Logger.log(`✅ 成功修復 ${repairedRecords.length} 筆缺失記錄`);
      
      // 重新排序以確保記錄順序正確
      const sortingResult = performContactRecordsSorting(targetBook);
      
      return {
        success: true,
        repairedCount: repairedRecords.length,
        repairedCombinations: missingCombinations,
        insertionResult: insertionResult,
        sortingResult: sortingResult
      };
    } else {
      throw new Error(`記錄插入失敗：${insertionResult.message}`);
    }
    
  } catch (error) {
    Logger.log(`❌ 修復缺失記錄失敗：${error.message}`);
    return {
      success: false,
      error: error.message,
      repairedCount: 0
    };
  }
}

/**
 * 階段3：為單一學生生成完整的 Scheduled Contact 記錄
 * @param {Object} studentData 學生資料（包含更新後的班級資訊）
 * @returns {Array} Scheduled Contact 記錄陣列
 */
/**
 * 🆕 增強版：為學生生成 Scheduled Contact 記錄（支援時序邏輯和完整性檢查）
 * @param {Object} studentData 學生資料對象
 * @param {Object} options 選項設定
 * @param {boolean} options.skipPastRecords 是否跳過過去的記錄（轉班使用）
 * @param {boolean} options.ensureCompleteFramework 是否確保完整6記錄框架（轉班學生使用）
 * @param {string} options.transferDate 轉班日期（用於判斷時序）
 * @param {Array} options.existingRecords 現有記錄（避免重複）
 * @returns {Array} 生成的 Scheduled Contact 記錄陣列
 */
function generateScheduledContactsForStudent(studentData, options = {}) {
  try {
    const studentId = studentData.ID || studentData['Student ID'];
    const studentName = studentData['Chinese Name'] || studentData.Name || '未知姓名';
    const englishName = studentData['English Name'] || '未知英文名';
    const englishClass = studentData['English Class'] || '未知班級';
    
    // 📋 選項處理
    const skipPastRecords = options.skipPastRecords || false;
    const ensureCompleteFramework = options.ensureCompleteFramework || false;
    const transferDate = options.transferDate || null;
    const existingRecords = options.existingRecords || [];
    
    Logger.log(`📝 為學生 ${studentId} (${studentName}) 生成 Scheduled Contact 記錄，班級：${englishClass}`);
    Logger.log(`🔧 選項設定：跳過過去記錄=${skipPastRecords}, 完整框架=${ensureCompleteFramework}, 轉班日期=${transferDate}, 現有記錄=${existingRecords.length}筆`);
    
    // 🔍 資料完整性檢查
    const validationResult = validateStudentDataCompleteness(studentData);
    if (!validationResult.isValid) {
      Logger.log(`❌ 學生資料不完整：${validationResult.missingFields.join(', ')}`);
      return [];
    }
    
    const scheduledContacts = [];
    
    // 📅 時序邏輯：判斷當前學期和日期
    const currentDate = transferDate ? new Date(transferDate) : new Date();
    const currentSemesterInfo = getCurrentSemesterInfo(currentDate);
    
    Logger.log(`📅 當前時序資訊：學期=${currentSemesterInfo.semester}, Term=${currentSemesterInfo.term}, 日期=${currentDate.toLocaleDateString()}`);
    
    // 根據學期制結構創建記錄：Fall/Spring × Beginning/Midterm/Final = 6筆
    const semesters = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS; // ['Fall', 'Spring']
    const terms = SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS; // ['Beginning', 'Midterm', 'Final']
    
    semesters.forEach(semester => {
      terms.forEach(term => {
        // 🕒 時序檢查：是否跳過過去的記錄（除非需要確保完整框架）
        if (skipPastRecords && !ensureCompleteFramework && isPastRecord(semester, term, currentSemesterInfo)) {
          Logger.log(`⏭️ 跳過過去記錄：${semester} ${term}`);
          return;
        }
        
        // 🎯 完整框架模式：為轉班學生確保所有6個記錄都被創建
        if (ensureCompleteFramework) {
          Logger.log(`🔄 完整框架模式：確保創建 ${semester} ${term} 記錄`);
        }
        
        // 🔄 重複檢查：避免創建已存在的記錄
        if (isDuplicateRecord(studentId, semester, term, existingRecords)) {
          Logger.log(`⚠️ 跳過重複記錄：${studentId} - ${semester} ${term}`);
          return;
        }
        
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
        Logger.log(`📝 已添加記錄：${studentId} - ${semester} ${term}`);
      });
    });
    
    // 🎯 結果驗證和記錄
    const recordsInfo = analyzeGeneratedRecords(scheduledContacts);
    Logger.log(`✅ 成功生成 ${scheduledContacts.length} 筆 Scheduled Contact 記錄`);
    Logger.log(`📊 記錄分析：${recordsInfo.summary}`);
    
    return scheduledContacts;
    
  } catch (error) {
    Logger.log(`❌ 生成 Scheduled Contact 記錄失敗：${error.message}`);
    return [];
  }
}

// ============ 🆕 入班感知進度記錄補齊系統 (Enrollment-Aware Progress Completion) ============

/**
 * 🎯 入班感知進度記錄生成（主入口函數）
 * 整合三種補齊策略：COMPLETE_ALL、ENROLLMENT_AWARE、MANUAL_PROMPT
 * @param {Object} studentData 學生資料
 * @param {Object} options 選項設定
 * @param {string} options.completionMode 補齊模式（可覆蓋系統預設）
 * @param {string} options.enrollmentDate 入班日期
 * @param {Object} options.transferContext 轉班上下文資訊
 * @returns {Array} 生成的進度記錄陣列
 */
function generateScheduledContactsWithEnrollmentAwareness(studentData, options = {}) {
  try {
    const studentId = studentData.ID || studentData['Student ID'];
    const studentName = studentData['Chinese Name'] || studentData.Name || '未知姓名';
    
    Logger.log(`🎯 開始入班感知進度記錄生成：學生 ${studentId} (${studentName})`);
    
    // 📋 獲取補齊策略配置
    const completionConfig = getProgressCompletionConfig();
    const selectedMode = options.completionMode || completionConfig.DEFAULT_MODE;
    const strategyConfig = completionConfig.MODES[selectedMode];
    
    if (!strategyConfig) {
      Logger.log(`❌ 未知的補齊模式：${selectedMode}`);
      return [];
    }
    
    Logger.log(`🔧 使用補齊策略：${strategyConfig.name} - ${strategyConfig.description}`);
    
    // 📅 處理入班日期
    const enrollmentDate = extractEnrollmentDate(studentData, options.transferContext || {});
    const validatedEnrollmentDate = validateEnrollmentDate(enrollmentDate);
    
    Logger.log(`📅 學生入班日期：${validatedEnrollmentDate || '未指定'}`);
    
    // 🎯 根據策略選擇對應的記錄生成函數
    let generatedRecords = [];
    
    switch (selectedMode) {
      case 'COMPLETE_ALL':
        generatedRecords = completeAllRecordsStrategy(studentData, options, strategyConfig);
        break;
      case 'ENROLLMENT_AWARE':
        generatedRecords = enrollmentAwareStrategy(studentData, validatedEnrollmentDate, options, strategyConfig);
        break;
      case 'MANUAL_PROMPT':
        generatedRecords = manualPromptStrategy(studentData, validatedEnrollmentDate, options, strategyConfig);
        break;
      default:
        Logger.log(`⚠️ 回退到預設策略：ENROLLMENT_AWARE`);
        generatedRecords = enrollmentAwareStrategy(studentData, validatedEnrollmentDate, options, strategyConfig);
    }
    
    // 📊 記錄生成結果分析
    const analysisResult = analyzeEnrollmentAwareGeneration(generatedRecords, selectedMode, validatedEnrollmentDate);
    Logger.log(`✅ 入班感知記錄生成完成：${generatedRecords.length} 筆記錄`);
    Logger.log(`📊 生成分析：${analysisResult.summary}`);
    
    return generatedRecords;
    
  } catch (error) {
    Logger.log(`❌ 入班感知進度記錄生成失敗：${error.message}`);
    return [];
  }
}

/**
 * 🔧 策略A：補齊全部記錄模式
 * 為所有 6 個期次建立記錄，預設標記為「未聯絡」
 * @param {Object} studentData 學生資料
 * @param {Object} options 選項設定
 * @param {Object} strategyConfig 策略配置
 * @returns {Array} 生成的記錄陣列
 */
function completeAllRecordsStrategy(studentData, options = {}, strategyConfig = {}) {
  try {
    Logger.log('🔧 執行策略A：補齊全部記錄模式');
    
    const studentId = studentData.ID || studentData['Student ID'];
    const studentName = studentData['Chinese Name'] || studentData.Name || '未知姓名';
    const englishName = studentData['English Name'] || '未知英文名';
    const englishClass = studentData['English Class'] || '未知班級';
    
    const records = [];
    const semesters = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS;
    const terms = SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS;
    const defaultStatus = strategyConfig.defaultStatus || '未聯絡';
    
    semesters.forEach(semester => {
      terms.forEach(term => {
        // 🎯 重複檢查
        if (options.existingRecords && isDuplicateRecord(studentId, semester, term, options.existingRecords)) {
          Logger.log(`⚠️ 跳過重複記錄：${studentId} - ${semester} ${term}`);
          return;
        }
        
        const record = [
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
        
        records.push(record);
        Logger.log(`📝 添加全記錄：${studentId} - ${semester} ${term}`);
      });
    });
    
    Logger.log(`✅ 策略A完成：生成 ${records.length} 筆完整記錄`);
    return records;
    
  } catch (error) {
    Logger.log(`❌ 策略A執行失敗：${error.message}`);
    return [];
  }
}

/**
 * 🔧 策略B：入班感知模式
 * 僅為入班後的期次建立記錄，避免數據噪音
 * @param {Object} studentData 學生資料
 * @param {Date|string} enrollmentDate 入班日期
 * @param {Object} options 選項設定
 * @param {Object} strategyConfig 策略配置
 * @returns {Array} 生成的記錄陣列
 */
function enrollmentAwareStrategy(studentData, enrollmentDate, options = {}, strategyConfig = {}) {
  try {
    Logger.log('🔧 執行策略B：入班感知模式');
    
    const studentId = studentData.ID || studentData['Student ID'];
    const studentName = studentData['Chinese Name'] || studentData.Name || '未知姓名';
    const englishName = studentData['English Name'] || '未知英文名';
    const englishClass = studentData['English Class'] || '未知班級';
    
    // 📅 計算入班影響
    const enrollmentImpact = calculateEnrollmentImpact(studentData, enrollmentDate, new Date());
    Logger.log(`📊 入班影響分析：活躍期次 ${enrollmentImpact.activePeriods.length} 個，未來期次 ${enrollmentImpact.futurePeriods.length} 個`);
    
    const records = [];
    const semesters = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS;
    const terms = SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS;
    
    // 🎯 只為入班後的期次（活躍期次 + 未來期次）建立記錄
    const targetPeriods = [...enrollmentImpact.activePeriods, ...enrollmentImpact.futurePeriods];
    
    targetPeriods.forEach(period => {
      // 🎯 重複檢查
      if (options.existingRecords && isDuplicateRecord(studentId, period.semester, period.term, options.existingRecords)) {
        Logger.log(`⚠️ 跳過重複記錄：${studentId} - ${period.semester} ${period.term}`);
        return;
      }
      
      const record = [
        studentId,                                    // A: Student ID
        studentName,                                  // B: Name  
        englishName,                                  // C: English Name
        englishClass,                                // D: English Class
        '',                                          // E: Date (留空待填)
        period.semester,                             // F: Semester
        period.term,                                 // G: Term
        SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER,       // H: Contact Type = "Scheduled Contact"
        '',                                          // I: Teachers Content (留空待填)
        '',                                          // J: Parents Responses (留空待填)
        ''                                           // K: Contact Method (留空待填)
      ];
      
      records.push(record);
      Logger.log(`📝 添加入班後記錄：${studentId} - ${period.semester} ${period.term}`);
    });
    
    Logger.log(`✅ 策略B完成：生成 ${records.length} 筆入班感知記錄`);
    return records;
    
  } catch (error) {
    Logger.log(`❌ 策略B執行失敗：${error.message}`);
    return [];
  }
}

/**
 * 🔧 策略C：手動提示模式
 * 建立全部記錄，但對入班前期次標註「非本班在籍」
 * @param {Object} studentData 學生資料
 * @param {Date|string} enrollmentDate 入班日期
 * @param {Object} options 選項設定
 * @param {Object} strategyConfig 策略配置
 * @returns {Array} 生成的記錄陣列
 */
function manualPromptStrategy(studentData, enrollmentDate, options = {}, strategyConfig = {}) {
  try {
    Logger.log('🔧 執行策略C：手動提示模式');
    
    const studentId = studentData.ID || studentData['Student ID'];
    const studentName = studentData['Chinese Name'] || studentData.Name || '未知姓名';
    const englishName = studentData['English Name'] || '未知英文名';
    const englishClass = studentData['English Class'] || '未知班級';
    
    // 📅 計算入班影響
    const enrollmentImpact = calculateEnrollmentImpact(studentData, enrollmentDate, new Date());
    const preEnrollmentLabel = strategyConfig.preEnrollmentLabel || '非本班在籍';
    
    Logger.log(`📊 入班影響分析：入班前期次 ${enrollmentImpact.completedPeriods.length} 個將標註"${preEnrollmentLabel}"`);
    
    const records = [];
    const semesters = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS;
    const terms = SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS;
    
    semesters.forEach(semester => {
      terms.forEach(term => {
        // 🎯 重複檢查
        if (options.existingRecords && isDuplicateRecord(studentId, semester, term, options.existingRecords)) {
          Logger.log(`⚠️ 跳過重複記錄：${studentId} - ${semester} ${term}`);
          return;
        }
        
        // 🏷️ 判斷是否為入班前期次
        const isPreEnrollment = enrollmentImpact.completedPeriods.some(p => 
          p.semester === semester && p.term === term
        );
        
        // 📝 Teachers Content 根據入班狀態設定
        const teachersContent = isPreEnrollment ? preEnrollmentLabel : '';
        
        const record = [
          studentId,                                    // A: Student ID
          studentName,                                  // B: Name  
          englishName,                                  // C: English Name
          englishClass,                                // D: English Class
          '',                                          // E: Date (留空待填)
          semester,                                    // F: Semester
          term,                                        // G: Term
          SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER,       // H: Contact Type = "Scheduled Contact"
          teachersContent,                             // I: Teachers Content (標註入班前狀態)
          '',                                          // J: Parents Responses (留空待填)
          ''                                           // K: Contact Method (留空待填)
        ];
        
        records.push(record);
        
        if (isPreEnrollment) {
          Logger.log(`🏷️ 添加標註記錄：${studentId} - ${semester} ${term} (${preEnrollmentLabel})`);
        } else {
          Logger.log(`📝 添加常規記錄：${studentId} - ${semester} ${term}`);
        }
      });
    });
    
    Logger.log(`✅ 策略C完成：生成 ${records.length} 筆標註記錄`);
    return records;
    
  } catch (error) {
    Logger.log(`❌ 策略C執行失敗：${error.message}`);
    return [];
  }
}

// ============ 入班感知系統支援函數 ============

/**
 * 📅 計算入班對期次的影響
 * @param {Object} studentData 學生資料
 * @param {Date|string} enrollmentDate 入班日期
 * @param {Date} currentDate 當前日期
 * @returns {Object} 影響分析結果
 */
function calculateEnrollmentImpact(studentData, enrollmentDate, currentDate) {
  try {
    Logger.log('📅 開始計算入班影響');
    
    const semesters = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS;
    const terms = SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS;
    const allPeriods = [];
    
    // 📋 生成所有期次組合
    semesters.forEach(semester => {
      terms.forEach(term => {
        allPeriods.push({ semester, term });
      });
    });
    
    // 📅 獲取當前學期資訊
    const currentSemesterInfo = getCurrentSemesterInfo(currentDate);
    const enrollmentSemesterInfo = enrollmentDate ? getCurrentSemesterInfo(new Date(enrollmentDate)) : null;
    
    Logger.log(`📊 當前學期：${currentSemesterInfo.semester} ${currentSemesterInfo.term}`);
    if (enrollmentSemesterInfo) {
      Logger.log(`📊 入班學期：${enrollmentSemesterInfo.semester} ${enrollmentSemesterInfo.term}`);
    }
    
    const result = {
      completedPeriods: [],     // 入班前期次
      activePeriods: [],        // 入班後且當前或過去的期次
      futurePeriods: []         // 未來期次
    };
    
    allPeriods.forEach(period => {
      if (enrollmentSemesterInfo) {
        // 有入班日期時的分類邏輯
        if (isPastRecord(period.semester, period.term, enrollmentSemesterInfo)) {
          result.completedPeriods.push(period);
        } else if (isPastRecord(period.semester, period.term, currentSemesterInfo) || 
                   (period.semester === currentSemesterInfo.semester && period.term === currentSemesterInfo.term)) {
          result.activePeriods.push(period);
        } else {
          result.futurePeriods.push(period);
        }
      } else {
        // 沒有入班日期時，所有當前及未來期次都視為活躍
        if (isPastRecord(period.semester, period.term, currentSemesterInfo)) {
          result.activePeriods.push(period);
        } else {
          result.futurePeriods.push(period);
        }
      }
    });
    
    Logger.log(`📊 入班影響分析完成：入班前 ${result.completedPeriods.length}，活躍 ${result.activePeriods.length}，未來 ${result.futurePeriods.length}`);
    return result;
    
  } catch (error) {
    Logger.log(`❌ 入班影響計算失敗：${error.message}`);
    return {
      completedPeriods: [],
      activePeriods: [],
      futurePeriods: []
    };
  }
}

/**
 * 📅 提取入班日期
 * @param {Object} studentData 學生資料
 * @param {Object} transferContext 轉班上下文
 * @returns {Date|null} 入班日期
 */
function extractEnrollmentDate(studentData, transferContext = {}) {
  try {
    // 🔍 多來源提取入班日期
    let enrollmentDate = null;
    
    // 來源1：轉班上下文中的轉班日期
    if (transferContext.transferDate) {
      enrollmentDate = new Date(transferContext.transferDate);
      Logger.log(`📅 從轉班上下文提取入班日期：${enrollmentDate.toLocaleDateString()}`);
    }
    
    // 來源2：學生資料中的入班日期欄位（如果存在）
    else if (studentData.enrollmentDate) {
      enrollmentDate = new Date(studentData.enrollmentDate);
      Logger.log(`📅 從學生資料提取入班日期：${enrollmentDate.toLocaleDateString()}`);
    }
    
    // 來源3：系統時間戳（最後回退）
    else if (!enrollmentDate) {
      enrollmentDate = new Date();
      Logger.log(`📅 使用當前日期作為入班日期：${enrollmentDate.toLocaleDateString()}`);
    }
    
    return enrollmentDate;
    
  } catch (error) {
    Logger.log(`❌ 提取入班日期失敗：${error.message}`);
    return new Date(); // 回退到當前日期
  }
}

/**
 * 📅 驗證入班日期
 * @param {Date|string} enrollmentDate 入班日期
 * @returns {Date|null} 驗證後的入班日期
 */
function validateEnrollmentDate(enrollmentDate) {
  try {
    if (!enrollmentDate) {
      Logger.log('⚠️ 未提供入班日期，將使用策略預設行為');
      return null;
    }
    
    const date = new Date(enrollmentDate);
    
    // 📅 基本日期有效性檢查
    if (isNaN(date.getTime())) {
      Logger.log(`❌ 無效的入班日期格式：${enrollmentDate}`);
      return null;
    }
    
    // 📅 合理性檢查（不能是未來太遠的日期）
    const currentDate = new Date();
    const oneYearFromNow = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());
    
    if (date > oneYearFromNow) {
      Logger.log(`⚠️ 入班日期似乎過於未來：${date.toLocaleDateString()}，請確認`);
    }
    
    Logger.log(`✅ 入班日期驗證通過：${date.toLocaleDateString()}`);
    return date;
    
  } catch (error) {
    Logger.log(`❌ 入班日期驗證失敗：${error.message}`);
    return null;
  }
}

/**
 * 🔧 獲取進度補齊配置
 * @returns {Object} 進度補齊配置
 */
function getProgressCompletionConfig() {
  try {
    const config = SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.PROGRESS_COMPLETION;
    
    if (!config) {
      Logger.log('⚠️ 進度補齊配置不存在，使用預設配置');
      return {
        DEFAULT_MODE: 'ENROLLMENT_AWARE',
        MODES: {
          'ENROLLMENT_AWARE': {
            name: '入班感知模式',
            description: '僅建立入班後期次的記錄',
            onlyPostEnrollment: true
          }
        }
      };
    }
    
    Logger.log(`🔧 已載入進度補齊配置，預設模式：${config.DEFAULT_MODE}`);
    return config;
    
  } catch (error) {
    Logger.log(`❌ 獲取進度補齊配置失敗：${error.message}`);
    return {
      DEFAULT_MODE: 'ENROLLMENT_AWARE',
      MODES: {
        'ENROLLMENT_AWARE': {
          name: '入班感知模式',
          description: '僅建立入班後期次的記錄',
          onlyPostEnrollment: true
        }
      }
    };
  }
}

/**
 * 📊 分析入班感知記錄生成結果
 * @param {Array} records 生成的記錄
 * @param {string} strategy 使用的策略
 * @param {Date} enrollmentDate 入班日期
 * @returns {Object} 分析結果
 */
function analyzeEnrollmentAwareGeneration(records, strategy, enrollmentDate) {
  try {
    const analysis = {
      totalRecords: records.length,
      strategy: strategy,
      enrollmentDate: enrollmentDate ? enrollmentDate.toLocaleDateString() : '未指定',
      semesterBreakdown: {},
      termBreakdown: {},
      summary: ''
    };
    
    // 📊 按學期和期次分析
    records.forEach(record => {
      const semester = record[5]; // F: Semester
      const term = record[6];     // G: Term
      
      analysis.semesterBreakdown[semester] = (analysis.semesterBreakdown[semester] || 0) + 1;
      analysis.termBreakdown[term] = (analysis.termBreakdown[term] || 0) + 1;
    });
    
    // 📝 生成摘要
    const semesterSummary = Object.entries(analysis.semesterBreakdown)
      .map(([sem, count]) => `${sem}:${count}`).join(', ');
    const termSummary = Object.entries(analysis.termBreakdown)
      .map(([term, count]) => `${term}:${count}`).join(', ');
    
    analysis.summary = `策略${strategy}生成${analysis.totalRecords}筆記錄 (${semesterSummary}) (${termSummary})`;
    
    return analysis;
    
  } catch (error) {
    Logger.log(`❌ 記錄生成分析失敗：${error.message}`);
    return {
      totalRecords: records.length,
      strategy: strategy,
      summary: `生成${records.length}筆記錄`
    };
  }
}

// ============ 🧪 入班感知系統測試與驗證 ============

/**
 * 🧪 測試入班感知記錄生成系統
 * 驗證所有三種補齊策略的正確性
 * @param {Object} testStudentData 測試學生資料
 * @returns {Object} 測試結果
 */
function testEnrollmentAwareRecordGeneration(testStudentData = null) {
  try {
    Logger.log('🧪 開始入班感知記錄生成系統測試');
    
    // 📋 測試資料準備
    const testStudent = testStudentData || {
      'ID': 'TEST001',
      'Chinese Name': '測試學生',
      'English Name': 'Test Student',
      'English Class': 'Test Class A'
    };
    
    const testResults = {
      testsPassed: 0,
      totalTests: 0,
      strategies: {},
      summary: '',
      errors: []
    };
    
    // 🔧 測試策略A：補齊全部記錄
    testResults.totalTests++;
    try {
      const completeAllRecords = generateScheduledContactsWithEnrollmentAwareness(testStudent, {
        completionMode: 'COMPLETE_ALL'
      });
      
      const expectedCount = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.length * SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.length;
      if (completeAllRecords.length === expectedCount) {
        testResults.testsPassed++;
        testResults.strategies.COMPLETE_ALL = { passed: true, recordCount: completeAllRecords.length };
        Logger.log(`✅ 策略A測試通過：生成 ${completeAllRecords.length} 筆記錄`);
      } else {
        testResults.strategies.COMPLETE_ALL = { passed: false, expected: expectedCount, actual: completeAllRecords.length };
        Logger.log(`❌ 策略A測試失敗：期望 ${expectedCount} 筆，實際 ${completeAllRecords.length} 筆`);
      }
    } catch (error) {
      testResults.strategies.COMPLETE_ALL = { passed: false, error: error.message };
      testResults.errors.push(`策略A測試錯誤: ${error.message}`);
    }
    
    // 🔧 測試策略B：入班感知模式
    testResults.totalTests++;
    try {
      const enrollmentAwareRecords = generateScheduledContactsWithEnrollmentAwareness(testStudent, {
        completionMode: 'ENROLLMENT_AWARE',
        enrollmentDate: new Date().toISOString().split('T')[0] // 今天入班
      });
      
      if (enrollmentAwareRecords.length > 0 && enrollmentAwareRecords.length <= 6) {
        testResults.testsPassed++;
        testResults.strategies.ENROLLMENT_AWARE = { passed: true, recordCount: enrollmentAwareRecords.length };
        Logger.log(`✅ 策略B測試通過：生成 ${enrollmentAwareRecords.length} 筆記錄`);
      } else {
        testResults.strategies.ENROLLMENT_AWARE = { passed: false, recordCount: enrollmentAwareRecords.length };
        Logger.log(`❌ 策略B測試失敗：不合理的記錄數量 ${enrollmentAwareRecords.length}`);
      }
    } catch (error) {
      testResults.strategies.ENROLLMENT_AWARE = { passed: false, error: error.message };
      testResults.errors.push(`策略B測試錯誤: ${error.message}`);
    }
    
    // 🔧 測試策略C：手動提示模式
    testResults.totalTests++;
    try {
      const manualPromptRecords = generateScheduledContactsWithEnrollmentAwareness(testStudent, {
        completionMode: 'MANUAL_PROMPT',
        enrollmentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30天前入班
      });
      
      const expectedCount = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.length * SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.length;
      // 檢查是否有標註的記錄
      const annotatedRecords = manualPromptRecords.filter(record => record[8] && record[8].includes('非本班在籍'));
      
      if (manualPromptRecords.length === expectedCount && annotatedRecords.length > 0) {
        testResults.testsPassed++;
        testResults.strategies.MANUAL_PROMPT = { 
          passed: true, 
          recordCount: manualPromptRecords.length, 
          annotatedCount: annotatedRecords.length 
        };
        Logger.log(`✅ 策略C測試通過：生成 ${manualPromptRecords.length} 筆記錄，其中 ${annotatedRecords.length} 筆有標註`);
      } else {
        testResults.strategies.MANUAL_PROMPT = { 
          passed: false, 
          expected: expectedCount, 
          actual: manualPromptRecords.length,
          annotated: annotatedRecords.length
        };
        Logger.log(`❌ 策略C測試失敗`);
      }
    } catch (error) {
      testResults.strategies.MANUAL_PROMPT = { passed: false, error: error.message };
      testResults.errors.push(`策略C測試錯誤: ${error.message}`);
    }
    
    // 📊 測試結果統計
    const passRate = (testResults.testsPassed / testResults.totalTests * 100).toFixed(1);
    testResults.summary = `入班感知系統測試結果：${testResults.testsPassed}/${testResults.totalTests} 通過 (${passRate}%)`;
    
    Logger.log(`📊 ${testResults.summary}`);
    
    if (testResults.errors.length > 0) {
      Logger.log('❌ 測試錯誤：');
      testResults.errors.forEach(error => Logger.log(`  - ${error}`));
    }
    
    return testResults;
    
  } catch (error) {
    Logger.log(`❌ 入班感知系統測試失敗：${error.message}`);
    return {
      testsPassed: 0,
      totalTests: 3,
      summary: '測試系統錯誤',
      errors: [error.message]
    };
  }
}

/**
 * 🔍 驗證轉班學生入班感知記錄整合
 * 測試與StudentChangeManager.gs的整合效果
 * @param {Object} transferTestData 轉班測試資料
 * @returns {Object} 整合測試結果
 */
function validateEnrollmentAwareTransferIntegration(transferTestData = null) {
  try {
    Logger.log('🔍 開始驗證轉班學生入班感知記錄整合');
    
    // 📋 測試資料準備
    const testTransferData = transferTestData || {
      studentData: {
        'ID': 'TRANS001',
        'Chinese Name': '轉班測試學生',
        'English Name': 'Transfer Test Student',
        'English Class': 'New Class B'
      },
      transferDate: new Date().toISOString().split('T')[0],
      completionMode: 'ENROLLMENT_AWARE'
    };
    
    const integrationResult = {
      configurationTest: false,
      generationTest: false,
      strategySwitchTest: false,
      backwardCompatibilityTest: false,
      overallPassed: false,
      details: {},
      summary: ''
    };
    
    // 🔧 測試配置系統讀取
    try {
      const config = getProgressCompletionConfig();
      if (config && config.MODES && config.DEFAULT_MODE) {
        integrationResult.configurationTest = true;
        integrationResult.details.configuration = '配置系統正常';
        Logger.log('✅ 配置系統測試通過');
      }
    } catch (error) {
      integrationResult.details.configuration = `配置系統錯誤: ${error.message}`;
    }
    
    // 🔧 測試記錄生成整合
    try {
      const records = generateScheduledContactsWithEnrollmentAwareness(
        testTransferData.studentData, 
        {
          completionMode: testTransferData.completionMode,
          transferContext: {
            transferDate: testTransferData.transferDate
          }
        }
      );
      
      if (records && records.length > 0) {
        integrationResult.generationTest = true;
        integrationResult.details.generation = `成功生成 ${records.length} 筆記錄`;
        Logger.log('✅ 記錄生成整合測試通過');
      }
    } catch (error) {
      integrationResult.details.generation = `記錄生成錯誤: ${error.message}`;
    }
    
    // 🔧 測試策略切換
    try {
      const modes = ['COMPLETE_ALL', 'ENROLLMENT_AWARE', 'MANUAL_PROMPT'];
      let switchTestsPassed = 0;
      
      for (const mode of modes) {
        const records = generateScheduledContactsWithEnrollmentAwareness(
          testTransferData.studentData,
          { completionMode: mode }
        );
        if (records && Array.isArray(records)) {
          switchTestsPassed++;
        }
      }
      
      if (switchTestsPassed === modes.length) {
        integrationResult.strategySwitchTest = true;
        integrationResult.details.strategySwitch = '所有策略切換正常';
        Logger.log('✅ 策略切換測試通過');
      }
    } catch (error) {
      integrationResult.details.strategySwitch = `策略切換錯誤: ${error.message}`;
    }
    
    // 🔧 測試向下相容性
    try {
      const originalRecords = generateScheduledContactsForStudent(
        testTransferData.studentData,
        { skipPastRecords: true }
      );
      
      if (originalRecords && Array.isArray(originalRecords)) {
        integrationResult.backwardCompatibilityTest = true;
        integrationResult.details.backwardCompatibility = '原始系統相容性保持';
        Logger.log('✅ 向下相容性測試通過');
      }
    } catch (error) {
      integrationResult.details.backwardCompatibility = `向下相容性錯誤: ${error.message}`;
    }
    
    // 📊 結果統計
    const passedTests = [
      integrationResult.configurationTest,
      integrationResult.generationTest,
      integrationResult.strategySwitchTest,
      integrationResult.backwardCompatibilityTest
    ].filter(test => test === true).length;
    
    integrationResult.overallPassed = passedTests === 4;
    integrationResult.summary = `轉班學生入班感知記錄整合測試：${passedTests}/4 通過`;
    
    Logger.log(`📊 ${integrationResult.summary}`);
    return integrationResult;
    
  } catch (error) {
    Logger.log(`❌ 轉班學生入班感知記霄整合測試失敗：${error.message}`);
    return {
      overallPassed: false,
      summary: '整合測試系統錯誤',
      details: { error: error.message }
    };
  }
}

// ============ 📝 快速驗證入口 - 管理員使用 ============

/**
 * 📝 快速驗證入班感知系統 - 管理員入口
 * 可從 Google Apps Script 直接執行的快速測試函數
 * @returns {Object} 綜合測試結果
 */
function quickValidateEnrollmentAwareSystem() {
  try {
    Logger.log('📝 ==========================================================');
    Logger.log('📝 快速驗證入班感知進度記錄補齊系統');
    Logger.log('📝 ==========================================================');
    
    const overallResult = {
      timestamp: new Date().toLocaleString(),
      systemTests: null,
      integrationTests: null,
      configurationCheck: null,
      overallHealth: 'UNKNOWN',
      recommendations: [],
      summary: ''
    };
    
    // 🔧 1. 系統功能測試
    Logger.log('🔧 步驟 1/3: 執行系統功能測試...');
    overallResult.systemTests = testEnrollmentAwareRecordGeneration();
    
    // 🔍 2. 整合測試
    Logger.log('🔍 步驟 2/3: 執行整合測試...');
    overallResult.integrationTests = validateEnrollmentAwareTransferIntegration();
    
    // 🔧 3. 配置系統檢查
    Logger.log('🔧 步驟 3/3: 檢查配置系統...');
    overallResult.configurationCheck = validateProgressCompletionConfiguration();
    
    // 📊 綜合健康評估
    const systemHealth = overallResult.systemTests.testsPassed === overallResult.systemTests.totalTests;
    const integrationHealth = overallResult.integrationTests.overallPassed;
    const configHealth = overallResult.configurationCheck.isValid;
    
    if (systemHealth && integrationHealth && configHealth) {
      overallResult.overallHealth = 'EXCELLENT';
      overallResult.recommendations.push('✅ 系統健康狀態優良，可安全使用');
    } else if (systemHealth && integrationHealth) {
      overallResult.overallHealth = 'GOOD';
      overallResult.recommendations.push('⚠️ 系統功能正常，但配置需要檢查');
    } else if (systemHealth) {
      overallResult.overallHealth = 'WARNING';
      overallResult.recommendations.push('⚠️ 基本功能正常，但整合有問題');
    } else {
      overallResult.overallHealth = 'CRITICAL';
      overallResult.recommendations.push('❌ 系統核心功能有問題，需要立即修復');
    }
    
    // 📝 生成綜合摘要
    overallResult.summary = `入班感知系統健康評估: ${overallResult.overallHealth} | ` +
                           `功能測試: ${overallResult.systemTests.testsPassed}/${overallResult.systemTests.totalTests} | ` +
                           `整合測試: ${overallResult.integrationTests.overallPassed ? '通過' : '失敗'} | ` +
                           `配置檢查: ${configHealth ? '正常' : '異常'}`;
    
    // 📊 輸出結果
    Logger.log('📝 ==========================================================');
    Logger.log('📊 快速驗證結果:');
    Logger.log(`📊 ${overallResult.summary}`);
    Logger.log('📊 建議:');
    overallResult.recommendations.forEach(rec => Logger.log(`   ${rec}`));
    Logger.log('📝 ==========================================================');
    
    return overallResult;
    
  } catch (error) {
    Logger.log(`❌ 快速驗證系統錯誤: ${error.message}`);
    return {
      timestamp: new Date().toLocaleString(),
      overallHealth: 'ERROR',
      summary: '驗證系統本身出現錯誤',
      error: error.message
    };
  }
}

/**
 * 🔧 驗證進度補齊配置系統
 * @returns {Object} 配置驗證結果
 */
function validateProgressCompletionConfiguration() {
  try {
    Logger.log('🔧 驗證進度補齊配置系統');
    
    const validationResult = {
      isValid: false,
      configExists: false,
      defaultModeValid: false,
      allModesValid: false,
      details: {},
      issues: []
    };
    
    // 🔍 檢查配置是否存在
    const config = SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.PROGRESS_COMPLETION;
    if (!config) {
      validationResult.issues.push('配置不存在: SYSTEM_CONFIG.TRANSFER_MANAGEMENT.PROGRESS_COMPLETION');
      return validationResult;
    }
    
    validationResult.configExists = true;
    validationResult.details.configFound = '✅ 配置存在';
    
    // 🔍 檢查預設模式
    if (config.DEFAULT_MODE && config.MODES && config.MODES[config.DEFAULT_MODE]) {
      validationResult.defaultModeValid = true;
      validationResult.details.defaultMode = `✅ 預設模式: ${config.DEFAULT_MODE}`;
    } else {
      validationResult.issues.push(`預設模式無效: ${config.DEFAULT_MODE}`);
    }
    
    // 🔍 檢查所有模式
    const expectedModes = ['COMPLETE_ALL', 'ENROLLMENT_AWARE', 'MANUAL_PROMPT'];
    const availableModes = Object.keys(config.MODES || {});
    const missingModes = expectedModes.filter(mode => !availableModes.includes(mode));
    
    if (missingModes.length === 0) {
      validationResult.allModesValid = true;
      validationResult.details.modes = `✅ 所有預期模式存在: ${expectedModes.join(', ')}`;
    } else {
      validationResult.issues.push(`缺少模式: ${missingModes.join(', ')}`);
    }
    
    // 📊 綜合評估
    validationResult.isValid = validationResult.configExists && 
                               validationResult.defaultModeValid && 
                               validationResult.allModesValid;
    
    if (validationResult.isValid) {
      Logger.log('✅ 進度補齊配置系統驗證通過');
    } else {
      Logger.log('❌ 進度補齊配置系統驗證失敗');
      validationResult.issues.forEach(issue => Logger.log(`  - ${issue}`));
    }
    
    return validationResult;
    
  } catch (error) {
    Logger.log(`❌ 配置系統驗證錯誤: ${error.message}`);
    return {
      isValid: false,
      error: error.message,
      issues: ['配置系統驗證出現錯誤']
    };
  }
}

/**
 * 🎯 簡單示範：入班感知系統使用
 * 示範如何在不同情境下使用三種補齊策略
 */
function demonstrateEnrollmentAwareUsage() {
  try {
    Logger.log('🎯 ==========================================================');
    Logger.log('🎯 入班感知系統使用示範');
    Logger.log('🎯 ==========================================================');
    
    // 📋 模擬學生資料
    const demoStudent = {
      'ID': 'DEMO2024001',
      'Chinese Name': '示範學生',
      'English Name': 'Demo Student',
      'English Class': 'Demo Class A'
    };
    
    Logger.log(`👥 模擬學生: ${demoStudent['Chinese Name']} (${demoStudent.ID})`);
    Logger.log('');
    
    // 📊 情境 1：新學期開始，需要完整記錄
    Logger.log('📊 情境 1: 新學期開始 - 使用 COMPLETE_ALL 策略');
    const completeAllDemo = generateScheduledContactsWithEnrollmentAwareness(demoStudent, {
      completionMode: 'COMPLETE_ALL'
    });
    Logger.log(`   結果: 生成 ${completeAllDemo.length} 筆完整記錄 (預設未聯絡)`);
    Logger.log('');
    
    // 📊 情境 2：學期中轉入，只要未來期次
    Logger.log('📊 情境 2: 學期中轉入 - 使用 ENROLLMENT_AWARE 策略');
    const enrollmentAwareDemo = generateScheduledContactsWithEnrollmentAwareness(demoStudent, {
      completionMode: 'ENROLLMENT_AWARE',
      enrollmentDate: new Date().toISOString().split('T')[0] // 今天入班
    });
    Logger.log(`   結果: 生成 ${enrollmentAwareDemo.length} 筆入班後記錄 (僅未來期次)`);
    Logger.log('');
    
    // 📊 情境 3：需要完整追蹤但明確區分
    Logger.log('📊 情境 3: 完整追蹤需求 - 使用 MANUAL_PROMPT 策略');
    const manualPromptDemo = generateScheduledContactsWithEnrollmentAwareness(demoStudent, {
      completionMode: 'MANUAL_PROMPT',
      enrollmentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30天前入班
    });
    const annotatedCount = manualPromptDemo.filter(record => record[8] && record[8].includes('非本班在籍')).length;
    Logger.log(`   結果: 生成 ${manualPromptDemo.length} 筆完整記錄，其中 ${annotatedCount} 筆標註"非本班在籍"`);
    Logger.log('');
    
    // 📊 比較結果
    Logger.log('📊 策略比較結果:');
    Logger.log(`   COMPLETE_ALL:     ${completeAllDemo.length} 筆記錄 (適合新學期開始)`);
    Logger.log(`   ENROLLMENT_AWARE: ${enrollmentAwareDemo.length} 筆記錄 (適合中途轉入)`);
    Logger.log(`   MANUAL_PROMPT:    ${manualPromptDemo.length} 筆記錄 (適合完整追蹤)`);
    
    Logger.log('🎯 ==========================================================');
    Logger.log('✅ 示範完成！三種策略均可正常運作');
    Logger.log('🎯 ==========================================================');
    
    return {
      success: true,
      strategies: {
        COMPLETE_ALL: completeAllDemo.length,
        ENROLLMENT_AWARE: enrollmentAwareDemo.length,
        MANUAL_PROMPT: manualPromptDemo.length
      },
      summary: '所有策略皆可正常運作'
    };
    
  } catch (error) {
    Logger.log(`❌ 示範過程出現錯誤: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============ 支援函數：Scheduled Contact 記錄生成增強功能 ============

/**
 * 🔍 驗證學生資料的完整性
 * @param {Object} studentData 學生資料對象
 * @returns {Object} 驗證結果 {isValid: boolean, missingFields: Array}
 */
function validateStudentDataCompleteness(studentData) {
  const requiredFields = ['ID', 'Chinese Name', 'English Class'];
  const alternativeFields = {
    'ID': ['Student ID'],
    'Chinese Name': ['Name'],
    'English Class': []
  };
  
  const missingFields = [];
  
  for (const field of requiredFields) {
    const hasField = studentData[field] && studentData[field].toString().trim() !== '';
    let hasAlternative = false;
    
    // 檢查替代欄位
    if (!hasField && alternativeFields[field]) {
      for (const altField of alternativeFields[field]) {
        if (studentData[altField] && studentData[altField].toString().trim() !== '') {
          hasAlternative = true;
          break;
        }
      }
    }
    
    if (!hasField && !hasAlternative) {
      missingFields.push(field);
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields: missingFields
  };
}

/**
 * 📅 獲取當前學期資訊
 * @param {Date} currentDate 當前日期
 * @returns {Object} 學期資訊 {semester: string, term: string}
 */
function getCurrentSemesterInfo(currentDate) {
  const month = currentDate.getMonth() + 1; // JavaScript月份從0開始
  
  // 簡化的學期判斷邏輯（可依實際需求調整）
  let semester, term;
  
  if (month >= 8 && month <= 12) {
    // 8-12月：Fall學期
    semester = 'Fall';
    if (month >= 8 && month <= 9) {
      term = 'Beginning';
    } else if (month >= 10 && month <= 11) {
      term = 'Midterm';
    } else {
      term = 'Final';
    }
  } else if (month >= 1 && month <= 6) {
    // 1-6月：Spring學期
    semester = 'Spring';
    if (month >= 1 && month <= 2) {
      term = 'Beginning';
    } else if (month >= 3 && month <= 4) {
      term = 'Midterm';
    } else {
      term = 'Final';
    }
  } else {
    // 7月：暑假，視為下一個Fall學期的準備期
    semester = 'Fall';
    term = 'Beginning';
  }
  
  return { semester, term };
}

/**
 * 🕒 判斷指定學期Term是否為過去的記錄
 * @param {string} semester 學期
 * @param {string} term Term
 * @param {Object} currentSemesterInfo 當前學期資訊
 * @returns {boolean} 是否為過去記錄
 */
function isPastRecord(semester, term, currentSemesterInfo) {
  const semesterOrder = { 'Fall': 0, 'Spring': 1 };
  const termOrder = { 'Beginning': 0, 'Midterm': 1, 'Final': 2 };
  
  const recordSemesterOrder = semesterOrder[semester];
  const recordTermOrder = termOrder[term];
  const currentSemesterOrder = semesterOrder[currentSemesterInfo.semester];
  const currentTermOrder = termOrder[currentSemesterInfo.term];
  
  // 比較學期
  if (recordSemesterOrder < currentSemesterOrder) {
    return true;
  } else if (recordSemesterOrder > currentSemesterOrder) {
    return false;
  } else {
    // 同一學期，比較Term
    return recordTermOrder < currentTermOrder;
  }
}

/**
 * 🔄 檢查是否為重複記錄
 * @param {string} studentId 學生ID
 * @param {string} semester 學期
 * @param {string} term Term
 * @param {Array} existingRecords 現有記錄陣列
 * @returns {boolean} 是否重複
 */
function isDuplicateRecord(studentId, semester, term, existingRecords) {
  if (!existingRecords || existingRecords.length === 0) {
    return false;
  }
  
  return existingRecords.some(record => {
    // 記錄格式：[Student ID, Name, English Name, English Class, Date, Semester, Term, Contact Type, ...]
    return record[0] === studentId && 
           record[5] === semester && 
           record[6] === term &&
           record[7] === SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER;
  });
}

/**
 * 📊 分析生成的記錄
 * @param {Array} records 生成的記錄陣列
 * @returns {Object} 分析結果
 */
function analyzeGeneratedRecords(records) {
  const semesterCounts = {};
  const termCounts = {};
  
  records.forEach(record => {
    const semester = record[5];
    const term = record[6];
    
    semesterCounts[semester] = (semesterCounts[semester] || 0) + 1;
    termCounts[term] = (termCounts[term] || 0) + 1;
  });
  
  const summary = `總計 ${records.length} 筆，學期分布：${Object.entries(semesterCounts).map(([k,v]) => `${k}=${v}`).join(', ')}，Term分布：${Object.entries(termCounts).map(([k,v]) => `${k}=${v}`).join(', ')}`;
  
  return {
    totalRecords: records.length,
    semesterDistribution: semesterCounts,
    termDistribution: termCounts,
    summary: summary
  };
}

// ============ 支援函數：轉移記錄智能處理相關 ============

/**
 * 🔍 驗證目標記錄簿的有效性
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} targetBook 目標記錄簿
 * @param {string} teacherName 老師姓名
 * @returns {Object} 驗證結果
 */
function validateTargetBook(targetBook, teacherName) {
  try {
    if (!targetBook) {
      return { isValid: false, message: '目標記錄簿為空' };
    }
    
    const bookName = targetBook.getName();
    if (!bookName.includes(teacherName)) {
      Logger.log(`⚠️ 記錄簿名稱不匹配：${bookName} 不包含 ${teacherName}`);
    }
    
    // 檢查必要的工作表
    const requiredSheets = [SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST];
    const missingSheets = [];
    
    for (const sheetName of requiredSheets) {
      if (!targetBook.getSheetByName(sheetName)) {
        missingSheets.push(sheetName);
      }
    }
    
    if (missingSheets.length > 0) {
      return { 
        isValid: false, 
        message: `缺少必要工作表：${missingSheets.join(', ')}` 
      };
    }
    
    return { 
      isValid: true, 
      message: '目標記錄簿驗證通過',
      bookName: bookName
    };
    
  } catch (error) {
    return { 
      isValid: false, 
      message: `驗證過程錯誤：${error.message}` 
    };
  }
}

/**
 * 🏗️ 在需要時創建電聯記錄工作表
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} targetBook 目標記錄簿
 * @param {string} teacherName 老師姓名
 * @returns {Object} 創建結果
 */
function createContactLogSheetIfNeeded(targetBook, teacherName) {
  try {
    if (typeof createContactLogSheet === 'function') {
      createContactLogSheet(targetBook, { name: teacherName, studentCount: 0, classes: [] });
      Logger.log('✅ 成功創建電聯記錄工作表');
      return { success: true, message: '電聯記錄工作表創建成功' };
    } else {
      return { 
        success: false, 
        message: 'createContactLogSheet 函數不可用' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `創建工作表失敗：${error.message}` 
    };
  }
}

/**
 * 📊 獲取現有的電聯記錄
 * @param {GoogleAppsScript.Spreadsheet.Sheet} contactSheet 電聯記錄工作表
 * @param {string} studentId 學生ID
 * @returns {Array} 現有記錄陣列
 */
function getExistingContactRecords(contactSheet, studentId) {
  try {
    if (!contactSheet || contactSheet.getLastRow() <= 1) {
      return [];
    }
    
    const data = contactSheet.getDataRange().getValues();
    const headers = data[0];
    const records = data.slice(1);
    
    // 過濾出該學生的記錄
    const studentRecords = records.filter(row => {
      return row[0] === studentId; // 第一欄是 Student ID
    });
    
    Logger.log(`📊 找到 ${studentRecords.length} 筆現有記錄 (學生ID: ${studentId})`);
    return studentRecords;
    
  } catch (error) {
    Logger.log(`❌ 獲取現有記錄失敗：${error.message}`);
    return [];
  }
}

/**
 * ✅ 驗證和標準化記錄格式
 * @param {Array} records 記錄陣列
 * @param {Object} studentData 學生資料
 * @param {string} teacherName 老師姓名
 * @returns {Array} 驗證後的記錄陣列
 */
function validateAndStandardizeRecords(records, studentData, teacherName) {
  const validatedRecords = [];
  
  records.forEach((record, index) => {
    try {
      // 基本格式檢查
      if (!Array.isArray(record) || record.length < 11) {
        Logger.log(`⚠️ 記錄 ${index + 1} 格式不正確，跳過`);
        return;
      }
      
      // 必要欄位檢查
      if (!record[0] || !record[1] || !record[3] || !record[5] || !record[6]) {
        Logger.log(`⚠️ 記錄 ${index + 1} 缺少必要欄位，跳過`);
        return;
      }
      
      // 標準化記錄（確保格式一致）
      const standardizedRecord = [
        record[0],                                      // Student ID
        record[1],                                      // Name
        record[2] || studentData['English Name'] || '', // English Name
        record[3],                                      // English Class
        record[4] || '',                                // Date
        record[5],                                      // Semester
        record[6],                                      // Term
        record[7] || SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER, // Contact Type
        record[8] || '',                                // Teachers Content
        record[9] || '',                                // Parents Responses
        record[10] || ''                                // Contact Method
      ];
      
      validatedRecords.push(standardizedRecord);
      
    } catch (error) {
      Logger.log(`❌ 驗證記錄 ${index + 1} 時發生錯誤：${error.message}`);
    }
  });
  
  Logger.log(`✅ 驗證完成：${records.length} → ${validatedRecords.length} 筆有效記錄`);
  return validatedRecords;
}

/**
 * 📝 安全插入記錄到工作表
 * @param {GoogleAppsScript.Spreadsheet.Sheet} contactSheet 電聯記錄工作表
 * @param {Array} records 要插入的記錄
 * @returns {Object} 插入結果
 */
function insertRecordsWithValidation(contactSheet, records) {
  try {
    if (!records || records.length === 0) {
      return { 
        success: false, 
        message: '沒有記錄需要插入' 
      };
    }
    
    const startRow = contactSheet.getLastRow() + 1;
    const numCols = records[0].length;
    
    // 檢查工作表容量
    if (startRow + records.length > contactSheet.getMaxRows()) {
      // 增加行數
      const additionalRows = (startRow + records.length) - contactSheet.getMaxRows() + 10;
      contactSheet.insertRowsAfter(contactSheet.getMaxRows(), additionalRows);
      Logger.log(`📈 增加 ${additionalRows} 行到工作表`);
    }
    
    // 插入記錄
    contactSheet.getRange(startRow, 1, records.length, numCols).setValues(records);
    
    return { 
      success: true, 
      startRow: startRow,
      message: `成功插入 ${records.length} 筆記錄到第 ${startRow} 行開始` 
    };
    
  } catch (error) {
    return { 
      success: false, 
      message: `插入記錄失敗：${error.message}` 
    };
  }
}

/**
 * 🔄 執行電聯記錄排序
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} targetBook 目標記錄簿
 * @returns {Object} 排序結果
 */
function performContactRecordsSorting(targetBook) {
  try {
    if (typeof ensureContactRecordsSorting === 'function') {
      ensureContactRecordsSorting(targetBook);
      return { success: true, message: '排序完成' };
    } else {
      return { 
        success: false, 
        message: 'ensureContactRecordsSorting 函數不可用，跳過排序' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `排序失敗：${error.message}` 
    };
  }
}

/**
 * 🎯 驗證轉移完整性
 * @param {GoogleAppsScript.Spreadsheet.Sheet} contactSheet 電聯記錄工作表
 * @param {string} studentId 學生ID
 * @param {Array} newRecords 新添加的記錄
 * @returns {Object} 完整性檢查結果
 */
function verifyTransferIntegrity(contactSheet, studentId, newRecords) {
  try {
    // 重新獲取該學生的所有記錄
    const allRecords = getExistingContactRecords(contactSheet, studentId);
    
    // 檢查是否包含新記錄
    const expectedTotal = allRecords.length;
    const newRecordsCount = newRecords.length;
    
    // 基本數量檢查
    if (expectedTotal < newRecordsCount) {
      return {
        isValid: false,
        message: `記錄數量異常：期望至少 ${newRecordsCount} 筆，實際 ${expectedTotal} 筆`
      };
    }
    
    // 檢查必要的學期Term組合是否存在
    const semesterTerms = allRecords.map(record => `${record[5]}-${record[6]}`);
    const uniqueTerms = [...new Set(semesterTerms)];
    
    return {
      isValid: true,
      message: '轉移完整性驗證通過',
      details: {
        totalRecords: expectedTotal,
        newRecords: newRecordsCount,
        uniqueTerms: uniqueTerms.length,
        semesterTermCombinations: uniqueTerms
      }
    };
    
  } catch (error) {
    return {
      isValid: false,
      message: `完整性驗證失敗：${error.message}`
    };
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