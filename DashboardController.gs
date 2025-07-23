/**
 * Dashboard Web App 控制器
 * 提供視覺化管理介面的後端支援
 * Version: 2.0.0 - Phase 2 重構版本，使用服務層架構
 */

// 初始化服務實例
const teacherService = new TeacherService();
const studentService = new StudentService();
const systemService = new SystemService();

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
    return await teacherService.createFromMasterList(params.masterListId);
  }, { description: '從學生總表創建教師記錄簿' });
  
  ApiRouter.register('createSingleTeacher', async (params) => {
    const teacherInfo = {
      name: params.teacherName,
      subject: params.subject || 'English',
      classes: params.classes
    };
    return await teacherService.createSingleTeacher(teacherInfo);
  }, { description: '創建單一教師記錄簿' });
  
  ApiRouter.register('batchCreateTeachers', async (params) => {
    return await teacherService.batchCreateTeachers(params.teachersList);
  }, { description: '批量創建教師記錄簿' });
  
  ApiRouter.register('getTeachersList', async (params) => {
    return await teacherService.getTeachersList();
  }, { description: '獲取教師列表' });
  
  ApiRouter.register('getTeacherDetails', async (params) => {
    return await teacherService.getTeacherDetails(params.teacherId);
  }, { description: '獲取教師詳細資訊' });
  
  ApiRouter.register('repairTeacherRecordBook', async (params) => {
    return await teacherService.repairTeacherRecordBook(params.teacherId);
  }, { description: '修復教師記錄簿' });
  
  // 學生相關路由
  ApiRouter.register('getStudentData', async (params) => {
    return await studentService.getStudentData(params.sheetId);
  }, { description: '獲取學生資料' });
  
  ApiRouter.register('importStudentData', async (params) => {
    return await studentService.importStudentData(params.sourceSheetId, params.options);
  }, { description: '導入學生資料' });
  
  ApiRouter.register('searchStudents', async (params) => {
    return await studentService.searchStudents(params.searchCriteria);
  }, { description: '搜尋學生' });
  
  ApiRouter.register('getStudentDetails', async (params) => {
    return await studentService.getStudentDetails(params.studentId);
  }, { description: '獲取學生詳細資訊' });
  
  ApiRouter.register('updateStudentInfo', async (params) => {
    return await studentService.updateStudentInfo(params.studentId, params.updateData);
  }, { description: '更新學生資訊' });
  
  ApiRouter.register('getClassStudents', async (params) => {
    return await studentService.getClassStudents(params.className);
  }, { description: '獲取班級學生列表' });
  
  // 系統相關路由
  ApiRouter.register('getSystemStatus', async (params) => {
    return await systemService.getSystemStatus();
  }, { description: '獲取系統狀態' });
  
  ApiRouter.register('initializeSystem', async (params) => {
    return await systemService.initializeSystem(params.config);
  }, { description: '系統初始化' });
  
  ApiRouter.register('runSystemDiagnostics', async (params) => {
    return await systemService.runSystemDiagnostics(params.options);
  }, { description: '系統診斷' });
  
  ApiRouter.register('validateConfiguration', async (params) => {
    return await systemService.validateConfiguration();
  }, { description: '系統配置驗證' });
  
  ApiRouter.register('createSystemBackup', async (params) => {
    return await systemService.createSystemBackup(params.options);
  }, { description: '系統備份' });
  
  ApiRouter.register('resetSystem', async (params) => {
    return await systemService.resetSystem(params.options);
  }, { description: '系統重置' });
  
  // 向後兼容的別名路由
  ApiRouter.register('getStats', async (params) => {
    return await systemService.getSystemStatus();
  }, { description: '獲取系統統計（向後兼容）' });
  
  ApiRouter.register('setupCompleteSystem', async (params) => {
    return await systemService.initializeSystem();
  }, { description: '完整系統設定（向後兼容）' });
  
  ApiRouter.register('getAvailableClasses', async (params) => {
    const studentData = await studentService.getStudentData();
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