/**
 * 進度報告功能專用診斷工具
 * 專門診斷進度報告功能無法執行的原因
 */

/**
 * 主要診斷入口 - 可以在 Google Apps Script 編輯器中直接執行
 */
function diagnosticEntry() {
  return runProgressReportDiagnostic();
}

/**
 * 測試 1: 系統主資料夾存取測試
 */
function testSystemMainFolderAccess() {
  console.log('🔍 測試 1: 系統主資料夾存取');
  
  const testResult = {
    testName: '系統主資料夾存取測試',
    timestamp: new Date().toLocaleString(),
    success: false,
    folderId: SYSTEM_CONFIG.MAIN_FOLDER_ID,
    folderName: null,
    accessible: false,
    error: null,
    details: []
  };
  
  try {
    console.log(`📁 測試資料夾 ID: ${SYSTEM_CONFIG.MAIN_FOLDER_ID}`);
    
    // 測試資料夾存取
    const folder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
    testResult.folderName = folder.getName();
    testResult.accessible = true;
    
    console.log(`✅ 成功存取資料夾: ${testResult.folderName}`);
    
    // 測試權限
    try {
      const files = folder.getFiles();
      const fileCount = Array.from(files).length;
      testResult.details.push(`資料夾內檔案數量: ${fileCount}`);
      console.log(`📋 資料夾內檔案數量: ${fileCount}`);
    } catch (permissionError) {
      testResult.details.push(`權限測試失敗: ${permissionError.message}`);
      console.log(`⚠️ 權限測試失敗: ${permissionError.message}`);
    }
    
    // 測試 getSystemMainFolder 函數
    try {
      const systemFolder = getSystemMainFolder();
      if (systemFolder && systemFolder.getId() === SYSTEM_CONFIG.MAIN_FOLDER_ID) {
        testResult.success = true;
        testResult.details.push('getSystemMainFolder() 函數運作正常');
        console.log('✅ getSystemMainFolder() 函數運作正常');
      } else {
        testResult.details.push('getSystemMainFolder() 返回不正確的資料夾');
        console.log('❌ getSystemMainFolder() 返回不正確的資料夾');
      }
    } catch (funcError) {
      testResult.error = `getSystemMainFolder() 函數錯誤: ${funcError.message}`;
      testResult.details.push(testResult.error);
      console.log(`❌ ${testResult.error}`);
    }
    
  } catch (error) {
    testResult.error = error.message;
    console.log(`❌ 無法存取資料夾: ${error.message}`);
    
    // 檢查是否是權限問題
    if (error.message.includes('Permission denied') || error.message.includes('not found')) {
      testResult.details.push('可能的權限問題或資料夾不存在');
    }
  }
  
  console.log('');
  console.log('=== 測試 1 結果 ===');
  console.log(`資料夾 ID: ${testResult.folderId}`);
  console.log(`資料夾名稱: ${testResult.folderName || '無法取得'}`);
  console.log(`存取狀態: ${testResult.accessible ? '✅ 可存取' : '❌ 無法存取'}`);
  console.log(`測試結果: ${testResult.success ? '✅ 成功' : '❌ 失敗'}`);
  if (testResult.error) {
    console.log(`錯誤信息: ${testResult.error}`);
  }
  console.log('詳細信息:');
  testResult.details.forEach(detail => console.log(`  • ${detail}`));
  console.log('');
  
  return testResult;
}

/**
 * 測試 2: getAllTeacherBooks 函數測試
 */
function testGetAllTeacherBooks() {
  console.log('🔍 測試 2: getAllTeacherBooks 函數');
  
  const testResult = {
    testName: 'getAllTeacherBooks 函數測試',
    timestamp: new Date().toLocaleString(),
    success: false,
    functionExists: false,
    booksFound: 0,
    teacherBooks: [],
    error: null,
    cacheUsed: false,
    details: []
  };
  
  try {
    // 檢查函數是否存在
    if (typeof getAllTeacherBooks === 'function') {
      testResult.functionExists = true;
      console.log('✅ getAllTeacherBooks 函數存在');
      
      // 執行函數
      console.log('🔄 執行 getAllTeacherBooks...');
      const startTime = new Date().getTime();
      const teacherBooks = getAllTeacherBooks();
      const endTime = new Date().getTime();
      const duration = endTime - startTime;
      
      testResult.booksFound = teacherBooks ? teacherBooks.length : 0;
      testResult.details.push(`執行時間: ${duration}ms`);
      
      if (teacherBooks && teacherBooks.length > 0) {
        testResult.success = true;
        testResult.teacherBooks = teacherBooks.slice(0, 5).map(book => ({
          name: book.getName ? book.getName() : '未知',
          id: book.getId ? book.getId() : '未知'
        }));
        
        console.log(`✅ 成功找到 ${teacherBooks.length} 本老師記錄簿`);
        console.log('前5本記錄簿:');
        testResult.teacherBooks.forEach((book, index) => {
          console.log(`  ${index + 1}. ${book.name} (${book.id})`);
        });
        
        // 檢查是否使用快取
        if (duration < 1000) {
          testResult.cacheUsed = true;
          testResult.details.push('可能使用了快取機制 (執行時間 < 1秒)');
          console.log('⚡ 可能使用了快取機制');
        }
        
      } else {
        testResult.details.push('未找到任何老師記錄簿');
        console.log('⚠️ 未找到任何老師記錄簿');
      }
      
    } else {
      testResult.error = 'getAllTeacherBooks 函數不存在';
      console.log('❌ getAllTeacherBooks 函數不存在');
    }
    
  } catch (error) {
    testResult.error = error.message;
    console.log(`❌ 執行 getAllTeacherBooks 時發生錯誤: ${error.message}`);
    
    if (error.message.includes('getSystemMainFolder')) {
      testResult.details.push('錯誤可能來自 getSystemMainFolder 函數');
    }
  }
  
  console.log('');
  console.log('=== 測試 2 結果 ===');
  console.log(`函數存在: ${testResult.functionExists ? '✅ 是' : '❌ 否'}`);
  console.log(`找到記錄簿: ${testResult.booksFound} 本`);
  console.log(`測試結果: ${testResult.success ? '✅ 成功' : '❌ 失敗'}`);
  if (testResult.error) {
    console.log(`錯誤信息: ${testResult.error}`);
  }
  console.log('詳細信息:');
  testResult.details.forEach(detail => console.log(`  • ${detail}`));
  console.log('');
  
  return testResult;
}

/**
 * 測試 3: PropertiesService 快取狀態測試
 */
function testPropertiesServiceCache() {
  console.log('🔍 測試 3: PropertiesService 快取狀態');
  
  const testResult = {
    testName: 'PropertiesService 快取測試',
    timestamp: new Date().toLocaleString(),
    success: false,
    propertiesServiceAvailable: false,
    cacheKeys: [],
    cacheSize: 0,
    dataFound: false,
    error: null,
    details: []
  };
  
  try {
    // 測試 PropertiesService 可用性
    const properties = PropertiesService.getScriptProperties();
    testResult.propertiesServiceAvailable = true;
    console.log('✅ PropertiesService 可用');
    
    // 獲取所有快取項目
    const allProperties = properties.getProperties();
    testResult.cacheKeys = Object.keys(allProperties);
    testResult.cacheSize = testResult.cacheKeys.length;
    
    console.log(`📊 快取項目數量: ${testResult.cacheSize}`);
    
    if (testResult.cacheSize > 0) {
      testResult.dataFound = true;
      testResult.success = true;
      
      // 顯示快取鍵值
      console.log('快取鍵值列表:');
      testResult.cacheKeys.slice(0, 10).forEach((key, index) => {
        const value = allProperties[key];
        const valueLength = value ? value.length : 0;
        console.log(`  ${index + 1}. ${key} (${valueLength} 字元)`);
        testResult.details.push(`${key}: ${valueLength} 字元`);
      });
      
      if (testResult.cacheSize > 10) {
        console.log(`  ... 還有 ${testResult.cacheSize - 10} 個項目`);
      }
      
      // 檢查特定的快取項目
      const teacherBooksCache = allProperties['teacherBooks_cache'];
      if (teacherBooksCache) {
        testResult.details.push('找到 teacherBooks_cache');
        console.log('✅ 找到 teacherBooks_cache');
      }
      
      const statisticsCache = allProperties['statistics_cache'];
      if (statisticsCache) {
        testResult.details.push('找到 statistics_cache');
        console.log('✅ 找到 statistics_cache');
      }
      
    } else {
      testResult.details.push('快取為空，可能是首次運行');
      console.log('⚠️ 快取為空，可能是首次運行');
    }
    
    // 測試快取讀寫功能
    try {
      const testKey = 'diagnostic_test_' + new Date().getTime();
      const testValue = JSON.stringify({ test: true, timestamp: new Date().getTime() });
      
      properties.setProperty(testKey, testValue);
      const readValue = properties.getProperty(testKey);
      
      if (readValue === testValue) {
        testResult.details.push('快取讀寫功能正常');
        console.log('✅ 快取讀寫功能正常');
        
        // 清理測試資料
        properties.deleteProperty(testKey);
      } else {
        testResult.details.push('快取讀寫功能異常');
        console.log('❌ 快取讀寫功能異常');
      }
    } catch (rwError) {
      testResult.details.push(`快取讀寫測試失敗: ${rwError.message}`);
      console.log(`❌ 快取讀寫測試失敗: ${rwError.message}`);
    }
    
  } catch (error) {
    testResult.error = error.message;
    console.log(`❌ PropertiesService 測試失敗: ${error.message}`);
  }
  
  console.log('');
  console.log('=== 測試 3 結果 ===');
  console.log(`PropertiesService: ${testResult.propertiesServiceAvailable ? '✅ 可用' : '❌ 不可用'}`);
  console.log(`快取項目數: ${testResult.cacheSize}`);
  console.log(`測試結果: ${testResult.success ? '✅ 成功' : '❌ 失敗'}`);
  if (testResult.error) {
    console.log(`錯誤信息: ${testResult.error}`);
  }
  console.log('詳細信息:');
  testResult.details.forEach(detail => console.log(`  • ${detail}`));
  console.log('');
  
  return testResult;
}

/**
 * 測試 4: generateProgressReport 函數錯誤捕獲
 */
function testGenerateProgressReport() {
  console.log('🔍 測試 4: generateProgressReport 函數');
  
  const testResult = {
    testName: 'generateProgressReport 函數測試',
    timestamp: new Date().toLocaleString(),
    success: false,
    functionExists: false,
    executionAttempted: false,
    error: null,
    stackTrace: null,
    details: []
  };
  
  try {
    // 檢查函數是否存在
    if (typeof generateProgressReport === 'function') {
      testResult.functionExists = true;
      console.log('✅ generateProgressReport 函數存在');
      
      // 嘗試執行函數
      console.log('🔄 嘗試執行 generateProgressReport...');
      testResult.executionAttempted = true;
      
      try {
        const result = generateProgressReport();
        testResult.success = true;
        testResult.details.push('函數執行成功');
        console.log('✅ generateProgressReport 執行成功');
        
      } catch (execError) {
        testResult.error = execError.message;
        testResult.stackTrace = execError.stack;
        
        console.log(`❌ generateProgressReport 執行失敗: ${execError.message}`);
        
        // 分析錯誤類型
        if (execError.message.includes('getSystemMainFolder')) {
          testResult.details.push('錯誤來源: getSystemMainFolder 函數');
        } else if (execError.message.includes('getAllTeacherBooks')) {
          testResult.details.push('錯誤來源: getAllTeacherBooks 函數');
        } else if (execError.message.includes('Permission')) {
          testResult.details.push('錯誤類型: 權限問題');
        } else if (execError.message.includes('not found') || execError.message.includes('找不到')) {
          testResult.details.push('錯誤類型: 資源不存在');
        } else {
          testResult.details.push('錯誤類型: 未知錯誤');
        }
      }
      
    } else {
      testResult.error = 'generateProgressReport 函數不存在';
      console.log('❌ generateProgressReport 函數不存在');
    }
    
  } catch (error) {
    testResult.error = error.message;
    console.log(`❌ 測試 generateProgressReport 時發生錯誤: ${error.message}`);
  }
  
  console.log('');
  console.log('=== 測試 4 結果 ===');
  console.log(`函數存在: ${testResult.functionExists ? '✅ 是' : '❌ 否'}`);
  console.log(`執行嘗試: ${testResult.executionAttempted ? '✅ 是' : '❌ 否'}`);
  console.log(`測試結果: ${testResult.success ? '✅ 成功' : '❌ 失敗'}`);
  if (testResult.error) {
    console.log(`錯誤信息: ${testResult.error}`);
  }
  if (testResult.stackTrace) {
    console.log('錯誤堆疊:');
    console.log(testResult.stackTrace);
  }
  console.log('詳細信息:');
  testResult.details.forEach(detail => console.log(`  • ${detail}`));
  console.log('');
  
  return testResult;
}

/**
 * 綜合診斷報告
 */
function runProgressReportDiagnostic() {
  console.log('🚀 開始進度報告功能綜合診斷');
  console.log('===================================');
  
  const diagnosticResult = {
    timestamp: new Date().toLocaleString(),
    totalTests: 4,
    passedTests: 0,
    failedTests: 0,
    testResults: [],
    overallStatus: 'unknown',
    criticalIssues: [],
    recommendations: [],
    nextSteps: []
  };
  
  try {
    // 執行所有測試
    const test1 = testSystemMainFolderAccess();
    const test2 = testGetAllTeacherBooks();
    const test3 = testPropertiesServiceCache();
    const test4 = testGenerateProgressReport();
    
    diagnosticResult.testResults = [test1, test2, test3, test4];
    
    // 計算通過率
    diagnosticResult.passedTests = diagnosticResult.testResults.filter(test => test.success).length;
    diagnosticResult.failedTests = diagnosticResult.totalTests - diagnosticResult.passedTests;
    
    // 分析關鍵問題
    if (!test1.success) {
      diagnosticResult.criticalIssues.push('系統主資料夾存取失敗');
      diagnosticResult.recommendations.push('檢查資料夾 ID 1ksWywUMUfsmHtUq99HdRB34obcAXhKUX 的存取權限');
    }
    
    if (!test2.success) {
      diagnosticResult.criticalIssues.push('無法獲取老師記錄簿列表');
      if (test1.success) {
        diagnosticResult.recommendations.push('檢查老師記錄簿資料夾結構');
      }
    }
    
    if (!test3.success) {
      diagnosticResult.criticalIssues.push('PropertiesService 快取系統故障');
      diagnosticResult.recommendations.push('檢查 Google Apps Script 權限設定');
    }
    
    if (!test4.success && test4.error) {
      diagnosticResult.criticalIssues.push('進度報告生成函數執行失敗');
      diagnosticResult.recommendations.push(`解決函數錯誤: ${test4.error}`);
    }
    
    // 判斷整體狀態
    if (diagnosticResult.passedTests === diagnosticResult.totalTests) {
      diagnosticResult.overallStatus = '✅ 系統健康';
      diagnosticResult.nextSteps.push('進度報告功能應該正常運作');
    } else if (diagnosticResult.passedTests >= 2) {
      diagnosticResult.overallStatus = '⚠️ 部分問題';
      diagnosticResult.nextSteps.push('修復失敗的測試項目');
      diagnosticResult.nextSteps.push('重新測試進度報告功能');
    } else {
      diagnosticResult.overallStatus = '❌ 嚴重問題';
      diagnosticResult.nextSteps.push('優先修復系統主資料夾存取問題');
      diagnosticResult.nextSteps.push('檢查 Google Apps Script 部署狀態');
    }
    
    // 輸出綜合報告
    console.log('');
    console.log('=====================================');
    console.log('🏥 進度報告功能診斷報告');
    console.log('=====================================');
    console.log(`診斷時間: ${diagnosticResult.timestamp}`);
    console.log(`整體狀態: ${diagnosticResult.overallStatus}`);
    console.log(`測試通過: ${diagnosticResult.passedTests}/${diagnosticResult.totalTests}`);
    console.log('');
    
    if (diagnosticResult.criticalIssues.length > 0) {
      console.log('🚨 關鍵問題:');
      diagnosticResult.criticalIssues.forEach(issue => console.log(`  • ${issue}`));
      console.log('');
    }
    
    console.log('💡 修復建議:');
    diagnosticResult.recommendations.forEach(rec => console.log(`  • ${rec}`));
    console.log('');
    
    console.log('📋 下一步行動:');
    diagnosticResult.nextSteps.forEach(step => console.log(`  • ${step}`));
    console.log('');
    
    console.log('📊 詳細測試結果:');
    diagnosticResult.testResults.forEach((test, index) => {
      const status = test.success ? '✅' : '❌';
      console.log(`  ${status} 測試 ${index + 1}: ${test.testName}`);
      if (!test.success && test.error) {
        console.log(`    錯誤: ${test.error}`);
      }
    });
    
    console.log('');
    console.log('=====================================');
    console.log('診斷完成');
    console.log('=====================================');
    
    return diagnosticResult;
    
  } catch (error) {
    console.log(`❌ 診斷過程發生錯誤: ${error.message}`);
    diagnosticResult.overallStatus = '❌ 診斷失敗';
    diagnosticResult.criticalIssues.push('診斷過程發生錯誤');
    return diagnosticResult;
  }
}