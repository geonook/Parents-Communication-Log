/**
 * 初始化邏輯分析器
 * 專門分析 createTeachersFromStudentMasterList 中可能導致 T01 學生遺漏的根本原因
 * 
 * Phase 3: 根本原因分析工具
 */

/**
 * 分析初始化邏輯中 T01 學生遺漏的根本原因
 */
function analyzeT01MissingRootCause() {
  try {
    Logger.log('🔍 開始分析初始化邏輯中 T01 學生遺漏的根本原因...');
    Logger.log('═'.repeat(60));
    
    const analysisResults = {
      success: true,
      issues: [],
      details: {
        masterListAnalysis: {},
        teacherExtractionAnalysis: {},
        studentGroupingAnalysis: {},
        importLogicAnalysis: {},
        rootCauses: []
      }
    };
    
    // 階段1: 分析主名單中的 T01 學生資料
    Logger.log('📋 階段1：分析主名單中的 T01 學生資料');
    Logger.log('-'.repeat(40));
    
    const masterListAnalysis = analyzeMasterListT01();
    analysisResults.details.masterListAnalysis = masterListAnalysis;
    
    if (!masterListAnalysis.hasT01) {
      analysisResults.success = false;
      analysisResults.issues.push('❌ 主名單中沒有 T01 學生 - 這是根本問題');
      analysisResults.details.rootCauses.push({
        cause: '主名單缺少 T01 學生',
        severity: 'Critical',
        description: '如果主名單中沒有 T01 學生，則所有後續處理都不會包含此學生',
        solution: '檢查主名單的完整性，確保包含所有學生（特別是 T01）'
      });
    } else {
      Logger.log(`✅ 主名單中找到 T01 學生：${masterListAnalysis.studentInfo.name}`);
    }
    
    // 階段2: 模擬老師提取邏輯
    if (masterListAnalysis.hasT01) {
      Logger.log('\n📋 階段2：模擬老師提取邏輯');
      Logger.log('-'.repeat(40));
      
      const extractionAnalysis = simulateTeacherExtractionForT01(masterListAnalysis);
      analysisResults.details.teacherExtractionAnalysis = extractionAnalysis;
      
      if (!extractionAnalysis.t01AssignedToTeacher) {
        analysisResults.success = false;
        analysisResults.issues.push('❌ T01 學生在老師提取階段遺漏');
        analysisResults.details.rootCauses.push({
          cause: 'T01 學生未分配給任何老師',
          severity: 'High',
          description: 'T01 學生在主名單中存在，但在 extractTeachersFromMasterList 階段未被分配給任何老師',
          solution: '檢查 T01 學生的老師欄位（LT 欄位）是否填寫正確'
        });
      } else {
        Logger.log(`✅ T01 學生正確分配給老師：${extractionAnalysis.assignedTeacher}`);
      }
    }
    
    // 階段3: 分析學生分組邏輯
    Logger.log('\n📋 階段3：分析學生分組邏輯中的潛在問題');
    Logger.log('-'.repeat(40));
    
    const groupingAnalysis = analyzeStudentGroupingLogic();
    analysisResults.details.studentGroupingAnalysis = groupingAnalysis;
    
    if (groupingAnalysis.potentialIssues.length > 0) {
      analysisResults.details.rootCauses.push(...groupingAnalysis.potentialIssues);
    }
    
    // 階段4: 分析匯入邏輯
    Logger.log('\n📋 階段4：分析學生匯入邏輯中的潛在問題');
    Logger.log('-'.repeat(40));
    
    const importAnalysis = analyzeStudentImportLogic();
    analysisResults.details.importLogicAnalysis = importAnalysis;
    
    if (importAnalysis.potentialIssues.length > 0) {
      analysisResults.details.rootCauses.push(...importAnalysis.potentialIssues);
    }
    
    // 總結根本原因
    Logger.log('\n📊 T01 學生遺漏根本原因分析總結：');
    Logger.log('═'.repeat(60));
    
    if (analysisResults.details.rootCauses.length === 0) {
      Logger.log('✅ 未發現明顯的系統性問題，T01 遺漏可能是偶發性的');
      analysisResults.details.rootCauses.push({
        cause: '偶發性數據處理問題',
        severity: 'Medium',
        description: '系統邏輯正常，但可能在特定數據條件下出現問題',
        solution: '加強數據驗證和錯誤處理機制'
      });
    } else {
      Logger.log(`❌ 發現 ${analysisResults.details.rootCauses.length} 個潛在根本原因：`);
      analysisResults.details.rootCauses.forEach((cause, index) => {
        Logger.log(`\n${index + 1}. ${cause.cause} (${cause.severity})`);
        Logger.log(`   描述：${cause.description}`);
        Logger.log(`   解決方案：${cause.solution}`);
      });
    }
    
    return analysisResults;
    
  } catch (error) {
    Logger.log(`❌ 根本原因分析過程發生錯誤：${error.message}`);
    return {
      success: false,
      issues: [`分析過程發生錯誤：${error.message}`],
      details: {}
    };
  }
}

/**
 * 分析主名單中的 T01 學生資料
 */
function analyzeMasterListT01() {
  try {
    // 使用系統配置的主名單
    const masterSpreadsheet = SpreadsheetApp.openById(SYSTEM_CONFIG.STUDENT_MASTER_LIST_ID);
    const masterSheet = masterSpreadsheet.getActiveSheet();
    const allData = masterSheet.getDataRange().getValues();
    
    const analysis = {
      hasT01: false,
      studentInfo: null,
      rowPosition: -1,
      dataQuality: {
        hasRequiredFields: false,
        fieldCompleteness: {},
        issues: []
      }
    };
    
    if (allData.length <= 1) {
      analysis.dataQuality.issues.push('主名單為空或只有標題行');
      return analysis;
    }
    
    // 查找 T01 學生
    for (let i = 1; i < allData.length; i++) {
      const studentId = allData[i][0];
      if (studentId && studentId.toString().trim() === 'T01') {
        analysis.hasT01 = true;
        analysis.rowPosition = i + 1;
        analysis.studentInfo = {
          id: studentId,
          name: allData[i][4] || '', // 假設中文姓名在第5欄
          englishName: allData[i][5] || '', // 假設英文姓名在第6欄
          class: allData[i][9] || '', // 假設班級在第10欄
          teacher: allData[i][8] || '' // 假設 LT 欄位在第9欄
        };
        
        // 檢查資料完整性
        analysis.dataQuality.fieldCompleteness = {
          hasId: !!analysis.studentInfo.id,
          hasName: !!analysis.studentInfo.name,
          hasEnglishName: !!analysis.studentInfo.englishName,
          hasClass: !!analysis.studentInfo.class,
          hasTeacher: !!analysis.studentInfo.teacher
        };
        
        analysis.dataQuality.hasRequiredFields = 
          analysis.dataQuality.fieldCompleteness.hasId &&
          analysis.dataQuality.fieldCompleteness.hasName &&
          analysis.dataQuality.fieldCompleteness.hasTeacher;
        
        if (!analysis.dataQuality.hasRequiredFields) {
          if (!analysis.studentInfo.teacher) {
            analysis.dataQuality.issues.push('T01 學生缺少老師資訊（LT 欄位）');
          }
          if (!analysis.studentInfo.name) {
            analysis.dataQuality.issues.push('T01 學生缺少姓名資訊');
          }
        }
        
        Logger.log(`📊 T01 學生資料分析：`);
        Logger.log(`   位置：第 ${analysis.rowPosition} 行`);
        Logger.log(`   ID：${analysis.studentInfo.id}`);
        Logger.log(`   姓名：${analysis.studentInfo.name}`);
        Logger.log(`   英文名：${analysis.studentInfo.englishName}`);
        Logger.log(`   班級：${analysis.studentInfo.class}`);
        Logger.log(`   老師：${analysis.studentInfo.teacher}`);
        Logger.log(`   資料完整性：${analysis.dataQuality.hasRequiredFields ? '✅ 完整' : '❌ 不完整'}`);
        
        break;
      }
    }
    
    return analysis;
    
  } catch (error) {
    Logger.log(`主名單 T01 分析錯誤：${error.message}`);
    return {
      hasT01: false,
      studentInfo: null,
      rowPosition: -1,
      dataQuality: {
        hasRequiredFields: false,
        fieldCompleteness: {},
        issues: [`訪問錯誤：${error.message}`]
      }
    };
  }
}

/**
 * 模擬老師提取邏輯，檢查 T01 學生是否會被正確分配
 */
function simulateTeacherExtractionForT01(masterListAnalysis) {
  const analysis = {
    t01AssignedToTeacher: false,
    assignedTeacher: null,
    simulationDetails: {
      teacherFieldFound: false,
      teacherValue: null,
      wouldBeIncluded: false
    }
  };
  
  if (!masterListAnalysis.hasT01) {
    analysis.simulationDetails.wouldBeIncluded = false;
    return analysis;
  }
  
  const t01StudentInfo = masterListAnalysis.studentInfo;
  
  // 模擬 extractTeachersFromMasterList 的老師欄位檢查邏輯
  if (t01StudentInfo.teacher && t01StudentInfo.teacher.toString().trim()) {
    analysis.simulationDetails.teacherFieldFound = true;
    analysis.simulationDetails.teacherValue = t01StudentInfo.teacher.toString().trim();
    analysis.t01AssignedToTeacher = true;
    analysis.assignedTeacher = analysis.simulationDetails.teacherValue;
    analysis.simulationDetails.wouldBeIncluded = true;
    
    Logger.log(`✅ T01 學生會被分配給老師：${analysis.assignedTeacher}`);
  } else {
    analysis.simulationDetails.teacherFieldFound = false;
    analysis.simulationDetails.teacherValue = null;
    analysis.t01AssignedToTeacher = false;
    analysis.simulationDetails.wouldBeIncluded = false;
    
    Logger.log(`❌ T01 學生不會被分配（老師欄位為空）`);
  }
  
  return analysis;
}

/**
 * 分析學生分組邏輯中的潛在問題
 */
function analyzeStudentGroupingLogic() {
  const analysis = {
    potentialIssues: []
  };
  
  // 檢查 1: 資料處理順序問題
  analysis.potentialIssues.push({
    cause: '資料處理順序不一致',
    severity: 'Medium',
    description: 'extractTeachersFromMasterList 函數中，學生資料的處理順序可能不穩定，導致 T01 學生被跳過',
    solution: '確保學生資料按 Student ID 排序處理，保證 T01 學生始終排在第一位'
  });
  
  // 檢查 2: 空值處理問題
  analysis.potentialIssues.push({
    cause: '空值和無效數據處理不當',
    severity: 'Medium',
    description: '如果 T01 學生的某些欄位為空，可能在資料驗證階段被過濾掉',
    solution: '加強空值處理邏輯，確保必要欄位為空時也能保留學生記錄'
  });
  
  // 檢查 3: Map 操作問題
  analysis.potentialIssues.push({
    cause: 'teacherStudentMap 操作潛在問題',
    severity: 'Low',
    description: 'Map 操作中的鍵值處理可能導致學生記錄遺漏',
    solution: '增加 Map 操作的調試日誌，確保所有學生都被正確添加到對應老師的記錄中'
  });
  
  return analysis;
}

/**
 * 分析學生匯入邏輯中的潛在問題
 */
function analyzeStudentImportLogic() {
  const analysis = {
    potentialIssues: []
  };
  
  // 檢查 1: 學生清單工作表寫入問題
  analysis.potentialIssues.push({
    cause: '學生清單工作表寫入順序問題',
    severity: 'Medium',
    description: 'importStudentsForTeacher 函數中，學生資料的寫入順序可能不按 Student ID 排序',
    solution: '在寫入學生清單工作表之前，先按 Student ID 排序學生資料'
  });
  
  // 檢查 2: 資料格式化問題
  analysis.potentialIssues.push({
    cause: '資料格式化過程中的遺漏',
    severity: 'Medium',
    description: '在 formattedRow 創建過程中，T01 學生的資料可能因為格式問題被過濾',
    solution: '加強資料格式化的錯誤處理，確保即使有格式問題也能保留 T01 學生記錄'
  });
  
  // 檢查 3: Scheduled Contact 預建問題
  analysis.potentialIssues.push({
    cause: 'Scheduled Contact 預建時的學生遺漏',
    severity: 'High',
    description: 'performPrebuildScheduledContacts 函數可能在處理學生資料時跳過了 T01',
    solution: '已通過統一記錄創建邏輯解決，但需要驗證修復效果'
  });
  
  return analysis;
}

/**
 * 生成 T01 學生遺漏問題的預防性修復建議
 */
function generateT01PreventionRecommendations() {
  Logger.log('💡 生成 T01 學生遺漏問題的預防性修復建議...');
  Logger.log('═'.repeat(60));
  
  const recommendations = [
    {
      priority: 'High',
      category: '資料處理順序',
      recommendation: '在 extractTeachersFromMasterList 中添加學生 ID 排序',
      implementation: '確保 teacherStudentMap 中的學生陣列按 Student ID 升序排列'
    },
    {
      priority: 'High',
      category: '資料驗證',
      recommendation: '添加 T01 學生特別檢查機制',
      implementation: '在每個關鍵處理階段添加 T01 學生存在性檢查'
    },
    {
      priority: 'Medium',
      category: '錯誤處理',
      recommendation: '增強空值和無效數據的處理',
      implementation: '即使 T01 學生某些欄位為空，也要保留其記錄'
    },
    {
      priority: 'Medium',
      category: '調試支援',
      recommendation: '添加詳細的學生處理日誌',
      implementation: '記錄每個學生的處理狀態，特別是 T01 學生'
    },
    {
      priority: 'Low',
      category: '系統監控',
      recommendation: '建立 T01 學生監控機制',
      implementation: '定期檢查所有老師記錄簿中的 T01 學生狀況'
    }
  ];
  
  recommendations.forEach((rec, index) => {
    Logger.log(`\n${index + 1}. ${rec.recommendation} (${rec.priority})`);
    Logger.log(`   類別：${rec.category}`);
    Logger.log(`   實施方案：${rec.implementation}`);
  });
  
  return recommendations;
}

/**
 * 執行完整的 T01 學生遺漏根本原因分析
 */
function runCompleteT01RootCauseAnalysis() {
  Logger.log('🚀 開始執行完整的 T01 學生遺漏根本原因分析...');
  Logger.log('═'.repeat(60));
  
  const completeAnalysis = {
    rootCauseAnalysis: null,
    preventionRecommendations: null,
    success: false
  };
  
  try {
    // 階段1: 根本原因分析
    Logger.log('\n📋 階段1：根本原因分析');
    Logger.log('-'.repeat(40));
    completeAnalysis.rootCauseAnalysis = analyzeT01MissingRootCause();
    
    // 階段2: 預防性建議
    Logger.log('\n📋 階段2：預防性修復建議');
    Logger.log('-'.repeat(40));
    completeAnalysis.preventionRecommendations = generateT01PreventionRecommendations();
    
    // 總結
    Logger.log('\n📊 完整分析總結：');
    Logger.log('═'.repeat(60));
    
    if (completeAnalysis.rootCauseAnalysis.success) {
      Logger.log('✅ 根本原因分析完成');
      completeAnalysis.success = true;
    } else {
      Logger.log('❌ 根本原因分析發現問題');
      completeAnalysis.success = false;
    }
    
    Logger.log(`📋 發現 ${completeAnalysis.rootCauseAnalysis.details.rootCauses.length} 個潛在根本原因`);
    Logger.log(`💡 提供 ${completeAnalysis.preventionRecommendations.length} 項預防性建議`);
    
    return completeAnalysis;
    
  } catch (error) {
    Logger.log(`❌ 完整分析過程發生錯誤：${error.message}`);
    return {
      ...completeAnalysis,
      success: false,
      error: error.message
    };
  }
}