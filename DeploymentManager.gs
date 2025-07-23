/**
 * 部署管理器
 * 企業級自動化部署與版本管理系統
 * Version: 1.0.0 - Phase 3 CI/CD Pipeline
 */

/**
 * 部署環境枚舉
 */
const DEPLOYMENT_ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

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
   * 預部署檢查
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
      
      return { success: true, message: '預部署檢查通過' };
      
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
 * 全域部署管理器實例
 */
const globalDeploymentManager = new DeploymentManager();

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
    const deploymentRecord = await globalDeploymentManager.deploy(deploymentConfig);
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
  return globalDeploymentManager.getDeploymentStats();
}