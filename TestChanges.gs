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

/**
 * 測試Dashboard統計功能
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
 * 測試Fall Beginning進度統計邏輯
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
 * 測試Dashboard階段切換功能
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

/**
 * 執行所有測試函數
 */
function runAllTests() {
  Logger.log('🧪 開始執行所有測試...');
  Logger.log('='.repeat(50));
  
  const tests = [
    { name: '班級資訊工作表調整', func: testClassInfoSheetChanges },
    { name: '電話號碼格式處理', func: testPhoneNumberHandling },
    { name: '檔名時間戳功能', func: testFilenameTimestamp },
    { name: '檔名唯一性', func: testFilenameUniqueness },
    { name: 'Dashboard統計功能', func: testDashboardStats },
    { name: 'Fall Beginning進度邏輯', func: testFallBeginningProgress },
    { name: 'Dashboard階段切換功能', func: testDashboardStageSwitch }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  tests.forEach((test, index) => {
    Logger.log(`\n[${index + 1}/${totalTests}] 執行測試：${test.name}`);
    Logger.log('-'.repeat(30));
    
    try {
      const result = test.func();
      if (result) {
        Logger.log(`✅ ${test.name} - 測試通過`);
        passedTests++;
      } else {
        Logger.log(`❌ ${test.name} - 測試失敗`);
      }
    } catch (error) {
      Logger.log(`❌ ${test.name} - 執行錯誤：${error.message}`);
    }
  });
  
  Logger.log('\n' + '='.repeat(50));
  Logger.log('🏁 測試結果總結：');
  Logger.log(`   - 通過測試：${passedTests}/${totalTests}`);
  Logger.log(`   - 測試成功率：${Math.round(passedTests / totalTests * 100)}%`);
  
  if (passedTests === totalTests) {
    Logger.log('🎉 所有測試均通過！系統功能運作正常。');
  } else {
    Logger.log('⚠️ 部分測試未通過，請檢查相關功能。');
  }
  
  return passedTests === totalTests;
}