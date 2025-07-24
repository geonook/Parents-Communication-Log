/**
 * 命令處理器系統
 * 實現 CQRS (命令查詢責任分離) 模式
 * Version: 1.0.0 - Phase 3 微服務架構
 */

/**
 * 命令基類
 */
class Command {
  constructor(commandType, data, userId = null) {
    this.id = this.generateCommandId();
    this.commandType = commandType;
    this.data = data;
    this.userId = userId;
    this.timestamp = new Date().toISOString();
    this.correlationId = this.generateCorrelationId();
    this.status = 'pending';
  }
  
  generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateCorrelationId() {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  markExecuting() {
    this.status = 'executing';
    this.executingAt = new Date().toISOString();
  }
  
  markCompleted(result) {
    this.status = 'completed';
    this.completedAt = new Date().toISOString();
    this.result = result;
  }
  
  markFailed(error) {
    this.status = 'failed';
    this.failedAt = new Date().toISOString();
    this.error = error.message || error;
  }
  
  toJSON() {
    return {
      id: this.id,
      commandType: this.commandType,
      data: this.data,
      userId: this.userId,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      status: this.status,
      executingAt: this.executingAt,
      completedAt: this.completedAt,
      failedAt: this.failedAt,
      result: this.result,
      error: this.error
    };
  }
}

/**
 * 命令處理器基類
 */
class CommandHandler {
  constructor(handlerName) {
    this.handlerName = handlerName;
  }
  
  /**
   * 執行命令 - 子類必須實現
   * @param {Command} command 命令
   * @return {Promise<Object>} 執行結果
   */
  async execute(command) {
    throw new Error(`CommandHandler ${this.handlerName} must implement execute method`);
  }
  
  /**
   * 檢查是否能處理此命令類型
   * @param {string} commandType 命令類型
   * @return {boolean} 是否能處理
   */
  canHandle(commandType) {
    return false; // 子類應該重寫此方法
  }
  
  /**
   * 驗證命令 - 可被子類重寫
   * @param {Command} command 命令
   * @return {Object} 驗證結果 {valid: boolean, errors: string[]}
   */
  validate(command) {
    return { valid: true, errors: [] };
  }
}

/**
 * 命令處理器註冊表
 */
class CommandRegistry {
  constructor() {
    this.handlers = new Map(); // commandType -> handler
    this.middleware = [];
  }
  
  /**
   * 註冊命令處理器
   * @param {string} commandType 命令類型
   * @param {CommandHandler} handler 命令處理器
   */
  register(commandType, handler) {
    if (this.handlers.has(commandType)) {
      throw new Error(`Command handler for ${commandType} already registered`);
    }
    
    this.handlers.set(commandType, handler);
    Logger.log(`[CommandRegistry] 註冊命令處理器: ${handler.handlerName} for ${commandType}`);
  }
  
  /**
   * 獲取命令處理器
   * @param {string} commandType 命令類型
   * @return {CommandHandler|null} 命令處理器
   */
  getHandler(commandType) {
    return this.handlers.get(commandType) || null;
  }
  
  /**
   * 取消註冊命令處理器
   * @param {string} commandType 命令類型
   */
  unregister(commandType) {
    if (this.handlers.has(commandType)) {
      const handler = this.handlers.get(commandType);
      this.handlers.delete(commandType);
      Logger.log(`[CommandRegistry] 取消註冊命令處理器: ${handler.handlerName} for ${commandType}`);
    }
  }
  
  /**
   * 添加中間件
   * @param {Object} middleware 中間件
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }
  
  /**
   * 獲取所有已註冊的命令類型
   * @return {Array} 命令類型列表
   */
  getRegisteredCommands() {
    return Array.from(this.handlers.keys());
  }
}

/**
 * 命令處理器核心類
 */
class CommandProcessor {
  constructor() {
    this.registry = new CommandRegistry();
    this.commandHistory = [];
    this.maxHistorySize = 1000;
    this.isProcessing = false;
    this.processingQueue = [];
  }
  
  /**
   * 註冊命令處理器
   * @param {string} commandType 命令類型
   * @param {CommandHandler} handler 命令處理器
   */
  registerHandler(commandType, handler) {
    this.registry.register(commandType, handler);
  }
  
  /**
   * 添加中間件
   * @param {Object} middleware 中間件
   */
  addMiddleware(middleware) {
    this.registry.addMiddleware(middleware);
  }
  
  /**
   * 執行命令
   * @param {Command} command 命令
   * @return {Promise<Object>} 執行結果
   */
  async executeCommand(command) {
    const perfSession = startTimer(`CommandProcessor.execute.${command.commandType}`, 'COMMAND');
    
    try {
      // 記錄命令到歷史
      this.addToHistory(command);
      
      // 獲取處理器
      const handler = this.registry.getHandler(command.commandType);
      if (!handler) {
        throw new Error(`No handler registered for command type: ${command.commandType}`);
      }
      
      perfSession.checkpoint('找到處理器');
      
      // 驗證命令
      const validation = handler.validate(command);
      if (!validation.valid) {
        throw new Error(`Command validation failed: ${validation.errors.join(', ')}`);
      }
      
      perfSession.checkpoint('命令驗證完成');
      
      // 執行前置中間件
      for (const middleware of this.registry.middleware) {
        if (middleware.beforeExecute) {
          await middleware.beforeExecute(command);
        }
      }
      
      // 標記命令為執行中
      command.markExecuting();
      
      Logger.log(`[CommandProcessor] 執行命令: ${command.commandType} (${command.id})`);
      
      // 執行命令
      const result = await handler.execute(command);
      
      // 標記命令完成
      command.markCompleted(result);
      
      perfSession.checkpoint('命令執行完成');
      
      // 執行後置中間件
      for (const middleware of this.registry.middleware) {
        if (middleware.afterExecute) {
          await middleware.afterExecute(command, result);
        }
      }
      
      // 發布領域事件（如果需要）
      await this.publishDomainEvents(command, result);
      
      const executionResult = {
        success: true,
        commandId: command.id,
        result: result,
        executionTime: perfSession.getDuration()
      };
      
      perfSession.end(true, '命令執行成功');
      
      return executionResult;
      
    } catch (error) {
      // 標記命令失敗
      command.markFailed(error);
      
      perfSession.end(false, error.message);
      
      // 錯誤處理
      ErrorHandler.handle('CommandProcessor.executeCommand', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM, {
        additionalInfo: { 
          commandType: command.commandType, 
          commandId: command.id,
          commandData: command.data
        },
        showUI: false
      });
      
      // 執行錯誤中間件
      for (const middleware of this.registry.middleware) {
        if (middleware.onError) {
          try {
            await middleware.onError(command, error);
          } catch (middlewareError) {
            Logger.log(`[CommandProcessor] 中間件錯誤處理失敗: ${middlewareError.message}`);
          }
        }
      }
      
      throw {
        success: false,
        commandId: command.id,
        error: error.message,
        executionTime: perfSession.getDuration()
      };
    }
  }
  
  /**
   * 批量執行命令
   * @param {Array<Command>} commands 命令列表
   * @param {Object} options 選項 {parallel: boolean, stopOnError: boolean}
   * @return {Promise<Object>} 批量執行結果
   */
  async executeBatch(commands, options = {}) {
    const { parallel = false, stopOnError = true } = options;
    const perfSession = startTimer('CommandProcessor.executeBatch', 'COMMAND_BATCH');
    
    try {
      Logger.log(`[CommandProcessor] 開始批量執行 ${commands.length} 個命令 (parallel: ${parallel})`);
      
      let results = [];
      
      if (parallel) {
        // 並行執行
        const promises = commands.map(command => 
          this.executeCommand(command).catch(error => ({ error, commandId: command.id }))
        );
        results = await Promise.all(promises);
      } else {
        // 順序執行
        for (const command of commands) {
          try {
            const result = await this.executeCommand(command);
            results.push(result);
          } catch (error) {
            results.push({ error: error.error || error.message, commandId: command.id });
            
            if (stopOnError) {
              break;
            }
          }
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => r.error).length;
      
      const batchResult = {
        success: failureCount === 0,
        totalCommands: commands.length,
        successCount: successCount,
        failureCount: failureCount,
        results: results,
        executionTime: perfSession.getDuration()
      };
      
      perfSession.end(batchResult.success, `批量執行完成: ${successCount}成功, ${failureCount}失敗`);
      
      return batchResult;
      
    } catch (error) {
      perfSession.end(false, error.message);
      throw error;
    }
  }
  
  /**
   * 獲取命令歷史
   * @param {number} limit 限制數量
   * @return {Array} 命令歷史
   */
  getCommandHistory(limit = 100) {
    return this.commandHistory.slice(-limit);
  }
  
  /**
   * 獲取統計資訊
   * @return {Object} 統計資訊
   */
  getStats() {
    const totalCommands = this.commandHistory.length;
    const completedCommands = this.commandHistory.filter(cmd => cmd.status === 'completed').length;
    const failedCommands = this.commandHistory.filter(cmd => cmd.status === 'failed').length;
    const pendingCommands = this.commandHistory.filter(cmd => cmd.status === 'pending').length;
    
    const commandTypes = new Set(this.commandHistory.map(cmd => cmd.commandType));
    
    return {
      totalCommands: totalCommands,
      completedCommands: completedCommands,
      failedCommands: failedCommands,
      pendingCommands: pendingCommands,
      successRate: totalCommands > 0 ? (completedCommands / totalCommands * 100).toFixed(2) + '%' : '0%',
      uniqueCommandTypes: commandTypes.size,
      registeredHandlers: this.registry.getRegisteredCommands().length
    };
  }
  
  /**
   * 清理命令歷史
   */
  clearHistory() {
    this.commandHistory = [];
    Logger.log('[CommandProcessor] 命令歷史已清理');
  }
  
  // === 私有方法 ===
  
  /**
   * 添加命令到歷史記錄
   */
  addToHistory(command) {
    this.commandHistory.push(command);
    
    // 維護歷史大小
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory.splice(0, this.commandHistory.length - this.maxHistorySize);
    }
  }
  
  /**
   * 發布相關的領域事件
   */
  async publishDomainEvents(command, result) {
    try {
      // 根據命令類型發布相應的領域事件
      const eventType = this.mapCommandToEvent(command.commandType);
      if (eventType) {
        const event = new DomainEvent(eventType, {
          command: command.toJSON(),
          result: result
        }, 'CommandProcessor');
        
        await globalEventBus.publish(event);
      }
    } catch (error) {
      Logger.log(`[CommandProcessor] 發布領域事件失敗: ${error.message}`);
    }
  }
  
  /**
   * 映射命令類型到事件類型
   */
  mapCommandToEvent(commandType) {
    const commandEventMapping = {
      'CreateTeacher': DOMAIN_EVENTS.TEACHER_CREATED,
      'UpdateTeacher': DOMAIN_EVENTS.TEACHER_UPDATED,
      'ImportStudents': DOMAIN_EVENTS.STUDENT_IMPORTED,
      'ChangeStudentClass': DOMAIN_EVENTS.STUDENT_CLASS_CHANGED,
      'InitializeSystem': DOMAIN_EVENTS.SYSTEM_INITIALIZED
    };
    
    return commandEventMapping[commandType] || null;
  }
}

/**
 * 預定義的命令類型
 */
const COMMAND_TYPES = {
  // 教師命令
  CREATE_TEACHER: 'CreateTeacher',
  UPDATE_TEACHER: 'UpdateTeacher',
  DELETE_TEACHER: 'DeleteTeacher',
  CREATE_TEACHER_RECORDBOOK: 'CreateTeacherRecordBook',
  
  // 學生命令
  IMPORT_STUDENTS: 'ImportStudents',
  UPDATE_STUDENT: 'UpdateStudent',
  CHANGE_STUDENT_CLASS: 'ChangeStudentClass',
  
  // 系統命令
  INITIALIZE_SYSTEM: 'InitializeSystem',
  BACKUP_SYSTEM: 'BackupSystem',
  RESET_SYSTEM: 'ResetSystem',
  
  // 通訊記錄命令
  CREATE_CONTACT_RECORD: 'CreateContactRecord',
  UPDATE_CONTACT_RECORD: 'UpdateContactRecord',
  BATCH_PROCESS_CONTACTS: 'BatchProcessContacts'
};

/**
 * 命令工廠
 */
const CommandFactory = {
  /**
   * 創建教師相關命令
   */
  createTeacher(teacherData, userId = null) {
    return new Command(COMMAND_TYPES.CREATE_TEACHER, teacherData, userId);
  },
  
  updateTeacher(teacherId, updateData, userId = null) {
    return new Command(COMMAND_TYPES.UPDATE_TEACHER, { 
      teacherId: teacherId, 
      updateData: updateData 
    }, userId);
  },
  
  createTeacherRecordBook(teacherData, userId = null) {
    return new Command(COMMAND_TYPES.CREATE_TEACHER_RECORDBOOK, teacherData, userId);
  },
  
  /**
   * 創建學生相關命令
   */
  importStudents(studentsData, options = {}, userId = null) {
    return new Command(COMMAND_TYPES.IMPORT_STUDENTS, {
      students: studentsData,
      options: options
    }, userId);
  },
  
  changeStudentClass(studentId, newClass, userId = null) {
    return new Command(COMMAND_TYPES.CHANGE_STUDENT_CLASS, {
      studentId: studentId,
      newClass: newClass
    }, userId);
  },
  
  /**
   * 創建系統相關命令
   */
  initializeSystem(config = {}, userId = null) {
    return new Command(COMMAND_TYPES.INITIALIZE_SYSTEM, config, userId);
  },
  
  backupSystem(options = {}, userId = null) {
    return new Command(COMMAND_TYPES.BACKUP_SYSTEM, options, userId);
  }
};

/**
 * 全域命令處理器實例
 */
const globalCommandProcessor = new CommandProcessor();

/**
 * 添加預設中間件
 */
globalCommandProcessor.addMiddleware({
  beforeExecute: async (command) => {
    Logger.log(`[CommandProcessor] 開始執行命令: ${command.commandType} (${command.id})`);
  },
  afterExecute: async (command, result) => {
    Logger.log(`[CommandProcessor] 命令執行成功: ${command.commandType} (${command.id})`);
  },
  onError: async (command, error) => {
    Logger.log(`[CommandProcessor] 命令執行失敗: ${command.commandType} (${command.id}) - ${error.message}`);
  }
});

// 匯出供其他模組使用
const CommandProcessorExports = {
  Command,
  CommandHandler,
  CommandProcessor,
  COMMAND_TYPES,
  CommandFactory,
  globalCommandProcessor
};