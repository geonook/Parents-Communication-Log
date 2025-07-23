/**
 * 測試報告生成器
 * 生成多格式測試報告和分析
 * Version: 1.0.0 - Phase 3 CI/CD Pipeline
 */

/**
 * 測試報告生成器主類
 */
class TestReportGenerator {
  constructor() {
    this.reportFormats = ['json', 'html', 'text'];
    this.templateEngine = new ReportTemplateEngine();
    this.analytics = new TestAnalytics();
  }
  
  /**
   * 生成完整測試報告
   * @param {Object} testResult 測試結果
   * @param {Array} formats 報告格式列表
   * @return {Object} 生成的報告
   */
  generateReport(testResult, formats = ['html', 'json']) {
    const perfSession = startTimer('TestReportGenerator.generateReport', 'REPORT_GENERATION');
    
    try {
      Logger.log('[TestReportGenerator] 開始生成測試報告');
      
      const reportData = {
        metadata: this.generateMetadata(testResult),
        summary: this.generateSummary(testResult),
        detailed: this.generateDetailedReport(testResult),
        analytics: this.analytics.analyze(testResult),
        charts: this.generateChartData(testResult),
        recommendations: this.generateRecommendations(testResult),
        coverage: this.analyzeCoverage(testResult)
      };
      
      const reports = {};
      
      for (const format of formats) {
        switch (format.toLowerCase()) {
          case 'html':
            reports.html = this.generateHtmlReport(reportData);
            break;
          case 'json':
            reports.json = this.generateJsonReport(reportData);
            break;
          case 'text':
            reports.text = this.generateTextReport(reportData);
            break;
          case 'markdown':
            reports.markdown = this.generateMarkdownReport(reportData);
            break;
          default:
            Logger.log(`不支援的報告格式: ${format}`);
        }
      }
      
      perfSession.end(true, `生成 ${Object.keys(reports).length} 種格式報告`);
      
      return {
        success: true,
        formats: Object.keys(reports),
        reports: reports,
        metadata: reportData.metadata
      };
      
    } catch (error) {
      perfSession.end(false, error.message);
      
      ErrorHandler.handle('TestReportGenerator.generateReport', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
      
      return {
        success: false,
        error: error.message,
        reports: {}
      };
    }
  }
  
  /**
   * 生成報告元數據
   */
  generateMetadata(testResult) {
    return {
      reportId: `report_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      testExecutionId: testResult.executionId,
      version: '1.0.0',
      generator: 'TestReportGenerator',
      environment: {
        platform: 'Google Apps Script',
        version: 'V8'
      }
    };
  }
  
  /**
   * 生成測試摘要
   */
  generateSummary(testResult) {
    const duration = testResult.duration || 0;
    const durationFormatted = this.formatDuration(duration);
    
    return {
      overview: {
        totalSuites: testResult.totalSuites,
        completedSuites: testResult.completedSuites,
        totalTests: testResult.totalTests,
        passedTests: testResult.passedTests,
        failedTests: testResult.failedTests,
        skippedTests: testResult.skippedTests,
        successRate: testResult.summary?.successRate || '0%',
        status: testResult.summary?.status || 'UNKNOWN'
      },
      timing: {
        startTime: testResult.startTime,
        endTime: testResult.endTime,
        duration: duration,
        durationFormatted: durationFormatted,
        averageSuiteDuration: testResult.summary?.averageSuiteDuration || '0ms'
      },
      health: this.calculateHealthScore(testResult)
    };
  }
  
  /**
   * 生成詳細報告
   */
  generateDetailedReport(testResult) {
    const detailed = {
      suites: [],
      categories: {},
      errors: [],
      slowTests: []
    };
    
    // 處理測試套件詳情
    testResult.suiteResults.forEach(suiteResult => {
      const suiteDetail = {
        name: suiteResult.suiteName,
        description: suiteResult.description,
        status: suiteResult.failedTests === 0 ? 'PASSED' : 'FAILED',
        duration: suiteResult.duration,
        tests: []
      };
      
      // 處理測試詳情
      if (suiteResult.testResults) {
        suiteResult.testResults.forEach(testResult => {
          const testDetail = {
            name: testResult.testName,
            category: testResult.category,
            status: testResult.status,
            duration: testResult.duration,
            message: testResult.message,
            errors: testResult.errors,
            assertions: testResult.assertions
          };
          
          suiteDetail.tests.push(testDetail);
          
          // 收集錯誤
          if (testResult.errors && testResult.errors.length > 0) {
            detailed.errors.push({
              suite: suiteResult.suiteName,
              test: testResult.testName,
              errors: testResult.errors
            });
          }
          
          // 收集慢測試
          if (testResult.duration && testResult.duration > 5000) {
            detailed.slowTests.push({
              suite: suiteResult.suiteName,
              test: testResult.testName,
              duration: testResult.duration
            });
          }
          
          // 按類別統計
          const category = testResult.category || 'general';
          if (!detailed.categories[category]) {
            detailed.categories[category] = {
              total: 0,
              passed: 0,
              failed: 0,
              skipped: 0
            };
          }
          
          detailed.categories[category].total++;
          if (testResult.status === 'passed') detailed.categories[category].passed++;
          else if (testResult.status === 'failed') detailed.categories[category].failed++;
          else if (testResult.status === 'skipped') detailed.categories[category].skipped++;
        });
      }
      
      detailed.suites.push(suiteDetail);
    });
    
    // 排序慢測試
    detailed.slowTests.sort((a, b) => b.duration - a.duration);
    
    return detailed;
  }
  
  /**
   * 生成圖表數據
   */
  generateChartData(testResult) {
    const charts = {};
    
    // 成功率餅圖
    charts.successRatePie = {
      type: 'pie',
      data: {
        labels: ['通過', '失敗', '跳過'],
        values: [testResult.passedTests, testResult.failedTests, testResult.skippedTests],
        colors: ['#28a745', '#dc3545', '#ffc107']
      }
    };
    
    // 類別統計柱狀圖
    if (testResult.summary && testResult.summary.categories) {
      const categories = testResult.summary.categories;
      charts.categoryBar = {
        type: 'bar',
        data: {
          labels: Object.keys(categories),
          datasets: [
            {
              label: '通過',
              data: Object.values(categories).map(c => c.passed),
              color: '#28a745'
            },
            {
              label: '失敗',
              data: Object.values(categories).map(c => c.failed),
              color: '#dc3545'
            }
          ]
        }
      };
    }
    
    // 執行時間趨勢（如果有歷史數據）
    charts.timeTrend = this.generateTimeTrendChart(testResult);
    
    return charts;
  }
  
  /**
   * 生成改進建議
   */
  generateRecommendations(testResult) {
    const recommendations = [];
    
    // 基於測試結果的建議
    if (testResult.failedTests > 0) {
      recommendations.push({
        type: 'error',
        title: '測試失敗',
        description: `有 ${testResult.failedTests} 個測試失敗，需要立即修復`,
        priority: 'high',
        actions: ['檢查失敗測試的錯誤訊息', '修復相關代碼', '重新執行測試']
      });
    }
    
    const successRate = (testResult.passedTests / testResult.totalTests) * 100;
    if (successRate < 90) {
      recommendations.push({
        type: 'warning',
        title: '測試通過率偏低',
        description: `測試通過率為 ${successRate.toFixed(2)}%，建議提升至90%以上`,
        priority: 'medium',
        actions: ['分析失敗原因', '改善代碼品質', '增加測試覆蓋率']
      });
    }
    
    if (testResult.duration > 300000) { // 5分鐘
      recommendations.push({
        type: 'info',
        title: '測試執行時間較長',
        description: '測試執行時間超過5分鐘，建議優化測試效率',
        priority: 'low',
        actions: ['啟用並行執行', '優化測試邏輯', '移除不必要的延遲']
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        title: '測試狀態良好',
        description: '所有測試通過，系統運行正常',
        priority: 'info',
        actions: ['維持當前代碼品質', '持續監控測試結果']
      });
    }
    
    return recommendations;
  }
  
  /**
   * 分析測試覆蓋率
   */
  analyzeCoverage(testResult) {
    const coverage = {
      overall: 0,
      categories: {},
      modules: {},
      recommendations: []
    };
    
    // 計算類別覆蓋率
    if (testResult.summary && testResult.summary.categories) {
      const categories = testResult.summary.categories;
      let totalCovered = 0;
      let totalAvailable = 0;
      
      Object.keys(categories).forEach(category => {
        const cat = categories[category];
        const categoryRate = cat.total > 0 ? (cat.passed / cat.total) * 100 : 0;
        coverage.categories[category] = {
          rate: categoryRate,
          tested: cat.total,
          passed: cat.passed
        };
        
        totalCovered += cat.passed;
        totalAvailable += cat.total;
      });
      
      coverage.overall = totalAvailable > 0 ? (totalCovered / totalAvailable) * 100 : 0;
    }
    
    // 生成覆蓋率建議
    if (coverage.overall < 80) {
      coverage.recommendations.push('測試覆蓋率低於80%，建議增加更多測試');
    }
    
    Object.keys(coverage.categories).forEach(category => {
      if (coverage.categories[category].rate < 70) {
        coverage.recommendations.push(`${category} 類別測試覆蓋率較低，需要加強`);
      }
    });
    
    return coverage;
  }
  
  /**
   * 生成HTML報告
   */
  generateHtmlReport(reportData) {
    return this.templateEngine.renderHtmlTemplate(reportData);
  }
  
  /**
   * 生成JSON報告
   */
  generateJsonReport(reportData) {
    return JSON.stringify(reportData, null, 2);
  }
  
  /**
   * 生成文本報告
   */
  generateTextReport(reportData) {
    const lines = [];
    
    lines.push('測試執行報告');
    lines.push('='.repeat(50));
    lines.push('');
    
    // 基本資訊
    lines.push('基本資訊:');
    lines.push(`  報告ID: ${reportData.metadata.reportId}`);
    lines.push(`  生成時間: ${reportData.metadata.generatedAt}`);
    lines.push(`  執行ID: ${reportData.metadata.testExecutionId}`);
    lines.push('');
    
    // 摘要
    const summary = reportData.summary.overview;
    lines.push('執行摘要:');
    lines.push(`  測試套件: ${summary.completedSuites}/${summary.totalSuites}`);
    lines.push(`  測試總數: ${summary.totalTests}`);
    lines.push(`  通過: ${summary.passedTests}`);
    lines.push(`  失敗: ${summary.failedTests}`);
    lines.push(`  跳過: ${summary.skippedTests}`);
    lines.push(`  成功率: ${summary.successRate}`);
    lines.push(`  狀態: ${summary.status}`);
    lines.push(`  執行時間: ${reportData.summary.timing.durationFormatted}`);
    lines.push('');
    
    // 類別統計
    if (Object.keys(reportData.detailed.categories).length > 0) {
      lines.push('類別統計:');
      Object.keys(reportData.detailed.categories).forEach(category => {
        const cat = reportData.detailed.categories[category];
        lines.push(`  ${category}: ${cat.passed}/${cat.total} 通過`);
      });
      lines.push('');
    }
    
    // 建議
    if (reportData.recommendations.length > 0) {
      lines.push('改進建議:');
      reportData.recommendations.forEach((rec, index) => {
        lines.push(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
        lines.push(`     ${rec.description}`);
      });
    }
    
    return lines.join('\n');
  }
  
  /**
   * 生成Markdown報告
   */
  generateMarkdownReport(reportData) {
    const lines = [];
    
    lines.push('# 測試執行報告');
    lines.push('');
    
    // 摘要徽章
    const summary = reportData.summary.overview;
    const status = summary.status === 'PASSED' ? 'passing' : 'failing';
    const color = summary.status === 'PASSED' ? 'green' : 'red';
    
    lines.push(`![Tests](https://img.shields.io/badge/tests-${summary.passedTests}%2F${summary.totalTests}-${color})`);
    lines.push(`![Status](https://img.shields.io/badge/status-${status}-${color})`);
    lines.push(`![Coverage](https://img.shields.io/badge/coverage-${reportData.coverage.overall.toFixed(1)}%25-blue)`);
    lines.push('');
    
    // 基本資訊表格
    lines.push('## 📊 執行摘要');
    lines.push('');
    lines.push('| 項目 | 數值 |');
    lines.push('|------|------|');
    lines.push(`| 測試套件 | ${summary.completedSuites}/${summary.totalSuites} |`);
    lines.push(`| 測試總數 | ${summary.totalTests} |`);
    lines.push(`| 通過測試 | ${summary.passedTests} |`);
    lines.push(`| 失敗測試 | ${summary.failedTests} |`);
    lines.push(`| 跳過測試 | ${summary.skippedTests} |`);
    lines.push(`| 成功率 | ${summary.successRate} |`);
    lines.push(`| 執行時間 | ${reportData.summary.timing.durationFormatted} |`);
    lines.push('');
    
    // 類別統計
    if (Object.keys(reportData.detailed.categories).length > 0) {
      lines.push('## 📋 類別統計');
      lines.push('');
      lines.push('| 類別 | 總數 | 通過 | 失敗 | 跳過 | 成功率 |');
      lines.push('|------|------|------|------|------|--------|');
      
      Object.keys(reportData.detailed.categories).forEach(category => {
        const cat = reportData.detailed.categories[category];
        const rate = cat.total > 0 ? ((cat.passed / cat.total) * 100).toFixed(1) : 0;
        lines.push(`| ${category} | ${cat.total} | ${cat.passed} | ${cat.failed} | ${cat.skipped} | ${rate}% |`);
      });
      lines.push('');
    }
    
    // 建議
    if (reportData.recommendations.length > 0) {
      lines.push('## 💡 改進建議');
      lines.push('');
      
      reportData.recommendations.forEach((rec, index) => {
        const emoji = rec.type === 'error' ? '❌' : rec.type === 'warning' ? '⚠️' : rec.type === 'success' ? '✅' : 'ℹ️';
        lines.push(`### ${emoji} ${rec.title}`);
        lines.push('');
        lines.push(`**優先級**: ${rec.priority.toUpperCase()}`);
        lines.push('');
        lines.push(rec.description);
        lines.push('');
        
        if (rec.actions && rec.actions.length > 0) {
          lines.push('**建議行動**:');
          rec.actions.forEach(action => {
            lines.push(`- ${action}`);
          });
          lines.push('');
        }
      });
    }
    
    return lines.join('\n');
  }
  
  // === 輔助方法 ===
  
  /**
   * 格式化持續時間
   */
  formatDuration(milliseconds) {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = ((milliseconds % 60000) / 1000).toFixed(2);
      return `${minutes}m ${seconds}s`;
    }
  }
  
  /**
   * 計算健康分數
   */
  calculateHealthScore(testResult) {
    const successRate = testResult.totalTests > 0 
      ? (testResult.passedTests / testResult.totalTests) * 100 
      : 0;
    
    let score = successRate;
    
    // 根據執行時間調整分數
    if (testResult.duration > 300000) { // 5分鐘
      score -= 10;
    } else if (testResult.duration > 180000) { // 3分鐘
      score -= 5;
    }
    
    // 根據失敗測試數量調整分數
    if (testResult.failedTests > 0) {
      score -= (testResult.failedTests / testResult.totalTests) * 20;
    }
    
    return {
      score: Math.max(0, Math.min(100, score)).toFixed(1),
      level: score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor'
    };
  }
  
  /**
   * 生成時間趨勢圖表數據
   */
  generateTimeTrendChart(testResult) {
    // 這裡可以整合歷史測試資料
    return {
      type: 'line',
      data: {
        labels: ['當前執行'],
        datasets: [{
          label: '執行時間',
          data: [testResult.duration],
          color: '#007bff'
        }]
      }
    };
  }
}

/**
 * 報告模板引擎
 */
class ReportTemplateEngine {
  constructor() {
    this.templates = {};
  }
  
  /**
   * 渲染HTML模板
   */
  renderHtmlTemplate(reportData) {
    const template = this.getHtmlTemplate();
    
    // 簡單的模板替換（實際應用中可以使用更複雜的模板引擎）
    return template
      .replace('{{REPORT_TITLE}}', '測試執行報告')
      .replace('{{METADATA}}', JSON.stringify(reportData.metadata, null, 2))
      .replace('{{SUMMARY}}', this.renderSummaryHtml(reportData.summary))
      .replace('{{DETAILED}}', this.renderDetailedHtml(reportData.detailed))
      .replace('{{RECOMMENDATIONS}}', this.renderRecommendationsHtml(reportData.recommendations))
      .replace('{{CHARTS_DATA}}', JSON.stringify(reportData.charts));
  }
  
  /**
   * 獲取HTML模板
   */
  getHtmlTemplate() {
    return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{REPORT_TITLE}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { color: #6c757d; font-size: 14px; }
        .status-passed { color: #28a745; }
        .status-failed { color: #dc3545; }
        .recommendations { margin-top: 20px; }
        .recommendation { padding: 15px; margin-bottom: 10px; border-radius: 8px; }
        .rec-error { background: #f8d7da; border-left: 4px solid #dc3545; }
        .rec-warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .rec-success { background: #d4edda; border-left: 4px solid #28a745; }
        .rec-info { background: #d1ecf1; border-left: 4px solid #17a2b8; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{REPORT_TITLE}}</h1>
        <pre id="metadata">{{METADATA}}</pre>
    </div>
    
    <div id="summary">{{SUMMARY}}</div>
    
    <div id="detailed">{{DETAILED}}</div>
    
    <div id="recommendations">{{RECOMMENDATIONS}}</div>
    
    <script>
        const chartsData = {{CHARTS_DATA}};
        console.log('Charts Data:', chartsData);
    </script>
</body>
</html>`;
  }
  
  /**
   * 渲染摘要HTML
   */
  renderSummaryHtml(summary) {
    const overview = summary.overview;
    const statusClass = overview.status === 'PASSED' ? 'status-passed' : 'status-failed';
    
    return `
<div class="summary">
    <div class="metric">
        <div class="metric-value">${overview.totalTests}</div>
        <div class="metric-label">總測試數</div>
    </div>
    <div class="metric">
        <div class="metric-value">${overview.passedTests}</div>
        <div class="metric-label">通過測試</div>
    </div>
    <div class="metric">
        <div class="metric-value">${overview.failedTests}</div>
        <div class="metric-label">失敗測試</div>
    </div>
    <div class="metric">
        <div class="metric-value">${overview.successRate}</div>
        <div class="metric-label">成功率</div>
    </div>
    <div class="metric">
        <div class="metric-value ${statusClass}">${overview.status}</div>
        <div class="metric-label">總體狀態</div>
    </div>
    <div class="metric">
        <div class="metric-value">${summary.timing.durationFormatted}</div>
        <div class="metric-label">執行時間</div>
    </div>
</div>`;
  }
  
  /**
   * 渲染詳細資訊HTML
   */
  renderDetailedHtml(detailed) {
    let html = '<h2>詳細結果</h2>';
    
    // 測試套件
    html += '<h3>測試套件</h3>';
    html += '<ul>';
    detailed.suites.forEach(suite => {
      const statusClass = suite.status === 'PASSED' ? 'status-passed' : 'status-failed';
      html += `<li><span class="${statusClass}">${suite.status}</span> ${suite.name} (${suite.tests.length} 測試)</li>`;
    });
    html += '</ul>';
    
    // 錯誤摘要
    if (detailed.errors.length > 0) {
      html += '<h3>錯誤摘要</h3>';
      html += '<ul>';
      detailed.errors.forEach(error => {
        html += `<li><strong>${error.suite} - ${error.test}</strong>: ${error.errors.join(', ')}</li>`;
      });
      html += '</ul>';
    }
    
    return html;
  }
  
  /**
   * 渲染建議HTML
   */
  renderRecommendationsHtml(recommendations) {
    let html = '<div class="recommendations"><h2>改進建議</h2>';
    
    recommendations.forEach(rec => {
      const cssClass = `rec-${rec.type}`;
      html += `<div class="recommendation ${cssClass}">`;
      html += `<h4>${rec.title}</h4>`;
      html += `<p>${rec.description}</p>`;
      html += `<small>優先級: ${rec.priority.toUpperCase()}</small>`;
      html += '</div>';
    });
    
    html += '</div>';
    return html;
  }
}

/**
 * 測試分析器
 */
class TestAnalytics {
  constructor() {
    this.metrics = [];
  }
  
  /**
   * 分析測試結果
   */
  analyze(testResult) {
    return {
      performance: this.analyzePerformance(testResult),
      reliability: this.analyzeReliability(testResult),
      trends: this.analyzeTrends(testResult),
      patterns: this.analyzePatterns(testResult)
    };
  }
  
  /**
   * 性能分析
   */
  analyzePerformance(testResult) {
    const avgDuration = testResult.completedSuites > 0 
      ? testResult.duration / testResult.completedSuites 
      : 0;
    
    return {
      averageSuiteDuration: avgDuration,
      totalDuration: testResult.duration,
      performanceLevel: avgDuration < 30000 ? 'fast' : avgDuration < 60000 ? 'medium' : 'slow'
    };
  }
  
  /**
   * 可靠性分析
   */
  analyzeReliability(testResult) {
    const successRate = testResult.totalTests > 0 
      ? (testResult.passedTests / testResult.totalTests) * 100 
      : 0;
    
    return {
      successRate: successRate,
      reliabilityLevel: successRate >= 95 ? 'excellent' : successRate >= 85 ? 'good' : 'needs-improvement',
      flakiness: testResult.failedTests / testResult.totalTests
    };
  }
  
  /**
   * 趨勢分析
   */
  analyzeTrends(testResult) {
    // 這裡可以與歷史數據比較
    return {
      direction: 'stable',
      improvement: 0,
      regression: 0
    };
  }
  
  /**
   * 模式分析
   */
  analyzePatterns(testResult) {
    const patterns = [];
    
    // 分析失敗模式
    if (testResult.failedTests > 0) {
      patterns.push('存在測試失敗');
    }
    
    // 分析執行時間模式
    if (testResult.duration > 300000) {
      patterns.push('執行時間較長');
    }
    
    return patterns;
  }
}

/**
 * 全域測試報告生成器實例
 */
const globalTestReportGenerator = new TestReportGenerator();

/**
 * 生成測試報告的便利函數
 */
function generateTestReport(testResult, formats = ['html', 'json']) {
  return globalTestReportGenerator.generateReport(testResult, formats);
}