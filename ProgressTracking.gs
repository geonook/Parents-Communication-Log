/**
 * 進度檢查模組
 * 負責監控老師電聯記錄的完成情況，生成進度報告
 */

/**
 * 檢查全體老師的電聯進度
 */
function checkAllProgress() {
  try {
    // 統一 Web 環境架構 - 移除環境檢查
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
    safeErrorHandler('檢查全體進度', error);
  }
}

/**
 * 生成詳細的進度報告
 */
function generateProgressReport() {
  try {
    // 統一 Web 環境架構 - 移除環境檢查
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
          progress.semesterContacts || 0,  // 使用學期電聯數量
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
 * 檢查單一老師的電聯進度（學期制版本）
 */
function checkTeacherProgress(recordBook) {
  const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
  const contactSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
  const studentSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
  
  if (!summarySheet || !contactSheet || !studentSheet) {
    throw new Error('記錄簿格式不正確，缺少必要工作表');
  }
  
  // 獲取老師基本資訊
  const teacherName = summarySheet.getRange('B3').getValue();
  const classesStr = summarySheet.getRange('B5').getValue();
  const classes = classesStr.split(',').map(c => c.trim());
  
  // 獲取學生資料
  const studentData = studentSheet.getDataRange().getValues();
  const students = studentData.slice(1); // 跳過標題行
  const totalStudents = students.length;
  
  // 分析電聯記錄
  const contactData = contactSheet.getDataRange().getValues();
  const contactHeaders = contactData[0];
  const contacts = contactData.slice(1); // 跳過標題行
  
  // 確定新欄位的索引（向後相容）
  const dateIndex = contactHeaders.findIndex(h => h.toString().toLowerCase().includes('date')) || 4;
  const semesterIndex = contactHeaders.findIndex(h => h.toString().toLowerCase().includes('semester'));
  const termIndex = contactHeaders.findIndex(h => h.toString().toLowerCase().includes('term'));
  const contactTypeIndex = contactHeaders.findIndex(h => h.toString().toLowerCase().includes('contact type'));
  const studentIdIndex = 0; // Student ID 通常在第一欄
  
  // 計算學期進度
  const currentSemester = SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER;
  const currentTerm = SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM;
  
  const semesterProgress = calculateSemesterProgress(contacts, students, {
    dateIndex, semesterIndex, termIndex, contactTypeIndex, studentIdIndex
  });
  
  // 找出最後聯繫日期（僅計算學期電聯）
  const semesterContacts = contacts.filter(row => {
    if (contactTypeIndex >= 0) {
      return row[contactTypeIndex] === SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER;
    }
    return true; // 如果沒有類型欄位，假設都是學期電聯（向後相容）
  });
  
  const lastContactDate = semesterContacts.length > 0 ? 
    Math.max(...semesterContacts.map(row => row[dateIndex] ? new Date(row[dateIndex]).getTime() : 0)) : null;
  
  // 檢查是否需要提醒
  const daysSinceLastContact = lastContactDate ? 
    Math.floor((new Date().getTime() - lastContactDate) / (1000 * 60 * 60 * 24)) : 999;
  
  const needsAlert = daysSinceLastContact > SYSTEM_CONFIG.PROGRESS_CHECK.ALERT_DAYS;
  
  // 計算當前term的完成度
  const currentTermProgress = semesterProgress[currentSemester]?.[currentTerm] || { completed: 0, total: totalStudents };
  const currentTermCompleted = currentTermProgress.completed >= currentTermProgress.total;
  
  // 判斷狀態
  let status = '正常';
  let alertMessage = '';
  
  if (needsAlert) {
    status = '需要關注';
    alertMessage += `已超過 ${SYSTEM_CONFIG.PROGRESS_CHECK.ALERT_DAYS} 天未記錄學期電聯。`;
  }
  
  if (!currentTermCompleted) {
    const remaining = currentTermProgress.total - currentTermProgress.completed;
    if (remaining > currentTermProgress.total * 0.5) {
      status = '需要關注';
    } else if (status === '正常') {
      status = '待改善';
    }
    alertMessage += `${currentSemester} ${currentTerm}：還有 ${remaining} 位學生未電聯。`;
  }
  
  return {
    teacherName: teacherName,
    totalClasses: classes.length,
    totalStudents: totalStudents,
    totalContacts: contacts.length,
    semesterContacts: semesterContacts.length,
    semesterProgress: semesterProgress,
    currentTermProgress: currentTermProgress,
    lastContactDate: lastContactDate ? new Date(lastContactDate).toLocaleDateString() : '無記錄',
    daysSinceLastContact: daysSinceLastContact,
    status: status,
    alertMessage: alertMessage,
    currentTermCompleted: currentTermCompleted,
    needsAlert: needsAlert
  };
}

/**
 * 計算學期進度
 */
function calculateSemesterProgress(contacts, students, fieldIndexes) {
  const progress = {};
  
  // 初始化所有學期和term
  SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.forEach(semester => {
    progress[semester] = {};
    SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.forEach(term => {
      progress[semester][term] = {
        completed: 0,
        total: students.length,
        contactedStudents: new Set()
      };
    });
  });
  
  // 統計實際電聯記錄
  contacts.forEach(contact => {
    const semester = contact[fieldIndexes.semesterIndex] || SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER;
    const term = contact[fieldIndexes.termIndex] || SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM;
    const contactType = contact[fieldIndexes.contactTypeIndex];
    const studentId = contact[fieldIndexes.studentIdIndex];
    
    // 只計算學期電聯
    if (fieldIndexes.contactTypeIndex >= 0 && contactType !== SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER) {
      return;
    }
    
    if (progress[semester] && progress[semester][term] && studentId) {
      progress[semester][term].contactedStudents.add(studentId.toString());
    }
  });
  
  // 計算完成數量
  Object.keys(progress).forEach(semester => {
    Object.keys(progress[semester]).forEach(term => {
      progress[semester][term].completed = progress[semester][term].contactedStudents.size;
    });
  });
  
  return progress;
}

/**
 * 獲取老師的詳細進度資料
 */
function getTeacherDetailProgress(recordBook) {
  const contactSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
  const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
  
  const teacherName = summarySheet.getRange('B3').getValue();
  const contactData = contactSheet.getDataRange().getValues();
  
  // 轉換為詳細記錄格式 - 學期制11欄位格式
  return contactData.slice(1).map(row => [
    teacherName,
    row[0], // Student ID
    row[1], // Name
    row[2], // English Name
    row[3], // English Class
    row[4], // Date
    row[5], // Semester
    row[6], // Term
    row[7], // Contact Type
    row[8], // Teachers Content
    row[9], // Parents Responses
    row[10] // Contact Method
  ]);
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
  const summaryHeaders = [['老師姓名', '授課班級數', '總電聯次數', '學期電聯次數', '最後聯繫日期', '狀態', '提醒訊息']];
  summarySheet.getRange(1, 1, 1, summaryHeaders[0].length).setValues(summaryHeaders);
  
  if (summaryData.length > 0) {
    summarySheet.getRange(2, 1, summaryData.length, summaryHeaders[0].length).setValues(summaryData);
  }
  
  // 建立詳細記錄工作表
  const detailSheet = reportSheet.insertSheet('詳細記錄');
  const detailHeaders = [['Teacher Name', 'Student ID', 'Name', 'English Name', 'English Class', 'Date', 'Semester', 'Term', 'Contact Type', 'Teachers Content', 'Parents Responses', 'Contact Method']];
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
        if (progress.needsAlert || !progress.currentTermCompleted) {
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
/**
 * 顯示進度檢查摘要
 */
function displayProgressSummary(progressResults) {
  if (!progressResults || progressResults.length === 0) {
    SpreadsheetApp.getUi().alert('進度檢查結果', '沒有找到任何老師記錄簿', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  // 統計分析
  const totalTeachers = progressResults.length;
  const needAttention = progressResults.filter(p => p.status === '需要關注').length;
  const needImprovement = progressResults.filter(p => p.status === '待改善').length;
  const normal = progressResults.filter(p => p.status === '正常').length;
  const totalContacts = progressResults.reduce((sum, p) => sum + p.totalContacts, 0);
  const totalSemesterContacts = progressResults.reduce((sum, p) => sum + (p.semesterContacts || 0), 0);
  
  // 建立摘要報告
  let summaryMessage = '🔍 全體老師電聯進度檢查結果\n\n';
  summaryMessage += `📊 總體統計：\n`;
  summaryMessage += `• 老師總數：${totalTeachers} 位\n`;
  summaryMessage += `• 累計電聯記錄：${totalContacts} 筆\n`;
  summaryMessage += `• 學期電聯記錄：${totalSemesterContacts} 筆\n\n`;
  
  summaryMessage += `📈 狀態分布：\n`;
  summaryMessage += `• ✅ 正常：${normal} 位 (${Math.round(normal/totalTeachers*100)}%)\n`;
  summaryMessage += `• ⚠️ 待改善：${needImprovement} 位 (${Math.round(needImprovement/totalTeachers*100)}%)\n`;
  summaryMessage += `• 🚨 需要關注：${needAttention} 位 (${Math.round(needAttention/totalTeachers*100)}%)\n\n`;
  
  // 詳細列表
  if (needAttention > 0 || needImprovement > 0) {
    summaryMessage += `📋 需要關注的老師：\n`;
    progressResults.forEach(progress => {
      if (progress.status !== '正常') {
        summaryMessage += `\n• ${progress.teacherName} (${progress.status})\n`;
        summaryMessage += `  - 總電聯：${progress.totalContacts} 筆\n`;
        summaryMessage += `  - 學期電聯：${progress.semesterContacts || 0} 筆\n`;
        summaryMessage += `  - 最後聯繫：${progress.lastContactDate}\n`;
        if (progress.alertMessage) {
          summaryMessage += `  - 提醒：${progress.alertMessage}\n`;
        }
      }
    });
  }
  
  // 顯示結果
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '進度檢查結果',
    summaryMessage + '\n是否要生成詳細報告？',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    generateDetailedProgressReport(progressResults);
  }
}

/**
 * 生成詳細的進度報告並保存為檔案
 */
function generateDetailedProgressReport(progressResults) {
  try {
    const reportSheet = SpreadsheetApp.create(`電聯進度報告_${new Date().toLocaleDateString()}`);
    const sheet = reportSheet.getActiveSheet();
    sheet.setName('進度報告');
    
    // 設定報告標題
    sheet.getRange('A1').setValue('電聯記錄進度報告');
    sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
    sheet.getRange('A2').setValue(`生成時間：${new Date().toLocaleString()}`);
    
    // 設定表頭
    const headers = [
      '老師姓名', '授課班級數', '總電聯次數', '學期電聯次數', 
      '最後聯繫日期', '距今天數', '狀態', '當前Term完成', '提醒訊息'
    ];
    sheet.getRange(4, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(4, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
    
    // 填入數據
    const data = progressResults.map(progress => [
      progress.teacherName,
      progress.totalClasses,
      progress.totalContacts,
      progress.semesterContacts || 0,
      progress.lastContactDate,
      progress.daysSinceLastContact === 999 ? '無記錄' : progress.daysSinceLastContact,
      progress.status,
      progress.currentTermCompleted ? '是' : '否',
      progress.alertMessage || '無'
    ]);
    
    if (data.length > 0) {
      sheet.getRange(5, 1, data.length, headers.length).setValues(data);
    }
    
    // 條件式格式
    const statusRange = sheet.getRange(5, 7, data.length, 1);
    const normalRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('正常')
      .setBackground('#D4EDDA')
      .setRanges([statusRange])
      .build();
    const improvementRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('待改善')
      .setBackground('#FFF3CD')
      .setRanges([statusRange])
      .build();
    const attentionRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('需要關注')
      .setBackground('#F8D7DA')
      .setRanges([statusRange])
      .build();
    
    sheet.setConditionalFormatRules([normalRule, improvementRule, attentionRule]);
    
    // 調整欄寬
    sheet.autoResizeColumns(1, headers.length);
    
    // 移動到主資料夾
    const mainFolder = getSystemMainFolder();
    const reportFolder = mainFolder.getFoldersByName('進度報告').next();
    const reportFile = DriveApp.getFileById(reportSheet.getId());
    reportFolder.addFile(reportFile);
    DriveApp.getRootFolder().removeFile(reportFile);
    
    SpreadsheetApp.getUi().alert(
      '報告生成完成',
      `詳細進度報告已生成：\n${reportSheet.getUrl()}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('生成詳細報告失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '生成詳細報告失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

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