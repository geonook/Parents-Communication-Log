/**
 * 學生領域服務
 * 實現學生相關的業務邏輯和領域規則
 * Version: 1.0.0 - Phase 3 微服務架構
 */

/**
 * 學生聚合根
 */
class Student {
  constructor(id, chineseName, englishName, englishClass, grade = null) {
    this.id = id;
    this.chineseName = chineseName;
    this.englishName = englishName;
    this.englishClass = englishClass;
    this.grade = grade;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.status = 'active';
    this.contactHistory = [];
    this.classHistory = [];
    
    // 記錄初始班級
    this.classHistory.push({
      className: englishClass,
      startDate: new Date().toISOString(),
      endDate: null,
      reason: 'initial'
    });
  }
  
  /**
   * 更改班級
   * @param {string} newClass 新班級
   * @param {string} reason 異動原因
   * @return {Object} 異動結果
   */
  changeClass(newClass, reason = 'transfer') {
    if (this.englishClass === newClass) {
      return {
        success: false,
        message: '新班級與當前班級相同'
      };
    }
    
    const oldClass = this.englishClass;
    
    // 結束當前班級記錄
    const currentClassRecord = this.classHistory.find(h => h.endDate === null);
    if (currentClassRecord) {
      currentClassRecord.endDate = new Date().toISOString();
    }
    
    // 更新班級
    this.englishClass = newClass;
    this.updatedAt = new Date().toISOString();
    
    // 添加新班級記錄
    this.classHistory.push({
      className: newClass,
      startDate: new Date().toISOString(),
      endDate: null,
      reason: reason,
      previousClass: oldClass
    });
    
    return {
      success: true,
      oldClass: oldClass,
      newClass: newClass,
      message: `學生班級從 ${oldClass} 異動至 ${newClass}`
    };
  }
  
  /**
   * 添加聯絡記錄
   * @param {Object} contactRecord 聯絡記錄
   */
  addContactRecord(contactRecord) {
    this.contactHistory.push({
      id: contactRecord.id || `contact_${Date.now()}`,
      type: contactRecord.type,
      date: contactRecord.date || new Date().toISOString(),
      description: contactRecord.description,
      teacher: contactRecord.teacher,
      result: contactRecord.result
    });
    this.updatedAt = new Date().toISOString();
  }
  
  /**
   * 更新學生資訊
   * @param {Object} updateData 更新資料
   */
  update(updateData) {
    if (updateData.chineseName) this.chineseName = updateData.chineseName;
    if (updateData.englishName) this.englishName = updateData.englishName;
    if (updateData.grade) this.grade = updateData.grade;
    if (updateData.status) this.status = updateData.status;
    
    this.updatedAt = new Date().toISOString();
  }
  
  /**
   * 驗證學生資料
   * @return {Object} 驗證結果
   */
  validate() {
    const errors = [];
    
    if (!this.id || this.id.trim() === '') {
      errors.push('學生ID不能為空');
    }
    
    if (!this.chineseName || this.chineseName.trim() === '') {
      errors.push('中文姓名不能為空');
    }
    
    if (!this.englishName || this.englishName.trim() === '') {
      errors.push('英文姓名不能為空');
    }
    
    if (!this.englishClass || this.englishClass.trim() === '') {
      errors.push('英語班級不能為空');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * 獲取當前班級歷史
   * @return {Object|null} 當前班級記錄
   */
  getCurrentClassRecord() {
    return this.classHistory.find(h => h.endDate === null) || null;
  }
  
  /**
   * 獲取班級異動次數
   * @return {number} 異動次數
   */
  getClassChangeCount() {
    return this.classHistory.filter(h => h.reason !== 'initial').length;
  }
  
  /**
   * 轉換為JSON
   */
  toJSON() {
    return {
      id: this.id,
      chineseName: this.chineseName,
      englishName: this.englishName,
      englishClass: this.englishClass,
      grade: this.grade,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      status: this.status,
      contactHistory: this.contactHistory,
      classHistory: this.classHistory,
      classChangeCount: this.getClassChangeCount()
    };
  }
}

/**
 * 學生倉庫介面
 */
class StudentRepository {
  constructor() {
    this.students = new Map(); // 模擬資料存儲
    this.classIndex = new Map(); // 班級索引
  }
  
  /**
   * 保存學生
   * @param {Student} student 學生對象
   * @return {Promise<Student>} 保存的學生
   */
  async save(student) {
    this.students.set(student.id, student);
    
    // 更新班級索引
    this.updateClassIndex(student);
    
    Logger.log(`[StudentRepository] 保存學生: ${student.chineseName} (${student.id})`);
    return student;
  }
  
  /**
   * 批量保存學生
   * @param {Array<Student>} students 學生列表
   * @return {Promise<Array<Student>>} 保存的學生列表
   */
  async saveBatch(students) {
    const savedStudents = [];
    
    for (const student of students) {
      await this.save(student);
      savedStudents.push(student);
    }
    
    return savedStudents;
  }
  
  /**
   * 根據ID查找學生
   * @param {string} id 學生ID
   * @return {Promise<Student|null>} 學生對象或null
   */
  async findById(id) {
    return this.students.get(id) || null;
  }
  
  /**
   * 根據中文姓名查找學生
   * @param {string} chineseName 中文姓名
   * @return {Promise<Student|null>} 學生對象或null
   */
  async findByChineseName(chineseName) {
    for (const student of this.students.values()) {
      if (student.chineseName === chineseName) {
        return student;
      }
    }
    return null;
  }
  
  /**
   * 根據班級查找學生
   * @param {string} className 班級名稱
   * @return {Promise<Array<Student>>} 學生列表
   */
  async findByClass(className) {
    const studentIds = this.classIndex.get(className) || new Set();
    const students = [];
    
    for (const studentId of studentIds) {
      const student = this.students.get(studentId);
      if (student && student.englishClass === className) {
        students.push(student);
      }
    }
    
    return students;
  }
  
  /**
   * 查找所有學生
   * @return {Promise<Array<Student>>} 學生列表
   */
  async findAll() {
    return Array.from(this.students.values());
  }
  
  /**
   * 搜尋學生
   * @param {Object} criteria 搜尋條件
   * @return {Promise<Array<Student>>} 學生列表
   */
  async search(criteria) {
    let students = Array.from(this.students.values());
    
    if (criteria.id) {
      students = students.filter(s => s.id.includes(criteria.id));
    }
    
    if (criteria.chineseName) {
      students = students.filter(s => s.chineseName.includes(criteria.chineseName));
    }
    
    if (criteria.englishName) {
      students = students.filter(s => s.englishName.toLowerCase().includes(criteria.englishName.toLowerCase()));
    }
    
    if (criteria.englishClass) {
      students = students.filter(s => s.englishClass === criteria.englishClass);
    }
    
    if (criteria.grade) {
      students = students.filter(s => s.grade === criteria.grade);
    }
    
    if (criteria.status) {
      students = students.filter(s => s.status === criteria.status);
    }
    
    return students;
  }
  
  /**
   * 獲取所有班級
   * @return {Promise<Array<string>>} 班級列表
   */
  async getAllClasses() {
    return Array.from(this.classIndex.keys());
  }
  
  /**
   * 刪除學生
   * @param {string} id 學生ID
   * @return {Promise<boolean>} 是否成功刪除
   */
  async delete(id) {
    const student = this.students.get(id);
    if (student) {
      this.students.delete(id);
      this.removeFromClassIndex(student);
      Logger.log(`[StudentRepository] 刪除學生: ${student.chineseName} (${id})`);
      return true;
    }
    return false;
  }
  
  // === 私有方法 ===
  
  /**
   * 更新班級索引
   */
  updateClassIndex(student) {
    // 移除舊的索引
    this.removeFromClassIndex(student);
    
    // 添加新的索引
    if (!this.classIndex.has(student.englishClass)) {
      this.classIndex.set(student.englishClass, new Set());
    }
    this.classIndex.get(student.englishClass).add(student.id);
  }
  
  /**
   * 從班級索引中移除
   */
  removeFromClassIndex(student) {
    for (const [className, studentIds] of this.classIndex) {
      studentIds.delete(student.id);
      if (studentIds.size === 0) {
        this.classIndex.delete(className);
      }
    }
  }
}

/**
 * 學生導入命令處理器
 */
class ImportStudentsCommandHandler extends CommandHandler {
  constructor(studentRepository, eventBus) {
    super('ImportStudentsCommandHandler');
    this.studentRepository = studentRepository;
    this.eventBus = eventBus;
  }
  
  canHandle(commandType) {
    return commandType === COMMAND_TYPES.IMPORT_STUDENTS;
  }
  
  validate(command) {
    const errors = [];
    const data = command.data;
    
    if (!data.students || !Array.isArray(data.students) || data.students.length === 0) {
      errors.push('學生資料不能為空');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  async execute(command) {
    const data = command.data;
    const students = data.students;
    const options = data.options || {};
    
    const importResult = {
      totalStudents: students.length,
      successCount: 0,
      failureCount: 0,
      duplicateCount: 0,
      errors: [],
      importedStudents: []
    };
    
    for (const studentData of students) {
      try {
        // 檢查學生是否已存在
        const existingStudent = await this.studentRepository.findById(studentData.id);
        if (existingStudent && !options.allowUpdate) {
          importResult.duplicateCount++;
          continue;
        }
        
        // 創建或更新學生
        let student;
        if (existingStudent && options.allowUpdate) {
          existingStudent.update(studentData);
          student = existingStudent;
        } else {
          student = new Student(
            studentData.id,
            studentData.chineseName,
            studentData.englishName,
            studentData.englishClass,
            studentData.grade
          );
        }
        
        // 驗證學生資料
        const validation = student.validate();
        if (!validation.valid) {
          importResult.errors.push(`學生 ${studentData.id}: ${validation.errors.join(', ')}`);
          importResult.failureCount++;
          continue;
        }
        
        // 保存學生
        await this.studentRepository.save(student);
        importResult.successCount++;
        importResult.importedStudents.push(student.toJSON());
        
      } catch (error) {
        importResult.errors.push(`學生 ${studentData.id}: ${error.message}`);
        importResult.failureCount++;
      }
    }
    
    // 發布領域事件
    const event = EventFactory.createStudentImported(
      importResult.importedStudents,
      importResult,
      'StudentDomainService'
    );
    await this.eventBus.publish(event);
    
    return {
      importResult: importResult,
      message: `學生導入完成: 成功 ${importResult.successCount}, 失敗 ${importResult.failureCount}, 重複 ${importResult.duplicateCount}`
    };
  }
}

/**
 * 學生班級異動命令處理器
 */
class ChangeStudentClassCommandHandler extends CommandHandler {
  constructor(studentRepository, eventBus) {
    super('ChangeStudentClassCommandHandler');
    this.studentRepository = studentRepository;
    this.eventBus = eventBus;
  }
  
  canHandle(commandType) {
    return commandType === COMMAND_TYPES.CHANGE_STUDENT_CLASS;
  }
  
  validate(command) {
    const errors = [];
    const data = command.data;
    
    if (!data.studentId) {
      errors.push('學生ID不能為空');
    }
    
    if (!data.newClass) {
      errors.push('新班級不能為空');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  async execute(command) {
    const data = command.data;
    
    // 查找學生
    const student = await this.studentRepository.findById(data.studentId);
    if (!student) {
      throw new Error(`找不到學生: ${data.studentId}`);
    }
    
    // 執行班級異動
    const changeResult = student.changeClass(data.newClass, data.reason || 'manual');
    
    if (!changeResult.success) {
      throw new Error(changeResult.message);
    }
    
    // 保存學生
    await this.studentRepository.save(student);
    
    // 發布領域事件
    const event = EventFactory.createStudentClassChanged(
      student.toJSON(),
      changeResult.oldClass,
      changeResult.newClass,
      'StudentDomainService'
    );
    await this.eventBus.publish(event);
    
    return {
      studentId: student.id,
      student: student.toJSON(),
      changeResult: changeResult,
      message: changeResult.message
    };
  }
}

/**
 * 學生查詢處理器
 */
class GetStudentsQueryHandler extends QueryHandler {
  constructor(studentRepository) {
    super('GetStudentsQueryHandler');
    this.studentRepository = studentRepository;
  }
  
  canHandle(queryType) {
    return queryType === QUERY_TYPES.GET_STUDENTS;
  }
  
  async execute(query) {
    const criteria = query.criteria;
    const options = query.options;
    
    let students;
    
    // 根據條件搜尋學生
    if (Object.keys(criteria).length > 0) {
      students = await this.studentRepository.search(criteria);
    } else {
      students = await this.studentRepository.findAll();
    }
    
    // 應用排序
    if (options.sortBy) {
      students.sort((a, b) => {
        const aValue = a[options.sortBy];
        const bValue = b[options.sortBy];
        const order = options.sortOrder === 'desc' ? -1 : 1;
        
        if (aValue < bValue) return -1 * order;
        if (aValue > bValue) return 1 * order;
        return 0;
      });
    }
    
    // 應用分頁
    const totalCount = students.length;
    if (options.paginated) {
      const page = options.page || 1;
      const pageSize = options.pageSize || 20;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      
      students = students.slice(startIndex, endIndex);
      
      return QueryResult.paginated(
        students.map(s => s.toJSON()),
        totalCount,
        page,
        pageSize
      );
    }
    
    return new QueryResult(students.map(s => s.toJSON()), totalCount);
  }
}

/**
 * 根據班級獲取學生查詢處理器
 */
class GetStudentsByClassQueryHandler extends QueryHandler {
  constructor(studentRepository) {
    super('GetStudentsByClassQueryHandler');
    this.studentRepository = studentRepository;
  }
  
  canHandle(queryType) {
    return queryType === QUERY_TYPES.GET_STUDENTS_BY_CLASS;
  }
  
  async execute(query) {
    const className = query.criteria.className;
    
    const students = await this.studentRepository.findByClass(className);
    
    return new QueryResult(students.map(s => s.toJSON()), students.length);
  }
}

/**
 * 學生領域服務
 */
class StudentDomainService {
  constructor() {
    this.repository = new StudentRepository();
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
    const importStudentsHandler = new ImportStudentsCommandHandler(this.repository, this.eventBus);
    const changeClassHandler = new ChangeStudentClassCommandHandler(this.repository, this.eventBus);
    
    this.commandProcessor.registerHandler(COMMAND_TYPES.IMPORT_STUDENTS, importStudentsHandler);
    this.commandProcessor.registerHandler(COMMAND_TYPES.CHANGE_STUDENT_CLASS, changeClassHandler);
    
    // 註冊查詢處理器
    const getStudentsHandler = new GetStudentsQueryHandler(this.repository);
    const getStudentsByClassHandler = new GetStudentsByClassQueryHandler(this.repository);
    
    this.queryService.registerHandler(QUERY_TYPES.GET_STUDENTS, getStudentsHandler);
    this.queryService.registerHandler(QUERY_TYPES.GET_STUDENTS_BY_CLASS, getStudentsByClassHandler);
    
    Logger.log('[StudentDomainService] 處理器初始化完成');
  }
  
  /**
   * 導入學生資料
   * @param {Array} studentsData 學生資料列表
   * @param {Object} options 導入選項
   * @param {string} userId 用戶ID
   * @return {Promise<Object>} 導入結果
   */
  async importStudents(studentsData, options = {}, userId = null) {
    const command = CommandFactory.importStudents(studentsData, options, userId);
    return await this.commandProcessor.executeCommand(command);
  }
  
  /**
   * 學生班級異動
   * @param {string} studentId 學生ID
   * @param {string} newClass 新班級
   * @param {string} reason 異動原因
   * @param {string} userId 用戶ID
   * @return {Promise<Object>} 異動結果
   */
  async changeStudentClass(studentId, newClass, reason = 'manual', userId = null) {
    const command = CommandFactory.changeStudentClass(studentId, newClass, userId);
    command.data.reason = reason;
    return await this.commandProcessor.executeCommand(command);
  }
  
  /**
   * 獲取學生列表
   * @param {Object} criteria 查詢條件
   * @param {Object} options 查詢選項
   * @return {Promise<QueryResult>} 查詢結果
   */
  async getStudents(criteria = {}, options = {}) {
    const query = QueryFactory.getStudents(criteria, options);
    return await this.queryService.executeQuery(query);
  }
  
  /**
   * 根據班級獲取學生
   * @param {string} className 班級名稱
   * @return {Promise<QueryResult>} 查詢結果
   */
  async getStudentsByClass(className) {
    const query = QueryFactory.getStudentsByClass(className);
    return await this.queryService.executeQuery(query);
  }
  
  /**
   * 同步現有學生資料到領域模型
   */
  async syncExistingStudents() {
    const perfSession = startTimer('StudentDomainService.syncExistingStudents', 'SYNC');
    
    try {
      Logger.log('[StudentDomainService] 開始同步現有學生資料');
      
      // 使用現有功能獲取學生總表
      const masterList = getSystemMasterList();
      if (!masterList || masterList.length < 4) {
        throw new Error('無法獲取學生總表或資料不足');
      }
      
      const headers = masterList[2]; // 第3行是標題
      const studentRecords = masterList.slice(3); // 從第4行開始是資料
      
      // 找出關鍵欄位的索引
      const idIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('id'));
      const chineseNameIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('chinese name'));
      const englishNameIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('english name'));
      const englishClassIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('english class'));
      const gradeIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('grade'));
      
      if (idIndex === -1 || chineseNameIndex === -1 || englishNameIndex === -1 || englishClassIndex === -1) {
        throw new Error('學生總表缺少必要欄位');
      }
      
      let syncCount = 0;
      const errors = [];
      
      for (const record of studentRecords) {
        try {
          const studentData = {
            id: record[idIndex]?.toString()?.trim(),
            chineseName: record[chineseNameIndex]?.toString()?.trim(),
            englishName: record[englishNameIndex]?.toString()?.trim(),
            englishClass: record[englishClassIndex]?.toString()?.trim(),
            grade: gradeIndex !== -1 ? record[gradeIndex]?.toString()?.trim() : null
          };
          
          // 檢查必要資料
          if (!studentData.id || !studentData.chineseName || !studentData.englishName || !studentData.englishClass) {
            continue;
          }
          
          // 檢查學生是否已存在
          const existingStudent = await this.repository.findById(studentData.id);
          
          if (!existingStudent) {
            // 創建新學生
            const student = new Student(
              studentData.id,
              studentData.chineseName,
              studentData.englishName,
              studentData.englishClass,
              studentData.grade
            );
            
            const validation = student.validate();
            if (validation.valid) {
              await this.repository.save(student);
              syncCount++;
            } else {
              errors.push(`學生 ${studentData.id}: ${validation.errors.join(', ')}`);
            }
          }
        } catch (error) {
          errors.push(`處理學生資料失敗: ${error.message}`);
        }
      }
      
      perfSession.end(true, `同步完成: ${syncCount} 位學生`);
      
      return {
        success: true,
        syncCount: syncCount,
        totalRecords: studentRecords.length,
        errors: errors,
        message: `成功同步 ${syncCount} 位學生到領域模型`
      };
      
    } catch (error) {
      perfSession.end(false, error.message);
      
      ErrorHandler.handle('StudentDomainService.syncExistingStudents', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
      
      throw error;
    }
  }
  
  /**
   * 獲取統計資訊
   * @return {Object} 統計資訊
   */
  async getStats() {
    const students = await this.repository.findAll();
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'active').length;
    const classes = await this.repository.getAllClasses();
    const grades = new Set(students.map(s => s.grade).filter(g => g));
    
    // 計算班級異動統計
    const studentsWithChanges = students.filter(s => s.getClassChangeCount() > 0);
    const totalChanges = students.reduce((sum, s) => sum + s.getClassChangeCount(), 0);
    
    return {
      totalStudents: totalStudents,
      activeStudents: activeStudents,
      inactiveStudents: totalStudents - activeStudents,
      totalClasses: classes.length,
      totalGrades: grades.size,
      studentsWithClassChanges: studentsWithChanges.length,
      totalClassChanges: totalChanges,
      averageChangesPerStudent: totalStudents > 0 ? (totalChanges / totalStudents).toFixed(2) : 0
    };
  }
}

/**
 * 全域學生領域服務實例
 */
const globalStudentDomainService = new StudentDomainService();