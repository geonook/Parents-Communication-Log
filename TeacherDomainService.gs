/**
 * 教師領域服務
 * 實現教師相關的業務邏輯和領域規則
 * Version: 1.0.0 - Phase 3 微服務架構
 */

/**
 * 教師聚合根
 */
class Teacher {
  constructor(id, name, subject, classes = [], email = null) {
    this.id = id;
    this.name = name;
    this.subject = subject;
    this.classes = Array.isArray(classes) ? classes : [];
    this.email = email;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.recordBooks = [];
    this.status = 'active';
  }
  
  /**
   * 添加班級
   * @param {string} className 班級名稱
   */
  addClass(className) {
    if (!this.classes.includes(className)) {
      this.classes.push(className);
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }
  
  /**
   * 移除班級
   * @param {string} className 班級名稱
   */
  removeClass(className) {
    const index = this.classes.indexOf(className);
    if (index > -1) {
      this.classes.splice(index, 1);
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }
  
  /**
   * 添加記錄簿
   * @param {Object} recordBook 記錄簿資訊
   */
  addRecordBook(recordBook) {
    this.recordBooks.push({
      id: recordBook.id,
      name: recordBook.name,
      url: recordBook.url,
      createdAt: new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
  }
  
  /**
   * 更新教師資訊
   * @param {Object} updateData 更新資料
   */
  update(updateData) {
    if (updateData.name) this.name = updateData.name;
    if (updateData.subject) this.subject = updateData.subject;
    if (updateData.email) this.email = updateData.email;
    if (updateData.classes) this.classes = Array.isArray(updateData.classes) ? updateData.classes : [];
    
    this.updatedAt = new Date().toISOString();
  }
  
  /**
   * 驗證教師資料
   * @return {Object} 驗證結果
   */
  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim() === '') {
      errors.push('教師姓名不能為空');
    }
    
    if (!this.subject || this.subject.trim() === '') {
      errors.push('授課科目不能為空');
    }
    
    if (this.classes.length === 0) {
      errors.push('至少需要一個授課班級');
    }
    
    if (this.email && !this.isValidEmail(this.email)) {
      errors.push('電子郵件格式不正確');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * 檢查電子郵件格式
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * 轉換為JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      subject: this.subject,
      classes: this.classes,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      recordBooks: this.recordBooks,
      status: this.status
    };
  }
}

/**
 * 教師倉庫介面（模擬資料存取層）
 */
class TeacherRepository {
  constructor() {
    this.teachers = new Map(); // 模擬資料存儲
  }
  
  /**
   * 保存教師
   * @param {Teacher} teacher 教師對象
   * @return {Promise<Teacher>} 保存的教師
   */
  async save(teacher) {
    this.teachers.set(teacher.id, teacher);
    Logger.log(`[TeacherRepository] 保存教師: ${teacher.name} (${teacher.id})`);
    return teacher;
  }
  
  /**
   * 根據ID查找教師
   * @param {string} id 教師ID
   * @return {Promise<Teacher|null>} 教師對象或null
   */
  async findById(id) {
    return this.teachers.get(id) || null;
  }
  
  /**
   * 根據名稱查找教師
   * @param {string} name 教師姓名
   * @return {Promise<Teacher|null>} 教師對象或null
   */
  async findByName(name) {
    for (const teacher of this.teachers.values()) {
      if (teacher.name === name) {
        return teacher;
      }
    }
    return null;
  }
  
  /**
   * 查找所有教師
   * @return {Promise<Array<Teacher>>} 教師列表
   */
  async findAll() {
    return Array.from(this.teachers.values());
  }
  
  /**
   * 根據班級查找教師
   * @param {string} className 班級名稱
   * @return {Promise<Array<Teacher>>} 教師列表
   */
  async findByClass(className) {
    const result = [];
    for (const teacher of this.teachers.values()) {
      if (teacher.classes.includes(className)) {
        result.push(teacher);
      }
    }
    return result;
  }
  
  /**
   * 刪除教師
   * @param {string} id 教師ID
   * @return {Promise<boolean>} 是否成功刪除
   */
  async delete(id) {
    const deleted = this.teachers.delete(id);
    if (deleted) {
      Logger.log(`[TeacherRepository] 刪除教師: ${id}`);
    }
    return deleted;
  }
}

/**
 * 教師命令處理器
 */
class CreateTeacherCommandHandler extends CommandHandler {
  constructor(teacherRepository, eventBus) {
    super('CreateTeacherCommandHandler');
    this.teacherRepository = teacherRepository;
    this.eventBus = eventBus;
  }
  
  canHandle(commandType) {
    return commandType === COMMAND_TYPES.CREATE_TEACHER;
  }
  
  validate(command) {
    const errors = [];
    const data = command.data;
    
    if (!data.name || data.name.trim() === '') {
      errors.push('教師姓名不能為空');
    }
    
    if (!data.subject || data.subject.trim() === '') {
      errors.push('授課科目不能為空');
    }
    
    if (!data.classes || !Array.isArray(data.classes) || data.classes.length === 0) {
      errors.push('至少需要一個授課班級');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  async execute(command) {
    const data = command.data;
    
    // 檢查教師是否已存在
    const existingTeacher = await this.teacherRepository.findByName(data.name);
    if (existingTeacher) {
      throw new Error(`教師 ${data.name} 已存在`);
    }
    
    // 創建教師
    const teacherId = `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const teacher = new Teacher(teacherId, data.name, data.subject, data.classes, data.email);
    
    // 驗證教師資料
    const validation = teacher.validate();
    if (!validation.valid) {
      throw new Error(`教師資料驗證失敗: ${validation.errors.join(', ')}`);
    }
    
    // 保存教師
    await this.teacherRepository.save(teacher);
    
    // 發布領域事件
    const event = EventFactory.createTeacherCreated(teacher.toJSON(), 'TeacherDomainService');
    await this.eventBus.publish(event);
    
    return {
      teacherId: teacher.id,
      teacher: teacher.toJSON(),
      message: `成功創建教師: ${teacher.name}`
    };
  }
}

/**
 * 創建教師記錄簿命令處理器
 */
class CreateTeacherRecordBookCommandHandler extends CommandHandler {
  constructor(teacherRepository, eventBus) {
    super('CreateTeacherRecordBookCommandHandler');
    this.teacherRepository = teacherRepository;
    this.eventBus = eventBus;
  }
  
  canHandle(commandType) {
    return commandType === COMMAND_TYPES.CREATE_TEACHER_RECORDBOOK;
  }
  
  async execute(command) {
    const data = command.data;
    
    // 如果提供了教師ID，先查找教師
    let teacher = null;
    if (data.teacherId) {
      teacher = await this.teacherRepository.findById(data.teacherId);
      if (!teacher) {
        throw new Error(`找不到教師: ${data.teacherId}`);
      }
    }
    
    // 創建記錄簿（使用現有的模組化功能）
    const teacherInfo = {
      name: teacher ? teacher.name : data.name,
      subject: teacher ? teacher.subject : data.subject,
      classes: teacher ? teacher.classes : data.classes
    };
    
    const recordBookResult = createTeacherRecordBook(teacherInfo);
    
    // 如果教師存在，更新教師資訊
    if (teacher) {
      teacher.addRecordBook({
        id: recordBookResult.recordBookId,
        name: recordBookResult.recordBookName,
        url: recordBookResult.recordBookUrl
      });
      await this.teacherRepository.save(teacher);
    }
    
    // 發布領域事件
    const event = EventFactory.createTeacherRecordBookCreated(
      teacherInfo, 
      recordBookResult, 
      'TeacherDomainService'
    );
    await this.eventBus.publish(event);
    
    return {
      recordBookId: recordBookResult.recordBookId,
      recordBookName: recordBookResult.recordBookName,
      recordBookUrl: recordBookResult.recordBookUrl,
      teacher: teacher ? teacher.toJSON() : teacherInfo,
      message: `成功創建教師記錄簿: ${teacherInfo.name}`
    };
  }
}

/**
 * 教師查詢處理器
 */
class GetTeachersQueryHandler extends QueryHandler {
  constructor(teacherRepository) {
    super('GetTeachersQueryHandler');
    this.teacherRepository = teacherRepository;
  }
  
  canHandle(queryType) {
    return queryType === QUERY_TYPES.GET_TEACHERS;
  }
  
  async execute(query) {
    const criteria = query.criteria;
    const options = query.options;
    
    let teachers = await this.teacherRepository.findAll();
    
    // 應用篩選條件
    if (criteria.subject) {
      teachers = teachers.filter(t => t.subject === criteria.subject);
    }
    
    if (criteria.className) {
      teachers = teachers.filter(t => t.classes.includes(criteria.className));
    }
    
    if (criteria.status) {
      teachers = teachers.filter(t => t.status === criteria.status);
    }
    
    // 應用排序
    if (options.sortBy) {
      teachers.sort((a, b) => {
        const aValue = a[options.sortBy];
        const bValue = b[options.sortBy];
        const order = options.sortOrder === 'desc' ? -1 : 1;
        
        if (aValue < bValue) return -1 * order;
        if (aValue > bValue) return 1 * order;
        return 0;
      });
    }
    
    // 應用分頁
    const totalCount = teachers.length;
    if (options.paginated) {
      const page = options.page || 1;
      const pageSize = options.pageSize || 20;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      
      teachers = teachers.slice(startIndex, endIndex);
      
      return QueryResult.paginated(
        teachers.map(t => t.toJSON()), 
        totalCount, 
        page, 
        pageSize
      );
    }
    
    return new QueryResult(teachers.map(t => t.toJSON()), totalCount);
  }
}

/**
 * 單一教師查詢處理器
 */
class GetTeacherByIdQueryHandler extends QueryHandler {
  constructor(teacherRepository) {
    super('GetTeacherByIdQueryHandler');
    this.teacherRepository = teacherRepository;
  }
  
  canHandle(queryType) {
    return queryType === QUERY_TYPES.GET_TEACHER_BY_ID;
  }
  
  async execute(query) {
    const teacherId = query.criteria.id;
    
    const teacher = await this.teacherRepository.findById(teacherId);
    if (!teacher) {
      return QueryResult.error(`找不到教師: ${teacherId}`, 'TEACHER_NOT_FOUND');
    }
    
    return new QueryResult(teacher.toJSON());
  }
}

/**
 * 教師領域服務
 */
class TeacherDomainService {
  constructor() {
    this.repository = new TeacherRepository();
    this.eventBus = globalEventBus;
    this.commandProcessor = globalCommandProcessor;
    this.queryService = globalQueryService;
    
    this.initializeHandlers();
  }
  
  /**
   * 初始化處理器
   */
  initializeHandlers() {
    // 註冊命令處理器
    const createTeacherHandler = new CreateTeacherCommandHandler(this.repository, this.eventBus);
    const createRecordBookHandler = new CreateTeacherRecordBookCommandHandler(this.repository, this.eventBus);
    
    this.commandProcessor.registerHandler(COMMAND_TYPES.CREATE_TEACHER, createTeacherHandler);
    this.commandProcessor.registerHandler(COMMAND_TYPES.CREATE_TEACHER_RECORDBOOK, createRecordBookHandler);
    
    // 註冊查詢處理器
    const getTeachersHandler = new GetTeachersQueryHandler(this.repository);
    const getTeacherByIdHandler = new GetTeacherByIdQueryHandler(this.repository);
    
    this.queryService.registerHandler(QUERY_TYPES.GET_TEACHERS, getTeachersHandler);
    this.queryService.registerHandler(QUERY_TYPES.GET_TEACHER_BY_ID, getTeacherByIdHandler);
    
    Logger.log('[TeacherDomainService] 處理器初始化完成');
  }
  
  /**
   * 創建教師
   * @param {Object} teacherData 教師資料
   * @param {string} userId 用戶ID
   * @return {Promise<Object>} 創建結果
   */
  async createTeacher(teacherData, userId = null) {
    const command = CommandFactory.createTeacher(teacherData, userId);
    return await this.commandProcessor.executeCommand(command);
  }
  
  /**
   * 創建教師記錄簿
   * @param {Object} teacherData 教師資料
   * @param {string} userId 用戶ID
   * @return {Promise<Object>} 創建結果
   */
  async createTeacherRecordBook(teacherData, userId = null) {
    const command = CommandFactory.createTeacherRecordBook(teacherData, userId);
    return await this.commandProcessor.executeCommand(command);
  }
  
  /**
   * 獲取教師列表
   * @param {Object} criteria 查詢條件
   * @param {Object} options 查詢選項
   * @return {Promise<QueryResult>} 查詢結果
   */
  async getTeachers(criteria = {}, options = {}) {
    const query = QueryFactory.getTeachers(criteria, options);
    return await this.queryService.executeQuery(query);
  }
  
  /**
   * 根據ID獲取教師
   * @param {string} teacherId 教師ID
   * @return {Promise<QueryResult>} 查詢結果
   */
  async getTeacherById(teacherId) {
    const query = QueryFactory.getTeacherById(teacherId);
    return await this.queryService.executeQuery(query);
  }
  
  /**
   * 同步現有教師記錄簿到領域模型
   * 將現有系統中的教師記錄簿同步到新的領域模型中
   */
  async syncExistingTeachers() {
    const perfSession = startTimer('TeacherDomainService.syncExistingTeachers', 'SYNC');
    
    try {
      Logger.log('[TeacherDomainService] 開始同步現有教師記錄簿');
      
      // 使用現有的診斷功能獲取教師記錄簿
      const diagnosis = diagnoseTeacherRecordBooksContactStatus();
      const allBooks = [...diagnosis.normalBooks, ...diagnosis.emptyContactBooks];
      
      let syncCount = 0;
      
      for (const book of allBooks) {
        try {
          // 從記錄簿名稱解析教師資訊
          const teacherInfo = this.parseTeacherFromRecordBookName(book.name);
          
          if (teacherInfo) {
            // 檢查教師是否已存在
            const existingTeacher = await this.repository.findByName(teacherInfo.name);
            
            if (!existingTeacher) {
              // 創建新的教師領域對象
              const teacherId = `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const teacher = new Teacher(
                teacherId, 
                teacherInfo.name, 
                teacherInfo.subject, 
                teacherInfo.classes
              );
              
              // 添加記錄簿資訊
              teacher.addRecordBook({
                id: book.id,
                name: book.name,
                url: book.url
              });
              
              await this.repository.save(teacher);
              syncCount++;
              
              Logger.log(`[TeacherDomainService] 同步教師: ${teacher.name}`);
            } else {
              // 更新現有教師的記錄簿資訊
              existingTeacher.addRecordBook({
                id: book.id,
                name: book.name,
                url: book.url
              });
              await this.repository.save(existingTeacher);
            }
          }
        } catch (error) {
          Logger.log(`[TeacherDomainService] 同步教師失敗 ${book.name}: ${error.message}`);
        }
      }
      
      perfSession.end(true, `同步完成: ${syncCount} 位教師`);
      
      return {
        success: true,
        syncCount: syncCount,
        totalBooks: allBooks.length,
        message: `成功同步 ${syncCount} 位教師到領域模型`
      };
      
    } catch (error) {
      perfSession.end(false, error.message);
      
      ErrorHandler.handle('TeacherDomainService.syncExistingTeachers', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
      
      throw error;
    }
  }
  
  /**
   * 從記錄簿名稱解析教師資訊
   */
  parseTeacherFromRecordBookName(recordBookName) {
    // 嘗試從記錄簿名稱中解析教師資訊
    // 假設格式為: "教師姓名 - 科目 - 班級"
    const parts = recordBookName.split(' - ');
    
    if (parts.length >= 2) {
      return {
        name: parts[0].trim(),
        subject: parts[1].trim() || 'English',
        classes: parts.length > 2 ? [parts[2].trim()] : ['未知班級']
      };
    }
    
    // 如果無法解析，返回基本資訊
    return {
      name: recordBookName.replace(/[^a-zA-Z\u4e00-\u9fff\s]/g, '').trim(),
      subject: 'English',
      classes: ['未知班級']
    };
  }
  
  /**
   * 獲取統計資訊
   * @return {Object} 統計資訊
   */
  getStats() {
    const teachers = Array.from(this.repository.teachers.values());
    const totalTeachers = teachers.length;
    const activeTeachers = teachers.filter(t => t.status === 'active').length;
    const subjects = new Set(teachers.map(t => t.subject));
    const totalClasses = new Set(teachers.flatMap(t => t.classes));
    
    return {
      totalTeachers: totalTeachers,
      activeTeachers: activeTeachers,
      inactiveTeachers: totalTeachers - activeTeachers,
      uniqueSubjects: subjects.size,
      totalClasses: totalClasses.size,
      teachersWithRecordBooks: teachers.filter(t => t.recordBooks.length > 0).length
    };
  }
}

/**
 * 全域教師領域服務實例
 */
const globalTeacherDomainService = new TeacherDomainService();