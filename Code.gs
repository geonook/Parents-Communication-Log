/**
 * 老師電聯記錄簿管理系統
 * 主要功能：檔案創建、班級學生資料管理、電聯記錄、進度檢查
 * 作者：Google Apps Script 專家
 */

// ============ 系統設定 ============
const SYSTEM_CONFIG = {
  // 主資料夾設定
  MAIN_FOLDER_NAME: '電聯記錄簿系統',
  MAIN_FOLDER_ID: '1ksWywUMUfsmHtUq99HdRB34obcAXhKUX', // 指定的 Google Drive 資料夾 ID，如果為空則建立新資料夾
  TEACHERS_FOLDER_NAME: '老師記錄簿',
  TEMPLATES_FOLDER_NAME: '範本檔案',
  
  // 檔案名稱格式
  TEACHER_SHEET_NAME_FORMAT: '{teacherName}_電聯記錄簿_{schoolYear}',
  
  // 工作表名稱
  SHEET_NAMES: {
    SUMMARY: '總覽',
    CLASS_INFO: '班級資訊',
    CONTACT_LOG: '電聯記錄',
    STUDENT_LIST: '學生清單',
    PROGRESS: '進度追蹤'
  },
  
  // 電聯記錄欄位 - 學期制版本
  CONTACT_FIELDS: [
    'Student ID', 'Name', 'English Name', 'English Class', 'Date', 
    'Semester', 'Term', 'Contact Type', 'Teachers Content', 'Parents Responses', 'Contact Method'
  ],
  
  // 學生總表欄位
  STUDENT_FIELDS: [
    'ID', 'Grade', 'HR', 'Seat #', 'Chinese Name', 'English Name',
    '112 Level', '113 Level', 'Previous Teacher', 'English Class', 
    'LT', 'Mother\'s Phone', 'Father\'s Phone'
  ],
  
  // 學年學期設定
  ACADEMIC_YEAR: {
    SEMESTERS: ['Fall', 'Spring'],
    TERMS: ['Beginning', 'Midterm', 'Final'],
    CURRENT_SEMESTER: 'Fall', // 可在系統設定中調整
    CURRENT_TERM: 'Beginning'  // 可在系統設定中調整
  },

  // 電聯類型設定
  CONTACT_TYPES: {
    SEMESTER: 'Scheduled Contact',   // 納入進度檢查
    REGULAR: 'Regular Contact',      // 不納入檢查  
    SPECIAL: 'Special Contact'       // 不納入檢查
  },

  // 聯繫方式選項（移除home visit和in person）
  CONTACT_METHODS: ['Phone Call', 'Line', 'Email'],

  // 進度檢查設定 - 改為學期制
  PROGRESS_CHECK: {
    REQUIRED_CONTACT_PER_TERM: 1, // 每個term每位學生至少1次學期電聯
    ALERT_DAYS: 14 // 超過幾天未記錄發出提醒（學期制需要更長時間）
  },
  
  // 年級和英語班級設定
  GRADE_LEVELS: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
  
  // 英語班級名稱（不含年級前綴）
  ENGLISH_CLASS_NAMES: [
    'Trailblazers', 'Discoverers', 'Adventurers', 'Innovators', 'Explorers',
    'Navigators', 'Inventors', 'Voyagers', 'Pioneers', 'Guardians',
    'Pathfinders', 'Seekers', 'Visionaries', 'Achievers', 'Champions'
  ]
};

/**
 * 建立系統主選單
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('電聯記錄簿系統')
      .addItem('🏗️ 初始化系統', 'initializeSystem')
      .addSeparator()
      .addItem('👨‍🏫 新增老師記錄簿', 'createTeacherRecordBook')
      .addItem('📝 批次建立老師記錄簿', 'batchCreateTeacherBooks')
      .addItem('📋 從學生總表建立老師記錄簿', 'createTeachersFromStudentMasterList')
      .addSeparator()
      .addSubMenu(ui.createMenu('👥 學生資料管理')
        .addItem('📥 匯入學生資料', 'importStudentData')
        .addItem('📤 匯出學生資料', 'exportStudentData')
        .addSeparator()
        .addItem('🤖 預建學期電聯記錄', 'prebuildScheduledContactRecords')
        .addItem('➕ 快速新增電聯記錄', 'createContactFromStudentList'))
      .addSeparator()
      .addItem('📊 檢查全體進度', 'checkAllProgress')
      .addItem('📈 生成進度報告', 'generateProgressReport')
      .addSeparator()
      .addSubMenu(ui.createMenu('🔧 系統管理')
        .addItem('⚙️ 系統設定', 'showSystemSettings')
        .addItem('📁 主資料夾資訊', 'showMainFolderInfo')
        .addSeparator()
        .addItem('📅 學年管理', 'showAcademicYearManagement')
        .addSeparator()
        .addItem('🔄 設定自動化', 'setupAutomationTriggers')
        .addItem('💾 手動備份', 'autoBackup')
        .addItem('🔍 檢查檔案完整性', 'checkFileIntegrity')
        .addItem('🔧 自動修復系統', 'autoFixSystemIssues')
        .addItem('📋 更新老師列表', 'updateTeachersList')
        .addSeparator()
        .addItem('✅ 系統驗證', 'runSystemValidation')
        .addSeparator()
        .addItem('📝 顯示系統日誌', 'showSystemLogs')
        .addItem('🗑️ 清除系統日誌', 'clearSystemLogs'))
      .addSeparator()
      .addItem('📖 使用說明', 'showUserGuide')
      .addToUi();
  } catch (uiError) {
    // Web環境或無UI權限時，跳過選單創建
    Logger.log('Web環境：跳過選單創建 - ' + uiError.toString());
  }
}

/**
 * 初始化整個系統
 */
function initializeSystem() {
  try {
    const response = safeUIAlert(
      '系統初始化', 
      '確定要初始化電聯記錄簿系統嗎？\n這將建立必要的資料夾結構和範本檔案。', 
      safeGetUI()?.ButtonSet.YES_NO
    );
    
    // 統一 Web 環境架構 - 移除環境檢查
    // 自動執行初始化程序
    
    Logger.log('開始系統初始化...');
    
    // 建立主資料夾結構
    const mainFolder = createSystemFolders();
    Logger.log('✅ 主資料夾結構建立完成');
    
    // 建立範本檔案
    createTemplateFiles(mainFolder);
    Logger.log('✅ 範本檔案建立完成');
    
    // 建立管理控制台
    const adminSheet = createAdminConsole(mainFolder);
    Logger.log('✅ 管理控制台建立完成');
    
    // 建立學生總表範本
    const masterListSheet = createStudentMasterListTemplate(mainFolder);
    Logger.log('✅ 學生總表範本建立完成');
    
    const successMessage = `系統已成功初始化！\n\n主資料夾：${mainFolder.getUrl()}\n管理控制台：${adminSheet.getUrl()}\n學生總表：${masterListSheet.getUrl()}\n\n請在學生總表中貼上您的學生資料，然後使用「從學生總表建立老師記錄簿」功能。`;
    
    safeUIAlert('初始化完成！', successMessage);
    Logger.log('🎉 系統初始化完成');
    
  } catch (error) {
    Logger.log('系統初始化失敗：' + error.toString());
    safeErrorHandler('系統初始化', error);
  }
}

/**
 * 建立系統資料夾結構
 * 如果在系統設定中指定了 MAIN_FOLDER_ID，則使用該資料夾，否則建立新資料夾
 */
function createSystemFolders() {
  let mainFolder;
  
  // 檢查是否有指定的資料夾 ID
  if (SYSTEM_CONFIG.MAIN_FOLDER_ID && SYSTEM_CONFIG.MAIN_FOLDER_ID.trim() !== '') {
    try {
      mainFolder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
      Logger.log(`使用指定的主資料夾：${mainFolder.getName()}`);
    } catch (error) {
      Logger.log(`無法存取指定的資料夾 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}，錯誤：${error.message}`);
      Logger.log('將建立新的主資料夾...');
      mainFolder = createNewMainFolder();
    }
  } else {
    Logger.log('未指定 MAIN_FOLDER_ID，建立新的主資料夾...');
    mainFolder = createNewMainFolder();
  }
  
  // 建立子資料夾
  const subFolders = [
    SYSTEM_CONFIG.TEACHERS_FOLDER_NAME,
    SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME,
    '系統備份',
    '進度報告'
  ];
  
  Logger.log('開始創建子資料夾...');
  const createdFolders = [];
  const existingFolders = [];
  
  subFolders.forEach(folderName => {
    try {
      const existingSubFolder = mainFolder.getFoldersByName(folderName);
      if (!existingSubFolder.hasNext()) {
        const newFolder = mainFolder.createFolder(folderName);
        createdFolders.push(folderName);
        Logger.log(`✅ 創建子資料夾: ${folderName}`);
        
        // 驗證資料夾是否真的被創建
        const verification = mainFolder.getFoldersByName(folderName);
        if (!verification.hasNext()) {
          throw new Error(`資料夾 ${folderName} 創建後無法找到`);
        }
      } else {
        existingFolders.push(folderName);
        Logger.log(`ℹ️ 使用現有子資料夾: ${folderName}`);
      }
    } catch (error) {
      Logger.log(`❌ 創建子資料夾 ${folderName} 失敗: ${error.toString()}`);
      throw new Error(`創建子資料夾 ${folderName} 失敗: ${error.message}`);
    }
  });
  
  Logger.log(`子資料夾創建完成 - 新建: ${createdFolders.length}, 現有: ${existingFolders.length}`);
  
  // 最終驗證所有必要資料夾都存在
  const missingFolders = [];
  subFolders.forEach(folderName => {
    const verification = mainFolder.getFoldersByName(folderName);
    if (!verification.hasNext()) {
      missingFolders.push(folderName);
    }
  });
  
  if (missingFolders.length > 0) {
    throw new Error(`以下必要資料夾創建失敗: ${missingFolders.join(', ')}`);
  }
  
  Logger.log('✅ 所有子資料夾驗證通過');
  return mainFolder;
}

/**
 * 建立新的主資料夾（當沒有指定資料夾 ID 時使用）
 */
function createNewMainFolder() {
  const rootFolder = DriveApp.getRootFolder();
  
  // 建立主資料夾
  let mainFolder;
  const existingFolders = rootFolder.getFoldersByName(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
  if (existingFolders.hasNext()) {
    mainFolder = existingFolders.next();
  } else {
    mainFolder = rootFolder.createFolder(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
  }
  
  return mainFolder;
}

/**
 * 建立範本檔案
 */
function createTemplateFiles(mainFolder) {
  // 安全獲取範本資料夾，如果不存在則創建
  let templatesFolder;
  const existingTemplatesFolder = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME);
  
  if (existingTemplatesFolder.hasNext()) {
    templatesFolder = existingTemplatesFolder.next();
    Logger.log('使用現有的範本資料夾');
  } else {
    Logger.log('範本資料夾不存在，正在創建...');
    templatesFolder = mainFolder.createFolder(SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME);
    Logger.log('範本資料夾創建完成');
  }
  
  // 建立電聯記錄範本
  Logger.log('創建電聯記錄範本檔案...');
  const templateSheet = SpreadsheetApp.create('電聯記錄簿範本');
  const templateFile = DriveApp.getFileById(templateSheet.getId());
  
  // 移動到範本資料夾
  templatesFolder.addFile(templateFile);
  DriveApp.getRootFolder().removeFile(templateFile);
  Logger.log('範本檔案已移動到範本資料夾');
  
  // 設定範本內容
  Logger.log('設定範本內容...');
  setupTemplateContent(templateSheet);
  Logger.log('範本內容設定完成');
  
  return templateSheet;
}

/**
 * 建立管理控制台
 */
function createAdminConsole(mainFolder) {
  const adminSheet = SpreadsheetApp.create('電聯記錄簿管理控制台');
  const adminFile = DriveApp.getFileById(adminSheet.getId());
  
  // 移動到主資料夾
  mainFolder.addFile(adminFile);
  DriveApp.getRootFolder().removeFile(adminFile);
  
  // 設定管理控制台內容
  setupAdminConsole(adminSheet);
  
  return adminSheet;
}

/**
 * 主要執行函數，供外部呼叫
 */
function main() {
  Logger.log('電聯記錄簿系統已載入');
  Logger.log('請使用選單中的功能或直接呼叫相應函數');
}

/**
 * 設定自訂主資料夾 ID
 * 使用方法：在執行初始化之前先呼叫此函數
 * @param {string} folderId - Google Drive 資料夾的 ID
 */
function setCustomMainFolderId(folderId) {
  try {
    // 驗證資料夾是否存在且可存取
    const folder = DriveApp.getFolderById(folderId);
    Logger.log(`已設定自訂主資料夾：${folder.getName()}`);
    
    // 此函數僅用於測試，實際設定需要修改 SYSTEM_CONFIG.MAIN_FOLDER_ID
    safeUIAlert(
      '設定主資料夾', 
      `已驗證資料夾可以存取：${folder.getName()}\n\n要使用此資料夾，請在 Code.gs 的 SYSTEM_CONFIG.MAIN_FOLDER_ID 中設定：\n'${folderId}'`
    );
    
  } catch (error) {
    safeErrorHandler('設定主資料夾', error, '無法存取指定的資料夾 ID，請確認資料夾存在且您有存取權限');
  }
}

/**
 * 驗證系統主資料夾設定是否正確（快速版本）
 * 這個函數會測試 MAIN_FOLDER_ID 的存取權限，帶有超時保護
 */
function verifySystemMainFolderAccess() {
  try {
    Logger.log('🔍 開始快速驗證系統主資料夾...');
    
    if (!SYSTEM_CONFIG.MAIN_FOLDER_ID || SYSTEM_CONFIG.MAIN_FOLDER_ID.trim() === '') {
      throw new Error('MAIN_FOLDER_ID 未設定，系統將在個人 Drive 中創建新資料夾');
    }
    
    Logger.log(`📁 嘗試存取資料夾 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}`);
    
    // 測試資料夾存取（簡化版本，避免長時間等待）
    const folder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
    const folderName = folder.getName();
    
    Logger.log(`✅ 成功存取指定資料夾：${folderName}`);
    
    // 簡化的權限測試（不實際創建資料夾，避免權限問題延遲）
    let hasWritePermission = true;
    let writePermissionMessage = '基本存取權限確認';
    
    try {
      // 嘗試獲取資料夾信息來測試權限
      const folderUrl = folder.getUrl();
      Logger.log(`📁 資料夾 URL：${folderUrl}`);
    } catch (urlError) {
      Logger.log('⚠️ 無法獲取資料夾 URL，可能權限不足');
      hasWritePermission = false;
      writePermissionMessage = '權限可能不足，建議檢查';
    }
    
    const message = `✅ 系統主資料夾快速驗證完成！\n\n📁 資料夾：${folderName}\n🆔 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}\n🔑 權限：${writePermissionMessage}\n\n系統現在會在此資料夾中創建所有檔案。`;
    
    Logger.log('✅ 資料夾驗證成功');
    safeUIAlert('資料夾驗證成功', message);
    
    return {
      success: true,
      folderName: folderName,
      folderUrl: folder.getUrl(),
      hasWritePermission: hasWritePermission
    };
    
  } catch (error) {
    Logger.log('❌ 資料夾驗證失敗：' + error.toString());
    
    let errorMessage = '指定的資料夾無法存取';
    if (error.message.includes('File not found')) {
      errorMessage = '找不到指定的資料夾 ID，請檢查 ID 是否正確';
    } else if (error.message.includes('Permission denied')) {
      errorMessage = '沒有權限存取指定的資料夾，請檢查共享設定';
    }
    
    safeErrorHandler('資料夾驗證', error, errorMessage);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 詳細的資料夾權限測試（較慢，但更完整）
 */
function detailedFolderPermissionTest() {
  try {
    if (!SYSTEM_CONFIG.MAIN_FOLDER_ID || SYSTEM_CONFIG.MAIN_FOLDER_ID.trim() === '') {
      throw new Error('MAIN_FOLDER_ID 未設定');
    }
    
    const folder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
    Logger.log(`詳細測試資料夾：${folder.getName()}`);
    
    // 測試寫入權限
    try {
      const testFolderName = '權限測試_' + Date.now();
      const testFolder = folder.createFolder(testFolderName);
      Logger.log('✅ 寫入權限測試通過');
      
      // 立即清理測試資料夾
      testFolder.setTrashed(true);
      Logger.log('✅ 測試資料夾已清理');
      
      return { success: true, writePermission: true };
    } catch (writeError) {
      Logger.log('❌ 寫入權限測試失敗：' + writeError.message);
      return { success: true, writePermission: false, error: writeError.message };
    }
    
  } catch (error) {
    Logger.log('❌ 詳細權限測試失敗：' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * 建立學生總表範本
 */
function createStudentMasterListTemplate(mainFolder) {
  // 建立學生總表檔案
  const masterListSheet = SpreadsheetApp.create('學生總表');
  const masterListFile = DriveApp.getFileById(masterListSheet.getId());
  
  // 移動到主資料夾
  mainFolder.addFile(masterListFile);
  DriveApp.getRootFolder().removeFile(masterListFile);
  
  // 設定學生總表內容
  setupMasterListContent(masterListSheet);
  
  return masterListSheet;
}

/**
 * 設定學生總表的內容結構
 */
function setupMasterListContent(masterListSheet) {
  const sheet = masterListSheet.getActiveSheet();
  sheet.setName('學生資料');
  
  // 設定標題
  sheet.getRange('A1').setValue('中師英文科學生總表');
  sheet.getRange('A1').setFontSize(18).setFontWeight('bold');
  
  // 動態計算合併範圍，基於實際欄位數量
  const numColumns = SYSTEM_CONFIG.STUDENT_FIELDS.length;
  const mergeRange = `A1:${String.fromCharCode(64 + numColumns)}1`; // A1 to column based on field count
  sheet.getRange(mergeRange).merge();
  
  // 設定說明
  sheet.getRange('A2').setValue('請將學生資料貼到第4列開始的位置（重要：English Class 欄位決定老師的授課班級）');
  sheet.getRange('A2').setFontStyle('italic').setFontColor('#666666');
  
  // 設定標題列
  const headers = SYSTEM_CONFIG.STUDENT_FIELDS;
  sheet.getRange(3, 1, 1, headers.length).setValues([headers]);
  
  // 格式設定
  sheet.getRange(3, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
  
  // 設定欄寬
  const columnWidths = [80, 60, 60, 60, 120, 120, 80, 80, 120, 120, 80, 120, 120];
  columnWidths.forEach((width, index) => {
    sheet.setColumnWidth(index + 1, width);
  });
  
  // 檢查是否在Web環境中執行（避免UI調用錯誤）
  try {
    // 詢問是否要生成測試資料（僅在非Web環境）
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '測試資料生成',
      '是否要生成20筆測試學生資料？\n\n• 包含不同年級、班級、老師的組合\n• 便於測試系統功能\n• 可隨時手動刪除',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      // 生成20筆測試資料
      const testData = generateTestStudentData();
      sheet.getRange(4, 1, testData.length, testData[0].length).setValues(testData);
      sheet.getRange(4, 1, testData.length, testData[0].length).setBackground('#FFFBEE').setNote('測試資料 - 可刪除');
      Logger.log('使用者選擇生成測試資料：20筆');
    } else {
      // 只新增一筆範例資料
      const sampleData = [[
        '001', 'G1', '701', '1', '王小明', 'Ming Wang', 'A1', 'A2', 'Mr. Johnson', 'G1 Trailblazers', 'Ms. Chen', '0912-345-678', '0987-654-321'
      ]];
      sheet.getRange(4, 1, 1, sampleData[0].length).setValues(sampleData);
      sheet.getRange(4, 1, 1, sampleData[0].length).setBackground('#E8F0FE').setFontStyle('italic');
      Logger.log('使用者選擇只添加範例資料：1筆');
    }
  } catch (uiError) {
    // 如果UI調用失敗（如在Web環境中），自動生成完整測試資料
    Logger.log('UI不可用，自動生成測試資料: ' + uiError.toString());
    Logger.log('Web環境：自動生成完整測試資料集');
    
    // 在Web環境下自動生成20筆測試資料
    const testData = generateTestStudentData();
    sheet.getRange(4, 1, testData.length, testData[0].length).setValues(testData);
    sheet.getRange(4, 1, testData.length, testData[0].length).setBackground('#FFFBEE').setNote('測試資料 - 可刪除');
    
    Logger.log(`Web環境：成功生成 ${testData.length} 筆測試學生資料`);
  }
  
  // 新增說明工作表
  createMasterListInstructionSheet(masterListSheet);
  
  // 凍結標題列
  sheet.setFrozenRows(3);
  
  // 設定資料驗證
  setupMasterListValidations(sheet);
}

/**
 * 建立學生總表說明工作表
 */
function createMasterListInstructionSheet(masterListSheet) {
  const instructionSheet = masterListSheet.insertSheet('使用說明');
  
  // 設定說明內容
  const instructions = [
    ['中師英文科學生總表 - 使用說明', ''],
    ['', ''],
    ['📋 欄位說明：', ''],
    ['ID', '學生學號'],
    ['Grade', '年級 (G1-G6)'],
    ['HR', '原班級 (如：701, 702) - 僅供參考'],
    ['Seat #', '座號'],
    ['Chinese Name', '中文姓名'],
    ['English Name', '英文姓名'],
    ['112 Level', '112學年度等級'],
    ['113 Level', '113學年度等級'],
    ['Previous Teacher', '前一位授課老師'],
    ['English Class', '🔥 重要！英語授課班級 (如：G1 Trailblazers)'],
    ['LT', '🔥 重要！語言老師姓名（用於自動建立記錄簿）'],
    ['Mother\'s Phone', '母親電話'],
    ['Father\'s Phone', '父親電話'],
    ['', ''],
    ['🚀 使用步驟：', ''],
    ['1. 將學生資料貼到「學生資料」工作表的第4列開始位置', ''],
    ['2. 確保 English Class 欄位格式正確（如：G1 Trailblazers）', ''],
    ['3. 確保 LT 欄位填入正確的英文老師姓名', ''],
    ['4. 在任意 Google Sheets 中使用選單：', ''],
    ['   「電聯記錄簿系統」→「📋 從學生總表建立老師記錄簿」', ''],
    ['5. 輸入此學生總表的 Google Sheets ID', ''],
    ['6. 系統將自動為所有英文老師建立記錄簿並匯入學生資料', ''],
    ['', ''],
    ['⚠️ 重要提醒：', ''],
    ['• English Class 欄位決定老師的授課班級（非 HR 欄位）', ''],
    ['• LT 欄位必須填入，這是識別英文老師的關鍵', ''],
    ['• 同一位老師的姓名必須保持一致', ''],
    ['• English Class 格式：年級 + 空格 + 班級名稱（如：G1 Trailblazers）', ''],
    ['• 建議先填入範例資料測試系統功能', '']
  ];
  
  // 設定內容
  instructionSheet.getRange(1, 1, instructions.length, 2).setValues(instructions);
  
  // 格式設定
  instructionSheet.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#1a73e8');
  instructionSheet.getRange('A3').setFontWeight('bold').setFontColor('#d93025');
  instructionSheet.getRange('A18').setFontWeight('bold').setFontColor('#137333');
  instructionSheet.getRange('A25').setFontWeight('bold').setFontColor('#ea4335');
  
  // 調整欄寬
  instructionSheet.setColumnWidth(1, 200);
  instructionSheet.setColumnWidth(2, 300);
}

/**
 * 設定學生總表的資料驗證
 */
function setupMasterListValidations(sheet) {
  // Grade 年級驗證 (B欄)
  const gradeRange = sheet.getRange('B5:B1000');
  const gradeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(SYSTEM_CONFIG.GRADE_LEVELS)
    .setAllowInvalid(false)
    .setHelpText('請選擇年級 (G1-G6)')
    .build();
  gradeRange.setDataValidation(gradeValidation);
  
  // HR 班級格式提示 (C欄)
  const hrRange = sheet.getRange('C5:C1000');
  hrRange.setNote('原班級（僅供參考），如：701, 702, 801等');
  
  // English Class 英語班級提示和背景 (J欄)
  const englishClassRange = sheet.getRange('J5:J1000');
  englishClassRange.setNote('🔥 重要！英語授課班級，格式：年級 + 空格 + 班級名稱\n例如：G1 Trailblazers, G2 Discoverers');
  englishClassRange.setBackground('#E8F5E8'); // 淺綠色背景提醒重要性
  
  // LT 老師姓名提示 (K欄)
  const ltRange = sheet.getRange('K5:K1000');
  ltRange.setNote('🔥 重要！請填入英文老師姓名，用於自動建立記錄簿');
  ltRange.setBackground('#FFF3E0'); // 淺橙色背景提醒重要性
}

/**
 * 顯示目前的主資料夾資訊
 */
function showMainFolderInfo() {
  try {
    let message = '目前系統設定：\n\n';
    
    if (SYSTEM_CONFIG.MAIN_FOLDER_ID) {
      const folder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
      message += `✓ 使用指定資料夾\n`;
      message += `資料夾名稱：${folder.getName()}\n`;
      message += `資料夾 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}\n`;
      message += `資料夾連結：${folder.getUrl()}`;
    } else {
      message += `✓ 使用預設設定\n`;
      message += `資料夾名稱：${SYSTEM_CONFIG.MAIN_FOLDER_NAME}\n`;
      message += `說明：系統將自動建立或搜尋同名資料夾`;
    }
    
    safeUIAlert('主資料夾資訊', message);
    
  } catch (error) {
    safeErrorHandler('獲取主資料夾資訊', error);
  }
}

/**
 * 生成50筆測試學生資料
 * 包含多樣化的年級、班級、老師組合，每位老師管理多個班級進行全面測試
 */
function generateTestStudentData() {
  const testStudents = [
    // Ms. Chen - 教授多個班級 (G1 Trailblazers + G1 Stars + G2 Champions)
    ['T001', 'G1', '701', '1', '測試學生1', 'Alice Chen', 'A1', 'A2', 'Mr. Smith', 'G1 Trailblazers', 'Ms. Chen', '0912-111-111', '0987-111-111'],
    ['T002', 'G1', '701', '2', '測試學生2', 'Bob Wang', 'A2', 'A1', 'Ms. Johnson', 'G1 Trailblazers', 'Ms. Chen', '0912-222-222', '0987-222-222'],
    ['T003', 'G1', '701', '3', '測試學生3', 'Charlie Liu', 'A1', 'A2', 'Mr. Brown', 'G1 Trailblazers', 'Ms. Chen', '0912-333-333', '0987-333-333'],
    ['T004', 'G1', '703', '4', '測試學生4', 'Diana Zhang', 'A2', 'A1', 'Ms. Wilson', 'G1 Stars', 'Ms. Chen', '0912-444-444', '0987-444-444'],
    ['T005', 'G1', '703', '5', '測試學生5', 'Eric Wu', 'A1', 'A2', 'Mr. Garcia', 'G1 Stars', 'Ms. Chen', '0912-555-555', '0987-555-555'],
    ['T006', 'G1', '703', '6', '測試學生6', 'Fiona Li', 'A2', 'A1', 'Ms. Martinez', 'G1 Stars', 'Ms. Chen', '0912-666-666', '0987-666-666'],
    ['T007', 'G2', '805', '7', '測試學生7', 'George Kim', 'A1', 'A2', 'Mr. Thompson', 'G2 Champions', 'Ms. Chen', '0912-777-777', '0987-777-777'],
    ['T008', 'G2', '805', '8', '測試學生8', 'Helen Chang', 'A2', 'A1', 'Ms. White', 'G2 Champions', 'Ms. Chen', '0912-888-888', '0987-888-888'],
    
    // Mr. Davis - 教授多個班級 (G1 Discoverers + G2 Rangers)
    ['T009', 'G1', '702', '9', '測試學生9', 'Ivan Chen', 'A1', 'A2', 'Mr. Rodriguez', 'G1 Discoverers', 'Mr. Davis', '0912-999-999', '0987-999-999'],
    ['T010', 'G1', '702', '10', '測試學生10', 'Jenny Yang', 'A2', 'A1', 'Ms. Lewis', 'G1 Discoverers', 'Mr. Davis', '0912-101-101', '0987-101-101'],
    ['T011', 'G1', '702', '11', '測試學生11', 'Kevin Tsai', 'A1', 'A2', 'Mr. Clark', 'G1 Discoverers', 'Mr. Davis', '0912-111-101', '0987-111-101'],
    ['T012', 'G1', '702', '12', '測試學生12', 'Linda Chiu', 'A2', 'A1', 'Ms. Hall', 'G1 Discoverers', 'Mr. Davis', '0912-121-121', '0987-121-121'],
    ['T013', 'G2', '804', '13', '測試學生13', 'Mark Wu', 'A1', 'A2', 'Mr. Allen', 'G2 Rangers', 'Mr. Davis', '0912-131-131', '0987-131-131'],
    ['T014', 'G2', '804', '14', '測試學生14', 'Nancy Lin', 'A2', 'A1', 'Ms. Scott', 'G2 Rangers', 'Mr. Davis', '0912-141-141', '0987-141-141'],
    ['T015', 'G2', '804', '15', '測試學生15', 'Oscar Huang', 'A1', 'A2', 'Mr. Green', 'G2 Rangers', 'Mr. Davis', '0912-151-151', '0987-151-151'],
    
    // Ms. Anderson - 教授多個班級 (G2 Adventurers + G3 Explorers)
    ['T016', 'G2', '801', '16', '測試學生16', 'Patricia Hsu', 'A2', 'A1', 'Ms. Adams', 'G2 Adventurers', 'Ms. Anderson', '0912-161-161', '0987-161-161'],
    ['T017', 'G2', '801', '17', '測試學生17', 'Quinn Liu', 'A1', 'A2', 'Mr. Baker', 'G2 Adventurers', 'Ms. Anderson', '0912-171-171', '0987-171-171'],
    ['T018', 'G2', '801', '18', '測試學生18', 'Rachel Wang', 'A2', 'A1', 'Ms. Carter', 'G2 Adventurers', 'Ms. Anderson', '0912-181-181', '0987-181-181'],
    ['T019', 'G2', '801', '19', '測試學生19', 'Steve Chen', 'A1', 'A2', 'Mr. Mitchell', 'G2 Adventurers', 'Ms. Anderson', '0912-191-191', '0987-191-191'],
    ['T020', 'G3', '901', '20', '測試學生20', 'Tina Yeh', 'A2', 'A1', 'Ms. Phillips', 'G3 Explorers', 'Ms. Anderson', '0912-201-201', '0987-201-201'],
    ['T021', 'G3', '901', '21', '測試學生21', 'Uma Zhou', 'A1', 'A2', 'Mr. Turner', 'G3 Explorers', 'Ms. Anderson', '0912-211-211', '0987-211-211'],
    ['T022', 'G3', '901', '22', '測試學生22', 'Victor Kao', 'A2', 'A1', 'Ms. Evans', 'G3 Explorers', 'Ms. Anderson', '0912-221-221', '0987-221-221'],
    
    // Mr. Taylor - 教授多個班級 (G2 Innovators + G3 Navigators)
    ['T023', 'G2', '802', '23', '測試學生23', 'Wendy Liao', 'A1', 'A2', 'Mr. Cooper', 'G2 Innovators', 'Mr. Taylor', '0912-231-231', '0987-231-231'],
    ['T024', 'G2', '802', '24', '測試學生24', 'Xavier Peng', 'A2', 'A1', 'Ms. Foster', 'G2 Innovators', 'Mr. Taylor', '0912-241-241', '0987-241-241'],
    ['T025', 'G2', '802', '25', '測試學生25', 'Yuki Jiang', 'A1', 'A2', 'Mr. Hughes', 'G2 Innovators', 'Mr. Taylor', '0912-251-251', '0987-251-251'],
    ['T026', 'G3', '902', '26', '測試學生26', 'Zoe Chou', 'A2', 'A1', 'Ms. Kelly', 'G3 Navigators', 'Mr. Taylor', '0912-261-261', '0987-261-261'],
    ['T027', 'G3', '902', '27', '測試學生27', 'Aaron Xu', 'A1', 'A2', 'Mr. Murphy', 'G3 Navigators', 'Mr. Taylor', '0912-271-271', '0987-271-271'],
    ['T028', 'G3', '902', '28', '測試學生28', 'Betty Shih', 'A2', 'A1', 'Ms. Rivera', 'G3 Navigators', 'Mr. Taylor', '0912-281-281', '0987-281-281'],
    
    // Ms. Moore - 單一班級但較多學生 (G3 Guardians)
    ['T029', 'G3', '903', '29', '測試學生29', 'Chris Fan', 'A1', 'A2', 'Mr. Reed', 'G3 Guardians', 'Ms. Moore', '0912-291-291', '0987-291-291'],
    ['T030', 'G3', '903', '30', '測試學生30', 'Daisy Guo', 'A2', 'A1', 'Ms. Ward', 'G3 Guardians', 'Ms. Moore', '0912-301-301', '0987-301-301'],
    ['T031', 'G3', '903', '31', '測試學生31', 'Edward Song', 'A1', 'A2', 'Mr. Cox', 'G3 Guardians', 'Ms. Moore', '0912-311-311', '0987-311-311'],
    ['T032', 'G3', '903', '32', '測試學生32', 'Flora Wen', 'A2', 'A1', 'Ms. Price', 'G3 Guardians', 'Ms. Moore', '0912-321-321', '0987-321-321'],
    ['T033', 'G3', '903', '33', '測試學生33', 'Gary Fu', 'A1', 'A2', 'Mr. Long', 'G3 Guardians', 'Ms. Moore', '0912-331-331', '0987-331-331'],
    
    // Mr. Jackson - 跨年級教學 (G4 Inventors + G5 Pioneers) 
    ['T034', 'G4', '1001', '34', '測試學生34', 'Hannah Ma', 'A2', 'A1', 'Ms. Bell', 'G4 Inventors', 'Mr. Jackson', '0912-341-341', '0987-341-341'],
    ['T035', 'G4', '1001', '35', '測試學生35', 'Ian Dong', 'A1', 'A2', 'Mr. Stone', 'G4 Inventors', 'Mr. Jackson', '0912-351-351', '0987-351-351'],
    ['T036', 'G4', '1001', '36', '測試學生36', 'Julia Tang', 'A2', 'A1', 'Ms. Wood', 'G4 Inventors', 'Mr. Jackson', '0912-361-361', '0987-361-361'],
    ['T037', 'G5', '1101', '37', '測試學生37', 'Kyle Zheng', 'A1', 'A2', 'Mr. Ross', 'G5 Pioneers', 'Mr. Jackson', '0912-371-371', '0987-371-371'],
    ['T038', 'G5', '1101', '38', '測試學生38', 'Luna Qiu', 'A2', 'A1', 'Ms. Gray', 'G5 Pioneers', 'Mr. Jackson', '0912-381-381', '0987-381-381'],
    ['T039', 'G5', '1101', '39', '測試學生39', 'Max Feng', 'A1', 'A2', 'Mr. Perry', 'G5 Pioneers', 'Mr. Jackson', '0912-391-391', '0987-391-391'],
    
    // Ms. King - 多班級 (G4 Voyagers + G5 Scholars)
    ['T040', 'G4', '1002', '40', '測試學生40', 'Nina Bai', 'A2', 'A1', 'Ms. James', 'G4 Voyagers', 'Ms. King', '0912-401-401', '0987-401-401'],
    ['T041', 'G4', '1002', '41', '測試學生41', 'Owen Deng', 'A1', 'A2', 'Mr. Watson', 'G4 Voyagers', 'Ms. King', '0912-411-411', '0987-411-411'],
    ['T042', 'G4', '1002', '42', '測試學生42', 'Penny Zhu', 'A2', 'A1', 'Ms. Brooks', 'G4 Voyagers', 'Ms. King', '0912-421-421', '0987-421-421'],
    ['T043', 'G5', '1102', '43', '測試學生43', 'Quinn Jia', 'A1', 'A2', 'Mr. Sanders', 'G5 Scholars', 'Ms. King', '0912-431-431', '0987-431-431'],
    ['T044', 'G5', '1102', '44', '測試學生44', 'Ruby Xie', 'A2', 'A1', 'Ms. Powell', 'G5 Scholars', 'Ms. King', '0912-441-441', '0987-441-441'],
    
    // Mr. Wright - 高年級專責 (G6 Guardians + G6 Champions)
    ['T045', 'G6', '1201', '45', '測試學生45', 'Sam Meng', 'A1', 'A2', 'Mr. Butler', 'G6 Guardians', 'Mr. Wright', '0912-451-451', '0987-451-451'],
    ['T046', 'G6', '1201', '46', '測試學生46', 'Tiffany Dai', 'A2', 'A1', 'Ms. Russell', 'G6 Guardians', 'Mr. Wright', '0912-461-461', '0987-461-461'],
    ['T047', 'G6', '1201', '47', '測試學生47', 'Ulysses Pan', 'A1', 'A2', 'Mr. Griffin', 'G6 Guardians', 'Mr. Wright', '0912-471-471', '0987-471-471'],
    ['T048', 'G6', '1202', '48', '測試學生48', 'Vivian Su', 'A2', 'A1', 'Ms. Diaz', 'G6 Champions', 'Mr. Wright', '0912-481-481', '0987-481-481'],
    ['T049', 'G6', '1202', '49', '測試學生49', 'Walter Cui', 'A1', 'A2', 'Mr. Hayes', 'G6 Champions', 'Mr. Wright', '0912-491-491', '0987-491-491'],
    ['T050', 'G6', '1202', '50', '測試學生50', 'Xenia Yao', 'A2', 'A1', 'Ms. Myers', 'G6 Champions', 'Mr. Wright', '0912-501-501', '0987-501-501']
  ];
  
  return testStudents;
} 