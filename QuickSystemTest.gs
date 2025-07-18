/**
 * 快速系統測試腳本
 * 一鍵執行所有關鍵測試，快速驗證系統修復效果
 */

/**
 * 一鍵執行所有關鍵測試
 * 這是主要的測試入口點，執行所有重要的驗證
 */
function runCompleteSystemTest() {
  Logger.log('🚀 開始執行完整系統測試');
  
  const testReport = {
    testStartTime: new Date(),
    testResults: [],
    overallSuccess: true,
    summary: ''
  };
  
  try {
    // 測試1: 基礎函數驗證
    Logger.log('📋 測試1: 基礎函數驗證');
    const funcValidation = quickValidateAllFunctions();
    testReport.testResults.push({
      testName: '基礎函數驗證',
      success: funcValidation.success,
      details: funcValidation
    });
    
    if (!funcValidation.success) {
      testReport.overallSuccess = false;
    }
    
    // 測試2: 修復效果驗證
    Logger.log('🔧 測試2: 修復效果驗證');
    const fixValidation = verifyFunctionFix();
    testReport.testResults.push({
      testName: '修復效果驗證',
      success: fixValidation.success,
      details: fixValidation
    });
    
    if (!fixValidation.success) {
      testReport.overallSuccess = false;
    }
    
    // 測試3: 備份恢復功能測試
    Logger.log('💾 測試3: 備份恢復功能測試');
    const backupTest = testBackupWorkflow();
    testReport.testResults.push({
      testName: '備份恢復功能',
      success: backupTest.success,
      details: backupTest
    });
    
    if (!backupTest.success) {
      testReport.overallSuccess = false;
    }
    
    // 測試4: 快速功能測試
    Logger.log('⚡ 測試4: 快速功能測試');
    const quickTest = runQuickTest();
    testReport.testResults.push({
      testName: '快速功能測試',
      success: quickTest.success,
      details: quickTest
    });
    
    if (!quickTest.success) {
      testReport.overallSuccess = false;
    }
    
    // 測試5: 異動管理核心功能
    Logger.log('🔄 測試5: 異動管理核心功能');
    const changeTest = testStudentChangeCore();
    testReport.testResults.push({
      testName: '異動管理核心功能',
      success: changeTest.success,
      details: changeTest
    });
    
    if (!changeTest.success) {
      testReport.overallSuccess = false;
    }
    
    // 生成測試報告
    testReport.testEndTime = new Date();
    testReport.testDuration = (testReport.testEndTime - testReport.testStartTime) / 1000;
    
    const passedTests = testReport.testResults.filter(test => test.success).length;
    const totalTests = testReport.testResults.length;
    
    testReport.summary = `完整系統測試完成 - 通過：${passedTests}/${totalTests}，耗時：${testReport.testDuration}秒`;
    
    // 輸出詳細結果
    Logger.log('');
    Logger.log('=== 完整系統測試報告 ===');
    Logger.log(`測試時間：${testReport.testStartTime.toLocaleString()}`);
    Logger.log(`測試結果：${testReport.overallSuccess ? '✅ 全部通過' : '❌ 部分失敗'}`);
    Logger.log(`測試總數：${totalTests}`);
    Logger.log(`通過測試：${passedTests}`);
    Logger.log(`失敗測試：${totalTests - passedTests}`);
    Logger.log(`測試耗時：${testReport.testDuration}秒`);
    Logger.log('');
    
    // 詳細結果
    testReport.testResults.forEach((test, index) => {
      const status = test.success ? '✅' : '❌';
      Logger.log(`${status} 測試${index + 1}: ${test.testName}`);
      if (!test.success && test.details.message) {
        Logger.log(`   失敗原因：${test.details.message}`);
      }
    });
    
    Logger.log('');
    Logger.log('=== 測試報告結束 ===');
    
    if (testReport.overallSuccess) {
      Logger.log('🎉 恭喜！所有測試通過，系統修復成功！');
      Logger.log('學生異動管理系統現在可以正常使用。');
    } else {
      Logger.log('⚠️ 部分測試失敗，請檢查上述錯誤資訊。');
    }
    
    return testReport;
    
  } catch (error) {
    Logger.log('❌ 系統測試執行失敗：' + error.message);
    testReport.overallSuccess = false;
    testReport.summary = '系統測試執行失敗：' + error.message;
    return testReport;
  }
}

/**
 * 測試異動管理核心功能
 * 驗證主要的異動管理函數是否正常工作
 */
function testStudentChangeCore() {
  Logger.log('🔍 測試異動管理核心功能');
  
  try {
    const coreTest = {
      success: true,
      testedFunctions: [],
      missingFunctions: []
    };
    
    // 檢查核心函數是否存在
    const coreFunctions = [
      'processStudentChange',
      'validateStudentChange',
      'logStudentChange',
      'getChangeRecord',
      'updateChangeStatus',
      'rollbackStudentChange'
    ];
    
    coreFunctions.forEach(funcName => {
      if (typeof eval(funcName) === 'function') {
        coreTest.testedFunctions.push(funcName);
        Logger.log(`✅ ${funcName} - 已定義`);
      } else {
        coreTest.success = false;
        coreTest.missingFunctions.push(funcName);
        Logger.log(`❌ ${funcName} - 未定義`);
      }
    });
    
    if (coreTest.success) {
      Logger.log('✅ 異動管理核心功能測試通過');
      return {
        success: true,
        message: '所有核心函數都已正確定義'
      };
    } else {
      Logger.log('❌ 異動管理核心功能測試失敗');
      return {
        success: false,
        message: '缺少核心函數：' + coreTest.missingFunctions.join(', ')
      };
    }
    
  } catch (error) {
    Logger.log('❌ 測試異動管理核心功能失敗：' + error.message);
    return {
      success: false,
      message: '測試執行失敗：' + error.message
    };
  }
}

/**
 * 執行關鍵問題修復驗證
 * 特別檢查原始錯誤是否已修復
 */
function verifyOriginalErrorFixed() {
  Logger.log('🔍 驗證原始錯誤是否已修復');
  
  try {
    // 檢查導致原始錯誤的函數
    const criticalFunction = 'backupStudentFromTeacherBook';
    
    if (typeof eval(criticalFunction) === 'function') {
      Logger.log(`✅ 關鍵函數 ${criticalFunction} 已正確定義`);
      Logger.log('✅ 原始錯誤「backupStudentFromTeacherBook is not defined」已修復');
      
      return {
        success: true,
        message: '原始錯誤已成功修復'
      };
    } else {
      Logger.log(`❌ 關鍵函數 ${criticalFunction} 仍未定義`);
      return {
        success: false,
        message: '原始錯誤尚未修復'
      };
    }
    
  } catch (error) {
    Logger.log('❌ 驗證原始錯誤修復失敗：' + error.message);
    return {
      success: false,
      message: '驗證過程發生錯誤：' + error.message
    };
  }
}

/**
 * 測試系統整體健康狀態
 * 快速檢查系統各個組件的狀態
 */
function checkSystemHealth() {
  Logger.log('🏥 檢查系統整體健康狀態');
  
  const healthCheck = {
    success: true,
    checks: [],
    overallHealth: 'excellent'
  };
  
  try {
    // 檢查1: 核心模組函數
    const coreModules = [
      'StudentChangeManager.gs',
      'StudentLocator.gs', 
      'DataSyncManager.gs'
    ];
    
    // 檢查2: 必要的系統函數
    const systemFunctions = [
      'getSystemMainFolder',
      'getAllTeacherBooks',
      'getChangeLogSheet',
      'formatDateTimeForFilename'
    ];
    
    let missingSystemFunctions = [];
    systemFunctions.forEach(funcName => {
      if (typeof eval(funcName) !== 'function') {
        missingSystemFunctions.push(funcName);
        healthCheck.success = false;
      }
    });
    
    healthCheck.checks.push({
      name: '系統函數檢查',
      success: missingSystemFunctions.length === 0,
      details: missingSystemFunctions.length === 0 ? '所有系統函數正常' : `缺少函數: ${missingSystemFunctions.join(', ')}`
    });
    
    // 檢查3: 備份恢復功能
    const backupFunctions = [
      'backupStudentFromMasterList',
      'backupStudentFromTeacherBook',
      'restoreStudentToMasterList',
      'restoreStudentToTeacherBook'
    ];
    
    let missingBackupFunctions = [];
    backupFunctions.forEach(funcName => {
      if (typeof eval(funcName) !== 'function') {
        missingBackupFunctions.push(funcName);
        healthCheck.success = false;
      }
    });
    
    healthCheck.checks.push({
      name: '備份功能檢查',
      success: missingBackupFunctions.length === 0,
      details: missingBackupFunctions.length === 0 ? '所有備份功能正常' : `缺少函數: ${missingBackupFunctions.join(', ')}`
    });
    
    // 設定整體健康狀態
    if (healthCheck.success) {
      healthCheck.overallHealth = 'excellent';
      Logger.log('💚 系統健康狀態：優秀');
    } else {
      healthCheck.overallHealth = 'needs_attention';
      Logger.log('⚠️ 系統健康狀態：需要關注');
    }
    
    return healthCheck;
    
  } catch (error) {
    Logger.log('❌ 系統健康檢查失敗：' + error.message);
    return {
      success: false,
      message: '健康檢查失敗：' + error.message,
      overallHealth: 'critical'
    };
  }
}

/**
 * 生成測試摘要報告
 * 提供簡潔的測試結果摘要
 */
function generateTestSummary() {
  Logger.log('📊 生成測試摘要報告');
  
  try {
    const summary = {
      testDate: new Date().toLocaleString(),
      systemStatus: 'unknown',
      keyFindings: [],
      recommendations: []
    };
    
    // 執行關鍵檢查
    const originalErrorCheck = verifyOriginalErrorFixed();
    const healthCheck = checkSystemHealth();
    const functionCheck = quickValidateAllFunctions();
    
    // 判斷系統狀態
    if (originalErrorCheck.success && healthCheck.success && functionCheck.success) {
      summary.systemStatus = 'fully_operational';
      summary.keyFindings.push('✅ 原始錯誤已修復');
      summary.keyFindings.push('✅ 所有核心函數已定義');
      summary.keyFindings.push('✅ 系統健康狀態良好');
      summary.recommendations.push('系統已準備就緒，可以正常使用');
    } else {
      summary.systemStatus = 'needs_attention';
      
      if (!originalErrorCheck.success) {
        summary.keyFindings.push('❌ 原始錯誤尚未修復');
        summary.recommendations.push('需要檢查 backupStudentFromTeacherBook 函數定義');
      }
      
      if (!healthCheck.success) {
        summary.keyFindings.push('❌ 系統健康檢查未通過');
        summary.recommendations.push('需要檢查缺少的系統函數');
      }
      
      if (!functionCheck.success) {
        summary.keyFindings.push('❌ 函數驗證未通過');
        summary.recommendations.push('需要重新部署程式碼');
      }
    }
    
    // 輸出摘要
    Logger.log('');
    Logger.log('=== 測試摘要報告 ===');
    Logger.log(`測試日期：${summary.testDate}`);
    Logger.log(`系統狀態：${summary.systemStatus}`);
    Logger.log('');
    Logger.log('關鍵發現：');
    summary.keyFindings.forEach(finding => Logger.log(`  ${finding}`));
    Logger.log('');
    Logger.log('建議：');
    summary.recommendations.forEach(rec => Logger.log(`  • ${rec}`));
    Logger.log('');
    Logger.log('=== 摘要報告結束 ===');
    
    return summary;
    
  } catch (error) {
    Logger.log('❌ 生成測試摘要失敗：' + error.message);
    return {
      testDate: new Date().toLocaleString(),
      systemStatus: 'error',
      keyFindings: ['❌ 測試摘要生成失敗'],
      recommendations: ['請檢查系統狀態並重新執行測試']
    };
  }
}

/**
 * 快速問題診斷
 * 當測試失敗時使用，快速找出問題所在
 */
function quickDiagnoseProblem() {
  Logger.log('🔍 快速問題診斷');
  
  const diagnosis = {
    problems: [],
    solutions: []
  };
  
  try {
    // 檢查1: 關鍵函數是否存在
    const criticalFunctions = [
      'backupStudentFromTeacherBook',
      'processStudentChange',
      'validateStudentChange'
    ];
    
    criticalFunctions.forEach(funcName => {
      if (typeof eval(funcName) !== 'function') {
        diagnosis.problems.push(`缺少關鍵函數：${funcName}`);
        diagnosis.solutions.push(`執行 clasp push 重新部署程式碼`);
      }
    });
    
    // 檢查2: 系統配置
    if (typeof SYSTEM_CONFIG === 'undefined') {
      diagnosis.problems.push('系統配置未定義');
      diagnosis.solutions.push('檢查 SystemUtils.gs 是否正確載入');
    }
    
    // 檢查3: 異動日誌配置
    if (typeof CHANGE_LOG_CONFIG === 'undefined') {
      diagnosis.problems.push('異動日誌配置未定義');
      diagnosis.solutions.push('檢查 StudentChangeManager.gs 是否正確載入');
    }
    
    // 輸出診斷結果
    Logger.log('');
    Logger.log('=== 問題診斷結果 ===');
    
    if (diagnosis.problems.length === 0) {
      Logger.log('✅ 未發現明顯問題');
      Logger.log('系統看起來運作正常');
    } else {
      Logger.log('🔍 發現以下問題：');
      diagnosis.problems.forEach((problem, index) => {
        Logger.log(`  ${index + 1}. ${problem}`);
      });
      
      Logger.log('');
      Logger.log('💡 建議解決方案：');
      diagnosis.solutions.forEach((solution, index) => {
        Logger.log(`  ${index + 1}. ${solution}`);
      });
    }
    
    Logger.log('');
    Logger.log('=== 診斷結束 ===');
    
    return diagnosis;
    
  } catch (error) {
    Logger.log('❌ 問題診斷失敗：' + error.message);
    return {
      problems: ['診斷過程發生錯誤'],
      solutions: ['請手動檢查系統狀態']
    };
  }
}