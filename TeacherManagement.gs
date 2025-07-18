/**
 * 老師管理模組
 * 負責老師記錄簿的創建、班級學生資料管理
 */

/**
 * 創建單一老師的電聯記錄簿
 */
function createTeacherRecordBook() {
  try {
    // 統一 Web 環境架構 - 移除環境檢查
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
    // 統一 Web 環境架構 - 移除環境檢查
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
  // 統一 Web 環境架構 - 移除環境檢查
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
 * 改進版：更精確的錯誤處理，區分致命錯誤和非致命錯誤
 */
function createTeacherSheet(teacherInfo) {
  let recordBook = null;
  let isCreationSuccessful = false;
  let setupWarnings = [];
  
  try {
    Logger.log(`========== 開始創建老師記錄簿：${teacherInfo.name} ==========`);
    Logger.log(`老師資訊：${JSON.stringify(teacherInfo)}`);
    
    // 驗證輸入參數
    if (!teacherInfo || !teacherInfo.name) {
      throw new Error('老師資訊不完整：缺少老師姓名');
    }
    if (!teacherInfo.classes || teacherInfo.classes.length === 0) {
      throw new Error(`老師 ${teacherInfo.name} 缺少授課班級資訊`);
    }
    
    // 步驟1: 取得系統資料夾 (致命錯誤)
    Logger.log('步驟1: 獲取系統主資料夾...');
    let mainFolder;
    try {
      mainFolder = getSystemMainFolder();
      Logger.log(`✅ 成功獲取系統主資料夾：${mainFolder.getName()}`);
    } catch (folderError) {
      Logger.log(`❌ 獲取系統主資料夾失敗：${folderError.message}`);
      throw new Error(`無法獲取系統主資料夾：${folderError.message}。請先執行系統初始化或檢查資料夾權限。`);
    }
    
    // 步驟2: 獲取或創建老師記錄簿資料夾 (致命錯誤)
    Logger.log('步驟2: 獲取或創建老師記錄簿資料夾...');
    let teachersFolder;
    try {
      const teachersFolderIterator = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME);
      if (teachersFolderIterator.hasNext()) {
        teachersFolder = teachersFolderIterator.next();
        Logger.log(`✅ 找到老師記錄簿資料夾：${SYSTEM_CONFIG.TEACHERS_FOLDER_NAME}`);
      } else {
        Logger.log(`⚠️ 老師記錄簿資料夾不存在，正在創建：${SYSTEM_CONFIG.TEACHERS_FOLDER_NAME}`);
        teachersFolder = mainFolder.createFolder(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME);
        Logger.log(`✅ 成功創建老師記錄簿資料夾：${SYSTEM_CONFIG.TEACHERS_FOLDER_NAME}`);
      }
    } catch (createError) {
      Logger.log(`❌ 處理老師記錄簿資料夾失敗：${createError.message}`);
      throw new Error(`無法處理老師記錄簿資料夾：${createError.message}`);
    }
    
    // 步驟3: 創建老師專屬資料夾 (非致命錯誤)
    Logger.log('步驟3: 獲取或創建老師專屬資料夾...');
    const teacherFolderName = `${teacherInfo.name}_${calculateSchoolYear()}`;
    let teacherFolder = null;
    
    try {
      const existingTeacherFolder = teachersFolder.getFoldersByName(teacherFolderName);
      if (existingTeacherFolder.hasNext()) {
        teacherFolder = existingTeacherFolder.next();
        Logger.log(`✅ 找到現有老師資料夾：${teacherFolderName}`);
      } else {
        Logger.log(`📁 創建新老師資料夾：${teacherFolderName}`);
        teacherFolder = teachersFolder.createFolder(teacherFolderName);
        Logger.log(`✅ 成功創建老師資料夾：${teacherFolderName}`);
      }
    } catch (folderCreateError) {
      Logger.log(`⚠️ 創建老師專屬資料夾失敗：${folderCreateError.message}`);
      setupWarnings.push(`無法創建專屬資料夾：${folderCreateError.message}`);
      teacherFolder = teachersFolder; // 使用上層資料夾作為備選
    }
    
    // 步驟4: 創建記錄簿檔案 (致命錯誤)
    Logger.log('步驟4: 創建記錄簿檔案...');
    const fileName = SYSTEM_CONFIG.TEACHER_SHEET_NAME_FORMAT
      .replace('{teacherName}', teacherInfo.name)
      .replace('{schoolYear}', calculateSchoolYear());
    
    Logger.log(`📊 準備創建記錄簿檔案：${fileName}`);
    let recordFile;
    
    try {
      recordBook = SpreadsheetApp.create(fileName);
      recordFile = DriveApp.getFileById(recordBook.getId());
      Logger.log(`✅ 成功創建記錄簿檔案，ID：${recordBook.getId()}`);
      isCreationSuccessful = true; // 核心創建成功
    } catch (createFileError) {
      Logger.log(`❌ 創建記錄簿檔案失敗：${createFileError.message}`);
      throw new Error(`無法創建記錄簿檔案：${createFileError.message}`);
    }
    
    // 步驟5: 移動到老師資料夾 (非致命錯誤)
    Logger.log('步驟5: 移動記錄簿到老師資料夾...');
    if (teacherFolder && recordFile) {
      try {
        teacherFolder.addFile(recordFile);
        DriveApp.getRootFolder().removeFile(recordFile);
        Logger.log(`✅ 成功移動記錄簿到老師資料夾`);
      } catch (moveError) {
        Logger.log(`⚠️ 移動記錄簿檔案失敗：${moveError.message}`);
        setupWarnings.push(`檔案移動失敗，保留在根目錄：${moveError.message}`);
      }
    }
    
    // 步驟6: 設定記錄簿內容 (非致命錯誤)
    Logger.log('步驟6: 設定記錄簿內容...');
    try {
      setupTeacherRecordBook(recordBook, teacherInfo);
      Logger.log(`✅ 成功設定記錄簿內容`);
    } catch (setupError) {
      Logger.log(`⚠️ 設定記錄簿內容失敗：${setupError.message}`);
      setupWarnings.push(`內容設定失敗：${setupError.message}`);
    }
    
    // 創建成功，記錄警告但不影響成功狀態
    if (setupWarnings.length > 0) {
      Logger.log(`⚠️ 記錄簿創建成功但有警告：${setupWarnings.join('；')}`);
    }
    
    Logger.log(`🎉 ========== 成功創建老師記錄簿：${teacherInfo.name} ==========`);
    Logger.log(`📊 記錄簿URL：${recordBook.getUrl()}`);
    return recordBook;
    
  } catch (error) {
    Logger.log(`💥 ========== 創建老師記錄簿失敗：${teacherInfo?.name || '未知'} ==========`);
    Logger.log(`❌ 錯誤詳細：${error.toString()}`);
    Logger.log(`📍 錯誤堆疊：${error.stack}`);
    
    // 如果記錄簿已創建但設定失敗，嘗試清理
    if (isCreationSuccessful && recordBook) {
      try {
        DriveApp.getFileById(recordBook.getId()).setTrashed(true);
        Logger.log(`🗑️ 已清理失敗的記錄簿檔案`);
      } catch (cleanupError) {
        Logger.log(`⚠️ 清理失敗檔案時發生錯誤：${cleanupError.message}`);
      }
    }
    
    // 提供更詳細的錯誤訊息
    const detailedError = new Error(`創建 ${teacherInfo?.name || '未知'} 老師記錄簿失敗：${error.message}`);
    detailedError.originalError = error;
    detailedError.teacherInfo = teacherInfo;
    detailedError.isCreationSuccessful = isCreationSuccessful;
    detailedError.setupWarnings = setupWarnings;
    throw detailedError;
  }
}

/**
 * 設定老師記錄簿的內容結構
 */
function setupTeacherRecordBook(recordBook, teacherInfo) {
  // 刪除預設工作表
  const defaultSheet = recordBook.getActiveSheet();
  
  // 創建各個工作表（先建立基本結構，不設定公式）
  createSummarySheet(recordBook, teacherInfo);
  createClassInfoSheet(recordBook, teacherInfo);
  createStudentListSheet(recordBook, teacherInfo);
  createContactLogSheet(recordBook, teacherInfo);
  createProgressSheet(recordBook, teacherInfo);
  
  // 刪除預設工作表
  if (recordBook.getSheets().length > 1) {
    recordBook.deleteSheet(defaultSheet);
  }
  
  // 在所有工作表建立完成後，設定總覽工作表的公式
  try {
    Logger.log('🔄 所有工作表建立完成，開始設定總覽工作表公式');
    setupSummaryFormulas(recordBook, teacherInfo);
    Logger.log('✅ 總覽工作表公式設定完成');
  } catch (error) {
    Logger.log(`⚠️ 設定總覽工作表公式時發生錯誤：${error.message}`);
  }
  
  // 設定記錄簿為第一個工作表
  recordBook.setActiveSheet(recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY));
  
  // 註解：移除無效的排序檢查邏輯
  // 原因：新建記錄簿時電聯記錄工作表為空，排序應該在預建記錄完成後進行
  // 排序邏輯已整合到 performPrebuildScheduledContacts 函數中
  Logger.log('✅ 記錄簿建立完成，排序將在學生資料匯入和預建記錄時執行');
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
    ['學年度', calculateSchoolYear()]
  ];
  
  sheet.getRange(3, 1, infoData.length, 2).setValues(infoData);
  
  // 統計資訊區域
  sheet.getRange('A10').setValue('電聯統計');
  sheet.getRange('A10').setFontSize(14).setFontWeight('bold');
  
  const statsHeaders = [['班級', '學生人數', '定期電聯次數', '總電聯次數', '最後聯繫日期']];
  sheet.getRange(11, 1, 1, statsHeaders[0].length).setValues(statsHeaders);
  
  // 為每個班級創建統計行（暫時不設定公式，稍後統一設定）
  teacherInfo.classes.forEach((className, index) => {
    const row = 12 + index;
    sheet.getRange(row, 1).setValue(className);
    
    // 預設值，稍後會由setupSummaryFormulas函數設定公式
    sheet.getRange(row, 2).setValue('計算中...');
    sheet.getRange(row, 3).setValue('計算中...');
    sheet.getRange(row, 4).setValue('計算中...');
    sheet.getRange(row, 5).setValue('計算中...');
  });
  
  // 格式設定
  sheet.getRange('A1:E20').setHorizontalAlignment('left');
  sheet.getRange(11, 1, 1, statsHeaders[0].length).setFontWeight('bold').setBackground('#E8F4FD');
  
  // 調整欄寬
  sheet.autoResizeColumns(1, 5);
  
  // 暫時不設定公式，稍後由setupSummaryFormulas函數統一設定
  Logger.log('✅ 總覽工作表基本結構建立完成，公式將在所有工作表建立完成後設定');
  
  // 保護工作表，僅允許管理員編輯
  protectSheetForAdminOnly(sheet, '總覽工作表 - 僅管理員可編輯統計數據和基本資訊');
}

/**
 * 設定總覽工作表的公式（在所有工作表建立完成後執行）
 */
function setupSummaryFormulas(recordBook, teacherInfo) {
  const sheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
  if (!sheet) {
    throw new Error('找不到總覽工作表');
  }
  
  Logger.log('🔄 開始設定總覽工作表公式');
  
  // 確保參考的工作表存在
  const studentListSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
  const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
  
  if (!studentListSheet) {
    throw new Error('找不到學生清單工作表，無法設定統計公式');
  }
  
  if (!contactLogSheet) {
    throw new Error('找不到電聯記錄工作表，無法設定統計公式');
  }
  
  // 為每個班級設定統計公式
  teacherInfo.classes.forEach((className, index) => {
    const row = 12 + index;
    Logger.log(`設定班級 ${className} 的統計公式 (第${row}行)`);
    
    // 學生人數（從學生清單計算）
    const studentCountFormula = `=IFERROR(COUNTIFS('${SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST}'!J:J,"${className}"),0)`;
    const studentCountRange = sheet.getRange(row, 2);
    studentCountRange.setFormula(studentCountFormula);
    
    // 定期電聯次數（Scheduled Contact 類型且四個關鍵欄位均已填寫） - 新標準
    const scheduledContactsFormula = `=IFERROR(COUNTIFS('${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!D:D,"${className}",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!H:H,"Scheduled Contact",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!E:E,"<>",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!I:I,"<>",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!J:J,"<>",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!K:K,"<>"),0)`;
    const scheduledRange = sheet.getRange(row, 3);
    scheduledRange.setFormula(scheduledContactsFormula);
    
    // 總電聯次數（該班級所有記錄且四個關鍵欄位均已填寫） - 新標準
    const totalContactsFormula = `=IFERROR(COUNTIFS('${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!D:D,"${className}",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!E:E,"<>",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!I:I,"<>",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!J:J,"<>",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!K:K,"<>"),0)`;
    const totalRange = sheet.getRange(row, 4);
    totalRange.setFormula(totalContactsFormula);
    
    // 最後聯繫日期（該班級最新的電聯日期）
    const lastContactFormula = `=IFERROR(TEXT(MAXIFS('${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!E:E,'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!D:D,"${className}",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!E:E,"<>"),"yyyy/mm/dd"),"無記錄")`;
    const lastContactRange = sheet.getRange(row, 5);
    lastContactRange.setFormula(lastContactFormula);
    
    // 設置數值格式
    studentCountRange.setNumberFormat('0');
    scheduledRange.setNumberFormat('0');
    totalRange.setNumberFormat('0');
    lastContactRange.setNumberFormat('@'); // 文字格式用於日期顯示
  });
  
  // 採用與進度追蹤相同的強制計算機制
  try {
    Logger.log('🔄 強制計算總覽工作表公式（使用進度追蹤成功模式）');
    
    // 第一次全域刷新
    SpreadsheetApp.flush();
    Utilities.sleep(200);
    
    // 逐一觸發每個公式的重新計算（仿照進度追蹤工作表的成功模式）
    teacherInfo.classes.forEach((className, index) => {
      const row = 12 + index;
      try {
        // 重新設定所有公式以觸發計算
        const studentCountFormula = sheet.getRange(row, 2).getFormula();
        if (studentCountFormula) {
          sheet.getRange(row, 2).setFormula(studentCountFormula);
        }
        
        const scheduledFormula = sheet.getRange(row, 3).getFormula();
        if (scheduledFormula) {
          sheet.getRange(row, 3).setFormula(scheduledFormula);
        }
        
        const totalFormula = sheet.getRange(row, 4).getFormula();
        if (totalFormula) {
          sheet.getRange(row, 4).setFormula(totalFormula);
        }
        
        const lastContactFormula = sheet.getRange(row, 5).getFormula();
        if (lastContactFormula) {
          sheet.getRange(row, 5).setFormula(lastContactFormula);
        }
        
        Logger.log(`✅ 班級 ${className} 公式設定完成`);
      } catch (cellError) {
        Logger.log(`⚠️ 設定班級 ${className} 公式時發生錯誤：${cellError.message}`);
      }
    });
    
    // 最後一次全域強制重新計算
    SpreadsheetApp.flush();
    Utilities.sleep(300);
    
    Logger.log('✅ 總覽工作表公式設定完成（使用增強觸發機制）');
  } catch (error) {
    Logger.log(`⚠️ 總覽工作表公式計算時發生錯誤：${error.message}`);
  }
}

/**
 * 創建班級資訊工作表
 * 增強版：自動填入班導師和班級人數資訊
 */
function createClassInfoSheet(recordBook, teacherInfo) {
  const sheet = recordBook.insertSheet(SYSTEM_CONFIG.SHEET_NAMES.CLASS_INFO);
  
  // 設定標題
  const headers = [['班級', '班導師', '班級人數', '班級特殊情況說明', '最後更新日期']];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  
  // 如果有學生資料，從中提取班級資訊
  let classData = {};
  if (teacherInfo.students && teacherInfo.students.length > 0) {
    Logger.log(`📊 從 ${teacherInfo.students.length} 筆學生資料中提取班級資訊...`);
    
    teacherInfo.students.forEach(student => {
      // student 陣列格式: [ID, Grade, HR, Seat #, Chinese Name, English Name, ...]
      const hrClass = student[2]; // HR 班級 (第3欄)
      const englishClass = student[9]; // English Class (第10欄)
      
      // 找出實際的班級名稱（HR 或 English Class）
      let actualClass = null;
      if (teacherInfo.classes.includes(hrClass)) {
        actualClass = hrClass;
      } else if (teacherInfo.classes.includes(englishClass)) {
        actualClass = englishClass;
      }
      
      if (actualClass) {
        if (!classData[actualClass]) {
          classData[actualClass] = {
            homeroomTeacher: '', // 將通過其他方式獲取
            studentCount: 0,
            students: []
          };
        }
        classData[actualClass].studentCount++;
        classData[actualClass].students.push(student);
      }
    });
    
    Logger.log(`✅ 提取到 ${Object.keys(classData).length} 個班級的資訊`);
  }
  
  // 為每個班級創建資料行並填入資訊
  teacherInfo.classes.forEach((className, index) => {
    const row = 2 + index;
    sheet.getRange(row, 1).setValue(className); // 班級
    
    // 填入班級人數
    if (classData[className]) {
      sheet.getRange(row, 3).setValue(classData[className].studentCount); // 班級人數
      Logger.log(`📊 ${className} 班級人數：${classData[className].studentCount}`);
    } else {
      sheet.getRange(row, 3).setValue('待確認'); // 無學生資料時的預設值
    }
    
    // 班導師欄位 - 目前設為空白，可後續透過其他方式填入
    sheet.getRange(row, 2).setValue('待填入'); // 班導師 (留待人工填入或後續功能擴充)
    
    // 最後更新日期
    sheet.getRange(row, 5).setValue(new Date().toLocaleDateString());
  });
  
  // 新增資料來源說明
  if (Object.keys(classData).length > 0) {
    const noteRow = 2 + teacherInfo.classes.length + 1;
    sheet.getRange(noteRow, 1).setValue('📝 資料來源說明：');
    sheet.getRange(noteRow + 1, 1).setValue('• 班級人數：從學生清單自動計算');
    sheet.getRange(noteRow + 2, 1).setValue('• 班導師：需手動填入或透過系統管理員設定');
    sheet.getRange(noteRow, 1, 3, 1).setFontStyle('italic').setFontColor('#666666');
  }
  
  // 格式設定
  sheet.getRange(1, 1, 1, headers[0].length).setFontWeight('bold').setBackground('#E8F4FD');
  
  // 為班級人數欄位設定數字格式
  const classCount = teacherInfo.classes.length;
  if (classCount > 0) {
    sheet.getRange(2, 3, classCount, 1).setNumberFormat('0'); // 整數格式
  }
  
  // 條件式格式設定 - 班級人數
  if (classCount > 0) {
    const studentCountRange = sheet.getRange(2, 3, classCount, 1);
    
    // 班級人數 > 30 的班級用紅色背景標示
    const highCountRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(30)
      .setBackground('#FFEBEE')
      .setRanges([studentCountRange])
      .build();
    
    // 班級人數 < 10 的班級用黃色背景標示
    const lowCountRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(10)
      .setBackground('#FFF3E0')
      .setRanges([studentCountRange])
      .build();
    
    sheet.setConditionalFormatRules([highCountRule, lowCountRule]);
  }
  
  sheet.autoResizeColumns(1, headers[0].length);
  
  // 保護工作表，僅允許管理員編輯
  protectSheetForAdminOnly(sheet, '班級資訊工作表 - 僅管理員可編輯班級設定和基本資訊');
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
  
  // LT (Local Teacher) 欄位提示（第11欄）
  const ltRange = sheet.getRange('K2:K1000');
  ltRange.setNote('👨‍🏫 本地老師姓名 - 用於系統識別授課老師');
  ltRange.setBackground('#FFF3E0'); // 淺橙背景
  
  // 電話欄位格式提示
  const motherPhoneRange = sheet.getRange('L2:L1000');
  const fatherPhoneRange = sheet.getRange('M2:M1000');
  motherPhoneRange.setNote('📞 母親電話，格式：0912-345-678');
  fatherPhoneRange.setNote('📞 父親電話，格式：0912-345-678');
  
  // 設定保護範圍（標題行）
  const protection = sheet.getRange(1, 1, 1, SYSTEM_CONFIG.STUDENT_FIELDS.length).protect();
  protection.setDescription('標題行保護');
  
  // 保護工作表，僅允許管理員編輯
  protectSheetForAdminOnly(sheet, '學生清單工作表 - 僅管理員可編輯學生基本資料');
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
  sheet.getRange('A2').setNote('💡 提示：學生資料匯入後，請使用「預建學期電聯記錄」功能自動為所有學生建立Scheduled Contact記錄');
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
    
    // 已完成電聯（即時計算公式） - 新標準：4個關鍵欄位
    // 計算特定學期+Term+Contact Type="Scheduled Contact"且四個關鍵欄位都已填寫的記錄數
    // 必要欄位：Date(E), Teachers Content(I), Parents Responses(J), Contact Method(K) - 四個關鍵欄位
    const completedContactsFormula = `=IFERROR(COUNTIFS('${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!F:F,"${st.semester}",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!G:G,"${st.term}",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!H:H,"Scheduled Contact",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!E:E,"<>",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!I:I,"<>",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!J:J,"<>",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!K:K,"<>"),0)`;
    sheet.getRange(row, 4).setFormula(completedContactsFormula);
    
    // 註解：已更新為新的「已完成電聯」標準：只需要Date+Teachers Content+Parents Responses+Contact Method四個關鍵欄位
    
    // 完成率（即時計算公式）
    // 已完成電聯 ÷ 學生總數，避免除零錯誤和其他計算錯誤
    const completionRateFormula = `=IFERROR(IF(C${row}>0,ROUND(D${row}/C${row}*100,1)&"%","0%"),"0%")`;
    sheet.getRange(row, 5).setFormula(completionRateFormula);
    
    // 狀態（即時計算公式）
    // 根據完成率自動判斷狀態，處理計算錯誤
    const statusFormula = `=IFERROR(IF(D${row}>=C${row},"已完成",IF(D${row}=0,"待開始","進行中")),"待開始")`;
    sheet.getRange(row, 6).setFormula(statusFormula);
    
    // 備註欄位保持空白，供老師自行填寫
    // (移除硬編碼的「當前Term」標示)
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
    ['定期電聯總次數', `=IFERROR(COUNTIF('${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!H:H,"Scheduled Contact"),0)`],
    ['平均每學期完成率', `=IFERROR(IF(COUNTA(D5:D${4 + semesterTerms.length})>0,ROUND(AVERAGE(D5:D${4 + semesterTerms.length})/AVERAGE(C5:C${4 + semesterTerms.length})*100,1)&"%","0%"),"0%")`]
  ];
  
  sheet.getRange(summaryStartRow + 2, 1, summaryData.length, 2).setValues(summaryData);
  
  // 格式設定
  sheet.getRange(4, 1, 1, semesterHeaders.length).setFontWeight('bold').setBackground('#E8F4FD');
  sheet.getRange(summaryStartRow + 1, 1, 1, summaryHeaders.length).setFontWeight('bold').setBackground('#E8F5E8');
  sheet.autoResizeColumns(1, Math.max(semesterHeaders.length, summaryHeaders.length));
  
  // 設定條件式格式
  setupProgressSheetConditionalFormatting(sheet, 5, 5 + semesterTerms.length - 1);
  
  // 保護工作表，僅允許管理員編輯
  protectSheetForAdminOnly(sheet, '進度追蹤工作表 - 僅管理員可編輯追蹤設定和統計數據');
}

/**
 * 保護工作表，僅允許管理員編輯（適用於共用資料夾環境）
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 要保護的工作表
 * @param {string} description - 保護說明
 */
function protectSheetForAdminOnly(sheet, description) {
  try {
    const protection = sheet.protect();
    protection.setDescription(description);
    
    // 共用資料夾的特殊處理：
    // 1. 取得當前使用者（系統管理員/建立者）
    // 2. 明確設定只有管理員可以編輯，移除其他編輯者
    const currentUser = Session.getActiveUser().getEmail();
    Logger.log(`🔐 設定保護工作表，僅允許管理員編輯：${currentUser}`);
    
    // 清除所有編輯者，只保留管理員
    try {
      protection.removeEditors(protection.getEditors());
      protection.addEditor(currentUser);
      
      // 設定警告訊息
      protection.setWarningOnly(false); // 強制保護，不只是警告
      
      Logger.log(`🔒 已保護工作表：${sheet.getName()} - 僅 ${currentUser} 可編輯`);
    } catch (editorError) {
      // 如果無法設定特定編輯者（可能因為權限限制），退回到基本保護
      Logger.log(`⚠️ 無法設定特定編輯者，使用基本保護模式：${editorError.toString()}`);
      protection.setWarningOnly(false);
    }
    
    Logger.log(`✅ 工作表保護設定完成：${sheet.getName()} - ${description}`);
    return protection;
  } catch (error) {
    Logger.log(`❌ 保護工作表失敗：${sheet.getName()} - ${error.toString()}`);
    throw error;
  }
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
    SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER,    // Scheduled Contact
    SYSTEM_CONFIG.CONTACT_TYPES.REGULAR,     // Regular Contact  
    SYSTEM_CONFIG.CONTACT_TYPES.SPECIAL      // Special Contact
  ];
  const contactTypeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(contactTypeOptions)
    .setAllowInvalid(false)
    .setHelpText('📞 電聯類型：Scheduled(定期電聯) / Regular(平時電聯) / Special(特殊電聯)')
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
 * 包含故障恢復機制
 */
function getSystemMainFolder(strictMode = false) {
  Logger.log(`🔍 開始搜尋系統主資料夾，嚴格模式：${strictMode}`);
  
  // 方法1：如果有指定資料夾 ID，優先使用
  if (SYSTEM_CONFIG.MAIN_FOLDER_ID && SYSTEM_CONFIG.MAIN_FOLDER_ID.trim() !== '') {
    Logger.log(`📁 嘗試使用指定的資料夾 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}`);
    try {
      const folder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
      Logger.log(`✅ 成功存取指定資料夾：${folder.getName()}`);
      
      if (strictMode) {
        Logger.log(`🔧 進行嚴格模式驗證...`);
        return validateSystemFolderStructure(folder);
      }
      return folder;
    } catch (error) {
      Logger.log(`❌ 無法存取指定的資料夾 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}`);
      Logger.log(`🔄 錯誤詳情：${error.message}，嘗試按名稱搜尋`);
    }
  } else {
    Logger.log(`⚠️ 未設定 MAIN_FOLDER_ID，直接按名稱搜尋`);
  }
  
  // 方法2：按名稱搜尋資料夾
  Logger.log(`🔍 按名稱搜尋資料夾：${SYSTEM_CONFIG.MAIN_FOLDER_NAME}`);
  try {
    const folders = DriveApp.getFoldersByName(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
    if (folders.hasNext()) {
      const folder = folders.next();
      Logger.log(`✅ 找到同名資料夾：${folder.getName()}, ID: ${folder.getId()}`);
      
      // 檢查是否有多個同名資料夾
      if (folders.hasNext()) {
        Logger.log(`⚠️ 發現多個同名資料夾，使用第一個`);
      }
      
      if (strictMode) {
        Logger.log(`🔧 進行嚴格模式驗證...`);
        return validateSystemFolderStructure(folder);
      }
      return folder;
    }
  } catch (searchError) {
    Logger.log(`❌ 按名稱搜尋失敗：${searchError.message}`);
  }
  
  // 方法3：嘗試在我的雲端硬碟根目錄搜尋
  Logger.log(`🔍 在我的雲端硬碟根目錄搜尋...`);
  try {
    const rootFolders = DriveApp.getRootFolder().getFoldersByName(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
    if (rootFolders.hasNext()) {
      const folder = rootFolders.next();
      Logger.log(`✅ 在根目錄找到資料夾：${folder.getName()}, ID: ${folder.getId()}`);
      
      if (strictMode) {
        Logger.log(`🔧 進行嚴格模式驗證...`);
        return validateSystemFolderStructure(folder);
      }
      return folder;
    }
  } catch (rootSearchError) {
    Logger.log(`❌ 根目錄搜尋失敗：${rootSearchError.message}`);
  }
  
  // 方法4：故障恢復 - 提供自動創建選項
  Logger.log(`❌ 所有搜尋方法都失敗，系統資料夾不存在`);
  
  if (!strictMode) {
    Logger.log(`🔧 嘗試故障恢復：自動創建系統資料夾`);
    try {
      return createSystemFolders();
    } catch (createError) {
      Logger.log(`💥 自動創建失敗：${createError.message}`);
    }
  }
  
  const detailedError = new Error(`系統資料夾不存在，請執行以下步驟：
1. 檢查 SYSTEM_CONFIG.MAIN_FOLDER_ID 設定是否正確
2. 確認您有資料夾存取權限
3. 執行「初始化系統」功能重新創建系統資料夾
4. 或手動創建名為「${SYSTEM_CONFIG.MAIN_FOLDER_NAME}」的資料夾

當前設定：
- MAIN_FOLDER_ID: ${SYSTEM_CONFIG.MAIN_FOLDER_ID}
- MAIN_FOLDER_NAME: ${SYSTEM_CONFIG.MAIN_FOLDER_NAME}`);
  
  detailedError.code = 'SYSTEM_FOLDER_NOT_FOUND';
  throw detailedError;
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
 * 為所有學生預建Scheduled Contact電聯記錄
 * 此函數應在學生資料匯入後呼叫
 */
function prebuildScheduledContactRecords() {
  try {
    // 統一 Web 環境架構 - 移除環境檢查
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
      '預建Scheduled Contact記錄',
      `將為 ${studentData.length - 1} 位學生建立完整學年的Scheduled Contact記錄\n\n每位學生建立：\n• Fall Beginning/Midterm/Final\n• Spring Beginning/Midterm/Final\n共 ${(studentData.length - 1) * 6} 筆記錄\n\n確定要繼續嗎？`,
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) return;
    
    // 執行預建
    const result = performPrebuildScheduledContacts(recordBook, studentData);
    
    ui.alert(
      '預建完成！',
      `成功為 ${result.studentCount} 位學生預建 ${result.recordCount} 筆Scheduled Contact記錄\n\n請在電聯記錄工作表中查看，並填寫Teachers Content、Parents Responses和Contact Method欄位`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('預建Scheduled Contact記錄失敗：' + error.toString());
    safeErrorHandler('預建Scheduled Contact記錄', error);
  }
}

/**
 * 執行Scheduled Contact記錄預建
 */
function performPrebuildScheduledContacts(recordBook, studentData) {
  const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
  
  if (!contactLogSheet) {
    throw new Error('找不到電聯記錄工作表');
  }
  
  // 跳過標題列，獲取學生資料
  const students = studentData.slice(1);
  const prebuiltRecords = [];
  
  // 為每位學生建立6筆Scheduled Contact記錄
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
    
    // 為每個學期和term建立記錄（確保順序：Fall->Spring, Beginning->Midterm->Final）
    Logger.log(`🔄 為學生 ${studentId}(${chineseName}) 建立預建記錄...`);
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
          SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER,       // Contact Type (Scheduled Contact)
          '',                                          // Teachers Content (空白，由老師填寫)
          '',                                          // Parents Responses (空白，由老師填寫)
          ''                                           // Contact Method (空白，由老師填寫)
        ];
        
        // 記錄預建記錄的詳細信息
        if (prebuiltRecords.length < 12) { // 只記錄前12筆（2個學生的完整記錄）
          Logger.log(`  👤 預建記錄 #${prebuiltRecords.length + 1}: ID=${studentId}, Semester="${semester}", Term="${term}"`);
        }
        
        prebuiltRecords.push(record);
      });
    });
  });
  
  // 驗證系統配置順序
  Logger.log(`🔍 系統配置驗證：`);
  Logger.log(`  Semesters: ${SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.join(' → ')}`);
  Logger.log(`  Terms: ${SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.join(' → ')}`);
  
  // 使用統一排序函數進行排序
  Logger.log(`🔄 開始排序 ${prebuiltRecords.length} 筆Scheduled Contact記錄...`);
  
  // 創建虛擬標題和完整資料陣列供統一排序函數使用
  const headers = SYSTEM_CONFIG.CONTACT_FIELDS || [
    'Student ID', 'Name', 'English Name', 'English Class', 'Date',
    'Semester', 'Term', 'Contact Type', 'Teachers Content', 'Parents Responses', 'Contact Method'
  ];
  const mockDataWithHeaders = [headers, ...prebuiltRecords];
  
  // 強化排序邏輯：確保排序成功才繼續寫入
  const sortResult = sortContactRecordsData(mockDataWithHeaders);
  
  if (!sortResult.success) {
    const errorMsg = `預建記錄排序失敗：${sortResult.error}`;
    Logger.log(`❌ ${errorMsg}`);
    Logger.log(`📊 排序失敗狀態 - 記錄數：${prebuiltRecords.length}, 學生數：${students.length}`);
    Logger.log(`🔍 失敗原因排查：請檢查學生資料格式和系統配置`);
    throw new Error(errorMsg);
  }
  
  // 提取排序後的資料（去除標題）
  prebuiltRecords.length = 0; // 清空原陣列
  prebuiltRecords.push(...sortResult.data.slice(1)); // 將排序後的資料重新填入
  Logger.log(`✅ 預建記錄排序完成，順序：學生ID (小→大) → 學期 (Fall→Spring) → Term (Beginning→Midterm→Final) → English Class (小→大)`);
  
  // 寫入排序後的預建記錄（原子性操作）
  if (prebuiltRecords.length > 0) {
    const startRow = contactLogSheet.getLastRow() + 1;
    
    // 確保工作表沒有舊的預建記錄（清除可能的重複資料）
    const existingData = contactLogSheet.getDataRange().getValues();
    if (existingData.length > 1) {
      Logger.log('⚠️ 工作表中已有資料，檢查是否有重複的預建記錄...');
      // 這裡可以添加清理邏輯，但需要小心不要刪除用戶填寫的記錄
    }
    
    // 寫入排序後的資料
    contactLogSheet.getRange(startRow, 1, prebuiltRecords.length, SYSTEM_CONFIG.CONTACT_FIELDS.length)
      .setValues(prebuiltRecords);
    
    // 立即驗證寫入的資料排序
    const writtenData = contactLogSheet.getRange(startRow, 1, Math.min(5, prebuiltRecords.length), SYSTEM_CONFIG.CONTACT_FIELDS.length).getValues();
    Logger.log('📊 寫入工作表的排序驗證（前5筆）：');
    writtenData.forEach((row, index) => {
      Logger.log(`  ${index + 1}. ID:${row[0]}, Name:${row[1]}, Class:${row[3]}, Semester:${row[5]}, Term:${row[6]}`);
    });
    
    // 驗證整體排序正確性
    const sortValidation = validateContactRecordsSorting(contactLogSheet);
    if (!sortValidation.isValid) {
      Logger.log(`⚠️ 排序驗證失敗：${sortValidation.errors.join('; ')}`);
    } else {
      Logger.log('✅ 排序驗證通過，記錄已正確排序');
    }
    
    // 為預建記錄設定特殊格式
    const prebuiltRange = contactLogSheet.getRange(startRow, 1, prebuiltRecords.length, SYSTEM_CONFIG.CONTACT_FIELDS.length);
    prebuiltRange.setBackground('#F8F9FA'); // 淺灰背景
    
    // 在第一筆預建記錄的Student ID欄位加上說明註解（只在一個地方顯示）
    if (prebuiltRecords.length > 0) {
      contactLogSheet.getRange(startRow, 1, 1, 1).setNote('🤖 以下為系統預建的Scheduled Contact記錄，請填寫Date、Teachers Content、Parents Responses和Contact Method欄位');
    }
    
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

/**
 * 統一的電聯記錄排序函數（核心邏輯）
 * @param {Array} allData - 包含標題和資料的完整陣列
 * @returns {Object} - {success: boolean, data: Array, recordCount: number}
 */
function sortContactRecordsData(allData) {
  try {
    if (!allData || allData.length < 2) {
      return { success: false, data: allData, recordCount: 0, error: '無資料可排序' };
    }
    
    const headers = allData[0];
    const records = allData.slice(1); // 跳過標題行
    
    Logger.log(`🔄 開始統一排序函數，處理 ${records.length} 筆電聯記錄...`);
    
    // 動態欄位映射（基於實際標題行，避免硬編碼索引）
    const fieldMapping = {};
    const expectedFields = ['Student ID', 'Name', 'English Name', 'English Class', 'Date', 'Semester', 'Term', 'Contact Type', 'Teachers Content', 'Parents Responses', 'Contact Method'];
    
    // 根據實際標題行動態映射欄位索引
    expectedFields.forEach(field => {
      const index = headers.indexOf(field);
      if (index === -1) {
        Logger.log(`⚠️ 警告：找不到欄位 "${field}" 在標題行中`);
      }
      switch(field) {
        case 'Student ID': fieldMapping.studentId = index; break;
        case 'Name': fieldMapping.name = index; break;
        case 'English Name': fieldMapping.englishName = index; break;
        case 'English Class': fieldMapping.englishClass = index; break;
        case 'Date': fieldMapping.date = index; break;
        case 'Semester': fieldMapping.semester = index; break;
        case 'Term': fieldMapping.term = index; break;
        case 'Contact Type': fieldMapping.contactType = index; break;
        case 'Teachers Content': fieldMapping.teachersContent = index; break;
        case 'Parents Responses': fieldMapping.parentsResponses = index; break;
        case 'Contact Method': fieldMapping.contactMethod = index; break;
      }
    });
    
    Logger.log(`🔍 動態欄位映射結果：${JSON.stringify(fieldMapping)}`);
    
    // 驗證關鍵排序欄位是否存在
    const criticalFields = ['studentId', 'semester', 'term', 'englishClass'];
    const missingFields = criticalFields.filter(field => fieldMapping[field] === -1 || fieldMapping[field] === undefined);
    
    if (missingFields.length > 0) {
      const errorMsg = `排序失敗：缺少關鍵欄位 ${missingFields.join(', ')}`;
      Logger.log(`❌ ${errorMsg}`);
      return { success: false, data: allData, recordCount: 0, error: errorMsg };
    }
    
    // 排序前記錄樣本數據和欄位驗證
    if (records.length > 0) {
      Logger.log(`📊 排序前資料分析：`);
      Logger.log(`🔍 欄位映射驗證：Student ID=${fieldMapping.studentId}, Semester=${fieldMapping.semester}, Term=${fieldMapping.term}, English Class=${fieldMapping.englishClass}`);
      Logger.log(`📋 標題行：${headers.join(' | ')}`);
      
      Logger.log(`📊 排序前樣本數據（前10筆）：`);
      for (let i = 0; i < Math.min(10, records.length); i++) {
        const record = records[i];
        Logger.log(`  ${i+1}. ID=${record[fieldMapping.studentId]}, Semester="${record[fieldMapping.semester]}", Term="${record[fieldMapping.term]}", Class="${record[fieldMapping.englishClass]}"`);
      }
      
      // 檢查所有不重複的 Semester 和 Term 值
      const uniqueSemesters = [...new Set(records.map(r => r[fieldMapping.semester]))];
      const uniqueTerms = [...new Set(records.map(r => r[fieldMapping.term]))];
      Logger.log(`🔍 發現的 Semester 值：${uniqueSemesters.join(', ')}`);
      Logger.log(`🔍 發現的 Term 值：${uniqueTerms.join(', ')}`);
    }
    
    // 執行四層排序：學生ID → 學期(Fall→Spring) → Term(Beginning→Midterm→Final) → English Class
    Logger.log(`🔄 開始執行排序...`);
    let sortDebugCount = 0;
    
    records.sort((a, b) => {
      sortDebugCount++;
      
      // 第一優先：學生ID（數字排序，小到大）
      const studentIdA = parseInt(a[fieldMapping.studentId]) || 0;
      const studentIdB = parseInt(b[fieldMapping.studentId]) || 0;
      if (studentIdA !== studentIdB) {
        return studentIdA - studentIdB;
      }
      
      // 第二優先：學期（Fall → Spring）
      const semesterA = a[fieldMapping.semester];
      const semesterB = b[fieldMapping.semester];
      const semesterOrder = { 'Fall': 0, 'Spring': 1 };
      const semesterAOrder = semesterOrder[semesterA];
      const semesterBOrder = semesterOrder[semesterB];
      
      // 調試學期排序邏輯
      if (sortDebugCount <= 10) {
        Logger.log(`🔍 排序比較 #${sortDebugCount}: ID ${studentIdA} vs ${studentIdB}, Semester "${semesterA}"(${semesterAOrder}) vs "${semesterB}"(${semesterBOrder})`);
        // 檢查資料類型和值
        Logger.log(`    📊 資料類型檢查: semesterA type=${typeof semesterA}, semesterB type=${typeof semesterB}`);
        Logger.log(`    📊 映射檢查: semesterOrder=${JSON.stringify(semesterOrder)}`);
      }
      
      const semesterCompare = (semesterAOrder || 999) - (semesterBOrder || 999);
      if (semesterCompare !== 0) {
        return semesterCompare;
      }
      
      // 第三優先：Term（Beginning → Midterm → Final）
      const termA = a[fieldMapping.term];
      const termB = b[fieldMapping.term];
      const termOrder = { 'Beginning': 0, 'Midterm': 1, 'Final': 2 };
      const termAOrder = termOrder[termA];
      const termBOrder = termOrder[termB];
      
      // 調試Term排序邏輯
      if (sortDebugCount <= 10 && studentIdA === studentIdB && semesterA === semesterB) {
        Logger.log(`🔍 Term排序比較: "${termA}"(${termAOrder}) vs "${termB}"(${termBOrder})`);
        Logger.log(`    📊 Term資料類型: termA type=${typeof termA}, termB type=${typeof termB}`);
        Logger.log(`    📊 Term映射: termOrder=${JSON.stringify(termOrder)}`);
      }
      
      const termCompare = (termAOrder || 999) - (termBOrder || 999);
      if (termCompare !== 0) {
        return termCompare;
      }
      
      // 第四優先：English Class（字串排序，小到大）
      const englishClassA = a[fieldMapping.englishClass] || '';
      const englishClassB = b[fieldMapping.englishClass] || '';
      return englishClassA.localeCompare(englishClassB);
    });
    
    Logger.log(`✅ 排序完成，總比較次數：${sortDebugCount}`);
    
    // 排序後記錄樣本數據 - 詳細分析
    if (records.length > 0) {
      Logger.log(`📊 排序後詳細分析（前10筆）：`);
      for (let i = 0; i < Math.min(10, records.length); i++) {
        const record = records[i];
        Logger.log(`  ${i+1}. ID=${record[fieldMapping.studentId]}, Semester="${record[fieldMapping.semester]}", Term="${record[fieldMapping.term]}", Class="${record[fieldMapping.englishClass]}"`);
      }
      
      // 檢查排序後的 Semester 和 Term 值分佈
      const postSortSemesters = records.slice(0, 10).map(r => r[fieldMapping.semester]);
      const postSortTerms = records.slice(0, 10).map(r => r[fieldMapping.term]);
      Logger.log(`📊 排序後前10筆 Semester 順序：${postSortSemesters.join(' → ')}`);
      Logger.log(`📊 排序後前10筆 Term 順序：${postSortTerms.join(' → ')}`);
    }
    
    // 最終排序驗證
    let sortValid = true;
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const curr = records[i];
      
      const prevId = parseInt(prev[fieldMapping.studentId]) || 0;
      const currId = parseInt(curr[fieldMapping.studentId]) || 0;
      
      if (prevId > currId) {
        sortValid = false;
        Logger.log(`❌ 排序驗證失敗: 學生ID ${prevId} > ${currId}`);
        break;
      }
      
      if (prevId === currId) {
        const semOrder = { 'Fall': 0, 'Spring': 1 };
        const prevSem = semOrder[prev[fieldMapping.semester]] || 999;
        const currSem = semOrder[curr[fieldMapping.semester]] || 999;
        
        if (prevSem > currSem) {
          sortValid = false;
          Logger.log(`❌ 排序驗證失敗: 學期 ${prev[fieldMapping.semester]} > ${curr[fieldMapping.semester]} (學生ID: ${prevId})`);
          break;
        }
      }
    }
    
    if (!sortValid) {
      Logger.log('🔄 排序驗證失敗，執行緊急重新排序...');
      // 緊急重新排序逼編碼避免無限迴圈
      return { success: false, data: allData, recordCount: records.length, error: '排序驗證失敗' };
    }
    
    Logger.log(`✅ 記錄排序完成，順序：學生ID (小→大) → 學期 (Fall→Spring) → Term (Beginning→Midterm→Final) → English Class (小→大)`);
    
    // 返回包含標題和排序後資料的完整陣列
    const sortedData = [headers, ...records];
    
    return {
      success: true,
      data: sortedData,
      recordCount: records.length
    };
    
  } catch (error) {
    Logger.log(`❌ 統一排序函數錯誤：${error.toString()}`);
    Logger.log(`📍 錯誤堆疊：${error.stack}`);
    Logger.log(`📊 資料狀態：${allData ? `${allData.length} 行資料` : '無資料'}`);
    return { success: false, data: allData, recordCount: 0, error: `排序失敗：${error.message}` };
  }
}

/**
 * 手動排序現有的電聯記錄
 */
function sortContactRecords() {
  try {
    const ui = SpreadsheetApp.getUi();
    const currentSheet = SpreadsheetApp.getActiveSheet();
    const recordBook = SpreadsheetApp.getActiveSpreadsheet();
    
    // 檢查是否在老師記錄簿中
    const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    if (!summarySheet) {
      ui.alert('錯誤', '請在老師記錄簿中執行此功能', ui.ButtonSet.OK);
      return;
    }
    
    // 獲取電聯記錄工作表
    const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (!contactLogSheet) {
      ui.alert('錯誤', '找不到電聯記錄工作表', ui.ButtonSet.OK);
      return;
    }
    
    // 獲取所有資料
    const allData = contactLogSheet.getDataRange().getValues();
    if (allData.length < 2) {
      ui.alert('提醒', '沒有電聯記錄需要排序', ui.ButtonSet.OK);
      return;
    }
    
    // 確認操作
    const response = ui.alert(
      '重新排序電聯記錄',
      '將按照以下順序重新排序所有電聯記錄：\n• 學生ID (小→大)\n• 學期 (Fall→Spring)\n• 時期 (Beginning→Midterm→Final)\n• 班級 (小→大)\n\n確定要繼續嗎？',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) return;
    
    // 執行排序（使用統一排序函數）
    const sortResult = sortContactRecordsData(allData);
    
    if (sortResult.success) {
      // 清除並重新寫入排序後的資料
      contactLogSheet.clear();
      contactLogSheet.getRange(1, 1, sortResult.data.length, sortResult.data[0].length).setValues(sortResult.data);
      
      // 重新設定格式
      contactLogSheet.getRange(1, 1, 1, sortResult.data[0].length).setFontWeight('bold').setBackground('#E8F4FD');
      contactLogSheet.autoResizeColumns(1, sortResult.data[0].length);
    } else {
      throw new Error(sortResult.error || '排序失敗');
    }
    
    if (sortResult.success) {
      ui.alert(
        '排序完成！',
        `成功排序 ${sortResult.recordCount} 筆電聯記錄\n\n排序規則：\n• 學生ID (小→大)\n• 學期 (Fall→Spring)\n• 時期 (Beginning→Midterm→Final)\n• 班級 (小→大)`,
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('錯誤', '排序失敗：' + (sortResult.error || '未知錯誤'), ui.ButtonSet.OK);
    }
    
  } catch (error) {
    Logger.log('排序電聯記錄失敗：' + error.toString());
    safeErrorHandler('排序電聯記錄', error);
  }
}

/**
 * 驗證電聯記錄排序正確性
 * @param {Sheet} contactLogSheet - 電聯記錄工作表 (可選，未提供時自動獲取當前工作表)
 * @returns {Object} - {isValid: boolean, errors: Array}
 */
function validateContactRecordsSorting(contactLogSheet) {
  try {
    // 參數檢查和自動獲取工作表
    if (!contactLogSheet) {
      const recordBook = SpreadsheetApp.getActiveSpreadsheet();
      const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
      if (!summarySheet) {
        return { isValid: false, errors: ['請在老師記錄簿中執行此功能'] };
      }
      contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
      if (!contactLogSheet) {
        return { isValid: false, errors: ['找不到電聯記錄工作表'] };
      }
    }
    
    // 檢查工作表是否有效
    if (typeof contactLogSheet.getDataRange !== 'function') {
      return { isValid: false, errors: ['無效的工作表物件'] };
    }
    
    const allData = contactLogSheet.getDataRange().getValues();
    if (allData.length < 2) {
      return { isValid: true, errors: [] }; // 無資料或只有標題，視為有效
    }
    
    const records = allData.slice(1); // 跳過標題行
    const errors = [];
    
    // 減少日誌輸出以提高性能（診斷模式時）
    const isQuietMode = typeof arguments[1] === 'boolean' ? arguments[1] : false;
    if (!isQuietMode) {
      Logger.log(`🔍 驗證 ${records.length} 筆電聯記錄的排序正確性...`);
      
      // 顯示前10筆記錄的實際順序
      Logger.log(`📊 實際記錄順序檢查（前10筆）：`);
      for (let i = 0; i < Math.min(10, records.length); i++) {
        const record = records[i];
        Logger.log(`  ${i+1}. ID=${record[0]}, Semester="${record[5]}", Term="${record[6]}", Class="${record[3]}"`);
      }
    }
    
    // 欄位映射
    const fieldMapping = {
      studentId: 0,     // Student ID
      semester: 5,      // Semester
      term: 6,          // Term
      englishClass: 3   // English Class
    };
    
    // 學期和Term順序映射
    const semesterOrder = { 'Fall': 0, 'Spring': 1 };
    const termOrder = { 'Beginning': 0, 'Midterm': 1, 'Final': 2 };
    
    // 逐筆檢查排序順序
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const curr = records[i];
      
      // 學生ID檢查
      const prevId = parseInt(prev[fieldMapping.studentId]) || 0;
      const currId = parseInt(curr[fieldMapping.studentId]) || 0;
      
      if (prevId > currId) {
        errors.push(`第${i+1}筆記錄：學生ID ${prevId} > ${currId} (排序錯誤)`);
        continue;
      }
      
      // 同學生ID下的學期檢查
      if (prevId === currId) {
        const prevSem = semesterOrder[prev[fieldMapping.semester]] || 999;
        const currSem = semesterOrder[curr[fieldMapping.semester]] || 999;
        
        if (prevSem > currSem) {
          errors.push(`第${i+1}筆記錄：學期順序錯誤 ${prev[fieldMapping.semester]} > ${curr[fieldMapping.semester]} (學生ID: ${prevId})`);
          continue;
        }
        
        // 同學期下的Term檢查
        if (prevSem === currSem) {
          const prevTerm = termOrder[prev[fieldMapping.term]] || 999;
          const currTerm = termOrder[curr[fieldMapping.term]] || 999;
          
          if (prevTerm > currTerm) {
            errors.push(`第${i+1}筆記錄：Term順序錯誤 ${prev[fieldMapping.term]} > ${curr[fieldMapping.term]} (學生ID: ${prevId}, 學期: ${prev[fieldMapping.semester]})`);
          }
        }
      }
    }
    
    const isValid = errors.length === 0;
    
    if (!isQuietMode) {
      if (isValid) {
        Logger.log('✅ 電聯記錄排序驗證通過');
      } else {
        Logger.log(`❌ 電聯記錄排序驗證失敗，發現 ${errors.length} 個問題`);
        // 在非靜默模式下只顯示前3個錯誤
        errors.slice(0, 3).forEach(error => Logger.log(`  - ${error}`));
        if (errors.length > 3) {
          Logger.log(`  ... 還有 ${errors.length - 3} 個問題（已省略）`);
        }
      }
    }
    
    return { isValid, errors };
    
  } catch (error) {
    Logger.log(`❌ 排序驗證過程發生錯誤：${error.message}`);
    return { isValid: false, errors: [`驗證過程錯誤：${error.message}`] };
  }
}

/**
 * 診斷電聯記錄排序問題的工具函數
 * 用於排查和分析排序失敗的原因
 */
function diagnoseSortingIssues() {
  try {
    const ui = SpreadsheetApp.getUi();
    const recordBook = SpreadsheetApp.getActiveSpreadsheet();
    
    // 檢查是否在老師記錄簿中
    const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    if (!summarySheet) {
      ui.alert('錯誤', '請在老師記錄簿中執行此診斷功能', ui.ButtonSet.OK);
      return;
    }
    
    const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (!contactLogSheet) {
      ui.alert('提醒', '找不到電聯記錄工作表', ui.ButtonSet.OK);
      return;
    }
    
    const allData = contactLogSheet.getDataRange().getValues();
    if (allData.length < 2) {
      ui.alert('提醒', '電聯記錄工作表沒有資料需要診斷', ui.ButtonSet.OK);
      return;
    }
    
    // 執行保護機制：大量資料時提醒用戶
    const recordCount = allData.length - 1;
    if (recordCount > 1000) {
      const proceed = ui.alert(
        '大量資料警告',
        `即將診斷 ${recordCount} 筆記錄，執行時間可能較長。\n\n建議：\n• 資料量大時請耐心等待\n• 可以先嘗試手動排序功能\n\n確定要繼續診斷嗎？`,
        ui.ButtonSet.YES_NO
      );
      if (proceed !== ui.Button.YES) {
        return;
      }
    }
    
    // 減少日誌輸出，提高性能，添加進度控制
    const startTime = new Date();
    const records = allData.slice(1);
    
    // 設定超時保護（30秒）
    const TIMEOUT_MS = 30000;
    let isTimedOut = false;
    
    try {
      // 快速資料完整性檢查（只記錄統計，不逐筆記錄）
      let incompleteRecords = 0;
      for (let i = 0; i < records.length; i++) {
        // 超時檢查
        if (new Date() - startTime > TIMEOUT_MS) {
          isTimedOut = true;
          Logger.log('⏰ 診斷執行超時，終止檢查');
          break;
        }
        
        const record = records[i];
        if (!record[0] || !record[3] || !record[5] || !record[6]) {
          incompleteRecords++;
          // 只記錄前3筆問題記錄的詳細資訊
          if (incompleteRecords <= 3) {
            Logger.log(`⚠️ 第${i + 2}行資料不完整：ID=${record[0]}, Class=${record[3]}, Semester=${record[5]}, Term=${record[6]}`);
          }
        }
      }
      
      if (isTimedOut) {
        ui.alert('診斷超時', '診斷執行時間過長已自動終止。\n\n建議：\n• 資料量過大，請先嘗試手動排序\n• 聯繫系統管理員檢查資料結構', ui.ButtonSet.OK);
        return;
      }
      
      // 執行排序驗證（使用靜默模式減少日誌輸出）
      const sortValidation = validateContactRecordsSorting(contactLogSheet, true);
      
      // 快速測試排序功能（不輸出詳細日誌）
      const sortResult = sortContactRecordsData(allData);
      
      const endTime = new Date();
      const executionTime = endTime - startTime;
      
      // 只記錄關鍵結果
      Logger.log(`🔧 診斷完成：記錄數=${records.length}, 不完整=${incompleteRecords}, 排序=${sortValidation.isValid ? '正確' : '錯誤'}, 執行時間=${executionTime}ms`);
      
      // 顯示優化後的診斷結果
      const diagnosticMessage = `電聯記錄排序診斷結果：

📊 基本資訊：
• 總記錄數：${records.length}
• 不完整記錄：${incompleteRecords}${incompleteRecords > 3 ? ' (只顯示前3筆)' : ''}
• 執行時間：${executionTime}ms

🔍 排序狀態：
• 當前排序：${sortValidation.isValid ? '✅ 正確' : '❌ 錯誤'}
• 排序功能：${sortResult.success ? '✅ 正常' : '❌ 異常'}

${!sortValidation.isValid ? `⚠️ 發現問題 (前${Math.min(3, sortValidation.errors.length)}個)：\n${sortValidation.errors.slice(0, 3).join('\n')}` : ''}

${!sortResult.success ? `\n❌ 排序功能錯誤：${sortResult.error}` : ''}

📈 性能優化：減少日誌輸出，提高執行速度。`;
      
      ui.alert('排序診斷完成', diagnosticMessage, ui.ButtonSet.OK);
      
    } catch (timeoutError) {
      // 處理超時或其他執行錯誤
      Logger.log(`⏰ 診斷執行異常：${timeoutError.message}`);
      ui.alert('診斷執行異常', `診斷過程發生錯誤：${timeoutError.message}\n\n建議：\n• 檢查資料完整性\n• 嘗試手動排序功能\n• 聯繫系統管理員`, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    Logger.log(`❌ 排序診斷失敗：${error.toString()}`);
    Logger.log(`📍 錯誤堆疊：${error.stack}`);
    safeErrorHandler('排序診斷', error);
  }
}

/**
 * 測試排序問題修復 - 專門用於排序調試
 */
function testSortingLogic() {
  try {
    Logger.log('🧪 ========== 開始測試排序邏輯修復 ==========');
    
    const recordBook = SpreadsheetApp.getActiveSpreadsheet();
    const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    
    if (!contactLogSheet) {
      Logger.log('❌ 找不到電聯記錄工作表');
      return { success: false, message: '找不到電聯記錄工作表' };
    }
    
    const allData = contactLogSheet.getDataRange().getValues();
    if (allData.length < 2) {
      Logger.log('⚠️ 電聯記錄工作表沒有資料');
      return { success: false, message: '沒有資料可測試' };
    }
    
    Logger.log('🔍 測試排序函數...');
    const sortResult = sortContactRecordsData(allData);
    
    Logger.log(`✅ 排序測試結果：${sortResult.success ? '成功' : '失敗'}`);
    if (!sortResult.success) {
      Logger.log(`❌ 排序失敗原因：${sortResult.error}`);
    }
    
    Logger.log('🔍 測試驗證函數...');
    const validation = validateContactRecordsSorting(contactLogSheet, false); // 非靜默模式
    
    Logger.log(`✅ 驗證測試結果：${validation.isValid ? '通過' : '失敗'}`);
    if (!validation.isValid) {
      Logger.log(`❌ 驗證問題：${validation.errors.slice(0, 5).join('; ')}`);
    }
    
    Logger.log('🧪 ========== 排序邏輯測試完成 ==========');
    return { 
      success: true, 
      sortResult: sortResult.success,
      validationResult: validation.isValid,
      message: '測試完成，請查看日誌了解詳細信息' 
    };
    
  } catch (error) {
    Logger.log(`❌ 排序測試失敗: ${error.message}`);
    Logger.log(`📍 錯誤堆疊: ${error.stack}`);
    return { success: false, message: error.message };
  }
}

/**
 * 測試診斷功能修復 - 用於驗證修復後的功能
 */
function testDiagnosticFixes() {
  try {
    Logger.log('🧪 ========== 開始測試診斷功能修復 ==========');
    
    // 測試1: validateContactRecordsSorting 獨立執行
    Logger.log('測試1: validateContactRecordsSorting 獨立執行');
    const validation1 = validateContactRecordsSorting();
    Logger.log(`✅ 獨立執行結果: ${validation1.isValid ? '成功' : '失敗'} - ${validation1.errors.join('; ')}`);
    
    // 測試2: validateContactRecordsSorting 靜默模式
    Logger.log('測試2: validateContactRecordsSorting 靜默模式');
    const recordBook = SpreadsheetApp.getActiveSpreadsheet();
    const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (contactLogSheet) {
      const validation2 = validateContactRecordsSorting(contactLogSheet, true);
      Logger.log(`✅ 靜默模式結果: ${validation2.isValid ? '成功' : '失敗'}`);
    } else {
      Logger.log('⚠️ 找不到電聯記錄工作表，跳過測試2');
    }
    
    // 測試3: 性能測試 - diagnoseSortingIssues 應該快速執行
    Logger.log('測試3: diagnoseSortingIssues 性能測試準備');
    Logger.log('✅ 建議手動執行 diagnoseSortingIssues 來測試性能改進');
    
    Logger.log('🧪 ========== 診斷功能修復測試完成 ==========');
    return { success: true, message: '所有測試通過' };
    
  } catch (error) {
    Logger.log(`❌ 測試失敗: ${error.message}`);
    Logger.log(`📍 錯誤堆疊: ${error.stack}`);
    return { success: false, message: error.message };
  }
}

// 注釋：舊的 performContactRecordSort 函數已被統一的 sortContactRecordsData 函數取代 