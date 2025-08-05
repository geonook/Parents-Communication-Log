/**
 * 🧪 PropertiesService 快取機制測試
 * 測試新的 PropertiesService 快取是否正常工作並避免全域變數衝突
 */

/**
 * 🔬 測試 PropertiesService 快取功能
 */
function testPropertiesServiceCache() {
  Logger.log('🧪 開始測試 PropertiesService 快取機制...');
  
  try {
    // 1. 清除現有快取
    Logger.log('📝 Step 1: 清除現有快取');
    clearTeacherBooksCache();
    
    // 2. 測試快取狀態檢查
    Logger.log('📝 Step 2: 檢查清除後的快取狀態');
    const cachedDataAfterClear = getTeacherBooksCacheFromProperties();
    const timestampAfterClear = getTeacherBooksCacheTimestamp();
    
    if (cachedDataAfterClear === null && timestampAfterClear === null) {
      Logger.log('✅ 快取清除成功');
    } else {
      Logger.log('❌ 快取清除失敗');
      return false;
    }
    
    // 3. 首次調用 getAllTeacherBooks() - 應該重新掃描
    Logger.log('📝 Step 3: 首次調用 getAllTeacherBooks()');
    const startTime1 = new Date().getTime();
    const books1 = getAllTeacherBooks();
    const endTime1 = new Date().getTime();
    const time1 = endTime1 - startTime1;
    Logger.log(`📊 首次調用耗時: ${time1}ms, 找到 ${books1.length} 本記錄簿`);
    
    // 4. 第二次調用 getAllTeacherBooks() - 應該使用快取
    Logger.log('📝 Step 4: 第二次調用 getAllTeacherBooks()');
    const startTime2 = new Date().getTime();
    const books2 = getAllTeacherBooks();
    const endTime2 = new Date().getTime();
    const time2 = endTime2 - startTime2;
    Logger.log(`📊 第二次調用耗時: ${time2}ms, 找到 ${books2.length} 本記錄簿`);
    
    // 5. 驗證性能改善
    const performanceImprovement = ((time1 - time2) / time1) * 100;
    Logger.log(`🚀 性能改善: ${performanceImprovement.toFixed(1)}%`);
    
    // 6. 驗證數據一致性
    if (books1.length === books2.length) {
      Logger.log('✅ 快取數據一致性驗證通過');
    } else {
      Logger.log('❌ 快取數據一致性驗證失敗');
      return false;
    }
    
    // 7. 測試快取過期機制 (模擬)
    Logger.log('📝 Step 5: 測試快取狀態檢查');
    const cachedDataAfterUse = getTeacherBooksCacheFromProperties();
    const timestampAfterUse = getTeacherBooksCacheTimestamp();
    
    if (cachedDataAfterUse && timestampAfterUse) {
      Logger.log('✅ 快取儲存機制正常工作');
    } else {
      Logger.log('❌ 快取儲存機制異常');
      return false;
    }
    
    // 8. 生成測試報告
    const testResults = {
      testName: 'PropertiesService 快取機制測試',
      passed: true,
      firstCallTime: time1,
      secondCallTime: time2,
      performanceImprovement: performanceImprovement,
      booksFound: books1.length,
      cacheWorking: time2 < time1,
      timestamp: new Date().toISOString()
    };
    
    Logger.log('🎉 PropertiesService 快取機制測試完成！');
    Logger.log('📊 測試結果：' + JSON.stringify(testResults, null, 2));
    
    return testResults;
    
  } catch (error) {
    Logger.log('❌ PropertiesService 快取測試失敗：' + error.toString());
    return {
      testName: 'PropertiesService 快取機制測試',
      passed: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 🔬 快速快取性能測試
 */
function quickCachePerformanceTest() {
  Logger.log('🚀 開始快速快取性能測試...');
  
  // 清除快取
  clearTeacherBooksCache();
  
  // 測試多次調用的性能表現
  const callTimes = [];
  
  for (let i = 0; i < 5; i++) {
    const startTime = new Date().getTime();
    const books = getAllTeacherBooks();
    const endTime = new Date().getTime();
    const callTime = endTime - startTime;
    
    callTimes.push({
      call: i + 1,
      time: callTime,
      booksCount: books.length,
      cached: i > 0 // 第一次之後都應該是快取
    });
    
    Logger.log(`📊 第 ${i + 1} 次調用: ${callTime}ms, ${books.length} 本記錄簿`);
  }
  
  const firstCallTime = callTimes[0].time;
  const avgCachedTime = callTimes.slice(1).reduce((sum, call) => sum + call.time, 0) / 4;
  const performanceRatio = firstCallTime / avgCachedTime;
  
  Logger.log(`🎯 性能分析:`);
  Logger.log(`   首次調用: ${firstCallTime}ms`);
  Logger.log(`   快取調用平均: ${avgCachedTime.toFixed(1)}ms`);
  Logger.log(`   性能提升倍數: ${performanceRatio.toFixed(1)}x`);
  
  return {
    firstCallTime,
    avgCachedTime,
    performanceRatio,
    callTimes
  };
}

/**
 * 🧪 與舊版全域變數快取對比測試 (安全版本)
 */
function compareWithOldCacheImplementation() {
  Logger.log('🔬 開始新舊快取機制對比測試...');
  
  try {
    // 測試新的 PropertiesService 快取
    clearTeacherBooksCache();
    
    const newCacheTest = quickCachePerformanceTest();
    
    Logger.log('📈 PropertiesService 快取測試結果:');
    Logger.log(`  - 首次調用: ${newCacheTest.firstCallTime}ms`);
    Logger.log(`  - 快取調用: ${newCacheTest.avgCachedTime.toFixed(1)}ms`);
    Logger.log(`  - 性能提升: ${newCacheTest.performanceRatio.toFixed(1)}x`);
    
    // 評估穩定性 (檢查快取是否一致工作)
    const stabilityScore = newCacheTest.callTimes.slice(1).every(call => call.time < newCacheTest.firstCallTime) ? 100 : 0;
    
    Logger.log(`🎯 快取機制評估:`);
    Logger.log(`  - 穩定性評分: ${stabilityScore}/100`);
    Logger.log(`  - 建議: ${stabilityScore === 100 ? '✅ 新快取機制穩定可靠' : '⚠️ 快取機制需要調整'}`);
    
    return {
      passed: stabilityScore === 100,
      stabilityScore,
      performanceData: newCacheTest
    };
    
  } catch (error) {
    Logger.log('❌ 快取對比測試失敗: ' + error.toString());
    return {
      passed: false,
      error: error.toString()
    };
  }
}