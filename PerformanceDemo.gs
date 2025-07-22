/**
 * 性能監控系統演示和測試模組
 * 展示PerformanceMonitor的各種使用方式
 * 用於驗證性能監控功能正常運作
 */

/**
 * 演示性能監控功能
 * 運行各種測試場景，展示監控能力
 */
function demonstratePerformanceMonitoring() {
  Logger.log('🎯 開始性能監控系統演示...');
  
  try {
    // 1. 基本性能測量演示
    runBasicPerformanceDemo();
    
    // 2. 批量操作性能測量演示
    runBatchOperationDemo();
    
    // 3. 函數測量演示
    runFunctionMeasurementDemo();
    
    // 4. 生成並顯示性能報告
    displayPerformanceReport();
    
    // 5. 顯示系統健康狀態
    displaySystemHealth();
    
    Logger.log('✅ 性能監控系統演示完成');
    
  } catch (error) {
    Logger.log('❌ 性能監控演示失敗: ' + error.message);
    throw error;
  }
}

/**
 * 基本性能測量演示
 */
function runBasicPerformanceDemo() {
  Logger.log('📊 演示1: 基本性能測量');
  
  // 快速操作
  const fastSession = startTimer('快速操作演示', 'DEMO');
  Utilities.sleep(500); // 模擬0.5秒操作
  fastSession.checkpoint('中間點');
  Utilities.sleep(300); // 再模擬0.3秒
  fastSession.end(true, '快速操作完成');
  
  // 正常操作
  const normalSession = startTimer('正常操作演示', 'DEMO');
  Utilities.sleep(2000); // 模擬2秒操作
  normalSession.checkpoint('處理中');
  Utilities.sleep(800); // 再模擬0.8秒
  normalSession.end(true, '正常操作完成');
  
  // 緩慢操作
  const slowSession = startTimer('緩慢操作演示', 'DEMO');
  Utilities.sleep(4000); // 模擬4秒操作
  slowSession.checkpoint('耗時操作中');
  Utilities.sleep(1500); // 再模擬1.5秒
  slowSession.end(true, '緩慢操作完成');
  
  // 失敗操作
  const failSession = startTimer('失敗操作演示', 'DEMO');
  Utilities.sleep(1000);
  failSession.end(false, '模擬操作失敗');
  
  Logger.log('✅ 基本性能測量演示完成');
}

/**
 * 批量操作性能測量演示
 */
function runBatchOperationDemo() {
  Logger.log('📊 演示2: 批量操作性能測量');
  
  // 模擬學生資料處理
  const students = [];
  for (let i = 1; i <= 50; i++) {
    students.push({
      id: `S${i.toString().padStart(3, '0')}`,
      name: `測試學生${i}`,
      grade: `G${Math.floor((i-1)/10) + 1}`
    });
  }
  
  // 批量處理函數
  const processStudent = async (student) => {
    // 模擬處理時間
    Utilities.sleep(Math.random() * 200 + 50); // 50-250ms
    return {
      processed: true,
      studentId: student.id,
      timestamp: new Date()
    };
  };
  
  // 使用性能監控的批量操作
  PerformanceMonitor.measureBatchOperation(
    students,
    processStudent,
    '學生資料處理',
    10 // 批次大小
  ).then(result => {
    Logger.log(`✅ 批量操作完成: 處理了 ${result.processedCount}/${students.length} 個學生`);
    Logger.log(`   成功率: ${(result.successRate * 100).toFixed(1)}%`);
    Logger.log(`   總耗時: ${result.performance.duration}ms`);
  }).catch(error => {
    Logger.log(`❌ 批量操作失敗: ${error.message}`);
  });
}

/**
 * 函數測量演示
 */
function runFunctionMeasurementDemo() {
  Logger.log('📊 演示3: 函數性能測量');
  
  // 測試函數1: 快速函數
  const quickFunction = () => {
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      sum += i;
    }
    return sum;
  };
  
  // 測試函數2: 較慢函數
  const slowFunction = () => {
    Utilities.sleep(1500);
    return 'Slow operation completed';
  };
  
  // 測試函數3: 會出錯的函數
  const errorFunction = () => {
    throw new Error('測試錯誤');
  };
  
  // 使用性能監控測量函數
  quickMeasure(quickFunction, '快速計算函數').then(result => {
    Logger.log(`✅ 快速函數測量完成: ${result.performance.duration}ms`);
    Logger.log(`   結果: ${result.result}`);
  });
  
  quickMeasure(slowFunction, '緩慢函數').then(result => {
    Logger.log(`⚠️ 緩慢函數測量完成: ${result.performance.duration}ms`);
    Logger.log(`   結果: ${result.result}`);
  });
  
  quickMeasure(errorFunction, '錯誤函數').then(result => {
    Logger.log(`❌ 錯誤函數測量完成: ${result.performance.duration}ms`);
    Logger.log(`   成功: ${result.success}, 錯誤: ${result.error}`);
  });
}

/**
 * 顯示性能報告
 */
function displayPerformanceReport() {
  Logger.log('📊 演示4: 生成性能報告');
  
  const report = getPerformanceReport(24); // 最近24小時
  
  Logger.log('\n=== 性能報告 ===');
  Logger.log(`🕒 報告時間: ${report.reportTime}`);
  Logger.log(`📊 ${report.summary}`);
  
  Logger.log('\n--- 統計數據 ---');
  const stats = report.statistics;
  Logger.log(`總操作數: ${stats.totalOperations}`);
  Logger.log(`成功率: ${stats.successRate}`);
  Logger.log(`平均耗時: ${stats.averageDuration}ms`);
  Logger.log(`中位數耗時: ${stats.medianDuration}ms`);
  Logger.log(`最短耗時: ${stats.minDuration}ms`);
  Logger.log(`最長耗時: ${stats.maxDuration}ms`);
  
  Logger.log('\n--- 性能等級分布 ---');
  const levels = stats.performanceLevels;
  Logger.log(`🚀 快速: ${levels.FAST}個`);
  Logger.log(`✅ 正常: ${levels.NORMAL}個`);
  Logger.log(`⚠️ 緩慢: ${levels.SLOW}個`);
  Logger.log(`🚨 嚴重: ${levels.CRITICAL}個`);
  
  if (report.slowestOperations.length > 0) {
    Logger.log('\n--- 最慢操作 ---');
    report.slowestOperations.slice(0, 5).forEach((op, index) => {
      Logger.log(`${index + 1}. ${op.operation}: ${op.duration}ms (${op.category})`);
    });
  }
  
  if (report.mostFrequentOperations.length > 0) {
    Logger.log('\n--- 最常見操作 ---');
    report.mostFrequentOperations.slice(0, 5).forEach((op, index) => {
      Logger.log(`${index + 1}. ${op.operation}: ${op.count}次`);
    });
  }
  
  if (report.alerts.length > 0) {
    Logger.log('\n--- 近期告警 ---');
    report.alerts.slice(0, 5).forEach((alert, index) => {
      Logger.log(`${index + 1}. ${alert.type}: ${alert.message}`);
    });
  }
  
  Logger.log('✅ 性能報告顯示完成\n');
}

/**
 * 顯示系統健康狀態
 */
function displaySystemHealth() {
  Logger.log('🏥 演示5: 系統健康檢查');
  
  const health = getSystemHealthStatus();
  
  Logger.log('\n=== 系統健康狀態 ===');
  Logger.log(`🏥 健康分數: ${health.healthScore}/100`);
  Logger.log(`📈 健康等級: ${health.healthLevel}`);
  Logger.log(`📝 概要: ${health.summary}`);
  Logger.log(`🕒 最後更新: ${health.lastUpdated}`);
  
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
  
  Logger.log('✅ 系統健康檢查完成\n');
}

/**
 * 測試性能監控在實際場景中的應用
 */
function testRealWorldScenario() {
  Logger.log('🌍 真實場景測試: 模擬老師記錄簿創建流程');
  
  const session = startTimer('模擬記錄簿創建', 'RECORD_CREATION');
  
  try {
    // 模擬各個步驟
    session.checkpoint('開始初始化');
    Utilities.sleep(200);
    
    session.checkpoint('創建資料夾結構');
    Utilities.sleep(800);
    
    session.checkpoint('建立工作表');
    Utilities.sleep(1200);
    
    session.checkpoint('設定格式和公式');
    Utilities.sleep(600);
    
    session.checkpoint('匯入學生資料', { studentCount: 25 });
    Utilities.sleep(1500);
    
    session.checkpoint('生成電聯記錄範本');
    Utilities.sleep(900);
    
    session.checkpoint('設定權限和共享');
    Utilities.sleep(400);
    
    const result = session.end(true, '記錄簿創建成功完成');
    
    Logger.log(`✅ 真實場景測試完成:`);
    Logger.log(`   總耗時: ${result.duration}ms`);
    Logger.log(`   性能等級: ${result.performanceLevel}`);
    Logger.log(`   操作狀態: ${result.success ? '成功' : '失敗'}`);
    
  } catch (error) {
    session.end(false, error.message);
    Logger.log(`❌ 真實場景測試失敗: ${error.message}`);
  }
}

/**
 * 壓力測試：測試大量並發操作
 */
function runStressTest() {
  Logger.log('🔥 壓力測試: 大量並發操作');
  
  const operations = [];
  
  // 創建多個並發操作
  for (let i = 0; i < 20; i++) {
    const session = startTimer(`並發操作${i + 1}`, 'STRESS_TEST');
    
    // 模擬不同長度的操作
    const duration = Math.random() * 3000 + 500; // 0.5-3.5秒
    
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90%成功率
      session.end(success, success ? '並發操作完成' : '並發操作失敗');
    }, duration);
    
    operations.push(session);
  }
  
  Logger.log(`🚀 啟動了 ${operations.length} 個並發操作`);
  
  // 等待所有操作完成後生成報告
  setTimeout(() => {
    const stressReport = getPerformanceReport(1); // 最近1小時
    Logger.log('\n=== 壓力測試報告 ===');
    Logger.log(`並發操作數: ${stressReport.statistics.totalOperations}`);
    Logger.log(`成功率: ${stressReport.statistics.successRate}`);
    Logger.log(`平均響應時間: ${stressReport.statistics.averageDuration}ms`);
    Logger.log('✅ 壓力測試完成');
  }, 5000);
}

/**
 * 清除演示數據
 */
function clearDemoData() {
  Logger.log('🧹 清除演示性能數據');
  
  // 清除測量數據
  PerformanceMonitor.measurements.clear();
  PerformanceMonitor.alerts.length = 0;
  PerformanceMonitor.benchmarks.clear();
  
  Logger.log('✅ 演示數據已清除');
}

/**
 * 快速性能檢查 - 檢驗監控系統是否正常工作
 */
function quickPerformanceCheck() {
  Logger.log('⚡ 快速性能檢查');
  
  const session = startTimer('快速檢查', 'SYSTEM_CHECK');
  
  // 執行一些基本操作
  Utilities.sleep(500);
  session.checkpoint('檢查點1');
  
  const randomDelay = Math.random() * 1000 + 200;
  Utilities.sleep(randomDelay);
  session.checkpoint('檢查點2', { delay: randomDelay });
  
  const result = session.end(true, '快速檢查完成');
  
  Logger.log(`⚡ 快速檢查結果:`);
  Logger.log(`   耗時: ${result.duration}ms`);
  Logger.log(`   等級: ${result.performanceLevel}`);
  Logger.log(`   狀態: ${result.success ? '✅ 正常' : '❌ 異常'}`);
  
  // 檢查系統健康度
  const health = getSystemHealthStatus();
  Logger.log(`   系統健康度: ${health.healthScore}/100 (${health.healthLevel})`);
  
  return result;
}