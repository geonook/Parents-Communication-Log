/**
 * 健康檢查服務
 * 企業級系統健康監控與診斷服務 - Phase 3 CI/CD 監控基礎設施
 * 與 MetricsCollector 和現有 CI/CD 組件深度整合
 * Version: 1.0.0
 */

/**
 * 健康狀態枚舉
 */
const HEALTH_STATUS = {
  HEALTHY: 'HEALTHY',       // 系統正常運行
  DEGRADED: 'DEGRADED',     // 系統運行但性能下降
  UNHEALTHY: 'UNHEALTHY',   // 系統異常，需要關注
  CRITICAL: 'CRITICAL'      // 系統嚴重故障，需要立即處理
};

/**
 * 健康檢查類別枚舉
 */
const HEALTH_CATEGORIES = {
  SYSTEM: 'system',             // 系統健康
  SERVICE: 'service',           // 服務健康
  DATA: 'data',                 // 數據健康
  INTEGRATION: 'integration',   // 整合健康
  PERFORMANCE: 'performance'    // 性能健康
};

/**
 * 健康檢查嚴重度枚舉
 */
const HEALTH_SEVERITY = {
  LOW: 'low',           // 低嚴重度
  MEDIUM: 'medium',     // 中等嚴重度
  HIGH: 'high',         // 高嚴重度
  CRITICAL: 'critical'  // 關鍵嚴重度
};

/**
 * 健康檢查定義類
 */
class HealthCheck {
  constructor(name, category, checkFunction, options = {}) {
    this.name = name;
    this.category = category;
    this.checkFunction = checkFunction;
    this.description = options.description || '';
    this.severity = options.severity || HEALTH_SEVERITY.MEDIUM;
    this.timeout = options.timeout || 5000; // 5秒超時
    this.interval = options.interval || 60000; // 1分鐘間隔
    this.enabled = options.enabled !== false;
    this.dependencies = options.dependencies || [];
    this.thresholds = options.thresholds || {};
    this.tags = options.tags || {};
    this.createdAt = new Date().toISOString();
    this.lastExecuted = null;
    this.executionCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
  }
  
  /**
   * 執行健康檢查
   */
  async execute() {
    if (!this.enabled) {
      return this.createSkippedResult('Health check is disabled');
    }
    
    const startTime = Date.now();
    this.executionCount++;
    this.lastExecuted = new Date().toISOString();
    
    try {
      // 設置超時控制
      const result = await this.executeWithTimeout();
      
      if (result.status === HEALTH_STATUS.HEALTHY) {
        this.successCount++;
      } else {
        this.failureCount++;
      }
      
      return {
        ...result,
        checkName: this.name,
        category: this.category,
        severity: this.severity,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          executionCount: this.executionCount,
          successRate: this.getSuccessRate()
        }
      };
      
    } catch (error) {
      this.failureCount++;
      return this.createErrorResult(error, Date.now() - startTime);
    }
  }
  
  /**
   * 帶超時的執行
   */
  async executeWithTimeout() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Health check timeout after ${this.timeout}ms`));
      }, this.timeout);
      
      try {
        const result = this.checkFunction(this.thresholds, this.tags);
        clearTimeout(timer);
        
        // 如果是同步函數直接返回結果
        if (result && typeof result.then === 'function') {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }
  
  /**
   * 創建錯誤結果
   */
  createErrorResult(error, executionTime) {
    return {
      checkName: this.name,
      category: this.category,
      severity: this.severity,
      status: HEALTH_STATUS.CRITICAL,
      message: `Health check failed: ${error.message}`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      executionTime: executionTime,
      timestamp: new Date().toISOString(),
      metadata: {
        executionCount: this.executionCount,
        successRate: this.getSuccessRate()
      }
    };
  }
  
  /**
   * 創建跳過結果
   */
  createSkippedResult(reason) {
    return {
      checkName: this.name,
      category: this.category,
      severity: this.severity,
      status: HEALTH_STATUS.HEALTHY,
      message: reason,
      skipped: true,
      executionTime: 0,
      timestamp: new Date().toISOString(),
      metadata: {
        executionCount: this.executionCount,
        successRate: this.getSuccessRate()
      }
    };
  }
  
  /**
   * 獲取成功率
   */
  getSuccessRate() {
    if (this.executionCount === 0) return 1.0;
    return this.successCount / this.executionCount;
  }
  
  /**
   * 重置統計
   */
  resetStats() {
    this.executionCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.lastExecuted = null;
  }
}

/**
 * 健康報告類
 */
class HealthReport {
  constructor() {
    this.timestamp = new Date().toISOString();
    this.overallStatus = HEALTH_STATUS.HEALTHY;
    this.checks = [];
    this.summary = {
      total: 0,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      critical: 0,
      skipped: 0
    };
    this.categories = {};
    this.alerts = [];
    this.recommendations = [];
  }
  
  /**
   * 添加檢查結果
   */
  addCheckResult(result) {
    this.checks.push(result);
    this.updateSummary(result);
    this.updateCategories(result);
    this.updateOverallStatus(result);
  }
  
  /**
   * 更新摘要統計
   */
  updateSummary(result) {
    this.summary.total++;
    
    if (result.skipped) {
      this.summary.skipped++;
      return;
    }
    
    switch (result.status) {
      case HEALTH_STATUS.HEALTHY:
        this.summary.healthy++;
        break;
      case HEALTH_STATUS.DEGRADED:
        this.summary.degraded++;
        break;
      case HEALTH_STATUS.UNHEALTHY:
        this.summary.unhealthy++;
        break;
      case HEALTH_STATUS.CRITICAL:
        this.summary.critical++;
        break;
    }
  }
  
  /**
   * 更新類別統計
   */
  updateCategories(result) {
    const category = result.category;
    if (!this.categories[category]) {
      this.categories[category] = {
        total: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        critical: 0,
        status: HEALTH_STATUS.HEALTHY
      };
    }
    
    this.categories[category].total++;
    
    if (!result.skipped) {
      this.categories[category][result.status.toLowerCase()]++;
      
      // 更新類別狀態 - 取最差狀態
      if (this.getStatusPriority(result.status) > this.getStatusPriority(this.categories[category].status)) {
        this.categories[category].status = result.status;
      }
    }
  }
  
  /**
   * 更新整體狀態
   */
  updateOverallStatus(result) {
    if (!result.skipped && this.getStatusPriority(result.status) > this.getStatusPriority(this.overallStatus)) {
      this.overallStatus = result.status;
    }
  }
  
  /**
   * 獲取狀態優先級（用於比較）
   */
  getStatusPriority(status) {
    const priority = {
      [HEALTH_STATUS.HEALTHY]: 0,
      [HEALTH_STATUS.DEGRADED]: 1,
      [HEALTH_STATUS.UNHEALTHY]: 2,
      [HEALTH_STATUS.CRITICAL]: 3
    };
    return priority[status] || 0;
  }
  
  /**
   * 添加警報
   */
  addAlert(alert) {
    this.alerts.push({
      ...alert,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 添加建議
   */
  addRecommendation(recommendation) {
    this.recommendations.push({
      ...recommendation,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 生成健康分數 (0-100)
   */
  getHealthScore() {
    if (this.summary.total === 0) return 100;
    
    const weights = {
      healthy: 100,
      degraded: 70,
      unhealthy: 30,
      critical: 0,
      skipped: 90 // 跳過的檢查給予較高分數但不是滿分
    };
    
    let totalScore = 0;
    Object.keys(weights).forEach(status => {
      totalScore += this.summary[status] * weights[status];
    });
    
    return Math.round(totalScore / this.summary.total);
  }
  
  /**
   * 轉換為 JSON
   */
  toJSON() {
    return {
      timestamp: this.timestamp,
      overallStatus: this.overallStatus,
      healthScore: this.getHealthScore(),
      summary: this.summary,
      categories: this.categories,
      checks: this.checks,
      alerts: this.alerts,
      recommendations: this.recommendations
    };
  }
}

/**
 * 警報管理器
 */
class AlertManager {
  constructor() {
    this.alertRules = new Map();
    this.alertHistory = [];
    this.suppressionRules = new Map();
    this.eventBus = globalEventBus;
  }
  
  /**
   * 註冊警報規則
   */
  registerAlertRule(name, rule) {
    this.alertRules.set(name, {
      ...rule,
      createdAt: new Date().toISOString()
    });
  }
  
  /**
   * 評估健康檢查結果並生成警報
   */
  evaluateHealthResult(result) {
    const alerts = [];
    
    this.alertRules.forEach((rule, name) => {
      if (this.shouldTriggerAlert(result, rule)) {
        const alert = this.createAlert(name, result, rule);
        
        if (!this.isAlertSuppressed(alert)) {
          alerts.push(alert);
          this.alertHistory.push(alert);
          this.emitAlertEvent(alert);
        }
      }
    });
    
    return alerts;
  }
  
  /**
   * 檢查是否應該觸發警報
   */
  shouldTriggerAlert(result, rule) {
    // 檢查狀態條件
    if (rule.statusConditions && !rule.statusConditions.includes(result.status)) {
      return false;
    }
    
    // 檢查類別條件
    if (rule.categoryConditions && !rule.categoryConditions.includes(result.category)) {
      return false;
    }
    
    // 檢查嚴重度條件
    if (rule.severityConditions && !rule.severityConditions.includes(result.severity)) {
      return false;
    }
    
    // 檢查閾值條件
    if (rule.thresholdConditions) {
      return this.evaluateThresholdConditions(result, rule.thresholdConditions);
    }
    
    return true;
  }
  
  /**
   * 評估閾值條件
   */
  evaluateThresholdConditions(result, conditions) {
    for (const condition of conditions) {
      const value = this.extractValue(result, condition.field);
      if (value === null || value === undefined) {
        continue;
      }
      
      switch (condition.operator) {
        case '>':
          if (value > condition.value) return true;
          break;
        case '<':
          if (value < condition.value) return true;
          break;
        case '>=':
          if (value >= condition.value) return true;
          break;
        case '<=':
          if (value <= condition.value) return true;
          break;
        case '==':
          if (value == condition.value) return true;
          break;
        case '!=':
          if (value != condition.value) return true;
          break;
      }
    }
    return false;
  }
  
  /**
   * 從結果中提取值
   */
  extractValue(result, field) {
    const parts = field.split('.');
    let value = result;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return null;
      }
    }
    return value;
  }
  
  /**
   * 創建警報
   */
  createAlert(ruleName, result, rule) {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleName: ruleName,
      severity: rule.severity || result.severity,
      title: rule.title || `Health Check Alert: ${result.checkName}`,
      message: rule.messageTemplate ? 
        this.interpolateMessage(rule.messageTemplate, result) : 
        `Health check ${result.checkName} reported status: ${result.status}`,
      checkName: result.checkName,
      category: result.category,
      status: result.status,
      timestamp: new Date().toISOString(),
      metadata: {
        result: result,
        rule: rule
      }
    };
  }
  
  /**
   * 插值警報消息
   */
  interpolateMessage(template, result) {
    return template.replace(/\${([^}]+)}/g, (match, field) => {
      return this.extractValue(result, field) || match;
    });
  }
  
  /**
   * 檢查警報是否被抑制
   */
  isAlertSuppressed(alert) {
    const now = Date.now();
    
    this.suppressionRules.forEach((rule, name) => {
      if (rule.expiresAt && new Date(rule.expiresAt).getTime() < now) {
        this.suppressionRules.delete(name);
      }
    });
    
    for (const [name, rule] of this.suppressionRules) {
      if (this.matchesSuppressionRule(alert, rule)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 匹配抑制規則
   */
  matchesSuppressionRule(alert, rule) {
    if (rule.checkNames && !rule.checkNames.includes(alert.checkName)) {
      return false;
    }
    
    if (rule.categories && !rule.categories.includes(alert.category)) {
      return false;
    }
    
    if (rule.severities && !rule.severities.includes(alert.severity)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 發送警報事件
   */
  emitAlertEvent(alert) {
    if (this.eventBus) {
      this.eventBus.publish('health.alert', {
        alert: alert,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * 添加抑制規則
   */
  addSuppressionRule(name, rule) {
    this.suppressionRules.set(name, {
      ...rule,
      createdAt: new Date().toISOString()
    });
  }
  
  /**
   * 移除抑制規則
   */
  removeSuppressionRule(name) {
    return this.suppressionRules.delete(name);
  }
  
  /**
   * 獲取警報歷史
   */
  getAlertHistory(options = {}) {
    let history = [...this.alertHistory];
    
    if (options.since) {
      const sinceTime = new Date(options.since);
      history = history.filter(alert => new Date(alert.timestamp) >= sinceTime);
    }
    
    if (options.severity) {
      history = history.filter(alert => alert.severity === options.severity);
    }
    
    if (options.category) {
      history = history.filter(alert => alert.category === options.category);
    }
    
    if (options.limit) {
      history = history.slice(-options.limit);
    }
    
    return history;
  }
}

/**
 * 健康歷史記錄管理器
 */
class HealthHistory {
  constructor() {
    this.reports = [];
    this.maxReports = 1000; // 最大保存報告數
    this.cache = globalCache;
  }
  
  /**
   * 添加健康報告
   */
  addReport(report) {
    this.reports.push(report);
    
    // 維護報告數量限制
    if (this.reports.length > this.maxReports) {
      this.reports.splice(0, this.reports.length - this.maxReports);
    }
    
    // 更新快取
    this.updateCache(report);
  }
  
  /**
   * 獲取歷史報告
   */
  getHistory(options = {}) {
    let history = [...this.reports];
    
    if (options.since) {
      const sinceTime = new Date(options.since);
      history = history.filter(report => new Date(report.timestamp) >= sinceTime);
    }
    
    if (options.category) {
      history = history.filter(report => 
        report.categories && report.categories[options.category]
      );
    }
    
    if (options.status) {
      history = history.filter(report => report.overallStatus === options.status);
    }
    
    if (options.limit) {
      history = history.slice(-options.limit);
    }
    
    return history;
  }
  
  /**
   * 獲取健康趨勢
   */
  getHealthTrend(options = {}) {
    const history = this.getHistory(options);
    const trend = {
      timestamps: [],
      healthScores: [],
      overallStatuses: [],
      categoryTrends: {}
    };
    
    history.forEach(report => {
      trend.timestamps.push(report.timestamp);
      trend.healthScores.push(report.healthScore || 0);
      trend.overallStatuses.push(report.overallStatus);
      
      // 記錄類別趨勢
      Object.keys(report.categories || {}).forEach(category => {
        if (!trend.categoryTrends[category]) {
          trend.categoryTrends[category] = {
            timestamps: [],
            statuses: [],
            healthyCounts: [],
            totalCounts: []
          };
        }
        
        const categoryData = report.categories[category];
        trend.categoryTrends[category].timestamps.push(report.timestamp);
        trend.categoryTrends[category].statuses.push(categoryData.status);
        trend.categoryTrends[category].healthyCounts.push(categoryData.healthy || 0);
        trend.categoryTrends[category].totalCounts.push(categoryData.total || 0);
      });
    });
    
    return trend;
  }
  
  /**
   * 獲取統計資訊
   */
  getStats() {
    if (this.reports.length === 0) {
      return {
        totalReports: 0,
        averageHealthScore: 0,
        statusDistribution: {},
        categoryStats: {}
      };
    }
    
    const stats = {
      totalReports: this.reports.length,
      firstReport: this.reports[0].timestamp,
      lastReport: this.reports[this.reports.length - 1].timestamp,
      averageHealthScore: 0,
      statusDistribution: {},
      categoryStats: {}
    };
    
    let totalHealthScore = 0;
    
    this.reports.forEach(report => {
      totalHealthScore += report.healthScore || 0;
      
      // 統計狀態分佈
      const status = report.overallStatus;
      stats.statusDistribution[status] = (stats.statusDistribution[status] || 0) + 1;
      
      // 統計類別資訊
      Object.keys(report.categories || {}).forEach(category => {
        if (!stats.categoryStats[category]) {
          stats.categoryStats[category] = {
            totalReports: 0,
            averageHealthy: 0,
            statusDistribution: {}
          };
        }
        
        const categoryData = report.categories[category];
        const categoryStat = stats.categoryStats[category];
        
        categoryStat.totalReports++;
        categoryStat.averageHealthy += (categoryData.healthy || 0) / (categoryData.total || 1);
        
        const categoryStatus = categoryData.status;
        categoryStat.statusDistribution[categoryStatus] = 
          (categoryStat.statusDistribution[categoryStatus] || 0) + 1;
      });
    });
    
    stats.averageHealthScore = totalHealthScore / this.reports.length;
    
    // 計算平均值
    Object.keys(stats.categoryStats).forEach(category => {
      const categoryStat = stats.categoryStats[category];
      categoryStat.averageHealthy /= categoryStat.totalReports;
    });
    
    return stats;
  }
  
  /**
   * 更新快取
   */
  updateCache(report) {
    if (!this.cache) return;
    
    // 快取最新報告
    this.cache.set('latest_health_report', report, 300); // 5分鐘快取
    
    // 快取健康分數趨勢
    const recentReports = this.reports.slice(-10); // 最近10個報告
    const healthScoreTrend = recentReports.map(r => ({
      timestamp: r.timestamp,
      score: r.healthScore || 0,
      status: r.overallStatus
    }));
    this.cache.set('health_score_trend', healthScoreTrend, 600); // 10分鐘快取
  }
  
  /**
   * 清理過期報告
   */
  cleanup(retentionDays = 30) {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - retentionDays);
    
    this.reports = this.reports.filter(report => 
      new Date(report.timestamp) > cutoffTime
    );
  }
}

/**
 * 健康檢查服務主類
 */
class HealthCheckService {
  constructor() {
    this.healthChecks = new Map();
    this.alertManager = new AlertManager();
    this.healthHistory = new HealthHistory();
    this.eventBus = globalEventBus;
    this.metricsCollector = globalMetricsCollector;
    this.cache = globalCache;
    this.errorHandler = ErrorHandler;
    
    this.isRunning = false;
    this.checkInterval = 60000; // 1分鐘間隔
    this.checkTimer = null;
    
    this.initializeDefaultChecks();
    this.setupEventSubscriptions();
  }
  
  /**
   * 初始化預設健康檢查
   */
  initializeDefaultChecks() {
    // 系統健康檢查
    this.registerHealthCheck(new HealthCheck(
      'system_memory_usage',
      HEALTH_CATEGORIES.SYSTEM,
      this.checkSystemMemory.bind(this),
      {
        description: '檢查系統記憶體使用量',
        severity: HEALTH_SEVERITY.HIGH,
        thresholds: { warning: 80000000, critical: 100000000 }
      }
    ));
    
    this.registerHealthCheck(new HealthCheck(
      'system_response_time',
      HEALTH_CATEGORIES.PERFORMANCE,
      this.checkResponseTime.bind(this),
      {
        description: '檢查系統響應時間',
        severity: HEALTH_SEVERITY.MEDIUM,
        thresholds: { warning: 1000, critical: 5000 }
      }
    ));
    
    // 服務健康檢查
    this.registerHealthCheck(new HealthCheck(
      'eventbus_connectivity',
      HEALTH_CATEGORIES.SERVICE,
      this.checkEventBusConnectivity.bind(this),
      {
        description: '檢查事件總線連接性',
        severity: HEALTH_SEVERITY.HIGH
      }
    ));
    
    this.registerHealthCheck(new HealthCheck(
      'metrics_collector_status',
      HEALTH_CATEGORIES.SERVICE,
      this.checkMetricsCollectorStatus.bind(this),
      {
        description: '檢查指標收集器狀態',
        severity: HEALTH_SEVERITY.MEDIUM
      }
    ));
    
    // 數據健康檢查
    this.registerHealthCheck(new HealthCheck(
      'spreadsheet_connectivity',
      HEALTH_CATEGORIES.DATA,
      this.checkSpreadsheetConnectivity.bind(this),
      {
        description: '檢查試算表連接性',
        severity: HEALTH_SEVERITY.CRITICAL
      }
    ));
    
    this.registerHealthCheck(new HealthCheck(
      'cache_performance',
      HEALTH_CATEGORIES.PERFORMANCE,
      this.checkCachePerformance.bind(this),
      {
        description: '檢查快取性能',
        severity: HEALTH_SEVERITY.LOW
      }
    ));
    
    // 設置預設警報規則
    this.setupDefaultAlertRules();
    
    Logger.log('[HealthCheckService] 預設健康檢查初始化完成');
  }
  
  /**
   * 設置預設警報規則
   */
  setupDefaultAlertRules() {
    // 關鍵狀態警報
    this.alertManager.registerAlertRule('critical_status_alert', {
      statusConditions: [HEALTH_STATUS.CRITICAL],
      severity: HEALTH_SEVERITY.CRITICAL,
      title: 'Critical Health Check Failure',
      messageTemplate: 'Health check ${checkName} is in critical state: ${message}'
    });
    
    // 性能警報
    this.alertManager.registerAlertRule('performance_degradation', {
      categoryConditions: [HEALTH_CATEGORIES.PERFORMANCE],
      statusConditions: [HEALTH_STATUS.UNHEALTHY, HEALTH_STATUS.CRITICAL],
      severity: HEALTH_SEVERITY.HIGH,
      title: 'Performance Degradation Detected',
      messageTemplate: 'Performance issue detected in ${checkName}: ${message}'
    });
    
    // 服務可用性警報
    this.alertManager.registerAlertRule('service_unavailable', {
      categoryConditions: [HEALTH_CATEGORIES.SERVICE],
      statusConditions: [HEALTH_STATUS.UNHEALTHY, HEALTH_STATUS.CRITICAL],
      severity: HEALTH_SEVERITY.HIGH,
      title: 'Service Unavailability',
      messageTemplate: 'Service ${checkName} is unavailable: ${message}'
    });
  }
  
  /**
   * 設置事件訂閱
   */
  setupEventSubscriptions() {
    if (this.eventBus) {
      // 訂閱系統事件
      this.eventBus.subscribe('system.performance', (event) => {
        // 觸發性能檢查
        this.triggerHealthCheck('system_response_time');
      });
      
      // 訂閱錯誤事件
      this.eventBus.subscribe('error.occurred', (event) => {
        // 記錄錯誤指標並觸發相關檢查
        if (this.metricsCollector) {
          this.metricsCollector.recordMetric('error_count', 1, {
            category: event.data.category,
            level: event.data.level
          });
        }
      });
      
      Logger.log('[HealthCheckService] 事件訂閱設置完成');
    }
  }
  
  /**
   * 註冊健康檢查
   */
  registerHealthCheck(healthCheck) {
    if (!(healthCheck instanceof HealthCheck)) {
      throw new Error('健康檢查必須是 HealthCheck 實例');
    }
    
    this.healthChecks.set(healthCheck.name, healthCheck);
    Logger.log(`[HealthCheckService] 註冊健康檢查: ${healthCheck.name}`);
  }
  
  /**
   * 移除健康檢查
   */
  unregisterHealthCheck(name) {
    return this.healthChecks.delete(name);
  }
  
  /**
   * 啟用/禁用健康檢查
   */
  setHealthCheckEnabled(name, enabled) {
    const healthCheck = this.healthChecks.get(name);
    if (healthCheck) {
      healthCheck.enabled = enabled;
      Logger.log(`[HealthCheckService] ${enabled ? '啟用' : '禁用'}健康檢查: ${name}`);
    }
  }
  
  /**
   * 執行單個健康檢查
   */
  async executeHealthCheck(name) {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) {
      throw new Error(`健康檢查不存在: ${name}`);
    }
    
    try {
      const result = await healthCheck.execute();
      
      // 記錄指標
      if (this.metricsCollector) {
        this.metricsCollector.recordMetric('health_check_execution_time', result.executionTime, {
          checkName: name,
          category: result.category,
          status: result.status
        });
        
        this.metricsCollector.recordMetric('health_check_status', 
          result.status === HEALTH_STATUS.HEALTHY ? 1 : 0, {
          checkName: name,
          category: result.category
        });
      }
      
      // 評估警報
      const alerts = this.alertManager.evaluateHealthResult(result);
      
      // 發送健康檢查完成事件
      if (this.eventBus) {
        this.eventBus.publish('health.check.completed', {
          result: result,
          alerts: alerts
        });
      }
      
      return result;
      
    } catch (error) {
      this.errorHandler.handle('HealthCheckService.executeHealthCheck', error, 
        ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
      throw error;
    }
  }
  
  /**
   * 執行所有健康檢查
   */
  async executeAllHealthChecks() {
    const report = new HealthReport();
    const results = [];
    
    Logger.log('[HealthCheckService] 開始執行所有健康檢查');
    
    for (const [name, healthCheck] of this.healthChecks) {
      try {
        const result = await this.executeHealthCheck(name);
        results.push(result);
        report.addCheckResult(result);
      } catch (error) {
        Logger.log(`[HealthCheckService] 健康檢查失敗: ${name} - ${error.message}`);
        
        // 創建錯誤結果
        const errorResult = {
          checkName: name,
          category: healthCheck.category,
          severity: healthCheck.severity,
          status: HEALTH_STATUS.CRITICAL,
          message: `Failed to execute health check: ${error.message}`,
          error: { message: error.message },
          executionTime: 0,
          timestamp: new Date().toISOString()
        };
        
        results.push(errorResult);
        report.addCheckResult(errorResult);
      }
    }
    
    // 保存報告到歷史
    this.healthHistory.addReport(report);
    
    // 發送健康報告事件
    if (this.eventBus) {
      this.eventBus.publish('health.report.generated', {
        report: report.toJSON(),
        timestamp: new Date().toISOString()
      });
    }
    
    Logger.log(`[HealthCheckService] 健康檢查完成 - 整體狀態: ${report.overallStatus}`);
    
    return report;
  }
  
  /**
   * 觸發特定健康檢查
   */
  async triggerHealthCheck(name) {
    try {
      return await this.executeHealthCheck(name);
    } catch (error) {
      Logger.log(`[HealthCheckService] 觸發健康檢查失敗: ${name} - ${error.message}`);
      return null;
    }
  }
  
  /**
   * 開始定期健康檢查
   */
  startPeriodicChecks() {
    if (this.isRunning) {
      Logger.log('[HealthCheckService] 定期健康檢查已在運行中');
      return;
    }
    
    this.isRunning = true;
    
    this.checkTimer = setInterval(async () => {
      try {
        await this.executeAllHealthChecks();
      } catch (error) {
        Logger.log(`[HealthCheckService] 定期健康檢查錯誤: ${error.message}`);
      }
    }, this.checkInterval);
    
    Logger.log('[HealthCheckService] 開始定期健康檢查');
  }
  
  /**
   * 停止定期健康檢查
   */
  stopPeriodicChecks() {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    
    Logger.log('[HealthCheckService] 停止定期健康檢查');
  }
  
  /**
   * 獲取健康狀態
   */
  getHealthStatus() {
    const cacheKey = 'current_health_status';
    
    // 檢查快取
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    // 獲取最新報告
    const latestReport = this.healthHistory.reports[this.healthHistory.reports.length - 1];
    
    if (!latestReport) {
      const status = {
        overallStatus: HEALTH_STATUS.HEALTHY,
        message: 'No health checks have been performed yet',
        timestamp: new Date().toISOString(),
        healthScore: 100
      };
      
      if (this.cache) {
        this.cache.set(cacheKey, status, 60); // 1分鐘快取
      }
      
      return status;
    }
    
    const status = {
      overallStatus: latestReport.overallStatus,
      healthScore: latestReport.healthScore,
      summary: latestReport.summary,
      categories: latestReport.categories,
      timestamp: latestReport.timestamp,
      checksPerformed: latestReport.summary.total
    };
    
    if (this.cache) {
      this.cache.set(cacheKey, status, 60); // 1分鐘快取
    }
    
    return status;
  }
  
  /**
   * 獲取健康檢查清單
   */
  getHealthChecks() {
    const checks = [];
    
    this.healthChecks.forEach((healthCheck, name) => {
      checks.push({
        name: name,
        category: healthCheck.category,
        description: healthCheck.description,
        severity: healthCheck.severity,
        enabled: healthCheck.enabled,
        interval: healthCheck.interval,
        lastExecuted: healthCheck.lastExecuted,
        executionCount: healthCheck.executionCount,
        successRate: healthCheck.getSuccessRate()
      });
    });
    
    return checks;
  }
  
  /**
   * 獲取儀表板數據
   */
  getDashboardData() {
    const status = this.getHealthStatus();
    const history = this.healthHistory.getHistory({ limit: 24 }); // 最近24個報告
    const trend = this.healthHistory.getHealthTrend({ limit: 24 });
    const alerts = this.alertManager.getAlertHistory({ limit: 10 });
    
    return {
      currentStatus: status,
      trend: trend,
      recentAlerts: alerts,
      healthChecks: this.getHealthChecks(),
      statistics: this.healthHistory.getStats(),
      timestamp: new Date().toISOString()
    };
  }
  
  // === 健康檢查實現方法 ===
  
  /**
   * 檢查系統記憶體使用量
   */
  checkSystemMemory(thresholds) {
    try {
      // 估算記憶體使用量
      let memoryUsage = 0;
      
      if (this.metricsCollector && this.metricsCollector.timeSeriesManager) {
        this.metricsCollector.timeSeriesManager.timeSeriesData.forEach(series => {
          memoryUsage += series.length * 200; // 估算每個數據點200字節
        });
      }
      
      memoryUsage += this.healthChecks.size * 1000; // 每個健康檢查約1KB
      memoryUsage += this.healthHistory.reports.length * 5000; // 每個報告約5KB
      
      let status = HEALTH_STATUS.HEALTHY;
      let message = `Memory usage: ${Math.round(memoryUsage / 1024 / 1024 * 100) / 100} MB`;
      
      if (thresholds.critical && memoryUsage > thresholds.critical) {
        status = HEALTH_STATUS.CRITICAL;
        message += ' - Critical memory usage detected';
      } else if (thresholds.warning && memoryUsage > thresholds.warning) {
        status = HEALTH_STATUS.DEGRADED;
        message += ' - High memory usage detected';
      }
      
      return {
        status: status,
        message: message,
        data: {
          memoryUsage: memoryUsage,
          memoryUsageMB: Math.round(memoryUsage / 1024 / 1024 * 100) / 100
        }
      };
      
    } catch (error) {
      return {
        status: HEALTH_STATUS.CRITICAL,
        message: `Memory check failed: ${error.message}`,
        error: error.message
      };
    }
  }
  
  /**
   * 檢查系統響應時間
   */
  checkResponseTime(thresholds) {
    try {
      // 測試響應時間
      const startTime = Date.now();
      
      // 執行一個簡單的操作來測試響應時間
      const testData = Array.from({ length: 1000 }, (_, i) => i);
      const sum = testData.reduce((a, b) => a + b, 0);
      
      const responseTime = Date.now() - startTime;
      
      let status = HEALTH_STATUS.HEALTHY;
      let message = `Response time: ${responseTime}ms`;
      
      if (thresholds.critical && responseTime > thresholds.critical) {
        status = HEALTH_STATUS.CRITICAL;
        message += ' - Critical response time detected';
      } else if (thresholds.warning && responseTime > thresholds.warning) {
        status = HEALTH_STATUS.DEGRADED;
        message += ' - Slow response time detected';
      }
      
      return {
        status: status,
        message: message,
        data: {
          responseTime: responseTime,
          testResult: sum
        }
      };
      
    } catch (error) {
      return {
        status: HEALTH_STATUS.CRITICAL,
        message: `Response time check failed: ${error.message}`,
        error: error.message
      };
    }
  }
  
  /**
   * 檢查事件總線連接性
   */
  checkEventBusConnectivity() {
    try {
      if (!this.eventBus) {
        return {
          status: HEALTH_STATUS.CRITICAL,
          message: 'Event bus is not available'
        };
      }
      
      // 測試事件發布和訂閱
      let testPassed = false;
      const testEventType = 'health.connectivity.test';
      
      const testHandler = () => {
        testPassed = true;
      };
      
      this.eventBus.subscribe(testEventType, testHandler);
      this.eventBus.publish(testEventType, { test: true });
      this.eventBus.unsubscribe(testEventType, testHandler);
      
      return {
        status: testPassed ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNHEALTHY,
        message: testPassed ? 'Event bus is functioning properly' : 'Event bus connectivity test failed',
        data: {
          eventBusAvailable: !!this.eventBus,
          testPassed: testPassed
        }
      };
      
    } catch (error) {
      return {
        status: HEALTH_STATUS.CRITICAL,
        message: `Event bus check failed: ${error.message}`,
        error: error.message
      };
    }
  }
  
  /**
   * 檢查指標收集器狀態
   */
  checkMetricsCollectorStatus() {
    try {
      if (!this.metricsCollector) {
        return {
          status: HEALTH_STATUS.DEGRADED,
          message: 'Metrics collector is not available'
        };
      }
      
      const stats = this.metricsCollector.getStats();
      
      let status = HEALTH_STATUS.HEALTHY;
      let message = `Metrics collector is operational - ${stats.definitions.totalDefinitions} metrics defined`;
      
      if (stats.definitions.totalDefinitions === 0) {
        status = HEALTH_STATUS.DEGRADED;
        message = 'No metrics are defined in the collector';
      }
      
      return {
        status: status,
        message: message,
        data: {
          metricsCollectorAvailable: !!this.metricsCollector,
          isCollecting: stats.isCollecting,
          totalDefinitions: stats.definitions.totalDefinitions,
          totalDataPoints: stats.timeSeries.totalDataPoints
        }
      };
      
    } catch (error) {
      return {
        status: HEALTH_STATUS.CRITICAL,
        message: `Metrics collector check failed: ${error.message}`,
        error: error.message
      };
    }
  }
  
  /**
   * 檢查試算表連接性
   */
  checkSpreadsheetConnectivity() {
    try {
      // 嘗試獲取活動試算表
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      
      if (!spreadsheet) {
        return {
          status: HEALTH_STATUS.CRITICAL,
          message: 'No active spreadsheet found'
        };
      }
      
      const sheets = spreadsheet.getSheets();
      const sheetCount = sheets.length;
      
      return {
        status: HEALTH_STATUS.HEALTHY,
        message: `Spreadsheet connectivity verified - ${sheetCount} sheets available`,
        data: {
          spreadsheetId: spreadsheet.getId(),
          spreadsheetName: spreadsheet.getName(),
          sheetCount: sheetCount,
          sheetNames: sheets.map(sheet => sheet.getName())
        }
      };
      
    } catch (error) {
      return {
        status: HEALTH_STATUS.CRITICAL,
        message: `Spreadsheet connectivity check failed: ${error.message}`,
        error: error.message
      };
    }
  }
  
  /**
   * 檢查快取性能
   */
  checkCachePerformance() {
    try {
      if (!this.cache) {
        return {
          status: HEALTH_STATUS.DEGRADED,
          message: 'Cache is not available'
        };
      }
      
      // 測試快取性能
      const testKey = 'health_check_cache_test';
      const testValue = { timestamp: new Date().toISOString(), data: 'test' };
      
      const startTime = Date.now();
      
      // 測試寫入
      this.cache.set(testKey, testValue, 60);
      
      // 測試讀取
      const retrievedValue = this.cache.get(testKey);
      
      // 測試刪除
      this.cache.delete(testKey);
      
      const operationTime = Date.now() - startTime;
      
      const dataMatches = JSON.stringify(retrievedValue) === JSON.stringify(testValue);
      
      let status = HEALTH_STATUS.HEALTHY;
      let message = `Cache performance test completed in ${operationTime}ms`;
      
      if (!dataMatches) {
        status = HEALTH_STATUS.UNHEALTHY;
        message += ' - Data integrity issue detected';
      } else if (operationTime > 100) {
        status = HEALTH_STATUS.DEGRADED;
        message += ' - Slow cache performance detected';
      }
      
      return {
        status: status,
        message: message,
        data: {
          cacheAvailable: !!this.cache,
          operationTime: operationTime,
          dataIntegrityOk: dataMatches
        }
      };
      
    } catch (error) {
      return {
        status: HEALTH_STATUS.CRITICAL,
        message: `Cache performance check failed: ${error.message}`,
        error: error.message
      };
    }
  }
}

/**
 * 全域健康檢查服務實例
 */
const globalHealthCheckService = new HealthCheckService();

/**
 * 便利函數 - 執行健康檢查
 */
function executeHealthCheck(name) {
  return globalHealthCheckService.executeHealthCheck(name);
}

/**
 * 便利函數 - 執行所有健康檢查
 */
function executeAllHealthChecks() {
  return globalHealthCheckService.executeAllHealthChecks();
}

/**
 * 便利函數 - 獲取健康狀態
 */
function getHealthStatus() {
  return globalHealthCheckService.getHealthStatus();
}

/**
 * 便利函數 - 獲取健康儀表板數據
 */
function getHealthDashboardData() {
  return globalHealthCheckService.getDashboardData();
}

/**
 * 便利函數 - 開始定期健康檢查
 */
function startHealthMonitoring() {
  return globalHealthCheckService.startPeriodicChecks();
}

/**
 * 便利函數 - 停止定期健康檢查
 */
function stopHealthMonitoring() {
  return globalHealthCheckService.stopPeriodicChecks();
}