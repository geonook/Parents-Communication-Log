/**
 * 事件總線系統
 * 微服務間解耦通訊的核心組件
 * Version: 1.0.0 - Phase 3 微服務架構
 */

/**
 * 領域事件基類
 */
class DomainEvent {
  constructor(eventType, data, source = null) {
    this.id = this.generateEventId();
    this.eventType = eventType;
    this.data = data;
    this.source = source;
    this.timestamp = new Date().toISOString();
    this.version = '1.0';
    this.correlationId = this.generateCorrelationId();
  }
  
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateCorrelationId() {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  toJSON() {
    return {
      id: this.id,
      eventType: this.eventType,
      data: this.data,
      source: this.source,
      timestamp: this.timestamp,
      version: this.version,
      correlationId: this.correlationId
    };
  }
}

/**
 * 事件處理器介面
 */
class EventHandler {
  constructor(handlerName) {
    this.handlerName = handlerName;
  }
  
  /**
   * 處理事件 - 子類必須實現
   * @param {DomainEvent} event 領域事件
   * @return {Promise<Object>} 處理結果
   */
  async handle(event) {
    throw new Error(`Handler ${this.handlerName} must implement handle method`);
  }
  
  /**
   * 檢查是否能處理此事件類型
   * @param {string} eventType 事件類型
   * @return {boolean} 是否能處理
   */
  canHandle(eventType) {
    return false; // 子類應該重寫此方法
  }
}

/**
 * 事件總線核心類
 */
class EventBus {
  constructor() {
    this.handlers = new Map(); // eventType -> handlers[]
    this.middleware = [];
    this.eventLog = [];
    this.maxLogSize = 1000;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    };
  }
  
  /**
   * 註冊事件處理器
   * @param {string} eventType 事件類型
   * @param {EventHandler} handler 事件處理器
   */
  subscribe(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType).push(handler);
    Logger.log(`[EventBus] 註冊處理器: ${handler.handlerName} for ${eventType}`);
  }
  
  /**
   * 取消註冊事件處理器
   * @param {string} eventType 事件類型
   * @param {EventHandler} handler 事件處理器
   */
  unsubscribe(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      return;
    }
    
    const handlers = this.handlers.get(eventType);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      Logger.log(`[EventBus] 取消註冊處理器: ${handler.handlerName} for ${eventType}`);
    }
  }
  
  /**
   * 發布事件
   * @param {DomainEvent} event 領域事件
   * @return {Promise<Object>} 發布結果
   */
  async publish(event) {
    const perfSession = startTimer(`EventBus.publish.${event.eventType}`, 'EVENT_BUS');
    
    try {
      // 記錄事件
      this.logEvent(event);
      
      // 執行中間件 (前置處理)
      for (const middleware of this.middleware) {
        if (middleware.before) {
          await middleware.before(event);
        }
      }
      
      perfSession.checkpoint('中間件前置處理完成');
      
      const handlers = this.handlers.get(event.eventType) || [];
      
      if (handlers.length === 0) {
        Logger.log(`[EventBus] 沒有找到事件處理器: ${event.eventType}`);
        perfSession.end(true, '無處理器');
        return {
          success: true,
          message: '事件發布成功，但沒有處理器',
          handlersCount: 0,
          results: []
        };
      }
      
      Logger.log(`[EventBus] 發布事件: ${event.eventType} 到 ${handlers.length} 個處理器`);
      
      // 並行執行所有處理器
      const handlerPromises = handlers.map(async (handler) => {
        return await this.executeHandlerWithRetry(handler, event);
      });
      
      const results = await Promise.allSettled(handlerPromises);
      
      perfSession.checkpoint('處理器執行完成');
      
      // 執行中間件 (後置處理)
      for (const middleware of this.middleware) {
        if (middleware.after) {
          await middleware.after(event, results);
        }
      }
      
      // 統計結果
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;
      
      const publishResult = {
        success: failureCount === 0,
        message: `事件處理完成: ${successCount} 成功, ${failureCount} 失敗`,
        handlersCount: handlers.length,
        successCount: successCount,
        failureCount: failureCount,
        results: results.map((result, index) => ({
          handler: handlers[index].handlerName,
          status: result.status,
          value: result.status === 'fulfilled' ? result.value : null,
          error: result.status === 'rejected' ? result.reason.message : null
        }))
      };
      
      perfSession.end(publishResult.success, publishResult.message);
      
      return publishResult;
      
    } catch (error) {
      perfSession.end(false, error.message);
      
      ErrorHandler.handle('EventBus.publish', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM, {
        additionalInfo: { eventType: event.eventType, eventId: event.id },
        showUI: false
      });
      
      throw error;
    }
  }
  
  /**
   * 帶重試機制的處理器執行
   * @param {EventHandler} handler 事件處理器
   * @param {DomainEvent} event 領域事件
   * @return {Promise<Object>} 處理結果
   */
  async executeHandlerWithRetry(handler, event) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await handler.handle(event);
        
        if (attempt > 0) {
          Logger.log(`[EventBus] 處理器 ${handler.handlerName} 重試第 ${attempt} 次成功`);
        }
        
        return {
          success: true,
          result: result,
          attempts: attempt + 1
        };
        
      } catch (error) {
        lastError = error;
        
        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(2, attempt),
            this.retryConfig.maxDelay
          );
          
          Logger.log(`[EventBus] 處理器 ${handler.handlerName} 失敗，${delay}ms 後重試 (${attempt + 1}/${this.retryConfig.maxRetries})`);
          
          await this.sleep(delay);
        }
      }
    }
    
    Logger.log(`[EventBus] 處理器 ${handler.handlerName} 最終失敗: ${lastError.message}`);
    throw lastError;
  }
  
  /**
   * 添加中間件
   * @param {Object} middleware 中間件 {before?, after?}
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
    Logger.log(`[EventBus] 添加中間件`);
  }
  
  /**
   * 獲取事件日誌
   * @param {number} limit 限制數量
   * @return {Array} 事件日誌
   */
  getEventLog(limit = 100) {
    return this.eventLog.slice(-limit);
  }
  
  /**
   * 清理事件日誌
   */
  clearEventLog() {
    this.eventLog = [];
    Logger.log('[EventBus] 事件日誌已清理');
  }
  
  /**
   * 獲取統計資訊
   * @return {Object} 統計資訊
   */
  getStats() {
    const eventTypes = new Set(this.eventLog.map(log => log.event.eventType));
    const handlerCounts = {};
    
    this.handlers.forEach((handlers, eventType) => {
      handlerCounts[eventType] = handlers.length;
    });
    
    return {
      totalEvents: this.eventLog.length,
      uniqueEventTypes: eventTypes.size,
      registeredEventTypes: this.handlers.size,
      handlerCounts: handlerCounts,
      middlewareCount: this.middleware.length
    };
  }
  
  // === 私有方法 ===
  
  /**
   * 記錄事件
   */
  logEvent(event) {
    this.eventLog.push({
      timestamp: new Date(),
      event: event.toJSON()
    });
    
    // 維護日誌大小
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.splice(0, this.eventLog.length - this.maxLogSize);
    }
  }
  
  /**
   * 延遲執行
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 預定義的領域事件類型
 */
const DOMAIN_EVENTS = {
  // 教師領域事件
  TEACHER_CREATED: 'teacher.created',
  TEACHER_UPDATED: 'teacher.updated',
  TEACHER_DELETED: 'teacher.deleted',
  TEACHER_RECORDBOOK_CREATED: 'teacher.recordbook.created',
  
  // 學生領域事件
  STUDENT_IMPORTED: 'student.imported',
  STUDENT_UPDATED: 'student.updated',
  STUDENT_CLASS_CHANGED: 'student.class.changed',
  
  // 通訊記錄事件
  CONTACT_RECORD_CREATED: 'contact.record.created',
  CONTACT_RECORD_UPDATED: 'contact.record.updated',
  CONTACT_BATCH_PROCESSED: 'contact.batch.processed',
  
  // 系統事件
  SYSTEM_INITIALIZED: 'system.initialized',
  SYSTEM_BACKUP_CREATED: 'system.backup.created',
  SYSTEM_ERROR_OCCURRED: 'system.error.occurred',
  
  // 分析事件
  ANALYTICS_REPORT_GENERATED: 'analytics.report.generated',
  PERFORMANCE_THRESHOLD_EXCEEDED: 'analytics.performance.threshold.exceeded'
};

/**
 * 事件工廠
 */
const EventFactory = {
  /**
   * 創建教師相關事件
   */
  createTeacherCreated(teacherData, source = 'TeacherService') {
    return new DomainEvent(DOMAIN_EVENTS.TEACHER_CREATED, teacherData, source);
  },
  
  createTeacherUpdated(teacherData, changes, source = 'TeacherService') {
    return new DomainEvent(DOMAIN_EVENTS.TEACHER_UPDATED, { 
      teacher: teacherData, 
      changes: changes 
    }, source);
  },
  
  createTeacherRecordBookCreated(teacherData, recordBookData, source = 'TeacherService') {
    return new DomainEvent(DOMAIN_EVENTS.TEACHER_RECORDBOOK_CREATED, {
      teacher: teacherData,
      recordBook: recordBookData
    }, source);
  },
  
  /**
   * 創建學生相關事件
   */
  createStudentImported(studentsData, importStats, source = 'StudentService') {
    return new DomainEvent(DOMAIN_EVENTS.STUDENT_IMPORTED, {
      students: studentsData,
      stats: importStats
    }, source);
  },
  
  createStudentClassChanged(studentData, oldClass, newClass, source = 'StudentService') {
    return new DomainEvent(DOMAIN_EVENTS.STUDENT_CLASS_CHANGED, {
      student: studentData,
      oldClass: oldClass,
      newClass: newClass
    }, source);
  },
  
  /**
   * 創建系統相關事件
   */
  createSystemInitialized(initData, source = 'SystemService') {
    return new DomainEvent(DOMAIN_EVENTS.SYSTEM_INITIALIZED, initData, source);
  },
  
  createSystemError(errorData, source = 'ErrorHandler') {
    return new DomainEvent(DOMAIN_EVENTS.SYSTEM_ERROR_OCCURRED, errorData, source);
  }
};

/**
 * 全域事件總線實例
 */
const globalEventBus = new EventBus();

/**
 * 添加預設中間件
 */
globalEventBus.addMiddleware({
  before: async (event) => {
    Logger.log(`[EventBus] 處理事件: ${event.eventType} (${event.id})`);
  },
  after: async (event, results) => {
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;
    Logger.log(`[EventBus] 事件處理完成: ${event.eventType} - 成功:${successCount}, 失敗:${failureCount}`);
  }
});

// 匯出供其他模組使用
const EventBusExports = {
  DomainEvent,
  EventHandler,
  EventBus,
  DOMAIN_EVENTS,
  EventFactory,
  globalEventBus
};