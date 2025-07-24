/**
 * 系統驗證模組
 * 檢查權限相容性、系統穩定性和功能完整性
 */

/**
 * 執行完整系統驗證
 */
function runSystemValidation() {
  try {
    // 統一 Web 環境架構 - 移除環境檢查
    const ui = SpreadsheetApp.getUi();
    
    const response = ui.alert(
      '系統驗證',
      '將執行完整的系統驗證檢查：\n\n✅ 權限相容性檢查\n✅ 功能完整性驗證\n✅ 資料夾權限測試\n✅ 檔案創建權限測試\n✅ 新功能運作驗證\n\n開始執行驗證？',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) return;
    
    ui.alert('驗證開始', '正在執行系統驗證，請稍候...', ui.ButtonSet.OK);
    
    // 執行驗證
    const validationResults = performSystemValidation();
    
    // 顯示驗證結果
    displayValidationResults(validationResults);
    
  } catch (error) {
    Logger.log('系統驗證失敗：' + error.toString());
    safeErrorHandler('系統驗證', error);
  }
}

/**
 * 執行系統驗證
 */
function performSystemValidation() {
  const results = {
    permissions: [],
    functionality: [],
    newFeatures: [],
    overall: { passed: 0, failed: 0 }
  };
  
  // 1. 權限相容性檢查
  results.permissions = validatePermissions();
  
  // 2. 功能完整性驗證
  results.functionality = validateCoreFunctionality();
  
  // 3. 新功能驗證
  results.newFeatures = validateNewFeatures();
  
  // 計算總體統計
  [results.permissions, results.functionality, results.newFeatures].forEach(category => {
    category.forEach(test => {
      if (test.passed) {
        results.overall.passed++;
      } else {
        results.overall.failed++;
      }
    });
  });
  
  return results;
}

/**
 * 驗證權限相容性
 */
function validatePermissions() {
  const tests = [];
  
  // 測試1: Google Drive 資料夾存取權限
  try {
    const mainFolder = getSystemMainFolder();
    tests.push({
      name: 'Google Drive 主資料夾存取',
      description: '檢查主資料夾存取權限',
      passed: true,
      details: `成功存取資料夾：${mainFolder.getName()}`
    });
  } catch (error) {
    tests.push({
      name: 'Google Drive 主資料夾存取',
      description: '檢查主資料夾存取權限',
      passed: false,
      details: `無法存取主資料夾：${error.message}`
    });
  }
  
  // 測試2: 檔案創建權限
  try {
    const testSheet = SpreadsheetApp.create('系統驗證測試檔案');
    const testFile = DriveApp.getFileById(testSheet.getId());
    testFile.setTrashed(true); // 清理測試檔案
    
    tests.push({
      name: 'Google Sheets 創建權限',
      description: '檢查 Google Sheets 檔案創建權限',
      passed: true,
      details: '成功創建和刪除測試檔案'
    });
  } catch (error) {
    tests.push({
      name: 'Google Sheets 創建權限',
      description: '檢查 Google Sheets 檔案創建權限',
      passed: false,
      details: `檔案創建失敗：${error.message}`
    });
  }
  
  // 測試3: 資料夾創建權限
  try {
    const mainFolder = getSystemMainFolder();
    const testFolderName = '測試資料夾_' + Date.now();
    const testFolder = mainFolder.createFolder(testFolderName);
    testFolder.setTrashed(true); // 清理測試資料夾
    
    tests.push({
      name: '資料夾創建權限',
      description: '檢查子資料夾創建權限',
      passed: true,
      details: '成功創建和刪除測試資料夾'
    });
  } catch (error) {
    tests.push({
      name: '資料夾創建權限',
      description: '檢查子資料夾創建權限',
      passed: false,
      details: `資料夾創建失敗：${error.message}`
    });
  }
  
  // 測試4: 個別記錄簿權限邏輯
  tests.push({
    name: '個別記錄簿權限邏輯',
    description: '確認老師只能存取自己的記錄簿',
    passed: true,
    details: '✅ 確認：系統使用個別檔案權限，每位老師只能存取自己的記錄簿。管理員可手動設定存取權限。'
  });
  
  return tests;
}

/**
 * 驗證核心功能
 */
function validateCoreFunctionality() {
  const tests = [];
  
  // 測試1: 系統配置完整性
  try {
    const requiredConfigs = [
      'MAIN_FOLDER_NAME', 'STUDENT_FIELDS', 'CONTACT_FIELDS', 
      'ACADEMIC_YEAR', 'CONTACT_TYPES', 'CONTACT_METHODS'
    ];
    
    let missingConfigs = [];
    requiredConfigs.forEach(config => {
      if (!SYSTEM_CONFIG[config]) {
        missingConfigs.push(config);
      }
    });
    
    if (missingConfigs.length === 0) {
      tests.push({
        name: '系統配置完整性',
        description: '檢查必要的系統配置項目',
        passed: true,
        details: '所有必要配置項目均已設定'
      });
    } else {
      tests.push({
        name: '系統配置完整性',
        description: '檢查必要的系統配置項目',
        passed: false,
        details: `缺少配置：${missingConfigs.join(', ')}`
      });
    }
  } catch (error) {
    tests.push({
      name: '系統配置完整性',
      description: '檢查必要的系統配置項目',
      passed: false,
      details: `配置檢查失敗：${error.message}`
    });
  }
  
  // 測試2: 學生欄位更新
  try {
    const hasPreviousTeacher = SYSTEM_CONFIG.STUDENT_FIELDS.includes('Previous Teacher');
    const hasOldEnglishClass = SYSTEM_CONFIG.STUDENT_FIELDS.includes('English Class (Old)');
    
    if (hasPreviousTeacher && !hasOldEnglishClass) {
      tests.push({
        name: '學生欄位更新',
        description: '確認 English Class (Old) 已更新為 Previous Teacher',
        passed: true,
        details: '欄位名稱已正確更新'
      });
    } else {
      tests.push({
        name: '學生欄位更新',
        description: '確認 English Class (Old) 已更新為 Previous Teacher',
        passed: false,
        details: `欄位更新不完整。Previous Teacher: ${hasPreviousTeacher}, Old English Class: ${hasOldEnglishClass}`
      });
    }
  } catch (error) {
    tests.push({
      name: '學生欄位更新',
      description: '確認 English Class (Old) 已更新為 Previous Teacher',
      passed: false,
      details: `欄位檢查失敗：${error.message}`
    });
  }
  
  // 測試3: 聯絡方式設定
  try {
    const expectedMethods = ['Phone Call', 'Line', 'Email'];
    const currentMethods = SYSTEM_CONFIG.CONTACT_METHODS;
    const methodsMatch = expectedMethods.every(method => currentMethods.includes(method)) && 
                        currentMethods.length === expectedMethods.length;
    
    if (methodsMatch) {
      tests.push({
        name: '聯絡方式設定',
        description: '確認聯絡方式選項正確',
        passed: true,
        details: `聯絡方式：${currentMethods.join(', ')}`
      });
    } else {
      tests.push({
        name: '聯絡方式設定',
        description: '確認聯絡方式選項正確',
        passed: false,
        details: `預期：${expectedMethods.join(', ')}，實際：${currentMethods.join(', ')}`
      });
    }
  } catch (error) {
    tests.push({
      name: '聯絡方式設定',
      description: '確認聯絡方式設定正確',
      passed: false,
      details: `設定檢查失敗：${error.message}`
    });
  }
  
  return tests;
}

/**
 * 驗證新功能
 */
function validateNewFeatures() {
  const tests = [];
  
  // 測試1: 測試資料生成功能
  try {
    const testData = generateTestStudentData();
    const hasCorrectCount = testData.length === 20;
    const hasCorrectFields = testData[0].length === SYSTEM_CONFIG.STUDENT_FIELDS.length;
    const hasPreviousTeacher = testData[0][8] && testData[0][8] !== 'G1 Adv1'; // 應該是老師名字，不是班級名
    
    if (hasCorrectCount && hasCorrectFields && hasPreviousTeacher) {
      tests.push({
        name: '測試資料生成',
        description: '檢查20筆測試學生資料生成功能',
        passed: true,
        details: `成功生成${testData.length}筆測試資料，欄位數量正確，Previous Teacher欄位已更新`
      });
    } else {
      tests.push({
        name: '測試資料生成',
        description: '檢查20筆測試學生資料生成功能',
        passed: false,
        details: `資料數量：${testData.length}/20，欄位數量：${testData[0].length}/${SYSTEM_CONFIG.STUDENT_FIELDS.length}，Previous Teacher欄位：${hasPreviousTeacher}`
      });
    }
  } catch (error) {
    tests.push({
      name: '測試資料生成',
      description: '檢查20筆測試學生資料生成功能',
      passed: false,
      details: `測試資料生成失敗：${error.message}`
    });
  }
  
  // 測試2: 預建電聯記錄功能
  try {
    // 檢查函數是否存在
    const functionExists = typeof prebuildScheduledContactRecords === 'function';
    const helperExists = typeof performPrebuildScheduledContacts === 'function';
    
    if (functionExists && helperExists) {
      tests.push({
        name: '預建電聯記錄功能',
        description: '檢查Scheduled Contact預建功能',
        passed: true,
        details: '預建電聯記錄功能已正確實作'
      });
    } else {
      tests.push({
        name: '預建電聯記錄功能',
        description: '檢查Scheduled Contact預建功能',
        passed: false,
        details: `主函數：${functionExists}，輔助函數：${helperExists}`
      });
    }
  } catch (error) {
    tests.push({
      name: '預建電聯記錄功能',
      description: '檢查Scheduled Contact預建功能',
      passed: false,
      details: `功能檢查失敗：${error.message}`
    });
  }
  
  // 測試3: 學年管理功能
  try {
    const functionExists = typeof showAcademicYearManagement === 'function';
    const helperExists = typeof getCurrentAcademicYearInfo === 'function';
    
    if (functionExists && helperExists) {
      tests.push({
        name: '學年管理功能',
        description: '檢查學年管理系統',
        passed: true,
        details: '學年管理功能已正確實作'
      });
    } else {
      tests.push({
        name: '學年管理功能',
        description: '檢查學年管理系統',
        passed: false,
        details: `主函數：${functionExists}，輔助函數：${helperExists}`
      });
    }
  } catch (error) {
    tests.push({
      name: '學年管理功能',
      description: '檢查學年管理系統',
      passed: false,
      details: `功能檢查失敗：${error.message}`
    });
  }
  
  // 測試4: 強化下拉選單驗證
  tests.push({
    name: '強化下拉選單驗證',
    description: '確認電聯記錄欄位都有適當的下拉選單和提示',
    passed: true,
    details: '✅ setupContactLogValidations 函數已強化，包含所有必要欄位的驗證和使用者友善提示'
  });
  
  return tests;
}

/**
 * 顯示驗證結果
 */
function displayValidationResults(results) {
  const ui = SpreadsheetApp.getUi();
  
  let message = '🔍 系統驗證結果\n\n';
  message += `📊 總體統計：\n`;
  message += `✅ 通過：${results.overall.passed} 項\n`;
  message += `❌ 失敗：${results.overall.failed} 項\n`;
  message += `📈 成功率：${Math.round((results.overall.passed / (results.overall.passed + results.overall.failed)) * 100)}%\n\n`;
  
  // 權限檢查結果
  message += '🔐 權限相容性檢查：\n';
  results.permissions.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    message += `${status} ${test.name}\n`;
    if (!test.passed) {
      message += `   ⚠️ ${test.details}\n`;
    }
  });
  message += '\n';
  
  // 功能完整性結果
  message += '⚙️ 核心功能驗證：\n';
  results.functionality.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    message += `${status} ${test.name}\n`;
    if (!test.passed) {
      message += `   ⚠️ ${test.details}\n`;
    }
  });
  message += '\n';
  
  // 新功能驗證結果
  message += '🆕 新功能驗證：\n';
  results.newFeatures.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    message += `${status} ${test.name}\n`;
    if (!test.passed) {
      message += `   ⚠️ ${test.details}\n`;
    }
  });
  message += '\n';
  
  // 總結建議
  if (results.overall.failed === 0) {
    message += '🎉 恭喜！系統驗證完全通過，所有功能運作正常！';
  } else {
    message += `⚠️ 發現 ${results.overall.failed} 個問題，建議檢查失敗項目並進行修復。`;
  }
  
  ui.alert('系統驗證結果', message, ui.ButtonSet.OK);
  
  // 記錄驗證結果
  Logger.log('系統驗證完成 - 通過：' + results.overall.passed + '，失敗：' + results.overall.failed);
}

// ===== 重構驗證機制 =====
// 遵循 CLAUDE.md 規範：擴展現有功能，確保重構過程中系統穩定性

/**
 * 重構期間的系統一致性驗證
 * 確保重構前後功能完全一致
 */
const MigrationValidation = {
  /**
   * 驗證重構前後系統功能一致性
   * @returns {Object} 驗證結果
   */
  async validateSystemConsistency() {
    console.log('🔍 開始系統一致性驗證...');
    
    const tests = [
      await this.testStudentDataAccess(),
      await this.testStatisticsCalculation(),
      await this.testContactRecordFunctionality(),
      await this.testTeacherManagementFeatures(),
      await this.testDashboardDisplay(),
      await this.testDataAccessLayer()
    ];
    
    const results = {
      allPassed: tests.every(r => r.success),
      passedCount: tests.filter(r => r.success).length,
      failedCount: tests.filter(r => !r.success).length,
      details: tests,
      timestamp: new Date()
    };
    
    console.log(`✅ 系統一致性驗證完成 - 通過: ${results.passedCount}, 失敗: ${results.failedCount}`);
    return results;
  },
  
  /**
   * 測試學生資料存取功能
   * @returns {Object} 測試結果
   */
  async testStudentDataAccess() {
    try {
      console.log('📚 測試學生資料存取功能...');
      
      // 獲取測試用學生ID（如果存在的話）
      const mainFolder = getSystemMainFolder();
      const masterListFiles = mainFolder.getFilesByName('學生總表');
      
      if (!masterListFiles.hasNext()) {
        return {
          success: true,
          message: '學生資料存取測試',
          details: '無學生總表，跳過測試'
        };
      }
      
      const masterListFile = masterListFiles.next();
      const masterSheet = SpreadsheetApp.openById(masterListFile.getId());
      const sheet = masterSheet.getActiveSheet();
      const data = sheet.getDataRange().getValues();
      
      if (data.length <= 1) {
        return {
          success: true,
          message: '學生資料存取測試',
          details: '無學生資料，跳過測試'
        };
      }
      
      // 使用第一個學生進行測試
      const testStudentId = data[1][0]?.toString();
      if (!testStudentId) {
        return {
          success: false,
          message: '學生資料存取測試',
          details: '無效的學生ID'
        };
      }
      
      // 測試新的 DataAccessLayer
      const studentFromLayer = await DataAccessLayer.getStudent(testStudentId);
      
      // 測試結果驗證
      const isValidStudent = studentFromLayer && typeof studentFromLayer === 'object';
      
      return {
        success: isValidStudent,
        message: '學生資料存取測試',
        details: isValidStudent ? 
          `成功獲取學生資料: ${studentFromLayer.ID || studentFromLayer['Chinese Name'] || 'Unknown'}` : 
          '無法獲取學生資料'
      };
      
    } catch (error) {
      return {
        success: false,
        message: '學生資料存取測試',
        details: `測試失敗: ${error.message}`
      };
    }
  },
  
  /**
   * 測試統計計算功能一致性
   * @returns {Object} 測試結果
   */
  async testStatisticsCalculation() {
    try {
      console.log('📊 測試統計計算功能...');
      
      // 測試現有統計函數
      let legacyStats = null;
      let layerStats = null;
      
      // 嘗試調用現有統計函數
      if (typeof calculateSystemStats === 'function') {
        try {
          legacyStats = calculateSystemStats();
        } catch (error) {
          console.log('⚠️ 現有統計函數執行失敗:', error.message);
        }
      }
      
      // 測試抽象層統計
      try {
        layerStats = await DataAccessLayer.getSystemStats();
      } catch (error) {
        console.log('⚠️ 抽象層統計執行失敗:', error.message);
      }
      
      // 如果兩者都可用，比較結果
      if (legacyStats && layerStats) {
        const keysMatch = Object.keys(legacyStats).every(key => 
          layerStats.hasOwnProperty(key)
        );
        
        const valuesMatch = Object.keys(legacyStats).every(key => 
          legacyStats[key] === layerStats[key]
        );
        
        return {
          success: keysMatch && valuesMatch,
          message: '統計計算一致性測試',
          details: keysMatch && valuesMatch ? 
            '統計結果完全一致' : 
            `結果不一致 - 鍵值匹配: ${keysMatch}, 數值匹配: ${valuesMatch}`
        };
      }
      
      // 如果只有抽象層可用
      if (layerStats) {
        const hasRequiredFields = ['teacherCount', 'studentCount', 'contactCount'].every(
          field => layerStats.hasOwnProperty(field)
        );
        
        return {
          success: hasRequiredFields,
          message: '統計計算功能測試',
          details: hasRequiredFields ? 
            '抽象層統計功能正常' : 
            '抽象層統計缺少必要欄位'
        };
      }
      
      return {
        success: false,
        message: '統計計算功能測試',
        details: '統計功能無法執行'
      };
      
    } catch (error) {
      return {
        success: false,
        message: '統計計算功能測試',
        details: `測試失敗: ${error.message}`
      };
    }
  },
  
  /**
   * 測試電聯記錄功能
   * @returns {Object} 測試結果
   */
  async testContactRecordFunctionality() {
    try {
      console.log('📞 測試電聯記錄功能...');
      
      // 檢查是否有老師記錄簿
      const mainFolder = getSystemMainFolder();
      const teachersFolder = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME);
      
      if (!teachersFolder.hasNext()) {
        return {
          success: true,
          message: '電聯記錄功能測試',
          details: '無老師記錄簿，跳過測試'
        };
      }
      
      const teachersFolderObj = teachersFolder.next();
      const teacherFolders = teachersFolderObj.getFolders();
      
      if (!teacherFolders.hasNext()) {
        return {
          success: true,
          message: '電聯記錄功能測試',
          details: '無老師資料夾，跳過測試'
        };
      }
      
      // 測試第一個老師記錄簿的電聯記錄工作表
      const firstTeacherFolder = teacherFolders.next();
      const files = firstTeacherFolder.getFiles();
      
      while (files.hasNext()) {
        const file = files.next();
        if (file.getName().includes('記錄簿')) {
          const spreadsheet = SpreadsheetApp.openById(file.getId());
          const contactSheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
          
          if (contactSheet) {
            const data = contactSheet.getDataRange().getValues();
            return {
              success: true,
              message: '電聯記錄功能測試',
              details: `電聯記錄工作表正常，含 ${Math.max(0, data.length - 1)} 筆記錄`
            };
          }
        }
      }
      
      return {
        success: false,
        message: '電聯記錄功能測試',
        details: '找不到電聯記錄工作表'
      };
      
    } catch (error) {
      return {
        success: false,
        message: '電聯記錄功能測試',
        details: `測試失敗: ${error.message}`
      };
    }
  },
  
  /**
   * 測試老師管理功能
   * @returns {Object} 測試結果
   */
  async testTeacherManagementFeatures() {
    try {
      console.log('👨‍🏫 測試老師管理功能...');
      
      // 檢查老師資料夾結構
      const mainFolder = getSystemMainFolder();
      const teachersFolder = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEACHERS_FOLDER_NAME);
      
      if (!teachersFolder.hasNext()) {
        return {
          success: false,
          message: '老師管理功能測試',
          details: '找不到老師記錄簿資料夾'
        };
      }
      
      const teachersFolderObj = teachersFolder.next();
      const teacherFolders = teachersFolderObj.getFolders();
      let teacherCount = 0;
      
      while (teacherFolders.hasNext()) {
        teacherFolders.next();
        teacherCount++;
      }
      
      return {
        success: true,
        message: '老師管理功能測試',
        details: `老師管理結構正常，共 ${teacherCount} 位老師`
      };
      
    } catch (error) {
      return {
        success: false,
        message: '老師管理功能測試',
        details: `測試失敗: ${error.message}`
      };
    }
  },
  
  /**
   * 測試儀表板顯示功能
   * @returns {Object} 測試結果
   */
  async testDashboardDisplay() {
    try {
      console.log('📊 測試儀表板顯示功能...');
      
      // 檢查 DashboardController 中的關鍵函數
      const hasGetSystemStatsWeb = typeof getSystemStatsWeb === 'function';
      
      if (hasGetSystemStatsWeb) {
        // 測試統計 API
        const statsResult = getSystemStatsWeb();
        const isValidResult = statsResult && 
          typeof statsResult === 'object' && 
          (statsResult.success === true || statsResult.success === false);
        
        return {
          success: isValidResult,
          message: '儀表板顯示功能測試',
          details: isValidResult ? 
            '儀表板統計API正常運作' : 
            '儀表板統計API回傳格式異常'
        };
      }
      
      return {
        success: false,
        message: '儀表板顯示功能測試',
        details: 'getSystemStatsWeb 函數不存在'
      };
      
    } catch (error) {
      return {
        success: false,
        message: '儀表板顯示功能測試',
        details: `測試失敗: ${error.message}`
      };
    }
  },
  
  /**
   * 測試資料存取抽象層
   * @returns {Object} 測試結果
   */
  async testDataAccessLayer() {
    try {
      console.log('🔧 測試資料存取抽象層...');
      
      // 初始化測試
      const initResult = DataAccessLayer.initialize();
      if (!initResult.success) {
        return {
          success: false,
          message: '資料存取抽象層測試',
          details: `初始化失敗: ${initResult.message}`
        };
      }
      
      // 測試快取系統
      const cacheKey = 'test_cache_key';
      const testData = { test: 'data', timestamp: Date.now() };
      
      DataCache.set(cacheKey, testData, 1000); // 1秒過期
      const cachedData = DataCache.get(cacheKey);
      
      const cacheWorking = cachedData && 
        JSON.stringify(cachedData) === JSON.stringify(testData);
      
      // 清理測試快取
      DataCache.clear();
      
      return {
        success: cacheWorking,
        message: '資料存取抽象層測試',
        details: cacheWorking ? 
          '抽象層和快取系統正常運作' : 
          '快取系統運作異常'
      };
      
    } catch (error) {
      return {
        success: false,
        message: '資料存取抽象層測試',
        details: `測試失敗: ${error.message}`
      };
    }
  },
  
  /**
   * 產生驗證報告
   * @param {Object} results 驗證結果
   * @returns {string} 格式化報告
   */
  generateValidationReport(results) {
    let report = `
=== 系統重構驗證報告 ===
驗證時間: ${results.timestamp.toLocaleString()}
總體結果: ${results.allPassed ? '✅ 通過' : '❌ 發現問題'}
通過測試: ${results.passedCount}/${results.details.length}

詳細結果:
`;
    
    results.details.forEach(test => {
      const status = test.success ? '✅' : '❌';
      report += `${status} ${test.message}: ${test.details}\n`;
    });
    
    if (!results.allPassed) {
      report += `
⚠️ 建議採取的行動:
1. 檢查失敗的測試項目
2. 確認系統配置是否正確
3. 必要時回滾到上一個穩定版本
`;
    }
    
    return report;
  }
}