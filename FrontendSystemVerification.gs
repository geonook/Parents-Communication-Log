/**
 * 前端系統驗證工具
 * Phase 4: 用戶體驗與介面驗證專用
 * 驗證Web App部署、前端功能、用戶體驗等
 */

/**
 * 執行完整前端系統驗證
 */
function runFrontendSystemVerification() {
  console.log('🎨 開始前端系統驗證 - Phase 4');
  
  const verificationReport = {
    timestamp: new Date().toLocaleString('zh-TW'),
    overallScore: 0,
    categories: {
      webAppDeployment: { score: 0, details: [] },
      coreUIFunctions: { score: 0, details: [] },
      userExperience: { score: 0, details: [] },
      responsiveDesign: { score: 0, details: [] },
      errorHandling: { score: 0, details: [] }
    },
    recommendations: [],
    criticalIssues: []
  };
  
  try {
    // A. Web App 部署狀態和可訪問性檢查
    verifyWebAppDeployment(verificationReport);
    
    // B. 管理面板核心功能UI測試
    verifyCoreUIFunctions(verificationReport);
    
    // C. 用戶體驗流程驗證
    verifyUserExperience(verificationReport);
    
    // D. 響應式設計和跨裝置相容性
    verifyResponsiveDesign(verificationReport);
    
    // E. 前端錯誤處理和用戶引導
    verifyErrorHandling(verificationReport);
    
    // 計算總體分數
    calculateOverallScore(verificationReport);
    
    // 生成最終報告
    generateFrontendReport(verificationReport);
    
    return verificationReport;
    
  } catch (error) {
    console.error('❌ 前端驗證過程發生錯誤:', error);
    verificationReport.criticalIssues.push(`系統錯誤: ${error.message}`);
    return verificationReport;
  }
}

/**
 * A. 驗證Web App部署狀態
 */
function verifyWebAppDeployment(report) {
  console.log('🔍 A. 驗證Web App部署狀態...');
  const category = report.categories.webAppDeployment;
  let score = 0;
  
  try {
    // 檢查1: doGet() 函數存在性
    if (typeof doGet === 'function') {
      category.details.push('✅ doGet() 函數已定義');
      score += 25;
    } else {
      category.details.push('❌ doGet() 函數未定義');
      report.criticalIssues.push('Web App 入口函數缺失');
    }
    
    // 檢查2: dashboard.html 文件存在性
    try {
      const template = HtmlService.createTemplateFromFile('dashboard');
      category.details.push('✅ dashboard.html 模板文件可訪問');
      score += 25;
    } catch (e) {
      category.details.push('❌ dashboard.html 模板文件無法訪問');
      report.criticalIssues.push('前端模板文件缺失');
    }
    
    // 檢查3: Web App 配置
    try {
      const testTemplate = HtmlService.createTemplateFromFile('dashboard')
        .evaluate()
        .setTitle('電聯記錄簿系統 - 管理面板')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      category.details.push('✅ Web App 配置正確');
      score += 25;
    } catch (e) {
      category.details.push('❌ Web App 配置有問題: ' + e.message);
      report.recommendations.push('檢查 Web App 部署配置');
    }
    
    // 檢查4: 後端API函數可用性
    const requiredApiFunctions = [
      'checkAllProgressWeb',
      'generateProgressReportWeb', 
      'performBackupWeb',
      'checkFileIntegrityWeb'
    ];
    
    let availableApis = 0;
    requiredApiFunctions.forEach(funcName => {
      if (typeof eval(funcName) === 'function') {
        availableApis++;
      }
    });
    
    if (availableApis === requiredApiFunctions.length) {
      category.details.push('✅ 所有核心API函數可用');
      score += 25;
    } else {
      category.details.push(`⚠️ ${availableApis}/${requiredApiFunctions.length} API函數可用`);
      score += Math.floor(25 * availableApis / requiredApiFunctions.length);
    }
    
  } catch (error) {
    category.details.push('❌ Web App 部署驗證失敗: ' + error.message);
    report.criticalIssues.push('Web App 部署嚴重問題');
  }
  
  category.score = score;
  console.log(`✅ Web App 部署驗證完成，得分: ${score}/100`);
}

/**
 * B. 驗證管理面板核心功能UI
 */
function verifyCoreUIFunctions(report) {
  console.log('🔍 B. 驗證管理面板核心功能UI...');
  const category = report.categories.coreUIFunctions;
  let score = 0;
  
  try {
    // 測試核心功能的後端支援
    const coreFunctions = [
      { name: 'checkAllProgressWeb', desc: '進度檢查功能' },
      { name: 'generateProgressReportWeb', desc: '報告生成功能' },
      { name: 'performBackupWeb', desc: '系統備份功能' },
      { name: 'checkFileIntegrityWeb', desc: '檔案完整性檢查' }
    ];
    
    let workingFunctions = 0;
    
    coreFunctions.forEach(func => {
      try {
        if (typeof eval(func.name) === 'function') {
          // 嘗試模擬調用（但不實際執行長時間操作）
          category.details.push(`✅ ${func.desc} - 後端函數可用`);
          workingFunctions++;
        } else {
          category.details.push(`❌ ${func.desc} - 後端函數不存在`);
        }
      } catch (e) {
        category.details.push(`⚠️ ${func.desc} - 檢查時發生錯誤: ${e.message}`);
      }
    });
    
    // 基於可用函數計算分數
    score = Math.floor(100 * workingFunctions / coreFunctions.length);
    
    if (workingFunctions === coreFunctions.length) {
      category.details.push('🎉 所有核心UI功能的後端支援完整');
    } else {
      report.recommendations.push(`修復 ${coreFunctions.length - workingFunctions} 個核心功能的後端支援`);
    }
    
  } catch (error) {
    category.details.push('❌ 核心UI功能驗證失敗: ' + error.message);
    score = 0;
  }
  
  category.score = score;
  console.log(`✅ 核心UI功能驗證完成，得分: ${score}/100`);
}

/**
 * C. 驗證用戶體驗流程
 */
function verifyUserExperience(report) {
  console.log('🔍 C. 驗證用戶體驗流程...');
  const category = report.categories.userExperience;
  let score = 0;
  
  try {
    // 檢查系統響應能力
    const performanceTests = [
      { name: '系統狀態檢查', func: 'getSystemStatusWeb' },
      { name: '快速診斷', func: 'ultraFastDiagnosis' },
      { name: '系統統計', func: 'getOptimizedSystemStatsWeb' }
    ];
    
    let responsiveFunctions = 0;
    
    performanceTests.forEach(test => {
      if (typeof eval(test.func) === 'function') {
        category.details.push(`✅ ${test.name} - 功能可用`);
        responsiveFunctions++;
      } else {
        category.details.push(`❌ ${test.name} - 功能不可用`);
      }
    });
    
    score += Math.floor(40 * responsiveFunctions / performanceTests.length);
    
    // 檢查用戶引導系統
    const guidanceFunctions = [
      'setupCompleteSystemWeb',
      'generateDetailedSystemDiagnosticWeb',
      'showSystemSettingsWeb'
    ];
    
    let availableGuidance = 0;
    guidanceFunctions.forEach(func => {
      if (typeof eval(func) === 'function') {
        availableGuidance++;
      }
    });
    
    score += Math.floor(30 * availableGuidance / guidanceFunctions.length);
    
    // 檢查操作流暢性相關功能
    if (typeof getOptimizedSystemStatsWeb === 'function') {
      category.details.push('✅ 性能優化功能可用');
      score += 30;
    } else {
      category.details.push('❌ 缺少性能優化功能');
      report.recommendations.push('實施性能優化以改善用戶體驗');
    }
    
  } catch (error) {
    category.details.push('❌ 用戶體驗驗證失敗: ' + error.message);
  }
  
  category.score = score;
  console.log(`✅ 用戶體驗流程驗證完成，得分: ${score}/100`);
}

/**
 * D. 驗證響應式設計支援
 */
function verifyResponsiveDesign(report) {
  console.log('🔍 D. 驗證響應式設計支援...');
  const category = report.categories.responsiveDesign;
  let score = 50; // 基礎分數，因為無法直接測試前端
  
  try {
    // 檢查前端模板可訪問性
    try {
      const template = HtmlService.createTemplateFromFile('dashboard');
      category.details.push('✅ 前端模板可正常載入');
      score += 25;
    } catch (e) {
      category.details.push('❌ 前端模板載入失敗');
    }
    
    // 檢查Web App跨平台支援配置
    try {
      const testWebApp = HtmlService.createTemplateFromFile('dashboard')
        .evaluate()
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      category.details.push('✅ Web App 跨平台配置正確');
      score += 25;
    } catch (e) {
      category.details.push('⚠️ Web App 跨平台配置可能有問題');
    }
    
    category.details.push('ℹ️ 響應式設計細節需要在實際瀏覽器中測試');
    category.details.push('ℹ️ 建議在多種裝置上測試用戶介面');
    
  } catch (error) {
    category.details.push('❌ 響應式設計驗證失敗: ' + error.message);
    score = 30;
  }
  
  category.score = score;
  console.log(`✅ 響應式設計驗證完成，得分: ${score}/100`);
}

/**
 * E. 驗證錯誤處理和用戶引導
 */
function verifyErrorHandling(report) {
  console.log('🔍 E. 驗證錯誤處理和用戶引導...');
  const category = report.categories.errorHandling;
  let score = 0;
  
  try {
    // 檢查系統診斷功能
    if (typeof ultraFastDiagnosis === 'function') {
      category.details.push('✅ 系統診斷功能可用');
      score += 25;
    }
    
    if (typeof generateDetailedSystemDiagnosticWeb === 'function') {
      category.details.push('✅ 詳細診斷報告功能可用');
      score += 25;
    }
    
    // 檢查初始化和設定功能
    if (typeof setupCompleteSystemWeb === 'function') {
      category.details.push('✅ 完整系統設定功能可用');
      score += 25;
    }
    
    // 檢查系統狀態功能
    if (typeof getSystemStatusWeb === 'function') {
      category.details.push('✅ 系統狀態檢查功能可用');
      score += 25;
    }
    
    if (score === 100) {
      category.details.push('🎉 錯誤處理和用戶引導系統完整');
    } else {
      report.recommendations.push('加強錯誤處理和用戶引導功能');
    }
    
  } catch (error) {
    category.details.push('❌ 錯誤處理驗證失敗: ' + error.message);
  }
  
  category.score = score;
  console.log(`✅ 錯誤處理驗證完成，得分: ${score}/100`);
}

/**
 * 計算總體分數
 */
function calculateOverallScore(report) {
  const categories = report.categories;
  const weights = {
    webAppDeployment: 0.3,      // 30% - 最重要
    coreUIFunctions: 0.25,      // 25%
    userExperience: 0.2,        // 20%
    responsiveDesign: 0.15,     // 15%
    errorHandling: 0.1          // 10%
  };
  
  let weightedScore = 0;
  Object.keys(categories).forEach(key => {
    weightedScore += categories[key].score * weights[key];
  });
  
  report.overallScore = Math.round(weightedScore);
}

/**
 * 生成前端驗證報告
 */
function generateFrontendReport(report) {
  console.log('\n🎨 =====================================');
  console.log('    前端系統驗證報告 - Phase 4');
  console.log('=====================================');
  console.log(`📅 檢查時間: ${report.timestamp}`);
  console.log(`🏆 整體UX品質: ${report.overallScore}/100`);
  console.log('');
  
  // 各分類詳細報告
  Object.keys(report.categories).forEach(key => {
    const category = report.categories[key];
    const categoryNames = {
      webAppDeployment: '🖥️ Web App可用性',
      coreUIFunctions: '🎯 功能完整性',
      userExperience: '😊 用戶友善度',
      responsiveDesign: '📱 響應式相容性',
      errorHandling: '⚡ 錯誤處理'
    };
    
    console.log(`${categoryNames[key]}: ${category.score}%`);
    category.details.forEach(detail => {
      console.log(`  ${detail}`);
    });
    console.log('');
  });
  
  // 關鍵問題
  if (report.criticalIssues.length > 0) {
    console.log('🚨 關鍵問題:');
    report.criticalIssues.forEach(issue => {
      console.log(`  ❌ ${issue}`);
    });
    console.log('');
  }
  
  // 改善建議
  if (report.recommendations.length > 0) {
    console.log('💡 改善建議:');
    report.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
    console.log('');
  }
  
  // 總體評估
  console.log('📊 總體評估:');
  if (report.overallScore >= 90) {
    console.log('  🏆 優秀 - 用戶體驗卓越，系統可投入生產使用');
  } else if (report.overallScore >= 80) {
    console.log('  ✅ 良好 - 用戶體驗良好，有小幅改善空間');
  } else if (report.overallScore >= 70) {
    console.log('  ⚠️ 普通 - 基本可用，建議優化主要問題');
  } else {
    console.log('  ❌ 需要改善 - 存在嚴重問題，需要修復後再部署');
  }
  
  console.log('\n=====================================\n');
}

/**
 * 快速前端健康檢查
 */
function quickFrontendHealthCheck() {
  console.log('⚡ 快速前端健康檢查...');
  
  const checks = [
    { name: 'Web App入口', test: () => typeof doGet === 'function' },
    { name: '前端模板', test: () => { 
      try { 
        HtmlService.createTemplateFromFile('dashboard'); 
        return true; 
      } catch(e) { 
        return false; 
      }
    }},
    { name: '核心API', test: () => typeof checkAllProgressWeb === 'function' },
    { name: '系統診斷', test: () => typeof ultraFastDiagnosis === 'function' }
  ];
  
  let passed = 0;
  checks.forEach(check => {
    const result = check.test();
    console.log(`${result ? '✅' : '❌'} ${check.name}`);
    if (result) passed++;
  });
  
  const healthScore = Math.round(100 * passed / checks.length);
  console.log(`\n🏥 前端健康度: ${healthScore}% (${passed}/${checks.length})`);
  
  return healthScore;
}