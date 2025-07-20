/**
 * LT Field Exact Matching Test
 * Tests the new exact LT field matching functionality
 * Verifies that findLTColumnIndex() correctly identifies LT fields and rejects "Previous Teacher"
 */

/**
 * Test the exact LT field matching functionality
 */
function testLTFieldExactMatching() {
  console.log('🎯 開始測試 LT 欄位精確匹配功能');
  
  const testResult = {
    testName: 'LT 欄位精確匹配測試',
    startTime: new Date(),
    endTime: null,
    duration: 0,
    success: false,
    details: {
      findLTColumnIndexExists: false,
      masterListHeaders: [],
      ltColumnIndex: -1,
      ltColumnName: '',
      previousTeacherIndex: -1,
      correctLTFieldFound: false,
      incorrectFieldRejected: true,
      sampleTeachers: []
    },
    issues: [],
    recommendations: []
  };
  
  try {
    // 檢查 findLTColumnIndex 函數是否存在
    console.log('🔍 步驟1: 檢查 findLTColumnIndex 函數');
    
    if (typeof findLTColumnIndex !== 'function') {
      testResult.issues.push('findLTColumnIndex 函數不存在');
      console.log('❌ findLTColumnIndex 函數不存在');
      return testResult;
    }
    
    testResult.details.findLTColumnIndexExists = true;
    console.log('✅ findLTColumnIndex 函數存在');
    
    // 獲取學生總表並檢查標題
    console.log('🔍 步驟2: 檢查學生總表標題');
    
    try {
      const masterList = SpreadsheetApp.openById(SYSTEM_CONFIG.masterListId);
      const masterSheet = masterList.getActiveSheet();
      const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
      
      testResult.details.masterListHeaders = headers.map(h => h.toString().trim());
      console.log(`📊 發現 ${headers.length} 個標題欄位`);
      console.log('📋 標題清單:', testResult.details.masterListHeaders.slice(0, 10).join(', ') + (headers.length > 10 ? '...' : ''));
      
      // 測試 findLTColumnIndex 函數
      console.log('🔍 步驟3: 測試 findLTColumnIndex 函數');
      
      const ltColumnIndex = findLTColumnIndex(headers);
      testResult.details.ltColumnIndex = ltColumnIndex;
      
      if (ltColumnIndex >= 0 && ltColumnIndex < headers.length) {
        testResult.details.ltColumnName = headers[ltColumnIndex].toString().trim();
        testResult.details.correctLTFieldFound = true;
        console.log(`✅ 找到 LT 欄位：第 ${ltColumnIndex + 1} 欄 "${testResult.details.ltColumnName}"`);
        
        // 檢查是否是正確的 LT 欄位名稱
        const validLTNames = ['LT', 'Local Teacher'];
        if (validLTNames.includes(testResult.details.ltColumnName)) {
          console.log('✅ LT 欄位名稱正確 (精確匹配成功)');
        } else {
          testResult.issues.push(`LT 欄位名稱不正確: "${testResult.details.ltColumnName}"`);
          testResult.details.correctLTFieldFound = false;
          console.log(`⚠️ LT 欄位名稱不正確: "${testResult.details.ltColumnName}"`);
        }
        
      } else {
        testResult.issues.push('findLTColumnIndex 返回無效索引');
        console.log(`❌ findLTColumnIndex 返回無效索引: ${ltColumnIndex}`);
      }
      
      // 檢查是否存在 "Previous Teacher" 欄位
      console.log('🔍 步驟4: 檢查是否正確排除 "Previous Teacher" 欄位');
      
      const previousTeacherIndex = headers.findIndex(h => 
        h.toString().trim().toLowerCase().includes('previous teacher')
      );
      
      testResult.details.previousTeacherIndex = previousTeacherIndex;
      
      if (previousTeacherIndex >= 0) {
        console.log(`📍 發現 "Previous Teacher" 欄位：第 ${previousTeacherIndex + 1} 欄 "${headers[previousTeacherIndex]}"`);
        
        // 確認 findLTColumnIndex 沒有選擇 "Previous Teacher"
        if (ltColumnIndex === previousTeacherIndex) {
          testResult.issues.push('findLTColumnIndex 錯誤地選擇了 "Previous Teacher" 欄位');
          testResult.details.incorrectFieldRejected = false;
          console.log('❌ findLTColumnIndex 錯誤地選擇了 "Previous Teacher" 欄位');
        } else {
          console.log('✅ findLTColumnIndex 正確地排除了 "Previous Teacher" 欄位');
        }
      } else {
        console.log('📍 未發現 "Previous Teacher" 欄位');
      }
      
      // 如果找到 LT 欄位，獲取一些樣本老師資料
      if (testResult.details.correctLTFieldFound && ltColumnIndex >= 0) {
        console.log('🔍 步驟5: 獲取 LT 欄位的樣本資料');
        
        const dataRange = masterSheet.getRange(2, 1, Math.min(10, masterSheet.getLastRow() - 1), masterSheet.getLastColumn());
        const data = dataRange.getValues();
        
        testResult.details.sampleTeachers = [];
        
        data.forEach((row, index) => {
          const teacher = row[ltColumnIndex];
          if (teacher && teacher.toString().trim() !== '') {
            testResult.details.sampleTeachers.push({
              row: index + 2,
              className: row[0] || 'N/A', // 假設第一欄是班級
              teacher: teacher.toString().trim()
            });
          }
        });
        
        console.log(`📊 找到 ${testResult.details.sampleTeachers.length} 個有效的 LT 資料`);
        
        if (testResult.details.sampleTeachers.length > 0) {
          console.log('📋 LT 資料樣本:');
          testResult.details.sampleTeachers.slice(0, 5).forEach((sample, index) => {
            console.log(`  ${index + 1}. ${sample.className} - LT: ${sample.teacher}`);
          });
        }
      }
      
    } catch (error) {
      testResult.issues.push(`讀取學生總表失敗: ${error.message}`);
      console.log(`❌ 讀取學生總表失敗: ${error.message}`);
    }
    
    // 判斷測試成功條件
    testResult.success = (
      testResult.details.findLTColumnIndexExists &&
      testResult.details.correctLTFieldFound &&
      testResult.details.incorrectFieldRejected &&
      testResult.details.ltColumnIndex >= 0
    );
    
    // 生成建議
    if (testResult.success) {
      testResult.recommendations.push('✅ LT 欄位精確匹配功能正常工作');
      testResult.recommendations.push('💡 系統現在會正確識別 LT 或 Local Teacher 欄位');
      testResult.recommendations.push('🛡️ 系統正確排除了 Previous Teacher 等無關欄位');
    } else {
      if (!testResult.details.correctLTFieldFound) {
        testResult.recommendations.push('🔧 檢查學生總表是否包含 "LT" 或 "Local Teacher" 欄位');
      }
      if (!testResult.details.incorrectFieldRejected) {
        testResult.recommendations.push('🔧 修復 findLTColumnIndex 函數的精確匹配邏輯');
      }
    }
    
  } catch (error) {
    testResult.issues.push(`測試執行錯誤: ${error.message}`);
    console.log(`❌ LT 欄位測試執行錯誤: ${error.message}`);
  }
  
  testResult.endTime = new Date();
  testResult.duration = (testResult.endTime - testResult.startTime) / 1000;
  
  // 輸出測試報告
  console.log('');
  console.log('=== LT 欄位精確匹配測試報告 ===');
  console.log(`測試時間: ${testResult.duration.toFixed(2)}秒`);
  console.log(`測試結果: ${testResult.success ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`LT 欄位索引: ${testResult.details.ltColumnIndex >= 0 ? testResult.details.ltColumnIndex + 1 : '未找到'}`);
  console.log(`LT 欄位名稱: ${testResult.details.ltColumnName || '無'}`);
  console.log(`Previous Teacher 欄位索引: ${testResult.details.previousTeacherIndex >= 0 ? testResult.details.previousTeacherIndex + 1 : '未找到'}`);
  console.log(`正確 LT 欄位: ${testResult.details.correctLTFieldFound ? '✅ 找到' : '❌ 未找到'}`);
  console.log(`排除錯誤欄位: ${testResult.details.incorrectFieldRejected ? '✅ 正確' : '❌ 失敗'}`);
  console.log(`LT 資料樣本數: ${testResult.details.sampleTeachers.length}`);
  
  if (testResult.issues.length > 0) {
    console.log('');
    console.log('⚠️ 發現問題:');
    testResult.issues.forEach(issue => console.log(`  • ${issue}`));
  }
  
  console.log('');
  console.log('💡 建議:');
  testResult.recommendations.forEach(rec => console.log(`  • ${rec}`));
  
  console.log('');
  console.log('=== 測試完成 ===');
  
  return testResult;
}

/**
 * Test mock header scenarios to verify exact matching logic
 */
function testMockHeaderScenarios() {
  console.log('🧪 測試模擬標題場景');
  
  const testScenarios = [
    {
      name: '正常場景 - LT 欄位',
      headers: ['Class', 'Student Name', 'LT', 'Grade'],
      expectedIndex: 2,
      expectedFound: true
    },
    {
      name: '正常場景 - Local Teacher 欄位',
      headers: ['Class', 'Student Name', 'Local Teacher', 'Grade'],
      expectedIndex: 2,
      expectedFound: true
    },
    {
      name: '混淆場景 - 包含 Previous Teacher',
      headers: ['Class', 'Student Name', 'Previous Teacher', 'LT', 'Grade'],
      expectedIndex: 3,
      expectedFound: true
    },
    {
      name: '錯誤場景 - 只有 Previous Teacher',
      headers: ['Class', 'Student Name', 'Previous Teacher', 'Grade'],
      expectedIndex: -1,
      expectedFound: false
    },
    {
      name: '錯誤場景 - 無相關欄位',
      headers: ['Class', 'Student Name', 'Teacher', 'Grade'],
      expectedIndex: -1,
      expectedFound: false
    }
  ];
  
  const results = [];
  
  testScenarios.forEach((scenario, index) => {
    console.log(`🧪 測試場景 ${index + 1}: ${scenario.name}`);
    
    try {
      const foundIndex = findLTColumnIndex(scenario.headers);
      const success = (foundIndex === scenario.expectedIndex);
      
      const result = {
        scenario: scenario.name,
        headers: scenario.headers,
        expectedIndex: scenario.expectedIndex,
        foundIndex: foundIndex,
        success: success
      };
      
      results.push(result);
      
      if (success) {
        console.log(`✅ 場景 ${index + 1} 成功: 找到索引 ${foundIndex} (預期 ${scenario.expectedIndex})`);
      } else {
        console.log(`❌ 場景 ${index + 1} 失敗: 找到索引 ${foundIndex} (預期 ${scenario.expectedIndex})`);
      }
      
    } catch (error) {
      console.log(`❌ 場景 ${index + 1} 執行錯誤: ${error.message}`);
      results.push({
        scenario: scenario.name,
        headers: scenario.headers,
        expectedIndex: scenario.expectedIndex,
        foundIndex: -1,
        success: false,
        error: error.message
      });
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / results.length) * 100;
  
  console.log('');
  console.log('=== 模擬場景測試結果 ===');
  console.log(`成功率: ${successRate.toFixed(1)}% (${successCount}/${results.length})`);
  console.log(`精確匹配邏輯: ${successRate === 100 ? '✅ 完全正確' : '❌ 需要修復'}`);
  
  return results;
}

/**
 * Quick LT field verification - can be run from console
 */
function quickLTTest() {
  Logger.log('🎯 快速 LT 欄位驗證');
  
  try {
    // 檢查 findLTColumnIndex 函數
    if (typeof findLTColumnIndex !== 'function') {
      Logger.log('❌ findLTColumnIndex 函數不存在');
      return false;
    }
    
    Logger.log('✅ findLTColumnIndex 函數存在');
    
    // 測試模擬標題
    const testHeaders = ['Class', 'Student Name', 'Previous Teacher', 'LT', 'Grade'];
    const ltIndex = findLTColumnIndex(testHeaders);
    
    Logger.log('測試標題: ' + testHeaders.join(', '));
    Logger.log('找到 LT 欄位索引: ' + ltIndex);
    Logger.log('LT 欄位名稱: ' + (ltIndex >= 0 ? testHeaders[ltIndex] : '未找到'));
    
    // 檢查是否正確識別 LT 而不是 Previous Teacher
    const success = (ltIndex === 3); // 應該是第4欄(索引3)的 "LT"
    
    Logger.log('測試結果: ' + (success ? '✅ 成功' : '❌ 失敗'));
    
    if (success) {
      Logger.log('✅ findLTColumnIndex 正確識別了 LT 欄位，排除了 Previous Teacher');
    } else {
      Logger.log('❌ findLTColumnIndex 未能正確識別 LT 欄位');
    }
    
    return success;
    
  } catch (error) {
    Logger.log('❌ 測試執行錯誤: ' + error.message);
    return false;
  }
}

/**
 * Run comprehensive LT field testing
 */
function runLTFieldTest() {
  console.log('🚀 執行完整的 LT 欄位測試');
  
  const startTime = new Date();
  
  try {
    // 測試精確匹配功能
    console.log('');
    console.log('=== 第1步: LT 欄位精確匹配測試 ===');
    const exactMatchingResult = testLTFieldExactMatching();
    
    // 測試模擬場景
    console.log('');
    console.log('=== 第2步: 模擬場景測試 ===');
    const mockScenarioResults = testMockHeaderScenarios();
    
    const endTime = new Date();
    const totalDuration = (endTime - startTime) / 1000;
    
    console.log('');
    console.log('=== 完整 LT 欄位測試完成 ===');
    console.log(`總耗時: ${totalDuration.toFixed(2)}秒`);
    console.log(`精確匹配功能: ${exactMatchingResult.success ? '✅ 正常' : '❌ 異常'}`);
    console.log(`模擬場景成功率: ${mockScenarioResults.filter(r => r.success).length}/${mockScenarioResults.length}`);
    
    const overallSuccess = exactMatchingResult.success && mockScenarioResults.every(r => r.success);
    console.log(`整體測試結果: ${overallSuccess ? '✅ 成功' : '❌ 失敗'}`);
    
    return {
      duration: totalDuration,
      exactMatchingResult: exactMatchingResult,
      mockScenarioResults: mockScenarioResults,
      success: overallSuccess
    };
    
  } catch (error) {
    console.log('❌ LT 欄位測試執行失敗: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}