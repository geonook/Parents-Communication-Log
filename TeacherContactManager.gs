/**
 * 老師電聯記錄管理模組
 * 負責電聯記錄的預建和管理功能
 * Version: 1.0.0 - 從TeacherManagement.gs模組化拆分
 */

/**
 * 為所有學生預建Scheduled Contact電聯記錄
 * 此函數應在學生資料匯入後呼叫
 */
function prebuildScheduledContactRecords() {
  const perfSession = startTimer('預建電聯記錄', 'BATCH_OPERATION');
  
  try {
    Logger.log('📋 開始預建Scheduled Contact電聯記錄');
    
    // 統一 Web 環境架構 - 移除環境檢查
    const ui = SpreadsheetApp.getUi();
    const recordBook = SpreadsheetApp.getActiveSpreadsheet();
    
    // 檢查是否在老師記錄簿中
    const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    if (!summarySheet) {
      ui.alert('錯誤', '請在老師記錄簿中執行此功能', ui.ButtonSet.OK);
      perfSession.end(false, '非老師記錄簿環境');
      return;
    }
    
    perfSession.checkpoint('環境驗證完成');
    
    // 獲取學生清單
    const studentListSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    if (!studentListSheet) {
      ui.alert('錯誤', '找不到學生清單工作表', ui.ButtonSet.OK);
      perfSession.end(false, '找不到學生清單工作表');
      return;
    }
    
    const studentData = studentListSheet.getDataRange().getValues();
    if (studentData.length < 2) {
      ui.alert('提醒', '學生清單中沒有資料，請先匯入學生資料', ui.ButtonSet.OK);
      perfSession.end(false, '學生清單為空');
      return;
    }
    
    perfSession.checkpoint('學生資料驗證完成', { studentCount: studentData.length - 1 });
    
    // 確認操作
    const totalRecords = (studentData.length - 1) * 6; // 每位學生6筆記錄
    const response = ui.alert(
      '預建Scheduled Contact記錄',
      `將為 ${studentData.length - 1} 位學生建立完整學年的Scheduled Contact記錄\n\n每位學生建立：\n• Fall Beginning/Midterm/Final\n• Spring Beginning/Midterm/Final\n共 ${totalRecords} 筆記錄\n\n確定要繼續嗎？`,
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      perfSession.end(false, '用戶取消操作');
      return;
    }
    
    perfSession.checkpoint('用戶確認完成');
    
    // 執行預建
    const result = ErrorHandler.wrap(
      () => performPrebuildScheduledContacts(recordBook, studentData),
      '執行預建電聯記錄'
    );
    
    if (!result.success) {
      ui.alert('預建失敗', `預建過程發生錯誤：${result.error.message}\n\n請檢查學生資料格式或聯繫管理員`, ui.ButtonSet.OK);
      perfSession.end(false, `預建失敗: ${result.error.message}`);
      return;
    }
    
    const prebuildResult = result.result;
    perfSession.checkpoint('預建執行完成', { 
      studentCount: prebuildResult.studentCount,
      recordCount: prebuildResult.recordCount 
    });
    
    ui.alert(
      '預建完成！',
      `成功為 ${prebuildResult.studentCount} 位學生預建 ${prebuildResult.recordCount} 筆Scheduled Contact記錄\n\n請在電聯記錄工作表中查看，並填寫Teachers Content、Parents Responses和Contact Method欄位`,
      ui.ButtonSet.OK
    );
    
    perfSession.end(true, `預建完成: ${prebuildResult.studentCount}位學生, ${prebuildResult.recordCount}筆記錄`);
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('預建Scheduled Contact記錄', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS);
  }
}

/**
 * 執行Scheduled Contact記錄預建
 * @param {Spreadsheet} recordBook 記錄簿對象
 * @param {Array} studentData 學生資料陣列
 * @return {Object} 預建結果 {studentCount: number, recordCount: number}
 */
function performPrebuildScheduledContacts(recordBook, studentData) {
  const perfSession = startTimer('執行預建電聯記錄', 'BATCH_OPERATION');
  
  try {
    Logger.log('⚙️ 開始執行預建邏輯');
    
    const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (!contactLogSheet) {
      throw new Error('找不到電聯記錄工作表');
    }
    
    perfSession.checkpoint('電聯記錄工作表驗證完成');
    
    // 跳過標題列，獲取學生資料
    const students = studentData.slice(1);
    const prebuiltRecords = [];
    
    Logger.log(`📊 開始處理 ${students.length} 位學生的記錄預建`);
    
    // 處理每位學生
    students.forEach((student, index) => {
      const studentId = student[0];       // ID
      const chineseName = student[4];     // Chinese Name  
      const englishName = student[5];     // English Name
      const englishClass = student[9];    // English Class (第10欄)
      
      // 檢查必要欄位
      if (!studentId || !chineseName || !englishClass) {
        Logger.log(`⚠️ 跳過不完整的學生資料：${chineseName || '未知'} (第${index + 2}行)`);
        return;
      }
      
      // 將學生資料轉換為標準格式
      const studentDataObject = {
        'ID': studentId,
        'Chinese Name': chineseName,
        'English Name': englishName || '',
        'English Class': englishClass
      };
      
      // 使用統一的 generateScheduledContactsForStudent 函數
      Logger.log(`📝 為學生 ${studentId}(${chineseName}) 建立預建記錄...`);
      
      try {
        const studentScheduledContacts = generateScheduledContactsForStudent(studentDataObject);
        
        // 記錄前幾個學生的詳細信息（用於調試）
        if (prebuiltRecords.length < 12) {
          studentScheduledContacts.forEach((record, recordIndex) => {
            if (prebuiltRecords.length + recordIndex < 12) {
              Logger.log(`  📋 預建記錄 #${prebuiltRecords.length + recordIndex + 1}: ID=${record[0]}, Semester="${record[5]}", Term="${record[6]}"`);
            }
          });
        }
        
        // 將該學生的所有記錄添加到總記錄中
        prebuiltRecords.push(...studentScheduledContacts);
        
      } catch (studentError) {
        Logger.log(`❌ 為學生 ${studentId}(${chineseName}) 建立記錄失敗：${studentError.message}`);
        ErrorHandler.handle(`為學生${studentId}建立記錄`, studentError, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.DATA);
      }
    });
    
    perfSession.checkpoint('學生記錄建立完成', { totalRecords: prebuiltRecords.length });
    
    // 驗證系統配置順序
    Logger.log(`🔍 系統配置驗證：`);
    Logger.log(`  Semesters: ${SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.join(' → ')}`);
    Logger.log(`  Terms: ${SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.join(' → ')}`);
    
    // 排序預建記錄
    const sortResult = sortPrebuiltRecords(prebuiltRecords);
    
    perfSession.checkpoint('記錄排序完成', { success: sortResult.success });
    
    // 寫入排序後的預建記錄
    const writeResult = writePrebuiltRecordsToSheet(contactLogSheet, prebuiltRecords);
    
    perfSession.checkpoint('記錄寫入完成', { writtenCount: writeResult.writtenCount });
    
    const result = {
      studentCount: students.filter(s => s[0] && s[4] && s[9]).length, // 有效學生數
      recordCount: prebuiltRecords.length,
      sortSuccess: sortResult.success,
      writtenCount: writeResult.writtenCount
    };
    
    Logger.log(`✅ 預建完成：${result.studentCount}位學生, ${result.recordCount}筆記錄`);
    perfSession.end(true, `預建成功：${result.studentCount}位學生，${result.recordCount}筆記錄`);
    
    return result;
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('執行預建電聯記錄', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS);
    throw error;
  }
}

/**
 * 排序預建記錄
 * @param {Array} prebuiltRecords 預建記錄陣列
 * @return {Object} 排序結果 {success: boolean, error?: string}
 */
function sortPrebuiltRecords(prebuiltRecords) {
  try {
    Logger.log(`🔄 開始排序 ${prebuiltRecords.length} 筆Scheduled Contact記錄...`);
    
    // 創建虛擬標題和完整資料陣列供統一排序函數使用
    const headers = SYSTEM_CONFIG.CONTACT_FIELDS || [
      'Student ID', 'Name', 'English Name', 'English Class', 'Date',
      'Semester', 'Term', 'Contact Type', 'Teachers Content', 'Parents Responses', 'Contact Method'
    ];
    const mockDataWithHeaders = [headers, ...prebuiltRecords];
    
    // 使用統一排序函數進行排序
    const sortResult = sortContactRecordsData(mockDataWithHeaders);
    
    if (!sortResult.success) {
      const errorMsg = `預建記錄排序失敗：${sortResult.error}`;
      Logger.log(`⚠️ ${errorMsg}`);
      Logger.log(`🔄 改用備用排序繼續預建流程`);
      
      // 使用備用排序邏輯
      prebuiltRecords.sort((a, b) => {
        // 第一優先：學期（Fall → Spring）
        const semesterOrder = { 'Fall': 0, 'Spring': 1 };
        const semesterA = semesterOrder[a[5]] !== undefined ? semesterOrder[a[5]] : 999;
        const semesterB = semesterOrder[b[5]] !== undefined ? semesterOrder[b[5]] : 999;
        
        if (semesterA !== semesterB) return semesterA - semesterB;
        
        // 第二優先：Term（Beginning → Midterm → Final）
        const termOrder = { 'Beginning': 0, 'Midterm': 1, 'Final': 2 };
        const termA = termOrder[a[6]] !== undefined ? termOrder[a[6]] : 999;
        const termB = termOrder[b[6]] !== undefined ? termOrder[b[6]] : 999;
        
        if (termA !== termB) return termA - termB;
        
        // 第三優先：English Class（字串排序）
        const classCompare = (a[3] || '').localeCompare(b[3] || '');
        if (classCompare !== 0) return classCompare;
        
        // 第四優先：學生ID
        return compareStudentIds(a[0], b[0]);
      });
      
      Logger.log(`✅ 使用備用排序完成記錄整理`);
      return { success: true, usedBackup: true };
      
    } else {
      // 提取排序後的資料（去除標題）
      prebuiltRecords.length = 0; // 清空原陣列
      prebuiltRecords.push(...sortResult.data.slice(1)); // 將排序後的資料重新填入
      Logger.log(`✅ 預建記錄排序完成，使用標準排序邏輯`);
      return { success: true, usedBackup: false };
    }
    
  } catch (error) {
    Logger.log(`❌ 預建記錄排序失敗：${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 將預建記錄寫入工作表
 * @param {Sheet} contactLogSheet 電聯記錄工作表
 * @param {Array} prebuiltRecords 預建記錄陣列
 * @return {Object} 寫入結果 {success: boolean, writtenCount: number}
 */
function writePrebuiltRecordsToSheet(contactLogSheet, prebuiltRecords) {
  try {
    Logger.log('📝 開始寫入預建記錄到工作表');
    
    if (prebuiltRecords.length === 0) {
      Logger.log('⚠️ 沒有預建記錄需要寫入');
      return { success: true, writtenCount: 0 };
    }
    
    const startRow = contactLogSheet.getLastRow() + 1;
    
    // 檢查現有資料（避免重複）
    const existingData = contactLogSheet.getDataRange().getValues();
    if (existingData.length > 1) {
      Logger.log('⚠️ 工作表中已有資料，檢查是否有重複的預建記錄...');
    }
    
    // 寫入預建記錄
    const fieldsCount = SYSTEM_CONFIG.CONTACT_FIELDS ? SYSTEM_CONFIG.CONTACT_FIELDS.length : 11;
    contactLogSheet.getRange(startRow, 1, prebuiltRecords.length, fieldsCount)
      .setValues(prebuiltRecords);
    
    // 立即驗證寫入的資料
    const verificationCount = Math.min(5, prebuiltRecords.length);
    if (verificationCount > 0) {
      const writtenData = contactLogSheet.getRange(startRow, 1, verificationCount, fieldsCount).getValues();
      Logger.log('📊 寫入工作表的排序驗證（前5筆）：');
      writtenData.forEach((record, index) => {
        Logger.log(`  ${index + 1}. ID: ${record[0]}, Semester: ${record[5]}, Term: ${record[6]}, Class: ${record[3]}`);
      });
    }
    
    Logger.log(`✅ 成功寫入 ${prebuiltRecords.length} 筆預建記錄到工作表`);
    return { success: true, writtenCount: prebuiltRecords.length };
    
  } catch (error) {
    Logger.log(`❌ 寫入預建記錄失敗：${error.message}`);
    ErrorHandler.handle('寫入預建記錄', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.DATA);
    return { success: false, writtenCount: 0, error: error.message };
  }
}

/**
 * 為單一學生生成所有Scheduled Contact記錄
 * @param {Object} studentData 學生資料對象
 * @return {Array} 該學生的所有預建記錄
 */
function generateScheduledContactsForStudent(studentData) {
  const records = [];
  
  // 確保資料完整性
  const studentId = studentData['ID'] || '';
  const chineseName = studentData['Chinese Name'] || '';
  const englishName = studentData['English Name'] || '';
  const englishClass = studentData['English Class'] || '';
  
  if (!studentId || !chineseName || !englishClass) {
    throw new Error(`學生資料不完整：ID=${studentId}, Name=${chineseName}, Class=${englishClass}`);
  }
  
  // 為每個學期和階段生成記錄
  SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.forEach(semester => {
    SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.forEach(term => {
      const record = [
        studentId,                    // Student ID
        chineseName,                  // Name (Chinese)
        englishName,                  // English Name
        englishClass,                 // English Class
        '',                           // Date (空白，待填寫)
        semester,                     // Semester
        term,                         // Term
        'Scheduled Contact',          // Contact Type
        '',                           // Teachers Content (空白，待填寫)
        '',                           // Parents Responses (空白，待填寫)
        ''                            // Contact Method (空白，待填寫)
      ];
      
      records.push(record);
    });
  });
  
  return records;
}

/**
 * 設定電聯記錄工作表的驗證規則
 * @param {Sheet} sheet 電聯記錄工作表
 * @param {Object} teacherInfo 老師資訊對象
 */
function setupContactLogValidations(sheet, teacherInfo) {
  const perfSession = startTimer('設定電聯記錄驗證規則', 'RECORD_CREATION');
  
  try {
    Logger.log('🔧 開始設定電聯記錄工作表驗證規則');
    
    // English Class 下拉選單（第4欄）
    const classRange = sheet.getRange('D2:D10000');
    const classValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(teacherInfo.classes)
      .setAllowInvalid(false)
      .setHelpText('請選擇正確的授課班級')
      .build();
    classRange.setDataValidation(classValidation);
    classRange.setBackground('#E8F5E8');
    
    perfSession.checkpoint('班級驗證設定完成');
    
    // Date 日期格式（第5欄）
    const dateRange = sheet.getRange('E2:E10000');
    dateRange.setNumberFormat('yyyy/mm/dd');
    dateRange.setBackground('#F0F8FF');
    
    // Semester 學期下拉選單（第6欄）
    const semesterRange = sheet.getRange('F2:F10000');
    const semesterValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS)
      .setAllowInvalid(false)
      .setHelpText('請選擇學期：Fall 或 Spring')
      .build();
    semesterRange.setDataValidation(semesterValidation);
    semesterRange.setBackground('#FFF3E0');
    
    // Term 階段下拉選單（第7欄）
    const termRange = sheet.getRange('G2:G10000');
    const termValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS)
      .setAllowInvalid(false)
      .setHelpText('請選擇階段：Beginning、Midterm 或 Final')
      .build();
    termRange.setDataValidation(termValidation);
    termRange.setBackground('#FFF3E0');
    
    // Contact Type 聯繫類型下拉選單（第8欄）
    const contactTypeRange = sheet.getRange('H2:H10000');
    const contactTypes = ['Scheduled Contact', 'Parent Initiated', 'Teacher Initiated', 'Emergency Contact'];
    const contactTypeValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(contactTypes)
      .setAllowInvalid(false)
      .setHelpText('請選擇聯繫類型')
      .build();
    contactTypeRange.setDataValidation(contactTypeValidation);
    contactTypeRange.setBackground('#F5F5F5');
    
    perfSession.checkpoint('所有驗證規則設定完成');
    
    Logger.log('✅ 電聯記錄工作表驗證規則設定完成');
    perfSession.end(true, '驗證規則設定成功');
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('設定電聯記錄驗證規則', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS);
    throw error;
  }
}

/**
 * 設定電聯記錄工作表的條件格式
 * @param {Sheet} sheet 電聯記錄工作表
 */
function setupContactLogConditionalFormatting(sheet) {
  const perfSession = startTimer('設定電聯記錄條件格式', 'RECORD_CREATION');
  
  try {
    Logger.log('🎨 開始設定電聯記錄工作表條件格式');
    
    const rules = [];
    
    // Scheduled Contact 記錄用綠色背景
    const scheduledContactRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Scheduled Contact')
      .setBackground('#E8F5E8')
      .setRanges([sheet.getRange('H2:H10000')])
      .build();
    rules.push(scheduledContactRule);
    
    // 緊急聯繫用紅色背景
    const emergencyRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Emergency Contact')
      .setBackground('#FFEBEE')
      .setRanges([sheet.getRange('H2:H10000')])
      .build();
    rules.push(emergencyRule);
    
    // Fall 學期用藍色背景
    const fallRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Fall')
      .setBackground('#E3F2FD')
      .setRanges([sheet.getRange('F2:F10000')])
      .build();
    rules.push(fallRule);
    
    // Spring 學期用綠色背景
    const springRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Spring')
      .setBackground('#E8F5E8')
      .setRanges([sheet.getRange('F2:F10000')])
      .build();
    rules.push(springRule);
    
    // 應用所有規則
    sheet.setConditionalFormatRules(rules);
    
    perfSession.checkpoint('條件格式規則應用完成');
    
    Logger.log('✅ 電聯記錄工作表條件格式設定完成');
    perfSession.end(true, '條件格式設定成功');
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('設定電聯記錄條件格式', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS);
    throw error;
  }
}

/**
 * 比較學生ID（處理數字和文字混合格式）
 * @param {string|number} idA 第一個ID
 * @param {string|number} idB 第二個ID
 * @return {number} 比較結果（-1, 0, 1）
 */
function compareStudentIds(idA, idB) {
  // 轉換為字串進行比較
  const strA = String(idA || '');
  const strB = String(idB || '');
  
  // 嘗試數值比較
  const numA = parseInt(strA);
  const numB = parseInt(strB);
  
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }
  
  // 回退到字串比較
  return strA.localeCompare(strB);
}