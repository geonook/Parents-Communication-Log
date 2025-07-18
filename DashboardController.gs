/**
 * Dashboard Web App 控制器
 * 提供視覺化管理介面的後端支援
 */


/**
 * 處理 GET 請求，返回 Dashboard HTML 頁面
 */
function doGet() {
  return HtmlService.createTemplateFromFile('dashboard')
    .evaluate()
    .setTitle('電聯記錄簿系統 - 管理面板')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 處理 POST 請求
 */
function doPost(e) {
  const action = e.parameter.action;
  
  try {
    switch (action) {
      case 'createFromMasterList':
        return createTeachersFromStudentMasterListWeb();
      case 'createSingleTeacher':
        return createSingleTeacherWeb(e.parameter);
      case 'initializeSystem':
        return initializeSystemWeb();
      case 'getStats':
        return getSystemStatsWeb();
      case 'getSystemStatus':
        return getSystemStatusWeb();
      case 'setupCompleteSystem':
        return setupCompleteSystemWeb();
      default:
        return { success: false, message: '未知的操作' };
    }
  } catch (error) {
    Logger.log('Dashboard POST 錯誤：' + error.toString());
    return { success: false, message: error.message };
  }
}

/**
 * 包含檔案內容（用於模組化 HTML）
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Web 版本的從學生總表建立老師記錄簿（完整實現）
 */
function createTeachersFromStudentMasterListWeb(masterListId) {
  try {
    Logger.log('Dashboard: 開始從學生總表建立老師記錄簿');
    
    let studentMasterData;
    
    // 優先嘗試使用系統學生總表
    if (!masterListId || masterListId.trim() === '') {
      Logger.log('Dashboard: 未提供 ID，嘗試使用系統學生總表');
      const systemMasterList = getSystemMasterList();
      if (systemMasterList) {
        // 診斷資訊
        Logger.log(`Dashboard: 系統學生總表資料行數：${systemMasterList.length}`);
        if (systemMasterList.length > 2) {
          Logger.log(`Dashboard: 第3行標題欄位：${JSON.stringify(systemMasterList[2])}`);
        }
        
        studentMasterData = {
          data: systemMasterList.slice(3), // 跳過前3行（標題、說明、欄位名稱）
          headers: systemMasterList[2],    // 第3行是標題
          sheetId: 'system'
        };
        Logger.log('Dashboard: 成功使用系統學生總表');
      } else {
        return {
          success: false,
          message: '找不到系統學生總表，請提供學生總表的 Google Sheets ID 或先初始化系統'
        };
      }
    } else {
      // 使用用戶提供的 ID
      Logger.log('Dashboard: 使用用戶提供的學生總表 ID');
      studentMasterData = getStudentMasterListById(masterListId);
      if (!studentMasterData) {
        return {
          success: false,
          message: '無法獲取學生總表資料，請檢查 ID 是否正確'
        };
      }
    }
    
    // 從學生總表中提取老師資訊
    const teachersInfo = extractTeachersFromMasterList(studentMasterData);
    if (!teachersInfo || teachersInfo.length === 0) {
      return {
        success: false,
        message: '未從學生總表中找到老師資訊（需要 LT 欄位）'
      };
    }
    
    Logger.log(`Dashboard: 找到 ${teachersInfo.length} 位老師`);
    
    // 批量創建老師記錄簿
    const createResult = batchCreateTeachersFromMasterList(teachersInfo, studentMasterData);
    
    Logger.log(`Dashboard: 創建完成 - 成功：${createResult.successCount}，失敗：${createResult.errorCount}`);
    
    return {
      success: true,
      message: `批量創建完成！\n成功創建：${createResult.successCount} 位老師的記錄簿\n失敗：${createResult.errorCount} 位\n\n每位老師的記錄簿已包含相關學生資料`,
      results: createResult
    };
    
  } catch (error) {
    Logger.log('Dashboard: 從學生總表批量創建老師記錄簿失敗 - ' + error.toString());
    return {
      success: false,
      message: '創建失敗：' + error.message
    };
  }
}

/**
 * 根據 ID 獲取學生總表資料（Web 版本）
 */
function getStudentMasterListById(sheetId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    const sheet = spreadsheet.getActiveSheet();
    
    // 檢查是否有資料
    const dataRange = sheet.getDataRange();
    if (dataRange.getNumRows() < 4) {
      throw new Error('學生總表資料不足（至少需要標題和一筆學生資料）');
    }
    
    // 獲取所有資料
    const data = dataRange.getValues();
    
    // 檢查是否有必要的欄位
    const headers = data[2]; // 第3行是標題
    if (!headers.includes('LT') && !headers.includes('Local Teacher')) {
      throw new Error('學生總表缺少必要的 LT (Local Teacher) 欄位');
    }
    
    Logger.log(`成功獲取學生總表資料：${data.length - 3} 筆學生資料`);
    return {
      data: data.slice(3), // 實際學生資料（跳過前3行）
      headers: headers,   // 標題行
      sheetId: sheetId
    };
    
  } catch (error) {
    Logger.log('獲取學生總表資料失敗：' + error.toString());
    return null;
  }
}

/**
 * Web 版本的建立單一老師記錄簿
 */
function createSingleTeacherWeb(params) {
  try {
    const teacherInfo = {
      name: params.teacherName,
      subject: '英文',
      classes: params.teacherClasses.split(',').map(c => c.trim()).filter(c => c.length > 0)
    };
    
    if (!teacherInfo.name || teacherInfo.classes.length === 0) {
      return {
        success: false,
        message: '請提供完整的老師資訊'
      };
    }
    
    const recordBook = createTeacherSheet(teacherInfo);
    
    return {
      success: true,
      message: `${teacherInfo.name} 老師的記錄簿建立成功！\n\n📝 下一步：\n• 匯入學生資料以自動建立電聯記錄\n• 系統會自動按照正確順序排列所有記錄\n• 排序規則：學生ID → Fall/Spring → Beginning/Midterm/Final`,
      recordBookUrl: recordBook.getUrl()
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Web 版本的系統初始化
 */
function initializeSystemWeb() {
  try {
    Logger.log('Web 初始化開始');
    
    // 步驟1: 創建系統資料夾
    Logger.log('步驟1: 創建系統資料夾');
    let mainFolder;
    try {
      mainFolder = createSystemFolders();
      Logger.log('✅ 步驟1完成: 系統資料夾創建成功');
    } catch (error) {
      Logger.log('❌ 步驟1失敗: 系統資料夾創建失敗 - ' + error.toString());
      throw new Error('系統資料夾創建失敗：' + error.message);
    }
    
    // 步驟2: 創建範本檔案
    Logger.log('步驟2: 創建範本檔案');
    let templateSheet;
    try {
      templateSheet = createTemplateFiles(mainFolder);
      Logger.log('✅ 步驟2完成: 範本檔案創建成功');
    } catch (error) {
      Logger.log('❌ 步驟2失敗: 範本檔案創建失敗 - ' + error.toString());
      throw new Error('範本檔案創建失敗：' + error.message);
    }
    
    // 步驟3: 創建管理控制台
    Logger.log('步驟3: 創建管理控制台');
    let adminSheet;
    try {
      adminSheet = createAdminConsole(mainFolder);
      Logger.log('✅ 步驟3完成: 管理控制台創建成功');
    } catch (error) {
      Logger.log('❌ 步驟3失敗: 管理控制台創建失敗 - ' + error.toString());
      throw new Error('管理控制台創建失敗：' + error.message);
    }
    
    // 步驟4: 創建學生總表範本
    Logger.log('步驟4: 創建學生總表範本');
    let masterListSheet;
    try {
      masterListSheet = createStudentMasterListTemplate(mainFolder);
      Logger.log('✅ 步驟4完成: 學生總表範本創建成功');
    } catch (error) {
      Logger.log('❌ 步驟4失敗: 學生總表範本創建失敗 - ' + error.toString());
      throw new Error('學生總表範本創建失敗：' + error.message);
    }
    
    Logger.log('🎉 Web 初始化完成');
    
    return {
      success: true,
      message: '系統初始化完成！所有組件都已成功創建。',
      mainFolderUrl: mainFolder.getUrl(),
      adminSheetUrl: adminSheet.getUrl(),
      masterListUrl: masterListSheet.getUrl()
    };
    
  } catch (error) {
    Logger.log('💥 Web 初始化失敗: ' + error.toString());
    Logger.log('錯誤堆疊: ' + error.stack);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 備用的 Web 版本系統初始化（使用原始函數）
 */
function initializeSystemWebBackup() {
  try {
    Logger.log('備用 Web 初始化開始');
    
    Logger.log('創建系統資料夾');
    const mainFolder = createSystemFolders();
    
    Logger.log('創建範本檔案');
    createTemplateFiles(mainFolder);
    
    Logger.log('創建管理控制台');
    const adminSheet = createAdminConsole(mainFolder);
    
    Logger.log('創建學生總表範本');
    const masterListSheet = createStudentMasterListTemplate(mainFolder);
    
    Logger.log('備用 Web 初始化完成');
    
    return {
      success: true,
      message: '系統初始化完成！',
      mainFolderUrl: mainFolder.getUrl(),
      adminSheetUrl: adminSheet.getUrl(),
      masterListUrl: masterListSheet.getUrl()
    };
  } catch (error) {
    Logger.log('備用 Web 初始化失敗: ' + error.toString());
    Logger.log('錯誤堆疊: ' + error.stack);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 獲取系統統計資料
 */
function getSystemStatsWeb() {
  try {
    // 獲取系統統計資料
    const stats = calculateSystemStats();
    
    return {
      success: true,
      stats: stats
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      stats: {
        teacherCount: 0,
        studentCount: 0,
        contactCount: 0,
        semesterContactCount: 0,
        currentTermProgress: 0,
        currentSemester: SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER,
        currentTerm: SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM,
        currentTermCompleted: 0,
        currentTermTotal: 0
      }
    };
  }
}

/**
 * 計算系統統計資料（學期制版本）
 */
function calculateSystemStats() {
  let teacherCount = 0;
  let studentCount = 0;
  let contactCount = 0;
  let semesterContactCount = 0;
  let currentTermCompletedStudents = 0;
  let currentTermTotalStudents = 0;
  
  try {
    const mainFolder = getSystemMainFolder();
    const teachersFolder = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME);
    
    if (teachersFolder.hasNext()) {
      const teachersFolderObj = teachersFolder.next();
      const teacherFolders = teachersFolderObj.getFolders();
      
      while (teacherFolders.hasNext()) {
        const teacherFolder = teacherFolders.next();
        teacherCount++;
        
        // 統計該老師的學生和電聯記錄
        const files = teacherFolder.getFiles();
        while (files.hasNext()) {
          const file = files.next();
          if (file.getName().includes('記錄簿')) {
            try {
              const spreadsheet = SpreadsheetApp.openById(file.getId());
              
              // 統計學生數
              const studentSheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
              if (studentSheet) {
                const studentData = studentSheet.getDataRange().getValues();
                const teacherStudentCount = Math.max(0, studentData.length - 1); // 減去標題行
                studentCount += teacherStudentCount;
                currentTermTotalStudents += teacherStudentCount;
              }
              
              // 統計電聯記錄數和學期進度
              const contactSheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
              if (contactSheet) {
                const contactData = contactSheet.getDataRange().getValues();
                const contactHeaders = contactData[0];
                const contacts = contactData.slice(1); // 跳過標題行
                contactCount += contacts.length;
                
                // 確定新欄位的索引（向後相容）
                const semesterIndex = contactHeaders.findIndex(h => h.toString().toLowerCase().includes('semester'));
                const termIndex = contactHeaders.findIndex(h => h.toString().toLowerCase().includes('term'));
                const contactTypeIndex = contactHeaders.findIndex(h => h.toString().toLowerCase().includes('contact type'));
                const studentIdIndex = 0; // Student ID 通常在第一欄
                
                // 統計學期電聯和當前term進度
                const currentSemester = SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER;
                const currentTerm = SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM;
                const completedStudentsInCurrentTerm = new Set();
                
                contacts.forEach(contact => {
                  const contactType = contact[contactTypeIndex];
                  const semester = contact[semesterIndex] || currentSemester;
                  const term = contact[termIndex] || currentTerm;
                  const studentId = contact[studentIdIndex];
                  
                  // 統計學期電聯
                  if (contactTypeIndex >= 0 && contactType === SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER) {
                    semesterContactCount++;
                    
                    // 統計當前term的完成學生
                    if (semester === currentSemester && term === currentTerm && studentId) {
                      completedStudentsInCurrentTerm.add(studentId.toString());
                    }
                  } else if (contactTypeIndex < 0) {
                    // 向後相容：沒有類型欄位時假設都是學期電聯
                    semesterContactCount++;
                    if (studentId) {
                      completedStudentsInCurrentTerm.add(studentId.toString());
                    }
                  }
                });
                
                currentTermCompletedStudents += completedStudentsInCurrentTerm.size;
              }
            } catch (e) {
              Logger.log('統計時無法開啟檔案：' + file.getName());
            }
          }
        }
      }
    }
  } catch (error) {
    Logger.log('計算統計資料時發生錯誤：' + error.toString());
  }
  
  // 計算當前學期term進度
  let currentTermProgress = 0;
  if (currentTermTotalStudents > 0) {
    currentTermProgress = Math.round((currentTermCompletedStudents / currentTermTotalStudents) * 100);
  }
  
  return {
    teacherCount: teacherCount,
    studentCount: studentCount,
    contactCount: contactCount,
    semesterContactCount: semesterContactCount,
    currentTermProgress: currentTermProgress,
    currentSemester: SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER,
    currentTerm: SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM,
    currentTermCompleted: currentTermCompletedStudents,
    currentTermTotal: currentTermTotalStudents
  };
}

/**
 * Dashboard專用：獲取所有老師記錄簿（僅生產環境）
 */
function getAllTeacherBooksForDashboard() {
  try {
    Logger.log('Dashboard: 搜尋生產環境老師記錄簿');
    const teacherBooks = getAllTeacherBooks();
    Logger.log(`Dashboard: 找到 ${teacherBooks.length} 本生產環境記錄簿`);
    return teacherBooks;
  } catch (error) {
    Logger.log('Dashboard: 搜尋生產環境記錄簿失敗 - ' + error.toString());
    return [];
  }
}


/**
 * Web 版本的檢查全體進度
 */
function checkAllProgressWeb() {
  try {
    Logger.log('Dashboard: 開始檢查全體進度');
    
    // 獲取所有老師的記錄簿
    const teacherBooks = getAllTeacherBooksForDashboard();
    if (teacherBooks.length === 0) {
      return {
        success: false,
        message: '系統中沒有找到任何老師記錄簿。請先建立老師記錄簿。'
      };
    }
    
    // 檢查每個老師的進度
    const progressResults = [];
    const errors = [];
    
    teacherBooks.forEach(book => {
      try {
        const progress = checkTeacherProgress(book);
        progressResults.push(progress);
      } catch (error) {
        errors.push(`檢查 ${book.getName()} 進度失敗：${error.message}`);
        Logger.log(`檢查 ${book.getName()} 進度失敗：` + error.toString());
      }
    });
    
    // 計算摘要統計
    const summary = calculateSemesterProgressSummary(progressResults);
    
    Logger.log(`Dashboard: 進度檢查完成，檢查了 ${progressResults.length} 位老師`);
    
    return {
      success: true,
      message: `進度檢查完成！檢查了 ${progressResults.length} 位老師的記錄。`,
      progressResults: progressResults,
      summary: summary,
      errors: errors
    };
    
  } catch (error) {
    Logger.log('Dashboard: 檢查全體進度失敗 - ' + error.toString());
    return {
      success: false,
      message: '檢查進度失敗：' + error.message
    };
  }
}

/**
 * 計算學期制進度摘要統計
 */
function calculateSemesterProgressSummary(progressResults) {
  if (!progressResults || progressResults.length === 0) {
    return {
      totalTeachers: 0,
      normalCount: 0,
      needImprovementCount: 0,
      needAttentionCount: 0,
      totalContacts: 0,
      totalSemesterContacts: 0,
      totalStudents: 0,
      currentSemester: SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER,
      currentTerm: SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM
    };
  }
  
  const totalTeachers = progressResults.length;
  const normalCount = progressResults.filter(p => p.status === '正常').length;
  const needImprovementCount = progressResults.filter(p => p.status === '待改善').length;
  const needAttentionCount = progressResults.filter(p => p.status === '需要關注').length;
  const totalContacts = progressResults.reduce((sum, p) => sum + p.totalContacts, 0);
  const totalSemesterContacts = progressResults.reduce((sum, p) => sum + (p.semesterContacts || 0), 0);
  const totalStudents = progressResults.reduce((sum, p) => sum + (p.totalStudents || 0), 0);
  
  // 計算當前term的整體完成度
  let currentTermCompleted = 0;
  let currentTermTotal = 0;
  
  progressResults.forEach(progress => {
    if (progress.currentTermProgress) {
      currentTermCompleted += progress.currentTermProgress.completed || 0;
      currentTermTotal += progress.currentTermProgress.total || 0;
    }
  });
  
  const currentTermCompletionRate = currentTermTotal > 0 ? 
    Math.round((currentTermCompleted / currentTermTotal) * 100) : 0;
  
  return {
    totalTeachers,
    normalCount,
    needImprovementCount,
    needAttentionCount,
    totalContacts,
    totalSemesterContacts,
    totalStudents,
    currentTermCompleted,
    currentTermTotal,
    currentTermCompletionRate,
    currentSemester: SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER,
    currentTerm: SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM,
    normalPercentage: Math.round((normalCount / totalTeachers) * 100),
    needImprovementPercentage: Math.round((needImprovementCount / totalTeachers) * 100),
    needAttentionPercentage: Math.round((needAttentionCount / totalTeachers) * 100)
  };
}

/**
 * 執行指定的系統功能（通用介面）
 */
function executeSystemFunction(functionName, parameters) {
  try {
    switch (functionName) {
      case 'importStudentData':
        return importStudentDataWeb(parameters);
      case 'exportStudentData':
        return exportStudentDataWeb(parameters);
      case 'checkAllProgress':
        return checkAllProgressWeb();
      case 'generateProgressReport':
        return generateProgressReportWeb();
      case 'setupAutomation':
        return setupAutomationWeb();
      case 'performBackup':
        return performBackupWeb();
      case 'checkFileIntegrity':
        return checkFileIntegrityWeb();
      case 'showSystemSettings':
        return showSystemSettingsWeb();
      default:
        return { success: false, message: '未知的功能：' + functionName };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Web 版本的學生資料匯入（完整實現）
 */
function importStudentDataWeb(parameters) {
  try {
    Logger.log('Dashboard: 開始學生資料匯入');
    
    // 獲取所有老師記錄簿
    const teacherBooks = getAllTeacherBooksForDashboard();
    if (teacherBooks.length === 0) {
      return {
        success: false,
        message: '系統中沒有找到任何老師記錄簿。請先建立老師記錄簿。'
      };
    }
    
    // 獲取系統中的學生總表
    const masterList = getSystemMasterList();
    if (!masterList) {
      return {
        success: false,
        message: '找不到系統學生總表。請先初始化系統或手動指定學生總表。'
      };
    }
    
    // 執行批量匯入
    let totalSuccess = 0;
    let totalErrors = 0;
    const results = [];
    
    teacherBooks.forEach(teacherBook => {
      try {
        const result = performStudentDataImport(teacherBook, masterList);
        totalSuccess += result.successCount;
        totalErrors += result.errorCount;
        results.push({
          teacherName: teacherBook.getName(),
          success: result.successCount,
          errors: result.errorCount
        });
      } catch (error) {
        totalErrors++;
        results.push({
          teacherName: teacherBook.getName(),
          success: 0,
          errors: 1,
          error: error.message
        });
      }
    });
    
    Logger.log(`Dashboard: 學生資料匯入完成 - 成功：${totalSuccess}，失敗：${totalErrors}`);
    
    return {
      success: true,
      message: `學生資料匯入完成！\n成功匯入：${totalSuccess} 筆\n失敗：${totalErrors} 筆\n處理了 ${teacherBooks.length} 位老師的記錄簿`,
      results: results
    };
    
  } catch (error) {
    Logger.log('Dashboard: 學生資料匯入失敗 - ' + error.toString());
    return {
      success: false,
      message: '匯入失敗：' + error.message
    };
  }
}

/**
 * Web 版本的學生資料匯出（完整實現）
 */
function exportStudentDataWeb(parameters) {
  try {
    Logger.log('Dashboard: 開始學生資料匯出');
    
    // 獲取所有老師記錄簿
    const teacherBooks = getAllTeacherBooksForDashboard();
    if (teacherBooks.length === 0) {
      return {
        success: false,
        message: '系統中沒有找到任何老師記錄簿。'
      };
    }
    
    // 創建匯出檔案
    const exportSheet = SpreadsheetApp.create('學生資料匯出_' + new Date().toLocaleDateString('zh-TW'));
    const mainFolder = getSystemMainFolder();
    const exportFile = DriveApp.getFileById(exportSheet.getId());
    mainFolder.addFile(exportFile);
    DriveApp.getRootFolder().removeFile(exportFile);
    
    // 收集所有學生資料
    const allStudentData = [];
    const headers = SYSTEM_CONFIG.STUDENT_FIELDS;
    
    teacherBooks.forEach(teacherBook => {
      try {
        const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
        if (studentSheet) {
          const data = studentSheet.getDataRange().getValues();
          if (data.length > 1) {
            // 跳過標題行，加入學生資料
            data.slice(1).forEach(row => {
              if (row[0]) { // 如果有學生ID
                allStudentData.push(row);
              }
            });
          }
        }
      } catch (error) {
        Logger.log(`無法讀取 ${teacherBook.getName()} 的學生資料：${error.message}`);
      }
    });
    
    // 寫入匯出檔案
    const sheet = exportSheet.getActiveSheet();
    sheet.setName('學生資料匯出');
    
    // 設定標題
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
    
    // 寫入資料
    if (allStudentData.length > 0) {
      sheet.getRange(2, 1, allStudentData.length, allStudentData[0].length).setValues(allStudentData);
    }
    
    Logger.log(`Dashboard: 學生資料匯出完成 - 匯出 ${allStudentData.length} 筆資料`);
    
    return {
      success: true,
      message: `學生資料匯出完成！\n匯出了 ${allStudentData.length} 筆學生資料\n匯出檔案已建立在系統資料夾中`,
      exportUrl: exportSheet.getUrl(),
      recordCount: allStudentData.length
    };
    
  } catch (error) {
    Logger.log('Dashboard: 學生資料匯出失敗 - ' + error.toString());
    return {
      success: false,
      message: '匯出失敗：' + error.message
    };
  }
}

/**
 * 獲取系統中的學生總表
 */
function getSystemMasterList() {
  try {
    const mainFolder = getSystemMainFolder();
    const masterListFiles = mainFolder.getFilesByName('學生總表');
    
    if (masterListFiles.hasNext()) {
      const masterListFile = masterListFiles.next();
      const masterListSheet = SpreadsheetApp.openById(masterListFile.getId());
      return masterListSheet.getActiveSheet().getDataRange().getValues();
    }
    
    return null;
  } catch (error) {
    Logger.log('獲取系統學生總表失敗：' + error.toString());
    return null;
  }
}

/**
 * Web 版本的生成進度報告
 */
function generateProgressReportWeb() {
  try {
    Logger.log('Dashboard: 開始生成進度報告');
    
    // 獲取所有老師的記錄簿
    const teacherBooks = getAllTeacherBooksForDashboard();
    if (teacherBooks.length === 0) {
      return {
        success: false,
        message: '系統中沒有找到任何老師記錄簿。請先建立老師記錄簿。'
      };
    }
    
    // 建立進度報告檔案
    const reportSheet = createProgressReportSheet();
    
    // 收集所有進度資料
    const allProgressData = [];
    const summaryData = [];
    
    teacherBooks.forEach(book => {
      try {
        const progress = checkTeacherProgress(book);
        const detailData = getTeacherDetailProgress(book);
        
        allProgressData.push(...detailData);
        summaryData.push([
          progress.teacherName,
          progress.totalClasses,
          progress.totalContacts,
          progress.semesterContacts || 0,
          progress.lastContactDate,
          progress.status,
          progress.alertMessage || ''
        ]);
        
      } catch (error) {
        Logger.log(`獲取 ${book.getName()} 詳細進度失敗：` + error.toString());
      }
    });
    
    // 寫入報告資料
    writeProgressReportData(reportSheet, summaryData, allProgressData);
    
    Logger.log('Dashboard: 進度報告生成完成');
    
    return {
      success: true,
      message: '進度報告已生成完成！',
      reportUrl: reportSheet.getUrl(),
      teacherCount: teacherBooks.length,
      dataCount: allProgressData.length
    };
    
  } catch (error) {
    Logger.log('Dashboard: 生成進度報告失敗 - ' + error.toString());
    return {
      success: false,
      message: '生成進度報告失敗：' + error.message
    };
  }
}

/**
 * Web 版本的設定自動化
 */
function setupAutomationWeb() {
  try {
    Logger.log('Dashboard: 開始設定自動化觸發器');
    
    setupAutomationTriggers();
    
    Logger.log('Dashboard: 自動化觸發器設定完成');
    
    return {
      success: true,
      message: '自動化觸發器設定完成！已設定每日自動進度檢查和每週自動備份。'
    };
    
  } catch (error) {
    Logger.log('Dashboard: 設定自動化失敗 - ' + error.toString());
    return {
      success: false,
      message: '設定自動化失敗：' + error.message
    };
  }
}

/**
 * Web 版本的執行備份
 */
function performBackupWeb() {
  try {
    Logger.log('Dashboard: 開始執行手動備份');
    
    autoBackup();
    
    Logger.log('Dashboard: 手動備份完成');
    
    return {
      success: true,
      message: '系統備份已完成！備份檔案已儲存到系統備份資料夾。'
    };
    
  } catch (error) {
    Logger.log('Dashboard: 執行備份失敗 - ' + error.toString());
    return {
      success: false,
      message: '執行備份失敗：' + error.message
    };
  }
}

/**
 * Web 版本的檢查檔案完整性
 */
function checkFileIntegrityWeb() {
  try {
    Logger.log('Dashboard: 開始檢查檔案完整性');
    
    checkFileIntegrity();
    
    Logger.log('Dashboard: 檔案完整性檢查完成');
    
    return {
      success: true,
      message: '檔案完整性檢查完成！所有系統檔案狀態正常。'
    };
    
  } catch (error) {
    Logger.log('Dashboard: 檔案完整性檢查失敗 - ' + error.toString());
    return {
      success: false,
      message: '檔案完整性檢查失敗：' + error.message
    };
  }
}

/**
 * 獲取系統主資料夾 URL
 */
function getSystemFolderUrl() {
  try {
    const mainFolder = getSystemMainFolder();
    return {
      success: true,
      url: mainFolder.getUrl()
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}





/**
 * 獲取系統整體狀態
 */
function getSystemStatusWeb() {
  try {
    Logger.log('Dashboard: 開始檢查系統狀態');
    
    const systemStatus = {
      initialized: false,
      productionEnvironment: {
        mainFolder: false,
        subFolders: false,
        adminConsole: false,
        templates: false
      },
      overallHealth: 0,
      recommendations: [],
      nextSteps: []
    };
    
    // 檢查主資料夾 - 使用增強的實時驗證
    try {
      Logger.log('Dashboard: 開始檢查系統主資料夾（實時驗證）...');
      
      // 執行即時的詳細檢查，避免快取問題
      const realTimeValidation = performRealTimeSystemValidation();
      
      systemStatus.productionEnvironment.mainFolder = realTimeValidation.mainFolderExists;
      systemStatus.productionEnvironment.subFolders = realTimeValidation.subFoldersComplete;
      systemStatus.productionEnvironment.adminConsole = realTimeValidation.adminConsoleExists;
      systemStatus.productionEnvironment.templates = realTimeValidation.templatesExist;
      systemStatus.validationDetails = realTimeValidation.details;
      
      Logger.log(`Dashboard: 實時驗證結果 - 主資料夾: ${realTimeValidation.mainFolderExists}, 子資料夾: ${realTimeValidation.subFoldersComplete}, 管理控制台: ${realTimeValidation.adminConsoleExists}, 範本: ${realTimeValidation.templatesExist}`);
      
    } catch (error) {
      Logger.log('Dashboard: 實時驗證異常 - ' + error.message);
      systemStatus.productionEnvironment.mainFolder = false;
      systemStatus.productionEnvironment.subFolders = false;
      systemStatus.productionEnvironment.adminConsole = false;
      systemStatus.productionEnvironment.templates = false;
      systemStatus.validationDetails = '檢查異常：' + error.message;
    }
    
    // 移除測試環境檢查 - 現在使用純生產環境
    
    // 計算整體狀態 - 使用加權評分
    const productionChecks = systemStatus.productionEnvironment;
    const weights = {
      mainFolder: 20,      // 主資料夾存在 - 20%
      subFolders: 30,      // 子資料夾完整 - 30%
      adminConsole: 25,    // 管理控制台 - 25%
      templates: 25        // 範本檔案 - 25%
    };
    
    let totalScore = 0;
    let maxScore = 0;
    
    Object.keys(weights).forEach(key => {
      maxScore += weights[key];
      if (productionChecks[key]) {
        totalScore += weights[key];
      }
    });
    
    systemStatus.overallHealth = Math.round((totalScore / maxScore) * 100);
    
    // 判斷是否已初始化 - 提高門檻到95%
    systemStatus.initialized = systemStatus.overallHealth >= 95;
    
    // 生成詳細的建議和下一步
    if (systemStatus.overallHealth === 0) {
      systemStatus.recommendations.push('系統尚未初始化');
      systemStatus.nextSteps.push('執行「一鍵完整設定」創建完整系統');
    } else if (systemStatus.overallHealth < 50) {
      systemStatus.recommendations.push('系統部分初始化，但缺少關鍵組件');
      systemStatus.nextSteps.push('執行「一鍵完整設定」補充缺失組件');
      if (systemStatus.validationDetails) {
        systemStatus.nextSteps.push(`缺失項目：${systemStatus.validationDetails}`);
      }
    } else if (systemStatus.overallHealth < 95) {
      systemStatus.recommendations.push('系統基本就緒，但仍有組件需要完善');
      systemStatus.nextSteps.push('執行「一鍵完整設定」完成最後設定');
      if (systemStatus.validationDetails) {
        systemStatus.nextSteps.push(`待完善：${systemStatus.validationDetails}`);
      }
    } else {
      systemStatus.recommendations.push('系統完全就緒，可以開始使用');
      systemStatus.nextSteps.push('建立老師記錄簿並開始電聯記錄');
    }
    
    // 添加具體的狀態描述
    const missingComponents = [];
    if (!productionChecks.mainFolder) missingComponents.push('主資料夾');
    if (!productionChecks.subFolders) missingComponents.push('子資料夾結構');
    if (!productionChecks.adminConsole) missingComponents.push('管理控制台');
    if (!productionChecks.templates) missingComponents.push('範本檔案');
    
    if (missingComponents.length > 0) {
      systemStatus.statusDescription = `缺少：${missingComponents.join('、')}`;
    } else {
      systemStatus.statusDescription = '所有組件完整';
    }
    
    
    Logger.log(`Dashboard: 系統狀態檢查完成，健康度: ${systemStatus.overallHealth}%`);
    
    return {
      success: true,
      systemStatus: systemStatus
    };
    
  } catch (error) {
    Logger.log('Dashboard: 檢查系統狀態失敗 - ' + error.toString());
    return {
      success: false,
      message: '檢查系統狀態失敗：' + error.message
    };
  }
}

/**
 * 詳細的系統診斷報告
 */
function generateDetailedSystemDiagnosticWeb() {
  try {
    Logger.log('Dashboard: 開始生成詳細系統診斷報告');
    
    const diagnostic = {
      timestamp: new Date().toLocaleString('zh-TW'),
      driveAccess: { status: 'unknown', details: '' },
      folderStructure: { status: 'unknown', details: '' },
      fileIntegrity: { status: 'unknown', details: '' },
      configurations: { status: 'unknown', details: '' },
      permissions: { status: 'unknown', details: '' },
      recommendations: []
    };
    
    // 1. 檢查 Google Drive 存取權限
    try {
      const folders = DriveApp.getFoldersByName(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
      if (folders.hasNext()) {
        diagnostic.driveAccess.status = 'success';
        diagnostic.driveAccess.details = '可以存取 Google Drive，找到同名資料夾';
      } else {
        diagnostic.driveAccess.status = 'warning';
        diagnostic.driveAccess.details = '可以存取 Google Drive，但未找到系統資料夾';
      }
    } catch (error) {
      diagnostic.driveAccess.status = 'error';
      diagnostic.driveAccess.details = '無法存取 Google Drive：' + error.message;
    }
    
    // 2. 檢查資料夾結構
    try {
      const mainFolder = getSystemMainFolder(true);
      diagnostic.folderStructure.status = 'success';
      diagnostic.folderStructure.details = '系統資料夾結構完整';
    } catch (error) {
      try {
        const mainFolder = getSystemMainFolder(false);
        diagnostic.folderStructure.status = 'warning';
        diagnostic.folderStructure.details = '主資料夾存在但結構不完整：' + error.message;
      } catch (folderError) {
        diagnostic.folderStructure.status = 'error';
        diagnostic.folderStructure.details = '主資料夾不存在：' + folderError.message;
      }
    }
    
    // 3. 檢查系統配置
    try {
      const requiredConfigs = ['MAIN_FOLDER_NAME', 'TEACHERS_FOLDER_NAME', 'TEMPLATES_FOLDER_NAME'];
      const missingConfigs = requiredConfigs.filter(config => !SYSTEM_CONFIG[config]);
      
      if (missingConfigs.length === 0) {
        diagnostic.configurations.status = 'success';
        diagnostic.configurations.details = '系統配置完整';
      } else {
        diagnostic.configurations.status = 'warning';
        diagnostic.configurations.details = '缺少配置：' + missingConfigs.join(', ');
      }
    } catch (error) {
      diagnostic.configurations.status = 'error';
      diagnostic.configurations.details = '配置檢查失敗：' + error.message;
    }
    
    // 4. 檢查檔案創建權限
    try {
      const testSheet = SpreadsheetApp.create('診斷測試檔案_' + Date.now());
      const testFile = DriveApp.getFileById(testSheet.getId());
      testFile.setTrashed(true);
      
      diagnostic.permissions.status = 'success';
      diagnostic.permissions.details = '具有檔案創建和刪除權限';
    } catch (error) {
      diagnostic.permissions.status = 'error';
      diagnostic.permissions.details = '缺少檔案操作權限：' + error.message;
    }
    
    // 5. 生成建議
    if (diagnostic.driveAccess.status === 'error') {
      diagnostic.recommendations.push('請檢查 Google Apps Script 的 Google Drive 權限設定');
    }
    if (diagnostic.folderStructure.status === 'error') {
      diagnostic.recommendations.push('執行「一鍵完整設定」創建系統資料夾');
    } else if (diagnostic.folderStructure.status === 'warning') {
      diagnostic.recommendations.push('執行「一鍵完整設定」補充缺失的系統組件');
    }
    if (diagnostic.permissions.status === 'error') {
      diagnostic.recommendations.push('請確認 Google Apps Script 具有必要的檔案操作權限');
    }
    if (diagnostic.recommendations.length === 0) {
      diagnostic.recommendations.push('系統狀態良好，可以正常使用');
    }
    
    Logger.log('Dashboard: 系統診斷報告生成完成');
    
    return {
      success: true,
      diagnostic: diagnostic
    };
    
  } catch (error) {
    Logger.log('Dashboard: 生成系統診斷報告失敗 - ' + error.toString());
    return {
      success: false,
      message: '生成診斷報告失敗：' + error.message
    };
  }
}

/**
 * 執行即時系統驗證，避免快取問題
 */
function performRealTimeSystemValidation() {
  try {
    Logger.log('Dashboard: 開始即時系統驗證...');
    
    const validation = {
      mainFolderExists: false,
      subFoldersComplete: false,
      adminConsoleExists: false,
      templatesExist: false,
      details: '',
      issues: []
    };
    
    // 1. 檢查主資料夾
    let mainFolder;
    try {
      if (SYSTEM_CONFIG.MAIN_FOLDER_ID && SYSTEM_CONFIG.MAIN_FOLDER_ID.trim() !== '') {
        mainFolder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
        validation.mainFolderExists = true;
        Logger.log('Dashboard: 主資料夾存在 - ' + mainFolder.getName());
      } else {
        const folders = DriveApp.getFoldersByName(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
        if (folders.hasNext()) {
          mainFolder = folders.next();
          validation.mainFolderExists = true;
          Logger.log('Dashboard: 按名稱找到主資料夾 - ' + mainFolder.getName());
        } else {
          validation.issues.push('主資料夾不存在');
        }
      }
    } catch (folderError) {
      validation.issues.push('主資料夾存取失敗：' + folderError.message);
    }
    
    if (!validation.mainFolderExists) {
      validation.details = '主資料夾不存在或無法存取';
      return validation;
    }
    
    // 2. 檢查子資料夾
    const requiredSubfolders = [
      SYSTEM_CONFIG.TEACHERS_FOLDER_NAME,
      SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME,
      '系統備份',
      '進度報告'
    ];
    
    let foundSubfolders = 0;
    const missingSubfolders = [];
    
    requiredSubfolders.forEach(folderName => {
      try {
        const subfolders = mainFolder.getFoldersByName(folderName);
        if (subfolders.hasNext()) {
          foundSubfolders++;
          Logger.log(`Dashboard: 找到子資料夾 - ${folderName}`);
        } else {
          missingSubfolders.push(folderName);
          Logger.log(`Dashboard: 缺少子資料夾 - ${folderName}`);
        }
      } catch (subfolderError) {
        missingSubfolders.push(folderName);
        Logger.log(`Dashboard: 檢查子資料夾失敗 - ${folderName}: ${subfolderError.message}`);
      }
    });
    
    validation.subFoldersComplete = (foundSubfolders === requiredSubfolders.length);
    if (!validation.subFoldersComplete) {
      validation.issues.push(`缺少子資料夾：${missingSubfolders.join(', ')}`);
    }
    
    // 3. 檢查管理控制台檔案
    try {
      const adminFiles = mainFolder.getFilesByName('電聯記錄簿管理控制台');
      validation.adminConsoleExists = adminFiles.hasNext();
      if (validation.adminConsoleExists) {
        Logger.log('Dashboard: 找到管理控制台檔案');
      } else {
        validation.issues.push('缺少管理控制台檔案');
        Logger.log('Dashboard: 缺少管理控制台檔案');
      }
    } catch (adminError) {
      validation.issues.push('檢查管理控制台檔案失敗：' + adminError.message);
    }
    
    // 4. 檢查範本檔案
    try {
      const templatesFolders = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME);
      if (templatesFolders.hasNext()) {
        const templatesFolder = templatesFolders.next();
        const templateFiles = templatesFolder.getFiles();
        validation.templatesExist = templateFiles.hasNext();
        if (validation.templatesExist) {
          Logger.log('Dashboard: 找到範本檔案');
        } else {
          validation.issues.push('範本資料夾為空');
          Logger.log('Dashboard: 範本資料夾為空');
        }
      } else {
        validation.issues.push('範本資料夾不存在');
        Logger.log('Dashboard: 範本資料夾不存在');
      }
    } catch (templateError) {
      validation.issues.push('檢查範本檔案失敗：' + templateError.message);
    }
    
    // 5. 生成詳細說明
    if (validation.issues.length === 0) {
      validation.details = '所有組件完整';
    } else {
      validation.details = validation.issues.join('；');
    }
    
    Logger.log(`Dashboard: 即時驗證完成 - 問題數量: ${validation.issues.length}`);
    return validation;
    
  } catch (error) {
    Logger.log('Dashboard: 即時驗證異常 - ' + error.toString());
    return {
      mainFolderExists: false,
      subFoldersComplete: false,
      adminConsoleExists: false,
      templatesExist: false,
      details: '驗證過程異常：' + error.message,
      issues: ['驗證過程異常']
    };
  }
}

/**
 * 一鍵完整系統設定
 */
function setupCompleteSystemWeb() {
  try {
    Logger.log('Dashboard: 開始一鍵完整系統設定');
    
    const setupResults = {
      steps: [],
      success: true,
      errors: []
    };
    
    // 步驟 1: 初始化生產環境
    try {
      Logger.log('Dashboard: 執行系統初始化');
      const initResult = initializeSystemWeb();
      
      if (initResult.success) {
        setupResults.steps.push('✅ 生產環境初始化完成');
        Logger.log('Dashboard: 系統初始化成功');
      } else {
        Logger.log('Dashboard: 系統初始化失敗 - ' + initResult.message);
        throw new Error(initResult.message);
      }
    } catch (error) {
      Logger.log('Dashboard: 初始化步驟異常 - ' + error.toString());
      setupResults.errors.push('生產環境初始化失敗：' + error.message);
      setupResults.success = false;
    }
    
    // 步驟 2: 已移除測試環境建立（現在使用純生產環境）
    setupResults.steps.push('✅ 系統已配置為生產環境模式');
    
    // 步驟 3: 系統健康檢查
    if (setupResults.success) {
      try {
        Logger.log('Dashboard: 執行最終健康檢查');
        const statusResult = getSystemStatusWeb();
        
        if (statusResult.success && statusResult.systemStatus.overallHealth >= 75) {
          setupResults.steps.push('✅ 系統健康檢查通過');
          Logger.log(`Dashboard: 系統健康度: ${statusResult.systemStatus.overallHealth}%`);
        } else {
          const healthScore = statusResult.success ? statusResult.systemStatus.overallHealth : 0;
          setupResults.steps.push(`⚠️ 系統健康檢查未完全通過 (${healthScore}%)，但基本功能可用`);
          Logger.log(`Dashboard: 系統健康度偏低: ${healthScore}%`);
          
          if (statusResult.success && statusResult.systemStatus.nextSteps) {
            Logger.log('Dashboard: 建議下一步: ' + statusResult.systemStatus.nextSteps.join(', '));
          }
        }
      } catch (error) {
        setupResults.steps.push('⚠️ 健康檢查執行失敗，但系統可能仍可使用');
        Logger.log('Dashboard: 健康檢查異常 - ' + error.toString());
      }
    } else {
      Logger.log('Dashboard: 由於初始化失敗，跳過健康檢查');
      setupResults.steps.push('❌ 初始化失敗，未執行健康檢查');
    }
    
    Logger.log(`Dashboard: 一鍵設定完成，成功: ${setupResults.success}`);
    Logger.log(`Dashboard: 總步驟數: ${setupResults.steps.length}, 錯誤數: ${setupResults.errors.length}`);
    
    // 記錄詳細的設定結果
    if (setupResults.steps.length > 0) {
      Logger.log('Dashboard: 執行步驟列表:');
      setupResults.steps.forEach((step, index) => {
        Logger.log(`  ${index + 1}. ${step}`);
      });
    }
    
    if (setupResults.errors.length > 0) {
      Logger.log('Dashboard: 錯誤列表:');
      setupResults.errors.forEach((error, index) => {
        Logger.log(`  ${index + 1}. ${error}`);
      });
    }
    
    let finalMessage = setupResults.success ? '完整系統設定成功！' : '部分設定失敗，請檢查錯誤訊息';
    
    if (setupResults.errors.length > 0) {
      finalMessage += '\n\n錯誤詳情：\n' + setupResults.errors.join('\n');
    }
    
    if (setupResults.steps.length > 0) {
      finalMessage += '\n\n執行步驟：\n' + setupResults.steps.join('\n');
    }
    
    return {
      success: setupResults.success,
      message: finalMessage,
      setupResults: setupResults
    };
    
  } catch (error) {
    Logger.log('Dashboard: 一鍵完整設定失敗 - ' + error.toString());
    return {
      success: false,
      message: '一鍵完整設定失敗：' + error.message
    };
  }
}

/**
 * Web 版本的系統設定顯示
 */
function showSystemSettingsWeb() {
  try {
    Logger.log('Dashboard: 開始顯示系統設定');
    
    const settings = {
      systemInfo: {
        mainFolderName: SYSTEM_CONFIG.MAIN_FOLDER_NAME,
        mainFolderId: SYSTEM_CONFIG.MAIN_FOLDER_ID,
        teachersFolderName: SYSTEM_CONFIG.TEACHERS_FOLDER_NAME,
        templatesFolderName: SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME
      },
      academicYear: {
        semesters: SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS,
        terms: SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS,
        currentSemester: SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER,
        currentTerm: SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM
      },
      contactSettings: {
        contactTypes: SYSTEM_CONFIG.CONTACT_TYPES,
        contactMethods: SYSTEM_CONFIG.CONTACT_METHODS,
        requiredContactPerTerm: SYSTEM_CONFIG.PROGRESS_CHECK.REQUIRED_CONTACT_PER_TERM,
        alertDays: SYSTEM_CONFIG.PROGRESS_CHECK.ALERT_DAYS
      },
      gradeSettings: {
        gradeLevels: SYSTEM_CONFIG.GRADE_LEVELS,
        englishClassNames: SYSTEM_CONFIG.ENGLISH_CLASS_NAMES
      },
      fieldSettings: {
        contactFields: SYSTEM_CONFIG.CONTACT_FIELDS,
        studentFields: SYSTEM_CONFIG.STUDENT_FIELDS
      }
    };
    
    // 獲取系統狀態資訊
    try {
      const statusResult = getSystemStatusWeb();
      if (statusResult.success) {
        settings.systemStatus = {
          overallHealth: statusResult.systemStatus.overallHealth,
          initialized: statusResult.systemStatus.initialized,
          statusDescription: statusResult.systemStatus.statusDescription
        };
      }
    } catch (error) {
      Logger.log('Dashboard: 獲取系統狀態失敗 - ' + error.toString());
    }
    
    // 取得主資料夾URL
    try {
      const mainFolder = getSystemMainFolder();
      settings.mainFolderUrl = mainFolder.getUrl();
    } catch (error) {
      Logger.log('Dashboard: 無法取得主資料夾URL - ' + error.toString());
    }
    
    Logger.log('Dashboard: 系統設定資訊準備完成');
    
    return {
      success: true,
      settings: settings,
      message: '系統設定資訊已準備完成'
    };
    
  } catch (error) {
    Logger.log('Dashboard: 顯示系統設定失敗 - ' + error.toString());
    return {
      success: false,
      message: '顯示系統設定失敗：' + error.message
    };
  }
}

/**
 * Web 版本的重新排序電聯記錄功能
 */
/**
 * Web 版本的手動排序電聯記錄功能
 * 提供給特定情況下需要手動觸發排序的場景
 */
function sortContactRecordsWeb(spreadsheetId) {
  try {
    if (!spreadsheetId) {
      return {
        success: false,
        message: '請提供要排序的記錄簿 ID'
      };
    }
    
    // 開啟指定的記錄簿
    const recordBook = SpreadsheetApp.openById(spreadsheetId);
    const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    
    if (!contactLogSheet) {
      return {
        success: false,
        message: '找不到電聯記錄工作表'
      };
    }
    
    // 檢查是否有資料
    const dataRange = contactLogSheet.getDataRange();
    if (dataRange.getNumRows() < 2) {
      return {
        success: false,
        message: '電聯記錄工作表沒有資料可排序'
      };
    }
    
    // 執行排序
    const allData = dataRange.getValues();
    const sortResult = sortContactRecordsData(allData);
    
    if (!sortResult.success) {
      return {
        success: false,
        message: `排序失敗：${sortResult.error}`
      };
    }
    
    // 更新工作表
    contactLogSheet.clear();
    contactLogSheet.getRange(1, 1, sortResult.data.length, sortResult.data[0].length).setValues(sortResult.data);
    
    // 設定標題格式
    contactLogSheet.getRange(1, 1, 1, sortResult.data[0].length)
      .setFontWeight('bold')
      .setBackground('#E8F4FD');
    
    // 自動調整欄寬
    contactLogSheet.autoResizeColumns(1, sortResult.data[0].length);
    
    Logger.log(`✅ Web版本排序完成：${sortResult.recordCount} 筆記錄`);
    
    return {
      success: true,
      message: `排序完成！\n\n已重新排序 ${sortResult.recordCount} 筆電聯記錄\n\n排序規則：\n• 學生ID (小→大)\n• 學期 (Fall→Spring)\n• 階段 (Beginning→Midterm→Final)\n• 英語班級 (小→大)`
    };
    
  } catch (error) {
    Logger.log(`❌ Web版本排序失敗：${error.message}`);
    return {
      success: false,
      message: `排序執行失敗：${error.message}`
    };
  }
}
// 原 sortContactRecordsWeb 函數已移除，排序邏輯已整合到記錄簿建立過程中