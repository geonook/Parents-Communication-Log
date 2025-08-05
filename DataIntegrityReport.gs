/**
 * 數據完整性與統計準確性驗證報告生成器
 * 專門用於生成詳細的數據品質分析報告和建議
 */

/**
 * 🎯 執行完整的數據完整性分析並生成報告
 */
function generateComprehensiveDataReport() {
  Logger.log('📊 開始生成數據完整性綜合分析報告...');
  Logger.log('═'.repeat(80));
  
  const reportData = {
    timestamp: new Date().toLocaleString(),
    analysisVersion: '2.0',
    systemInfo: {},
    dataQualityScores: {},
    detailedAnalysis: {},
    criticalFindings: [],
    recommendations: [],
    actionPlan: []
  };
  
  try {
    // 步驟1: 收集系統基本信息
    Logger.log('📋 步驟1: 收集系統基本信息');
    reportData.systemInfo = collectSystemInfo();
    
    // 步驟2: 執行簡化版數據測試
    Logger.log('🧪 步驟2: 執行數據品質測試');
    const testResults = runSimpleDataIntegrityTest();
    reportData.dataQualityScores = {
      overall: testResults.overallScore,
      status: testResults.status,
      passedTests: testResults.passedTests,
      totalTests: testResults.totalTests,
      failedTests: testResults.failedTests
    };
    
    // 步驟3: 詳細分析各個數據領域
    Logger.log('🔍 步驟3: 詳細數據分析');
    reportData.detailedAnalysis = {
      systemFunctions: analyzeFunctionAvailability(testResults.details.systemFunctions),
      recordStructure: analyzeRecordStructure(testResults.details.recordStructure),
      mathematicalAccuracy: analyzeMathematicalAccuracy(testResults.details.mathematicalLogic),
      cachePerformance: analyzeCachePerformance(testResults.details.cacheConsistency)
    };
    
    // 步驟4: 識別關鍵發現
    Logger.log('⚠️ 步驟4: 識別關鍵發現');
    reportData.criticalFindings = identifyCriticalFindings(testResults);
    
    // 步驟5: 生成改善建議
    Logger.log('💡 步驟5: 生成改善建議');
    reportData.recommendations = generateDetailedRecommendations(testResults, reportData.detailedAnalysis);
    
    // 步驟6: 制定行動計劃
    Logger.log('📋 步驟6: 制定行動計劃');
    reportData.actionPlan = createActionPlan(reportData.recommendations, reportData.criticalFindings);
    
    // 步驟7: 輸出完整報告
    Logger.log('📄 步驟7: 輸出完整報告');
    outputComprehensiveReport(reportData);
    
    Logger.log('✅ 數據完整性綜合分析報告生成完成');
    return reportData;
    
  } catch (error) {
    Logger.log(`❌ 報告生成過程發生錯誤：${error.message}`);
    reportData.error = error.message;
    reportData.status = 'error';
    return reportData;
  }
}

/**
 * 收集系統基本信息
 */
function collectSystemInfo() {
  Logger.log('📊 收集系統基本信息...');
  
  const systemInfo = {
    analysisTime: new Date().toISOString(),
    systemVersion: 'v3.0',
    environment: 'Google Apps Script',
    totalTeacherBooks: 0,
    totalStudents: 0,
    totalContactRecords: 0,
    systemHealthTarget: '98.5%',
    dataCompletenessTarget: '100%'
  };
  
  try {
    // 獲取教師記錄簿數量
    const teacherBooks = getAllTeacherBooks();
    systemInfo.totalTeacherBooks = teacherBooks.length;
    
    // 統計學生和聯絡記錄數量
    let totalStudents = 0;
    let totalContacts = 0;
    
    teacherBooks.forEach(book => {
      try {
        const studentSheet = book.getSheetByName('Student List');
        const contactSheet = book.getSheetByName('Contact Logs');
        
        if (studentSheet) {
          const students = studentSheet.getDataRange().getValues().slice(1);
          totalStudents += students.length;
        }
        
        if (contactSheet) {
          const contacts = contactSheet.getDataRange().getValues().slice(1);
          totalContacts += contacts.length;
        }
      } catch (error) {
        Logger.log(`收集 ${book.getName()} 信息時發生錯誤：${error.message}`);
      }
    });
    
    systemInfo.totalStudents = totalStudents;
    systemInfo.totalContactRecords = totalContacts;
    
  } catch (error) {
    Logger.log(`收集系統信息時發生錯誤：${error.message}`);
    systemInfo.error = error.message;
  }
  
  return systemInfo;
}

/**
 * 分析函數可用性
 */
function analyzeFunctionAvailability(functionTest) {
  if (!functionTest) {
    return {
      status: 'not_tested',
      analysis: '函數可用性測試未執行',
      risk_level: 'medium'
    };
  }
  
  const analysis = {
    status: functionTest.success ? 'good' : 'concerning',
    availability_rate: functionTest.availabilityRate || 0,
    missing_functions: [],
    critical_functions_status: {},
    risk_level: 'low'
  };
  
  // 分析缺失的函數
  if (functionTest.functionStatus) {
    Object.entries(functionTest.functionStatus).forEach(([funcName, available]) => {
      if (!available) {
        analysis.missing_functions.push(funcName);
      }
      analysis.critical_functions_status[funcName] = available ? '✅' : '❌';
    });
  }
  
  // 評估風險等級
  if (analysis.availability_rate < 50) {
    analysis.risk_level = 'high';
    analysis.impact = '系統核心功能嚴重受影響，建議立即修復';
  } else if (analysis.availability_rate < 75) {
    analysis.risk_level = 'medium';
    analysis.impact = '部分功能可能不穩定，建議優先修復';
  } else {
    analysis.risk_level = 'low';
    analysis.impact = '系統功能基本完整，運作正常';
  }
  
  return analysis;
}

/**
 * 分析記錄結構
 */
function analyzeRecordStructure(structureTest) {
  if (!structureTest) {
    return {
      status: 'not_tested',
      analysis: '記錄結構測試未執行',
      risk_level: 'medium'
    };
  }
  
  const analysis = {
    status: structureTest.success ? 'good' : 'needs_attention',
    structure_completeness: structureTest.structureCompleteRate || 0,
    missing_sheets: [],
    data_integrity_score: 0,
    risk_level: 'low'
  };
  
  // 計算數據完整性評分
  analysis.data_integrity_score = Math.round(
    (analysis.structure_completeness * 0.7) + // 結構完整性權重70%
    (structureTest.success ? 30 : 0) // 基本功能權重30%
  );
  
  // 評估風險等級
  if (analysis.structure_completeness < 50) {
    analysis.risk_level = 'high';
    analysis.impact = '記錄結構不完整可能導致數據丟失';
  } else if (analysis.structure_completeness < 100) {
    analysis.risk_level = 'medium';
    analysis.impact = '記錄結構基本完整，但有改善空間';
  } else {
    analysis.risk_level = 'low';
    analysis.impact = '記錄結構完整，數據組織良好';
  }
  
  return analysis;
}

/**
 * 分析數學準確性
 */
function analyzeMathematicalAccuracy(mathTest) {
  if (!mathTest) {
    return {
      status: 'not_tested',
      analysis: '數學邏輯測試未執行',
      risk_level: 'medium'
    };
  }
  
  const analysis = {
    status: mathTest.success ? 'excellent' : 'needs_repair',
    accuracy_rate: mathTest.mathAccuracy || 0,
    calculation_reliability: 'unknown',
    statistical_integrity: 'unknown',
    risk_level: 'low'
  };
  
  // 評估計算可靠性
  if (analysis.accuracy_rate >= 100) {
    analysis.calculation_reliability = 'excellent';
    analysis.statistical_integrity = 'high';
  } else if (analysis.accuracy_rate >= 80) {
    analysis.calculation_reliability = 'good';
    analysis.statistical_integrity = 'medium';
  } else {
    analysis.calculation_reliability = 'poor';
    analysis.statistical_integrity = 'low';
  }
  
  // 評估風險等級
  if (analysis.accuracy_rate < 100) {
    analysis.risk_level = 'high';
    analysis.impact = '數學計算錯誤可能導致統計結果不準確';
  } else {
    analysis.risk_level = 'low';
    analysis.impact = '數學計算準確，統計結果可信';
  }
  
  return analysis;
}

/**
 * 分析快取性能
 */
function analyzeCachePerformance(cacheTest) {
  if (!cacheTest) {
    return {
      status: 'not_tested',
      analysis: '快取一致性測試未執行',
      risk_level: 'medium'
    };
  }
  
  const analysis = {
    status: cacheTest.success ? 'optimal' : 'degraded',
    cache_reliability: cacheTest.consistency ? 'high' : 'low',
    performance_impact: 'minimal',
    data_consistency: cacheTest.consistency ? 'maintained' : 'at_risk',
    risk_level: 'low'
  };
  
  // 評估性能影響
  if (!cacheTest.success) {
    analysis.performance_impact = 'significant';
    analysis.risk_level = 'medium';
    analysis.impact = '快取異常可能導致系統響應變慢';
  } else {
    analysis.impact = '快取系統運作正常，性能良好';
  }
  
  return analysis;
}

/**
 * 識別關鍵發現
 */
function identifyCriticalFindings(testResults) {
  const findings = [];
  
  // 檢查整體品質評分
  if (testResults.overallScore < 80) {
    findings.push({
      category: 'overall_quality',
      severity: 'high',
      finding: `系統整體數據品質評分為 ${testResults.overallScore}%，低於建議的80%標準`,
      impact: '可能影響系統穩定性和數據準確性',
      urgency: 'immediate'
    });
  }
  
  // 檢查系統函數
  if (testResults.details.systemFunctions && !testResults.details.systemFunctions.success) {
    findings.push({
      category: 'system_functions',
      severity: 'critical',
      finding: '系統核心函數缺失或不可用',
      impact: '系統功能嚴重受影響，可能無法正常運作',
      urgency: 'immediate'
    });
  }
  
  // 檢查數學邏輯
  if (testResults.details.mathematicalLogic && !testResults.details.mathematicalLogic.success) {
    findings.push({
      category: 'calculation_accuracy',
      severity: 'high',
      finding: '數學計算邏輯存在錯誤',
      impact: '統計結果可能不準確，影響決策依據',
      urgency: 'high'
    });
  }
  
  // 檢查快取一致性
  if (testResults.details.cacheConsistency && !testResults.details.cacheConsistency.success) {
    findings.push({
      category: 'cache_performance',
      severity: 'medium',
      finding: '快取系統一致性異常',
      impact: '系統響應速度可能受影響',
      urgency: 'medium'
    });
  }
  
  return findings;
}

/**
 * 生成詳細建議
 */
function generateDetailedRecommendations(testResults, detailedAnalysis) {
  const recommendations = [];
  
  // 基於整體評分的建議
  if (testResults.overallScore >= 95) {
    recommendations.push({
      priority: 'low',
      category: 'maintenance',
      title: '維持優秀品質',
      description: '系統數據品質優秀，建議定期執行監控以維持現狀',
      actions: [
        '設定定期數據品質檢查排程',
        '建立數據品質監控儀表板',
        '制定數據品質標準作業流程'
      ],
      timeline: '1-2週內完成'
    });
  } else if (testResults.overallScore >= 80) {
    recommendations.push({
      priority: 'medium',
      category: 'optimization',
      title: '持續改善品質',
      description: '系統品質良好但有改善空間，建議針對性優化',
      actions: [
        '分析失敗測試項目的根本原因',
        '實施針對性修復措施',
        '加強系統監控和預警機制'
      ],
      timeline: '2-3週內完成'
    });
  } else {
    recommendations.push({
      priority: 'high',
      category: 'urgent_repair',
      title: '緊急品質改善',
      description: '系統品質需要立即改善以確保穩定運作',
      actions: [
        '立即修復所有失敗的測試項目',
        '執行全面系統健康檢查',
        '建立緊急應變和回復機制'
      ],
      timeline: '1週內完成'
    });
  }
  
  // 基於具體分析的建議
  if (detailedAnalysis.systemFunctions.risk_level === 'high') {
    recommendations.push({
      priority: 'critical',
      category: 'system_repair',
      title: '修復核心系統函數',
      description: '系統核心函數缺失，需要立即修復以恢復正常功能',
      actions: [
        '檢查並修復缺失的核心函數',
        '驗證所有系統依賴項',
        '執行完整的功能測試'
      ],
      timeline: '立即執行'
    });
  }
  
  if (detailedAnalysis.mathematicalAccuracy.risk_level === 'high') {
    recommendations.push({
      priority: 'high',
      category: 'calculation_fix',
      title: '修復計算邏輯錯誤',
      description: '數學計算存在錯誤，需要修復以確保統計準確性',
      actions: [
        '審查所有數學計算函數',
        '實施單元測試覆蓋所有計算邏輯',
        '建立計算結果驗證機制'
      ],
      timeline: '3-5天內完成'
    });
  }
  
  return recommendations;
}

/**
 * 創建行動計劃
 */
function createActionPlan(recommendations, criticalFindings) {
  const actionPlan = {
    immediate_actions: [],
    short_term_actions: [],
    long_term_actions: [],
    monitoring_plan: []
  };
  
  // 處理關鍵發現
  criticalFindings.forEach(finding => {
    if (finding.urgency === 'immediate') {
      actionPlan.immediate_actions.push({
        action: `處理${finding.category}問題`,
        description: finding.finding,
        deadline: '24小時內',
        responsible: '系統管理員'
      });
    }
  });
  
  // 處理建議
  recommendations.forEach(rec => {
    if (rec.priority === 'critical' || rec.priority === 'high') {
      actionPlan.immediate_actions.push({
        action: rec.title,
        description: rec.description,
        deadline: rec.timeline,
        responsible: '技術團隊'
      });
    } else if (rec.priority === 'medium') {
      actionPlan.short_term_actions.push({
        action: rec.title,
        description: rec.description,
        deadline: rec.timeline,
        responsible: '開發團隊'
      });
    } else {
      actionPlan.long_term_actions.push({
        action: rec.title,
        description: rec.description,
        deadline: rec.timeline,
        responsible: '維護團隊'
      });
    }
  });
  
  // 添加監控計劃
  actionPlan.monitoring_plan = [
    {
      metric: '系統品質評分',
      frequency: '每週',
      target: '>= 95%',
      action_if_below: '執行緊急檢查和修復'
    },
    {
      metric: '核心函數可用性',
      frequency: '每日',
      target: '100%',
      action_if_below: '立即修復缺失函數'
    },
    {
      metric: '數學計算準確性',
      frequency: '每週',
      target: '100%',
      action_if_below: '檢查和修復計算邏輯'
    }
  ];
  
  return actionPlan;
}

/**
 * 輸出完整報告
 */
function outputComprehensiveReport(reportData) {
  Logger.log('\n📊 數據完整性與統計準確性綜合分析報告');
  Logger.log('═'.repeat(80));
  
  // 基本信息
  Logger.log(`📅 報告生成時間: ${reportData.timestamp}`);
  Logger.log(`🔢 系統版本: ${reportData.analysisVersion}`);
  Logger.log(`📚 教師記錄簿數量: ${reportData.systemInfo.totalTeacherBooks}`);
  Logger.log(`👥 總學生數: ${reportData.systemInfo.totalStudents}`);
  Logger.log(`📞 總聯絡記錄數: ${reportData.systemInfo.totalContactRecords}`);
  
  // 數據品質評分
  Logger.log('\n🏆 數據品質評分');
  Logger.log('-'.repeat(40));
  Logger.log(`📊 總體評分: ${reportData.dataQualityScores.overall}% (${reportData.dataQualityScores.status})`);
  Logger.log(`✅ 通過測試: ${reportData.dataQualityScores.passedTests}/${reportData.dataQualityScores.totalTests}`);
  
  // 關鍵發現
  if (reportData.criticalFindings.length > 0) {
    Logger.log('\n⚠️ 關鍵發現');
    Logger.log('-'.repeat(40));
    reportData.criticalFindings.forEach((finding, index) => {
      const severityIcon = finding.severity === 'critical' ? '🔴' : 
                          finding.severity === 'high' ? '🟠' : '🟡';
      Logger.log(`${severityIcon} ${index + 1}. [${finding.category}] ${finding.finding}`);
      Logger.log(`   影響: ${finding.impact}`);
    });
  }
  
  // 改善建議
  if (reportData.recommendations.length > 0) {
    Logger.log('\n💡 改善建議');
    Logger.log('-'.repeat(40));
    reportData.recommendations.forEach((rec, index) => {
      const priorityIcon = rec.priority === 'critical' ? '🔴' : 
                          rec.priority === 'high' ? '🟠' : 
                          rec.priority === 'medium' ? '🟡' : '🟢';
      Logger.log(`${priorityIcon} ${index + 1}. ${rec.title}`);
      Logger.log(`   描述: ${rec.description}`);
      Logger.log(`   時程: ${rec.timeline}`);
    });
  }
  
  // 行動計劃
  if (reportData.actionPlan.immediate_actions.length > 0) {
    Logger.log('\n📋 立即行動項目');
    Logger.log('-'.repeat(40));
    reportData.actionPlan.immediate_actions.forEach((action, index) => {
      Logger.log(`⚡ ${index + 1}. ${action.action}`);
      Logger.log(`   期限: ${action.deadline}`);
      Logger.log(`   負責: ${action.responsible}`);
    });
  }
  
  // 結論
  Logger.log('\n🎯 結論與下一步');
  Logger.log('-'.repeat(40));
  
  if (reportData.dataQualityScores.overall >= 95) {
    Logger.log('🎉 系統數據品質優秀，運作穩定!');
    Logger.log('✅ 建議維持定期監控以確保品質標準');
    Logger.log('📈 可考慮實施更進階的數據分析功能');
  } else if (reportData.dataQualityScores.overall >= 80) {
    Logger.log('⚠️ 系統數據品質良好但有改善空間');
    Logger.log('🔧 建議優先處理識別出的問題');
    Logger.log('📊 實施持續改善計劃以提升品質');
  } else {
    Logger.log('🚨 系統數據品質需要緊急改善!');
    Logger.log('🔴 必須立即處理所有關鍵問題');
    Logger.log('⏰ 建議在一週內完成所有緊急修復');
  }
  
  Logger.log('\n═'.repeat(80));
  Logger.log('📄 報告完成 - 請根據建議採取相應行動');
}

/**
 * 🎯 快速數據品質摘要 - 用於儀表板顯示
 */
function getDataQualitySummary() {
  Logger.log('📊 生成數據品質摘要...');
  
  try {
    const testResults = runSimpleDataIntegrityTest();
    
    return {
      success: true,
      timestamp: new Date().toLocaleString(),
      summary: {
        overallScore: testResults.overallScore,
        status: testResults.status,
        passedTests: testResults.passedTests,
        totalTests: testResults.totalTests,
        statusMessage: getStatusMessage(testResults.status, testResults.overallScore)
      },
      quickInsights: generateQuickInsights(testResults)
    };
    
  } catch (error) {
    Logger.log(`❌ 生成數據品質摘要錯誤：${error.message}`);
    return {
      success: false,
      error: error.message,
      summary: {
        overallScore: 0,
        status: 'error',
        passedTests: 0,
        totalTests: 0,
        statusMessage: '數據品質檢查失敗'
      }
    };
  }
}

function getStatusMessage(status, score) {
  switch (status) {
    case 'excellent':
      return `數據品質優秀 (${score}%) - 系統運作正常`;
    case 'good':
      return `數據品質良好 (${score}%) - 建議持續監控`;
    case 'fair':
      return `數據品質尚可 (${score}%) - 需要改善`;
    case 'poor':
      return `數據品質不佳 (${score}%) - 需要緊急處理`;
    default:
      return `數據品質狀態未知 (${score}%)`;
  }
}

function generateQuickInsights(testResults) {
  const insights = [];
  
  if (testResults.details.systemFunctions?.success) {
    insights.push('✅ 系統核心函數運作正常');
  } else {
    insights.push('❌ 系統核心函數存在問題');
  }
  
  if (testResults.details.mathematicalLogic?.success) {
    insights.push('✅ 數學計算邏輯準確');
  } else {
    insights.push('❌ 數學計算邏輯需要修復');
  }
  
  if (testResults.details.cacheConsistency?.success) {
    insights.push('✅ 快取系統運作正常');
  } else {
    insights.push('⚠️ 快取系統性能可能受影響');
  }
  
  // 基於整體評分的洞察
  if (testResults.overallScore >= 95) {
    insights.push('🎉 建議維持當前優秀狀態');
  } else if (testResults.overallScore >= 80) {
    insights.push('📈 有進一步優化空間');
  } else {
    insights.push('🚨 需要立即採取改善行動');
  }
  
  return insights;
}