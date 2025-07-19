/**
 * 學生總表建置完整性檢查器
 * 確認學生總表中每一筆學生資料是否都成功建置到對應的老師記錄簿
 * 
 * 回應用戶需求：檢查「學生總表」中的所有測試資料建置狀況
 */

/**
 * 執行完整的學生總表建置完整性檢查
 * 這是主要的檢查函數，用戶可直接執行此函數
 */
function runMasterListIntegrityCheck() {
  Logger.log('🚀 開始執行學生總表建置完整性檢查...');
  Logger.log('═'.repeat(60));
  
  const checkResults = {
    success: true,
    totalStudents: 0,
    validStudents: 0,
    missingStudents: [],
    inconsistentStudents: [],
    errors: [],
    detailedAnalysis: {
      masterListAnalysis: null,
      teacherBooksAnalysis: null,
      coverageAnalysis: null,
      consistencyAnalysis: null
    }
  };
  
  try {
    // Phase 1: 基礎資料驗證
    Logger.log('\n📋 Phase 1：基礎資料驗證');
    Logger.log('-'.repeat(40));
    
    const basicValidation = performBasicValidation();
    checkResults.detailedAnalysis.masterListAnalysis = basicValidation;
    
    if (!basicValidation.success) {
      checkResults.success = false;
      checkResults.errors.push(...basicValidation.errors);
      Logger.log('❌ 基礎驗證失敗，停止後續檢查');
      return generateIntegrityReport(checkResults);
    }
    
    Logger.log('✅ 基礎驗證通過');
    
    // Phase 2: 學生覆蓋率分析
    Logger.log('\n📋 Phase 2：學生覆蓋率分析');
    Logger.log('-'.repeat(40));
    
    const coverageAnalysis = performStudentCoverageAnalysis();
    checkResults.detailedAnalysis.coverageAnalysis = coverageAnalysis;
    checkResults.totalStudents = coverageAnalysis.masterListStudents.length;
    
    // Phase 3: 逐一檢查每位學生
    Logger.log('\n📋 Phase 3：逐一檢查每位學生');
    Logger.log('-'.repeat(40));
    
    const studentAnalysis = performIndividualStudentAnalysis(coverageAnalysis.masterListStudents);
    checkResults.validStudents = studentAnalysis.validStudents;
    checkResults.missingStudents = studentAnalysis.missingStudents;
    checkResults.inconsistentStudents = studentAnalysis.inconsistentStudents;
    
    if (checkResults.missingStudents.length > 0 || checkResults.inconsistentStudents.length > 0) {
      checkResults.success = false;
    }
    
    // Phase 4: 特別檢查T01學生
    Logger.log('\n📋 Phase 4：特別檢查T01學生');
    Logger.log('-'.repeat(40));
    
    const t01Analysis = performT01SpecialCheck();
    checkResults.detailedAnalysis.t01Analysis = t01Analysis;
    
    if (!t01Analysis.success) {
      checkResults.success = false;
      checkResults.errors.push('T01學生檢查發現問題');
    }
    
    // 生成報告
    return generateIntegrityReport(checkResults);
    
  } catch (error) {
    Logger.log(`❌ 完整性檢查過程發生錯誤：${error.message}`);
    checkResults.success = false;
    checkResults.errors.push(`檢查過程錯誤：${error.message}`);
    return generateIntegrityReport(checkResults);
  }
}

/**
 * 執行基礎驗證
 */
function performBasicValidation() {
  Logger.log('🔍 執行基礎資料驗證...');
  
  const validation = {
    success: true,
    errors: [],
    systemConfigCheck: null,
    masterListAccessCheck: null
  };
  
  try {
    // 檢查系統配置
    Logger.log('📋 檢查系統配置...');
    if (!SYSTEM_CONFIG || !SYSTEM_CONFIG.STUDENT_MASTER_LIST_ID) {
      validation.success = false;
      validation.errors.push('系統配置缺失：STUDENT_MASTER_LIST_ID');
    } else {
      validation.systemConfigCheck = '✅ 系統配置正常';
      Logger.log('✅ 系統配置檢查通過');
    }
    
    // 檢查學生總表訪問權限
    Logger.log('📋 檢查學生總表訪問權限...');
    try {
      const masterSpreadsheet = SpreadsheetApp.openById(SYSTEM_CONFIG.STUDENT_MASTER_LIST_ID);
      const masterSheet = masterSpreadsheet.getActiveSheet();
      const testData = masterSheet.getRange(1, 1, 2, 1).getValues();
      
      if (testData.length >= 1) {
        validation.masterListAccessCheck = '✅ 學生總表訪問正常';
        Logger.log('✅ 學生總表訪問檢查通過');
      } else {
        validation.success = false;
        validation.errors.push('學生總表為空');
      }
    } catch (error) {
      validation.success = false;
      validation.errors.push(`學生總表訪問失敗：${error.message}`);
    }
    
    return validation;
    
  } catch (error) {
    validation.success = false;
    validation.errors.push(`基礎驗證過程錯誤：${error.message}`);
    return validation;
  }
}

/**
 * 執行學生覆蓋率分析
 */
function performStudentCoverageAnalysis() {
  Logger.log('🔍 執行學生覆蓋率分析...');
  
  const analysis = {
    masterListStudents: [],
    teacherBooksStudents: [],
    totalTeacherBooks: 0,
    masterListCount: 0,
    teacherBooksCount: 0
  };
  
  try {
    // 從學生總表獲取所有學生
    Logger.log('📋 讀取學生總表...');
    const masterSpreadsheet = SpreadsheetApp.openById(SYSTEM_CONFIG.STUDENT_MASTER_LIST_ID);
    const masterSheet = masterSpreadsheet.getActiveSheet();
    const masterData = masterSheet.getDataRange().getValues();
    
    if (masterData.length > 1) {
      const headers = masterData[0];
      const idIndex = headers.findIndex(h => h && (h.toString().toLowerCase().includes('id') || h.toString() === 'ID'));
      const nameIndex = headers.findIndex(h => h && (h.toString().includes('中文') || h.toString().includes('姓名') || h.toString().includes('Chinese')));
      const teacherIndex = headers.findIndex(h => h && (h.toString().includes('LT') || h.toString().includes('Teacher') || h.toString().includes('老師')));
      
      for (let i = 1; i < masterData.length; i++) {
        const row = masterData[i];
        if (row[idIndex] && row[idIndex].toString().trim()) {
          analysis.masterListStudents.push({
            id: row[idIndex].toString().trim(),
            name: nameIndex >= 0 ? (row[nameIndex] || '') : '',
            teacher: teacherIndex >= 0 ? (row[teacherIndex] || '') : '',
            rowIndex: i + 1,
            sourceData: row
          });
        }
      }
      
      analysis.masterListCount = analysis.masterListStudents.length;
      Logger.log(`✅ 學生總表讀取完成：找到 ${analysis.masterListCount} 位學生`);
    }
    
    // 從所有老師記錄簿獲取學生清單
    Logger.log('📋 掃描所有老師記錄簿...');
    const teacherBooks = getAllTeacherBooks();
    analysis.totalTeacherBooks = teacherBooks.length;
    
    const teacherStudentsSet = new Set();
    
    teacherBooks.forEach((book, index) => {
      try {
        const bookName = book.getName();
        Logger.log(`   掃描第 ${index + 1}/${teacherBooks.length} 本：${bookName}`);
        
        const studentSheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
        if (studentSheet && studentSheet.getLastRow() > 1) {
          const studentData = studentSheet.getDataRange().getValues();
          const headers = studentData[0];
          const idIndex = headers.findIndex(h => h && (h.toString().toLowerCase().includes('id') || h.toString() === 'ID'));
          
          if (idIndex >= 0) {
            for (let i = 1; i < studentData.length; i++) {
              const studentId = studentData[i][idIndex];
              if (studentId && studentId.toString().trim()) {
                const id = studentId.toString().trim();
                teacherStudentsSet.add(id);
                analysis.teacherBooksStudents.push({
                  id: id,
                  teacherBook: bookName,
                  rowIndex: i + 1,
                  sourceData: studentData[i]
                });
              }
            }
          }
        }
      } catch (error) {
        Logger.log(`⚠️ 掃描老師記錄簿失敗：${book.getName()} - ${error.message}`);
      }
    });
    
    analysis.teacherBooksCount = teacherStudentsSet.size;
    Logger.log(`✅ 老師記錄簿掃描完成：找到 ${analysis.teacherBooksCount} 位學生（在 ${analysis.totalTeacherBooks} 本記錄簿中）`);
    
    return analysis;
    
  } catch (error) {
    Logger.log(`❌ 學生覆蓋率分析失敗：${error.message}`);
    return analysis;
  }
}

/**
 * 執行逐一學生分析
 */
function performIndividualStudentAnalysis(masterListStudents) {
  Logger.log('🔍 執行逐一學生分析...');
  
  const analysis = {
    validStudents: 0,
    missingStudents: [],
    inconsistentStudents: []
  };
  
  try {
    masterListStudents.forEach((student, index) => {
      Logger.log(`   檢查第 ${index + 1}/${masterListStudents.length} 位學生：${student.id} (${student.name})`);
      
      // 使用現有的驗證函數
      const validation = validateStudentDataIntegrity(student.id);
      
      if (validation.issues && validation.issues.length > 0) {
        const criticalIssues = validation.issues.filter(issue => issue.severity === 'critical');
        const warningIssues = validation.issues.filter(issue => issue.severity === 'warning');
        
        if (criticalIssues.length > 0) {
          // 有嚴重問題，視為遺漏學生
          analysis.missingStudents.push({
            student: student,
            issues: criticalIssues,
            type: 'missing'
          });
        } else if (warningIssues.length > 0) {
          // 有警告問題，視為資料不一致
          analysis.inconsistentStudents.push({
            student: student,
            issues: warningIssues,
            type: 'inconsistent'
          });
        } else {
          analysis.validStudents++;
        }
      } else {
        analysis.validStudents++;
      }
    });
    
    Logger.log(`✅ 學生分析完成：有效 ${analysis.validStudents}，遺漏 ${analysis.missingStudents.length}，不一致 ${analysis.inconsistentStudents.length}`);
    return analysis;
    
  } catch (error) {
    Logger.log(`❌ 學生分析失敗：${error.message}`);
    return analysis;
  }
}

/**
 * 執行T01學生特別檢查
 */
function performT01SpecialCheck() {
  Logger.log('🔍 執行T01學生特別檢查...');
  
  try {
    const t01Status = detectT01StudentStatus();
    
    if (t01Status.success) {
      Logger.log('✅ T01學生檢查通過');
      return {
        success: true,
        message: 'T01學生狀態正常',
        details: t01Status
      };
    } else {
      Logger.log('❌ T01學生檢查發現問題');
      return {
        success: false,
        message: 'T01學生存在問題',
        details: t01Status
      };
    }
    
  } catch (error) {
    Logger.log(`❌ T01學生檢查失敗：${error.message}`);
    return {
      success: false,
      message: `T01檢查錯誤：${error.message}`,
      details: null
    };
  }
}

/**
 * 生成完整性報告
 */
function generateIntegrityReport(checkResults) {
  Logger.log('\n📊 學生總表建置完整性檢查報告');
  Logger.log('═'.repeat(60));
  
  // 總覽統計
  Logger.log(`📈 檢查總覽：`);
  Logger.log(`   學生總表中的學生總數：${checkResults.totalStudents}`);
  Logger.log(`   成功建置的學生數量：${checkResults.validStudents}`);
  Logger.log(`   遺漏的學生數量：${checkResults.missingStudents.length}`);
  Logger.log(`   資料不一致的學生數量：${checkResults.inconsistentStudents.length}`);
  
  const completionRate = checkResults.totalStudents > 0 ? 
    Math.round((checkResults.validStudents / checkResults.totalStudents) * 100) : 0;
  Logger.log(`   建置完成率：${completionRate}%`);
  
  // 整體結果
  if (checkResults.success) {
    Logger.log('\n🎉 建置完整性檢查：通過');
    Logger.log('💡 所有學生都已成功建置到對應的老師記錄簿');
  } else {
    Logger.log('\n⚠️ 建置完整性檢查：發現問題');
    Logger.log('💡 部分學生未正確建置或存在資料不一致');
  }
  
  // 遺漏學生詳細資訊
  if (checkResults.missingStudents.length > 0) {
    Logger.log('\n❌ 遺漏學生清單：');
    Logger.log('-'.repeat(40));
    
    checkResults.missingStudents.forEach((missing, index) => {
      Logger.log(`${index + 1}. 學生ID：${missing.student.id}`);
      Logger.log(`   姓名：${missing.student.name}`);
      Logger.log(`   指定老師：${missing.student.teacher}`);
      Logger.log(`   問題：${missing.issues.map(i => i.message).join('; ')}`);
      Logger.log('');
    });
  }
  
  // 資料不一致學生詳細資訊
  if (checkResults.inconsistentStudents.length > 0) {
    Logger.log('\n⚠️ 資料不一致學生清單：');
    Logger.log('-'.repeat(40));
    
    checkResults.inconsistentStudents.forEach((inconsistent, index) => {
      Logger.log(`${index + 1}. 學生ID：${inconsistent.student.id}`);
      Logger.log(`   姓名：${inconsistent.student.name}`);
      Logger.log(`   警告：${inconsistent.issues.map(i => i.message).join('; ')}`);
      Logger.log('');
    });
  }
  
  // 修復建議
  Logger.log('\n💡 修復建議：');
  Logger.log('-'.repeat(40));
  
  if (checkResults.success) {
    Logger.log('• 系統狀態良好，無需修復操作');
    Logger.log('• 建議定期執行此檢查以維持資料完整性');
  } else {
    if (checkResults.missingStudents.length > 0) {
      Logger.log('• 針對遺漏學生，執行以下操作：');
      Logger.log('  1. 檢查學生總表中的老師欄位（LT）是否正確填寫');
      Logger.log('  2. 重新執行學生資料匯入程序');
      Logger.log('  3. 使用 repairMissingT01Students() 修復T01學生（如適用）');
    }
    
    if (checkResults.inconsistentStudents.length > 0) {
      Logger.log('• 針對資料不一致學生，執行以下操作：');
      Logger.log('  1. 使用資料同步功能更新記錄簿中的學生資訊');
      Logger.log('  2. 檢查並修復姓名、班級等關鍵欄位的不一致');
    }
    
    if (checkResults.errors.length > 0) {
      Logger.log('• 解決以下系統錯誤：');
      checkResults.errors.forEach((error, index) => {
        Logger.log(`  ${index + 1}. ${error}`);
      });
    }
  }
  
  // 檢查時間
  Logger.log(`\n⏰ 檢查完成時間：${new Date().toLocaleString()}`);
  Logger.log('═'.repeat(60));
  
  return checkResults;
}

/**
 * 快速檢查 - 僅檢查關鍵指標
 */
function quickMasterListIntegrityCheck() {
  Logger.log('⚡ 執行快速建置完整性檢查...');
  
  try {
    // 快速統計
    const allStudentIds = getAllStudentIds();
    const totalStudents = allStudentIds.length;
    
    // 檢查T01學生
    const t01Status = detectT01StudentStatus();
    
    // 簡單抽樣檢查
    const sampleSize = Math.min(5, totalStudents);
    let validSamples = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      const studentId = allStudentIds[i];
      const validation = validateStudentDataIntegrity(studentId);
      if (!validation.issues || validation.issues.filter(issue => issue.severity === 'critical').length === 0) {
        validSamples++;
      }
    }
    
    const estimatedCompletionRate = Math.round((validSamples / sampleSize) * 100);
    
    Logger.log(`📊 快速檢查結果：`);
    Logger.log(`   學生總數：${totalStudents}`);
    Logger.log(`   T01學生狀態：${t01Status.success ? '正常' : '異常'}`);
    Logger.log(`   抽樣檢查完成率：${estimatedCompletionRate}% (${validSamples}/${sampleSize})`);
    
    if (t01Status.success && estimatedCompletionRate >= 80) {
      Logger.log('✅ 快速檢查：系統狀態良好');
    } else {
      Logger.log('⚠️ 快速檢查：建議執行完整檢查');
    }
    
    return {
      totalStudents: totalStudents,
      t01Status: t01Status.success,
      estimatedCompletionRate: estimatedCompletionRate,
      recommendation: estimatedCompletionRate >= 80 && t01Status.success ? 'good' : 'needs_full_check'
    };
    
  } catch (error) {
    Logger.log(`❌ 快速檢查失敗：${error.message}`);
    return {
      error: error.message,
      recommendation: 'error'
    };
  }
}