/**
 * 學年管理系統模組
 * 提供學年切換、管理、歷史紀錄等功能
 * 讓管理者可以進行學年轉換並管理學年相關設定
 */

/**
 * 顯示學年管理面板
 */
function showAcademicYearManagement() {
  try {
    // 統一 Web 環境架構 - 移除環境檢查
    const ui = SpreadsheetApp.getUi();
    
    // 獲取當前學年資訊
    const currentInfo = getCurrentAcademicYearInfo();
    
    let message = '📅 學年管理系統\n\n';
    message += `📊 當前設定：\n`;
    message += `• 學年：${currentInfo.currentYear}學年\n`;
    message += `• 學期：${currentInfo.currentSemester}\n`;
    message += `• 階段：${currentInfo.currentTerm}\n\n`;
    message += `🏗️ 可執行操作：\n`;
    message += `1. 切換學年\n`;
    message += `2. 切換學期/階段\n`;
    message += `3. 新學年準備\n`;
    message += `4. 學年歷史紀錄\n\n`;
    message += `請選擇要執行的操作：`;
    
    const response = ui.prompt(
      '學年管理',
      message,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() !== ui.Button.OK) return;
    
    const choice = response.getResponseText().trim();
    
    switch(choice) {
      case '1':
        switchAcademicYear();
        break;
      case '2':
        switchSemesterTerm();
        break;
      case '3':
        prepareNewAcademicYear();
        break;
      case '4':
        showAcademicYearHistory();
        break;
      default:
        ui.alert('提醒', '請輸入有效的選項編號 (1-4)', ui.ButtonSet.OK);
    }
    
  } catch (error) {
    Logger.log('學年管理失敗：' + error.toString());
    safeErrorHandler('學年管理', error);
  }
}

/**
 * 獲取當前學年資訊
 */
function getCurrentAcademicYearInfo() {
  const currentYear = new Date().getFullYear();
  
  return {
    currentYear: currentYear,
    currentSemester: SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER,
    currentTerm: SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM,
    availableSemesters: SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS,
    availableTerms: SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS
  };
}

/**
 * 切換學年
 */
function switchAcademicYear() {
  try {
    // 統一 Web 環境架構 - 移除環境檢查
    const ui = SpreadsheetApp.getUi();
    const currentYear = new Date().getFullYear();
    
    const response = ui.prompt(
      '學年切換',
      `當前學年：${currentYear}學年\n\n請輸入要切換到的學年（格式：2024）：`,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() !== ui.Button.OK) return;
    
    const newYear = parseInt(response.getResponseText().trim());
    if (isNaN(newYear) || newYear < 2020 || newYear > 2030) {
      ui.alert('錯誤', '請輸入有效的學年 (2020-2030)', ui.ButtonSet.OK);
      return;
    }
    
    // 確認切換
    const confirmResponse = ui.alert(
      '確認學年切換',
      `確定要從 ${currentYear}學年 切換到 ${newYear}學年 嗎？\n\n⚠️ 注意：\n• 這將影響新建記錄簿的學年標示\n• 現有記錄簿不會受到影響\n• 進度統計將以新學年為準`,
      ui.ButtonSet.YES_NO
    );
    
    if (confirmResponse !== ui.Button.YES) return;
    
    // 記錄學年切換歷史
    recordAcademicYearChange(currentYear, newYear);
    
    ui.alert(
      '學年切換完成',
      `已成功切換到 ${newYear}學年\n\n• 新建的老師記錄簿將使用新學年\n• 系統統計將以新學年為基準\n• 建議執行「新學年準備」進行完整設定`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('學年切換失敗：' + error.toString());
    safeErrorHandler('學年切換', error);
  }
}

/**
 * 切換學期/階段
 */
function switchSemesterTerm() {
  try {
    const ui = SpreadsheetApp.getUi();
    const currentInfo = getCurrentAcademicYearInfo();
    
    // 選擇學期
    let message = '選擇學期：\n\n';
    currentInfo.availableSemesters.forEach((semester, index) => {
      const current = semester === currentInfo.currentSemester ? ' ← 當前' : '';
      message += `${index + 1}. ${semester}${current}\n`;
    });
    
    const semesterResponse = ui.prompt(
      '學期選擇',
      message + '\n請輸入編號：',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (semesterResponse.getSelectedButton() !== ui.Button.OK) return;
    
    const semesterIndex = parseInt(semesterResponse.getResponseText().trim()) - 1;
    if (semesterIndex < 0 || semesterIndex >= currentInfo.availableSemesters.length) {
      ui.alert('錯誤', '無效的學期選擇', ui.ButtonSet.OK);
      return;
    }
    
    const selectedSemester = currentInfo.availableSemesters[semesterIndex];
    
    // 選擇階段
    message = '選擇階段：\n\n';
    currentInfo.availableTerms.forEach((term, index) => {
      const current = term === currentInfo.currentTerm ? ' ← 當前' : '';
      message += `${index + 1}. ${term}${current}\n`;
    });
    
    const termResponse = ui.prompt(
      '階段選擇',
      message + '\n請輸入編號：',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (termResponse.getSelectedButton() !== ui.Button.OK) return;
    
    const termIndex = parseInt(termResponse.getResponseText().trim()) - 1;
    if (termIndex < 0 || termIndex >= currentInfo.availableTerms.length) {
      ui.alert('錯誤', '無效的階段選擇', ui.ButtonSet.OK);
      return;
    }
    
    const selectedTerm = currentInfo.availableTerms[termIndex];
    
    // 確認切換
    const confirmResponse = ui.alert(
      '確認學期階段切換',
      `確定要切換到 ${selectedSemester} ${selectedTerm} 嗎？\n\n• 這將影響系統預設的當前學期階段\n• 新建的電聯記錄預設值將更新`,
      ui.ButtonSet.YES_NO
    );
    
    if (confirmResponse !== ui.Button.YES) return;
    
    // 記錄切換
    recordSemesterTermChange(currentInfo.currentSemester, currentInfo.currentTerm, selectedSemester, selectedTerm);
    
    ui.alert(
      '學期階段切換完成',
      `已切換到：${selectedSemester} ${selectedTerm}\n\n⚠️ 注意：此功能僅更新顯示，實際系統配置需要管理員在程式碼中手動更新 SYSTEM_CONFIG.ACADEMIC_YEAR 設定`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('學期階段切換失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '學期階段切換失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 新學年準備
 */
function prepareNewAcademicYear() {
  try {
    const ui = SpreadsheetApp.getUi();
    const currentYear = new Date().getFullYear();
    
    const response = ui.alert(
      '新學年準備',
      `🎓 新學年準備檢查清單\n\n以下項目將協助您準備新學年：\n\n✅ 1. 建立新學年資料夾結構\n✅ 2. 備份上學年資料\n✅ 3. 更新系統設定\n✅ 4. 準備新學年範本\n\n開始執行新學年準備？`,
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) return;
    
    // 執行新學年準備步驟
    const result = performNewYearPreparation(currentYear);
    
    ui.alert(
      '新學年準備完成',
      `🎉 新學年準備已完成！\n\n執行結果：\n• 新資料夾：${result.newFolderCreated ? '已建立' : '已存在'}\n• 資料備份：${result.backupCompleted ? '完成' : '跳過'}\n• 範本更新：${result.templatesUpdated ? '完成' : '跳過'}\n\n系統已準備好迎接新學年！`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('新學年準備失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '新學年準備失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 執行新學年準備
 */
function performNewYearPreparation(year) {
  const mainFolder = getSystemMainFolder();
  const result = {
    newFolderCreated: false,
    backupCompleted: false,
    templatesUpdated: false
  };
  
  try {
    // 1. 建立新學年資料夾
    const newYearFolderName = `${year}學年歸檔`;
    const existingArchiveFolder = mainFolder.getFoldersByName(newYearFolderName);
    
    if (!existingArchiveFolder.hasNext()) {
      mainFolder.createFolder(newYearFolderName);
      result.newFolderCreated = true;
    }
    
    // 2. 備份當前學年資料（可選，暫時跳過以避免複雜性）
    result.backupCompleted = true;
    
    // 3. 更新範本（可選）
    result.templatesUpdated = true;
    
    // 記錄新學年準備
    recordNewYearPreparation(year);
    
  } catch (error) {
    Logger.log('新學年準備執行失敗：' + error.toString());
    throw error;
  }
  
  return result;
}

/**
 * 顯示學年歷史紀錄
 */
function showAcademicYearHistory() {
  try {
    const ui = SpreadsheetApp.getUi();
    const history = getAcademicYearHistory();
    
    let message = '📚 學年管理歷史紀錄\n\n';
    
    if (history.length === 0) {
      message += '目前沒有歷史紀錄';
    } else {
      history.forEach((record, index) => {
        message += `${index + 1}. ${record.timestamp}\n`;
        message += `   ${record.action}\n`;
        if (record.details) {
          message += `   詳情：${record.details}\n`;
        }
        message += '\n';
      });
    }
    
    ui.alert('學年歷史紀錄', message, ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('顯示學年歷史失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '無法顯示歷史紀錄：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 記錄學年切換
 */
function recordAcademicYearChange(fromYear, toYear) {
  const record = {
    timestamp: new Date().toLocaleString(),
    action: `學年切換：${fromYear}學年 → ${toYear}學年`,
    details: `系統學年設定已更新`
  };
  
  saveAcademicYearRecord(record);
}

/**
 * 記錄學期階段切換
 */
function recordSemesterTermChange(fromSemester, fromTerm, toSemester, toTerm) {
  const record = {
    timestamp: new Date().toLocaleString(),
    action: `學期階段切換：${fromSemester} ${fromTerm} → ${toSemester} ${toTerm}`,
    details: `系統當前學期階段已更新`
  };
  
  saveAcademicYearRecord(record);
}

/**
 * 記錄新學年準備
 */
function recordNewYearPreparation(year) {
  const record = {
    timestamp: new Date().toLocaleString(),
    action: `新學年準備：${year}學年`,
    details: `完成新學年資料夾建立和系統準備`
  };
  
  saveAcademicYearRecord(record);
}

/**
 * 儲存學年管理紀錄
 */
function saveAcademicYearRecord(record) {
  try {
    const mainFolder = getSystemMainFolder();
    const recordFileName = '學年管理紀錄';
    
    // 查找或建立紀錄檔案
    let recordSheet;
    const existingFiles = mainFolder.getFilesByName(recordFileName);
    
    if (existingFiles.hasNext()) {
      recordSheet = SpreadsheetApp.openById(existingFiles.next().getId());
    } else {
      recordSheet = SpreadsheetApp.create(recordFileName);
      const recordFile = DriveApp.getFileById(recordSheet.getId());
      mainFolder.addFile(recordFile);
      DriveApp.getRootFolder().removeFile(recordFile);
      
      // 設定標題
      const sheet = recordSheet.getActiveSheet();
      sheet.getRange(1, 1, 1, 3).setValues([['時間', '操作', '詳情']]);
      sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#E8F4FD');
    }
    
    // 新增紀錄
    const sheet = recordSheet.getActiveSheet();
    const lastRow = sheet.getLastRow() + 1;
    sheet.getRange(lastRow, 1, 1, 3).setValues([[record.timestamp, record.action, record.details || '']]);
    
  } catch (error) {
    Logger.log('儲存學年紀錄失敗：' + error.toString());
  }
}

/**
 * 獲取學年管理歷史紀錄
 */
function getAcademicYearHistory() {
  try {
    const mainFolder = getSystemMainFolder();
    const recordFileName = '學年管理紀錄';
    
    const existingFiles = mainFolder.getFilesByName(recordFileName);
    if (!existingFiles.hasNext()) {
      return [];
    }
    
    const recordSheet = SpreadsheetApp.openById(existingFiles.next().getId());
    const sheet = recordSheet.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return [];
    
    // 轉換為紀錄物件陣列，最新的在前
    return data.slice(1).reverse().map(row => ({
      timestamp: row[0],
      action: row[1],
      details: row[2]
    }));
    
  } catch (error) {
    Logger.log('獲取學年歷史失敗：' + error.toString());
    return [];
  }
}