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
    SpreadsheetApp.getUi().alert('錯誤', '匯入失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
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
    '請輸入包含學生資料的 Google Sheets ID：\n\n格式說明：\n第一列應為標題列，包含：ID, Grade, HR, Seat #, Chinese Name, English Name, 112 Level, 113 Level, English Class (Old), English Class, LT, Mother\'s Phone, Father\'s Phone',
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
    '', // English Class (Old)
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
    SpreadsheetApp.getUi().alert('錯誤', '匯出失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
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
    
    // 填入學生基本資料
    currentSheet.getRange(newRow, 1).setValue(selectedStudent[0]); // Student ID
    currentSheet.getRange(newRow, 2).setValue(selectedStudent[4]); // Chinese Name
    currentSheet.getRange(newRow, 3).setValue(selectedStudent[5]); // English Name
    currentSheet.getRange(newRow, 4).setValue(selectedStudent[2]); // HR
    currentSheet.getRange(newRow, 5).setValue(new Date());         // Date
    
    // 聚焦到 Teachers Content 欄位
    currentSheet.getRange(newRow, 6).activate();
    
    ui.alert('完成', '學生基本資料已填入，請繼續填寫聯繫內容', ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('從學生清單建立電聯記錄失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '操作失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 從學生總表提取老師資訊並批量創建記錄簿
 * 針對中師英文科的需求優化
 */
function createTeachersFromStudentMasterList() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 獲取學生總表
    const studentMasterData = getStudentMasterList();
    if (!studentMasterData) return;
    
    // 從學生總表中提取老師資訊
    const teachersInfo = extractTeachersFromMasterList(studentMasterData);
    if (!teachersInfo || teachersInfo.length === 0) {
      ui.alert('提醒', '未從學生總表中找到老師資訊', ui.ButtonSet.OK);
      return;
    }
    
    // 確認要創建的老師清單
    const confirmed = confirmTeachersCreation(teachersInfo);
    if (!confirmed) return;
    
    // 批量創建老師記錄簿
    const createResult = batchCreateTeachersFromMasterList(teachersInfo, studentMasterData);
    
    ui.alert(
      '批量創建完成！',
      `成功創建：${createResult.successCount} 位老師的記錄簿\n失敗：${createResult.errorCount} 位\n\n每位老師的記錄簿已包含相關學生資料`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('從學生總表批量創建老師記錄簿失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '創建失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
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
  const headers = masterData.headers;
  const data = masterData.data.slice(1); // 跳過標題列
  
  // 找到 LT (Language Teacher) 欄位索引
  const ltIndex = headers.findIndex(header => 
    header.toString().toLowerCase().includes('lt') || 
    header.toString().includes('Language Teacher') ||
    header.toString().includes('English Teacher')
  );
  
  if (ltIndex === -1) {
    throw new Error('在學生總表中找不到老師欄位 (LT/Language Teacher/English Teacher)');
  }
  
  // 提取所有老師名稱（去重）
  const teacherNames = new Set();
  const teacherStudentMap = new Map();
  
  data.forEach(row => {
    const teacherName = row[ltIndex];
    if (teacherName && teacherName.toString().trim()) {
      const cleanName = teacherName.toString().trim();
      teacherNames.add(cleanName);
      
      // 記錄每位老師對應的學生
      if (!teacherStudentMap.has(cleanName)) {
        teacherStudentMap.set(cleanName, []);
      }
      teacherStudentMap.get(cleanName).push(row);
    }
  });
  
  // 轉換為老師資訊物件陣列
  return Array.from(teacherNames).map(teacherName => {
    const students = teacherStudentMap.get(teacherName) || [];
    const classes = new Set();
    
    // 從學生資料中提取英語班級資訊（使用 English Class 欄位）
    students.forEach(student => {
      const englishClassIndex = headers.findIndex(h => 
        h.toString().includes('English Class') && 
        !h.toString().includes('Old')
      );
      if (englishClassIndex !== -1 && student[englishClassIndex]) {
        classes.add(student[englishClassIndex].toString().trim());
      }
    });
    
    return {
      name: teacherName,
      subject: '英文', // 固定為英文科
      classes: Array.from(classes).sort(),
      studentCount: students.length,
      students: students
    };
  });
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
 */
function batchCreateTeachersFromMasterList(teachersInfo, masterData) {
  let successCount = 0;
  let errorCount = 0;
  const results = [];
  
  teachersInfo.forEach(teacherInfo => {
    try {
      // 創建老師記錄簿
      const recordBook = createTeacherSheet(teacherInfo);
      
      // 匯入該老師的學生資料
      importStudentsForTeacher(recordBook, teacherInfo, masterData);
      
      results.push({
        success: true,
        teacher: teacherInfo.name,
        recordBook: recordBook
      });
      successCount++;
      
    } catch (error) {
      Logger.log(`創建 ${teacherInfo.name} 記錄簿失敗：` + error.toString());
      results.push({
        success: false,
        teacher: teacherInfo.name,
        error: error.message
      });
      errorCount++;
    }
  });
  
  return {
    successCount: successCount,
    errorCount: errorCount,
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
} 