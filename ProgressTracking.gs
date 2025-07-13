/**
 * 進度檢查模組
 * 負責監控老師電聯記錄的完成情況，生成進度報告
 */

/**
 * 檢查全體老師的電聯進度
 */
function checkAllProgress() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 獲取所有老師的記錄簿
    const teacherBooks = getAllTeacherBooks();
    if (teacherBooks.length === 0) {
      ui.alert('提醒', '系統中沒有找到任何老師記錄簿', ui.ButtonSet.OK);
      return;
    }
    
    // 檢查每個老師的進度
    const progressResults = [];
    
    teacherBooks.forEach(book => {
      try {
        const progress = checkTeacherProgress(book);
        progressResults.push(progress);
      } catch (error) {
        Logger.log(`檢查 ${book.getName()} 進度失敗：` + error.toString());
      }
    });
    
    // 顯示進度報告
    displayProgressSummary(progressResults);
    
  } catch (error) {
    Logger.log('檢查全體進度失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '檢查進度失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 生成詳細的進度報告
 */
function generateProgressReport() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 獲取所有老師的記錄簿
    const teacherBooks = getAllTeacherBooks();
    if (teacherBooks.length === 0) {
      ui.alert('提醒', '系統中沒有找到任何老師記錄簿', ui.ButtonSet.OK);
      return;
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
          progress.thisMonthContacts,
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
    
    ui.alert(
      '報告生成完成！',
      `進度報告已生成：\n${reportSheet.getUrl()}`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('生成進度報告失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '生成報告失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 獲取所有老師的記錄簿
 */
function getAllTeacherBooks() {
  try {
    const mainFolder = getSystemMainFolder();
    const teachersFolder = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME).next();
    
    const teacherBooks = [];
    const teacherFolders = teachersFolder.getFolders();
    
    while (teacherFolders.hasNext()) {
      const folder = teacherFolders.next();
      const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
      
      while (files.hasNext()) {
        const file = files.next();
        if (file.getName().includes('電聯記錄簿')) {
          teacherBooks.push(SpreadsheetApp.openById(file.getId()));
        }
      }
    }
    
    return teacherBooks;
    
  } catch (error) {
    Logger.log('獲取老師記錄簿列表失敗：' + error.toString());
    return [];
  }
}

/**
 * 檢查單一老師的電聯進度
 */
function checkTeacherProgress(recordBook) {
  const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
  const contactSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
  
  if (!summarySheet || !contactSheet) {
    throw new Error('記錄簿格式不正確，缺少必要工作表');
  }
  
  // 獲取老師基本資訊
  const teacherName = summarySheet.getRange('B3').getValue();
  const classesStr = summarySheet.getRange('B5').getValue();
  const classes = classesStr.split(',').map(c => c.trim());
  
  // 分析電聯記錄
  const contactData = contactSheet.getDataRange().getValues();
  const contacts = contactData.slice(1); // 跳過標題行
  
  // 計算統計數據
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  
  // Date 欄位在第5欄 (index 4)
  const thisMonthContacts = contacts.filter(row => {
    if (!row[4]) return false; // 檢查日期欄位是否存在
    const contactDate = new Date(row[4]);
    return contactDate.getMonth() === thisMonth && contactDate.getFullYear() === thisYear;
  });
  
  // 找出最後聯繫日期
  const lastContactDate = contacts.length > 0 ? 
    Math.max(...contacts.map(row => row[4] ? new Date(row[4]).getTime() : 0)) : null;
  
  // 檢查是否需要提醒
  const daysSinceLastContact = lastContactDate ? 
    Math.floor((now.getTime() - lastContactDate) / (1000 * 60 * 60 * 24)) : 999;
  
  const needsAlert = daysSinceLastContact > SYSTEM_CONFIG.PROGRESS_CHECK.ALERT_DAYS;
  const monthlyGoalMet = thisMonthContacts.length >= SYSTEM_CONFIG.PROGRESS_CHECK.MIN_CONTACTS_PER_MONTH;
  
  // 判斷狀態
  let status = '正常';
  let alertMessage = '';
  
  if (needsAlert) {
    status = '需要關注';
    alertMessage += `已超過 ${SYSTEM_CONFIG.PROGRESS_CHECK.ALERT_DAYS} 天未記錄電聯。`;
  }
  
  if (!monthlyGoalMet) {
    status = status === '正常' ? '待改善' : '需要關注';
    alertMessage += `本月電聯次數不足（${thisMonthContacts.length}/${SYSTEM_CONFIG.PROGRESS_CHECK.MIN_CONTACTS_PER_MONTH}）。`;
  }
  
  return {
    teacherName: teacherName,
    totalClasses: classes.length,
    totalContacts: contacts.length,
    thisMonthContacts: thisMonthContacts.length,
    lastContactDate: lastContactDate ? new Date(lastContactDate).toLocaleDateString() : '無記錄',
    daysSinceLastContact: daysSinceLastContact,
    status: status,
    alertMessage: alertMessage,
    monthlyGoalMet: monthlyGoalMet,
    needsAlert: needsAlert
  };
}

/**
 * 獲取老師的詳細進度資料
 */
function getTeacherDetailProgress(recordBook) {
  const contactSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
  const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
  
  const teacherName = summarySheet.getRange('B3').getValue();
  const contactData = contactSheet.getDataRange().getValues();
  
  // 轉換為詳細記錄格式 - 根據用戶的電聯記錄格式
  return contactData.slice(1).map(row => [
    teacherName,
    row[0], // Student ID
    row[1], // Name
    row[2], // English Name
    row[3], // English Class
    row[4], // Date
    row[5], // Teachers Content
    row[6], // Parents Responses
    row[7]  // Contact
  ]);
}

/**
 * 顯示進度摘要
 */
function displayProgressSummary(progressResults) {
  let summary = '電聯記錄進度檢查結果：\n\n';
  
  const normalCount = progressResults.filter(p => p.status === '正常').length;
  const needImprovementCount = progressResults.filter(p => p.status === '待改善').length;
  const needAttentionCount = progressResults.filter(p => p.status === '需要關注').length;
  
  summary += `📊 總體統計：\n`;
  summary += `正常：${normalCount} 位老師\n`;
  summary += `待改善：${needImprovementCount} 位老師\n`;
  summary += `需要關注：${needAttentionCount} 位老師\n\n`;
  
  if (needAttentionCount > 0) {
    summary += `⚠️ 需要關注的老師：\n`;
    progressResults.filter(p => p.status === '需要關注').forEach(p => {
      summary += `• ${p.teacherName}：${p.alertMessage}\n`;
    });
    summary += '\n';
  }
  
  if (needImprovementCount > 0) {
    summary += `📝 待改善的老師：\n`;
    progressResults.filter(p => p.status === '待改善').forEach(p => {
      summary += `• ${p.teacherName}：${p.alertMessage}\n`;
    });
  }
  
  SpreadsheetApp.getUi().alert('進度檢查結果', summary, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * 建立進度報告工作表
 */
function createProgressReportSheet() {
  const mainFolder = getSystemMainFolder();
  const reportsFolder = mainFolder.getFoldersByName('進度報告').next();
  
  const reportName = `電聯進度報告_${new Date().toLocaleDateString().replace(/\//g, '-')}`;
  const reportSheet = SpreadsheetApp.create(reportName);
  const reportFile = DriveApp.getFileById(reportSheet.getId());
  
  // 移動到報告資料夾
  reportsFolder.addFile(reportFile);
  DriveApp.getRootFolder().removeFile(reportFile);
  
  return reportSheet;
}

/**
 * 寫入進度報告資料
 */
function writeProgressReportData(reportSheet, summaryData, detailData) {
  // 建立摘要工作表
  const summarySheet = reportSheet.getActiveSheet();
  summarySheet.setName('進度摘要');
  
  // 寫入摘要資料
  const summaryHeaders = [['老師姓名', '授課班級數', '總電聯次數', '本月電聯次數', '最後聯繫日期', '狀態', '提醒訊息']];
  summarySheet.getRange(1, 1, 1, summaryHeaders[0].length).setValues(summaryHeaders);
  
  if (summaryData.length > 0) {
    summarySheet.getRange(2, 1, summaryData.length, summaryHeaders[0].length).setValues(summaryData);
  }
  
  // 建立詳細記錄工作表
  const detailSheet = reportSheet.insertSheet('詳細記錄');
  const detailHeaders = [['Teacher Name', 'Student ID', 'Name', 'English Name', 'English Class', 'Date', 'Teachers Content', 'Parents Responses', 'Contact']];
  detailSheet.getRange(1, 1, 1, detailHeaders[0].length).setValues(detailHeaders);
  
  if (detailData.length > 0) {
    detailSheet.getRange(2, 1, detailData.length, detailHeaders[0].length).setValues(detailData);
  }
  
  // 格式設定
  [summarySheet, detailSheet].forEach(sheet => {
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold').setBackground('#E8F4FD');
    sheet.autoResizeColumns(1, sheet.getLastColumn());
  });
  
  // 新增統計圖表
  addProgressCharts(summarySheet, summaryData);
}

/**
 * 新增進度統計圖表
 */
function addProgressCharts(sheet, summaryData) {
  if (summaryData.length === 0) return;
  
  // 統計狀態分布
  const statusCount = {};
  summaryData.forEach(row => {
    const status = row[5]; // 狀態欄位
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  
  // 建立狀態統計資料
  const chartData = [['狀態', '人數']];
  Object.keys(statusCount).forEach(status => {
    chartData.push([status, statusCount[status]]);
  });
  
  // 寫入圖表資料
  const chartRange = sheet.getRange(summaryData.length + 5, 1, chartData.length, 2);
  chartRange.setValues(chartData);
  
  // 建立圓餅圖
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(chartRange)
    .setPosition(summaryData.length + 5, 4, 0, 0)
    .setOption('title', '老師電聯進度狀態分布')
    .setOption('width', 400)
    .setOption('height', 300)
    .build();
  
  sheet.insertChart(chart);
}

/**
 * 自動進度檢查（可設定為定時觸發）
 */
function autoProgressCheck() {
  try {
    const teacherBooks = getAllTeacherBooks();
    const alertTeachers = [];
    
    teacherBooks.forEach(book => {
      try {
        const progress = checkTeacherProgress(book);
        if (progress.needsAlert || !progress.monthlyGoalMet) {
          alertTeachers.push(progress);
        }
      } catch (error) {
        Logger.log(`自動檢查 ${book.getName()} 失敗：` + error.toString());
      }
    });
    
    // 如果有需要提醒的老師，發送通知
    if (alertTeachers.length > 0) {
      sendProgressAlert(alertTeachers);
    }
    
    Logger.log(`自動進度檢查完成，發現 ${alertTeachers.length} 位老師需要關注`);
    
  } catch (error) {
    Logger.log('自動進度檢查失敗：' + error.toString());
  }
}

/**
 * 發送進度提醒
 */
function sendProgressAlert(alertTeachers) {
  // 這裡可以整合 Gmail API 或其他通知方式
  let alertMessage = '電聯記錄提醒通知：\n\n';
  
  alertTeachers.forEach(teacher => {
    alertMessage += `${teacher.teacherName}：${teacher.alertMessage}\n`;
  });
  
  Logger.log('進度提醒：' + alertMessage);
  
  // 可以在這裡添加實際的通知功能，例如：
  // GmailApp.sendEmail(recipientEmail, '電聯記錄提醒', alertMessage);
} 