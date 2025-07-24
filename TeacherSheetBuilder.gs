/**
 * 老師記錄簿工作表建構模組
 * 負責各個工作表的創建與設定
 * Version: 1.0.0 - 從TeacherManagement.gs模組化拆分
 */

/**
 * 創建總覽工作表
 * @param {Spreadsheet} recordBook 記錄簿對象
 * @param {Object} teacherInfo 老師資訊對象
 */
function createSummarySheet(recordBook, teacherInfo) {
  const perfSession = startTimer('創建總覽工作表', 'RECORD_CREATION');
  
  try {
    Logger.log('📊 開始創建總覽工作表');
    
    const sheet = recordBook.insertSheet(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    
    perfSession.checkpoint('工作表創建完成');
    
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
    
    perfSession.checkpoint('基本資訊設定完成');
    
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
    
    perfSession.checkpoint('統計區域設定完成');
    
    // 格式設定
    sheet.getRange('A1:E20').setHorizontalAlignment('left');
    sheet.getRange(11, 1, 1, statsHeaders[0].length)
      .setFontWeight('bold')
      .setBackground('#E8F4FD');
    
    // 調整欄寬
    sheet.autoResizeColumns(1, 5);
    
    // 保護工作表，僅允許管理員編輯
    protectSheetForAdminOnly(sheet, '總覽工作表 - 僅管理員可編輯統計數據和基本資訊');
    
    perfSession.checkpoint('格式和保護設定完成');
    
    Logger.log('✅ 總覽工作表基本結構建立完成，公式將在所有工作表建立完成後設定');
    perfSession.end(true, '總覽工作表創建成功');
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('創建總覽工作表', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS);
    throw error;
  }
}

/**
 * 設定總覽工作表的公式（在所有工作表建立完成後執行）
 * @param {Spreadsheet} recordBook 記錄簿對象
 * @param {Object} teacherInfo 老師資訊對象
 */
function setupSummaryFormulas(recordBook, teacherInfo) {
  const perfSession = startTimer('設定總覽工作表公式', 'RECORD_CREATION');
  
  try {
    Logger.log('🔄 開始設定總覽工作表公式');
    
    const sheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    if (!sheet) {
      throw new Error('找不到總覽工作表');
    }
    
    // 確保參考的工作表存在
    const studentListSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    
    if (!studentListSheet) {
      throw new Error('找不到學生清單工作表，無法設定統計公式');
    }
    
    if (!contactLogSheet) {
      throw new Error('找不到電聯記錄工作表，無法設定統計公式');
    }
    
    perfSession.checkpoint('工作表依賴檢查完成');
    
    // 為每個班級設定統計公式
    teacherInfo.classes.forEach((className, index) => {
      const row = 12 + index;
      Logger.log(`設定班級 ${className} 的統計公式 (第${row}行)`);
      
      try {
        // 學生人數（從學生清單計算）
        const studentCountFormula = `=IFERROR(COUNTIFS('${SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST}'!J:J,"${className}"),0)`;
        const studentCountRange = sheet.getRange(row, 2);
        studentCountRange.setFormula(studentCountFormula);
        
        // 定期電聯次數（Scheduled Contact 類型且四個關鍵欄位均已填寫）
        const scheduledContactsFormula = `=IFERROR(COUNTIFS('${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!D:D,"${className}",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!H:H,"Scheduled Contact",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!E:E,"<>",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!I:I,"<>",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!J:J,"<>",'${SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG}'!K:K,"<>"),0)`;
        const scheduledRange = sheet.getRange(row, 3);
        scheduledRange.setFormula(scheduledContactsFormula);
        
        // 總電聯次數（該班級所有記錄且四個關鍵欄位均已填寫）
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
        
      } catch (formulaError) {
        Logger.log(`⚠️ 設定班級 ${className} 公式時發生錯誤：${formulaError.message}`);
        ErrorHandler.handle(`設定班級${className}公式`, formulaError, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.BUSINESS);
      }
    });
    
    perfSession.checkpoint('公式設定完成');
    
    // 採用與進度追蹤相同的強制計算機制
    try {
      Logger.log('🔄 強制計算總覽工作表公式');
      
      // 第一次全域刷新
      SpreadsheetApp.flush();
      Utilities.sleep(200);
      
      // 逐一觸發每個公式的重新計算
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
          
        } catch (cellError) {
          Logger.log(`⚠️ 重新計算班級 ${className} 公式時發生錯誤：${cellError.message}`);
        }
      });
      
      // 最後一次全域強制重新計算
      SpreadsheetApp.flush();
      Utilities.sleep(300);
      
      perfSession.checkpoint('公式重新計算完成');
      Logger.log('✅ 總覽工作表公式設定完成（使用增強觸發機制）');
      
    } catch (calcError) {
      Logger.log(`⚠️ 總覽工作表公式計算時發生錯誤：${calcError.message}`);
      ErrorHandler.handle('總覽工作表公式計算', calcError, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.PERFORMANCE);
    }
    
    perfSession.end(true, '總覽工作表公式設定完成');
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('設定總覽工作表公式', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS);
    throw error;
  }
}

/**
 * 創建學生清單工作表
 * @param {Spreadsheet} recordBook 記錄簿對象
 * @param {Object} teacherInfo 老師資訊對象
 */
function createStudentListSheet(recordBook, teacherInfo) {
  const perfSession = startTimer('創建學生清單工作表', 'RECORD_CREATION');
  
  try {
    Logger.log('👥 開始創建學生清單工作表');
    
    const sheet = recordBook.insertSheet(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    
    perfSession.checkpoint('工作表創建完成');
    
    // 設定標題 - 根據用戶的學生總表格式
    sheet.getRange(1, 1, 1, SYSTEM_CONFIG.STUDENT_FIELDS.length)
      .setValues([SYSTEM_CONFIG.STUDENT_FIELDS]);
    
    // 格式設定
    sheet.getRange(1, 1, 1, SYSTEM_CONFIG.STUDENT_FIELDS.length)
      .setFontWeight('bold')
      .setBackground('#E8F4FD');
    
    sheet.autoResizeColumns(1, SYSTEM_CONFIG.STUDENT_FIELDS.length);
    
    perfSession.checkpoint('基本格式設定完成');
    
    // Grade 年級下拉選單（第2欄）
    const gradeRange = sheet.getRange('B2:B1000'); 
    const gradeValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(SYSTEM_CONFIG.GRADE_LEVELS)
      .setAllowInvalid(false)
      .setHelpText('🎓 請選擇年級：G1-G6')
      .build();
    gradeRange.setDataValidation(gradeValidation);
    gradeRange.setBackground('#F0F8FF'); // 淺藍背景
    
    // English Class 英語班級下拉選單（第10欄）
    const englishClassRange = sheet.getRange('J2:J1000');
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
    
    perfSession.checkpoint('數據驗證設定完成');
    
    // 凍結標題行
    sheet.setFrozenRows(1);
    
    // 添加使用說明
    const instructionRow = sheet.getMaxRows() - 2;
    sheet.getRange(instructionRow, 1).setValue('📝 使用說明：');
    sheet.getRange(instructionRow + 1, 1).setValue('• 藍色欄位(Grade)：必須選擇G1-G6');
    sheet.getRange(instructionRow + 2, 1).setValue('• 綠色欄位(English Class)：必須選擇正確的英語班級');
    sheet.getRange(instructionRow + 3, 1).setValue('• 橙色欄位(LT)：本地教師姓名，用於系統識別');
    sheet.getRange(instructionRow, 1, 4, 1)
      .setFontStyle('italic')
      .setFontColor('#666666')
      .setFontSize(9);
    
    Logger.log('✅ 學生清單工作表創建完成');
    perfSession.end(true, '學生清單工作表創建成功');
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('創建學生清單工作表', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS);
    throw error;
  }
}

/**
 * 創建電聯記錄工作表
 * @param {Spreadsheet} recordBook 記錄簿對象
 * @param {Object} teacherInfo 老師資訊對象
 */
function createContactLogSheet(recordBook, teacherInfo) {
  const perfSession = startTimer('創建電聯記錄工作表', 'RECORD_CREATION');
  
  try {
    Logger.log('📞 開始創建電聯記錄工作表');
    
    const sheet = recordBook.insertSheet(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    
    perfSession.checkpoint('工作表創建完成');
    
    // 設定標題
    const headers = SYSTEM_CONFIG.CONTACT_LOG_HEADERS;
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // 格式設定
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#E8F4FD');
    
    // 設定資料驗證和格式
    setupContactLogValidations(sheet, teacherInfo);
    
    perfSession.checkpoint('數據驗證設定完成');
    
    // 條件格式
    setupContactLogConditionalFormatting(sheet);
    
    perfSession.checkpoint('條件格式設定完成');
    
    // 凍結標題行和前三欄
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(3);
    
    sheet.autoResizeColumns(1, headers.length);
    
    Logger.log('✅ 電聯記錄工作表創建完成');
    perfSession.end(true, '電聯記錄工作表創建成功');
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('創建電聯記錄工作表', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS);
    throw error;
  }
}

/**
 * 創建進度追蹤工作表
 * @param {Spreadsheet} recordBook 記錄簿對象
 * @param {Object} teacherInfo 老師資訊對象
 */
function createProgressSheet(recordBook, teacherInfo) {
  const perfSession = startTimer('創建進度追蹤工作表', 'RECORD_CREATION');
  
  try {
    Logger.log('📈 開始創建進度追蹤工作表');
    
    const sheet = recordBook.insertSheet(SYSTEM_CONFIG.SHEET_NAMES.PROGRESS);
    
    perfSession.checkpoint('工作表創建完成');
    
    // 設定標題
    const headers = ['學生ID', '學生姓名', '英文姓名', '班級', 'Fall-Beginning', 'Fall-Midterm', 'Fall-Final', 'Spring-Beginning', 'Spring-Midterm', 'Spring-Final', '完成度', '最後更新'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // 格式設定
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#E8F4FD');
    
    perfSession.checkpoint('標題設定完成');
    
    // 設定條件格式
    setupProgressSheetConditionalFormatting(sheet, 2, 1000);
    
    perfSession.checkpoint('條件格式設定完成');
    
    // 凍結標題行和前四欄
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(4);
    
    sheet.autoResizeColumns(1, headers.length);
    
    Logger.log('✅ 進度追蹤工作表創建完成');
    perfSession.end(true, '進度追蹤工作表創建成功');
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('創建進度追蹤工作表', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS);
    throw error;
  }
}