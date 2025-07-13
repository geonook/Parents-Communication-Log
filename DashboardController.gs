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
        monthlyProgress: '0%'
      }
    };
  }
}

/**
 * 計算系統統計資料
 */
function calculateSystemStats() {
  let teacherCount = 0;
  let studentCount = 0;
  let contactCount = 0;
  let monthlyProgress = 0;
  
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
                studentCount += Math.max(0, studentData.length - 1); // 減去標題行
              }
              
              // 統計電聯記錄數
              const contactSheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
              if (contactSheet) {
                const contactData = contactSheet.getDataRange().getValues();
                contactCount += Math.max(0, contactData.length - 1); // 減去標題行
              }
            } catch (e) {
              Logger.log('統計時無法開啟檔案：' + file.getName());
            }
          }
        }
      }
    }
    
    // 計算月度進度（簡化計算）
    const targetContactsPerMonth = teacherCount * SYSTEM_CONFIG.PROGRESS_CHECK.MIN_CONTACTS_PER_MONTH;
    if (targetContactsPerMonth > 0) {
      monthlyProgress = Math.round((contactCount / targetContactsPerMonth) * 100);
      monthlyProgress = Math.min(100, monthlyProgress); // 最大100%
    }
    
  } catch (error) {
    Logger.log('計算統計資料時發生錯誤：' + error.toString());
  }
  
  return {
    teacherCount: teacherCount,
    studentCount: studentCount,
    contactCount: contactCount,
    monthlyProgress: monthlyProgress + '%'
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
        checkAllProgress();
        return { success: true, message: '進度檢查完成！' };
      case 'setupAutomation':
        setupAutomationTriggers();
        return { success: true, message: '自動化設定完成！' };
      case 'performBackup':
        autoBackup();
        return { success: true, message: '備份完成！' };
      case 'checkFileIntegrity':
        checkFileIntegrity();
        return { success: true, message: '檔案完整性檢查完成！' };
      default:
        return { success: false, message: '未知的功能：' + functionName };
    }
  } catch (error) {
    return { success: false, message: error.message };
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