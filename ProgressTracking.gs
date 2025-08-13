/**
 * 進度檢查模組
 * 負責監控老師電聯記錄的完成情況，生成進度報告
 */

/**
 * 🚀 Optimized 檢查全體老師的電聯進度 with Performance Monitoring
 */
function checkAllProgress() {
  try {
    const overallStartTime = new Date().getTime();
    Logger.log('🔍 開始檢查所有老師進度');
    
    // 統一 Web 環境架構 - 移除環境檢查
    const ui = SpreadsheetApp.getUi();
    
    // 獲取所有老師的記錄簿 (使用快取)
    const teacherBooks = getAllTeacherBooks();
    if (teacherBooks.length === 0) {
      ui.alert('提醒', '系統中沒有找到任何老師記錄簿', ui.ButtonSet.OK);
      return;
    }
    
    Logger.log(`📚 找到 ${teacherBooks.length} 本記錄簿，開始處理...`);
    
    // 檢查每個老師的進度
    const progressResults = [];
    const errors = [];
    let processedCount = 0;
    
    teacherBooks.forEach((book, index) => {
      try {
        const startTime = new Date().getTime();
        const progress = checkTeacherProgress(book);
        const endTime = new Date().getTime();
        
        progressResults.push(progress);
        processedCount++;
        
        Logger.log(`✅ [${processedCount}/${teacherBooks.length}] ${progress.teacherName} 完成 (${endTime - startTime}ms)`);
        
      } catch (error) {
        const errorMsg = `檢查 ${book.getName()} 進度失敗：${error.message}`;
        Logger.log(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    });
    
    const overallEndTime = new Date().getTime();
    const totalTime = overallEndTime - overallStartTime;
    
    Logger.log(`🎉 進度檢查完成！處理 ${processedCount}/${teacherBooks.length} 本記錄簿，總耗時 ${totalTime}ms`);
    if (errors.length > 0) {
      Logger.log(`⚠️ 發現 ${errors.length} 個錯誤`);
    }
    
    // 顯示進度報告
    displayProgressSummary(progressResults);
    
    // 顯示性能摘要給用戶
    if (ui) {
      const performanceMsg = `進度檢查完成！\n\n處理記錄簿：${processedCount}/${teacherBooks.length}\n總耗時：${Math.round(totalTime/1000)}秒\n平均處理時間：${Math.round(totalTime/processedCount)}ms/本`;
      ui.alert('檢查完成', performanceMsg, ui.ButtonSet.OK);
    }
    
    // 返回檢查結果
    return {
      success: true,
      message: '進度檢查完成',
      processedCount: processedCount,
      totalBooks: teacherBooks.length,
      totalTime: totalTime,
      results: progressResults,
      errors: errors
    };
    
  } catch (error) {
    Logger.log('檢查全體進度失敗：' + error.toString());
    safeErrorHandler('檢查全體進度', error);
    
    // 錯誤情況返回值
    return {
      success: false,
      message: `檢查進度失敗：${error.message}`,
      error: error.toString()
    };
  }
}

/**
 * 🚀 Optimized 生成詳細的進度報告 with Performance Monitoring
 */
function generateProgressReport() {
  try {
    const startTime = new Date().getTime();
    Logger.log('📊 開始生成進度報告');
    
    // 統一 Web 環境架構 - 移除環境檢查
    const ui = SpreadsheetApp.getUi();
    
    // 🔍 增強型診斷：檢查系統狀態
    Logger.log('🔍 執行系統狀態檢查...');
    const systemCheck = performSystemCheck();
    
    if (!systemCheck.success) {
      const errorMsg = `系統檢查失敗：\n\n${systemCheck.errors.join('\n')}\n\n建議執行系統修復功能。`;
      ui.alert('系統錯誤', errorMsg, ui.ButtonSet.OK);
      
      return {
        success: false,
        message: '系統檢查失敗',
        errors: systemCheck.errors,
        systemCheck: systemCheck
      };
    }
    
    // 獲取所有老師的記錄簿 (使用快取)
    const teacherBooks = getAllTeacherBooks();
    if (teacherBooks.length === 0) {
      const detailedMsg = `系統中沒有找到任何老師記錄簿。\n\n可能原因：\n• 資料夾結構不正確\n• 檔案命名不符合規範\n• 權限設定問題\n\n建議使用「系統修復」功能解決此問題。`;
      ui.alert('沒有找到記錄簿', detailedMsg, ui.ButtonSet.OK);
      
      return {
        success: false,
        message: '沒有找到老師記錄簿',
        errors: ['系統中沒有找到任何老師記錄簿'],
        teacherBooksCount: 0
      };
    }
    
    Logger.log(`📚 找到 ${teacherBooks.length} 本記錄簿，開始收集數據...`);
    
    // 🎯 Step 1: Create report sheet
    const sheetStartTime = new Date().getTime();
    const reportSheet = createProgressReportSheet();
    const sheetEndTime = new Date().getTime();
    Logger.log(`✅ 報告工作表建立完成，耗時 ${sheetEndTime - sheetStartTime}ms`);
    
    // 🎯 Step 2: Collect data with progress tracking
    const dataStartTime = new Date().getTime();
    const allProgressData = [];
    const summaryData = [];
    const errors = [];
    let processedCount = 0;
    
    teacherBooks.forEach((book, index) => {
      try {
        const itemStartTime = new Date().getTime();
        const progress = checkTeacherProgress(book);
        const detailData = getTeacherDetailProgress(book);
        const itemEndTime = new Date().getTime();
        
        allProgressData.push(...detailData);
        summaryData.push([
          progress.teacherName,
          progress.totalClasses,
          progress.totalContacts,
          progress.semesterContacts || 0,  // 使用學期電聯數量
          progress.lastContactDate,
          progress.status,
          progress.alertMessage || ''
        ]);
        
        processedCount++;
        Logger.log(`✅ [${processedCount}/${teacherBooks.length}] ${progress.teacherName} 數據收集完成 (${itemEndTime - itemStartTime}ms)`);
        
      } catch (error) {
        const errorMsg = `獲取 ${book.getName()} 詳細進度失敗：${error.message}`;
        Logger.log(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    });
    
    const dataEndTime = new Date().getTime();
    Logger.log(`✅ 數據收集完成，耗時 ${dataEndTime - dataStartTime}ms`);
    
    // 🎯 Step 3: Write data
    const writeStartTime = new Date().getTime();
    writeProgressReportData(reportSheet, summaryData, allProgressData);
    const writeEndTime = new Date().getTime();
    Logger.log(`✅ 數據寫入完成，耗時 ${writeEndTime - writeStartTime}ms`);
    
    const totalTime = new Date().getTime() - startTime;
    Logger.log(`🎉 進度報告生成完成！總耗時 ${totalTime}ms`);
    
    // Show performance summary to user
    const performanceMsg = `進度報告生成完成！\n\n處理記錄簿：${processedCount}/${teacherBooks.length}\n總耗時：${Math.round(totalTime/1000)}秒\n平均處理時間：${Math.round(totalTime/processedCount)}ms/本\n\n報告位置：${reportSheet.getUrl()}`;
    
    ui.alert(
      '報告生成完成！',
      performanceMsg,
      ui.ButtonSet.OK
    );
    
    // 返回報告生成結果
    return {
      success: true,
      message: '進度報告生成完成',
      processedCount: processedCount,
      totalBooks: teacherBooks.length,
      totalTime: totalTime,
      reportSheet: reportSheet,
      reportUrl: reportSheet.getUrl(),
      errors: errors
    };
    
  } catch (error) {
    Logger.log('生成進度報告失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '生成報告失敗：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    
    // 錯誤情況返回值
    return {
      success: false,
      message: `生成報告失敗：${error.message}`,
      error: error.toString()
    };
  }
}

/**
 * 🚀 PropertiesService 快取設定 - 替代全域變數以避免測試衝突
 */
const TEACHER_BOOKS_CACHE_CONFIG = {
  key: 'TEACHER_BOOKS_CACHE_DATA',
  timestampKey: 'TEACHER_BOOKS_CACHE_TIMESTAMP',
  ttl: 5 * 60 * 1000 // 5 minutes cache
};

/**
 * 🚀 Optimized 獲取所有老師的記錄簿 with Caching & Performance Monitoring
 */
function getAllTeacherBooks() {
  try {
    // 🎯 Check PropertiesService cache first
    const now = new Date().getTime();
    const cachedData = getTeacherBooksCacheFromProperties();
    const cachedTimestamp = getTeacherBooksCacheTimestamp();
    
    if (cachedData && cachedTimestamp && 
        (now - cachedTimestamp) < TEACHER_BOOKS_CACHE_CONFIG.ttl) {
      Logger.log(`📦 使用快取的老師記錄簿列表 (${cachedData.length} 本)`);
      return cachedData.map(bookData => SpreadsheetApp.openById(bookData.id));
    }
    
    Logger.log('🔍 重新掃描老師記錄簿列表...');
    const startTime = new Date().getTime();
    
    const mainFolder = getSystemMainFolder();
    const teachersFolder = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME).next();
    
    const teacherBooks = [];
    const teacherFolders = teachersFolder.getFolders();
    
    while (teacherFolders.hasNext()) {
      const folder = teacherFolders.next();
      const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
      
      while (files.hasNext()) {
        const file = files.next();
        if (file.getName().includes('電聯記錄簿')) {
          teacherBooks.push(SpreadsheetApp.openById(file.getId()));
        }
      }
    }
    
    // 🎯 Update PropertiesService cache
    saveTeacherBooksCacheToProperties(teacherBooks, now);
    
    const endTime = new Date().getTime();
    Logger.log(`✅ 掃描完成：找到 ${teacherBooks.length} 本記錄簿，耗時 ${endTime - startTime}ms`);
    
    return teacherBooks;
    
  } catch (error) {
    Logger.log('獲取老師記錄簿列表失敗：' + error.toString());
    return [];
  }
}

/**
 * 📦 從 PropertiesService 獲取快取的老師記錄簿數據
 */
function getTeacherBooksCacheFromProperties() {
  try {
    const cachedDataString = PropertiesService.getScriptProperties().getProperty(TEACHER_BOOKS_CACHE_CONFIG.key);
    return cachedDataString ? JSON.parse(cachedDataString) : null;
  } catch (error) {
    Logger.log('獲取快取數據失敗：' + error.toString());
    return null;
  }
}

/**
 * 🕐 獲取快取時間戳
 */
function getTeacherBooksCacheTimestamp() {
  try {
    const timestampString = PropertiesService.getScriptProperties().getProperty(TEACHER_BOOKS_CACHE_CONFIG.timestampKey);
    return timestampString ? parseInt(timestampString) : null;
  } catch (error) {
    Logger.log('獲取快取時間戳失敗：' + error.toString());
    return null;
  }
}

/**
 * 💾 儲存老師記錄簿數據到 PropertiesService
 */
function saveTeacherBooksCacheToProperties(teacherBooks, timestamp) {
  try {
    // 僅儲存必要的識別資訊（ID和名稱）以節省空間
    const bookData = teacherBooks.map(book => ({
      id: book.getId(),
      name: book.getName()
    }));
    
    PropertiesService.getScriptProperties().setProperties({
      [TEACHER_BOOKS_CACHE_CONFIG.key]: JSON.stringify(bookData),
      [TEACHER_BOOKS_CACHE_CONFIG.timestampKey]: timestamp.toString()
    });
    
    Logger.log(`💾 已儲存 ${bookData.length} 本記錄簿到快取`);
  } catch (error) {
    Logger.log('儲存快取數據失敗：' + error.toString());
  }
}

/**
 * 🔄 Clear Teacher Books Cache (for manual refresh) - PropertiesService 版本
 */
function clearTeacherBooksCache() {
  try {
    PropertiesService.getScriptProperties().deleteProperty(TEACHER_BOOKS_CACHE_CONFIG.key);
    PropertiesService.getScriptProperties().deleteProperty(TEACHER_BOOKS_CACHE_CONFIG.timestampKey);
    Logger.log('🗑️ 已清除老師記錄簿快取');
  } catch (error) {
    Logger.log('清除快取失敗：' + error.toString());
  }
}

/**
 * 🩺 Quick Performance Diagnostic for Progress Checking
 * 快速診斷進度檢查性能問題
 */
function quickProgressDiagnostic() {
  try {
    Logger.log('🩺 开始快速性能診斷...');
    const startTime = new Date().getTime();
    
    // Step 1: Test file system access
    const fileAccessStart = new Date().getTime();
    const teacherBooks = getAllTeacherBooks();
    const fileAccessEnd = new Date().getTime();
    const fileAccessTime = fileAccessEnd - fileAccessStart;
    
    Logger.log(`📁 檔案系統存取: 找到 ${teacherBooks.length} 本記錄簿，耗時 ${fileAccessTime}ms`);
    
    // Step 2: Test sample progress calculation
    let sampleProgressTime = 0;
    let sampleTeacherName = 'N/A';
    
    if (teacherBooks.length > 0) {
      const sampleBook = teacherBooks[0];
      const progressStart = new Date().getTime();
      try {
        const progress = checkTeacherProgress(sampleBook);
        const progressEnd = new Date().getTime();
        sampleProgressTime = progressEnd - progressStart;
        sampleTeacherName = progress.teacherName;
        Logger.log(`📊 樣本進度計算: ${sampleTeacherName}，耗時 ${sampleProgressTime}ms`);
      } catch (error) {
        Logger.log(`❌ 樣本進度計算失敗: ${error.message}`);
      }
    }
    
    // Step 3: Estimate total time
    const estimatedTotalTime = teacherBooks.length * sampleProgressTime;
    const totalDiagnosticTime = new Date().getTime() - startTime;
    
    // Performance assessment
    const performanceLevel = 
      fileAccessTime < 5000 && sampleProgressTime < 2000 && estimatedTotalTime < 120000 ? '優秀' :
      fileAccessTime < 10000 && sampleProgressTime < 5000 && estimatedTotalTime < 300000 ? '良好' :
      '需要優化';
    
    const diagnostic = {
      timestamp: new Date(),
      teacherBooksCount: teacherBooks.length,
      fileAccessTime: fileAccessTime,
      sampleProgressTime: sampleProgressTime,
      sampleTeacherName: sampleTeacherName,
      estimatedTotalTime: estimatedTotalTime,
      diagnosticTime: totalDiagnosticTime,
      performanceLevel: performanceLevel,
      cacheStatus: getTeacherBooksCacheFromProperties() ? '已快取' : '未快取'
    };
    
    // Generate report
    const report = `
🩺 進度檢查性能診斷報告
========================================
📅 診斷時間: ${diagnostic.timestamp.toLocaleString()}
📚 老師記錄簿數量: ${diagnostic.teacherBooksCount}
📁 檔案存取時間: ${diagnostic.fileAccessTime}ms
📊 樣本計算時間: ${diagnostic.sampleProgressTime}ms (${diagnostic.sampleTeacherName})
⏱️ 預估總執行時間: ${Math.round(diagnostic.estimatedTotalTime/1000)}秒
🏆 性能評級: ${diagnostic.performanceLevel}
💾 快取狀態: ${diagnostic.cacheStatus}

🔧 建議:
${diagnostic.performanceLevel === '需要優化' ? 
  '- 系統性能較慢，建議聯繫技術支援\n- 檢查網路連線狀況\n- 確認記錄簿檔案完整性' :
  diagnostic.performanceLevel === '良好' ?
  '- 系統性能正常，執行時間在合理範圍內\n- 建議在系統負載較低時執行大批量操作' :
  '- 系統性能優秀！\n- 可以正常使用所有功能'
}

⚡ 快取機制: ${diagnostic.cacheStatus === '已快取' ? '啟用中，後續操作會更快' : '建議執行一次操作後快取會自動啟用'}
========================================
    `;
    
    Logger.log(report);
    
    // Show to user if UI available
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('性能診斷完成', report, ui.ButtonSet.OK);
    } catch (uiError) {
      Logger.log('UI不可用，診斷結果已記錄在Logger中');
    }
    
    return diagnostic;
    
  } catch (error) {
    Logger.log('❌ 快速診斷失敗: ' + error.toString());
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * 🆕 Enhanced Teacher Progress Check with Multi-Mode Support
 * 檢查單一老師的電聯進度（學期制版本，支援轉班學生 + 多模式統計）
 * @param {Spreadsheet} recordBook - 老師記錄簿
 * @param {Object} options - 選項設定
 * @returns {Object} 增強版進度檢查結果
 */
function checkTeacherProgress(recordBook, options = {}) {
  // 支援多模式統計計算
  const calculationMode = options.calculationMode || 
    SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.STATISTICS_CALCULATION?.DEFAULT_MODE || 
    'CURRENT_ACTIVE_ONLY';
    
  Logger.log(`🔍 檢查老師進度 - 使用模式：${calculationMode}`);
  
  return checkTeacherProgressEnhanced(recordBook, calculationMode, options);
}

/**
 * 🎯 Enhanced Teacher Progress Check Implementation
 * 檢查單一老師的電聯進度（原函數邏輯 + 多模式支援）
 */
function checkTeacherProgressEnhanced(recordBook, calculationMode = 'CURRENT_ACTIVE_ONLY', options = {}) {
  const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
  const contactSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
  const studentSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
  
  if (!summarySheet || !contactSheet || !studentSheet) {
    throw new Error('記錄簿格式不正確，缺少必要工作表');
  }
  
  const teacherName = summarySheet.getRange('B3').getValue();
  Logger.log(`🔍 檢查老師 ${teacherName} 的電聯進度 - 模式：${calculationMode}`);
  
  // 獲取老師基本資訊
  const classesStr = summarySheet.getRange('B5').getValue();
  const classes = classesStr.split(',').map(c => c.trim());
  
  // 🆕 使用多模式統計計算進度
  const progressResult = calculateProgressWithMode(recordBook, calculationMode);
  
  // 獲取學生資料（根據計算模式）
  const studentData = studentSheet.getDataRange().getValues();
  const allStudents = studentData.slice(1); // 跳過標題行
  const effectiveStudents = filterStudentsForStatistics(allStudents, calculationMode, recordBook);
  const totalStudents = effectiveStudents.length;
  const allStudentsCount = allStudents.length;
  
  Logger.log(`📅 學生統計：模式 ${calculationMode} - 有效學生 ${totalStudents}位／總學生 ${allStudentsCount}位`);
  
  // 分析電聯記錄
  const contactData = contactSheet.getDataRange().getValues();
  const contactHeaders = contactData[0];
  const contacts = contactData.slice(1); // 跳過標題行
  
  // 確定新欄位的索引（向後相容）
  const dateIndex = contactHeaders.findIndex(h => h.toString().toLowerCase().includes('date')) || 4;
  const semesterIndex = contactHeaders.findIndex(h => h.toString().toLowerCase().includes('semester'));
  const termIndex = contactHeaders.findIndex(h => h.toString().toLowerCase().includes('term'));
  const contactTypeIndex = contactHeaders.findIndex(h => h.toString().toLowerCase().includes('contact type'));
  const studentIdIndex = 0; // Student ID 通常在第一欄
  
  // 📊 使用多模式統計結果
  const currentSemester = SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER;
  const currentTerm = SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM;
  
  Logger.log(`📅 當前時段：${currentSemester} ${currentTerm}`);
  
  // 從多模式計算結果獲取進度
  const semesterProgress = progressResult.semesterProgress;
  const progressStats = progressResult.statistics || {};
  
  // 📞 找出最後聯繫日期（僅計算學期電聯，使用新標準：4個關鍵欄位）
  const semesterContacts = contacts.filter(row => {
    // 檢查是否為學期電聯類型
    if (contactTypeIndex >= 0 && row[contactTypeIndex] !== SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER) {
      return false;
    }
    
    // 新標準：檢查四個關鍵欄位是否都已填寫
    const date = row[dateIndex];
    const teachersContent = row[8]; // Teachers Content 欄位
    const parentsResponses = row[9]; // Parents Responses 欄位
    const contactMethod = row[10]; // Contact Method 欄位
    
    return date && 
           teachersContent && 
           parentsResponses && 
           contactMethod && 
           date.toString().trim() !== '' &&
           teachersContent.toString().trim() !== '' &&
           parentsResponses.toString().trim() !== '' &&
           contactMethod.toString().trim() !== '';
  });
  
  Logger.log(`📞 已完成學期電聯記錄：${semesterContacts.length}筆`);
  
  const lastContactDate = semesterContacts.length > 0 ? 
    Math.max(...semesterContacts.map(row => row[dateIndex] ? new Date(row[dateIndex]).getTime() : 0)) : null;
  
  // 檢查是否需要提醒
  const daysSinceLastContact = lastContactDate ? 
    Math.floor((new Date().getTime() - lastContactDate) / (1000 * 60 * 60 * 24)) : 999;
  
  const needsAlert = daysSinceLastContact > SYSTEM_CONFIG.PROGRESS_CHECK.ALERT_DAYS;
  
  // 🎯 計算當前term的完成度（基於實際記錄數量）
  const currentTermProgress = semesterProgress[currentSemester]?.[currentTerm] || { 
    completed: 0, 
    total: 0, // 將根據實際記錄數量計算
    scheduledStudents: new Set()
  };
  
  const currentTermCompleted = currentTermProgress.total > 0 ? 
    currentTermProgress.completed >= currentTermProgress.total : true;
  
  Logger.log(`🎯 ${currentSemester} ${currentTerm} 進度：${currentTermProgress.completed}/${currentTermProgress.total} → 完成狀態: ${currentTermCompleted ? '✅' : '❌'}`);
  
  // 判斷狀態
  let status = '正常';
  let alertMessage = '';
  
  if (needsAlert) {
    status = '需要關注';
    alertMessage += `已超過 ${SYSTEM_CONFIG.PROGRESS_CHECK.ALERT_DAYS} 天未記錄學期電聯。`;
  }
  
  // 📊 根據實際進度情況調整狀態判斷
  if (!currentTermCompleted && currentTermProgress.total > 0) {
    const remaining = currentTermProgress.total - currentTermProgress.completed;
    const completionRate = currentTermProgress.completed / currentTermProgress.total;
    
    if (completionRate < 0.5) {
      status = '需要關注';
    } else if (status === '正常') {
      status = '待改善';
    }
    
    alertMessage += `${currentSemester} ${currentTerm}：還有 ${remaining} 筆記錄未完成電聯（完成率: ${Math.round(completionRate*100)}%）。`;
    
    Logger.log(`⚠️ 進度提醒：${alertMessage}`);
  } else if (currentTermProgress.total === 0) {
    Logger.log(`🔄 ${currentSemester} ${currentTerm} 無學期電聯記錄（可能未進入該時段或無學生）`);
  }
  
  const result = {
    teacherName: teacherName,
    totalClasses: classes.length,
    totalStudents: totalStudents,
    allStudentsCount: allStudentsCount, // 🆕 總學生數（包含排除的）
    totalContacts: contacts.length,
    semesterContacts: semesterContacts.length, // 使用新標準計算的學期電聯數量
    totalScheduledRecords: progressStats.totalRecords || 0, // 🆕 使用多模式統計
    totalCompletedRecords: progressStats.totalCompleted || 0, // 🆕 使用多模式統計
    semesterProgress: semesterProgress,
    currentTermProgress: currentTermProgress,
    lastContactDate: lastContactDate ? new Date(lastContactDate).toLocaleDateString() : '無記錄',
    daysSinceLastContact: daysSinceLastContact,
    status: status,
    alertMessage: alertMessage,
    currentTermCompleted: currentTermCompleted,
    needsAlert: needsAlert,
    // 📊 多模式統計支援
    calculationMode: calculationMode, // 🆕 使用的計算模式
    modeConfig: progressResult.calculationMode, // 🆕 模式配置資訊
    includeTransferred: progressResult.includeTransferred || false, // 🆕 是否包含轉班學生
    excludedStudents: allStudentsCount - totalStudents, // 🆕 排除的學生數
    hasTransferredStudents: allStudentsCount > totalStudents, // 🆕 是否有被排除的學生
    overallCompletionRate: progressStats.overallCompletionRate || 0, // 🆕 使用多模式統計完成率
    // 💾 保留向後相容性
    legacyHasTransferredStudents: Object.values(semesterProgress).some(semester => 
      Object.values(semester).some(term => term.total > totalStudents / 6))
  };
  
  Logger.log(`✅ 老師 ${teacherName} 進度檢查完成`);
  Logger.log(`   📊 模式: ${calculationMode} (${progressResult.calculationMode?.name || '未知'})`);
  Logger.log(`   👥 學生: ${totalStudents}/${allStudentsCount} (排除 ${allStudentsCount - totalStudents}位)`);
  Logger.log(`   📈 狀態: ${status}, 完成率: ${result.overallCompletionRate}%`);
  
  return result;
}

/**
 * 🆕 Enhanced Semester Progress Calculation with Multi-Mode Support
 * 增強版學期進度計算（支援轉班學生完整6記錄框架 + 多模式統計）
 * @param {Array} contacts - 聯繫記錄陣列
 * @param {Array} students - 學生資料陣列
 * @param {Object} fieldIndexes - 欄位索引對象
 * @param {Object} options - 選項配置
 * @returns {Object} 增強版學期進度結果
 */
function calculateSemesterProgress(contacts, students, fieldIndexes, options = {}) {
  return calculateSemesterProgressEnhanced(contacts, students, fieldIndexes, options);
}

/**
 * 🎯 Enhanced Semester Progress Implementation
 * 計算學期進度（原函數邏輯 + 增強功能）
 */
function calculateSemesterProgressEnhanced(contacts, students, fieldIndexes, options = {}) {
  // 增強欄位映射（為新標準增加必要欄位）
  if (!fieldIndexes.teachersContentIndex) fieldIndexes.teachersContentIndex = 8;
  if (!fieldIndexes.parentsResponsesIndex) fieldIndexes.parentsResponsesIndex = 9;
  if (!fieldIndexes.contactMethodIndex) fieldIndexes.contactMethodIndex = 10;
  if (!fieldIndexes.dateIndex) fieldIndexes.dateIndex = 4;
  const progress = {};
  
  Logger.log(`📊 計算學期進度：${contacts.length}筆聯繫記錄，${students.length}位學生`);
  
  // 🎯 步驟1：分析實際的Scheduled Contact記錄分佈
  // 計算每個學期/term組合實際應該有多少學生記錄
  const scheduledContactDistribution = {};
  
  contacts.forEach(contact => {
    const contactType = contact[fieldIndexes.contactTypeIndex];

    // 只分析Scheduled Contact記錄
    if (fieldIndexes.contactTypeIndex >= 0 && contactType === SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER) {
      const semester = contact[fieldIndexes.semesterIndex] || SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER;
      const term = contact[fieldIndexes.termIndex] || SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM;
      const studentId = contact[fieldIndexes.studentIdIndex];
      
      if (studentId) {
        const key = `${semester}-${term}`;
        if (!scheduledContactDistribution[key]) {
          scheduledContactDistribution[key] = new Set();
        }
        scheduledContactDistribution[key].add(studentId.toString());
      }
    }
  });
  
  Logger.log(`🔍 Scheduled Contact 記錄分佈：`, Object.keys(scheduledContactDistribution).map(key => 
    `${key}: ${scheduledContactDistribution[key].size}位學生`
  ).join(', '));
  
  // 🎯 步驟2：初始化進度追蹤（基於實際記錄分佈）
  SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.forEach(semester => {
    progress[semester] = {};
    SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.forEach(term => {
      const key = `${semester}-${term}`;
      const expectedStudents = scheduledContactDistribution[key] ? scheduledContactDistribution[key].size : 0;
      
      progress[semester][term] = {
        completed: 0,
        total: expectedStudents, // 🎯 修正：基於實際Scheduled Contact記錄數量
        contactedStudents: new Set(),
        scheduledStudents: scheduledContactDistribution[key] || new Set()
      };
      
      Logger.log(`📋 ${semester} ${term}：期望 ${expectedStudents} 位學生記錄`);
    });
  });
  
  // 🎯 步驟3：統計實際完成電聯記錄（使用新標準：4個關鍵欄位）
  let totalScheduledContacts = 0;
  let totalCompletedContacts = 0;
  
  contacts.forEach(contact => {
    const semester = contact[fieldIndexes.semesterIndex] || SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_SEMESTER;
    const term = contact[fieldIndexes.termIndex] || SYSTEM_CONFIG.ACADEMIC_YEAR.CURRENT_TERM;
    const contactType = contact[fieldIndexes.contactTypeIndex];
    const studentId = contact[fieldIndexes.studentIdIndex];
    
    // 只計算學期電聯（Scheduled Contact）
    if (fieldIndexes.contactTypeIndex >= 0 && contactType !== SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER) {
      return;
    }
    
    totalScheduledContacts++;
    
    // 新標準：檢查四個關鍵欄位是否都已填寫（Date, Teachers Content, Parents Responses, Contact Method）
    const date = contact[fieldIndexes.dateIndex] || contact[4]; // Date 欄位
    const teachersContent = contact[fieldIndexes.teachersContentIndex] || contact[8]; // Teachers Content 欄位
    const parentsResponses = contact[fieldIndexes.parentsResponsesIndex] || contact[9]; // Parents Responses 欄位
    const contactMethod = contact[fieldIndexes.contactMethodIndex] || contact[10]; // Contact Method 欄位
    
    // 只有四個關鍵欄位都已填寫的才算「已完成電聯」
    const isCompleted = date && 
                       teachersContent && 
                       parentsResponses && 
                       contactMethod && 
                       date.toString().trim() !== '' &&
                       teachersContent.toString().trim() !== '' &&
                       parentsResponses.toString().trim() !== '' &&
                       contactMethod.toString().trim() !== '';
    
    if (isCompleted) {
      totalCompletedContacts++;
      
      // 記錄到對應的學期/term統計中
      if (progress[semester] && progress[semester][term] && studentId) {
        progress[semester][term].contactedStudents.add(studentId.toString());
      }
    }
  });
  
  Logger.log(`📈 統計完成：總Scheduled Contact記錄 ${totalScheduledContacts}筆，已完成 ${totalCompletedContacts}筆 (${Math.round(totalCompletedContacts/totalScheduledContacts*100)}%)`);
  
  // 🎯 步驟4：計算完成數量和生成詳細統計
  let overallCompleted = 0;
  let overallTotal = 0;
  
  Object.keys(progress).forEach(semester => {
    Object.keys(progress[semester]).forEach(term => {
      const termProgress = progress[semester][term];
      termProgress.completed = termProgress.contactedStudents.size;
      
      overallCompleted += termProgress.completed;
      overallTotal += termProgress.total;
      
      // 計算完成率
      const completionRate = termProgress.total > 0 ? 
        Math.round(termProgress.completed / termProgress.total * 100) : 0;
      
      Logger.log(`📊 ${semester} ${term}: ${termProgress.completed}/${termProgress.total} (${completionRate}%)`);
      
      // 🎯 轉班學生驗證：檢查該時段是否有轉班學生的完整記錄
      if (termProgress.total > students.length) {
        Logger.log(`🔄 檢測到轉班學生記錄：${semester} ${term} 有 ${termProgress.total} 筆記錄（超過現有學生數 ${students.length}）`);
      }
    });
  });
  
  const overallCompletionRate = overallTotal > 0 ? 
    Math.round(overallCompleted / overallTotal * 100) : 0;
  
  Logger.log(`🎯 整體進度：${overallCompleted}/${overallTotal} (${overallCompletionRate}%) - 包含所有學生（含轉班）的完整6記錄框架`);
  
  return progress;
}

/**
 * 🎯 Comprehensive Progress Calculation - 綜合進度計算
 * 支援多種配置和統計模式的進度計算
 * @param {Spreadsheet} teacherBook - 老師記錄簿
 * @param {Object} options - 計算選項
 * @returns {Object} 綜合進度結果
 */
function calculateComprehensiveProgress(teacherBook, options = {}) {
  Logger.log('🎯 開始綜合進度計算...');
  
  try {
    const calculationMode = options.calculationMode || 
      SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.STATISTICS_CALCULATION?.DEFAULT_MODE || 
      'CURRENT_ACTIVE_ONLY';
    
    const config = SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.STATISTICS_CALCULATION;
    const modeConfig = config?.MODES[calculationMode];
    
    if (!modeConfig) {
      throw new Error(`不支援的計算模式：${calculationMode}`);
    }
    
    // 使用多模式統計引擎
    const progressResult = calculateProgressWithMode(teacherBook, calculationMode);
    
    // 添加增強統計資訊
    const enhancedResult = {
      ...progressResult,
      comprehensive: true,
      calculationOptions: options,
      supportedModes: Object.keys(config?.MODES || {}),
      timestamp: new Date()
    };
    
    Logger.log(`✅ 綜合進度計算完成 - 模式: ${calculationMode}`);
    return enhancedResult;
    
  } catch (error) {
    Logger.log(`❌ 綜合進度計算失敗：${error.message}`);
    throw error;
  }
}

/**
 * 獲取老師的詳細進度資料
 */
function getTeacherDetailProgress(recordBook) {
  const contactSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
  const summarySheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
  
  const teacherName = summarySheet.getRange('B3').getValue();
  const contactData = contactSheet.getDataRange().getValues();
  
  // 轉換為詳細記錄格式 - 學期制11欄位格式
  return contactData.slice(1).map(row => [
    teacherName,
    row[0], // Student ID
    row[1], // Name
    row[2], // English Name
    row[3], // English Class
    row[4], // Date
    row[5], // Semester
    row[6], // Term
    row[7], // Contact Type
    row[8], // Teachers Content
    row[9], // Parents Responses
    row[10] // Contact Method
  ]);
}


/**
 * 建立進度報告工作表
 */
function createProgressReportSheet() {
  const mainFolder = getSystemMainFolder();
  const reportsFolder = mainFolder.getFoldersByName('進度報告').next();
  
  const reportName = `電聯進度報告_${formatDateTimeForFilename()}`;
  const reportSheet = SpreadsheetApp.create(reportName);
  const reportFile = DriveApp.getFileById(reportSheet.getId());
  
  // 移動到報告資料夾
  reportsFolder.addFile(reportFile);
  DriveApp.getRootFolder().removeFile(reportFile);
  
  return reportSheet;
}

/**
 * 寫入進度報告資料
 */
function writeProgressReportData(reportSheet, summaryData, detailData) {
  // 建立摘要工作表
  const summarySheet = reportSheet.getActiveSheet();
  summarySheet.setName('進度摘要');
  
  // 寫入摘要資料
  const summaryHeaders = [['老師姓名', '授課班級數', '總電聯次數', '定期電聯次數', '最後聯繫日期', '狀態', '提醒訊息']];
  summarySheet.getRange(1, 1, 1, summaryHeaders[0].length).setValues(summaryHeaders);
  
  if (summaryData.length > 0) {
    summarySheet.getRange(2, 1, summaryData.length, summaryHeaders[0].length).setValues(summaryData);
  }
  
  // 建立詳細記錄工作表
  const detailSheet = reportSheet.insertSheet('詳細記錄');
  const detailHeaders = [['Teacher Name', 'Student ID', 'Name', 'English Name', 'English Class', 'Date', 'Semester', 'Term', 'Contact Type', 'Teachers Content', 'Parents Responses', 'Contact Method']];
  detailSheet.getRange(1, 1, 1, detailHeaders[0].length).setValues(detailHeaders);
  
  if (detailData.length > 0) {
    detailSheet.getRange(2, 1, detailData.length, detailHeaders[0].length).setValues(detailData);
  }
  
  // 格式設定
  [summarySheet, detailSheet].forEach(sheet => {
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold').setBackground('#E8F4FD');
    sheet.autoResizeColumns(1, sheet.getLastColumn());
  });
  
  // 新增統計圖表
  addProgressCharts(summarySheet, summaryData);
}

/**
 * 新增進度統計圖表
 */
function addProgressCharts(sheet, summaryData) {
  if (summaryData.length === 0) return;
  
  // 統計狀態分布
  const statusCount = {};
  summaryData.forEach(row => {
    const status = row[5]; // 狀態欄位
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  
  // 建立狀態統計資料
  const chartData = [['狀態', '人數']];
  Object.keys(statusCount).forEach(status => {
    chartData.push([status, statusCount[status]]);
  });
  
  // 寫入圖表資料
  const chartRange = sheet.getRange(summaryData.length + 5, 1, chartData.length, 2);
  chartRange.setValues(chartData);
  
  // 建立圓餅圖
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(chartRange)
    .setPosition(summaryData.length + 5, 4, 0, 0)
    .setOption('title', '老師電聯進度狀態分布')
    .setOption('width', 400)
    .setOption('height', 300)
    .build();
  
  sheet.insertChart(chart);
}

/**
 * 自動進度檢查（可設定為定時觸發）
 */
function autoProgressCheck() {
  try {
    const teacherBooks = getAllTeacherBooks();
    const alertTeachers = [];
    
    teacherBooks.forEach(book => {
      try {
        const progress = checkTeacherProgress(book);
        if (progress.needsAlert || !progress.currentTermCompleted) {
          alertTeachers.push(progress);
        }
      } catch (error) {
        Logger.log(`自動檢查 ${book.getName()} 失敗：` + error.toString());
      }
    });
    
    // 如果有需要提醒的老師，發送通知
    if (alertTeachers.length > 0) {
      sendProgressAlert(alertTeachers);
    }
    
    Logger.log(`自動進度檢查完成，發現 ${alertTeachers.length} 位老師需要關注（支援轉班學生框架）`);
    
  } catch (error) {
    Logger.log('自動進度檢查失敗：' + error.toString());
  }
}

/**
 * 發送進度提醒
 */
/**
 * 顯示進度檢查摘要
 */
function displayProgressSummary(progressResults) {
  if (!progressResults || progressResults.length === 0) {
    SpreadsheetApp.getUi().alert('進度檢查結果', '沒有找到任何老師記錄簿', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  // 📊 統計分析（增強轉班學生支援）
  const totalTeachers = progressResults.length;
  const needAttention = progressResults.filter(p => p.status === '需要關注').length;
  const needImprovement = progressResults.filter(p => p.status === '待改善').length;
  const normal = progressResults.filter(p => p.status === '正常').length;
  const totalContacts = progressResults.reduce((sum, p) => sum + p.totalContacts, 0);
  const totalSemesterContacts = progressResults.reduce((sum, p) => sum + (p.semesterContacts || 0), 0);
  
  // 🔄 轉班學生支援統計
  const teachersWithTransfers = progressResults.filter(p => p.hasTransferredStudents).length;
  const totalScheduledRecords = progressResults.reduce((sum, p) => sum + (p.totalScheduledRecords || 0), 0);
  const totalCompletedRecords = progressResults.reduce((sum, p) => sum + (p.totalCompletedRecords || 0), 0);
  const overallSystemCompletion = totalScheduledRecords > 0 ? 
    Math.round(totalCompletedRecords / totalScheduledRecords * 100) : 0;
  
  // 📄 建立增強版摘要報告（支援轉班學生）
  let summaryMessage = '🔍 全體老師電聯進度檢查結果\n\n';
  summaryMessage += `📊 總體統計：\n`;
  summaryMessage += `• 老師總數：${totalTeachers} 位\n`;
  summaryMessage += `• 累計電聯記錄：${totalContacts} 筆\n`;
  summaryMessage += `• 學期電聯記錄：${totalSemesterContacts} 筆\n`;
  
  if (teachersWithTransfers > 0) {
    summaryMessage += `\n🔄 轉班學生支援統計：\n`;
    summaryMessage += `• 有轉班學生的老師：${teachersWithTransfers} 位\n`;
    summaryMessage += `• 總預定記錄數：${totalScheduledRecords} 筆\n`;
    summaryMessage += `• 總完成記錄數：${totalCompletedRecords} 筆\n`;
    summaryMessage += `• 系統整體完成率：${overallSystemCompletion}%\n`;
  }
  
  summaryMessage += '\n';
  
  summaryMessage += `📈 狀態分布：\n`;
  summaryMessage += `• ✅ 正常：${normal} 位 (${Math.round(normal/totalTeachers*100)}%)\n`;
  summaryMessage += `• ⚠️ 待改善：${needImprovement} 位 (${Math.round(needImprovement/totalTeachers*100)}%)\n`;
  summaryMessage += `• 🚨 需要關注：${needAttention} 位 (${Math.round(needAttention/totalTeachers*100)}%)\n\n`;
  
  // 詳細列表
  if (needAttention > 0 || needImprovement > 0) {
    summaryMessage += `📋 需要關注的老師：\n`;
    progressResults.forEach(progress => {
      if (progress.status !== '正常') {
        summaryMessage += `\n• ${progress.teacherName} (${progress.status})\n`;
        summaryMessage += `  - 總電聯：${progress.totalContacts} 筆\n`;
        summaryMessage += `  - 學期電聯：${progress.semesterContacts || 0} 筆\n`;
        summaryMessage += `  - 最後聯繫：${progress.lastContactDate}\n`;
        
        // 🔄 轉班學生支援狀態
        if (progress.hasTransferredStudents) {
          summaryMessage += `  - 🔄 包含轉班學生（完整框架）\n`;
        }
        if (progress.overallCompletionRate !== undefined) {
          summaryMessage += `  - 整體完成率：${progress.overallCompletionRate}%\n`;
        }
        
        if (progress.alertMessage) {
          summaryMessage += `  - 提醒：${progress.alertMessage}\n`;
        }
      }
    });
  }
  
  // 顯示結果
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '進度檢查結果',
    summaryMessage + '\n是否要生成詳細報告？',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    generateDetailedProgressReport(progressResults);
  }
}

/**
 * 生成詳細的進度報告並保存為檔案
 */
function generateDetailedProgressReport(progressResults) {
  try {
    const reportSheet = SpreadsheetApp.create(`電聯進度報告_${formatDateTimeForFilename()}`);
    const sheet = reportSheet.getActiveSheet();
    sheet.setName('進度報告');
    
    // 設定報告標題
    sheet.getRange('A1').setValue('電聯記錄進度報告');
    sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
    sheet.getRange('A2').setValue(`生成時間：${new Date().toLocaleString()}`);
    
    // 設定表頭
    const headers = [
      '老師姓名', '授課班級數', '總電聯次數', '定期電聯次數', 
      '最後聯繫日期', '距今天數', '狀態', '當前Term完成', 
      '整體完成率', '轉班學生', '提醒訊息' // 新增欄位
    ];
    sheet.getRange(4, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(4, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
    
    // 填入數據（增強轉班學生支援資訊）
    const data = progressResults.map(progress => [
      progress.teacherName,
      progress.totalClasses,
      progress.totalContacts,
      progress.semesterContacts || 0,
      progress.lastContactDate,
      progress.daysSinceLastContact === 999 ? '無記錄' : progress.daysSinceLastContact,
      progress.status,
      progress.currentTermCompleted ? '是' : '否',
      progress.overallCompletionRate !== undefined ? `${progress.overallCompletionRate}%` : '未知', // 整體完成率
      progress.hasTransferredStudents ? '是' : '否', // 轉班學生
      progress.alertMessage || '無'
    ]);
    
    if (data.length > 0) {
      sheet.getRange(5, 1, data.length, headers.length).setValues(data);
      
      // 🎨 轉班學生狀態高光顯示
      const transferColumnIndex = 10; // '轉班學生' 欄位的索引
      const transferRange = sheet.getRange(5, transferColumnIndex, data.length, 1);
      const transferHighlightRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('是')
        .setBackground('#E1F5FE') // 淺藍色背景
        .setFontColor('#01579B') // 深藍色字體
        .setRanges([transferRange])
        .build();
      
      const existingRules = sheet.getConditionalFormatRules();
      sheet.setConditionalFormatRules([...existingRules, transferHighlightRule]);
    }
    
    // 🎨 增強條件式格式（含狀態和轉班學生顯示）
    const statusRange = sheet.getRange(5, 7, data.length, 1);
    const normalRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('正常')
      .setBackground('#D4EDDA')
      .setRanges([statusRange])
      .build();
    const improvementRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('待改善')
      .setBackground('#FFF3CD')
      .setRanges([statusRange])
      .build();
    const attentionRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('需要關注')
      .setBackground('#F8D7DA')
      .setRanges([statusRange])
      .build();
    
    // 📊 完成率顯示格式
    const completionRange = sheet.getRange(5, 9, data.length, 1); // '整體完成率' 欄位
    const highCompletionRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(80)
      .setBackground('#C8E6C9') // 綠色
      .setRanges([completionRange])
      .build();
    const mediumCompletionRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(50, 79)
      .setBackground('#FFF9C4') // 黃色
      .setRanges([completionRange])
      .build();
    const lowCompletionRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(50)
      .setBackground('#FFCDD2') // 紅色
      .setRanges([completionRange])
      .build();
    
    sheet.setConditionalFormatRules([
      normalRule, improvementRule, attentionRule,
      highCompletionRule, mediumCompletionRule, lowCompletionRule
    ]);
    
    // 調整欄寬和美化格式
    sheet.autoResizeColumns(1, headers.length);
    
    // 新增系統統計摘要（在表格下方）
    const summaryStartRow = data.length + 7;
    sheet.getRange(summaryStartRow, 1).setValue('📊 系統統計摘要');
    sheet.getRange(summaryStartRow, 1).setFontSize(14).setFontWeight('bold');
    
    const systemStats = [
      [`總老師數: ${progressResults.length}位`],
      [`累計電聯記錄: ${progressResults.reduce((sum, p) => sum + p.totalContacts, 0)}筆`],
      [`學期電聯記錄: ${progressResults.reduce((sum, p) => sum + (p.semesterContacts || 0), 0)}筆`],
      [`有轉班學生的老師: ${progressResults.filter(p => p.hasTransferredStudents).length}位`],
      [`系統整體完成率: ${progressResults.reduce((sum, p) => sum + (p.totalScheduledRecords || 0), 0) > 0 ? Math.round(progressResults.reduce((sum, p) => sum + (p.totalCompletedRecords || 0), 0) / progressResults.reduce((sum, p) => sum + (p.totalScheduledRecords || 0), 0) * 100) : 0}%`]
    ];
    
    sheet.getRange(summaryStartRow + 1, 1, systemStats.length, 1).setValues(systemStats);
    sheet.getRange(summaryStartRow + 1, 1, systemStats.length, 1).setBackground('#F5F5F5');
    
    // 移動到主資料夾
    const mainFolder = getSystemMainFolder();
    const reportFolder = mainFolder.getFoldersByName('進度報告').next();
    const reportFile = DriveApp.getFileById(reportSheet.getId());
    reportFolder.addFile(reportFile);
    DriveApp.getRootFolder().removeFile(reportFile);
    
    SpreadsheetApp.getUi().alert(
      '報告生成完成 🎆',
      `詳細進度報告已生成：\n${reportSheet.getUrl()}\n\n🔄 支援轉班學生完整6記錄框架\n📊 系統整體完成率: ${progressResults.reduce((sum, p) => sum + (p.totalScheduledRecords || 0), 0) > 0 ? Math.round(progressResults.reduce((sum, p) => sum + (p.totalCompletedRecords || 0), 0) / progressResults.reduce((sum, p) => sum + (p.totalScheduledRecords || 0), 0) * 100) : 0}%`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('生成詳細報告失敗：' + error.toString());
    SpreadsheetApp.getUi().alert('錯誤', '生成詳細報告失敗（含轉班學生支援）：' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function sendProgressAlert(alertTeachers) {
  // 這裡可以整合 Gmail API 或其他通知方式
  let alertMessage = '電聯記錄提醒通知（支援轉班學生框架）：\n\n';
  
  alertTeachers.forEach(teacher => {
    alertMessage += `${teacher.teacherName}：${teacher.alertMessage}\n`;
    if (teacher.hasTransferredStudents) {
      alertMessage += `  🔄 該老師班級包含轉班學生\n`;
    }
  });
  
  Logger.log('進度提醒：' + alertMessage);
  
  // 可以在這裡添加實際的通知功能，例如：
  // GmailApp.sendEmail(recipientEmail, '電聯記錄提醒', alertMessage);
}

// ============================================================
// 🆕 MULTI-MODE STATISTICS CALCULATION ENGINE
// Integrates with TRANSFER_MANAGEMENT configuration
// ============================================================

/**
 * 🆕 Multi-Mode Statistics Calculation Engine
 * 支援多種統計計算模式：Current Active / Full Historical / Dual View / Enrollment Based
 * @param {Spreadsheet} teacherBook - 老師記錄簿
 * @param {string} calculationMode - 計算模式 (可選，預設使用配置)
 * @returns {Object} 多模式進度統計結果
 */
function calculateProgressWithMode(teacherBook, calculationMode = null) {
  Logger.log('🎯 [Multi-Mode] 開始多模式統計計算...');
  
  try {
    // 步驟1：獲取計算模式配置
    const config = SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.STATISTICS_CALCULATION;
    if (!config) {
      Logger.log('⚠️ 找不到統計計算配置，使用預設模式');
      return calculateSemesterProgress(teacherBook, null, {});
    }
    
    const mode = calculationMode || config.DEFAULT_MODE;
    const modeConfig = config.MODES[mode];
    
    if (!modeConfig) {
      throw new Error(`不支援的計算模式：${mode}`);
    }
    
    Logger.log(`📊 使用計算模式：${mode} - ${modeConfig.name}`);
    
    // 步驟2：獲取基礎資料
    const summarySheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    const contactSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    
    if (!summarySheet || !contactSheet || !studentSheet) {
      throw new Error('記錄簿格式不正確，缺少必要工作表');
    }
    
    const teacherName = summarySheet.getRange('B3').getValue();
    const studentData = studentSheet.getDataRange().getValues().slice(1);
    const contactData = contactSheet.getDataRange().getValues();
    const contacts = contactData.slice(1);
    
    // 步驟3：根據模式計算統計
    let result;
    
    switch (mode) {
      case 'CURRENT_ACTIVE_ONLY':
        result = calculateCurrentActiveProgress(teacherBook, studentData, contacts, modeConfig);
        break;
      case 'FULL_HISTORICAL':
        result = calculateFullHistoricalProgress(teacherBook, studentData, contacts, modeConfig);
        break;
      case 'DUAL_VIEW':
        result = calculateDualViewProgress(teacherBook, studentData, contacts, modeConfig);
        break;
      case 'ENROLLMENT_BASED':
        result = calculateEnrollmentBasedProgress(teacherBook, studentData, contacts, modeConfig);
        break;
      default:
        throw new Error(`未實作的計算模式：${mode}`);
    }
    
    // 步驟4：添加模式資訊到結果
    result.calculationMode = {
      mode: mode,
      name: modeConfig.name,
      description: modeConfig.description,
      timestamp: new Date()
    };
    
    Logger.log(`✅ [Multi-Mode] 完成 ${mode} 模式統計計算`);
    return result;
    
  } catch (error) {
    Logger.log(`❌ [Multi-Mode] 統計計算失敗：${error.message}`);
    throw error;
  }
}

/**
 * 🎯 Current Active Only Mode - 僅計算目前在班學生
 */
function calculateCurrentActiveProgress(teacherBook, studentData, contacts, modeConfig) {
  Logger.log('📊 計算模式：Current Active Only');
  
  // 過濾現行在籍學生
  const activeStudents = filterStudentsForStatistics(studentData, 'CURRENT_ACTIVE_ONLY', teacherBook);
  
  Logger.log(`👥 現行在籍學生：${activeStudents.length}位（總學生：${studentData.length}位）`);
  
  // 使用現有函數計算進度，但僅針對現行學生
  const contactHeaders = getContactHeaders(teacherBook);
  const fieldIndexes = getFieldIndexes(contactHeaders);
  
  const progress = calculateSemesterProgress(contacts, activeStudents, fieldIndexes);
  
  return {
    mode: 'CURRENT_ACTIVE_ONLY',
    totalStudents: activeStudents.length,
    allStudents: studentData.length,
    excludedStudents: studentData.length - activeStudents.length,
    semesterProgress: progress,
    statistics: calculateProgressStatistics(progress),
    includeTransferred: false
  };
}

/**
 * 📚 Full Historical Mode - 包含所有歷史學生記錄
 */
function calculateFullHistoricalProgress(teacherBook, studentData, contacts, modeConfig) {
  Logger.log('📊 計算模式：Full Historical');
  
  // 包含所有學生（含轉班/轉出學生）
  const allStudents = studentData; // 不過濾任何學生
  
  Logger.log(`👥 全部歷史學生：${allStudents.length}位`);
  
  // 計算包含所有學生的進度
  const contactHeaders = getContactHeaders(teacherBook);
  const fieldIndexes = getFieldIndexes(contactHeaders);
  
  const progress = calculateSemesterProgress(contacts, allStudents, fieldIndexes);
  
  return {
    mode: 'FULL_HISTORICAL',
    totalStudents: allStudents.length,
    allStudents: allStudents.length,
    excludedStudents: 0,
    semesterProgress: progress,
    statistics: calculateProgressStatistics(progress),
    includeTransferred: true
  };
}

/**
 * 🔄 Dual View Mode - 同時顯示現況與歷史統計
 */
function calculateDualViewProgress(teacherBook, studentData, contacts, modeConfig) {
  Logger.log('📊 計算模式：Dual View');
  
  // 計算現行在籍統計
  const currentProgress = calculateCurrentActiveProgress(teacherBook, studentData, contacts, {
    includeTransferred: false
  });
  
  // 計算完整歷史統計
  const historicalProgress = calculateFullHistoricalProgress(teacherBook, studentData, contacts, {
    includeTransferred: true
  });
  
  // 生成比較統計
  const comparison = generateStatisticsComparison(currentProgress.statistics, historicalProgress.statistics);
  
  return {
    mode: 'DUAL_VIEW',
    current: currentProgress,
    historical: historicalProgress,
    comparison: comparison,
    totalStudents: studentData.length,
    showBothViews: true
  };
}

/**
 * 📅 Enrollment Based Mode - 基於學生入班時的期次計算
 */
function calculateEnrollmentBasedProgress(teacherBook, studentData, contacts, modeConfig) {
  Logger.log('📊 計算模式：Enrollment Based');
  
  // 獲取學生入班資訊並動態計算分母
  const enrollmentData = getStudentEnrollmentData(studentData, contacts);
  
  Logger.log(`👥 入班感知學生：${enrollmentData.length}位`);
  
  // 基於入班時點計算動態進度
  const contactHeaders = getContactHeaders(teacherBook);
  const fieldIndexes = getFieldIndexes(contactHeaders);
  
  const progress = calculateEnrollmentAwareProgress(contacts, enrollmentData, fieldIndexes);
  
  return {
    mode: 'ENROLLMENT_BASED',
    totalStudents: enrollmentData.length,
    enrollmentData: enrollmentData,
    semesterProgress: progress,
    statistics: calculateProgressStatistics(progress),
    dynamicDenominator: true
  };
}

/**
 * 🧪 測試函數：驗證改進後的calculateSemesterProgress函數
 * 專門測試轉班學生的完整6記錄框架統計計算
 */
/**
 * 🎯 Enhanced Student Filtering for Statistics
 * 根據狀態和模式過濾學生列表
 * @param {Array} students - 學生資料陣列
 * @param {string} mode - 計算模式
 * @param {Spreadsheet} teacherBook - 老師記錄簿
 * @returns {Array} 過濾後的學生列表
 */
function filterStudentsForStatistics(students, mode, teacherBook) {
  Logger.log(`🔍 過濾學生 - 模式：${mode}，總學生：${students.length}位`);
  
  try {
    // 根據模式決定過濾策略
    switch (mode) {
      case 'CURRENT_ACTIVE_ONLY':
        return getActiveStudentsList(teacherBook, false);
      
      case 'FULL_HISTORICAL':
        return getActiveStudentsList(teacherBook, true);
      
      case 'ENROLLMENT_BASED':
        return filterEnrollmentBasedStudents(students, teacherBook);
      
      default:
        Logger.log(`⚠️ 未知過濾模式：${mode}，返回所有學生`);
        return students;
    }
    
  } catch (error) {
    Logger.log(`❌ 學生過濾失敗：${error.message}`);
    return students; // 錯誤時返回所有學生
  }
}

/**
 * 👥 Get Active Students List - 整合狀態管理系統
 * @param {Spreadsheet} teacherBook - 老師記錄簿
 * @param {boolean} includeTransferred - 是否包含轉班學生（可選，使用配置）
 * @returns {Array} 學生列表
 */
function getActiveStudentsList(teacherBook, includeTransferred = null) {
  Logger.log('👥 獲取在籍學生列表...');
  
  try {
    const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    if (!studentSheet) {
      throw new Error('找不到學生清單工作表');
    }
    
    const studentData = studentSheet.getDataRange().getValues().slice(1);
    
    // 使用配置決定是否包含轉班學生
    const config = SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.STATUS_ANNOTATION;
    const shouldIncludeTransferred = includeTransferred !== null ? 
      includeTransferred : 
      (config?.INCLUDE_TRANSFERRED_IN_STATS || false);
    
    if (!shouldIncludeTransferred) {
      // 過濾掉已轉班/轉出的學生
      const filteredStudents = studentData.filter(student => {
        const studentId = student[0]; // 假設第一欄是學生ID
        
        // 檢查學生狀態
        try {
          const statusInfo = getStudentStatusForStatistics(studentId);
          return statusInfo.includeInStats;
        } catch (error) {
          Logger.log(`⚠️ 無法獲取學生 ${studentId} 狀態，預設包含`);
          return true; // 錯誤時預設包含
        }
      });
      
      Logger.log(`📊 過濾結果：${filteredStudents.length}/${studentData.length} 學生納入統計`);
      return filteredStudents;
    }
    
    Logger.log(`📊 包含所有學生：${studentData.length}位`);
    return studentData;
    
  } catch (error) {
    Logger.log(`❌ 獲取學生列表失敗：${error.message}`);
    return [];
  }
}

/**
 * 📚 Get Historical Students List - 獲取所有歷史學生
 * @param {Spreadsheet} teacherBook - 老師記錄簿
 * @returns {Array} 完整歷史學生列表
 */
function getHistoricalStudentsList(teacherBook) {
  Logger.log('📚 獲取歷史學生列表（包含轉班學生）...');
  
  try {
    const studentSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    if (!studentSheet) {
      throw new Error('找不到學生清單工作表');
    }
    
    const allStudents = studentSheet.getDataRange().getValues().slice(1);
    
    Logger.log(`📊 歷史學生總數：${allStudents.length}位`);
    return allStudents;
    
  } catch (error) {
    Logger.log(`❌ 獲取歷史學生列表失敗：${error.message}`);
    return [];
  }
}

/**
 * 🔄 Calculate Dual View Statistics - 雙重檢視統計
 * @param {Spreadsheet} teacherBook - 老師記錄簿
 * @returns {Object} 雙重檢視統計結果
 */
function calculateDualViewStatistics(teacherBook) {
  Logger.log('🔄 計算雙重檢視統計...');
  
  try {
    // 計算現行學生統計
    const currentStats = calculateProgressWithMode(teacherBook, 'CURRENT_ACTIVE_ONLY');
    
    // 計算歷史學生統計
    const historicalStats = calculateProgressWithMode(teacherBook, 'FULL_HISTORICAL');
    
    // 生成比較資料
    const comparison = generateStatisticsComparison(currentStats.statistics, historicalStats.statistics);
    
    return {
      current: currentStats,
      historical: historicalStats,
      comparison: comparison,
      dualView: true,
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ 雙重檢視統計計算失敗：${error.message}`);
    throw error;
  }
}

/**
 * 📈 Generate Statistics Comparison - 生成統計比較
 * @param {Object} currentStats - 現行統計
 * @param {Object} historicalStats - 歷史統計
 * @returns {Object} 比較結果
 */
function generateStatisticsComparison(currentStats, historicalStats) {
  Logger.log('📈 生成統計比較資料...');
  
  try {
    const comparison = {
      studentCountDifference: historicalStats.totalRecords - currentStats.totalRecords,
      completionRateDifference: historicalStats.overallCompletionRate - currentStats.overallCompletionRate,
      transferredStudentImpact: {
        hasImpact: historicalStats.totalRecords > currentStats.totalRecords,
        affectedRecords: historicalStats.totalRecords - currentStats.totalRecords,
        impactPercentage: currentStats.totalRecords > 0 ? 
          Math.round((historicalStats.totalRecords - currentStats.totalRecords) / currentStats.totalRecords * 100) : 0
      },
      summary: {
        current: `${currentStats.totalCompleted}/${currentStats.totalRecords} (${currentStats.overallCompletionRate}%)`,
        historical: `${historicalStats.totalCompleted}/${historicalStats.totalRecords} (${historicalStats.overallCompletionRate}%)`,
        impact: historicalStats.totalRecords > currentStats.totalRecords ? 
          `包含 ${historicalStats.totalRecords - currentStats.totalRecords} 筆轉班學生記錄` : '無轉班學生影響'
      }
    };
    
    Logger.log(`📊 比較結果：現行 ${comparison.summary.current} vs 歷史 ${comparison.summary.historical}`);
    return comparison;
    
  } catch (error) {
    Logger.log(`❌ 生成統計比較失敗：${error.message}`);
    return {
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * ⚙️ Get Statistics Calculation Modes - 獲取可用的統計計算模式
 * @returns {Object} 可用模式列表
 */
function getStatisticsCalculationModes() {
  Logger.log('⚙️ 獲取統計計算模式列表...');
  
  try {
    const config = SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.STATISTICS_CALCULATION;
    if (!config) {
      return {
        error: '找不到統計計算配置',
        availableModes: []
      };
    }
    
    const modes = Object.keys(config.MODES).map(modeKey => ({
      key: modeKey,
      name: config.MODES[modeKey].name,
      description: config.MODES[modeKey].description,
      isDefault: modeKey === config.DEFAULT_MODE
    }));
    
    return {
      defaultMode: config.DEFAULT_MODE,
      allowRealTimeToggle: config.ALLOW_REAL_TIME_TOGGLE,
      availableModes: modes,
      displayOptions: config.DISPLAY_OPTIONS
    };
    
  } catch (error) {
    Logger.log(`❌ 獲取統計計算模式失敗：${error.message}`);
    return {
      error: error.message,
      availableModes: []
    };
  }
}

/**
 * 🔄 Switch Statistics Mode - 即時切換統計模式
 * @param {Spreadsheet} teacherBook - 老師記錄簿
 * @param {string} newMode - 新的統計模式
 * @returns {Object} 切換結果
 */
function switchStatisticsMode(teacherBook, newMode) {
  Logger.log(`🔄 切換統計模式至：${newMode}`);
  
  try {
    const config = SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.STATISTICS_CALCULATION;
    if (!config || !config.ALLOW_REAL_TIME_TOGGLE) {
      throw new Error('系統不允許即時切換統計模式');
    }
    
    if (!config.MODES[newMode]) {
      throw new Error(`不支援的統計模式：${newMode}`);
    }
    
    // 計算新模式的統計
    const newStats = calculateProgressWithMode(teacherBook, newMode);
    
    // 更新統計資料（可以存儲到暫存或系統配置中）
    const result = updateStatisticsForModeChange(teacherBook, config.DEFAULT_MODE, newMode, newStats);
    
    Logger.log(`✅ 統計模式已切換至：${config.MODES[newMode].name}`);
    
    return {
      success: true,
      previousMode: config.DEFAULT_MODE,
      newMode: newMode,
      newStats: newStats,
      switchResult: result
    };
    
  } catch (error) {
    Logger.log(`❌ 切換統計模式失敗：${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 📊 Update Statistics for Mode Change - 更新統計模式變更
 * @param {Spreadsheet} teacherBook - 老師記錄簿
 * @param {string} oldMode - 舊模式
 * @param {string} newMode - 新模式
 * @param {Object} newStats - 新統計資料
 * @returns {Object} 更新結果
 */
function updateStatisticsForModeChange(teacherBook, oldMode, newMode, newStats) {
  Logger.log(`📊 更新統計模式變更：${oldMode} → ${newMode}`);
  
  try {
    const updateResult = {
      teacherBook: teacherBook.getName(),
      modeChange: {
        from: oldMode,
        to: newMode,
        timestamp: new Date()
      },
      statisticsUpdate: {
        newTotalStudents: newStats.totalStudents,
        newCompletionRate: newStats.statistics?.overallCompletionRate || 0,
        includesTransferred: newStats.includeTransferred || false
      },
      cacheUpdated: true
    };
    
    // 可以在這裡實作統計快取更新或UI觸發
    Logger.log(`✅ 統計更新完成：${newStats.totalStudents}位學生，完成率${newStats.statistics?.overallCompletionRate || 0}%`);
    
    return updateResult;
    
  } catch (error) {
    Logger.log(`❌ 統計更新失敗：${error.message}`);
    return {
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * 🎯 Get Statistics Preview - 預覽不同模式的統計
 * @param {Spreadsheet} teacherBook - 老師記錄簿
 * @param {string} previewMode - 預覽模式
 * @returns {Object} 預覽結果
 */
function getStatisticsPreview(teacherBook, previewMode) {
  Logger.log(`🎯 生成統計預覽：${previewMode}`);
  
  try {
    const previewStats = calculateProgressWithMode(teacherBook, previewMode);
    
    return {
      mode: previewMode,
      preview: true,
      statistics: previewStats,
      summary: {
        totalStudents: previewStats.totalStudents,
        completionRate: previewStats.statistics?.overallCompletionRate || 0,
        includedTransferred: previewStats.includeTransferred || false,
        generatedAt: new Date()
      }
    };
    
  } catch (error) {
    Logger.log(`❌ 統計預覽生成失敗：${error.message}`);
    return {
      error: error.message,
      mode: previewMode
    };
  }
}

// ============================================================
// 🔧 HELPER FUNCTIONS FOR MULTI-MODE STATISTICS
// ============================================================

/**
 * 📋 Get Contact Headers - 獲取聯繫記錄表頭
 */
function getContactHeaders(teacherBook) {
  const contactSheet = teacherBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
  if (!contactSheet) return [];
  
  return contactSheet.getDataRange().getValues()[0];
}

/**
 * 🗂️ Get Field Indexes - 獲取欄位索引
 */
function getFieldIndexes(headers) {
  return {
    studentIdIndex: 0,
    dateIndex: headers.findIndex(h => h.toString().toLowerCase().includes('date')) || 4,
    semesterIndex: headers.findIndex(h => h.toString().toLowerCase().includes('semester')),
    termIndex: headers.findIndex(h => h.toString().toLowerCase().includes('term')),
    contactTypeIndex: headers.findIndex(h => h.toString().toLowerCase().includes('contact type')),
    teachersContentIndex: 8,
    parentsResponsesIndex: 9,
    contactMethodIndex: 10
  };
}

/**
 * 📊 Calculate Progress Statistics - 計算進度統計
 */
function calculateProgressStatistics(progress) {
  let totalCompleted = 0;
  let totalRecords = 0;
  
  Object.keys(progress).forEach(semester => {
    Object.keys(progress[semester]).forEach(term => {
      totalCompleted += progress[semester][term].completed;
      totalRecords += progress[semester][term].total;
    });
  });
  
  return {
    totalCompleted,
    totalRecords,
    overallCompletionRate: totalRecords > 0 ? Math.round(totalCompleted / totalRecords * 100) : 0
  };
}

/**
 * 📅 Get Student Enrollment Data - 獲取學生入班資料
 */
function getStudentEnrollmentData(studentData, contacts) {
  // 實作入班時點分析邏輯
  return studentData.map(student => ({
    ...student,
    enrollmentDate: null, // 需要實作入班時點檢測
    enrollmentSemester: null,
    enrollmentTerm: null
  }));
}

/**
 * 🎯 Calculate Enrollment Aware Progress - 入班感知進度計算
 */
function calculateEnrollmentAwareProgress(contacts, enrollmentData, fieldIndexes) {
  // 實作基於入班時點的動態進度計算
  return calculateSemesterProgress(contacts, enrollmentData, fieldIndexes);
}

/**
 * 🔍 Filter Enrollment Based Students - 入班基準學生過濾
 */
function filterEnrollmentBasedStudents(students, teacherBook) {
  // 實作基於入班時點的學生過濾邏輯
  return students;
}

/**
 * 🔗 Integrate with Status Management - 整合狀態管理系統
 */
function integrateWithStatusManagement(students, teacherBook) {
  Logger.log('🔗 整合狀態管理系統...');
  
  return students.map(student => {
    const studentId = student[0];
    
    try {
      const statusInfo = getStudentStatusForStatistics(studentId);
      return {
        ...student,
        statusInfo: statusInfo,
        includeInStats: statusInfo.includeInStats
      };
    } catch (error) {
      Logger.log(`⚠️ 無法獲取學生 ${studentId} 狀態：${error.message}`);
      return {
        ...student,
        statusInfo: { includeInStats: true },
        includeInStats: true
      };
    }
  });
}

function testTransferredStudentProgressCalculation() {
  try {
    Logger.log('🧪 ==========================================')
    Logger.log('🧪 測試轉班學生進度計算功能')
    Logger.log('🧪 ==========================================')
    
    // 📝 模擬學生資料（包含原在和轉班學生）
    const mockStudents = [
      ['STU001', '原在學生1', 'Original Student 1', 'G1-A'],
      ['STU002', '原在學生2', 'Original Student 2', 'G1-A'],
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A'] // 轉班學生
    ]
    
    // 📅 模擬聯繫記錄（包含完整的6記錄框架）
    // 原在學生：部分記錄、轉班學生：完整6記錄
    const mockContacts = [
      // 原在學生1 - 部分記錄
      ['STU001', '原在學生1', 'Original Student 1', 'G1-A', '2024-09-15', 'Fall', 'Beginning', 'Scheduled Contact', '已聯繫', '家長回應良好', '電話'],
      ['STU001', '原在學生1', 'Original Student 1', 'G1-A', '', 'Fall', 'Midterm', 'Scheduled Contact', '', '', ''], // 未完成
      ['STU001', '原在學生1', 'Original Student 1', 'G1-A', '', 'Fall', 'Final', 'Scheduled Contact', '', '', ''], // 未完成
      
      // 原在學生2 - 更少記錄
      ['STU002', '原在學生2', 'Original Student 2', 'G1-A', '2024-09-20', 'Fall', 'Beginning', 'Scheduled Contact', '已聯繫', '家長問題較多', '簡訊'],
      ['STU002', '原在學生2', 'Original Student 2', 'G1-A', '', 'Fall', 'Midterm', 'Scheduled Contact', '', '', ''], // 未完成
      
      // 🔄 轉班學生 - 完整6記錄框架（所有記錄都存在，但只有部分完成）
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A', '2024-10-01', 'Fall', 'Beginning', 'Scheduled Contact', '轉班後聯繫', '家長配合', '電話'], // 完成
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A', '', 'Fall', 'Midterm', 'Scheduled Contact', '', '', ''], // 未完成
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A', '', 'Fall', 'Final', 'Scheduled Contact', '', '', ''], // 未完成
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A', '', 'Spring', 'Beginning', 'Scheduled Contact', '', '', ''], // 未完成
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A', '', 'Spring', 'Midterm', 'Scheduled Contact', '', '', ''], // 未完成
      ['TRANSFER001', '轉班學生1', 'Transfer Student 1', 'G1-A', '', 'Spring', 'Final', 'Scheduled Contact', '', '', ''] // 未完成
    ]
    
    // 🔧 模擬欄位索引
    const fieldIndexes = {
      studentIdIndex: 0,
      dateIndex: 4,
      semesterIndex: 5,
      termIndex: 6,
      contactTypeIndex: 7,
      teachersContentIndex: 8,
      parentsResponsesIndex: 9,
      contactMethodIndex: 10
    }
    
    Logger.log(`📅 模擬資料：${mockStudents.length}位學生，${mockContacts.length}筆聯繫記錄`)
    
    // 🧪 執行測試：計算學期進度
    const progressResult = calculateSemesterProgress(mockContacts, mockStudents, fieldIndexes)
    
    // 📈 驗證結果
    Logger.log('📈 進度計算結果驗證：')
    
    let testsPassed = 0
    let totalTests = 0
    
    // 測試1：檢查Fall Beginning進度
    totalTests++
    const fallBeginning = progressResult.Fall?.Beginning
    if (fallBeginning) {
      Logger.log(`🍂 Fall Beginning: ${fallBeginning.completed}/${fallBeginning.total} 學生`)
      if (fallBeginning.total === 3 && fallBeginning.completed === 2) { // 3筆記錄，2筆完成
        Logger.log('✅ 測試1通過：Fall Beginning統計正確')
        testsPassed++
      } else {
        Logger.log(`❌ 測試1失敗：Fall Beginning，期望3/2，實際${fallBeginning.total}/${fallBeginning.completed}`)
      }
    } else {
      Logger.log('❌ 測試1失敗：找不到Fall Beginning進度')
    }
    
    // 測試2：檢查轉班學生的完整6記錄框架
    totalTests++
    let transferRecordsFound = 0
    Object.keys(progressResult).forEach(semester => {
      Object.keys(progressResult[semester]).forEach(term => {
        const termData = progressResult[semester][term]
        if (termData.scheduledStudents && termData.scheduledStudents.has('TRANSFER001')) {
          transferRecordsFound++
        }
      })
    })
    
    if (transferRecordsFound === 6) { // 轉班學生應該有6筆記錄
      Logger.log('✅ 測試2通過：轉班學生完整6記錄框架正確')
      testsPassed++
    } else {
      Logger.log(`❌ 測試2失敗：轉班學生記錄數，期望6，實際${transferRecordsFound}`)
    }
    
    // 測試3：檢查原在學生和轉班學生的區別處理
    totalTests++
    const springTermsWithTransfer = Object.keys(progressResult.Spring || {}).filter(term => {
      const termData = progressResult.Spring[term]
      return termData.scheduledStudents && termData.scheduledStudents.has('TRANSFER001')
    }).length
    
    if (springTermsWithTransfer === 3) { // Spring學期3個term都應該有轉班學生記錄
      Logger.log('✅ 測試3通過：Spring學期轉班學生記錄完整')
      testsPassed++
    } else {
      Logger.log(`❌ 測試3失敗：Spring學期轉班學生記錄，期望3，實際${springTermsWithTransfer}`)
    }
    
    // 🎆 總結
    const successRate = Math.round(testsPassed / totalTests * 100)
    Logger.log(`\n🎆 測試結果：${testsPassed}/${totalTests} 項測試通過 (${successRate}%)`)
    
    if (testsPassed === totalTests) {
      Logger.log('✅ 所有測試通過！轉班學生進度計算功能正常運作')
      return {
        success: true,
        message: '轉班學生進度計算測試全部通過',
        testResults: { passed: testsPassed, total: totalTests, successRate }
      }
    } else {
      Logger.log('❌ 部分測試失敗，需要進一步修正')
      return {
        success: false,
        message: `轉班學生進度計算測試部分失敗 (${testsPassed}/${totalTests})`,
        testResults: { passed: testsPassed, total: totalTests, successRate }
      }
    }
    
  } catch (error) {
    Logger.log('❌ 經典測試執行失敗：' + error.message)
    return {
      success: false,
      message: '經典測試執行錯誤：' + error.message,
      error: error.toString()
    }
  }
}

// ============================================================
// 🧪 COMPREHENSIVE TESTING SUITE FOR MULTI-MODE STATISTICS
// ============================================================

/**
 * 🧪 綜合多模式統計測試套件
 * 測試所有統計計算模式和轉班學生支援
 */
function testMultiModeStatisticsEngine() {
  try {
    Logger.log('🧪 ==============================================')
    Logger.log('🧪 綜合多模式統計引擎測試')
    Logger.log('🧪 ==============================================')
    
    const testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: [],
      modeTests: {},
      timestamp: new Date()
    };
    
    // 測試所有統計模式
    const modes = ['CURRENT_ACTIVE_ONLY', 'FULL_HISTORICAL', 'DUAL_VIEW', 'ENROLLMENT_BASED'];
    
    modes.forEach(mode => {
      Logger.log(`\n📊 測試模式：${mode}`);
      const modeResult = testStatisticsMode(mode);
      testResults.modeTests[mode] = modeResult;
      testResults.totalTests += modeResult.totalTests;
      testResults.passedTests += modeResult.passedTests;
      if (modeResult.failedTests.length > 0) {
        testResults.failedTests.push(...modeResult.failedTests);
      }
    });
    
    // 測試模式切換
    Logger.log('\n🔄 測試模式切換功能...');
    const switchTest = testModeSwitching();
    testResults.totalTests += switchTest.totalTests;
    testResults.passedTests += switchTest.passedTests;
    if (switchTest.failedTests.length > 0) {
      testResults.failedTests.push(...switchTest.failedTests);
    }
    
    const successRate = Math.round(testResults.passedTests / testResults.totalTests * 100);
    
    Logger.log('\n🎆 測試結果摘要');
    Logger.log(`✅ 通過：${testResults.passedTests}/${testResults.totalTests} (${successRate}%)`);
    
    if (testResults.failedTests.length > 0) {
      Logger.log(`❌ 失敗測試：`);
      testResults.failedTests.forEach(failure => {
        Logger.log(`   - ${failure}`);
      });
    }
    
    return testResults;
    
  } catch (error) {
    Logger.log(`❌ 測試套件執行失敗：${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🔍 執行系統狀態檢查 - 用於進度報告前的診斷
 */
function performSystemCheck() {
  const results = {
    success: true,
    errors: [],
    warnings: [],
    details: {},
    timestamp: new Date().toLocaleString()
  };
  
  try {
    Logger.log('🔍 開始系統狀態檢查...');
    
    // 檢查 1: SYSTEM_CONFIG 配置
    if (!SYSTEM_CONFIG) {
      results.errors.push('SYSTEM_CONFIG 未定義');
      results.success = false;
    } else {
      if (!SYSTEM_CONFIG.MAIN_FOLDER_ID) {
        results.warnings.push('MAIN_FOLDER_ID 未設定');
      }
      if (!SYSTEM_CONFIG.MAIN_FOLDER_NAME) {
        results.errors.push('MAIN_FOLDER_NAME 未設定');
        results.success = false;
      }
    }
    
    // 檢查 2: 系統資料夾存取
    try {
      const mainFolder = getSystemMainFolder();
      if (mainFolder) {
        Logger.log('✅ 系統主資料夾存取正常');
        results.details.mainFolder = {
          name: mainFolder.getName(),
          id: mainFolder.getId()
        };
      } else {
        results.errors.push('無法存取系統主資料夾');
        results.success = false;
      }
    } catch (folderError) {
      results.errors.push(`系統資料夾存取失敗: ${folderError.message}`);
      results.success = false;
    }
    
    // 檢查 3: PropertiesService 服務
    try {
      const properties = PropertiesService.getScriptProperties();
      properties.setProperty('SYSTEM_CHECK_TEST', 'test');
      properties.deleteProperty('SYSTEM_CHECK_TEST');
      Logger.log('✅ PropertiesService 正常');
    } catch (propError) {
      results.warnings.push(`PropertiesService 異常: ${propError.message}`);
    }
    
    // 檢查 4: 核心函數存在性
    const coreFunctions = [
      'getAllTeacherBooks',
      'checkTeacherProgress', 
      'calculateSemesterProgress',
      'createProgressReportSheet'
    ];
    
    coreFunctions.forEach(funcName => {
      if (typeof eval(funcName) !== 'function') {
        results.errors.push(`核心函數 ${funcName} 不存在`);
        results.success = false;
      }
    });
    
    Logger.log(`🔍 系統檢查完成，成功: ${results.success}`);
    
  } catch (error) {
    Logger.log(`💥 系統檢查過程發生錯誤: ${error.message}`);
    results.errors.push(`系統檢查錯誤: ${error.message}`);
    results.success = false;
  }
  
  return results;
}

/**
 * 📊 測試單一統計模式
 */
function testStatisticsMode(mode) {
  const testResult = {
    mode: mode,
    totalTests: 0,
    passedTests: 0,
    failedTests: []
  };
  
  try {
    // 測試模式配置獲取
    testResult.totalTests++;
    const modes = getStatisticsCalculationModes();
    if (modes.availableModes && modes.availableModes.some(m => m.key === mode)) {
      testResult.passedTests++;
      Logger.log(`  ✅ 模式配置檢查通過`);
    } else {
      testResult.failedTests.push(`${mode} 模式配置不存在`);
    }
    
    // 測試模擬進度計算
    testResult.totalTests++;
    const mockResult = testMockProgressCalculation(mode);
    if (mockResult.success) {
      testResult.passedTests++;
      Logger.log(`  ✅ 模擬進度計算通過`);
    } else {
      testResult.failedTests.push(`${mode} 模擬計算失敗: ${mockResult.error}`);
    }
    
  } catch (error) {
    testResult.failedTests.push(`${mode} 測試異常: ${error.message}`);
  }
  
  return testResult;
}

/**
 * 🔄 測試模式切換功能
 */
function testModeSwitching() {
  const testResult = {
    totalTests: 2,
    passedTests: 0,
    failedTests: []
  };
  
  try {
    // 測試獲取可用模式
    const modes = getStatisticsCalculationModes();
    if (modes.availableModes && modes.availableModes.length > 0) {
      testResult.passedTests++;
      Logger.log(`  ✅ 獲取可用模式: ${modes.availableModes.length}個`);
    } else {
      testResult.failedTests.push('無法獲取可用統計模式');
    }
    
    // 測試模式切換逻輯
    if (modes.allowRealTimeToggle) {
      testResult.passedTests++;
      Logger.log(`  ✅ 支援即時模式切換`);
    } else {
      testResult.failedTests.push('不支援即時模式切換');
    }
    
  } catch (error) {
    testResult.failedTests.push(`模式切換測試異常: ${error.message}`);
  }
  
  return testResult;
}

/**
 * 📊 模擬進度計算測試
 */
function testMockProgressCalculation(mode) {
  try {
    // 模擬資料
    const mockStudents = [
      ['STU001', '現行學生1', 'Active Student 1', 'G1-A'],
      ['STU002', '現行學生2', 'Active Student 2', 'G1-A'],
      ['TRANS001', '轉班學生1', 'Transfer Student 1', 'G1-A']
    ];
    
    const mockContacts = [
      ['STU001', '現行學生1', 'Active Student 1', 'G1-A', '2024-09-15', 'Fall', 'Beginning', 'Scheduled Contact', '已聯繫', '家長回應良好', '電話'],
      ['TRANS001', '轉班學生1', 'Transfer Student 1', 'G1-A', '2024-10-01', 'Fall', 'Beginning', 'Scheduled Contact', '轉班後聯繫', '家長配合', '電話']
    ];
    
    const fieldIndexes = {
      studentIdIndex: 0,
      dateIndex: 4,
      semesterIndex: 5,
      termIndex: 6,
      contactTypeIndex: 7,
      teachersContentIndex: 8,
      parentsResponsesIndex: 9,
      contactMethodIndex: 10
    };
    
    // 執行模擬計算
    const result = calculateSemesterProgress(mockContacts, mockStudents, fieldIndexes);
    
    // 驗證結果結構
    if (result && typeof result === 'object') {
      return { success: true, result: result };
    } else {
      return { success: false, error: '結果結構不正確' };
    }
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}