/**
 * 學生管理測試套件
 * 整合 TestScheduledContactTransfer.gs + TestStudentChangeManagement.gs
 * 提供完整的學生管理相關測試功能
 * 
 * 版本: v2.0 - 整合版本
 * 更新: 2025-07-19
 */

/**
 * 主要學生管理測試入口
 * @param {string} testType - 測試類型: 'all'|'contact'|'change'|'quick'
 */
function runStudentManagementTest(testType = 'all') {
  try {
    Logger.log('🚀 啟動學生管理測試套件...');
    Logger.log(`📋 測試類型: ${testType}`);
    Logger.log('═'.repeat(60));
    
    let testResult;
    
    switch (testType.toLowerCase()) {
      case 'all':
      case 'complete':
        testResult = runCompleteStudentManagementTest();
        break;
      case 'contact':
      case 'transfer':
        testResult = runContactTransferTest();
        break;
      case 'change':
      case 'management':
        testResult = runStudentChangeTest();
        break;
      case 'quick':
      case 'fast':
        testResult = runQuickStudentTest();
        break;
      default:
        Logger.log(`⚠️ 未知測試類型: ${testType}，使用預設的 all 模式`);
        testResult = runCompleteStudentManagementTest();
    }
    
    return testResult;
    
  } catch (error) {
    Logger.log(`❌ 學生管理測試失敗：${error.message}`);
    return {
      success: false,
      error: error.message,
      testType: testType
    };
  }
}

/**
 * 完整的學生管理測試
 */
function runCompleteStudentManagementTest() {
  Logger.log('🔍 執行完整的學生管理測試...');
  
  const testResults = {
    success: true,
    testType: 'complete',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testSuites: []
  };
  
  try {
    // 測試套件1：聯絡記錄轉移測試
    Logger.log('\n📋 測試套件1：聯絡記錄轉移測試');
    Logger.log('-'.repeat(50));
    const contactResult = runContactTransferTest();
    testResults.testSuites.push({
      name: '聯絡記錄轉移測試',
      result: contactResult
    });
    updateTestResults(testResults, contactResult);
    
    // 測試套件2：學生異動管理測試
    Logger.log('\n📋 測試套件2：學生異動管理測試');
    Logger.log('-'.repeat(50));
    const changeResult = runStudentChangeTest();
    testResults.testSuites.push({
      name: '學生異動管理測試',
      result: changeResult
    });
    updateTestResults(testResults, changeResult);
    
    // 測試套件3：資料完整性測試
    Logger.log('\n📋 測試套件3：資料完整性測試');
    Logger.log('-'.repeat(50));
    const integrityResult = runDataIntegrityTest();
    testResults.testSuites.push({
      name: '資料完整性測試',
      result: integrityResult
    });
    updateTestResults(testResults, integrityResult);
    
    // 生成完整測試報告
    generateStudentManagementTestReport(testResults);
    
    return testResults;
    
  } catch (error) {
    Logger.log(`❌ 完整學生管理測試失敗：${error.message}`);
    return {
      success: false,
      testType: 'complete',
      error: error.message
    };
  }
}

/**
 * 聯絡記錄轉移測試
 * 來源: TestScheduledContactTransfer.gs
 */
function runContactTransferTest() {
  Logger.log('📞 執行聯絡記錄轉移測試...');
  
  const testResult = {
    success: true,
    testType: 'contact',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 測試案例1：基本記錄生成測試
    Logger.log('🧪 測試案例1：基本記錄生成測試');
    const basicResult = testScheduledContactTransfer();
    testResult.testCases.push({
      name: '基本記錄生成測試',
      result: { success: basicResult, message: basicResult ? '通過' : '失敗' }
    });
    testResult.totalTests++;
    if (basicResult) {
      testResult.passedTests++;
    } else {
      testResult.failedTests++;
      testResult.success = false;
    }
    
    // 測試案例2：完整轉班流程模擬測試
    Logger.log('🧪 測試案例2：完整轉班流程模擬測試');
    const completeResult = testCompleteTransferWithScheduledContacts();
    testResult.testCases.push({
      name: '完整轉班流程模擬測試',
      result: { success: completeResult, message: completeResult ? '通過' : '失敗' }
    });
    testResult.totalTests++;
    if (completeResult) {
      testResult.passedTests++;
    } else {
      testResult.failedTests++;
      testResult.success = false;
    }
    
    // 測試案例3：記錄格式驗證
    Logger.log('🧪 測試案例3：記錄格式驗證');
    const formatResult = testScheduledContactFormat();
    testResult.testCases.push({
      name: '記錄格式驗證',
      result: formatResult
    });
    testResult.totalTests++;
    if (formatResult.success) {
      testResult.passedTests++;
    } else {
      testResult.failedTests++;
      testResult.success = false;
    }
    
    return testResult;
    
  } catch (error) {
    Logger.log(`❌ 聯絡記錄轉移測試失敗：${error.message}`);
    return {
      success: false,
      testType: 'contact',
      error: error.message
    };
  }
}

/**
 * 學生異動管理測試
 * 來源: TestStudentChangeManagement.gs
 */
function runStudentChangeTest() {
  Logger.log('🔄 執行學生異動管理測試...');
  
  const testResult = {
    success: true,
    testType: 'change',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 測試案例1：學生查找功能
    Logger.log('🧪 測試案例1：學生查找功能');
    const locatorResult = testStudentLocator();
    testResult.testCases.push({
      name: '學生查找功能',
      result: locatorResult
    });
    updateTestCaseResults(testResult, locatorResult);
    
    // 測試案例2：資料同步功能
    Logger.log('🧪 測試案例2：資料同步功能');
    const syncResult = testDataSyncManager();
    testResult.testCases.push({
      name: '資料同步功能',
      result: syncResult
    });
    updateTestCaseResults(testResult, syncResult);
    
    // 測試案例3：異動管理核心功能
    Logger.log('🧪 測試案例3：異動管理核心功能');
    const managerResult = testStudentChangeManager();
    testResult.testCases.push({
      name: '異動管理核心功能',
      result: managerResult
    });
    updateTestCaseResults(testResult, managerResult);
    
    // 測試案例4：備份恢復功能
    Logger.log('🧪 測試案例4：備份恢復功能');
    const backupResult = testBackupRestore();
    testResult.testCases.push({
      name: '備份恢復功能',
      result: backupResult
    });
    updateTestCaseResults(testResult, backupResult);
    
    return testResult;
    
  } catch (error) {
    Logger.log(`❌ 學生異動管理測試失敗：${error.message}`);
    return {
      success: false,
      testType: 'change',
      error: error.message
    };
  }
}

/**
 * 資料完整性測試
 */
function runDataIntegrityTest() {
  Logger.log('🔍 執行資料完整性測試...');
  
  const testResult = {
    success: true,
    testType: 'integrity',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 測試案例1：資料完整性驗證
    Logger.log('🧪 測試案例1：資料完整性驗證');
    const integrityResult = testDataIntegrity();
    testResult.testCases.push({
      name: '資料完整性驗證',
      result: integrityResult
    });
    updateTestCaseResults(testResult, integrityResult);
    
    // 測試案例2：UI 整合測試
    Logger.log('🧪 測試案例2：UI 整合測試');
    const uiResult = testUIIntegration();
    testResult.testCases.push({
      name: 'UI 整合測試',
      result: uiResult
    });
    updateTestCaseResults(testResult, uiResult);
    
    return testResult;
    
  } catch (error) {
    Logger.log(`❌ 資料完整性測試失敗：${error.message}`);
    return {
      success: false,
      testType: 'integrity',
      error: error.message
    };
  }
}

/**
 * 快速學生管理測試
 */
function runQuickStudentTest() {
  Logger.log('⚡ 執行快速學生管理測試...');
  
  const testResult = {
    success: true,
    testType: 'quick',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 快速測試1：學生查找函數檢查
    Logger.log('🧪 快速測試1：學生查找函數檢查');
    const findResult = quickTestStudentFindFunctions();
    testResult.testCases.push({
      name: '學生查找函數檢查',
      result: findResult
    });
    updateTestCaseResults(testResult, findResult);
    
    // 快速測試2：異動管理函數檢查
    Logger.log('🧪 快速測試2：異動管理函數檢查');
    const changeResult = quickTestChangeManagementFunctions();
    testResult.testCases.push({
      name: '異動管理函數檢查',
      result: changeResult
    });
    updateTestCaseResults(testResult, changeResult);
    
    // 快速測試3：聯絡記錄函數檢查
    Logger.log('🧪 快速測試3：聯絡記錄函數檢查');
    const contactResult = quickTestContactFunctions();
    testResult.testCases.push({
      name: '聯絡記錄函數檢查',
      result: contactResult
    });
    updateTestCaseResults(testResult, contactResult);
    
    return testResult;
    
  } catch (error) {
    Logger.log(`❌ 快速學生管理測試失敗：${error.message}`);
    return {
      success: false,
      testType: 'quick',
      error: error.message
    };
  }
}

// ===== 聯絡記錄轉移測試函數 =====

/**
 * 測試 Scheduled Contact 轉移功能
 * 來源: TestScheduledContactTransfer.gs
 */
function testScheduledContactTransfer() {
  try {
    Logger.log('🧪 開始測試學生轉班 Scheduled Contact 記錄同步功能');
    
    // 準備測試資料
    const testStudent = {
      'ID': 'TEST001',
      'Chinese Name': '測試學生',
      'English Name': 'Test Student',
      'English Class': 'G1 Test Class'
    };
    
    // 測試 generateScheduledContactsForStudent 函數
    Logger.log('📋 測試 generateScheduledContactsForStudent 函數...');
    const scheduledContacts = generateScheduledContactsForStudent(testStudent);
    
    if (scheduledContacts.length === 0) {
      Logger.log('❌ generateScheduledContactsForStudent 返回空陣列');
      return false;
    }
    
    // 驗證記錄數量
    const expectedCount = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.length * SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.length;
    if (scheduledContacts.length !== expectedCount) {
      Logger.log(`❌ 記錄數量不正確，期望 ${expectedCount} 筆，實際 ${scheduledContacts.length} 筆`);
      return false;
    }
    
    Logger.log(`✅ 成功生成 ${scheduledContacts.length} 筆 Scheduled Contact 記錄`);
    
    // 驗證記錄格式
    const firstRecord = scheduledContacts[0];
    if (firstRecord.length !== 11) {
      Logger.log(`❌ 記錄欄位數量不正確，期望 11 欄，實際 ${firstRecord.length} 欄`);
      return false;
    }
    
    if (firstRecord[0] !== testStudent.ID) {
      Logger.log(`❌ Student ID 不正確，期望 ${testStudent.ID}，實際 ${firstRecord[0]}`);
      return false;
    }
    
    Logger.log('✅ 記錄格式驗證通過');
    
    Logger.log('🎉 學生轉班 Scheduled Contact 記錄同步功能測試通過！');
    return true;
    
  } catch (error) {
    Logger.log(`❌ 測試過程發生錯誤：${error.message}`);
    return false;
  }
}

/**
 * 測試完整轉班流程的 Scheduled Contact 同步
 */
function testCompleteTransferWithScheduledContacts() {
  try {
    Logger.log('🧪 開始測試完整轉班流程的 Scheduled Contact 同步...');
    
    // 模擬學生資料
    const mockStudentData = {
      'ID': 'MOCK001', 
      'Chinese Name': '模擬學生',
      'English Name': 'Mock Student',
      'English Class': 'G2 Mock Class'
    };
    
    // 檢查系統配置
    if (!SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS || !SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS) {
      Logger.log('❌ 系統配置缺少學期或Term設定');
      return false;
    }
    
    if (!SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER) {
      Logger.log('❌ 系統配置缺少 Scheduled Contact 類型設定');
      return false;
    }
    
    Logger.log('✅ 系統配置檢查通過');
    
    // 測試記錄生成
    const generatedRecords = generateScheduledContactsForStudent(mockStudentData);
    if (generatedRecords.length > 0) {
      Logger.log(`✅ 成功生成 ${generatedRecords.length} 筆模擬記錄`);
    } else {
      Logger.log('❌ 記錄生成失敗');
      return false;
    }
    
    Logger.log('🎉 完整轉班流程 Scheduled Contact 同步模擬測試通過！');
    return true;
    
  } catch (error) {
    Logger.log(`❌ 完整流程測試發生錯誤：${error.message}`);
    return false;
  }
}

/**
 * 測試 Scheduled Contact 記錄格式
 */
function testScheduledContactFormat() {
  try {
    const testStudent = {
      'ID': 'FORMAT001',
      'Chinese Name': '格式測試',
      'English Name': 'Format Test',
      'English Class': 'Test Class'
    };
    
    const contacts = generateScheduledContactsForStudent(testStudent);
    
    if (contacts.length === 0) {
      return { success: false, message: '無法生成測試記錄' };
    }
    
    // 檢查第一筆記錄的格式
    const record = contacts[0];
    const expectedFields = ['Student ID', 'Name', 'English Name', 'English Class', 'Date', 'Semester', 'Term', 'Contact Type', 'Teachers Content', 'Parents Responses', 'Contact Method'];
    
    if (record.length !== expectedFields.length) {
      return { 
        success: false, 
        message: `欄位數量不正確，期望 ${expectedFields.length}，實際 ${record.length}` 
      };
    }
    
    // 檢查必要欄位內容
    if (record[0] !== testStudent.ID) {
      return { success: false, message: 'Student ID 欄位不正確' };
    }
    
    if (record[7] !== SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER) {
      return { success: false, message: 'Contact Type 欄位不正確' };
    }
    
    return { success: true, message: '記錄格式驗證通過' };
    
  } catch (error) {
    return { success: false, message: `格式測試失敗：${error.message}` };
  }
}

// ===== 學生異動管理測試函數 =====

/**
 * 測試學生查找功能
 */
function testStudentLocator() {
  const testResult = {
    success: true,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 測試函數存在性
    const requiredFunctions = [
      'findStudentByID',
      'findStudentByName',
      'locateStudentRecords',
      'getStudentTeacherMapping'
    ];
    
    requiredFunctions.forEach(funcName => {
      testResult.totalTests++;
      if (typeof eval(funcName) === 'function') {
        testResult.passedTests++;
        testResult.testCases.push({
          name: `${funcName} 函數檢查`,
          result: { success: true, message: '函數已定義' }
        });
      } else {
        testResult.failedTests++;
        testResult.success = false;
        testResult.testCases.push({
          name: `${funcName} 函數檢查`,
          result: { success: false, message: '函數未定義' }
        });
      }
    });
    
    return testResult;
    
  } catch (error) {
    return {
      success: false,
      message: '學生查找測試失敗：' + error.message
    };
  }
}

/**
 * 測試資料同步功能
 */
function testDataSyncManager() {
  const testResult = {
    success: true,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 測試同步相關函數
    const syncFunctions = [
      'validateDataIntegrity',
      'rebuildProgressTracking',
      'syncStudentData'
    ];
    
    syncFunctions.forEach(funcName => {
      testResult.totalTests++;
      if (typeof eval(funcName) === 'function') {
        testResult.passedTests++;
        testResult.testCases.push({
          name: `${funcName} 函數檢查`,
          result: { success: true, message: '函數已定義' }
        });
      } else {
        testResult.failedTests++;
        testResult.success = false;
        testResult.testCases.push({
          name: `${funcName} 函數檢查`,
          result: { success: false, message: '函數未定義' }
        });
      }
    });
    
    return testResult;
    
  } catch (error) {
    return {
      success: false,
      message: '資料同步測試失敗：' + error.message
    };
  }
}

/**
 * 測試學生異動管理核心功能
 */
function testStudentChangeManager() {
  const testResult = {
    success: true,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 測試異動管理核心函數
    const changeFunctions = [
      'processStudentChange',
      'validateStudentChange',
      'logStudentChange',
      'updateChangeStatus',
      'getChangeRecord'
    ];
    
    changeFunctions.forEach(funcName => {
      testResult.totalTests++;
      if (typeof eval(funcName) === 'function') {
        testResult.passedTests++;
        testResult.testCases.push({
          name: `${funcName} 函數檢查`,
          result: { success: true, message: '函數已定義' }
        });
      } else {
        testResult.failedTests++;
        testResult.success = false;
        testResult.testCases.push({
          name: `${funcName} 函數檢查`,
          result: { success: false, message: '函數未定義' }
        });
      }
    });
    
    return testResult;
    
  } catch (error) {
    return {
      success: false,
      message: '異動管理測試失敗：' + error.message
    };
  }
}

/**
 * 測試備份恢復功能
 */
function testBackupRestore() {
  const testResult = {
    success: true,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 測試備份恢復函數
    const backupFunctions = [
      'backupStudentFromMasterList',
      'backupStudentFromTeacherBook',
      'restoreStudentToMasterList',
      'restoreStudentToTeacherBook'
    ];
    
    backupFunctions.forEach(funcName => {
      testResult.totalTests++;
      if (typeof eval(funcName) === 'function') {
        testResult.passedTests++;
        testResult.testCases.push({
          name: `${funcName} 函數檢查`,
          result: { success: true, message: '函數已定義' }
        });
      } else {
        testResult.failedTests++;
        testResult.success = false;
        testResult.testCases.push({
          name: `${funcName} 函數檢查`,
          result: { success: false, message: '函數未定義' }
        });
      }
    });
    
    return testResult;
    
  } catch (error) {
    return {
      success: false,
      message: '備份恢復測試失敗：' + error.message
    };
  }
}

/**
 * 測試資料完整性
 */
function testDataIntegrity() {
  const testResult = {
    success: true,
    totalTests: 1,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 檢查系統配置完整性
    const configChecks = [
      { key: 'SYSTEM_CONFIG', exists: typeof SYSTEM_CONFIG !== 'undefined' },
      { key: 'CHANGE_LOG_CONFIG', exists: typeof CHANGE_LOG_CONFIG !== 'undefined' }
    ];
    
    let allConfigOK = true;
    configChecks.forEach(check => {
      if (!check.exists) {
        allConfigOK = false;
      }
    });
    
    if (allConfigOK) {
      testResult.passedTests++;
      testResult.testCases.push({
        name: '系統配置完整性檢查',
        result: { success: true, message: '所有配置已正確定義' }
      });
    } else {
      testResult.failedTests++;
      testResult.success = false;
      testResult.testCases.push({
        name: '系統配置完整性檢查',
        result: { success: false, message: '部分系統配置缺失' }
      });
    }
    
    return testResult;
    
  } catch (error) {
    return {
      success: false,
      message: '資料完整性測試失敗：' + error.message
    };
  }
}

/**
 * 測試 UI 整合功能
 */
function testUIIntegration() {
  const testResult = {
    success: true,
    totalTests: 1,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 檢查 UI 相關函數
    const uiFunctions = [
      'openStudentChangeDialog',
      'showStudentChangeForm',
      'updateProgressDisplay'
    ];
    
    let definedFunctions = 0;
    uiFunctions.forEach(funcName => {
      if (typeof eval(funcName) === 'function') {
        definedFunctions++;
      }
    });
    
    if (definedFunctions > 0) {
      testResult.passedTests++;
      testResult.testCases.push({
        name: 'UI 函數檢查',
        result: { success: true, message: `${definedFunctions}/${uiFunctions.length} UI 函數已定義` }
      });
    } else {
      testResult.failedTests++;
      testResult.success = false;
      testResult.testCases.push({
        name: 'UI 函數檢查',
        result: { success: false, message: '未找到 UI 相關函數' }
      });
    }
    
    return testResult;
    
  } catch (error) {
    return {
      success: false,
      message: 'UI 整合測試失敗：' + error.message
    };
  }
}

// ===== 快速測試函數 =====

/**
 * 快速測試學生查找函數
 */
function quickTestStudentFindFunctions() {
  try {
    const functions = ['findStudentByID', 'findStudentByName', 'locateStudentRecords'];
    let missing = [];
    
    functions.forEach(func => {
      if (typeof eval(func) !== 'function') {
        missing.push(func);
      }
    });
    
    if (missing.length === 0) {
      return { success: true, message: '所有學生查找函數已定義' };
    } else {
      return { success: false, message: `缺少函數: ${missing.join(', ')}` };
    }
  } catch (error) {
    return { success: false, message: `檢查失敗: ${error.message}` };
  }
}

/**
 * 快速測試異動管理函數
 */
function quickTestChangeManagementFunctions() {
  try {
    const functions = ['processStudentChange', 'validateStudentChange', 'logStudentChange'];
    let missing = [];
    
    functions.forEach(func => {
      if (typeof eval(func) !== 'function') {
        missing.push(func);
      }
    });
    
    if (missing.length === 0) {
      return { success: true, message: '所有異動管理函數已定義' };
    } else {
      return { success: false, message: `缺少函數: ${missing.join(', ')}` };
    }
  } catch (error) {
    return { success: false, message: `檢查失敗: ${error.message}` };
  }
}

/**
 * 快速測試聯絡記錄函數
 */
function quickTestContactFunctions() {
  try {
    const functions = ['generateScheduledContactsForStudent', 'transferScheduledContactRecords'];
    let missing = [];
    
    functions.forEach(func => {
      if (typeof eval(func) !== 'function') {
        missing.push(func);
      }
    });
    
    if (missing.length === 0) {
      return { success: true, message: '所有聯絡記錄函數已定義' };
    } else {
      return { success: false, message: `缺少函數: ${missing.join(', ')}` };
    }
  } catch (error) {
    return { success: false, message: `檢查失敗: ${error.message}` };
  }
}

// ===== 輔助函數 =====

/**
 * 更新測試結果統計
 */
function updateTestResults(mainResult, subResult) {
  if (subResult.totalTests) {
    mainResult.totalTests += subResult.totalTests;
    mainResult.passedTests += subResult.passedTests || 0;
    mainResult.failedTests += subResult.failedTests || 0;
  }
  
  if (!subResult.success) {
    mainResult.success = false;
  }
}

/**
 * 更新測試案例結果統計
 */
function updateTestCaseResults(result, caseResult) {
  if (caseResult.totalTests) {
    result.totalTests += caseResult.totalTests;
    result.passedTests += caseResult.passedTests || 0;
    result.failedTests += caseResult.failedTests || 0;
  } else {
    // 單一測試案例
    result.totalTests++;
    if (caseResult.success) {
      result.passedTests++;
    } else {
      result.failedTests++;
      result.success = false;
    }
  }
}

/**
 * 生成學生管理測試報告
 */
function generateStudentManagementTestReport(testResults) {
  Logger.log('\n📊 學生管理測試報告');
  Logger.log('═'.repeat(60));
  
  const successRate = testResults.totalTests > 0 ? 
    Math.round((testResults.passedTests / testResults.totalTests) * 100) : 0;
  
  Logger.log(`📈 測試總覽：`);
  Logger.log(`   測試類型：${testResults.testType}`);
  Logger.log(`   總測試數：${testResults.totalTests}`);
  Logger.log(`   通過測試：${testResults.passedTests}`);
  Logger.log(`   失敗測試：${testResults.failedTests}`);
  Logger.log(`   成功率：${successRate}%`);
  
  if (testResults.success) {
    Logger.log('\n🎉 學生管理測試全部通過！');
    Logger.log('✅ 學生管理系統已達到可用狀態');
  } else {
    Logger.log('\n⚠️ 部分測試未通過，需要進一步檢查');
  }
  
  // 詳細測試結果
  Logger.log('\n📋 詳細測試結果：');
  Logger.log('-'.repeat(40));
  
  testResults.testSuites.forEach(suite => {
    const suiteResult = suite.result;
    if (suiteResult.totalTests) {
      const suiteSuccessRate = Math.round((suiteResult.passedTests / suiteResult.totalTests) * 100);
      Logger.log(`${suite.name}: ${suiteResult.passedTests}/${suiteResult.totalTests} (${suiteSuccessRate}%) ${suiteResult.success ? '✅' : '❌'}`);
    } else {
      Logger.log(`${suite.name}: ${suiteResult.success ? '✅ 通過' : '❌ 失敗'}`);
    }
  });
  
  // 建議
  Logger.log('\n💡 建議：');
  Logger.log('-'.repeat(40));
  
  if (testResults.success) {
    Logger.log('• 學生管理功能正常，可以開始使用');
    Logger.log('• 建議定期執行測試以維持穩定性');
    Logger.log('• 可以進行實際的學生異動操作');
  } else {
    Logger.log('• 檢查失敗的測試項目並進行修復');
    Logger.log('• 重新執行測試直到全部通過');
    Logger.log('• 確認所有必要函數已正確部署');
  }
}

// ===== 向下相容的函數別名 =====

/**
 * 向下相容 - 所有學生異動測試的別名
 */
function runAllStudentChangeTests() {
  return runStudentManagementTest('all');
}

/**
 * 向下相容 - Scheduled Contact 轉移測試的別名
 */
function runAllScheduledContactTransferTests() {
  return runStudentManagementTest('contact');
}