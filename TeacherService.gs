/**
 * 教師管理服務
 * 處理所有與教師相關的業務邏輯
 * Version: 1.0.0 - Phase 2 API重構
 */

class TeacherService extends ApiService {
  constructor() {
    super();
  }
  
  /**
   * 從學生總表創建教師記錄簿
   * @param {string} masterListId 學生總表ID（可選）
   * @return {Object} API響應
   */
  async createFromMasterList(masterListId = null) {
    return this.executeWithErrorHandling(async () => {
      Logger.log('TeacherService: 開始從學生總表建立老師記錄簿');
      
      let studentMasterData;
      
      // 優先嘗試使用系統學生總表
      if (!masterListId || masterListId.trim() === '') {
        Logger.log('TeacherService: 未提供 ID，嘗試使用系統學生總表');
        const systemMasterList = getSystemMasterList();
        if (systemMasterList) {
          studentMasterData = {
            data: systemMasterList.slice(3), // 跳過前3行
            headers: systemMasterList[2],    // 第3行是標題
            sheetId: 'system'
          };
          Logger.log('TeacherService: 成功使用系統學生總表');
        } else {
          return this.error(
            '找不到系統學生總表，請提供學生總表的 Google Sheets ID 或先初始化系統',
            'SYSTEM_MASTER_LIST_NOT_FOUND'
          );
        }
      } else {
        // 使用用戶提供的 ID
        Logger.log('TeacherService: 使用用戶提供的學生總表 ID');
        try {
          const spreadsheet = SpreadsheetApp.openById(masterListId);
          const sheet = spreadsheet.getActiveSheet();
          const allData = sheet.getDataRange().getValues();
          
          studentMasterData = {
            data: allData.slice(3),
            headers: allData[2],
            sheetId: masterListId
          };
        } catch (error) {
          return this.error(
            '無法開啟指定的學生總表，請檢查 Google Sheets ID 是否正確且有權限存取',
            'INVALID_MASTER_LIST_ID'
          );
        }
      }
      
      // 執行建立流程
      const result = await this.executeTeacherCreationProcess(studentMasterData);
      
      return this.success(result, '成功從學生總表建立教師記錄簿');
      
    }, 'createFromMasterList', { masterListId });
  }
  
  /**
   * 創建單一教師記錄簿
   * @param {Object} teacherInfo 教師資訊
   * @return {Object} API響應
   */
  async createSingleTeacher(teacherInfo) {
    const validation = this.validateRequiredParams(teacherInfo, ['name', 'subject', 'classes']);
    if (validation) return validation;
    
    return this.executeWithErrorHandling(async () => {
      Logger.log(`TeacherService: 開始建立單一教師記錄簿 - ${teacherInfo.name}`);
      
      // 解析班級字串
      const classes = typeof teacherInfo.classes === 'string' 
        ? teacherInfo.classes.split(',').map(c => c.trim()).filter(c => c !== '')
        : teacherInfo.classes;
      
      const processedTeacherInfo = {
        name: teacherInfo.name.trim(),
        subject: teacherInfo.subject.trim(),
        classes: classes
      };
      
      // 使用模組化的教師記錄簿創建功能
      const result = createTeacherRecordBook(processedTeacherInfo);
      
      return this.success(result, `成功建立 ${processedTeacherInfo.name} 老師的記錄簿`);
      
    }, 'createSingleTeacher', { teacherInfo });
  }
  
  /**
   * 批量創建教師記錄簿
   * @param {Array} teachersList 教師列表
   * @return {Object} API響應
   */
  async batchCreateTeachers(teachersList) {
    if (!Array.isArray(teachersList) || teachersList.length === 0) {
      return this.error('教師列表不能為空', 'EMPTY_TEACHERS_LIST');
    }
    
    return this.executeWithErrorHandling(async () => {
      Logger.log(`TeacherService: 開始批量建立 ${teachersList.length} 位教師記錄簿`);
      
      const results = {
        total: teachersList.length,
        successful: 0,
        failed: 0,
        details: []
      };
      
      for (let i = 0; i < teachersList.length; i++) {
        const teacher = teachersList[i];
        try {
          const result = await this.createSingleTeacher(teacher);
          if (result.success) {
            results.successful++;
            results.details.push({
              teacher: teacher.name,
              status: 'success',
              message: '建立成功'
            });
          } else {
            results.failed++;
            results.details.push({
              teacher: teacher.name,
              status: 'failed',
              message: result.message
            });
          }
        } catch (error) {
          results.failed++;
          results.details.push({
            teacher: teacher.name,
            status: 'failed',
            message: error.message
          });
        }
        
        // 避免API限制
        if (i < teachersList.length - 1) {
          Utilities.sleep(200);
        }
      }
      
      const message = `批量建立完成：成功 ${results.successful} 位，失敗 ${results.failed} 位`;
      return this.success(results, message);
      
    }, 'batchCreateTeachers', { count: teachersList.length });
  }
  
  /**
   * 獲取教師列表
   * @return {Object} API響應
   */
  async getTeachersList() {
    return this.executeWithErrorHandling(async () => {
      Logger.log('TeacherService: 獲取教師列表');
      
      // 使用智能緩存獲取教師列表
      const diagnosis = await globalCache.get(
        'teachers_diagnosis',
        () => diagnoseTeacherRecordBooksContactStatus(),
        CACHE_CONFIG.TTL.TEACHER_LIST
      );
      
      const teachers = [...diagnosis.normalBooks, ...diagnosis.emptyContactBooks]
        .map(book => ({
          id: book.id,
          name: book.name,
          url: book.url,
          studentCount: book.studentCount,
          contactRecordCount: book.contactRecordCount,
          lastModified: book.lastModified,
          status: book.contactRecordCount > 0 ? 'active' : 'inactive'
        }));
      
      return this.success(teachers, `找到 ${teachers.length} 位教師記錄簿`);
      
    }, 'getTeachersList');
  }
  
  /**
   * 獲取教師詳細資訊
   * @param {string} teacherId 教師記錄簿ID
   * @return {Object} API響應
   */
  async getTeacherDetails(teacherId) {
    const validation = this.validateRequiredParams({ teacherId }, ['teacherId']);
    if (validation) return validation;
    
    return this.executeWithErrorHandling(async () => {
      Logger.log(`TeacherService: 獲取教師詳細資訊 - ${teacherId}`);
      
      // 使用模組化的快速診斷功能
      const diagnosis = quickDiagnoseRecordBook(teacherId);
      
      if (diagnosis.error) {
        return this.error(diagnosis.error, 'TEACHER_NOT_FOUND');
      }
      
      return this.success(diagnosis, '成功獲取教師詳細資訊');
      
    }, 'getTeacherDetails', { teacherId });
  }
  
  /**
   * 修復教師記錄簿
   * @param {string} teacherId 教師記錄簿ID
   * @return {Object} API響應
   */
  async repairTeacherRecordBook(teacherId) {
    const validation = this.validateRequiredParams({ teacherId }, ['teacherId']);
    if (validation) return validation;
    
    return this.executeWithErrorHandling(async () => {
      Logger.log(`TeacherService: 修復教師記錄簿 - ${teacherId}`);
      
      const file = DriveApp.getFileById(teacherId);
      const bookInfo = {
        id: teacherId,
        name: file.getName(),
        url: file.getUrl()
      };
      
      // 使用模組化的修復功能
      const result = fixSingleRecordBook(bookInfo);
      
      if (result.success) {
        return this.success(result, '成功修復教師記錄簿');
      } else {
        return this.error(result.error, 'REPAIR_FAILED');
      }
      
    }, 'repairTeacherRecordBook', { teacherId });
  }
  
  /**
   * 執行教師創建流程的核心邏輯
   * @param {Object} studentMasterData 學生總表資料
   * @return {Object} 創建結果
   */
  async executeTeacherCreationProcess(studentMasterData) {
    Logger.log('TeacherService: 分析學生總表資料');
    
    // 分析資料結構
    const headers = studentMasterData.headers;
    const data = studentMasterData.data;
    
    Logger.log(`TeacherService: 標題欄位：${JSON.stringify(headers)}`);
    Logger.log(`TeacherService: 學生資料筆數：${data.length}`);
    
    // 找出英語班級和本地教師欄位
    const englishClassIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('english class'));
    const localTeacherIndex = headers.findIndex(h => h && (h.toString().toLowerCase().includes('lt') || h.toString().toLowerCase().includes('local teacher')));
    
    if (englishClassIndex === -1) {
      throw new Error('在學生總表中找不到 English Class 欄位');
    }
    
    if (localTeacherIndex === -1) {
      throw new Error('在學生總表中找不到 LT (Local Teacher) 欄位');
    }
    
    Logger.log(`TeacherService: English Class 欄位索引：${englishClassIndex}`);
    Logger.log(`TeacherService: Local Teacher 欄位索引：${localTeacherIndex}`);
    
    // 分析教師和班級關係
    const teacherClassMap = new Map();
    
    data.forEach((row, index) => {
      const englishClass = row[englishClassIndex];
      const localTeacher = row[localTeacherIndex];
      
      if (englishClass && localTeacher) {
        if (!teacherClassMap.has(localTeacher)) {
          teacherClassMap.set(localTeacher, new Set());
        }
        teacherClassMap.get(localTeacher).add(englishClass);
      }
    });
    
    Logger.log(`TeacherService: 找到 ${teacherClassMap.size} 位教師`);
    
    // 批量建立教師記錄簿
    const results = {
      totalTeachers: teacherClassMap.size,
      successfulTeachers: 0,
      failedTeachers: 0,
      teacherResults: []
    };
    
    for (const [teacherName, classSet] of teacherClassMap) {
      try {
        const teacherInfo = {
          name: teacherName,
          subject: 'English',
          classes: Array.from(classSet)
        };
        
        Logger.log(`TeacherService: 建立 ${teacherName} 老師記錄簿，班級：${teacherInfo.classes.join(', ')}`);
        
        const result = createTeacherRecordBook(teacherInfo);
        
        results.successfulTeachers++;
        results.teacherResults.push({
          teacher: teacherName,
          classes: teacherInfo.classes,
          success: true,
          recordBookId: result.recordBookId || null
        });
        
      } catch (error) {
        Logger.log(`TeacherService: 建立 ${teacherName} 老師記錄簿失敗：${error.message}`);
        
        results.failedTeachers++;
        results.teacherResults.push({
          teacher: teacherName,
          classes: Array.from(classSet),
          success: false,
          error: error.message
        });
      }
      
      // 避免API限制
      Utilities.sleep(500);
    }
    
    Logger.log(`TeacherService: 建立完成 - 成功：${results.successfulTeachers}，失敗：${results.failedTeachers}`);
    
    return results;
  }
}