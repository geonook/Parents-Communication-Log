/**
 * 測試輔助工具模組
 * 提供系統測試和驗證的輔助功能
 */

/**
 * 測試設定常數
 */
const TEST_CONFIG = {
  TEST_FOLDER_NAME: 'Parents_Communication_Log_測試環境',
  TEST_TEACHER_COUNT: 3,
  TEST_STUDENT_COUNT: 15,
  TEST_GRADES: ['G1', 'G2', 'G3'],
  TEST_ENGLISH_CLASSES: ['G1 Trailblazers', 'G2 Discoverers', 'G3 Adventurers'],
  TEST_TEACHERS: ['Ms. Chen', 'Mr. Wang', 'Ms. Liu'],
  CONTACT_TYPES: ['Phone Call', 'Line', 'Email'], // 移除Home Visit
  SEMESTER_TERMS: [
    { semester: 'Fall', term: 'Beginning' },
    { semester: 'Fall', term: 'Midterm' },
    { semester: 'Fall', term: 'Final' },
    { semester: 'Spring', term: 'Beginning' },
    { semester: 'Spring', term: 'Midterm' },
    { semester: 'Spring', term: 'Final' }
  ]
};

/**
 * 建立完整的測試環境
 */
function setupTestEnvironment() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    systemLog(ERROR_LEVELS.INFO, 'TestUtils', 'setupTestEnvironment', '開始建立測試環境');
    
    const response = ui.alert(
      '建立測試環境',
      '這將建立完整的測試環境，包括：\n' +
      '• 測試用資料夾結構\n' +
      '• 示範學生資料\n' +
      '• 測試用老師記錄簿\n' +
      '• 模擬電聯記錄\n\n' +
      '確定要繼續嗎？',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) return;
    
    // 執行測試環境建立
    const testResults = executeTestSetup();
    
    // 顯示結果
    displayTestSetupResults(testResults);
    
  } catch (error) {
    systemLog(ERROR_LEVELS.ERROR, 'TestUtils', 'setupTestEnvironment', '建立測試環境失敗', error);
    SpreadsheetApp.getUi().alert('錯誤', '建立測試環境失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 執行測試環境建立
 */
function executeTestSetup() {
  const results = {
    steps: [],
    success: true,
    errors: []
  };
  
  try {
    // 1. 建立測試資料夾
    results.steps.push('✅ 建立測試資料夾結構');
    const testFolder = createTestFolder();
    
    // 2. 初始化系統（使用測試資料夾）
    results.steps.push('✅ 初始化系統結構');
    initializeTestSystem(testFolder);
    
    // 3. 建立測試學生總表
    results.steps.push('✅ 建立測試學生總表');
    const studentMasterSheet = createTestStudentMasterList(testFolder);
    
    // 4. 建立測試老師記錄簿
    results.steps.push('✅ 建立測試老師記錄簿');
    const teacherBooks = createTestTeacherBooks(testFolder, studentMasterSheet);
    
    // 5. 生成測試電聯記錄
    results.steps.push('✅ 生成測試電聯記錄');
    generateTestContactRecords(teacherBooks);
    
    // 6. 執行系統健康檢查
    results.steps.push('✅ 執行系統健康檢查');
    const healthReport = performTestHealthCheck();
    
    results.testFolder = testFolder;
    results.studentMasterSheet = studentMasterSheet;
    results.teacherBooks = teacherBooks;
    results.healthReport = healthReport;
    
  } catch (error) {
    results.success = false;
    results.errors.push(error.message);
    systemLog(ERROR_LEVELS.ERROR, 'TestUtils', 'executeTestSetup', '測試環境建立過程中發生錯誤', error);
  }
  
  return results;
}

/**
 * 建立測試資料夾
 */
function createTestFolder() {
  try {
    // 取得系統主資料夾
    const mainFolder = getSystemMainFolder();
    
    // 檢查主資料夾內是否已存在測試資料夾
    const existingFolders = mainFolder.getFoldersByName(TEST_CONFIG.TEST_FOLDER_NAME);
    if (existingFolders.hasNext()) {
      return existingFolders.next();
    }
    
    // 在主資料夾內建立新的測試資料夾
    return mainFolder.createFolder(TEST_CONFIG.TEST_FOLDER_NAME);
    
  } catch (error) {
    // 如果無法取得主資料夾，回退到根目錄建立（保持向後相容）
    Logger.log('無法在主資料夾內建立測試資料夾，使用根目錄：' + error.toString());
    
    const rootFolder = DriveApp.getRootFolder();
    const existingFolders = rootFolder.getFoldersByName(TEST_CONFIG.TEST_FOLDER_NAME);
    if (existingFolders.hasNext()) {
      return existingFolders.next();
    }
    
    return rootFolder.createFolder(TEST_CONFIG.TEST_FOLDER_NAME);
  }
}

/**
 * 初始化測試系統
 */
function initializeTestSystem(testFolder) {
  // 建立子資料夾
  const subFolders = [
    SYSTEM_CONFIG.TEACHERS_FOLDER_NAME,
    SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME,
    '系統備份',
    '進度報告'
  ];
  
  subFolders.forEach(folderName => {
    const existingSubFolder = testFolder.getFoldersByName(folderName);
    if (!existingSubFolder.hasNext()) {
      testFolder.createFolder(folderName);
    }
  });
  
  // 建立範本檔案
  createTestTemplateFiles(testFolder);
  
  // 建立管理控制台
  createTestAdminConsole(testFolder);
}

/**
 * 建立測試學生總表
 */
function createTestStudentMasterList(testFolder) {
  const masterListSheet = SpreadsheetApp.create('測試用學生總表');
  const masterListFile = DriveApp.getFileById(masterListSheet.getId());
  
  // 移動到測試資料夾
  testFolder.addFile(masterListFile);
  DriveApp.getRootFolder().removeFile(masterListFile);
  
  // 設定內容
  setupTestMasterListContent(masterListSheet);
  
  return masterListSheet;
}

/**
 * 設定測試學生總表內容
 */
function setupTestMasterListContent(masterListSheet) {
  const sheet = masterListSheet.getActiveSheet();
  sheet.setName('學生資料');
  
  // 設定標題
  const headers = SYSTEM_CONFIG.STUDENT_FIELDS;
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
  
  // 生成測試資料
  const testData = generateTestStudentData();
  if (testData.length > 0) {
    sheet.getRange(2, 1, testData.length, headers.length).setValues(testData);
  }
  
  // 設定欄寬
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 生成測試學生資料
 */
function generateTestStudentData() {
  const testData = [];
  let studentId = 1;
  
  // 為每個測試老師生成學生
  TEST_CONFIG.TEST_TEACHERS.forEach((teacher, teacherIndex) => {
    const studentsPerTeacher = Math.floor(TEST_CONFIG.TEST_STUDENT_COUNT / TEST_CONFIG.TEST_TEACHERS.length);
    
    for (let i = 0; i < studentsPerTeacher; i++) {
      const grade = TEST_CONFIG.TEST_GRADES[teacherIndex];
      const englishClass = TEST_CONFIG.TEST_ENGLISH_CLASSES[teacherIndex];
      
      testData.push([
        String(studentId).padStart(3, '0'),  // ID
        grade,                               // Grade
        `${grade.substring(1)}01`,          // HR
        String(i + 1),                      // Seat #
        `學生${studentId}`,                  // Chinese Name
        `Student${studentId}`,              // English Name
        `A${Math.floor(Math.random() * 3) + 1}`, // 112 Level
        `A${Math.floor(Math.random() * 3) + 1}`, // 113 Level
        '',                                 // English Class (Old)
        englishClass,                       // English Class
        teacher,                           // LT
        `0912-34${String(studentId).padStart(4, '0')}`, // Mother's Phone
        `0987-65${String(studentId).padStart(4, '0')}`  // Father's Phone
      ]);
      
      studentId++;
    }
  });
  
  return testData;
}

/**
 * 建立測試老師記錄簿
 */
function createTestTeacherBooks(testFolder, studentMasterSheet) {
  const teacherBooks = [];
  
  // 從學生總表提取老師資訊
  const teachersInfo = extractTestTeachersFromMasterList(studentMasterSheet);
  
  // 為每位老師建立記錄簿
  teachersInfo.forEach(teacherInfo => {
    try {
      const recordBook = createTestTeacherSheet(testFolder, teacherInfo);
      importTestStudentsForTeacher(recordBook, teacherInfo);
      teacherBooks.push(recordBook);
    } catch (error) {
      systemLog(ERROR_LEVELS.ERROR, 'TestUtils', 'createTestTeacherBooks', 
        `建立 ${teacherInfo.name} 測試記錄簿失敗`, error);
    }
  });
  
  return teacherBooks;
}

/**
 * 從測試學生總表提取老師資訊
 */
function extractTestTeachersFromMasterList(masterListSheet) {
  const sheet = masterListSheet.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  // 找到 LT 欄位索引
  const ltIndex = headers.findIndex(h => h.toString().includes('LT'));
  const englishClassIndex = headers.findIndex(h => 
    h.toString().includes('English Class') && !h.toString().includes('Old')
  );
  
  const teacherMap = new Map();
  
  rows.forEach(row => {
    const teacherName = row[ltIndex];
    const englishClass = row[englishClassIndex];
    
    if (teacherName && englishClass) {
      if (!teacherMap.has(teacherName)) {
        teacherMap.set(teacherName, {
          name: teacherName,
          subject: '英文',
          classes: new Set(),
          students: []
        });
      }
      
      const teacher = teacherMap.get(teacherName);
      teacher.classes.add(englishClass);
      teacher.students.push(row);
    }
  });
  
  // 轉換為陣列並將 Set 轉為 Array
  return Array.from(teacherMap.values()).map(teacher => ({
    ...teacher,
    classes: Array.from(teacher.classes)
  }));
}

/**
 * 建立測試老師記錄簿
 */
function createTestTeacherSheet(testFolder, teacherInfo) {
  const teachersFolder = testFolder.getFoldersByName(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME).next();
  
  // 建立老師專屬資料夾
  const teacherFolderName = `${teacherInfo.name}_測試記錄簿`;
  let teacherFolder;
  const existingTeacherFolder = teachersFolder.getFoldersByName(teacherFolderName);
  if (existingTeacherFolder.hasNext()) {
    teacherFolder = existingTeacherFolder.next();
  } else {
    teacherFolder = teachersFolder.createFolder(teacherFolderName);
  }
  
  // 建立記錄簿檔案
  const fileName = `${teacherInfo.name}_測試電聯記錄簿`;
  const recordBook = SpreadsheetApp.create(fileName);
  const recordFile = DriveApp.getFileById(recordBook.getId());
  
  // 移動到老師資料夾
  teacherFolder.addFile(recordFile);
  DriveApp.getRootFolder().removeFile(recordFile);
  
  // 設定記錄簿內容
  setupTeacherRecordBook(recordBook, teacherInfo);
  
  // 為測試記錄簿設定選單
  setupTestRecordBookMenu(recordBook);
  
  return recordBook;
}

/**
 * 為測試記錄簿設定選單
 */
function setupTestRecordBookMenu(recordBook) {
  try {
    // 獲取記錄簿的腳本編輯器並添加選單設定
    // 注意：由於測試記錄簿是獨立的檔案，需要複製選單程式碼
    
    // 創建臨時腳本來設定選單
    const scriptContent = `
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('電聯記錄簿系統')
    .addItem('📊 檢查全體進度', 'checkAllProgress')
    .addItem('📈 生成進度報告', 'generateProgressReport')
    .addSeparator()
    .addSubMenu(ui.createMenu('👥 學生資料管理')
      .addItem('📥 匯入學生資料', 'importStudentData')
      .addItem('📤 匯出學生資料', 'exportStudentData')
      .addItem('➕ 快速新增電聯記錄', 'createContactFromStudentList'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🔧 系統管理')
      .addItem('⚙️ 系統設定', 'showSystemSettings')
      .addItem('📁 主資料夾資訊', 'showMainFolderInfo'))
    .addSubMenu(ui.createMenu('🧪 測試工具')
      .addItem('ℹ️ 測試環境說明', 'showTestInfo')
      .addItem('🔄 重新整理選單', 'onOpen'))
    .addToUi();
}

// 測試環境說明
function showTestInfo() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '🧪 測試環境說明',
    '這是測試用的老師記錄簿，包含模擬資料。\\n\\n' +
    '• 此記錄簿僅供測試系統功能\\n' +
    '• 不會影響生產環境的資料\\n' +
    '• 測試完成後可在Dashboard清理測試環境\\n\\n' +
    '您可以在此測試各項功能，如進度檢查、資料匯入匯出等。',
    ui.ButtonSet.OK
  );
}

// 由於測試環境的限制，部分功能需要引用主系統的函數
// 這裡提供簡化版本的核心功能

function checkAllProgress() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '功能說明',
    '請在主系統的Dashboard中使用「📊 檢查全體進度」功能。\\n\\n' +
    '測試記錄簿中的選單主要用於驗證選單是否正確顯示。',
    ui.ButtonSet.OK
  );
}

function generateProgressReport() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '功能說明',
    '請在主系統中使用進度報告功能。',
    ui.ButtonSet.OK
  );
}
`;
    
    Logger.log('測試記錄簿選單設定：由於Google Apps Script的限制，無法直接為新建立的Spreadsheet添加腳本。建議用戶手動重新整理頁面以載入選單。');
    
  } catch (error) {
    Logger.log('設定測試記錄簿選單失敗：' + error.toString());
  }
}

/**
 * 為測試老師匯入學生資料
 */
function importTestStudentsForTeacher(recordBook, teacherInfo) {
  const studentListSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
  if (!studentListSheet) return;
  
  // 準備學生資料
  const studentData = teacherInfo.students.map(studentRow => {
    const formattedRow = [];
    for (let i = 0; i < SYSTEM_CONFIG.STUDENT_FIELDS.length; i++) {
      formattedRow.push(studentRow[i] || '');
    }
    return formattedRow;
  });
  
  // 匯入資料
  if (studentData.length > 0) {
    studentListSheet.getRange(2, 1, studentData.length, SYSTEM_CONFIG.STUDENT_FIELDS.length)
      .setValues(studentData);
  }
}

/**
 * 生成測試電聯記錄
 */
function generateTestContactRecords(teacherBooks) {
  teacherBooks.forEach(book => {
    try {
      const contactSheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
      const studentSheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
      
      if (!contactSheet || !studentSheet) return;
      
      // 獲取學生資料
      const studentData = studentSheet.getDataRange().getValues().slice(1); // 跳過標題
      if (studentData.length === 0) return;
      
      // 為每個學生生成 1-3 筆電聯記錄（學期制版本）
      const contactRecords = [];
      studentData.forEach(student => {
        const recordCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < recordCount; i++) {
          const daysAgo = Math.floor(Math.random() * 60); // 增加時間範圍以跨越多個term
          const contactDate = new Date();
          contactDate.setDate(contactDate.getDate() - daysAgo);
          
          // 隨機選擇學期term組合
          const semesterTermIndex = Math.floor(Math.random() * TEST_CONFIG.SEMESTER_TERMS.length);
          const semesterTerm = TEST_CONFIG.SEMESTER_TERMS[semesterTermIndex];
          
          // 隨機選擇電聯類型（大部分是學期電聯）
          let contactType;
          const rand = Math.random();
          if (rand < 0.7) {
            contactType = SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER; // 70% 學期電聯
          } else if (rand < 0.9) {
            contactType = SYSTEM_CONFIG.CONTACT_TYPES.REGULAR; // 20% 平時電聯
          } else {
            contactType = SYSTEM_CONFIG.CONTACT_TYPES.SPECIAL; // 10% 特殊狀況電聯
          }
          
          // 隨機選擇聯繫方式
          const contactMethod = SYSTEM_CONFIG.CONTACT_METHODS[Math.floor(Math.random() * SYSTEM_CONFIG.CONTACT_METHODS.length)];
          
          // 根據新的欄位結構建立記錄
          // CONTACT_FIELDS: ['Student ID', 'Name', 'English Name', 'English Class', 'Date', 
          //                  'Semester', 'Term', 'Contact Type', 'Teachers Content', 'Parents Responses', 'Contact Method']
          contactRecords.push([
            student[0],  // Student ID
            student[4],  // Name (Chinese Name)
            student[5],  // English Name
            student[9],  // English Class
            contactDate, // Date
            semesterTerm.semester, // Semester
            semesterTerm.term,     // Term
            contactType,           // Contact Type
            `關於${student[4]}的${semesterTerm.semester} ${semesterTerm.term}學習狀況討論`, // Teachers Content
            '家長表示會加強督導', // Parents Responses
            contactMethod         // Contact Method
          ]);
        }
      });
      
      // 寫入電聯記錄
      if (contactRecords.length > 0) {
        contactSheet.getRange(2, 1, contactRecords.length, SYSTEM_CONFIG.CONTACT_FIELDS.length)
          .setValues(contactRecords);
      }
      
    } catch (error) {
      systemLog(ERROR_LEVELS.ERROR, 'TestUtils', 'generateTestContactRecords', 
        `為 ${book.getName()} 生成測試電聯記錄失敗`, error);
    }
  });
}

/**
 * 執行測試健康檢查
 */
function performTestHealthCheck() {
  try {
    return performSystemHealthCheck();
  } catch (error) {
    systemLog(ERROR_LEVELS.ERROR, 'TestUtils', 'performTestHealthCheck', '測試健康檢查失敗', error);
    return { systemStatus: '檢查失敗', overallHealth: 0 };
  }
}

/**
 * 顯示測試環境建立結果
 */
function displayTestSetupResults(results) {
  const ui = SpreadsheetApp.getUi();
  
  let message = '🧪 測試環境建立結果\n\n';
  
  if (results.success) {
    message += '✅ 測試環境建立成功！\n\n';
    message += '📋 執行步驟：\n';
    results.steps.forEach(step => {
      message += `${step}\n`;
    });
    
    if (results.healthReport) {
      message += `\n📊 系統健康度：${results.healthReport.overallHealth}% (${results.healthReport.systemStatus})\n`;
    }
    
    if (results.testFolder) {
      message += `\n📁 測試資料夾：${results.testFolder.getUrl()}\n`;
    }
    
    message += '\n🎯 下一步：\n';
    message += '1. 檢查測試資料夾結構\n';
    message += '2. 驗證學生總表資料\n';
    message += '3. 測試老師記錄簿功能\n';
    message += '4. 執行進度檢查功能';
    
  } else {
    message += '❌ 測試環境建立失敗\n\n';
    message += '錯誤訊息：\n';
    results.errors.forEach(error => {
      message += `• ${error}\n`;
    });
  }
  
  ui.alert('測試環境建立結果', message, ui.ButtonSet.OK);
}

/**
 * 建立測試範本檔案
 */
function createTestTemplateFiles(testFolder) {
  const templatesFolder = testFolder.getFoldersByName(SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME).next();
  
  // 建立完整的測試範本
  const templateSheet = SpreadsheetApp.create('測試用電聯記錄簿範本');
  const templateFile = DriveApp.getFileById(templateSheet.getId());
  
  templatesFolder.addFile(templateFile);
  DriveApp.getRootFolder().removeFile(templateFile);
  
  // 使用完整的範本內容設定（與生產環境一致）
  setupTemplateContent(templateSheet);
  
  return templateSheet;
}

/**
 * 建立測試管理控制台
 */
function createTestAdminConsole(testFolder) {
  const adminSheet = SpreadsheetApp.create('測試用管理控制台');
  const adminFile = DriveApp.getFileById(adminSheet.getId());
  
  testFolder.addFile(adminFile);
  DriveApp.getRootFolder().removeFile(adminFile);
  
  // 使用完整的管理控制台設定（與生產環境一致）
  setupAdminConsole(adminSheet);
  
  return adminSheet;
}

/**
 * 清理測試環境
 */
function cleanupTestEnvironment() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    const response = ui.alert(
      '清理測試環境',
      '確定要刪除測試環境嗎？\n這將刪除所有測試資料和檔案，此操作無法復原。',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) return;
    
    let deletedCount = 0;
    
    try {
      // 優先在主資料夾內搜尋測試資料夾
      const mainFolder = getSystemMainFolder();
      const testFolders = mainFolder.getFoldersByName(TEST_CONFIG.TEST_FOLDER_NAME);
      
      while (testFolders.hasNext()) {
        const folder = testFolders.next();
        folder.setTrashed(true);
        deletedCount++;
      }
      
      systemLog(ERROR_LEVELS.INFO, 'TestUtils', 'cleanupTestEnvironment', 
        `已在主資料夾內清理 ${deletedCount} 個測試環境`);
      
    } catch (error) {
      // 如果主資料夾搜尋失敗，回退到根目錄搜尋（向後相容）
      Logger.log('無法在主資料夾搜尋測試環境，回退到根目錄：' + error.toString());
      
      const rootFolder = DriveApp.getRootFolder();
      const testFolders = rootFolder.getFoldersByName(TEST_CONFIG.TEST_FOLDER_NAME);
      
      while (testFolders.hasNext()) {
        const folder = testFolders.next();
        folder.setTrashed(true);
        deletedCount++;
      }
      
      systemLog(ERROR_LEVELS.INFO, 'TestUtils', 'cleanupTestEnvironment', 
        `已在根目錄清理 ${deletedCount} 個測試環境`);
    }
    
    if (deletedCount > 0) {
      ui.alert('完成', `測試環境已清理 (${deletedCount} 個資料夾)`, ui.ButtonSet.OK);
    } else {
      ui.alert('完成', '沒有找到需要清理的測試環境', ui.ButtonSet.OK);
    }
    
  } catch (error) {
    systemLog(ERROR_LEVELS.ERROR, 'TestUtils', 'cleanupTestEnvironment', '清理測試環境失敗', error);
    SpreadsheetApp.getUi().alert('錯誤', '清理測試環境失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}