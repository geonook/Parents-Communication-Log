/**
 * 驗證 SYSTEM_CONFIG 配置的完整性和正確性
 * 專門檢查學生轉班 Scheduled Contact 功能所需的配置
 */

/**
 * 驗證 ACADEMIC_YEAR 配置
 */
function validateAcademicYearConfig() {
  try {
    Logger.log('🔍 開始驗證 ACADEMIC_YEAR 配置...');
    
    const validationResults = {
      success: true,
      issues: [],
      details: {}
    };
    
    // 檢查 SEMESTERS 配置
    if (!SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS) {
      validationResults.success = false;
      validationResults.issues.push('❌ SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS 未定義');
    } else if (!Array.isArray(SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS)) {
      validationResults.success = false;
      validationResults.issues.push('❌ SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS 不是陣列');
    } else if (SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.length === 0) {
      validationResults.success = false;
      validationResults.issues.push('❌ SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS 是空陣列');
    } else {
      validationResults.details.semesters = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS;
      Logger.log(`✅ SEMESTERS 配置正確：${SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.join(', ')}`);
    }
    
    // 檢查 TERMS 配置
    if (!SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS) {
      validationResults.success = false;
      validationResults.issues.push('❌ SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS 未定義');
    } else if (!Array.isArray(SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS)) {
      validationResults.success = false;
      validationResults.issues.push('❌ SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS 不是陣列');
    } else if (SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.length === 0) {
      validationResults.success = false;
      validationResults.issues.push('❌ SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS 是空陣列');
    } else {
      validationResults.details.terms = SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS;
      Logger.log(`✅ TERMS 配置正確：${SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.join(', ')}`);
    }
    
    // 檢查 CONTACT_TYPES.SEMESTER 配置
    if (!SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER) {
      validationResults.success = false;
      validationResults.issues.push('❌ SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER 未定義');
    } else {
      validationResults.details.contactType = SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER;
      Logger.log(`✅ CONTACT_TYPES.SEMESTER 配置正確：${SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER}`);
    }
    
    // 計算預期的 Scheduled Contact 記錄數量
    if (validationResults.success) {
      const expectedRecordCount = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.length * SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.length;
      validationResults.details.expectedRecordCount = expectedRecordCount;
      Logger.log(`📊 預期每位學生生成 ${expectedRecordCount} 筆 Scheduled Contact 記錄`);
      Logger.log(`   (${SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.length} 學期 × ${SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.length} Terms = ${expectedRecordCount})`);
    }
    
    // 顯示結果
    if (validationResults.success) {
      Logger.log('🎉 ACADEMIC_YEAR 配置驗證完全通過！');
    } else {
      Logger.log('❌ ACADEMIC_YEAR 配置驗證失敗：');
      validationResults.issues.forEach(issue => Logger.log(`   ${issue}`));
    }
    
    return validationResults;
    
  } catch (error) {
    Logger.log(`❌ 驗證 ACADEMIC_YEAR 配置時發生錯誤：${error.message}`);
    return {
      success: false,
      issues: [`驗證過程發生錯誤：${error.message}`],
      details: {}
    };
  }
}

/**
 * 驗證 generateScheduledContactsForStudent 函數
 */
function validateScheduledContactGeneration() {
  try {
    Logger.log('🧪 開始驗證 generateScheduledContactsForStudent 函數...');
    
    // 準備測試資料
    const testStudent = {
      'ID': 'VALID001',
      'Chinese Name': '驗證學生',
      'English Name': 'Validation Student',
      'English Class': 'G1 Validation Class'
    };
    
    // 調用函數
    const scheduledContacts = generateScheduledContactsForStudent(testStudent);
    
    const validationResults = {
      success: true,
      issues: [],
      details: {
        generatedRecords: scheduledContacts.length,
        testStudent: testStudent
      }
    };
    
    // 檢查記錄數量
    const expectedCount = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.length * SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.length;
    if (scheduledContacts.length !== expectedCount) {
      validationResults.success = false;
      validationResults.issues.push(`❌ 記錄數量不正確：期望 ${expectedCount}，實際 ${scheduledContacts.length}`);
    } else {
      Logger.log(`✅ 記錄數量正確：${scheduledContacts.length} 筆`);
    }
    
    // 檢查記錄格式
    if (scheduledContacts.length > 0) {
      const firstRecord = scheduledContacts[0];
      
      if (firstRecord.length !== 11) {
        validationResults.success = false;
        validationResults.issues.push(`❌ 記錄欄位數量不正確：期望 11，實際 ${firstRecord.length}`);
      } else {
        Logger.log(`✅ 記錄欄位數量正確：11 欄`);
      }
      
      // 檢查關鍵欄位
      if (firstRecord[0] !== testStudent.ID) {
        validationResults.success = false;
        validationResults.issues.push(`❌ Student ID 不正確：期望 ${testStudent.ID}，實際 ${firstRecord[0]}`);
      }
      
      if (firstRecord[7] !== SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER) {
        validationResults.success = false;
        validationResults.issues.push(`❌ Contact Type 不正確：期望 ${SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER}，實際 ${firstRecord[7]}`);
      }
      
      if (validationResults.success) {
        Logger.log(`✅ 記錄格式驗證通過`);
      }
    }
    
    // 檢查學期Term覆蓋完整性
    const semesterTermPairs = new Set();
    scheduledContacts.forEach(record => {
      const semester = record[5]; // F欄: Semester
      const term = record[6];     // G欄: Term
      semesterTermPairs.add(`${semester}-${term}`);
    });
    
    const expectedPairs = SYSTEM_CONFIG.ACADEMIC_YEAR.SEMESTERS.length * SYSTEM_CONFIG.ACADEMIC_YEAR.TERMS.length;
    if (semesterTermPairs.size !== expectedPairs) {
      validationResults.success = false;
      validationResults.issues.push(`❌ 學期Term組合不完整：期望 ${expectedPairs}，實際 ${semesterTermPairs.size}`);
    } else {
      Logger.log(`✅ 學期Term覆蓋完整性驗證通過：${semesterTermPairs.size} 組組合`);
      
      // 顯示所有組合
      const combinations = Array.from(semesterTermPairs).sort();
      Logger.log(`📋 學期Term組合：${combinations.join(', ')}`);
    }
    
    validationResults.details.generatedCombinations = Array.from(semesterTermPairs);
    
    // 顯示結果
    if (validationResults.success) {
      Logger.log('🎉 generateScheduledContactsForStudent 函數驗證完全通過！');
    } else {
      Logger.log('❌ generateScheduledContactsForStudent 函數驗證失敗：');
      validationResults.issues.forEach(issue => Logger.log(`   ${issue}`));
    }
    
    return validationResults;
    
  } catch (error) {
    Logger.log(`❌ 驗證 generateScheduledContactsForStudent 函數時發生錯誤：${error.message}`);
    return {
      success: false,
      issues: [`驗證過程發生錯誤：${error.message}`],
      details: {}
    };
  }
}

/**
 * 運行完整的系統配置驗證
 */
function runCompleteSystemValidation() {
  Logger.log('🚀 開始運行完整的系統配置驗證...');
  Logger.log('═'.repeat(60));
  
  const validationSuite = [
    { name: 'ACADEMIC_YEAR 配置驗證', fn: validateAcademicYearConfig },
    { name: 'Scheduled Contact 生成函數驗證', fn: validateScheduledContactGeneration }
  ];
  
  let passedTests = 0;
  const allResults = {};
  
  validationSuite.forEach(test => {
    Logger.log(`\n📋 執行驗證：${test.name}`);
    Logger.log('-'.repeat(40));
    
    try {
      const result = test.fn();
      allResults[test.name] = result;
      
      if (result.success) {
        Logger.log(`✅ ${test.name} - 通過`);
        passedTests++;
      } else {
        Logger.log(`❌ ${test.name} - 失敗`);
      }
    } catch (error) {
      Logger.log(`❌ ${test.name} - 錯誤：${error.message}`);
      allResults[test.name] = { success: false, error: error.message };
    }
  });
  
  Logger.log('\n📊 驗證總結：');
  Logger.log('═'.repeat(60));
  Logger.log(`通過驗證：${passedTests}/${validationSuite.length}`);
  Logger.log(`成功率：${Math.round(passedTests / validationSuite.length * 100)}%`);
  
  if (passedTests === validationSuite.length) {
    Logger.log('🎉 所有系統配置驗證通過！');
    Logger.log('💡 學生轉班 Scheduled Contact 記錄同步功能配置正確');
    Logger.log('\n📋 關鍵配置摘要：');
    if (allResults['ACADEMIC_YEAR 配置驗證']?.details) {
      const details = allResults['ACADEMIC_YEAR 配置驗證'].details;
      Logger.log(`   學期：${details.semesters?.join(', ')}`);
      Logger.log(`   Terms：${details.terms?.join(', ')}`);
      Logger.log(`   Contact Type：${details.contactType}`);
      Logger.log(`   每位學生記錄數：${details.expectedRecordCount} 筆`);
    }
  } else {
    Logger.log('⚠️ 部分驗證未通過，請檢查相關配置');
  }
  
  return {
    success: passedTests === validationSuite.length,
    passedTests: passedTests,
    totalTests: validationSuite.length,
    results: allResults
  };
}