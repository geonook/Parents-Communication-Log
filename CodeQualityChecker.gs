/**
 * 代碼品質檢查器
 * 企業級代碼品質評估與CI/CD品質門禁系統
 * Version: 1.0.0 - Phase 3 CI/CD Quality Gates Infrastructure
 */

/**
 * 品質規則嚴重性等級
 */
const QUALITY_SEVERITY = {
  BLOCKER: 'blocker',       // 阻斷級 - 阻止部署
  CRITICAL: 'critical',     // 關鍵級 - 需要立即修復
  MAJOR: 'major',          // 主要級 - 影響功能或性能
  MINOR: 'minor',          // 次要級 - 代碼標準問題
  INFO: 'info'             // 信息級 - 改進建議
};

/**
 * 品質維度枚舉
 */
const QUALITY_DIMENSIONS = {
  COMPLEXITY: 'complexity',           // 代碼複雜度
  MAINTAINABILITY: 'maintainability', // 可維護性
  SECURITY: 'security',               // 安全性
  PERFORMANCE: 'performance',         // 性能
  BEST_PRACTICES: 'best_practices',   // 最佳實踐
  TEST_COVERAGE: 'test_coverage'      // 測試覆蓋率
};

/**
 * 品質規則類
 */
class QualityRule {
  constructor(id, name, dimension, severity, options = {}) {
    this.id = id;
    this.name = name;
    this.dimension = dimension;
    this.severity = severity;
    this.description = options.description || '';
    this.threshold = options.threshold;
    this.enabled = options.enabled !== false;
    this.pattern = options.pattern;
    this.checkFunction = options.checkFunction;
    this.remediation = options.remediation || '';
    this.tags = options.tags || [];
    this.createdAt = new Date().toISOString();
  }
  
  /**
   * 執行規則檢查
   * @param {Object} context 檢查上下文
   * @return {Array} 問題列表
   */
  check(context) {
    if (!this.enabled) {
      return [];
    }
    
    try {
      if (this.checkFunction && typeof this.checkFunction === 'function') {
        return this.checkFunction(context) || [];
      }
      
      if (this.pattern) {
        return this.checkPattern(context);
      }
      
      return [];
      
    } catch (error) {
      ErrorHandler.handle(`QualityRule.check.${this.id}`, error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.SYSTEM);
      return [];
    }
  }
  
  /**
   * 基於模式的檢查
   */
  checkPattern(context) {
    const issues = [];
    const lines = context.content.split('\n');
    
    lines.forEach((line, index) => {
      if (this.pattern.test(line)) {
        issues.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: this.severity,
          line: index + 1,
          column: line.search(this.pattern) + 1,
          message: this.description,
          remediation: this.remediation
        });
      }
    });
    
    return issues;
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      dimension: this.dimension,
      severity: this.severity,
      description: this.description,
      threshold: this.threshold,
      enabled: this.enabled,
      remediation: this.remediation,
      tags: this.tags,
      createdAt: this.createdAt
    };
  }
}

/**
 * 代碼分析器
 */
class CodeAnalyzer {
  constructor() {
    this.analysisCache = new Map();
    this.cacheTimeout = 300000; // 5分鐘快取
  }
  
  /**
   * 分析代碼複雜度
   * @param {string} content 代碼內容
   * @return {Object} 複雜度分析結果
   */
  analyzeComplexity(content) {
    const cacheKey = `complexity_${this.hashContent(content)}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;
    
    const analysis = {
      cyclomaticComplexity: this.calculateCyclomaticComplexity(content),
      nestingDepth: this.calculateNestingDepth(content),
      functionLength: this.analyzeFunctionLength(content),
      classComplexity: this.analyzeClassComplexity(content)
    };
    
    this.setCachedResult(cacheKey, analysis);
    return analysis;
  }
  
  /**
   * 分析可維護性
   * @param {string} content 代碼內容
   * @return {Object} 可維護性分析結果
   */
  analyzeMaintainability(content) {
    const cacheKey = `maintainability_${this.hashContent(content)}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;
    
    const analysis = {
      duplication: this.detectCodeDuplication(content),
      naming: this.analyzeNamingConventions(content),
      documentation: this.analyzeDocumentation(content),
      fileSize: this.analyzeFileSize(content)
    };
    
    this.setCachedResult(cacheKey, analysis);
    return analysis;
  }
  
  /**
   * 分析安全問題
   * @param {string} content 代碼內容
   * @return {Object} 安全分析結果
   */
  analyzeSecurity(content) {
    const cacheKey = `security_${this.hashContent(content)}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;
    
    const analysis = {
      vulnerabilities: this.detectSecurityVulnerabilities(content),
      hardcodedSecrets: this.detectHardcodedSecrets(content),
      unsafePatterns: this.detectUnsafePatterns(content),
      inputValidation: this.analyzeInputValidation(content)
    };
    
    this.setCachedResult(cacheKey, analysis);
    return analysis;
  }
  
  /**
   * 分析性能問題
   * @param {string} content 代碼內容
   * @return {Object} 性能分析結果
   */
  analyzePerformance(content) {
    const cacheKey = `performance_${this.hashContent(content)}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;
    
    const analysis = {
      antiPatterns: this.detectPerformanceAntiPatterns(content),
      resourceUsage: this.analyzeResourceUsage(content),
      asyncPatterns: this.analyzeAsyncPatterns(content),
      loopOptimization: this.analyzeLoopOptimization(content)
    };
    
    this.setCachedResult(cacheKey, analysis);
    return analysis;
  }
  
  /**
   * 計算圈複雜度
   */
  calculateCyclomaticComplexity(content) {
    const complexityKeywords = [
      'if', 'else if', 'while', 'for', 'switch', 'case', 
      'catch', '&&', '||', '?', 'try', 'finally'
    ];
    
    let complexity = 1; // 基礎複雜度
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      complexityKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = trimmedLine.match(regex);
        if (matches) {
          complexity += matches.length;
        }
      });
    });
    
    return complexity;
  }
  
  /**
   * 計算嵌套深度
   */
  calculateNestingDepth(content) {
    let maxDepth = 0;
    let currentDepth = 0;
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 增加深度的關鍵字
      if (/^(if|else|while|for|switch|try|catch|finally|function|class)\s*\(|\{$/.test(trimmedLine)) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }
      
      // 減少深度
      if (trimmedLine === '}' || trimmedLine.endsWith('}')) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    });
    
    return maxDepth;
  }
  
  /**
   * 分析函數長度
   */
  analyzeFunctionLength(content) {
    const functions = [];
    const lines = content.split('\n');
    let currentFunction = null;
    let braceCount = 0;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // 檢測函數開始
      const functionMatch = trimmedLine.match(/function\s+(\w+)\s*\(|(\w+)\s*:\s*function\s*\(|async\s+function\s+(\w+)/);
      if (functionMatch && !currentFunction) {
        currentFunction = {
          name: functionMatch[1] || functionMatch[2] || functionMatch[3] || 'anonymous',
          startLine: index + 1,
          endLine: null,
          length: 0
        };
        braceCount = 0;
      }
      
      if (currentFunction) {
        // 計算大括號平衡
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        
        // 函數結束
        if (braceCount === 0 && trimmedLine.includes('}')) {
          currentFunction.endLine = index + 1;
          currentFunction.length = currentFunction.endLine - currentFunction.startLine + 1;
          functions.push(currentFunction);
          currentFunction = null;
        }
      }
    });
    
    return functions;
  }
  
  /**
   * 分析類複雜度
   */
  analyzeClassComplexity(content) {
    const classes = [];
    const lines = content.split('\n');
    let currentClass = null;
    let braceCount = 0;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // 檢測類開始
      const classMatch = trimmedLine.match(/class\s+(\w+)/);
      if (classMatch && !currentClass) {
        currentClass = {
          name: classMatch[1],
          startLine: index + 1,
          methods: 0,
          properties: 0,
          complexity: 1
        };
        braceCount = 0;
      }
      
      if (currentClass) {
        // 計算方法數量
        if (trimmedLine.match(/^\w+\s*\(/)) {
          currentClass.methods++;
        }
        
        // 計算屬性數量
        if (trimmedLine.match(/^this\.\w+\s*=/)) {
          currentClass.properties++;
        }
        
        // 計算大括號平衡
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        
        // 類結束
        if (braceCount === 0 && trimmedLine === '}') {
          currentClass.complexity = currentClass.methods + currentClass.properties;
          classes.push(currentClass);
          currentClass = null;
        }
      }
    });
    
    return classes;
  }
  
  /**
   * 檢測代碼重複
   */
  detectCodeDuplication(content) {
    const duplications = [];
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const minBlockSize = 3; // 最小重複塊大小
    
    for (let i = 0; i < lines.length - minBlockSize; i++) {
      for (let j = i + minBlockSize; j < lines.length - minBlockSize; j++) {
        let blockSize = 0;
        
        // 計算相同行的數量
        while (i + blockSize < lines.length && 
               j + blockSize < lines.length && 
               lines[i + blockSize] === lines[j + blockSize]) {
          blockSize++;
        }
        
        if (blockSize >= minBlockSize) {
          duplications.push({
            startLine1: i + 1,
            endLine1: i + blockSize,
            startLine2: j + 1,
            endLine2: j + blockSize,
            size: blockSize
          });
        }
      }
    }
    
    return duplications;
  }
  
  /**
   * 分析命名規範
   */
  analyzeNamingConventions(content) {
    const issues = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // 檢查函數命名
      const functionMatch = trimmedLine.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (functionMatch) {
        const functionName = functionMatch[1];
        if (!/^[a-z][a-zA-Z0-9]*$/.test(functionName)) {
          issues.push({
            type: 'function_naming',
            line: index + 1,
            message: `函數名稱 "${functionName}" 不符合 camelCase 規範`,
            severity: QUALITY_SEVERITY.MINOR
          });
        }
      }
      
      // 檢查變量命名
      const varMatch = trimmedLine.match(/(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (varMatch) {
        const varName = varMatch[2];
        if (!/^[a-z][a-zA-Z0-9]*$/.test(varName) && !/^[A-Z][A-Z0-9_]*$/.test(varName)) {
          issues.push({
            type: 'variable_naming',
            line: index + 1,
            message: `變量名稱 "${varName}" 不符合命名規範`,
            severity: QUALITY_SEVERITY.MINOR
          });
        }
      }
      
      // 檢查類命名
      const classMatch = trimmedLine.match(/class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (classMatch) {
        const className = classMatch[1];
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(className)) {
          issues.push({
            type: 'class_naming',
            line: index + 1,
            message: `類名稱 "${className}" 不符合 PascalCase 規範`,
            severity: QUALITY_SEVERITY.MINOR
          });
        }
      }
    });
    
    return issues;
  }
  
  /**
   * 分析文檔覆蓋率
   */
  analyzeDocumentation(content) {
    const lines = content.split('\n');
    let totalFunctions = 0;
    let documentedFunctions = 0;
    let totalClasses = 0;
    let documentedClasses = 0;
    
    let previousLineWasComment = false;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // 檢測註解
      if (trimmedLine.startsWith('/**') || trimmedLine.startsWith('*') || trimmedLine.startsWith('//')) {
        previousLineWasComment = true;
        return;
      }
      
      // 檢測函數
      if (trimmedLine.match(/function\s+\w+|^\w+\s*:\s*function|\w+\s*\(/)) {
        totalFunctions++;
        if (previousLineWasComment) {
          documentedFunctions++;
        }
      }
      
      // 檢測類
      if (trimmedLine.match(/class\s+\w+/)) {
        totalClasses++;
        if (previousLineWasComment) {
          documentedClasses++;
        }
      }
      
      if (!trimmedLine.startsWith('/**') && !trimmedLine.startsWith('*') && !trimmedLine.startsWith('//')) {
        previousLineWasComment = false;
      }
    });
    
    return {
      functionCoverage: totalFunctions > 0 ? (documentedFunctions / totalFunctions) * 100 : 100,
      classCoverage: totalClasses > 0 ? (documentedClasses / totalClasses) * 100 : 100,
      totalFunctions: totalFunctions,
      documentedFunctions: documentedFunctions,
      totalClasses: totalClasses,
      documentedClasses: documentedClasses
    };
  }
  
  /**
   * 分析檔案大小
   */
  analyzeFileSize(content) {
    const lines = content.split('\n');
    const codeLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('*');
    });
    
    return {
      totalLines: lines.length,
      codeLines: codeLines.length,
      commentLines: lines.length - codeLines.length,
      characters: content.length
    };
  }
  
  /**
   * 檢測安全漏洞
   */
  detectSecurityVulnerabilities(content) {
    const vulnerabilities = [];
    const securityPatterns = [
      { pattern: /eval\s*\(/, type: 'eval_usage', severity: QUALITY_SEVERITY.CRITICAL },
      { pattern: /innerHTML\s*=/, type: 'innerHTML_injection', severity: QUALITY_SEVERITY.MAJOR },
      { pattern: /document\.write\s*\(/, type: 'document_write', severity: QUALITY_SEVERITY.MAJOR },
      { pattern: /\.html\s*\(.*\+.*\)/, type: 'html_injection', severity: QUALITY_SEVERITY.MAJOR },
      { pattern: /setTimeout\s*\(\s*["'`]/, type: 'setTimeout_string', severity: QUALITY_SEVERITY.MAJOR }
    ];
    
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      securityPatterns.forEach(({ pattern, type, severity }) => {
        if (pattern.test(line)) {
          vulnerabilities.push({
            type: type,
            line: index + 1,
            severity: severity,
            message: `檢測到潛在安全問題: ${type}`,
            code: line.trim()
          });
        }
      });
    });
    
    return vulnerabilities;
  }
  
  /**
   * 檢測硬編碼秘密
   */
  detectHardcodedSecrets(content) {
    const secrets = [];
    const secretPatterns = [
      { pattern: /password\s*[=:]\s*["'][^"']+["']/, type: 'hardcoded_password' },
      { pattern: /api[_-]?key\s*[=:]\s*["'][^"']+["']/, type: 'hardcoded_api_key' },
      { pattern: /secret\s*[=:]\s*["'][^"']+["']/, type: 'hardcoded_secret' },
      { pattern: /token\s*[=:]\s*["'][^"']+["']/, type: 'hardcoded_token' }
    ];
    
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      secretPatterns.forEach(({ pattern, type }) => {
        if (pattern.test(line.toLowerCase())) {
          secrets.push({
            type: type,
            line: index + 1,
            severity: QUALITY_SEVERITY.CRITICAL,
            message: `檢測到硬編碼秘密: ${type}`
          });
        }
      });
    });
    
    return secrets;
  }
  
  /**
   * 檢測不安全模式
   */
  detectUnsafePatterns(content) {
    const patterns = [];
    const unsafePatterns = [
      { pattern: /console\.log\s*\(/, type: 'console_log', severity: QUALITY_SEVERITY.MINOR },
      { pattern: /alert\s*\(/, type: 'alert_usage', severity: QUALITY_SEVERITY.MINOR },
      { pattern: /confirm\s*\(/, type: 'confirm_usage', severity: QUALITY_SEVERITY.MINOR },
      { pattern: /prompt\s*\(/, type: 'prompt_usage', severity: QUALITY_SEVERITY.MINOR }
    ];
    
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      unsafePatterns.forEach(({ pattern, type, severity }) => {
        if (pattern.test(line)) {
          patterns.push({
            type: type,
            line: index + 1,
            severity: severity,
            message: `檢測到不建議的模式: ${type}`
          });
        }
      });
    });
    
    return patterns;
  }
  
  /**
   * 分析輸入驗證
   */
  analyzeInputValidation(content) {
    const issues = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // 檢查是否有未驗證的用戶輸入
      if (line.includes('request.') || line.includes('params.') || line.includes('query.')) {
        if (!line.includes('validate') && !line.includes('sanitize') && !line.includes('check')) {
          issues.push({
            type: 'unvalidated_input',
            line: index + 1,
            severity: QUALITY_SEVERITY.MAJOR,
            message: '檢測到可能未驗證的用戶輸入'
          });
        }
      }
    });
    
    return issues;
  }
  
  /**
   * 檢測性能反模式
   */
  detectPerformanceAntiPatterns(content) {
    const antiPatterns = [];
    const performancePatterns = [
      { pattern: /for\s*\(.*\.length.*\)/, type: 'inefficient_loop', severity: QUALITY_SEVERITY.MINOR },
      { pattern: /jQuery|\$\(/, type: 'jquery_usage', severity: QUALITY_SEVERITY.INFO },
      { pattern: /document\.getElementById/, type: 'repeated_dom_query', severity: QUALITY_SEVERITY.MINOR },
      { pattern: /setInterval\s*\(.*,\s*[1-9]\d{0,2}\)/, type: 'frequent_interval', severity: QUALITY_SEVERITY.MINOR }
    ];
    
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      performancePatterns.forEach(({ pattern, type, severity }) => {
        if (pattern.test(line)) {
          antiPatterns.push({
            type: type,
            line: index + 1,
            severity: severity,
            message: `檢測到性能問題: ${type}`
          });
        }
      });
    });
    
    return antiPatterns;
  }
  
  /**
   * 分析資源使用
   */
  analyzeResourceUsage(content) {
    const resourceIssues = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // 檢測可能的記憶體洩漏
      if (line.includes('setInterval') && !line.includes('clearInterval')) {
        resourceIssues.push({
          type: 'potential_memory_leak',
          line: index + 1,
          severity: QUALITY_SEVERITY.MAJOR,
          message: '可能的記憶體洩漏: setInterval 未配對 clearInterval'
        });
      }
      
      // 檢測大型數組操作
      if (line.includes('.push(') && line.includes('for')) {
        resourceIssues.push({
          type: 'inefficient_array_operation',
          line: index + 1,
          severity: QUALITY_SEVERITY.MINOR,
          message: '可能的低效數組操作'
        });
      }
    });
    
    return resourceIssues;
  }
  
  /**
   * 分析異步模式
   */
  analyzeAsyncPatterns(content) {
    const asyncIssues = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // 檢測未處理的 Promise
      if (line.includes('new Promise') && !line.includes('.catch')) {
        asyncIssues.push({
          type: 'unhandled_promise',
          line: index + 1,
          severity: QUALITY_SEVERITY.MAJOR,
          message: '未處理的 Promise 錯誤'
        });
      }
      
      // 檢測回調地獄
      if ((line.match(/function\s*\(/g) || []).length > 2) {
        asyncIssues.push({
          type: 'callback_hell',
          line: index + 1,
          severity: QUALITY_SEVERITY.MINOR,
          message: '可能的回調地獄'
        });
      }
    });
    
    return asyncIssues;
  }
  
  /**
   * 分析循環優化
   */
  analyzeLoopOptimization(content) {
    const loopIssues = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // 檢測低效的循環
      if (line.includes('for') && line.includes('.length')) {
        if (!line.includes('const length') && !line.includes('let length')) {
          loopIssues.push({
            type: 'inefficient_loop_length',
            line: index + 1,
            severity: QUALITY_SEVERITY.MINOR,
            message: '建議快取數組長度以提高循環性能'
          });
        }
      }
      
      // 檢測嵌套循環
      const indentation = line.length - line.trimLeft().length;
      if (line.trim().includes('for') && indentation > 4) {
        loopIssues.push({
          type: 'nested_loop',
          line: index + 1,
          severity: QUALITY_SEVERITY.MINOR,
          message: '嵌套循環可能影響性能'
        });
      }
    });
    
    return loopIssues;
  }
  
  // === 輔助方法 ===
  
  /**
   * 生成內容雜湊值
   */
  hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 轉換為32位整數
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * 獲取快取結果
   */
  getCachedResult(key) {
    const cached = this.analysisCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    return null;
  }
  
  /**
   * 設置快取結果
   */
  setCachedResult(key, result) {
    this.analysisCache.set(key, {
      result: result,
      timestamp: Date.now()
    });
    
    // 清理過期快取
    if (this.analysisCache.size > 100) {
      const now = Date.now();
      this.analysisCache.forEach((value, key) => {
        if (now - value.timestamp > this.cacheTimeout) {
          this.analysisCache.delete(key);
        }
      });
    }
  }
}

/**
 * 品質評估結果類
 */
class QualityAssessment {
  constructor(fileName, content) {
    this.fileName = fileName;
    this.content = content;
    this.timestamp = new Date().toISOString();
    this.issues = [];
    this.metrics = {};
    this.score = 0;
    this.grade = 'F';
    this.passed = false;
    this.blocker = false;
    this.critical = false;
    this.recommendations = [];
  }
  
  /**
   * 添加問題
   */
  addIssue(issue) {
    this.issues.push({
      ...issue,
      id: this.generateIssueId(),
      timestamp: new Date().toISOString()
    });
    
    // 更新狀態標記
    if (issue.severity === QUALITY_SEVERITY.BLOCKER) {
      this.blocker = true;
    }
    if (issue.severity === QUALITY_SEVERITY.CRITICAL) {
      this.critical = true;
    }
  }
  
  /**
   * 設置指標
   */
  setMetrics(metrics) {
    this.metrics = metrics;
  }
  
  /**
   * 計算品質分數
   */
  calculateScore() {
    const weights = {
      [QUALITY_SEVERITY.BLOCKER]: -50,
      [QUALITY_SEVERITY.CRITICAL]: -20,
      [QUALITY_SEVERITY.MAJOR]: -10,
      [QUALITY_SEVERITY.MINOR]: -5,
      [QUALITY_SEVERITY.INFO]: -1
    };
    
    let score = 100; // 基礎分數
    
    this.issues.forEach(issue => {
      score += weights[issue.severity] || 0;
    });
    
    // 根據複雜度調整分數
    if (this.metrics.complexity && this.metrics.complexity.cyclomaticComplexity > 15) {
      score -= (this.metrics.complexity.cyclomaticComplexity - 15) * 2;
    }
    
    // 根據文檔覆蓋率調整分數
    if (this.metrics.maintainability && this.metrics.maintainability.documentation) {
      const docCoverage = this.metrics.maintainability.documentation.functionCoverage;
      if (docCoverage < 50) {
        score -= (50 - docCoverage) * 0.5;
      }
    }
    
    this.score = Math.max(0, Math.min(100, score));
    this.grade = this.calculateGrade(this.score);
    this.passed = this.score >= 70 && !this.blocker;
    
    return this.score;
  }
  
  /**
   * 計算等級
   */
  calculateGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  /**
   * 生成建議
   */
  generateRecommendations() {
    const recommendations = [];
    
    // 基於問題類型生成建議
    const issueTypes = this.groupIssuesByType();
    
    Object.keys(issueTypes).forEach(type => {
      const count = issueTypes[type].length;
      const severity = issueTypes[type][0].severity;
      
      switch (type) {
        case 'function_naming':
          recommendations.push(`修正 ${count} 個函數命名問題，使用 camelCase 命名規範`);
          break;
        case 'code_duplication':
          recommendations.push(`重構 ${count} 處重複代碼，提取共用函數`);
          break;
        case 'complexity':
          recommendations.push(`簡化複雜的函數，將圈複雜度控制在 15 以下`);
          break;
        case 'security':
          recommendations.push(`修復 ${count} 個安全問題，${severity === QUALITY_SEVERITY.CRITICAL ? '優先處理' : '建議盡快處理'}`);
          break;
        case 'performance':
          recommendations.push(`優化 ${count} 個性能問題，改善系統響應速度`);
          break;
        case 'documentation':
          recommendations.push('提高代碼文檔覆蓋率，為重要函數添加 JSDoc 註解');
          break;
      }
    });
    
    // 基於分數生成建議
    if (this.score < 70) {
      recommendations.push('代碼品質不達標，建議進行全面重構');
    } else if (this.score < 80) {
      recommendations.push('代碼品質一般，建議重點改善主要問題');
    } else if (this.score < 90) {
      recommendations.push('代碼品質良好，建議修復剩餘的小問題');
    }
    
    this.recommendations = recommendations;
    return recommendations;
  }
  
  /**
   * 按類型分組問題
   */
  groupIssuesByType() {
    const groups = {};
    this.issues.forEach(issue => {
      const type = issue.type || issue.ruleId || 'unknown';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(issue);
    });
    return groups;
  }
  
  /**
   * 生成問題ID
   */
  generateIssueId() {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 導出為JSON
   */
  toJSON() {
    return {
      fileName: this.fileName,
      timestamp: this.timestamp,
      score: this.score,
      grade: this.grade,
      passed: this.passed,
      blocker: this.blocker,
      critical: this.critical,
      issues: this.issues,
      metrics: this.metrics,
      recommendations: this.recommendations,
      summary: {
        totalIssues: this.issues.length,
        blockerIssues: this.issues.filter(i => i.severity === QUALITY_SEVERITY.BLOCKER).length,
        criticalIssues: this.issues.filter(i => i.severity === QUALITY_SEVERITY.CRITICAL).length,
        majorIssues: this.issues.filter(i => i.severity === QUALITY_SEVERITY.MAJOR).length,
        minorIssues: this.issues.filter(i => i.severity === QUALITY_SEVERITY.MINOR).length,
        infoIssues: this.issues.filter(i => i.severity === QUALITY_SEVERITY.INFO).length
      }
    };
  }
}

/**
 * 品質門禁類
 */
class QualityGate {
  constructor(name, options = {}) {
    this.name = name;
    this.enabled = options.enabled !== false;
    this.thresholds = {
      minScore: options.minScore || 70,
      maxBlockerIssues: options.maxBlockerIssues || 0,
      maxCriticalIssues: options.maxCriticalIssues || 5,
      maxMajorIssues: options.maxMajorIssues || 20,
      minDocCoverage: options.minDocCoverage || 50,
      maxComplexity: options.maxComplexity || 15,
      ...options.thresholds
    };
    this.rules = options.rules || [];
    this.actions = {
      onPass: options.onPass || [],
      onFail: options.onFail || [],
      onBlock: options.onBlock || []
    };
  }
  
  /**
   * 評估品質門禁
   * @param {QualityAssessment} assessment 品質評估結果
   * @return {Object} 門禁結果
   */
  evaluate(assessment) {
    if (!this.enabled) {
      return {
        passed: true,
        blocked: false,
        gate: this.name,
        message: '品質門禁已停用',
        details: []
      };
    }
    
    const results = {
      passed: true,
      blocked: false,
      gate: this.name,
      message: '',
      details: [],
      violations: []
    };
    
    try {
      // 檢查分數門檻
      if (assessment.score < this.thresholds.minScore) {
        results.passed = false;
        results.violations.push({
          type: 'score',
          message: `品質分數 ${assessment.score} 低於門檻 ${this.thresholds.minScore}`,
          severity: 'major'
        });
      }
      
      // 檢查阻斷級問題
      const blockerCount = assessment.issues.filter(i => i.severity === QUALITY_SEVERITY.BLOCKER).length;
      if (blockerCount > this.thresholds.maxBlockerIssues) {
        results.passed = false;
        results.blocked = true;
        results.violations.push({
          type: 'blocker',
          message: `阻斷級問題 ${blockerCount} 個，超過門檻 ${this.thresholds.maxBlockerIssues}`,
          severity: 'blocker'
        });
      }
      
      // 檢查關鍵級問題
      const criticalCount = assessment.issues.filter(i => i.severity === QUALITY_SEVERITY.CRITICAL).length;
      if (criticalCount > this.thresholds.maxCriticalIssues) {
        results.passed = false;
        results.violations.push({
          type: 'critical',
          message: `關鍵級問題 ${criticalCount} 個，超過門檻 ${this.thresholds.maxCriticalIssues}`,
          severity: 'critical'
        });
      }
      
      // 檢查主要級問題
      const majorCount = assessment.issues.filter(i => i.severity === QUALITY_SEVERITY.MAJOR).length;
      if (majorCount > this.thresholds.maxMajorIssues) {
        results.passed = false;
        results.violations.push({
          type: 'major',
          message: `主要級問題 ${majorCount} 個，超過門檻 ${this.thresholds.maxMajorIssues}`,
          severity: 'major'
        });
      }
      
      // 檢查文檔覆蓋率
      if (assessment.metrics.maintainability && assessment.metrics.maintainability.documentation) {
        const docCoverage = assessment.metrics.maintainability.documentation.functionCoverage;
        if (docCoverage < this.thresholds.minDocCoverage) {
          results.passed = false;
          results.violations.push({
            type: 'documentation',
            message: `文檔覆蓋率 ${docCoverage}% 低於門檻 ${this.thresholds.minDocCoverage}%`,
            severity: 'minor'
          });
        }
      }
      
      // 檢查複雜度
      if (assessment.metrics.complexity && assessment.metrics.complexity.cyclomaticComplexity > this.thresholds.maxComplexity) {
        results.passed = false;
        results.violations.push({
          type: 'complexity',
          message: `圈複雜度 ${assessment.metrics.complexity.cyclomaticComplexity} 超過門檻 ${this.thresholds.maxComplexity}`,
          severity: 'major'
        });
      }
      
      // 執行自定義規則
      this.rules.forEach(rule => {
        try {
          const ruleResult = rule.evaluate(assessment);
          if (!ruleResult.passed) {
            results.passed = false;
            if (ruleResult.blocked) {
              results.blocked = true;
            }
            results.violations.push({
              type: 'custom_rule',
              rule: rule.name,
              message: ruleResult.message,
              severity: ruleResult.severity || 'major'
            });
          }
        } catch (error) {
          ErrorHandler.handle(`QualityGate.evaluate.rule.${rule.name}`, error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.SYSTEM);
        }
      });
      
      // 設置結果訊息
      if (results.blocked) {
        results.message = `品質門禁 ${this.name} 失敗: 存在阻斷級問題，禁止部署`;
      } else if (!results.passed) {
        results.message = `品質門禁 ${this.name} 失敗: 品質不達標，建議修復後重試`;
      } else {
        results.message = `品質門禁 ${this.name} 通過`;
      }
      
      // 執行動作
      this.executeActions(results);
      
      return results;
      
    } catch (error) {
      ErrorHandler.handle(`QualityGate.evaluate.${this.name}`, error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
      return {
        passed: false,
        blocked: false,
        gate: this.name,
        message: `品質門禁評估失敗: ${error.message}`,
        error: error.message
      };
    }
  }
  
  /**
   * 執行動作
   */
  executeActions(results) {
    try {
      let actions = [];
      
      if (results.blocked) {
        actions = this.actions.onBlock || [];
      } else if (!results.passed) {
        actions = this.actions.onFail || [];
      } else {
        actions = this.actions.onPass || [];
      }
      
      actions.forEach(action => {
        try {
          if (typeof action === 'function') {
            action(results);
          }
        } catch (error) {
          ErrorHandler.handle(`QualityGate.executeActions.${this.name}`, error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.SYSTEM);
        }
      });
      
    } catch (error) {
      ErrorHandler.handle(`QualityGate.executeActions.${this.name}`, error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.SYSTEM);
    }
  }
}

/**
 * 代碼品質檢查器主類
 */
class CodeQualityChecker {
  constructor() {
    this.analyzer = new CodeAnalyzer();
    this.rules = new Map();
    this.gates = new Map();
    this.cache = globalCache;
    this.eventBus = globalEventBus;
    this.metricsCollector = globalMetricsCollector;
    this.assessmentHistory = [];
    this.maxHistorySize = 100;
    
    this.initializeDefaultRules();
    this.initializeDefaultGates();
    this.setupEventSubscriptions();
  }
  
  /**
   * 初始化預設規則
   */
  initializeDefaultRules() {
    // 複雜度規則
    this.registerRule(new QualityRule(
      'max_cyclomatic_complexity',
      '最大圈複雜度',
      QUALITY_DIMENSIONS.COMPLEXITY,
      QUALITY_SEVERITY.MAJOR,
      {
        description: '函數圈複雜度不應超過15',
        threshold: 15,
        checkFunction: (context) => {
          const analysis = this.analyzer.analyzeComplexity(context.content);
          if (analysis.cyclomaticComplexity > 15) {
            return [{
              type: 'complexity',
              message: `圈複雜度 ${analysis.cyclomaticComplexity} 超過建議值 15`,
              severity: QUALITY_SEVERITY.MAJOR,
              remediation: '考慮將複雜函數分解為多個較小的函數'
            }];
          }
          return [];
        }
      }
    ));
    
    // 函數長度規則
    this.registerRule(new QualityRule(
      'max_function_length',
      '最大函數長度',
      QUALITY_DIMENSIONS.MAINTAINABILITY,
      QUALITY_SEVERITY.MINOR,
      {
        description: '函數長度不應超過50行',
        threshold: 50,
        checkFunction: (context) => {
          const analysis = this.analyzer.analyzeComplexity(context.content);
          const issues = [];
          analysis.functionLength.forEach(func => {
            if (func.length > 50) {
              issues.push({
                type: 'function_length',
                line: func.startLine,
                message: `函數 ${func.name} 長度 ${func.length} 行，超過建議值 50 行`,
                severity: QUALITY_SEVERITY.MINOR,
                remediation: '考慮將長函數分解為多個較小的函數'
              });
            }
          });
          return issues;
        }
      }
    ));
    
    // 安全規則 - 禁用 eval
    this.registerRule(new QualityRule(
      'no_eval',
      '禁用 eval',
      QUALITY_DIMENSIONS.SECURITY,
      QUALITY_SEVERITY.BLOCKER,
      {
        description: '禁止使用 eval 函數',
        pattern: /eval\s*\(/,
        remediation: '使用安全的替代方案，如 JSON.parse 或函數映射'
      }
    ));
    
    // 性能規則 - 避免在循環中計算長度
    this.registerRule(new QualityRule(
      'efficient_loop',
      '高效循環',
      QUALITY_DIMENSIONS.PERFORMANCE,
      QUALITY_SEVERITY.MINOR,
      {
        description: '避免在循環條件中重複計算數組長度',
        pattern: /for\s*\([^)]*\.length[^)]*\)/,
        remediation: '將數組長度快取到變量中以提高性能'
      }
    ));
    
    // 最佳實踐規則 - console.log 檢查
    this.registerRule(new QualityRule(
      'no_console_log',
      '移除 console.log',
      QUALITY_DIMENSIONS.BEST_PRACTICES,
      QUALITY_SEVERITY.MINOR,
      {
        description: '生產代碼中不應包含 console.log',
        pattern: /console\.log\s*\(/,
        remediation: '使用適當的日誌記錄機制替代 console.log'
      }
    ));
    
    Logger.log('[CodeQualityChecker] 預設品質規則初始化完成');
  }
  
  /**
   * 初始化預設門禁
   */
  initializeDefaultGates() {
    // 開發環境門禁
    this.registerGate(new QualityGate('development', {
      minScore: 60,
      maxBlockerIssues: 0,
      maxCriticalIssues: 10,
      maxMajorIssues: 50,
      minDocCoverage: 30,
      maxComplexity: 20
    }));
    
    // 測試環境門禁
    this.registerGate(new QualityGate('staging', {
      minScore: 70,
      maxBlockerIssues: 0,
      maxCriticalIssues: 5,
      maxMajorIssues: 20,
      minDocCoverage: 50,
      maxComplexity: 15
    }));
    
    // 生產環境門禁
    this.registerGate(new QualityGate('production', {
      minScore: 80,
      maxBlockerIssues: 0,
      maxCriticalIssues: 0,
      maxMajorIssues: 5,
      minDocCoverage: 70,
      maxComplexity: 15,
      onBlock: [
        (result) => {
          Logger.log(`🚫 生產部署被阻斷: ${result.message}`);
          // 可以在這裡發送通知或記錄事件
        }
      ]
    }));
    
    Logger.log('[CodeQualityChecker] 預設品質門禁初始化完成');
  }
  
  /**
   * 設置事件訂閱
   */
  setupEventSubscriptions() {
    if (this.eventBus) {
      // 訂閱部署前事件
      this.eventBus.subscribe('deployment.pre_check', (event) => {
        try {
          const environment = event.data.environment;
          // 這裡可以觸發品質門禁檢查
          Logger.log(`[CodeQualityChecker] 收到部署前檢查事件: ${environment}`);
        } catch (error) {
          ErrorHandler.handle('CodeQualityChecker.deployment.pre_check', error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.SYSTEM);
        }
      });
      
      Logger.log('[CodeQualityChecker] 事件訂閱設置完成');
    }
  }
  
  /**
   * 註冊品質規則
   */
  registerRule(rule) {
    if (!(rule instanceof QualityRule)) {
      throw new Error('必須是 QualityRule 實例');
    }
    
    this.rules.set(rule.id, rule);
    Logger.log(`[CodeQualityChecker] 註冊品質規則: ${rule.name}`);
  }
  
  /**
   * 註冊品質門禁
   */
  registerGate(gate) {
    if (!(gate instanceof QualityGate)) {
      throw new Error('必須是 QualityGate 實例');
    }
    
    this.gates.set(gate.name, gate);
    Logger.log(`[CodeQualityChecker] 註冊品質門禁: ${gate.name}`);
  }
  
  /**
   * 執行品質檢查
   * @param {string} fileName 檔案名稱
   * @param {string} content 代碼內容
   * @param {Object} options 檢查選項
   * @return {Promise<QualityAssessment>} 品質評估結果
   */
  async checkQuality(fileName, content, options = {}) {
    const perfSession = startTimer('CodeQualityChecker.checkQuality', 'QUALITY_CHECK');
    
    try {
      Logger.log(`[CodeQualityChecker] 開始品質檢查: ${fileName}`);
      
      // 創建評估對象
      const assessment = new QualityAssessment(fileName, content);
      
      // 執行規則檢查
      await this.runRuleChecks(assessment, options);
      
      // 執行分析
      await this.runAnalysis(assessment, options);
      
      // 計算分數
      assessment.calculateScore();
      
      // 生成建議
      assessment.generateRecommendations();
      
      // 記錄指標
      this.recordQualityMetrics(assessment);
      
      // 添加到歷史記錄
      this.addToHistory(assessment);
      
      perfSession.end(true, `品質檢查完成: ${fileName}, 分數: ${assessment.score}`);
      
      Logger.log(`[CodeQualityChecker] 品質檢查完成: ${fileName}, 分數: ${assessment.score}, 等級: ${assessment.grade}`);
      
      return assessment;
      
    } catch (error) {
      perfSession.end(false, error.message);
      ErrorHandler.handle('CodeQualityChecker.checkQuality', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
      throw error;
    }
  }
  
  /**
   * 執行規則檢查
   */
  async runRuleChecks(assessment, options = {}) {
    const enabledRules = Array.from(this.rules.values()).filter(rule => rule.enabled);
    const rulesToRun = options.rules ? enabledRules.filter(rule => options.rules.includes(rule.id)) : enabledRules;
    
    const context = {
      fileName: assessment.fileName,
      content: assessment.content,
      options: options
    };
    
    for (const rule of rulesToRun) {
      try {
        const issues = rule.check(context);
        issues.forEach(issue => {
          assessment.addIssue({
            ...issue,
            ruleId: rule.id,
            ruleName: rule.name,
            dimension: rule.dimension
          });
        });
      } catch (error) {
        ErrorHandler.handle(`CodeQualityChecker.runRuleChecks.${rule.id}`, error, ERROR_LEVELS.WARNING, ERROR_CATEGORIES.SYSTEM);
      }
    }
  }
  
  /**
   * 執行分析
   */
  async runAnalysis(assessment, options = {}) {
    const content = assessment.content;
    const metrics = {};
    
    // 複雜度分析
    if (!options.skipComplexity) {
      metrics.complexity = this.analyzer.analyzeComplexity(content);
    }
    
    // 可維護性分析
    if (!options.skipMaintainability) {
      metrics.maintainability = this.analyzer.analyzeMaintainability(content);
    }
    
    // 安全性分析
    if (!options.skipSecurity) {
      metrics.security = this.analyzer.analyzeSecurity(content);
      
      // 將安全問題轉換為評估問題
      metrics.security.vulnerabilities.forEach(vuln => {
        assessment.addIssue({
          type: vuln.type,
          line: vuln.line,
          severity: vuln.severity,
          message: vuln.message,
          dimension: QUALITY_DIMENSIONS.SECURITY
        });
      });
    }
    
    // 性能分析
    if (!options.skipPerformance) {
      metrics.performance = this.analyzer.analyzePerformance(content);
      
      // 將性能問題轉換為評估問題
      metrics.performance.antiPatterns.forEach(pattern => {
        assessment.addIssue({
          type: pattern.type,
          line: pattern.line,
          severity: pattern.severity,
          message: pattern.message,
          dimension: QUALITY_DIMENSIONS.PERFORMANCE
        });
      });
    }
    
    assessment.setMetrics(metrics);
  }
  
  /**
   * 執行品質門禁
   * @param {QualityAssessment} assessment 品質評估結果
   * @param {string} gateName 門禁名稱
   * @return {Object} 門禁結果
   */
  runQualityGate(assessment, gateName) {
    const perfSession = startTimer('CodeQualityChecker.runQualityGate', 'QUALITY_GATE');
    
    try {
      const gate = this.gates.get(gateName);
      if (!gate) {
        throw new Error(`未找到品質門禁: ${gateName}`);
      }
      
      Logger.log(`[CodeQualityChecker] 執行品質門禁: ${gateName}`);
      
      const result = gate.evaluate(assessment);
      
      // 記錄門禁結果指標
      if (this.metricsCollector) {
        this.metricsCollector.recordMetric('quality_gate_result', result.passed ? 1 : 0, {
          gate: gateName,
          blocked: result.blocked ? 'true' : 'false',
          score: assessment.score.toString()
        });
      }
      
      // 發送事件
      if (this.eventBus) {
        this.eventBus.emit('quality.gate.completed', {
          gate: gateName,
          result: result,
          assessment: assessment.toJSON()
        });
      }
      
      perfSession.end(result.passed, `門禁 ${gateName}: ${result.message}`);
      
      Logger.log(`[CodeQualityChecker] 品質門禁 ${gateName} ${result.passed ? '通過' : '失敗'}: ${result.message}`);
      
      return result;
      
    } catch (error) {
      perfSession.end(false, error.message);
      ErrorHandler.handle('CodeQualityChecker.runQualityGate', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
      throw error;
    }
  }
  
  /**
   * 批量品質檢查
   * @param {Array} files 檔案列表 {fileName, content}
   * @param {Object} options 檢查選項
   * @return {Promise<Array>} 評估結果列表
   */
  async batchCheckQuality(files, options = {}) {
    const perfSession = startTimer('CodeQualityChecker.batchCheckQuality', 'BATCH_QUALITY_CHECK');
    
    try {
      Logger.log(`[CodeQualityChecker] 開始批量品質檢查: ${files.length} 個檔案`);
      
      const results = [];
      const batchSize = options.batchSize || 5;
      
      // 分批處理以避免超時
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchPromises = batch.map(file => 
          this.checkQuality(file.fileName, file.content, options)
            .catch(error => ({
              fileName: file.fileName,
              error: error.message,
              passed: false
            }))
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // 防止超時，在批次間稍作停頓
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // 生成批量摘要
      const summary = this.generateBatchSummary(results);
      
      perfSession.end(true, `批量檢查完成: ${results.length} 個檔案`);
      
      Logger.log(`[CodeQualityChecker] 批量品質檢查完成: ${results.length} 個檔案`);
      
      return {
        results: results,
        summary: summary
      };
      
    } catch (error) {
      perfSession.end(false, error.message);
      ErrorHandler.handle('CodeQualityChecker.batchCheckQuality', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
      throw error;
    }
  }
  
  /**
   * 生成批量摘要
   */
  generateBatchSummary(results) {
    const validResults = results.filter(r => r.score !== undefined);
    
    return {
      totalFiles: results.length,
      validResults: validResults.length,
      errorResults: results.length - validResults.length,
      averageScore: validResults.length > 0 ? 
        validResults.reduce((sum, r) => sum + r.score, 0) / validResults.length : 0,
      passedFiles: validResults.filter(r => r.passed).length,
      failedFiles: validResults.filter(r => !r.passed).length,
      blockedFiles: validResults.filter(r => r.blocker).length,
      criticalFiles: validResults.filter(r => r.critical).length,
      gradeDistribution: this.calculateGradeDistribution(validResults),
      recommendations: this.generateBatchRecommendations(validResults)
    };
  }
  
  /**
   * 計算等級分佈
   */
  calculateGradeDistribution(results) {
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    results.forEach(result => {
      if (result.grade) {
        distribution[result.grade]++;
      }
    });
    return distribution;
  }
  
  /**
   * 生成批量建議
   */
  generateBatchRecommendations(results) {
    const recommendations = [];
    
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    if (averageScore < 70) {
      recommendations.push('整體代碼品質需要改善，建議制定代碼品質改善計劃');
    }
    
    const blockedCount = results.filter(r => r.blocker).length;
    if (blockedCount > 0) {
      recommendations.push(`${blockedCount} 個檔案存在阻斷級問題，需要立即修復`);
    }
    
    const criticalCount = results.filter(r => r.critical).length;
    if (criticalCount > 0) {
      recommendations.push(`${criticalCount} 個檔案存在關鍵級問題，建議優先修復`);
    }
    
    return recommendations;
  }
  
  /**
   * 記錄品質指標
   */
  recordQualityMetrics(assessment) {
    if (!this.metricsCollector) {
      return;
    }
    
    // 記錄基本品質指標
    this.metricsCollector.recordMetric('code_quality_score', assessment.score, {
      fileName: assessment.fileName,
      grade: assessment.grade
    });
    
    this.metricsCollector.recordMetric('code_quality_issues_total', assessment.issues.length, {
      fileName: assessment.fileName
    });
    
    // 按嚴重性記錄問題數量
    Object.values(QUALITY_SEVERITY).forEach(severity => {
      const count = assessment.issues.filter(i => i.severity === severity).length;
      this.metricsCollector.recordMetric(`code_quality_${severity}_issues`, count, {
        fileName: assessment.fileName
      });
    });
    
    // 記錄複雜度指標
    if (assessment.metrics.complexity) {
      this.metricsCollector.recordMetric('code_complexity', assessment.metrics.complexity.cyclomaticComplexity, {
        fileName: assessment.fileName
      });
    }
    
    // 記錄文檔覆蓋率
    if (assessment.metrics.maintainability && assessment.metrics.maintainability.documentation) {
      this.metricsCollector.recordMetric('code_documentation_coverage', 
        assessment.metrics.maintainability.documentation.functionCoverage, {
        fileName: assessment.fileName
      });
    }
  }
  
  /**
   * 獲取品質統計
   */
  getQualityStats() {
    const recentAssessments = this.assessmentHistory.slice(-50); // 最近50次評估
    
    if (recentAssessments.length === 0) {
      return {
        totalAssessments: 0,
        averageScore: 0,
        passRate: 0,
        trends: {},
        recommendations: ['尚無品質檢查記錄']
      };
    }
    
    const totalScore = recentAssessments.reduce((sum, a) => sum + a.score, 0);
    const passedCount = recentAssessments.filter(a => a.passed).length;
    
    return {
      totalAssessments: recentAssessments.length,
      averageScore: (totalScore / recentAssessments.length).toFixed(2),
      passRate: ((passedCount / recentAssessments.length) * 100).toFixed(2),
      gradeDistribution: this.calculateGradeDistribution(recentAssessments),
      trends: this.calculateQualityTrends(recentAssessments),
      commonIssues: this.getCommonIssues(recentAssessments),
      recommendations: this.generateStatsRecommendations(recentAssessments)
    };
  }
  
  /**
   * 計算品質趨勢
   */
  calculateQualityTrends(assessments) {
    if (assessments.length < 10) {
      return { trend: 'insufficient_data' };
    }
    
    const recent = assessments.slice(-10);
    const earlier = assessments.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, a) => sum + a.score, 0) / recent.length;
    const earlierAvg = earlier.length > 0 ? 
      earlier.reduce((sum, a) => sum + a.score, 0) / earlier.length : recentAvg;
    
    const change = recentAvg - earlierAvg;
    
    return {
      trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
      change: change.toFixed(2),
      recentAverage: recentAvg.toFixed(2),
      earlierAverage: earlierAvg.toFixed(2)
    };
  }
  
  /**
   * 獲取常見問題
   */
  getCommonIssues(assessments) {
    const issueTypes = {};
    
    assessments.forEach(assessment => {
      assessment.issues.forEach(issue => {
        const type = issue.type || issue.ruleId || 'unknown';
        if (!issueTypes[type]) {
          issueTypes[type] = {
            count: 0,
            severity: issue.severity,
            message: issue.message
          };
        }
        issueTypes[type].count++;
      });
    });
    
    return Object.entries(issueTypes)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 10)
      .map(([type, data]) => ({
        type: type,
        count: data.count,
        severity: data.severity,
        message: data.message
      }));
  }
  
  /**
   * 生成統計建議
   */
  generateStatsRecommendations(assessments) {
    const recommendations = [];
    const averageScore = assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length;
    
    if (averageScore < 70) {
      recommendations.push('整體代碼品質偏低，建議加強代碼審查和重構');
    }
    
    const blockerRate = assessments.filter(a => a.blocker).length / assessments.length;
    if (blockerRate > 0.1) {
      recommendations.push('阻斷級問題出現頻率較高，建議改善開發流程');
    }
    
    const trends = this.calculateQualityTrends(assessments);
    if (trends.trend === 'declining') {
      recommendations.push('代碼品質呈下降趨勢，需要立即關注並採取改善措施');
    }
    
    return recommendations.length > 0 ? recommendations : ['代碼品質狀況良好，繼續保持'];
  }
  
  /**
   * 添加到歷史記錄
   */
  addToHistory(assessment) {
    this.assessmentHistory.push(assessment);
    
    // 維護歷史大小
    if (this.assessmentHistory.length > this.maxHistorySize) {
      this.assessmentHistory.splice(0, this.assessmentHistory.length - this.maxHistorySize);
    }
  }
  
  /**
   * 獲取規則列表
   */
  getRules() {
    return Array.from(this.rules.values()).map(rule => rule.toJSON());
  }
  
  /**
   * 獲取門禁列表
   */
  getGates() {
    return Array.from(this.gates.values()).map(gate => ({
      name: gate.name,
      enabled: gate.enabled,
      thresholds: gate.thresholds
    }));
  }
}

/**
 * 全域代碼品質檢查器實例
 */
const globalCodeQualityChecker = new CodeQualityChecker();

/**
 * 便利函數 - 執行品質檢查
 */
async function checkCodeQuality(fileName, content, options = {}) {
  return await globalCodeQualityChecker.checkQuality(fileName, content, options);
}

/**
 * 便利函數 - 執行品質門禁
 */
function runQualityGate(assessment, gateName) {
  return globalCodeQualityChecker.runQualityGate(assessment, gateName);
}

/**
 * 便利函數 - 批量品質檢查
 */
async function batchCheckCodeQuality(files, options = {}) {
  return await globalCodeQualityChecker.batchCheckQuality(files, options);
}

/**
 * 便利函數 - 獲取品質統計
 */
function getCodeQualityStats() {
  return globalCodeQualityChecker.getQualityStats();
}

/**
 * 整合到 CI/CD 管線的品質檢查
 * 與 DeploymentManager 整合使用
 */
async function runCiCdQualityCheck(environment, files) {
  try {
    Logger.log(`[CodeQualityChecker] 開始 CI/CD 品質檢查: ${environment}`);
    
    // 執行批量品質檢查
    const batchResult = await batchCheckCodeQuality(files, {
      batchSize: 3, // 小批次避免超時
      skipComplexity: false,
      skipSecurity: false
    });
    
    // 計算整體評估
    const overallAssessment = new QualityAssessment('batch_assessment', '');
    overallAssessment.score = batchResult.summary.averageScore;
    overallAssessment.passed = batchResult.summary.passedFiles === batchResult.summary.totalFiles;
    overallAssessment.blocker = batchResult.summary.blockedFiles > 0;
    overallAssessment.critical = batchResult.summary.criticalFiles > 0;
    
    // 執行對應環境的品質門禁
    const gateResult = runQualityGate(overallAssessment, environment);
    
    // 記錄結果
    if (globalMetricsCollector) {
      globalMetricsCollector.recordMetric('cicd_quality_check', gateResult.passed ? 1 : 0, {
        environment: environment,
        filesChecked: files.length.toString(),
        averageScore: batchResult.summary.averageScore.toString()
      });
    }
    
    Logger.log(`[CodeQualityChecker] CI/CD 品質檢查完成: ${environment}, 結果: ${gateResult.passed ? '通過' : '失敗'}`);
    
    return {
      passed: gateResult.passed,
      blocked: gateResult.blocked,
      batchResult: batchResult,
      gateResult: gateResult,
      summary: {
        environment: environment,
        filesChecked: files.length,
        averageScore: batchResult.summary.averageScore,
        passRate: (batchResult.summary.passedFiles / batchResult.summary.totalFiles * 100).toFixed(2)
      }
    };
    
  } catch (error) {
    ErrorHandler.handle('runCiCdQualityCheck', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.SYSTEM);
    
    return {
      passed: false,
      blocked: true,
      error: error.message,
      summary: {
        environment: environment,
        filesChecked: files.length,
        errorMessage: error.message
      }
    };
  }
}