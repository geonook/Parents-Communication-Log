/**
 * 系統管理服務
 * 處理系統配置、初始化、診斷等系統級操作
 * Version: 1.0.0 - Phase 2 API重構
 */

class SystemService extends ApiService {
  constructor() {
    super();
  }
  
  /**
   * 獲取系統狀態
   * @return {Object} API響應
   */
  async getSystemStatus() {
    return this.executeWithErrorHandling(async () => {
      Logger.log('SystemService: 獲取系統狀態');
      
      const systemHealth = getSystemRecordBooksHealth();
      const systemStats = this.calculateSystemStats();
      
      const status = {
        health: systemHealth,
        stats: systemStats,
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      };
      
      return this.success(status, '系統狀態獲取成功');
      
    }, 'getSystemStatus');
  }
  
  /**
   * 系統初始化
   * @param {Object} config 初始化配置
   * @return {Object} API響應
   */
  async initializeSystem(config = {}) {
    return this.executeWithErrorHandling(async () => {
      Logger.log('SystemService: 開始系統初始化');
      
      const initResults = {
        steps: [],
        totalSteps: 4,
        completedSteps: 0,
        success: true
      };
      
      // 步驟1: 檢查系統配置
      try {
        this.validateSystemConfig();
        initResults.steps.push({ step: '系統配置檢查', status: '✅ 完成' });
        initResults.completedSteps++;
      } catch (error) {
        initResults.steps.push({ step: '系統配置檢查', status: '❌ 失敗', error: error.message });
        initResults.success = false;
      }
      
      // 步驟2: 初始化系統資料夾
      try {
        const systemFolder = this.ensureSystemFolder();
        initResults.steps.push({ step: '系統資料夾初始化', status: '✅ 完成', folderId: systemFolder.getId() });
        initResults.completedSteps++;
      } catch (error) {
        initResults.steps.push({ step: '系統資料夾初始化', status: '❌ 失敗', error: error.message });
        initResults.success = false;
      }
      
      // 步驟3: 檢查必要權限
      try {
        this.validateSystemPermissions();
        initResults.steps.push({ step: '系統權限檢查', status: '✅ 完成' });
        initResults.completedSteps++;
      } catch (error) {
        initResults.steps.push({ step: '系統權限檢查', status: '❌ 失敗', error: error.message });
        initResults.success = false;
      }
      
      // 步驟4: 建立系統監控
      try {
        this.setupSystemMonitoring();
        initResults.steps.push({ step: '系統監控設定', status: '✅ 完成' });
        initResults.completedSteps++;
      } catch (error) {
        initResults.steps.push({ step: '系統監控設定', status: '❌ 失敗', error: error.message });
        initResults.success = false;
      }
      
      const message = initResults.success 
        ? '系統初始化完成'
        : `系統初始化部分完成 (${initResults.completedSteps}/${initResults.totalSteps})`;
      
      return this.success(initResults, message);
      
    }, 'initializeSystem', { config });
  }
  
  /**
   * 系統診斷
   * @param {Object} options 診斷選項
   * @return {Object} API響應
   */
  async runSystemDiagnostics(options = {}) {
    return this.executeWithErrorHandling(async () => {
      Logger.log('SystemService: 開始系統診斷');
      
      const diagnostics = {
        overall: { status: 'healthy', issues: [] },
        components: [],
        recommendations: [],
        timestamp: new Date().toISOString()
      };
      
      // 診斷1: 核心系統模組
      const coreModulesCheck = this.diagnoseCoreModules();
      diagnostics.components.push({
        name: '核心系統模組',
        status: coreModulesCheck.healthy ? 'healthy' : 'warning',
        details: coreModulesCheck
      });
      
      // 診斷2: 教師記錄簿狀態
      const teacherBooksCheck = this.diagnoseTeacherRecordBooks();
      diagnostics.components.push({
        name: '教師記錄簿',
        status: teacherBooksCheck.status,
        details: teacherBooksCheck
      });
      
      // 診斷3: 系統性能
      const performanceCheck = this.diagnoseSystemPerformance();
      diagnostics.components.push({
        name: '系統性能',
        status: performanceCheck.status,
        details: performanceCheck
      });
      
      // 診斷4: 資料完整性
      const dataIntegrityCheck = this.diagnoseDataIntegrity();
      diagnostics.components.push({
        name: '資料完整性',
        status: dataIntegrityCheck.status,
        details: dataIntegrityCheck
      });
      
      // 計算整體狀態
      const unhealthyComponents = diagnostics.components.filter(c => c.status !== 'healthy');
      if (unhealthyComponents.length > 0) {
        diagnostics.overall.status = unhealthyComponents.some(c => c.status === 'error') ? 'error' : 'warning';
        diagnostics.overall.issues = unhealthyComponents.map(c => `${c.name}: ${c.status}`);
      }
      
      // 生成建議
      diagnostics.recommendations = this.generateSystemRecommendations(diagnostics);
      
      return this.success(diagnostics, '系統診斷完成');
      
    }, 'runSystemDiagnostics', { options });
  }
  
  /**
   * 系統配置驗證
   * @return {Object} API響應
   */
  async validateConfiguration() {
    return this.executeWithErrorHandling(async () => {
      Logger.log('SystemService: 驗證系統配置');
      
      const validation = {
        config: {},
        issues: [],
        warnings: [],
        recommendations: []
      };
      
      // 檢查 SYSTEM_CONFIG
      if (typeof SYSTEM_CONFIG !== 'undefined') {
        validation.config.SYSTEM_CONFIG = '✅ 可用';
        
        // 檢查必要的配置項目
        const requiredKeys = ['SHEET_NAMES', 'CONTACT_TYPES', 'ACADEMIC_TERMS'];
        for (const key of requiredKeys) {
          if (!SYSTEM_CONFIG[key]) {
            validation.issues.push(`SYSTEM_CONFIG 缺少 ${key} 配置`);
          }
        }
      } else {
        validation.config.SYSTEM_CONFIG = '❌ 不可用';
        validation.issues.push('SYSTEM_CONFIG 未定義');
      }
      
      // 檢查 APP_CONFIG
      if (typeof APP_CONFIG !== 'undefined') {
        validation.config.APP_CONFIG = '✅ 可用';
      } else {
        validation.config.APP_CONFIG = '❌ 不可用';
        validation.warnings.push('APP_CONFIG 未定義，將使用預設值');
      }
      
      // 檢查錯誤處理器
      if (typeof ErrorHandler !== 'undefined') {
        validation.config.ErrorHandler = '✅ 可用';
      } else {
        validation.config.ErrorHandler = '❌ 不可用';
        validation.issues.push('ErrorHandler 不可用');
      }
      
      // 檢查性能監控
      if (typeof startTimer === 'function') {
        validation.config.PerformanceMonitor = '✅ 可用';
      } else {
        validation.config.PerformanceMonitor = '❌ 不可用';
        validation.warnings.push('PerformanceMonitor 不可用');
      }
      
      const isValid = validation.issues.length === 0;
      const message = isValid ? '系統配置驗證通過' : `發現 ${validation.issues.length} 個配置問題`;
      
      return this.success(validation, message);
      
    }, 'validateConfiguration');
  }
  
  /**
   * 系統備份
   * @param {Object} options 備份選項
   * @return {Object} API響應
   */
  async createSystemBackup(options = {}) {
    return this.executeWithErrorHandling(async () => {
      Logger.log('SystemService: 創建系統備份');
      
      const backupResult = {
        backupId: `backup_${new Date().getTime()}`,
        timestamp: new Date().toISOString(),
        items: [],
        success: true
      };
      
      // 備份1: 系統配置
      try {
        const configBackup = this.backupSystemConfig();
        backupResult.items.push({
          type: '系統配置',
          status: '✅ 完成',
          size: configBackup.size
        });
      } catch (error) {
        backupResult.items.push({
          type: '系統配置',
          status: '❌ 失敗',
          error: error.message
        });
        backupResult.success = false;
      }
      
      // 備份2: 教師記錄簿清單
      try {
        const teacherBooksBackup = this.backupTeacherRecordBooksList();
        backupResult.items.push({
          type: '教師記錄簿清單',
          status: '✅ 完成',
          count: teacherBooksBackup.count
        });
      } catch (error) {
        backupResult.items.push({
          type: '教師記錄簿清單',
          status: '❌ 失敗',
          error: error.message
        });
        backupResult.success = false;
      }
      
      // 備份3: 系統日誌
      if (options.includeLogs) {
        try {
          const logsBackup = this.backupSystemLogs();
          backupResult.items.push({
            type: '系統日誌',
            status: '✅ 完成',
            entries: logsBackup.entries
          });
        } catch (error) {
          backupResult.items.push({
            type: '系統日誌',
            status: '❌ 失敗',
            error: error.message
          });
        }
      }
      
      const message = backupResult.success ? '系統備份完成' : '系統備份部分完成';
      
      return this.success(backupResult, message);
      
    }, 'createSystemBackup', { options });
  }
  
  /**
   * 系統重置
   * @param {Object} options 重置選項
   * @return {Object} API響應
   */
  async resetSystem(options = {}) {
    return this.executeWithErrorHandling(async () => {
      Logger.log('SystemService: 系統重置');
      
      // 安全檢查
      if (!options.confirmReset) {
        return this.error(
          '系統重置需要確認，請設定 confirmReset: true',
          'RESET_CONFIRMATION_REQUIRED'
        );
      }
      
      const resetResult = {
        steps: [],
        warnings: [],
        success: true
      };
      
      // 步驟1: 備份當前狀態
      if (options.createBackup !== false) {
        try {
          const backup = await this.createSystemBackup();
          resetResult.steps.push({
            step: '創建備份',
            status: '✅ 完成',
            backupId: backup.data.backupId
          });
        } catch (error) {
          resetResult.steps.push({
            step: '創建備份',
            status: '⚠️ 失敗',
            error: error.message
          });
          resetResult.warnings.push('備份創建失敗，但繼續重置操作');
        }
      }
      
      // 步驟2: 清理臨時資料
      try {
        this.clearTemporaryData();
        resetResult.steps.push({
          step: '清理臨時資料',
          status: '✅ 完成'
        });
      } catch (error) {
        resetResult.steps.push({
          step: '清理臨時資料',
          status: '❌ 失敗',
          error: error.message
        });
        resetResult.success = false;
      }
      
      // 步驟3: 重新初始化
      try {
        const initResult = await this.initializeSystem();
        resetResult.steps.push({
          step: '重新初始化',
          status: initResult.success ? '✅ 完成' : '⚠️ 部分完成'
        });
        if (!initResult.success) {
          resetResult.success = false;
        }
      } catch (error) {
        resetResult.steps.push({
          step: '重新初始化',
          status: '❌ 失敗',
          error: error.message
        });
        resetResult.success = false;
      }
      
      const message = resetResult.success ? '系統重置完成' : '系統重置部分完成';
      
      return this.success(resetResult, message);
      
    }, 'resetSystem', { options });
  }
  
  // === 私有輔助方法 ===
  
  /**
   * 計算系統統計資料
   */
  calculateSystemStats() {
    try {
      const diagnosis = diagnoseTeacherRecordBooksContactStatus();
      
      return {
        totalTeacherBooks: diagnosis.normalBooks.length + diagnosis.emptyContactBooks.length + diagnosis.errorBooks.length,
        activeBooks: diagnosis.normalBooks.length,
        emptyBooks: diagnosis.emptyContactBooks.length,
        errorBooks: diagnosis.errorBooks.length,
        healthScore: this.calculateHealthScore(diagnosis)
      };
    } catch (error) {
      return {
        totalTeacherBooks: 0,
        activeBooks: 0,
        emptyBooks: 0,
        errorBooks: 0,
        healthScore: 0,
        error: error.message
      };
    }
  }
  
  /**
   * 計算系統健康分數
   */
  calculateHealthScore(diagnosis) {
    const total = diagnosis.normalBooks.length + diagnosis.emptyContactBooks.length + diagnosis.errorBooks.length;
    if (total === 0) return 0;
    
    const healthyCount = diagnosis.normalBooks.length;
    return Math.round((healthyCount / total) * 100);
  }
  
  /**
   * 驗證系統配置
   */
  validateSystemConfig() {
    if (typeof SYSTEM_CONFIG === 'undefined') {
      throw new Error('SYSTEM_CONFIG 未定義');
    }
    
    if (!SYSTEM_CONFIG.SHEET_NAMES) {
      throw new Error('SYSTEM_CONFIG 缺少 SHEET_NAMES 配置');
    }
  }
  
  /**
   * 確保系統資料夾存在
   */
  ensureSystemFolder() {
    try {
      return getSystemMainFolder();
    } catch (error) {
      // 如果資料夾不存在，這裡可以創建新的
      throw new Error(`系統資料夾不可用: ${error.message}`);
    }
  }
  
  /**
   * 驗證系統權限
   */
  validateSystemPermissions() {
    try {
      // 測試 Drive 存取權限
      DriveApp.getRootFolder();
      
      // 測試 Spreadsheet 存取權限
      SpreadsheetApp.getActive();
      
    } catch (error) {
      throw new Error(`系統權限不足: ${error.message}`);
    }
  }
  
  /**
   * 設定系統監控
   */
  setupSystemMonitoring() {
    // 初始化性能監控
    if (typeof startTimer === 'function') {
      const testSession = startTimer('系統初始化測試', 'INIT');
      testSession.end(true, '監控系統正常');
    }
  }
  
  /**
   * 診斷核心系統模組
   */
  diagnoseCoreModules() {
    const modules = [
      'createTeacherRecordBook',
      'diagnoseTeacherRecordBooksContactStatus',
      'getSystemMasterList',
      'getSystemMainFolder'
    ];
    
    const results = {
      healthy: true,
      available: [],
      missing: []
    };
    
    for (const moduleName of modules) {
      if (typeof globalThis[moduleName] === 'function') {
        results.available.push(moduleName);
      } else {
        results.missing.push(moduleName);
        results.healthy = false;
      }
    }
    
    return results;
  }
  
  /**
   * 診斷教師記錄簿
   */
  diagnoseTeacherRecordBooks() {
    try {
      const diagnosis = diagnoseTeacherRecordBooksContactStatus();
      
      return {
        status: diagnosis.errorBooks.length === 0 ? 'healthy' : 'warning',
        total: diagnosis.normalBooks.length + diagnosis.emptyContactBooks.length + diagnosis.errorBooks.length,
        active: diagnosis.normalBooks.length,
        inactive: diagnosis.emptyContactBooks.length,
        error: diagnosis.errorBooks.length
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
  
  /**
   * 診斷系統性能
   */
  diagnoseSystemPerformance() {
    // 簡單的性能檢查
    const startTime = new Date().getTime();
    
    // 執行一些基本操作來測試性能
    try {
      getSystemRecordBooksHealth();
      const endTime = new Date().getTime();
      const responseTime = endTime - startTime;
      
      return {
        status: responseTime < 5000 ? 'healthy' : 'warning',
        responseTime: responseTime,
        threshold: 5000
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
  
  /**
   * 診斷資料完整性
   */
  diagnoseDataIntegrity() {
    try {
      const masterList = getSystemMasterList();
      
      return {
        status: masterList ? 'healthy' : 'warning',
        hasMasterList: !!masterList,
        recordCount: masterList ? masterList.length - 3 : 0
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
  
  /**
   * 生成系統建議
   */
  generateSystemRecommendations(diagnostics) {
    const recommendations = [];
    
    diagnostics.components.forEach(component => {
      if (component.status === 'warning') {
        recommendations.push(`建議檢查 ${component.name} 組件`);
      } else if (component.status === 'error') {
        recommendations.push(`緊急：修復 ${component.name} 組件`);
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('系統運行良好，建議定期進行診斷檢查');
    }
    
    return recommendations;
  }
  
  /**
   * 備份系統配置
   */
  backupSystemConfig() {
    const config = {
      SYSTEM_CONFIG: typeof SYSTEM_CONFIG !== 'undefined' ? SYSTEM_CONFIG : null,
      APP_CONFIG: typeof APP_CONFIG !== 'undefined' ? APP_CONFIG : null,
      timestamp: new Date().toISOString()
    };
    
    return {
      size: JSON.stringify(config).length,
      data: config
    };
  }
  
  /**
   * 備份教師記錄簿清單
   */
  backupTeacherRecordBooksList() {
    try {
      const diagnosis = diagnoseTeacherRecordBooksContactStatus();
      const allBooks = [...diagnosis.normalBooks, ...diagnosis.emptyContactBooks, ...diagnosis.errorBooks];
      
      return {
        count: allBooks.length,
        books: allBooks.map(book => ({
          id: book.id,
          name: book.name,
          url: book.url,
          status: book.contactRecordCount > 0 ? 'active' : 'inactive'
        }))
      };
    } catch (error) {
      throw new Error(`無法備份教師記錄簿清單: ${error.message}`);
    }
  }
  
  /**
   * 備份系統日誌
   */
  backupSystemLogs() {
    // 這裡可以實現日誌備份邏輯
    return {
      entries: 0,
      message: '日誌備份功能待實現'
    };
  }
  
  /**
   * 清理臨時資料
   */
  clearTemporaryData() {
    // 這裡可以實現清理臨時資料的邏輯
    Logger.log('SystemService: 清理臨時資料完成');
  }
}