/**
 * 查詢服務系統
 * 實現 CQRS 模式的查詢端，專門處理讀取操作
 * Version: 1.0.0 - Phase 3 微服務架構
 */

/**
 * 查詢基類
 */
class Query {
  constructor(queryType, criteria = {}, options = {}) {
    this.id = this.generateQueryId();
    this.queryType = queryType;
    this.criteria = criteria;
    this.options = options;
    this.timestamp = new Date().toISOString();
    this.executionTime = null;
    this.resultCount = null;
  }
  
  generateQueryId() {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  setExecutionMetrics(executionTime, resultCount) {
    this.executionTime = executionTime;
    this.resultCount = resultCount;
  }
  
  toJSON() {
    return {
      id: this.id,
      queryType: this.queryType,
      criteria: this.criteria,
      options: this.options,
      timestamp: this.timestamp,
      executionTime: this.executionTime,
      resultCount: this.resultCount
    };
  }
}

/**
 * 查詢處理器基類
 */
class QueryHandler {
  constructor(handlerName) {
    this.handlerName = handlerName;
  }
  
  /**
   * 執行查詢 - 子類必須實現
   * @param {Query} query 查詢對象
   * @return {Promise<Object>} 查詢結果
   */
  async execute(query) {
    throw new Error(`QueryHandler ${this.handlerName} must implement execute method`);
  }
  
  /**
   * 檢查是否能處理此查詢類型
   * @param {string} queryType 查詢類型
   * @return {boolean} 是否能處理
   */
  canHandle(queryType) {
    return false; // 子類應該重寫此方法
  }
  
  /**
   * 驗證查詢參數 - 可被子類重寫
   * @param {Query} query 查詢對象
   * @return {Object} 驗證結果 {valid: boolean, errors: string[]}
   */
  validate(query) {
    return { valid: true, errors: [] };
  }
}

/**
 * 查詢結果包裝器
 */
class QueryResult {
  constructor(data, totalCount = null, pageInfo = null) {
    this.data = data;
    this.totalCount = totalCount;
    this.pageInfo = pageInfo;
    this.timestamp = new Date().toISOString();
    this.success = true;
  }
  
  static error(message, code = 'QUERY_ERROR') {
    const result = new QueryResult(null);
    result.success = false;
    result.error = {
      message: message,
      code: code
    };
    return result;
  }
  
  static paginated(data, totalCount, page, pageSize) {
    const totalPages = Math.ceil(totalCount / pageSize);
    const pageInfo = {
      currentPage: page,
      pageSize: pageSize,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
    
    return new QueryResult(data, totalCount, pageInfo);
  }
}

/**
 * 查詢處理器註冊表
 */
class QueryRegistry {
  constructor() {
    this.handlers = new Map(); // queryType -> handler
    this.middleware = [];
  }
  
  /**
   * 註冊查詢處理器
   * @param {string} queryType 查詢類型
   * @param {QueryHandler} handler 查詢處理器
   */
  register(queryType, handler) {
    if (this.handlers.has(queryType)) {
      throw new Error(`Query handler for ${queryType} already registered`);
    }
    
    this.handlers.set(queryType, handler);
    Logger.log(`[QueryRegistry] 註冊查詢處理器: ${handler.handlerName} for ${queryType}`);
  }
  
  /**
   * 獲取查詢處理器
   * @param {string} queryType 查詢類型
   * @return {QueryHandler|null} 查詢處理器
   */
  getHandler(queryType) {
    return this.handlers.get(queryType) || null;
  }
  
  /**
   * 添加中間件
   * @param {Object} middleware 中間件
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }
  
  /**
   * 獲取所有已註冊的查詢類型
   * @return {Array} 查詢類型列表
   */
  getRegisteredQueries() {
    return Array.from(this.handlers.keys());
  }
}

/**
 * 查詢服務核心類
 */
class QueryService {
  constructor() {
    this.registry = new QueryRegistry();
    this.queryLog = [];
    this.maxLogSize = 1000;
    this.cachingEnabled = true;
  }
  
  /**
   * 註冊查詢處理器
   * @param {string} queryType 查詢類型
   * @param {QueryHandler} handler 查詢處理器
   */
  registerHandler(queryType, handler) {
    this.registry.register(queryType, handler);
  }
  
  /**
   * 添加中間件
   * @param {Object} middleware 中間件
   */
  addMiddleware(middleware) {
    this.registry.addMiddleware(middleware);
  }
  
  /**
   * 執行查詢
   * @param {Query} query 查詢對象
   * @return {Promise<QueryResult>} 查詢結果
   */
  async executeQuery(query) {
    const perfSession = startTimer(`QueryService.execute.${query.queryType}`, 'QUERY');
    
    try {
      // 記錄查詢
      this.logQuery(query);
      
      // 獲取處理器
      const handler = this.registry.getHandler(query.queryType);
      if (!handler) {
        throw new Error(`No handler registered for query type: ${query.queryType}`);
      }
      
      perfSession.checkpoint('找到處理器');
      
      // 驗證查詢
      const validation = handler.validate(query);
      if (!validation.valid) {
        throw new Error(`Query validation failed: ${validation.errors.join(', ')}`);
      }
      
      perfSession.checkpoint('查詢驗證完成');
      
      // 檢查緩存（如果啟用）
      if (this.cachingEnabled) {
        const cacheKey = this.generateCacheKey(query);
        const cachedResult = await globalCache.get(cacheKey);
        if (cachedResult) {
          perfSession.end(true, '緩存命中');
          Logger.log(`[QueryService] 緩存命中: ${query.queryType} (${query.id})`);
          return cachedResult;
        }
      }
      
      // 執行前置中間件
      for (const middleware of this.registry.middleware) {
        if (middleware.beforeExecute) {
          await middleware.beforeExecute(query);
        }
      }
      
      Logger.log(`[QueryService] 執行查詢: ${query.queryType} (${query.id})`);
      
      // 執行查詢
      const result = await handler.execute(query);
      
      // 設定執行指標
      query.setExecutionMetrics(perfSession.getDuration(), this.getResultCount(result));
      
      perfSession.checkpoint('查詢執行完成');
      
      // 執行後置中間件
      for (const middleware of this.registry.middleware) {
        if (middleware.afterExecute) {
          await middleware.afterExecute(query, result);
        }
      }
      
      // 緩存結果（如果啟用且結果成功）
      if (this.cachingEnabled && result.success) {
        const cacheKey = this.generateCacheKey(query);
        const cacheTTL = this.determineCacheTTL(query.queryType);
        await globalCache.set(cacheKey, result, cacheTTL);
      }
      
      perfSession.end(true, '查詢執行成功');
      
      return result;
      
    } catch (error) {
      perfSession.end(false, error.message);
      
      // 錯誤處理
      ErrorHandler.handle('QueryService.executeQuery', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM, {
        additionalInfo: { 
          queryType: query.queryType, 
          queryId: query.id,
          criteria: query.criteria
        },
        showUI: false
      });
      
      // 執行錯誤中間件
      for (const middleware of this.registry.middleware) {
        if (middleware.onError) {
          try {
            await middleware.onError(query, error);
          } catch (middlewareError) {
            Logger.log(`[QueryService] 中間件錯誤處理失敗: ${middlewareError.message}`);
          }
        }
      }
      
      return QueryResult.error(error.message);
    }
  }
  
  /**
   * 並行執行多個查詢
   * @param {Array<Query>} queries 查詢列表
   * @return {Promise<Array<QueryResult>>} 查詢結果列表
   */
  async executeQueries(queries) {
    const perfSession = startTimer('QueryService.executeQueries', 'QUERY_BATCH');
    
    try {
      Logger.log(`[QueryService] 開始並行執行 ${queries.length} 個查詢`);
      
      const promises = queries.map(query => 
        this.executeQuery(query).catch(error => QueryResult.error(error.message))
      );
      
      const results = await Promise.all(promises);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      perfSession.end(true, `並行查詢完成: ${successCount}成功, ${failureCount}失敗`);
      
      return results;
      
    } catch (error) {
      perfSession.end(false, error.message);
      throw error;
    }
  }
  
  /**
   * 獲取查詢日誌
   * @param {number} limit 限制數量
   * @return {Array} 查詢日誌
   */
  getQueryLog(limit = 100) {
    return this.queryLog.slice(-limit);
  }
  
  /**
   * 獲取統計資訊
   * @return {Object} 統計資訊
   */
  getStats() {
    const totalQueries = this.queryLog.length;
    const queryTypes = new Set(this.queryLog.map(log => log.query.queryType));
    
    // 計算平均執行時間
    const queriesWithTime = this.queryLog.filter(log => log.query.executionTime !== null);
    const avgExecutionTime = queriesWithTime.length > 0 
      ? queriesWithTime.reduce((sum, log) => sum + log.query.executionTime, 0) / queriesWithTime.length
      : 0;
    
    return {
      totalQueries: totalQueries,
      uniqueQueryTypes: queryTypes.size,
      averageExecutionTime: Math.round(avgExecutionTime),
      registeredHandlers: this.registry.getRegisteredQueries().length,
      cachingEnabled: this.cachingEnabled
    };
  }
  
  /**
   * 清理查詢日誌
   */
  clearLog() {
    this.queryLog = [];
    Logger.log('[QueryService] 查詢日誌已清理');
  }
  
  /**
   * 啟用/禁用緩存
   * @param {boolean} enabled 是否啟用
   */
  setCachingEnabled(enabled) {
    this.cachingEnabled = enabled;
    Logger.log(`[QueryService] 緩存${enabled ? '啟用' : '禁用'}`);
  }
  
  // === 私有方法 ===
  
  /**
   * 記錄查詢到日誌
   */
  logQuery(query) {
    this.queryLog.push({
      timestamp: new Date(),
      query: query
    });
    
    // 維護日誌大小
    if (this.queryLog.length > this.maxLogSize) {
      this.queryLog.splice(0, this.queryLog.length - this.maxLogSize);
    }
  }
  
  /**
   * 生成緩存鍵
   */
  generateCacheKey(query) {
    const criteriaHash = JSON.stringify(query.criteria).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    const optionsHash = JSON.stringify(query.options).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    return `query_${query.queryType}_${criteriaHash}_${optionsHash}`;
  }
  
  /**
   * 決定緩存TTL
   */
  determineCacheTTL(queryType) {
    const cacheTTLMapping = {
      'GetTeachers': CACHE_CONFIG.TTL.TEACHER_LIST,
      'GetStudents': CACHE_CONFIG.TTL.STUDENT_DATA,
      'GetSystemStatus': CACHE_CONFIG.TTL.SYSTEM_STATUS,
      'SearchRecords': CACHE_CONFIG.TTL.SEARCH_RESULTS
    };
    
    return cacheTTLMapping[queryType] || CACHE_CONFIG.DEFAULT_TTL;
  }
  
  /**
   * 獲取結果數量
   */
  getResultCount(result) {
    if (!result.success) return 0;
    if (result.totalCount !== null) return result.totalCount;
    if (Array.isArray(result.data)) return result.data.length;
    return 1;
  }
}

/**
 * 預定義的查詢類型
 */
const QUERY_TYPES = {
  // 教師查詢
  GET_TEACHERS: 'GetTeachers',
  GET_TEACHER_BY_ID: 'GetTeacherById',
  SEARCH_TEACHERS: 'SearchTeachers',
  GET_TEACHER_RECORDBOOKS: 'GetTeacherRecordBooks',
  
  // 學生查詢
  GET_STUDENTS: 'GetStudents',
  GET_STUDENT_BY_ID: 'GetStudentById',
  SEARCH_STUDENTS: 'SearchStudents',
  GET_STUDENTS_BY_CLASS: 'GetStudentsByClass',
  
  // 系統查詢
  GET_SYSTEM_STATUS: 'GetSystemStatus',
  GET_SYSTEM_HEALTH: 'GetSystemHealth',
  GET_SYSTEM_STATS: 'GetSystemStats',
  
  // 通訊記錄查詢
  GET_CONTACT_RECORDS: 'GetContactRecords',
  SEARCH_CONTACT_RECORDS: 'SearchContactRecords',
  GET_CONTACT_HISTORY: 'GetContactHistory',
  
  // 分析查詢
  GET_ANALYTICS_DASHBOARD: 'GetAnalyticsDashboard',
  GET_PERFORMANCE_METRICS: 'GetPerformanceMetrics',
  GET_USAGE_STATISTICS: 'GetUsageStatistics'
};

/**
 * 查詢工廠
 */
const QueryFactory = {
  /**
   * 創建教師相關查詢
   */
  getTeachers(criteria = {}, options = {}) {
    return new Query(QUERY_TYPES.GET_TEACHERS, criteria, options);
  },
  
  getTeacherById(teacherId, options = {}) {
    return new Query(QUERY_TYPES.GET_TEACHER_BY_ID, { id: teacherId }, options);
  },
  
  searchTeachers(searchTerm, options = {}) {
    return new Query(QUERY_TYPES.SEARCH_TEACHERS, { searchTerm: searchTerm }, options);
  },
  
  /**
   * 創建學生相關查詢
   */
  getStudents(criteria = {}, options = {}) {
    return new Query(QUERY_TYPES.GET_STUDENTS, criteria, options);
  },
  
  getStudentById(studentId, options = {}) {
    return new Query(QUERY_TYPES.GET_STUDENT_BY_ID, { id: studentId }, options);
  },
  
  getStudentsByClass(className, options = {}) {
    return new Query(QUERY_TYPES.GET_STUDENTS_BY_CLASS, { className: className }, options);
  },
  
  /**
   * 創建系統相關查詢
   */
  getSystemStatus(options = {}) {
    return new Query(QUERY_TYPES.GET_SYSTEM_STATUS, {}, options);
  },
  
  getSystemHealth(options = {}) {
    return new Query(QUERY_TYPES.GET_SYSTEM_HEALTH, {}, options);
  },
  
  /**
   * 創建分頁查詢
   */
  createPaginatedQuery(queryType, criteria = {}, page = 1, pageSize = 20) {
    return new Query(queryType, criteria, { 
      page: page, 
      pageSize: pageSize,
      paginated: true 
    });
  }
};

/**
 * 全域查詢服務實例
 */
const globalQueryService = new QueryService();

/**
 * 添加預設中間件
 */
globalQueryService.addMiddleware({
  beforeExecute: async (query) => {
    Logger.log(`[QueryService] 開始執行查詢: ${query.queryType} (${query.id})`);
  },
  afterExecute: async (query, result) => {
    const resultCount = result.success ? (result.totalCount || (Array.isArray(result.data) ? result.data.length : 1)) : 0;
    Logger.log(`[QueryService] 查詢執行完成: ${query.queryType} (${query.id}) - 結果數量: ${resultCount}`);
  },
  onError: async (query, error) => {
    Logger.log(`[QueryService] 查詢執行失敗: ${query.queryType} (${query.id}) - ${error.message}`);
  }
});

// 匯出供其他模組使用
const QueryServiceExports = {
  Query,
  QueryHandler,
  QueryResult,
  QueryService,
  QUERY_TYPES,
  QueryFactory,
  globalQueryService
};