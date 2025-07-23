/**
 * CI/CD 協調器
 * 企業級 CI/CD Pipeline 整合核心 - Phase 3 完整實施
 * 整合 CodeQualityChecker、HealthCheckService、DeploymentManager
 * Version: 1.0.0
 */

/**
 * CI/CD Pipeline 階段枚舉
 */
const CICD_STAGES = {
  QUALITY_CHECK: 'quality_check',
  HEALTH_CHECK: 'health_check',
  PRE_DEPLOYMENT: 'pre_deployment',
  DEPLOYMENT: 'deployment',
  POST_DEPLOYMENT: 'post_deployment',
  VERIFICATION: 'verification'
};

/**
 * Pipeline 狀態枚舉
 */
const PIPELINE_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled'
};

/**
 * Pipeline 風險等級枚舉
 */
const RISK_LEVELS = {
  LOW: 'low',           // 風險低 (0-30)
  MEDIUM: 'medium',     // 風險中等 (31-60)
  HIGH: 'high',         // 風險高 (61-80)
  CRITICAL: 'critical'  // 風險關鍵 (81-100)
};

/**
 * CI/CD Pipeline 執行記錄類
 */
class CiCdPipelineRecord {
  constructor(pipelineId, environment, config) {
    this.pipelineId = pipelineId;
    this.environment = environment;
    this.config = config;
    this.status = PIPELINE_STATUS.PENDING;
    this.startTime = new Date();
    this.endTime = null;
    this.duration = null;
    this.stages = new Map();
    this.qualityResult = null;
    this.healthResult = null;
    this.deploymentResult = null;
    this.riskScore = 0;
    this.riskLevel = RISK_LEVELS.LOW;
    this.errors = [];
    this.warnings = [];
    this.metrics = {};
  }
  
  addStageResult(stage, result) {
    this.stages.set(stage, {
      ...result,
      timestamp: new Date().toISOString()
    });
  }
  
  setStatus(status) {
    this.status = status;
    if ([PIPELINE_STATUS.SUCCESS, PIPELINE_STATUS.FAILED, PIPELINE_STATUS.CANCELLED].includes(status)) {
      this.endTime = new Date();
      this.duration = this.endTime - this.startTime;
    }
  }
  
  calculateRiskScore() {
    let riskScore = 0;
    let factors = 0;
    
    // 品質風險 (40% 權重)
    if (this.qualityResult) {
      const qualityRisk = Math.max(0, 100 - this.qualityResult.overallScore);
      riskScore += qualityRisk * 0.4;
      factors++;
    }
    
    // 健康風險 (30% 權重)
    if (this.healthResult) {
      const healthRisk = Math.max(0, 100 - this.healthResult.overallScore);
      riskScore += healthRisk * 0.3;
      factors++;
    }
    
    // 環境風險 (20% 權重) - 生產環境風險更高
    const envRisk = this.environment === DEPLOYMENT_ENVIRONMENTS.PRODUCTION ? 30 : 
                   this.environment === DEPLOYMENT_ENVIRONMENTS.STAGING ? 15 : 5;
    riskScore += envRisk * 0.2;
    factors++;
    
    // 歷史風險 (10% 權重) - 基於過去部署成功率
    const historicalRisk = this.calculateHistoricalRisk();
    riskScore += historicalRisk * 0.1;
    factors++;
    
    this.riskScore = Math.round(riskScore);
    this.riskLevel = this.determineRiskLevel(this.riskScore);
    
    return this.riskScore;
  }
  
  calculateHistoricalRisk() {
    // 簡化版本 - 實際可以從部署歷史數據計算
    return 20; // 預設中等歷史風險
  }
  
  determineRiskLevel(score) {
    if (score <= 30) return RISK_LEVELS.LOW;
    if (score <= 60) return RISK_LEVELS.MEDIUM;
    if (score <= 80) return RISK_LEVELS.HIGH;
    return RISK_LEVELS.CRITICAL;
  }
  
  toJSON() {
    return {
      pipelineId: this.pipelineId,
      environment: this.environment,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      stages: Object.fromEntries(this.stages),
      qualityResult: this.qualityResult,
      healthResult: this.healthResult,
      deploymentResult: this.deploymentResult,
      riskScore: this.riskScore,
      riskLevel: this.riskLevel,
      errors: this.errors,
      warnings: this.warnings,
      metrics: this.metrics
    };
  }
}

/**
 * CI/CD 協調器主類
 */
class CiCdOrchestrator {
  constructor() {
    this.activeExecutions = new Map();
    this.executionHistory = [];
    this.hooks = new Map();
    this.config = {
      maxConcurrentExecutions: 5,
      defaultTimeout: 1800000, // 30 分鐘
      qualityGateRequired: true,
      healthCheckRequired: true,
      autoRollbackOnFailure: true
    };
    
    // 初始化事件監聽
    this.initializeEventListeners();
  }
  
  /**
   * 執行完整 CI/CD Pipeline
   */
  async executeDeploymentPipeline(environment, deploymentConfig, options = {}) {
    const pipelineId = this.generatePipelineId();
    const pipelineRecord = new CiCdPipelineRecord(pipelineId, environment, deploymentConfig);
    
    try {
      console.log(`🚀 Starting CI/CD Pipeline ${pipelineId} for ${environment}`);
      
      // 註冊執行記錄
      this.activeExecutions.set(pipelineId, pipelineRecord);
      pipelineRecord.setStatus(PIPELINE_STATUS.RUNNING);
      
      // 階段 1: 品質檢查
      const qualityResult = await this.executeQualityStage(pipelineRecord, deploymentConfig);
      if (!qualityResult.success) {
        return this.handlePipelineFailure(pipelineRecord, 'Quality gate failed', CICD_STAGES.QUALITY_CHECK);
      }
      
      // 階段 2: 健康檢查
      const healthResult = await this.executeHealthStage(pipelineRecord, deploymentConfig);
      if (!healthResult.success) {
        return this.handlePipelineFailure(pipelineRecord, 'Health check failed', CICD_STAGES.HEALTH_CHECK);
      }
      
      // 風險評估
      const riskScore = pipelineRecord.calculateRiskScore();
      if (riskScore > 80 && !options.forceDeployment) {
        return this.handlePipelineBlock(pipelineRecord, `Risk score too high: ${riskScore}`);
      }
      
      // 階段 3: 部署前檢查
      const preDeployResult = await this.executePreDeploymentStage(pipelineRecord, deploymentConfig);
      if (!preDeployResult.success) {
        return this.handlePipelineFailure(pipelineRecord, 'Pre-deployment check failed', CICD_STAGES.PRE_DEPLOYMENT);
      }
      
      // 階段 4: 部署執行
      const deploymentResult = await this.executeDeploymentStage(pipelineRecord, deploymentConfig);
      if (!deploymentResult.success) {
        return this.handleDeploymentFailure(pipelineRecord, deploymentResult.error);
      }
      
      // 階段 5: 部署後驗證
      const verificationResult = await this.executeVerificationStage(pipelineRecord, deploymentConfig);
      if (!verificationResult.success) {
        return this.handleVerificationFailure(pipelineRecord, verificationResult.error);
      }
      
      // Pipeline 成功完成
      return this.handlePipelineSuccess(pipelineRecord);
      
    } catch (error) {
      console.error(`❌ CI/CD Pipeline ${pipelineId} failed with error:`, error);
      return this.handlePipelineFailure(pipelineRecord, error.message, 'UNEXPECTED_ERROR');
    } finally {
      this.activeExecutions.delete(pipelineId);
      this.executionHistory.push(pipelineRecord);
      
      // 清理舊歷史記錄 (保留最近 100 筆)
      if (this.executionHistory.length > 100) {
        this.executionHistory = this.executionHistory.slice(-100);
      }
    }
  }
  
  /**
   * 階段 1: 品質檢查執行
   */
  async executeQualityStage(pipelineRecord, deploymentConfig) {
    console.log(`🔍 Executing quality checks for pipeline ${pipelineRecord.pipelineId}`);
    
    try {
      // 檢查全域品質檢查器是否存在
      if (typeof globalCodeQualityChecker === 'undefined') {
        throw new Error('GlobalCodeQualityChecker not available');
      }
      
      // 執行品質檢查
      const qualityResult = deploymentConfig.files ? 
        await globalCodeQualityChecker.batchCheckCodeQuality(deploymentConfig.files) :
        await globalCodeQualityChecker.performSystemQualityCheck();
      
      // 執行品質門禁
      const gateResult = globalCodeQualityChecker.runQualityGate(qualityResult, pipelineRecord.environment);
      
      // 記錄結果
      pipelineRecord.qualityResult = {
        overallScore: qualityResult.overallScore,
        grade: qualityResult.grade,
        gateResult: gateResult,
        issues: qualityResult.issuesSummary
      };
      
      pipelineRecord.addStageResult(CICD_STAGES.QUALITY_CHECK, {
        success: gateResult.passed,
        score: qualityResult.overallScore,
        grade: qualityResult.grade,
        blockerIssues: qualityResult.issuesSummary.blocker || 0,
        message: gateResult.passed ? 'Quality gate passed' : gateResult.message
      });
      
      return {
        success: gateResult.passed,
        result: qualityResult,
        message: gateResult.message
      };
      
    } catch (error) {
      console.error('Quality stage failed:', error);
      pipelineRecord.addStageResult(CICD_STAGES.QUALITY_CHECK, {
        success: false,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 階段 2: 健康檢查執行
   */
  async executeHealthStage(pipelineRecord, deploymentConfig) {
    console.log(`🏥 Executing health checks for pipeline ${pipelineRecord.pipelineId}`);
    
    try {
      // 檢查全域健康檢查服務是否存在
      if (typeof globalHealthCheckService === 'undefined') {
        throw new Error('GlobalHealthCheckService not available');
      }
      
      // 執行健康檢查
      const healthResults = await globalHealthCheckService.executeAllHealthChecks();
      const overallHealth = globalHealthCheckService.getHealthStatus();
      
      // 特殊的 CI/CD 健康檢查
      await this.executeCiCdSpecificHealthChecks(pipelineRecord);
      
      // 記錄結果
      pipelineRecord.healthResult = {
        overallStatus: overallHealth.overallStatus,
        overallScore: overallHealth.overallScore,
        categoryScores: overallHealth.categoryScores,
        failedChecks: healthResults.failed.length,
        totalChecks: healthResults.total
      };
      
      const isHealthy = overallHealth.overallStatus !== HEALTH_STATUS.CRITICAL;
      
      pipelineRecord.addStageResult(CICD_STAGES.HEALTH_CHECK, {
        success: isHealthy,
        status: overallHealth.overallStatus,
        score: overallHealth.overallScore,
        failedChecks: healthResults.failed.length,
        message: isHealthy ? 'System health acceptable for deployment' : 'System health critical - deployment blocked'
      });
      
      return {
        success: isHealthy,
        result: overallHealth,
        message: isHealthy ? 'Health checks passed' : 'System health critical'
      };
      
    } catch (error) {
      console.error('Health stage failed:', error);
      pipelineRecord.addStageResult(CICD_STAGES.HEALTH_CHECK, {
        success: false,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * CI/CD 特定健康檢查
   */
  async executeCiCdSpecificHealthChecks(pipelineRecord) {
    // 檢查近期部署失敗率
    const recentDeployments = this.executionHistory.slice(-10);
    const failureRate = recentDeployments.filter(r => r.status === PIPELINE_STATUS.FAILED).length / Math.max(recentDeployments.length, 1);
    
    if (failureRate > 0.5) { // 50% 失敗率
      pipelineRecord.warnings.push({
        type: 'HIGH_DEPLOYMENT_FAILURE_RATE',
        message: `Recent deployment failure rate: ${Math.round(failureRate * 100)}%`,
        severity: 'HIGH'
      });
    }
    
    // 檢查併發部署數量
    if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
      throw new Error('Maximum concurrent deployments reached');
    }
  }
  
  /**
   * 階段 3: 部署前檢查
   */
  async executePreDeploymentStage(pipelineRecord, deploymentConfig) {
    console.log(`⚙️ Executing pre-deployment checks for pipeline ${pipelineRecord.pipelineId}`);
    
    try {
      // 檢查部署管理器是否存在
      if (typeof globalDeploymentManager === 'undefined') {
        throw new Error('GlobalDeploymentManager not available');
      }
      
      // 執行預部署檢查
      const preCheckResult = await globalDeploymentManager.preDeploymentCheck(deploymentConfig);
      
      pipelineRecord.addStageResult(CICD_STAGES.PRE_DEPLOYMENT, {
        success: preCheckResult.success,
        message: preCheckResult.message,
        details: preCheckResult.details || {}
      });
      
      return preCheckResult;
      
    } catch (error) {
      console.error('Pre-deployment stage failed:', error);
      pipelineRecord.addStageResult(CICD_STAGES.PRE_DEPLOYMENT, {
        success: false,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 階段 4: 部署執行
   */
  async executeDeploymentStage(pipelineRecord, deploymentConfig) {
    console.log(`🚀 Executing deployment for pipeline ${pipelineRecord.pipelineId}`);
    
    try {
      // 執行部署
      const deploymentResult = await globalDeploymentManager.deploy(
        pipelineRecord.environment,
        deploymentConfig
      );
      
      pipelineRecord.deploymentResult = deploymentResult;
      pipelineRecord.addStageResult(CICD_STAGES.DEPLOYMENT, {
        success: deploymentResult.success,
        deploymentId: deploymentResult.deploymentId,
        message: deploymentResult.message || 'Deployment completed'
      });
      
      return deploymentResult;
      
    } catch (error) {
      console.error('Deployment stage failed:', error);
      pipelineRecord.addStageResult(CICD_STAGES.DEPLOYMENT, {
        success: false,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 階段 5: 部署後驗證
   */
  async executeVerificationStage(pipelineRecord, deploymentConfig) {
    console.log(`✅ Executing post-deployment verification for pipeline ${pipelineRecord.pipelineId}`);
    
    try {
      // 執行部署後驗證
      const verificationResult = await globalDeploymentManager.postDeploymentVerification(
        pipelineRecord.deploymentResult
      );
      
      pipelineRecord.addStageResult(CICD_STAGES.VERIFICATION, {
        success: verificationResult.success,
        message: verificationResult.message || 'Verification completed',
        details: verificationResult.details || {}
      });
      
      return verificationResult;
      
    } catch (error) {
      console.error('Verification stage failed:', error);
      pipelineRecord.addStageResult(CICD_STAGES.VERIFICATION, {
        success: false,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Pipeline 成功處理
   */
  handlePipelineSuccess(pipelineRecord) {
    console.log(`✅ CI/CD Pipeline ${pipelineRecord.pipelineId} completed successfully`);
    
    pipelineRecord.setStatus(PIPELINE_STATUS.SUCCESS);
    
    // 觸發成功事件
    this.triggerEvent('pipeline:success', pipelineRecord);
    
    return {
      success: true,
      pipelineId: pipelineRecord.pipelineId,
      status: PIPELINE_STATUS.SUCCESS,
      duration: pipelineRecord.duration,
      riskScore: pipelineRecord.riskScore,
      summary: this.generatePipelineSummary(pipelineRecord)
    };
  }
  
  /**
   * Pipeline 失敗處理
   */
  async handlePipelineFailure(pipelineRecord, error, stage) {
    console.error(`❌ CI/CD Pipeline ${pipelineRecord.pipelineId} failed at stage ${stage}: ${error}`);
    
    pipelineRecord.setStatus(PIPELINE_STATUS.FAILED);
    pipelineRecord.errors.push({
      stage: stage,
      message: error,
      timestamp: new Date().toISOString()
    });
    
    // 觸發失敗事件
    this.triggerEvent('pipeline:failed', pipelineRecord);
    
    return {
      success: false,
      pipelineId: pipelineRecord.pipelineId,
      status: PIPELINE_STATUS.FAILED,
      error: error,
      stage: stage,
      duration: pipelineRecord.duration,
      summary: this.generatePipelineSummary(pipelineRecord)
    };
  }
  
  /**
   * Pipeline 阻斷處理 (高風險)
   */
  handlePipelineBlock(pipelineRecord, reason) {
    console.warn(`⚠️ CI/CD Pipeline ${pipelineRecord.pipelineId} blocked: ${reason}`);
    
    pipelineRecord.setStatus(PIPELINE_STATUS.BLOCKED);
    
    // 觸發阻斷事件
    this.triggerEvent('pipeline:blocked', pipelineRecord);
    
    return {
      success: false,
      pipelineId: pipelineRecord.pipelineId,
      status: PIPELINE_STATUS.BLOCKED,
      reason: reason,
      riskScore: pipelineRecord.riskScore,
      riskLevel: pipelineRecord.riskLevel,
      summary: this.generatePipelineSummary(pipelineRecord)
    };
  }
  
  /**
   * 部署失敗處理 (考慮回滾)
   */
  async handleDeploymentFailure(pipelineRecord, error) {
    console.error(`💥 Deployment failed for pipeline ${pipelineRecord.pipelineId}: ${error}`);
    
    // 如果啟用自動回滾
    if (this.config.autoRollbackOnFailure && pipelineRecord.deploymentResult?.deploymentId) {
      try {
        console.log(`🔄 Attempting automatic rollback for pipeline ${pipelineRecord.pipelineId}`);
        
        const rollbackResult = await globalDeploymentManager.rollback(
          pipelineRecord.deploymentResult.deploymentId
        );
        
        pipelineRecord.addStageResult('ROLLBACK', {
          success: rollbackResult.success,
          message: rollbackResult.message || 'Automatic rollback completed'
        });
        
        if (rollbackResult.success) {
          console.log(`✅ Automatic rollback successful for pipeline ${pipelineRecord.pipelineId}`);
        }
        
      } catch (rollbackError) {
        console.error(`❌ Automatic rollback failed for pipeline ${pipelineRecord.pipelineId}:`, rollbackError);
        pipelineRecord.addStageResult('ROLLBACK', {
          success: false,
          error: rollbackError.message
        });
      }
    }
    
    return this.handlePipelineFailure(pipelineRecord, error, CICD_STAGES.DEPLOYMENT);
  }
  
  /**
   * 驗證失敗處理
   */
  async handleVerificationFailure(pipelineRecord, error) {
    console.error(`🔍 Verification failed for pipeline ${pipelineRecord.pipelineId}: ${error}`);
    
    // 驗證失敗時也可能需要回滾
    if (this.config.autoRollbackOnFailure) {
      return this.handleDeploymentFailure(pipelineRecord, `Verification failed: ${error}`);
    }
    
    return this.handlePipelineFailure(pipelineRecord, error, CICD_STAGES.VERIFICATION);
  }
  
  /**
   * 生成 Pipeline 摘要
   */
  generatePipelineSummary(pipelineRecord) {
    const completedStages = Array.from(pipelineRecord.stages.keys());
    const successfulStages = completedStages.filter(stage => 
      pipelineRecord.stages.get(stage).success
    );
    
    return {
      environment: pipelineRecord.environment,
      status: pipelineRecord.status,
      duration: pipelineRecord.duration,
      completedStages: completedStages.length,
      successfulStages: successfulStages.length,
      riskScore: pipelineRecord.riskScore,
      riskLevel: pipelineRecord.riskLevel,
      qualityScore: pipelineRecord.qualityResult?.overallScore,
      healthScore: pipelineRecord.healthResult?.overallScore,
      errors: pipelineRecord.errors.length,
      warnings: pipelineRecord.warnings.length
    };
  }
  
  /**
   * 獲取 Pipeline 狀態
   */
  getPipelineStatus(pipelineId) {
    const activePipeline = this.activeExecutions.get(pipelineId);
    if (activePipeline) {
      return activePipeline.toJSON();
    }
    
    const historicalPipeline = this.executionHistory.find(p => p.pipelineId === pipelineId);
    return historicalPipeline ? historicalPipeline.toJSON() : null;
  }
  
  /**
   * 獲取活躍 Pipeline 列表
   */
  getActivePipelines() {
    return Array.from(this.activeExecutions.values()).map(p => p.toJSON());
  }
  
  /**
   * 獲取 Pipeline 歷史
   */
  getPipelineHistory(limit = 50) {
    return this.executionHistory
      .slice(-limit)
      .map(p => p.toJSON())
      .reverse(); // 最新的在前面
  }
  
  /**
   * 取消 Pipeline 執行
   */
  cancelPipeline(pipelineId, reason = 'User cancelled') {
    const pipeline = this.activeExecutions.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found or not active`);
    }
    
    pipeline.setStatus(PIPELINE_STATUS.CANCELLED);
    pipeline.errors.push({
      stage: 'CANCELLATION',
      message: reason,
      timestamp: new Date().toISOString()
    });
    
    this.triggerEvent('pipeline:cancelled', pipeline);
    
    return {
      success: true,
      pipelineId: pipelineId,
      status: PIPELINE_STATUS.CANCELLED,
      reason: reason
    };
  }
  
  /**
   * 生成 Pipeline ID
   */
  generatePipelineId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `pipeline_${timestamp}_${random}`;
  }
  
  /**
   * 初始化事件監聽器
   */
  initializeEventListeners() {
    // 可以在這裡添加與其他系統的事件整合
  }
  
  /**
   * 觸發事件
   */
  triggerEvent(eventType, data) {
    // 事件總線整合
    if (typeof globalEventBus !== 'undefined') {
      globalEventBus.publish(eventType, data);
    }
    
    // Hook 執行
    const hooks = this.hooks.get(eventType) || [];
    hooks.forEach(hook => {
      try {
        hook(data);
      } catch (error) {
        console.error(`Hook execution failed for event ${eventType}:`, error);
      }
    });
  }
  
  /**
   * 註冊事件 Hook
   */
  addHook(eventType, hookFunction) {
    if (!this.hooks.has(eventType)) {
      this.hooks.set(eventType, []);
    }
    this.hooks.get(eventType).push(hookFunction);
  }
  
  /**
   * 獲取統計數據
   */
  getStatistics() {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter(p => p.status === PIPELINE_STATUS.SUCCESS).length;
    const failed = this.executionHistory.filter(p => p.status === PIPELINE_STATUS.FAILED).length;
    const blocked = this.executionHistory.filter(p => p.status === PIPELINE_STATUS.BLOCKED).length;
    
    const avgDuration = total > 0 ? 
      this.executionHistory.reduce((sum, p) => sum + (p.duration || 0), 0) / total : 0;
    
    const avgRiskScore = total > 0 ?
      this.executionHistory.reduce((sum, p) => sum + p.riskScore, 0) / total : 0;
    
    return {
      total: total,
      successful: successful,
      failed: failed,
      blocked: blocked,
      successRate: total > 0 ? (successful / total * 100).toFixed(2) : 0,
      avgDuration: Math.round(avgDuration),
      avgRiskScore: Math.round(avgRiskScore),
      activePipelines: this.activeExecutions.size,
      lastExecution: total > 0 ? this.executionHistory[total - 1].startTime : null
    };
  }
}

/**
 * 全域 CI/CD 協調器實例
 */
const globalCiCdOrchestrator = new CiCdOrchestrator();

/**
 * 便捷函數：執行開發環境部署
 */
function deployToDevelopment(deploymentConfig, options = {}) {
  return globalCiCdOrchestrator.executeDeploymentPipeline(
    DEPLOYMENT_ENVIRONMENTS.DEVELOPMENT,
    deploymentConfig,
    options
  );
}

/**
 * 便捷函數：執行測試環境部署
 */
function deployToStaging(deploymentConfig, options = {}) {
  return globalCiCdOrchestrator.executeDeploymentPipeline(
    DEPLOYMENT_ENVIRONMENTS.STAGING,
    deploymentConfig,
    options
  );
}

/**
 * 便捷函數：執行生產環境部署
 */
function deployToProduction(deploymentConfig, options = {}) {
  return globalCiCdOrchestrator.executeDeploymentPipeline(
    DEPLOYMENT_ENVIRONMENTS.PRODUCTION,
    deploymentConfig,
    options
  );
}

/**
 * 便捷函數：獲取 CI/CD 統計
 */
function getCiCdStatistics() {
  return globalCiCdOrchestrator.getStatistics();
}

/**
 * 便捷函數：獲取活躍部署
 */
function getActiveDeployments() {
  return globalCiCdOrchestrator.getActivePipelines();
}

/**
 * 便捷函數：獲取部署歷史
 */
function getDeploymentHistory(limit = 20) {
  return globalCiCdOrchestrator.getPipelineHistory(limit);
}

console.log('✅ CiCdOrchestrator loaded successfully - Enterprise CI/CD Pipeline Integration Ready');