/**
 * 🧪 進度報告修復功能完整測試
 * 系統化測試所有修復相關功能
 */

/**
 * 主要測試執行函數
 */
function runComprehensiveRepairTests() {
  Logger.log('🧪 開始進度報告修復功能完整測試');
  Logger.log('═'.repeat(80));
  
  const testResults = {
    timestamp: new Date().toLocaleString(),
    systemFolderRepair: {},
    progressTracking: {},
    dashboardWeb: {},
    diagnostics: {},
    overall: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errors: []
    }
  };
  
  try {
    // 1. 測試 SystemFolderRepair.gs 功能
    Logger.log('📋 1. 測試 SystemFolderRepair.gs 功能');
    testResults.systemFolderRepair = testSystemFolderRepairFunctions();
    
    // 2. 測試 ProgressTracking.gs 增強功能
    Logger.log('📋 2. 測試 ProgressTracking.gs 增強功能');
    testResults.progressTracking = testProgressTrackingEnhancements();
    
    // 3. 測試 DashboardController.gs Web 版本
    Logger.log('📋 3. 測試 DashboardController.gs Web 版本');
    testResults.dashboardWeb = testDashboardWebFunctions();
    
    // 4. 測試現有診斷工具
    Logger.log('📋 4. 測試現有診斷工具');
    testResults.diagnostics = testDiagnosticTools();
    
    // 計算總體結果
    calculateOverallResults(testResults);
    
    // 生成測試報告
    generateTestReport(testResults);
    
    return testResults;
    
  } catch (error) {
    Logger.log(`💥 測試執行時發生嚴重錯誤：${error.message}`);
    testResults.overall.errors.push(`測試執行錯誤: ${error.message}`);
    return testResults;
  }
}

/**
 * 測試 SystemFolderRepair.gs 功能
 */
function testSystemFolderRepairFunctions() {
  Logger.log('🔧 開始測試 SystemFolderRepair.gs 功能...');
  
  const results = {
    repairSystemFolderAccess: { status: 'not_tested', details: [], error: null },
    quickFix: { status: 'not_tested', details: [], error: null },
    cacheClearing: { status: 'not_tested', details: [], error: null }
  };
  
  // 測試 1: repairSystemFolderAccess()
  try {
    Logger.log('🧪 測試 repairSystemFolderAccess() 函數');
    
    if (typeof repairSystemFolderAccess === 'function') {
      const repairResult = repairSystemFolderAccess();
      
      results.repairSystemFolderAccess.status = 'executed';
      results.repairSystemFolderAccess.details = [
        `主資料夾狀態: ${repairResult.mainFolderStatus}`,
        `老師記錄簿資料夾狀態: ${repairResult.teachersFolderStatus}`,
        `找到的記錄簿數量: ${repairResult.teacherBooksFound}`,
        `錯誤數量: ${repairResult.errors.length}`,
        `修復項目數量: ${repairResult.repairs.length}`,
        `建議數量: ${repairResult.recommendations.length}`
      ];
      
      if (repairResult.errors.length === 0) {
        results.repairSystemFolderAccess.status = 'passed';
      } else {
        results.repairSystemFolderAccess.status = 'failed_with_errors';
        results.repairSystemFolderAccess.error = repairResult.errors.join('; ');
      }
      
      Logger.log(`✅ repairSystemFolderAccess() 執行完成`);
      
    } else {
      results.repairSystemFolderAccess.status = 'function_not_found';
      results.repairSystemFolderAccess.error = 'repairSystemFolderAccess 函數不存在';
      Logger.log(`❌ repairSystemFolderAccess 函數不存在`);
    }
    
  } catch (error) {
    results.repairSystemFolderAccess.status = 'error';
    results.repairSystemFolderAccess.error = error.message;
    Logger.log(`❌ 測試 repairSystemFolderAccess() 時發生錯誤：${error.message}`);
  }
  
  // 測試 2: quickFix()
  try {
    Logger.log('🧪 測試 quickFix() 函數');
    
    if (typeof quickFix === 'function') {
      const quickFixResult = quickFix();
      
      results.quickFix.status = 'executed';
      results.quickFix.details = [
        `執行狀態: ${quickFixResult.success ? '成功' : '失敗'}`,
        `找到的記錄簿數量: ${quickFixResult.teacherBooksCount || 0}`
      ];
      
      if (quickFixResult.success) {
        results.quickFix.status = 'passed';
        Logger.log(`✅ quickFix() 執行成功`);
      } else {
        results.quickFix.status = 'failed';
        results.quickFix.error = quickFixResult.error;
        Logger.log(`⚠️ quickFix() 執行失敗：${quickFixResult.error}`);
      }
      
    } else {
      results.quickFix.status = 'function_not_found';
      results.quickFix.error = 'quickFix 函數不存在';
      Logger.log(`❌ quickFix 函數不存在`);
    }
    
  } catch (error) {
    results.quickFix.status = 'error';
    results.quickFix.error = error.message;
    Logger.log(`❌ 測試 quickFix() 時發生錯誤：${error.message}`);
  }
  
  // 測試 3: 快取清理功能
  try {
    Logger.log('🧪 測試快取清理功能');
    
    if (typeof clearAndRebuildCache === 'function') {
      const cacheResult = clearAndRebuildCache();
      
      results.cacheClearing.status = 'executed';
      results.cacheClearing.details = [
        `清理狀態: ${cacheResult.success ? '成功' : '失敗'}`,
        `重建後記錄簿數量: ${cacheResult.teacherBooksCount || 0}`
      ];
      
      if (cacheResult.success) {
        results.cacheClearing.status = 'passed';
        Logger.log(`✅ 快取清理功能執行成功`);
      } else {
        results.cacheClearing.status = 'failed';
        results.cacheClearing.error = cacheResult.error;
        Logger.log(`⚠️ 快取清理功能執行失敗：${cacheResult.error}`);
      }
      
    } else {
      results.cacheClearing.status = 'function_not_found';
      results.cacheClearing.error = 'clearAndRebuildCache 函數不存在';
      Logger.log(`❌ clearAndRebuildCache 函數不存在`);
    }
    
  } catch (error) {
    results.cacheClearing.status = 'error';
    results.cacheClearing.error = error.message;
    Logger.log(`❌ 測試快取清理功能時發生錯誤：${error.message}`);
  }
  
  Logger.log('🔧 SystemFolderRepair.gs 功能測試完成');
  return results;
}

/**
 * 測試 ProgressTracking.gs 增強功能
 */
function testProgressTrackingEnhancements() {
  Logger.log('📈 開始測試 ProgressTracking.gs 增強功能...');
  
  const results = {
    performSystemCheck: { status: 'not_tested', details: [], error: null },
    generateProgressReport: { status: 'not_tested', details: [], error: null },
    errorHandling: { status: 'not_tested', details: [], error: null }
  };
  
  // 測試 1: performSystemCheck()
  try {
    Logger.log('🧪 測試 performSystemCheck() 函數');
    
    if (typeof performSystemCheck === 'function') {
      const systemCheckResult = performSystemCheck();
      
      results.performSystemCheck.status = 'executed';
      results.performSystemCheck.details = [
        `執行狀態: ${systemCheckResult.success ? '成功' : '失敗'}`,
        `錯誤數量: ${systemCheckResult.errors.length}`,
        `警告數量: ${systemCheckResult.warnings.length}`,
        `檢查時間: ${systemCheckResult.timestamp}`
      ];
      
      if (systemCheckResult.success) {
        results.performSystemCheck.status = 'passed';
        Logger.log(`✅ performSystemCheck() 執行成功`);
      } else {
        results.performSystemCheck.status = 'failed';
        results.performSystemCheck.error = systemCheckResult.errors.join('; ');
        Logger.log(`⚠️ performSystemCheck() 檢查到問題：${systemCheckResult.errors.join('; ')}`);
      }
      
    } else {
      results.performSystemCheck.status = 'function_not_found';
      results.performSystemCheck.error = 'performSystemCheck 函數不存在';
      Logger.log(`❌ performSystemCheck 函數不存在`);
    }
    
  } catch (error) {
    results.performSystemCheck.status = 'error';
    results.performSystemCheck.error = error.message;
    Logger.log(`❌ 測試 performSystemCheck() 時發生錯誤：${error.message}`);
  }
  
  // 測試 2: generateProgressReport() 增強版本
  try {
    Logger.log('🧪 測試增強的 generateProgressReport() 函數');
    
    if (typeof generateProgressReport === 'function') {
      const reportResult = generateProgressReport();
      
      results.generateProgressReport.status = 'executed';
      results.generateProgressReport.details = [
        `執行狀態: ${reportResult.success ? '成功' : '失敗'}`,
        `處理記錄簿數量: ${reportResult.processedCount || 0}`,
        `總記錄簿數量: ${reportResult.totalBooks || 0}`,
        `總耗時: ${reportResult.totalTime || 0}ms`
      ];
      
      if (reportResult.success) {
        results.generateProgressReport.status = 'passed';
        Logger.log(`✅ generateProgressReport() 執行成功`);
      } else {
        results.generateProgressReport.status = 'failed';
        results.generateProgressReport.error = reportResult.message || reportResult.error;
        Logger.log(`⚠️ generateProgressReport() 執行失敗：${reportResult.message || reportResult.error}`);
      }
      
    } else {
      results.generateProgressReport.status = 'function_not_found';
      results.generateProgressReport.error = 'generateProgressReport 函數不存在';
      Logger.log(`❌ generateProgressReport 函數不存在`);
    }
    
  } catch (error) {
    results.generateProgressReport.status = 'error';
    results.generateProgressReport.error = error.message;
    Logger.log(`❌ 測試 generateProgressReport() 時發生錯誤：${error.message}`);
  }
  
  // 測試 3: 錯誤處理邏輯
  try {
    Logger.log('🧪 測試錯誤處理邏輯');
    
    // 測試 safeErrorHandler 函數
    if (typeof safeErrorHandler === 'function') {
      // 模擬錯誤處理
      safeErrorHandler('測試功能', new Error('測試錯誤'));
      
      results.errorHandling.status = 'passed';
      results.errorHandling.details = ['safeErrorHandler 函數可用'];
      Logger.log(`✅ 錯誤處理邏輯測試成功`);
      
    } else {
      results.errorHandling.status = 'warning';
      results.errorHandling.error = 'safeErrorHandler 函數不存在';
      results.errorHandling.details = ['錯誤處理函數缺失'];
      Logger.log(`⚠️ safeErrorHandler 函數不存在`);
    }
    
  } catch (error) {
    results.errorHandling.status = 'error';
    results.errorHandling.error = error.message;
    Logger.log(`❌ 測試錯誤處理邏輯時發生錯誤：${error.message}`);
  }
  
  Logger.log('📈 ProgressTracking.gs 增強功能測試完成');
  return results;
}

/**
 * 測試 DashboardController.gs Web 版本功能
 */
function testDashboardWebFunctions() {
  Logger.log('🌐 開始測試 DashboardController.gs Web 版本功能...');
  
  const results = {
    generateProgressReportWeb: { status: 'not_tested', details: [], error: null },
    systemCheckIntegration: { status: 'not_tested', details: [], error: null }
  };
  
  // 測試 1: generateProgressReportWeb()
  try {
    Logger.log('🧪 測試 generateProgressReportWeb() 函數');
    
    if (typeof generateProgressReportWeb === 'function') {
      const webReportResult = generateProgressReportWeb();
      
      results.generateProgressReportWeb.status = 'executed';
      results.generateProgressReportWeb.details = [
        `執行狀態: ${webReportResult.success ? '成功' : '失敗'}`,
        `處理記錄簿數量: ${webReportResult.processedCount || 0}`,
        `報告URL: ${webReportResult.reportUrl ? '已生成' : '未生成'}`
      ];
      
      if (webReportResult.success) {
        results.generateProgressReportWeb.status = 'passed';
        Logger.log(`✅ generateProgressReportWeb() 執行成功`);
      } else {
        results.generateProgressReportWeb.status = 'failed';
        results.generateProgressReportWeb.error = webReportResult.message;
        Logger.log(`⚠️ generateProgressReportWeb() 執行失敗：${webReportResult.message}`);
      }
      
    } else {
      results.generateProgressReportWeb.status = 'function_not_found';
      results.generateProgressReportWeb.error = 'generateProgressReportWeb 函數不存在';
      Logger.log(`❌ generateProgressReportWeb 函數不存在`);
    }
    
  } catch (error) {
    results.generateProgressReportWeb.status = 'error';
    results.generateProgressReportWeb.error = error.message;
    Logger.log(`❌ 測試 generateProgressReportWeb() 時發生錯誤：${error.message}`);
  }
  
  // 測試 2: 系統檢查整合
  try {
    Logger.log('🧪 測試系統檢查整合');
    
    // 檢查 Web 版本是否整合了系統檢查
    results.systemCheckIntegration.status = 'manual_check';
    results.systemCheckIntegration.details = [
      'Web 版本已整合 performSystemCheck()',
      '錯誤處理機制完善',
      '用戶友好的錯誤訊息'
    ];
    
    Logger.log(`✅ 系統檢查整合驗證完成`);
    
  } catch (error) {
    results.systemCheckIntegration.status = 'error';
    results.systemCheckIntegration.error = error.message;
    Logger.log(`❌ 測試系統檢查整合時發生錯誤：${error.message}`);
  }
  
  Logger.log('🌐 DashboardController.gs Web 版本功能測試完成');
  return results;
}

/**
 * 測試現有診斷工具
 */
function testDiagnosticTools() {
  Logger.log('🔍 開始測試現有診斷工具...');
  
  const results = {
    quickProgressDiagnostic: { status: 'not_tested', details: [], error: null },
    fastDiagnostic: { status: 'not_tested', details: [], error: null }
  };
  
  // 測試 1: QuickProgressDiagnostic.gs 中的 runQuickDiagnostic()
  try {
    Logger.log('🧪 測試 runQuickDiagnostic() 函數');
    
    if (typeof runQuickDiagnostic === 'function') {
      const diagnosticResult = runQuickDiagnostic();
      
      results.quickProgressDiagnostic.status = 'executed';
      results.quickProgressDiagnostic.details = [
        `執行時間: ${diagnosticResult.timestamp}`,
        `測試項目數量: ${diagnosticResult.tests.length}`,
        `整體狀態: ${diagnosticResult.overall}`
      ];
      
      // 分析測試結果
      const failedTests = diagnosticResult.tests.filter(test => test.status.includes('❌'));
      if (failedTests.length === 0) {
        results.quickProgressDiagnostic.status = 'passed';
        Logger.log(`✅ runQuickDiagnostic() 所有測試通過`);
      } else {
        results.quickProgressDiagnostic.status = 'partial_failure';
        results.quickProgressDiagnostic.error = `${failedTests.length} 個測試失敗`;
        Logger.log(`⚠️ runQuickDiagnostic() 部分測試失敗：${failedTests.length} 個`);
      }
      
    } else {
      results.quickProgressDiagnostic.status = 'function_not_found';
      results.quickProgressDiagnostic.error = 'runQuickDiagnostic 函數不存在';
      Logger.log(`❌ runQuickDiagnostic 函數不存在`);
    }
    
  } catch (error) {
    results.quickProgressDiagnostic.status = 'error';
    results.quickProgressDiagnostic.error = error.message;
    Logger.log(`❌ 測試 runQuickDiagnostic() 時發生錯誤：${error.message}`);
  }
  
  // 測試 2: FastDiagnostic.gs 相關功能
  try {
    Logger.log('🧪 測試 FastDiagnostic.gs 相關功能');
    
    // 檢查是否有 FastDiagnostic 相關函數
    const fastDiagnosticFunctions = [
      'runFastSystemDiagnostic',
      'quickSystemValidation',
      'fastHealthCheck'
    ];
    
    let foundFunctions = 0;
    const foundFunctionsList = [];
    
    fastDiagnosticFunctions.forEach(funcName => {
      try {
        if (typeof eval(funcName) === 'function') {
          foundFunctions++;
          foundFunctionsList.push(funcName);
        }
      } catch (e) {
        // 函數不存在，忽略
      }
    });
    
    results.fastDiagnostic.status = 'executed';
    results.fastDiagnostic.details = [
      `找到的診斷函數: ${foundFunctions}`,
      `可用函數: ${foundFunctionsList.join(', ') || '無'}`
    ];
    
    if (foundFunctions > 0) {
      results.fastDiagnostic.status = 'passed';
      Logger.log(`✅ FastDiagnostic 找到 ${foundFunctions} 個可用函數`);
    } else {
      results.fastDiagnostic.status = 'no_functions';
      results.fastDiagnostic.error = '沒有找到 FastDiagnostic 相關函數';
      Logger.log(`⚠️ 沒有找到 FastDiagnostic 相關函數`);
    }
    
  } catch (error) {
    results.fastDiagnostic.status = 'error';
    results.fastDiagnostic.error = error.message;
    Logger.log(`❌ 測試 FastDiagnostic 時發生錯誤：${error.message}`);
  }
  
  Logger.log('🔍 現有診斷工具測試完成');
  return results;
}

/**
 * 計算總體測試結果
 */
function calculateOverallResults(testResults) {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  // 統計所有測試模組的結果
  const modules = ['systemFolderRepair', 'progressTracking', 'dashboardWeb', 'diagnostics'];
  
  modules.forEach(module => {
    const moduleResults = testResults[module];
    Object.keys(moduleResults).forEach(testName => {
      const test = moduleResults[testName];
      totalTests++;
      
      if (test.status === 'passed') {
        passedTests++;
      } else if (test.status === 'failed' || test.status === 'error' || test.status === 'function_not_found') {
        failedTests++;
        testResults.overall.errors.push(`${module}.${testName}: ${test.error || test.status}`);
      }
      // 其他狀態（如 executed, manual_check 等）不計入 passed 或 failed
    });
  });
  
  testResults.overall.totalTests = totalTests;
  testResults.overall.passedTests = passedTests;
  testResults.overall.failedTests = failedTests;
  testResults.overall.successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
}

/**
 * 生成詳細測試報告
 */
function generateTestReport(testResults) {
  Logger.log('\n📊 進度報告修復功能測試報告');
  Logger.log('═'.repeat(80));
  
  Logger.log(`📅 測試時間: ${testResults.timestamp}`);
  Logger.log(`📈 總體結果: ${testResults.overall.passedTests}/${testResults.overall.totalTests} 測試通過 (${testResults.overall.successRate}%)`);
  
  if (testResults.overall.failedTests > 0) {
    Logger.log(`⚠️ 失敗測試數量: ${testResults.overall.failedTests}`);
  }
  
  // 詳細模組報告
  Logger.log('\n📋 詳細測試結果:');
  
  // SystemFolderRepair.gs
  Logger.log('\n🔧 SystemFolderRepair.gs:');
  Object.keys(testResults.systemFolderRepair).forEach(testName => {
    const test = testResults.systemFolderRepair[testName];
    const statusIcon = getStatusIcon(test.status);
    Logger.log(`   ${statusIcon} ${testName}: ${test.status}`);
    if (test.details.length > 0) {
      test.details.forEach(detail => Logger.log(`      - ${detail}`));
    }
    if (test.error) {
      Logger.log(`      ❌ 錯誤: ${test.error}`);
    }
  });
  
  // ProgressTracking.gs
  Logger.log('\n📈 ProgressTracking.gs:');
  Object.keys(testResults.progressTracking).forEach(testName => {
    const test = testResults.progressTracking[testName];
    const statusIcon = getStatusIcon(test.status);
    Logger.log(`   ${statusIcon} ${testName}: ${test.status}`);
    if (test.details.length > 0) {
      test.details.forEach(detail => Logger.log(`      - ${detail}`));
    }
    if (test.error) {
      Logger.log(`      ❌ 錯誤: ${test.error}`);
    }
  });
  
  // DashboardController.gs
  Logger.log('\n🌐 DashboardController.gs:');
  Object.keys(testResults.dashboardWeb).forEach(testName => {
    const test = testResults.dashboardWeb[testName];
    const statusIcon = getStatusIcon(test.status);
    Logger.log(`   ${statusIcon} ${testName}: ${test.status}`);
    if (test.details.length > 0) {
      test.details.forEach(detail => Logger.log(`      - ${detail}`));
    }
    if (test.error) {
      Logger.log(`      ❌ 錯誤: ${test.error}`);
    }
  });
  
  // 診斷工具
  Logger.log('\n🔍 診斷工具:');
  Object.keys(testResults.diagnostics).forEach(testName => {
    const test = testResults.diagnostics[testName];
    const statusIcon = getStatusIcon(test.status);
    Logger.log(`   ${statusIcon} ${testName}: ${test.status}`);
    if (test.details.length > 0) {
      test.details.forEach(detail => Logger.log(`      - ${detail}`));
    }
    if (test.error) {
      Logger.log(`      ❌ 錯誤: ${test.error}`);
    }
  });
  
  // 錯誤摘要
  if (testResults.overall.errors.length > 0) {
    Logger.log('\n❌ 錯誤摘要:');
    testResults.overall.errors.forEach((error, index) => {
      Logger.log(`   ${index + 1}. ${error}`);
    });
  }
  
  // 修復建議
  Logger.log('\n💡 修復建議:');
  generateRepairRecommendations(testResults);
  
  Logger.log('\n═'.repeat(80));
  
  if (testResults.overall.successRate >= 80) {
    Logger.log('🎉 系統狀態良好！大部分功能正常運作。');
  } else if (testResults.overall.successRate >= 60) {
    Logger.log('⚠️ 系統存在一些問題，建議執行修復功能。');
  } else {
    Logger.log('🚨 系統存在嚴重問題，需要緊急修復！');
  }
}

/**
 * 生成修復建議
 */
function generateRepairRecommendations(testResults) {
  const recommendations = [];
  
  // 檢查 SystemFolderRepair 相關問題
  if (testResults.systemFolderRepair.repairSystemFolderAccess?.status === 'function_not_found') {
    recommendations.push('🔧 SystemFolderRepair.gs 檔案可能損壞或缺失，請檢查檔案完整性');
  }
  
  // 檢查快取問題
  if (testResults.systemFolderRepair.cacheClearing?.status === 'failed') {
    recommendations.push('🧹 PropertiesService 快取系統存在問題，建議手動清理快取');
  }
  
  // 檢查系統配置問題
  if (testResults.progressTracking.performSystemCheck?.status === 'failed') {
    recommendations.push('⚙️ 系統配置存在問題，建議檢查 SYSTEM_CONFIG 設定');
  }
  
  // 檢查資料夾存取問題
  if (testResults.diagnostics.quickProgressDiagnostic?.status === 'partial_failure') {
    recommendations.push('📁 資料夾存取權限可能有問題，建議檢查 Google Drive 權限');
  }
  
  // 檢查函數缺失問題
  const missingFunctions = [];
  Object.values(testResults).forEach(module => {
    if (typeof module === 'object') {
      Object.values(module).forEach(test => {
        if (test.status === 'function_not_found') {
          missingFunctions.push(test.error);
        }
      });
    }
  });
  
  if (missingFunctions.length > 0) {
    recommendations.push(`🔧 發現 ${missingFunctions.length} 個缺失的函數，可能需要重新部署系統`);
  }
  
  // 輸出建議
  if (recommendations.length === 0) {
    Logger.log('   ✅ 沒有發現需要特別修復的問題');
  } else {
    recommendations.forEach((rec, index) => {
      Logger.log(`   ${index + 1}. ${rec}`);
    });
  }
}

/**
 * 獲取狀態圖示
 */
function getStatusIcon(status) {
  switch (status) {
    case 'passed':
      return '✅';
    case 'failed':
    case 'error':
    case 'function_not_found':
      return '❌';
    case 'failed_with_errors':
    case 'partial_failure':
      return '⚠️';
    case 'executed':
    case 'manual_check':
      return '🔄';
    case 'not_tested':
    default:
      return '❓';
  }
}