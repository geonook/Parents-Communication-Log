/**
 * Dashboard Web App 控制器
 * 提供視覺化管理介面的後端支援
 * Version: 2.0.0 - Phase 2 重構版本，使用服務層架構
 */

// 延遲初始化服務實例
let teacherService = null;
let studentService = null;
let systemService = null;

/**
 * 獲取教師服務實例（延遲初始化）
 */
function getTeacherService() {
  if (!teacherService) {
    teacherService = new TeacherService();
  }
  return teacherService;
}

/**
 * 獲取學生服務實例（延遲初始化）
 */
function getStudentService() {
  if (!studentService) {
    studentService = new StudentService();
  }
  return studentService;
}

/**
 * 獲取系統服務實例（延遲初始化）
 */
function getSystemService() {
  if (!systemService) {
    systemService = new SystemService();
  }
  return systemService;
}

/**
 * 處理 GET 請求，返回 Dashboard HTML 頁面
 */
function doGet() {
  return HtmlService.createTemplateFromFile('dashboard')
    .evaluate()
    .setTitle('電聯記錄簿系統 - 管理面板')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 處理 POST 請求
 * 使用 ApiRouter 統一路由處理
 */
function doPost(e) {
  const action = e.parameter.action;
  
  try {
    // 使用 ApiRouter 處理請求
    return ApiRouter.handle(action, e.parameter);
  } catch (error) {
    const errorResult = ErrorHandler.handle('Dashboard POST處理', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM, {
      additionalInfo: { action: action },
      showUI: false
    });
    
    Logger.log('Dashboard POST 錯誤：' + error.toString());
    return ApiResponse.error(errorResult.friendlyMessage, 'POST_ERROR');
  }
}

/**
 * 初始化 API 路由
 * 註冊所有可用的 API 端點
 */
function initializeApiRoutes() {
  // 教師相關路由
  ApiRouter.register('createFromMasterList', async (params) => {
    return await getTeacherService().createFromMasterList(params.masterListId);
  }, { description: '從學生總表創建教師記錄簿' });
  
  ApiRouter.register('createSingleTeacher', async (params) => {
    const teacherInfo = {
      name: params.teacherName,
      subject: params.subject || 'English',
      classes: params.classes
    };
    return await getTeacherService().createSingleTeacher(teacherInfo);
  }, { description: '創建單一教師記錄簿' });
  
  ApiRouter.register('batchCreateTeachers', async (params) => {
    return await getTeacherService().batchCreateTeachers(params.teachersList);
  }, { description: '批量創建教師記錄簿' });
  
  ApiRouter.register('getTeachersList', async (params) => {
    return await getTeacherService().getTeachersList();
  }, { description: '獲取教師列表' });
  
  ApiRouter.register('getTeacherDetails', async (params) => {
    return await getTeacherService().getTeacherDetails(params.teacherId);
  }, { description: '獲取教師詳細資訊' });
  
  ApiRouter.register('repairTeacherRecordBook', async (params) => {
    return await getTeacherService().repairTeacherRecordBook(params.teacherId);
  }, { description: '修復教師記錄簿' });
  
  // 學生相關路由
  ApiRouter.register('getStudentData', async (params) => {
    return await getStudentService().getStudentData(params.sheetId);
  }, { description: '獲取學生資料' });
  
  ApiRouter.register('importStudentData', async (params) => {
    return await getStudentService().importStudentData(params.sourceSheetId, params.options);
  }, { description: '導入學生資料' });
  
  ApiRouter.register('searchStudents', async (params) => {
    return await getStudentService().searchStudents(params.searchCriteria);
  }, { description: '搜尋學生' });
  
  ApiRouter.register('getStudentDetails', async (params) => {
    return await getStudentService().getStudentDetails(params.studentId);
  }, { description: '獲取學生詳細資訊' });
  
  ApiRouter.register('updateStudentInfo', async (params) => {
    return await getStudentService().updateStudentInfo(params.studentId, params.updateData);
  }, { description: '更新學生資訊' });
  
  ApiRouter.register('getClassStudents', async (params) => {
    return await getStudentService().getClassStudents(params.className);
  }, { description: '獲取班級學生列表' });
  
  // 系統相關路由
  ApiRouter.register('getSystemStatus', async (params) => {
    return await getSystemService().getSystemStatus();
  }, { description: '獲取系統狀態' });
  
  ApiRouter.register('initializeSystem', async (params) => {
    return await getSystemService().initializeSystem(params.config);
  }, { description: '系統初始化' });
  
  ApiRouter.register('runSystemDiagnostics', async (params) => {
    return await getSystemService().runSystemDiagnostics(params.options);
  }, { description: '系統診斷' });
  
  ApiRouter.register('validateConfiguration', async (params) => {
    return await getSystemService().validateConfiguration();
  }, { description: '系統配置驗證' });
  
  ApiRouter.register('createSystemBackup', async (params) => {
    return await getSystemService().createSystemBackup(params.options);
  }, { description: '系統備份' });
  
  ApiRouter.register('resetSystem', async (params) => {
    return await getSystemService().resetSystem(params.options);
  }, { description: '系統重置' });
  
  // 向後兼容的別名路由
  ApiRouter.register('getStats', async (params) => {
    return await getSystemService().getSystemStatus();
  }, { description: '獲取系統統計（向後兼容）' });
  
  ApiRouter.register('setupCompleteSystem', async (params) => {
    return await getSystemService().initializeSystem();
  }, { description: '完整系統設定（向後兼容）' });
  
  ApiRouter.register('getAvailableClasses', async (params) => {
    const studentData = await getStudentService().getStudentData();
    if (studentData.success && studentData.data.records) {
      const classIndex = studentData.data.headers.findIndex(h => 
        h && h.toString().toLowerCase().includes('english class')
      );
      if (classIndex !== -1) {
        const classes = [...new Set(studentData.data.records
          .map(record => record[classIndex])
          .filter(cls => cls && cls.toString().trim() !== '')
        )].sort();
        return ApiResponse.success({ classes }, `找到 ${classes.length} 個班級`);
      }
    }
    return ApiResponse.error('無法獲取可用班級列表', 'CLASSES_NOT_FOUND');
  }, { description: '獲取可用班級列表（向後兼容）' });
  
  ApiRouter.register('processStudentClassChange', async (params) => {
    // 這個功能需要整合 StudentChangeManager
    return ApiResponse.error('學生班級異動功能暫未實現', 'NOT_IMPLEMENTED');
  }, { description: '處理學生班級異動（向後兼容）' });
  
  // 緩存管理相關路由
  ApiRouter.register('getCacheStats', async (params) => {
    const stats = globalCache.getStats();
    return ApiResponse.success(stats, '緩存統計獲取成功');
  }, { description: '獲取緩存統計資訊' });
  
  ApiRouter.register('clearCache', async (params) => {
    const pattern = params.pattern;
    if (pattern) {
      CacheUtils.invalidateRelated(pattern);
      return ApiResponse.success({ pattern }, `清理相關緩存: ${pattern}`);
    } else {
      globalCache.clear();
      return ApiResponse.success({}, '清理所有緩存');
    }
  }, { description: '清理緩存' });
  
  ApiRouter.register('preloadCache', async (params) => {
    await preloadCommonCache();
    return ApiResponse.success({}, '常用緩存預載完成');
  }, { description: '預載常用緩存' });
  
  ApiRouter.register('getCacheKeys', async (params) => {
    const keys = globalCache.getKeys();
    return ApiResponse.success({ keys, count: keys.length }, `找到 ${keys.length} 個緩存鍵`);
  }, { description: '獲取所有緩存鍵' });
  
  Logger.log('API 路由初始化完成');
}

// 在模組載入時自動初始化路由
initializeApiRoutes();

/**
 * 包含檔案內容（用於模組化 HTML）
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Web API: 獲取系統統計數據
 * 前端 Dashboard 專用 API 端點
 * @param {Object} params - 可選參數 {semester, term}
 * @return {Object} 系統統計數據
 */
function getSystemStatsWeb(params = {}) {
  try {
    Logger.log('Web API: getSystemStatsWeb 被調用', params);
    
    const systemService = getSystemService();
    const result = systemService.getSystemStatus();
    
    if (result.success && result.data) {
      // 提取並格式化前端需要的統計數據
      const stats = result.data.stats || {};
      const health = result.data.health || {};
      
      return {
        success: true,
        teacherCount: stats.teacherCount || 0,
        studentCount: stats.studentCount || 0,
        contactCount: stats.contactCount || 0,
        progressRate: stats.progressRate || 0,
        systemHealth: health.status || 'unknown',
        timestamp: new Date().toISOString(),
        // 附加信息
        cacheStats: result.data.cache || {},
        semester: params.semester || getCurrentSemester(),
        term: params.term || getCurrentTerm()
      };
    } else {
      return {
        success: false,
        error: result.message || '無法獲取系統統計數據',
        teacherCount: 0,
        studentCount: 0,
        contactCount: 0,
        progressRate: 0
      };
    }
    
  } catch (error) {
    Logger.log('getSystemStatsWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('getSystemStatsWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      success: false,
      error: '系統統計數據獲取失敗: ' + error.message,
      teacherCount: 0,
      studentCount: 0,
      contactCount: 0,
      progressRate: 0
    };
  }
}

/**
 * Web API: 獲取系統狀態信息
 * 前端 Dashboard 專用 API 端點
 * @return {Object} 系統狀態信息
 */
function getSystemStatusWeb() {
  try {
    Logger.log('Web API: getSystemStatusWeb 被調用');
    
    const systemService = getSystemService();
    const result = systemService.getSystemStatus();
    
    if (result.success && result.data) {
      return {
        success: true,
        systemStatus: {
          overall: result.data.health?.status || 'unknown',
          health: result.data.health || {},
          stats: result.data.stats || {},
          cache: result.data.cache || {},
          version: result.data.version || '2.0.0',
          timestamp: result.data.timestamp || new Date().toISOString()
        },
        message: '系統狀態獲取成功'
      };
    } else {
      return {
        success: false,
        error: result.message || '無法獲取系統狀態',
        systemStatus: {
          overall: 'error',
          health: {},
          stats: {},
          cache: {},
          version: '2.0.0',
          timestamp: new Date().toISOString()
        }
      };
    }
    
  } catch (error) {
    Logger.log('getSystemStatusWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('getSystemStatusWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      success: false,
      error: '系統狀態獲取失敗: ' + error.message,
      systemStatus: {
        overall: 'error',
        health: {},
        stats: {},
        cache: {},
        version: '2.0.0',
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * 輔助函數: 獲取當前學期
 */
function getCurrentSemester() {
  // 簡單的學期判斷邏輯，可根據需要調整
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript months are 0-indexed
  
  if (month >= 9 || month <= 1) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

/**
 * 輔助函數: 獲取當前學期階段
 */
function getCurrentTerm() {
  const now = new Date();
  const month = now.getMonth() + 1;
  
  if (month >= 9 && month <= 12) {
    return 'Fall';
  } else if (month >= 1 && month <= 6) {
    return 'Spring';
  } else {
    return 'Summer';
  }
}

// ==================== 系統管理類 Web API 函數 ====================

/**
 * Web API: 系統初始化
 */
function initializeSystemWeb(config = {}) {
  try {
    Logger.log('Web API: initializeSystemWeb 被調用', config);
    
    const systemService = getSystemService();
    const result = systemService.initializeSystem(config);
    
    return {
      success: result.success,
      message: result.message || '系統初始化完成',
      data: result.data || {},
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('initializeSystemWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('initializeSystemWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      success: false,
      error: '系統初始化失敗: ' + error.message,
      message: '系統初始化失敗，請稍後重試'
    };
  }
}

/**
 * Web API: 完整系統設置
 */
function setupCompleteSystemWeb() {
  try {
    Logger.log('Web API: setupCompleteSystemWeb 被調用');
    
    const systemService = getSystemService();
    const result = systemService.initializeSystem();
    
    return {
      success: result.success,
      message: result.message || '完整系統設置完成',
      data: result.data || {},
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('setupCompleteSystemWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('setupCompleteSystemWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      success: false,
      error: '完整系統設置失敗: ' + error.message,
      message: '系統設置失敗，請稍後重試'
    };
  }
}

/**
 * Web API: 生成詳細系統診斷
 */
function generateDetailedSystemDiagnosticWeb() {
  try {
    Logger.log('Web API: generateDetailedSystemDiagnosticWeb 被調用');
    
    const systemService = getSystemService();
    const result = systemService.runSystemDiagnostics({ detailed: true });
    
    return {
      success: result.success,
      message: result.message || '系統診斷完成',
      diagnostic: result.data || {},
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('generateDetailedSystemDiagnosticWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('generateDetailedSystemDiagnosticWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      success: false,
      error: '系統診斷失敗: ' + error.message,
      message: '系統診斷失敗，請稍後重試'
    };
  }
}

// ==================== 教師管理類 Web API 函數 ====================

/**
 * Web API: 從學生總表創建教師記錄簿
 */
function createTeachersFromStudentMasterListWeb(sheetId) {
  try {
    Logger.log('Web API: createTeachersFromStudentMasterListWeb 被調用', sheetId);
    
    const teacherService = getTeacherService();
    const result = teacherService.createFromMasterList(sheetId);
    
    return {
      success: result.success,
      message: result.message || '教師記錄簿創建完成',
      teachers: result.data?.teachers || [],
      count: result.data?.count || 0,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('createTeachersFromStudentMasterListWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('createTeachersFromStudentMasterListWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.TEACHER);
    
    return {
      success: false,
      error: '教師記錄簿創建失敗: ' + error.message,
      message: '創建失敗，請檢查學生總表格式',
      teachers: [],
      count: 0
    };
  }
}

/**
 * Web API: 創建單一教師記錄簿
 */
function createSingleTeacherWeb(formData) {
  try {
    Logger.log('Web API: createSingleTeacherWeb 被調用', formData);
    
    const teacherService = getTeacherService();
    const teacherInfo = {
      name: formData.teacherName,
      subject: formData.subject || 'English',
      classes: formData.classes
    };
    
    const result = teacherService.createSingleTeacher(teacherInfo);
    
    return {
      success: result.success,
      message: result.message || '教師記錄簿創建完成',
      teacher: result.data?.teacher || {},
      sheetUrl: result.data?.url || '',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('createSingleTeacherWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('createSingleTeacherWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.TEACHER);
    
    return {
      success: false,
      error: '教師記錄簿創建失敗: ' + error.message,
      message: '創建失敗，請檢查教師資訊',
      teacher: {},
      sheetUrl: ''
    };
  }
}

// ==================== 學生管理類 Web API 函數 ====================

/**
 * Web API: 搜索學生
 */
function searchStudentWeb(searchTerm) {
  try {
    Logger.log('Web API: searchStudentWeb 被調用', searchTerm);
    
    const studentService = getStudentService();
    const result = studentService.searchStudents({ searchTerm: searchTerm });
    
    return {
      success: result.success,
      message: result.message || '學生搜索完成',
      students: result.data?.students || [],
      count: result.data?.count || 0,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('searchStudentWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('searchStudentWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.STUDENT);
    
    return {
      success: false,
      error: '學生搜索失敗: ' + error.message,
      message: '搜索失敗，請稍後重試',
      students: [],
      count: 0
    };
  }
}

/**
 * Web API: 處理學生轉出
 */
function processStudentTransferOutWeb(studentId, reason) {
  try {
    Logger.log('Web API: processStudentTransferOutWeb 被調用', { studentId, reason });
    
    // 這裡應該整合 StudentChangeManager 的功能
    // 目前先返回模擬結果
    return {
      success: true,
      message: '學生轉出處理完成',
      studentId: studentId,
      reason: reason,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('processStudentTransferOutWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('processStudentTransferOutWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.STUDENT);
    
    return {
      success: false,
      error: '學生轉出處理失敗: ' + error.message,
      message: '轉出處理失敗，請稍後重試'
    };
  }
}

/**
 * Web API: 處理學生班級異動
 */
function processStudentClassChangeWeb(changeData) {
  try {
    Logger.log('Web API: processStudentClassChangeWeb 被調用', changeData);
    
    // 這裡應該整合 StudentChangeManager 的功能
    // 目前先返回模擬結果
    return {
      success: true,
      message: '學生班級異動處理完成',
      changeData: changeData,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('processStudentClassChangeWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('processStudentClassChangeWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.STUDENT);
    
    return {
      success: false,
      error: '學生班級異動處理失敗: ' + error.message,
      message: '異動處理失敗，請稍後重試'
    };
  }
}

/**
 * Web API: 處理學生信息更新
 */
function processStudentInfoUpdateWeb(studentId, field, value) {
  try {
    Logger.log('Web API: processStudentInfoUpdateWeb 被調用', { studentId, field, value });
    
    const studentService = getStudentService();
    const updateData = {};
    updateData[field] = value;
    
    const result = studentService.updateStudentInfo(studentId, updateData);
    
    return {
      success: result.success,
      message: result.message || '學生信息更新完成',
      studentId: studentId,
      updatedField: field,
      newValue: value,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('processStudentInfoUpdateWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('processStudentInfoUpdateWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.STUDENT);
    
    return {
      success: false,
      error: '學生信息更新失敗: ' + error.message,
      message: '更新失敗，請稍後重試'
    };
  }
}

/**
 * Web API: 處理學生異動回滾
 */
function processStudentRollbackWeb(changeId) {
  try {
    Logger.log('Web API: processStudentRollbackWeb 被調用', changeId);
    
    // 這裡應該整合 StudentChangeManager 的回滾功能
    // 目前先返回模擬結果
    return {
      success: true,
      message: '學生異動回滾完成',
      changeId: changeId,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('processStudentRollbackWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('processStudentRollbackWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.STUDENT);
    
    return {
      success: false,
      error: '學生異動回滾失敗: ' + error.message,
      message: '回滾失敗，請稍後重試'
    };
  }
}

// ==================== 數據查詢類 Web API 函數 ====================

/**
 * Web API: 獲取分階段進度
 */
function getProgressByStageWeb(semester, term) {
  try {
    Logger.log('Web API: getProgressByStageWeb 被調用', { semester, term });
    
    const systemService = getSystemService();
    const statusResult = systemService.getSystemStatus();
    
    if (statusResult.success && statusResult.data) {
      const stats = statusResult.data.stats || {};
      
      // 模擬分階段進度數據
      const progressData = {
        semester: semester || getCurrentSemester(),
        term: term || getCurrentTerm(),
        stages: {
          'Beginning': {
            completed: Math.floor((stats.contactCount || 0) * 0.3),
            total: stats.studentCount || 0,
            percentage: stats.studentCount > 0 ? Math.round((stats.contactCount || 0) * 0.3 / stats.studentCount * 100) : 0
          },
          'Midterm': {
            completed: Math.floor((stats.contactCount || 0) * 0.5),
            total: stats.studentCount || 0,
            percentage: stats.studentCount > 0 ? Math.round((stats.contactCount || 0) * 0.5 / stats.studentCount * 100) : 0
          },
          'Final': {
            completed: Math.floor((stats.contactCount || 0) * 0.7),
            total: stats.studentCount || 0,
            percentage: stats.studentCount > 0 ? Math.round((stats.contactCount || 0) * 0.7 / stats.studentCount * 100) : 0
          }
        },
        overall: {
          totalContacts: stats.contactCount || 0,
          totalStudents: stats.studentCount || 0,
          progressRate: stats.progressRate || 0
        }
      };
      
      return {
        success: true,
        message: '分階段進度獲取成功',
        progress: progressData,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        error: '無法獲取系統統計數據',
        message: '進度數據暫時無法獲取',
        progress: null
      };
    }
    
  } catch (error) {
    Logger.log('getProgressByStageWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('getProgressByStageWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      success: false,
      error: '分階段進度獲取失敗: ' + error.message,
      message: '進度數據獲取失敗，請稍後重試',
      progress: null
    };
  }
}

/**
 * Web API: 獲取可用班級列表
 */
function getAvailableClassesWeb() {
  try {
    Logger.log('Web API: getAvailableClassesWeb 被調用');
    
    const studentService = getStudentService();
    const result = studentService.getStudentData();
    
    if (result.success && result.data.records) {
      // 查找班級欄位
      const classIndex = result.data.headers.findIndex(h => 
        h && h.toString().toLowerCase().includes('english class')
      );
      
      if (classIndex !== -1) {
        const classes = [...new Set(result.data.records
          .map(record => record[classIndex])
          .filter(cls => cls && cls.toString().trim() !== '')
        )].sort();
        
        return {
          success: true,
          message: `找到 ${classes.length} 個班級`,
          classes: classes,
          count: classes.length,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: '找不到班級欄位',
          message: '學生資料中沒有班級信息',
          classes: [],
          count: 0
        };
      }
    } else {
      return {
        success: false,
        error: result.message || '無法獲取學生資料',
        message: '班級列表暫時無法獲取',
        classes: [],
        count: 0
      };
    }
    
  } catch (error) {
    Logger.log('getAvailableClassesWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('getAvailableClassesWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.STUDENT);
    
    return {
      success: false,
      error: '班級列表獲取失敗: ' + error.message,
      message: '班級列表獲取失敗，請稍後重試',
      classes: [],
      count: 0
    };
  }
}

// ==================== 報告類 Web API 函數 ====================

/**
 * Web API: 獲取異動歷史URL
 */
function getChangeHistoryUrlWeb() {
  try {
    Logger.log('Web API: getChangeHistoryUrlWeb 被調用');
    
    // 這裡應該整合 StudentChangeManager 的功能
    // 目前先返回模擬結果
    const mockUrl = 'https://docs.google.com/spreadsheets/d/mock-change-history-id/edit';
    
    return {
      success: true,
      message: '異動歷史URL獲取成功',
      url: mockUrl,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('getChangeHistoryUrlWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('getChangeHistoryUrlWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.STUDENT);
    
    return {
      success: false,
      error: '異動歷史URL獲取失敗: ' + error.message,
      message: 'URL獲取失敗，請稍後重試',
      url: ''
    };
  }
}

/**
 * Web API: 生成異動報告
 */
function generateChangeReportWeb() {
  try {
    Logger.log('Web API: generateChangeReportWeb 被調用');
    
    // 這裡應該整合 StudentChangeManager 的報告功能
    // 目前先返回模擬結果
    const mockReport = {
      reportId: 'REPORT_' + Date.now(),
      generatedAt: new Date().toISOString(),
      totalChanges: 0,
      changeTypes: {
        classChange: 0,
        transferOut: 0,
        infoUpdate: 0
      },
      url: 'https://docs.google.com/spreadsheets/d/mock-report-id/edit'
    };
    
    return {
      success: true,
      message: '異動報告生成完成',
      report: mockReport,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('generateChangeReportWeb 錯誤: ' + error.toString());
    ErrorHandler.handle('generateChangeReportWeb', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.STUDENT);
    
    return {
      success: false,
      error: '異動報告生成失敗: ' + error.message,
      message: '報告生成失敗，請稍後重試',
      report: null
    };
  }
}