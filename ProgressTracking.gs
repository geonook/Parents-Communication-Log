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
 * 檢查單一老師的電聯進度（學期制版本，支援轉班學生）
 */
function checkTeacherProgress(recordBook) {
  const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
  const contactSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
  const studentSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
  
  if (!summarySheet || !contactSheet || !studentSheet) {
    throw new Error('記錄簿格式不正確，缺少必要工作表');
  }
  
  const teacherName = summarySheet.getRange('B3').getValue();
  Logger.log(`🔍 檢查老師 ${teacherName} 的電聯進度...`);
  
  // 獲取老師基本資訊
  const classesStr = summarySheet.getRange('B5').getValue();
  const classes = classesStr.split(',').map(c => c.trim());
  
  // 獲取學生資料（包含轉班學生）
  const studentData = studentSheet.getDataRange().getValues();
  const students = studentData.slice(1); // 跳過標題行
  const totalStudents = students.length;
  
  Logger.log(`📅 學生總數：${totalStudents}位（包含原在學生和轉班學生）`);
  
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
  
  // 📊 計算學期進度（支援轉班學生完整6記錄框架）
  const currentSemester = SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER;
  const currentTerm = SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM;
  
  Logger.log(`📅 當前時段：${currentSemester} ${currentTerm}`);
  
  const semesterProgress = calculateSemesterProgress(contacts, students, {
    dateIndex, semesterIndex, termIndex, contactTypeIndex, studentIdIndex
  });
  
  // 📞 找出最後聯繫日期（僅計算學期電聯，使用新標準：4個關鍵欄位）
  const semesterContacts = contacts.filter(row => {
    // 檢查是否為學期電聯類型
    if (contactTypeIndex >= 0 && row[contactTypeIndex] !== SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER) {
      return false;
    }
    
    // 新標準：檢查四個關鍵欄位是否都已填寫
    const date = row[dateIndex];
    const teachersContent = row[8]; // Teachers Content 欄位
    const parentsResponses = row[9]; // Parents Responses 欄位
    const contactMethod = row[10]; // Contact Method 欄位
    
    return date && 
           teachersContent && 
           parentsResponses && 
           contactMethod && 
           date.toString().trim() !== '' &&
           teachersContent.toString().trim() !== '' &&
           parentsResponses.toString().trim() !== '' &&
           contactMethod.toString().trim() !== '';
  });
  
  Logger.log(`📞 已完成學期電聯記錄：${semesterContacts.length}筆`);
  
  const lastContactDate = semesterContacts.length > 0 ? 
    Math.max(...semesterContacts.map(row => row[dateIndex] ? new Date(row[dateIndex]).getTime() : 0)) : null;
  
  // 檢查是否需要提醒
  const daysSinceLastContact = lastContactDate ? 
    Math.floor((new Date().getTime() - lastContactDate) / (1000 * 60 * 60 * 24)) : 999;
  
  const needsAlert = daysSinceLastContact > SYSTEM_CONFIG.PROGRESS_CHECK.ALERT_DAYS;
  
  // 🎯 計算當前term的完成度（基於實際記錄數量）
  const currentTermProgress = semesterProgress[currentSemester]?.[currentTerm] || { 
    completed: 0, 
    total: 0, // 將根據實際記錄數量計算
    scheduledStudents: new Set()
  };
  
  const currentTermCompleted = currentTermProgress.total > 0 ? 
    currentTermProgress.completed >= currentTermProgress.total : true;
  
  Logger.log(`🎯 ${currentSemester} ${currentTerm} 進度：${currentTermProgress.completed}/${currentTermProgress.total} → 完成狀態: ${currentTermCompleted ? '✅' : '❌'}`);
  
  // 判斷狀態
  let status = '正常';
  let alertMessage = '';
  
  if (needsAlert) {
    status = '需要關注';
    alertMessage += `已超過 ${SYSTEM_CONFIG.PROGRESS_CHECK.ALERT_DAYS} 天未記錄學期電聯。`;
  }
  
  // 📊 根據實際進度情況調整狀態判斷
  if (!currentTermCompleted && currentTermProgress.total > 0) {
    const remaining = currentTermProgress.total - currentTermProgress.completed;
    const completionRate = currentTermProgress.completed / currentTermProgress.total;
    
    if (completionRate < 0.5) {
      status = '需要關注';
    } else if (status === '正常') {
      status = '待改善';
    }
    
    alertMessage += `${currentSemester} ${currentTerm}：還有 ${remaining} 筆記錄未完成電聯（完成率: ${Math.round(completionRate*100)}%）。`;
    
    Logger.log(`⚠️ 進度提醒：${alertMessage}`);
  } else if (currentTermProgress.total === 0) {
    Logger.log(`🔄 ${currentSemester} ${currentTerm} 無學期電聯記錄（可能未進入該時段或無學生）`);
  }
  
  const result = {
    teacherName: teacherName,
    totalClasses: classes.length,
    totalStudents: totalStudents,
    totalContacts: contacts.length,
    semesterContacts: semesterContacts.length, // 使用新標準計算的學期電聯數量
    totalScheduledRecords: Object.values(semesterProgress).reduce((sum, semester) => 
      sum + Object.values(semester).reduce((termSum, term) => termSum + term.total, 0), 0), // 總預定記錄數
    totalCompletedRecords: Object.values(semesterProgress).reduce((sum, semester) => 
      sum + Object.values(semester).reduce((termSum, term) => termSum + term.completed, 0), 0), // 總完成記錄數
    semesterProgress: semesterProgress,
    currentTermProgress: currentTermProgress,
    lastContactDate: lastContactDate ? new Date(lastContactDate).toLocaleDateString() : '無記錄',
    daysSinceLastContact: daysSinceLastContact,
    status: status,
    alertMessage: alertMessage,
    currentTermCompleted: currentTermCompleted,
    needsAlert: needsAlert,
    // 📊 轉班學生支援狀態
    hasTransferredStudents: Object.values(semesterProgress).some(semester => 
      Object.values(semester).some(term => term.total > totalStudents / 6)), // 假設每個學生6筆記錄
    overallCompletionRate: (() => {
      const totalScheduled = Object.values(semesterProgress).reduce((sum, semester) => 
        sum + Object.values(semester).reduce((termSum, term) => termSum + term.total, 0), 0);
      const totalCompleted = Object.values(semesterProgress).reduce((sum, semester) => 
        sum + Object.values(semester).reduce((termSum, term) => termSum + term.completed, 0), 0);
      return totalScheduled > 0 ? Math.round(totalCompleted / totalScheduled * 100) : 0;
    })()
  };
  
  Logger.log(`✅ 老師 ${teacherName} 進度檢查完成 - 狀態: ${status}, 整體完成率: ${result.overallCompletionRate}%`);
  
  return result;
}

/**
 * 計算學期進度（支援轉班學生完整6記錄框架）
 */
function calculateSemesterProgress(contacts, students, fieldIndexes) {
  // 增強欄位映射（為新標準增加必要欄位）
  if (!fieldIndexes.teachersContentIndex) fieldIndexes.teachersContentIndex = 8;
  if (!fieldIndexes.parentsResponsesIndex) fieldIndexes.parentsResponsesIndex = 9;
  if (!fieldIndexes.contactMethodIndex) fieldIndexes.contactMethodIndex = 10;
  if (!fieldIndexes.dateIndex) fieldIndexes.dateIndex = 4;
  const progress = {};
  
  Logger.log(`📊 計算學期進度：${contacts.length}筆聯繫記錄，${students.length}位學生`);
  
  // 🎯 步驟1：分析實際的Scheduled Contact記錄分佈
  // 計算每個學期/term組合實際應該有多少學生記錄
  const scheduledContactDistribution = {};
  
  contacts.forEach(contact => {
    const contactType = contact[fieldIndexes.contactTypeIndex];

    // 只分析Scheduled Contact記錄
    if (fieldIndexes.contactTypeIndex >= 0 && contactType === SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER) {
      const semester = contact[fieldIndexes.semesterIndex] || SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER;
      const term = contact[fieldIndexes.termIndex] || SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM;
      const studentId = contact[fieldIndexes.studentIdIndex];
      
      if (studentId) {
        const key = `${semester}-${term}`;
        if (!scheduledContactDistribution[key]) {
          scheduledContactDistribution[key] = new Set();
        }
        scheduledContactDistribution[key].add(studentId.toString());
      }
    }
  });
  
  Logger.log(`🔍 Scheduled Contact 記錄分佈：`, Object.keys(scheduledContactDistribution).map(key => 
    `${key}: ${scheduledContactDistribution[key].size}位學生`
  ).join(', '));
  
  // 🎯 步驟2：初始化進度追蹤（基於實際記錄分佈）
  SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.forEach(semester => {
    progress[semester] = {};
    SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.forEach(term => {
      const key = `${semester}-${term}`;
      const expectedStudents = scheduledContactDistribution[key] ? scheduledContactDistribution[key].size : 0;
      
      progress[semester][term] = {
        completed: 0,
        total: expectedStudents, // 🎯 修正：基於實際Scheduled Contact記錄數量
        contactedStudents: new Set(),
        scheduledStudents: scheduledContactDistribution[key] || new Set()
      };
      
      Logger.log(`📋 ${semester} ${term}：期望 ${expectedStudents} 位學生記錄`);
    });
  });
  
  // 🎯 步驟3：統計實際完成電聯記錄（使用新標準：4個關鍵欄位）
  let totalScheduledContacts = 0;
  let totalCompletedContacts = 0;
  
  contacts.forEach(contact => {
    const semester = contact[fieldIndexes.semesterIndex] || SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER;
    const term = contact[fieldIndexes.termIndex] || SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM;
    const contactType = contact[fieldIndexes.contactTypeIndex];
    const studentId = contact[fieldIndexes.studentIdIndex];
    
    // 只計算學期電聯（Scheduled Contact）
    if (fieldIndexes.contactTypeIndex >= 0 && contactType !== SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER) {
      return;
    }
    
    totalScheduledContacts++;
    
    // 新標準：檢查四個關鍵欄位是否都已填寫（Date, Teachers Content, Parents Responses, Contact Method）
    const date = contact[fieldIndexes.dateIndex] || contact[4]; // Date 欄位
    const teachersContent = contact[fieldIndexes.teachersContentIndex] || contact[8]; // Teachers Content 欄位
    const parentsResponses = contact[fieldIndexes.parentsResponsesIndex] || contact[9]; // Parents Responses 欄位
    const contactMethod = contact[fieldIndexes.contactMethodIndex] || contact[10]; // Contact Method 欄位
    
    // 只有四個關鍵欄位都已填寫的才算「已完成電聯」
    const isCompleted = date && 
                       teachersContent && 
                       parentsResponses && 
                       contactMethod && 
                       date.toString().trim() !== '' &&
                       teachersContent.toString().trim() !== '' &&
                       parentsResponses.toString().trim() !== '' &&
                       contactMethod.toString().trim() !== '';
    
    if (isCompleted) {
      totalCompletedContacts++;
      
      // 記錄到對應的學期/term統計中
      if (progress[semester] && progress[semester][term] && studentId) {
        progress[semester][term].contactedStudents.add(studentId.toString());
      }
    }
  });
  
  Logger.log(`📈 統計完成：總Scheduled Contact記錄 ${totalScheduledContacts}筆，已完成 ${totalCompletedContacts}筆 (${Math.round(totalCompletedContacts/totalScheduledContacts*100)}%)`);
  
  // 🎯 步驟4：計算完成數量和生成詳細統計
  let overallCompleted = 0;
  let overallTotal = 0;
  
  Object.keys(progress).forEach(semester => {
    Object.keys(progress[semester]).forEach(term => {
      const termProgress = progress[semester][term];
      termProgress.completed = termProgress.contactedStudents.size;
      
      overallCompleted += termProgress.completed;
      overallTotal += termProgress.total;
      
      // 計算完成率
      const completionRate = termProgress.total > 0 ? 
        Math.round(termProgress.completed / termProgress.total * 100) : 0;
      
      Logger.log(`📊 ${semester} ${term}: ${termProgress.completed}/${termProgress.total} (${completionRate}%)`);
      
      // 🎯 轉班學生驗證：檢查該時段是否有轉班學生的完整記錄
      if (termProgress.total > students.length) {
        Logger.log(`🔄 檢測到轉班學生記錄：${semester} ${term} 有 ${termProgress.total} 筆記錄（超過現有學生數 ${students.length}）`);
      }
    });
  });
  
  const overallCompletionRate = overallTotal > 0 ? 
    Math.round(overallCompleted / overallTotal * 100) : 0;
  
  Logger.log(`🎯 整體進度：${overallCompleted}/${overallTotal} (${overallCompletionRate}%) - 包含所有學生（含轉班）的完整6記錄框架`);
  
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
  
  const reportName = `電聯進度報告_${formatDateTimeForFilename()}`;
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
  const summaryHeaders = [['老師姓名', '授課班級數', '總電聯次數', '定期電聯次數', '最後聯繫日期', '狀態', '提醒訊息']];
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
    
    Logger.log(`自動進度檢查完成，發現 ${alertTeachers.length} 位老師需要關注（支援轉班學生框架）`);
    
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
  
  // 📊 統計分析（增強轉班學生支援）
  const totalTeachers = progressResults.length;
  const needAttention = progressResults.filter(p => p.status === '需要關注').length;
  const needImprovement = progressResults.filter(p => p.status === '待改善').length;
  const normal = progressResults.filter(p => p.status === '正常').length;
  const totalContacts = progressResults.reduce((sum, p) => sum + p.totalContacts, 0);
  const totalSemesterContacts = progressResults.reduce((sum, p) => sum + (p.semesterContacts || 0), 0);
  
  // 🔄 轉班學生支援統計
  const teachersWithTransfers = progressResults.filter(p => p.hasTransferredStudents).length;
  const totalScheduledRecords = progressResults.reduce((sum, p) => sum + (p.totalScheduledRecords || 0), 0);
  const totalCompletedRecords = progressResults.reduce((sum, p) => sum + (p.totalCompletedRecords || 0), 0);
  const overallSystemCompletion = totalScheduledRecords > 0 ? 
    Math.round(totalCompletedRecords / totalScheduledRecords * 100) : 0;
  
  // 📄 建立增強版摘要報告（支援轉班學生）
  let summaryMessage = '🔍 全體老師電聯進度檢查結果\n\n';
  summaryMessage += `📊 總體統計：\n`;
  summaryMessage += `• 老師總數：${totalTeachers} 位\n`;
  summaryMessage += `• 累計電聯記錄：${totalContacts} 筆\n`;
  summaryMessage += `• 學期電聯記錄：${totalSemesterContacts} 筆\n`;
  
  if (teachersWithTransfers > 0) {
    summaryMessage += `\n🔄 轉班學生支援統計：\n`;
    summaryMessage += `• 有轉班學生的老師：${teachersWithTransfers} 位\n`;
    summaryMessage += `• 總預定記錄數：${totalScheduledRecords} 筆\n`;
    summaryMessage += `• 總完成記錄數：${totalCompletedRecords} 筆\n`;
    summaryMessage += `• 系統整體完成率：${overallSystemCompletion}%\n`;
  }
  
  summaryMessage += '\n';
  
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
        
        // 🔄 轉班學生支援狀態
        if (progress.hasTransferredStudents) {
          summaryMessage += `  - 🔄 包含轉班學生（完整框架）\n`;
        }
        if (progress.overallCompletionRate !== undefined) {
          summaryMessage += `  - 整體完成率：${progress.overallCompletionRate}%\n`;
        }
        
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
    const reportSheet = SpreadsheetApp.create(`電聯進度報告_${formatDateTimeForFilename()}`);
    const sheet = reportSheet.getActiveSheet();
    sheet.setName('進度報告');
    
    // 設定報告標題
    sheet.getRange('A1').setValue('電聯記錄進度報告');
    sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
    sheet.getRange('A2').setValue(`生成時間：${new Date().toLocaleString()}`);
    
    // 設定表頭
    const headers = [
      '老師姓名', '授課班級數', '總電聯次數', '定期電聯次數', 
      '最後聯繫日期', '距今天數', '狀態', '當前Term完成', 
      '整體完成率', '轉班學生', '提醒訊息' // 新增欄位
    ];
    sheet.getRange(4, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(4, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
    
    // 填入數據（增強轉班學生支援資訊）
    const data = progressResults.map(progress => [
      progress.teacherName,
      progress.totalClasses,
      progress.totalContacts,
      progress.semesterContacts || 0,
      progress.lastContactDate,
      progress.daysSinceLastContact === 999 ? '無記錄' : progress.daysSinceLastContact,
      progress.status,
      progress.currentTermCompleted ? '是' : '否',
      progress.overallCompletionRate !== undefined ? `${progress.overallCompletionRate}%` : '未知', // 整體完成率
      progress.hasTransferredStudents ? '是' : '否', // 轉班學生
      progress.alertMessage || '無'
    ]);
    
    if (data.length > 0) {
      sheet.getRange(5, 1, data.length, headers.length).setValues(data);
      
      // 🎨 轉班學生狀態高光顯示
      const transferColumnIndex = 10; // '轉班學生' 欄位的索引
      const transferRange = sheet.getRange(5, transferColumnIndex, data.length, 1);
      const transferHighlightRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('是')
        .setBackground('#E1F5FE') // 淺藍色背景
        .setFontColor('#01579B') // 深藍色字體
        .setRanges([transferRange])
        .build();
      
      const existingRules = sheet.getConditionalFormatRules();
      sheet.setConditionalFormatRules([...existingRules, transferHighlightRule]);
    }
    
    // 🎨 增強條件式格式（含狀態和轉班學生顯示）
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
    
    // 📊 完成率顯示格式
    const completionRange = sheet.getRange(5, 9, data.length, 1); // '整體完成率' 欄位
    const highCompletionRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(80)
      .setBackground('#C8E6C9') // 綠色
      .setRanges([completionRange])
      .build();
    const mediumCompletionRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(50, 79)
      .setBackground('#FFF9C4') // 黃色
      .setRanges([completionRange])
      .build();
    const lowCompletionRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(50)
      .setBackground('#FFCDD2') // 紅色
      .setRanges([completionRange])
      .build();
    
    sheet.setConditionalFormatRules([
      normalRule, improvementRule, attentionRule,
      highCompletionRule, mediumCompletionRule, lowCompletionRule
    ]);
    
    // 調整欄寬和美化格式
    sheet.autoResizeColumns(1, headers.length);
    
    // 新增系統統計摘要（在表格下方）
    const summaryStartRow = data.length + 7;
    sheet.getRange(summaryStartRow, 1).setValue('📊 系統統計摘要');
    sheet.getRange(summaryStartRow, 1).setFontSize(14).setFontWeight('bold');
    
    const systemStats = [
      [`總老師數: ${progressResults.length}位`],
      [`累計電聯記錄: ${progressResults.reduce((sum, p) => sum + p.totalContacts, 0)}筆`],
      [`學期電聯記錄: ${progressResults.reduce((sum, p) => sum + (p.semesterContacts || 0), 0)}筆`],
      [`有轉班學生的老師: ${progressResults.filter(p => p.hasTransferredStudents).length}位`],
      [`系統整體完成率: ${progressResults.reduce((sum, p) => sum + (p.totalScheduledRecords || 0), 0) > 0 ? Math.round(progressResults.reduce((sum, p) => sum + (p.totalCompletedRecords || 0), 0) / progressResults.reduce((sum, p) => sum + (p.totalScheduledRecords || 0), 0) * 100) : 0}%`]
    ];
    
    sheet.getRange(summaryStartRow + 1, 1, systemStats.length, 1).setValues(systemStats);
    sheet.getRange(summaryStartRow + 1, 1, systemStats.length, 1).setBackground('#F5F5F5');
    
    // 移動到主資料夾
    const mainFolder = getSystemMainFolder();
    const reportFolder = mainFolder.getFoldersByName('進度報告').next();
    const reportFile = DriveApp.getFileById(reportSheet.getId());
    reportFolder.addFile(reportFile);
    DriveApp.getRootFolder().removeFile(reportFile);
    
    SpreadsheetApp.getUi().alert(
      '報告生成完成 🎆',
      `詳細進度報告已生成：\n${reportSheet.getUrl()}\n\n🔄 支援轉班學生完整6記錄框架\n📊 系統整體完成率: ${progressResults.reduce((sum, p) => sum + (p.totalScheduledRecords || 0), 0) > 0 ? Math.round(progressResults.reduce((sum, p) => sum + (p.totalCompletedRecords || 0), 0) / progressResults.reduce((sum, p) => sum + (p.totalScheduledRecords || 0), 0) * 100) : 0}%`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('生成詳細報告失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '生成詳細報告失敗（含轉班學生支援）：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function sendProgressAlert(alertTeachers) {
  // 這裡可以整合 Gmail API 或其他通知方式
  let alertMessage = '電聯記錄提醒通知（支援轉班學生框架）：\n\n';
  
  alertTeachers.forEach(teacher => {
    alertMessage += `${teacher.teacherName}：${teacher.alertMessage}\n`;
    if (teacher.hasTransferredStudents) {
      alertMessage += `  🔄 該老師班級包含轉班學生\n`;
    }
  });
  
  Logger.log('進度提醒：' + alertMessage);
  
  // 可以在這裡添加實際的通知功能，例如：
  // GmailApp.sendEmail(recipientEmail, '電聯記錄提醒', alertMessage);
}

/**
 * 🧪 測試函數：驗證改進後的calculateSemesterProgress函數
 * 專門測試轉班學生的完整6記錄框架統計計算
 */
function testTransferredStudentProgressCalculation() {
  try {
    Logger.log('🧪 ==========================================')
    Logger.log('🧪 測試轉班學生進度計算功能')
    Logger.log('🧪 ==========================================')
    
    // 📝 模擬學生資料（包含原在和轉班學生）
    const mockStudents = [
      ['STU001', '原在學生1', 'Original Student 1', 'G1-A'],
      ['STU002', '原在學生2', 'Original Student 2', 'G1-A'],
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A'] // 轉班學生
    ]
    
    // 📅 模擬聯繫記錄（包含完整的6記錄框架）
    // 原在學生：部分記錄、轉班學生：完整6記錄
    const mockContacts = [
      // 原在學生1 - 部分記錄
      ['STU001', '原在學生1', 'Original Student 1', 'G1-A', '2024-09-15', 'Fall', 'Beginning', 'Scheduled Contact', '已聯繫', '家長回應良好', '電話'],
      ['STU001', '原在學生1', 'Original Student 1', 'G1-A', '', 'Fall', 'Midterm', 'Scheduled Contact', '', '', ''], // 未完成
      ['STU001', '原在學生1', 'Original Student 1', 'G1-A', '', 'Fall', 'Final', 'Scheduled Contact', '', '', ''], // 未完成
      
      // 原在學生2 - 更少記錄
      ['STU002', '原在學生2', 'Original Student 2', 'G1-A', '2024-09-20', 'Fall', 'Beginning', 'Scheduled Contact', '已聯繫', '家長問題較多', '簡訊'],
      ['STU002', '原在學生2', 'Original Student 2', 'G1-A', '', 'Fall', 'Midterm', 'Scheduled Contact', '', '', ''], // 未完成
      
      // 🔄 轉班學生 - 完整6記錄框架（所有記錄都存在，但只有部分完成）
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A', '2024-10-01', 'Fall', 'Beginning', 'Scheduled Contact', '轉班後聯繫', '家長配合', '電話'], // 完成
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A', '', 'Fall', 'Midterm', 'Scheduled Contact', '', '', ''], // 未完成
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A', '', 'Fall', 'Final', 'Scheduled Contact', '', '', ''], // 未完成
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A', '', 'Spring', 'Beginning', 'Scheduled Contact', '', '', ''], // 未完成
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A', '', 'Spring', 'Midterm', 'Scheduled Contact', '', '', ''], // 未完成
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A', '', 'Spring', 'Final', 'Scheduled Contact', '', '', ''] // 未完成
    ]
    
    // 🔧 模擬欄位索引
    const fieldIndexes = {
      studentIdIndex: 0,
      dateIndex: 4,
      semesterIndex: 5,
      termIndex: 6,
      contactTypeIndex: 7,
      teachersContentIndex: 8,
      parentsResponsesIndex: 9,
      contactMethodIndex: 10
    }
    
    Logger.log(`📅 模擬資料：${mockStudents.length}位學生，${mockContacts.length}筆聯繫記錄`)
    
    // 🧪 執行測試：計算學期進度
    const progressResult = calculateSemesterProgress(mockContacts, mockStudents, fieldIndexes)
    
    // 📈 驗證結果
    Logger.log('📈 進度計算結果驗證：')
    
    let testsPassed = 0
    let totalTests = 0
    
    // 測試1：檢查Fall Beginning進度
    totalTests++
    const fallBeginning = progressResult.Fall?.Beginning
    if (fallBeginning) {
      Logger.log(`🍂 Fall Beginning: ${fallBeginning.completed}/${fallBeginning.total} 學生`)
      if (fallBeginning.total === 3 && fallBeginning.completed === 2) { // 3筆記錄，2筆完成
        Logger.log('✅ 測試1通過：Fall Beginning統計正確')
        testsPassed++
      } else {
        Logger.log(`❌ 測試1失敗：Fall Beginning，期望3/2，實際${fallBeginning.total}/${fallBeginning.completed}`)
      }
    } else {
      Logger.log('❌ 測試1失敗：找不到Fall Beginning進度')
    }
    
    // 測試2：檢查轉班學生的完整6記錄框架
    totalTests++
    let transferRecordsFound = 0
    Object.keys(progressResult).forEach(semester => {
      Object.keys(progressResult[semester]).forEach(term => {
        const termData = progressResult[semester][term]
        if (termData.scheduledStudents && termData.scheduledStudents.has('TRANSFER001')) {
          transferRecordsFound++
        }
      })
    })
    
    if (transferRecordsFound === 6) { // 轉班學生應該有6筆記錄
      Logger.log('✅ 測試2通過：轉班學生完整6記錄框架正確')
      testsPassed++
    } else {
      Logger.log(`❌ 測試2失敗：轉班學生記錄數，期望6，實際${transferRecordsFound}`)
    }
    
    // 測試3：檢查原在學生和轉班學生的區別處理
    totalTests++
    const springTermsWithTransfer = Object.keys(progressResult.Spring || {}).filter(term => {
      const termData = progressResult.Spring[term]
      return termData.scheduledStudents && termData.scheduledStudents.has('TRANSFER001')
    }).length
    
    if (springTermsWithTransfer === 3) { // Spring學期3個term都應該有轉班學生記錄
      Logger.log('✅ 測試3通過：Spring學期轉班學生記錄完整')
      testsPassed++
    } else {
      Logger.log(`❌ 測試3失敗：Spring學期轉班學生記錄，期望3，實際${springTermsWithTransfer}`)
    }
    
    // 🎆 總結
    const successRate = Math.round(testsPassed / totalTests * 100)
    Logger.log(`\n🎆 測試結果：${testsPassed}/${totalTests} 項測試通過 (${successRate}%)`)
    
    if (testsPassed === totalTests) {
      Logger.log('✅ 所有測試通過！轉班學生進度計算功能正常運作')
      return {
        success: true,
        message: '轉班學生進度計算測試全部通過',
        testResults: { passed: testsPassed, total: totalTests, successRate }
      }
    } else {
      Logger.log('❌ 部分測試失敗，需要進一步修正')
      return {
        success: false,
        message: `轉班學生進度計算測試部分失敗 (${testsPassed}/${totalTests})`,
        testResults: { passed: testsPassed, total: totalTests, successRate }
      }
    }
    
  } catch (error) {
    Logger.log('❌ 測試執行失敗：' + error.message)
    return {
      success: false,
      message: '測試執行錯誤：' + error.message,
      error: error.toString()
    }
  }
}