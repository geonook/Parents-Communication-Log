/**
 * 老師管理模組
 * 負責老師記錄簿的創建、班級學生資料管理
 */

/**
 * 創建單一老師的電聯記錄簿
 */
function createTeacherRecordBook() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 獲取老師資訊
    const teacherInfo = getTeacherInfoFromUser();
    if (!teacherInfo) return;
    
    // 創建記錄簿
    const recordBook = createTeacherSheet(teacherInfo);
    
    ui.alert(
      '建立成功！', 
      `${teacherInfo.name} 老師的電聯記錄簿已建立完成！\n\n檔案連結：${recordBook.getUrl()}`, 
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('創建老師記錄簿失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '創建失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 批次創建多位老師的記錄簿
 */
function batchCreateTeacherBooks() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 讓用戶選擇包含老師資料的檔案
    const response = ui.prompt(
      '批次建立',
      '請輸入包含老師資料的試算表 ID：\n(格式：老師姓名、班級)\n註：系統將自動設定科目為「英文」',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() !== ui.Button.OK) return;
    
    const teachersData = getTeachersDataFromSheet(response.getResponseText());
    if (!teachersData || teachersData.length === 0) {
      ui.alert('錯誤', '無法讀取老師資料，請檢查檔案格式', ui.ButtonSet.OK);
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    teachersData.forEach(teacherInfo => {
      try {
        createTeacherSheet(teacherInfo);
        successCount++;
      } catch (error) {
        Logger.log(`創建 ${teacherInfo.name} 記錄簿失敗：` + error.toString());
        errorCount++;
      }
    });
    
    ui.alert(
      '批次建立完成',
      `成功建立：${successCount} 個記錄簿\n失敗：${errorCount} 個記錄簿`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('批次創建失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '批次創建失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 從用戶輸入獲取老師資訊
 */
function getTeacherInfoFromUser() {
  const ui = SpreadsheetApp.getUi();
  
  // 獲取老師姓名
  const nameResponse = ui.prompt('老師資訊', '請輸入老師姓名：', ui.ButtonSet.OK_CANCEL);
  if (nameResponse.getSelectedButton() !== ui.Button.OK) return null;
  
  // 固定為英文科，不需要用戶輸入
  const subject = '英文';
  
  // 獲取班級
  const classResponse = ui.prompt('老師資訊', '請輸入授課班級（用逗號分隔）：\n例如：101,102,103', ui.ButtonSet.OK_CANCEL);
  if (classResponse.getSelectedButton() !== ui.Button.OK) return null;
  
  return {
    name: nameResponse.getResponseText().trim(),
    subject: subject,
    classes: classResponse.getResponseText().split(',').map(c => c.trim()).filter(c => c.length > 0)
  };
}

/**
 * 從試算表讀取老師資料
 */
function getTeachersDataFromSheet(sheetId) {
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    // 跳過標題行，固定科目為英文
    return data.slice(1).map(row => ({
      name: row[0] || '',
      subject: '英文', // 固定為英文科
      classes: (row[1] || '').split(',').map(c => c.trim()).filter(c => c.length > 0) // 第二欄為班級，第一欄科目已移除
    })).filter(teacher => teacher.name && teacher.classes.length > 0);
    
  } catch (error) {
    Logger.log('讀取老師資料失敗：' + error.toString());
    return null;
  }
}

/**
 * 創建老師的電聯記錄簿
 */
function createTeacherSheet(teacherInfo) {
  // 取得系統資料夾
  const mainFolder = getSystemMainFolder();
  const teachersFolder = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME).next();
  
  // 創建老師專屬資料夾
  const teacherFolderName = `${teacherInfo.name}_${new Date().getFullYear()}學年`;
  let teacherFolder;
  const existingTeacherFolder = teachersFolder.getFoldersByName(teacherFolderName);
  if (existingTeacherFolder.hasNext()) {
    teacherFolder = existingTeacherFolder.next();
  } else {
    teacherFolder = teachersFolder.createFolder(teacherFolderName);
  }
  
  // 創建記錄簿檔案
  const fileName = SYSTEM_CONFIG.TEACHER_SHEET_NAME_FORMAT
    .replace('{teacherName}', teacherInfo.name)
    .replace('{year}', new Date().getFullYear().toString());
  
  const recordBook = SpreadsheetApp.create(fileName);
  const recordFile = DriveApp.getFileById(recordBook.getId());
  
  // 移動到老師資料夾
  teacherFolder.addFile(recordFile);
  DriveApp.getRootFolder().removeFile(recordFile);
  
  // 設定記錄簿內容
  setupTeacherRecordBook(recordBook, teacherInfo);
  
  return recordBook;
}

/**
 * 設定老師記錄簿的內容結構
 */
function setupTeacherRecordBook(recordBook, teacherInfo) {
  // 刪除預設工作表
  const defaultSheet = recordBook.getActiveSheet();
  
  // 創建各個工作表
  createSummarySheet(recordBook, teacherInfo);
  createClassInfoSheet(recordBook, teacherInfo);
  createStudentListSheet(recordBook, teacherInfo);
  createContactLogSheet(recordBook, teacherInfo);
  createProgressSheet(recordBook, teacherInfo);
  
  // 刪除預設工作表
  if (recordBook.getSheets().length > 1) {
    recordBook.deleteSheet(defaultSheet);
  }
  
  // 設定記錄簿為第一個工作表
  recordBook.setActiveSheet(recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY));
}

/**
 * 創建總覽工作表
 */
function createSummarySheet(recordBook, teacherInfo) {
  const sheet = recordBook.insertSheet(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
  
  // 設定標題
  sheet.getRange('A1').setValue(`${teacherInfo.name} 老師電聯記錄簿`);
  sheet.getRange('A1').setFontSize(18).setFontWeight('bold');
  
  // 基本資訊
  const infoData = [
    ['老師姓名', teacherInfo.name],
    ['任教科目', teacherInfo.subject],
    ['授課班級', teacherInfo.classes.join(', ')],
    ['建立日期', new Date().toLocaleDateString()],
    ['學年度', `${new Date().getFullYear()}學年`]
  ];
  
  sheet.getRange(3, 1, infoData.length, 2).setValues(infoData);
  
  // 統計資訊區域
  sheet.getRange('A10').setValue('電聯統計');
  sheet.getRange('A10').setFontSize(14).setFontWeight('bold');
  
  const statsHeaders = [['班級', '學生人數', '學期電聯次數', '總電聯次數', '最後聯繫日期']];
  sheet.getRange(11, 1, 1, statsHeaders[0].length).setValues(statsHeaders);
  
  // 為每個班級創建統計行
  teacherInfo.classes.forEach((className, index) => {
    const row = 12 + index;
    sheet.getRange(row, 1).setValue(className);
    // 這些數值將由其他函數動態更新
    sheet.getRange(row, 2).setFormula(`=COUNTA(INDIRECT("學生清單!A:A"))-1`);
  });
  
  // 格式設定
  sheet.getRange('A1:E20').setHorizontalAlignment('left');
  sheet.getRange(11, 1, 1, statsHeaders[0].length).setFontWeight('bold').setBackground('#E8F4FD');
  
  // 調整欄寬
  sheet.autoResizeColumns(1, 5);
}

/**
 * 創建班級資訊工作表
 */
function createClassInfoSheet(recordBook, teacherInfo) {
  const sheet = recordBook.insertSheet(SYSTEM_CONFIG.SHEET_NAMES.CLASS_INFO);
  
  // 設定標題
  const headers = [['班級', '班導師', '班級人數', '班級特殊情況說明', '最後更新日期']];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  
  // 為每個班級創建資料行
  teacherInfo.classes.forEach((className, index) => {
    const row = 2 + index;
    sheet.getRange(row, 1).setValue(className);
    sheet.getRange(row, 5).setValue(new Date().toLocaleDateString());
  });
  
  // 格式設定
  sheet.getRange(1, 1, 1, headers[0].length).setFontWeight('bold').setBackground('#E8F4FD');
  sheet.autoResizeColumns(1, headers[0].length);
}

/**
 * 創建學生清單工作表
 */
function createStudentListSheet(recordBook, teacherInfo) {
  const sheet = recordBook.insertSheet(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
  
  // 設定標題 - 根據用戶的學生總表格式
  sheet.getRange(1, 1, 1, SYSTEM_CONFIG.STUDENT_FIELDS.length).setValues([SYSTEM_CONFIG.STUDENT_FIELDS]);
  
  // 格式設定
  sheet.getRange(1, 1, 1, SYSTEM_CONFIG.STUDENT_FIELDS.length).setFontWeight('bold').setBackground('#E8F4FD');
  sheet.autoResizeColumns(1, SYSTEM_CONFIG.STUDENT_FIELDS.length);
  
  // English Class 英語班級下拉選單（第10欄）
  const englishClassRange = sheet.getRange('J2:J1000'); // English Class 是第10欄
  const englishClassValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(teacherInfo.classes)
    .setAllowInvalid(false)
    .build();
  englishClassRange.setDataValidation(englishClassValidation);
  
  // Grade 下拉選單（第2欄）
  const gradeRange = sheet.getRange('B2:B1000'); 
  const gradeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(SYSTEM_CONFIG.GRADE_LEVELS)  // 使用 G1-G6
    .setAllowInvalid(false)
    .build();
  gradeRange.setDataValidation(gradeValidation);
  
  // 設定保護範圍（標題行）
  const protection = sheet.getRange(1, 1, 1, SYSTEM_CONFIG.STUDENT_FIELDS.length).protect();
  protection.setDescription('標題行保護');
}

/**
 * 創建電聯記錄工作表
 */
function createContactLogSheet(recordBook, teacherInfo) {
  const sheet = recordBook.insertSheet(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
  
  // 設定標題
  sheet.getRange(1, 1, 1, SYSTEM_CONFIG.CONTACT_FIELDS.length).setValues([SYSTEM_CONFIG.CONTACT_FIELDS]);
  
  // 格式設定
  sheet.getRange(1, 1, 1, SYSTEM_CONFIG.CONTACT_FIELDS.length).setFontWeight('bold').setBackground('#E8F4FD');
  sheet.autoResizeColumns(1, SYSTEM_CONFIG.CONTACT_FIELDS.length);
  
  // 設定資料驗證
  setupContactLogValidations(sheet, teacherInfo);
  
  // 設定條件式格式（狀態欄位）
  setupContactLogConditionalFormatting(sheet);
}

/**
 * 創建進度追蹤工作表
 */
function createProgressSheet(recordBook, teacherInfo) {
  const sheet = recordBook.insertSheet(SYSTEM_CONFIG.SHEET_NAMES.PROGRESS);
  
  // 設定標題
  sheet.getRange('A1').setValue('電聯進度追蹤 (學期制)');
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  
  // 說明文字
  sheet.getRange('A2').setValue('追蹤每個學期term的學期電聯完成情況');
  sheet.getRange('A2').setFontStyle('italic').setFontColor('#666666');
  
  // 學期制統計表
  const semesterHeaders = ['學期', 'Term', '學生總數', '已完成電聯', '完成率', '狀態', '備註'];
  sheet.getRange(4, 1, 1, semesterHeaders.length).setValues([semesterHeaders]);
  
  // 建立學期和term的組合
  const semesterTerms = [];
  SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.forEach(semester => {
    SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.forEach(term => {
      semesterTerms.push({ semester, term });
    });
  });
  
  // 填入學期term組合
  semesterTerms.forEach((st, index) => {
    const row = 5 + index;
    sheet.getRange(row, 1).setValue(st.semester);
    sheet.getRange(row, 2).setValue(st.term);
    sheet.getRange(row, 3).setValue(teacherInfo.studentCount || 0); // 學生總數
    sheet.getRange(row, 4).setValue(0); // 已完成電聯（將通過公式計算）
    sheet.getRange(row, 5).setValue('0%'); // 完成率（將通過公式計算）
    sheet.getRange(row, 6).setValue('待開始'); // 狀態
    
    // 如果是當前學期term，特別標示
    if (st.semester === SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER && 
        st.term === SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM) {
      sheet.getRange(row, 7).setValue('← 當前Term');
      sheet.getRange(row, 1, 1, 7).setBackground('#FFF3E0'); // 淺橙色背景
    }
  });
  
  // 新增學年總結區域
  const summaryStartRow = 5 + semesterTerms.length + 2;
  sheet.getRange(summaryStartRow, 1).setValue('學年總結');
  sheet.getRange(summaryStartRow, 1).setFontSize(14).setFontWeight('bold');
  
  const summaryHeaders = ['項目', '數值'];
  sheet.getRange(summaryStartRow + 1, 1, 1, summaryHeaders.length).setValues([summaryHeaders]);
  
  const summaryData = [
    ['總學生數', teacherInfo.studentCount || 0],
    ['授課班級', teacherInfo.classes.join(', ')],
    ['學期電聯總次數', '=SUMIF(電聯記錄.H:H,"學期電聯",電聯記錄.H:H)'],
    ['平均每學期完成率', '待計算']
  ];
  
  sheet.getRange(summaryStartRow + 2, 1, summaryData.length, 2).setValues(summaryData);
  
  // 格式設定
  sheet.getRange(4, 1, 1, semesterHeaders.length).setFontWeight('bold').setBackground('#E8F4FD');
  sheet.getRange(summaryStartRow + 1, 1, 1, summaryHeaders.length).setFontWeight('bold').setBackground('#E8F5E8');
  sheet.autoResizeColumns(1, Math.max(semesterHeaders.length, summaryHeaders.length));
  
  // 設定條件式格式
  setupProgressSheetConditionalFormatting(sheet, 5, 5 + semesterTerms.length - 1);
}

/**
 * 設定進度追蹤工作表的條件式格式
 */
function setupProgressSheetConditionalFormatting(sheet, startRow, endRow) {
  // 狀態欄位的條件式格式（第6欄）
  const statusRange = sheet.getRange(startRow, 6, endRow - startRow + 1, 1);
  
  // 已完成 - 綠色
  const completedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('已完成')
    .setBackground('#D4EDDA')
    .setFontColor('#155724')
    .setRanges([statusRange])
    .build();
  
  // 進行中 - 黃色
  const inProgressRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('進行中')
    .setBackground('#FFF3CD')
    .setFontColor('#856404')
    .setRanges([statusRange])
    .build();
  
  // 待開始 - 灰色
  const pendingRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('待開始')
    .setBackground('#E2E3E5')
    .setFontColor('#6C757D')
    .setRanges([statusRange])
    .build();
  
  // 完成率欄位的條件式格式（第5欄）
  const progressRange = sheet.getRange(startRow, 5, endRow - startRow + 1, 1);
  
  // 100% - 深綠色
  const perfectRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('100%')
    .setBackground('#28A745')
    .setFontColor('white')
    .setRanges([progressRange])
    .build();
  
  sheet.setConditionalFormatRules([completedRule, inProgressRule, pendingRule, perfectRule]);
}

/**
 * 設定電聯記錄的資料驗證
 */
function setupContactLogValidations(sheet, teacherInfo) {
  // 學期制版本 - 新的11欄位格式
  // CONTACT_FIELDS: ['Student ID', 'Name', 'English Name', 'English Class', 'Date', 
  //                  'Semester', 'Term', 'Contact Type', 'Teachers Content', 'Parents Responses', 'Contact Method']
  
  // English Class 英語班級下拉選單 (第4欄)
  const englishClassRange = sheet.getRange('D2:D1000');
  const englishClassValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(teacherInfo.classes)
    .setAllowInvalid(false)
    .setHelpText('請選擇英語授課班級')
    .build();
  englishClassRange.setDataValidation(englishClassValidation);
  
  // Date 日期格式驗證 (第5欄)
  const dateRange = sheet.getRange('E2:E1000');
  const dateValidation = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(false)
    .build();
  dateRange.setDataValidation(dateValidation);
  
  // Semester 學期下拉選單 (第6欄)
  const semesterRange = sheet.getRange('F2:F1000');
  const semesterValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS)
    .setAllowInvalid(false)
    .setHelpText('請選擇學期 (Fall/Spring)')
    .build();
  semesterRange.setDataValidation(semesterValidation);
  
  // Term 學期階段下拉選單 (第7欄)
  const termRange = sheet.getRange('G2:G1000');
  const termValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS)
    .setAllowInvalid(false)
    .setHelpText('請選擇學期階段 (Beginning/Midterm/Final)')
    .build();
  termRange.setDataValidation(termValidation);
  
  // Contact Type 電聯類型下拉選單 (第8欄)
  const contactTypeRange = sheet.getRange('H2:H1000');
  const contactTypeOptions = [
    SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER,
    SYSTEM_CONFIG.CONTACT_TYPES.REGULAR,
    SYSTEM_CONFIG.CONTACT_TYPES.SPECIAL
  ];
  const contactTypeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(contactTypeOptions)
    .setAllowInvalid(false)
    .setHelpText('請選擇電聯類型')
    .build();
  contactTypeRange.setDataValidation(contactTypeValidation);
  
  // Contact Method 聯絡方式下拉選單 (第11欄) - 使用新的系統設定
  const contactMethodRange = sheet.getRange('K2:K1000');
  const contactMethodValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(SYSTEM_CONFIG.CONTACT_METHODS)
    .setAllowInvalid(false)
    .setHelpText('請選擇聯絡方式')
    .build();
  contactMethodRange.setDataValidation(contactMethodValidation);
  
  // Student ID 從學生清單自動填入 (可選功能)
  // Name 從學生清單自動填入 (可選功能)
  // English Name 從學生清單自動填入 (可選功能)
}

/**
 * 設定電聯記錄的條件式格式
 */
function setupContactLogConditionalFormatting(sheet) {
  // 學期制版本 - 更新條件式格式
  
  // Contact Type 電聯類型的條件式格式 (第8欄)
  const contactTypeRange = sheet.getRange('H2:H1000');
  
  // 學期電聯 - 綠色（重要）
  const semesterContactRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER)
    .setBackground('#D4EDDA')
    .setRanges([contactTypeRange])
    .build();
  
  // 平時電聯 - 藍色
  const regularContactRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(SYSTEM_CONFIG.CONTACT_TYPES.REGULAR)
    .setBackground('#D1ECF1')
    .setRanges([contactTypeRange])
    .build();
  
  // 特殊狀況電聯 - 黃色
  const specialContactRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(SYSTEM_CONFIG.CONTACT_TYPES.SPECIAL)
    .setBackground('#FFF3CD')
    .setRanges([contactTypeRange])
    .build();
  
  // Contact Method 聯絡方式的條件式格式 (第11欄)
  const contactMethodRange = sheet.getRange('K2:K1000');
  
  // Phone Call - 淺藍色
  const phoneRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Phone Call')
    .setBackground('#E3F2FD')
    .setRanges([contactMethodRange])
    .build();
  
  // Line - 淺綠色
  const lineRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Line')
    .setBackground('#E8F5E8')
    .setRanges([contactMethodRange])
    .build();
  
  // Email - 淺橙色
  const emailRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Email')
    .setBackground('#FFF3E0')
    .setRanges([contactMethodRange])
    .build();
  
  // 設定 Teachers Content 和 Parents Responses 欄位的文字換行（第9、10欄）
  const teachersContentRange = sheet.getRange('I2:I1000');
  const parentsResponseRange = sheet.getRange('J2:J1000');
  
  teachersContentRange.setWrap(true);
  parentsResponseRange.setWrap(true);
  
  sheet.setConditionalFormatRules([
    semesterContactRule, regularContactRule, specialContactRule,
    phoneRule, lineRule, emailRule
  ]);
}

/**
 * 取得系統主資料夾
 * 如果有指定 MAIN_FOLDER_ID，優先使用該資料夾，否則按名稱搜尋
 */
function getSystemMainFolder() {
  // 如果有指定資料夾 ID，優先使用
  if (SYSTEM_CONFIG.MAIN_FOLDER_ID) {
    try {
      return DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
    } catch (error) {
      Logger.log(`無法存取指定的資料夾 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}，嘗試按名稱搜尋`);
    }
  }
  
  // 按名稱搜尋資料夾
  const folders = DriveApp.getFoldersByName(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  
  throw new Error('系統資料夾不存在，請先執行系統初始化');
} 