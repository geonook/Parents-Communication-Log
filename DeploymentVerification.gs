/**
 * 部署驗證模組
 * 檢查所有必要函數是否正確部署到 Google Apps Script
 */

/**
 * 驗證部署完整性
 * 檢查所有關鍵函數是否存在
 */
function verifyDeployment() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    Logger.log('開始驗證部署完整性...');
    
    const verificationResults = performDeploymentCheck();
    
    // 顯示驗證結果
    displayDeploymentResults(verificationResults);
    
  } catch (error) {
    Logger.log('部署驗證失敗：' + error.toString());
    ui.alert('錯誤', '部署驗證失敗：' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * 執行部署檢查
 */
function performDeploymentCheck() {
  const results = {
    coreSystemFunctions: [],
    dashboardFunctions: [],
    utilityFunctions: [],
    progressFunctions: [],
    teacherFunctions: [],
    automationFunctions: [],
    validationFunctions: [],
    missingFunctions: [],
    summary: { total: 0, found: 0, missing: 0 }
  };
  
  // 定義所有關鍵函數
  const functionCategories = {
    coreSystemFunctions: [
      'createSystemFolders',
      'createTemplateFiles', 
      'createAdminConsole',
      'createStudentMasterListTemplate',
      'setupMasterListContent'
    ],
    dashboardFunctions: [
      'doGet',
      'doPost',
      'setupCompleteSystemWeb',
      'initializeSystemWeb',
      'getSystemStatusWeb',
      'checkAllProgressWeb'
    ],
    utilityFunctions: [
      'setupTemplateContent',
      'setupAdminConsole',
      'getAdminConsole',
      'getSystemMainFolder',
      'createTemplateSheets'
    ],
    progressFunctions: [
      'checkTeacherProgress',
      'checkAllProgress',
      'generateProgressReport',
      'calculateSemesterProgress'
    ],
    teacherFunctions: [
      'createTeacherSheet',
      'createTeachersFromStudentMasterList',
      'getAllTeacherBooks'
    ],
    automationFunctions: [
      'setupAutomationTriggers',
      'autoBackup',
      'autoProgressCheck'
    ],
    validationFunctions: [
      'runSystemValidation',
      'performSystemValidation',
      'validatePermissions'
    ]
  };
  
  // 檢查每個函數類別
  Object.keys(functionCategories).forEach(category => {
    functionCategories[category].forEach(functionName => {
      const exists = checkFunctionExists(functionName);
      const result = {
        name: functionName,
        exists: exists,
        category: category
      };
      
      results[category].push(result);
      results.summary.total++;
      
      if (exists) {
        results.summary.found++;
      } else {
        results.summary.missing++;
        results.missingFunctions.push(functionName);
      }
    });
  });
  
  return results;
}

/**
 * 檢查函數是否存在
 */
function checkFunctionExists(functionName) {
  try {
    // 嘗試獲取函數
    const func = eval(functionName);
    return typeof func === 'function';
  } catch (error) {
    return false;
  }
}

/**
 * 顯示部署驗證結果
 */
function displayDeploymentResults(results) {
  const ui = SpreadsheetApp.getUi();
  
  let message = '🔍 部署驗證結果\n\n';
  message += `📊 總體統計：\n`;
  message += `• 總函數數量：${results.summary.total}\n`;
  message += `• ✅ 找到：${results.summary.found}\n`;
  message += `• ❌ 缺失：${results.summary.missing}\n`;
  message += `• 📈 完整度：${Math.round((results.summary.found / results.summary.total) * 100)}%\n\n`;
  
  // 按類別顯示結果
  if (results.missingFunctions.length === 0) {
    message += '🎉 恭喜！所有關鍵函數都已正確部署！\n\n';
    message += '✅ 核心系統函數：完整\n';
    message += '✅ Dashboard 功能：完整\n';
    message += '✅ 工具函數：完整\n';
    message += '✅ 進度追蹤：完整\n';
    message += '✅ 老師管理：完整\n';
    message += '✅ 自動化功能：完整\n';
    message += '✅ 驗證功能：完整\n\n';
    message += '系統已準備就緒，可以正常使用 Dashboard 功能！';
  } else {
    message += '⚠️ 發現缺失的函數：\n\n';
    
    // 按類別列出缺失的函數
    const categoriesChinese = {
      coreSystemFunctions: '核心系統函數',
      dashboardFunctions: 'Dashboard 功能', 
      utilityFunctions: '工具函數',
      progressFunctions: '進度追蹤',
      teacherFunctions: '老師管理',
      automationFunctions: '自動化功能',
      validationFunctions: '驗證功能'
    };
    
    Object.keys(categoriesChinese).forEach(category => {
      const missingInCategory = results[category].filter(f => !f.exists);
      if (missingInCategory.length > 0) {
        message += `❌ ${categoriesChinese[category]}：\n`;
        missingInCategory.forEach(func => {
          message += `   • ${func.name}\n`;
        });
        message += '\n';
      }
    });
    
    message += '建議執行 clasp push 重新部署所有檔案。';
  }
  
  // 記錄到日誌
  Logger.log('部署驗證完成 - 找到：' + results.summary.found + '，缺失：' + results.summary.missing);
  results.missingFunctions.forEach(func => {
    Logger.log('缺失函數：' + func);
  });
  
  ui.alert('部署驗證結果', message, ui.ButtonSet.OK);
}

/**
 * Web 版本的部署驗證（供 Dashboard 使用）
 */
function verifyDeploymentWeb() {
  try {
    const results = performDeploymentCheck();
    
    return {
      success: true,
      results: results,
      message: results.summary.missing === 0 ? 
        '所有函數都已正確部署！' : 
        `發現 ${results.summary.missing} 個缺失的函數`
    };
    
  } catch (error) {
    Logger.log('Web 部署驗證失敗：' + error.toString());
    return {
      success: false,
      message: error.message
    };
  }
}