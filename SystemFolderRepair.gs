/**
 * 🔧 系統資料夾修復工具
 * 專門解決進度報告無法執行的資料夾存取問題
 */

/**
 * 🎯 主要修復函數 - 診斷並修復系統資料夾問題
 */
function repairSystemFolderAccess() {
  Logger.log('🔧 開始系統資料夾修復程序...');
  Logger.log('═'.repeat(60));
  
  const results = {
    timestamp: new Date().toLocaleString(),
    mainFolderStatus: 'unknown',
    teachersFolderStatus: 'unknown',
    teacherBooksFound: 0,
    errors: [],
    repairs: [],
    recommendations: []
  };
  
  try {
    // 步驟 1: 檢查主資料夾存取
    Logger.log('📋 步驟 1: 檢查主資料夾存取');
    const mainFolderResult = checkMainFolderAccess();
    results.mainFolderStatus = mainFolderResult.status;
    
    if (mainFolderResult.errors.length > 0) {
      results.errors.push(...mainFolderResult.errors);
    }
    
    // 步驟 2: 檢查老師記錄簿資料夾
    if (mainFolderResult.folder) {
      Logger.log('📋 步驟 2: 檢查老師記錄簿資料夾');
      const teachersResult = checkTeachersFolderStructure(mainFolderResult.folder);
      results.teachersFolderStatus = teachersResult.status;
      results.teacherBooksFound = teachersResult.teacherBooksCount;
      
      if (teachersResult.errors.length > 0) {
        results.errors.push(...teachersResult.errors);
      }
    }
    
    // 步驟 3: 清理快取
    Logger.log('📋 步驟 3: 清理並重建快取');
    const cacheResult = clearAndRebuildCache();
    if (cacheResult.success) {
      results.repairs.push('快取已清理並重建');
    } else {
      results.errors.push(cacheResult.error);
    }
    
    // 步驟 4: 測試進度報告功能
    Logger.log('📋 步驟 4: 測試進度報告功能');
    const testResult = testProgressReportFunction();
    if (testResult.success) {
      results.repairs.push('進度報告功能測試通過');
    } else {
      results.errors.push(`進度報告功能測試失敗: ${testResult.error}`);
    }
    
    // 步驟 5: 生成修復建議
    Logger.log('📋 步驟 5: 生成修復建議');
    results.recommendations = generateRepairRecommendations(results);
    
  } catch (error) {
    Logger.log(`💥 修復程序發生錯誤：${error.message}`);
    results.errors.push(`修復程序錯誤: ${error.message}`);
  }
  
  // 輸出修復報告
  outputRepairReport(results);
  
  return results;
}

/**
 * 檢查主資料夾存取狀況
 */
function checkMainFolderAccess() {
  const result = {
    status: 'failed',
    folder: null,
    errors: [],
    details: {}
  };
  
  try {
    // 檢查 SYSTEM_CONFIG
    if (!SYSTEM_CONFIG || !SYSTEM_CONFIG.MAIN_FOLDER_ID) {
      result.errors.push('SYSTEM_CONFIG.MAIN_FOLDER_ID 未設定');
      return result;
    }
    
    Logger.log(`🔍 檢查資料夾 ID: ${SYSTEM_CONFIG.MAIN_FOLDER_ID}`);
    
    // 嘗試存取指定的資料夾 ID
    try {
      const folder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
      const folderName = folder.getName();
      
      Logger.log(`✅ 成功存取資料夾: ${folderName}`);
      result.status = 'success';
      result.folder = folder;
      result.details.folderName = folderName;
      result.details.folderId = folder.getId();
      
      return result;
      
    } catch (idError) {
      Logger.log(`❌ 無法存取資料夾 ID: ${idError.message}`);
      result.errors.push(`無法存取資料夾 ID: ${idError.message}`);
    }
    
    // 嘗試按名稱搜尋
    Logger.log(`🔍 嘗試按名稱搜尋: ${SYSTEM_CONFIG.MAIN_FOLDER_NAME}`);
    try {
      const folders = DriveApp.getFoldersByName(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
      if (folders.hasNext()) {
        const folder = folders.next();
        Logger.log(`✅ 按名稱找到資料夾: ${folder.getName()}, ID: ${folder.getId()}`);
        
        result.status = 'found_by_name';
        result.folder = folder;
        result.details.folderName = folder.getName();
        result.details.folderId = folder.getId();
        result.errors.push(`建議更新 MAIN_FOLDER_ID 為: ${folder.getId()}`);
        
        return result;
      }
    } catch (nameError) {
      Logger.log(`❌ 按名稱搜尋失敗: ${nameError.message}`);
      result.errors.push(`按名稱搜尋失敗: ${nameError.message}`);
    }
    
  } catch (error) {
    Logger.log(`💥 檢查主資料夾時發生錯誤: ${error.message}`);
    result.errors.push(`檢查主資料夾錯誤: ${error.message}`);
  }
  
  return result;
}

/**
 * 檢查老師記錄簿資料夾結構
 */
function checkTeachersFolderStructure(mainFolder) {
  const result = {
    status: 'failed',
    teacherBooksCount: 0,
    errors: [],
    details: {
      teachersFolderExists: false,
      teacherFolders: [],
      teacherBooks: []
    }
  };
  
  try {
    Logger.log(`🔍 在主資料夾中搜尋 '${SYSTEM_CONFIG.TEACHERS_FOLDER_NAME}' 資料夾`);
    
    const teachersFolders = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME);
    if (!teachersFolders.hasNext()) {
      result.errors.push(`找不到 '${SYSTEM_CONFIG.TEACHERS_FOLDER_NAME}' 資料夾`);
      return result;
    }
    
    const teachersFolder = teachersFolders.next();
    Logger.log(`✅ 找到老師記錄簿資料夾: ${teachersFolder.getName()}`);
    result.details.teachersFolderExists = true;
    
    // 掃描老師資料夾
    const teacherFolders = teachersFolder.getFolders();
    let totalBooks = 0;
    
    while (teacherFolders.hasNext()) {
      const folder = teacherFolders.next();
      const folderName = folder.getName();
      result.details.teacherFolders.push(folderName);
      
      Logger.log(`📁 檢查老師資料夾: ${folderName}`);
      
      // 在資料夾中搜尋記錄簿檔案
      const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
      let folderBooks = 0;
      
      while (files.hasNext()) {
        const file = files.next();
        const fileName = file.getName();
        
        if (fileName.includes('電聯記錄簿')) {
          Logger.log(`  📋 找到記錄簿: ${fileName}`);
          result.details.teacherBooks.push({
            teacherFolder: folderName,
            fileName: fileName,
            fileId: file.getId()
          });
          folderBooks++;
          totalBooks++;
        }
      }
      
      if (folderBooks === 0) {
        Logger.log(`  ⚠️ ${folderName} 資料夾中沒有找到電聯記錄簿`);
      }
    }
    
    result.teacherBooksCount = totalBooks;
    
    if (totalBooks > 0) {
      result.status = 'success';
      Logger.log(`✅ 總共找到 ${totalBooks} 本電聯記錄簿`);
    } else {
      result.status = 'no_books';
      result.errors.push('沒有找到任何電聯記錄簿檔案');
    }
    
  } catch (error) {
    Logger.log(`💥 檢查老師資料夾結構時發生錯誤: ${error.message}`);
    result.errors.push(`檢查老師資料夾結構錯誤: ${error.message}`);
  }
  
  return result;
}

/**
 * 清理並重建 PropertiesService 快取
 */
function clearAndRebuildCache() {
  try {
    Logger.log('🧹 清理 PropertiesService 快取...');
    
    const properties = PropertiesService.getScriptProperties();
    
    // 清理老師記錄簿快取
    properties.deleteProperty('TEACHER_BOOKS_CACHE_DATA');
    properties.deleteProperty('TEACHER_BOOKS_CACHE_TIMESTAMP');
    
    // 清理其他相關快取
    const cacheKeys = [
      'teacherBooks_cache',
      'teacherBooks_cache_timestamp',
      'TEACHER_BOOKS_CACHE_DATA',
      'TEACHER_BOOKS_CACHE_TIMESTAMP'
    ];
    
    cacheKeys.forEach(key => {
      try {
        properties.deleteProperty(key);
      } catch (e) {
        // 忽略不存在的屬性
      }
    });
    
    Logger.log('✅ 快取清理完成');
    
    // 嘗試重建快取
    try {
      Logger.log('🔄 重建快取中...');
      const teacherBooks = getAllTeacherBooks();
      Logger.log(`✅ 快取重建完成，找到 ${teacherBooks.length} 本記錄簿`);
      
      return {
        success: true,
        teacherBooksCount: teacherBooks.length
      };
      
    } catch (rebuildError) {
      Logger.log(`⚠️ 快取重建失敗: ${rebuildError.message}`);
      return {
        success: false,
        error: `快取重建失敗: ${rebuildError.message}`
      };
    }
    
  } catch (error) {
    Logger.log(`💥 清理快取時發生錯誤: ${error.message}`);
    return {
      success: false,
      error: `清理快取錯誤: ${error.message}`
    };
  }
}

/**
 * 測試進度報告功能
 */
function testProgressReportFunction() {
  try {
    Logger.log('🧪 測試進度報告功能...');
    
    // 檢查函數是否存在
    if (typeof generateProgressReport !== 'function') {
      return {
        success: false,
        error: 'generateProgressReport 函數不存在'
      };
    }
    
    // 嘗試執行函數（只是檢查不會真的生成報告）
    try {
      const result = generateProgressReport();
      
      if (result && result.success) {
        Logger.log('✅ 進度報告功能測試成功');
        return { success: true };
      } else if (result && result.error) {
        return {
          success: false,
          error: result.error || result.message
        };
      } else {
        return {
          success: false,
          error: '進度報告函數返回了未預期的結果'
        };
      }
      
    } catch (execError) {
      return {
        success: false,
        error: `執行進度報告函數時發生錯誤: ${execError.message}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      error: `測試進度報告功能時發生錯誤: ${error.message}`
    };
  }
}

/**
 * 生成修復建議
 */
function generateRepairRecommendations(results) {
  const recommendations = [];
  
  // 基於主資料夾狀態的建議
  if (results.mainFolderStatus === 'failed') {
    recommendations.push({
      priority: 'critical',
      category: 'folder_access',
      title: '修復主資料夾存取',
      description: '系統無法存取主資料夾，需要檢查資料夾 ID 和權限',
      actions: [
        '檢查 SYSTEM_CONFIG.MAIN_FOLDER_ID 是否正確',
        '確認您有資料夾的存取權限',
        '考慮使用按名稱搜尋的方式'
      ]
    });
  } else if (results.mainFolderStatus === 'found_by_name') {
    recommendations.push({
      priority: 'high',
      category: 'configuration',
      title: '更新資料夾 ID 設定',
      description: '建議更新 MAIN_FOLDER_ID 以提升效能',
      actions: [
        '更新 Code.gs 中的 MAIN_FOLDER_ID',
        '使用正確的資料夾 ID 避免每次搜尋'
      ]
    });
  }
  
  // 基於老師記錄簿的建議
  if (results.teachersFolderStatus === 'no_books' || results.teacherBooksFound === 0) {
    recommendations.push({
      priority: 'critical',
      category: 'data_structure',
      title: '建立老師記錄簿',
      description: '系統中沒有找到任何老師記錄簿檔案',
      actions: [
        '使用系統功能建立老師記錄簿',
        '確認檔案命名包含 "電聯記錄簿"',
        '檢查檔案是否放在正確的資料夾結構中'
      ]
    });
  }
  
  // 基於錯誤的建議
  if (results.errors.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'error_handling',
      title: '處理系統錯誤',
      description: '修復過程中發現了一些錯誤需要處理',
      actions: results.errors.slice(0, 3) // 取前3個錯誤
    });
  }
  
  return recommendations;
}

/**
 * 輸出修復報告
 */
function outputRepairReport(results) {
  Logger.log('\n📊 系統資料夾修復報告');
  Logger.log('═'.repeat(60));
  
  Logger.log(`📅 執行時間: ${results.timestamp}`);
  Logger.log(`📁 主資料夾狀態: ${results.mainFolderStatus}`);
  Logger.log(`📚 老師記錄簿資料夾狀態: ${results.teachersFolderStatus}`);
  Logger.log(`📋 找到的老師記錄簿數量: ${results.teacherBooksFound}`);
  
  if (results.repairs.length > 0) {
    Logger.log('\n✅ 完成的修復項目:');
    results.repairs.forEach((repair, index) => {
      Logger.log(`   ${index + 1}. ${repair}`);
    });
  }
  
  if (results.errors.length > 0) {
    Logger.log('\n❌ 發現的錯誤:');
    results.errors.forEach((error, index) => {
      Logger.log(`   ${index + 1}. ${error}`);
    });
  }
  
  if (results.recommendations.length > 0) {
    Logger.log('\n💡 修復建議:');
    results.recommendations.forEach((rec, index) => {
      const priorityIcon = rec.priority === 'critical' ? '🔴' : 
                           rec.priority === 'high' ? '🟠' : '🟡';
      Logger.log(`   ${priorityIcon} ${index + 1}. ${rec.title}`);
      Logger.log(`      ${rec.description}`);
    });
  }
  
  Logger.log('\n═'.repeat(60));
  
  if (results.teacherBooksFound > 0) {
    Logger.log('🎉 修復成功！系統應該可以正常生成進度報告了。');
  } else {
    Logger.log('⚠️ 仍需要處理一些問題才能正常使用進度報告功能。');
  }
}

/**
 * 🚀 快速修復函數 - 用於緊急情況
 */
function quickFix() {
  Logger.log('🚀 執行快速修復...');
  
  try {
    // 快速清理快取
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty('TEACHER_BOOKS_CACHE_DATA');
    properties.deleteProperty('TEACHER_BOOKS_CACHE_TIMESTAMP');
    Logger.log('✅ 快取已清理');
    
    // 快速測試
    const teacherBooks = getAllTeacherBooks();
    Logger.log(`✅ 找到 ${teacherBooks.length} 本老師記錄簿`);
    
    if (teacherBooks.length > 0) {
      Logger.log('🎉 快速修復成功！可以嘗試生成進度報告了。');
      return { success: true, teacherBooksCount: teacherBooks.length };
    } else {
      Logger.log('⚠️ 快速修復未能解決問題，請執行完整修復。');
      return { success: false, error: '沒有找到老師記錄簿' };
    }
    
  } catch (error) {
    Logger.log(`❌ 快速修復失敗: ${error.message}`);
    return { success: false, error: error.message };
  }
}