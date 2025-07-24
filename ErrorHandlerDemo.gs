/**
 * 錯誤處理系統演示和測試模組
 * 展示統一錯誤處理系統的各種功能
 * 用於驗證錯誤處理機制的正常運作
 */

/**
 * 演示錯誤處理系統的主要功能
 */
function demonstrateErrorHandling() {
  Logger.log('🎯 開始錯誤處理系統演示...');
  
  try {
    // 1. 基本錯誤處理演示
    runBasicErrorDemo();
    
    // 2. 分類錯誤處理演示
    runCategorizedErrorDemo();
    
    // 3. 錯誤包裝和重試演示
    runErrorWrappingDemo();
    
    // 4. 批量錯誤處理演示
    runBatchErrorDemo();
    
    // 5. 生成並顯示錯誤報告
    displayErrorReport();
    
    // 6. 顯示系統錯誤健康狀態
    displayErrorHealth();
    
    Logger.log('✅ 錯誤處理系統演示完成');
    
  } catch (error) {
    Logger.log('❌ 錯誤處理演示失敗: ' + error.message);
    ErrorHandler.critical('錯誤處理系統演示', error);
  }
}

/**
 * 基本錯誤處理演示
 */
function runBasicErrorDemo() {
  Logger.log('📊 演示1: 基本錯誤處理');
  
  // 模擬一般錯誤
  try {
    throw new Error('這是一個測試錯誤');
  } catch (error) {
    ErrorHandler.handle('測試一般錯誤', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
  }
  
  // 模擬警告
  try {
    throw new Error('Quota exceeded - 配額不足');
  } catch (error) {
    ErrorHandler.handle('配額警告測試', error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.SYSTEM);
  }
  
  // 模擬權限錯誤
  try {
    throw new Error('Permission denied');
  } catch (error) {
    ErrorHandler.permission('權限測試', error, 'Google Drive 編輯權限');
  }
  
  // 測試向後兼容的 safeErrorHandler
  try {
    throw new Error('兼容性測試錯誤');
  } catch (error) {
    safeErrorHandler('向後兼容測試', error, '這是自定義用戶信息');
  }
  
  Logger.log('✅ 基本錯誤處理演示完成');
}

/**
 * 分類錯誤處理演示
 */
function runCategorizedErrorDemo() {
  Logger.log('📊 演示2: 分類錯誤處理');
  
  // 數據錯誤
  try {
    throw new Error('Invalid data format');
  } catch (error) {
    ErrorHandler.data('學生數據驗證', error, {
      dataType: 'student',
      operation: 'validation',
      affectedRecords: 15
    });
  }
  
  // 業務邏輯錯誤
  try {
    throw new Error('Student ID already exists');
  } catch (error) {
    ErrorHandler.business('學生ID重複檢查', error, {
      studentId: 'S001',
      operation: 'create_student'
    });
  }
  
  // 系統關鍵錯誤
  try {
    throw new Error('System configuration corrupted');
  } catch (error) {
    ErrorHandler.critical('系統配置檢查', error);
  }
  
  // 網絡錯誤
  try {
    throw new Error('Network connection timeout');
  } catch (error) {
    ErrorHandler.handle('API請求', error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.NETWORK);
  }
  
  Logger.log('✅ 分類錯誤處理演示完成');
}

/**
 * 錯誤包裝和重試演示
 */
function runErrorWrappingDemo() {
  Logger.log('📊 演示3: 錯誤包裝和重試');
  
  // 模擬會失敗然後成功的操作
  let attemptCount = 0;
  const flakyOperation = () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error('Temporary failure - 暫時性失敗');
    }
    return '操作成功完成';
  };
  
  // 使用錯誤包裝執行
  ErrorHandler.wrap(flakyOperation, '不穩定操作測試', { maxRetries: 3 })
    .then(result => {
      if (result.success) {
        Logger.log(`✅ 包裝操作成功: ${result.result} (嘗試 ${result.attempts} 次)`);
      } else {
        Logger.log(`❌ 包裝操作失敗: ${result.error.message}`);
      }
    });
  
  // 模擬不可重試的錯誤
  const nonRetryableOperation = () => {
    throw new Error('Permission denied - 不可重試');
  };
  
  ErrorHandler.wrap(nonRetryableOperation, '權限錯誤測試')
    .then(result => {
      Logger.log(`❌ 預期失敗: ${result.error.message} (嘗試 ${result.attempts} 次)`);
    });
  
  // 測試便利函數
  withErrorHandling(() => {
    throw new Error('便利函數測試錯誤');
  }, '便利函數測試')
    .then(result => {
      Logger.log(`便利函數測試結果: ${result.success ? '成功' : '失敗'}`);
    });
  
  Logger.log('✅ 錯誤包裝和重試演示完成');
}

/**
 * 批量錯誤處理演示
 */
function runBatchErrorDemo() {
  Logger.log('📊 演示4: 批量錯誤處理');
  
  // 模擬批量操作中的錯誤
  const batchErrors = [
    new Error('Student S001 validation failed'),
    null, // 成功的操作
    new Error('Student S003 missing required field'),
    null, // 成功的操作
    new Error('Student S005 duplicate ID'),
    new Error('Student S006 invalid grade level'),
    null  // 成功的操作
  ];
  
  const batchResult = ErrorHandler.batch(batchErrors, '批量學生資料處理');
  
  Logger.log(`✅ 批量錯誤處理完成:`);
  Logger.log(`   批次ID: ${batchResult.batchId}`);
  Logger.log(`   錯誤數量: ${batchResult.results.length}`);
  Logger.log(`   錯誤率: ${(batchResult.summary.errorRate * 100).toFixed(1)}%`);
  
  Logger.log('✅ 批量錯誤處理演示完成');
}

/**
 * 顯示錯誤報告
 */
function displayErrorReport() {
  Logger.log('📊 演示5: 錯誤報告生成');
  
  const report = getErrorReport(1); // 最近1小時
  
  Logger.log('\n=== 錯誤處理報告 ===');
  Logger.log(`🕒 報告時間: ${report.reportTime}`);
  Logger.log(`📊 ${report.summary}`);
  
  Logger.log('\n--- 按等級統計 ---');
  Object.entries(report.errorsByLevel).forEach(([level, count]) => {
    const emoji = getErrorLevelEmoji(level);
    Logger.log(`${emoji} ${level}: ${count}個`);
  });
  
  Logger.log('\n--- 按類別統計 ---');
  Object.entries(report.errorsByCategory).forEach(([category, count]) => {
    Logger.log(`📋 ${category}: ${count}個`);
  });
  
  if (report.topErrors.length > 0) {
    Logger.log('\n--- 最常見錯誤 ---');
    report.topErrors.slice(0, 5).forEach((error, index) => {
      Logger.log(`${index + 1}. ${error.context}: ${error.count}次`);
    });
  }
  
  Logger.log('\n--- 建議措施 ---');
  report.recommendations.forEach((rec, index) => {
    Logger.log(`${index + 1}. ${rec}`);
  });
  
  Logger.log(`\n📈 錯誤率: ${report.errorRate.toFixed(1)}%`);
  Logger.log(`🔧 解決率: ${(report.resolvedRate * 100).toFixed(1)}%`);
  
  Logger.log('✅ 錯誤報告顯示完成\n');
}

/**
 * 顯示系統錯誤健康狀態
 */
function displayErrorHealth() {
  Logger.log('🏥 演示6: 系統錯誤健康檢查');
  
  const health = getErrorHealthStatus();
  
  Logger.log('\n=== 系統錯誤健康狀態 ===');
  Logger.log(`🏥 健康分數: ${health.healthScore}/100`);
  Logger.log(`📈 健康等級: ${health.healthLevel}`);
  Logger.log(`📝 概要: ${health.summary}`);
  Logger.log(`🕒 最後更新: ${health.lastUpdated}`);
  
  Logger.log(`\n📊 錯誤統計:`);
  Logger.log(`   總錯誤數: ${health.totalErrors}`);
  Logger.log(`   錯誤率: ${health.errorRate.toFixed(1)}%`);
  Logger.log(`   解決率: ${(health.resolvedRate * 100).toFixed(1)}%`);
  
  if (health.issues.length > 0) {
    Logger.log('\n--- 發現問題 ---');
    health.issues.forEach((issue, index) => {
      Logger.log(`${index + 1}. ${issue}`);
    });
  }
  
  Logger.log('\n--- 建議措施 ---');
  health.recommendations.forEach((rec, index) => {
    Logger.log(`${index + 1}. ${rec}`);
  });
  
  Logger.log('✅ 系統錯誤健康檢查完成\n');
}

/**
 * 測試真實場景中的錯誤處理
 */
function testRealWorldErrorScenarios() {
  Logger.log('🌍 真實場景錯誤處理測試');
  
  // 場景1: 檔案存取錯誤
  try {
    SpreadsheetApp.openById('invalid_id_12345');
  } catch (error) {
    ErrorHandler.handle('檔案存取測試', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.DATA, {
      additionalInfo: { fileId: 'invalid_id_12345', operation: 'open_spreadsheet' }
    });
  }
  
  // 場景2: 權限問題模擬
  try {
    throw new Error('Exception: Access denied. You do not have permission to perform this action.');
  } catch (error) {
    ErrorHandler.permission('Google Drive存取', error, 'Google Drive檔案編輯權限');
  }
  
  // 場景3: 數據驗證錯誤
  try {
    const invalidStudentData = { name: '', id: null };
    if (!invalidStudentData.name || !invalidStudentData.id) {
      throw new Error('學生資料驗證失敗：必填欄位為空');
    }
  } catch (error) {
    ErrorHandler.data('學生資料驗證', error, {
      dataType: 'student',
      operation: 'validation',
      affectedRecords: 1
    });
  }
  
  // 場景4: 批量處理超時模擬
  try {
    throw new Error('Execution time limit exceeded');
  } catch (error) {
    ErrorHandler.handle('批量資料處理', error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.PERFORMANCE, {
      additionalInfo: { 
        batchSize: 1000, 
        processedCount: 650,
        operation: 'bulk_data_import'
      },
      suggestSolution: true
    });
  }
  
  Logger.log('✅ 真實場景錯誤處理測試完成');
}

/**
 * 清除演示錯誤數據
 */
function clearDemoErrorData() {
  Logger.log('🧹 清除演示錯誤數據');
  
  // 清除錯誤記錄
  ErrorHandler.errorLog.length = 0;
  ErrorHandler.errorStats.clear();
  
  Logger.log('✅ 演示錯誤數據已清除');
}

/**
 * 錯誤處理性能測試
 */
function performanceTestErrorHandling() {
  Logger.log('⚡ 錯誤處理性能測試');
  
  const startTime = Date.now();
  const errorCount = 100;
  
  // 生成大量錯誤進行性能測試
  for (let i = 0; i < errorCount; i++) {
    try {
      throw new Error(`性能測試錯誤 ${i + 1}`);
    } catch (error) {
      ErrorHandler.handle(`性能測試${i + 1}`, error, ERROR_LEVELS.INFO, ERROR_CATEGORIES.SYSTEM, {
        showUI: false // 關閉UI顯示以提高性能
      });
    }
  }
  
  const duration = Date.now() - startTime;
  const avgTime = duration / errorCount;
  
  Logger.log(`⚡ 性能測試結果:`);
  Logger.log(`   處理錯誤數: ${errorCount}`);
  Logger.log(`   總耗時: ${duration}ms`);
  Logger.log(`   平均處理時間: ${avgTime.toFixed(2)}ms/錯誤`);
  Logger.log(`   處理速度: ${(errorCount / duration * 1000).toFixed(0)}錯誤/秒`);
  
  // 檢查記憶體使用
  Logger.log(`   錯誤記錄數: ${ErrorHandler.errorLog.length}`);
  Logger.log(`   統計記錄數: ${ErrorHandler.errorStats.size}`);
}

/**
 * 獲取錯誤等級表情符號（本地版本）
 */
function getErrorLevelEmoji(level) {
  const emojis = {
    'CRITICAL': '🚨',
    'ERROR': '❌',
    'WARNING': '⚠️', 
    'INFO': 'ℹ️',
    'DEBUG': '🔍'
  };
  return emojis[level] || '📋';
}

/**
 * 快速錯誤處理檢查
 */
function quickErrorHandlingCheck() {
  Logger.log('⚡ 快速錯誤處理檢查');
  
  // 測試基本功能
  try {
    throw new Error('快速測試錯誤');
  } catch (error) {
    const result = ErrorHandler.quick('快速檢查', error);
    Logger.log(`✅ 基本處理: ${result.handled ? '成功' : '失敗'}`);
  }
  
  // 測試向後兼容
  try {
    throw new Error('兼容性測試');
  } catch (error) {
    const result = safeErrorHandler('兼容性檢查', error);
    Logger.log(`✅ 向後兼容: ${result.handled ? '成功' : '失敗'}`);
  }
  
  // 檢查健康狀態
  const health = getErrorHealthStatus();
  Logger.log(`🏥 系統健康度: ${health.healthScore}/100 (${health.healthLevel})`);
  
  Logger.log('⚡ 快速檢查完成');
}