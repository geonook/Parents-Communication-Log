/**
 * 老師記錄簿電聯記錄排序系統模組
 * 負責電聯記錄的排序邏輯和驗證
 * Version: 1.0.0 - 從TeacherManagement.gs模組化拆分
 */

/**
 * 手動排序現有的電聯記錄
 */
function sortContactRecords() {
  const perfSession = startTimer('手動排序電聯記錄', 'RECORD_CREATION');
  
  try {
    Logger.log('🔄 開始手動排序電聯記錄');
    
    const ui = SpreadsheetApp.getUi();
    const recordBook = SpreadsheetApp.getActiveSpreadsheet();
    
    // 檢查是否在老師記錄簿中
    const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    if (!summarySheet) {
      ui.alert('錯誤', '請在老師記錄簿中執行此功能', ui.ButtonSet.OK);
      perfSession.end(false, '非老師記錄簿環境');
      return;
    }
    
    // 獲取電聯記錄工作表
    const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (!contactLogSheet) {
      ui.alert('錯誤', '找不到電聯記錄工作表', ui.ButtonSet.OK);
      perfSession.end(false, '找不到電聯記錄工作表');
      return;
    }
    
    perfSession.checkpoint('環境驗證完成');
    
    // 獲取所有資料
    const allData = contactLogSheet.getDataRange().getValues();
    if (allData.length < 2) {
      ui.alert('提醒', '沒有電聯記錄需要排序', ui.ButtonSet.OK);
      perfSession.end(false, '沒有記錄需要排序');
      return;
    }
    
    perfSession.checkpoint('資料獲取完成', { recordCount: allData.length - 1 });
    
    // 確認操作
    const response = ui.alert(
      '重新排序電聯記錄',
      `將按照以下順序重新排序所有 ${allData.length - 1} 筆電聯記錄：\n• 學生ID (小→大)\n• 學期 (Fall→Spring)\n• 時期 (Beginning→Midterm→Final)\n• 班級 (小→大)\n\n確定要繼續嗎？`,
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      perfSession.end(false, '用戶取消排序');
      return;
    }
    
    perfSession.checkpoint('用戶確認完成');
    
    // 執行排序（使用統一排序函數）
    const sortResult = ErrorHandler.wrap(
      () => sortContactRecordsData(allData),
      '執行電聯記錄排序'
    );
    
    if (!sortResult.success) {
      ui.alert('排序失敗', `排序過程發生錯誤：${sortResult.error.message}`, ui.ButtonSet.OK);
      perfSession.end(false, `排序失敗: ${sortResult.error.message}`);
      return;
    }
    
    const sortData = sortResult.result;
    perfSession.checkpoint('排序執行完成', { success: sortData.success });
    
    if (sortData.success) {
      // 清除並重新寫入排序後的資料
      contactLogSheet.clear();
      contactLogSheet.getRange(1, 1, sortData.data.length, sortData.data[0].length)
        .setValues(sortData.data);
      
      // 重新設定格式
      contactLogSheet.getRange(1, 1, 1, sortData.data[0].length)
        .setFontWeight('bold')
        .setBackground('#E8F4FD');
      contactLogSheet.autoResizeColumns(1, sortData.data[0].length);
      
      perfSession.checkpoint('格式重新設定完成');
      
      ui.alert(
        '排序完成！',
        `成功排序 ${sortData.recordCount || allData.length - 1} 筆電聯記錄\n\n排序規則：\n• 學生ID (小→大)\n• 學期 (Fall→Spring)\n• 時期 (Beginning→Midterm→Final)\n• 班級 (小→大)`,
        ui.ButtonSet.OK
      );
      
      perfSession.end(true, `排序完成：${sortData.recordCount || allData.length - 1}筆記錄`);
    } else {
      throw new Error(sortData.error || '排序失敗');
    }
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('手動排序電聯記錄', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS);
  }
}

/**
 * 統一的電聯記錄排序資料處理函數
 * @param {Array} allData 包含標題的完整資料陣列
 * @return {Object} 排序結果 {success: boolean, data?: Array, recordCount?: number, error?: string}
 */
function sortContactRecordsData(allData) {
  const perfSession = startTimer('電聯記錄數據排序', 'DATA_IMPORT');
  
  try {
    Logger.log(`🔄 開始排序電聯記錄數據，總筆數：${allData.length - 1}`);
    
    if (!allData || allData.length < 2) {
      perfSession.end(true, '無需排序的數據');
      return {
        success: true,
        data: allData,
        recordCount: 0,
        message: '無資料需要排序'
      };
    }
    
    // 分離標題和資料
    const headers = allData[0];
    const records = allData.slice(1);
    
    perfSession.checkpoint('數據分離完成', { 
      headerCount: headers.length,
      recordCount: records.length 
    });
    
    // 驗證必要欄位存在
    const requiredFields = ['Student ID', 'Semester', 'Term', 'English Class'];
    const fieldIndices = {};
    
    requiredFields.forEach(field => {
      const index = headers.findIndex(h => 
        h && h.toString().toLowerCase().includes(field.toLowerCase())
      );
      if (index === -1) {
        throw new Error(`找不到必要欄位：${field}`);
      }
      fieldIndices[field] = index;
    });
    
    perfSession.checkpoint('欄位驗證完成');
    
    // 執行排序
    const sortedRecords = performContactRecordsSort(records, fieldIndices);
    
    perfSession.checkpoint('記錄排序完成');
    
    // 重新組合資料
    const sortedData = [headers, ...sortedRecords];
    
    // 驗證排序結果
    const validation = quickValidateSorting(sortedRecords, fieldIndices);
    
    perfSession.checkpoint('排序驗證完成', { isValid: validation.isValid });
    
    const result = {
      success: true,
      data: sortedData,
      recordCount: sortedRecords.length,
      validation: validation,
      message: `成功排序 ${sortedRecords.length} 筆記錄`
    };
    
    if (!validation.isValid) {
      Logger.log(`⚠️ 排序後驗證發現問題：${validation.errors.slice(0, 3).join('; ')}`);
      result.warning = '排序完成但驗證發現問題';
    } else {
      Logger.log('✅ 電聯記錄排序驗證通過');
    }
    
    perfSession.end(true, `排序成功：${sortedRecords.length}筆記錄`);
    
    return result;
    
  } catch (error) {
    perfSession.end(false, error.message);
    Logger.log(`❌ 排序電聯記錄數據失敗：${error.message}`);
    return {
      success: false,
      error: error.message,
      data: allData // 返回原始數據
    };
  }
}

/**
 * 執行電聯記錄排序
 * @param {Array} records 記錄陣列
 * @param {Object} fieldIndices 欄位索引對象
 * @return {Array} 排序後的記錄陣列
 */
function performContactRecordsSort(records, fieldIndices) {
  try {
    Logger.log('🔄 執行電聯記錄排序邏輯');
    
    // 排序優先級映射
    const semesterOrder = { 'Fall': 0, 'Spring': 1 };
    const termOrder = { 'Beginning': 0, 'Midterm': 1, 'Final': 2 };
    
    const sortedRecords = records.sort((a, b) => {
      // 第一優先：學生ID（使用通用ID比較函數）
      const idComparison = compareStudentIds(
        a[fieldIndices['Student ID']], 
        b[fieldIndices['Student ID']]
      );
      if (idComparison !== 0) return idComparison;
      
      // 第二優先：學期（Fall → Spring）
      const semesterA = a[fieldIndices['Semester']];
      const semesterB = b[fieldIndices['Semester']];
      const semesterOrderA = semesterOrder[semesterA] !== undefined ? semesterOrder[semesterA] : 999;
      const semesterOrderB = semesterOrder[semesterB] !== undefined ? semesterOrder[semesterB] : 999;
      
      if (semesterOrderA !== semesterOrderB) {
        return semesterOrderA - semesterOrderB;
      }
      
      // 第三優先：Term（Beginning → Midterm → Final）
      const termA = a[fieldIndices['Term']];
      const termB = b[fieldIndices['Term']];
      const termOrderA = termOrder[termA] !== undefined ? termOrder[termA] : 999;
      const termOrderB = termOrder[termB] !== undefined ? termOrder[termB] : 999;
      
      if (termOrderA !== termOrderB) {
        return termOrderA - termOrderB;
      }
      
      // 第四優先：English Class（字串排序）
      const classA = (a[fieldIndices['English Class']] || '').toString();
      const classB = (b[fieldIndices['English Class']] || '').toString();
      
      return classA.localeCompare(classB);
    });
    
    Logger.log(`✅ 排序完成：${sortedRecords.length} 筆記錄`);
    
    // 記錄排序後的前幾筆供驗證
    if (sortedRecords.length > 0) {
      Logger.log('📊 排序後前5筆記錄：');
      for (let i = 0; i < Math.min(5, sortedRecords.length); i++) {
        const record = sortedRecords[i];
        Logger.log(`  ${i+1}. ID: ${record[fieldIndices['Student ID']]}, Semester: ${record[fieldIndices['Semester']]}, Term: ${record[fieldIndices['Term']]}, Class: ${record[fieldIndices['English Class']]}`);
      }
    }
    
    return sortedRecords;
    
  } catch (error) {
    Logger.log(`❌ 執行排序邏輯失敗：${error.message}`);
    throw error;
  }
}

/**
 * 快速驗證排序結果
 * @param {Array} records 已排序的記錄陣列
 * @param {Object} fieldIndices 欄位索引對象
 * @return {Object} 驗證結果 {isValid: boolean, errors: Array}
 */
function quickValidateSorting(records, fieldIndices) {
  try {
    const errors = [];
    const semesterOrder = { 'Fall': 0, 'Spring': 1 };
    const termOrder = { 'Beginning': 0, 'Midterm': 1, 'Final': 2 };
    
    // 檢查前10筆或全部記錄（如果少於10筆）
    const checkCount = Math.min(10, records.length - 1);
    
    for (let i = 0; i < checkCount; i++) {
      const curr = records[i];
      const next = records[i + 1];
      
      // 學生ID檢查
      const idComparison = compareStudentIds(
        curr[fieldIndices['Student ID']], 
        next[fieldIndices['Student ID']]
      );
      
      if (idComparison > 0) {
        errors.push(`第${i+2}筆：學生ID順序錯誤 ${curr[fieldIndices['Student ID']]} > ${next[fieldIndices['Student ID']]}`);
      } else if (idComparison === 0) {
        // 同學生的學期檢查
        const currSem = semesterOrder[curr[fieldIndices['Semester']]] || 999;
        const nextSem = semesterOrder[next[fieldIndices['Semester']]] || 999;
        
        if (currSem > nextSem) {
          errors.push(`第${i+2}筆：學期順序錯誤 ${curr[fieldIndices['Semester']]} > ${next[fieldIndices['Semester']]}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      checkedCount: checkCount + 1
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: [`驗證過程錯誤：${error.message}`],
      checkedCount: 0
    };
  }
}

/**
 * 驗證電聯記錄排序正確性
 * @param {Sheet} contactLogSheet 電聯記錄工作表（可選，未提供時自動獲取當前工作表）
 * @param {boolean} quietMode 是否為靜默模式（減少日誌輸出）
 * @return {Object} 驗證結果 {isValid: boolean, errors: Array}
 */
function validateContactRecordsSorting(contactLogSheet, quietMode = false) {
  const perfSession = startTimer('驗證電聯記錄排序', 'DATA_IMPORT');
  
  try {
    // 參數檢查和自動獲取工作表
    if (!contactLogSheet) {
      const recordBook = SpreadsheetApp.getActiveSpreadsheet();
      const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
      if (!summarySheet) {
        perfSession.end(false, '非老師記錄簿環境');
        return { isValid: false, errors: ['請在老師記錄簿中執行此功能'] };
      }
      contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
      if (!contactLogSheet) {
        perfSession.end(false, '找不到電聯記錄工作表');
        return { isValid: false, errors: ['找不到電聯記錄工作表'] };
      }
    }
    
    // 檢查工作表是否有效
    if (typeof contactLogSheet.getDataRange !== 'function') {
      perfSession.end(false, '無效的工作表對象');
      return { isValid: false, errors: ['無效的工作表物件'] };
    }
    
    const allData = contactLogSheet.getDataRange().getValues();
    if (allData.length < 2) {
      perfSession.end(true, '無資料需驗證');
      return { isValid: true, errors: [] }; // 無資料或只有標題，視為有效
    }
    
    perfSession.checkpoint('資料獲取完成', { recordCount: allData.length - 1 });
    
    const records = allData.slice(1); // 跳過標題行
    const errors = [];
    
    if (!quietMode) {
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
    
    perfSession.checkpoint('開始逐筆驗證');
    
    // 逐筆檢查排序順序
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const curr = records[i];
      
      // 學生ID檢查 (使用通用ID比較函數)
      const idComparison = compareStudentIds(prev[fieldMapping.studentId], curr[fieldMapping.studentId]);
      
      if (idComparison > 0) {
        errors.push(`第${i+1}筆記錄：學生ID "${prev[fieldMapping.studentId]}" > "${curr[fieldMapping.studentId]}" (排序錯誤)`);
        continue;
      }
      
      // 同學生ID下的學期檢查
      if (idComparison === 0) {
        const prevSem = semesterOrder[prev[fieldMapping.semester]] || 999;
        const currSem = semesterOrder[curr[fieldMapping.semester]] || 999;
        
        if (prevSem > currSem) {
          errors.push(`第${i+1}筆記錄：學期順序錯誤 ${prev[fieldMapping.semester]} > ${curr[fieldMapping.semester]} (學生ID: "${prev[fieldMapping.studentId]}")`);
          continue;
        }
        
        // 同學期下的Term檢查
        if (prevSem === currSem) {
          const prevTerm = termOrder[prev[fieldMapping.term]] || 999;
          const currTerm = termOrder[curr[fieldMapping.term]] || 999;
          
          if (prevTerm > currTerm) {
            errors.push(`第${i+1}筆記錄：Term順序錯誤 ${prev[fieldMapping.term]} > ${curr[fieldMapping.term]} (學生ID: "${prev[fieldMapping.studentId]}", 學期: ${prev[fieldMapping.semester]})`);
          }
        }
      }
      
      // 每檢查100筆記錄後稍作暫停
      if (i % 100 === 0) {
        Utilities.sleep(10);
        if (!quietMode) {
          Logger.log(`  已驗證 ${i} 筆記錄...`);
        }
      }
    }
    
    const isValid = errors.length === 0;
    
    perfSession.checkpoint('驗證完成', { 
      isValid, 
      errorCount: errors.length,
      checkedCount: records.length 
    });
    
    if (!quietMode) {
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
    
    perfSession.end(true, `驗證完成：${isValid ? '通過' : `${errors.length}個錯誤`}`);
    
    return { isValid, errors, checkedCount: records.length };
    
  } catch (error) {
    perfSession.end(false, error.message);
    Logger.log(`❌ 排序驗證過程發生錯誤：${error.message}`);
    ErrorHandler.handle('驗證電聯記錄排序', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.DATA);
    return { isValid: false, errors: [`驗證過程錯誤：${error.message}`] };
  }
}

/**
 * 批量重新排序現有的電聯記錄（所有記錄簿）
 * @return {Object} 批量排序結果
 */
function batchResortExistingContactRecords() {
  const perfSession = startTimer('批量重新排序電聯記錄', 'BATCH_OPERATION');
  
  try {
    Logger.log('🔄 開始批量重新排序現有的電聯記錄');
    
    // 先診斷系統狀態
    const diagnosis = diagnoseTeacherRecordBooksContactStatus();
    const targetBooks = [...diagnosis.normalBooks, ...diagnosis.emptyContactBooks]
      .filter(book => book.contactRecordCount > 0); // 只處理有記錄的記錄簿
    
    if (targetBooks.length === 0) {
      Logger.log('✅ 沒有找到需要重新排序的記錄簿');
      perfSession.end(true, '無需排序的記錄簿');
      return {
        success: true,
        message: '沒有需要重新排序的記錄簿',
        processedCount: 0
      };
    }
    
    perfSession.checkpoint('目標記錄簿識別完成', { targetCount: targetBooks.length });
    
    const results = {
      totalBooks: targetBooks.length,
      successCount: 0,
      failureCount: 0,
      failures: [],
      startTime: new Date()
    };
    
    Logger.log(`🔄 開始批量排序 ${targetBooks.length} 個記錄簿`);
    
    for (let i = 0; i < targetBooks.length; i++) {
      const book = targetBooks[i];
      const bookNum = i + 1;
      
      Logger.log(`\n🔧 排序記錄簿 ${bookNum}/${targetBooks.length}: ${book.name}`);
      
      try {
        const spreadsheet = SpreadsheetApp.openById(book.id);
        const contactLogSheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
        
        if (!contactLogSheet) {
          throw new Error('找不到電聯記錄工作表');
        }
        
        const allData = contactLogSheet.getDataRange().getValues();
        if (allData.length < 2) {
          Logger.log(`⚠️ ${book.name} 沒有記錄需要排序`);
          continue;
        }
        
        // 執行排序
        const sortResult = sortContactRecordsData(allData);
        
        if (sortResult.success) {
          // 清除並重新寫入排序後的資料
          contactLogSheet.clear();
          contactLogSheet.getRange(1, 1, sortResult.data.length, sortResult.data[0].length)
            .setValues(sortResult.data);
          
          // 重新設定格式
          contactLogSheet.getRange(1, 1, 1, sortResult.data[0].length)
            .setFontWeight('bold')
            .setBackground('#E8F4FD');
          
          results.successCount++;
          Logger.log(`✅ 成功排序 ${book.name} - ${sortResult.recordCount} 筆記錄`);
        } else {
          throw new Error(sortResult.error || '排序失敗');
        }
        
        // 短暫等待避免API限制
        if (bookNum < targetBooks.length) {
          Utilities.sleep(300);
        }
        
      } catch (error) {
        results.failureCount++;
        results.failures.push({
          name: book.name,
          id: book.id,
          error: error.message
        });
        Logger.log(`❌ 排序 ${book.name} 失敗：${error.message}`);
        ErrorHandler.handle(`批量排序記錄簿${book.name}`, error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.DATA);
      }
      
      perfSession.checkpoint(`已處理${bookNum}個記錄簿`, { 
        success: results.successCount, 
        failure: results.failureCount 
      });
    }
    
    results.endTime = new Date();
    results.totalTime = results.endTime - results.startTime;
    
    // 記錄結果
    Logger.log('\n📊 批量排序結果摘要：');
    Logger.log(`總記錄簿數：${results.totalBooks}`);
    Logger.log(`排序成功：${results.successCount}`);
    Logger.log(`排序失敗：${results.failureCount}`);
    Logger.log(`總耗時：${results.totalTime}ms`);
    
    if (results.failures.length > 0) {
      Logger.log('\n❌ 排序失敗的記錄簿：');
      results.failures.forEach((failure, index) => {
        Logger.log(`  ${index + 1}. ${failure.name}: ${failure.error}`);
      });
    }
    
    const finalResult = {
      success: results.failureCount === 0,
      processedCount: results.successCount,
      failureCount: results.failureCount,
      details: results
    };
    
    if (finalResult.success) {
      Logger.log('🎉 所有記錄簿排序完成！');
      perfSession.end(true, `全部排序成功：${results.successCount}個記錄簿`);
    } else {
      Logger.log(`⚠️ 排序完成，但有 ${results.failureCount} 個記錄簿排序失敗`);
      perfSession.end(false, `部分排序失敗：成功${results.successCount}個，失敗${results.failureCount}個`);
    }
    
    return finalResult;
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('批量重新排序電聯記錄', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      success: false,
      error: error.message,
      processedCount: 0,
      failureCount: 0
    };
  }
}

/**
 * 診斷電聯記錄排序問題的工具函數
 */
function diagnoseSortingIssues() {
  const perfSession = startTimer('診斷排序問題', 'SYSTEM_INIT');
  
  try {
    Logger.log('🔍 開始診斷電聯記錄排序問題');
    
    const ui = SpreadsheetApp.getUi();
    const recordBook = SpreadsheetApp.getActiveSpreadsheet();
    
    // 檢查是否在老師記錄簿中
    const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    if (!summarySheet) {
      ui.alert('錯誤', '請在老師記錄簿中執行此功能', ui.ButtonSet.OK);
      perfSession.end(false, '非老師記錄簿環境');
      return;
    }
    
    // 獲取電聯記錄工作表
    const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (!contactLogSheet) {
      ui.alert('錯誤', '找不到電聯記錄工作表', ui.ButtonSet.OK);
      perfSession.end(false, '找不到電聯記錄工作表');
      return;
    }
    
    const allData = contactLogSheet.getDataRange().getValues();
    
    if (allData.length < 2) {
      ui.alert('提醒', '沒有電聯記錄可供診斷', ui.ButtonSet.OK);
      perfSession.end(false, '沒有記錄可診斷');
      return;
    }
    
    perfSession.checkpoint('資料獲取完成', { recordCount: allData.length - 1 });
    
    const records = allData.slice(1);
    const startTime = new Date();
    
    // 設定超時保護（30秒）
    const TIMEOUT_MS = 30000;
    let isTimedOut = false;
    
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
      perfSession.end(false, '診斷超時');
      return;
    }
    
    perfSession.checkpoint('完整性檢查完成', { 
      incompleteRecords, 
      totalRecords: records.length 
    });
    
    // 執行排序驗證（使用靜默模式減少日誌輸出）
    const sortValidation = validateContactRecordsSorting(contactLogSheet, true);
    
    // 快速測試排序功能（不輸出詳細日誌）
    const sortResult = sortContactRecordsData(allData);
    
    const endTime = new Date();
    const executionTime = endTime - startTime;
    
    perfSession.checkpoint('診斷完成', { 
      executionTime,
      validationResult: sortValidation.isValid,
      sortResult: sortResult.success 
    });
    
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
    
    perfSession.end(true, '診斷完成');
    
  } catch (error) {
    perfSession.end(false, error.message);
    Logger.log(`❌ 排序診斷失敗：${error.toString()}`);
    ErrorHandler.handle('診斷排序問題', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
  }
}