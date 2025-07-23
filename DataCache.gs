/**
 * 智能緩存系統
 * 提供高效的資料緩存和管理機制
 * Version: 1.0.0 - Phase 2 智能緩存實現
 */

/**
 * 緩存配置常數
 */
const CACHE_CONFIG = {
  // 預設緩存時間（分鐘）
  DEFAULT_TTL: 30,
  
  // 不同資料類型的緩存時間
  TTL: {
    SYSTEM_CONFIG: 60,      // 系統配置緩存1小時
    TEACHER_LIST: 15,       // 教師列表緩存15分鐘
    STUDENT_DATA: 30,       // 學生資料緩存30分鐘
    SYSTEM_STATUS: 5,       // 系統狀態緩存5分鐘
    DIAGNOSTIC_DATA: 10,    // 診斷資料緩存10分鐘
    SEARCH_RESULTS: 5       // 搜尋結果緩存5分鐘
  },
  
  // 緩存大小限制
  MAX_CACHE_SIZE: 100,      // 最大緩存項目數
  MAX_ITEM_SIZE: 1024 * 50, // 最大單項大小 50KB
  
  // 緩存策略
  EVICTION_POLICY: 'LRU',   // 最近最少使用
  
  // 緩存鍵前綴
  KEY_PREFIX: 'COMM_CACHE_'
};

/**
 * 緩存項目類
 */
class CacheItem {
  constructor(key, data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    this.key = key;
    this.data = data;
    this.createdAt = new Date();
    this.expiresAt = new Date(Date.now() + ttl * 60 * 1000); // TTL in minutes
    this.lastAccessed = new Date();
    this.accessCount = 0;
    this.size = this.calculateSize(data);
  }
  
  /**
   * 檢查緩存項目是否過期
   */
  isExpired() {
    return new Date() > this.expiresAt;
  }
  
  /**
   * 更新最後存取時間
   */
  updateAccess() {
    this.lastAccessed = new Date();
    this.accessCount++;
  }
  
  /**
   * 計算資料大小
   */
  calculateSize(data) {
    try {
      return JSON.stringify(data).length;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * 更新緩存資料
   */
  updateData(newData, ttl = null) {
    this.data = newData;
    this.size = this.calculateSize(newData);
    this.lastAccessed = new Date();
    this.accessCount++;
    
    if (ttl !== null) {
      this.expiresAt = new Date(Date.now() + ttl * 60 * 1000);
    }
  }
}

/**
 * 智能資料緩存類
 */
class DataCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      totalSize: 0
    };
    
    // 初始化清理定時器
    this.setupCleanupTimer();
  }
  
  /**
   * 獲取緩存資料
   * @param {string} key 緩存鍵
   * @param {Function} dataProvider 資料提供者函數（緩存未命中時調用）
   * @param {number} ttl 緩存時間（分鐘）
   * @return {*} 緩存或新獲取的資料
   */
  async get(key, dataProvider = null, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    const perfSession = startTimer(`DataCache.get.${key}`, 'CACHE');
    this.stats.totalRequests++;
    
    try {
      const fullKey = this.generateKey(key);
      const item = this.cache.get(fullKey);
      
      // 檢查緩存命中且未過期
      if (item && !item.isExpired()) {
        item.updateAccess();
        this.stats.hits++;
        
        perfSession.checkpoint('緩存命中');
        perfSession.end(true, '緩存命中');
        
        Logger.log(`[DataCache] 緩存命中: ${key}`);
        return item.data;
      }
      
      // 緩存未命中
      this.stats.misses++;
      perfSession.checkpoint('緩存未命中');
      
      // 如果有資料提供者，獲取新資料
      if (dataProvider && typeof dataProvider === 'function') {
        Logger.log(`[DataCache] 緩存未命中，獲取新資料: ${key}`);
        
        const newData = await dataProvider();
        await this.set(key, newData, ttl);
        
        perfSession.end(true, '獲取新資料並緩存');
        return newData;
      }
      
      // 移除過期項目
      if (item && item.isExpired()) {
        this.cache.delete(fullKey);
        this.updateTotalSize();
      }
      
      perfSession.end(false, '緩存未命中且無資料提供者');
      return null;
      
    } catch (error) {
      perfSession.end(false, error.message);
      ErrorHandler.handle('DataCache.get', error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.CACHE, {
        additionalInfo: { key: key },
        showUI: false
      });
      
      // 發生錯誤時，嘗試使用資料提供者
      if (dataProvider && typeof dataProvider === 'function') {
        try {
          return await dataProvider();
        } catch (providerError) {
          throw providerError;
        }
      }
      
      return null;
    }
  }
  
  /**
   * 設定緩存資料
   * @param {string} key 緩存鍵
   * @param {*} data 要緩存的資料
   * @param {number} ttl 緩存時間（分鐘）
   * @return {boolean} 設定是否成功
   */
  async set(key, data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    const perfSession = startTimer(`DataCache.set.${key}`, 'CACHE');
    
    try {
      const fullKey = this.generateKey(key);
      const item = new CacheItem(fullKey, data, ttl);
      
      // 檢查項目大小
      if (item.size > CACHE_CONFIG.MAX_ITEM_SIZE) {
        Logger.log(`[DataCache] 項目過大，跳過緩存: ${key} (${item.size} bytes)`);
        perfSession.end(false, '項目過大');
        return false;
      }
      
      // 檢查是否需要清理空間
      if (this.cache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
        this.evictItems();
      }
      
      this.cache.set(fullKey, item);
      this.updateTotalSize();
      
      Logger.log(`[DataCache] 緩存設定: ${key} (TTL: ${ttl}分鐘, Size: ${item.size} bytes)`);
      
      perfSession.end(true, '緩存設定成功');
      return true;
      
    } catch (error) {
      perfSession.end(false, error.message);
      ErrorHandler.handle('DataCache.set', error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.CACHE, {
        additionalInfo: { key: key },
        showUI: false
      });
      return false;
    }
  }
  
  /**
   * 刪除緩存項目
   * @param {string} key 緩存鍵
   * @return {boolean} 刪除是否成功
   */
  delete(key) {
    try {
      const fullKey = this.generateKey(key);
      const result = this.cache.delete(fullKey);
      
      if (result) {
        this.updateTotalSize();
        Logger.log(`[DataCache] 緩存刪除: ${key}`);
      }
      
      return result;
    } catch (error) {
      ErrorHandler.handle('DataCache.delete', error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.CACHE);
      return false;
    }
  }
  
  /**
   * 清理所有緩存
   */
  clear() {
    try {
      const size = this.cache.size;
      this.cache.clear();
      this.stats.totalSize = 0;
      Logger.log(`[DataCache] 清理所有緩存，共清理 ${size} 個項目`);
    } catch (error) {
      ErrorHandler.handle('DataCache.clear', error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.CACHE);
    }
  }
  
  /**
   * 獲取緩存統計資訊
   * @return {Object} 統計資訊
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      currentSize: this.cache.size,
      maxSize: CACHE_CONFIG.MAX_CACHE_SIZE,
      totalSizeKB: (this.stats.totalSize / 1024).toFixed(2)
    };
  }
  
  /**
   * 獲取所有緩存鍵
   * @return {Array} 緩存鍵列表
   */
  getKeys() {
    return Array.from(this.cache.keys()).map(key => 
      key.replace(CACHE_CONFIG.KEY_PREFIX, '')
    );
  }
  
  /**
   * 檢查緩存是否存在且未過期
   * @param {string} key 緩存鍵
   * @return {boolean} 是否存在有效緩存
   */
  has(key) {
    const fullKey = this.generateKey(key);
    const item = this.cache.get(fullKey);
    return item && !item.isExpired();
  }
  
  /**
   * 智能預載緩存
   * @param {Array} preloadConfig 預載配置
   */
  async preload(preloadConfig) {
    const perfSession = startTimer('DataCache.preload', 'CACHE');
    
    try {
      Logger.log('[DataCache] 開始智能預載緩存');
      
      const preloadPromises = preloadConfig.map(async (config) => {
        try {
          if (config.key && config.dataProvider) {
            await this.get(config.key, config.dataProvider, config.ttl);
          }
        } catch (error) {
          Logger.log(`[DataCache] 預載失敗: ${config.key} - ${error.message}`);
        }
      });
      
      await Promise.all(preloadPromises);
      
      Logger.log(`[DataCache] 預載完成，共處理 ${preloadConfig.length} 項`);
      perfSession.end(true, '預載完成');
      
    } catch (error) {
      perfSession.end(false, error.message);
      ErrorHandler.handle('DataCache.preload', error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.CACHE);
    }
  }
  
  // === 私有方法 ===
  
  /**
   * 生成完整緩存鍵
   */
  generateKey(key) {
    return `${CACHE_CONFIG.KEY_PREFIX}${key}`;
  }
  
  /**
   * 更新總大小統計
   */
  updateTotalSize() {
    this.stats.totalSize = Array.from(this.cache.values())
      .reduce((total, item) => total + item.size, 0);
  }
  
  /**
   * 清理過期項目
   */
  cleanupExpired() {
    const expiredKeys = [];
    
    for (const [key, item] of this.cache) {
      if (item.isExpired()) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      this.updateTotalSize();
      Logger.log(`[DataCache] 清理過期項目: ${expiredKeys.length} 個`);
    }
  }
  
  /**
   * 驅逐項目（LRU策略）
   */
  evictItems() {
    const itemsToRemove = Math.ceil(CACHE_CONFIG.MAX_CACHE_SIZE * 0.1); // 移除10%
    const items = Array.from(this.cache.entries())
      .map(([key, item]) => ({ key, item }))
      .sort((a, b) => a.item.lastAccessed - b.item.lastAccessed);
    
    for (let i = 0; i < itemsToRemove && i < items.length; i++) {
      this.cache.delete(items[i].key);
      this.stats.evictions++;
    }
    
    this.updateTotalSize();
    Logger.log(`[DataCache] LRU驅逐: ${itemsToRemove} 個項目`);
  }
  
  /**
   * 設定清理定時器
   */
  setupCleanupTimer() {
    // 每10分鐘清理一次過期項目
    // 注意：Google Apps Script 的 ScriptApp.newTrigger 需要在適當的環境中使用
    try {
      if (typeof ScriptApp !== 'undefined') {
        // 可以在這裡設定定時觸發器
        Logger.log('[DataCache] 清理定時器已設定');
      }
    } catch (error) {
      Logger.log('[DataCache] 無法設定定時器，將使用手動清理');
    }
  }
}

/**
 * 全域緩存實例
 */
const globalCache = new DataCache();

/**
 * 快捷緩存函數
 */
const CacheUtils = {
  /**
   * 獲取系統狀態（帶緩存）
   */
  async getSystemStatus() {
    return await globalCache.get(
      'system_status',
      () => getSystemRecordBooksHealth(),
      CACHE_CONFIG.TTL.SYSTEM_STATUS
    );
  },
  
  /**
   * 獲取教師列表（帶緩存）
   */
  async getTeachersList() {
    return await globalCache.get(
      'teachers_list',
      () => diagnoseTeacherRecordBooksContactStatus(),
      CACHE_CONFIG.TTL.TEACHER_LIST
    );
  },
  
  /**
   * 獲取學生資料（帶緩存）
   */
  async getStudentMasterList() {
    return await globalCache.get(
      'student_master_list',
      () => getSystemMasterList(),
      CACHE_CONFIG.TTL.STUDENT_DATA
    );
  },
  
  /**
   * 搜尋結果緩存
   */
  async getSearchResults(query, searchFunction) {
    const searchKey = `search_${this.hashQuery(query)}`;
    return await globalCache.get(
      searchKey,
      () => searchFunction(query),
      CACHE_CONFIG.TTL.SEARCH_RESULTS
    );
  },
  
  /**
   * 清理相關緩存
   */
  invalidateRelated(pattern) {
    const keys = globalCache.getKeys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    matchingKeys.forEach(key => globalCache.delete(key));
    Logger.log(`[CacheUtils] 清理相關緩存: ${matchingKeys.length} 個項目`);
  },
  
  /**
   * 生成查詢雜湊
   */
  hashQuery(query) {
    return JSON.stringify(query).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  }
};

/**
 * 預載常用緩存
 */
async function preloadCommonCache() {
  const preloadConfig = [
    {
      key: 'system_status',
      dataProvider: () => getSystemRecordBooksHealth(),
      ttl: CACHE_CONFIG.TTL.SYSTEM_STATUS
    },
    {
      key: 'teachers_list',
      dataProvider: () => diagnoseTeacherRecordBooksContactStatus(),
      ttl: CACHE_CONFIG.TTL.TEACHER_LIST
    },
    {
      key: 'student_master_list',
      dataProvider: () => getSystemMasterList(),
      ttl: CACHE_CONFIG.TTL.STUDENT_DATA
    }
  ];
  
  await globalCache.preload(preloadConfig);
}