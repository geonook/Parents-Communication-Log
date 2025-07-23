/**
 * API服務層基類
 * 提供統一的API響應格式和錯誤處理
 * Version: 1.0.0 - Phase 2 API重構
 */

/**
 * API基礎服務類
 * 所有服務類的基類，提供統一的API標準
 */
class ApiService {
  constructor() {
    this.serviceName = this.constructor.name;
  }
  
  /**
   * 創建標準API響應
   * @param {boolean} success 成功狀態
   * @param {*} data 響應數據
   * @param {string} message 響應訊息
   * @param {Object} meta 元數據
   * @return {Object} 標準化API響應
   */
  createResponse(success, data = null, message = '', meta = {}) {
    const response = {
      success: success,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      version: '2.0.0'
    };
    
    if (data !== null) {
      response.data = data;
    }
    
    if (message) {
      response.message = message;
    }
    
    if (Object.keys(meta).length > 0) {
      response.meta = meta;
    }
    
    return response;
  }
  
  /**
   * 創建成功響應
   * @param {*} data 響應數據
   * @param {string} message 成功訊息
   * @param {Object} meta 元數據
   * @return {Object} 成功響應
   */
  success(data = null, message = '', meta = {}) {
    return this.createResponse(true, data, message, meta);
  }
  
  /**
   * 創建錯誤響應
   * @param {string} message 錯誤訊息
   * @param {string} code 錯誤代碼
   * @param {Object} details 錯誤詳情
   * @return {Object} 錯誤響應
   */
  error(message, code = 'UNKNOWN_ERROR', details = {}) {
    const errorResponse = this.createResponse(false, null, message, {
      errorCode: code,
      details: details
    });
    
    // 記錄錯誤到系統日誌
    Logger.log(`[${this.serviceName}] Error: ${message} (Code: ${code})`);
    
    return errorResponse;
  }
  
  /**
   * 執行帶錯誤處理的操作
   * @param {Function} operation 要執行的操作
   * @param {string} operationName 操作名稱
   * @param {Object} context 上下文信息
   * @return {Object} API響應
   */
  async executeWithErrorHandling(operation, operationName, context = {}) {
    const perfSession = startTimer(`${this.serviceName}.${operationName}`, 'API_CALL');
    
    try {
      perfSession.checkpoint('開始執行操作');
      
      const result = await operation();
      
      perfSession.checkpoint('操作執行完成');
      perfSession.end(true, '成功完成');
      
      return result;
      
    } catch (error) {
      perfSession.end(false, error.message);
      
      const errorResult = ErrorHandler.handle(
        `${this.serviceName}.${operationName}`, 
        error, 
        ERROR_LEVELS.ERROR, 
        ERROR_CATEGORIES.SYSTEM,
        {
          additionalInfo: context,
          showUI: false
        }
      );
      
      return this.error(
        errorResult.friendlyMessage,
        'OPERATION_FAILED',
        {
          operationName: operationName,
          errorId: errorResult.errorId,
          context: context
        }
      );
    }
  }
  
  /**
   * 驗證必要參數
   * @param {Object} params 參數對象
   * @param {Array} requiredFields 必要欄位列表
   * @return {Object|null} 如果驗證失敗返回錯誤響應，成功返回null
   */
  validateRequiredParams(params, requiredFields) {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!params || params[field] === undefined || params[field] === null || params[field] === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return this.error(
        `缺少必要參數: ${missingFields.join(', ')}`,
        'MISSING_REQUIRED_PARAMS',
        { missingFields: missingFields }
      );
    }
    
    return null;
  }
  
  /**
   * 記錄API調用
   * @param {string} method 方法名稱
   * @param {Object} params 參數
   * @param {Object} result 結果
   */
  logApiCall(method, params = {}, result = {}) {
    if (APP_CONFIG.debug) {
      Logger.log(`[${this.serviceName}.${method}] Params: ${JSON.stringify(params)}`);
      Logger.log(`[${this.serviceName}.${method}] Result: ${JSON.stringify(result)}`);
    }
  }
}

/**
 * API響應工具函數
 * 用於非類環境的快速響應創建
 */
const ApiResponse = {
  /**
   * 創建成功響應
   * @param {*} data 數據
   * @param {string} message 訊息
   * @return {Object} 成功響應
   */
  success(data = null, message = '') {
    return {
      success: true,
      data: data,
      message: message,
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    };
  },
  
  /**
   * 創建錯誤響應
   * @param {string} message 錯誤訊息
   * @param {string} code 錯誤代碼
   * @return {Object} 錯誤響應
   */
  error(message, code = 'ERROR') {
    return {
      success: false,
      message: message,
      errorCode: code,
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    };
  }
};

/**
 * API路由處理器
 * 統一處理API請求路由
 */
const ApiRouter = {
  routes: new Map(),
  
  /**
   * 註冊API路由
   * @param {string} action 動作名稱
   * @param {Function} handler 處理函數
   * @param {Object} options 選項
   */
  register(action, handler, options = {}) {
    this.routes.set(action, {
      handler: handler,
      requireAuth: options.requireAuth || false,
      rateLimit: options.rateLimit || null,
      description: options.description || ''
    });
  },
  
  /**
   * 處理API請求
   * @param {string} action 動作名稱
   * @param {Object} params 參數
   * @return {Object} API響應
   */
  async handle(action, params = {}) {
    const perfSession = startTimer(`ApiRouter.${action}`, 'API_ROUTING');
    
    try {
      if (!this.routes.has(action)) {
        perfSession.end(false, '未知的API動作');
        return ApiResponse.error(`未知的API動作: ${action}`, 'UNKNOWN_ACTION');
      }
      
      const route = this.routes.get(action);
      
      perfSession.checkpoint('路由找到');
      
      // TODO: 在未來實施認證和限流
      // if (route.requireAuth && !this.checkAuth(params)) {
      //   return ApiResponse.error('未授權訪問', 'UNAUTHORIZED');
      // }
      
      const result = await route.handler(params);
      
      perfSession.end(true, '路由處理完成');
      return result;
      
    } catch (error) {
      perfSession.end(false, error.message);
      
      ErrorHandler.handle('ApiRouter.handle', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM, {
        additionalInfo: { action: action, params: params },
        showUI: false
      });
      
      return ApiResponse.error('API處理失敗', 'ROUTING_ERROR');
    }
  },
  
  /**
   * 獲取所有註冊的路由
   * @return {Array} 路由列表
   */
  getRoutes() {
    const routes = [];
    this.routes.forEach((route, action) => {
      routes.push({
        action: action,
        description: route.description,
        requireAuth: route.requireAuth
      });
    });
    return routes;
  }
};