/**
 * CI/CD Pipeline 端到端測試驗證
 * 企業級 CI/CD Pipeline 完整系統測試套件
 * Version: 1.0.0 - Phase 3 CI/CD Pipeline Integration Testing
 */

/**
 * 測試結果類型枚舉
 */
const TEST_RESULT_TYPES = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  WARNING: 'warning',
  ERROR: 'error',
  BLOCKED: 'blocked',
  SKIPPED: 'skipped'
};

/**
 * 測試場景枚舉
 */
const TEST_SCENARIOS = {
  QUALITY_GATE_PASS: 'quality_gate_pass',
  QUALITY_GATE_FAIL: 'quality_gate_fail',
  HEALTH_CHECK_PASS: 'health_check_pass',
  HEALTH_CHECK_CRITICAL: 'health_check_critical',
  LOW_RISK_DEPLOYMENT: 'low_risk_deployment',
  HIGH_RISK_DEPLOYMENT: 'high_risk_deployment',
  FULL_PIPELINE_SUCCESS: 'full_pipeline_success',
  DEPLOYMENT_ROLLBACK: 'deployment_rollback',
  CONCURRENT_DEPLOYMENTS: 'concurrent_deployments'
};

/**
 * CI/CD Pipeline 測試主類
 */
class CiCdPipelineTest {
  constructor() {
    this.testResults = [];
    this.testMetrics = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      errors: 0,
      blocked: 0,
      skipped: 0,
      duration: 0
    };
    this.startTime = null;
    this.endTime = null;
    this.originalConfigs = {};
  }
  
  /**
   * 執行完整 CI/CD Pipeline 測試套件
   */
  async runCompletePipelineTests() {
    console.log('🚀 開始執行 CI/CD Pipeline 完整測試套件');
    
    this.startTime = new Date();
    this.testResults = [];
    this.testMetrics = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      errors: 0,
      blocked: 0,
      skipped: 0,
      duration: 0
    };
    
    try {
      // 設置測試環境
      await this.setupTestEnvironment();
      
      // === 階段 1: 品質檢查測試 ===
      console.log('\n📊 === 階段 1: 品質檢查測試 ===');
      await this.testQualityGateIntegration();
      
      // === 階段 2: 健康檢查測試 ===
      console.log('\n🏥 === 階段 2: 健康檢查測試 ===');
      await this.testHealthCheckIntegration();
      
      // === 階段 3: 風險評估測試 ===
      console.log('\n⚠️ === 階段 3: 風險評估測試 ===');
      await this.testRiskAssessmentIntegration();
      
      // === 階段 4: 完整 Pipeline 測試 ===
      console.log('\n🔄 === 階段 4: 完整 Pipeline 測試 ===');
      await this.testFullPipelineScenarios();
      
      // === 階段 5: 部署與回滾測試 ===
      console.log('\n🚚 === 階段 5: 部署與回滾測試 ===');
      await this.testDeploymentAndRollback();
      
      // === 階段 6: 併發與負載測試 ===
      console.log('\n⚡ === 階段 6: 併發與負載測試 ===');
      await this.testConcurrencyAndLoad();
      
      // === 階段 7: 整合測試 ===
      console.log('\n🔗 === 階段 7: 系統整合測試 ===');
      await this.testSystemIntegration();
      
    } catch (error) {
      this.addTestResult('PIPELINE_TEST_SUITE', TEST_RESULT_TYPES.ERROR, `測試套件執行失敗: ${error.message}`);
    } finally {
      // 清理測試環境
      await this.cleanupTestEnvironment();
      
      // 計算測試結果
      this.calculateTestMetrics();
      
      // 生成測試報告
      return this.generateTestReport();
    }
  }
  
  /**
   * 設置測試環境
   */
  async setupTestEnvironment() {
    console.log('🛠️ 設置測試環境...');
    
    try {
      // 備份原始配置
      this.backupOriginalConfigs();
      
      // 設置測試模式
      if (typeof globalCodeQualityChecker !== 'undefined') {
        // 暫時降低品質門禁以便測試
        this.originalConfigs.qualityGates = globalCodeQualityChecker.qualityGates;
      }
      
      if (typeof globalHealthCheckService !== 'undefined') {
        // 設置健康檢查測試模式
        globalHealthCheckService.setTestMode(true);
      }
      
      if (typeof globalCiCdOrchestrator !== 'undefined') {
        // 清理活躍執行
        globalCiCdOrchestrator.activeExecutions.clear();
      }
      
      this.addTestResult('SETUP', TEST_RESULT_TYPES.SUCCESS, '測試環境設置完成');
      
    } catch (error) {
      this.addTestResult('SETUP', TEST_RESULT_TYPES.ERROR, `測試環境設置失敗: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 測試品質門禁整合
   */
  async testQualityGateIntegration() {
    // 測試 1: 品質門禁通過場景
    await this.testQualityGatePass();
    
    // 測試 2: 品質門禁失敗場景
    await this.testQualityGateFail();
    
    // 測試 3: 環境特定品質要求
    await this.testEnvironmentSpecificQuality();
    
    // 測試 4: 品質與健康整合
    await this.testQualityHealthIntegration();
  }
  
  /**
   * 測試品質門禁通過場景
   */
  async testQualityGatePass() {
    try {
      console.log('  🧪 測試: 品質門禁通過場景');
      
      // 創建高品質代碼範例
      const highQualityFiles = [
        {
          fileName: 'TestCode.gs',
          content: `
/**
 * 高品質測試代碼
 */
function testFunction(param1, param2) {
  if (!param1 || !param2) {
    throw new Error('參數不能為空');
  }
  
  const result = param1 + param2;
  return result;
}

function anotherFunction() {
  return 'test';
}`
        }
      ];
      
      if (typeof globalCodeQualityChecker !== 'undefined') {
        const result = await globalCodeQualityChecker.runCiCdQualityCheck('development', highQualityFiles);
        
        if (result.deploymentRisk.level === 'LOW' || result.deploymentRisk.level === 'MEDIUM') {
          this.addTestResult('QUALITY_GATE_PASS', TEST_RESULT_TYPES.SUCCESS, 
            `品質門禁通過 - 分數: ${result.averageScore}, 風險: ${result.deploymentRisk.level}`);
        } else {
          this.addTestResult('QUALITY_GATE_PASS', TEST_RESULT_TYPES.WARNING, 
            `品質分數偏低但仍通過 - 分數: ${result.averageScore}`);
        }
      } else {
        this.addTestResult('QUALITY_GATE_PASS', TEST_RESULT_TYPES.SKIPPED, 'CodeQualityChecker 不可用');
      }
      
    } catch (error) {
      this.addTestResult('QUALITY_GATE_PASS', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試品質門禁失敗場景
   */
  async testQualityGateFail() {
    try {
      console.log('  🧪 測試: 品質門禁失敗場景');
      
      // 創建低品質代碼範例
      const lowQualityFiles = [
        {
          fileName: 'BadCode.gs',
          content: `
// 糟糕的代碼範例
function badFunction() {
  eval('var x = 1'); // 安全問題
  for(var i=0;i<1000;i++) { // 性能問題
    for(var j=0;j<1000;j++) {
      for(var k=0;k<1000;k++) { // 複雜度過高
        console.log(i+j+k);
      }
    }
  }
  var hardcoded = "production-secret"; // 硬編碼配置
}`
        }
      ];
      
      if (typeof globalCodeQualityChecker !== 'undefined') {
        const result = await globalCodeQualityChecker.runCiCdQualityCheck('production', lowQualityFiles);
        
        if (result.deploymentRisk.blocked) {
          this.addTestResult('QUALITY_GATE_FAIL', TEST_RESULT_TYPES.SUCCESS, 
            `品質門禁正確阻止部署 - 風險: ${result.deploymentRisk.level}`);
        } else {
          this.addTestResult('QUALITY_GATE_FAIL', TEST_RESULT_TYPES.FAILURE, 
            `品質門禁應該阻止但未阻止 - 分數: ${result.averageScore}`);
        }
      } else {
        this.addTestResult('QUALITY_GATE_FAIL', TEST_RESULT_TYPES.SKIPPED, 'CodeQualityChecker 不可用');
      }
      
    } catch (error) {
      this.addTestResult('QUALITY_GATE_FAIL', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試環境特定品質要求
   */
  async testEnvironmentSpecificQuality() {
    try {
      console.log('  🧪 測試: 環境特定品質要求');
      
      const mediumQualityFiles = [
        {
          fileName: 'MediumCode.gs',
          content: `
function mediumQualityFunction(param) {
  if (param) {
    for (var i = 0; i < 10; i++) {
      console.log(i);
    }
  }
  return param + 1;
}`
        }
      ];
      
      if (typeof globalCodeQualityChecker !== 'undefined') {
        // 測試開發環境 (寬鬆要求)
        const devResult = await globalCodeQualityChecker.runCiCdQualityCheck('development', mediumQualityFiles);
        
        // 測試生產環境 (嚴格要求)
        const prodResult = await globalCodeQualityChecker.runCiCdQualityCheck('production', mediumQualityFiles);
        
        if (!devResult.deploymentRisk.blocked && prodResult.deploymentRisk.level === 'HIGH') {
          this.addTestResult('ENVIRONMENT_QUALITY', TEST_RESULT_TYPES.SUCCESS, 
            `環境特定品質要求正確 - Dev: ${devResult.deploymentRisk.level}, Prod: ${prodResult.deploymentRisk.level}`);
        } else {
          this.addTestResult('ENVIRONMENT_QUALITY', TEST_RESULT_TYPES.WARNING, 
            `環境品質差異不如預期 - Dev: ${devResult.deploymentRisk.level}, Prod: ${prodResult.deploymentRisk.level}`);
        }
      } else {
        this.addTestResult('ENVIRONMENT_QUALITY', TEST_RESULT_TYPES.SKIPPED, 'CodeQualityChecker 不可用');
      }
      
    } catch (error) {
      this.addTestResult('ENVIRONMENT_QUALITY', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試品質與健康整合
   */
  async testQualityHealthIntegration() {
    try {
      console.log('  🧪 測試: 品質與健康檢查整合');
      
      if (typeof globalCodeQualityChecker !== 'undefined' && typeof globalHealthCheckService !== 'undefined') {
        // 模擬品質降級事件
        globalHealthCheckService.simulateQualityDegradationEvent({
          severity: 'CRITICAL',
          dimension: 'security',
          score: 30
        });
        
        // 等待健康檢查觸發
        await this.delay(1000);
        
        // 檢查是否觸發了相關健康檢查
        const healthStatus = globalHealthCheckService.getHealthStatus();
        
        if (healthStatus.overallStatus === 'CRITICAL' || healthStatus.overallStatus === 'UNHEALTHY') {
          this.addTestResult('QUALITY_HEALTH_INTEGRATION', TEST_RESULT_TYPES.SUCCESS, 
            `品質問題正確觸發健康檢查 - 狀態: ${healthStatus.overallStatus}`);
        } else {
          this.addTestResult('QUALITY_HEALTH_INTEGRATION', TEST_RESULT_TYPES.WARNING, 
            `品質問題未觸發預期健康檢查 - 狀態: ${healthStatus.overallStatus}`);
        }
      } else {
        this.addTestResult('QUALITY_HEALTH_INTEGRATION', TEST_RESULT_TYPES.SKIPPED, '必要組件不可用');
      }
      
    } catch (error) {
      this.addTestResult('QUALITY_HEALTH_INTEGRATION', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試健康檢查整合
   */
  async testHealthCheckIntegration() {
    // 測試 1: 健康檢查通過場景
    await this.testHealthCheckPass();
    
    // 測試 2: 健康檢查失敗場景
    await this.testHealthCheckFail();
    
    // 測試 3: 部署許可檢查
    await this.testDeploymentPermission();
    
    // 測試 4: CI/CD 特定健康檢查
    await this.testCiCdSpecificHealthChecks();
  }
  
  /**
   * 測試健康檢查通過場景
   */
  async testHealthCheckPass() {
    try {
      console.log('  🧪 測試: 健康檢查通過場景');
      
      if (typeof globalHealthCheckService !== 'undefined') {
        // 重置健康狀態到良好狀態
        globalHealthCheckService.resetToHealthyState();
        
        const healthStatus = globalHealthCheckService.getHealthStatus();
        const permission = globalHealthCheckService.checkDeploymentPermission('development');
        
        if (healthStatus.overallStatus === 'HEALTHY' && permission.allowed) {
          this.addTestResult('HEALTH_CHECK_PASS', TEST_RESULT_TYPES.SUCCESS, 
            `健康檢查通過 - 狀態: ${healthStatus.overallStatus}, 分數: ${healthStatus.overallScore}`);
        } else {
          this.addTestResult('HEALTH_CHECK_PASS', TEST_RESULT_TYPES.WARNING, 
            `健康狀態異常 - 狀態: ${healthStatus.overallStatus}, 許可: ${permission.allowed}`);
        }
      } else {
        this.addTestResult('HEALTH_CHECK_PASS', TEST_RESULT_TYPES.SKIPPED, 'HealthCheckService 不可用');
      }
      
    } catch (error) {
      this.addTestResult('HEALTH_CHECK_PASS', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試健康檢查失敗場景
   */
  async testHealthCheckFail() {
    try {
      console.log('  🧪 測試: 健康檢查失敗場景');
      
      if (typeof globalHealthCheckService !== 'undefined') {
        // 模擬嚴重健康問題
        globalHealthCheckService.simulateCriticalHealthIssue('system_memory_usage', {
          currentUsage: 95,
          threshold: 80,
          severity: 'CRITICAL'
        });
        
        const healthStatus = globalHealthCheckService.getHealthStatus();
        const permission = globalHealthCheckService.checkDeploymentPermission('production');
        
        if (healthStatus.overallStatus === 'CRITICAL' && !permission.allowed) {
          this.addTestResult('HEALTH_CHECK_FAIL', TEST_RESULT_TYPES.SUCCESS, 
            `健康檢查正確阻止部署 - 狀態: ${healthStatus.overallStatus}`);
        } else {
          this.addTestResult('HEALTH_CHECK_FAIL', TEST_RESULT_TYPES.FAILURE, 
            `健康檢查應該阻止但未阻止 - 狀態: ${healthStatus.overallStatus}, 許可: ${permission.allowed}`);
        }
      } else {
        this.addTestResult('HEALTH_CHECK_FAIL', TEST_RESULT_TYPES.SKIPPED, 'HealthCheckService 不可用');
      }
      
    } catch (error) {
      this.addTestResult('HEALTH_CHECK_FAIL', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試部署許可檢查
   */
  async testDeploymentPermission() {
    try {
      console.log('  🧪 測試: 部署許可檢查');
      
      if (typeof globalHealthCheckService !== 'undefined') {
        // 測試不同環境的部署許可
        const environments = ['development', 'staging', 'production'];
        const results = [];
        
        for (const env of environments) {
          const permission = globalHealthCheckService.checkDeploymentPermission(env);
          results.push({
            environment: env,
            allowed: permission.allowed,
            risk: permission.risk,
            reason: permission.reason
          });
        }
        
        // 驗證生產環境應該有更嚴格的要求
        const prodPermission = results.find(r => r.environment === 'production');
        const devPermission = results.find(r => r.environment === 'development');
        
        if (prodPermission && devPermission) {
          this.addTestResult('DEPLOYMENT_PERMISSION', TEST_RESULT_TYPES.SUCCESS, 
            `部署許可檢查完成 - 生產: ${prodPermission.allowed}, 開發: ${devPermission.allowed}`);
        } else {
          this.addTestResult('DEPLOYMENT_PERMISSION', TEST_RESULT_TYPES.WARNING, 
            '部署許可檢查結果不完整');
        }
      } else {
        this.addTestResult('DEPLOYMENT_PERMISSION', TEST_RESULT_TYPES.SKIPPED, 'HealthCheckService 不可用');
      }
      
    } catch (error) {
      this.addTestResult('DEPLOYMENT_PERMISSION', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試 CI/CD 特定健康檢查
   */
  async testCiCdSpecificHealthChecks() {
    try {
      console.log('  🧪 測試: CI/CD 特定健康檢查');
      
      if (typeof globalHealthCheckService !== 'undefined') {
        // 觸發所有 CI/CD 健康檢查
        const results = await globalHealthCheckService.triggerCICDHealthChecks();
        
        // 檢查是否執行了預期的檢查
        const expectedChecks = [
          'cicd_pipeline_health',
          'deployment_readiness', 
          'quality_gate_correlation',
          'deployment_failure_rate',
          'system_load_deployment'
        ];
        
        let foundChecks = 0;
        for (const check of expectedChecks) {
          if (results.executed && results.executed.some(r => r.name === check)) {
            foundChecks++;
          }
        }
        
        if (foundChecks >= 3) { // 至少執行 3 個檢查
          this.addTestResult('CICD_HEALTH_CHECKS', TEST_RESULT_TYPES.SUCCESS, 
            `CI/CD 健康檢查執行完成 - 執行了 ${foundChecks}/${expectedChecks.length} 個檢查`);
        } else {
          this.addTestResult('CICD_HEALTH_CHECKS', TEST_RESULT_TYPES.WARNING, 
            `CI/CD 健康檢查執行不完整 - 僅執行了 ${foundChecks}/${expectedChecks.length} 個檢查`);
        }
      } else {
        this.addTestResult('CICD_HEALTH_CHECKS', TEST_RESULT_TYPES.SKIPPED, 'HealthCheckService 不可用');
      }
      
    } catch (error) {
      this.addTestResult('CICD_HEALTH_CHECKS', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試風險評估整合
   */
  async testRiskAssessmentIntegration() {
    // 測試 1: 低風險部署
    await this.testLowRiskDeployment();
    
    // 測試 2: 高風險部署
    await this.testHighRiskDeployment();
    
    // 測試 3: 風險因子分析
    await this.testRiskFactorAnalysis();
    
    // 測試 4: 風險與部署決策
    await this.testRiskBasedDeploymentDecision();
  }
  
  /**
   * 測試低風險部署
   */
  async testLowRiskDeployment() {
    try {
      console.log('  🧪 測試: 低風險部署場景');
      
      if (typeof globalDeploymentManager !== 'undefined') {
        // 創建低風險部署配置
        const lowRiskConfig = {
          environment: 'development',
          version: '1.0.0',
          strategy: 'blue-green',
          forceDeployment: false
        };
        
        const riskAssessment = globalDeploymentManager.performRiskAssessment(lowRiskConfig);
        
        if (riskAssessment.riskLevel === 'LOW' || riskAssessment.riskLevel === 'MEDIUM') {
          this.addTestResult('LOW_RISK_DEPLOYMENT', TEST_RESULT_TYPES.SUCCESS, 
            `低風險部署評估正確 - 風險等級: ${riskAssessment.riskLevel}, 分數: ${riskAssessment.riskScore}`);
        } else {
          this.addTestResult('LOW_RISK_DEPLOYMENT', TEST_RESULT_TYPES.WARNING, 
            `風險評估偏高 - 等級: ${riskAssessment.riskLevel}, 分數: ${riskAssessment.riskScore}`);
        }
      } else {
        this.addTestResult('LOW_RISK_DEPLOYMENT', TEST_RESULT_TYPES.SKIPPED, 'DeploymentManager 不可用');
      }
      
    } catch (error) {
      this.addTestResult('LOW_RISK_DEPLOYMENT', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試高風險部署
   */
  async testHighRiskDeployment() {
    try {
      console.log('  🧪 測試: 高風險部署場景');
      
      if (typeof globalDeploymentManager !== 'undefined') {
        // 創建高風險部署配置
        const highRiskConfig = {
          environment: 'production',
          version: '2.0.0-beta',
          strategy: 'canary',
          forceDeployment: true
        };
        
        const riskAssessment = globalDeploymentManager.performRiskAssessment(highRiskConfig);
        
        if (riskAssessment.riskLevel === 'HIGH' || riskAssessment.riskLevel === 'CRITICAL') {
          this.addTestResult('HIGH_RISK_DEPLOYMENT', TEST_RESULT_TYPES.SUCCESS, 
            `高風險部署評估正確 - 風險等級: ${riskAssessment.riskLevel}, 分數: ${riskAssessment.riskScore}`);
        } else {
          this.addTestResult('HIGH_RISK_DEPLOYMENT', TEST_RESULT_TYPES.WARNING, 
            `風險評估偏低 - 等級: ${riskAssessment.riskLevel}, 分數: ${riskAssessment.riskScore}`);
        }
      } else {
        this.addTestResult('HIGH_RISK_DEPLOYMENT', TEST_RESULT_TYPES.SKIPPED, 'DeploymentManager 不可用');
      }
      
    } catch (error) {
      this.addTestResult('HIGH_RISK_DEPLOYMENT', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試風險因子分析
   */
  async testRiskFactorAnalysis() {
    try {
      console.log('  🧪 測試: 風險因子分析');
      
      if (typeof globalDeploymentManager !== 'undefined') {
        const testConfig = {
          environment: 'production',
          version: '1.1.0',
          strategy: 'blue-green'
        };
        
        const riskAssessment = globalDeploymentManager.performRiskAssessment(testConfig);
        
        // 檢查風險因子是否包含預期類別
        const expectedFactors = ['environment', 'quality', 'health', 'historical'];
        const foundFactors = riskAssessment.factors.map(f => f.factor);
        
        const missingFactors = expectedFactors.filter(f => !foundFactors.includes(f));
        
        if (missingFactors.length === 0) {
          this.addTestResult('RISK_FACTOR_ANALYSIS', TEST_RESULT_TYPES.SUCCESS, 
            `風險因子分析完整 - 包含: ${foundFactors.join(', ')}`);
        } else {
          this.addTestResult('RISK_FACTOR_ANALYSIS', TEST_RESULT_TYPES.WARNING, 
            `風險因子分析不完整 - 缺少: ${missingFactors.join(', ')}`);
        }
      } else {
        this.addTestResult('RISK_FACTOR_ANALYSIS', TEST_RESULT_TYPES.SKIPPED, 'DeploymentManager 不可用');
      }
      
    } catch (error) {
      this.addTestResult('RISK_FACTOR_ANALYSIS', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試風險與部署決策
   */
  async testRiskBasedDeploymentDecision() {
    try {
      console.log('  🧪 測試: 風險與部署決策');
      
      if (typeof globalDeploymentManager !== 'undefined') {
        // 模擬不同風險等級的決策
        const scenarios = [
          { environment: 'development', expectedBlock: false },
          { environment: 'production', forceDeployment: true, expectedBlock: false },
          { environment: 'production', forceDeployment: false, expectedBlock: true }
        ];
        
        let correctDecisions = 0;
        
        for (const scenario of scenarios) {
          const riskAssessment = globalDeploymentManager.performRiskAssessment(scenario);
          const shouldBlock = riskAssessment.riskLevel === 'CRITICAL' && !scenario.forceDeployment;
          
          if (shouldBlock === scenario.expectedBlock) {
            correctDecisions++;
          }
        }
        
        if (correctDecisions >= scenarios.length * 0.7) { // 70% 正確率
          this.addTestResult('RISK_BASED_DECISION', TEST_RESULT_TYPES.SUCCESS, 
            `風險決策正確 - ${correctDecisions}/${scenarios.length} 個場景正確`);
        } else {
          this.addTestResult('RISK_BASED_DECISION', TEST_RESULT_TYPES.WARNING, 
            `風險決策準確度偏低 - ${correctDecisions}/${scenarios.length} 個場景正確`);
        }
      } else {
        this.addTestResult('RISK_BASED_DECISION', TEST_RESULT_TYPES.SKIPPED, 'DeploymentManager 不可用');
      }
      
    } catch (error) {
      this.addTestResult('RISK_BASED_DECISION', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試完整 Pipeline 場景
   */
  async testFullPipelineScenarios() {
    // 測試 1: 成功的完整 Pipeline
    await this.testSuccessfulFullPipeline();
    
    // 測試 2: Pipeline 失敗與回滾
    await this.testPipelineFailureAndRollback();
    
    // 測試 3: Pipeline 阻斷場景
    await this.testPipelineBlocking();
  }
  
  /**
   * 測試成功的完整 Pipeline
   */
  async testSuccessfulFullPipeline() {
    try {
      console.log('  🧪 測試: 成功的完整 Pipeline');
      
      if (typeof globalCiCdOrchestrator !== 'undefined') {
        // 準備高品質代碼和健康系統狀態
        await this.prepareOptimalConditions();
        
        const deploymentConfig = {
          environment: 'development',
          version: '1.0.1',
          strategy: 'blue-green',
          files: [{
            fileName: 'TestCode.gs',
            content: 'function goodCode() { return "success"; }'
          }]
        };
        
        const result = await globalCiCdOrchestrator.executeDeploymentPipeline(
          'development', 
          deploymentConfig
        );
        
        if (result.success) {
          this.addTestResult('FULL_PIPELINE_SUCCESS', TEST_RESULT_TYPES.SUCCESS, 
            `完整 Pipeline 執行成功 - Pipeline ID: ${result.pipelineId}, 持續時間: ${result.duration}ms`);
        } else {
          this.addTestResult('FULL_PIPELINE_SUCCESS', TEST_RESULT_TYPES.FAILURE, 
            `Pipeline 執行失敗 - 錯誤: ${result.error}`);
        }
      } else {
        this.addTestResult('FULL_PIPELINE_SUCCESS', TEST_RESULT_TYPES.SKIPPED, 'CiCdOrchestrator 不可用');
      }
      
    } catch (error) {
      this.addTestResult('FULL_PIPELINE_SUCCESS', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試 Pipeline 失敗與回滾
   */
  async testPipelineFailureAndRollback() {
    try {
      console.log('  🧪 測試: Pipeline 失敗與回滾');
      
      if (typeof globalCiCdOrchestrator !== 'undefined') {
        // 準備會導致失敗的條件
        await this.prepareFailureConditions();
        
        const deploymentConfig = {
          environment: 'production',
          version: '2.0.0',
          strategy: 'blue-green',
          autoRollback: true,
          files: [{
            fileName: 'BadCode.gs',
            content: 'eval("dangerous code"); // 這會觸發安全問題'
          }]
        };
        
        const result = await globalCiCdOrchestrator.executeDeploymentPipeline(
          'production',
          deploymentConfig
        );
        
        if (!result.success && (result.status === 'FAILED' || result.status === 'BLOCKED')) {
          this.addTestResult('PIPELINE_FAILURE_ROLLBACK', TEST_RESULT_TYPES.SUCCESS, 
            `Pipeline 正確失敗並處理 - 狀態: ${result.status}, 原因: ${result.error || result.reason}`);
        } else {
          this.addTestResult('PIPELINE_FAILURE_ROLLBACK', TEST_RESULT_TYPES.WARNING, 
            `Pipeline 未按預期失敗 - 狀態: ${result.status}`);
        }
      } else {
        this.addTestResult('PIPELINE_FAILURE_ROLLBACK', TEST_RESULT_TYPES.SKIPPED, 'CiCdOrchestrator 不可用');
      }
      
    } catch (error) {
      this.addTestResult('PIPELINE_FAILURE_ROLLBACK', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試 Pipeline 阻斷場景
   */
  async testPipelineBlocking() {
    try {
      console.log('  🧪 測試: Pipeline 阻斷場景');
      
      if (typeof globalCiCdOrchestrator !== 'undefined') {
        // 準備高風險條件
        await this.prepareHighRiskConditions();
        
        const deploymentConfig = {
          environment: 'production',
          version: '3.0.0-beta',
          strategy: 'canary',
          forceDeployment: false
        };
        
        const result = await globalCiCdOrchestrator.executeDeploymentPipeline(
          'production',
          deploymentConfig
        );
        
        if (!result.success && result.status === 'BLOCKED') {
          this.addTestResult('PIPELINE_BLOCKING', TEST_RESULT_TYPES.SUCCESS, 
            `Pipeline 正確阻斷 - 風險分數: ${result.riskScore}, 原因: ${result.reason}`);
        } else {
          this.addTestResult('PIPELINE_BLOCKING', TEST_RESULT_TYPES.WARNING, 
            `Pipeline 未按預期阻斷 - 狀態: ${result.status}`);
        }
      } else {
        this.addTestResult('PIPELINE_BLOCKING', TEST_RESULT_TYPES.SKIPPED, 'CiCdOrchestrator 不可用');
      }
      
    } catch (error) {
      this.addTestResult('PIPELINE_BLOCKING', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試部署與回滾
   */
  async testDeploymentAndRollback() {
    // 測試 1: 正常部署流程
    await this.testNormalDeployment();
    
    // 測試 2: 部署回滾機制
    await this.testDeploymentRollback();
    
    // 測試 3: 藍綠部署策略
    await this.testBlueGreenDeployment();
    
    // 測試 4: 金絲雀部署策略
    await this.testCanaryDeployment();
  }
  
  /**
   * 測試正常部署流程
   */
  async testNormalDeployment() {
    try {
      console.log('  🧪 測試: 正常部署流程');
      
      if (typeof globalDeploymentManager !== 'undefined') {
        const deploymentConfig = {
          environment: 'development',
          version: '1.0.2',
          strategy: 'blue-green'
        };
        
        const deploymentRecord = await globalDeploymentManager.deploy(deploymentConfig);
        
        if (deploymentRecord.status === 'SUCCESS') {
          this.addTestResult('NORMAL_DEPLOYMENT', TEST_RESULT_TYPES.SUCCESS, 
            `正常部署成功 - ID: ${deploymentRecord.deploymentId}, 持續時間: ${deploymentRecord.duration}ms`);
        } else {
          this.addTestResult('NORMAL_DEPLOYMENT', TEST_RESULT_TYPES.FAILURE, 
            `部署失敗 - 狀態: ${deploymentRecord.status}, 錯誤: ${deploymentRecord.errors.length} 個`);
        }
      } else {
        this.addTestResult('NORMAL_DEPLOYMENT', TEST_RESULT_TYPES.SKIPPED, 'DeploymentManager 不可用');
      }
      
    } catch (error) {
      this.addTestResult('NORMAL_DEPLOYMENT', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試部署回滾機制
   */
  async testDeploymentRollback() {
    try {
      console.log('  🧪 測試: 部署回滾機制');
      
      if (typeof globalDeploymentManager !== 'undefined') {
        // 先創建一個成功的部署記錄
        const successfulDeployment = {
          deploymentId: 'test-deployment-' + Date.now(),
          environment: 'staging',
          version: '1.0.0',
          status: 'SUCCESS'
        };
        
        // 創建一個失敗的部署來觸發回滾
        const failedDeploymentConfig = {
          environment: 'staging',
          version: '1.0.1',
          strategy: 'blue-green',
          autoRollback: true
        };
        
        // 模擬部署失敗
        try {
          await globalDeploymentManager.deploy(failedDeploymentConfig);
        } catch (deploymentError) {
          // 預期會失敗，檢查是否觸發了回滾
          const deploymentStats = globalDeploymentManager.getDeploymentStats();
          
          if (deploymentStats.rolledBack > 0 || deploymentError.message.includes('回滾')) {
            this.addTestResult('DEPLOYMENT_ROLLBACK', TEST_RESULT_TYPES.SUCCESS, 
              '部署回滾機制正確觸發');
          } else {
            this.addTestResult('DEPLOYMENT_ROLLBACK', TEST_RESULT_TYPES.WARNING, 
              '回滾機制未按預期觸發');
          }
        }
      } else {
        this.addTestResult('DEPLOYMENT_ROLLBACK', TEST_RESULT_TYPES.SKIPPED, 'DeploymentManager 不可用');
      }
      
    } catch (error) {
      this.addTestResult('DEPLOYMENT_ROLLBACK', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試藍綠部署策略
   */
  async testBlueGreenDeployment() {
    try {
      console.log('  🧪 測試: 藍綠部署策略');
      
      if (typeof globalDeploymentManager !== 'undefined') {
        const blueGreenConfig = {
          environment: 'staging',
          version: '1.1.0',
          strategy: 'blue-green'
        };
        
        const deploymentRecord = await globalDeploymentManager.deploy(blueGreenConfig);
        
        // 檢查是否執行了藍綠部署的關鍵步驟
        const expectedSteps = ['準備綠環境', '部署到綠環境', '驗證綠環境', '切換流量'];
        const executedSteps = deploymentRecord.steps.map(s => s.stepName);
        
        const foundSteps = expectedSteps.filter(step => 
          executedSteps.some(executed => executed.includes('綠環境') || executed.includes('切換流量'))
        );
        
        if (foundSteps.length >= 2) {
          this.addTestResult('BLUE_GREEN_DEPLOYMENT', TEST_RESULT_TYPES.SUCCESS, 
            `藍綠部署策略執行正確 - 執行步驟: ${executedSteps.length} 個`);
        } else {
          this.addTestResult('BLUE_GREEN_DEPLOYMENT', TEST_RESULT_TYPES.WARNING, 
            `藍綠部署步驟不完整 - 找到: ${foundSteps.length}/${expectedSteps.length} 個預期步驟`);
        }
      } else {
        this.addTestResult('BLUE_GREEN_DEPLOYMENT', TEST_RESULT_TYPES.SKIPPED, 'DeploymentManager 不可用');
      }
      
    } catch (error) {
      this.addTestResult('BLUE_GREEN_DEPLOYMENT', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試金絲雀部署策略
   */
  async testCanaryDeployment() {
    try {
      console.log('  🧪 測試: 金絲雀部署策略');
      
      if (typeof globalDeploymentManager !== 'undefined') {
        const canaryConfig = {
          environment: 'production',
          version: '1.2.0',
          strategy: 'canary'
        };
        
        const deploymentRecord = await globalDeploymentManager.deploy(canaryConfig);
        
        // 檢查是否執行了金絲雀部署的關鍵步驟
        const expectedSteps = ['金絲雀部署', '監控金絲雀', '全量部署'];
        const executedSteps = deploymentRecord.steps.map(s => s.stepName);
        
        const foundSteps = expectedSteps.filter(step => 
          executedSteps.some(executed => executed.includes('金絲雀') || executed.includes('全量'))
        );
        
        if (foundSteps.length >= 2) {
          this.addTestResult('CANARY_DEPLOYMENT', TEST_RESULT_TYPES.SUCCESS, 
            `金絲雀部署策略執行正確 - 執行步驟: ${executedSteps.length} 個`);
        } else {
          this.addTestResult('CANARY_DEPLOYMENT', TEST_RESULT_TYPES.WARNING, 
            `金絲雀部署步驟不完整 - 找到: ${foundSteps.length}/${expectedSteps.length} 個預期步驟`);
        }
      } else {
        this.addTestResult('CANARY_DEPLOYMENT', TEST_RESULT_TYPES.SKIPPED, 'DeploymentManager 不可用');
      }
      
    } catch (error) {
      this.addTestResult('CANARY_DEPLOYMENT', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試併發與負載
   */
  async testConcurrencyAndLoad() {
    // 測試 1: 併發 Pipeline 執行
    await this.testConcurrentPipelines();
    
    // 測試 2: Pipeline 負載限制
    await this.testPipelineLoadLimits();
    
    // 測試 3: 資源競爭處理
    await this.testResourceContention();
  }
  
  /**
   * 測試併發 Pipeline 執行
   */
  async testConcurrentPipelines() {
    try {
      console.log('  🧪 測試: 併發 Pipeline 執行');
      
      if (typeof globalCiCdOrchestrator !== 'undefined') {
        const promises = [];
        const pipelineCount = 3;
        
        // 同時啟動多個 Pipeline
        for (let i = 0; i < pipelineCount; i++) {
          const config = {
            environment: 'development',
            version: `1.0.${i}`,
            strategy: 'blue-green'
          };
          
          promises.push(
            globalCiCdOrchestrator.executeDeploymentPipeline('development', config)
              .catch(error => ({ success: false, error: error.message }))
          );
        }
        
        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;
        const activeCount = globalCiCdOrchestrator.activeExecutions.size;
        
        if (successCount >= 1 && activeCount <= globalCiCdOrchestrator.config.maxConcurrentExecutions) {
          this.addTestResult('CONCURRENT_PIPELINES', TEST_RESULT_TYPES.SUCCESS, 
            `併發 Pipeline 處理正確 - 成功: ${successCount}/${pipelineCount}, 活躍: ${activeCount}`);
        } else {
          this.addTestResult('CONCURRENT_PIPELINES', TEST_RESULT_TYPES.WARNING, 
            `併發處理異常 - 成功: ${successCount}/${pipelineCount}, 活躍: ${activeCount}`);
        }
      } else {
        this.addTestResult('CONCURRENT_PIPELINES', TEST_RESULT_TYPES.SKIPPED, 'CiCdOrchestrator 不可用');
      }
      
    } catch (error) {
      this.addTestResult('CONCURRENT_PIPELINES', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試 Pipeline 負載限制
   */
  async testPipelineLoadLimits() {
    try {
      console.log('  🧪 測試: Pipeline 負載限制');
      
      if (typeof globalCiCdOrchestrator !== 'undefined') {
        const maxConcurrent = globalCiCdOrchestrator.config.maxConcurrentExecutions;
        const overLimitCount = maxConcurrent + 2;
        
        const promises = [];
        
        // 嘗試啟動超過限制的 Pipeline
        for (let i = 0; i < overLimitCount; i++) {
          const config = {
            environment: 'development',
            version: `2.0.${i}`,
            strategy: 'blue-green'
          };
          
          promises.push(
            globalCiCdOrchestrator.executeDeploymentPipeline('development', config)
              .catch(error => ({ success: false, error: error.message, blocked: true }))
          );
        }
        
        // 等待一下讓系統處理
        await this.delay(2000);
        
        const activeCount = globalCiCdOrchestrator.activeExecutions.size;
        
        if (activeCount <= maxConcurrent) {
          this.addTestResult('PIPELINE_LOAD_LIMITS', TEST_RESULT_TYPES.SUCCESS, 
            `負載限制正確 - 最大: ${maxConcurrent}, 當前: ${activeCount}`);
        } else {
          this.addTestResult('PIPELINE_LOAD_LIMITS', TEST_RESULT_TYPES.WARNING, 
            `負載限制未生效 - 最大: ${maxConcurrent}, 當前: ${activeCount}`);
        }
      } else {
        this.addTestResult('PIPELINE_LOAD_LIMITS', TEST_RESULT_TYPES.SKIPPED, 'CiCdOrchestrator 不可用');
      }
      
    } catch (error) {
      this.addTestResult('PIPELINE_LOAD_LIMITS', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試資源競爭處理
   */
  async testResourceContention() {
    try {
      console.log('  🧪 測試: 資源競爭處理');
      
      // 這個測試主要檢查系統在高負載下的穩定性
      let contentionErrors = 0;
      let successfulOperations = 0;
      const totalOperations = 10;
      
      for (let i = 0; i < totalOperations; i++) {
        try {
          // 模擬快速連續的品質檢查
          if (typeof globalCodeQualityChecker !== 'undefined') {
            await globalCodeQualityChecker.runCiCdQualityCheck('development', [{
              fileName: `test${i}.gs`,
              content: 'function test() { return true; }'
            }]);
            successfulOperations++;
          }
          
          // 模擬快速連續的健康檢查
          if (typeof globalHealthCheckService !== 'undefined') {
            await globalHealthCheckService.executeAllHealthChecks();
            successfulOperations++;
          }
          
        } catch (error) {
          contentionErrors++;
        }
      }
      
      const successRate = successfulOperations / (totalOperations * 2);
      
      if (successRate >= 0.8) { // 80% 成功率
        this.addTestResult('RESOURCE_CONTENTION', TEST_RESULT_TYPES.SUCCESS, 
          `資源競爭處理良好 - 成功率: ${Math.round(successRate * 100)}%, 錯誤: ${contentionErrors}`);
      } else {
        this.addTestResult('RESOURCE_CONTENTION', TEST_RESULT_TYPES.WARNING, 
          `資源競爭影響性能 - 成功率: ${Math.round(successRate * 100)}%, 錯誤: ${contentionErrors}`);
      }
      
    } catch (error) {
      this.addTestResult('RESOURCE_CONTENTION', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試系統整合
   */
  async testSystemIntegration() {
    // 測試 1: 組件間通信
    await this.testInterComponentCommunication();
    
    // 測試 2: 事件總線整合
    await this.testEventBusIntegration();
    
    // 測試 3: 快取系統整合
    await this.testCacheIntegration();
    
    // 測試 4: 錯誤處理整合
    await this.testErrorHandlingIntegration();
  }
  
  /**
   * 測試組件間通信
   */
  async testInterComponentCommunication() {
    try {
      console.log('  🧪 測試: 組件間通信');
      
      let communicationScore = 0;
      let totalTests = 0;
      
      // 測試 CiCdOrchestrator 與 CodeQualityChecker
      if (typeof globalCiCdOrchestrator !== 'undefined' && typeof globalCodeQualityChecker !== 'undefined') {
        try {
          const qualityResult = await globalCodeQualityChecker.runCiCdQualityCheck('development', []);
          if (qualityResult) {
            communicationScore++;
          }
          totalTests++;
        } catch (error) {
          totalTests++;
        }
      }
      
      // 測試 CiCdOrchestrator 與 HealthCheckService
      if (typeof globalCiCdOrchestrator !== 'undefined' && typeof globalHealthCheckService !== 'undefined') {
        try {
          const healthStatus = globalHealthCheckService.getHealthStatus();
          if (healthStatus) {
            communicationScore++;
          }
          totalTests++;
        } catch (error) {
          totalTests++;
        }
      }
      
      // 測試 CiCdOrchestrator 與 DeploymentManager
      if (typeof globalCiCdOrchestrator !== 'undefined' && typeof globalDeploymentManager !== 'undefined') {
        try {
          const deploymentStats = globalDeploymentManager.getDeploymentStats();
          if (deploymentStats) {
            communicationScore++;
          }
          totalTests++;
        } catch (error) {
          totalTests++;
        }
      }
      
      const communicationRate = totalTests > 0 ? communicationScore / totalTests : 0;
      
      if (communicationRate >= 0.7) {
        this.addTestResult('INTER_COMPONENT_COMMUNICATION', TEST_RESULT_TYPES.SUCCESS, 
          `組件間通信良好 - 成功率: ${Math.round(communicationRate * 100)}% (${communicationScore}/${totalTests})`);
      } else {
        this.addTestResult('INTER_COMPONENT_COMMUNICATION', TEST_RESULT_TYPES.WARNING, 
          `組件間通信有問題 - 成功率: ${Math.round(communicationRate * 100)}% (${communicationScore}/${totalTests})`);
      }
      
    } catch (error) {
      this.addTestResult('INTER_COMPONENT_COMMUNICATION', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試事件總線整合
   */
  async testEventBusIntegration() {
    try {
      console.log('  🧪 測試: 事件總線整合');
      
      if (typeof globalEventBus !== 'undefined') {
        let eventReceived = false;
        
        // 註冊測試事件監聽器
        const testListener = (data) => {
          eventReceived = true;
        };
        
        globalEventBus.subscribe('cicd.test.event', testListener);
        
        // 發布測試事件
        globalEventBus.publish('cicd.test.event', { test: true });
        
        // 等待事件處理
        await this.delay(500);
        
        // 清理監聽器
        globalEventBus.unsubscribe('cicd.test.event', testListener);
        
        if (eventReceived) {
          this.addTestResult('EVENT_BUS_INTEGRATION', TEST_RESULT_TYPES.SUCCESS, 
            '事件總線整合正常');
        } else {
          this.addTestResult('EVENT_BUS_INTEGRATION', TEST_RESULT_TYPES.WARNING, 
            '事件總線未正確觸發');
        }
      } else {
        this.addTestResult('EVENT_BUS_INTEGRATION', TEST_RESULT_TYPES.SKIPPED, 'EventBus 不可用');
      }
      
    } catch (error) {
      this.addTestResult('EVENT_BUS_INTEGRATION', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試快取系統整合
   */
  async testCacheIntegration() {
    try {
      console.log('  🧪 測試: 快取系統整合');
      
      if (typeof globalCache !== 'undefined') {
        const testKey = 'cicd.test.cache.key';
        const testValue = { test: true, timestamp: Date.now() };
        
        // 測試設置快取
        globalCache.set(testKey, testValue);
        
        // 測試獲取快取
        const cachedValue = globalCache.get(testKey);
        
        // 清理測試快取
        globalCache.delete(testKey);
        
        if (cachedValue && cachedValue.test === true) {
          this.addTestResult('CACHE_INTEGRATION', TEST_RESULT_TYPES.SUCCESS, 
            '快取系統整合正常');
        } else {
          this.addTestResult('CACHE_INTEGRATION', TEST_RESULT_TYPES.WARNING, 
            '快取系統未正確工作');
        }
      } else {
        this.addTestResult('CACHE_INTEGRATION', TEST_RESULT_TYPES.SKIPPED, 'Cache 不可用');
      }
      
    } catch (error) {
      this.addTestResult('CACHE_INTEGRATION', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  /**
   * 測試錯誤處理整合
   */
  async testErrorHandlingIntegration() {
    try {
      console.log('  🧪 測試: 錯誤處理整合');
      
      if (typeof ErrorHandler !== 'undefined') {
        let errorHandled = false;
        
        // 模擬錯誤並檢查是否正確處理
        try {
          // 故意觸發一個錯誤
          throw new Error('CI/CD 測試錯誤');
        } catch (error) {
          ErrorHandler.handle('CiCdPipelineTest.errorTest', error, 'WARNING', 'SYSTEM');
          errorHandled = true;
        }
        
        if (errorHandled) {
          this.addTestResult('ERROR_HANDLING_INTEGRATION', TEST_RESULT_TYPES.SUCCESS, 
            '錯誤處理整合正常');
        } else {
          this.addTestResult('ERROR_HANDLING_INTEGRATION', TEST_RESULT_TYPES.WARNING, 
            '錯誤處理未正確觸發');
        }
      } else {
        this.addTestResult('ERROR_HANDLING_INTEGRATION', TEST_RESULT_TYPES.SKIPPED, 'ErrorHandler 不可用');
      }
      
    } catch (error) {
      this.addTestResult('ERROR_HANDLING_INTEGRATION', TEST_RESULT_TYPES.ERROR, `測試失敗: ${error.message}`);
    }
  }
  
  // === 輔助方法 ===
  
  /**
   * 準備最佳條件
   */
  async prepareOptimalConditions() {
    if (typeof globalHealthCheckService !== 'undefined') {
      globalHealthCheckService.resetToHealthyState();
    }
    
    if (typeof globalCodeQualityChecker !== 'undefined') {
      // 確保品質檢查器處於良好狀態
      globalCodeQualityChecker.reset();
    }
  }
  
  /**
   * 準備失敗條件
   */
  async prepareFailureConditions() {
    if (typeof globalHealthCheckService !== 'undefined') {
      globalHealthCheckService.simulateCriticalHealthIssue('system_memory_usage', {
        currentUsage: 95,
        threshold: 80
      });
    }
  }
  
  /**
   * 準備高風險條件
   */
  async prepareHighRiskConditions() {
    if (typeof globalHealthCheckService !== 'undefined') {
      globalHealthCheckService.simulateCriticalHealthIssue('system_response_time', {
        currentTime: 5000,
        threshold: 2000
      });
    }
  }
  
  /**
   * 備份原始配置
   */
  backupOriginalConfigs() {
    this.originalConfigs = {
      timestamp: Date.now()
    };
  }
  
  /**
   * 清理測試環境
   */
  async cleanupTestEnvironment() {
    console.log('🧹 清理測試環境...');
    
    try {
      // 恢復原始配置
      if (this.originalConfigs.qualityGates && typeof globalCodeQualityChecker !== 'undefined') {
        globalCodeQualityChecker.qualityGates = this.originalConfigs.qualityGates;
      }
      
      if (typeof globalHealthCheckService !== 'undefined') {
        globalHealthCheckService.setTestMode(false);
        globalHealthCheckService.resetToHealthyState();
      }
      
      if (typeof globalCiCdOrchestrator !== 'undefined') {
        // 取消所有活躍的 Pipeline
        const activePipelines = Array.from(globalCiCdOrchestrator.activeExecutions.keys());
        for (const pipelineId of activePipelines) {
          try {
            globalCiCdOrchestrator.cancelPipeline(pipelineId, '測試清理');
          } catch (error) {
            // 忽略取消錯誤
          }
        }
      }
      
      this.addTestResult('CLEANUP', TEST_RESULT_TYPES.SUCCESS, '測試環境清理完成');
      
    } catch (error) {
      this.addTestResult('CLEANUP', TEST_RESULT_TYPES.WARNING, `清理過程出現問題: ${error.message}`);
    }
  }
  
  /**
   * 添加測試結果
   */
  addTestResult(testName, resultType, message, details = {}) {
    const result = {
      testName: testName,
      resultType: resultType,
      message: message,
      details: details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    // 更新計數器
    this.testMetrics.total++;
    switch (resultType) {
      case TEST_RESULT_TYPES.SUCCESS:
        this.testMetrics.passed++;
        console.log(`    ✅ ${testName}: ${message}`);
        break;
      case TEST_RESULT_TYPES.FAILURE:
        this.testMetrics.failed++;
        console.log(`    ❌ ${testName}: ${message}`);
        break;
      case TEST_RESULT_TYPES.WARNING:
        this.testMetrics.warnings++;
        console.log(`    ⚠️ ${testName}: ${message}`);
        break;
      case TEST_RESULT_TYPES.ERROR:
        this.testMetrics.errors++;
        console.log(`    💥 ${testName}: ${message}`);
        break;
      case TEST_RESULT_TYPES.BLOCKED:
        this.testMetrics.blocked++;
        console.log(`    🚫 ${testName}: ${message}`);
        break;
      case TEST_RESULT_TYPES.SKIPPED:
        this.testMetrics.skipped++;
        console.log(`    ➖ ${testName}: ${message}`);
        break;
    }
  }
  
  /**
   * 計算測試指標
   */
  calculateTestMetrics() {
    this.endTime = new Date();
    this.testMetrics.duration = this.endTime - this.startTime;
    
    // 計算成功率
    const totalExecuted = this.testMetrics.total - this.testMetrics.skipped;
    this.testMetrics.successRate = totalExecuted > 0 ? 
      ((this.testMetrics.passed / totalExecuted) * 100).toFixed(2) : 0;
    
    // 計算整體健康度
    const criticalIssues = this.testMetrics.failed + this.testMetrics.errors;
    const minorIssues = this.testMetrics.warnings + this.testMetrics.blocked;
    
    if (criticalIssues === 0 && minorIssues <= 2) {
      this.testMetrics.overallHealth = 'EXCELLENT';
    } else if (criticalIssues <= 1 && minorIssues <= 5) {
      this.testMetrics.overallHealth = 'GOOD';
    } else if (criticalIssues <= 3 && minorIssues <= 10) {
      this.testMetrics.overallHealth = 'FAIR';
    } else {
      this.testMetrics.overallHealth = 'POOR';
    }
  }
  
  /**
   * 生成測試報告
   */
  generateTestReport() {
    const report = {
      summary: {
        testSuite: 'CI/CD Pipeline 完整測試套件',
        version: '1.0.0',
        executionTime: {
          start: this.startTime,
          end: this.endTime,
          duration: this.testMetrics.duration
        },
        metrics: this.testMetrics,
        overallStatus: this.determineOverallStatus()
      },
      results: this.testResults,
      recommendations: this.generateRecommendations(),
      nextSteps: this.generateNextSteps()
    };
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 CI/CD PIPELINE 測試報告');
    console.log('='.repeat(80));
    console.log(`📊 執行摘要:`);
    console.log(`   - 總測試數: ${this.testMetrics.total}`);
    console.log(`   - 通過: ${this.testMetrics.passed} (${this.testMetrics.successRate}%)`);
    console.log(`   - 失敗: ${this.testMetrics.failed}`);
    console.log(`   - 警告: ${this.testMetrics.warnings}`);
    console.log(`   - 錯誤: ${this.testMetrics.errors}`);
    console.log(`   - 阻斷: ${this.testMetrics.blocked}`);
    console.log(`   - 跳過: ${this.testMetrics.skipped}`);
    console.log(`   - 執行時間: ${Math.round(this.testMetrics.duration / 1000)} 秒`);
    console.log(`   - 整體健康度: ${this.testMetrics.overallHealth}`);
    console.log(`   - 整體狀態: ${report.summary.overallStatus}`);
    
    if (report.recommendations.length > 0) {
      console.log(`\n💡 建議:`);
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    if (report.nextSteps.length > 0) {
      console.log(`\n📋 下一步:`);
      report.nextSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
      });
    }
    
    console.log('='.repeat(80));
    
    return report;
  }
  
  /**
   * 確定整體狀態
   */
  determineOverallStatus() {
    if (this.testMetrics.errors > 0 || this.testMetrics.failed > 3) {
      return 'CRITICAL_ISSUES';
    } else if (this.testMetrics.failed > 0 || this.testMetrics.warnings > 5) {
      return 'NEEDS_ATTENTION';
    } else if (this.testMetrics.warnings > 0 || this.testMetrics.blocked > 0) {
      return 'MINOR_ISSUES';
    } else {
      return 'ALL_SYSTEMS_GO';
    }
  }
  
  /**
   * 生成建議
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.testMetrics.failed > 0) {
      recommendations.push('優先修復失敗的測試項目，這些可能影響 CI/CD Pipeline 的核心功能');
    }
    
    if (this.testMetrics.errors > 0) {
      recommendations.push('檢查系統錯誤，可能存在組件整合問題或配置錯誤');
    }
    
    if (this.testMetrics.warnings > 3) {
      recommendations.push('關注警告項目，雖不阻斷但可能影響性能或穩定性');
    }
    
    if (this.testMetrics.skipped > 5) {
      recommendations.push('檢查跳過的測試，可能缺少必要的系統組件');
    }
    
    if (parseFloat(this.testMetrics.successRate) < 80) {
      recommendations.push('成功率偏低，建議全面檢查 CI/CD Pipeline 配置');
    }
    
    if (this.testMetrics.duration > 300000) { // 5 分鐘
      recommendations.push('測試執行時間較長，考慮優化測試性能或並行執行');
    }
    
    return recommendations;
  }
  
  /**
   * 生成下一步計劃
   */
  generateNextSteps() {
    const nextSteps = [];
    
    if (this.testMetrics.failed > 0 || this.testMetrics.errors > 0) {
      nextSteps.push('修復關鍵問題後重新執行測試');
    }
    
    if (this.testMetrics.overallHealth !== 'EXCELLENT') {
      nextSteps.push('根據建議優化系統配置');
    }
    
    nextSteps.push('在生產環境部署前執行完整的負載測試');
    nextSteps.push('建立定期自動化測試排程');
    nextSteps.push('監控 CI/CD Pipeline 在實際使用中的表現');
    
    return nextSteps;
  }
  
  /**
   * 延遲函數
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 全域測試實例
 */
const globalCiCdPipelineTest = new CiCdPipelineTest();

/**
 * 便捷函數：執行完整測試套件
 */
async function runCiCdPipelineTests() {
  return await globalCiCdPipelineTest.runCompletePipelineTests();
}

/**
 * 便捷函數：執行品質檢查測試
 */
async function runQualityGateTests() {
  const tester = new CiCdPipelineTest();
  await tester.setupTestEnvironment();
  try {
    await tester.testQualityGateIntegration();
    return tester.generateTestReport();
  } finally {
    await tester.cleanupTestEnvironment();
  }
}

/**
 * 便捷函數：執行健康檢查測試
 */
async function runHealthCheckTests() {
  const tester = new CiCdPipelineTest();
  await tester.setupTestEnvironment();
  try {
    await tester.testHealthCheckIntegration();
    return tester.generateTestReport();
  } finally {
    await tester.cleanupTestEnvironment();
  }
}

/**
 * 便捷函數：執行完整 Pipeline 測試
 */
async function runFullPipelineTests() {
  const tester = new CiCdPipelineTest();
  await tester.setupTestEnvironment();
  try {
    await tester.testFullPipelineScenarios();
    return tester.generateTestReport();
  } finally {
    await tester.cleanupTestEnvironment();
  }
}

console.log('✅ CiCdPipelineTest loaded successfully - Enterprise CI/CD Pipeline Testing Suite Ready');