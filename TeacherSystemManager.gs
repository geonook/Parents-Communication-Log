/**
 * 老師管理系統資料夾管理模組
 * 負責系統資料夾結構管理和權限控制
 * Version: 1.0.0 - 從TeacherManagement.gs模組化拆分
 */

/**
 * 獲取系統主資料夾
 * @param {boolean} strictMode 是否進行嚴格驗證
 * @return {Folder} 系統主資料夾對象
 */
function getSystemMainFolder(strictMode = false) {
  const perfSession = startTimer('獲取系統主資料夾', 'SYSTEM_INIT');
  
  try {
    Logger.log(`🔍 開始搜尋系統主資料夾，嚴格模式：${strictMode}`);
    
    // 方法1：如果有指定資料夾 ID，優先使用
    if (SYSTEM_CONFIG.MAIN_FOLDER_ID && SYSTEM_CONFIG.MAIN_FOLDER_ID.trim() !== '') {
      Logger.log(`📁 嘗試使用指定的資料夾 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}`);
      try {
        const folder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
        Logger.log(`✅ 成功存取指定資料夾：${folder.getName()}`);
        
        perfSession.checkpoint('通過資料夾ID找到主資料夾');
        
        if (strictMode) {
          Logger.log(`🔧 進行嚴格模式驗證...`);
          const validatedFolder = validateSystemFolderStructure(folder);
          perfSession.end(true, '系統資料夾驗證通過');
          return validatedFolder;
        }
        
        perfSession.end(true, '成功獲取系統主資料夾');
        return folder;
        
      } catch (error) {
        Logger.log(`❌ 無法存取指定的資料夾 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}`);
        Logger.log(`🔄 錯誤詳情：${error.message}，嘗試按名稱搜尋`);
        // 記錄但不拋出錯誤，繼續嘗試其他方法
        ErrorHandler.handle('存取指定資料夾ID', error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.SYSTEM);
      }
    } else {
      Logger.log(`⚠️ 未設定 MAIN_FOLDER_ID，直接按名稱搜尋`);
    }
    
    // 方法2：按名稱搜尋資料夾
    Logger.log(`🔍 按名稱搜尋資料夾：${SYSTEM_CONFIG.MAIN_FOLDER_NAME}`);
    try {
      const folders = DriveApp.getFoldersByName(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
      if (folders.hasNext()) {
        const folder = folders.next();
        Logger.log(`✅ 找到同名資料夾：${folder.getName()}, ID: ${folder.getId()}`);
        
        // 檢查是否有多個同名資料夾
        if (folders.hasNext()) {
          Logger.log(`⚠️ 發現多個同名資料夾，使用第一個`);
        }
        
        perfSession.checkpoint('通過名稱找到主資料夾');
        
        if (strictMode) {
          Logger.log(`🔧 進行嚴格模式驗證...`);
          const validatedFolder = validateSystemFolderStructure(folder);
          perfSession.end(true, '系統資料夾驗證通過');
          return validatedFolder;
        }
        
        perfSession.end(true, '成功獲取系統主資料夾');
        return folder;
      }
    } catch (searchError) {
      Logger.log(`❌ 按名稱搜尋失敗：${searchError.message}`);
      ErrorHandler.handle('按名稱搜尋資料夾', searchError, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.SYSTEM);
    }
    
    // 方法3：嘗試在我的雲端硬碟根目錄搜尋
    Logger.log(`🔍 在我的雲端硬碟根目錄搜尋...`);
    try {
      const rootFolders = DriveApp.getRootFolder().getFoldersByName(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
      if (rootFolders.hasNext()) {
        const folder = rootFolders.next();
        Logger.log(`✅ 在根目錄找到資料夾：${folder.getName()}, ID: ${folder.getId()}`);
        
        perfSession.checkpoint('在根目錄找到主資料夾');
        
        if (strictMode) {
          Logger.log(`🔧 進行嚴格模式驗證...`);
          const validatedFolder = validateSystemFolderStructure(folder);
          perfSession.end(true, '系統資料夾驗證通過');
          return validatedFolder;
        }
        
        perfSession.end(true, '成功獲取系統主資料夾');
        return folder;
      }
    } catch (rootSearchError) {
      Logger.log(`❌ 根目錄搜尋失敗：${rootSearchError.message}`);
      ErrorHandler.handle('根目錄搜尋', rootSearchError, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.SYSTEM);
    }
    
    // 方法4：故障恢復 - 提供自動創建選項
    Logger.log(`❌ 所有搜尋方法都失敗，系統資料夾不存在`);
    
    if (!strictMode) {
      Logger.log(`🔧 嘗試故障恢復：自動創建系統資料夾`);
      try {
        const createdFolder = createSystemFolders();
        perfSession.end(true, '自動創建系統資料夾成功');
        return createdFolder;
      } catch (createError) {
        Logger.log(`💥 自動創建失敗：${createError.message}`);
        ErrorHandler.handle('自動創建系統資料夾', createError, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
      }
    }
    
    perfSession.end(false, '系統資料夾未找到且無法創建');
    
    const detailedError = new Error(`系統資料夾不存在，請執行以下步驟：
1. 檢查 SYSTEM_CONFIG.MAIN_FOLDER_ID 設定是否正確
2. 確認您有資料夾存取權限
3. 執行「初始化系統」功能重新創建系統資料夾
4. 或手動創建名為「${SYSTEM_CONFIG.MAIN_FOLDER_NAME}」的資料夾

當前設定：
- MAIN_FOLDER_ID: ${SYSTEM_CONFIG.MAIN_FOLDER_ID}
- MAIN_FOLDER_NAME: ${SYSTEM_CONFIG.MAIN_FOLDER_NAME}`);
    
    detailedError.code = 'SYSTEM_FOLDER_NOT_FOUND';
    throw detailedError;
    
  } catch (error) {
    perfSession.end(false, error.message);
    
    // 如果是我們已經處理的錯誤，直接重新拋出
    if (error.code === 'SYSTEM_FOLDER_NOT_FOUND') {
      throw error;
    }
    
    // 統一錯誤處理
    ErrorHandler.handle('獲取系統主資料夾', error, ERROR_LEVELS.CRITICAL, ERROR_CATEGORIES.SYSTEM);
    throw error;
  }
}

/**
 * 驗證系統資料夾結構完整性
 * @param {Folder} folder - 要驗證的資料夾
 * @return {Folder} - 如果驗證通過返回資料夾，否則拋出錯誤
 */
function validateSystemFolderStructure(folder) {
  const perfSession = startTimer('驗證系統資料夾結構', 'SYSTEM_INIT');
  
  try {
    Logger.log(`🔧 開始驗證系統資料夾結構：${folder.getName()}`);
    
    const requiredSubfolders = [
      SYSTEM_CONFIG.TEACHERS_FOLDER_NAME,
      SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME,
      '系統備份',
      '進度報告'
    ];
    
    const missingFolders = [];
    const emptyFolders = [];
    
    // 檢查所有必要的子資料夾
    requiredSubfolders.forEach(folderName => {
      try {
        const subfolders = folder.getFoldersByName(folderName);
        if (!subfolders.hasNext()) {
          missingFolders.push(folderName);
        } else {
          const subfolder = subfolders.next();
          // 檢查特定資料夾是否包含預期內容
          if (folderName === SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME) {
            const templateFiles = subfolder.getFilesByType(MimeType.GOOGLE_SHEETS);
            if (!templateFiles.hasNext()) {
              emptyFolders.push(folderName + ' (無範本檔案)');
            }
          }
        }
      } catch (checkError) {
        Logger.log(`⚠️ 檢查子資料夾 ${folderName} 時發生錯誤：${checkError.message}`);
        missingFolders.push(folderName + ' (檢查失敗)');
      }
    });
    
    perfSession.checkpoint('子資料夾檢查完成', { 
      total: requiredSubfolders.length, 
      missing: missingFolders.length,
      empty: emptyFolders.length 
    });
    
    // 檢查管理控制台
    let hasAdminConsole = false;
    try {
      const adminFiles = folder.getFilesByName('電聯記錄簿管理控制台');
      hasAdminConsole = adminFiles.hasNext();
    } catch (adminError) {
      Logger.log(`⚠️ 檢查管理控制台時發生錯誤：${adminError.message}`);
    }
    
    // 檢查學生總表
    let hasMasterList = false;
    try {
      const masterListFiles = folder.getFilesByName('學生總表');
      hasMasterList = masterListFiles.hasNext();
    } catch (masterError) {
      Logger.log(`⚠️ 檢查學生總表時發生錯誤：${masterError.message}`);
    }
    
    perfSession.checkpoint('核心檔案檢查完成', { 
      hasAdminConsole, 
      hasMasterList 
    });
    
    // 如果有任何缺失，拋出詳細錯誤
    const issues = [];
    if (missingFolders.length > 0) {
      issues.push(`缺少子資料夾：${missingFolders.join(', ')}`);
    }
    if (emptyFolders.length > 0) {
      issues.push(`空資料夾：${emptyFolders.join(', ')}`);
    }
    if (!hasAdminConsole) {
      issues.push('缺少管理控制台檔案');
    }
    if (!hasMasterList) {
      issues.push('缺少學生總表檔案');
    }
    
    if (issues.length > 0) {
      perfSession.end(false, `系統資料夾不完整：${issues.length}個問題`);
      
      const validationError = new Error(`系統資料夾不完整：${issues.join('；')}`);
      validationError.code = 'INVALID_FOLDER_STRUCTURE';
      validationError.issues = issues;
      validationError.folder = folder;
      throw validationError;
    }
    
    Logger.log('✅ 系統資料夾結構驗證通過');
    perfSession.end(true, '系統資料夾結構完整');
    
    return folder;
    
  } catch (error) {
    perfSession.end(false, error.message);
    
    if (error.code === 'INVALID_FOLDER_STRUCTURE') {
      throw error;
    }
    
    ErrorHandler.handle('驗證系統資料夾結構', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    throw error;
  }
}

/**
 * 保護工作表僅限管理員存取
 * @param {Sheet} sheet 要保護的工作表
 * @param {string} description 保護說明
 * @return {Protection} 保護對象
 */
function protectSheetForAdminOnly(sheet, description = '管理員專用') {
  const perfSession = startTimer('設定工作表保護', 'SYSTEM_INIT');
  
  try {
    if (!sheet) {
      throw new Error('工作表對象不存在');
    }
    
    Logger.log(`🔒 開始保護工作表：${sheet.getName()}`);
    
    // 獲取當前用戶作為管理員
    const currentUser = Session.getActiveUser().getEmail();
    
    // 設定保護
    const protection = sheet.protect();
    protection.setDescription(`${description} - 由 ${currentUser} 設定`);
    
    // 移除其他編輯者，只保留當前用戶
    const editors = protection.getEditors();
    if (editors.length > 0) {
      protection.removeEditors(editors);
    }
    
    // 添加當前用戶為編輯者
    protection.addEditor(currentUser);
    
    // 設定警告文字
    protection.setWarningOnly(false);
    
    Logger.log(`✅ 成功保護工作表：${sheet.getName()}，管理員：${currentUser}`);
    perfSession.end(true, '工作表保護設定完成');
    
    return protection;
    
  } catch (error) {
    Logger.log(`❌ 保護工作表失敗：${error.message}`);
    perfSession.end(false, error.message);
    ErrorHandler.handle('設定工作表保護', error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.PERMISSION);
    return null;
  }
}

/**
 * 創建系統資料夾結構
 * @param {Folder} parentFolder 父資料夾，默認為根目錄
 * @return {Folder} 創建的主資料夾
 */
function createSystemFolders(parentFolder = null) {
  const perfSession = startTimer('創建系統資料夾結構', 'SYSTEM_INIT');
  
  try {
    Logger.log('🏗️ 開始創建系統資料夾結構');
    
    // 確定父資料夾
    const parent = parentFolder || DriveApp.getRootFolder();
    
    // 創建主資料夾
    const mainFolder = parent.createFolder(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
    Logger.log(`✅ 創建主資料夾：${SYSTEM_CONFIG.MAIN_FOLDER_NAME}`);
    
    perfSession.checkpoint('主資料夾創建完成');
    
    // 創建必要的子資料夾
    const subfolders = [
      SYSTEM_CONFIG.TEACHERS_FOLDER_NAME,
      SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME,
      '系統備份',
      '進度報告'
    ];
    
    subfolders.forEach(folderName => {
      try {
        mainFolder.createFolder(folderName);
        Logger.log(`✅ 創建子資料夾：${folderName}`);
      } catch (subError) {
        Logger.log(`⚠️ 創建子資料夾 ${folderName} 失敗：${subError.message}`);
        ErrorHandler.handle(`創建子資料夾${folderName}`, subError, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.SYSTEM);
      }
    });
    
    perfSession.checkpoint('子資料夾創建完成', { subfolderCount: subfolders.length });
    
    Logger.log(`🎉 系統資料夾結構創建完成，資料夾ID：${mainFolder.getId()}`);
    Logger.log(`💡 建議將此ID設定到 SYSTEM_CONFIG.MAIN_FOLDER_ID：${mainFolder.getId()}`);
    
    perfSession.end(true, '系統資料夾結構創建成功');
    
    return mainFolder;
    
  } catch (error) {
    Logger.log(`💥 創建系統資料夾結構失敗：${error.message}`);
    perfSession.end(false, error.message);
    ErrorHandler.handle('創建系統資料夾結構', error, ERROR_LEVELS.CRITICAL, ERROR_CATEGORIES.SYSTEM);
    throw error;
  }
}

/**
 * 獲取系統資料夾狀態信息
 * @return {Object} 系統資料夾狀態
 */
function getSystemFolderStatus() {
  try {
    const status = {
      mainFolderExists: false,
      mainFolderId: null,
      mainFolderName: null,
      subfolders: {},
      coreFiles: {},
      permissions: {},
      issues: [],
      timestamp: new Date()
    };
    
    // 嘗試獲取主資料夾
    try {
      const mainFolder = getSystemMainFolder(false);
      status.mainFolderExists = true;
      status.mainFolderId = mainFolder.getId();
      status.mainFolderName = mainFolder.getName();
      
      // 檢查子資料夾
      const requiredSubfolders = [
        SYSTEM_CONFIG.TEACHERS_FOLDER_NAME,
        SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME,
        '系統備份',
        '進度報告'
      ];
      
      requiredSubfolders.forEach(folderName => {
        const subfolders = mainFolder.getFoldersByName(folderName);
        status.subfolders[folderName] = {
          exists: subfolders.hasNext(),
          id: subfolders.hasNext() ? subfolders.next().getId() : null
        };
      });
      
      // 檢查核心檔案
      const coreFiles = ['電聯記錄簿管理控制台', '學生總表'];
      coreFiles.forEach(fileName => {
        const files = mainFolder.getFilesByName(fileName);
        status.coreFiles[fileName] = {
          exists: files.hasNext(),
          id: files.hasNext() ? files.next().getId() : null
        };
      });
      
      // 檢查權限
      status.permissions.canEdit = true; // 如果能獲取資料夾，說明有編輯權限
      status.permissions.currentUser = Session.getActiveUser().getEmail();
      
    } catch (folderError) {
      status.issues.push(`主資料夾問題：${folderError.message}`);
    }
    
    // 分析問題
    Object.entries(status.subfolders).forEach(([name, info]) => {
      if (!info.exists) {
        status.issues.push(`缺少子資料夾：${name}`);
      }
    });
    
    Object.entries(status.coreFiles).forEach(([name, info]) => {
      if (!info.exists) {
        status.issues.push(`缺少核心檔案：${name}`);
      }
    });
    
    return status;
    
  } catch (error) {
    ErrorHandler.handle('獲取系統資料夾狀態', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    return {
      mainFolderExists: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * 修復系統資料夾結構
 * @param {boolean} autoFix 是否自動修復
 * @return {Object} 修復結果
 */
function repairSystemFolderStructure(autoFix = false) {
  const perfSession = startTimer('修復系統資料夾結構', 'SYSTEM_INIT');
  
  try {
    Logger.log('🔧 開始修復系統資料夾結構');
    
    const status = getSystemFolderStatus();
    const repairs = [];
    
    if (!status.mainFolderExists) {
      if (autoFix) {
        Logger.log('🏗️ 主資料夾不存在，嘗試創建');
        const newFolder = createSystemFolders();
        repairs.push(`創建主資料夾：${newFolder.getName()} (${newFolder.getId()})`);
      } else {
        repairs.push('需要創建主資料夾');
      }
    } else {
      const mainFolder = getSystemMainFolder(false);
      
      // 修復缺少的子資料夾
      Object.entries(status.subfolders).forEach(([name, info]) => {
        if (!info.exists && autoFix) {
          try {
            mainFolder.createFolder(name);
            repairs.push(`創建子資料夾：${name}`);
          } catch (createError) {
            repairs.push(`創建子資料夾${name}失敗：${createError.message}`);
          }
        }
      });
    }
    
    perfSession.end(true, `修復完成：${repairs.length}項`);
    
    return {
      success: true,
      repairs: repairs,
      autoFixed: autoFix,
      timestamp: new Date()
    };
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('修復系統資料夾結構', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}