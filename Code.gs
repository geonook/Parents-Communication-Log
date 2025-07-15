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
  TEACHER_SHEET_NAME_FORMAT: '{teacherName}_電聯記錄簿_{year}學年',
  
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
    SEMESTER: 'Academic Contact',    // 納入進度檢查
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
      .addItem('🤖 預建學期電聯記錄', 'prebuildAcademicContactRecords')
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
      .addItem('📝 顯示系統日誌', 'showSystemLogs')
      .addItem('🗑️ 清除系統日誌', 'clearSystemLogs'))
    .addSeparator()
    .addItem('📖 使用說明', 'showUserGuide')
    .addToUi();
}

/**
 * 初始化整個系統
 */
function initializeSystem() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '系統初始化', 
      '確定要初始化電聯記錄簿系統嗎？\n這將建立必要的資料夾結構和範本檔案。', 
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) return;
    
    // 建立主資料夾結構
    const mainFolder = createSystemFolders();
    
    // 建立範本檔案
    createTemplateFiles(mainFolder);
    
    // 建立管理控制台
    const adminSheet = createAdminConsole(mainFolder);
    
    // 建立學生總表範本
    const masterListSheet = createStudentMasterListTemplate(mainFolder);
    
    ui.alert(
      '初始化完成！', 
      `系統已成功初始化！\n\n主資料夾：${mainFolder.getUrl()}\n管理控制台：${adminSheet.getUrl()}\n學生總表：${masterListSheet.getUrl()}\n\n請在學生總表中貼上您的學生資料，然後使用「從學生總表建立老師記錄簿」功能。`, 
      ui.ButtonSet.OK
    );
    
    Logger.log('系統初始化完成');
    
  } catch (error) {
    Logger.log('系統初始化失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '系統初始化失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 建立系統資料夾結構
 * 如果在系統設定中指定了 MAIN_FOLDER_ID，則使用該資料夾，否則建立新資料夾
 */
function createSystemFolders() {
  let mainFolder;
  
  // 檢查是否有指定的資料夾 ID
  if (SYSTEM_CONFIG.MAIN_FOLDER_ID) {
    try {
      mainFolder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
      Logger.log(`使用指定的主資料夾：${mainFolder.getName()}`);
    } catch (error) {
      Logger.log(`無法存取指定的資料夾 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}，將建立新資料夾`);
      mainFolder = createNewMainFolder();
    }
  } else {
    mainFolder = createNewMainFolder();
  }
  
  // 建立子資料夾
  const subFolders = [
    SYSTEM_CONFIG.TEACHERS_FOLDER_NAME,
    SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME,
    '系統備份',
    '進度報告'
  ];
  
  subFolders.forEach(folderName => {
    const existingSubFolder = mainFolder.getFoldersByName(folderName);
    if (!existingSubFolder.hasNext()) {
      mainFolder.createFolder(folderName);
    }
  });
  
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
  const templatesFolder = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME).next();
  
  // 建立電聯記錄範本
  const templateSheet = SpreadsheetApp.create('電聯記錄簿範本');
  const templateFile = DriveApp.getFileById(templateSheet.getId());
  
  // 移動到範本資料夾
  templatesFolder.addFile(templateFile);
  DriveApp.getRootFolder().removeFile(templateFile);
  
  // 設定範本內容
  setupTemplateContent(templateSheet);
  
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
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '設定主資料夾', 
      `已驗證資料夾可以存取：${folder.getName()}\n\n要使用此資料夾，請在 Code.gs 的 SYSTEM_CONFIG.MAIN_FOLDER_ID 中設定：\n'${folderId}'`, 
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('錯誤', '無法存取指定的資料夾 ID，請確認資料夾存在且您有存取權限', ui.ButtonSet.OK);
    Logger.log('設定主資料夾失敗：' + error.toString());
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
  sheet.getRange('A1:M1').merge();
  
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
  
  // 詢問是否要生成測試資料
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
  } else {
    // 只新增一筆範例資料
    const sampleData = [[
      '001', 'G1', '701', '1', '王小明', 'Ming Wang', 'A1', 'A2', 'Mr. Johnson', 'G1 Trailblazers', 'Ms. Chen', '0912-345-678', '0987-654-321'
    ]];
    sheet.getRange(4, 1, 1, sampleData[0].length).setValues(sampleData);
    sheet.getRange(4, 1, 1, sampleData[0].length).setBackground('#E8F0FE').setFontStyle('italic');
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
    
    const ui = SpreadsheetApp.getUi();
    ui.alert('主資料夾資訊', message, ui.ButtonSet.OK);
    
  } catch (error) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('錯誤', '無法獲取主資料夾資訊：' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * 生成20筆測試學生資料
 * 包含多樣化的年級、班級、老師組合
 */
function generateTestStudentData() {
  const testStudents = [
    // 不同年級的學生資料
    ['T001', 'G1', '701', '1', '測試學生1', 'Alice Chen', 'A1', 'A2', 'Mr. Smith', 'G1 Trailblazers', 'Ms. Chen', '0912-111-111', '0987-111-111'],
    ['T002', 'G1', '701', '2', '測試學生2', 'Bob Wang', 'A2', 'A1', 'Ms. Johnson', 'G1 Trailblazers', 'Ms. Chen', '0912-222-222', '0987-222-222'],
    ['T003', 'G1', '702', '3', '測試學生3', 'Cathy Liu', 'A1', 'A2', 'Mr. Brown', 'G1 Discoverers', 'Mr. Davis', '0912-333-333', '0987-333-333'],
    ['T004', 'G1', '702', '4', '測試學生4', 'David Zhang', 'A2', 'A1', 'Ms. Wilson', 'G1 Discoverers', 'Mr. Davis', '0912-444-444', '0987-444-444'],
    
    ['T005', 'G2', '801', '5', '測試學生5', 'Emily Lin', 'A1', 'A2', 'Mr. Garcia', 'G2 Adventurers', 'Ms. Anderson', '0912-555-555', '0987-555-555'],
    ['T006', 'G2', '801', '6', '測試學生6', 'Frank Wu', 'A2', 'A1', 'Ms. Martinez', 'G2 Adventurers', 'Ms. Anderson', '0912-666-666', '0987-666-666'],
    ['T007', 'G2', '802', '7', '測試學生7', 'Grace Huang', 'A1', 'A2', 'Mr. Thompson', 'G2 Innovators', 'Mr. Taylor', '0912-777-777', '0987-777-777'],
    ['T008', 'G2', '802', '8', '測試學生8', 'Henry Lee', 'A2', 'A1', 'Ms. White', 'G2 Innovators', 'Mr. Taylor', '0912-888-888', '0987-888-888'],
    
    ['T009', 'G3', '901', '9', '測試學生9', 'Ivy Chen', 'A1', 'A2', 'Mr. Rodriguez', 'G3 Explorers', 'Ms. Moore', '0912-999-999', '0987-999-999'],
    ['T010', 'G3', '901', '10', '測試學生10', 'Jack Yang', 'A2', 'A1', 'Ms. Lewis', 'G3 Explorers', 'Ms. Moore', '0912-100-100', '0987-100-100'],
    ['T011', 'G3', '902', '11', '測試學生11', 'Kelly Tsai', 'A1', 'A2', 'Mr. Clark', 'G3 Navigators', 'Mr. Jackson', '0912-110-110', '0987-110-110'],
    ['T012', 'G3', '902', '12', '測試學生12', 'Leo Chiu', 'A2', 'A1', 'Ms. Hall', 'G3 Navigators', 'Mr. Jackson', '0912-120-120', '0987-120-120'],
    
    ['T013', 'G4', '1001', '13', '測試學生13', 'Mia Wu', 'A1', 'A2', 'Mr. Allen', 'G4 Inventors', 'Ms. King', '0912-130-130', '0987-130-130'],
    ['T014', 'G4', '1001', '14', '測試學生14', 'Noah Lin', 'A2', 'A1', 'Ms. Scott', 'G4 Inventors', 'Ms. King', '0912-140-140', '0987-140-140'],
    ['T015', 'G4', '1002', '15', '測試學生15', 'Olivia Chang', 'A1', 'A2', 'Mr. Green', 'G4 Voyagers', 'Mr. Wright', '0912-150-150', '0987-150-150'],
    ['T016', 'G4', '1002', '16', '測試學生16', 'Peter Hsu', 'A2', 'A1', 'Ms. Adams', 'G4 Voyagers', 'Mr. Wright', '0912-160-160', '0987-160-160'],
    
    ['T017', 'G5', '1101', '17', '測試學生17', 'Quinn Liu', 'A1', 'A2', 'Mr. Baker', 'G5 Pioneers', 'Ms. Nelson', '0912-170-170', '0987-170-170'],
    ['T018', 'G5', '1101', '18', '測試學生18', 'Ruby Wang', 'A2', 'A1', 'Ms. Carter', 'G5 Pioneers', 'Ms. Nelson', '0912-180-180', '0987-180-180'],
    ['T019', 'G6', '1201', '19', '測試學生19', 'Sam Chen', 'A1', 'A2', 'Mr. Mitchell', 'G6 Guardians', 'Mr. Roberts', '0912-190-190', '0987-190-190'],
    ['T020', 'G6', '1201', '20', '測試學生20', 'Tina Yeh', 'A2', 'A1', 'Ms. Phillips', 'G6 Guardians', 'Mr. Roberts', '0912-200-200', '0987-200-200']
  ];
  
  return testStudents;
} 