/**
 * LT Priority Logic Test Runner
 * Tests the updated LT (Local Teacher) priority system for class dropdown options
 */

/**
 * Test LT Priority Logic
 * Checks if teachers shown in class options match the LT field from master list
 * and if priority system works: master_list source (LT field) > teacher_book source
 */
function testLTPriorityLogic() {
  console.log('🎯 開始測試 LT 優先級邏輯');
  
  const testResult = {
    testName: 'LT 優先級邏輯測試',
    startTime: new Date(),
    endTime: null,
    duration: 0,
    success: false,
    details: {
      functionsExist: false,
      masterListClasses: [],
      teacherBookClasses: [],
      consolidatedClasses: [],
      ltPriorityExamples: [],
      teacherChanges: [],
      priorityWorking: false
    },
    issues: [],
    recommendations: []
  };
  
  try {
    // 檢查函數存在性
    console.log('🔍 步驟1: 檢查必要函數');
    const requiredFunctions = [
      'getClassesFromMasterList',
      'getClassesFromTeacherBooks', 
      'consolidateClassData',
      'getAllAvailableClasses'
    ];
    
    let missingFunctions = [];
    requiredFunctions.forEach(funcName => {
      if (typeof eval(funcName) !== 'function') {
        missingFunctions.push(funcName);
      }
    });
    
    if (missingFunctions.length > 0) {
      testResult.issues.push(`缺少函數: ${missingFunctions.join(', ')}`);
      console.log(`❌ 缺少必要函數: ${missingFunctions.join(', ')}`);
      return testResult;
    }
    
    testResult.details.functionsExist = true;
    console.log('✅ 所有必要函數都存在');
    
    // 步驟2: 分別獲取學生總表和老師記錄簿的班級資料
    console.log('🔍 步驟2: 獲取不同來源的班級資料');
    
    try {
      testResult.details.masterListClasses = getClassesFromMasterList();
      console.log(`📊 學生總表班級數: ${testResult.details.masterListClasses.length}`);
      
      // 顯示學生總表中的LT資料樣本
      if (testResult.details.masterListClasses.length > 0) {
        console.log('📋 學生總表班級樣本 (LT 資料):');
        testResult.details.masterListClasses.slice(0, 3).forEach((cls, index) => {
          console.log(`  ${index + 1}. ${cls.className} - LT: ${cls.teacher} (${cls.studentCount}人)`);
        });
      }
    } catch (error) {
      testResult.issues.push(`獲取學生總表資料失敗: ${error.message}`);
      console.log(`❌ 獲取學生總表資料失敗: ${error.message}`);
    }
    
    try {
      testResult.details.teacherBookClasses = getClassesFromTeacherBooks();
      console.log(`📊 老師記錄簿班級數: ${testResult.details.teacherBookClasses.length}`);
      
      // 顯示老師記錄簿資料樣本
      if (testResult.details.teacherBookClasses.length > 0) {
        console.log('📋 老師記錄簿班級樣本:');
        testResult.details.teacherBookClasses.slice(0, 3).forEach((cls, index) => {
          console.log(`  ${index + 1}. ${cls.className} - Teacher: ${cls.teacher} (${cls.studentCount}人)`);
        });
      }
    } catch (error) {
      testResult.issues.push(`獲取老師記錄簿資料失敗: ${error.message}`);
      console.log(`❌ 獲取老師記錄簿資料失敗: ${error.message}`);
    }
    
    // 步驟3: 測試合併邏輯和LT優先級
    console.log('🔍 步驟3: 測試 LT 優先級合併邏輯');
    
    const allClasses = getAllAvailableClasses();
    testResult.details.consolidatedClasses = allClasses;
    
    if (allClasses && allClasses.length > 0) {
      console.log(`📊 合併後班級數: ${allClasses.length}`);
      
      // 尋找同時存在於學生總表和老師記錄簿的班級，檢查LT優先級
      console.log('🔍 步驟4: 檢查 LT 優先級實施');
      
      const masterListMap = new Map();
      testResult.details.masterListClasses.forEach(cls => {
        masterListMap.set(cls.className, cls.teacher);
      });
      
      const teacherBookMap = new Map();
      testResult.details.teacherBookClasses.forEach(cls => {
        teacherBookMap.set(cls.className, cls.teacher);
      });
      
      let ltPriorityCount = 0;
      let totalOverlapCount = 0;
      
      allClasses.forEach(cls => {
        const masterListTeacher = masterListMap.get(cls.className);
        const teacherBookTeacher = teacherBookMap.get(cls.className);
        
        // 如果同時存在於兩個來源
        if (masterListTeacher && teacherBookTeacher && masterListTeacher !== teacherBookTeacher) {
          totalOverlapCount++;
          
          // 檢查是否使用了學生總表的LT老師
          if (cls.teacher === masterListTeacher) {
            ltPriorityCount++;
            testResult.details.ltPriorityExamples.push({
              className: cls.className,
              selectedTeacher: cls.teacher,
              masterListTeacher: masterListTeacher,
              teacherBookTeacher: teacherBookTeacher,
              ltPriorityApplied: true
            });
          } else {
            testResult.details.ltPriorityExamples.push({
              className: cls.className,
              selectedTeacher: cls.teacher,
              masterListTeacher: masterListTeacher,
              teacherBookTeacher: teacherBookTeacher,
              ltPriorityApplied: false
            });
          }
        }
      });
      
      if (totalOverlapCount > 0) {
        const prioritySuccessRate = (ltPriorityCount / totalOverlapCount) * 100;
        testResult.details.priorityWorking = prioritySuccessRate === 100;
        
        console.log(`📊 重疊班級數: ${totalOverlapCount}`);
        console.log(`📊 LT 優先級成功率: ${prioritySuccessRate.toFixed(1)}% (${ltPriorityCount}/${totalOverlapCount})`);
        
        if (testResult.details.priorityWorking) {
          console.log('✅ LT 優先級邏輯完全正常工作');
        } else {
          console.log('⚠️ LT 優先級邏輯部分失效');
          testResult.issues.push(`LT 優先級失效，成功率只有 ${prioritySuccessRate.toFixed(1)}%`);
        }
        
        // 顯示LT優先級示例
        console.log('📋 LT 優先級示例:');
        testResult.details.ltPriorityExamples.slice(0, 5).forEach((example, index) => {
          const status = example.ltPriorityApplied ? '✅' : '❌';
          console.log(`  ${index + 1}. ${status} ${example.className}: 選擇 "${example.selectedTeacher}" (LT: "${example.masterListTeacher}", 記錄簿: "${example.teacherBookTeacher}")`);
        });
      } else {
        console.log('⚠️ 沒有發現重疊班級，無法測試LT優先級');
        testResult.issues.push('沒有同時存在於兩個來源的班級');
      }
      
    } else {
      testResult.issues.push('getAllAvailableClasses() 返回空結果');
      console.log('❌ getAllAvailableClasses() 返回空結果');
    }
    
    // 判斷測試成功條件
    testResult.success = (
      testResult.details.functionsExist &&
      testResult.details.consolidatedClasses.length > 0 &&
      (testResult.details.priorityWorking || testResult.details.ltPriorityExamples.length === 0)
    );
    
    // 生成建議
    if (testResult.success) {
      testResult.recommendations.push('✅ LT 優先級邏輯正常工作');
      testResult.recommendations.push('💡 班級下拉選項現在會優先顯示學生總表的 LT 老師');
    } else {
      if (!testResult.details.priorityWorking) {
        testResult.recommendations.push('🔧 檢查 consolidateClassData() 函數中的 LT 優先級邏輯');
      }
      if (testResult.details.consolidatedClasses.length === 0) {
        testResult.recommendations.push('📋 檢查學生總表和老師記錄簿是否包含資料');
      }
    }
    
  } catch (error) {
    testResult.issues.push(`測試執行錯誤: ${error.message}`);
    console.log(`❌ LT 優先級測試執行錯誤: ${error.message}`);
  }
  
  testResult.endTime = new Date();
  testResult.duration = (testResult.endTime - testResult.startTime) / 1000;
  
  // 輸出測試報告
  console.log('');
  console.log('=== LT 優先級邏輯測試報告 ===');
  console.log(`測試時間: ${testResult.duration.toFixed(2)}秒`);
  console.log(`測試結果: ${testResult.success ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`學生總表班級數: ${testResult.details.masterListClasses.length}`);
  console.log(`老師記錄簿班級數: ${testResult.details.teacherBookClasses.length}`);
  console.log(`合併後班級數: ${testResult.details.consolidatedClasses.length}`);
  console.log(`LT 優先級示例數: ${testResult.details.ltPriorityExamples.length}`);
  console.log(`優先級系統: ${testResult.details.priorityWorking ? '✅ 正常' : '❌ 異常'}`);
  
  if (testResult.issues.length > 0) {
    console.log('');
    console.log('⚠️ 發現問題:');
    testResult.issues.forEach(issue => console.log(`  • ${issue}`));
  }
  
  console.log('');
  console.log('💡 建議:');
  testResult.recommendations.forEach(rec => console.log(`  • ${rec}`));
  
  console.log('');
  console.log('=== 測試完成 ===');
  
  return testResult;
}

/**
 * Compare teacher assignments before and after LT priority implementation
 */
function compareTeacherAssignments() {
  console.log('🔄 比較 LT 優先級實施前後的老師分配');
  
  try {
    const allClasses = getAllAvailableClasses();
    
    if (!allClasses || allClasses.length === 0) {
      console.log('❌ 無法獲取班級資料');
      return [];
    }
    
    console.log('📊 當前老師分配狀況:');
    console.log(`總班級數: ${allClasses.length}`);
    
    // 分析老師分配來源
    const sourceAnalysis = {
      master_list: 0,
      teacher_book: 0,
      mixed: 0,
      unknown: 0
    };
    
    const teacherAssignments = [];
    
    allClasses.forEach(cls => {
      const assignment = {
        className: cls.className,
        teacher: cls.teacher,
        studentCount: cls.studentCount,
        source: cls.source || 'unknown'
      };
      
      teacherAssignments.push(assignment);
      sourceAnalysis[assignment.source] = (sourceAnalysis[assignment.source] || 0) + 1;
    });
    
    console.log('📋 來源分析:');
    console.log(`  學生總表來源: ${sourceAnalysis.master_list} 個班級`);
    console.log(`  老師記錄簿來源: ${sourceAnalysis.teacher_book} 個班級`);
    console.log(`  混合來源: ${sourceAnalysis.mixed} 個班級`);
    console.log(`  未知來源: ${sourceAnalysis.unknown} 個班級`);
    
    console.log('');
    console.log('📋 前10個班級的老師分配:');
    teacherAssignments.slice(0, 10).forEach((assignment, index) => {
      console.log(`  ${index + 1}. ${assignment.className} - ${assignment.teacher} (${assignment.studentCount}人, 來源: ${assignment.source})`);
    });
    
    return teacherAssignments;
    
  } catch (error) {
    console.log(`❌ 比較老師分配失敗: ${error.message}`);
    return [];
  }
}

/**
 * Run comprehensive LT priority test
 */
function runComprehensiveLTTest() {
  console.log('🚀 執行完整的 LT 優先級測試');
  
  const startTime = new Date();
  
  try {
    // 執行原有的班級合併測試
    console.log('');
    console.log('=== 第1步: 原有班級合併測試 ===');
    const classConsolidationResult = testClassConsolidation();
    
    // 執行LT優先級專項測試
    console.log('');
    console.log('=== 第2步: LT 優先級專項測試 ===');
    const ltPriorityResult = testLTPriorityLogic();
    
    // 比較老師分配
    console.log('');
    console.log('=== 第3步: 老師分配比較 ===');
    const teacherAssignments = compareTeacherAssignments();
    
    const endTime = new Date();
    const totalDuration = (endTime - startTime) / 1000;
    
    console.log('');
    console.log('=== 完整 LT 優先級測試完成 ===');
    console.log(`總耗時: ${totalDuration.toFixed(2)}秒`);
    console.log(`班級合併功能: ${classConsolidationResult.success ? '✅ 正常' : '❌ 異常'}`);
    console.log(`LT 優先級邏輯: ${ltPriorityResult.success ? '✅ 正常' : '❌ 異常'}`);
    console.log(`老師分配數量: ${teacherAssignments.length} 個班級`);
    
    // 返回綜合結果
    return {
      duration: totalDuration,
      classConsolidationResult: classConsolidationResult,
      ltPriorityResult: ltPriorityResult,
      teacherAssignments: teacherAssignments,
      success: classConsolidationResult.success && ltPriorityResult.success
    };
    
  } catch (error) {
    console.log('❌ 完整測試執行失敗: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}