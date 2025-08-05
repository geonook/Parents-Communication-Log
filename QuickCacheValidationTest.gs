/**
 * 🧪 快速快取驗證測試 - 確保新的 PropertiesService 快取不會影響系統穩定性
 */

/**
 * 🎯 快速驗證新快取機制是否解決測試問題
 */
function quickValidateNewCacheSystem() {
  Logger.log('🔥 開始快速驗證新快取系統...');
  
  const testResults = {
    testName: '快速快取系統驗證',
    timestamp: new Date().toISOString(),
    tests: [],
    overallPassed: true
  };
  
  try {
    // Test 1: 基本快取功能
    Logger.log('📝 Test 1: 基本快取功能測試');
    const cacheTest = testBasicCacheFunction();
    testResults.tests.push({
      name: '基本快取功能',
      passed: cacheTest.passed,
      details: cacheTest
    });
    if (!cacheTest.passed) testResults.overallPassed = false;
    
    // Test 2: 多次調用穩定性
    Logger.log('📝 Test 2: 多次調用穩定性測試');
    const stabilityTest = testMultipleCallsStability();
    testResults.tests.push({
      name: '多次調用穩定性',
      passed: stabilityTest.passed,
      details: stabilityTest
    });
    if (!stabilityTest.passed) testResults.overallPassed = false;
    
    // Test 3: 快取清除功能
    Logger.log('📝 Test 3: 快取清除功能測試');
    const clearTest = testCacheClearFunction();
    testResults.tests.push({
      name: '快取清除功能',
      passed: clearTest.passed,
      details: clearTest
    });
    if (!clearTest.passed) testResults.overallPassed = false;
    
    // Test 4: 系統集成測試 (簡化版)
    Logger.log('📝 Test 4: 系統集成測試');
    const integrationTest = testSystemIntegration();
    testResults.tests.push({
      name: '系統集成測試',
      passed: integrationTest.passed,
      details: integrationTest
    });
    if (!integrationTest.passed) testResults.overallPassed = false;
    
    // 生成報告
    const passedTests = testResults.tests.filter(t => t.passed).length;
    const totalTests = testResults.tests.length;
    
    Logger.log(`🎉 快速驗證完成！通過 ${passedTests}/${totalTests} 項測試`);
    Logger.log(`整體結果: ${testResults.overallPassed ? '✅ 通過' : '❌ 失敗'}`);
    
    return testResults;
    
  } catch (error) {
    Logger.log('❌ 快速驗證測試失敗: ' + error.toString());
    testResults.overallPassed = false;
    testResults.error = error.toString();
    return testResults;
  }
}

/**
 * 🔧 基本快取功能測試
 */
function testBasicCacheFunction() {
  try {
    // 清除快取
    clearTeacherBooksCache();
    
    // 第一次調用
    const books1 = getAllTeacherBooks();
    
    // 檢查是否有快取
    const cachedData = getTeacherBooksCacheFromProperties();
    const timestamp = getTeacherBooksCacheTimestamp();
    
    return {
      passed: books1.length > 0 && cachedData !== null && timestamp !== null,
      booksFound: books1.length,
      hasCachedData: cachedData !== null,
      hasTimestamp: timestamp !== null
    };
  } catch (error) {
    return {
      passed: false,
      error: error.toString()
    };
  }
}

/**
 * 🔄 多次調用穩定性測試
 */
function testMultipleCallsStability() {
  try {
    clearTeacherBooksCache();
    
    const callResults = [];
    let allPassed = true;
    
    // 進行5次調用
    for (let i = 0; i < 5; i++) {
      const startTime = new Date().getTime();
      const books = getAllTeacherBooks();
      const endTime = new Date().getTime();
      
      const result = {
        call: i + 1,
        time: endTime - startTime,
        booksCount: books.length,
        success: books.length > 0
      };
      
      callResults.push(result);
      if (!result.success) allPassed = false;
    }
    
    // 檢查第2-5次調用是否比第1次快（使用快取）
    const firstCallTime = callResults[0].time;
    const laterCallsAreFaster = callResults.slice(1).every(call => call.time <= firstCallTime);
    
    return {
      passed: allPassed && laterCallsAreFaster,
      callResults,
      firstCallTime,
      cacheWorking: laterCallsAreFaster
    };
  } catch (error) {
    return {
      passed: false,
      error: error.toString()
    };
  }
}

/**
 * 🧹 快取清除功能測試
 */
function testCacheClearFunction() {
  try {
    // 先建立快取
    getAllTeacherBooks();
    
    // 確認有快取
    const beforeClear = getTeacherBooksCacheFromProperties();
    
    // 清除快取
    clearTeacherBooksCache();
    
    // 確認清除成功
    const afterClear = getTeacherBooksCacheFromProperties();
    const timestampAfterClear = getTeacherBooksCacheTimestamp();
    
    return {
      passed: beforeClear !== null && afterClear === null && timestampAfterClear === null,
      hadCacheBeforeClear: beforeClear !== null,
      cacheCleared: afterClear === null,
      timestampCleared: timestampAfterClear === null
    };
  } catch (error) {
    return {
      passed: false,
      error: error.toString()
    };
  }
}

/**
 * 🔗 系統集成測試（簡化版）
 */
function testSystemIntegration() {
  try {
    // 測試其他系統函數是否能正常使用 getAllTeacherBooks()
    clearTeacherBooksCache();
    
    // 模擬常見的系統調用模式
    const books1 = getAllTeacherBooks(); // 進度檢查使用
    const books2 = getAllTeacherBooks(); // 數據同步使用  
    const books3 = getAllTeacherBooks(); // 學生定位使用
    
    const allCallsSuccessful = books1.length > 0 && books2.length > 0 && books3.length > 0;
    const consistentResults = books1.length === books2.length && books2.length === books3.length;
    
    return {
      passed: allCallsSuccessful && consistentResults,
      allCallsSuccessful,
      consistentResults,
      booksCount: books1.length
    };
  } catch (error) {
    return {
      passed: false,
      error: error.toString()
    };
  }
}

/**
 * 📊 執行完整快取驗證並生成報告
 */
function runFullCacheValidation() {
  Logger.log('🚀 執行完整快取驗證...');
  
  const results = quickValidateNewCacheSystem();
  
  // 生成詳細報告
  const report = `
📊 PropertiesService 快取機制驗證報告
===============================================
測試時間: ${results.timestamp}
整體結果: ${results.overallPassed ? '✅ 通過' : '❌ 失敗'}

詳細測試結果:
${results.tests.map(test => 
  `• ${test.name}: ${test.passed ? '✅' : '❌'}`
).join('\n')}

建議:
${results.overallPassed ? 
  '✅ 新的 PropertiesService 快取機制工作正常，可以替代原有的全域變數快取。' :
  '⚠️ 快取機制存在問題，需要進一步調整。'
}
===============================================`;
  
  Logger.log(report);
  return results;
}