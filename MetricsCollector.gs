/**
 * 指標收集器
 * 企業級指標收集與分析系統
 * Version: 1.0.0 - Phase 3 監控數據收集
 */

/**
 * 指標類型枚舉
 */
const METRIC_TYPES = {
  COUNTER: 'counter',      // 計數器 - 只增不減
  GAUGE: 'gauge',          // 量表 - 可增可減的瞬時值
  HISTOGRAM: 'histogram',  // 直方圖 - 分佈統計
  SUMMARY: 'summary'       // 摘要 - 統計摘要
};

/**
 * 指標類別枚舉
 */
const METRIC_CATEGORIES = {
  BUSINESS: 'business',           // 業務指標
  TECHNICAL: 'technical',         // 技術指標
  OPERATIONAL: 'operational',     // 運營指標
  PERFORMANCE: 'performance',     // 性能指標
  QUALITY: 'quality',            // 品質指標
  SECURITY: 'security'           // 安全指標
};

/**
 * 指標定義類
 */
class MetricDefinition {
  constructor(name, type, category, options = {}) {
    this.name = name;
    this.type = type;
    this.category = category;
    this.description = options.description || '';
    this.unit = options.unit || '';
    this.tags = options.tags || {};
    this.retentionDays = options.retentionDays || 30;
    this.aggregationRules = options.aggregationRules || ['avg', 'sum', 'count'];
    this.alertThresholds = options.alertThresholds || {};
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }
  
  /**
   * 驗證指標定義
   */
  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim() === '') {
      errors.push('指標名稱不能為空');
    }
    
    if (!Object.values(METRIC_TYPES).includes(this.type)) {
      errors.push(`無效的指標類型: ${this.type}`);
    }
    
    if (!Object.values(METRIC_CATEGORIES).includes(this.category)) {
      errors.push(`無效的指標類別: ${this.category}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * 更新指標定義
   */
  update(changes) {
    Object.keys(changes).forEach(key => {
      if (key !== 'name' && key !== 'createdAt') {
        this[key] = changes[key];
      }
    });
    this.updatedAt = new Date().toISOString();
  }
  
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      category: this.category,
      description: this.description,
      unit: this.unit,
      tags: this.tags,
      retentionDays: this.retentionDays,
      aggregationRules: this.aggregationRules,
      alertThresholds: this.alertThresholds,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

/**
 * 指標數據點類
 */
class MetricDataPoint {
  constructor(metricName, value, timestamp = null, tags = {}) {
    this.metricName = metricName;
    this.value = value;
    this.timestamp = timestamp || new Date().toISOString();
    this.tags = tags;
  }
  
  toJSON() {
    return {
      metricName: this.metricName,
      value: this.value,
      timestamp: this.timestamp,
      tags: this.tags
    };
  }
}

/**
 * 時間序列管理器
 */
class TimeSeriesManager {
  constructor() {
    this.timeSeriesData = new Map(); // metricName -> Array of DataPoints
    this.maxDataPoints = 10000; // 每個指標最大數據點數
  }
  
  /**
   * 添加數據點
   */
  addDataPoint(dataPoint) {
    const metricName = dataPoint.metricName;
    
    if (!this.timeSeriesData.has(metricName)) {
      this.timeSeriesData.set(metricName, []);
    }
    
    const series = this.timeSeriesData.get(metricName);
    series.push(dataPoint);
    
    // 維護數據點數量限制
    if (series.length > this.maxDataPoints) {
      series.splice(0, series.length - this.maxDataPoints);
    }
    
    // 按時間排序
    series.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
  
  /**
   * 獲取時間範圍內的數據
   */
  getDataInRange(metricName, startTime, endTime) {
    const series = this.timeSeriesData.get(metricName) || [];
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return series.filter(point => {
      const pointTime = new Date(point.timestamp);
      return pointTime >= start && pointTime <= end;
    });
  }
  
  /**
   * 獲取最近N個數據點
   */
  getRecentData(metricName, count = 100) {
    const series = this.timeSeriesData.get(metricName) || [];
    return series.slice(-count);
  }
  
  /**
   * 清理過期數據
   */
  cleanupExpiredData(metricDefinitions) {
    const now = new Date();
    
    metricDefinitions.forEach(definition => {
      const retentionMs = definition.retentionDays * 24 * 60 * 60 * 1000;
      const cutoffTime = new Date(now.getTime() - retentionMs);
      
      const series = this.timeSeriesData.get(definition.name);
      if (series) {
        const filteredSeries = series.filter(point => 
          new Date(point.timestamp) > cutoffTime
        );
        this.timeSeriesData.set(definition.name, filteredSeries);
      }
    });
  }
  
  /**
   * 獲取統計資訊
   */
  getStats() {
    const stats = {};
    
    this.timeSeriesData.forEach((series, metricName) => {
      stats[metricName] = {
        dataPoints: series.length,
        firstTimestamp: series.length > 0 ? series[0].timestamp : null,
        lastTimestamp: series.length > 0 ? series[series.length - 1].timestamp : null
      };
    });
    
    return {
      totalMetrics: this.timeSeriesData.size,
      totalDataPoints: Array.from(this.timeSeriesData.values()).reduce((sum, series) => sum + series.length, 0),
      metrics: stats
    };
  }
}

/**
 * 指標聚合器
 */
class MetricsAggregator {
  constructor() {
    this.aggregationFunctions = {
      sum: this.sum,
      avg: this.average,
      min: this.minimum,
      max: this.maximum,
      count: this.count,
      median: this.median,
      percentile: this.percentile,
      stddev: this.standardDeviation
    };
  }
  
  /**
   * 執行聚合計算
   */
  aggregate(dataPoints, aggregationType, options = {}) {
    if (!dataPoints || dataPoints.length === 0) {
      return null;
    }
    
    const values = dataPoints.map(point => point.value).filter(v => v !== null && v !== undefined);
    
    if (values.length === 0) {
      return null;
    }
    
    const aggregateFunc = this.aggregationFunctions[aggregationType];
    if (!aggregateFunc) {
      throw new Error(`未知的聚合類型: ${aggregationType}`);
    }
    
    return aggregateFunc.call(this, values, options);
  }
  
  /**
   * 時間窗口聚合
   */
  aggregateByTimeWindow(dataPoints, windowSizeMs, aggregationType) {
    if (!dataPoints || dataPoints.length === 0) {
      return [];
    }
    
    // 按時間排序
    const sortedPoints = dataPoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const windows = [];
    
    let windowStart = new Date(sortedPoints[0].timestamp);
    let currentWindow = [];
    
    for (const point of sortedPoints) {
      const pointTime = new Date(point.timestamp);
      
      // 檢查是否需要創建新窗口
      if (pointTime.getTime() - windowStart.getTime() >= windowSizeMs) {
        if (currentWindow.length > 0) {
          windows.push({
            start: windowStart.toISOString(),
            end: new Date(windowStart.getTime() + windowSizeMs).toISOString(),
            value: this.aggregate(currentWindow, aggregationType),
            count: currentWindow.length
          });
        }
        
        windowStart = new Date(Math.floor(pointTime.getTime() / windowSizeMs) * windowSizeMs);
        currentWindow = [];
      }
      
      currentWindow.push(point);
    }
    
    // 處理最後一個窗口
    if (currentWindow.length > 0) {
      windows.push({
        start: windowStart.toISOString(),
        end: new Date(windowStart.getTime() + windowSizeMs).toISOString(),
        value: this.aggregate(currentWindow, aggregationType),
        count: currentWindow.length
      });
    }
    
    return windows;
  }
  
  /**
   * 趨勢檢測
   */
  detectTrend(dataPoints, options = {}) {
    if (!dataPoints || dataPoints.length < 2) {
      return { trend: 'insufficient_data', confidence: 0 };
    }
    
    const values = dataPoints.map(point => point.value);
    const n = values.length;
    
    // 線性回歸計算趨勢
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const correlation = this.calculateCorrelation(values);
    
    let trend = 'stable';
    if (Math.abs(slope) > (options.slopeThreshold || 0.1)) {
      trend = slope > 0 ? 'increasing' : 'decreasing';
    }
    
    return {
      trend: trend,
      slope: slope,
      confidence: Math.abs(correlation),
      correlation: correlation
    };
  }
  
  /**
   * 異常檢測
   */
  detectAnomalies(dataPoints, options = {}) {
    if (!dataPoints || dataPoints.length < 10) {
      return [];
    }
    
    const values = dataPoints.map(point => point.value);
    const mean = this.average(values);
    const stdDev = this.standardDeviation(values);
    const threshold = options.stdDevThreshold || 2;
    
    const anomalies = [];
    
    dataPoints.forEach((point, index) => {
      const zScore = Math.abs((point.value - mean) / stdDev);
      if (zScore > threshold) {
        anomalies.push({
          dataPoint: point,
          zScore: zScore,
          deviation: Math.abs(point.value - mean),
          severity: zScore > 3 ? 'high' : 'medium'
        });
      }
    });
    
    return anomalies;
  }
  
  // === 聚合函數實現 ===
  
  sum(values) {
    return values.reduce((sum, val) => sum + val, 0);
  }
  
  average(values) {
    return values.length > 0 ? this.sum(values) / values.length : 0;
  }
  
  minimum(values) {
    return Math.min(...values);
  }
  
  maximum(values) {
    return Math.max(...values);
  }
  
  count(values) {
    return values.length;
  }
  
  median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }
  
  percentile(values, options = {}) {
    const p = options.percentile || 95;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  standardDeviation(values) {
    const mean = this.average(values);
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = this.average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
  
  calculateCorrelation(values) {
    const n = values.length;
    const indices = Array.from({length: n}, (_, i) => i);
    
    const meanX = this.average(indices);
    const meanY = this.average(values);
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
      const diffX = indices[i] - meanX;
      const diffY = values[i] - meanY;
      numerator += diffX * diffY;
      denomX += diffX * diffX;
      denomY += diffY * diffY;
    }
    
    return denomX * denomY === 0 ? 0 : numerator / Math.sqrt(denomX * denomY);
  }
}

/**
 * 指標匯出器
 */
class MetricsExporter {
  constructor() {
    this.exportFormats = ['json', 'csv', 'prometheus', 'dashboard'];
  }
  
  /**
   * 匯出指標數據
   */
  export(metrics, format = 'json', options = {}) {
    switch (format.toLowerCase()) {
      case 'json':
        return this.exportJson(metrics, options);
      case 'csv':
        return this.exportCsv(metrics, options);
      case 'prometheus':
        return this.exportPrometheus(metrics, options);
      case 'dashboard':
        return this.exportDashboard(metrics, options);
      default:
        throw new Error(`不支援的匯出格式: ${format}`);
    }
  }
  
  /**
   * JSON格式匯出
   */
  exportJson(metrics, options = {}) {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: metrics,
      metadata: {
        totalMetrics: metrics.length,
        exportOptions: options
      }
    };
    
    return JSON.stringify(exportData, null, options.pretty ? 2 : 0);
  }
  
  /**
   * CSV格式匯出
   */
  exportCsv(metrics, options = {}) {
    if (!metrics || metrics.length === 0) {
      return '';
    }
    
    const headers = ['timestamp', 'metric_name', 'value', 'tags'];
    const rows = [headers.join(',')];
    
    metrics.forEach(metric => {
      if (metric.dataPoints) {
        metric.dataPoints.forEach(point => {
          const row = [
            point.timestamp,
            metric.name,
            point.value,
            JSON.stringify(point.tags || {})
          ];
          rows.push(row.join(','));
        });
      }
    });
    
    return rows.join('\n');
  }
  
  /**
   * Prometheus格式匯出
   */
  exportPrometheus(metrics, options = {}) {
    const lines = [];
    
    metrics.forEach(metric => {
      // 添加HELP和TYPE註釋
      lines.push(`# HELP ${metric.name} ${metric.description || ''}`);
      lines.push(`# TYPE ${metric.name} ${this.getPrometheusType(metric.type)}`);
      
      if (metric.dataPoints && metric.dataPoints.length > 0) {
        const latestPoint = metric.dataPoints[metric.dataPoints.length - 1];
        const tagString = this.formatPrometheusTags(latestPoint.tags);
        lines.push(`${metric.name}${tagString} ${latestPoint.value}`);
      }
    });
    
    return lines.join('\n');
  }
  
  /**
   * 儀表板格式匯出
   */
  exportDashboard(metrics, options = {}) {
    return {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(metrics),
      charts: this.generateChartData(metrics),
      alerts: this.generateAlerts(metrics),
      metadata: {
        totalMetrics: metrics.length,
        categories: this.groupByCategory(metrics)
      }
    };
  }
  
  // === 輔助方法 ===
  
  getPrometheusType(metricType) {
    const typeMap = {
      [METRIC_TYPES.COUNTER]: 'counter',
      [METRIC_TYPES.GAUGE]: 'gauge',
      [METRIC_TYPES.HISTOGRAM]: 'histogram',
      [METRIC_TYPES.SUMMARY]: 'summary'
    };
    return typeMap[metricType] || 'gauge';
  }
  
  formatPrometheusTags(tags) {
    if (!tags || Object.keys(tags).length === 0) {
      return '';
    }
    
    const tagPairs = Object.entries(tags).map(([key, value]) => `${key}="${value}"`);
    return `{${tagPairs.join(',')}}`;
  }
  
  generateSummary(metrics) {
    const summary = {
      totalMetrics: metrics.length,
      categories: {},
      lastUpdated: new Date().toISOString()
    };
    
    metrics.forEach(metric => {
      const category = metric.category || 'unknown';
      if (!summary.categories[category]) {
        summary.categories[category] = 0;
      }
      summary.categories[category]++;
    });
    
    return summary;
  }
  
  generateChartData(metrics) {
    return metrics.map(metric => ({
      name: metric.name,
      type: metric.type,
      category: metric.category,
      data: metric.dataPoints || [],
      config: {
        title: metric.description || metric.name,
        unit: metric.unit || '',
        chartType: this.getChartType(metric.type)
      }
    }));
  }
  
  generateAlerts(metrics) {
    const alerts = [];
    
    metrics.forEach(metric => {
      if (metric.alertThresholds && metric.dataPoints && metric.dataPoints.length > 0) {
        const latestValue = metric.dataPoints[metric.dataPoints.length - 1].value;
        
        Object.entries(metric.alertThresholds).forEach(([level, threshold]) => {
          if (this.checkThreshold(latestValue, threshold)) {
            alerts.push({
              metric: metric.name,
              level: level,
              value: latestValue,
              threshold: threshold,
              timestamp: new Date().toISOString()
            });
          }
        });
      }
    });
    
    return alerts;
  }
  
  getChartType(metricType) {
    const chartTypeMap = {
      [METRIC_TYPES.COUNTER]: 'line',
      [METRIC_TYPES.GAUGE]: 'line',
      [METRIC_TYPES.HISTOGRAM]: 'histogram',
      [METRIC_TYPES.SUMMARY]: 'summary'
    };
    return chartTypeMap[metricType] || 'line';
  }
  
  checkThreshold(value, threshold) {
    if (typeof threshold === 'number') {
      return value > threshold;
    } else if (typeof threshold === 'object') {
      if (threshold.min !== undefined && value < threshold.min) return true;
      if (threshold.max !== undefined && value > threshold.max) return true;
    }
    return false;
  }
  
  groupByCategory(metrics) {
    const categories = {};
    metrics.forEach(metric => {
      const category = metric.category || 'unknown';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(metric.name);
    });
    return categories;
  }
}

/**
 * 指標收集器主類
 */
class MetricsCollector {
  constructor() {
    this.metricDefinitions = new Map(); // name -> MetricDefinition
    this.timeSeriesManager = new TimeSeriesManager();
    this.aggregator = new MetricsAggregator();
    this.exporter = new MetricsExporter();
    this.eventBus = globalEventBus;
    this.performanceMonitor = null; // PerformanceMonitor 使用靜態方法，不需要實例
    this.cache = globalCache;
    this.errorHandler = ErrorHandler;
    
    this.isCollecting = false;
    this.collectionInterval = 30000; // 30秒
    this.collectionTimer = null;
    
    this.initializeBuiltInMetrics();
    this.setupEventSubscriptions();
  }
  
  /**
   * 初始化內建指標
   */
  initializeBuiltInMetrics() {
    // 性能指標
    this.registerMetric(new MetricDefinition(
      'system_response_time',
      METRIC_TYPES.HISTOGRAM,
      METRIC_CATEGORIES.PERFORMANCE,
      {
        description: '系統響應時間',
        unit: 'milliseconds',
        alertThresholds: { warning: 1000, critical: 5000 }
      }
    ));
    
    this.registerMetric(new MetricDefinition(
      'system_memory_usage',
      METRIC_TYPES.GAUGE,
      METRIC_CATEGORIES.TECHNICAL,
      {
        description: '系統記憶體使用量',
        unit: 'bytes',
        alertThresholds: { warning: 80000000, critical: 100000000 }
      }
    ));
    
    // 業務指標
    this.registerMetric(new MetricDefinition(
      'student_operations_total',
      METRIC_TYPES.COUNTER,
      METRIC_CATEGORIES.BUSINESS,
      {
        description: '學生操作總數',
        unit: 'operations'
      }
    ));
    
    this.registerMetric(new MetricDefinition(
      'teacher_operations_total',
      METRIC_TYPES.COUNTER,
      METRIC_CATEGORIES.BUSINESS,
      {
        description: '教師操作總數',
        unit: 'operations'
      }
    ));
    
    // 品質指標
    this.registerMetric(new MetricDefinition(
      'test_success_rate',
      METRIC_TYPES.GAUGE,
      METRIC_CATEGORIES.QUALITY,
      {
        description: '測試成功率',
        unit: 'percentage',
        alertThresholds: { warning: 90, critical: 80 }
      }
    ));
    
    this.registerMetric(new MetricDefinition(
      'deployment_frequency',
      METRIC_TYPES.COUNTER,
      METRIC_CATEGORIES.OPERATIONAL,
      {
        description: '部署頻率',
        unit: 'deployments'
      }
    ));
    
    Logger.log('[MetricsCollector] 內建指標初始化完成');
  }
  
  /**
   * 設置事件訂閱
   */
  setupEventSubscriptions() {
    if (this.eventBus) {
      // 訂閱性能事件
      this.eventBus.subscribe('performance.measurement', (event) => {
        this.recordMetric('system_response_time', event.data.duration, {
          operation: event.data.operation,
          category: event.data.category
        });
      });
      
      // 訂閱測試事件
      this.eventBus.subscribe('test.completed', (event) => {
        const successRate = (event.data.passedTests / event.data.totalTests) * 100;
        this.recordMetric('test_success_rate', successRate);
      });
      
      // 訂閱部署事件
      this.eventBus.subscribe('deployment.completed', (event) => {
        this.recordMetric('deployment_frequency', 1, {
          environment: event.data.environment,
          status: event.data.status
        });
      });
      
      // 訂閱學生操作事件
      this.eventBus.subscribe('student.operation', (event) => {
        this.recordMetric('student_operations_total', 1, {
          operation: event.data.operation
        });
      });
      
      // 訂閱教師操作事件
      this.eventBus.subscribe('teacher.operation', (event) => {
        this.recordMetric('teacher_operations_total', 1, {
          operation: event.data.operation
        });
      });
      
      Logger.log('[MetricsCollector] 事件訂閱設置完成');
    }
  }
  
  /**
   * 註冊指標定義
   */
  registerMetric(metricDefinition) {
    const validation = metricDefinition.validate();
    if (!validation.valid) {
      throw new Error(`指標定義無效: ${validation.errors.join(', ')}`);
    }
    
    this.metricDefinitions.set(metricDefinition.name, metricDefinition);
    Logger.log(`[MetricsCollector] 註冊指標: ${metricDefinition.name}`);
  }
  
  /**
   * 記錄指標數據
   */
  recordMetric(metricName, value, tags = {}) {
    try {
      const metricDef = this.metricDefinitions.get(metricName);
      if (!metricDef) {
        Logger.log(`[MetricsCollector] 未找到指標定義: ${metricName}`);
        return;
      }
      
      const dataPoint = new MetricDataPoint(metricName, value, null, tags);
      this.timeSeriesManager.addDataPoint(dataPoint);
      
      // 檢查快取並更新統計
      this.updateCachedStats(metricName, value);
      
    } catch (error) {
      this.errorHandler.handle('MetricsCollector.recordMetric', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    }
  }
  
  /**
   * 開始自動收集
   */
  startCollection() {
    if (this.isCollecting) {
      return;
    }
    
    this.isCollecting = true;
    
    this.collectionTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, this.collectionInterval);
    
    Logger.log('[MetricsCollector] 開始自動指標收集');
  }
  
  /**
   * 停止自動收集
   */
  stopCollection() {
    if (!this.isCollecting) {
      return;
    }
    
    this.isCollecting = false;
    
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }
    
    Logger.log('[MetricsCollector] 停止自動指標收集');
  }
  
  /**
   * 收集系統指標
   */
  collectSystemMetrics() {
    try {
      // 收集記憶體使用量（模擬）
      const memoryUsage = this.estimateMemoryUsage();
      this.recordMetric('system_memory_usage', memoryUsage);
      
      // 從性能監控器收集指標（使用靜態方法）
      try {
        const perfStats = PerformanceMonitor.getStats();
        if (perfStats.measurements && perfStats.measurements.length > 0) {
          this.recordMetric('system_response_time', perfStats.averageResponseTime);
          this.recordMetric('system_performance_measurements_total', perfStats.totalMeasurements);
        }
      } catch (error) {
        // 性能監控器可能尚未初始化，安靜地忽略此錯誤
      }
      
    } catch (error) {
      this.errorHandler.handle('MetricsCollector.collectSystemMetrics', error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.SYSTEM);
    }
  }
  
  /**
   * 獲取指標數據
   */
  getMetrics(metricNames = null, options = {}) {
    const startTime = options.startTime;
    const endTime = options.endTime || new Date().toISOString();
    const includeAggregation = options.includeAggregation !== false;
    
    const metricsToGet = metricNames || Array.from(this.metricDefinitions.keys());
    const results = [];
    
    metricsToGet.forEach(metricName => {
      const definition = this.metricDefinitions.get(metricName);
      if (!definition) {
        return;
      }
      
      let dataPoints;
      if (startTime) {
        dataPoints = this.timeSeriesManager.getDataInRange(metricName, startTime, endTime);
      } else {
        dataPoints = this.timeSeriesManager.getRecentData(metricName, options.limit || 100);
      }
      
      const metricData = {
        name: metricName,
        definition: definition.toJSON(),
        dataPoints: dataPoints.map(dp => dp.toJSON())
      };
      
      if (includeAggregation && dataPoints.length > 0) {
        metricData.aggregation = {};
        definition.aggregationRules.forEach(rule => {
          metricData.aggregation[rule] = this.aggregator.aggregate(dataPoints, rule);
        });
        
        // 添加趨勢分析
        metricData.trend = this.aggregator.detectTrend(dataPoints);
        
        // 添加異常檢測
        metricData.anomalies = this.aggregator.detectAnomalies(dataPoints);
      }
      
      results.push(metricData);
    });
    
    return results;
  }
  
  /**
   * 匯出指標數據
   */
  exportMetrics(format = 'json', options = {}) {
    const metrics = this.getMetrics(options.metricNames, options);
    return this.exporter.export(metrics, format, options);
  }
  
  /**
   * 獲取儀表板數據
   */
  getDashboardData() {
    const cacheKey = 'metrics_dashboard_data';
    
    // 檢查快取
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const metrics = this.getMetrics();
    const dashboardData = this.exporter.exportDashboard(metrics);
    
    // 快取結果
    if (this.cache) {
      this.cache.set(cacheKey, dashboardData, 60); // 1分鐘快取
    }
    
    return dashboardData;
  }
  
  /**
   * 獲取統計資訊
   */
  getStats() {
    const timeSeriesStats = this.timeSeriesManager.getStats();
    const definitionStats = {
      totalDefinitions: this.metricDefinitions.size,
      categories: {}
    };
    
    this.metricDefinitions.forEach(def => {
      const category = def.category;
      if (!definitionStats.categories[category]) {
        definitionStats.categories[category] = 0;
      }
      definitionStats.categories[category]++;
    });
    
    return {
      isCollecting: this.isCollecting,
      collectionInterval: this.collectionInterval,
      definitions: definitionStats,
      timeSeries: timeSeriesStats,
      lastCollected: new Date().toISOString()
    };
  }
  
  // === 私有方法 ===
  
  /**
   * 估算記憶體使用量
   */
  estimateMemoryUsage() {
    // 在 Google Apps Script 中無法直接獲取記憶體使用量
    // 這裡使用數據結構大小來估算
    let estimation = 0;
    
    this.timeSeriesManager.timeSeriesData.forEach(series => {
      estimation += series.length * 200; // 每個數據點約200字節
    });
    
    estimation += this.metricDefinitions.size * 1000; // 每個定義約1KB
    
    return estimation;
  }
  
  /**
   * 更新快取統計
   */
  updateCachedStats(metricName, value) {
    if (!this.cache) {
      return;
    }
    
    const statsKey = `metric_stats_${metricName}`;
    const currentStats = this.cache.get(statsKey) || {
      count: 0,
      sum: 0,
      min: value,
      max: value,
      lastValue: value,
      lastUpdated: new Date().toISOString()
    };
    
    currentStats.count++;
    currentStats.sum += value;
    currentStats.min = Math.min(currentStats.min, value);
    currentStats.max = Math.max(currentStats.max, value);
    currentStats.lastValue = value;
    currentStats.avg = currentStats.sum / currentStats.count;
    currentStats.lastUpdated = new Date().toISOString();
    
    this.cache.set(statsKey, currentStats, 3600); // 1小時快取
  }
}

/**
 * 全域指標收集器實例
 */
const globalMetricsCollector = new MetricsCollector();

/**
 * 便利函數 - 記錄指標
 */
function recordMetric(metricName, value, tags = {}) {
  return globalMetricsCollector.recordMetric(metricName, value, tags);
}

/**
 * 便利函數 - 獲取指標數據
 */
function getMetrics(metricNames = null, options = {}) {
  return globalMetricsCollector.getMetrics(metricNames, options);
}

/**
 * 便利函數 - 匯出指標
 */
function exportMetrics(format = 'json', options = {}) {
  return globalMetricsCollector.exportMetrics(format, options);
}

/**
 * 便利函數 - 獲取儀表板數據
 */
function getMetricsDashboardData() {
  return globalMetricsCollector.getDashboardData();
}