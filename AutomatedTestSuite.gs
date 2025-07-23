/**
 * 自動化測試套件
 * 企業級測試執行引擎，整合所有測試功能
 * Version: 1.0.0 - Phase 3 CI/CD Pipeline
 */

/**
 * 測試結果類
 */
class TestResult {
  constructor(testName, category = 'general') {
    this.testName = testName;
    this.category = category;
    this.status = 'pending';
    this.startTime = null;
    this.endTime = null;
    this.duration = null;
    this.success = false;
    this.message = '';
    this.details = {};
    this.errors = [];
    this.assertions = [];
  }
  
  start() {
    this.status = 'running';
    this.startTime = new Date();
  }
  
  pass(message = '', details = {}) {
    this.status = 'passed';
    this.success = true;
    this.message = message;
    this.details = details;
    this.endTime = new Date();
    this.duration = this.endTime - this.startTime;
  }
  
  fail(message = '', errors = [], details = {}) {
    this.status = 'failed';
    this.success = false;
    this.message = message;
    this.errors = Array.isArray(errors) ? errors : [errors];
    this.details = details;
    this.endTime = new Date();
    this.duration = this.endTime - this.startTime;
  }
  
  skip(message = '') {
    this.status = 'skipped';
    this.message = message;
  }
  
  addAssertion(assertion, passed, message = '') {
    this.assertions.push({
      assertion: assertion,
      passed: passed,
      message: message,
      timestamp: new Date().toISOString()
    });
  }
  
  toJSON() {
    return {
      testName: this.testName,
      category: this.category,
      status: this.status,
      success: this.success,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      message: this.message,
      details: this.details,
      errors: this.errors,
      assertions: this.assertions
    };
  }
}

/**
 * 測試套件類
 */
class TestSuite {
  constructor(suiteName, description = '') {
    this.suiteName = suiteName;
    this.description = description;
    this.tests = [];
    this.beforeEach = null;
    this.afterEach = null;
    this.beforeAll = null;
    this.afterAll = null;
    this.timeout = 30000; // 30秒默認超時
  }
  
  addTest(testName, testFunction, category = 'general') {
    this.tests.push({
      name: testName,
      function: testFunction,
      category: category,
      timeout: this.timeout
    });
  }
  
  setBeforeEach(func) {
    this.beforeEach = func;
  }
  
  setAfterEach(func) {
    this.afterEach = func;
  }
  
  setBeforeAll(func) {
    this.beforeAll = func;
  }
  
  setAfterAll(func) {
    this.afterAll = func;
  }
  
  setTimeout(timeout) {
    this.timeout = timeout;
  }
  
  async run() {
    const suiteResult = {
      suiteName: this.suiteName,
      description: this.description,
      startTime: new Date(),
      endTime: null,
      duration: null,
      totalTests: this.tests.length,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      testResults: []
    };
    
    try {
      // 執行 beforeAll
      if (this.beforeAll) {
        await this.beforeAll();
      }
      
      // 執行所有測試
      for (const test of this.tests) {
        const testResult = new TestResult(test.name, test.category);
        
        try {
          // 執行 beforeEach
          if (this.beforeEach) {
            await this.beforeEach();
          }
          
          // 執行測試
          testResult.start();
          await this.executeWithTimeout(test.function, test.timeout);
          
          if (testResult.status === 'running') {
            testResult.pass('測試通過');
          }
          
          suiteResult.passedTests++;
          
        } catch (error) {
          testResult.fail(error.message, [error]);
          suiteResult.failedTests++;
          
        } finally {
          // 執行 afterEach
          try {
            if (this.afterEach) {
              await this.afterEach();
            }
          } catch (cleanupError) {
            Logger.log(`清理錯誤: ${cleanupError.message}`);
          }
          
          suiteResult.testResults.push(testResult);
        }
      }
      
      // 執行 afterAll
      if (this.afterAll) {
        await this.afterAll();
      }
      
    } catch (error) {
      Logger.log(`測試套件執行錯誤: ${error.message}`);
    }
    
    suiteResult.endTime = new Date();
    suiteResult.duration = suiteResult.endTime - suiteResult.startTime;
    
    return suiteResult;
  }
  
  async executeWithTimeout(testFunction, timeout) {
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`測試超時 (${timeout}ms)`));
      }, timeout);
      
      try {
        await testFunction();
        clearTimeout(timer);
        resolve();
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }
}

/**
 * 自動化測試套件主類
 */
class AutomatedTestSuite {
  constructor() {
    this.testSuites = [];
    this.globalTimeout = 300000; // 5分鐘全域超時
    this.parallelExecution = true;
    this.continueOnFailure = true;
    this.testFilters = [];
    this.reportGenerators = [];
  }
  
  /**
   * 註冊測試套件
   * @param {TestSuite} testSuite 測試套件
   */
  registerSuite(testSuite) {
    this.testSuites.push(testSuite);
    Logger.log(`[AutomatedTestSuite] 註冊測試套件: ${testSuite.suiteName}`);
  }
  
  /**
   * 添加報告生成器
   * @param {Function} generator 報告生成器
   */
  addReportGenerator(generator) {
    this.reportGenerators.push(generator);
  }
  
  /**
   * 設置測試過濾器
   * @param {Array} filters 過濾器列表
   */
  setFilters(filters) {
    this.testFilters = filters;
  }
  
  /**
   * 執行所有測試套件
   * @param {Object} options 執行選項
   * @return {Object} 測試結果
   */
  async runAllTests(options = {}) {
    const perfSession = startTimer('AutomatedTestSuite.runAllTests', 'TEST_EXECUTION');
    
    const executionResult = {
      executionId: `test_${Date.now()}`,
      startTime: new Date(),
      endTime: null,
      duration: null,
      totalSuites: this.testSuites.length,
      completedSuites: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      suiteResults: [],
      summary: null,
      reports: []
    };
    
    try {
      Logger.log('[AutomatedTestSuite] 開始執行自動化測試套件');
      Logger.log(`測試套件數量: ${this.testSuites.length}`);
      
      // 應用過濾器
      const filteredSuites = this.applyFilters(this.testSuites);
      executionResult.totalSuites = filteredSuites.length;
      
      if (this.parallelExecution && options.parallel !== false) {
        // 並行執行
        Logger.log('使用並行執行模式');
        await this.runSuitesInParallel(filteredSuites, executionResult);
      } else {
        // 順序執行
        Logger.log('使用順序執行模式');
        await this.runSuitesSequentially(filteredSuites, executionResult);
      }
      
      // 計算總計
      executionResult.suiteResults.forEach(suiteResult => {
        executionResult.totalTests += suiteResult.totalTests;
        executionResult.passedTests += suiteResult.passedTests;
        executionResult.failedTests += suiteResult.failedTests;
        executionResult.skippedTests += suiteResult.skippedTests;
      });
      
      executionResult.endTime = new Date();
      executionResult.duration = executionResult.endTime - executionResult.startTime;
      
      // 生成摘要
      executionResult.summary = this.generateSummary(executionResult);
      
      // 生成報告
      for (const generator of this.reportGenerators) {
        try {
          const report = await generator(executionResult);
          executionResult.reports.push(report);
        } catch (error) {
          Logger.log(`報告生成失敗: ${error.message}`);
        }
      }
      
      perfSession.end(true, `測試完成: ${executionResult.passedTests}/${executionResult.totalTests} 通過`);
      
      return executionResult;
      
    } catch (error) {
      perfSession.end(false, error.message);
      
      ErrorHandler.handle('AutomatedTestSuite.runAllTests', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
      
      executionResult.endTime = new Date();
      executionResult.duration = executionResult.endTime - executionResult.startTime;
      executionResult.error = error.message;
      
      return executionResult;
    }
  }
  
  /**
   * 並行執行測試套件
   */
  async runSuitesInParallel(suites, executionResult) {
    const promises = suites.map(suite => 
      this.runSingleSuite(suite).catch(error => ({
        suiteName: suite.suiteName,
        error: error.message,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        testResults: []
      }))
    );
    
    const results = await Promise.all(promises);
    executionResult.suiteResults.push(...results);
    executionResult.completedSuites = results.length;
  }
  
  /**
   * 順序執行測試套件
   */
  async runSuitesSequentially(suites, executionResult) {
    for (const suite of suites) {
      try {
        const suiteResult = await this.runSingleSuite(suite);
        executionResult.suiteResults.push(suiteResult);
        executionResult.completedSuites++;
        
        // 如果設置為失敗時停止
        if (!this.continueOnFailure && suiteResult.failedTests > 0) {
          Logger.log(`測試套件 ${suite.suiteName} 失敗，停止執行`);
          break;
        }
        
      } catch (error) {
        const errorResult = {
          suiteName: suite.suiteName,
          error: error.message,
          totalTests: 0,
          passedTests: 0,
          failedTests: 1,
          skippedTests: 0,
          testResults: []
        };
        
        executionResult.suiteResults.push(errorResult);
        
        if (!this.continueOnFailure) {
          break;
        }
      }
    }
  }
  
  /**
   * 執行單一測試套件
   */
  async runSingleSuite(suite) {
    Logger.log(`執行測試套件: ${suite.suiteName}`);
    
    try {
      const result = await suite.run();
      Logger.log(`測試套件 ${suite.suiteName} 完成: ${result.passedTests}/${result.totalTests} 通過`);
      return result;
    } catch (error) {
      Logger.log(`測試套件 ${suite.suiteName} 執行失敗: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 應用測試過濾器
   */
  applyFilters(suites) {
    if (this.testFilters.length === 0) {
      return suites;
    }
    
    return suites.filter(suite => {
      return this.testFilters.some(filter => {
        if (typeof filter === 'string') {
          return suite.suiteName.includes(filter);
        } else if (typeof filter === 'function') {
          return filter(suite);
        }
        return false;
      });
    });
  }
  
  /**
   * 生成測試摘要
   */
  generateSummary(executionResult) {
    const successRate = executionResult.totalTests > 0 
      ? (executionResult.passedTests / executionResult.totalTests * 100).toFixed(2)
      : 0;
    
    const avgDuration = executionResult.completedSuites > 0
      ? (executionResult.duration / executionResult.completedSuites).toFixed(2)
      : 0;
    
    return {
      successRate: `${successRate}%`,
      averageSuiteDuration: `${avgDuration}ms`,
      totalDuration: `${executionResult.duration}ms`,
      status: executionResult.failedTests === 0 ? 'PASSED' : 'FAILED',
      categories: this.getSummaryByCategory(executionResult),
      recommendations: this.generateRecommendations(executionResult)
    };
  }
  
  /**
   * 按類別統計測試結果
   */
  getSummaryByCategory(executionResult) {
    const categories = {};
    
    executionResult.suiteResults.forEach(suiteResult => {
      suiteResult.testResults.forEach(testResult => {
        const category = testResult.category || 'general';
        if (!categories[category]) {
          categories[category] = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0
          };
        }
        
        categories[category].total++;
        if (testResult.status === 'passed') categories[category].passed++;
        else if (testResult.status === 'failed') categories[category].failed++;
        else if (testResult.status === 'skipped') categories[category].skipped++;
      });
    });
    
    return categories;
  }
  
  /**
   * 生成改進建議
   */
  generateRecommendations(executionResult) {
    const recommendations = [];
    
    if (executionResult.failedTests > 0) {
      recommendations.push('有測試失敗，請檢查失敗原因並修復');
    }
    
    if (executionResult.duration > 180000) { // 3分鐘
      recommendations.push('測試執行時間較長，考慮優化測試效率或啟用並行執行');
    }
    
    const successRate = (executionResult.passedTests / executionResult.totalTests) * 100;
    if (successRate < 90) {
      recommendations.push('測試通過率低於90%，建議改善代碼品質');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('所有測試通過，系統狀態良好');
    }
    
    return recommendations;
  }
  
  /**
   * 載入現有測試套件
   */
  loadExistingTestSuites() {
    Logger.log('[AutomatedTestSuite] 載入現有測試套件');
    
    // 載入綜合系統測試
    this.loadComprehensiveSystemTest();
    
    // 載入核心系統測試
    this.loadCoreSystemTest();
    
    // 載入快速系統測試
    this.loadQuickSystemTest();
    
    // 載入模組驗證測試
    this.loadModularValidationTest();
    
    // 載入專項測試
    this.loadSpecializedTests();
    
    Logger.log(`[AutomatedTestSuite] 已載入 ${this.testSuites.length} 個測試套件`);
  }
  
  /**
   * 載入綜合系統測試
   */
  loadComprehensiveSystemTest() {
    const suite = new TestSuite('綜合系統測試', '完整的系統功能驗證');
    
    suite.addTest('執行綜合系統測試', async () => {
      if (typeof runComprehensiveSystemTest === 'function') {
        const result = runComprehensiveSystemTest();
        if (!result.success) {
          throw new Error('綜合系統測試失敗');
        }
      } else {
        throw new Error('runComprehensiveSystemTest 函數不存在');
      }
    }, 'system');
    
    this.registerSuite(suite);
  }
  
  /**
   * 載入核心系統測試
   */
  loadCoreSystemTest() {
    const suite = new TestSuite('核心系統測試', '核心功能完整性驗證');
    
    suite.addTest('執行核心系統測試', async () => {
      if (typeof runCoreSystemTest === 'function') {
        const result = runCoreSystemTest();
        if (!result.success) {
          throw new Error('核心系統測試失敗');
        }
      } else {
        throw new Error('runCoreSystemTest 函數不存在');
      }
    }, 'core');
    
    this.registerSuite(suite);
  }
  
  /**
   * 載入快速系統測試
   */
  loadQuickSystemTest() {
    const suite = new TestSuite('快速系統測試', '基本功能快速驗證');
    
    suite.addTest('執行快速系統測試', async () => {
      if (typeof runQuickSystemTest === 'function') {
        const result = runQuickSystemTest();
        if (!result.success) {
          throw new Error('快速系統測試失敗');
        }
      } else {
        throw new Error('runQuickSystemTest 函數不存在');
      }
    }, 'quick');
    
    this.registerSuite(suite);
  }
  
  /**
   * 載入模組驗證測試
   */
  loadModularValidationTest() {
    const suite = new TestSuite('模組驗證測試', '模組化架構驗證');
    
    suite.addTest('執行模組驗證測試', async () => {
      if (typeof runQuickModularValidation === 'function') {
        const result = runQuickModularValidation();
        if (!result.success) {
          throw new Error('模組驗證測試失敗');
        }
      } else {
        throw new Error('runQuickModularValidation 函數不存在');
      }
    }, 'modular');
    
    this.registerSuite(suite);
  }
  
  /**
   * 載入專項測試
   */
  loadSpecializedTests() {
    // T01 問題測試
    const t01Suite = new TestSuite('T01問題測試', 'T01學生相關問題驗證');
    t01Suite.addTest('T01學生檢測', async () => {
      if (typeof detectT01Students === 'function') {
        detectT01Students();
      }
    }, 't01');
    this.registerSuite(t01Suite);
    
    // 備份恢復測試
    const backupSuite = new TestSuite('備份恢復測試', '備份與恢復功能驗證');
    backupSuite.addTest('備份功能測試', async () => {
      if (typeof testBackupRestore === 'function') {
        testBackupRestore();
      }
    }, 'backup');
    this.registerSuite(backupSuite);
  }
}

/**
 * 全域自動化測試套件實例
 */
const globalAutomatedTestSuite = new AutomatedTestSuite();

/**
 * 執行完整自動化測試
 * 對外提供的主要介面
 */
async function runAutomatedTests(options = {}) {
  try {
    // 載入所有測試套件
    globalAutomatedTestSuite.loadExistingTestSuites();
    
    // 設定選項
    if (options.filters) {
      globalAutomatedTestSuite.setFilters(options.filters);
    }
    
    if (options.parallel !== undefined) {
      globalAutomatedTestSuite.parallelExecution = options.parallel;
    }
    
    if (options.continueOnFailure !== undefined) {
      globalAutomatedTestSuite.continueOnFailure = options.continueOnFailure;
    }
    
    // 執行測試
    const result = await globalAutomatedTestSuite.runAllTests(options);
    
    // 輸出結果
    Logger.log('\n🎯 自動化測試執行完成');
    Logger.log('═'.repeat(50));
    Logger.log(`總測試數: ${result.totalTests}`);
    Logger.log(`通過: ${result.passedTests}`);
    Logger.log(`失敗: ${result.failedTests}`);
    Logger.log(`跳過: ${result.skippedTests}`);
    Logger.log(`成功率: ${result.summary.successRate}`);
    Logger.log(`執行時間: ${result.summary.totalDuration}`);
    Logger.log(`狀態: ${result.summary.status}`);
    
    if (result.summary.recommendations.length > 0) {
      Logger.log('\n💡 改進建議:');
      result.summary.recommendations.forEach((rec, index) => {
        Logger.log(`${index + 1}. ${rec}`);
      });
    }
    
    return result;
    
  } catch (error) {
    ErrorHandler.handle('runAutomatedTests', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    throw error;
  }
}

/**
 * 快速測試執行（僅執行關鍵測試）
 */
async function runQuickAutomatedTests() {
  return await runAutomatedTests({
    filters: ['快速系統測試', '模組驗證測試'],
    parallel: true,
    continueOnFailure: true
  });
}

/**
 * 完整測試執行（所有測試）
 */
async function runFullAutomatedTests() {
  return await runAutomatedTests({
    parallel: false,
    continueOnFailure: false
  });
}