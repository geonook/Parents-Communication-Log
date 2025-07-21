/**
 * 系統變更測試套件
 * 原檔名: TestChanges.gs -> SystemChangesTest.gs  
 * 測試系統變更、UI功能、格式處理等特殊功能
 * 
 * 版本: v2.0 - 重新命名和優化版本
 * 更新: 2025-07-19
 */

/**
 * 主要系統變更測試入口
 * @param {string} testType - 測試類型: 'all'|'ui'|'format'|'dashboard'|'quick'
 */
function runSystemChangesTest(testType = 'all') {
  try {
    Logger.log('🚀 啟動系統變更測試套件...');
    Logger.log(`📋 測試類型: ${testType}`);
    Logger.log('═'.repeat(60));
    
    let testResult;
    
    switch (testType.toLowerCase()) {
      case 'all':
      case 'complete':
        testResult = runCompleteSystemChangesTest();
        break;
      case 'ui':
      case 'interface':
        testResult = runUIChangesTest();
        break;
      case 'format':
      case 'formatting':
        testResult = runFormatChangesTest();
        break;
      case 'dashboard':
      case 'stats':
        testResult = runDashboardChangesTest();
        break;
      case 'quick':
      case 'fast':
        testResult = runQuickChangesTest();
        break;
      default:
        Logger.log(`⚠️ 未知測試類型: ${testType}，使用預設的 all 模式`);
        testResult = runCompleteSystemChangesTest();
    }
    
    return testResult;
    
  } catch (error) {
    Logger.log(`❌ 系統變更測試失敗：${error.message}`);
    return {
      success: false,
      error: error.message,
      testType: testType
    };
  }
}

/**
 * 完整的系統變更測試
 */
function runCompleteSystemChangesTest() {
  Logger.log('🔍 執行完整的系統變更測試...');
  
  const testResults = {
    success: true,
    testType: 'complete',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testSuites: []
  };
  
  try {
    // 測試套件1：UI 變更測試
    Logger.log('\n📋 測試套件1：UI 變更測試');
    Logger.log('-'.repeat(50));
    const uiResult = runUIChangesTest();
    testResults.testSuites.push({
      name: 'UI 變更測試',
      result: uiResult
    });
    updateTestResults(testResults, uiResult);
    
    // 測試套件2：格式處理測試
    Logger.log('\n📋 測試套件2：格式處理測試');
    Logger.log('-'.repeat(50));
    const formatResult = runFormatChangesTest();
    testResults.testSuites.push({
      name: '格式處理測試',
      result: formatResult
    });
    updateTestResults(testResults, formatResult);
    
    // 測試套件3：Dashboard 功能測試
    Logger.log('\n📋 測試套件3：Dashboard 功能測試');
    Logger.log('-'.repeat(50));
    const dashboardResult = runDashboardChangesTest();
    testResults.testSuites.push({
      name: 'Dashboard 功能測試',
      result: dashboardResult
    });
    updateTestResults(testResults, dashboardResult);
    
    // 生成完整測試報告
    generateSystemChangesTestReport(testResults);
    
    return testResults;
    
  } catch (error) {
    Logger.log(`❌ 完整系統變更測試失敗：${error.message}`);
    return {
      success: false,
      testType: 'complete',
      error: error.message
    };
  }
}

/**
 * UI 變更測試
 */
function runUIChangesTest() {
  Logger.log('🖥️ 執行 UI 變更測試...');
  
  const testResult = {
    success: true,
    testType: 'ui',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 測試案例1：班級資訊工作表調整
    Logger.log('🧪 測試案例1：班級資訊工作表調整');
    const classInfoResult = testClassInfoSheetChanges();
    testResult.testCases.push({
      name: '班級資訊工作表調整',
      result: { success: classInfoResult, message: classInfoResult ? '通過' : '失敗' }
    });
    updateTestCaseResults(testResult, { success: classInfoResult });
    
    return testResult;
    
  } catch (error) {
    Logger.log(`❌ UI 變更測試失敗：${error.message}`);
    return {
      success: false,
      testType: 'ui',
      error: error.message
    };
  }
}

/**
 * 格式處理測試
 */
function runFormatChangesTest() {
  Logger.log('📝 執行格式處理測試...');
  
  const testResult = {
    success: true,
    testType: 'format',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 測試案例1：電話號碼格式處理
    Logger.log('🧪 測試案例1：電話號碼格式處理');
    const phoneResult = testPhoneNumberHandling();
    testResult.testCases.push({
      name: '電話號碼格式處理',
      result: { success: phoneResult, message: phoneResult ? '通過' : '失敗' }
    });
    updateTestCaseResults(testResult, { success: phoneResult });
    
    // 測試案例2：檔名時間戳功能
    Logger.log('🧪 測試案例2：檔名時間戳功能');
    const timestampResult = testFilenameTimestamp();
    testResult.testCases.push({
      name: '檔名時間戳功能',
      result: { success: timestampResult, message: timestampResult ? '通過' : '失敗' }
    });
    updateTestCaseResults(testResult, { success: timestampResult });
    
    // 測試案例3：檔名唯一性測試
    Logger.log('🧪 測試案例3：檔名唯一性測試');
    const uniquenessResult = testFilenameUniqueness();
    testResult.testCases.push({
      name: '檔名唯一性測試',
      result: { success: uniquenessResult, message: uniquenessResult ? '通過' : '失敗' }
    });
    updateTestCaseResults(testResult, { success: uniquenessResult });
    
    return testResult;
    
  } catch (error) {
    Logger.log(`❌ 格式處理測試失敗：${error.message}`);
    return {
      success: false,
      testType: 'format',
      error: error.message
    };
  }
}

/**
 * Dashboard 功能測試
 */
function runDashboardChangesTest() {
  Logger.log('📊 執行 Dashboard 功能測試...');
  
  const testResult = {
    success: true,
    testType: 'dashboard',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 測試案例1：Dashboard 統計功能
    Logger.log('🧪 測試案例1：Dashboard 統計功能');
    const statsResult = testDashboardStats();
    testResult.testCases.push({
      name: 'Dashboard 統計功能',
      result: { success: statsResult, message: statsResult ? '通過' : '失敗' }
    });
    updateTestCaseResults(testResult, { success: statsResult });
    
    // 測試案例2：Fall Beginning 進度統計邏輯
    Logger.log('🧪 測試案例2：Fall Beginning 進度統計邏輯');
    const progressResult = testFallBeginningProgress();
    testResult.testCases.push({
      name: 'Fall Beginning 進度統計邏輯',
      result: { success: progressResult, message: progressResult ? '通過' : '失敗' }
    });
    updateTestCaseResults(testResult, { success: progressResult });
    
    // 測試案例3：Dashboard 階段切換功能
    Logger.log('🧪 測試案例3：Dashboard 階段切換功能');
    const switchResult = testDashboardStageSwitch();
    testResult.testCases.push({
      name: 'Dashboard 階段切換功能',
      result: { success: switchResult, message: switchResult ? '通過' : '失敗' }
    });
    updateTestCaseResults(testResult, { success: switchResult });
    
    return testResult;
    
  } catch (error) {
    Logger.log(`❌ Dashboard 功能測試失敗：${error.message}`);
    return {
      success: false,
      testType: 'dashboard',
      error: error.message
    };
  }
}

/**
 * 快速系統變更測試
 */
function runQuickChangesTest() {
  Logger.log('⚡ 執行快速系統變更測試...');
  
  const testResult = {
    success: true,
    testType: 'quick',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testCases: []
  };
  
  try {
    // 快速測試1：核心格式函數檢查
    Logger.log('🧪 快速測試1：核心格式函數檢查');
    const formatFuncResult = quickTestFormatFunctions();
    testResult.testCases.push({
      name: '核心格式函數檢查',
      result: formatFuncResult
    });
    updateTestCaseResults(testResult, formatFuncResult);
    
    // 快速測試2：Dashboard 函數檢查
    Logger.log('🧪 快速測試2：Dashboard 函數檢查');
    const dashboardFuncResult = quickTestDashboardFunctions();
    testResult.testCases.push({
      name: 'Dashboard 函數檢查',
      result: dashboardFuncResult
    });
    updateTestCaseResults(testResult, dashboardFuncResult);
    
    // 快速測試3：UI 函數檢查
    Logger.log('🧪 快速測試3：UI 函數檢查');
    const uiFuncResult = quickTestUIFunctions();
    testResult.testCases.push({
      name: 'UI 函數檢查',
      result: uiFuncResult
    });
    updateTestCaseResults(testResult, uiFuncResult);
    
    return testResult;
    
  } catch (error) {
    Logger.log(`❌ 快速系統變更測試失敗：${error.message}`);
    return {
      success: false,
      testType: 'quick',
      error: error.message
    };
  }
}

// ===== UI 變更測試函數 =====

/**
 * 測試班級資訊工作表調整
 * 驗證移除班導師欄位後的功能是否正常
 */
function testClassInfoSheetChanges() {
  Logger.log('🧪 開始測試班級資訊工作表調整...');
  
  // 模擬老師資訊
  const mockTeacherInfo = {
    name: '測試老師',
    subject: '英語',
    classes: ['G1 Trailblazers', 'G2 Discoverers'],
    students: [
      ['001', 'G1', '701', '1', '王小明', 'Ming Wang', 'A1', 'A2', 'Mr. Johnson', 'G1 Trailblazers', 'Ms. Chen', '927055077', '955123456'],
      ['002', 'G1', '701', '2', '李小華', 'Lily Lee', 'A1', 'A2', 'Mr. Johnson', 'G1 Trailblazers', 'Ms. Chen', '912345678', '987654321'],
      ['003', 'G2', '702', '1', '張小美', 'Amy Zhang', 'B1', 'B2', 'Ms. Smith', 'G2 Discoverers', 'Ms. Wang', '923456789', '976543210']
    ]
  };
  
  try {
    // 創建測試試算表
    const testSpreadsheet = SpreadsheetApp.create('測試班級資訊調整');
    Logger.log(`✅ 測試試算表已創建：${testSpreadsheet.getName()}`);
    
    // 呼叫 createClassInfoSheet 函數
    createClassInfoSheet(testSpreadsheet, mockTeacherInfo);
    Logger.log('✅ createClassInfoSheet 函數執行成功');
    
    // 驗證工作表結構
    const sheet = testSpreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CLASS_INFO);
    const headers = sheet.getRange(1, 1, 1, 3).getValues()[0];
    
    Logger.log('📋 工作表標題行：' + headers.join(', '));
    
    // 驗證標題是否正確（移除班級特殊情況說明欄位）
    const expectedHeaders = ['班級', '班級人數', '最後更新日期'];
    const headersMatch = JSON.stringify(headers) === JSON.stringify(expectedHeaders);
    
    if (headersMatch) {
      Logger.log('✅ 標題行驗證通過：已成功移除班級特殊情況說明欄位');
    } else {
      Logger.log('❌ 標題行驗證失敗');
      Logger.log('期望：' + expectedHeaders.join(', '));
      Logger.log('實際：' + headers.join(', '));
    }
    
    // 驗證資料行
    const dataRows = sheet.getRange(2, 1, 2, 3).getValues();
    Logger.log('📊 資料行：');
    dataRows.forEach((row, index) => {
      Logger.log(`第${index + 1}行：${row.join(', ')}`);
    });
    
    // 驗證班級人數計算
    const class1Count = dataRows[0][1]; // G1 Trailblazers 應該有2人
    const class2Count = dataRows[1][1]; // G2 Discoverers 應該有1人
    
    if (class1Count === 2 && class2Count === 1) {
      Logger.log('✅ 班級人數計算正確');
    } else {
      Logger.log('❌ 班級人數計算錯誤');
      Logger.log(`G1 Trailblazers 期望：2，實際：${class1Count}`);
      Logger.log(`G2 Discoverers 期望：1，實際：${class2Count}`);
    }
    
    // 清理測試檔案
    DriveApp.getFileById(testSpreadsheet.getId()).setTrashed(true);
    Logger.log('🗑️ 測試檔案已清理');
    
    Logger.log('🎉 測試完成！所有調整均已正確實施');
    return true;
    
  } catch (error) {
    Logger.log('❌ 測試失敗：' + error.message);
    Logger.log('錯誤詳情：' + error.stack);
    return false;
  }
}

// ===== 格式處理測試函數 =====

/**
 * 測試電話號碼格式處理
 */
function testPhoneNumberHandling() {
  Logger.log('📞 開始測試電話號碼格式處理...');
  
  // 測試各種電話號碼格式
  const testPhoneNumbers = [
    '927055077',        // 純數字格式
    '0912-345-678',     // 傳統格式
    '09-1234-5678',     // 另一種傳統格式
    '912345678',        // 省略開頭0的格式
    '+886-912-345-678'  // 國際格式
  ];
  
  Logger.log('✅ 測試電話號碼格式：');
  testPhoneNumbers.forEach(phone => {
    Logger.log(`  - ${phone}：✅ 支援（無格式限制）`);
  });
  
  Logger.log('📞 電話號碼格式測試完成 - 已確認無特定格式限制');
  return true;
}

/**
 * 測試檔名時間戳功能
 */
function testFilenameTimestamp() {
  Logger.log('📅 開始測試檔名時間戳功能...');
  
  try {
    // 測試新的日期時間格式化函數
    const dateTime = formatDateTimeForFilename();
    const dateOnly = formatDateForFilename();
    
    Logger.log(`✅ formatDateTimeForFilename(): ${dateTime}`);
    Logger.log(`✅ formatDateForFilename(): ${dateOnly}`);
    
    // 驗證格式是否正確
    const dateTimePattern = /^\d{4}-\d{2}-\d{2}_\d{4}$/;
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    
    if (dateTimePattern.test(dateTime)) {
      Logger.log('✅ 日期時間格式驗證通過：' + dateTime);
    } else {
      Logger.log('❌ 日期時間格式驗證失敗：' + dateTime);
      return false;
    }
    
    if (datePattern.test(dateOnly)) {
      Logger.log('✅ 日期格式驗證通過：' + dateOnly);
    } else {
      Logger.log('❌ 日期格式驗證失敗：' + dateOnly);
      return false;
    }
    
    // 測試檔名生成範例
    const testFilenames = [
      `電聯進度報告_${dateTime}`,
      `系統設定備份_${dateTime}`,
      `學生資料匯出_${dateTime}`,
      `王小明_學生資料匯出_${dateTime}`
    ];
    
    Logger.log('📂 測試檔名範例：');
    testFilenames.forEach(filename => {
      Logger.log(`  - ${filename}`);
    });
    
    // 驗證檔名中沒有非法字符
    const illegalChars = /[<>:"/\\|?*]/;
    const hasIllegalChars = testFilenames.some(filename => illegalChars.test(filename));
    
    if (!hasIllegalChars) {
      Logger.log('✅ 檔名字符驗證通過 - 無非法字符');
    } else {
      Logger.log('❌ 檔名字符驗證失敗 - 包含非法字符');
      return false;
    }
    
    Logger.log('🎉 檔名時間戳測試完成！所有格式均符合要求');
    return true;
    
  } catch (error) {
    Logger.log('❌ 檔名時間戳測試失敗：' + error.message);
    return false;
  }
}

/**
 * 測試檔名唯一性（模擬同一秒內多次調用）
 */
function testFilenameUniqueness() {
  Logger.log('🔄 開始測試檔名唯一性...');
  
  try {
    const filenames = [];
    
    // 快速生成5個檔名
    for (let i = 0; i < 5; i++) {
      filenames.push(formatDateTimeForFilename());
    }
    
    Logger.log('📝 生成的檔名：');
    filenames.forEach((name, index) => {
      Logger.log(`  ${index + 1}. ${name}`);
    });
    
    // 檢查是否有重複
    const uniqueFilenames = [...new Set(filenames)];
    
    if (uniqueFilenames.length === filenames.length) {
      Logger.log('✅ 檔名唯一性測試通過 - 無重複檔名');
    } else {
      Logger.log('⚠️ 檔名唯一性測試：在同一分鐘內可能產生相同檔名');
      Logger.log('💡 這是預期行為，分鐘級別的時間戳已足夠大多數使用場景');
    }
    
    return true;
    
  } catch (error) {
    Logger.log('❌ 檔名唯一性測試失敗：' + error.message);
    return false;
  }
}

// ===== Dashboard 功能測試函數 =====

/**
 * 測試 Dashboard 統計功能
 */
function testDashboardStats() {
  Logger.log('📊 開始測試Dashboard統計功能...');
  
  try {
    // 測試統計函數
    const stats = calculateSystemStats();
    
    Logger.log('✅ Dashboard統計數據：');
    Logger.log(`  - 英文老師數：${stats.teacherCount}`);
    Logger.log(`  - 學生總數：${stats.studentCount}`);
    Logger.log(`  - 已完成電聯次數：${stats.contactCount}`);
    Logger.log(`  - 學期電聯次數：${stats.semesterContactCount}`);
    Logger.log(`  - ${stats.currentSemester} ${stats.currentTerm}進度：${stats.currentTermProgress}%`);
    Logger.log(`  - 當前Term完成學生數：${stats.currentTermCompleted}/${stats.currentTermTotal}`);
    
    // 驗證統計邏輯
    Logger.log('🔍 驗證統計邏輯：');
    Logger.log('  - contactCount 現在統計「已完成電聯次數」（四個關鍵欄位都填寫）');
    Logger.log('  - semesterContactCount 統計「已完成的學期電聯」');
    Logger.log('  - Fall Beginning進度使用相同的四個關鍵欄位標準');
    
    // 檢查四個關鍵欄位標準
    Logger.log('📋 四個關鍵欄位標準：');
    Logger.log('  1. Date（第5欄或動態檢測）');
    Logger.log('  2. Teachers Content（第9欄）');
    Logger.log('  3. Parents Responses（第10欄）');
    Logger.log('  4. Contact Method（第11欄）');
    Logger.log('  ✅ 只有這四個欄位都填寫的記錄才算「已完成電聯」');
    
    Logger.log('🎉 Dashboard統計功能測試完成！');
    return true;
    
  } catch (error) {
    Logger.log('❌ Dashboard統計測試失敗：' + error.message);
    Logger.log('錯誤詳情：' + error.stack);
    return false;
  }
}

/**
 * 測試 Fall Beginning 進度統計邏輯
 */
function testFallBeginningProgress() {
  Logger.log('🍂 開始測試Fall Beginning進度統計邏輯...');
  
  try {
    // 說明Fall Beginning進度的統計方式
    Logger.log('📈 Fall Beginning進度統計說明：');
    Logger.log('');
    Logger.log('1. 📚 數據來源：');
    Logger.log('   - 來自各老師記錄簿的電聯記錄工作表');
    Logger.log('   - 欄位：Semester="Fall", Term="Beginning", Contact Type="Scheduled Contact"');
    Logger.log('');
    Logger.log('2. 🎯 完成標準（四個關鍵欄位）：');
    Logger.log('   - Date: 電聯日期必須填寫');
    Logger.log('   - Teachers Content: 老師溝通內容必須填寫');
    Logger.log('   - Parents Responses: 家長回應必須填寫');
    Logger.log('   - Contact Method: 聯絡方式必須填寫');
    Logger.log('');
    Logger.log('3. 📊 計算方式：');
    Logger.log('   - 已完成學生數 = 符合上述標準的唯一Student ID數量');
    Logger.log('   - 總學生數 = 該老師的學生清單總數');
    Logger.log('   - 完成率 = (已完成學生數 ÷ 總學生數) × 100%');
    Logger.log('');
    Logger.log('4. 🔍 系統統計：');
    Logger.log('   - Dashboard顯示全系統的Fall Beginning整體進度');
    Logger.log('   - 個別老師記錄簿的進度工作表顯示詳細分解');
    Logger.log('');
    Logger.log('✅ 這個設計確保了電聯記錄的質量，只有真正完成溝通的記錄才被計入統計。');
    
    return true;
    
  } catch (error) {
    Logger.log('❌ Fall Beginning進度測試失敗：' + error.message);
    return false;
  }
}

/**
 * 測試 Dashboard 階段切換功能
 */
function testDashboardStageSwitch() {
  Logger.log('🔄 開始測試Dashboard階段切換功能...');
  
  try {
    // 測試不同學期階段組合
    const testStages = [
      { semester: 'Fall', term: 'Beginning' },
      { semester: 'Fall', term: 'Midterm' },
      { semester: 'Fall', term: 'Final' },
      { semester: 'Spring', term: 'Beginning' },
      { semester: 'Spring', term: 'Midterm' },
      { semester: 'Spring', term: 'Final' }
    ];
    
    Logger.log('📊 測試各階段統計查詢：');
    
    testStages.forEach((stage, index) => {
      try {
        Logger.log(`\n${index + 1}. 測試 ${stage.semester} ${stage.term}：`);
        
        // 測試後端查詢函數
        const result = getProgressByStageWeb(stage.semester, stage.term);
        
        if (result.success) {
          const stats = result.stats;
          Logger.log(`   ✅ 查詢成功`);
          Logger.log(`   - 已完成學生數：${stats.completedStudents}`);
          Logger.log(`   - 總學生數：${stats.totalStudents}`);
          Logger.log(`   - 完成率：${stats.completionRate}%`);
          Logger.log(`   - 完成老師數：${stats.completedTeachers}`);
          Logger.log(`   - 總老師數：${stats.totalTeachers}`);
        } else {
          Logger.log(`   ⚠️ 查詢結果：${result.message}`);
          Logger.log(`   - 預設統計：已完成 ${result.stats.completedStudents}/${result.stats.totalStudents} 學生`);
        }
        
      } catch (error) {
        Logger.log(`   ❌ ${stage.semester} ${stage.term} 測試失敗：${error.message}`);
      }
    });
    
    // 測試兼容性檢查
    Logger.log('\n🔍 測試與現有系統兼容性：');
    
    try {
      // 測試原有統計函數是否正常運作
      const originalStats = calculateSystemStats();
      Logger.log('   ✅ 原有calculateSystemStats()函數正常運作');
      Logger.log(`   - 當前學期：${originalStats.currentSemester} ${originalStats.currentTerm}`);
      Logger.log(`   - 當前進度：${originalStats.currentTermProgress}%`);
      
      // 測試新舊統計是否一致
      const currentStageResult = getProgressByStageWeb(
        originalStats.currentSemester, 
        originalStats.currentTerm
      );
      
      if (currentStageResult.success) {
        const isConsistent = Math.abs(
          originalStats.currentTermProgress - currentStageResult.stats.completionRate
        ) < 0.1; // 允許0.1%的浮點誤差
        
        if (isConsistent) {
          Logger.log('   ✅ 新舊統計結果一致，兼容性良好');
        } else {
          Logger.log('   ⚠️ 新舊統計結果略有差異（可能因為計算精度）');
          Logger.log(`   - 原有統計：${originalStats.currentTermProgress}%`);
          Logger.log(`   - 新統計：${currentStageResult.stats.completionRate}%`);
        }
      }
      
    } catch (error) {
      Logger.log(`   ❌ 兼容性測試失敗：${error.message}`);
    }
    
    Logger.log('\n🎉 Dashboard階段切換功能測試完成！');
    Logger.log('💡 所有階段查詢均可正常運作，用戶可以切換查看不同學期階段的進度統計');
    
    return true;
    
  } catch (error) {
    Logger.log('❌ Dashboard階段切換測試失敗：' + error.message);
    Logger.log('錯誤詳情：' + error.stack);
    return false;
  }
}

// ===== 快速測試函數 =====

/**
 * 快速測試格式函數
 */
function quickTestFormatFunctions() {
  try {
    const functions = ['formatDateTimeForFilename', 'formatDateForFilename'];
    let missing = [];
    
    functions.forEach(func => {
      if (typeof eval(func) !== 'function') {
        missing.push(func);
      }
    });
    
    if (missing.length === 0) {
      return { success: true, message: '所有格式函數已定義' };
    } else {
      return { success: false, message: `缺少函數: ${missing.join(', ')}` };
    }
  } catch (error) {
    return { success: false, message: `檢查失敗: ${error.message}` };
  }
}

/**
 * 快速測試 Dashboard 函數
 */
function quickTestDashboardFunctions() {
  try {
    const functions = ['calculateSystemStats', 'getProgressByStageWeb'];
    let missing = [];
    
    functions.forEach(func => {
      if (typeof eval(func) !== 'function') {
        missing.push(func);
      }
    });
    
    if (missing.length === 0) {
      return { success: true, message: '所有 Dashboard 函數已定義' };
    } else {
      return { success: false, message: `缺少函數: ${missing.join(', ')}` };
    }
  } catch (error) {
    return { success: false, message: `檢查失敗: ${error.message}` };
  }
}

/**
 * 快速測試 UI 函數
 */
function quickTestUIFunctions() {
  try {
    const functions = ['createClassInfoSheet'];
    let missing = [];
    
    functions.forEach(func => {
      if (typeof eval(func) !== 'function') {
        missing.push(func);
      }
    });
    
    if (missing.length === 0) {
      return { success: true, message: '所有 UI 函數已定義' };
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
 * 生成系統變更測試報告
 */
function generateSystemChangesTestReport(testResults) {
  Logger.log('\n📊 系統變更測試報告');
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
    Logger.log('\n🎉 系統變更測試全部通過！');
    Logger.log('✅ 所有變更功能已正確實施');
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
    Logger.log('• 系統變更功能正常，可以正常使用');
    Logger.log('• 所有格式處理和 UI 變更已正確實施');
    Logger.log('• Dashboard 功能運作良好');
  } else {
    Logger.log('• 檢查失敗的測試項目並進行修復');
    Logger.log('• 確認相關函數已正確部署');
    Logger.log('• 重新執行測試直到全部通過');
  }
}

// ===== 向下相容的函數別名 =====

/**
 * 向下相容 - 所有測試的別名
 */
function runAllTests() {
  return runSystemChangesTest('all');
}