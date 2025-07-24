/**
 * 模組化驗證執行器
 * 執行實際的函數調用來驗證模組化架構
 */

/**
 * 執行快速模組化驗證
 * 實際調用關鍵函數來測試模組功能
 */
function runQuickModularValidation() {
  const perfSession = startTimer('快速模組化驗證', 'VALIDATION');
  
  try {
    Logger.log('🚀 開始執行快速模組化驗證...');
    Logger.log('═'.repeat(50));
    
    const results = {
      success: true,
      tests: [],
      startTime: new Date()
    };
    
    // 測試1: 系統配置可訪問性
    Logger.log('🧪 測試1: 檢查SYSTEM_CONFIG可訪問性');
    try {
      if (typeof SYSTEM_CONFIG !== 'undefined' && SYSTEM_CONFIG.SHEET_NAMES) {
        results.tests.push({ name: 'SYSTEM_CONFIG訪問', status: '✅ 通過', details: 'SYSTEM_CONFIG正常可訪問' });
        Logger.log('✅ SYSTEM_CONFIG可正常訪問');
      } else {
        throw new Error('SYSTEM_CONFIG不可訪問或格式錯誤');
      }
    } catch (error) {
      results.success = false;
      results.tests.push({ name: 'SYSTEM_CONFIG訪問', status: '❌ 失敗', details: error.message });
      Logger.log(`❌ SYSTEM_CONFIG測試失敗: ${error.message}`);
    }
    
    perfSession.checkpoint('SYSTEM_CONFIG測試完成');
    
    // 測試2: ErrorHandler整合
    Logger.log('\\n🧪 測試2: 檢查ErrorHandler整合');
    try {
      if (typeof ErrorHandler !== 'undefined' && typeof ErrorHandler.handle === 'function') {
        // 測試ErrorHandler.wrap功能
        const testResult = ErrorHandler.wrap(() => {
          return 'ErrorHandler測試成功';
        }, 'ErrorHandler整合測試');
        
        if (testResult.success && testResult.result === 'ErrorHandler測試成功') {
          results.tests.push({ name: 'ErrorHandler整合', status: '✅ 通過', details: 'ErrorHandler.wrap正常工作' });
          Logger.log('✅ ErrorHandler整合正常');
        } else {
          throw new Error('ErrorHandler.wrap返回結果異常');
        }
      } else {
        throw new Error('ErrorHandler不可訪問或缺少關鍵方法');
      }
    } catch (error) {
      results.success = false;
      results.tests.push({ name: 'ErrorHandler整合', status: '❌ 失敗', details: error.message });
      Logger.log(`❌ ErrorHandler測試失敗: ${error.message}`);
    }
    
    perfSession.checkpoint('ErrorHandler測試完成');
    
    // 測試3: PerformanceMonitor整合
    Logger.log('\\n🧪 測試3: 檢查PerformanceMonitor整合');
    try {
      if (typeof startTimer === 'function') {
        const testPerfSession = startTimer('性能監控測試', 'TEST');
        testPerfSession.checkpoint('測試檢查點');
        testPerfSession.end(true, '性能監控測試完成');
        
        results.tests.push({ name: 'PerformanceMonitor整合', status: '✅ 通過', details: 'startTimer功能正常' });
        Logger.log('✅ PerformanceMonitor整合正常');
      } else {
        throw new Error('startTimer函數不可訪問');
      }
    } catch (error) {
      results.success = false;
      results.tests.push({ name: 'PerformanceMonitor整合', status: '❌ 失敗', details: error.message });
      Logger.log(`❌ PerformanceMonitor測試失敗: ${error.message}`);
    }
    
    perfSession.checkpoint('PerformanceMonitor測試完成');
    
    // 測試4: 模組函數存在性檢查
    Logger.log('\\n🧪 測試4: 檢查關鍵模組函數存在性');
    const keyFunctions = [
      'createTeacherRecordBook',          // TeacherRecordBookCreator
      'getTeacherInfoFromUser',           // TeacherUIHandler  
      'getSystemMainFolder',              // TeacherSystemManager
      'createSummarySheet',               // TeacherSheetBuilder
      'prebuildScheduledContactRecords',  // TeacherContactManager
      'diagnoseTeacherRecordBooksContactStatus', // TeacherRecordDiagnostic
      'sortContactRecords'                // TeacherRecordSorter
    ];
    
    const functionResults = [];
    for (const funcName of keyFunctions) {
      try {
        if (typeof globalThis[funcName] === 'function') {
          functionResults.push(`✅ ${funcName}`);
        } else {
          functionResults.push(`❌ ${funcName}`);
          results.success = false;
        }
      } catch (error) {
        functionResults.push(`❌ ${funcName} (error: ${error.message})`);
        results.success = false;
      }
    }
    
    results.tests.push({ 
      name: '關鍵函數存在性', 
      status: results.success ? '✅ 通過' : '❌ 部分失敗', 
      details: functionResults.join(', ')
    });
    
    Logger.log(`模組函數檢查: ${functionResults.join(', ')}`);
    
    perfSession.checkpoint('函數存在性測試完成');
    
    // 測試5: 基本跨模組依賴測試
    Logger.log('\\n🧪 測試5: 測試基本跨模組依賴');
    try {
      // 測試 TeacherSystemManager 中的函數是否能正常調用
      if (typeof getSystemMainFolder === 'function') {
        // 這個函數應該能正常執行而不拋出異常（即使在沒有實際資料夾的情況下）
        Logger.log('嘗試調用 getSystemMainFolder()...');
        
        try {
          const folderResult = getSystemMainFolder();
          results.tests.push({ name: '跨模組依賴測試', status: '✅ 通過', details: 'getSystemMainFolder()成功執行' });
          Logger.log('✅ 跨模組依賴測試通過');
        } catch (folderError) {
          // 即使函數執行失敗，只要能正常調用就說明模組依賴正常
          if (folderError.message.includes('找不到主資料夾') || folderError.message.includes('Drive')) {
            results.tests.push({ name: '跨模組依賴測試', status: '✅ 通過', details: '函數可正常調用(預期的Drive錯誤)' });
            Logger.log('✅ 跨模組依賴測試通過 (預期的Drive存取錯誤)');
          } else {
            throw folderError;
          }
        }
      } else {
        throw new Error('getSystemMainFolder函數不存在');
      }
    } catch (error) {
      results.success = false;
      results.tests.push({ name: '跨模組依賴測試', status: '❌ 失敗', details: error.message });
      Logger.log(`❌ 跨模組依賴測試失敗: ${error.message}`);
    }
    
    perfSession.checkpoint('跨模組依賴測試完成');
    
    results.endTime = new Date();
    results.totalTime = results.endTime - results.startTime;
    
    // 生成驗證報告
    generateQuickValidationReport(results);
    
    perfSession.end(true, `快速驗證完成: ${results.success ? '成功' : '部分失敗'}`);
    
    return results;
    
  } catch (error) {
    perfSession.end(false, error.message);
    Logger.log(`❌ 快速模組化驗證發生錯誤: ${error.message}`);
    ErrorHandler.handle('快速模組化驗證', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      success: false,
      error: error.message,
      tests: []
    };
  }
}

/**
 * 生成快速驗證報告
 */
function generateQuickValidationReport(results) {
  Logger.log('\\n📊 快速模組化驗證報告');
  Logger.log('═'.repeat(50));
  
  const passedTests = results.tests.filter(t => t.status.includes('✅')).length;
  const failedTests = results.tests.filter(t => t.status.includes('❌')).length;
  const successRate = Math.round((passedTests / results.tests.length) * 100);
  
  Logger.log(`📈 驗證摘要:`);
  Logger.log(`   總測試數: ${results.tests.length}`);
  Logger.log(`   通過測試: ${passedTests}`);  
  Logger.log(`   失敗測試: ${failedTests}`);
  Logger.log(`   成功率: ${successRate}%`);
  Logger.log(`   執行時間: ${results.totalTime}ms`);
  
  Logger.log('\\n📋 詳細測試結果:');
  Logger.log('-'.repeat(40));
  results.tests.forEach(test => {
    Logger.log(`${test.status} ${test.name}: ${test.details}`);
  });
  
  if (results.success) {
    Logger.log('\\n🎉 快速驗證全部通過!');
    Logger.log('✅ 模組化架構運作正常');
    Logger.log('🚀 系統已準備好進入下一階段開發');
  } else {
    Logger.log('\\n⚠️ 部分驗證未通過');
    Logger.log('🔧 請檢查失敗項目並修復問題');
  }
  
  Logger.log('\\n💡 下一步建議:');
  Logger.log('-'.repeat(40));
  if (results.success) {
    Logger.log('• 模組化驗證完成 ✅');
    Logger.log('• 可以開始 Phase 2 前端現代化');
    Logger.log('• 建議定期運行此驗證確保系統穩定');
  } else {
    Logger.log('• 修復失敗的測試項目');
    Logger.log('• 檢查模組部署是否完整');
    Logger.log('• 確認 .gs 文件已正確上傳到 Google Apps Script');
  }
}

/**
 * 執行完整的模組功能測試 
 * 測試實際業務邏輯函數的執行
 */
function runComprehensiveModularTest() {
  const perfSession = startTimer('綜合模組功能測試', 'VALIDATION');
  
  try {
    Logger.log('🚀 開始執行綜合模組功能測試...');
    Logger.log('═'.repeat(50));
    
    const results = {
      success: true,
      moduleTests: [],
      startTime: new Date()
    };
    
    // 測試 TeacherRecordDiagnostic 模組
    Logger.log('\\n🧪 測試 TeacherRecordDiagnostic 模組');
    try {
      if (typeof getSystemRecordBooksHealth === 'function') {
        Logger.log('調用 getSystemRecordBooksHealth()...');
        const healthResult = getSystemRecordBooksHealth();
        
        if (healthResult && typeof healthResult === 'object') {
          results.moduleTests.push({
            module: 'TeacherRecordDiagnostic',
            status: '✅ 通過',
            details: `健康檢查完成，狀態: ${healthResult.healthLevel || 'UNKNOWN'}`
          });
          Logger.log(`✅ TeacherRecordDiagnostic模組測試通過`);
        } else {
          throw new Error('getSystemRecordBooksHealth返回結果格式異常');
        }
      } else {
        throw new Error('getSystemRecordBooksHealth函數不存在');
      }
    } catch (error) {
      results.success = false;
      results.moduleTests.push({
        module: 'TeacherRecordDiagnostic',
        status: '❌ 失敗',
        details: error.message
      });
      Logger.log(`❌ TeacherRecordDiagnostic模組測試失敗: ${error.message}`);
    }
    
    perfSession.checkpoint('TeacherRecordDiagnostic測試完成');
    
    // 測試 TeacherRecordSorter 模組
    Logger.log('\\n🧪 測試 TeacherRecordSorter 模組');
    try {
      if (typeof sortContactRecordsData === 'function') {
        Logger.log('調用 sortContactRecordsData() 進行基本測試...');
        
        // 創建測試資料
        const testData = [
          ['Student ID', 'Name', 'English Name', 'English Class', 'Date', 'Semester', 'Term', 'Contact Type'],
          ['002', '測試學生2', 'Test Student 2', 'Class A', '', 'Fall', 'Final', 'Scheduled Contact'],
          ['001', '測試學生1', 'Test Student 1', 'Class A', '', 'Fall', 'Beginning', 'Scheduled Contact']
        ];
        
        const sortResult = sortContactRecordsData(testData);
        
        if (sortResult && sortResult.success) {
          results.moduleTests.push({
            module: 'TeacherRecordSorter',
            status: '✅ 通過',
            details: `排序測試成功，處理 ${sortResult.recordCount || 0} 筆記錄`
          });
          Logger.log(`✅ TeacherRecordSorter模組測試通過`);
        } else {
          throw new Error(sortResult.error || '排序功能測試失敗');
        }
      } else {
        throw new Error('sortContactRecordsData函數不存在');
      }
    } catch (error) {
      results.success = false;
      results.moduleTests.push({
        module: 'TeacherRecordSorter',
        status: '❌ 失敗',
        details: error.message
      });
      Logger.log(`❌ TeacherRecordSorter模組測試失敗: ${error.message}`);
    }
    
    perfSession.checkpoint('TeacherRecordSorter測試完成');
    
    // 測試 TeacherContactManager 模組
    Logger.log('\\n🧪 測試 TeacherContactManager 模組');
    try {
      if (typeof generateScheduledContactsForStudent === 'function') {
        Logger.log('調用 generateScheduledContactsForStudent() 進行基本測試...');
        
        const testStudentData = {
          'ID': 'TEST001',
          'Chinese Name': '測試學生',
          'English Name': 'Test Student',
          'English Class': 'Class A'
        };
        
        const contactRecords = generateScheduledContactsForStudent(testStudentData);
        
        if (Array.isArray(contactRecords) && contactRecords.length > 0) {
          results.moduleTests.push({
            module: 'TeacherContactManager',
            status: '✅ 通過',
            details: `成功生成 ${contactRecords.length} 筆預建電聯記錄`
          });
          Logger.log(`✅ TeacherContactManager模組測試通過`);
        } else {
          throw new Error('generateScheduledContactsForStudent返回結果異常');
        }
      } else {
        throw new Error('generateScheduledContactsForStudent函數不存在');
      }
    } catch (error) {
      results.success = false;
      results.moduleTests.push({
        module: 'TeacherContactManager',
        status: '❌ 失敗',
        details: error.message
      });
      Logger.log(`❌ TeacherContactManager模組測試失敗: ${error.message}`);
    }
    
    perfSession.checkpoint('TeacherContactManager測試完成');
    
    results.endTime = new Date();
    results.totalTime = results.endTime - results.startTime;
    
    // 生成綜合測試報告
    generateComprehensiveTestReport(results);
    
    perfSession.end(true, `綜合測試完成: ${results.success ? '成功' : '部分失敗'}`);
    
    return results;
    
  } catch (error) {
    perfSession.end(false, error.message);
    Logger.log(`❌ 綜合模組功能測試發生錯誤: ${error.message}`);
    ErrorHandler.handle('綜合模組功能測試', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      success: false,
      error: error.message,
      moduleTests: []
    };
  }
}

/**
 * 生成綜合測試報告
 */
function generateComprehensiveTestReport(results) {
  Logger.log('\\n📊 綜合模組功能測試報告');
  Logger.log('═'.repeat(50));
  
  const passedTests = results.moduleTests.filter(t => t.status.includes('✅')).length;
  const failedTests = results.moduleTests.filter(t => t.status.includes('❌')).length;
  const successRate = results.moduleTests.length > 0 ? Math.round((passedTests / results.moduleTests.length) * 100) : 0;
  
  Logger.log(`📈 綜合測試摘要:`);
  Logger.log(`   模組測試數: ${results.moduleTests.length}`);
  Logger.log(`   通過模組: ${passedTests}`);
  Logger.log(`   失敗模組: ${failedTests}`);
  Logger.log(`   成功率: ${successRate}%`);
  Logger.log(`   執行時間: ${results.totalTime}ms`);
  
  Logger.log('\\n📋 模組測試詳情:');
  Logger.log('-'.repeat(40));
  results.moduleTests.forEach(test => {
    Logger.log(`${test.status} ${test.module}: ${test.details}`);
  });
  
  if (results.success) {
    Logger.log('\\n🎉 綜合模組功能測試全部通過!');
    Logger.log('✅ 所有測試模組功能正常');
    Logger.log('✅ 模組間整合運作良好');
    Logger.log('🚀 Phase 1 模組化拆分驗證完成');
  } else {
    Logger.log('\\n⚠️ 部分模組測試未通過');
    Logger.log('🔧 請檢查失敗的模組並修復問題');
  }
}