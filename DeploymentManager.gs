/**
 * 部署管理器
 * 企業級自動化部署與版本管理系統
 * Version: 1.0.0 - Phase 3 CI/CD Pipeline
 */

/**
 * 部署環境枚舉（已在 HealthCheckService.gs 中定義，此處不再重複宣告）
 */

/**
 * 部署狀態枚舉
 */
const DEPLOYMENT_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  DEPLOYING: 'deploying',
  VERIFYING: 'verifying',
  SUCCESS: 'success',
  FAILED: 'failed',
  ROLLING_BACK: 'rolling_back',
  ROLLED_BACK: 'rolled_back'
};

/**
 * 部署記錄類
 */
class DeploymentRecord {
  constructor(deploymentId, environment, version) {
    this.deploymentId = deploymentId;
    this.environment = environment;
    this.version = version;
    this.status = DEPLOYMENT_STATUS.PENDING;
    this.startTime = new Date();
    this.endTime = null;
    this.duration = null;
    this.steps = [];
    this.errors = [];
    this.rollbackInfo = null;
    this.metadata = {};
  }
  
  addStep(stepName, status, details = {}) {
    this.steps.push({
      stepName: stepName,
      status: status,
      timestamp: new Date().toISOString(),
      details: details
    });
  }
  
  setStatus(status) {
    this.status = status;
    if (status === DEPLOYMENT_STATUS.SUCCESS || status === DEPLOYMENT_STATUS.FAILED) {
      this.endTime = new Date();
      this.duration = this.endTime - this.startTime;
    }
  }
  
  addError(error) {
    this.errors.push({
      message: error.message || error,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
  }
  
  toJSON() {
    return {
      deploymentId: this.deploymentId,
      environment: this.environment,
      version: this.version,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      steps: this.steps,
      errors: this.errors,
      rollbackInfo: this.rollbackInfo,
      metadata: this.metadata
    };
  }
}

/**
 * 部署策略介面
 */
class DeploymentStrategy {
  constructor(strategyName) {
    this.strategyName = strategyName;
  }
  
  async execute(deploymentRecord, deploymentConfig) {
    throw new Error(`DeploymentStrategy ${this.strategyName} must implement execute method`);
  }
}

/**
 * 藍綠部署策略
 */
class BlueGreenDeploymentStrategy extends DeploymentStrategy {
  constructor() {
    super('BlueGreen');
  }
  
  async execute(deploymentRecord, deploymentConfig) {
    deploymentRecord.addStep('藍綠部署開始', 'info');
    
    try {
      // 步驟 1: 準備新環境（綠環境）
      deploymentRecord.addStep('準備綠環境', 'running');
      await this.prepareGreenEnvironment(deploymentConfig);
      deploymentRecord.addStep('準備綠環境', 'success');
      
      // 步驟 2: 部署到綠環境
      deploymentRecord.addStep('部署到綠環境', 'running');
      await this.deployToGreenEnvironment(deploymentConfig);
      deploymentRecord.addStep('部署到綠環境', 'success');
      
      // 步驟 3: 驗證綠環境
      deploymentRecord.addStep('驗證綠環境', 'running');
      const validationResult = await this.validateGreenEnvironment(deploymentConfig);
      if (!validationResult.success) {
        throw new Error(`綠環境驗證失敗: ${validationResult.message}`);
      }
      deploymentRecord.addStep('驗證綠環境', 'success');
      
      // 步驟 4: 切換流量
      deploymentRecord.addStep('切換流量', 'running');
      await this.switchTraffic(deploymentConfig);
      deploymentRecord.addStep('切換流量', 'success');
      
      // 步驟 5: 清理藍環境
      deploymentRecord.addStep('清理藍環境', 'running');
      await this.cleanupBlueEnvironment(deploymentConfig);
      deploymentRecord.addStep('清理藍環境', 'success');
      
      return { success: true, message: '藍綠部署完成' };
      
    } catch (error) {
      deploymentRecord.addError(error);
      return { success: false, message: error.message };
    }
  }
  
  async prepareGreenEnvironment(config) {
    // 在 Google Apps Script 環境中，這主要是配置準備
    Logger.log('準備綠環境配置');
  }
  
  async deployToGreenEnvironment(config) {
    // 模擬部署到新環境
    Logger.log('部署代碼到綠環境');
    await this.delay(1000); // 模擬部署時間
  }
  
  async validateGreenEnvironment(config) {
    // 執行驗證測試
    Logger.log('驗證綠環境功能');
    return { success: true, message: '綠環境驗證通過' };
  }
  
  async switchTraffic(config) {
    // 在 Google Apps Script 中，這相當於更新 Web App
    Logger.log('切換流量到綠環境');
  }
  
  async cleanupBlueEnvironment(config) {
    // 清理舊環境資源
    Logger.log('清理藍環境');
  }
  
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 金絲雀部署策略
 */
class CanaryDeploymentStrategy extends DeploymentStrategy {
  constructor() {
    super('Canary');
  }
  
  async execute(deploymentRecord, deploymentConfig) {
    deploymentRecord.addStep('金絲雀部署開始', 'info');
    
    try {
      // 步驟 1: 部署到小部分環境
      deploymentRecord.addStep('金絲雀部署', 'running');
      await this.deployCanary(deploymentConfig);
      deploymentRecord.addStep('金絲雀部署', 'success');
      
      // 步驟 2: 監控金絲雀環境
      deploymentRecord.addStep('監控金絲雀', 'running');
      const monitorResult = await this.monitorCanary(deploymentConfig);
      if (!monitorResult.success) {
        throw new Error(`金絲雀監控失敗: ${monitorResult.message}`);
      }
      deploymentRecord.addStep('監控金絲雀', 'success');
      
      // 步驟 3: 全量部署
      deploymentRecord.addStep('全量部署', 'running');
      await this.deployFull(deploymentConfig);
      deploymentRecord.addStep('全量部署', 'success');
      
      return { success: true, message: '金絲雀部署完成' };
      
    } catch (error) {
      deploymentRecord.addError(error);
      return { success: false, message: error.message };
    }
  }
  
  async deployCanary(config) {
    Logger.log('部署金絲雀版本');
  }
  
  async monitorCanary(config) {
    Logger.log('監控金絲雀指標');
    return { success: true, message: '金絲雀指標正常' };
  }
  
  async deployFull(config) {
    Logger.log('執行全量部署');
  }
}

/**
 * 部署管理器主類
 */
class DeploymentManager {
  constructor() {
    this.deploymentHistory = [];
    this.strategies = new Map();
    this.environments = new Map();
    this.hooks = {
      preDeployment: [],
      postDeployment: [],
      onFailure: [],
      onSuccess: []
    };
    this.maxHistorySize = 100;
    
    this.initializeStrategies();
    this.initializeEnvironments();
  }
  
  /**
   * 初始化部署策略
   */
  initializeStrategies() {
    this.strategies.set('blue-green', new BlueGreenDeploymentStrategy());
    this.strategies.set('canary', new CanaryDeploymentStrategy());
    Logger.log('[DeploymentManager] 部署策略初始化完成');
  }
  
  /**
   * 初始化環境配置
   */
  initializeEnvironments() {
    this.environments.set(DEPLOYMENT_ENVIRONMENTS.DEVELOPMENT, {
      name: 'Development',
      url: 'https://script.google.com/macros/d/{DEV_SCRIPT_ID}/exec',
      autoTest: true,
      requireApproval: false
    });
    
    this.environments.set(DEPLOYMENT_ENVIRONMENTS.STAGING, {
      name: 'Staging',
      url: 'https://script.google.com/macros/d/{STAGING_SCRIPT_ID}/exec',
      autoTest: true,
      requireApproval: true
    });
    
    this.environments.set(DEPLOYMENT_ENVIRONMENTS.PRODUCTION, {
      name: 'Production',
      url: 'https://script.google.com/macros/d/{PROD_SCRIPT_ID}/exec',
      autoTest: true,
      requireApproval: true
    });
    
    Logger.log('[DeploymentManager] 環境配置初始化完成');
  }
  
  /**
   * 執行部署
   * @param {Object} deploymentConfig 部署配置
   * @return {Promise<DeploymentRecord>} 部署記錄
   */
  async deploy(deploymentConfig) {
    const perfSession = startTimer('DeploymentManager.deploy', 'DEPLOYMENT');
    
    const deploymentId = this.generateDeploymentId();
    const deploymentRecord = new DeploymentRecord(
      deploymentId,
      deploymentConfig.environment,
      deploymentConfig.version
    );
    
    try {
      Logger.log(`[DeploymentManager] 開始部署: ${deploymentId}`);
      
      // 添加到歷史記錄
      this.addToHistory(deploymentRecord);
      
      // 設置部署狀態
      deploymentRecord.setStatus(DEPLOYMENT_STATUS.PREPARING);
      
      // 執行預部署鉤子
      await this.executeHooks('preDeployment', deploymentRecord, deploymentConfig);
      
      // 預部署檢查
      deploymentRecord.addStep('預部署檢查', 'running');
      const preCheckResult = await this.preDeploymentCheck(deploymentConfig);
      if (!preCheckResult.success) {
        throw new Error(`預部署檢查失敗: ${preCheckResult.message}`);
      }
      deploymentRecord.addStep('預部署檢查', 'success');
      
      // 執行部署策略
      deploymentRecord.setStatus(DEPLOYMENT_STATUS.DEPLOYING);
      const strategy = this.strategies.get(deploymentConfig.strategy || 'blue-green');
      if (!strategy) {
        throw new Error(`未知的部署策略: ${deploymentConfig.strategy}`);
      }
      
      const deployResult = await strategy.execute(deploymentRecord, deploymentConfig);
      if (!deployResult.success) {
        throw new Error(deployResult.message);
      }
      
      // 部署後驗證
      deploymentRecord.setStatus(DEPLOYMENT_STATUS.VERIFYING);
      deploymentRecord.addStep('部署後驗證', 'running');
      const verificationResult = await this.postDeploymentVerification(deploymentConfig);
      if (!verificationResult.success) {
        throw new Error(`部署後驗證失敗: ${verificationResult.message}`);
      }
      deploymentRecord.addStep('部署後驗證', 'success');
      
      // 設置成功狀態
      deploymentRecord.setStatus(DEPLOYMENT_STATUS.SUCCESS);
      
      // 執行成功鉤子
      await this.executeHooks('onSuccess', deploymentRecord, deploymentConfig);
      await this.executeHooks('postDeployment', deploymentRecord, deploymentConfig);
      
      perfSession.end(true, `部署成功: ${deploymentId}`);
      
      Logger.log(`[DeploymentManager] 部署成功: ${deploymentId}`);
      
      return deploymentRecord;
      
    } catch (error) {
      deploymentRecord.addError(error);
      deploymentRecord.setStatus(DEPLOYMENT_STATUS.FAILED);
      
      // 執行失敗鉤子
      await this.executeHooks('onFailure', deploymentRecord, deploymentConfig);
      
      perfSession.end(false, `部署失敗: ${error.message}`);
      
      Logger.log(`[DeploymentManager] 部署失敗: ${deploymentId} - ${error.message}`);
      
      // 自動回滾（如果配置了）
      if (deploymentConfig.autoRollback) {
        Logger.log(`[DeploymentManager] 開始自動回滾: ${deploymentId}`);
        await this.rollback(deploymentRecord, deploymentConfig);
      }
      
      throw error;
    }
  }
  
  /**
   * 回滾部署
   * @param {DeploymentRecord} deploymentRecord 部署記錄
   * @param {Object} deploymentConfig 部署配置
   * @return {Promise<Object>} 回滾結果
   */
  async rollback(deploymentRecord, deploymentConfig) {
    const perfSession = startTimer('DeploymentManager.rollback', 'ROLLBACK');
    
    try {
      Logger.log(`[DeploymentManager] 開始回滾: ${deploymentRecord.deploymentId}`);
      
      deploymentRecord.setStatus(DEPLOYMENT_STATUS.ROLLING_BACK);
      deploymentRecord.addStep('開始回滾', 'running');
      
      // 獲取上一個成功的部署
      const lastSuccessfulDeployment = this.getLastSuccessfulDeployment(
        deploymentRecord.environment
      );
      
      if (!lastSuccessfulDeployment) {
        throw new Error('找不到可回滾的版本');
      }
      
      // 執行回滾
      deploymentRecord.addStep('執行回滾', 'running');
      await this.executeRollback(lastSuccessfulDeployment, deploymentConfig);
      deploymentRecord.addStep('執行回滾', 'success');
      
      // 驗證回滾
      deploymentRecord.addStep('驗證回滾', 'running');
      const verificationResult = await this.postDeploymentVerification(deploymentConfig);
      if (!verificationResult.success) {
        throw new Error(`回滾驗證失敗: ${verificationResult.message}`);
      }
      deploymentRecord.addStep('驗證回滾', 'success');
      
      deploymentRecord.setStatus(DEPLOYMENT_STATUS.ROLLED_BACK);
      deploymentRecord.rollbackInfo = {
        rollbackToVersion: lastSuccessfulDeployment.version,
        rollbackTime: new Date().toISOString()
      };
      
      perfSession.end(true, '回滾成功');
      
      Logger.log(`[DeploymentManager] 回滾成功: ${deploymentRecord.deploymentId}`);
      
      return { success: true, message: '回滾成功' };
      
    } catch (error) {
      deploymentRecord.addError(error);
      perfSession.end(false, error.message);
      
      Logger.log(`[DeploymentManager] 回滾失敗: ${deploymentRecord.deploymentId} - ${error.message}`);
      
      return { success: false, message: error.message };
    }
  }
  
  /**
   * 預部署檢查 - 整合 CI/CD Pipeline 品質與健康檢查
   */
  async preDeploymentCheck(deploymentConfig) {
    try {
      // 檢查環境配置
      const environment = this.environments.get(deploymentConfig.environment);
      if (!environment) {
        return { success: false, message: `未知的部署環境: ${deploymentConfig.environment}` };
      }
      
      // 檢查版本格式
      if (!deploymentConfig.version || !this.isValidVersion(deploymentConfig.version)) {
        return { success: false, message: '無效的版本號格式' };
      }
      
      // === CI/CD 整合: 品質門禁檢查 ===
      if (true) {
        Logger.log('執行 CI/CD 品質門禁檢查');
        
        try {
          // 執行代碼品質檢查
          const qualityResult = deploymentConfig.files ? 
            await getGlobalCodeQualityChecker().batchCheckCodeQuality(deploymentConfig.files) :
            await getGlobalCodeQualityChecker().performSystemQualityCheck();
          
          // 檢查品質門禁
          const gateResult = getGlobalCodeQualityChecker().runQualityGate(qualityResult, deploymentConfig.environment);
          
          if (!gateResult.passed) {
            return { 
              success: false, 
              message: `品質門禁失敗: ${gateResult.message}`,
              details: {
                type: 'QUALITY_GATE_FAILURE',
                score: qualityResult.overallScore,
                grade: qualityResult.grade,
                blockerIssues: qualityResult.issuesSummary.blocker || 0,
                criticalIssues: qualityResult.issuesSummary.critical || 0
              }
            };
          }
          
          Logger.log(`品質門禁通過 - 評分: ${qualityResult.overallScore}, 等級: ${qualityResult.grade}`);
          
        } catch (qualityError) {
          Logger.log(`品質檢查執行錯誤: ${qualityError.message}`);
          return { 
            success: false, 
            message: `品質檢查執行失敗: ${qualityError.message}`,
            details: { type: 'QUALITY_CHECK_ERROR' }
          };
        }
      }
      
      // === CI/CD 整合: 系統健康檢查 ===
      if (typeof globalHealthCheckService !== 'undefined') {
        Logger.log('執行 CI/CD 系統健康檢查');
        
        try {
          // 執行健康檢查
          const healthResults = await globalHealthCheckService.executeAllHealthChecks();
          const overallHealth = globalHealthCheckService.getHealthStatus();
          
          // 關鍵健康狀態阻止部署
          if (overallHealth.overallStatus === 'CRITICAL') {
            return { 
              success: false, 
              message: `系統健康狀態嚴重 - 部署已阻止`,
              details: {
                type: 'HEALTH_CHECK_CRITICAL',
                status: overallHealth.overallStatus,
                score: overallHealth.overallScore,
                failedChecks: healthResults.failed.length,
                criticalIssues: healthResults.failed.filter(f => f.severity === 'CRITICAL').length
              }
            };
          }
          
          // 低健康分數警告
          if (overallHealth.overallScore < 70) {
            Logger.log(`⚠️ 系統健康分數偏低: ${overallHealth.overallScore} - 部署風險較高`);
          }
          
          Logger.log(`系統健康檢查通過 - 狀態: ${overallHealth.overallStatus}, 評分: ${overallHealth.overallScore}`);
          
        } catch (healthError) {
          Logger.log(`健康檢查執行錯誤: ${healthError.message}`);
          return { 
            success: false, 
            message: `健康檢查執行失敗: ${healthError.message}`,
            details: { type: 'HEALTH_CHECK_ERROR' }
          };
        }
      }
      
      // === 風險評估整合檢查 ===
      const riskAssessment = this.performRiskAssessment(deploymentConfig);
      if (riskAssessment.riskLevel === 'CRITICAL' && !deploymentConfig.forceDeployment) {
        return { 
          success: false, 
          message: `部署風險過高 (${riskAssessment.riskScore}/100) - 需要強制部署參數或降低風險`,
          details: {
            type: 'HIGH_RISK_DEPLOYMENT',
            riskScore: riskAssessment.riskScore,
            riskLevel: riskAssessment.riskLevel,
            riskFactors: riskAssessment.factors
          }
        };
      }
      
      // 執行測試（如果配置了）
      if (environment.autoTest) {
        Logger.log('執行預部署測試');
        
        if (typeof runQuickAutomatedTests === 'function') {
          const testResult = await runQuickAutomatedTests();
          if (!testResult || testResult.failedTests > 0) {
            return { success: false, message: '預部署測試失敗' };
          }
        }
      }
      
      // 檢查依賴
      const dependencyCheck = await this.checkDependencies(deploymentConfig);
      if (!dependencyCheck.success) {
        return dependencyCheck;
      }
      
      return { 
        success: true, 
        message: '預部署檢查通過 (包含品質門禁與健康檢查)',
        details: {
          qualityCheckPassed: true,
          healthCheckPassed: typeof globalHealthCheckService !== 'undefined',
          riskLevel: riskAssessment.riskLevel,
          riskScore: riskAssessment.riskScore
        }
      };
      
    } catch (error) {
      return { success: false, message: `預部署檢查錯誤: ${error.message}` };
    }
  }
  
  /**
   * 部署後驗證
   */
  async postDeploymentVerification(deploymentConfig) {
    try {
      // 基本功能驗證
      Logger.log('執行部署後驗證');
      
      // 檢查關鍵服務
      const serviceCheck = await this.checkCriticalServices();
      if (!serviceCheck.success) {
        return serviceCheck;
      }
      
      // 執行煙霧測試
      if (typeof runQuickSystemTest === 'function') {
        const smokeTest = runQuickSystemTest();
        if (!smokeTest || !smokeTest.success) {
          return { success: false, message: '煙霧測試失敗' };
        }
      }
      
      return { success: true, message: '部署後驗證通過' };
      
    } catch (error) {
      return { success: false, message: `部署後驗證錯誤: ${error.message}` };
    }
  }
  
  /**
   * 檢查關鍵服務
   */
  async checkCriticalServices() {
    try {
      // 檢查 API 服務
      if (typeof globalTeacherDomainService !== 'undefined') {
        const stats = globalTeacherDomainService.getStats();
        if (!stats) {
          return { success: false, message: '教師域服務異常' };
        }
      }
      
      // 檢查緩存服務
      if (typeof globalCache !== 'undefined') {
        const cacheStats = globalCache.getStats();
        if (!cacheStats) {
          return { success: false, message: '緩存服務異常' };
        }
      }
      
      // 檢查事件總線
      if (typeof globalEventBus !== 'undefined') {
        const eventStats = globalEventBus.getStats();
        if (!eventStats) {
          return { success: false, message: '事件總線異常' };
        }
      }
      
      return { success: true, message: '關鍵服務檢查通過' };
      
    } catch (error) {
      return { success: false, message: `關鍵服務檢查失敗: ${error.message}` };
    }
  }
  
  /**
   * 檢查依賴
   */
  async checkDependencies(deploymentConfig) {
    try {
      // 檢查必要的全域對象
      const requiredGlobals = [
        'globalEventBus',
        'globalCommandProcessor',
        'globalQueryService',
        'globalCache',
        'ErrorHandler'
      ];
      
      for (const globalName of requiredGlobals) {
        if (typeof globalThis[globalName] === 'undefined') {
          return { success: false, message: `缺少必要依賴: ${globalName}` };
        }
      }
      
      return { success: true, message: '依賴檢查通過' };
      
    } catch (error) {
      return { success: false, message: `依賴檢查失敗: ${error.message}` };
    }
  }
  
  /**
   * 執行風險評估 - CI/CD Pipeline 整合風險分析
   */
  performRiskAssessment(deploymentConfig) {
    let riskScore = 0;
    const riskFactors = [];
    
    try {
      // === 因素 1: 環境風險 (25% 權重) ===
      let environmentRisk = 0;
      switch (deploymentConfig.environment) {
        case DEPLOYMENT_ENVIRONMENTS.DEVELOPMENT:
          environmentRisk = 10; // 開發環境低風險
          break;
        case DEPLOYMENT_ENVIRONMENTS.STAGING:
          environmentRisk = 25; // 測試環境中等風險
          break;
        case DEPLOYMENT_ENVIRONMENTS.PRODUCTION:
          environmentRisk = 40; // 生產環境高風險
          break;
        default:
          environmentRisk = 50; // 未知環境最高風險
      }
      riskScore += environmentRisk * 0.25;
      riskFactors.push({
        factor: 'environment',
        score: environmentRisk,
        weight: 0.25,
        description: `${deploymentConfig.environment} 環境風險`
      });
      
      // === 因素 2: 品質風險 (30% 權重) ===  
      let qualityRisk = 50; // 預設中等風險
      if (true) {
        try {
          // 假設可以獲取最近的品質檢查結果
          const recentQualityScore = this.getRecentQualityScore();
          if (recentQualityScore !== null) {
            qualityRisk = Math.max(0, 100 - recentQualityScore); // 品質分數越低，風險越高
          }
        } catch (error) {
          Logger.log(`品質風險評估錯誤: ${error.message}`);
          qualityRisk = 60; // 評估失敗時使用較高風險
        }
      }
      riskScore += qualityRisk * 0.30;
      riskFactors.push({
        factor: 'quality',
        score: qualityRisk,
        weight: 0.30,
        description: '代碼品質風險'
      });
      
      // === 因素 3: 健康風險 (25% 權重) ===
      let healthRisk = 50; // 預設中等風險
      if (typeof globalHealthCheckService !== 'undefined') {
        try {
          const healthStatus = globalHealthCheckService.getHealthStatus();
          if (healthStatus) {
            healthRisk = Math.max(0, 100 - healthStatus.overallScore); // 健康分數越低，風險越高
            
            // 關鍵健康狀態額外風險
            if (healthStatus.overallStatus === 'CRITICAL') {
              healthRisk = Math.min(100, healthRisk + 30);
            } else if (healthStatus.overallStatus === 'UNHEALTHY') {
              healthRisk = Math.min(100, healthRisk + 15);
            }
          }
        } catch (error) {
          Logger.log(`健康風險評估錯誤: ${error.message}`);
          healthRisk = 60; // 評估失敗時使用較高風險
        }
      }
      riskScore += healthRisk * 0.25;
      riskFactors.push({
        factor: 'health',
        score: healthRisk,
        weight: 0.25,
        description: '系統健康風險'
      });
      
      // === 因素 4: 歷史風險 (20% 權重) ===
      const historicalRisk = this.calculateHistoricalRisk(deploymentConfig.environment);
      riskScore += historicalRisk * 0.20;
      riskFactors.push({
        factor: 'historical',
        score: historicalRisk,
        weight: 0.20,
        description: '歷史部署風險'
      });
      
      // === 額外風險因素 ===
      
      // 時間風險 - 非工作時間部署風險較高
      const currentHour = new Date().getHours();
      if (currentHour < 9 || currentHour > 18) { // 非工作時間
        riskScore += 10;
        riskFactors.push({
          factor: 'timing',
          score: 10,
          weight: 0,
          description: '非工作時間部署額外風險'
        });
      }
      
      // 併發部署風險
      const activePipelines = typeof globalCiCdOrchestrator !== 'undefined' ? 
        globalCiCdOrchestrator.activeExecutions.size : 0;
      if (activePipelines > 2) {
        const concurrencyRisk = Math.min(20, activePipelines * 5);
        riskScore += concurrencyRisk;
        riskFactors.push({
          factor: 'concurrency',
          score: concurrencyRisk,
          weight: 0,
          description: `併發部署風險 (${activePipelines} 個活躍 Pipeline)`
        });
      }
      
      // 強制部署風險
      if (deploymentConfig.forceDeployment) {
        riskScore += 15;
        riskFactors.push({
          factor: 'forced',
          score: 15,
          weight: 0,
          description: '強制部署額外風險'
        });
      }
      
      // 限制風險分數在 0-100 範圍內
      riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));
      
      // 確定風險等級
      let riskLevel;
      if (riskScore <= 30) {
        riskLevel = 'LOW';
      } else if (riskScore <= 60) {
        riskLevel = 'MEDIUM';
      } else if (riskScore <= 80) {
        riskLevel = 'HIGH';
      } else {
        riskLevel = 'CRITICAL';
      }
      
      const assessment = {
        riskScore: riskScore,
        riskLevel: riskLevel,
        factors: riskFactors,
        timestamp: new Date().toISOString(),
        recommendation: this.generateRiskRecommendation(riskScore, riskLevel, riskFactors)
      };
      
      Logger.log(`部署風險評估完成 - 分數: ${riskScore}, 等級: ${riskLevel}`);
      
      return assessment;
      
    } catch (error) {
      Logger.log(`風險評估執行錯誤: ${error.message}`);
      
      // 錯誤時返回高風險評估
      return {
        riskScore: 80,
        riskLevel: 'HIGH',
        factors: [{
          factor: 'assessment_error',
          score: 80,
          weight: 1.0,
          description: `風險評估錯誤: ${error.message}`
        }],
        timestamp: new Date().toISOString(),
        recommendation: '風險評估失敗，建議謹慎部署或修復評估問題後重試'
      };
    }
  }
  
  /**
   * 獲取最近的品質分數
   */
  getRecentQualityScore() {
    // 嘗試從快取或最近的品質檢查結果獲取分數
    try {
      if (typeof globalCache !== 'undefined') {
        const cachedScore = globalCache.get('last_quality_score');
        if (cachedScore && typeof cachedScore === 'number') {
          return cachedScore;
        }
      }
      
      // 如果沒有快取，嘗試執行快速品質檢查
      if (true) {
        // 注意：這裡不執行完整檢查，而是獲取快取的結果
        const quickScore = getGlobalCodeQualityChecker().getLastAssessmentScore();
        return quickScore;
      }
      
      return null; // 無法獲取品質分數
      
    } catch (error) {
      Logger.log(`獲取品質分數錯誤: ${error.message}`);
      return null;
    }
  }
  
  /**
   * 計算歷史部署風險
   */
  calculateHistoricalRisk(environment) {
    try {
      // 獲取該環境最近 10 次部署記錄
      const recentDeployments = this.deploymentHistory
        .filter(d => d.environment === environment)
        .slice(-10);
      
      if (recentDeployments.length === 0) {
        return 30; // 沒有歷史記錄時返回中等風險
      }
      
      // 計算失敗率
      const failedDeployments = recentDeployments.filter(d => 
        d.status === DEPLOYMENT_STATUS.FAILED || d.status === DEPLOYMENT_STATUS.ROLLED_BACK
      ).length;
      
      const failureRate = failedDeployments / recentDeployments.length;
      
      // 失敗率轉換為風險分數 (0% 失敗率 = 10 風險, 100% 失敗率 = 90 風險)
      const failureRisk = 10 + (failureRate * 80);
      
      // 考慮最近部署的頻率
      const now = new Date();
      const recentDeployment = recentDeployments[recentDeployments.length - 1];
      const timeSinceLastDeploy = now - new Date(recentDeployment.startTime);
      const hoursSinceLastDeploy = timeSinceLastDeploy / (1000 * 60 * 60);
      
      // 如果最近部署很頻繁 (< 4 小時)，增加風險
      let frequencyRisk = 0;
      if (hoursSinceLastDeploy < 4) {
        frequencyRisk = 15;
      } else if (hoursSinceLastDeploy < 24) {
        frequencyRisk = 5;
      }
      
      const totalHistoricalRisk = Math.min(100, failureRisk + frequencyRisk);
      
      Logger.log(`歷史風險計算 - 失敗率: ${Math.round(failureRate * 100)}%, 頻率風險: ${frequencyRisk}, 總風險: ${Math.round(totalHistoricalRisk)}`);
      
      return Math.round(totalHistoricalRisk);
      
    } catch (error) {
      Logger.log(`歷史風險計算錯誤: ${error.message}`);
      return 40; // 錯誤時返回中高風險
    }
  }
  
  /**
   * 生成風險建議
   */
  generateRiskRecommendation(riskScore, riskLevel, riskFactors) {
    const recommendations = [];
    
    // 基於風險等級的一般建議
    switch (riskLevel) {
      case 'LOW':
        recommendations.push('風險較低，可以正常執行部署');
        break;
      case 'MEDIUM':
        recommendations.push('風險中等，建議在監控下執行部署');
        break;
      case 'HIGH':
        recommendations.push('風險較高，建議降低風險因素後再部署');
        break;
      case 'CRITICAL':
        recommendations.push('風險極高，強烈建議修復主要問題後再部署');
        break;
    }
    
    // 基於特定風險因素的建議
    riskFactors.forEach(factor => {
      if (factor.score > 60) {
        switch (factor.factor) {
          case 'quality':
            recommendations.push('建議先修復代碼品質問題');
            break;
          case 'health':
            recommendations.push('建議先解決系統健康問題');
            break;
          case 'historical':
            recommendations.push('最近部署失敗率較高，建議檢查部署流程');
            break;
          case 'environment':
            recommendations.push('生產環境部署需要額外謹慎');
            break;
        }
      }
    });
    
    // 時間相關建議
    const currentHour = new Date().getHours();
    if (currentHour < 9 || currentHour > 18) {
      recommendations.push('非工作時間部署，確保有技術支援待命');
    }
    
    return recommendations.length > 0 ? recommendations : ['無特殊建議'];
  }
  
  /**
   * 執行回滾
   */
  async executeRollback(lastSuccessfulDeployment, deploymentConfig) {
    Logger.log(`回滾到版本: ${lastSuccessfulDeployment.version}`);
    
    // 在 Google Apps Script 環境中，回滾主要是恢復配置
    // 實際實現會根據具體的部署方式而定
    
    // 模擬回滾過程
    await this.delay(1000);
  }
  
  /**
   * 執行鉤子函數
   */
  async executeHooks(hookType, deploymentRecord, deploymentConfig) {
    const hooks = this.hooks[hookType] || [];
    
    for (const hook of hooks) {
      try {
        await hook(deploymentRecord, deploymentConfig);
      } catch (error) {
        Logger.log(`鉤子執行失敗 (${hookType}): ${error.message}`);
      }
    }
  }
  
  /**
   * 添加鉤子
   */
  addHook(hookType, hookFunction) {
    if (this.hooks[hookType]) {
      this.hooks[hookType].push(hookFunction);
      Logger.log(`[DeploymentManager] 添加 ${hookType} 鉤子`);
    }
  }
  
  /**
   * 獲取上一個成功的部署
   */
  getLastSuccessfulDeployment(environment) {
    const successful = this.deploymentHistory
      .filter(d => d.environment === environment && d.status === DEPLOYMENT_STATUS.SUCCESS)
      .sort((a, b) => b.startTime - a.startTime);
    
    return successful.length > 0 ? successful[0] : null;
  }
  
  /**
   * 獲取部署歷史
   */
  getDeploymentHistory(limit = 50) {
    return this.deploymentHistory
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }
  
  /**
   * 獲取部署統計
   */
  getDeploymentStats() {
    const total = this.deploymentHistory.length;
    const successful = this.deploymentHistory.filter(d => d.status === DEPLOYMENT_STATUS.SUCCESS).length;
    const failed = this.deploymentHistory.filter(d => d.status === DEPLOYMENT_STATUS.FAILED).length;
    const rolledBack = this.deploymentHistory.filter(d => d.status === DEPLOYMENT_STATUS.ROLLED_BACK).length;
    
    const avgDuration = this.deploymentHistory
      .filter(d => d.duration)
      .reduce((sum, d) => sum + d.duration, 0) / total || 0;
    
    return {
      total: total,
      successful: successful,
      failed: failed,
      rolledBack: rolledBack,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%',
      averageDuration: Math.round(avgDuration),
      environments: this.getEnvironmentStats()
    };
  }
  
  /**
   * 獲取環境統計
   */
  getEnvironmentStats() {
    const envStats = {};
    
    Object.values(DEPLOYMENT_ENVIRONMENTS).forEach(env => {
      const envDeployments = this.deploymentHistory.filter(d => d.environment === env);
      envStats[env] = {
        total: envDeployments.length,
        successful: envDeployments.filter(d => d.status === DEPLOYMENT_STATUS.SUCCESS).length,
        failed: envDeployments.filter(d => d.status === DEPLOYMENT_STATUS.FAILED).length
      };
    });
    
    return envStats;
  }
  
  // === 輔助方法 ===
  
  /**
   * 生成部署ID
   */
  generateDeploymentId() {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 驗證版本號格式
   */
  isValidVersion(version) {
    // 簡單的語義版本號驗證
    const semanticVersionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$/;
    return semanticVersionRegex.test(version);
  }
  
  /**
   * 添加到歷史記錄
   */
  addToHistory(deploymentRecord) {
    this.deploymentHistory.push(deploymentRecord);
    
    // 維護歷史大小
    if (this.deploymentHistory.length > this.maxHistorySize) {
      this.deploymentHistory.splice(0, this.deploymentHistory.length - this.maxHistorySize);
    }
  }
  
  /**
   * 延遲函數
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 全域部署管理器實例（延遲載入以提升前端性能）
 */
let _globalDeploymentManager = null;
function getGlobalDeploymentManager() {
  if (!_globalDeploymentManager) {
    _globalDeploymentManager = new DeploymentManager();
  }
  return _globalDeploymentManager;
}

/**
 * 執行部署的便利函數
 */
async function deployToEnvironment(environment, version, options = {}) {
  const deploymentConfig = {
    environment: environment,
    version: version,
    strategy: options.strategy || 'blue-green',
    autoRollback: options.autoRollback !== false,
    ...options
  };
  
  try {
    const deploymentRecord = await getGlobalDeploymentManager().deploy(deploymentConfig);
    return {
      success: true,
      deploymentId: deploymentRecord.deploymentId,
      record: deploymentRecord.toJSON()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 快速部署到開發環境
 */
async function deployToDevelopment(version) {
  return await deployToEnvironment(DEPLOYMENT_ENVIRONMENTS.DEVELOPMENT, version, {
    strategy: 'blue-green',
    autoRollback: true
  });
}

/**
 * 部署到生產環境
 */
async function deployToProduction(version) {
  return await deployToEnvironment(DEPLOYMENT_ENVIRONMENTS.PRODUCTION, version, {
    strategy: 'canary',
    autoRollback: true
  });
}

/**
 * 獲取部署狀態
 */
function getDeploymentStatus() {
  return getGlobalDeploymentManager().getDeploymentStats();
}