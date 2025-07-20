/**
 * Simple LT Field Test
 * Copy and paste this function into Google Apps Script console to test
 */

function simpleLTFieldTest() {
  console.log('🎯 簡單 LT 欄位測試開始');
  
  try {
    // Test 1: Check if findLTColumnIndex function exists
    console.log('測試 1: 檢查 findLTColumnIndex 函數是否存在');
    if (typeof findLTColumnIndex !== 'function') {
      console.log('❌ findLTColumnIndex 函數不存在');
      return { success: false, error: 'findLTColumnIndex function not found' };
    }
    console.log('✅ findLTColumnIndex 函數存在');
    
    // Test 2: Test with mock headers - should find "LT"
    console.log('測試 2: 測試正常 LT 欄位識別');
    const headers1 = ['Class', 'Student Name', 'LT', 'Grade'];
    const ltIndex1 = findLTColumnIndex(headers1);
    console.log('標題:', headers1.join(', '));
    console.log('LT 欄位索引:', ltIndex1);
    console.log('LT 欄位名稱:', ltIndex1 >= 0 ? headers1[ltIndex1] : '未找到');
    
    if (ltIndex1 === 2 && headers1[ltIndex1] === 'LT') {
      console.log('✅ 測試 2 成功: 正確識別 LT 欄位');
    } else {
      console.log('❌ 測試 2 失敗: 未能正確識別 LT 欄位');
      return { success: false, error: 'Failed to identify LT field' };
    }
    
    // Test 3: Test with "Local Teacher"
    console.log('測試 3: 測試 Local Teacher 欄位識別');
    const headers2 = ['Class', 'Student Name', 'Local Teacher', 'Grade'];
    const ltIndex2 = findLTColumnIndex(headers2);
    console.log('標題:', headers2.join(', '));
    console.log('LT 欄位索引:', ltIndex2);
    console.log('LT 欄位名稱:', ltIndex2 >= 0 ? headers2[ltIndex2] : '未找到');
    
    if (ltIndex2 === 2 && headers2[ltIndex2] === 'Local Teacher') {
      console.log('✅ 測試 3 成功: 正確識別 Local Teacher 欄位');
    } else {
      console.log('❌ 測試 3 失敗: 未能正確識別 Local Teacher 欄位');
      return { success: false, error: 'Failed to identify Local Teacher field' };
    }
    
    // Test 4: Test rejection of "Previous Teacher"
    console.log('測試 4: 測試排除 Previous Teacher 欄位');
    const headers3 = ['Class', 'Student Name', 'Previous Teacher', 'LT', 'Grade'];
    const ltIndex3 = findLTColumnIndex(headers3);
    console.log('標題:', headers3.join(', '));
    console.log('LT 欄位索引:', ltIndex3);
    console.log('LT 欄位名稱:', ltIndex3 >= 0 ? headers3[ltIndex3] : '未找到');
    
    if (ltIndex3 === 3 && headers3[ltIndex3] === 'LT') {
      console.log('✅ 測試 4 成功: 正確排除 Previous Teacher，選擇了 LT');
    } else {
      console.log('❌ 測試 4 失敗: 未能正確排除 Previous Teacher');
      return { success: false, error: 'Failed to reject Previous Teacher field' };
    }
    
    // Test 5: Test when only "Previous Teacher" exists (should return -1)
    console.log('測試 5: 測試只有 Previous Teacher 的情況');
    const headers4 = ['Class', 'Student Name', 'Previous Teacher', 'Grade'];
    const ltIndex4 = findLTColumnIndex(headers4);
    console.log('標題:', headers4.join(', '));
    console.log('LT 欄位索引:', ltIndex4);
    console.log('LT 欄位名稱:', ltIndex4 >= 0 ? headers4[ltIndex4] : '未找到');
    
    if (ltIndex4 === -1) {
      console.log('✅ 測試 5 成功: 正確拒絕了只有 Previous Teacher 的情況');
    } else {
      console.log('❌ 測試 5 失敗: 錯誤地接受了 Previous Teacher');
      return { success: false, error: 'Incorrectly accepted Previous Teacher' };
    }
    
    console.log('');
    console.log('🎉 所有測試都通過！LT 欄位精確匹配功能正常工作');
    console.log('✅ 能正確識別 "LT" 和 "Local Teacher" 欄位');
    console.log('✅ 能正確排除 "Previous Teacher" 欄位');
    console.log('✅ 精確匹配邏輯工作正常');
    
    return { 
      success: true, 
      message: 'All LT field tests passed successfully',
      details: {
        ltFieldFound: true,
        localTeacherFieldFound: true,
        previousTeacherRejected: true,
        exactMatchingWorking: true
      }
    };
    
  } catch (error) {
    console.log('❌ 測試執行錯誤:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test actual master list LT field identification
 */
function testActualMasterListLT() {
  console.log('🔍 測試實際學生總表的 LT 欄位識別');
  
  try {
    // Get master list headers
    const masterList = SpreadsheetApp.openById(SYSTEM_CONFIG.masterListId);
    const masterSheet = masterList.getActiveSheet();
    const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
    
    console.log('實際標題數量:', headers.length);
    console.log('前10個標題:', headers.slice(0, 10).map(h => h.toString().trim()).join(', '));
    
    // Test findLTColumnIndex with actual headers
    const ltIndex = findLTColumnIndex(headers);
    
    console.log('LT 欄位索引:', ltIndex);
    if (ltIndex >= 0) {
      console.log('LT 欄位名稱:', headers[ltIndex].toString().trim());
      console.log('✅ 在實際學生總表中找到 LT 欄位');
      
      // Get some sample data
      const sampleData = masterSheet.getRange(2, ltIndex + 1, Math.min(5, masterSheet.getLastRow() - 1), 1).getValues();
      console.log('LT 欄位樣本資料:');
      sampleData.forEach((row, index) => {
        if (row[0] && row[0].toString().trim() !== '') {
          console.log(`  ${index + 1}. ${row[0].toString().trim()}`);
        }
      });
      
      return { 
        success: true, 
        ltIndex: ltIndex, 
        ltFieldName: headers[ltIndex].toString().trim(),
        sampleData: sampleData.map(row => row[0]).filter(cell => cell && cell.toString().trim() !== '')
      };
    } else {
      console.log('❌ 在實際學生總表中未找到 LT 欄位');
      console.log('可能需要的欄位名稱: "LT" 或 "Local Teacher"');
      
      // Check if Previous Teacher exists
      const prevTeacherIndex = headers.findIndex(h => 
        h.toString().trim().toLowerCase().includes('previous teacher')
      );
      
      if (prevTeacherIndex >= 0) {
        console.log('⚠️ 發現 Previous Teacher 欄位:', headers[prevTeacherIndex].toString().trim());
        console.log('✅ findLTColumnIndex 正確地沒有選擇 Previous Teacher');
      }
      
      return { success: false, error: 'LT field not found in actual master list' };
    }
    
  } catch (error) {
    console.log('❌ 測試實際學生總表時發生錯誤:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Run both mock and actual tests
 */
function runCompleteLTTest() {
  console.log('🚀 執行完整的 LT 欄位測試');
  console.log('==================================');
  
  // Run mock tests
  console.log('第1階段: 模擬測試');
  const mockTestResult = simpleLTFieldTest();
  
  console.log('');
  console.log('第2階段: 實際資料測試');
  const actualTestResult = testActualMasterListLT();
  
  console.log('');
  console.log('==================================');
  console.log('📊 測試總結:');
  console.log('模擬測試:', mockTestResult.success ? '✅ 通過' : '❌ 失敗');
  console.log('實際測試:', actualTestResult.success ? '✅ 通過' : '❌ 失敗');
  
  const overallSuccess = mockTestResult.success && actualTestResult.success;
  console.log('整體結果:', overallSuccess ? '✅ 所有測試通過' : '❌ 部分測試失敗');
  
  if (overallSuccess) {
    console.log('');
    console.log('🎉 恭喜！LT 欄位精確匹配功能完全正常：');
    console.log('• 能正確識別 LT 和 Local Teacher 欄位');
    console.log('• 能正確排除 Previous Teacher 欄位');
    console.log('• 在實際學生總表中成功找到 LT 欄位');
  }
  
  return {
    success: overallSuccess,
    mockTestResult: mockTestResult,
    actualTestResult: actualTestResult
  };
}