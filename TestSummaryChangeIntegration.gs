/**
 * 測試總覽工作表異動記錄整合功能
 * 驗證班級資訊工作表移除後，異動記錄能正確寫入總覽工作表
 */

/**
 * 運行總覽工作表異動記錄整合測試
 */
function testSummaryChangeIntegration() {
  Logger.log('🧪 開始測試總覽工作表異動記錄整合功能');
  
  const testResults = {
    success: true,
    tests: [],
    summary: ''
  };
  
  try {
    // 測試1: 檢查 addStudentChangeToSummary 函數是否存在
    const test1 = testAddStudentChangeToSummaryExists();
    testResults.tests.push(test1);
    
    // 測試2: 檢查新老師記錄簿是否不再創建班級資訊工作表
    const test2 = testNoClassInfoSheetCreation();
    testResults.tests.push(test2);
    
    // 測試3: 模擬異動記錄寫入總覽工作表
    const test3 = testSummaryChangeRecordWrite();
    testResults.tests.push(test3);
    
    // 匯總結果
    const passedTests = testResults.tests.filter(t => t.passed).length;
    const totalTests = testResults.tests.length;
    testResults.success = passedTests === totalTests;
    testResults.summary = `總覽工作表異動記錄整合測試：${passedTests}/${totalTests} 通過`;
    
    Logger.log(`✅ 測試完成：${testResults.summary}`);
    testResults.tests.forEach(test => {
      Logger.log(`  ${test.passed ? '✅' : '❌'} ${test.name}: ${test.message}`);
    });
    
  } catch (error) {
    testResults.success = false;
    testResults.summary = `測試執行失敗：${error.message}`;
    Logger.log(`❌ 測試執行失敗：${error.message}`);
  }
  
  return testResults;
}

/**
 * 測試 addStudentChangeToSummary 函數是否存在
 */
function testAddStudentChangeToSummaryExists() {
  try {
    // 檢查函數是否已定義
    const functionExists = typeof addStudentChangeToSummary === 'function';
    
    return {
      name: 'addStudentChangeToSummary 函數存在性檢查',
      passed: functionExists,
      message: functionExists ? '函數已正確定義' : '函數未找到或未定義'
    };
  } catch (error) {
    return {
      name: 'addStudentChangeToSummary 函數存在性檢查',
      passed: false,
      message: `檢查失敗：${error.message}`
    };
  }
}

/**
 * 測試新建記錄簿是否不再創建班級資訊工作表
 */
function testNoClassInfoSheetCreation() {
  try {
    // 創建測試用的記錄簿
    const testSpreadsheet = SpreadsheetApp.create('測試_總覽異動記錄整合');
    
    // 模擬老師資訊
    const mockTeacherInfo = {
      name: '測試老師',
      subject: '英語',
      classes: ['TestClass1'],
      students: []
    };
    
    // 呼叫設定函數（不包含 createClassInfoSheet）
    setupTeacherRecordBook(testSpreadsheet, mockTeacherInfo);
    
    // 檢查是否有班級資訊工作表
    const classInfoSheet = testSpreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CLASS_INFO);
    const hasClassInfoSheet = classInfoSheet !== null;
    
    // 清理測試檔案
    DriveApp.getFileById(testSpreadsheet.getId()).setTrashed(true);
    
    return {
      name: '新記錄簿不創建班級資訊工作表',
      passed: !hasClassInfoSheet,
      message: hasClassInfoSheet ? '仍然創建了班級資訊工作表' : '成功避免創建班級資訊工作表'
    };
    
  } catch (error) {
    return {
      name: '新記錄簿不創建班級資訊工作表',
      passed: false,
      message: `測試失敗：${error.message}`
    };
  }
}

/**
 * 測試異動記錄寫入總覽工作表功能
 */
function testSummaryChangeRecordWrite() {
  try {
    // 創建測試用的記錄簿
    const testSpreadsheet = SpreadsheetApp.create('測試_異動記錄寫入總覽');
    
    // 創建總覽工作表
    const summarySheet = testSpreadsheet.insertSheet(SYSTEM_CONFIG.SHEET_NAMES.SUMMARY);
    summarySheet.getRange('A1').setValue('測試老師電聯記錄簿');
    summarySheet.getRange('B5').setValue('TestClass1'); // 班級資訊
    
    // 測試異動記錄寫入
    const testChangeInfo = {
      studentId: 'TEST001',
      studentName: '測試學生',
      changeType: '測試轉入',
      fromTeacher: '原老師',
      toTeacher: '新老師',
      toClass: 'TestClass1',
      changeDate: new Date().toLocaleString(),
      reason: '測試用途'
    };
    
    // 呼叫新的函數
    addStudentChangeToSummary(testSpreadsheet, testChangeInfo);
    
    // 驗證記錄是否寫入
    const summaryData = summarySheet.getDataRange().getValues();
    let changeRecordFound = false;
    
    for (let i = 0; i < summaryData.length; i++) {
      for (let j = 0; j < summaryData[i].length; j++) {
        if (summaryData[i][j].toString().includes('測試學生')) {
          changeRecordFound = true;
          break;
        }
      }
      if (changeRecordFound) break;
    }
    
    // 清理測試檔案
    DriveApp.getFileById(testSpreadsheet.getId()).setTrashed(true);
    
    return {
      name: '異動記錄寫入總覽工作表',
      passed: changeRecordFound,
      message: changeRecordFound ? '異動記錄成功寫入總覽工作表' : '未在總覽工作表中找到異動記錄'
    };
    
  } catch (error) {
    return {
      name: '異動記錄寫入總覽工作表',
      passed: false,
      message: `測試失敗：${error.message}`
    };
  }
}

/**
 * 快速執行測試（供開發時使用）
 */
function quickTestSummaryIntegration() {
  const results = testSummaryChangeIntegration();
  Logger.log('\n📊 測試結果摘要：');
  Logger.log(results.summary);
  return results;
}