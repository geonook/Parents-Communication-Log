/**
 * 簡單測試執行器
 * 解決原本測試函數的效能問題
 * 提供快速、輕量級的測試方案
 */

/**
 * 簡單快速測試
 * 避免大量檔案系統操作，專注於函數定義檢查
 */
function runSimpleTest() {
  console.log('⚡ 執行簡單快速測試');
  
  const testResult = {
    startTime: new Date(),
    testsPassed: 0,
    testsFailed: 0,
    tests: [],
    overallSuccess: false
  };
  
  try {
    // 測試1: 檢查關鍵備份函數（最重要的修復）
    console.log('🔍 測試1: 關鍵備份函數');
    const backupFunctionTest = testBackupFunctions();
    testResult.tests.push({
      name: '關鍵備份函數',
      success: backupFunctionTest.success,
      details: backupFunctionTest.message
    });
    
    if (backupFunctionTest.success) {
      testResult.testsPassed++;
    } else {
      testResult.testsFailed++;
    }
    
    // 測試2: 檢查核心異動管理函數
    console.log('🔍 測試2: 核心異動管理函數');
    const coreManagementTest = testCoreManagementFunctions();
    testResult.tests.push({
      name: '核心異動管理函數',
      success: coreManagementTest.success,
      details: coreManagementTest.message
    });
    
    if (coreManagementTest.success) {
      testResult.testsPassed++;
    } else {
      testResult.testsFailed++;
    }
    
    // 測試3: 檢查學生查找函數
    console.log('🔍 測試3: 學生查找函數');
    const searchFunctionTest = testSearchFunctions();
    testResult.tests.push({
      name: '學生查找函數',
      success: searchFunctionTest.success,
      details: searchFunctionTest.message
    });
    
    if (searchFunctionTest.success) {
      testResult.testsPassed++;
    } else {
      testResult.testsFailed++;
    }
    
    // 測試4: 檢查系統配置
    console.log('🔍 測試4: 系統配置');
    const configTest = testSystemConfiguration();
    testResult.tests.push({
      name: '系統配置',
      success: configTest.success,
      details: configTest.message
    });
    
    if (configTest.success) {
      testResult.testsPassed++;
    } else {
      testResult.testsFailed++;
    }
    
    // 計算結果
    testResult.endTime = new Date();
    testResult.duration = (testResult.endTime - testResult.startTime) / 1000;
    testResult.overallSuccess = testResult.testsFailed === 0;
    
    // 輸出結果
    console.log('');
    console.log('=== 簡單測試結果 ===');
    console.log(`執行時間: ${testResult.duration.toFixed(2)}秒`);
    console.log(`總測試: ${testResult.testsPassed + testResult.testsFailed}`);
    console.log(`通過: ${testResult.testsPassed}`);
    console.log(`失敗: ${testResult.testsFailed}`);
    console.log(`狀態: ${testResult.overallSuccess ? '✅ 全部通過' : '❌ 部分失敗'}`);
    console.log('');
    
    testResult.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      console.log(`${status} ${test.name}: ${test.details}`);
    });
    
    console.log('');
    console.log('=== 測試完成 ===');
    
    return testResult;
    
  } catch (error) {
    console.log('❌ 簡單測試執行失敗: ' + error.message);
    testResult.overallSuccess = false;
    testResult.error = error.message;
    return testResult;
  }
}

/**
 * 測試備份函數
 * 專門檢查導致原始錯誤的函數
 */
function testBackupFunctions() {
  try {
    const requiredFunctions = [
      'backupStudentFromTeacherBook',
      'backupStudentFromMasterList',
      'restoreStudentToTeacherBook',
      'restoreStudentToMasterList',
      'restoreContactRecords'
    ];
    
    let missingFunctions = [];
    let existingFunctions = [];
    
    requiredFunctions.forEach(funcName => {
      if (typeof eval(funcName) === 'function') {
        existingFunctions.push(funcName);
      } else {
        missingFunctions.push(funcName);
      }
    });
    
    if (missingFunctions.length === 0) {
      return {
        success: true,
        message: `所有備份函數已定義 (${existingFunctions.length}/${requiredFunctions.length})`
      };
    } else {
      return {
        success: false,
        message: `缺少備份函數: ${missingFunctions.join(', ')}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: `備份函數測試失敗: ${error.message}`
    };
  }
}

/**
 * 測試核心異動管理函數
 */
function testCoreManagementFunctions() {
  try {
    const requiredFunctions = [
      'processStudentChange',
      'validateStudentChange',
      'logStudentChange',
      'updateChangeStatus',
      'getChangeRecord'
    ];
    
    let missingFunctions = [];
    let existingFunctions = [];
    
    requiredFunctions.forEach(funcName => {
      if (typeof eval(funcName) === 'function') {
        existingFunctions.push(funcName);
      } else {
        missingFunctions.push(funcName);
      }
    });
    
    if (missingFunctions.length === 0) {
      return {
        success: true,
        message: `所有核心函數已定義 (${existingFunctions.length}/${requiredFunctions.length})`
      };
    } else {
      return {
        success: false,
        message: `缺少核心函數: ${missingFunctions.join(', ')}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: `核心函數測試失敗: ${error.message}`
    };
  }
}

/**
 * 測試學生查找函數
 */
function testSearchFunctions() {
  try {
    const requiredFunctions = [
      'findStudentByID',
      'findStudentByName',
      'locateStudentRecords',
      'getStudentTeacherMapping'
    ];
    
    let missingFunctions = [];
    let existingFunctions = [];
    
    requiredFunctions.forEach(funcName => {
      if (typeof eval(funcName) === 'function') {
        existingFunctions.push(funcName);
      } else {
        missingFunctions.push(funcName);
      }
    });
    
    if (missingFunctions.length === 0) {
      return {
        success: true,
        message: `所有查找函數已定義 (${existingFunctions.length}/${requiredFunctions.length})`
      };
    } else {
      return {
        success: false,
        message: `缺少查找函數: ${missingFunctions.join(', ')}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: `查找函數測試失敗: ${error.message}`
    };
  }
}

/**
 * 測試系統配置
 */
function testSystemConfiguration() {
  try {
    const checks = [];
    
    // 檢查 SYSTEM_CONFIG
    if (typeof SYSTEM_CONFIG !== 'undefined') {
      checks.push('SYSTEM_CONFIG 已定義');
    } else {
      checks.push('❌ SYSTEM_CONFIG 未定義');
    }
    
    // 檢查 CHANGE_LOG_CONFIG
    if (typeof CHANGE_LOG_CONFIG !== 'undefined') {
      checks.push('CHANGE_LOG_CONFIG 已定義');
    } else {
      checks.push('❌ CHANGE_LOG_CONFIG 未定義');
    }
    
    const failedChecks = checks.filter(check => check.includes('❌'));
    
    if (failedChecks.length === 0) {
      return {
        success: true,
        message: '系統配置正常'
      };
    } else {
      return {
        success: false,
        message: `配置問題: ${failedChecks.join(', ')}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: `系統配置測試失敗: ${error.message}`
    };
  }
}

/**
 * 測試原始錯誤修復
 * 專門檢查 backupStudentFromTeacherBook 是否已修復
 */
function testOriginalErrorFix() {
  console.log('🔍 測試原始錯誤修復');
  
  try {
    const criticalFunction = 'backupStudentFromTeacherBook';
    
    if (typeof eval(criticalFunction) === 'function') {
      console.log('✅ 原始錯誤已修復');
      return {
        success: true,
        message: `${criticalFunction} 函數已正確定義`,
        fixed: true
      };
    } else {
      console.log('❌ 原始錯誤尚未修復');
      return {
        success: false,
        message: `${criticalFunction} 函數仍然缺失`,
        fixed: false
      };
    }
    
  } catch (error) {
    console.log('❌ 檢查原始錯誤時發生問題');
    return {
      success: false,
      message: `檢查失敗: ${error.message}`,
      fixed: false
    };
  }
}

/**
 * 輕量級系統狀態檢查
 * 不執行任何檔案操作，只檢查函數定義
 */
function lightweightSystemCheck() {
  console.log('🔍 輕量級系統狀態檢查');
  
  const startTime = new Date();
  const checkResult = {
    healthy: true,
    issues: [],
    recommendations: []
  };
  
  try {
    // 檢查原始錯誤修復
    const originalErrorTest = testOriginalErrorFix();
    if (!originalErrorTest.success) {
      checkResult.healthy = false;
      checkResult.issues.push('原始備份錯誤未修復');
      checkResult.recommendations.push('執行 clasp push 重新部署程式碼');
    }
    
    // 檢查備份函數
    const backupTest = testBackupFunctions();
    if (!backupTest.success) {
      checkResult.healthy = false;
      checkResult.issues.push('備份函數缺失');
      checkResult.recommendations.push('檢查 DataSyncManager.gs 是否正確部署');
    }
    
    // 檢查核心管理函數
    const coreTest = testCoreManagementFunctions();
    if (!coreTest.success) {
      checkResult.healthy = false;
      checkResult.issues.push('核心管理函數缺失');
      checkResult.recommendations.push('檢查 StudentChangeManager.gs 是否正確部署');
    }
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    console.log('');
    console.log('=== 輕量級檢查結果 ===');
    console.log(`檢查時間: ${duration.toFixed(2)}秒`);
    console.log(`系統狀態: ${checkResult.healthy ? '✅ 健康' : '❌ 需要修復'}`);
    
    if (checkResult.issues.length > 0) {
      console.log('');
      console.log('發現問題:');
      checkResult.issues.forEach(issue => console.log(`  • ${issue}`));
      
      console.log('');
      console.log('建議:');
      checkResult.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
    
    console.log('');
    console.log('=== 檢查完成 ===');
    
    return checkResult;
    
  } catch (error) {
    console.log('❌ 輕量級檢查失敗: ' + error.message);
    checkResult.healthy = false;
    checkResult.issues.push('檢查執行失敗');
    return checkResult;
  }
}

/**
 * 快速驗證修復效果
 * 專門用於驗證備份功能修復是否成功
 */
function quickVerifyFix() {
  console.log('⚡ 快速驗證修復效果');
  
  const verifyResult = {
    fixSuccessful: false,
    details: [],
    nextSteps: []
  };
  
  try {
    // 檢查1: 原始錯誤修復
    const originalErrorFixed = typeof backupStudentFromTeacherBook === 'function';
    verifyResult.details.push({
      check: '原始錯誤修復',
      passed: originalErrorFixed,
      message: originalErrorFixed ? '✅ backupStudentFromTeacherBook 已定義' : '❌ backupStudentFromTeacherBook 仍缺失'
    });
    
    // 檢查2: 相關備份函數
    const relatedFunctions = [
      'backupStudentFromMasterList',
      'restoreStudentToTeacherBook',
      'restoreStudentToMasterList'
    ];
    
    const missingRelated = relatedFunctions.filter(func => typeof eval(func) !== 'function');
    const relatedFunctionsOK = missingRelated.length === 0;
    
    verifyResult.details.push({
      check: '相關備份函數',
      passed: relatedFunctionsOK,
      message: relatedFunctionsOK ? '✅ 所有相關函數已定義' : `❌ 缺少: ${missingRelated.join(', ')}`
    });
    
    // 檢查3: 核心異動函數
    const coreFunction = typeof processStudentChange === 'function';
    verifyResult.details.push({
      check: '核心異動函數',
      passed: coreFunction,
      message: coreFunction ? '✅ processStudentChange 已定義' : '❌ processStudentChange 缺失'
    });
    
    // 判斷總體修復狀態
    const allChecksPassed = verifyResult.details.every(detail => detail.passed);
    verifyResult.fixSuccessful = allChecksPassed;
    
    // 生成下一步建議
    if (verifyResult.fixSuccessful) {
      verifyResult.nextSteps.push('✅ 修復成功！可以嘗試執行學生異動操作');
      verifyResult.nextSteps.push('💡 建議測試實際的轉學、轉班功能');
    } else {
      verifyResult.nextSteps.push('❌ 修復未完成，需要進一步處理');
      verifyResult.nextSteps.push('🔧 執行 clasp push 重新部署程式碼');
      verifyResult.nextSteps.push('📋 檢查 Apps Script 編輯器是否有錯誤');
    }
    
    // 輸出結果
    console.log('');
    console.log('=== 修復效果驗證 ===');
    console.log(`修復狀態: ${verifyResult.fixSuccessful ? '✅ 成功' : '❌ 未完成'}`);
    console.log('');
    
    verifyResult.details.forEach(detail => {
      console.log(`${detail.passed ? '✅' : '❌'} ${detail.check}: ${detail.message}`);
    });
    
    console.log('');
    console.log('下一步:');
    verifyResult.nextSteps.forEach(step => console.log(`  ${step}`));
    
    console.log('');
    console.log('=== 驗證完成 ===');
    
    return verifyResult;
    
  } catch (error) {
    console.log('❌ 修復效果驗證失敗: ' + error.message);
    verifyResult.fixSuccessful = false;
    verifyResult.nextSteps.push('❌ 驗證過程發生錯誤，請手動檢查');
    return verifyResult;
  }
}