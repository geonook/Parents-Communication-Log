/**
 * T01 學生遺漏問題檢測和修復工具
 * 專門處理用戶反饋的「首位學生(T01)在老師記錄簿中遺漏」問題
 * 
 * Phase 3: Problem 3 解決方案
 */

/**
 * 檢測所有老師記錄簿中的 T01 學生狀況
 */
function detectT01StudentStatus() {
  try {
    Logger.log('🔍 開始檢測所有老師記錄簿中的 T01 學生狀況...');
    Logger.log('═'.repeat(60));
    
    const detectionResults = {
      success: true,
      issues: [],
      details: {
        totalTeachers: 0,
        teachersWithT01: 0,
        teachersWithoutT01: [],
        t01StudentFound: [],
        masterListHasT01: false
      }
    };
    
    // 步驟1: 檢查主名單中是否有 T01 學生
    Logger.log('📋 步驟1：檢查主名單中的 T01 學生...');
    const masterListT01Status = checkMasterListForT01();
    detectionResults.details.masterListHasT01 = masterListT01Status.hasT01;
    
    if (!masterListT01Status.hasT01) {
      detectionResults.success = false;
      detectionResults.issues.push('❌ 主名單中沒有找到 T01 學生');
      Logger.log('❌ 主名單中沒有找到 T01 學生，可能是數據問題');
    } else {
      Logger.log(`✅ 主名單中找到 T01 學生：${masterListT01Status.studentInfo.name}`);
      detectionResults.details.t01MasterInfo = masterListT01Status.studentInfo;
    }
    
    // 步驟2: 獲取所有老師記錄簿
    Logger.log('📋 步驟2：搜索所有老師記錄簿...');
    const teacherBooks = getAllTeacherRecordBooks();
    detectionResults.details.totalTeachers = teacherBooks.length;
    
    if (teacherBooks.length === 0) {
      detectionResults.success = false;
      detectionResults.issues.push('❌ 找不到任何老師記錄簿');
      return detectionResults;
    }
    
    Logger.log(`📊 找到 ${teacherBooks.length} 個老師記錄簿`);
    
    // 步驟3: 逐一檢查每個老師記錄簿中的 T01 學生
    Logger.log('📋 步驟3：逐一檢查老師記錄簿中的 T01 學生...');
    
    teacherBooks.forEach((teacherBook, index) => {
      Logger.log(`🔍 檢查第 ${index + 1}/${teacherBooks.length} 個記錄簿：${teacherBook.name}`);
      
      const t01Status = checkT01InTeacherBook(teacherBook);
      
      if (t01Status.hasT01) {
        detectionResults.details.teachersWithT01++;
        detectionResults.details.t01StudentFound.push({
          teacherName: teacherBook.name,
          bookId: teacherBook.id,
          studentData: t01Status.studentData,
          foundInSheets: t01Status.foundInSheets
        });
        Logger.log(`  ✅ 找到 T01 學生，出現在：${t01Status.foundInSheets.join(', ')}`);
      } else {
        detectionResults.details.teachersWithoutT01.push({
          teacherName: teacherBook.name,
          bookId: teacherBook.id,
          reason: t01Status.reason || '未找到 T01 學生'
        });
        Logger.log(`  ❌ 未找到 T01 學生：${t01Status.reason || '原因不明'}`);
      }
    });
    
    // 步驟4: 分析結果
    Logger.log('📋 步驟4：分析檢測結果...');
    
    if (detectionResults.details.teachersWithoutT01.length > 0) {
      detectionResults.success = false;
      detectionResults.issues.push(`❌ 有 ${detectionResults.details.teachersWithoutT01.length} 個老師記錄簿缺少 T01 學生`);
    }
    
    // 顯示詳細結果
    Logger.log('\n📊 T01 學生檢測結果總覽：');
    Logger.log('═'.repeat(60));
    Logger.log(`📈 總老師數：${detectionResults.details.totalTeachers}`);
    Logger.log(`✅ 有 T01 的老師：${detectionResults.details.teachersWithT01}`);
    Logger.log(`❌ 缺少 T01 的老師：${detectionResults.details.teachersWithoutT01.length}`);
    
    if (detectionResults.details.teachersWithoutT01.length > 0) {
      Logger.log('\n❌ 缺少 T01 學生的老師記錄簿：');
      detectionResults.details.teachersWithoutT01.forEach(teacher => {
        Logger.log(`   • ${teacher.teacherName}: ${teacher.reason}`);
      });
    }
    
    if (detectionResults.details.t01StudentFound.length > 0) {
      Logger.log('\n✅ 正確包含 T01 學生的老師記錄簿：');
      detectionResults.details.t01StudentFound.forEach(teacher => {
        Logger.log(`   • ${teacher.teacherName}: 出現在 ${teacher.foundInSheets.join(', ')}`);
      });
    }
    
    if (detectionResults.success) {
      Logger.log('\n🎉 所有老師記錄簿都正確包含 T01 學生！');
    } else {
      Logger.log('\n⚠️ 發現 T01 學生遺漏問題，需要修復');
    }
    
    return detectionResults;
    
  } catch (error) {
    Logger.log(`❌ T01 學生檢測過程發生錯誤：${error.message}`);
    return {
      success: false,
      issues: [`檢測過程發生錯誤：${error.message}`],
      details: {}
    };
  }
}

/**
 * 檢查主名單中是否有 T01 學生
 */
function checkMasterListForT01() {
  try {
    // 獲取主名單試算表
    const masterSpreadsheet = SpreadsheetApp.openById(SYSTEM_CONFIG.STUDENT_MASTER_LIST_ID);
    const masterSheet = masterSpreadsheet.getActiveSheet();
    
    // 獲取所有學生資料
    const allData = masterSheet.getDataRange().getValues();
    if (allData.length <= 1) {
      return { hasT01: false, reason: '主名單為空或只有標題行' };
    }
    
    // 查找 T01 學生（假設 ID 在第一欄）
    for (let i = 1; i < allData.length; i++) {
      const studentId = allData[i][0];
      if (studentId && studentId.toString().trim() === 'T01') {
        return {
          hasT01: true,
          studentInfo: {
            id: studentId,
            name: allData[i][4] || '名稱未知', // 假設中文姓名在第5欄
            englishName: allData[i][5] || '',   // 假設英文姓名在第6欄
            class: allData[i][9] || '班級未知'   // 假設班級在第10欄
          }
        };
      }
    }
    
    return { hasT01: false, reason: '主名單中沒有 ID 為 T01 的學生' };
    
  } catch (error) {
    Logger.log(`檢查主名單 T01 學生時發生錯誤：${error.message}`);
    return { hasT01: false, reason: `主名單訪問錯誤：${error.message}` };
  }
}

/**
 * 獲取所有老師記錄簿
 */
function getAllTeacherRecordBooks() {
  try {
    const mainFolder = getSystemMainFolder();
    const teacherBooks = [];
    
    // 搜索所有包含「記錄簿」的檔案
    const files = mainFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
    
    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      
      // 檢查是否是老師記錄簿（包含「記錄簿」關鍵字且不是主名單）
      if (fileName.includes('記錄簿') && !fileName.includes('主名單') && !fileName.includes('範本')) {
        teacherBooks.push({
          name: fileName,
          id: file.getId(),
          file: file
        });
      }
    }
    
    Logger.log(`📊 搜索到 ${teacherBooks.length} 個老師記錄簿`);
    return teacherBooks;
    
  } catch (error) {
    Logger.log(`獲取老師記錄簿時發生錯誤：${error.message}`);
    return [];
  }
}

/**
 * 檢查特定老師記錄簿中是否有 T01 學生
 */
function checkT01InTeacherBook(teacherBook) {
  try {
    const spreadsheet = SpreadsheetApp.openById(teacherBook.id);
    const result = {
      hasT01: false,
      foundInSheets: [],
      studentData: {},
      reason: ''
    };
    
    // 檢查學生清單工作表
    const studentListSheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    if (studentListSheet) {
      const studentListData = studentListSheet.getDataRange().getValues();
      for (let i = 1; i < studentListData.length; i++) {
        if (studentListData[i][0] && studentListData[i][0].toString().trim() === 'T01') {
          result.hasT01 = true;
          result.foundInSheets.push('學生清單');
          result.studentData.studentList = {
            row: i + 1,
            data: studentListData[i]
          };
          break;
        }
      }
    }
    
    // 檢查電聯記錄工作表
    const contactLogSheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (contactLogSheet) {
      const contactData = contactLogSheet.getDataRange().getValues();
      for (let i = 1; i < contactData.length; i++) {
        if (contactData[i][0] && contactData[i][0].toString().trim() === 'T01') {
          if (!result.hasT01) result.hasT01 = true;
          if (!result.foundInSheets.includes('電聯記錄')) {
            result.foundInSheets.push('電聯記錄');
          }
          if (!result.studentData.contactLog) {
            result.studentData.contactLog = [];
          }
          result.studentData.contactLog.push({
            row: i + 1,
            data: contactData[i]
          });
        }
      }
    }
    
    // 檢查進度追蹤工作表
    const progressSheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.PROGRESS);
    if (progressSheet) {
      const progressData = progressSheet.getDataRange().getValues();
      for (let i = 1; i < progressData.length; i++) {
        if (progressData[i][0] && progressData[i][0].toString().trim() === 'T01') {
          if (!result.hasT01) result.hasT01 = true;
          if (!result.foundInSheets.includes('進度追蹤')) {
            result.foundInSheets.push('進度追蹤');
          }
          result.studentData.progress = {
            row: i + 1,
            data: progressData[i]
          };
          break;
        }
      }
    }
    
    if (!result.hasT01) {
      result.reason = '在所有工作表中都未找到 T01 學生';
    }
    
    return result;
    
  } catch (error) {
    Logger.log(`檢查老師記錄簿 ${teacherBook.name} 時發生錯誤：${error.message}`);
    return {
      hasT01: false,
      foundInSheets: [],
      studentData: {},
      reason: `訪問錯誤：${error.message}`
    };
  }
}

/**
 * 自動修復缺少 T01 學生的老師記錄簿
 */
function repairMissingT01Students() {
  try {
    Logger.log('🔧 開始自動修復缺少 T01 學生的老師記錄簿...');
    Logger.log('═'.repeat(60));
    
    // 先檢測現狀
    const detectionResults = detectT01StudentStatus();
    
    if (detectionResults.success) {
      Logger.log('✅ 所有老師記錄簿都已包含 T01 學生，無需修復');
      return {
        success: true,
        message: '無需修復，所有記錄簿都正常',
        repaired: []
      };
    }
    
    if (!detectionResults.details.masterListHasT01) {
      Logger.log('❌ 主名單中沒有 T01 學生，無法進行修復');
      return {
        success: false,
        message: '主名單中沒有 T01 學生，請先檢查主名單',
        repaired: []
      };
    }
    
    const repairResults = {
      success: true,
      repaired: [],
      failed: [],
      totalAttempted: detectionResults.details.teachersWithoutT01.length
    };
    
    Logger.log(`🔧 需要修復 ${repairResults.totalAttempted} 個老師記錄簿`);
    
    // 獲取 T01 學生的主名單資料
    const masterT01Data = detectionResults.details.t01MasterInfo;
    
    // 逐一修復缺少 T01 的記錄簿
    for (const teacherInfo of detectionResults.details.teachersWithoutT01) {
      Logger.log(`🔧 修復老師記錄簿：${teacherInfo.teacherName}`);
      
      try {
        const repairResult = addT01StudentToTeacherBook(teacherInfo.bookId, masterT01Data);
        
        if (repairResult.success) {
          repairResults.repaired.push({
            teacherName: teacherInfo.teacherName,
            bookId: teacherInfo.bookId,
            details: repairResult.details
          });
          Logger.log(`  ✅ 修復成功：${repairResult.message}`);
        } else {
          repairResults.failed.push({
            teacherName: teacherInfo.teacherName,
            bookId: teacherInfo.bookId,
            error: repairResult.error
          });
          repairResults.success = false;
          Logger.log(`  ❌ 修復失敗：${repairResult.error}`);
        }
        
      } catch (error) {
        repairResults.failed.push({
          teacherName: teacherInfo.teacherName,
          bookId: teacherInfo.bookId,
          error: error.message
        });
        repairResults.success = false;
        Logger.log(`  ❌ 修復過程發生錯誤：${error.message}`);
      }
    }
    
    // 顯示修復結果
    Logger.log('\n📊 T01 學生修復結果總覽：');
    Logger.log('═'.repeat(60));
    Logger.log(`📈 嘗試修復：${repairResults.totalAttempted} 個記錄簿`);
    Logger.log(`✅ 修復成功：${repairResults.repaired.length} 個`);
    Logger.log(`❌ 修復失敗：${repairResults.failed.length} 個`);
    
    if (repairResults.repaired.length > 0) {
      Logger.log('\n✅ 修復成功的記錄簿：');
      repairResults.repaired.forEach(repair => {
        Logger.log(`   • ${repair.teacherName}`);
      });
    }
    
    if (repairResults.failed.length > 0) {
      Logger.log('\n❌ 修復失敗的記錄簿：');
      repairResults.failed.forEach(failure => {
        Logger.log(`   • ${failure.teacherName}: ${failure.error}`);
      });
    }
    
    return repairResults;
    
  } catch (error) {
    Logger.log(`❌ T01 學生修復過程發生錯誤：${error.message}`);
    return {
      success: false,
      message: `修復過程發生錯誤：${error.message}`,
      repaired: []
    };
  }
}

/**
 * 將 T01 學生添加到特定的老師記錄簿
 */
function addT01StudentToTeacherBook(bookId, t01StudentData) {
  try {
    const spreadsheet = SpreadsheetApp.openById(bookId);
    const results = {
      success: true,
      details: {
        addedToSheets: [],
        errors: []
      },
      message: ''
    };
    
    // 準備學生資料（轉換為陣列格式，符合系統要求）
    const studentRowData = [
      t01StudentData.id,              // A: Student ID
      '',                             // B: 通常為序號或其他
      '',                             // C: 可能的其他欄位
      '',                             // D: 可能的其他欄位
      t01StudentData.name,            // E: Chinese Name
      t01StudentData.englishName,     // F: English Name
      '',                             // G: 其他欄位
      '',                             // H: 其他欄位
      '',                             // I: 其他欄位
      t01StudentData.class            // J: English Class
    ];
    
    // 添加到學生清單工作表
    const studentListSheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
    if (studentListSheet) {
      try {
        // 在第2行插入 T01 學生（確保是第一個學生）
        studentListSheet.insertRowBefore(2);
        const targetRange = studentListSheet.getRange(2, 1, 1, studentRowData.length);
        targetRange.setValues([studentRowData]);
        results.details.addedToSheets.push('學生清單');
        Logger.log('    ✅ 已添加到學生清單工作表');
      } catch (error) {
        results.details.errors.push(`學生清單工作表錯誤：${error.message}`);
        Logger.log(`    ❌ 學生清單工作表添加失敗：${error.message}`);
      }
    }
    
    // 為 T01 學生生成 Scheduled Contact 記錄
    const contactLogSheet = spreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
    if (contactLogSheet) {
      try {
        const t01StudentObject = {
          'ID': t01StudentData.id,
          'Chinese Name': t01StudentData.name,
          'English Name': t01StudentData.englishName,
          'English Class': t01StudentData.class
        };
        
        const scheduledContacts = generateScheduledContactsForStudent(t01StudentObject);
        
        if (scheduledContacts.length > 0) {
          // 在電聯記錄工作表的開頭插入 T01 的記錄
          const insertRow = 2; // 標題行之後
          contactLogSheet.insertRowsBefore(insertRow, scheduledContacts.length);
          
          const contactRange = contactLogSheet.getRange(insertRow, 1, scheduledContacts.length, scheduledContacts[0].length);
          contactRange.setValues(scheduledContacts);
          
          results.details.addedToSheets.push(`電聯記錄(${scheduledContacts.length}筆)`);
          Logger.log(`    ✅ 已添加 ${scheduledContacts.length} 筆 Scheduled Contact 記錄`);
        }
      } catch (error) {
        results.details.errors.push(`電聯記錄工作表錯誤：${error.message}`);
        Logger.log(`    ❌ 電聯記錄工作表添加失敗：${error.message}`);
      }
    }
    
    // 檢查是否有錯誤
    if (results.details.errors.length > 0) {
      results.success = false;
      results.message = `部分添加失敗：${results.details.errors.join('; ')}`;
    } else {
      results.message = `成功添加到：${results.details.addedToSheets.join(', ')}`;
    }
    
    return results;
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: { addedToSheets: [], errors: [error.message] }
    };
  }
}

/**
 * 執行完整的 T01 學生檢測和修復流程
 */
function runCompleteT01StudentDetectionAndRepair() {
  Logger.log('🚀 開始執行完整的 T01 學生檢測和修復流程...');
  Logger.log('═'.repeat(60));
  
  const processResults = {
    detection: null,
    repair: null,
    verification: null,
    success: false
  };
  
  try {
    // 階段1: 檢測
    Logger.log('\n📋 階段1：檢測 T01 學生狀況');
    Logger.log('-'.repeat(40));
    processResults.detection = detectT01StudentStatus();
    
    // 階段2: 修復（如果需要）
    if (!processResults.detection.success) {
      Logger.log('\n📋 階段2：自動修復缺少的 T01 學生');
      Logger.log('-'.repeat(40));
      processResults.repair = repairMissingT01Students();
    } else {
      Logger.log('\n📋 階段2：跳過修復（無需修復）');
      processResults.repair = { success: true, message: '無需修復' };
    }
    
    // 階段3: 驗證修復結果
    if (processResults.repair && processResults.repair.repaired && processResults.repair.repaired.length > 0) {
      Logger.log('\n📋 階段3：驗證修復結果');
      Logger.log('-'.repeat(40));
      processResults.verification = detectT01StudentStatus();
    }
    
    // 總結
    Logger.log('\n📊 T01 學生處理總結：');
    Logger.log('═'.repeat(60));
    
    if (processResults.detection.success) {
      Logger.log('✅ 初始檢測：所有記錄簿都包含 T01 學生');
      processResults.success = true;
    } else if (processResults.repair && processResults.repair.success) {
      if (processResults.verification && processResults.verification.success) {
        Logger.log('✅ 修復成功：所有問題已解決');
        processResults.success = true;
      } else {
        Logger.log('⚠️ 修復完成但驗證顯示仍有問題');
        processResults.success = false;
      }
    } else {
      Logger.log('❌ 修復失敗：問題未能解決');
      processResults.success = false;
    }
    
    return processResults;
    
  } catch (error) {
    Logger.log(`❌ T01 學生檢測和修復流程發生錯誤：${error.message}`);
    return {
      ...processResults,
      success: false,
      error: error.message
    };
  }
}