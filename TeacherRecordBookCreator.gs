/**
 * 老師記錄簿創建核心模組
 * 負責記錄簿的創建主流程和基本設定
 * Version: 1.0.0 - 從TeacherManagement.gs模組化拆分
 */

/**
 * 創建單一老師的電聯記錄簿
 * @return {Spreadsheet|null} 創建的記錄簿對象，失敗時返回null
 */
function createTeacherRecordBook() {
  // 開始性能監控
  const perfSession = startTimer('創建老師記錄簿', 'RECORD_CREATION');
  
  try {
    // 統一 Web 環境架構 - 移除環境檢查
    const ui = SpreadsheetApp.getUi();
    
    perfSession.checkpoint('UI初始化完成');
    
    // 使用統一錯誤處理 - 獲取老師資訊
    const teacherInfo = ErrorHandler.wrap(
      () => getTeacherInfoFromUser(),
      '獲取老師資訊'
    );
    
    if (!teacherInfo.success || !teacherInfo.result) {
      perfSession.end(false, '用戶取消操作或獲取資訊失敗');
      return null;
    }
    
    perfSession.checkpoint('老師資訊獲取完成', { teacherName: teacherInfo.result.name });
    
    // 創建記錄簿
    const createResult = ErrorHandler.wrap(
      () => createTeacherSheet(teacherInfo.result),
      '創建記錄簿'
    );
    
    if (!createResult.success) {
      perfSession.end(false, `記錄簿創建失敗: ${createResult.error.message}`);
      throw createResult.error;
    }
    
    const recordBook = createResult.result;
    perfSession.checkpoint('記錄簿創建完成');
    
    ui.alert(
      '建立成功！', 
      `${teacherInfo.result.name} 老師的電聯記錄簿已建立完成！\n\n檔案連結：${recordBook.getUrl()}`, 
      ui.ButtonSet.OK
    );
    
    // 性能監控：操作成功完成
    perfSession.end(true, `成功創建 ${teacherInfo.result.name} 老師記錄簿`);
    
    return recordBook;
    
  } catch (error) {
    // 性能監控：操作失敗
    perfSession.end(false, error.message);
    
    // 統一錯誤處理
    ErrorHandler.handle('創建老師記錄簿', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS);
    return null;
  }
}

/**
 * 批次創建多位老師的記錄簿
 * @return {Object} 批次創建結果 {successCount: number, errorCount: number, errors: Array}
 */
function batchCreateTeacherBooks() {
  // 開始性能監控
  const perfSession = startTimer('批次創建記錄簿', 'BATCH_OPERATION');
  
  try {
    // 統一 Web 環境架構 - 移除環境檢查
    const ui = SpreadsheetApp.getUi();
    
    // 讓用戶選擇包含老師資料的檔案
    const response = ui.prompt(
      '批次建立',
      '請輸入包含老師資料的試算表 ID：\n(格式：老師姓名、班級)\n註：系統將自動設定科目為「英文」',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() !== ui.Button.OK) {
      perfSession.end(false, '用戶取消操作');
      return null;
    }
    
    perfSession.checkpoint('獲取用戶輸入完成');
    
    // 讀取老師資料
    const teachersDataResult = ErrorHandler.wrap(
      () => getTeachersDataFromSheet(response.getResponseText()),
      '讀取老師資料'
    );
    
    if (!teachersDataResult.success || !teachersDataResult.result || teachersDataResult.result.length === 0) {
      ui.alert('錯誤', '無法讀取老師資料，請檢查檔案格式', ui.ButtonSet.OK);
      perfSession.end(false, '無法讀取老師資料');
      return null;
    }
    
    const teachersData = teachersDataResult.result;
    perfSession.checkpoint('老師資料讀取完成', { teacherCount: teachersData.length });
    
    // 批次創建記錄簿
    const batchResult = PerformanceMonitor.measureBatchOperation(
      teachersData,
      (teacherInfo) => createTeacherSheet(teacherInfo),
      '老師記錄簿創建',
      10 // 每批次處理10個
    );
    
    const result = {
      successCount: batchResult.processedCount - batchResult.errors.length,
      errorCount: batchResult.errors.length,
      errors: batchResult.errors,
      totalTime: batchResult.performance.duration
    };
    
    ui.alert(
      '批次建立完成',
      `成功建立：${result.successCount} 個記錄簿\n失敗：${result.errorCount} 個記錄簿\n總耗時：${result.totalTime}ms`,
      ui.ButtonSet.OK
    );
    
    perfSession.end(true, `批次創建完成: 成功${result.successCount}個, 失敗${result.errorCount}個`);
    
    return result;
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('批次創建老師記錄簿', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.BUSINESS);
    return null;
  }
}

/**
 * 創建老師的電聯記錄簿
 * 改進版：更精確的錯誤處理，區分致命錯誤和非致命錯誤
 * @param {Object} teacherInfo 老師資訊對象
 * @return {Spreadsheet} 創建的記錄簿對象
 */
function createTeacherSheet(teacherInfo) {
  let recordBook = null;
  let isCreationSuccessful = false;
  let setupWarnings = [];
  
  try {
    Logger.log(`========== 開始創建老師記錄簿：${teacherInfo.name} ==========`);
    Logger.log(`老師資訊：${JSON.stringify(teacherInfo)}`);
    
    // 驗證輸入參數
    if (!teacherInfo || !teacherInfo.name) {
      throw new Error('老師資訊不完整：缺少老師姓名');
    }
    if (!teacherInfo.classes || teacherInfo.classes.length === 0) {
      throw new Error(`老師 ${teacherInfo.name} 缺少授課班級資訊`);
    }
    
    // 步驟1: 取得系統資料夾 (致命錯誤)
    Logger.log('步驟1: 獲取系統主資料夾...');
    let mainFolder;
    try {
      mainFolder = getSystemMainFolder();
      Logger.log(`✅ 成功獲取系統主資料夾：${mainFolder.getName()}`);
    } catch (folderError) {
      Logger.log(`❌ 獲取系統主資料夾失敗：${folderError.message}`);
      throw new Error(`無法獲取系統主資料夾：${folderError.message}。請先執行系統初始化或檢查資料夾權限。`);
    }
    
    // 步驟2: 獲取或創建老師記錄簿資料夾 (致命錯誤)
    Logger.log('步驟2: 獲取或創建老師記錄簿資料夾...');
    let teachersFolder;
    try {
      const teachersFolderIterator = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME);
      if (teachersFolderIterator.hasNext()) {
        teachersFolder = teachersFolderIterator.next();
        Logger.log(`✅ 找到老師記錄簿資料夾：${SYSTEM_CONFIG.TEACHERS_FOLDER_NAME}`);
      } else {
        Logger.log(`⚠️ 老師記錄簿資料夾不存在，正在創建：${SYSTEM_CONFIG.TEACHERS_FOLDER_NAME}`);
        teachersFolder = mainFolder.createFolder(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME);
        Logger.log(`✅ 成功創建老師記錄簿資料夾：${SYSTEM_CONFIG.TEACHERS_FOLDER_NAME}`);
      }
    } catch (createError) {
      Logger.log(`❌ 處理老師記錄簿資料夾失敗：${createError.message}`);
      throw new Error(`無法處理老師記錄簿資料夾：${createError.message}`);
    }
    
    // 步驟3: 創建老師專屬資料夾 (非致命錯誤)
    Logger.log('步驟3: 獲取或創建老師專屬資料夾...');
    const teacherFolderName = `${teacherInfo.name}_${calculateSchoolYear()}`;
    let teacherFolder = null;
    
    try {
      const existingTeacherFolder = teachersFolder.getFoldersByName(teacherFolderName);
      if (existingTeacherFolder.hasNext()) {
        teacherFolder = existingTeacherFolder.next();
        Logger.log(`✅ 找到現有老師資料夾：${teacherFolderName}`);
      } else {
        Logger.log(`📁 創建新老師資料夾：${teacherFolderName}`);
        teacherFolder = teachersFolder.createFolder(teacherFolderName);
        Logger.log(`✅ 成功創建老師資料夾：${teacherFolderName}`);
      }
    } catch (folderCreateError) {
      Logger.log(`⚠️ 創建老師專屬資料夾失敗：${folderCreateError.message}`);
      setupWarnings.push(`無法創建專屬資料夾：${folderCreateError.message}`);
      teacherFolder = teachersFolder; // 使用上層資料夾作為備選
    }
    
    // 步驟4: 創建記錄簿檔案 (致命錯誤)
    Logger.log('步驟4: 創建記錄簿檔案...');
    const fileName = SYSTEM_CONFIG.TEACHER_SHEET_NAME_FORMAT
      .replace('{teacherName}', teacherInfo.name)
      .replace('{schoolYear}', calculateSchoolYear());
    
    Logger.log(`📊 準備創建記錄簿檔案：${fileName}`);
    let recordFile;
    
    try {
      recordBook = SpreadsheetApp.create(fileName);
      recordFile = DriveApp.getFileById(recordBook.getId());
      Logger.log(`✅ 成功創建記錄簿檔案，ID：${recordBook.getId()}`);
      isCreationSuccessful = true; // 核心創建成功
    } catch (createFileError) {
      Logger.log(`❌ 創建記錄簿檔案失敗：${createFileError.message}`);
      throw new Error(`無法創建記錄簿檔案：${createFileError.message}`);
    }
    
    // 步驟5: 移動到老師資料夾 (非致命錯誤)
    Logger.log('步驟5: 移動記錄簿到老師資料夾...');
    if (teacherFolder && recordFile) {
      try {
        teacherFolder.addFile(recordFile);
        DriveApp.getRootFolder().removeFile(recordFile);
        Logger.log(`✅ 成功移動記錄簿到老師資料夾`);
      } catch (moveError) {
        Logger.log(`⚠️ 移動記錄簿檔案失敗：${moveError.message}`);
        setupWarnings.push(`檔案移動失敗，保留在根目錄：${moveError.message}`);
      }
    }
    
    // 步驟6: 設定記錄簿內容 (非致命錯誤)
    Logger.log('步驟6: 設定記錄簿內容...');
    try {
      setupTeacherRecordBook(recordBook, teacherInfo);
      Logger.log(`✅ 成功設定記錄簿內容`);
    } catch (setupError) {
      Logger.log(`⚠️ 設定記錄簿內容失敗：${setupError.message}`);
      setupWarnings.push(`內容設定失敗：${setupError.message}`);
    }
    
    // 創建成功，記錄警告但不影響成功狀態
    if (setupWarnings.length > 0) {
      Logger.log(`⚠️ 記錄簿創建成功但有警告：${setupWarnings.join('；')}`);
    }
    
    Logger.log(`🎉 ========== 成功創建老師記錄簿：${teacherInfo.name} ==========`);
    Logger.log(`📊 記錄簿URL：${recordBook.getUrl()}`);
    return recordBook;
    
  } catch (error) {
    Logger.log(`💥 ========== 創建老師記錄簿失敗：${teacherInfo?.name || '未知'} ==========`);
    Logger.log(`❌ 錯誤詳細：${error.toString()}`);
    Logger.log(`📍 錯誤堆疊：${error.stack}`);
    
    // 如果記錄簿已創建但設定失敗，嘗試清理
    if (isCreationSuccessful && recordBook) {
      try {
        DriveApp.getFileById(recordBook.getId()).setTrashed(true);
        Logger.log(`🗑️ 已清理失敗的記錄簿檔案`);
      } catch (cleanupError) {
        Logger.log(`⚠️ 清理失敗檔案時發生錯誤：${cleanupError.message}`);
      }
    }
    
    // 提供更詳細的錯誤訊息
    const detailedError = new Error(`創建 ${teacherInfo?.name || '未知'} 老師記錄簿失敗：${error.message}`);
    detailedError.originalError = error;
    detailedError.teacherInfo = teacherInfo;
    detailedError.isCreationSuccessful = isCreationSuccessful;
    detailedError.setupWarnings = setupWarnings;
    throw detailedError;
  }
}

/**
 * 設定老師記錄簿的內容結構
 * @param {Spreadsheet} recordBook 記錄簿對象
 * @param {Object} teacherInfo 老師資訊對象
 */
function setupTeacherRecordBook(recordBook, teacherInfo) {
  // 刪除預設工作表
  const defaultSheet = recordBook.getActiveSheet();
  
  // 創建各個工作表（先建立基本結構，不設定公式）
  createSummarySheet(recordBook, teacherInfo);
  // createClassInfoSheet(recordBook, teacherInfo); // 已移除 - 異動記錄現在寫入總覽工作表
  createStudentListSheet(recordBook, teacherInfo);
  createContactLogSheet(recordBook, teacherInfo);
  createProgressSheet(recordBook, teacherInfo);
  
  // 刪除預設工作表
  if (recordBook.getSheets().length > 1) {
    recordBook.deleteSheet(defaultSheet);
  }
  
  // 在所有工作表建立完成後，設定總覽工作表的公式
  try {
    Logger.log('🔄 所有工作表建立完成，開始設定總覽工作表公式');
    setupSummaryFormulas(recordBook, teacherInfo);
    Logger.log('✅ 總覽工作表公式設定完成');
  } catch (error) {
    Logger.log(`⚠️ 設定總覽工作表公式時發生錯誤：${error.message}`);
    // 使用統一錯誤處理
    ErrorHandler.handle('設定總覽工作表公式', error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.BUSINESS);
  }
  
  // 設定記錄簿為第一個工作表
  recordBook.setActiveSheet(recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY));
  
  // 註解：移除無效的排序檢查邏輯
  // 原因：新建記錄簿時電聯記錄工作表為空，排序應該在預建記錄完成後進行
  // 排序邏輯已整合到 performPrebuildScheduledContacts 函數中
  Logger.log('✅ 記錄簿建立完成，排序將在學生資料匯入和預建記錄時執行');
}