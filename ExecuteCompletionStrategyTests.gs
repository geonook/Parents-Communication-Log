/**
 * 執行轉班策略整合測試執行器
 * 專門用於測試三種完成策略的整合功能
 * 
 * 🎯 測試範圍：
 * - testCompletionStrategyIntegration() 函數
 * - executeCompletionStrategy 核心執行器
 * - handleTransferWithCompletionStrategy 轉班處理器
 * - selectOptimalCompletionStrategy 智能選擇器
 * - 三種策略：COMPLETE_ALL, ENROLLMENT_AWARE, MANUAL_PROMPT
 * - 進度繼承機制
 * - 錯誤處理和驗證
 */

/**
 * 主要測試執行函數 - 執行所有轉班策略測試
 */
function runCompletionStrategyTests() {
  Logger.log('🚀 開始執行轉班策略整合測試...');
  
  const testResults = {
    timestamp: new Date().toISOString(),
    success: true,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    tests: [],
    summary: {},
    errors: []
  };
  
  try {
    // 1. 執行 testCompletionStrategyIntegration() 函數
    Logger.log('📋 執行 testCompletionStrategyIntegration()...');
    try {
      const integrationResult = testCompletionStrategyIntegration();
      testResults.tests.push({
        name: 'testCompletionStrategyIntegration',
        result: integrationResult,
        status: integrationResult.success ? 'PASSED' : 'FAILED'
      });
      testResults.totalTests++;
      if (integrationResult.success) {
        testResults.passedTests++;
      } else {
        testResults.failedTests++;
        testResults.success = false;
      }
    } catch (error) {
      testResults.tests.push({
        name: 'testCompletionStrategyIntegration',
        result: { success: false, message: error.message },
        status: 'ERROR'
      });
      testResults.totalTests++;
      testResults.failedTests++;
      testResults.success = false;
      testResults.errors.push(`testCompletionStrategyIntegration: ${error.message}`);
    }
    
    // 2. 測試核心函數存在性和可調用性
    Logger.log('🔍 驗證核心函數...');
    const coreFunctions = [
      'executeCompletionStrategy',
      'handleTransferWithCompletionStrategy', 
      'selectOptimalCompletionStrategy'
    ];
    
    coreFunctions.forEach(funcName => {
      testResults.totalTests++;
      try {
        if (typeof eval(funcName) === 'function') {
          testResults.tests.push({
            name: `${funcName}_exists`,
            result: { success: true, message: `函數 ${funcName} 存在且可調用` },
            status: 'PASSED'
          });
          testResults.passedTests++;
        } else {
          testResults.tests.push({
            name: `${funcName}_exists`,
            result: { success: false, message: `函數 ${funcName} 不存在或不可調用` },
            status: 'FAILED'
          });
          testResults.failedTests++;
          testResults.success = false;
        }
      } catch (error) {
        testResults.tests.push({
          name: `${funcName}_exists`,
          result: { success: false, message: `檢查函數 ${funcName} 時發生錯誤: ${error.message}` },
          status: 'ERROR'
        });
        testResults.failedTests++;
        testResults.success = false;
        testResults.errors.push(`${funcName}: ${error.message}`);
      }
    });
    
    // 3. 測試三種策略的個別功能
    Logger.log('⚙️ 測試三種完成策略...');
    const strategies = ['COMPLETE_ALL', 'ENROLLMENT_AWARE', 'MANUAL_PROMPT'];
    
    strategies.forEach(strategy => {
      testResults.totalTests++;
      try {
        const testParams = {
          studentId: 'TEST_STUDENT_001',
          studentData: {
            'Chinese Name': '測試學生',
            'English Name': 'Test Student',
            'English Class': '1A'
          },
          newTeacher: '測試老師',
          completionStrategy: strategy,
          enrollmentDate: '2024-01-15',
          strategyOptions: {},
          transferContext: {
            fromTeacher: '原老師',
            toTeacher: '測試老師',
            toClass: '1A'
          }
        };
        
        const strategyResult = executeCompletionStrategy(testParams);
        testResults.tests.push({
          name: `strategy_${strategy}`,
          result: strategyResult,
          status: strategyResult.success ? 'PASSED' : 'FAILED'
        });
        
        if (strategyResult.success) {
          testResults.passedTests++;
        } else {
          testResults.failedTests++;
          testResults.success = false;
        }
        
      } catch (error) {
        testResults.tests.push({
          name: `strategy_${strategy}`,
          result: { success: false, message: error.message },
          status: 'ERROR'
        });
        testResults.failedTests++;
        testResults.success = false;
        testResults.errors.push(`Strategy ${strategy}: ${error.message}`);
      }
    });
    
    // 4. 測試智能策略選擇器
    Logger.log('🧠 測試智能策略選擇器...');
    testResults.totalTests++;
    try {
      const testStudentData = {
        'Chinese Name': '測試學生',
        'English Name': 'Test Student', 
        'English Class': '1A'
      };
      
      const testTransferContext = {
        studentId: 'TEST_STUDENT_001',
        newTeacher: '測試老師',
        enrollmentDate: '2024-01-15'
      };
      
      const selectorResult = selectOptimalCompletionStrategy(
        testStudentData,
        testTransferContext,
        { DEFAULT_MODE: 'ENROLLMENT_AWARE', ALLOW_OVERRIDE: true }
      );
      
      testResults.tests.push({
        name: 'strategy_selector',
        result: { 
          success: selectorResult && selectorResult.mode,
          message: `選擇策略: ${selectorResult ? selectorResult.mode : 'null'}`,
          data: selectorResult
        },
        status: (selectorResult && selectorResult.mode) ? 'PASSED' : 'FAILED'
      });
      
      if (selectorResult && selectorResult.mode) {
        testResults.passedTests++;
      } else {
        testResults.failedTests++;
        testResults.success = false;
      }
      
    } catch (error) {
      testResults.tests.push({
        name: 'strategy_selector',
        result: { success: false, message: error.message },
        status: 'ERROR'
      });
      testResults.failedTests++;
      testResults.success = false;
      testResults.errors.push(`Strategy Selector: ${error.message}`);
    }
    
    // 5. 運行其他相關的轉班管理測試
    Logger.log('🔄 執行相關轉班管理測試...');
    try {
      const studentChangeTests = testStudentChangeManager();
      testResults.tests.push({
        name: 'student_change_manager_tests',
        result: studentChangeTests,
        status: studentChangeTests.success ? 'PASSED' : 'FAILED'
      });
      testResults.totalTests += studentChangeTests.totalTests || 1;
      testResults.passedTests += studentChangeTests.passedTests || (studentChangeTests.success ? 1 : 0);
      testResults.failedTests += studentChangeTests.failedTests || (studentChangeTests.success ? 0 : 1);
      
      if (!studentChangeTests.success) {
        testResults.success = false;
      }
      
    } catch (error) {
      testResults.tests.push({
        name: 'student_change_manager_tests',
        result: { success: false, message: error.message },
        status: 'ERROR'
      });
      testResults.totalTests++;
      testResults.failedTests++;
      testResults.success = false;
      testResults.errors.push(`Student Change Manager Tests: ${error.message}`);
    }
    
    // 生成測試摘要
    testResults.summary = {
      overallStatus: testResults.success ? 'ALL_PASSED' : 'SOME_FAILED',
      successRate: testResults.totalTests > 0 ? 
        ((testResults.passedTests / testResults.totalTests) * 100).toFixed(2) + '%' : '0%',
      executionTime: new Date().toISOString(),
      criticalIssues: testResults.errors.length,
      recommendations: generateTestRecommendations(testResults)
    };
    
    // 輸出詳細測試報告
    logDetailedTestReport(testResults);
    
    Logger.log(`✅ 轉班策略整合測試完成 - 總計: ${testResults.totalTests}, 通過: ${testResults.passedTests}, 失敗: ${testResults.failedTests}`);
    
    return testResults;
    
  } catch (error) {
    Logger.log(`❌ 測試執行過程中發生嚴重錯誤: ${error.message}`);
    testResults.success = false;
    testResults.errors.push(`Critical Error: ${error.message}`);
    return testResults;
  }
}

/**
 * 生成測試建議
 */
function generateTestRecommendations(testResults) {
  const recommendations = [];
  
  if (testResults.failedTests > 0) {
    recommendations.push('修復失敗的測試案例');
  }
  
  if (testResults.errors.length > 0) {
    recommendations.push('檢查並解決錯誤問題');
  }
  
  if (testResults.passedTests < testResults.totalTests) {
    recommendations.push('提升測試覆蓋率和成功率');
  }
  
  if (testResults.passedTests === testResults.totalTests) {
    recommendations.push('系統運行正常，建議定期執行測試');
  }
  
  return recommendations;
}

/**
 * 輸出詳細測試報告
 */
function logDetailedTestReport(testResults) {
  Logger.log('\n=== 轉班策略整合測試詳細報告 ===');
  Logger.log(`測試時間: ${testResults.timestamp}`);
  Logger.log(`總體狀態: ${testResults.success ? '✅ 成功' : '❌ 失敗'}`);
  Logger.log(`成功率: ${testResults.summary.successRate}`);
  Logger.log(`總測試: ${testResults.totalTests}, 通過: ${testResults.passedTests}, 失敗: ${testResults.failedTests}`);
  
  Logger.log('\n--- 詳細測試結果 ---');
  testResults.tests.forEach((test, index) => {
    const status = test.status === 'PASSED' ? '✅' : 
                  test.status === 'FAILED' ? '❌' : '⚠️';
    Logger.log(`${index + 1}. ${status} ${test.name}: ${test.result.message || 'No message'}`);
  });
  
  if (testResults.errors.length > 0) {
    Logger.log('\n--- 錯誤詳情 ---');
    testResults.errors.forEach((error, index) => {
      Logger.log(`${index + 1}. ❌ ${error}`);
    });
  }
  
  if (testResults.summary.recommendations.length > 0) {
    Logger.log('\n--- 建議改進事項 ---');
    testResults.summary.recommendations.forEach((rec, index) => {
      Logger.log(`${index + 1}. 📝 ${rec}`);
    });
  }
  
  Logger.log('\n=== 報告結束 ===\n');
}

/**
 * 快速診斷 - 僅檢查核心函數是否存在
 */
function quickDiagnosticCompletionStrategy() {
  Logger.log('⚡ 快速診斷轉班策略系統...');
  
  const functions = [
    'testCompletionStrategyIntegration',
    'executeCompletionStrategy', 
    'handleTransferWithCompletionStrategy',
    'selectOptimalCompletionStrategy'
  ];
  
  functions.forEach(func => {
    try {
      if (typeof eval(func) === 'function') {
        Logger.log(`✅ ${func} 存在且可調用`);
      } else {
        Logger.log(`❌ ${func} 不存在或不可調用`);
      }
    } catch (error) {
      Logger.log(`⚠️ ${func} 檢查時發生錯誤: ${error.message}`);
    }
  });
  
  Logger.log('⚡ 快速診斷完成');
}