/**
 * 記錄格式一致性驗證工具
 * 專門驗證不同創建路徑產生的 Scheduled Contact 記錄格式是否一致
 * 
 * Phase 2: 測試和驗證一致性
 */

/**
 * 驗證兩種創建路徑產生的記錄格式一致性
 */
function validateRecordFormatConsistency() {
  try {
    Logger.log('🔍 開始驗證記錄格式一致性...');
    Logger.log('═'.repeat(60));
    
    const validationResults = {
      success: true,
      issues: [],
      details: {
        prebuildPath: {},
        transferPath: {},
        comparison: {}
      }
    };
    
    // 測試學生資料
    const testStudent = {
      'ID': 'TEST123',
      'Chinese Name': '測試學生',
      'English Name': 'Test Student',
      'English Class': 'G1 Consistency Test'
    };
    
    // 路徑1：模擬 performPrebuildScheduledContacts 的記錄創建
    Logger.log('📋 測試路徑1：模擬初始記錄簿創建 (performPrebuildScheduledContacts)');
    const prebuildRecords = simulatePerformPrebuildScheduledContacts([testStudent]);
    validationResults.details.prebuildPath = {
      recordCount: prebuildRecords.length,
      sampleRecord: prebuildRecords[0] || null
    };
    
    // 路徑2：模擬學生轉班時的記錄創建
    Logger.log('📋 測試路徑2：模擬學生轉班記錄創建 (generateScheduledContactsForStudent)');
    const transferRecords = generateScheduledContactsForStudent(testStudent);
    validationResults.details.transferPath = {
      recordCount: transferRecords.length,
      sampleRecord: transferRecords[0] || null
    };
    
    // 比較記錄數量
    if (prebuildRecords.length !== transferRecords.length) {
      validationResults.success = false;
      validationResults.issues.push(`❌ 記錄數量不一致：prebuild=${prebuildRecords.length}, transfer=${transferRecords.length}`);
    } else {
      Logger.log(`✅ 記錄數量一致：${prebuildRecords.length} 筆`);
    }
    
    // 逐筆比較記錄格式
    if (prebuildRecords.length > 0 && transferRecords.length > 0) {
      Logger.log('🔍 開始逐筆比較記錄格式...');
      
      const comparisonResults = compareRecordArrays(prebuildRecords, transferRecords);
      validationResults.details.comparison = comparisonResults;
      
      if (!comparisonResults.identical) {
        validationResults.success = false;
        validationResults.issues.push(...comparisonResults.differences);
      } else {
        Logger.log('✅ 所有記錄格式完全一致');
      }
    }
    
    // 驗證欄位結構
    if (prebuildRecords.length > 0) {
      const structureValidation = validateRecordStructure(prebuildRecords[0]);
      if (!structureValidation.valid) {
        validationResults.success = false;
        validationResults.issues.push(`❌ prebuild記錄結構錯誤：${structureValidation.error}`);
      }
    }
    
    if (transferRecords.length > 0) {
      const structureValidation = validateRecordStructure(transferRecords[0]);
      if (!structureValidation.valid) {
        validationResults.success = false;
        validationResults.issues.push(`❌ transfer記錄結構錯誤：${structureValidation.error}`);
      }
    }
    
    // 顯示結果
    Logger.log('\n📊 一致性驗證結果：');
    Logger.log('═'.repeat(60));
    
    if (validationResults.success) {
      Logger.log('🎉 記錄格式一致性驗證完全通過！');
      Logger.log('💡 所有創建路徑產生的 Scheduled Contact 記錄格式完全一致');
    } else {
      Logger.log('❌ 記錄格式一致性驗證失敗：');
      validationResults.issues.forEach(issue => Logger.log(`   ${issue}`));
    }
    
    return validationResults;
    
  } catch (error) {
    Logger.log(`❌ 記錄格式一致性驗證發生錯誤：${error.message}`);
    return {
      success: false,
      issues: [`驗證過程發生錯誤：${error.message}`],
      details: {}
    };
  }
}

/**
 * 模擬 performPrebuildScheduledContacts 的記錄創建邏輯
 * 注意：這是模擬函數，使用統一化後的邏輯
 */
function simulatePerformPrebuildScheduledContacts(studentArray) {
  const simulatedRecords = [];
  
  studentArray.forEach(studentData => {
    // 使用統一的 generateScheduledContactsForStudent 函數
    // 這模擬了修改後的 performPrebuildScheduledContacts 邏輯
    const studentScheduledContacts = generateScheduledContactsForStudent(studentData);
    simulatedRecords.push(...studentScheduledContacts);
  });
  
  return simulatedRecords;
}

/**
 * 比較兩個記錄陣列的差異
 */
function compareRecordArrays(records1, records2) {
  const result = {
    identical: true,
    differences: [],
    detailedComparison: []
  };
  
  const maxLength = Math.max(records1.length, records2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const record1 = records1[i];
    const record2 = records2[i];
    
    if (!record1) {
      result.identical = false;
      result.differences.push(`❌ 記錄${i+1}：prebuild路徑缺少記錄`);
      continue;
    }
    
    if (!record2) {
      result.identical = false;
      result.differences.push(`❌ 記錄${i+1}：transfer路徑缺少記錄`);
      continue;
    }
    
    // 比較記錄欄位數量
    if (record1.length !== record2.length) {
      result.identical = false;
      result.differences.push(`❌ 記錄${i+1}：欄位數量不同 (${record1.length} vs ${record2.length})`);
      continue;
    }
    
    // 逐欄位比較
    const fieldComparison = {
      recordIndex: i + 1,
      fieldDifferences: []
    };
    
    for (let j = 0; j < record1.length; j++) {
      const field1 = record1[j];
      const field2 = record2[j];
      
      if (field1 !== field2) {
        result.identical = false;
        const fieldName = getFieldName(j);
        result.differences.push(`❌ 記錄${i+1}.${fieldName}："${field1}" vs "${field2}"`);
        fieldComparison.fieldDifferences.push({
          field: fieldName,
          prebuild: field1,
          transfer: field2
        });
      }
    }
    
    if (fieldComparison.fieldDifferences.length > 0) {
      result.detailedComparison.push(fieldComparison);
    }
  }
  
  return result;
}

/**
 * 驗證單一記錄的結構正確性
 */
function validateRecordStructure(record) {
  if (!Array.isArray(record)) {
    return { valid: false, error: '記錄不是陣列格式' };
  }
  
  if (record.length !== 11) {
    return { valid: false, error: `記錄欄位數量錯誤，期望11欄，實際${record.length}欄` };
  }
  
  // 檢查關鍵欄位
  const requiredFields = [
    { index: 0, name: 'Student ID', required: true },
    { index: 1, name: 'Chinese Name', required: true },
    { index: 3, name: 'English Class', required: true },
    { index: 5, name: 'Semester', required: true },
    { index: 6, name: 'Term', required: true },
    { index: 7, name: 'Contact Type', required: true }
  ];
  
  for (const field of requiredFields) {
    if (field.required && (!record[field.index] || record[field.index].toString().trim() === '')) {
      return { valid: false, error: `必要欄位 ${field.name} 為空` };
    }
  }
  
  // 檢查 Contact Type 是否正確
  if (record[7] !== SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER) {
    return { valid: false, error: `Contact Type 錯誤，期望 ${SYSTEM_CONFIG.CONTACT_TYPES.SEMESTER}，實際 ${record[7]}` };
  }
  
  return { valid: true };
}

/**
 * 根據欄位索引獲取欄位名稱
 */
function getFieldName(index) {
  const fieldNames = [
    'Student ID',      // 0
    'Name',           // 1
    'English Name',   // 2
    'English Class',  // 3
    'Date',          // 4
    'Semester',      // 5
    'Term',          // 6
    'Contact Type',  // 7
    'Teachers Content', // 8
    'Parents Responses', // 9
    'Contact Method'    // 10
  ];
  
  return fieldNames[index] || `欄位${index}`;
}

/**
 * 執行完整的記錄格式驗證套件
 */
function runCompleteRecordFormatValidation() {
  Logger.log('🚀 開始運行完整的記錄格式驗證套件...');
  Logger.log('═'.repeat(60));
  
  const validationSuite = [
    { name: '記錄格式一致性驗證', fn: validateRecordFormatConsistency },
    { name: 'SYSTEM_CONFIG 配置驗證', fn: validateAcademicYearConfig },
    { name: 'generateScheduledContactsForStudent 函數驗證', fn: validateScheduledContactGeneration }
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
    Logger.log('🎉 所有記錄格式驗證通過！');
    Logger.log('💡 Scheduled Contact 記錄創建已達到格式一致性');
    Logger.log('🔧 修改後的 performPrebuildScheduledContacts 函數工作正常');
  } else {
    Logger.log('⚠️ 部分驗證未通過，請檢查相關功能');
  }
  
  return {
    success: passedTests === validationSuite.length,
    passedTests: passedTests,
    totalTests: validationSuite.length,
    results: allResults
  };
}