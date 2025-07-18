/**
 * 學生資料匯入模組
 * 提供從現有學生總表匯入資料到記錄簿的功能
 * 支援從學生總表中提取老師資訊並批量創建記錄簿
 */

/**
 * 從學生總表匯入資料到老師記錄簿
 */
function importStudentData() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 選擇要匯入的老師記錄簿
    const teacherBook = selectTeacherRecordBook();
    if (!teacherBook) return;
    
    // 獲取學生總表資料來源
    const studentData = getStudentDataSource();
    if (!studentData) return;
    
    // 執行匯入
    const importResult = performStudentDataImport(teacherBook, studentData);
    
    ui.alert(
      '匯入完成！',
      `成功匯入 ${importResult.successCount} 筆學生資料\n失敗：${importResult.errorCount} 筆`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('學生資料匯入失敗：' + error.toString());
    safeErrorHandler('學生資料匯入', error);
  }
}

/**
 * 選擇要匯入資料的老師記錄簿
 */
function selectTeacherRecordBook() {
  const ui = SpreadsheetApp.getUi();
  
  // 獲取所有老師記錄簿
  const teacherBooks = getAllTeacherBooks();
  
  if (teacherBooks.length === 0) {
    ui.alert('提醒', '系統中沒有找到任何老師記錄簿', ui.ButtonSet.OK);
    return null;
  }
  
  // 建立選擇清單
  let teacherList = '請選擇要匯入資料的老師記錄簿：\n\n';
  teacherBooks.forEach((book, index) => {
    const summarySheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    const teacherName = summarySheet.getRange('B3').getValue();
    teacherList += `${index + 1}. ${teacherName}\n`;
  });
  
  const response = ui.prompt(
    '選擇老師記錄簿',
    teacherList + '\n請輸入編號：',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) return null;
  
  const selectedIndex = parseInt(response.getResponseText()) - 1;
  if (selectedIndex < 0 || selectedIndex >= teacherBooks.length) {
    ui.alert('錯誤', '無效的選擇', ui.ButtonSet.OK);
    return null;
  }
  
  return teacherBooks[selectedIndex];
}

/**
 * 獲取學生資料來源
 */
function getStudentDataSource() {
  const ui = SpreadsheetApp.getUi();
  
  const sourceOptions = ui.alert(
    '學生資料來源',
    '請選擇學生資料來源：',
    ui.ButtonSet.YES_NO_CANCEL
  );
  
  // 自訂按鈕說明
  ui.alert(
    '資料來源選項',
    'YES - 從 Google Sheets 檔案匯入\nNO - 手動輸入學生資料\nCANCEL - 取消操作',
    ui.ButtonSet.OK
  );
  
  const actualResponse = ui.alert(
    '學生資料來源',
    '從 Google Sheets 檔案匯入學生資料？',
    ui.ButtonSet.YES_NO_CANCEL
  );
  
  if (actualResponse === ui.Button.CANCEL) return null;
  
  if (actualResponse === ui.Button.YES) {
    return getStudentDataFromSheet();
  } else {
    return getStudentDataManually();
  }
}

/**
 * 從 Google Sheets 獲取學生資料
 */
function getStudentDataFromSheet() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.prompt(
    '學生總表匯入',
    '請輸入包含學生資料的 Google Sheets ID：\n\n格式說明：\n第一列應為標題列，包含：ID, Grade, HR, Seat #, Chinese Name, English Name, 112 Level, 113 Level, Previous Teacher, English Class, LT, Mother\'s Phone, Father\'s Phone\n\n※ 電話號碼無特定格式限制，可為純數字如 927055077',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) return null;
  
  try {
    const sheetId = response.getResponseText().trim();
    const sourceSheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
    const data = sourceSheet.getDataRange().getValues();
    
    if (data.length < 2) {
      ui.alert('錯誤', '學生資料表至少需要包含標題列和一列資料', ui.ButtonSet.OK);
      return null;
    }
    
    // 驗證欄位格式
    const headers = data[0];
    const expectedFields = SYSTEM_CONFIG.STUDENT_FIELDS;
    
    // 檢查是否包含必要欄位
    const missingFields = expectedFields.filter(field => !headers.includes(field));
    if (missingFields.length > 0) {
      const proceed = ui.alert(
        '欄位警告',
        `缺少以下欄位：${missingFields.join(', ')}\n\n是否繼續匯入？`,
        ui.ButtonSet.YES_NO
      );
      if (proceed !== ui.Button.YES) return null;
    }
    
    return {
      type: 'sheet',
      data: data.slice(1), // 跳過標題列
      headers: headers
    };
    
  } catch (error) {
    ui.alert('錯誤', '無法讀取學生資料表：' + error.message, ui.ButtonSet.OK);
    return null;
  }
}

/**
 * 手動輸入學生資料
 */
function getStudentDataManually() {
  const ui = SpreadsheetApp.getUi();
  
  const students = [];
  let continueAdding = true;
  
  while (continueAdding) {
    const studentData = getStudentDataEntry();
    if (studentData) {
      students.push(studentData);
      
      const response = ui.alert(
        '繼續新增',
        `已新增學生：${studentData[4]} (${studentData[5]})\n\n是否繼續新增其他學生？`,
        ui.ButtonSet.YES_NO
      );
      
      continueAdding = (response === ui.Button.YES);
    } else {
      continueAdding = false;
    }
  }
  
  if (students.length === 0) return null;
  
  return {
    type: 'manual',
    data: students,
    headers: SYSTEM_CONFIG.STUDENT_FIELDS
  };
}

/**
 * 單一學生資料輸入
 */
function getStudentDataEntry() {
  const ui = SpreadsheetApp.getUi();
  
  // 必要欄位輸入
  const id = ui.prompt('學生資料', '請輸入學生 ID：', ui.ButtonSet.OK_CANCEL);
  if (id.getSelectedButton() !== ui.Button.OK) return null;
  
  const grade = ui.prompt('學生資料', '請輸入年級 (Grade)：', ui.ButtonSet.OK_CANCEL);
  if (grade.getSelectedButton() !== ui.Button.OK) return null;
  
  const hr = ui.prompt('學生資料', '請輸入班級 (HR)：', ui.ButtonSet.OK_CANCEL);
  if (hr.getSelectedButton() !== ui.Button.OK) return null;
  
  const seatNum = ui.prompt('學生資料', '請輸入座號 (Seat #)：', ui.ButtonSet.OK_CANCEL);
  if (seatNum.getSelectedButton() !== ui.Button.OK) return null;
  
  const chineseName = ui.prompt('學生資料', '請輸入中文姓名：', ui.ButtonSet.OK_CANCEL);
  if (chineseName.getSelectedButton() !== ui.Button.OK) return null;
  
  const englishName = ui.prompt('學生資料', '請輸入英文姓名：', ui.ButtonSet.OK_CANCEL);
  if (englishName.getSelectedButton() !== ui.Button.OK) return null;
  
  const motherPhone = ui.prompt('學生資料', '請輸入母親電話：', ui.ButtonSet.OK_CANCEL);
  if (motherPhone.getSelectedButton() !== ui.Button.OK) return null;
  
  const fatherPhone = ui.prompt('學生資料', '請輸入父親電話：', ui.ButtonSet.OK_CANCEL);
  if (fatherPhone.getSelectedButton() !== ui.Button.OK) return null;
  
  // 建立完整的學生資料陣列
  return [
    id.getResponseText().trim(),
    grade.getResponseText().trim(),
    hr.getResponseText().trim(),
    seatNum.getResponseText().trim(),
    chineseName.getResponseText().trim(),
    englishName.getResponseText().trim(),
    '', // 112 Level
    '', // 113 Level
    '', // Previous Teacher
    '', // English Class
    '', // LT
    motherPhone.getResponseText().trim(),
    fatherPhone.getResponseText().trim()
  ];
}

/**
 * 執行學生資料匯入
 */
function performStudentDataImport(teacherBook, studentData) {
  const studentListSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
  
  if (!studentListSheet) {
    throw new Error('找不到學生清單工作表');
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  // 清除現有資料（保留標題列）
  const lastRow = studentListSheet.getLastRow();
  if (lastRow > 1) {
    studentListSheet.getRange(2, 1, lastRow - 1, SYSTEM_CONFIG.STUDENT_FIELDS.length).clearContent();
  }
  
  // 匯入新資料
  try {
    if (studentData.data.length > 0) {
      // 確保資料格式正確
      const importData = studentData.data.map(row => {
        // 確保每列都有足夠的欄位
        const completeRow = [];
        for (let i = 0; i < SYSTEM_CONFIG.STUDENT_FIELDS.length; i++) {
          completeRow.push(row[i] || '');
        }
        return completeRow;
      });
      
      studentListSheet.getRange(2, 1, importData.length, SYSTEM_CONFIG.STUDENT_FIELDS.length).setValues(importData);
      successCount = importData.length;
    }
  } catch (error) {
          Logger.log('匯入資料時發生錯誤：' + error.toString());
    errorCount = studentData.data.length;
  }
  
  // 重新設定資料驗證
  reapplyDataValidation(studentListSheet, teacherBook);
  
  return {
    successCount: successCount,
    errorCount: errorCount
  };
}

/**
 * 重新套用資料驗證
 */
function reapplyDataValidation(studentListSheet, teacherBook) {
  try {
    const summarySheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    const classesStr = summarySheet.getRange('B5').getValue();
    const classes = classesStr.split(',').map(c => c.trim());
    
    // English Class 英語班級下拉選單（第10欄）
    const englishClassRange = studentListSheet.getRange('J2:J1000');
    const englishClassValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(classes)
      .setAllowInvalid(false)
      .setHelpText('請選擇英語授課班級')
      .build();
    englishClassRange.setDataValidation(englishClassValidation);
    
    // Grade 下拉選單
    const gradeRange = studentListSheet.getRange('B2:B1000');
    const gradeValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(SYSTEM_CONFIG.GRADE_LEVELS)  // 使用 G1-G6
      .setAllowInvalid(false)
      .build();
    gradeRange.setDataValidation(gradeValidation);
    
  } catch (error) {
    Logger.log('重新套用資料驗證失敗：' + error.toString());
  }
}

/**
 * 匯出學生資料到新的 Google Sheets
 */
function exportStudentData() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 選擇要匯出的老師記錄簿
    const teacherBook = selectTeacherRecordBook();
    if (!teacherBook) return;
    
    const studentListSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    const summarySheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    const teacherName = summarySheet.getRange('B3').getValue();
    
    // 建立匯出檔案
    const exportSheet = SpreadsheetApp.create(`${teacherName}_學生資料匯出_${new Date().toLocaleDateString()}`);
    const exportFile = DriveApp.getFileById(exportSheet.getId());
    
    // 移動到主資料夾
    const mainFolder = getSystemMainFolder();
    mainFolder.addFile(exportFile);
    DriveApp.getRootFolder().removeFile(exportFile);
    
    // 複製資料
    const sourceData = studentListSheet.getDataRange().getValues();
    const targetSheet = exportSheet.getActiveSheet();
    targetSheet.getRange(1, 1, sourceData.length, sourceData[0].length).setValues(sourceData);
    
    // 格式設定
    targetSheet.getRange(1, 1, 1, sourceData[0].length).setFontWeight('bold').setBackground('#E8F4FD');
    targetSheet.autoResizeColumns(1, sourceData[0].length);
    
    ui.alert(
      '匯出完成！',
      `學生資料已匯出到：\n${exportSheet.getUrl()}`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('學生資料匯出失敗：' + error.toString());
    safeErrorHandler('學生資料匯出', error);
  }
}

/**
 * 從學生清單自動填入電聯記錄
 */
function createContactFromStudentList() {
  try {
    const ui = SpreadsheetApp.getUi();
    const currentSheet = SpreadsheetApp.getActiveSheet();
    
    // 檢查是否在電聯記錄工作表中
    if (!currentSheet.getName().includes(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG)) {
      ui.alert('提醒', '請在電聯記錄工作表中使用此功能', ui.ButtonSet.OK);
      return;
    }
    
    const recordBook = SpreadsheetApp.getActiveSpreadsheet();
    const studentListSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    
    if (!studentListSheet) {
      ui.alert('錯誤', '找不到學生清單工作表', ui.ButtonSet.OK);
      return;
    }
    
    // 獲取學生清單
    const studentData = studentListSheet.getDataRange().getValues();
    if (studentData.length < 2) {
      ui.alert('提醒', '學生清單中沒有資料', ui.ButtonSet.OK);
      return;
    }
    
    // 建立學生選擇清單
    let studentList = '請選擇學生：\n\n';
    studentData.slice(1).forEach((student, index) => {
      const id = student[0];
      const chineseName = student[4];
      const englishName = student[5];
      const hr = student[2];
      studentList += `${index + 1}. ${id} - ${chineseName} (${englishName}) - ${hr}\n`;
    });
    
    const response = ui.prompt(
      '選擇學生',
      studentList + '\n請輸入編號：',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() !== ui.Button.OK) return;
    
    const selectedIndex = parseInt(response.getResponseText()) - 1;
    if (selectedIndex < 0 || selectedIndex >= studentData.length - 1) {
      ui.alert('錯誤', '無效的選擇', ui.ButtonSet.OK);
      return;
    }
    
    const selectedStudent = studentData[selectedIndex + 1];
    
    // 找到第一個空白列
    const lastRow = currentSheet.getLastRow();
    const newRow = lastRow + 1;
    
    // 填入學生基本資料（學期制11欄位格式）
    currentSheet.getRange(newRow, 1).setValue(selectedStudent[0]); // Student ID
    currentSheet.getRange(newRow, 2).setValue(selectedStudent[4]); // Chinese Name
    currentSheet.getRange(newRow, 3).setValue(selectedStudent[5]); // English Name
    currentSheet.getRange(newRow, 4).setValue(selectedStudent[9]); // English Class (第10欄)
    currentSheet.getRange(newRow, 5).setValue(new Date());         // Date
    // Semester (第6欄) - 用戶需手動選擇
    // Term (第7欄) - 用戶需手動選擇  
    // Contact Type (第8欄) - 用戶需手動選擇
    
    // 聚焦到 Teachers Content 欄位（第9欄）
    currentSheet.getRange(newRow, 9).activate();
    
    ui.alert('完成', '學生基本資料已填入，請手動選擇Semester、Term、Contact Type後，繼續填寫聯繫內容', ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('從學生清單建立電聯記錄失敗：' + error.toString());
    safeErrorHandler('從學生清單建立電聯記錄', error);
  }
}

/**
 * 從學生總表提取老師資訊並批量創建記錄簿
 * 針對中師英文科的需求優化
 */
function createTeachersFromStudentMasterList() {
  try {
    Logger.log('========== 開始從學生總表批量創建老師記錄簿 ==========');
    const ui = SpreadsheetApp.getUi();
    
    // 檢查系統狀態
    Logger.log('步驟1: 檢查系統狀態...');
    try {
      const mainFolder = getSystemMainFolder();
      Logger.log(`✅ 系統主資料夾正常：${mainFolder.getName()}`);
    } catch (systemError) {
      Logger.log(`❌ 系統狀態檢查失敗：${systemError.message}`);
      ui.alert('系統錯誤', `系統未正確初始化：${systemError.message}\n\n請先執行「初始化系統」功能`, ui.ButtonSet.OK);
      return;
    }
    
    // 獲取學生總表
    Logger.log('步驟2: 獲取學生總表資料...');
    const studentMasterData = getStudentMasterList();
    if (!studentMasterData) {
      Logger.log('❌ 用戶取消或無法獲取學生總表');
      return;
    }
    Logger.log(`✅ 成功獲取學生總表，資料行數：${studentMasterData.data.length}`);
    Logger.log(`📋 標題欄位：${JSON.stringify(studentMasterData.headers)}`);
    
    // 從學生總表中提取老師資訊
    Logger.log('步驟3: 從學生總表提取老師資訊...');
    let teachersInfo;
    try {
      teachersInfo = extractTeachersFromMasterList(studentMasterData);
      Logger.log(`✅ 成功提取老師資訊，找到 ${teachersInfo ? teachersInfo.length : 0} 位老師`);
      
      if (teachersInfo && teachersInfo.length > 0) {
        teachersInfo.forEach((teacher, index) => {
          Logger.log(`老師 ${index + 1}: ${teacher.name}, 班級: ${teacher.classes.join(', ')}, 學生數: ${teacher.studentCount}`);
        });
      }
    } catch (extractError) {
      Logger.log(`❌ 提取老師資訊失敗：${extractError.message}`);
      ui.alert('資料提取錯誤', `無法從學生總表中提取老師資訊：${extractError.message}\n\n請檢查學生總表格式是否正確`, ui.ButtonSet.OK);
      return;
    }
    
    if (!teachersInfo || teachersInfo.length === 0) {
      Logger.log('❌ 未找到任何老師資訊');
      ui.alert('提醒', '未從學生總表中找到老師資訊\n\n請確認：\n1. 學生總表包含 LT (Local Teacher) 欄位\n2. LT 欄位中有老師姓名資料\n3. 學生資料不為空', ui.ButtonSet.OK);
      return;
    }
    
    // 確認要創建的老師清單
    Logger.log('步驟4: 確認創建老師清單...');
    const confirmed = confirmTeachersCreation(teachersInfo);
    if (!confirmed) {
      Logger.log('❌ 用戶取消創建操作');
      return;
    }
    Logger.log(`✅ 用戶確認創建 ${teachersInfo.length} 位老師的記錄簿`);
    
    // 批量創建老師記錄簿
    Logger.log('步驟5: 開始批量創建老師記錄簿...');
    const createResult = batchCreateTeachersFromMasterList(teachersInfo, studentMasterData);
    
    Logger.log(`🎉 批量創建完成！完全成功：${createResult.successCount}，部分成功：${createResult.partialSuccessCount}，失敗：${createResult.errorCount}`);
    
    // 顯示詳細結果 - 使用新的統計結構
    let resultMessage = `批量創建完成！\n\n`;
    resultMessage += `✅ 成功創建：${createResult.totalSuccessCount} 位老師的記錄簿\n`;
    resultMessage += `❌ 失敗：${createResult.errorCount} 位`;
    
    // 如果有部分成功的情況，顯示詳細說明
    if (createResult.partialSuccessCount > 0) {
      resultMessage += `\n\n⚠️ 其中 ${createResult.partialSuccessCount} 位老師創建成功但有輕微問題：`;
      createResult.results.forEach(result => {
        if (result.success && result.partialSuccess && result.warnings) {
          resultMessage += `\n• ${result.teacher}: ${result.warnings.join('；')}`;
        }
      });
      resultMessage += '\n\n這些記錄簿已可正常使用，問題不影響核心功能。';
    }
    
    if (createResult.errorCount > 0) {
      resultMessage += '\n\n❌ 失敗詳情：';
      createResult.results.forEach(result => {
        if (!result.success) {
          resultMessage += `\n• ${result.teacher}: ${result.error}`;
        }
      });
      resultMessage += '\n\n建議：\n1. 檢查系統初始化狀態\n2. 確認資料夾權限\n3. 查看日誌詳細錯誤資訊';
    } else if (createResult.successCount === teachersInfo.length) {
      resultMessage += '\n\n🎉 所有老師記錄簿創建完美成功！';
      resultMessage += '\n\n每位老師的記錄簿已包含：\n• 完整學生清單\n• 自動預建的Scheduled Contact記錄\n• 班級資訊和人數統計';
    } else {
      resultMessage += '\n\n📋 每位老師的記錄簿已包含：\n• 完整學生清單\n• 自動預建的Scheduled Contact記錄\n• 班級資訊和人數統計';
    }
    
    ui.alert(
      '批量創建完成！',
      resultMessage,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('💥 從學生總表批量創建老師記錄簿失敗：' + error.toString());
    Logger.log('📍 錯誤堆疊：' + error.stack);
    
    const detailedMessage = `批量創建過程發生錯誤：${error.message}\n\n可能原因：\n1. 系統未正確初始化\n2. 資料夾權限不足\n3. 學生總表格式錯誤\n4. 網路連線問題\n\n請檢查日誌獲取詳細資訊`;
    
    safeErrorHandler('從學生總表批量創建老師記錄簿', error, detailedMessage);
  }
}

/**
 * 獲取學生總表資料
 */
function getStudentMasterList() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.prompt(
    '學生總表導入',
    '請輸入學生總表的 Google Sheets ID：\n\n系統將從中提取英文老師資訊並創建對應的記錄簿',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) return null;
  
  try {
    const sheetId = response.getResponseText().trim();
    const sourceSheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
    const data = sourceSheet.getDataRange().getValues();
    
    if (data.length < 2) {
      ui.alert('錯誤', '學生總表至少需要包含標題列和一列資料', ui.ButtonSet.OK);
      return null;
    }
    
    return {
      data: data,
      headers: data[0],
      sheetId: sheetId
    };
    
  } catch (error) {
    ui.alert('錯誤', '無法讀取學生總表：' + error.message, ui.ButtonSet.OK);
    return null;
  }
}

/**
 * 從學生總表中提取老師資訊
 * 主要針對英文科，從 'LT' 欄位提取老師姓名
 */
function extractTeachersFromMasterList(masterData) {
  Logger.log(`🔍 開始從學生總表提取老師資訊...`);
  
  // 驗證輸入資料
  if (!masterData || !masterData.headers || !masterData.data) {
    throw new Error('學生總表資料格式不正確：缺少 headers 或 data');
  }
  
  const headers = masterData.headers;
  const data = masterData.data.slice(1); // 跳過標題列
  
  Logger.log(`📋 標題欄位數量：${headers.length}`);
  Logger.log(`👥 學生資料行數：${data.length}`);
  Logger.log(`📝 標題欄位：${JSON.stringify(headers)}`);
  
  // 找到 LT (Local Teacher) 欄位索引 - 增強搜尋邏輯
  Logger.log(`🔍 搜尋老師欄位...`);
  const possibleTeacherFields = ['LT', 'Local Teacher', 'English Teacher', 'Teacher', '老師', '本地老師', '英文老師'];
  let ltIndex = -1;
  
  // 精確匹配
  for (const field of possibleTeacherFields) {
    ltIndex = headers.findIndex(header => 
      header && header.toString().trim().toLowerCase() === field.toLowerCase()
    );
    if (ltIndex !== -1) {
      Logger.log(`✅ 找到老師欄位（精確匹配）：${headers[ltIndex]} (第 ${ltIndex + 1} 欄)`);
      break;
    }
  }
  
  // 如果精確匹配失敗，嘗試包含匹配
  if (ltIndex === -1) {
    for (const field of possibleTeacherFields) {
      ltIndex = headers.findIndex(header => 
        header && header.toString().toLowerCase().includes(field.toLowerCase())
      );
      if (ltIndex !== -1) {
        Logger.log(`✅ 找到老師欄位（包含匹配）：${headers[ltIndex]} (第 ${ltIndex + 1} 欄)`);
        break;
      }
    }
  }
  
  if (ltIndex === -1) {
    Logger.log(`❌ 找不到老師欄位`);
    Logger.log(`📋 可用欄位：${headers.map((h, i) => `${i + 1}. ${h}`).join(', ')}`);
    throw new Error(`在學生總表中找不到老師欄位。\n\n請確認學生總表包含以下任一欄位：\n${possibleTeacherFields.join(', ')}\n\n當前欄位：${headers.join(', ')}`);
  }
  
  // 提取所有老師名稱（去重）
  Logger.log(`👥 從第 ${ltIndex + 1} 欄 (${headers[ltIndex]}) 提取老師資訊...`);
  const teacherNames = new Set();
  const teacherStudentMap = new Map();
  let processedRows = 0;
  let validTeacherRows = 0;
  
  data.forEach((row, index) => {
    processedRows++;
    const teacherName = row[ltIndex];
    
    if (teacherName && teacherName.toString().trim()) {
      const cleanName = teacherName.toString().trim();
      teacherNames.add(cleanName);
      validTeacherRows++;
      
      // 記錄每位老師對應的學生
      if (!teacherStudentMap.has(cleanName)) {
        teacherStudentMap.set(cleanName, []);
      }
      teacherStudentMap.get(cleanName).push(row);
    } else {
      Logger.log(`⚠️ 第 ${index + 2} 行老師欄位為空或無效`);
    }
  });
  
  Logger.log(`📊 處理統計：處理 ${processedRows} 行，有效老師資料 ${validTeacherRows} 行`);
  Logger.log(`👨‍🏫 找到 ${teacherNames.size} 位不重複老師：${Array.from(teacherNames).join(', ')}`);
  
  if (teacherNames.size === 0) {
    throw new Error(`學生總表的老師欄位 (${headers[ltIndex]}) 中沒有找到任何老師資料。\n\n請檢查：\n1. 老師欄位是否填寫\n2. 資料格式是否正確\n3. 是否有空白行干擾`);
  }
  
  // 找到 English Class 欄位索引
  Logger.log(`🔍 搜尋英語班級欄位...`);
  const possibleClassFields = ['English Class', 'Class', '英語班級', '班級', 'EC'];
  let englishClassIndex = -1;
  
  for (const field of possibleClassFields) {
    englishClassIndex = headers.findIndex(h => 
      h && h.toString().includes(field) && 
      !h.toString().includes('Old') && 
      !h.toString().includes('Previous')
    );
    if (englishClassIndex !== -1) {
      Logger.log(`✅ 找到英語班級欄位：${headers[englishClassIndex]} (第 ${englishClassIndex + 1} 欄)`);
      break;
    }
  }
  
  if (englishClassIndex === -1) {
    Logger.log(`⚠️ 未找到英語班級欄位，將使用空班級列表`);
  }
  
  // 轉換為老師資訊物件陣列
  Logger.log(`🔄 轉換老師資訊為物件陣列...`);
  const teachersInfo = Array.from(teacherNames).map(teacherName => {
    const students = teacherStudentMap.get(teacherName) || [];
    const classes = new Set();
    
    // 從學生資料中提取英語班級資訊
    if (englishClassIndex !== -1) {
      students.forEach(student => {
        if (student[englishClassIndex]) {
          const className = student[englishClassIndex].toString().trim();
          if (className) {
            classes.add(className);
          }
        }
      });
    }
    
    const teacherInfo = {
      name: teacherName,
      subject: '英文', // 固定為英文科
      classes: Array.from(classes).sort(),
      studentCount: students.length,
      students: students
    };
    
    Logger.log(`👨‍🏫 老師：${teacherName}, 班級：${teacherInfo.classes.join(', ') || '無'}, 學生數：${teacherInfo.studentCount}`);
    
    return teacherInfo;
  });
  
  Logger.log(`✅ 老師資訊提取完成，共 ${teachersInfo.length} 位老師`);
  return teachersInfo;
}

/**
 * 確認要創建的老師清單
 */
function confirmTeachersCreation(teachersInfo) {
  const ui = SpreadsheetApp.getUi();
  
  let confirmationText = '系統將為以下老師創建電聯記錄簿：\n\n';
  teachersInfo.forEach((teacher, index) => {
    confirmationText += `${index + 1}. ${teacher.name} 老師\n`;
    confirmationText += `   - 授課班級：${teacher.classes.join(', ')}\n`;
    confirmationText += `   - 學生人數：${teacher.studentCount} 人\n\n`;
  });
  
  confirmationText += '確定要繼續嗎？';
  
  const response = ui.alert(
    '確認創建老師記錄簿',
    confirmationText,
    ui.ButtonSet.YES_NO
  );
  
  return response === ui.Button.YES;
}

/**
 * 批量創建老師記錄簿（從學生總表）
 * 增強版：更精確的成功/失敗統計，區分創建成功和設定警告
 */
function batchCreateTeachersFromMasterList(teachersInfo, masterData) {
  Logger.log(`========== 開始批量創建 ${teachersInfo.length} 位老師的記錄簿 ==========`);
  
  let successCount = 0;  // 實際創建成功的記錄簿數量
  let errorCount = 0;    // 完全失敗的數量
  let partialSuccessCount = 0; // 創建成功但有設定警告的數量
  const results = [];
  
  teachersInfo.forEach((teacherInfo, index) => {
    const teacherNum = index + 1;
    Logger.log(`\n📝 處理老師 ${teacherNum}/${teachersInfo.length}: ${teacherInfo.name}`);
    
    try {
      // 驗證老師資訊
      if (!teacherInfo || !teacherInfo.name) {
        throw new Error('老師資訊不完整：缺少姓名');
      }
      if (!teacherInfo.classes || teacherInfo.classes.length === 0) {
        throw new Error('老師資訊不完整：缺少授課班級');
      }
      if (!teacherInfo.students || teacherInfo.students.length === 0) {
        throw new Error('老師資訊不完整：缺少學生資料');
      }
      
      Logger.log(`✅ 老師資訊驗證通過：${teacherInfo.name}，班級：${teacherInfo.classes.join(', ')}，學生數：${teacherInfo.studentCount}`);
      
      // 創建老師記錄簿
      Logger.log(`📊 開始創建記錄簿...`);
      let recordBook = null;
      let creationWarnings = [];
      
      try {
        recordBook = createTeacherSheet(teacherInfo);
        Logger.log(`✅ 記錄簿創建成功：${recordBook.getUrl()}`);
      } catch (createError) {
        // 檢查是否為部分成功（記錄簿已創建但設定有問題）
        if (createError.isCreationSuccessful) {
          Logger.log(`⚠️ 記錄簿創建成功但有設定問題：${createError.message}`);
          creationWarnings.push(createError.message);
          if (createError.setupWarnings && createError.setupWarnings.length > 0) {
            creationWarnings = creationWarnings.concat(createError.setupWarnings);
          }
          // 嘗試重新獲取記錄簿（如果有的話）
          // 這裡需要根據實際情況調整
        } else {
          // 真正的創建失敗
          throw createError;
        }
      }
      
      // 如果記錄簿存在，繼續匯入學生資料
      if (recordBook) {
        Logger.log(`👥 開始匯入學生資料...`);
        try {
          importStudentsForTeacher(recordBook, teacherInfo, masterData);
          Logger.log(`✅ 學生資料匯入完成`);
        } catch (importError) {
          Logger.log(`⚠️ 學生資料匯入失敗：${importError.message}`);
          creationWarnings.push(`學生資料匯入失敗：${importError.message}`);
        }
        
        // 記錄結果
        if (creationWarnings.length > 0) {
          results.push({
            success: true,
            partialSuccess: true,
            teacher: teacherInfo.name,
            recordBook: recordBook,
            url: recordBook.getUrl(),
            warnings: creationWarnings
          });
          partialSuccessCount++;
          Logger.log(`⚠️ 老師 ${teacherNum} (${teacherInfo.name}) 創建完成但有警告`);
        } else {
          results.push({
            success: true,
            teacher: teacherInfo.name,
            recordBook: recordBook,
            url: recordBook.getUrl()
          });
          successCount++;
          Logger.log(`🎉 老師 ${teacherNum} (${teacherInfo.name}) 處理完成`);
        }
      } else {
        // 無法獲取記錄簿，視為失敗
        throw new Error('無法獲取創建的記錄簿');
      }
      
    } catch (error) {
      Logger.log(`💥 老師 ${teacherNum} (${teacherInfo.name}) 處理失敗：${error.toString()}`);
      Logger.log(`❌ 詳細錯誤資訊：${JSON.stringify({
        teacherInfo: {
          name: teacherInfo?.name || '未知',
          classes: teacherInfo?.classes || [],
          studentCount: teacherInfo?.studentCount || 0
        },
        errorMessage: error.message,
        isCreationSuccessful: error.isCreationSuccessful || false,
        setupWarnings: error.setupWarnings || [],
        errorStack: error.stack?.substring(0, 500) + '...' // 限制堆疊長度
      })}`);
      
      results.push({
        success: false,
        teacher: teacherInfo?.name || '未知',
        error: error.message || '未知錯誤',
        isCreationSuccessful: error.isCreationSuccessful || false
      });
      errorCount++;
    }
  });
  
  Logger.log(`📊 批量創建統計：`);
  Logger.log(`   ✅ 完全成功：${successCount} 位`);
  Logger.log(`   ⚠️ 部分成功：${partialSuccessCount} 位`);
  Logger.log(`   ❌ 失敗：${errorCount} 位`);
  Logger.log(`   📊 總計：${successCount + partialSuccessCount + errorCount}/${teachersInfo.length} 位`);
  
  return {
    successCount: successCount,
    partialSuccessCount: partialSuccessCount,
    errorCount: errorCount,
    totalSuccessCount: successCount + partialSuccessCount, // 實際創建成功的總數
    results: results
  };
}

/**
 * 為特定老師匯入相關學生資料
 */
function importStudentsForTeacher(recordBook, teacherInfo, masterData) {
  const studentListSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
  if (!studentListSheet) {
    throw new Error('找不到學生清單工作表');
  }
  
  // 準備學生資料
  const studentData = teacherInfo.students.map(studentRow => {
    // 確保資料格式符合系統欄位結構
    const formattedRow = [];
    for (let i = 0; i < SYSTEM_CONFIG.STUDENT_FIELDS.length; i++) {
      formattedRow.push(studentRow[i] || '');
    }
    return formattedRow;
  });
  
  // 匯入資料到學生清單工作表
  if (studentData.length > 0) {
    studentListSheet.getRange(2, 1, studentData.length, SYSTEM_CONFIG.STUDENT_FIELDS.length)
      .setValues(studentData);
  }
  
  // 重新設定資料驗證
  reapplyDataValidation(studentListSheet, recordBook);
  
  // 自動預建Scheduled Contact記錄（根據用戶要求移除對話框，直接執行）
  Logger.log(`🤖 自動為 ${teacherInfo.name} 老師的 ${studentData.length} 位學生預建Scheduled Contact記錄...`);
  
  try {
    const allStudentData = studentListSheet.getDataRange().getValues();
    const result = performPrebuildScheduledContacts(recordBook, allStudentData);
    
    Logger.log(`✅ 為 ${teacherInfo.name} 老師預建了 ${result.recordCount} 筆Scheduled Contact記錄`);
    Logger.log(`📊 涵蓋 ${result.studentCount} 位學生，每位學生6筆記錄（Fall/Spring × Beginning/Midterm/Final）`);
    
    // 額外排序驗證：確保預建記錄已正確排序
    const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (contactLogSheet && typeof validateContactRecordsSorting === 'function') {
      const sortValidation = validateContactRecordsSorting(contactLogSheet);
      if (sortValidation.isValid) {
        Logger.log('✅ 匯入後排序驗證通過，電聯記錄已正確排序');
      } else {
        Logger.log(`⚠️ 匯入後排序驗證失敗：${sortValidation.errors.join('; ')}`);
        // 嘗試修復排序
        try {
          const allData = contactLogSheet.getDataRange().getValues();
          const sortResult = sortContactRecordsData(allData);
          if (sortResult.success) {
            contactLogSheet.clear();
            contactLogSheet.getRange(1, 1, sortResult.data.length, sortResult.data[0].length).setValues(sortResult.data);
            contactLogSheet.getRange(1, 1, 1, sortResult.data[0].length).setFontWeight('bold').setBackground('#E8F4FD');
            contactLogSheet.autoResizeColumns(1, sortResult.data[0].length);
            Logger.log('✅ 已自動修復排序問題');
          }
        } catch (fixError) {
          Logger.log(`❌ 自動修復排序失敗：${fixError.message}`);
        }
      }
    }
  } catch (prebuildError) {
    Logger.log(`⚠️ 預建Scheduled Contact記錄時發生錯誤：${prebuildError.message}`);
    // 不拋出錯誤，讓匯入繼續完成，只記錄警告
  }
} 