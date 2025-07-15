/**
 * 老師管理模組
 * 負責老師記錄簿的創建、班級學生資料管理
 */

/**
 * 創建單一老師的電聯記錄簿
 */
function createTeacherRecordBook() {
  try {
    // Web環境兼容性檢查
    if (isWebEnvironment()) {
      Logger.log('Web環境：此功能需要在Google Sheets環境中執行');
      return;
    }
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
    safeErrorHandler('創建老師記錄簿', error);
  }
}

/**
 * 批次創建多位老師的記錄簿
 */
function batchCreateTeacherBooks() {
  try {
    // Web環境兼容性檢查
    if (isWebEnvironment()) {
      Logger.log('Web環境：此功能需要在Google Sheets環境中執行');
      return;
    }
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
    safeErrorHandler('批次創建老師記錄簿', error);
  }
}

/**
 * 從用戶輸入獲取老師資訊
 */
function getTeacherInfoFromUser() {
  if (isWebEnvironment()) {
    Logger.log('Web環境：無法獲取用戶輸入');
    return null;
  }
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
  
  // Grade 年級下拉選單（第2欄）- 強化版
  const gradeRange = sheet.getRange('B2:B1000'); 
  const gradeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(SYSTEM_CONFIG.GRADE_LEVELS)  // 使用 G1-G6
    .setAllowInvalid(false)
    .setHelpText('🎓 請選擇年級：G1-G6')
    .build();
  gradeRange.setDataValidation(gradeValidation);
  gradeRange.setBackground('#F0F8FF'); // 淺藍背景
  
  // English Class 英語班級下拉選單（第10欄）- 強化版
  const englishClassRange = sheet.getRange('J2:J1000'); // English Class 是第10欄
  const englishClassValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(teacherInfo.classes)
    .setAllowInvalid(false)
    .setHelpText('🎯 重要：請選擇正確的英語授課班級')
    .build();
  englishClassRange.setDataValidation(englishClassValidation);
  englishClassRange.setBackground('#E8F5E8'); // 淺綠背景標示重要性
  
  // LT (Language Teacher) 欄位提示（第11欄）
  const ltRange = sheet.getRange('K2:K1000');
  ltRange.setNote('👨‍🏫 語言老師姓名 - 用於系統識別授課老師');
  ltRange.setBackground('#FFF3E0'); // 淺橙背景
  
  // 電話欄位格式提示
  const motherPhoneRange = sheet.getRange('L2:L1000');
  const fatherPhoneRange = sheet.getRange('M2:M1000');
  motherPhoneRange.setNote('📞 母親電話，格式：0912-345-678');
  fatherPhoneRange.setNote('📞 父親電話，格式：0912-345-678');
  
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
  
  // 新增說明註解
  sheet.getRange('A2').setNote('💡 提示：學生資料匯入後，請使用「預建學期電聯記錄」功能自動為所有學生建立Academic Contact記錄');
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
    ['學期電聯總次數', '=SUMIF(電聯記錄.H:H,"Academic Contact",電聯記錄.H:H)'],
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
  // 學期制版本 - 強化的11欄位格式驗證
  // CONTACT_FIELDS: ['Student ID', 'Name', 'English Name', 'English Class', 'Date', 
  //                  'Semester', 'Term', 'Contact Type', 'Teachers Content', 'Parents Responses', 'Contact Method']
  
  // Student ID 學號格式提示 (第1欄)
  const studentIdRange = sheet.getRange('A2:A1000');
  studentIdRange.setNote('請輸入學生學號，建議從學生清單選擇以確保資料一致性');
  
  // Name 學生姓名提示 (第2欄)
  const nameRange = sheet.getRange('B2:B1000');
  nameRange.setNote('請輸入學生中文姓名，建議從學生清單選擇');
  
  // English Name 英文姓名提示 (第3欄)
  const englishNameRange = sheet.getRange('C2:C1000');
  englishNameRange.setNote('請輸入學生英文姓名，建議從學生清單選擇');
  
  // English Class 英語班級下拉選單 (第4欄) - 強化版
  const englishClassRange = sheet.getRange('D2:D1000');
  const englishClassValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(teacherInfo.classes)
    .setAllowInvalid(false)
    .setHelpText('🎯 必選：請選擇您授課的英語班級')
    .build();
  englishClassRange.setDataValidation(englishClassValidation);
  englishClassRange.setBackground('#E8F5E8'); // 淺綠背景標示重要欄位
  
  // Date 日期格式驗證 (第5欄) - 強化版
  const dateRange = sheet.getRange('E2:E1000');
  const dateValidation = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(false)
    .setHelpText('📅 請選擇電聯日期 (點擊日曆圖示)')
    .build();
  dateRange.setDataValidation(dateValidation);
  dateRange.setNumberFormat('yyyy/mm/dd'); // 統一日期格式
  
  // Semester 學期下拉選單 (第6欄) - 強化版
  const semesterRange = sheet.getRange('F2:F1000');
  const semesterValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS)
    .setAllowInvalid(false)
    .setHelpText('🏫 請選擇學期：Fall (上學期) / Spring (下學期)')
    .build();
  semesterRange.setDataValidation(semesterValidation);
  semesterRange.setBackground('#FFF3E0'); // 淺橙背景標示重要欄位
  
  // Term 學期階段下拉選單 (第7欄) - 強化版
  const termRange = sheet.getRange('G2:G1000');
  const termValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS)
    .setAllowInvalid(false)
    .setHelpText('📊 請選擇時期：Beginning (期初) / Midterm (期中) / Final (期末)')
    .build();
  termRange.setDataValidation(termValidation);
  termRange.setBackground('#FFF3E0'); // 淺橙背景標示重要欄位
  
  // Contact Type 電聯類型下拉選單 (第8欄) - 強化版
  const contactTypeRange = sheet.getRange('H2:H1000');
  const contactTypeOptions = [
    SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER,    // Academic Contact
    SYSTEM_CONFIG.CONTACT_TYPES.REGULAR,     // Regular Contact  
    SYSTEM_CONFIG.CONTACT_TYPES.SPECIAL      // Special Contact
  ];
  const contactTypeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(contactTypeOptions)
    .setAllowInvalid(false)
    .setHelpText('📞 電聯類型：Academic(學期電聯) / Regular(平時電聯) / Special(特殊電聯)')
    .build();
  contactTypeRange.setDataValidation(contactTypeValidation);
  contactTypeRange.setBackground('#E3F2FD'); // 淺藍背景標示重要欄位
  
  // Teachers Content 老師內容欄位設定 (第9欄)
  const teachersContentRange = sheet.getRange('I2:I1000');
  teachersContentRange.setWrap(true); // 自動換行
  teachersContentRange.setVerticalAlignment('top'); // 頂端對齊
  teachersContentRange.setNote('📝 請詳細記錄與家長的談話內容、學生狀況等重要資訊');
  
  // Parents Responses 家長回應欄位設定 (第10欄)
  const parentsResponseRange = sheet.getRange('J2:J1000');
  parentsResponseRange.setWrap(true); // 自動換行
  parentsResponseRange.setVerticalAlignment('top'); // 頂端對齊
  parentsResponseRange.setNote('💬 請記錄家長的回應、意見、後續配合事項等');
  
  // Contact Method 聯絡方式下拉選單 (第11欄) - 強化版
  const contactMethodRange = sheet.getRange('K2:K1000');
  const contactMethodValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(SYSTEM_CONFIG.CONTACT_METHODS)
    .setAllowInvalid(false)
    .setHelpText('📱 聯絡方式：Phone Call (電話) / Line (Line通訊) / Email (電子郵件)')
    .build();
  contactMethodRange.setDataValidation(contactMethodValidation);
  contactMethodRange.setBackground('#F3E5F5'); // 淺紫背景標示重要欄位
  
  // 設定欄寬最佳化
  sheet.setColumnWidth(1, 80);  // Student ID
  sheet.setColumnWidth(2, 100); // Name
  sheet.setColumnWidth(3, 120); // English Name
  sheet.setColumnWidth(4, 140); // English Class
  sheet.setColumnWidth(5, 100); // Date
  sheet.setColumnWidth(6, 80);  // Semester
  sheet.setColumnWidth(7, 90);  // Term
  sheet.setColumnWidth(8, 120); // Contact Type
  sheet.setColumnWidth(9, 250); // Teachers Content
  sheet.setColumnWidth(10, 250);// Parents Responses
  sheet.setColumnWidth(11, 120);// Contact Method
  
  // 凍結標題列
  sheet.setFrozenRows(1);
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
function getSystemMainFolder(strictMode = false) {
  // 如果有指定資料夾 ID，優先使用
  if (SYSTEM_CONFIG.MAIN_FOLDER_ID && SYSTEM_CONFIG.MAIN_FOLDER_ID.trim() !== '') {
    try {
      const folder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
      if (strictMode) {
        return validateSystemFolderStructure(folder);
      }
      return folder;
    } catch (error) {
      Logger.log(`無法存取指定的資料夾 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}，嘗試按名稱搜尋`);
    }
  }
  
  // 按名稱搜尋資料夾
  const folders = DriveApp.getFoldersByName(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
  if (folders.hasNext()) {
    const folder = folders.next();
    if (strictMode) {
      return validateSystemFolderStructure(folder);
    }
    return folder;
  }
  
  throw new Error('系統資料夾不存在，請先執行系統初始化');
}

/**
 * 驗證系統資料夾結構完整性
 * @param {Folder} folder - 要驗證的資料夾
 * @returns {Folder} - 如果驗證通過返回資料夾，否則拋出錯誤
 */
function validateSystemFolderStructure(folder) {
  const requiredSubfolders = [
    SYSTEM_CONFIG.TEACHERS_FOLDER_NAME,
    SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME,
    '系統備份',
    '進度報告'
  ];
  
  const missingFolders = [];
  const emptyFolders = [];
  
  // 檢查所有必要的子資料夾
  requiredSubfolders.forEach(folderName => {
    const subfolders = folder.getFoldersByName(folderName);
    if (!subfolders.hasNext()) {
      missingFolders.push(folderName);
    } else {
      const subfolder = subfolders.next();
      // 檢查特定資料夾是否包含預期內容
      if (folderName === SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME) {
        const templateFiles = subfolder.getFilesByType(MimeType.GOOGLE_SHEETS);
        if (!templateFiles.hasNext()) {
          emptyFolders.push(folderName + ' (無範本檔案)');
        }
      }
    }
  });
  
  // 檢查管理控制台
  const adminFiles = folder.getFilesByName('電聯記錄簿管理控制台');
  const hasAdminConsole = adminFiles.hasNext();
  
  // 檢查學生總表
  const masterListFiles = folder.getFilesByName('學生總表');
  const hasMasterList = masterListFiles.hasNext();
  
  // 如果有任何缺失，拋出詳細錯誤
  const issues = [];
  if (missingFolders.length > 0) {
    issues.push(`缺少子資料夾：${missingFolders.join(', ')}`);
  }
  if (emptyFolders.length > 0) {
    issues.push(`空資料夾：${emptyFolders.join(', ')}`);
  }
  if (!hasAdminConsole) {
    issues.push('缺少管理控制台檔案');
  }
  if (!hasMasterList) {
    issues.push('缺少學生總表檔案');
  }
  
  if (issues.length > 0) {
    throw new Error(`系統資料夾不完整：${issues.join('；')}`);
  }
  
  Logger.log('✅ 系統資料夾結構驗證通過');
  return folder;
}

/**
 * 為所有學生預建Academic Contact電聯記錄
 * 此函數應在學生資料匯入後呼叫
 */
function prebuildAcademicContactRecords() {
  try {
    // Web環境兼容性檢查
    if (isWebEnvironment()) {
      Logger.log('Web環境：此功能需要在Google Sheets環境中執行');
      return;
    }
    const ui = SpreadsheetApp.getUi();
    const currentSheet = SpreadsheetApp.getActiveSheet();
    const recordBook = SpreadsheetApp.getActiveSpreadsheet();
    
    // 檢查是否在老師記錄簿中
    const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    if (!summarySheet) {
      ui.alert('錯誤', '請在老師記錄簿中執行此功能', ui.ButtonSet.OK);
      return;
    }
    
    // 獲取學生清單
    const studentListSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    if (!studentListSheet) {
      ui.alert('錯誤', '找不到學生清單工作表', ui.ButtonSet.OK);
      return;
    }
    
    const studentData = studentListSheet.getDataRange().getValues();
    if (studentData.length < 2) {
      ui.alert('提醒', '學生清單中沒有資料，請先匯入學生資料', ui.ButtonSet.OK);
      return;
    }
    
    // 確認操作
    const response = ui.alert(
      '預建Academic Contact記錄',
      `將為 ${studentData.length - 1} 位學生建立完整學年的Academic Contact記錄\n\n每位學生建立：\n• Fall Beginning/Midterm/Final\n• Spring Beginning/Midterm/Final\n共 ${(studentData.length - 1) * 6} 筆記錄\n\n確定要繼續嗎？`,
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) return;
    
    // 執行預建
    const result = performPrebuildAcademicContacts(recordBook, studentData);
    
    ui.alert(
      '預建完成！',
      `成功為 ${result.studentCount} 位學生預建 ${result.recordCount} 筆Academic Contact記錄\n\n請在電聯記錄工作表中查看，並填寫Teachers Content、Parents Responses和Contact Method欄位`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('預建Academic Contact記錄失敗：' + error.toString());
    safeErrorHandler('預建Academic Contact記錄', error);
  }
}

/**
 * 執行Academic Contact記錄預建
 */
function performPrebuildAcademicContacts(recordBook, studentData) {
  const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
  
  if (!contactLogSheet) {
    throw new Error('找不到電聯記錄工作表');
  }
  
  // 跳過標題列，獲取學生資料
  const students = studentData.slice(1);
  const prebuiltRecords = [];
  
  // 為每位學生建立6筆Academic Contact記錄
  students.forEach(student => {
    const studentId = student[0];       // ID
    const chineseName = student[4];     // Chinese Name  
    const englishName = student[5];     // English Name
    const englishClass = student[9];    // English Class (第10欄)
    
    // 檢查必要欄位
    if (!studentId || !chineseName || !englishClass) {
      Logger.log(`跳過不完整的學生資料：${chineseName || '未知'}`);
      return;
    }
    
    // 為每個學期和term建立記錄
    SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.forEach(semester => {
      SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.forEach(term => {
        const record = [
          studentId,                                    // Student ID
          chineseName,                                  // Name
          englishName || '',                           // English Name
          englishClass,                                // English Class
          '',                                          // Date (空白，由老師填寫)
          semester,                                    // Semester
          term,                                        // Term
          SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER,       // Contact Type (Academic Contact)
          '',                                          // Teachers Content (空白，由老師填寫)
          '',                                          // Parents Responses (空白，由老師填寫)
          ''                                           // Contact Method (空白，由老師填寫)
        ];
        prebuiltRecords.push(record);
      });
    });
  });
  
  // 寫入預建記錄
  if (prebuiltRecords.length > 0) {
    const startRow = contactLogSheet.getLastRow() + 1;
    contactLogSheet.getRange(startRow, 1, prebuiltRecords.length, SYSTEM_CONFIG.CONTACT_FIELDS.length)
      .setValues(prebuiltRecords);
    
    // 為預建記錄設定特殊格式
    const prebuiltRange = contactLogSheet.getRange(startRow, 1, prebuiltRecords.length, SYSTEM_CONFIG.CONTACT_FIELDS.length);
    prebuiltRange.setBackground('#F8F9FA'); // 淺灰背景
    prebuiltRange.setNote('🤖 系統預建的Academic Contact記錄 - 請填寫Date、Teachers Content、Parents Responses和Contact Method欄位');
    
    // 高亮需要填寫的欄位
    const dateRange = contactLogSheet.getRange(startRow, 5, prebuiltRecords.length, 1); // Date欄
    const teachersContentRange = contactLogSheet.getRange(startRow, 9, prebuiltRecords.length, 1); // Teachers Content欄
    const parentsResponseRange = contactLogSheet.getRange(startRow, 10, prebuiltRecords.length, 1); // Parents Responses欄
    const contactMethodRange = contactLogSheet.getRange(startRow, 11, prebuiltRecords.length, 1); // Contact Method欄
    
    dateRange.setBackground('#FFEBEE'); // 淺紅背景提醒待填寫
    teachersContentRange.setBackground('#FFEBEE');
    parentsResponseRange.setBackground('#FFEBEE');
    contactMethodRange.setBackground('#FFEBEE');
  }
  
  return {
    studentCount: students.length,
    recordCount: prebuiltRecords.length
  };
} 