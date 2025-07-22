/**
 * 統一錯誤處理系統
 * 擴展並增強現有的 safeErrorHandler 功能
 * 提供分層錯誤處理、智能恢復和詳細分析
 * Version: 1.0.0
 */

/**
 * 錯誤等級枚舉
 */
const ERROR_LEVELS = {
  CRITICAL: 'CRITICAL',   // 系統性錯誤，需要立即處理
  ERROR: 'ERROR',         // 操作失敗，但系統可繼續運行
  WARNING: 'WARNING',     // 潛在問題，不影響核心功能
  INFO: 'INFO',           // 信息性日誌，用於調試
  DEBUG: 'DEBUG'          // 調試信息
};

/**
 * 錯誤類別枚舉
 */
const ERROR_CATEGORIES = {
  SYSTEM: 'SYSTEM',           // 系統級錯誤
  DATA: 'DATA',               // 數據相關錯誤
  PERMISSION: 'PERMISSION',   // 權限錯誤
  NETWORK: 'NETWORK',         // 網絡相關錯誤
  USER_INPUT: 'USER_INPUT',   // 用戶輸入錯誤
  BUSINESS: 'BUSINESS',       // 業務邏輯錯誤
  PERFORMANCE: 'PERFORMANCE'  // 性能相關問題
};

/**
 * 統一錯誤處理類
 * 擴展現有的 safeErrorHandler，提供更強大的錯誤處理能力
 */
class ErrorHandler {
  // 錯誤記錄存儲
  static getErrorLog() {
    if (!this._errorLog) {
      this._errorLog = [];
    }
    return this._errorLog;
  }
  
  static get errorLog() { 
    return this.getErrorLog(); 
  }
  
  // 錯誤統計
  static getErrorStats() {
    if (!this._errorStats) {
      this._errorStats = new Map();
    }
    return this._errorStats;
  }
  
  static get errorStats() { 
    return this.getErrorStats(); 
  }
  
  // 配置
  static get CONFIG() {
    return {
      // 錯誤記錄保留設定
      MAX_ERROR_RECORDS: 500,
      RETENTION_DAYS: 7,
      
      // 重試設定
      MAX_RETRIES: 3,
      RETRY_DELAYS: [1000, 2000, 5000], // 毫秒
      
      // 通知設定
      CRITICAL_ERROR_NOTIFICATION: true,
      ERROR_BATCH_SIZE: 10,
      
      // 用戶友好錯誤信息映射
      FRIENDLY_MESSAGES: {
        'Permission denied': '沒有足夠的權限執行此操作，請檢查 Google Drive 共享設定',
        'File not found': '找不到指定的檔案，檔案可能已被刪除或移動',
        'Network error': '網絡連線問題，請檢查網絡連線後重試',
        'Quota exceeded': '已達到 Google Apps Script 或 Drive 配額限制，請稍後再試',
        'Invalid argument': '提供的參數格式不正確，請檢查輸入數據',
        'Script timeout': '操作執行時間超過限制，建議將大型操作分批處理'
      }
    };
  }
  
  /**
   * 統一錯誤處理入口
   * 擴展原有的 safeErrorHandler 功能
   * @param {string} context 錯誤上下文
   * @param {Error} error 錯誤對象
   * @param {string} level 錯誤等級
   * @param {string} category 錯誤類別
   * @param {Object} options 處理選項
   */
  static handle(context, error, level = ERROR_LEVELS.ERROR, category = ERROR_CATEGORIES.SYSTEM, options = {}) {
    const errorId = this.generateErrorId();
    const timestamp = new Date();
    
    // 建立完整的錯誤記錄
    const errorRecord = {
      id: errorId,
      timestamp: timestamp,
      context: context,
      level: level,
      category: category,
      originalError: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      userAgent: this.getUserAgent(),
      user: this.getCurrentUser(),
      additionalInfo: options.additionalInfo || {},
      resolved: false,
      retryCount: 0
    };
    
    // 生成用戶友好的錯誤信息
    errorRecord.friendlyMessage = this.generateFriendlyMessage(error, context);
    
    // 記錄錯誤
    this.logError(errorRecord);
    
    // 更新統計
    this.updateErrorStats(errorRecord);
    
    // 根據等級決定處理策略
    this.processErrorByLevel(errorRecord, options);
    
    // 如果啟用了性能監控，記錄錯誤性能影響
    if (typeof PerformanceMonitor !== 'undefined') {
      try {
        PerformanceMonitor.addAlert('ERROR_OCCURRED', `${level}: ${context}`, errorRecord);
      } catch (perfError) {
        Logger.log('性能監控記錄錯誤失敗：' + perfError.message);
      }
    }
    
    // 返回錯誤處理結果
    return {
      errorId: errorId,
      handled: true,
      level: level,
      friendlyMessage: errorRecord.friendlyMessage,
      shouldRetry: this.shouldRetry(error, errorRecord.retryCount),
      context: context
    };
  }
  
  /**
   * 快速錯誤處理 - 兼容原有的 safeErrorHandler
   * @param {string} context 上下文
   * @param {Error} error 錯誤對象
   * @param {string} userMessage 自定義用戶信息
   */
  static quick(context, error, userMessage = null) {
    const level = this.determineErrorLevel(error);
    const category = this.determineErrorCategory(error, context);
    
    const result = this.handle(context, error, level, category, {
      userMessage: userMessage,
      showUI: true
    });
    
    return result;
  }
  
  /**
   * 業務邏輯錯誤處理
   * @param {string} context 上下文
   * @param {Error} error 錯誤對象
   * @param {Object} businessContext 業務上下文
   */
  static business(context, error, businessContext = {}) {
    return this.handle(context, error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS, {
      additionalInfo: businessContext,
      showUI: true,
      suggestSolution: true
    });
  }
  
  /**
   * 系統關鍵錯誤處理
   * @param {string} context 上下文
   * @param {Error} error 錯誤對象
   */
  static critical(context, error) {
    const result = this.handle(context, error, ERROR_LEVELS.CRITICAL, ERROR_CATEGORIES.SYSTEM, {
      showUI: true,
      notify: true,
      escalate: true
    });
    
    // 記錄到系統日誌
    this.logToSystemLog(result);
    
    return result;
  }
  
  /**
   * 數據相關錯誤處理
   * @param {string} context 上下文
   * @param {Error} error 錯誤對象
   * @param {Object} dataContext 數據上下文
   */
  static data(context, error, dataContext = {}) {
    return this.handle(context, error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.DATA, {
      additionalInfo: {
        dataType: dataContext.dataType,
        operation: dataContext.operation,
        affectedRecords: dataContext.affectedRecords
      },
      showUI: true
    });
  }
  
  /**
   * 權限錯誤處理
   * @param {string} context 上下文
   * @param {Error} error 錯誤對象
   * @param {string} requiredPermission 需要的權限
   */
  static permission(context, error, requiredPermission = '') {
    return this.handle(context, error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.PERMISSION, {
      additionalInfo: { requiredPermission: requiredPermission },
      showUI: true,
      suggestSolution: true
    });
  }
  
  /**
   * 包裝函數執行，自動錯誤處理
   * @param {Function} func 要執行的函數
   * @param {string} context 上下文
   * @param {Object} options 選項
   */
  static async wrap(func, context, options = {}) {
    const startTime = Date.now();
    let attempt = 0;
    const maxRetries = options.maxRetries || this.CONFIG.MAX_RETRIES;
    
    while (attempt <= maxRetries) {
      try {
        const result = await func();
        
        // 如果有重試，記錄成功恢復
        if (attempt > 0) {
          this.logRecovery(context, attempt, Date.now() - startTime);
        }
        
        return {
          success: true,
          result: result,
          attempts: attempt + 1,
          duration: Date.now() - startTime
        };
        
      } catch (error) {
        attempt++;
        
        const errorLevel = attempt > maxRetries ? ERROR_LEVELS.ERROR : ERROR_LEVELS.WARNING;
        const errorRecord = this.handle(`${context} (嘗試 ${attempt})`, error, errorLevel, ERROR_CATEGORIES.SYSTEM, {
          additionalInfo: { 
            attempt: attempt, 
            maxRetries: maxRetries,
            isRetry: attempt > 1
          },
          showUI: attempt > maxRetries // 只在最後失敗時顯示UI
        });
        
        // 如果還能重試
        if (attempt <= maxRetries && this.shouldRetry(error, attempt)) {
          const delay = this.CONFIG.RETRY_DELAYS[Math.min(attempt - 1, this.CONFIG.RETRY_DELAYS.length - 1)];
          Logger.log(`⏳ ${context} 第 ${attempt} 次重試，${delay}ms 後重試`);
          
          if (delay > 0) {
            Utilities.sleep(delay);
          }
          continue;
        }
        
        // 所有重試都失敗了
        return {
          success: false,
          error: error,
          errorId: errorRecord.errorId,
          attempts: attempt,
          duration: Date.now() - startTime
        };
      }
    }
  }
  
  /**
   * 批量錯誤處理 - 用於批量操作
   * @param {Array} errors 錯誤數組
   * @param {string} context 上下文
   */
  static batch(errors, context) {
    const batchId = this.generateErrorId();
    const results = [];
    
    errors.forEach((error, index) => {
      if (error) {
        const result = this.handle(`${context}[${index}]`, error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS, {
          additionalInfo: { batchId: batchId, index: index },
          showUI: false // 批量處理時不顯示UI
        });
        results.push(result);
      }
    });
    
    // 生成批量錯誤摘要
    const summary = this.generateBatchErrorSummary(results, context);
    
    // 如果錯誤率過高，顯示警告
    if (summary.errorRate > 0.5) {
      this.showBatchErrorWarning(summary);
    }
    
    return {
      batchId: batchId,
      results: results,
      summary: summary
    };
  }
  
  /**
   * 生成錯誤報告
   * @param {number} hours 報告時間範圍（小時）
   * @param {string} level 錯誤等級過濾（可選）
   * @param {string} category 錯誤類別過濾（可選）
   */
  static generateErrorReport(hours = 24, level = null, category = null) {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const recentErrors = this.errorLog.filter(error => {
      const matchTime = error.timestamp > cutoffTime;
      const matchLevel = !level || error.level === level;
      const matchCategory = !category || error.category === category;
      return matchTime && matchLevel && matchCategory;
    });
    
    if (recentErrors.length === 0) {
      return {
        summary: `過去 ${hours} 小時內沒有${level ? level + '級' : ''}${category ? category + '類' : ''}錯誤記錄`,
        totalErrors: 0,
        errorsByLevel: {},
        errorsByCategory: {},
        topErrors: [],
        recommendations: ['系統運行穩定，繼續保持良好狀態']
      };
    }
    
    // 統計分析
    const stats = this.analyzeErrors(recentErrors);
    
    // 生成建議
    const recommendations = this.generateErrorRecommendations(stats);
    
    Logger.log(`📊 [錯誤處理] 生成錯誤報告: ${hours}小時內 - ${recentErrors.length}個錯誤`);
    
    return {
      reportTime: new Date(),
      timeRange: `${hours}小時`,
      totalErrors: recentErrors.length,
      summary: `過去 ${hours} 小時內發生 ${recentErrors.length} 個錯誤`,
      errorsByLevel: stats.byLevel,
      errorsByCategory: stats.byCategory,
      topErrors: stats.topErrors,
      errorRate: this.calculateErrorRate(recentErrors, hours),
      resolvedRate: this.calculateResolvedRate(recentErrors),
      recommendations: recommendations,
      errors: recentErrors.slice(0, 50) // 限制返回數量
    };
  }
  
  /**
   * 獲取系統錯誤健康狀態
   */
  static getErrorHealth() {
    const report = this.generateErrorReport(24); // 最近24小時
    
    let healthScore = 100;
    let healthLevel = 'EXCELLENT';
    const issues = [];
    
    // 評估錯誤率
    if (report.errorRate > 10) {
      healthScore -= 30;
      issues.push(`錯誤率過高: ${report.errorRate.toFixed(1)}%`);
    } else if (report.errorRate > 5) {
      healthScore -= 15;
      issues.push(`錯誤率偏高: ${report.errorRate.toFixed(1)}%`);
    }
    
    // 評估關鍵錯誤
    const criticalCount = report.errorsByLevel[ERROR_LEVELS.CRITICAL] || 0;
    if (criticalCount > 0) {
      healthScore -= 25;
      issues.push(`關鍵錯誤: ${criticalCount}個`);
    }
    
    // 評估解決率
    if (report.resolvedRate < 0.8) {
      healthScore -= 20;
      issues.push(`錯誤解決率低: ${(report.resolvedRate * 100).toFixed(1)}%`);
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
      summary: issues.length === 0 ? '錯誤處理狀態良好' : `發現 ${issues.length} 個問題`,
      totalErrors: report.totalErrors,
      errorRate: report.errorRate,
      resolvedRate: report.resolvedRate,
      lastUpdated: new Date(),
      recommendations: report.recommendations
    };
  }
  
  // ============ 輔助方法 ============
  
  /**
   * 生成錯誤ID
   */
  static generateErrorId() {
    return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
   * 獲取用戶代理信息
   */
  static getUserAgent() {
    try {
      return 'Google Apps Script V8';
    } catch (error) {
      return 'unknown';
    }
  }
  
  /**
   * 生成用戶友好的錯誤信息
   */
  static generateFriendlyMessage(error, context) {
    const message = error.message.toLowerCase();
    
    // 查找匹配的友好消息
    for (const [key, friendlyMsg] of Object.entries(this.CONFIG.FRIENDLY_MESSAGES)) {
      if (message.includes(key.toLowerCase())) {
        return `${context}時發生問題：${friendlyMsg}`;
      }
    }
    
    // 根據錯誤類型生成通用友好消息
    if (message.includes('timeout')) {
      return `${context}操作超時，請嘗試將操作分批進行或稍後重試`;
    }
    
    if (message.includes('rate limit') || message.includes('quota')) {
      return `${context}時達到系統限制，請稍後再試`;
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return `${context}時出現網絡問題，請檢查網絡連線後重試`;
    }
    
    // 預設友好消息
    return `${context}時發生問題，請重試或聯繫管理員`;
  }
  
  /**
   * 確定錯誤等級
   */
  static determineErrorLevel(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('permission denied') || message.includes('access denied')) {
      return ERROR_LEVELS.ERROR;
    }
    
    if (message.includes('quota exceeded') || message.includes('timeout')) {
      return ERROR_LEVELS.WARNING;
    }
    
    if (message.includes('file not found') || message.includes('invalid')) {
      return ERROR_LEVELS.ERROR;
    }
    
    // 系統性錯誤
    if (message.includes('system') || message.includes('fatal')) {
      return ERROR_LEVELS.CRITICAL;
    }
    
    return ERROR_LEVELS.ERROR;
  }
  
  /**
   * 確定錯誤類別
   */
  static determineErrorCategory(error, context) {
    const message = error.message.toLowerCase();
    const contextLower = context.toLowerCase();
    
    if (message.includes('permission') || message.includes('access')) {
      return ERROR_CATEGORIES.PERMISSION;
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return ERROR_CATEGORIES.NETWORK;
    }
    
    if (contextLower.includes('student') || contextLower.includes('teacher') || contextLower.includes('data')) {
      return ERROR_CATEGORIES.DATA;
    }
    
    if (contextLower.includes('user') || contextLower.includes('input')) {
      return ERROR_CATEGORIES.USER_INPUT;
    }
    
    if (message.includes('timeout') || message.includes('slow')) {
      return ERROR_CATEGORIES.PERFORMANCE;
    }
    
    return ERROR_CATEGORIES.SYSTEM;
  }
  
  /**
   * 記錄錯誤
   */
  static logError(errorRecord) {
    // 添加到錯誤日誌
    this.errorLog.push(errorRecord);
    
    // 記錄到Logger
    const logLevel = this.getLogLevelEmoji(errorRecord.level);
    Logger.log(`${logLevel} [錯誤處理] ${errorRecord.context}: ${errorRecord.originalError.message}`);
    Logger.log(`   錯誤ID: ${errorRecord.id}`);
    Logger.log(`   類別: ${errorRecord.category}`);
    Logger.log(`   用戶: ${errorRecord.user}`);
    
    // 限制日誌大小
    if (this.errorLog.length > this.CONFIG.MAX_ERROR_RECORDS) {
      this.errorLog = this.errorLog.slice(-Math.floor(this.CONFIG.MAX_ERROR_RECORDS * 0.8));
    }
    
    // 清理舊記錄
    this.cleanupOldErrors();
  }
  
  /**
   * 更新錯誤統計
   */
  static updateErrorStats(errorRecord) {
    const key = `${errorRecord.level}_${errorRecord.category}`;
    const current = this.errorStats.get(key) || { count: 0, lastOccurred: null };
    
    current.count++;
    current.lastOccurred = errorRecord.timestamp;
    
    this.errorStats.set(key, current);
  }
  
  /**
   * 根據錯誤等級處理
   */
  static processErrorByLevel(errorRecord, options) {
    switch (errorRecord.level) {
      case ERROR_LEVELS.CRITICAL:
        this.processCriticalError(errorRecord, options);
        break;
      case ERROR_LEVELS.ERROR:
        this.processRegularError(errorRecord, options);
        break;
      case ERROR_LEVELS.WARNING:
        this.processWarning(errorRecord, options);
        break;
      case ERROR_LEVELS.INFO:
      case ERROR_LEVELS.DEBUG:
        this.processInfo(errorRecord, options);
        break;
    }
  }
  
  /**
   * 處理關鍵錯誤
   */
  static processCriticalError(errorRecord, options) {
    // 立即顯示用戶警告
    if (options.showUI !== false) {
      this.showErrorToUser(errorRecord, '關鍵錯誤');
    }
    
    // 記錄到系統日誌
    this.logToSystemLog(errorRecord);
    
    // 如果需要，發送通知
    if (options.notify) {
      this.sendErrorNotification(errorRecord);
    }
  }
  
  /**
   * 處理一般錯誤
   */
  static processRegularError(errorRecord, options) {
    if (options.showUI !== false) {
      this.showErrorToUser(errorRecord);
    }
  }
  
  /**
   * 處理警告
   */
  static processWarning(errorRecord, options) {
    if (options.showUI === true) {
      this.showErrorToUser(errorRecord, '警告');
    }
  }
  
  /**
   * 處理信息
   */
  static processInfo(errorRecord, options) {
    // 信息級錯誤通常不顯示給用戶
    Logger.log(`ℹ️ [信息] ${errorRecord.context}: ${errorRecord.friendlyMessage}`);
  }
  
  /**
   * 向用戶顯示錯誤
   */
  static showErrorToUser(errorRecord, title = '錯誤') {
    const ui = safeGetUI();
    if (ui) {
      try {
        const message = `${errorRecord.friendlyMessage}\n\n錯誤ID: ${errorRecord.id}\n時間: ${errorRecord.timestamp.toLocaleString()}`;
        ui.alert(title, message, ui.ButtonSet.OK);
      } catch (uiError) {
        Logger.log(`無法顯示錯誤警告: ${uiError.toString()}`);
      }
    } else {
      Logger.log(`Web環境錯誤: ${title} - ${errorRecord.friendlyMessage}`);
    }
  }
  
  /**
   * 判斷是否應該重試
   */
  static shouldRetry(error, retryCount) {
    const message = error.message.toLowerCase();
    
    // 不重試的錯誤類型
    const noRetryErrors = [
      'permission denied',
      'access denied', 
      'invalid argument',
      'file not found'
    ];
    
    if (noRetryErrors.some(noRetry => message.includes(noRetry))) {
      return false;
    }
    
    // 可重試的錯誤類型
    const retryableErrors = [
      'timeout',
      'network',
      'connection',
      'temporary',
      'rate limit',
      'quota'
    ];
    
    return retryableErrors.some(retryable => message.includes(retryable)) && 
           retryCount < this.CONFIG.MAX_RETRIES;
  }
  
  /**
   * 記錄恢復成功
   */
  static logRecovery(context, attempts, duration) {
    Logger.log(`✅ [錯誤恢復] ${context} - 經過 ${attempts} 次嘗試後成功恢復 (${duration}ms)`);
  }
  
  /**
   * 記錄到系統日誌
   */
  static logToSystemLog(errorRecord) {
    try {
      if (typeof systemLog === 'function') {
        systemLog(errorRecord.level, 'ErrorHandler', errorRecord.context, 
                 `錯誤ID: ${errorRecord.id}, 信息: ${errorRecord.originalError.message}`);
      }
    } catch (error) {
      Logger.log('記錄系統日誌失敗：' + error.message);
    }
  }
  
  /**
   * 獲取日誌等級表情符號
   */
  static getLogLevelEmoji(level) {
    const emojis = {
      [ERROR_LEVELS.CRITICAL]: '🚨',
      [ERROR_LEVELS.ERROR]: '❌',
      [ERROR_LEVELS.WARNING]: '⚠️',
      [ERROR_LEVELS.INFO]: 'ℹ️',
      [ERROR_LEVELS.DEBUG]: '🔍'
    };
    return emojis[level] || '📋';
  }
  
  /**
   * 清理舊錯誤記錄
   */
  static cleanupOldErrors() {
    if (this.errorLog.length <= this.CONFIG.MAX_ERROR_RECORDS) return;
    
    const cutoffTime = new Date(Date.now() - (this.CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000));
    this.errorLog = this.errorLog.filter(error => error.timestamp > cutoffTime);
  }
  
  /**
   * 分析錯誤數據
   */
  static analyzeErrors(errors) {
    const byLevel = {};
    const byCategory = {};
    const contextCount = {};
    
    errors.forEach(error => {
      // 按等級統計
      byLevel[error.level] = (byLevel[error.level] || 0) + 1;
      
      // 按類別統計
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      
      // 按上下文統計
      contextCount[error.context] = (contextCount[error.context] || 0) + 1;
    });
    
    // 找出最常見的錯誤
    const topErrors = Object.entries(contextCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([context, count]) => ({ context, count }));
    
    return {
      byLevel,
      byCategory,
      topErrors
    };
  }
  
  /**
   * 生成錯誤建議
   */
  static generateErrorRecommendations(stats) {
    const recommendations = [];
    
    if (stats.byLevel[ERROR_LEVELS.CRITICAL] > 0) {
      recommendations.push('發現關鍵錯誤，建議立即檢查系統狀態');
    }
    
    if (stats.byCategory[ERROR_CATEGORIES.PERMISSION] > 5) {
      recommendations.push('權限錯誤頻繁，建議檢查 Google Drive 共享設定');
    }
    
    if (stats.byCategory[ERROR_CATEGORIES.PERFORMANCE] > 10) {
      recommendations.push('性能問題較多，建議優化批量操作或分批處理');
    }
    
    if (stats.topErrors.length > 0) {
      const topError = stats.topErrors[0];
      recommendations.push(`最常見錯誤：${topError.context}，建議優先處理`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('錯誤狀況正常，繼續保持良好狀態');
    }
    
    return recommendations;
  }
  
  /**
   * 計算錯誤率
   */
  static calculateErrorRate(errors, hours) {
    // 簡化計算，假設每小時有固定數量的操作
    const estimatedOperationsPerHour = 100;
    const totalEstimatedOperations = hours * estimatedOperationsPerHour;
    return (errors.length / totalEstimatedOperations) * 100;
  }
  
  /**
   * 計算解決率
   */
  static calculateResolvedRate(errors) {
    if (errors.length === 0) return 1.0;
    const resolvedCount = errors.filter(error => error.resolved).length;
    return resolvedCount / errors.length;
  }
  
  /**
   * 發送錯誤通知（預留功能）
   */
  static sendErrorNotification(errorRecord) {
    Logger.log(`📧 [通知] 關鍵錯誤通知: ${errorRecord.context} - ${errorRecord.friendlyMessage}`);
    // 這裡可以實施實際的通知機制（如郵件、Slack等）
  }
  
  /**
   * 生成批量錯誤摘要
   */
  static generateBatchErrorSummary(results, context) {
    const totalErrors = results.length;
    const errorsByLevel = {};
    
    results.forEach(result => {
      errorsByLevel[result.level] = (errorsByLevel[result.level] || 0) + 1;
    });
    
    return {
      context: context,
      totalErrors: totalErrors,
      errorsByLevel: errorsByLevel,
      errorRate: totalErrors / 100 // 假設100個操作
    };
  }
  
  /**
   * 顯示批量錯誤警告
   */
  static showBatchErrorWarning(summary) {
    const message = `批量操作 "${summary.context}" 錯誤率過高 (${(summary.errorRate * 100).toFixed(1)}%)\n\n建議檢查數據源和操作邏輯`;
    Logger.log(`⚠️ 批量錯誤警告: ${message}`);
    
    const ui = safeGetUI();
    if (ui) {
      try {
        ui.alert('批量操作警告', message, ui.ButtonSet.OK);
      } catch (error) {
        Logger.log('顯示批量錯誤警告失敗：' + error.message);
      }
    }
  }
}

// ============ 便利函數 - 兼容現有代碼 ============

/**
 * 增強版的 safeErrorHandler - 向後兼容
 * @param {string} context 上下文
 * @param {Error} error 錯誤對象
 * @param {string} userMessage 自定義用戶信息
 */
function safeErrorHandler(context, error, userMessage = null) {
  return ErrorHandler.quick(context, error, userMessage);
}

/**
 * 快速錯誤處理包裝函數
 */
function handleError(context, error, level = ERROR_LEVELS.ERROR) {
  return ErrorHandler.handle(context, error, level);
}

/**
 * 包裝函數執行，自動錯誤處理
 */
function withErrorHandling(func, context, options = {}) {
  return ErrorHandler.wrap(func, context, options);
}

/**
 * 獲取錯誤報告
 */
function getErrorReport(hours = 24) {
  return ErrorHandler.generateErrorReport(hours);
}

/**
 * 獲取錯誤健康狀態
 */
function getErrorHealthStatus() {
  return ErrorHandler.getErrorHealth();
}