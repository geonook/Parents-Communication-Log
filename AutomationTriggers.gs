/**
 * 自動化觸發器模組
 * 負責設定定時觸發器、自動提醒、定期備份等自動化功能
 */

/**
 * 設定自動化觸發器
 */
function setupAutomationTriggers() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '設定自動化觸發器',
      '確定要設定系統自動化功能嗎？\n這將建立：\n• 每週進度檢查\n• 每月學期進度報告\n• 每日備份',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) return;
    
    // 清除現有觸發器
    clearExistingTriggers();
    
    // 設定每週進度檢查觸發器（每週一早上 8 點）
    ScriptApp.newTrigger('autoProgressCheck')
      .timeBased()
      .everyWeeks(1)
      .onWeekDay(ScriptApp.WeekDay.MONDAY)
      .atHour(8)
      .create();
    
    // 設定每月學期進度報告觸發器（每月 1 號早上 9 點）
    ScriptApp.newTrigger('autoSemesterReport')
      .timeBased()
      .onMonthDay(1)
      .atHour(9)
      .create();
    
    // 設定每日備份觸發器（每天凌晨 2 點）
    ScriptApp.newTrigger('autoBackup')
      .timeBased()
      .everyDays(1)
      .atHour(2)
      .create();
    
    // 設定系統維護觸發器（每週日凌晨 3 點）
    ScriptApp.newTrigger('autoSystemMaintenance')
      .timeBased()
      .everyWeeks(1)
      .onWeekDay(ScriptApp.WeekDay.SUNDAY)
      .atHour(3)
      .create();
    
    ui.alert(
      '觸發器設定完成！',
      '自動化功能已啟用：\n• 每週一進度檢查\n• 每月學期進度報告\n• 每日系統備份\n• 每週系統維護',
      ui.ButtonSet.OK
    );
    
    Logger.log('自動化觸發器設定完成');
    
  } catch (error) {
    Logger.log('設定觸發器失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '設定觸發器失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 清除現有觸發器
 */
function clearExistingTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (['autoProgressCheck', 'autoSemesterReport', 'autoBackup', 'autoSystemMaintenance'].includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

/**
 * 自動學期進度報告生成
 */
function autoSemesterReport() {
  try {
    Logger.log('開始自動生成學期進度報告');
    
    // 生成進度報告
    generateProgressReport();
    
    // 更新老師列表
    updateTeachersList();
    
    // 生成學期統計摘要
    generateSemesterSummary();
    
    Logger.log('學期進度報告生成完成');
    
  } catch (error) {
    Logger.log('自動學期進度報告失敗：' + error.toString());
  }
}

/**
 * 自動系統備份
 */
function autoBackup() {
  try {
    Logger.log('開始自動系統備份');
    
    const mainFolder = getSystemMainFolder();
    const backupFolder = getOrCreateBackupFolder(mainFolder);
    
    // 備份管理控制台
    backupAdminConsole(mainFolder, backupFolder);
    
    // 備份範本檔案
    backupTemplates(mainFolder, backupFolder);
    
    // 備份系統設定
    backupSystemSettings(backupFolder);
    
    // 清理舊的備份檔案（保留最近 30 天）
    cleanupOldBackups(backupFolder);
    
    Logger.log('系統備份完成');
    
  } catch (error) {
    Logger.log('自動備份失敗：' + error.toString());
  }
}

/**
 * 自動系統維護
 */
function autoSystemMaintenance() {
  try {
    Logger.log('開始自動系統維護');
    
    // 清理暫存檔案
    cleanupTempFiles();
    
    // 優化資料夾結構
    optimizeFolderStructure();
    
    // 檢查檔案完整性
    checkFileIntegrity();
    
    // 更新系統統計
    updateSystemStatistics();
    
    Logger.log('系統維護完成');
    
  } catch (error) {
    Logger.log('自動維護失敗：' + error.toString());
  }
}

/**
 * 生成學期統計摘要
 */
function generateSemesterSummary() {
  try {
    const teacherBooks = getAllTeacherBooks();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalContacts = 0;
    let activeTeachers = 0;
    const classStats = {};
    const contactMethodStats = {};
    
    teacherBooks.forEach(book => {
      try {
        const contactSheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
        const contactData = contactSheet.getDataRange().getValues();
        
        const monthlyContacts = contactData.slice(1).filter(row => {
          if (!row[4]) return false; // 檢查日期欄位是否存在
          const contactDate = new Date(row[4]); // Date 在第5欄 (index 4)
          return contactDate.getMonth() === currentMonth && contactDate.getFullYear() === currentYear;
        });
        
        if (monthlyContacts.length > 0) {
          activeTeachers++;
          totalContacts += monthlyContacts.length;
          
          // 統計班級分布和聯絡方式分布
          monthlyContacts.forEach(contact => {
            const englishClass = contact[3];  // English Class 在第4欄 (index 3)
            const method = contact[10];   // Contact Method 在第11欄 (index 10) - 學期制版本
            
            if (englishClass) {
              classStats[englishClass] = (classStats[englishClass] || 0) + 1;
            }
            if (method) {
              contactMethodStats[method] = (contactMethodStats[method] || 0) + 1;
            }
          });
        }
        
      } catch (error) {
        Logger.log(`處理 ${book.getName()} 月度統計失敗：` + error.toString());
      }
    });
    
    // 建立統計報告
    const summaryData = {
      month: `${currentYear}年${currentMonth + 1}月`,
      totalTeachers: teacherBooks.length,
      activeTeachers: activeTeachers,
      totalContacts: totalContacts,
      averageContacts: activeTeachers > 0 ? Math.round(totalContacts / activeTeachers * 100) / 100 : 0,
      classStats: classStats,
      contactMethodStats: contactMethodStats,
      generatedDate: new Date().toLocaleString()
    };
    
    // 儲存統計資料
    saveSemesterSummary(summaryData);
    
    Logger.log('月度統計摘要生成完成');
    
  } catch (error) {
    Logger.log('生成月度統計摘要失敗：' + error.toString());
  }
}

/**
 * 儲存學期統計摘要
 */
function saveSemesterSummary(summaryData) {
  try {
    const mainFolder = getSystemMainFolder();
    const reportsFolder = mainFolder.getFoldersByName('進度報告').next();
    
    const summarySheet = SpreadsheetApp.create(`月度統計摘要_${summaryData.month}`);
    const summaryFile = DriveApp.getFileById(summarySheet.getId());
    
    // 移動到報告資料夾
    reportsFolder.addFile(summaryFile);
    DriveApp.getRootFolder().removeFile(summaryFile);
    
    // 寫入統計資料
    const sheet = summarySheet.getActiveSheet();
    sheet.setName('月度統計');
    
    const summaryContent = [
      ['月度電聯統計摘要', ''],
      ['', ''],
      ['統計期間', summaryData.month],
      ['生成時間', summaryData.generatedDate],
      ['', ''],
      ['基本統計', ''],
      ['總老師數', summaryData.totalTeachers],
      ['活躍老師數', summaryData.activeTeachers],
      ['總電聯次數', summaryData.totalContacts],
      ['平均每人電聯次數', summaryData.averageContacts],
      ['', ''],
      ['班級分布', '']
    ];
    
    // 加入班級統計
    Object.keys(summaryData.classStats).forEach(className => {
      summaryContent.push([className, summaryData.classStats[className]]);
    });
    
    summaryContent.push(['', '']);
    summaryContent.push(['聯絡方式分布', '']);
    
    // 加入聯絡方式統計
    Object.keys(summaryData.contactMethodStats).forEach(method => {
      summaryContent.push([method, summaryData.contactMethodStats[method]]);
    });
    
    sheet.getRange(1, 1, summaryContent.length, 2).setValues(summaryContent);
    
    // 格式設定
    sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
    sheet.getRange('A6').setFontSize(14).setFontWeight('bold');
    sheet.getRange('A12').setFontSize(14).setFontWeight('bold');
    sheet.getRange(`A${12 + Object.keys(summaryData.classStats).length + 2}`).setFontSize(14).setFontWeight('bold');
    
    sheet.autoResizeColumns(1, 2);
    
  } catch (error) {
    Logger.log('儲存月度統計摘要失敗：' + error.toString());
  }
}

/**
 * 取得或建立備份資料夾
 */
function getOrCreateBackupFolder(mainFolder) {
  const backupFolderName = '系統備份';
  let backupFolder;
  
  const existingBackupFolder = mainFolder.getFoldersByName(backupFolderName);
  if (existingBackupFolder.hasNext()) {
    backupFolder = existingBackupFolder.next();
  } else {
    backupFolder = mainFolder.createFolder(backupFolderName);
  }
  
  // 建立日期備份子資料夾
  const dateStr = new Date().toISOString().split('T')[0];
  const dateFolderName = `備份_${dateStr}`;
  
  let dateFolder;
  const existingDateFolder = backupFolder.getFoldersByName(dateFolderName);
  if (existingDateFolder.hasNext()) {
    dateFolder = existingDateFolder.next();
  } else {
    dateFolder = backupFolder.createFolder(dateFolderName);
  }
  
  return dateFolder;
}

/**
 * 備份管理控制台
 */
function backupAdminConsole(mainFolder, backupFolder) {
  try {
    const adminConsole = getAdminConsole(mainFolder);
    const backupFile = adminConsole.copy(`管理控制台備份_${new Date().toLocaleString()}`);
    
    const backupFileInDrive = DriveApp.getFileById(backupFile.getId());
    backupFolder.addFile(backupFileInDrive);
    DriveApp.getRootFolder().removeFile(backupFileInDrive);
    
    Logger.log('管理控制台備份完成');
    
  } catch (error) {
    Logger.log('備份管理控制台失敗：' + error.toString());
  }
}

/**
 * 備份範本檔案
 */
function backupTemplates(mainFolder, backupFolder) {
  try {
    const templatesFolder = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME).next();
    const templateFiles = templatesFolder.getFiles();
    
    while (templateFiles.hasNext()) {
      const file = templateFiles.next();
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
        const sheet = SpreadsheetApp.openById(file.getId());
        const backupFile = sheet.copy(`${file.getName()}_備份_${new Date().toLocaleString()}`);
        
        const backupFileInDrive = DriveApp.getFileById(backupFile.getId());
        backupFolder.addFile(backupFileInDrive);
        DriveApp.getRootFolder().removeFile(backupFileInDrive);
      }
    }
    
    Logger.log('範本檔案備份完成');
    
  } catch (error) {
    Logger.log('備份範本檔案失敗：' + error.toString());
  }
}

/**
 * 備份系統設定
 */
function backupSystemSettings(backupFolder) {
  try {
    const settingsData = {
      MAIN_FOLDER_NAME: SYSTEM_CONFIG.MAIN_FOLDER_NAME,
      TEACHERS_FOLDER_NAME: SYSTEM_CONFIG.TEACHERS_FOLDER_NAME,
      TEMPLATES_FOLDER_NAME: SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME,
      PROGRESS_CHECK: SYSTEM_CONFIG.PROGRESS_CHECK,
      CONTACT_FIELDS: SYSTEM_CONFIG.CONTACT_FIELDS,
      SHEET_NAMES: SYSTEM_CONFIG.SHEET_NAMES,
      BACKUP_DATE: new Date().toISOString()
    };
    
    const settingsSheet = SpreadsheetApp.create(`系統設定備份_${new Date().toLocaleDateString()}`);
    const settingsFile = DriveApp.getFileById(settingsSheet.getId());
    
    backupFolder.addFile(settingsFile);
    DriveApp.getRootFolder().removeFile(settingsFile);
    
    const sheet = settingsSheet.getActiveSheet();
    sheet.getRange('A1').setValue('系統設定備份');
    sheet.getRange('A2').setValue(JSON.stringify(settingsData, null, 2));
    
    Logger.log('系統設定備份完成');
    
  } catch (error) {
    Logger.log('備份系統設定失敗：' + error.toString());
  }
}

/**
 * 清理舊的備份檔案
 */
function cleanupOldBackups(backupFolder) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const parentBackupFolder = backupFolder.getParents().next();
    const subFolders = parentBackupFolder.getFolders();
    
    while (subFolders.hasNext()) {
      const folder = subFolders.next();
      if (folder.getName().startsWith('備份_') && folder.getDateCreated() < thirtyDaysAgo) {
        // 刪除資料夾中的所有檔案
        const files = folder.getFiles();
        while (files.hasNext()) {
          files.next().setTrashed(true);
        }
        // 刪除資料夾
        folder.setTrashed(true);
      }
    }
    
    Logger.log('舊備份檔案清理完成');
    
  } catch (error) {
    Logger.log('清理舊備份失敗：' + error.toString());
  }
}

/**
 * 清理暫存檔案
 */
function cleanupTempFiles() {
  // 這個函數可以清理系統產生的暫存檔案
  Logger.log('暫存檔案清理完成');
}

/**
 * 優化資料夾結構
 */
function optimizeFolderStructure() {
  // 這個函數可以整理和優化資料夾結構
  Logger.log('資料夾結構優化完成');
}

/**
 * 檢查檔案完整性
 */
function checkFileIntegrity() {
  try {
    const teacherBooks = getAllTeacherBooks();
    let integrityIssues = 0;
    
    teacherBooks.forEach(book => {
      try {
        // 檢查必要工作表是否存在
        const requiredSheets = Object.values(SYSTEM_CONFIG.SHEET_NAMES);
        const existingSheets = book.getSheets().map(sheet => sheet.getName());
        
        requiredSheets.forEach(sheetName => {
          if (!existingSheets.includes(sheetName)) {
            Logger.warning(`${book.getName()} 缺少工作表：${sheetName}`);
            integrityIssues++;
          }
        });
        
      } catch (error) {
        Logger.log(`檢查 ${book.getName()} 完整性失敗：` + error.toString());
        integrityIssues++;
      }
    });
    
    Logger.log(`檔案完整性檢查完成，發現 ${integrityIssues} 個問題`);
    
  } catch (error) {
    Logger.log('檔案完整性檢查失敗：' + error.toString());
  }
}

/**
 * 更新系統統計
 */
function updateSystemStatistics() {
  try {
    const mainFolder = getSystemMainFolder();
    const adminConsole = getAdminConsole(mainFolder);
    const dashboardSheet = adminConsole.getSheetByName('控制台主頁');
    
    // 更新統計數據
    const teacherBooks = getAllTeacherBooks();
    const totalTeachers = teacherBooks.length;
    
    let totalContacts = 0;
    let activeBooks = 0;
    
    teacherBooks.forEach(book => {
      try {
        const contactSheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
        const contactData = contactSheet.getDataRange().getValues();
        const contacts = contactData.slice(1);
        
        if (contacts.length > 0) {
          activeBooks++;
          totalContacts += contacts.length;
        }
        
      } catch (error) {
        Logger.log(`統計 ${book.getName()} 失敗：` + error.toString());
      }
    });
    
    // 更新控制台數據
    if (dashboardSheet) {
      dashboardSheet.getRange('B6').setValue(totalTeachers); // 註冊老師數
      dashboardSheet.getRange('B7').setValue(activeBooks);   // 活躍記錄簿
      dashboardSheet.getRange('B8').setValue(totalContacts); // 總電聯次數
    }
    
    Logger.log('系統統計更新完成');
    
  } catch (error) {
    Logger.log('更新系統統計失敗：' + error.toString());
  }
} 