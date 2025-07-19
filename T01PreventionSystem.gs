/**
 * T01 學生遺漏預防系統
 * 在初始化流程的關鍵節點添加預防性驗證，確保 T01 學生不會遺漏
 * 
 * Phase 3: 預防性驗證實現
 */

/**
 * 增強版的 extractTeachersFromMasterList 函數
 * 添加 T01 學生特別檢查和預防機制
 */
function extractTeachersFromMasterListWithT01Prevention(masterData) {
  Logger.log(`🔍 開始從學生總表提取老師資訊（T01 預防版本）...`);
  
  // Step 1: 首先檢查 T01 學生是否存在
  const t01PreCheck = verifyT01StudentInMasterData(masterData);
  if (!t01PreCheck.exists) {
    throw new Error(`❌ T01 學生預防檢查失敗：${t01PreCheck.reason}\n\n請確保主名單包含 T01 學生的完整資料`);
  }
  
  Logger.log(`✅ T01 學生預防檢查通過：找到 T01 學生 "${t01PreCheck.studentInfo.name}"`);
  
  // Step 2: 執行原始邏輯，但增加監控
  const originalResult = executeOriginalExtractionWithMonitoring(masterData, t01PreCheck);
  
  // Step 3: 驗證 T01 學生是否被正確分配
  const t01PostCheck = verifyT01StudentInExtractionResult(originalResult, t01PreCheck);
  if (!t01PostCheck.success) {
    throw new Error(`❌ T01 學生提取後驗證失敗：${t01PostCheck.reason}\n\n這表示 T01 學生在老師分配過程中遺漏了`);
  }
  
  Logger.log(`✅ T01 學生提取後驗證通過：已分配給 "${t01PostCheck.assignedTeacher}" 老師`);
  
  // Step 4: 對所有老師的學生列表進行 T01 優先排序
  const sortedResult = ensureT01FirstInAllTeachers(originalResult);
  
  Logger.log(`✅ T01 預防版本的老師資訊提取完成，共 ${sortedResult.length} 位老師`);
  return sortedResult;
}

/**
 * 驗證主名單中的 T01 學生
 */
function verifyT01StudentInMasterData(masterData) {
  try {
    if (!masterData || !masterData.data) {
      return { exists: false, reason: '主名單資料格式錯誤' };
    }
    
    // masterData.data 已經不含標題行
    const studentData = masterData.data;
    
    for (let i = 0; i < studentData.length; i++) {
      const row = studentData[i];
      const studentId = row[0];
      
      if (studentId && studentId.toString().trim() === 'T01') {
        const studentInfo = {
          id: studentId,
          name: row[4] || '', // Chinese Name
          englishName: row[5] || '', // English Name
          englishClass: row[9] || '', // English Class
          teacher: row[8] || '', // LT 欄位
          rowIndex: i,
          originalRow: row
        };
        
        // 檢查必要欄位
        if (!studentInfo.name) {
          return { exists: false, reason: 'T01 學生缺少姓名資訊' };
        }
        
        if (!studentInfo.teacher) {
          return { exists: false, reason: 'T01 學生缺少老師資訊（LT 欄位為空）' };
        }
        
        return {
          exists: true,
          studentInfo: studentInfo,
          rowPosition: i + 2 // +2 因為跳過標題行且陣列從0開始
        };
      }
    }
    
    return { exists: false, reason: '在主名單中未找到 ID 為 T01 的學生' };
    
  } catch (error) {
    return { exists: false, reason: `驗證過程發生錯誤：${error.message}` };
  }
}

/**
 * 執行原始提取邏輯，但增加監控
 */
function executeOriginalExtractionWithMonitoring(masterData, t01PreCheck) {
  // 這裡調用原始的 extractTeachersFromMasterList 邏輯
  // 但是添加詳細的監控日誌
  
  Logger.log(`🔍 開始執行原始提取邏輯，特別監控 T01 學生 "${t01PreCheck.studentInfo.name}"`);
  
  const headers = masterData.headers;
  const data = masterData.data; // masterData.data 已經不含標題列
  
  // 找到老師欄位索引
  const possibleTeacherFields = ['LT', 'Local Teacher', 'English Teacher', 'Teacher', '老師', '本地老師', '英文老師'];
  let ltIndex = -1;
  
  for (const field of possibleTeacherFields) {
    ltIndex = headers.findIndex(header => 
      header && header.toString().trim().toLowerCase() === field.toLowerCase()
    );
    if (ltIndex !== -1) break;
  }
  
  if (ltIndex === -1) {
    throw new Error('找不到老師欄位');
  }
  
  // 追蹤 T01 學生的處理過程
  let t01Processed = false;
  let t01AssignedTeacher = null;
  
  const teacherNames = new Set();
  const teacherStudentMap = new Map();
  
  data.forEach((row, index) => {
    const studentId = row[0];
    const teacherName = row[ltIndex];
    
    // 特別監控 T01 學生
    if (studentId && studentId.toString().trim() === 'T01') {
      Logger.log(`🔍 監控：正在處理 T01 學生 (第 ${index + 2} 行)`);
      Logger.log(`   學生ID：${studentId}`);
      Logger.log(`   老師：${teacherName}`);
      
      t01Processed = true;
      
      if (teacherName && teacherName.toString().trim()) {
        const cleanTeacherName = teacherName.toString().trim();
        t01AssignedTeacher = cleanTeacherName;
        Logger.log(`   ✅ T01 學生將被分配給老師：${cleanTeacherName}`);
      } else {
        Logger.log(`   ❌ T01 學生的老師欄位為空`);
      }
    }
    
    // 原始邏輯
    if (teacherName && teacherName.toString().trim()) {
      const cleanName = teacherName.toString().trim();
      teacherNames.add(cleanName);
      
      if (!teacherStudentMap.has(cleanName)) {
        teacherStudentMap.set(cleanName, []);
      }
      teacherStudentMap.get(cleanName).push(row);
    }
  });
  
  if (!t01Processed) {
    throw new Error('監控錯誤：T01 學生在資料處理過程中未被處理');
  }
  
  if (!t01AssignedTeacher) {
    throw new Error('監控錯誤：T01 學生未被分配給任何老師');
  }
  
  Logger.log(`✅ T01 學生監控完成：已分配給 "${t01AssignedTeacher}" 老師`);
  
  // 找到英語班級欄位索引
  const possibleClassFields = ['English Class', 'Class', '英語班級', '班級', 'EC'];
  let englishClassIndex = -1;
  
  for (const field of possibleClassFields) {
    englishClassIndex = headers.findIndex(h => 
      h && h.toString().includes(field) && 
      !h.toString().includes('Old') && 
      !h.toString().includes('Previous')
    );
    if (englishClassIndex !== -1) break;
  }
  
  // 轉換為老師資訊物件陣列
  const teachersInfo = Array.from(teacherNames).map(teacherName => {
    const students = teacherStudentMap.get(teacherName) || [];
    const classes = new Set();
    
    if (englishClassIndex !== -1) {
      students.forEach(student => {
        if (student[englishClassIndex]) {
          const className = student[englishClassIndex].toString().trim();
          if (className) {
            classes.add(className);
          }
        }
      });
    }
    
    return {
      name: teacherName,
      subject: '英文',
      classes: Array.from(classes).sort(),
      studentCount: students.length,
      students: students,
      hasT01: students.some(student => student[0] && student[0].toString().trim() === 'T01')
    };
  });
  
  return teachersInfo;
}

/**
 * 驗證 T01 學生是否在提取結果中
 */
function verifyT01StudentInExtractionResult(teachersInfo, t01PreCheck) {
  try {
    let t01FoundInTeacher = null;
    let t01StudentCount = 0;
    
    for (const teacher of teachersInfo) {
      if (teacher.hasT01) {
        t01FoundInTeacher = teacher.name;
        t01StudentCount++;
        
        // 詳細檢查該老師的學生列表中的 T01
        const t01Student = teacher.students.find(student => 
          student[0] && student[0].toString().trim() === 'T01'
        );
        
        if (t01Student) {
          Logger.log(`✅ 驗證：在 "${teacher.name}" 老師的學生列表中找到 T01 學生`);
        }
      }
    }
    
    if (t01StudentCount === 0) {
      return {
        success: false,
        reason: '在所有老師的學生列表中都未找到 T01 學生'
      };
    }
    
    if (t01StudentCount > 1) {
      return {
        success: false,
        reason: `T01 學生重複出現在 ${t01StudentCount} 位老師的學生列表中`
      };
    }
    
    return {
      success: true,
      assignedTeacher: t01FoundInTeacher
    };
    
  } catch (error) {
    return {
      success: false,
      reason: `驗證過程發生錯誤：${error.message}`
    };
  }
}

/**
 * 確保 T01 學生在所有相關老師的學生列表中排在第一位
 */
function ensureT01FirstInAllTeachers(teachersInfo) {
  return teachersInfo.map(teacher => {
    if (teacher.hasT01) {
      // 將 T01 學生排到第一位
      const t01Index = teacher.students.findIndex(student => 
        student[0] && student[0].toString().trim() === 'T01'
      );
      
      if (t01Index > 0) {
        Logger.log(`🔄 調整 "${teacher.name}" 老師的學生順序，將 T01 移到第一位`);
        const t01Student = teacher.students.splice(t01Index, 1)[0];
        teacher.students.unshift(t01Student);
      }
      
      Logger.log(`✅ "${teacher.name}" 老師的學生列表中 T01 已排在第一位`);
    }
    
    return teacher;
  });
}

/**
 * 增強版的學生匯入函數
 * 添加 T01 學生特別保護機制
 */
function importStudentsForTeacherWithT01Protection(recordBook, teacherInfo, masterData) {
  Logger.log(`🛡️ 開始為 "${teacherInfo.name}" 老師匯入學生資料（T01 保護版本）`);
  
  const studentListSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
  if (!studentListSheet) {
    throw new Error('找不到學生清單工作表');
  }
  
  // Step 1: 檢查該老師是否應該有 T01 學生
  const hasT01 = teacherInfo.students.some(student => 
    student[0] && student[0].toString().trim() === 'T01'
  );
  
  if (hasT01) {
    Logger.log(`🛡️ "${teacherInfo.name}" 老師應該包含 T01 學生，啟動特別保護機制`);
  }
  
  // Step 2: 準備學生資料，確保 T01 排在第一位
  let studentData = teacherInfo.students.map(studentRow => {
    const formattedRow = [];
    for (let i = 0; i < SYSTEM_CONFIG.STUDENT_FIELDS.length; i++) {
      formattedRow.push(studentRow[i] || '');
    }
    return formattedRow;
  });
  
  // 如果有 T01 學生，確保其排在第一位
  if (hasT01) {
    const t01Index = studentData.findIndex(student => 
      student[0] && student[0].toString().trim() === 'T01'
    );
    
    if (t01Index > 0) {
      Logger.log(`🔄 調整學生資料順序，將 T01 移到第一位`);
      const t01Student = studentData.splice(t01Index, 1)[0];
      studentData.unshift(t01Student);
    } else if (t01Index === -1) {
      throw new Error(`❌ T01 保護機制檢測到異常：該老師應該有 T01 學生但在資料中未找到`);
    }
    
    Logger.log(`✅ T01 學生已確保排在學生列表第一位`);
  }
  
  // Step 3: 匯入資料到學生清單工作表
  if (studentData.length > 0) {
    studentListSheet.getRange(2, 1, studentData.length, SYSTEM_CONFIG.STUDENT_FIELDS.length)
      .setValues(studentData);
  }
  
  // Step 4: 重新設定資料驗證
  reapplyDataValidation(studentListSheet, recordBook);
  
  // Step 5: 驗證寫入結果，特別檢查 T01 學生
  if (hasT01) {
    const writtenData = studentListSheet.getDataRange().getValues();
    if (writtenData.length > 1) {
      const firstStudentId = writtenData[1][0]; // 第二行第一欄（跳過標題）
      if (firstStudentId && firstStudentId.toString().trim() === 'T01') {
        Logger.log(`✅ T01 保護驗證成功：T01 學生已正確寫入並排在第一位`);
      } else {
        throw new Error(`❌ T01 保護驗證失敗：T01 學生未在預期位置`);
      }
    }
  }
  
  // Step 6: 自動預建 Scheduled Contact 記錄（使用統一函數）
  Logger.log(`🤖 為 "${teacherInfo.name}" 老師的 ${studentData.length} 位學生預建 Scheduled Contact 記錄...`);
  
  try {
    const allStudentData = studentListSheet.getDataRange().getValues();
    const result = performPrebuildScheduledContacts(recordBook, allStudentData);
    
    Logger.log(`✅ 為 "${teacherInfo.name}" 老師預建了 ${result.recordCount} 筆 Scheduled Contact 記錄`);
    
    // Step 7: 特別驗證 T01 學生的 Scheduled Contact 記錄
    if (hasT01) {
      const contactLogSheet = recordBook.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
      if (contactLogSheet) {
        const contactData = contactLogSheet.getDataRange().getValues();
        const t01ContactRecords = contactData.filter(row => 
          row[0] && row[0].toString().trim() === 'T01'
        );
        
        if (t01ContactRecords.length > 0) {
          Logger.log(`✅ T01 Scheduled Contact 驗證成功：找到 ${t01ContactRecords.length} 筆 T01 的電聯記錄`);
        } else {
          Logger.log(`⚠️ T01 Scheduled Contact 驗證警告：未找到 T01 的電聯記錄`);
        }
      }
    }
    
  } catch (error) {
    Logger.log(`❌ Scheduled Contact 預建失敗：${error.message}`);
    throw error;
  }
  
  Logger.log(`🛡️ "${teacherInfo.name}" 老師的學生匯入（T01 保護版本）完成`);
}

/**
 * 執行完整的 T01 預防性檢查
 */
function runCompleteT01PreventionCheck() {
  Logger.log('🛡️ 開始執行完整的 T01 預防性檢查...');
  Logger.log('═'.repeat(60));
  
  const preventionResults = {
    success: true,
    checks: {
      masterListCheck: null,
      systemConfigCheck: null,
      existingRecordBooksCheck: null
    },
    recommendations: []
  };
  
  try {
    // 檢查1: 主名單中的 T01 學生
    Logger.log('\n📋 檢查1：主名單中的 T01 學生');
    Logger.log('-'.repeat(40));
    preventionResults.checks.masterListCheck = verifyT01StudentInMasterData({
      data: getSystemMasterList()?.data || []
    });
    
    if (!preventionResults.checks.masterListCheck.exists) {
      preventionResults.success = false;
      preventionResults.recommendations.push('立即檢查並修復主名單中的 T01 學生資料');
    }
    
    // 檢查2: 系統配置
    Logger.log('\n📋 檢查2：系統配置完整性');
    Logger.log('-'.repeat(40));
    preventionResults.checks.systemConfigCheck = validateSystemConfigForT01();
    
    if (!preventionResults.checks.systemConfigCheck.success) {
      preventionResults.success = false;
      preventionResults.recommendations.push('修復系統配置問題');
    }
    
    // 檢查3: 現有記錄簿中的 T01 學生
    Logger.log('\n📋 檢查3：現有記錄簿中的 T01 學生');
    Logger.log('-'.repeat(40));
    preventionResults.checks.existingRecordBooksCheck = detectT01StudentStatus();
    
    if (!preventionResults.checks.existingRecordBooksCheck.success) {
      preventionResults.success = false;
      preventionResults.recommendations.push('執行 T01 學生修復操作');
    }
    
    // 總結
    Logger.log('\n📊 T01 預防性檢查總結：');
    Logger.log('═'.repeat(60));
    
    if (preventionResults.success) {
      Logger.log('✅ 所有 T01 預防性檢查通過');
      Logger.log('💡 系統狀態良好，T01 學生遺漏風險較低');
    } else {
      Logger.log('❌ 發現 T01 學生相關問題');
      Logger.log('💡 建議執行以下修復操作：');
      preventionResults.recommendations.forEach((rec, index) => {
        Logger.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    return preventionResults;
    
  } catch (error) {
    Logger.log(`❌ T01 預防性檢查過程發生錯誤：${error.message}`);
    return {
      ...preventionResults,
      success: false,
      error: error.message
    };
  }
}

/**
 * 驗證系統配置對 T01 學生的支援
 */
function validateSystemConfigForT01() {
  try {
    const result = {
      success: true,
      issues: []
    };
    
    // 檢查 STUDENT_FIELDS 配置
    if (!SYSTEM_CONFIG.STUDENT_FIELDS || SYSTEM_CONFIG.STUDENT_FIELDS.length === 0) {
      result.success = false;
      result.issues.push('STUDENT_FIELDS 配置缺失');
    }
    
    // 檢查 STUDENT_MASTER_LIST_ID 配置
    if (!SYSTEM_CONFIG.STUDENT_MASTER_LIST_ID) {
      result.success = false;
      result.issues.push('STUDENT_MASTER_LIST_ID 配置缺失');
    }
    
    // 檢查 CONTACT_FIELDS 配置
    if (!SYSTEM_CONFIG.CONTACT_FIELDS || SYSTEM_CONFIG.CONTACT_FIELDS.length === 0) {
      result.success = false;
      result.issues.push('CONTACT_FIELDS 配置缺失');
    }
    
    return result;
    
  } catch (error) {
    return {
      success: false,
      issues: [`配置驗證錯誤：${error.message}`]
    };
  }
}