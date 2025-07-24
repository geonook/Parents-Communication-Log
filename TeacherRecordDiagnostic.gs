/**
 * 老師記錄簿診斷與修復模組
 * 負責記錄簿狀態診斷和問題修復
 * Version: 1.0.0 - 從TeacherManagement.gs模組化拆分
 */

/**
 * 診斷老師記錄簿的電聯記錄狀態
 * 找出空白記錄簿的原因
 * @return {Object} 診斷結果
 */
function diagnoseTeacherRecordBooksContactStatus() {
  const perfSession = startTimer('診斷記錄簿狀態', 'SYSTEM_INIT');
  
  try {
    Logger.log('🔍 開始診斷老師記錄簿電聯記錄狀態...');
    
    const results = {
      totalBooks: 0,
      emptyContactBooks: [],
      normalBooks: [],
      issues: [],
      scanTime: new Date()
    };
    
    perfSession.checkpoint('初始化診斷結構');
    
    // 搜尋所有符合命名規則的老師記錄簿
    const searchQuery = 'title contains "老師記錄簿" and mimeType = "application/vnd.google-apps.spreadsheet"';
    Logger.log(`🔍 搜尋查詢：${searchQuery}`);
    
    const allFiles = DriveApp.searchFiles(searchQuery);
    
    let processedCount = 0;
    while (allFiles.hasNext()) {
      const file = allFiles.next();
      results.totalBooks++;
      processedCount++;
      
      Logger.log(`📋 處理記錄簿 ${processedCount}: ${file.getName()}`);
      
      try {
        const bookAnalysis = analyzeTeacherRecordBook(file);
        
        if (bookAnalysis.hasStudents && bookAnalysis.contactRecordCount === 0) {
          // 有學生但沒有電聯記錄 = 問題記錄簿
          results.emptyContactBooks.push(bookAnalysis);
          Logger.log(`❌ 發現問題：${file.getName()} - 學生數：${bookAnalysis.studentCount}，電聯記錄：${bookAnalysis.contactRecordCount}`);
        } else {
          // 正常記錄簿
          results.normalBooks.push(bookAnalysis);
          Logger.log(`✅ 正常狀態：${file.getName()} - 學生數：${bookAnalysis.studentCount}，電聯記錄：${bookAnalysis.contactRecordCount}`);
        }
        
      } catch (bookError) {
        const errorMsg = `${file.getName()}: ${bookError.message}`;
        results.issues.push(errorMsg);
        Logger.log(`⚠️ 分析記錄簿錯誤：${errorMsg}`);
        ErrorHandler.handle(`分析記錄簿${file.getName()}`, bookError, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.DATA);
      }
      
      // 每處理10個文件後稍作暫停
      if (processedCount % 10 === 0) {
        Utilities.sleep(200);
        perfSession.checkpoint(`已處理${processedCount}個記錄簿`);
      }
    }
    
    perfSession.checkpoint('記錄簿掃描完成', { totalBooks: results.totalBooks });
    
    // 輸出診斷結果
    logDiagnosisResults(results);
    
    perfSession.end(true, `診斷完成：${results.totalBooks}個記錄簿，${results.emptyContactBooks.length}個需修復`);
    
    return results;
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('診斷老師記錄簿狀態', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      totalBooks: 0,
      emptyContactBooks: [],
      normalBooks: [],
      issues: [`診斷錯誤：${error.message}`],
      scanTime: new Date(),
      error: error.message
    };
  }
}

/**
 * 分析單個老師記錄簿
 * @param {File} file 記錄簿文件
 * @return {Object} 分析結果
 */
function analyzeTeacherRecordBook(file) {
  try {
    const spreadsheet = SpreadsheetApp.openById(file.getId());
    const contactLogSheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    const studentListSheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    const summarySheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    
    // 基本結構檢查
    const analysis = {
      name: file.getName(),
      id: file.getId(),
      url: file.getUrl(),
      hasContactLog: !!contactLogSheet,
      hasStudentList: !!studentListSheet,
      hasSummary: !!summarySheet,
      studentCount: 0,
      contactRecordCount: 0,
      expectedContactRecords: 0,
      hasStudents: false,
      lastModified: file.getLastUpdated(),
      owner: file.getOwner().getEmail()
    };
    
    // 檢查學生清單
    if (studentListSheet) {
      try {
        const studentData = studentListSheet.getDataRange().getValues();
        analysis.studentCount = studentData.length > 1 ? studentData.length - 1 : 0;
        analysis.hasStudents = analysis.studentCount > 0;
        analysis.expectedContactRecords = analysis.studentCount * 6; // 每位學生應有6筆記錄
      } catch (studentError) {
        Logger.log(`⚠️ 讀取學生清單失敗：${studentError.message}`);
        analysis.studentListError = studentError.message;
      }
    } else {
      analysis.missingSheets = analysis.missingSheets || [];
      analysis.missingSheets.push('學生清單');
    }
    
    // 檢查電聯記錄
    if (contactLogSheet) {
      try {
        const contactData = contactLogSheet.getDataRange().getValues();
        analysis.contactRecordCount = contactData.length > 1 ? contactData.length - 1 : 0;
        
        // 分析電聯記錄類型
        if (analysis.contactRecordCount > 0) {
          analysis.scheduledContactCount = 0;
          analysis.otherContactCount = 0;
          
          for (let i = 1; i < contactData.length; i++) {
            const contactType = contactData[i][7]; // Contact Type 欄位
            if (contactType === 'Scheduled Contact') {
              analysis.scheduledContactCount++;
            } else {
              analysis.otherContactCount++;
            }
          }
        }
      } catch (contactError) {
        Logger.log(`⚠️ 讀取電聯記錄失敗：${contactError.message}`);
        analysis.contactLogError = contactError.message;
      }
    } else {
      analysis.missingSheets = analysis.missingSheets || [];
      analysis.missingSheets.push('電聯記錄');
    }
    
    return analysis;
    
  } catch (error) {
    throw new Error(`分析記錄簿失敗：${error.message}`);
  }
}

/**
 * 記錄診斷結果
 * @param {Object} results 診斷結果對象
 */
function logDiagnosisResults(results) {
  Logger.log('\n📊 診斷結果摘要：');
  Logger.log(`總計記錄簿數量：${results.totalBooks}`);
  Logger.log(`空白電聯記錄簿：${results.emptyContactBooks.length}`);
  Logger.log(`正常記錄簿：${results.normalBooks.length}`);
  Logger.log(`問題記錄簿：${results.issues.length}`);
  
  if (results.emptyContactBooks.length > 0) {
    Logger.log('\n❌ 需要修復的空白電聯記錄簿：');
    results.emptyContactBooks.forEach((book, index) => {
      Logger.log(`  ${index + 1}. ${book.name} (學生數：${book.studentCount}, 預期記錄：${book.expectedContactRecords})`);
      Logger.log(`      URL: ${book.url}`);
    });
  }
  
  if (results.issues.length > 0) {
    Logger.log('\n⚠️ 其他問題：');
    results.issues.forEach((issue, index) => {
      Logger.log(`  ${index + 1}. ${issue}`);
    });
  }
}

/**
 * 批量修復空白電聯記錄的老師記錄簿
 * @param {boolean} confirmBeforeFix 是否在修復前確認
 * @return {Object} 修復結果
 */
function batchFixEmptyContactRecordBooks(confirmBeforeFix = true) {
  const perfSession = startTimer('批量修復空白記錄簿', 'BATCH_OPERATION');
  
  try {
    Logger.log('🔧 開始批量修復空白電聯記錄的老師記錄簿...');
    
    // 先診斷問題
    const diagnosis = diagnoseTeacherRecordBooksContactStatus();
    
    if (diagnosis.emptyContactBooks.length === 0) {
      Logger.log('✅ 未發現需要修復的空白電聯記錄簿');
      perfSession.end(true, '無需修復的記錄簿');
      return {
        success: true,
        message: '所有記錄簿電聯記錄狀態正常',
        fixedCount: 0,
        diagnosis: diagnosis
      };
    }
    
    perfSession.checkpoint('診斷完成', { needFixCount: diagnosis.emptyContactBooks.length });
    
    Logger.log(`🔄 發現 ${diagnosis.emptyContactBooks.length} 個需要修復的記錄簿，開始修復...`);
    
    // 如果需要確認，可以在這裡添加UI確認邏輯
    if (confirmBeforeFix && typeof SpreadsheetApp !== 'undefined') {
      try {
        const ui = SpreadsheetApp.getUi();
        const response = ui.alert(
          '批量修復確認',
          `發現 ${diagnosis.emptyContactBooks.length} 個記錄簿需要修復電聯記錄\n\n是否繼續修復？`,
          ui.ButtonSet.YES_NO
        );
        
        if (response !== ui.Button.YES) {
          perfSession.end(false, '用戶取消修復');
          return {
            success: false,
            message: '用戶取消修復操作',
            fixedCount: 0,
            diagnosis: diagnosis
          };
        }
      } catch (uiError) {
        Logger.log('⚠️ 無法顯示確認對話框，直接執行修復');
      }
    }
    
    const results = {
      totalToFix: diagnosis.emptyContactBooks.length,
      successCount: 0,
      failureCount: 0,
      failures: [],
      startTime: new Date()
    };
    
    // 執行批量修復
    for (let i = 0; i < diagnosis.emptyContactBooks.length; i++) {
      const book = diagnosis.emptyContactBooks[i];
      const bookNum = i + 1;
      
      Logger.log(`\n🔧 修復記錄簿 ${bookNum}/${diagnosis.emptyContactBooks.length}: ${book.name}`);
      
      const fixResult = fixSingleRecordBook(book);
      
      if (fixResult.success) {
        results.successCount++;
        Logger.log(`✅ 成功修復：${book.name} - ${fixResult.recordCount} 筆記錄`);
      } else {
        results.failureCount++;
        results.failures.push({
          name: book.name,
          id: book.id,
          error: fixResult.error
        });
        Logger.log(`❌ 修復失敗：${book.name} - ${fixResult.error}`);
      }
      
      // 短暫等待避免API限制
      if (bookNum < diagnosis.emptyContactBooks.length) {
        Utilities.sleep(500);
      }
      
      perfSession.checkpoint(`已修復${bookNum}個記錄簿`, { 
        success: results.successCount, 
        failure: results.failureCount 
      });
    }
    
    results.endTime = new Date();
    results.totalTime = results.endTime - results.startTime;
    
    // 輸出修復結果摘要
    logRepairResults(results);
    
    const finalResult = {
      success: results.failureCount === 0,
      totalFixed: results.successCount,
      totalFailed: results.failureCount,
      details: results,
      diagnosis: diagnosis
    };
    
    if (finalResult.success) {
      Logger.log('🎉 所有記錄簿修復完成！');
      perfSession.end(true, `全部修復成功：${results.successCount}個記錄簿`);
    } else {
      Logger.log(`⚠️ 修復完成，但有 ${results.failureCount} 個記錄簿修復失敗`);
      perfSession.end(false, `部分修復失敗：成功${results.successCount}個，失敗${results.failureCount}個`);
    }
    
    return finalResult;
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('批量修復空白記錄簿', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      success: false,
      error: error.message,
      totalFixed: 0,
      totalFailed: 0
    };
  }
}

/**
 * 修復單個記錄簿
 * @param {Object} bookInfo 記錄簿資訊
 * @return {Object} 修復結果 {success: boolean, recordCount?: number, error?: string}
 */
function fixSingleRecordBook(bookInfo) {
  try {
    Logger.log(`🔧 開始修復記錄簿：${bookInfo.name}`);
    
    const spreadsheet = SpreadsheetApp.openById(bookInfo.id);
    const studentListSheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    
    if (!studentListSheet) {
      throw new Error('找不到學生清單工作表');
    }
    
    // 獲取學生資料
    const studentData = studentListSheet.getDataRange().getValues();
    
    if (studentData.length <= 1) {
      throw new Error('學生清單為空');
    }
    
    Logger.log(`📚 學生清單確認：${studentData.length - 1} 位學生`);
    
    // 執行預建 Scheduled Contact 記錄
    const prebuildResult = performPrebuildScheduledContacts(spreadsheet, studentData);
    
    return {
      success: true,
      recordCount: prebuildResult.recordCount,
      studentCount: prebuildResult.studentCount
    };
    
  } catch (error) {
    Logger.log(`❌ 修復記錄簿失敗：${error.message}`);
    ErrorHandler.handle(`修復記錄簿${bookInfo.name}`, error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.DATA);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 記錄修復結果
 * @param {Object} results 修復結果對象
 */
function logRepairResults(results) {
  Logger.log('\n📊 批量修復結果摘要：');
  Logger.log(`需要修復的記錄簿：${results.totalToFix}`);
  Logger.log(`修復成功：${results.successCount}`);
  Logger.log(`修復失敗：${results.failureCount}`);
  Logger.log(`總耗時：${results.totalTime}ms`);
  
  if (results.failures.length > 0) {
    Logger.log('\n❌ 修復失敗的記錄簿：');
    results.failures.forEach((failure, index) => {
      Logger.log(`  ${index + 1}. ${failure.name}: ${failure.error}`);
      Logger.log(`      ID: ${failure.id}`);
    });
  }
}

/**
 * 獲取系統記錄簿健康狀態
 * @return {Object} 系統健康狀態
 */
function getSystemRecordBooksHealth() {
  const perfSession = startTimer('獲取系統記錄簿健康狀態', 'SYSTEM_INIT');
  
  try {
    Logger.log('🏥 開始獲取系統記錄簿健康狀態');
    
    const diagnosis = diagnoseTeacherRecordBooksContactStatus();
    
    const health = {
      totalBooks: diagnosis.totalBooks,
      healthyBooks: diagnosis.normalBooks.length,
      problematicBooks: diagnosis.emptyContactBooks.length,
      brokenBooks: diagnosis.issues.length,
      healthScore: 0,
      healthLevel: 'UNKNOWN',
      lastCheck: diagnosis.scanTime,
      recommendations: []
    };
    
    // 計算健康分數
    if (health.totalBooks > 0) {
      health.healthScore = Math.round((health.healthyBooks / health.totalBooks) * 100);
    }
    
    // 確定健康等級
    if (health.healthScore >= 95) {
      health.healthLevel = 'EXCELLENT';
    } else if (health.healthScore >= 85) {
      health.healthLevel = 'GOOD';
    } else if (health.healthScore >= 70) {
      health.healthLevel = 'FAIR';
    } else if (health.healthScore >= 50) {
      health.healthLevel = 'POOR';
    } else {
      health.healthLevel = 'CRITICAL';
    }
    
    // 生成建議
    if (health.problematicBooks > 0) {
      health.recommendations.push(`建議修復 ${health.problematicBooks} 個空白電聯記錄簿`);
    }
    
    if (health.brokenBooks > 0) {
      health.recommendations.push(`建議檢查 ${health.brokenBooks} 個有結構問題的記錄簿`);
    }
    
    if (health.healthScore < 70) {
      health.recommendations.push('系統記錄簿健康度偏低，建議進行全面檢查和修復');
    }
    
    if (health.recommendations.length === 0) {
      health.recommendations.push('系統記錄簿狀態良好');
    }
    
    Logger.log(`🏥 系統健康狀態：${health.healthLevel} (${health.healthScore}/100)`);
    perfSession.end(true, `健康檢查完成：${health.healthLevel}`);
    
    return health;
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('獲取系統記錄簿健康狀態', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      totalBooks: 0,
      healthyBooks: 0,
      problematicBooks: 0,
      brokenBooks: 0,
      healthScore: 0,
      healthLevel: 'ERROR',
      lastCheck: new Date(),
      error: error.message,
      recommendations: ['健康檢查失敗，請檢查系統狀態']
    };
  }
}

/**
 * 快速診斷記錄簿問題
 * @param {string} recordBookId 記錄簿ID（可選）
 * @return {Object} 快速診斷結果
 */
function quickDiagnoseRecordBook(recordBookId = null) {
  const perfSession = startTimer('快速診斷記錄簿', 'SYSTEM_INIT');
  
  try {
    let targetSpreadsheet;
    
    if (recordBookId) {
      targetSpreadsheet = SpreadsheetApp.openById(recordBookId);
    } else {
      targetSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    const file = DriveApp.getFileById(targetSpreadsheet.getId());
    const analysis = analyzeTeacherRecordBook(file);
    
    // 快速問題檢測
    const issues = [];
    const suggestions = [];
    
    if (!analysis.hasStudentList) {
      issues.push('缺少學生清單工作表');
      suggestions.push('請創建學生清單工作表');
    }
    
    if (!analysis.hasContactLog) {
      issues.push('缺少電聯記錄工作表');
      suggestions.push('請創建電聯記錄工作表');
    }
    
    if (analysis.hasStudents && analysis.contactRecordCount === 0) {
      issues.push('有學生資料但無電聯記錄');
      suggestions.push('建議執行預建電聯記錄功能');
    }
    
    if (analysis.hasStudents && analysis.contactRecordCount > 0 && analysis.contactRecordCount < analysis.expectedContactRecords) {
      issues.push('電聯記錄數量不足');
      suggestions.push(`預期 ${analysis.expectedContactRecords} 筆，實際 ${analysis.contactRecordCount} 筆`);
    }
    
    const result = {
      ...analysis,
      issues: issues,
      suggestions: suggestions,
      needsRepair: issues.length > 0,
      quickCheckTime: new Date()
    };
    
    Logger.log(`⚡ 快速診斷完成：${issues.length}個問題`);
    perfSession.end(true, `快速診斷：${issues.length}個問題`);
    
    return result;
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('快速診斷記錄簿', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      error: error.message,
      needsRepair: true,
      issues: [`診斷失敗：${error.message}`],
      suggestions: ['請檢查記錄簿是否為有效的老師記錄簿格式'],
      quickCheckTime: new Date()
    };
  }
}