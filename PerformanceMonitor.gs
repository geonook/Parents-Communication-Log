/**
 * 系統性能監控模組
 * 提供統一的性能追蹤、監控和分析功能
 * Version: 1.0.0
 * 
 * 功能：
 * - 操作耗時追蹤
 * - 性能基準線建立
 * - 性能報告生成
 * - 瓶頸識別和分析
 */

/**
 * 性能監控主類
 * 提供統一的性能測量和分析接口
 */
class PerformanceMonitor {
  // 性能數據存儲
  static measurements = new Map();
  static benchmarks = new Map();
  static alerts = [];
  
  // 配置常數
  static CONFIG = {
    // 性能告警閾值（毫秒）
    THRESHOLDS: {
      FAST: 1000,        // 1秒內：快速
      NORMAL: 3000,      // 3秒內：正常
      SLOW: 6000,        // 6秒內：緩慢
      CRITICAL: 10000    // 10秒以上：嚴重
    },
    
    // 數據保留設定
    MAX_MEASUREMENTS: 1000,
    RETENTION_DAYS: 7,
    
    // 報告設定
    REPORT_CATEGORIES: [
      'SYSTEM_INIT',
      'DATA_IMPORT', 
      'RECORD_CREATION',
      'PROGRESS_CHECK',
      'BATCH_OPERATION',
      'USER_INTERFACE'
    ]
  };
  
  /**
   * 開始性能測量
   * @param {string} operationName 操作名稱
   * @param {string} category 操作類別
   * @param {Object} context 上下文信息
   * @returns {Object} 測量會話對象
   */
  static startMeasurement(operationName, category = 'GENERAL', context = {}) {
    const sessionId = this.generateSessionId();
    const measurement = {
      sessionId: sessionId,
      operationName: operationName,
      category: category,
      startTime: Date.now(),
      startDate: new Date(),
      context: context,
      user: this.getCurrentUser(),
      status: 'RUNNING'
    };
    
    this.measurements.set(sessionId, measurement);
    
    Logger.log(`🚀 [性能監控] 開始測量: ${operationName} (${category}) - Session: ${sessionId}`);
    
    // 返回測量會話對象
    return {
      sessionId: sessionId,
      operationName: operationName,
      
      /**
       * 結束測量
       * @param {boolean} success 操作是否成功
       * @param {string} message 附加信息
       * @returns {Object} 性能測量結果
       */
      end: (success = true, message = '') => {
        return PerformanceMonitor.endMeasurement(sessionId, success, message);
      },
      
      /**
       * 添加檢查點
       * @param {string} checkpointName 檢查點名稱
       * @param {Object} data 檢查點數據
       */
      checkpoint: (checkpointName, data = {}) => {
        PerformanceMonitor.addCheckpoint(sessionId, checkpointName, data);
      },
      
      /**
       * 更新上下文
       * @param {Object} newContext 新的上下文數據
       */
      updateContext: (newContext) => {
        PerformanceMonitor.updateMeasurementContext(sessionId, newContext);
      }
    };
  }
  
  /**
   * 結束性能測量
   * @param {string} sessionId 會話ID
   * @param {boolean} success 操作是否成功
   * @param {string} message 附加信息
   * @returns {Object} 測量結果
   */
  static endMeasurement(sessionId, success = true, message = '') {
    const measurement = this.measurements.get(sessionId);
    if (!measurement) {
      Logger.log(`⚠️ [性能監控] 找不到測量會話: ${sessionId}`);
      return null;
    }
    
    const endTime = Date.now();
    const duration = endTime - measurement.startTime;
    
    // 更新測量記錄
    measurement.endTime = endTime;
    measurement.endDate = new Date();
    measurement.duration = duration;
    measurement.success = success;
    measurement.message = message;
    measurement.status = success ? 'COMPLETED' : 'FAILED';
    measurement.performanceLevel = this.getPerformanceLevel(duration);
    
    // 記錄完成日誌
    const level = measurement.performanceLevel;
    const emoji = this.getPerformanceEmoji(level);
    Logger.log(`${emoji} [性能監控] 完成測量: ${measurement.operationName} - ${duration}ms (${level}) - ${success ? '成功' : '失敗'}`);
    
    // 檢查是否需要告警
    this.checkPerformanceAlert(measurement);
    
    // 更新基準線
    this.updateBenchmark(measurement);
    
    // 清理舊數據
    this.cleanupOldMeasurements();
    
    return {
      sessionId: sessionId,
      operationName: measurement.operationName,
      category: measurement.category,
      duration: duration,
      performanceLevel: level,
      success: success,
      message: message,
      context: measurement.context
    };
  }
  
  /**
   * 添加測量檢查點
   * @param {string} sessionId 會話ID
   * @param {string} checkpointName 檢查點名稱
   * @param {Object} data 檢查點數據
   */
  static addCheckpoint(sessionId, checkpointName, data = {}) {
    const measurement = this.measurements.get(sessionId);
    if (!measurement) return;
    
    if (!measurement.checkpoints) {
      measurement.checkpoints = [];
    }
    
    const checkpoint = {
      name: checkpointName,
      timestamp: Date.now(),
      elapsed: Date.now() - measurement.startTime,
      data: data
    };
    
    measurement.checkpoints.push(checkpoint);
    Logger.log(`📍 [性能監控] 檢查點 ${checkpointName}: ${checkpoint.elapsed}ms - ${measurement.operationName}`);
  }
  
  /**
   * 更新測量上下文
   * @param {string} sessionId 會話ID
   * @param {Object} newContext 新的上下文數據
   */
  static updateMeasurementContext(sessionId, newContext) {
    const measurement = this.measurements.get(sessionId);
    if (measurement) {
      measurement.context = { ...measurement.context, ...newContext };
    }
  }
  
  /**
   * 快速測量函數執行時間
   * @param {Function} func 要測量的函數
   * @param {string} operationName 操作名稱
   * @param {string} category 操作類別
   * @param {Array} args 函數參數
   * @returns {Object} 包含結果和性能數據的對象
   */
  static async measureFunction(func, operationName, category = 'FUNCTION', ...args) {
    const session = this.startMeasurement(operationName, category, { 
      functionName: func.name,
      argumentCount: args.length 
    });
    
    let result;
    let success = true;
    let errorMessage = '';
    
    try {
      result = await func(...args);
    } catch (error) {
      success = false;
      errorMessage = error.message;
      result = null;
    }
    
    const performanceData = session.end(success, errorMessage);
    
    return {
      result: result,
      performance: performanceData,
      success: success,
      error: errorMessage
    };
  }
  
  /**
   * 批量操作性能測量
   * @param {Array} items 要處理的項目
   * @param {Function} processor 處理函數
   * @param {string} operationName 操作名稱
   * @param {number} batchSize 批次大小
   * @returns {Object} 批量操作結果和性能數據
   */
  static async measureBatchOperation(items, processor, operationName, batchSize = 100) {
    const session = this.startMeasurement(`批量${operationName}`, 'BATCH_OPERATION', {
      totalItems: items.length,
      batchSize: batchSize
    });
    
    const results = [];
    const errors = [];
    let processedCount = 0;
    
    try {
      // 分批處理
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        session.checkpoint(`批次${Math.floor(i/batchSize) + 1}`, { 
          batchStart: i, 
          batchSize: batch.length 
        });
        
        for (const item of batch) {
          try {
            const result = await processor(item);
            results.push(result);
            processedCount++;
          } catch (error) {
            errors.push({ item: item, error: error.message });
          }
        }
        
        // 每批次後稍作暫停，避免 GAS 超時
        if (i + batchSize < items.length) {
          Utilities.sleep(100);
        }
      }
    } catch (error) {
      session.end(false, error.message);
      throw error;
    }
    
    const performanceData = session.end(true, `處理完成: ${processedCount}/${items.length}`);
    
    return {
      results: results,
      errors: errors,
      processedCount: processedCount,
      successRate: processedCount / items.length,
      performance: performanceData
    };
  }
  
  /**
   * 生成性能報告
   * @param {string} category 報告類別（可選）
   * @param {number} hours 報告時間範圍（小時）
   * @returns {Object} 性能報告
   */
  static generatePerformanceReport(category = null, hours = 24) {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    const recentMeasurements = Array.from(this.measurements.values())
      .filter(m => m.startTime > cutoffTime)
      .filter(m => !category || m.category === category);
    
    if (recentMeasurements.length === 0) {
      return {
        summary: '指定時間範圍內沒有性能數據',
        measurements: [],
        statistics: {}
      };
    }
    
    // 計算統計數據
    const durations = recentMeasurements.map(m => m.duration).filter(d => d !== undefined);
    const successCount = recentMeasurements.filter(m => m.success).length;
    
    const statistics = {
      totalOperations: recentMeasurements.length,
      successRate: (successCount / recentMeasurements.length * 100).toFixed(1) + '%',
      averageDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      medianDuration: durations.length > 0 ? this.calculateMedian(durations) : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      performanceLevels: this.calculatePerformanceLevelDistribution(recentMeasurements)
    };
    
    // 識別最慢的操作
    const slowestOperations = recentMeasurements
      .filter(m => m.duration !== undefined)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    // 識別最常見的操作
    const operationCounts = {};
    recentMeasurements.forEach(m => {
      operationCounts[m.operationName] = (operationCounts[m.operationName] || 0) + 1;
    });
    
    const mostFrequentOperations = Object.entries(operationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    Logger.log(`📊 [性能監控] 生成報告: ${category || '全部'} - ${hours}小時內 - ${recentMeasurements.length}筆記錄`);
    
    return {
      reportTime: new Date(),
      timeRange: `${hours}小時`,
      category: category || '全部類別',
      summary: `分析了 ${recentMeasurements.length} 個操作，成功率 ${statistics.successRate}，平均耗時 ${statistics.averageDuration}ms`,
      statistics: statistics,
      slowestOperations: slowestOperations.map(m => ({
        operation: m.operationName,
        duration: m.duration,
        category: m.category,
        timestamp: m.startDate
      })),
      mostFrequentOperations: mostFrequentOperations.map(([op, count]) => ({
        operation: op,
        count: count
      })),
      alerts: this.alerts.filter(alert => alert.timestamp > cutoffTime),
      measurements: recentMeasurements.slice(0, 100) // 限制返回數量
    };
  }
  
  /**
   * 獲取系統性能健康狀態
   * @returns {Object} 系統健康狀態
   */
  static getSystemHealth() {
    const report = this.generatePerformanceReport(null, 1); // 最近1小時
    const stats = report.statistics;
    
    let healthScore = 100;
    let healthLevel = 'EXCELLENT';
    const issues = [];
    
    // 評估成功率
    if (parseFloat(stats.successRate) < 95) {
      healthScore -= 20;
      issues.push(`操作成功率偏低: ${stats.successRate}`);
    }
    
    // 評估平均響應時間
    if (stats.averageDuration > this.CONFIG.THRESHOLDS.SLOW) {
      healthScore -= 30;
      issues.push(`平均響應時間過長: ${stats.averageDuration}ms`);
    } else if (stats.averageDuration > this.CONFIG.THRESHOLDS.NORMAL) {
      healthScore -= 15;
      issues.push(`平均響應時間較慢: ${stats.averageDuration}ms`);
    }
    
    // 評估告警數量
    const recentAlerts = this.alerts.filter(a => Date.now() - a.timestamp < 60 * 60 * 1000);
    if (recentAlerts.length > 5) {
      healthScore -= 25;
      issues.push(`最近告警過多: ${recentAlerts.length}個`);
    }
    
    // 確定健康等級
    if (healthScore >= 90) healthLevel = 'EXCELLENT';
    else if (healthScore >= 75) healthLevel = 'GOOD';
    else if (healthScore >= 60) healthLevel = 'FAIR';
    else if (healthScore >= 40) healthLevel = 'POOR';
    else healthLevel = 'CRITICAL';
    
    return {
      healthScore: Math.max(0, healthScore),
      healthLevel: healthLevel,
      issues: issues,
      summary: issues.length === 0 ? '系統性能狀態良好' : `發現 ${issues.length} 個性能問題`,
      lastUpdated: new Date(),
      recommendations: this.generateHealthRecommendations(healthScore, issues)
    };
  }
  
  // ============ 輔助方法 ============
  
  /**
   * 生成會話ID
   */
  static generateSessionId() {
    return 'perf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * 獲取當前用戶
   */
  static getCurrentUser() {
    try {
      return Session.getActiveUser().getEmail();
    } catch (error) {
      return 'unknown_user';
    }
  }
  
  /**
   * 根據耗時確定性能等級
   */
  static getPerformanceLevel(duration) {
    if (duration < this.CONFIG.THRESHOLDS.FAST) return 'FAST';
    if (duration < this.CONFIG.THRESHOLDS.NORMAL) return 'NORMAL';
    if (duration < this.CONFIG.THRESHOLDS.SLOW) return 'SLOW';
    return 'CRITICAL';
  }
  
  /**
   * 獲取性能等級對應的表情符號
   */
  static getPerformanceEmoji(level) {
    const emojis = {
      'FAST': '🚀',
      'NORMAL': '✅', 
      'SLOW': '⚠️',
      'CRITICAL': '🚨'
    };
    return emojis[level] || '📊';
  }
  
  /**
   * 檢查是否需要性能告警
   */
  static checkPerformanceAlert(measurement) {
    if (!measurement.success) {
      this.addAlert('OPERATION_FAILED', `操作失敗: ${measurement.operationName}`, measurement);
    }
    
    if (measurement.duration > this.CONFIG.THRESHOLDS.CRITICAL) {
      this.addAlert('PERFORMANCE_CRITICAL', `極慢操作: ${measurement.operationName} (${measurement.duration}ms)`, measurement);
    } else if (measurement.duration > this.CONFIG.THRESHOLDS.SLOW) {
      this.addAlert('PERFORMANCE_SLOW', `緩慢操作: ${measurement.operationName} (${measurement.duration}ms)`, measurement);
    }
  }
  
  /**
   * 添加告警
   */
  static addAlert(type, message, measurement) {
    const alert = {
      id: this.generateSessionId(),
      type: type,
      message: message,
      timestamp: Date.now(),
      measurement: {
        operationName: measurement.operationName,
        category: measurement.category,
        duration: measurement.duration,
        user: measurement.user
      }
    };
    
    this.alerts.push(alert);
    Logger.log(`🚨 [性能監控] ${type}: ${message}`);
    
    // 限制告警數量
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50);
    }
  }
  
  /**
   * 更新基準線
   */
  static updateBenchmark(measurement) {
    const key = `${measurement.category}_${measurement.operationName}`;
    if (!this.benchmarks.has(key)) {
      this.benchmarks.set(key, {
        operationName: measurement.operationName,
        category: measurement.category,
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        lastUpdated: Date.now()
      });
    }
    
    const benchmark = this.benchmarks.get(key);
    benchmark.count++;
    benchmark.totalDuration += measurement.duration;
    benchmark.minDuration = Math.min(benchmark.minDuration, measurement.duration);
    benchmark.maxDuration = Math.max(benchmark.maxDuration, measurement.duration);
    benchmark.averageDuration = Math.round(benchmark.totalDuration / benchmark.count);
    benchmark.lastUpdated = Date.now();
  }
  
  /**
   * 清理舊的測量數據
   */
  static cleanupOldMeasurements() {
    if (this.measurements.size <= this.CONFIG.MAX_MEASUREMENTS) return;
    
    const cutoffTime = Date.now() - (this.CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const keysToDelete = [];
    
    for (const [sessionId, measurement] of this.measurements) {
      if (measurement.startTime < cutoffTime) {
        keysToDelete.push(sessionId);
      }
    }
    
    keysToDelete.forEach(key => this.measurements.delete(key));
    
    if (keysToDelete.length > 0) {
      Logger.log(`🧹 [性能監控] 清理舊數據: 移除 ${keysToDelete.length} 筆測量記錄`);
    }
  }
  
  /**
   * 計算中位數
   */
  static calculateMedian(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }
  
  /**
   * 計算性能等級分布
   */
  static calculatePerformanceLevelDistribution(measurements) {
    const distribution = { FAST: 0, NORMAL: 0, SLOW: 0, CRITICAL: 0 };
    measurements.forEach(m => {
      if (m.performanceLevel) {
        distribution[m.performanceLevel]++;
      }
    });
    return distribution;
  }
  
  /**
   * 生成健康建議
   */
  static generateHealthRecommendations(healthScore, issues) {
    const recommendations = [];
    
    if (healthScore < 60) {
      recommendations.push('建議立即檢查系統性能，識別並解決關鍵瓶頸');
    }
    
    if (issues.some(issue => issue.includes('成功率'))) {
      recommendations.push('檢查錯誤處理邏輯，改善操作穩定性');
    }
    
    if (issues.some(issue => issue.includes('響應時間'))) {
      recommendations.push('優化批量操作，實施緩存機制');
      recommendations.push('考慮將大型函數拆分為更小的模組');
    }
    
    if (issues.some(issue => issue.includes('告警'))) {
      recommendations.push('檢查最近的系統變更，排查異常原因');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('系統性能表現良好，持續監控以維持最佳狀態');
    }
    
    return recommendations;
  }
}

// ============ 便利函數 ============

/**
 * 測量函數執行時間的裝飾器函數
 * @param {string} operationName 操作名稱
 * @param {string} category 操作類別
 */
function measurePerformance(operationName, category = 'GENERAL') {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const session = PerformanceMonitor.startMeasurement(
        operationName || propertyKey, 
        category,
        { method: propertyKey, className: target.constructor.name }
      );
      
      try {
        const result = await originalMethod.apply(this, args);
        session.end(true, '操作成功');
        return result;
      } catch (error) {
        session.end(false, error.message);
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * 快速性能測量包裝函數
 * @param {Function} func 要測量的函數
 * @param {string} name 操作名稱
 * @param {string} category 類別
 */
function withPerformanceTracking(func, name, category = 'FUNCTION') {
  return async function(...args) {
    return await PerformanceMonitor.measureFunction(func, name, category, ...args);
  };
}

// ============ 全域快速測量函數 ============

/**
 * 測量代碼塊執行時間
 * 使用方式：
 * const timer = startTimer('我的操作');
 * // ... 執行代碼 ...
 * const result = timer.end();
 */
function startTimer(operationName, category = 'MANUAL') {
  return PerformanceMonitor.startMeasurement(operationName, category);
}

/**
 * 快速測量並記錄函數執行時間
 */
function quickMeasure(func, name, ...args) {
  return PerformanceMonitor.measureFunction(func, name, 'QUICK_MEASURE', ...args);
}

/**
 * 獲取性能報告的快速函數
 */
function getPerformanceReport(hours = 24) {
  return PerformanceMonitor.generatePerformanceReport(null, hours);
}

/**
 * 獲取系統健康狀態的快速函數
 */
function getSystemHealthStatus() {
  return PerformanceMonitor.getSystemHealth();
}