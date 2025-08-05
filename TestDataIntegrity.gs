/**
 * 數據完整性測試執行器
 * 用於執行數據完整性和統計準確性驗證
 */

/**
 * 📊 主要數據驗證函數 - 执行完整的数据验证和报告生成
 */
function executeDataIntegrityValidation() {
  Logger.log('🚀 開始執行數據完整性與統計準確性驗證...');
  Logger.log('═'.repeat(80));
  
  const startTime = new Date().getTime();
  
  try {
    // 步驟1: 執行簡化版數據完整性測試
    Logger.log('• 步驟1: 執行數據完整性測試');
    const integrityResults = runSimpleDataIntegrityTest();
    
    // 步驟2: 生成綜合分析報告
    Logger.log('\n• 步驟2: 生成綜合分析報告');
    const comprehensiveReport = generateComprehensiveDataReport();
    
    // 步驟3: 生成數據品質摘要(用於儀表板)
    Logger.log('\n• 步驟3: 生成數據品質摘要');
    const qualitySummary = getDataQualitySummary();
    
    // 步驟4: 生成結論和建議
    Logger.log('\n• 步驟4: 生成結論和建議');
    const conclusions = generateValidationConclusions(integrityResults, comprehensiveReport, qualitySummary);
    
    const endTime = new Date().getTime();
    const totalTime = endTime - startTime;
    
    // 最終結果輸出
    outputFinalValidationResults({
      integrityResults,
      comprehensiveReport,
      qualitySummary,
      conclusions,
      executionTime: totalTime
    });
    
    Logger.log(`\n✅ 數據完整性驗證完成！總耗時: ${totalTime}ms`);
    
    return {
      success: true,
      executionTime: totalTime,
      results: {
        integrityResults,
        comprehensiveReport,
        qualitySummary,
        conclusions
      }
    };
    
  } catch (error) {
    Logger.log(`❌ 數據驗證過程發生錯誤：${error.message}`);
    Logger.log(`錯誤堆疊: ${error.stack}`);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * 生成驗證結論和建議
 */
function generateValidationConclusions(integrityResults, comprehensiveReport, qualitySummary) {
  Logger.log('📊 分析驗證結果並生成結論...');
  
  const conclusions = {
    overallAssessment: '',
    dataQualityLevel: '',
    systemStability: '',
    criticalIssues: [],
    recommendedActions: [],
    nextSteps: [],
    riskLevel: 'low'
  };
  
  const overallScore = integrityResults.overallScore;
  
  // 總體評估
  if (overallScore >= 95) {
    conclusions.overallAssessment = '系統數據品質優秀，所有核心指標都達到或超過理想標準';
    conclusions.dataQualityLevel = 'EXCELLENT';
    conclusions.systemStability = 'STABLE';
    conclusions.riskLevel = 'low';
  } else if (overallScore >= 80) {
    conclusions.overallAssessment = '系統數據品質良好，但有一些領域需要改善';
    conclusions.dataQualityLevel = 'GOOD';
    conclusions.systemStability = 'MOSTLY_STABLE';
    conclusions.riskLevel = 'medium';
  } else if (overallScore >= 60) {
    conclusions.overallAssessment = '系統數據品質尚可，但存在多個需要注意的問題';
    conclusions.dataQualityLevel = 'FAIR';
    conclusions.systemStability = 'UNSTABLE';
    conclusions.riskLevel = 'medium';
  } else {
    conclusions.overallAssessment = '系統數據品質不佳，存在嚴重問題需要立即處理';
    conclusions.dataQualityLevel = 'POOR';
    conclusions.systemStability = 'CRITICAL';
    conclusions.riskLevel = 'high';
  }
  
  // 識別關鍵問題
  if (!integrityResults.details.systemFunctions?.success) {
    conclusions.criticalIssues.push({
      issue: '系統核心函數缺失或不可用',
      impact: '嚴重影響系統功能和穩定性',
      urgency: 'CRITICAL'
    });
  }
  
  if (!integrityResults.details.mathematicalLogic?.success) {
    conclusions.criticalIssues.push({
      issue: '數學計算邏輯存在錯誤',
      impact: '影響統計結果的準確性和可靠性',
      urgency: 'HIGH'
    });
  }
  
  if (!integrityResults.details.cacheConsistency?.success) {
    conclusions.criticalIssues.push({
      issue: '快取系統一致性問題',
      impact: '影響系統性能和響應速度',
      urgency: 'MEDIUM'
    });
  }
  
  // 建議行動
  if (conclusions.riskLevel === 'high' || conclusions.criticalIssues.length > 0) {
    conclusions.recommendedActions = [
      '立即停止生產作業直到關鍵問題解決',
      '執行緊急系統修復和驗證',
      '實施全面的系統健康檢查',
      '建立緊急監控和警告機制'
    ];
    conclusions.nextSteps = [
      '24小時內修復所有關鍵問題',
      '重新執行完整驗證確保修復效果',
      '建立持續監控和預防機制'
    ];
  } else if (conclusions.riskLevel === 'medium') {
    conclusions.recommendedActions = [
      '優先處理識別出的高優先度問題',
      '實施相關系統改善措施',
      '加強系統監控和報告機制'
    ];
    conclusions.nextSteps = [
      '1-2週內完成改善行動',
      '定期執行數據品質檢查',
      '优化系統性能和稳定性'
    ];
  } else {
    conclusions.recommendedActions = [
      '維持當前優秀的數據品質標準',
      '定期執行例行監控和維護',
      '探索更進階的系統改善機會'
    ];
    conclusions.nextSteps = [
      '每月執行定期數據品質審查',
      '持續改善系統文檔和流程',
      '考慮實施更進階的分析功能'
    ];
  }
  
  return conclusions;
}

/**
 * 輸出最終驗證結果
 */
function outputFinalValidationResults(results) {
  Logger.log('\n📋 數據完整性與統計準確性驗證最終報告');
  Logger.log('═'.repeat(80));
  
  const timestamp = new Date().toLocaleString();
  const overallScore = results.integrityResults.overallScore;
  const status = results.integrityResults.status;
  
  // 基本信息
  Logger.log(`📅 驗證時間: ${timestamp}`);
  Logger.log(`⏱️ 執行時間: ${results.executionTime}ms`);
  Logger.log(`🏆 總體評分: ${overallScore}% (${status.toUpperCase()})`);
  Logger.log(`📈 測試結果: ${results.integrityResults.passedTests}/${results.integrityResults.totalTests} 通過`);
  
  // KPI 指標說明
  Logger.log('\n📊 關鍵數據品質 KPI');
  Logger.log('-'.repeat(50));
  Logger.log(`• 記錄完整性目標: 100% (當前: ${results.integrityResults.details.recordStructure?.structureCompleteRate || 'N/A'}%)`);
  Logger.log(`• 統計準確性目標: 100% (當前: ${results.integrityResults.details.mathematicalLogic?.mathAccuracy || 'N/A'}%)`);
  Logger.log(`• 快取一致性目標: 100% (當前: ${results.integrityResults.details.cacheConsistency?.consistency ? '100' : '0'}%)`);
  Logger.log(`• 系統健康度目標: 98.5% (當前: ${overallScore}%)`);
  
  // 總體結論
  Logger.log('\n🎯 總體結論');
  Logger.log('-'.repeat(50));
  Logger.log(`🔍 評估結果: ${results.conclusions.overallAssessment}`);
  Logger.log(`🏆 數據品質等級: ${results.conclusions.dataQualityLevel}`);
  Logger.log(`🛡️ 系統穩定性: ${results.conclusions.systemStability}`);
  Logger.log(`⚠️ 風險等級: ${results.conclusions.riskLevel.toUpperCase()}`);
  
  // 關鍵問題
  if (results.conclusions.criticalIssues.length > 0) {
    Logger.log('\n🚨 關鍵問題警告');
    Logger.log('-'.repeat(50));
    results.conclusions.criticalIssues.forEach((issue, index) => {
      const urgencyIcon = issue.urgency === 'CRITICAL' ? '🔴' : 
                         issue.urgency === 'HIGH' ? '🟠' : '🟡';
      Logger.log(`${urgencyIcon} ${index + 1}. ${issue.issue}`);
      Logger.log(`   影響: ${issue.impact}`);
      Logger.log(`   緊急程度: ${issue.urgency}`);
    });
  } else {
    Logger.log('\n✅ 未發現關鍵問題');
  }
  
  // 建議行動
  if (results.conclusions.recommendedActions.length > 0) {
    Logger.log('\n💡 建議行動');
    Logger.log('-'.repeat(50));
    results.conclusions.recommendedActions.forEach((action, index) => {
      Logger.log(`${index + 1}. ${action}`);
    });
  }
  
  // 下一步驟
  if (results.conclusions.nextSteps.length > 0) {
    Logger.log('\n🗺️ 下一步驟');
    Logger.log('-'.repeat(50));
    results.conclusions.nextSteps.forEach((step, index) => {
      Logger.log(`${index + 1}. ${step}`);
    });
  }
  
  // 最終建議
  Logger.log('\n🎓 最終建議');
  Logger.log('-'.repeat(50));
  
  if (results.conclusions.riskLevel === 'low' && overallScore >= 95) {
    Logger.log('🎉 恭喜！系統數據品質達到優秀標準');
    Logger.log('✅ 系統可以正常運作，數據品質穩定可靠');
    Logger.log('📊 建議繼續維持定期監控以確保品質標準');
  } else if (results.conclusions.riskLevel === 'medium') {
    Logger.log('⚠️ 系統數據品質尚可，但需要改善');
    Logger.log('🔧 建議優先處理識別出的問題並實施改善措施');
    Logger.log('📊 定期重新執行驗證直到達到目標標準');
  } else {
    Logger.log('🚨 系統數據品質存在嚴重問題！');
    Logger.log('🔴 必須立即停止生產作業並修復所有關鍵問題');
    Logger.log('⏰ 在修復完成並重新驗證通過前不建議恢復作業');
  }
  
  Logger.log('\n═'.repeat(80));
  Logger.log('📋 數據完整性驗證報告完成');
  Logger.log(`🗺️ 如需詳細分析，請執行 generateComprehensiveDataReport() 函數`);
  Logger.log(`📊 如需儀表板數據，請執行 getDataQualitySummary() 函數`);
}

/**
 * 🎯 快速數據品質檢查 - 用於日常監控
 */
function quickDataQualityCheck() {
  Logger.log('⚡ 執行快速數據品質檢查...');
  
  try {
    const quickResults = runSimpleDataIntegrityTest();
    
    Logger.log(`\n📊 快速檢查結果: ${quickResults.overallScore}% (${quickResults.status})`);
    Logger.log(`✅ 通過測試: ${quickResults.passedTests}/${quickResults.totalTests}`);
    
    // 簡單建議
    if (quickResults.overallScore >= 95) {
      Logger.log('✅ 系統狀態優秀，繼續維持');
    } else if (quickResults.overallScore >= 80) {
      Logger.log('⚠️ 系統狀態良好，建議持續監控');
    } else {
      Logger.log('🚨 系統狀態需要改善，建議執行完整驗證');
    }
    
    return quickResults;
    
  } catch (error) {
    Logger.log(`❌ 快速檢查失敗：${error.message}`);
    return {
      success: false,
      error: error.message,
      overallScore: 0,
      status: 'error'
    };
  }
}

/**
 * 📈 數據品質警告系統 - 用於自動監控
 */
function dataQualityAlert() {
  Logger.log('🚨 執行數據品質警告檢查...');
  
  try {
    const alertResults = quickDataQualityCheck();
    
    // 警告闾值設定
    const CRITICAL_THRESHOLD = 60;
    const WARNING_THRESHOLD = 80;
    
    if (alertResults.overallScore < CRITICAL_THRESHOLD) {
      Logger.log('🚨 關鍵警告: 數據品質低於關鍵闾值!');
      Logger.log(`目前評分: ${alertResults.overallScore}% (闾值: ${CRITICAL_THRESHOLD}%)`);
      Logger.log('建議立即執行全面系統檢查和修復');
      
      // 這裡可以添加郵件通知或其他警告機制
      
    } else if (alertResults.overallScore < WARNING_THRESHOLD) {
      Logger.log('⚠️ 警告: 數據品質低於警告闾值');
      Logger.log(`目前評分: ${alertResults.overallScore}% (闾值: ${WARNING_THRESHOLD}%)`);
      Logger.log('建議加強監控並考慮執行优化措施');
      
    } else {
      Logger.log('✅ 數據品質正常，無需警告');
    }
    
    return {
      alertLevel: alertResults.overallScore < CRITICAL_THRESHOLD ? 'CRITICAL' :
                 alertResults.overallScore < WARNING_THRESHOLD ? 'WARNING' : 'NORMAL',
      score: alertResults.overallScore,
      status: alertResults.status,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log(`❌ 警告系統錯誤：${error.message}`);
    return {
      alertLevel: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}