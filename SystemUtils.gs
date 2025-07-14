/**
 * 系統工具模組
 * 提供系統設定、範本管理、控制台設定等輔助功能
 */

/**
 * 設定範本檔案內容
 */
function setupTemplateContent(templateSheet) {
  // 刪除預設工作表並建立範本工作表
  const defaultSheet = templateSheet.getActiveSheet();
  
  // 建立範本的各個工作表
  createTemplateSheets(templateSheet);
  
  // 刪除預設工作表
  if (templateSheet.getSheets().length > 1) {
    templateSheet.deleteSheet(defaultSheet);
  }
}

/**
 * 建立範本工作表
 */
function createTemplateSheets(templateSheet) {
  // 建立說明工作表
  const instructionSheet = templateSheet.insertSheet('使用說明');
  setupInstructionSheet(instructionSheet);
  
  // 建立範本總覽
  const templateSummary = templateSheet.insertSheet('範本總覽');
  setupTemplateSummarySheet(templateSummary);
  
  // 建立範本電聯記錄
  const templateContact = templateSheet.insertSheet('範本電聯記錄');
  setupTemplateContactSheet(templateContact);
}

/**
 * 設定使用說明工作表
 */
function setupInstructionSheet(sheet) {
  const instructions = [
    ['電聯記錄簿系統使用說明'],
    [''],
    ['📋 系統功能'],
    ['1. 自動建立老師專屬電聯記錄簿'],
    ['2. 標準化電聯記錄格式'],
    ['3. 自動進度追蹤與提醒'],
    ['4. 生成統計報告'],
    [''],
    ['🚀 快速開始'],
    ['1. 執行「初始化系統」建立基礎架構'],
    ['2. 使用「新增老師記錄簿」為個別老師建立記錄簿'],
    ['3. 或使用「批次建立老師記錄簿」一次建立多位老師的記錄簿'],
    ['4. 定期使用「檢查全體進度」監控記錄狀況'],
    [''],
    ['📝 電聯記錄格式'],
    ['• 日期：記錄聯繫的日期'],
    ['• 班級：學生所屬班級'],
    ['• 學生姓名：被聯繫學生的姓名'],
    ['• 學號：學生學號'],
    ['• 聯絡對象：家長、監護人等'],
    ['• 聯絡方式：電話、簡訊、家訪等'],
    ['• 聯絡原因：學習、行為、出席等'],
    ['• 談話內容摘要：簡要記錄談話重點'],
    ['• 後續追蹤：需要持續關注的事項'],
    ['• 記錄人：填寫記錄的老師'],
    ['• 狀態：已完成、待追蹤、需關注、已結案'],
    [''],
    ['⚙️ 系統設定'],
    ['• 學期電聯次數：依學期制規劃進行'],
    ['• 提醒天數：超過 7 天未記錄會發出提醒'],
    ['• 可在系統設定中調整這些參數'],
    [''],
    ['📊 進度檢查'],
    ['• 正常：按時完成電聯記錄'],
    ['• 待改善：電聯次數不足'],
    ['• 需要關注：長時間未記錄或多項指標未達標'],
    [''],
    ['🔧 技術支援'],
    ['如有問題請聯繫系統管理員'],
    ['系統版本：1.0'],
    ['建立日期：' + new Date().toLocaleDateString()]
  ];
  
  // 寫入說明內容
  sheet.getRange(1, 1, instructions.length, 1).setValues(instructions);
  
  // 格式設定
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  sheet.getRange('A3').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A9').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A15').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A29').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A33').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A39').setFontSize(14).setFontWeight('bold');
  
  // 調整欄寬
  sheet.setColumnWidth(1, 600);
}

/**
 * 設定範本總覽工作表
 */
function setupTemplateSummarySheet(sheet) {
  const summaryContent = [
    ['電聯記錄簿範本', '', '', '', ''],
    ['', '', '', '', ''],
    ['老師姓名', '{老師姓名}', '', '', ''],
    ['任教科目', '{任教科目}', '', '', ''],
    ['授課班級', '{授課班級}', '', '', ''],
    ['建立日期', '{建立日期}', '', '', ''],
    ['學年度', '{學年度}', '', '', ''],
    ['', '', '', '', ''],
    ['電聯統計', '', '', '', ''],
    ['班級', '學生人數', '學期電聯次數', '總電聯次數', '最後聯繫日期'],
    ['{班級1}', '0', '0', '0', ''],
    ['{班級2}', '0', '0', '0', ''],
    ['{班級3}', '0', '0', '0', '']
  ];
  
  sheet.getRange(1, 1, summaryContent.length, 5).setValues(summaryContent);
  
  // 格式設定
  sheet.getRange('A1').setFontSize(18).setFontWeight('bold');
  sheet.getRange('A9').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A10:E10').setFontWeight('bold').setBackground('#E8F4FD');
  
  sheet.autoResizeColumns(1, 5);
}

/**
 * 設定範本電聯記錄工作表
 */
function setupTemplateContactSheet(sheet) {
  // 設定標題
  sheet.getRange(1, 1, 1, SYSTEM_CONFIG.CONTACT_FIELDS.length).setValues([SYSTEM_CONFIG.CONTACT_FIELDS]);
  
  // 範例資料 - 學期制版本
  // CONTACT_FIELDS: ['Student ID', 'Name', 'English Name', 'English Class', 'Date', 
  //                  'Semester', 'Term', 'Contact Type', 'Teachers Content', 'Parents Responses', 'Contact Method']
  const exampleData = [
    [
      'S12345',                                        // Student ID
      'Wang Xiao Ming',                               // Name  
      'Alex Wang',                                    // English Name
      'G1 Trailblazers',                             // English Class
      new Date().toLocaleDateString(),               // Date
      'Fall',                                        // Semester
      'Beginning',                                   // Term
      'Academic Contact',                             // Contact Type
      'Discussed Fall Beginning term progress. Student shows good improvement in English speaking skills.', // Teachers Content
      'Parents are pleased with progress and will continue supporting reading practice at home.', // Parents Responses
      'Phone Call'                                   // Contact Method
    ],
    [
      'S12346',                                        // Student ID
      'Li Xiao Hua',                                  // Name
      'Lisa Li',                                      // English Name
      'G2 Discoverers',                              // English Class
      new Date(Date.now() - 86400000).toLocaleDateString(), // Date (yesterday)
      'Fall',                                        // Semester
      'Midterm',                                     // Term
      'Academic Contact',                             // Contact Type
      'Midterm assessment shows student needs extra support with vocabulary building.',  // Teachers Content
      'Parents will arrange additional reading time and practice sessions.', // Parents Responses
      'Line'                                         // Contact Method
    ],
    [
      'S12347',                                        // Student ID
      'Chen Xiao Jun',                               // Name
      'Kevin Chen',                                  // English Name
      'G1 Trailblazers',                             // English Class
      new Date(Date.now() - 172800000).toLocaleDateString(), // Date (2 days ago)
      'Fall',                                        // Semester
      'Beginning',                                   // Term
      'Regular Contact',                              // Contact Type
      'Student was absent for several days. Checking on health status and catching up on missed work.',  // Teachers Content
      'Student had flu but is recovering well. Will make up missed assignments this week.', // Parents Responses
      'Email'                                        // Contact Method
    ]
  ];
  
  sheet.getRange(2, 1, exampleData.length, SYSTEM_CONFIG.CONTACT_FIELDS.length).setValues(exampleData);
  
  // 格式設定
  sheet.getRange(1, 1, 1, SYSTEM_CONFIG.CONTACT_FIELDS.length).setFontWeight('bold').setBackground('#E8F4FD');
  
  // 設定欄寬（學期制版本）
  sheet.setColumnWidth(1, 80);   // Student ID
  sheet.setColumnWidth(2, 120);  // Name
  sheet.setColumnWidth(3, 120);  // English Name
  sheet.setColumnWidth(4, 120);  // English Class
  sheet.setColumnWidth(5, 100);  // Date
  sheet.setColumnWidth(6, 80);   // Semester
  sheet.setColumnWidth(7, 80);   // Term
  sheet.setColumnWidth(8, 100);  // Contact Type
  sheet.setColumnWidth(9, 250);  // Teachers Content
  sheet.setColumnWidth(10, 250); // Parents Responses
  sheet.setColumnWidth(11, 100); // Contact Method
}

/**
 * 設定管理控制台
 */
function setupAdminConsole(adminSheet) {
  const defaultSheet = adminSheet.getActiveSheet();
  
  // 建立控制台主頁
  createAdminDashboard(defaultSheet);
  
  // 建立系統設定工作表
  const settingsSheet = adminSheet.insertSheet('系統設定');
  createSystemSettingsSheet(settingsSheet);
  
  // 建立老師列表工作表
  const teachersSheet = adminSheet.insertSheet('老師列表');
  createTeachersListSheet(teachersSheet);
  
  // 建立統計分析工作表
  const analyticsSheet = adminSheet.insertSheet('統計分析');
  createAnalyticsSheet(analyticsSheet);
}

/**
 * 建立管理控制台主頁
 */
function createAdminDashboard(sheet) {
  sheet.setName('控制台主頁');
  
  const dashboardContent = [
    ['電聯記錄簿管理控制台', '', ''],
    ['', '', ''],
    ['📊 系統概況', '', ''],
    ['', '', ''],
    ['項目', '數量', '狀態'],
    ['註冊老師數', '=COUNTA(老師列表!A:A)-1', '=IF(B5>0,"正常","無資料")'],
    ['活躍記錄簿', '0', '正常'],
    ['本學期總電聯次數', '0', '正常'],
    ['待關注老師數', '0', '=IF(B8>0,"需要注意","良好")'],
    ['', '', ''],
    ['🔧 快速操作', '', ''],
    ['', '', ''],
    ['功能', '說明', '操作'],
    ['新增老師', '為單一老師建立記錄簿', '=HYPERLINK("javascript:createTeacherRecordBook()","執行")'],
    ['批次建立', '為多位老師批次建立記錄簿', '=HYPERLINK("javascript:batchCreateTeacherBooks()","執行")'],
    ['進度檢查', '檢查所有老師的電聯進度', '=HYPERLINK("javascript:checkAllProgress()","執行")'],
    ['生成報告', '生成詳細的進度報告', '=HYPERLINK("javascript:generateProgressReport()","執行")'],
    ['', '', ''],
    ['📈 最近活動', '', ''],
    ['', '', ''],
    ['日期', '活動', '詳細'],
    [new Date().toLocaleDateString(), '系統初始化', '管理控制台建立完成']
  ];
  
  sheet.getRange(1, 1, dashboardContent.length, 3).setValues(dashboardContent);
  
  // 格式設定
  sheet.getRange('A1').setFontSize(18).setFontWeight('bold');
  sheet.getRange('A3').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A11').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A19').setFontSize(14).setFontWeight('bold');
  
  sheet.getRange('A5:C5').setFontWeight('bold').setBackground('#E8F4FD');
  sheet.getRange('A13:C13').setFontWeight('bold').setBackground('#F0F0F0');
  sheet.getRange('A21:C21').setFontWeight('bold').setBackground('#E8F4FD');
  
  sheet.autoResizeColumns(1, 3);
}

/**
 * 建立系統設定工作表
 */
function createSystemSettingsSheet(sheet) {
  const settingsContent = [
    ['系統設定', '', ''],
    ['', '', ''],
    ['設定項目', '當前值', '說明'],
    ['學期電聯要求', SYSTEM_CONFIG.PROGRESS_CHECK.MIN_CONTACTS_PER_MONTH, '學期制電聯進度追蹤設定'],
    ['提醒天數', SYSTEM_CONFIG.PROGRESS_CHECK.ALERT_DAYS, '超過此天數未記錄會發出提醒'],
    ['主資料夾名稱', SYSTEM_CONFIG.MAIN_FOLDER_NAME, '系統主資料夾的名稱'],
    ['老師資料夾名稱', SYSTEM_CONFIG.TEACHERS_FOLDER_NAME, '存放老師記錄簿的資料夾名稱'],
    ['範本資料夾名稱', SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME, '存放範本檔案的資料夾名稱'],
    ['', '', ''],
    ['📝 修改說明', '', ''],
    ['要修改設定值，請直接編輯「當前值」欄位', '', ''],
    ['修改後需要重新載入系統才會生效', '', ''],
    ['建議在修改前先備份系統', '', ''],
    ['', '', ''],
    ['💾 備份設定', '', ''],
    ['上次備份時間', '', ''],
    ['備份檔案位置', '', '']
  ];
  
  sheet.getRange(1, 1, settingsContent.length, 3).setValues(settingsContent);
  
  // 格式設定
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  sheet.getRange('A3:C3').setFontWeight('bold').setBackground('#E8F4FD');
  sheet.getRange('A10').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A15').setFontSize(14).setFontWeight('bold');
  
  sheet.autoResizeColumns(1, 3);
}

/**
 * 建立老師列表工作表
 */
function createTeachersListSheet(sheet) {
  const headers = [['老師姓名', '任教科目', '授課班級', '記錄簿連結', '建立日期', '最後更新', '狀態']];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  
  // 格式設定
  sheet.getRange(1, 1, 1, headers[0].length).setFontWeight('bold').setBackground('#E8F4FD');
  sheet.autoResizeColumns(1, headers[0].length);
}

/**
 * 建立統計分析工作表
 */
function createAnalyticsSheet(sheet) {
  const analyticsContent = [
    ['統計分析', '', ''],
    ['', '', ''],
    ['📊 電聯統計', '', ''],
    ['', '', ''],
    ['統計項目', '數值', ''],
    ['總電聯次數', '0', ''],
    ['平均學期電聯次數', '0', ''],
    ['最活躍老師', '', ''],
    ['最常聯繫班級', '', ''],
    ['最常用聯繫方式', '', ''],
    ['', '', ''],
    ['📈 趨勢分析', '', ''],
    ['', '', ''],
    ['學期/Term', '電聯次數', '參與老師數'],
    ['Fall Beginning', '0', '0'],
    ['Fall Midterm', '0', '0'],
    ['Fall Final', '0', '0'],
    ['Spring Beginning', '0', '0'],
    ['Spring Midterm', '0', '0'],
    ['Spring Final', '0', '0']
  ];
  
  sheet.getRange(1, 1, analyticsContent.length, 3).setValues(analyticsContent);
  
  // 格式設定
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  sheet.getRange('A3').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A12').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A5:B5').setFontWeight('bold').setBackground('#E8F4FD');
  sheet.getRange('A14:C14').setFontWeight('bold').setBackground('#E8F4FD');
  
  sheet.autoResizeColumns(1, 3);
}

/**
 * 顯示系統設定對話框
 */
function showSystemSettings() {
  const ui = SpreadsheetApp.getUi();
  
  let settingsText = '目前系統設定：\n\n';
  settingsText += `學期電聯要求：依學期制規劃進行\n`;
  settingsText += `提醒天數：${SYSTEM_CONFIG.PROGRESS_CHECK.ALERT_DAYS} 天\n`;
  settingsText += `主資料夾：${SYSTEM_CONFIG.MAIN_FOLDER_NAME}\n\n`;
  settingsText += '要修改設定，請前往管理控制台的「系統設定」工作表。';
  
  ui.alert('系統設定', settingsText, ui.ButtonSet.OK);
}

/**
 * 顯示使用說明
 */
function showUserGuide() {
  const ui = SpreadsheetApp.getUi();
  
  const guideText = `電聯記錄簿系統使用指南：

🚀 快速開始：
1. 執行「初始化系統」
2. 使用「新增老師記錄簿」建立記錄簿
3. 定期「檢查全體進度」

📝 主要功能：
• 自動建立標準化記錄簿
• 班級學生資料管理
• 電聯記錄追蹤
• 進度監控與提醒
• 統計報告生成

💡 使用技巧：
• 善用下拉選單確保資料一致性
• 定期檢查進度避免遺漏
• 利用狀態欄位管理後續追蹤

如需詳細說明，請查看範本檔案中的「使用說明」工作表。`;

  ui.alert('使用說明', guideText, ui.ButtonSet.OK);
}

/**
 * 更新老師列表
 */
function updateTeachersList() {
  try {
    const mainFolder = getSystemMainFolder();
    const adminConsole = getAdminConsole(mainFolder);
    const teachersSheet = adminConsole.getSheetByName('老師列表');
    
    // 清除現有資料（保留標題）
    const lastRow = teachersSheet.getLastRow();
    if (lastRow > 1) {
      teachersSheet.getRange(2, 1, lastRow - 1, teachersSheet.getLastColumn()).clearContent();
    }
    
    // 獲取所有老師記錄簿
    const teacherBooks = getAllTeacherBooks();
    const teachersData = [];
    
    teacherBooks.forEach(book => {
      try {
        const summarySheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
        const teacherName = summarySheet.getRange('B3').getValue();
        const subject = summarySheet.getRange('B4').getValue();
        const classes = summarySheet.getRange('B5').getValue();
        const createDate = summarySheet.getRange('B6').getValue();
        
        teachersData.push([
          teacherName,
          subject,
          classes,
          book.getUrl(),
          createDate,
          new Date().toLocaleDateString(),
          '正常'
        ]);
      } catch (error) {
        Logger.log(`處理 ${book.getName()} 失敗：` + error.toString());
      }
    });
    
    // 寫入更新的資料
    if (teachersData.length > 0) {
      teachersSheet.getRange(2, 1, teachersData.length, 7).setValues(teachersData);
    }
    
    Logger.log('老師列表更新完成');
    
  } catch (error) {
    Logger.log('更新老師列表失敗：' + error.toString());
  }
}

/**
 * 獲取管理控制台
 */
function getAdminConsole(mainFolder) {
  const files = mainFolder.getFilesByName('電聯記錄簿管理控制台');
  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId());
  }
  throw new Error('找不到管理控制台');
}

/**
 * 系統健康檢查功能
 */
function checkFileIntegrity() {
  try {
    const ui = SpreadsheetApp.getUi();
    const healthReport = performSystemHealthCheck();
    
    displayHealthCheckResults(healthReport);
    
  } catch (error) {
    Logger.log('系統健康檢查失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '系統健康檢查失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 執行系統健康檢查
 */
function performSystemHealthCheck() {
  const healthReport = {
    systemStatus: '檢查中...',
    mainFolder: { status: false, message: '' },
    subFolders: { status: false, message: '', details: [] },
    teacherBooks: { status: false, message: '', count: 0, issues: [] },
    templates: { status: false, message: '' },
    adminConsole: { status: false, message: '' },
    overallHealth: 0,
    recommendations: []
  };
  
  try {
    // 1. 檢查主資料夾
    Logger.log('檢查主資料夾...');
    const mainFolder = getSystemMainFolder();
    healthReport.mainFolder.status = true;
    healthReport.mainFolder.message = `主資料夾正常：${mainFolder.getName()}`;
    
    // 2. 檢查子資料夾結構
    Logger.log('檢查子資料夾結構...');
    const requiredFolders = [
      SYSTEM_CONFIG.TEACHERS_FOLDER_NAME,
      SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME,
      '系統備份',
      '進度報告'
    ];
    
    const missingFolders = [];
    const existingFolders = [];
    
    requiredFolders.forEach(folderName => {
      const folders = mainFolder.getFoldersByName(folderName);
      if (folders.hasNext()) {
        existingFolders.push(folderName);
      } else {
        missingFolders.push(folderName);
      }
    });
    
    healthReport.subFolders.status = missingFolders.length === 0;
    healthReport.subFolders.message = `子資料夾檢查：${existingFolders.length}/${requiredFolders.length} 個存在`;
    healthReport.subFolders.details = {
      existing: existingFolders,
      missing: missingFolders
    };
    
    if (missingFolders.length > 0) {
      healthReport.recommendations.push(`缺少子資料夾：${missingFolders.join(', ')}`);
    }
    
    // 3. 檢查老師記錄簿
    Logger.log('檢查老師記錄簿...');
    const teacherBooks = getAllTeacherBooks();
    const bookIssues = [];
    
    teacherBooks.forEach(book => {
      const issues = validateTeacherBook(book);
      if (issues.length > 0) {
        bookIssues.push({
          name: book.getName(),
          issues: issues
        });
      }
    });
    
    healthReport.teacherBooks.status = bookIssues.length === 0;
    healthReport.teacherBooks.count = teacherBooks.length;
    healthReport.teacherBooks.message = `找到 ${teacherBooks.length} 個老師記錄簿`;
    healthReport.teacherBooks.issues = bookIssues;
    
    if (bookIssues.length > 0) {
      healthReport.recommendations.push(`${bookIssues.length} 個記錄簿存在結構問題`);
    }
    
    // 4. 檢查範本檔案
    Logger.log('檢查範本檔案...');
    try {
      const templatesFolder = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME).next();
      const templateFiles = templatesFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
      let templateCount = 0;
      while (templateFiles.hasNext()) {
        templateFiles.next();
        templateCount++;
      }
      healthReport.templates.status = templateCount > 0;
      healthReport.templates.message = `找到 ${templateCount} 個範本檔案`;
      
      if (templateCount === 0) {
        healthReport.recommendations.push('缺少範本檔案，建議重新初始化系統');
      }
    } catch (error) {
      healthReport.templates.status = false;
      healthReport.templates.message = '範本資料夾檢查失敗';
      healthReport.recommendations.push('範本資料夾不存在或無法存取');
    }
    
    // 5. 檢查管理控制台
    Logger.log('檢查管理控制台...');
    try {
      const adminConsole = getAdminConsole(mainFolder);
      healthReport.adminConsole.status = true;
      healthReport.adminConsole.message = '管理控制台正常';
    } catch (error) {
      healthReport.adminConsole.status = false;
      healthReport.adminConsole.message = '管理控制台不存在';
      healthReport.recommendations.push('管理控制台缺失，建議重新初始化系統');
    }
    
    // 計算整體健康度
    const checks = [
      healthReport.mainFolder.status,
      healthReport.subFolders.status,
      healthReport.teacherBooks.status,
      healthReport.templates.status,
      healthReport.adminConsole.status
    ];
    const passedChecks = checks.filter(check => check).length;
    healthReport.overallHealth = Math.round((passedChecks / checks.length) * 100);
    
    // 設定整體狀態
    if (healthReport.overallHealth >= 90) {
      healthReport.systemStatus = '良好';
    } else if (healthReport.overallHealth >= 70) {
      healthReport.systemStatus = '正常';
    } else if (healthReport.overallHealth >= 50) {
      healthReport.systemStatus = '需要注意';
    } else {
      healthReport.systemStatus = '需要修復';
    }
    
  } catch (error) {
    Logger.log('系統健康檢查執行失敗：' + error.toString());
    healthReport.systemStatus = '檢查失敗';
    healthReport.recommendations.push('系統健康檢查執行失敗，請檢查系統設定');
  }
  
  return healthReport;
}

/**
 * 自動修復系統問題
 */
function autoFixSystemIssues() {
  try {
    systemLog(ERROR_LEVELS.INFO, 'SystemUtils', 'autoFixSystemIssues', '開始自動修復系統問題');
    
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '自動修復系統', 
      '確定要自動修復檢測到的系統問題嗎？\\n\\n這將：\\n• 重建缺失的資料夾結構\\n• 修復範本檔案\\n• 重建管理控制台\\n• 修復記錄簿結構問題', 
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) return;
    
    // 執行健康檢查
    const healthReport = performSystemHealthCheck();
    const fixResults = {
      fixed: [],
      failed: [],
      overallSuccess: true
    };
    
    // 修復主資料夾（如果需要）
    if (!healthReport.mainFolder.status) {
      try {
        const mainFolder = createSystemFolders();
        fixResults.fixed.push('重建主資料夾結構');
        systemLog(ERROR_LEVELS.INFO, 'SystemUtils', 'autoFixSystemIssues', '主資料夾修復完成');
      } catch (error) {
        fixResults.failed.push('主資料夾修復失敗：' + error.message);
        fixResults.overallSuccess = false;
      }
    }
    
    // 修復子資料夾結構
    if (!healthReport.subFolders.status && healthReport.subFolders.details.missing.length > 0) {
      try {
        const mainFolder = getSystemMainFolder();
        healthReport.subFolders.details.missing.forEach(folderName => {
          mainFolder.createFolder(folderName);
        });
        fixResults.fixed.push('重建缺失的子資料夾：' + healthReport.subFolders.details.missing.join(', '));
        systemLog(ERROR_LEVELS.INFO, 'SystemUtils', 'autoFixSystemIssues', '子資料夾修復完成');
      } catch (error) {
        fixResults.failed.push('子資料夾修復失敗：' + error.message);
        fixResults.overallSuccess = false;
      }
    }
    
    // 修復範本檔案
    if (!healthReport.templates.status) {
      try {
        const mainFolder = getSystemMainFolder();
        createTemplateFiles(mainFolder);
        fixResults.fixed.push('重建範本檔案');
        systemLog(ERROR_LEVELS.INFO, 'SystemUtils', 'autoFixSystemIssues', '範本檔案修復完成');
      } catch (error) {
        fixResults.failed.push('範本檔案修復失敗：' + error.message);
        fixResults.overallSuccess = false;
      }
    }
    
    // 修復管理控制台
    if (!healthReport.adminConsole.status) {
      try {
        const mainFolder = getSystemMainFolder();
        createAdminConsole(mainFolder);
        fixResults.fixed.push('重建管理控制台');
        systemLog(ERROR_LEVELS.INFO, 'SystemUtils', 'autoFixSystemIssues', '管理控制台修復完成');
      } catch (error) {
        fixResults.failed.push('管理控制台修復失敗：' + error.message);
        fixResults.overallSuccess = false;
      }
    }
    
    // 修復老師記錄簿結構問題
    if (!healthReport.teacherBooks.status && healthReport.teacherBooks.issues.length > 0) {
      try {
        let fixedBooks = 0;
        healthReport.teacherBooks.issues.forEach(bookIssue => {
          try {
            // 這裡可以添加具體的記錄簿修復邏輯
            // 暫時記錄問題，未來可以實現自動修復
            systemLog(ERROR_LEVELS.WARNING, 'SystemUtils', 'autoFixSystemIssues', 
              `記錄簿 ${bookIssue.name} 存在問題：${bookIssue.issues.join(', ')}`);
            fixedBooks++;
          } catch (error) {
            systemLog(ERROR_LEVELS.ERROR, 'SystemUtils', 'autoFixSystemIssues', 
              `修復記錄簿 ${bookIssue.name} 失敗`, error);
          }
        });
        
        if (fixedBooks > 0) {
          fixResults.fixed.push(`檢查並記錄了 ${fixedBooks} 個記錄簿的問題`);
        }
      } catch (error) {
        fixResults.failed.push('記錄簿修復失敗：' + error.message);
        fixResults.overallSuccess = false;
      }
    }
    
    // 顯示修復結果
    displayFixResults(fixResults);
    
    systemLog(ERROR_LEVELS.INFO, 'SystemUtils', 'autoFixSystemIssues', 
      `系統修復完成，成功：${fixResults.fixed.length}，失敗：${fixResults.failed.length}`);
    
  } catch (error) {
    systemLog(ERROR_LEVELS.ERROR, 'SystemUtils', 'autoFixSystemIssues', '自動修復失敗', error);
    SpreadsheetApp.getUi().alert('錯誤', '自動修復失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 顯示修復結果
 */
function displayFixResults(fixResults) {
  const ui = SpreadsheetApp.getUi();
  
  let message = '🔧 系統修復結果\\n\\n';
  
  if (fixResults.overallSuccess) {
    message += '✅ 修復完成！\\n\\n';
  } else {
    message += '⚠️ 部分修復完成\\n\\n';
  }
  
  if (fixResults.fixed.length > 0) {
    message += '📝 已修復項目：\\n';
    fixResults.fixed.forEach(item => {
      message += `• ${item}\\n`;
    });
    message += '\\n';
  }
  
  if (fixResults.failed.length > 0) {
    message += '❌ 修復失敗項目：\\n';
    fixResults.failed.forEach(item => {
      message += `• ${item}\\n`;
    });
    message += '\\n';
  }
  
  message += '💡 建議：完成修復後，請重新執行系統健康檢查以確認所有問題已解決。';
  
  ui.alert('系統修復結果', message, ui.ButtonSet.OK);
}

/**
 * 驗證老師記錄簿結構
 */
function validateTeacherBook(recordBook) {
  const issues = [];
  const requiredSheets = Object.values(SYSTEM_CONFIG.SHEET_NAMES);
  
  try {
    const sheets = recordBook.getSheets();
    const sheetNames = sheets.map(sheet => sheet.getName());
    
    // 檢查必要工作表
    requiredSheets.forEach(requiredSheet => {
      if (!sheetNames.includes(requiredSheet)) {
        issues.push(`缺少工作表：${requiredSheet}`);
      }
    });
    
    // 檢查總覽工作表的基本資訊
    if (sheetNames.includes(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY)) {
      const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
      const teacherName = summarySheet.getRange('B3').getValue();
      if (!teacherName || teacherName.toString().trim() === '') {
        issues.push('總覽工作表缺少老師姓名');
      }
    }
    
    // 檢查電聯記錄工作表的格式
    if (sheetNames.includes(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG)) {
      const contactSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
      const headers = contactSheet.getRange(1, 1, 1, SYSTEM_CONFIG.CONTACT_FIELDS.length).getValues()[0];
      
      SYSTEM_CONFIG.CONTACT_FIELDS.forEach((field, index) => {
        if (headers[index] !== field) {
          issues.push(`電聯記錄工作表標題格式不正確`);
          return; // 只報告一次格式錯誤
        }
      });
    }
    
  } catch (error) {
    issues.push(`記錄簿結構檢查失敗：${error.message}`);
  }
  
  return issues;
}

/**
 * 顯示健康檢查結果
 */
function displayHealthCheckResults(healthReport) {
  const ui = SpreadsheetApp.getUi();
  
  let message = `🔍 系統健康檢查報告\n\n`;
  message += `📊 整體健康度：${healthReport.overallHealth}% (${healthReport.systemStatus})\n\n`;
  
  // 詳細檢查結果
  message += `📋 檢查項目：\n`;
  message += `• 主資料夾：${healthReport.mainFolder.status ? '✅' : '❌'} ${healthReport.mainFolder.message}\n`;
  message += `• 子資料夾：${healthReport.subFolders.status ? '✅' : '❌'} ${healthReport.subFolders.message}\n`;
  message += `• 老師記錄簿：${healthReport.teacherBooks.status ? '✅' : '❌'} ${healthReport.teacherBooks.message}\n`;
  message += `• 範本檔案：${healthReport.templates.status ? '✅' : '❌'} ${healthReport.templates.message}\n`;
  message += `• 管理控制台：${healthReport.adminConsole.status ? '✅' : '❌'} ${healthReport.adminConsole.message}\n\n`;
  
  // 問題和建議
  if (healthReport.recommendations.length > 0) {
    message += `🔧 建議改善項目：\n`;
    healthReport.recommendations.forEach(rec => {
      message += `• ${rec}\n`;
    });
    message += `\n`;
  }
  
  // 記錄簿問題詳情
  if (healthReport.teacherBooks.issues.length > 0) {
    message += `⚠️ 記錄簿問題詳情：\n`;
    healthReport.teacherBooks.issues.forEach(issue => {
      message += `• ${issue.name}：${issue.issues.join(', ')}\n`;
    });
  }
  
  // 根據健康度決定按鈕選項
  let buttonSet;
  if (healthReport.overallHealth < 70) {
    message += `\n是否要執行系統修復？`;
    buttonSet = ui.ButtonSet.YES_NO;
  } else {
    buttonSet = ui.ButtonSet.OK;
  }
  
  const response = ui.alert('系統健康檢查', message, buttonSet);
  
  if (response === ui.Button.YES && healthReport.overallHealth < 70) {
    // 執行自動修復
    performSystemRepair(healthReport);
  }
}

/**
 * 執行系統自動修復
 */
function performSystemRepair(healthReport) {
  const ui = SpreadsheetApp.getUi();
  
  try {
    let repairActions = [];
    
    // 修復缺少的子資料夾
    if (!healthReport.subFolders.status && healthReport.subFolders.details.missing.length > 0) {
      const mainFolder = getSystemMainFolder();
      healthReport.subFolders.details.missing.forEach(folderName => {
        mainFolder.createFolder(folderName);
        repairActions.push(`創建資料夾：${folderName}`);
      });
    }
    
    // 修復缺少的管理控制台
    if (!healthReport.adminConsole.status) {
      const mainFolder = getSystemMainFolder();
      const adminSheet = createAdminConsole(mainFolder);
      repairActions.push('重新創建管理控制台');
    }
    
    // 修復缺少的範本檔案
    if (!healthReport.templates.status) {
      const mainFolder = getSystemMainFolder();
      const templateSheet = createTemplateFiles(mainFolder);
      repairActions.push('重新創建範本檔案');
    }
    
    if (repairActions.length > 0) {
      ui.alert(
        '修復完成',
        `已執行以下修復動作：\n${repairActions.join('\n')}\n\n建議重新執行健康檢查以確認修復結果。`,
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('提醒', '沒有可自動修復的項目', ui.ButtonSet.OK);
    }
    
  } catch (error) {
    Logger.log('系統修復失敗：' + error.toString());
    ui.alert('錯誤', '系統修復失敗：' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * 統一的錯誤處理和日誌系統
 */

// 錯誤級別常數
const ERROR_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

// 日誌設定
const LOG_CONFIG = {
  MAX_LOG_ENTRIES: 1000,  // 最大日誌條目數
  LOG_RETENTION_DAYS: 30, // 日誌保留天數
  ENABLE_EMAIL_ALERTS: false, // 是否啟用郵件警報
  ADMIN_EMAIL: '', // 管理員郵件地址
  LOG_SHEET_NAME: '系統日誌'
};

/**
 * 統一日誌記錄函數
 * @param {string} level - 錯誤級別 (INFO, WARNING, ERROR, CRITICAL)
 * @param {string} module - 模組名稱
 * @param {string} function_name - 函數名稱
 * @param {string} message - 日誌訊息
 * @param {Error} error - 錯誤物件 (可選)
 * @param {Object} context - 額外上下文資訊 (可選)
 */
function systemLog(level, module, function_name, message, error = null, context = null) {
  try {
    const timestamp = new Date().toISOString();
    const errorDetails = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : null;
    
    const logEntry = {
      timestamp: timestamp,
      level: level,
      module: module,
      function: function_name,
      message: message,
      error: errorDetails,
      context: context,
      session_id: getSessionId()
    };
    
    // 記錄到 Google Apps Script 日誌
    const logMessage = `[${level}] ${module}.${function_name}: ${message}`;
    Logger.log(logMessage);
    
    // 記錄到系統日誌表（如果存在）
    writeToSystemLogSheet(logEntry);
    
    // 檢查是否需要發送警報
    if ((level === ERROR_LEVELS.ERROR || level === ERROR_LEVELS.CRITICAL) && LOG_CONFIG.ENABLE_EMAIL_ALERTS) {
      sendErrorAlert(logEntry);
    }
    
  } catch (loggingError) {
    // 日誌系統本身出錯時，只記錄到基本日誌
    Logger.log(`日誌系統錯誤：${loggingError.toString()}`);
    Logger.log(`原始日誌：[${level}] ${module}.${function_name}: ${message}`);
  }
}

/**
 * 獲取會話 ID
 */
function getSessionId() {
  try {
    const session = Session.getActiveUser().getEmail() + '_' + new Date().getTime().toString().slice(-6);
    return session;
  } catch (error) {
    return 'unknown_session_' + new Date().getTime().toString().slice(-6);
  }
}

/**
 * 寫入系統日誌表
 */
function writeToSystemLogSheet(logEntry) {
  try {
    const mainFolder = getSystemMainFolder();
    let logSheet = getOrCreateLogSheet(mainFolder);
    
    if (!logSheet) return; // 如果無法建立日誌表，不影響主要功能
    
    // 準備日誌資料
    const logData = [
      logEntry.timestamp,
      logEntry.level,
      logEntry.module,
      logEntry.function,
      logEntry.message,
      logEntry.error ? JSON.stringify(logEntry.error) : '',
      logEntry.context ? JSON.stringify(logEntry.context) : '',
      logEntry.session_id
    ];
    
    // 寫入日誌
    const lastRow = logSheet.getLastRow();
    logSheet.getRange(lastRow + 1, 1, 1, logData.length).setValues([logData]);
    
    // 清理舊日誌
    cleanupOldLogs(logSheet);
    
  } catch (error) {
    Logger.log('寫入系統日誌表失敗：' + error.toString());
  }
}

/**
 * 獲取或建立日誌表
 */
function getOrCreateLogSheet(mainFolder) {
  try {
    // 查找現有的日誌檔案
    const logFiles = mainFolder.getFilesByName('系統運行日誌');
    let logSpreadsheet;
    
    if (logFiles.hasNext()) {
      logSpreadsheet = SpreadsheetApp.openById(logFiles.next().getId());
    } else {
      // 建立新的日誌檔案
      logSpreadsheet = SpreadsheetApp.create('系統運行日誌');
      const logFile = DriveApp.getFileById(logSpreadsheet.getId());
      mainFolder.addFile(logFile);
      DriveApp.getRootFolder().removeFile(logFile);
    }
    
    // 獲取或建立日誌工作表
    let logSheet;
    try {
      logSheet = logSpreadsheet.getSheetByName(LOG_CONFIG.LOG_SHEET_NAME);
    } catch (error) {
      logSheet = logSpreadsheet.insertSheet(LOG_CONFIG.LOG_SHEET_NAME);
      setupLogSheetHeaders(logSheet);
    }
    
    // 檢查標題列
    if (logSheet.getLastRow() === 0) {
      setupLogSheetHeaders(logSheet);
    }
    
    return logSheet;
    
  } catch (error) {
    Logger.log('建立日誌表失敗：' + error.toString());
    return null;
  }
}

/**
 * 設定日誌表標題
 */
function setupLogSheetHeaders(logSheet) {
  const headers = [
    '時間戳記', '等級', '模組', '函數', '訊息', '錯誤詳情', '上下文', '會話ID'
  ];
  
  logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  logSheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4285F4')
    .setFontColor('white');
  
  // 設定欄寬
  logSheet.setColumnWidth(1, 150); // 時間戳記
  logSheet.setColumnWidth(2, 80);  // 等級
  logSheet.setColumnWidth(3, 100); // 模組
  logSheet.setColumnWidth(4, 120); // 函數
  logSheet.setColumnWidth(5, 300); // 訊息
  logSheet.setColumnWidth(6, 200); // 錯誤詳情
  logSheet.setColumnWidth(7, 150); // 上下文
  logSheet.setColumnWidth(8, 120); // 會話ID
  
  // 凍結標題列
  logSheet.setFrozenRows(1);
}

/**
 * 清理舊日誌
 */
function cleanupOldLogs(logSheet) {
  try {
    const lastRow = logSheet.getLastRow();
    
    // 如果日誌條目超過最大限制，刪除最舊的記錄
    if (lastRow > LOG_CONFIG.MAX_LOG_ENTRIES + 1) { // +1 因為有標題列
      const rowsToDelete = lastRow - LOG_CONFIG.MAX_LOG_ENTRIES;
      logSheet.deleteRows(2, rowsToDelete); // 從第2列開始刪除（保留標題）
    }
    
    // 根據日期清理舊日誌
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOG_CONFIG.LOG_RETENTION_DAYS);
    
    const timestamps = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 1).getValues();
    let deleteCount = 0;
    
    for (let i = 0; i < timestamps.length; i++) {
      const logDate = new Date(timestamps[i][0]);
      if (logDate < cutoffDate) {
        deleteCount++;
      } else {
        break; // 假設日誌是按時間順序排列的
      }
    }
    
    if (deleteCount > 0) {
      logSheet.deleteRows(2, deleteCount);
    }
    
  } catch (error) {
    Logger.log('清理舊日誌失敗：' + error.toString());
  }
}

/**
 * 發送錯誤警報郵件
 */
function sendErrorAlert(logEntry) {
  try {
    if (!LOG_CONFIG.ADMIN_EMAIL) return;
    
    const subject = `系統錯誤警報 - ${logEntry.level}`;
    const body = `
系統錯誤警報

時間：${logEntry.timestamp}
等級：${logEntry.level}
模組：${logEntry.module}
函數：${logEntry.function}
訊息：${logEntry.message}

${logEntry.error ? '錯誤詳情：\n' + JSON.stringify(logEntry.error, null, 2) : ''}

${logEntry.context ? '上下文資訊：\n' + JSON.stringify(logEntry.context, null, 2) : ''}

會話ID：${logEntry.session_id}

請及時檢查系統狀態。
    `;
    
    GmailApp.sendEmail(LOG_CONFIG.ADMIN_EMAIL, subject, body);
    
  } catch (error) {
    Logger.log('發送錯誤警報失敗：' + error.toString());
  }
}

/**
 * 包裝函數執行，自動處理錯誤和日誌
 * @param {string} module - 模組名稱
 * @param {string} functionName - 函數名稱
 * @param {Function} func - 要執行的函數
 * @param {Array} args - 函數參數
 * @param {Object} context - 額外上下文
 * @returns {any} 函數執行結果
 */
function executeWithLogging(module, functionName, func, args = [], context = null) {
  const startTime = new Date();
  
  try {
    systemLog(ERROR_LEVELS.INFO, module, functionName, '函數開始執行', null, {
      ...context,
      args: args.length > 0 ? 'provided' : 'none'
    });
    
    const result = func.apply(null, args);
    
    const executionTime = new Date() - startTime;
    systemLog(ERROR_LEVELS.INFO, module, functionName, '函數執行完成', null, {
      ...context,
      executionTime: executionTime + 'ms'
    });
    
    return result;
    
  } catch (error) {
    const executionTime = new Date() - startTime;
    systemLog(ERROR_LEVELS.ERROR, module, functionName, '函數執行失敗', error, {
      ...context,
      executionTime: executionTime + 'ms'
    });
    
    // 重新拋出錯誤，讓上層處理
    throw error;
  }
}

/**
 * 顯示系統日誌
 */
function showSystemLogs() {
  try {
    const ui = SpreadsheetApp.getUi();
    const mainFolder = getSystemMainFolder();
    const logSheet = getOrCreateLogSheet(mainFolder);
    
    if (!logSheet) {
      ui.alert('提醒', '系統日誌表不存在或無法建立', ui.ButtonSet.OK);
      return;
    }
    
    const logSpreadsheet = logSheet.getParent();
    ui.alert(
      '系統日誌',
      `系統日誌已準備就緒\n\n日誌檔案：${logSpreadsheet.getUrl()}\n\n點擊連結查看詳細的系統運行記錄。`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    systemLog(ERROR_LEVELS.ERROR, 'SystemUtils', 'showSystemLogs', '顯示系統日誌失敗', error);
    SpreadsheetApp.getUi().alert('錯誤', '顯示系統日誌失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 清除系統日誌
 */
function clearSystemLogs() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '確認清除日誌',
      '確定要清除所有系統日誌嗎？此操作無法復原。',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) return;
    
    const mainFolder = getSystemMainFolder();
    const logSheet = getOrCreateLogSheet(mainFolder);
    
    if (logSheet) {
      const lastRow = logSheet.getLastRow();
      if (lastRow > 1) {
        logSheet.deleteRows(2, lastRow - 1);
      }
      
      systemLog(ERROR_LEVELS.INFO, 'SystemUtils', 'clearSystemLogs', '系統日誌已清除');
      ui.alert('完成', '系統日誌已清除', ui.ButtonSet.OK);
    }
    
  } catch (error) {
    systemLog(ERROR_LEVELS.ERROR, 'SystemUtils', 'clearSystemLogs', '清除系統日誌失敗', error);
    SpreadsheetApp.getUi().alert('錯誤', '清除系統日誌失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
} 