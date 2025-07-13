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
    ['• 每月最少電聯次數：預設為 2 次'],
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
    ['班級', '學生人數', '本月電聯次數', '總電聯次數', '最後聯繫日期'],
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
  
  // 範例資料 - 根據用戶格式
  const exampleData = [
    [
      'S12345',                                        // Student ID
      'Wang Xiao Ming',                               // Name  
      'Alex Wang',                                    // English Name
      'G1 Trailblazers',                             // English Class
      new Date().toLocaleDateString(),               // Date
      'Discussed math performance and homework completion. Student needs more practice with basic calculations.', // Teachers Content
      'Parents agreed to supervise homework time at home. Will check progress next week.', // Parents Responses
      'Phone Call'                                   // Contact
    ],
    [
      'S12346',                                        // Student ID
      'Li Xiao Hua',                                  // Name
      'Lisa Li',                                      // English Name
      'G2 Discoverers',                              // English Class
      new Date(Date.now() - 86400000).toLocaleDateString(), // Date (yesterday)
      'Student has been late for class multiple times. Discussed punctuality and time management.',  // Teachers Content
      'Parents explained family situation and promised to ensure student arrives on time.', // Parents Responses
      'Home Visit'                                   // Contact
    ]
  ];
  
  sheet.getRange(2, 1, exampleData.length, SYSTEM_CONFIG.CONTACT_FIELDS.length).setValues(exampleData);
  
  // 格式設定
  sheet.getRange(1, 1, 1, SYSTEM_CONFIG.CONTACT_FIELDS.length).setFontWeight('bold').setBackground('#E8F4FD');
  
  // 設定欄寬
  sheet.setColumnWidth(1, 80);  // Student ID
  sheet.setColumnWidth(2, 120); // Name
  sheet.setColumnWidth(3, 120); // English Name
  sheet.setColumnWidth(4, 120); // English Class
  sheet.setColumnWidth(5, 100); // Date
  sheet.setColumnWidth(6, 300); // Teachers Content
  sheet.setColumnWidth(7, 300); // Parents Responses
  sheet.setColumnWidth(8, 100); // Contact
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
    ['本月總電聯次數', '0', '正常'],
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
    ['每月最少電聯次數', SYSTEM_CONFIG.PROGRESS_CHECK.MIN_CONTACTS_PER_MONTH, '老師每月應完成的最少電聯次數'],
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
    ['平均每月電聯次數', '0', ''],
    ['最活躍老師', '', ''],
    ['最常聯繫班級', '', ''],
    ['最常用聯繫方式', '', ''],
    ['', '', ''],
    ['📈 趨勢分析', '', ''],
    ['', '', ''],
    ['月份', '電聯次數', '參與老師數'],
    ['1月', '0', '0'],
    ['2月', '0', '0'],
    ['3月', '0', '0'],
    ['4月', '0', '0'],
    ['5月', '0', '0'],
    ['6月', '0', '0'],
    ['7月', '0', '0'],
    ['8月', '0', '0'],
    ['9月', '0', '0'],
    ['10月', '0', '0'],
    ['11月', '0', '0'],
    ['12月', '0', '0']
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
  settingsText += `每月最少電聯次數：${SYSTEM_CONFIG.PROGRESS_CHECK.MIN_CONTACTS_PER_MONTH} 次\n`;
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