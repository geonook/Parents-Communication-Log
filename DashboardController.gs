/**
 * Dashboard Web App 控制器
 * 提供視覺化管理介面的後端支援
 */

/**
 * 測試環境常數（從TestUtils.gs引用）
 */
const TEST_CONFIG_DASHBOARD = {
  TEST_FOLDER_NAME: 'Parents_Communication_Log_測試環境'
};

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
      case 'setupTestEnvironment':
        return setupTestEnvironmentWeb();
      case 'cleanupTestEnvironment':
        return cleanupTestEnvironmentWeb();
      case 'getTestStatus':
        return getTestEnvironmentStatusWeb();
      case 'getSystemStatus':
        return getSystemStatusWeb();
      case 'setupCompleteSystem':
        return setupCompleteSystemWeb();
      case 'debugTestBooks':
        return debugTestEnvironmentBooks();
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
 * Web 版本的從學生總表建立老師記錄簿
 */
function createTeachersFromStudentMasterListWeb() {
  try {
    // 這裡需要從前端獲取學生總表 ID
    // 暫時返回成功訊息，實際實作需要前端傳遞參數
    return {
      success: true,
      message: '請使用 Google Sheets 選單中的功能，或者修改前端代碼傳遞學生總表 ID'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
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
      message: `${teacherInfo.name} 老師的記錄簿建立成功！`,
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
    
    Logger.log('步驟1: 創建系統資料夾');
    const mainFolder = createSystemFolders();
    
    Logger.log('步驟2: 創建範本檔案');
    createTemplateFiles(mainFolder);
    
    Logger.log('步驟3: 創建管理控制台');
    const adminSheet = createAdminConsole(mainFolder);
    
    Logger.log('步驟4: 創建學生總表範本');
    const masterListSheet = createStudentMasterListTemplate(mainFolder);
    
    Logger.log('Web 初始化完成');
    
    return {
      success: true,
      message: '系統初始化完成！',
      mainFolderUrl: mainFolder.getUrl(),
      adminSheetUrl: adminSheet.getUrl(),
      masterListUrl: masterListSheet.getUrl()
    };
    
  } catch (error) {
    Logger.log('Web 初始化失敗: ' + error.toString());
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
 * 獲取所有老師的記錄簿（包括生產環境和測試環境）
 */
function getAllTeacherBooksIncludingTest() {
  const teacherBooks = [];
  
  try {
    Logger.log('Dashboard: 搜尋生產環境老師記錄簿');
    
    // 首先嘗試獲取生產環境的老師記錄簿
    const productionBooks = getAllTeacherBooks();
    teacherBooks.push(...productionBooks);
    
    Logger.log(`Dashboard: 找到 ${productionBooks.length} 本生產環境記錄簿`);
    
  } catch (error) {
    Logger.log('Dashboard: 搜尋生產環境記錄簿失敗 - ' + error.toString());
  }
  
  try {
    Logger.log('Dashboard: 搜尋測試環境老師記錄簿');
    
    // 然後嘗試獲取測試環境的老師記錄簿
    const testBooks = getTestTeacherBooks();
    teacherBooks.push(...testBooks);
    
    Logger.log(`Dashboard: 找到 ${testBooks.length} 本測試環境記錄簿`);
    
  } catch (error) {
    Logger.log('Dashboard: 搜尋測試環境記錄簿失敗 - ' + error.toString());
  }
  
  Logger.log(`Dashboard: 總共找到 ${teacherBooks.length} 本老師記錄簿`);
  return teacherBooks;
}

/**
 * 獲取測試環境的老師記錄簿
 */
function getTestTeacherBooks() {
  const testBooks = [];
  
  try {
    // 搜尋主資料夾內的測試環境
    const mainFolder = getSystemMainFolder();
    const testFolders = mainFolder.getFoldersByName(TEST_CONFIG_DASHBOARD.TEST_FOLDER_NAME);
    
    if (testFolders.hasNext()) {
      const testFolder = testFolders.next();
      Logger.log('Dashboard: 在主資料夾內找到測試環境');
      
      const teachersFolder = testFolder.getFoldersByName(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME);
      if (teachersFolder.hasNext()) {
        const testTeachersFolder = teachersFolder.next();
        const teacherFolders = testTeachersFolder.getFolders();
        
        while (teacherFolders.hasNext()) {
          const folder = teacherFolders.next();
          const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
          
          while (files.hasNext()) {
            const file = files.next();
            if (file.getName().includes('電聯記錄簿') || file.getName().includes('測試')) {
              testBooks.push(SpreadsheetApp.openById(file.getId()));
            }
          }
        }
      }
    }
    
  } catch (mainFolderError) {
    Logger.log('Dashboard: 無法在主資料夾搜尋測試環境 - ' + mainFolderError.toString());
    
    // 回退到根目錄搜尋（向後相容）
    try {
      const rootFolder = DriveApp.getRootFolder();
      const testFolders = rootFolder.getFoldersByName(TEST_CONFIG_DASHBOARD.TEST_FOLDER_NAME);
      
      if (testFolders.hasNext()) {
        const testFolder = testFolders.next();
        Logger.log('Dashboard: 在根目錄找到測試環境');
        
        const teachersFolder = testFolder.getFoldersByName(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME);
        if (teachersFolder.hasNext()) {
          const testTeachersFolder = teachersFolder.next();
          const teacherFolders = testTeachersFolder.getFolders();
          
          while (teacherFolders.hasNext()) {
            const folder = teacherFolders.next();
            const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
            
            while (files.hasNext()) {
              const file = files.next();
              if (file.getName().includes('電聯記錄簿') || file.getName().includes('測試')) {
                testBooks.push(SpreadsheetApp.openById(file.getId()));
              }
            }
          }
        }
      }
    } catch (rootError) {
      Logger.log('Dashboard: 根目錄搜尋也失敗 - ' + rootError.toString());
    }
  }
  
  return testBooks;
}

/**
 * Web 版本的檢查全體進度
 */
function checkAllProgressWeb() {
  try {
    Logger.log('Dashboard: 開始檢查全體進度');
    
    // 獲取所有老師的記錄簿（包括生產環境和測試環境）
    const teacherBooks = getAllTeacherBooksIncludingTest();
    if (teacherBooks.length === 0) {
      return {
        success: false,
        message: '系統中沒有找到任何老師記錄簿。請先建立老師記錄簿或建立測試環境。'
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
        return { success: true, message: '請使用 Google Sheets 選單執行學生資料匯入功能' };
      case 'exportStudentData':
        return { success: true, message: '請使用 Google Sheets 選單執行學生資料匯出功能' };
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
      default:
        return { success: false, message: '未知的功能：' + functionName };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Web 版本的生成進度報告
 */
function generateProgressReportWeb() {
  try {
    Logger.log('Dashboard: 開始生成進度報告');
    
    // 獲取所有老師的記錄簿（包括生產環境和測試環境）
    const teacherBooks = getAllTeacherBooksIncludingTest();
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
 * Web 版本的建立測試環境
 */
function setupTestEnvironmentWeb() {
  try {
    Logger.log('Dashboard: 開始建立測試環境');
    
    // 呼叫 TestUtils 中的測試環境建立函數
    const testResults = executeTestSetup();
    
    if (testResults.success) {
      Logger.log('Dashboard: 測試環境建立成功');
      return {
        success: true,
        message: '測試環境建立成功！',
        testResults: testResults,
        testFolderUrl: testResults.testFolder ? testResults.testFolder.getUrl() : null,
        healthReport: testResults.healthReport,
        steps: testResults.steps
      };
    } else {
      Logger.log('Dashboard: 測試環境建立失敗 - ' + testResults.errors.join(', '));
      return {
        success: false,
        message: '測試環境建立失敗：' + testResults.errors.join(', ')
      };
    }
    
  } catch (error) {
    Logger.log('Dashboard: 測試環境建立異常 - ' + error.toString());
    return {
      success: false,
      message: '測試環境建立失敗：' + error.message
    };
  }
}

/**
 * Web 版本的清理測試環境
 */
function cleanupTestEnvironmentWeb() {
  try {
    Logger.log('Dashboard: 開始清理測試環境');
    
    let deletedCount = 0;
    
    try {
      // 優先在主資料夾內搜尋測試資料夾
      const mainFolder = getSystemMainFolder();
      const testFolders = mainFolder.getFoldersByName(TEST_CONFIG_DASHBOARD.TEST_FOLDER_NAME);
      
      while (testFolders.hasNext()) {
        const folder = testFolders.next();
        folder.setTrashed(true);
        deletedCount++;
      }
      
      Logger.log(`Dashboard: 已在主資料夾內清理 ${deletedCount} 個測試環境`);
      
    } catch (error) {
      // 如果主資料夾搜尋失敗，回退到根目錄搜尋（向後相容）
      Logger.log('Dashboard: 無法在主資料夾搜尋測試環境，回退到根目錄 - ' + error.toString());
      
      const rootFolder = DriveApp.getRootFolder();
      const testFolders = rootFolder.getFoldersByName(TEST_CONFIG_DASHBOARD.TEST_FOLDER_NAME);
      
      while (testFolders.hasNext()) {
        const folder = testFolders.next();
        folder.setTrashed(true);
        deletedCount++;
      }
      
      Logger.log(`Dashboard: 已在根目錄清理 ${deletedCount} 個測試環境`);
    }
    
    if (deletedCount > 0) {
      return {
        success: true,
        message: `成功清理 ${deletedCount} 個測試環境`
      };
    } else {
      return {
        success: true,
        message: '沒有找到需要清理的測試環境'
      };
    }
    
  } catch (error) {
    Logger.log('Dashboard: 清理測試環境失敗 - ' + error.toString());
    return {
      success: false,
      message: '清理測試環境失敗：' + error.message
    };
  }
}

/**
 * 調試：檢查測試環境記錄簿詳情
 */
function debugTestEnvironmentBooks() {
  try {
    Logger.log('=== 調試：檢查測試環境記錄簿 ===');
    
    const result = {
      found: false,
      details: [],
      errors: []
    };
    
    // 檢查主資料夾內的測試環境
    try {
      const mainFolder = getSystemMainFolder();
      const testFolders = mainFolder.getFoldersByName(TEST_CONFIG_DASHBOARD.TEST_FOLDER_NAME);
      
      if (testFolders.hasNext()) {
        const testFolder = testFolders.next();
        result.details.push(`✅ 找到測試資料夾：${testFolder.getName()}`);
        
        const teachersFolder = testFolder.getFoldersByName(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME);
        if (teachersFolder.hasNext()) {
          const testTeachersFolder = teachersFolder.next();
          result.details.push(`✅ 找到老師資料夾：${testTeachersFolder.getName()}`);
          
          const teacherFolders = testTeachersFolder.getFolders();
          let folderCount = 0;
          let bookCount = 0;
          
          while (teacherFolders.hasNext()) {
            const folder = teacherFolders.next();
            folderCount++;
            result.details.push(`📁 老師資料夾 ${folderCount}：${folder.getName()}`);
            
            const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
            let fileCountInFolder = 0;
            
            while (files.hasNext()) {
              const file = files.next();
              fileCountInFolder++;
              bookCount++;
              result.details.push(`  📄 檔案 ${fileCountInFolder}：${file.getName()}`);
              
              if (file.getName().includes('電聯記錄簿') || file.getName().includes('測試')) {
                result.details.push(`    ✅ 符合記錄簿條件`);
                result.found = true;
              } else {
                result.details.push(`    ❌ 不符合記錄簿條件`);
              }
            }
          }
          
          result.details.push(`📊 總計：${folderCount} 個老師資料夾，${bookCount} 個檔案`);
        } else {
          result.details.push(`❌ 測試資料夾內沒有找到老師資料夾`);
        }
      } else {
        result.details.push(`❌ 主資料夾內沒有找到測試環境資料夾`);
      }
    } catch (error) {
      result.errors.push('搜尋主資料夾失敗：' + error.toString());
    }
    
    Logger.log('調試結果：' + JSON.stringify(result, null, 2));
    return result;
    
  } catch (error) {
    Logger.log('調試失敗：' + error.toString());
    return {
      found: false,
      details: [],
      errors: ['調試失敗：' + error.message]
    };
  }
}

/**
 * 獲取測試環境狀態
 */
function getTestEnvironmentStatusWeb() {
  try {
    let testFolder = null;
    let location = '';
    
    try {
      // 優先在主資料夾內搜尋測試資料夾
      const mainFolder = getSystemMainFolder();
      const testFolders = mainFolder.getFoldersByName(TEST_CONFIG_DASHBOARD.TEST_FOLDER_NAME);
      
      if (testFolders.hasNext()) {
        testFolder = testFolders.next();
        location = '主資料夾內';
      }
      
    } catch (error) {
      // 如果主資料夾搜尋失敗，回退到根目錄搜尋（向後相容）
      Logger.log('Dashboard: 無法在主資料夾搜尋測試環境，回退到根目錄 - ' + error.toString());
    }
    
    // 如果主資料夾內沒找到，再搜尋根目錄
    if (!testFolder) {
      const rootFolder = DriveApp.getRootFolder();
      const testFolders = rootFolder.getFoldersByName(TEST_CONFIG_DASHBOARD.TEST_FOLDER_NAME);
      
      if (testFolders.hasNext()) {
        testFolder = testFolders.next();
        location = '根目錄';
      }
    }
    
    if (testFolder) {
      // 檢查測試資料夾內容
      const subFolders = testFolder.getFolders();
      const files = testFolder.getFiles();
      
      let folderCount = 0;
      let fileCount = 0;
      
      while (subFolders.hasNext()) {
        subFolders.next();
        folderCount++;
      }
      
      while (files.hasNext()) {
        files.next();
        fileCount++;
      }
      
      return {
        success: true,
        exists: true,
        testFolderUrl: testFolder.getUrl(),
        subFolderCount: folderCount,
        fileCount: fileCount,
        createdDate: testFolder.getDateCreated(),
        location: location,
        message: `測試環境已存在 (位於${location})`
      };
    } else {
      return {
        success: true,
        exists: false,
        message: '測試環境不存在'
      };
    }
    
  } catch (error) {
    Logger.log('Dashboard: 檢查測試環境狀態失敗 - ' + error.toString());
    return {
      success: false,
      message: '檢查測試環境狀態失敗：' + error.message
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
      testEnvironment: {
        exists: false,
        location: ''
      },
      overallHealth: 0,
      recommendations: [],
      nextSteps: []
    };
    
    // 檢查主資料夾
    try {
      const mainFolder = getSystemMainFolder();
      systemStatus.productionEnvironment.mainFolder = true;
      
      // 檢查子資料夾
      const requiredFolders = [
        SYSTEM_CONFIG.TEACHERS_FOLDER_NAME,
        SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME,
        '系統備份',
        '進度報告'
      ];
      
      let existingFolders = 0;
      requiredFolders.forEach(folderName => {
        const folders = mainFolder.getFoldersByName(folderName);
        if (folders.hasNext()) {
          existingFolders++;
        }
      });
      
      systemStatus.productionEnvironment.subFolders = (existingFolders === requiredFolders.length);
      
      // 檢查管理控制台
      try {
        const adminConsole = getAdminConsole(mainFolder);
        systemStatus.productionEnvironment.adminConsole = true;
      } catch (error) {
        systemStatus.productionEnvironment.adminConsole = false;
      }
      
      // 檢查範本檔案
      try {
        const templatesFolder = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME).next();
        const templateFiles = templatesFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
        systemStatus.productionEnvironment.templates = templateFiles.hasNext();
      } catch (error) {
        systemStatus.productionEnvironment.templates = false;
      }
      
    } catch (error) {
      systemStatus.productionEnvironment.mainFolder = false;
    }
    
    // 檢查測試環境
    const testStatus = getTestEnvironmentStatusWeb();
    if (testStatus.success && testStatus.exists) {
      systemStatus.testEnvironment.exists = true;
      systemStatus.testEnvironment.location = testStatus.location || '未知';
    }
    
    // 計算整體狀態
    const productionChecks = Object.values(systemStatus.productionEnvironment);
    const passedChecks = productionChecks.filter(check => check).length;
    systemStatus.overallHealth = Math.round((passedChecks / productionChecks.length) * 100);
    
    // 判斷是否已初始化
    systemStatus.initialized = systemStatus.overallHealth >= 75;
    
    // 生成建議和下一步
    if (!systemStatus.initialized) {
      systemStatus.recommendations.push('系統尚未完整初始化');
      systemStatus.nextSteps.push('執行「一鍵完整設定」或「初始化系統」');
    } else {
      systemStatus.recommendations.push('系統已就緒，可以進行測試');
      systemStatus.nextSteps.push('建立測試環境並執行功能測試');
    }
    
    if (!systemStatus.testEnvironment.exists) {
      systemStatus.nextSteps.push('建立測試環境以進行功能測試');
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
      } else {
        throw new Error(initResult.message);
      }
    } catch (error) {
      setupResults.errors.push('生產環境初始化失敗：' + error.message);
      setupResults.success = false;
    }
    
    // 步驟 2: 建立測試環境
    if (setupResults.success) {
      try {
        Logger.log('Dashboard: 建立測試環境');
        const testResult = setupTestEnvironmentWeb();
        
        if (testResult.success) {
          setupResults.steps.push('✅ 測試環境建立完成');
        } else {
          throw new Error(testResult.message);
        }
      } catch (error) {
        setupResults.errors.push('測試環境建立失敗：' + error.message);
        setupResults.success = false;
      }
    }
    
    // 步驟 3: 系統健康檢查
    if (setupResults.success) {
      try {
        Logger.log('Dashboard: 執行最終健康檢查');
        const statusResult = getSystemStatusWeb();
        
        if (statusResult.success && statusResult.systemStatus.overallHealth >= 75) {
          setupResults.steps.push('✅ 系統健康檢查通過');
        } else {
          setupResults.steps.push('⚠️ 系統健康檢查未完全通過，但基本功能可用');
        }
      } catch (error) {
        setupResults.steps.push('⚠️ 健康檢查執行失敗，但系統可能仍可使用');
      }
    }
    
    Logger.log(`Dashboard: 一鍵設定完成，成功: ${setupResults.success}`);
    
    return {
      success: setupResults.success,
      message: setupResults.success ? '完整系統設定成功！' : '部分設定失敗，請檢查錯誤訊息',
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