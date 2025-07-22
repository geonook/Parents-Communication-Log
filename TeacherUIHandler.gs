/**
 * 老師管理用戶介面處理模組
 * 負責用戶輸入處理和資料收集
 * Version: 1.0.0 - 從TeacherManagement.gs模組化拆分
 */

/**
 * 從用戶輸入獲取老師資訊
 * @return {Object|null} 老師資訊對象，包含name、subject、classes屬性，取消時返回null
 */
function getTeacherInfoFromUser() {
  const perfSession = startTimer('獲取老師資訊', 'USER_INTERFACE');
  
  try {
    // 統一 Web 環境架構 - 移除環境檢查
    const ui = SpreadsheetApp.getUi();
    
    perfSession.checkpoint('UI初始化完成');
    
    // 獲取老師姓名
    const nameResponse = ui.prompt('老師資訊', '請輸入老師姓名：', ui.ButtonSet.OK_CANCEL);
    if (nameResponse.getSelectedButton() !== ui.Button.OK) {
      perfSession.end(false, '用戶取消輸入老師姓名');
      return null;
    }
    
    const teacherName = nameResponse.getResponseText().trim();
    if (!teacherName) {
      ui.alert('錯誤', '老師姓名不能為空', ui.ButtonSet.OK);
      perfSession.end(false, '老師姓名為空');
      return null;
    }
    
    perfSession.checkpoint('老師姓名獲取完成', { teacherName });
    
    // 固定為英文科，不需要用戶輸入
    const subject = '英文';
    
    // 獲取班級
    const classResponse = ui.prompt(
      '老師資訊', 
      '請輸入授課班級（用逗號分隔）：\n例如：101,102,103', 
      ui.ButtonSet.OK_CANCEL
    );
    
    if (classResponse.getSelectedButton() !== ui.Button.OK) {
      perfSession.end(false, '用戶取消輸入班級資訊');
      return null;
    }
    
    const classesText = classResponse.getResponseText().trim();
    if (!classesText) {
      ui.alert('錯誤', '授課班級不能為空', ui.ButtonSet.OK);
      perfSession.end(false, '授課班級為空');
      return null;
    }
    
    // 處理和驗證班級資料
    const classes = classesText
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);
    
    if (classes.length === 0) {
      ui.alert('錯誤', '請至少輸入一個有效的班級', ui.ButtonSet.OK);
      perfSession.end(false, '沒有有效的班級資料');
      return null;
    }
    
    perfSession.checkpoint('班級資訊處理完成', { classCount: classes.length });
    
    const teacherInfo = {
      name: teacherName,
      subject: subject,
      classes: classes
    };
    
    Logger.log(`✅ 成功獲取老師資訊：${JSON.stringify(teacherInfo)}`);
    perfSession.end(true, `成功獲取 ${teacherName} 老師資訊`);
    
    return teacherInfo;
    
  } catch (error) {
    perfSession.end(false, error.message);
    ErrorHandler.handle('獲取老師資訊', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.USER_INPUT);
    return null;
  }
}

/**
 * 從試算表讀取老師資料
 * @param {string} sheetId 試算表ID
 * @return {Array|null} 老師資料陣列，失敗時返回null
 */
function getTeachersDataFromSheet(sheetId) {
  const perfSession = startTimer('讀取批次老師資料', 'DATA_IMPORT');
  
  try {
    if (!sheetId || typeof sheetId !== 'string') {
      throw new Error('試算表ID無效');
    }
    
    Logger.log(`📖 開始讀取老師資料，試算表ID：${sheetId}`);
    
    perfSession.checkpoint('開始讀取試算表');
    
    // 開啟試算表
    let sheet;
    try {
      const spreadsheet = SpreadsheetApp.openById(sheetId);
      sheet = spreadsheet.getActiveSheet();
    } catch (openError) {
      throw new Error(`無法開啟試算表：${openError.message}。請確認ID正確且有存取權限。`);
    }
    
    perfSession.checkpoint('成功開啟試算表');
    
    // 讀取資料
    let data;
    try {
      data = sheet.getDataRange().getValues();
    } catch (readError) {
      throw new Error(`讀取試算表資料失敗：${readError.message}`);
    }
    
    if (!data || data.length <= 1) {
      throw new Error('試算表無資料或僅有標題行');
    }
    
    perfSession.checkpoint('資料讀取完成', { totalRows: data.length });
    
    // 處理資料：跳過標題行，固定科目為英文
    const teachersData = data.slice(1)
      .map((row, index) => {
        const rowNumber = index + 2; // 考慮標題行
        
        // 檢查必要欄位
        if (!row[0] || typeof row[0] !== 'string') {
          Logger.log(`⚠️ 第${rowNumber}行：老師姓名為空或格式錯誤`);
          return null;
        }
        
        if (!row[1] || typeof row[1] !== 'string') {
          Logger.log(`⚠️ 第${rowNumber}行：班級資料為空或格式錯誤`);
          return null;
        }
        
        const teacherName = row[0].toString().trim();
        const classesText = row[1].toString().trim();
        
        if (!teacherName) {
          Logger.log(`⚠️ 第${rowNumber}行：老師姓名為空`);
          return null;
        }
        
        if (!classesText) {
          Logger.log(`⚠️ 第${rowNumber}行：班級資料為空`);
          return null;
        }
        
        // 處理班級資料
        const classes = classesText
          .split(',')
          .map(c => c.trim())
          .filter(c => c.length > 0);
        
        if (classes.length === 0) {
          Logger.log(`⚠️ 第${rowNumber}行：沒有有效的班級資料`);
          return null;
        }
        
        return {
          name: teacherName,
          subject: '英文', // 固定為英文科
          classes: classes,
          sourceRow: rowNumber
        };
      })
      .filter(teacher => teacher !== null);
    
    perfSession.checkpoint('資料處理完成', { validTeachers: teachersData.length });
    
    if (teachersData.length === 0) {
      throw new Error('沒有找到有效的老師資料。請檢查資料格式：第一欄為老師姓名，第二欄為班級（用逗號分隔）');
    }
    
    Logger.log(`✅ 成功讀取 ${teachersData.length} 位老師的資料`);
    teachersData.forEach((teacher, index) => {
      Logger.log(`   ${index + 1}. ${teacher.name} - 班級：${teacher.classes.join(', ')} (來源行：${teacher.sourceRow})`);
    });
    
    perfSession.end(true, `成功讀取${teachersData.length}位老師資料`);
    
    return teachersData;
    
  } catch (error) {
    Logger.log(`❌ 讀取老師資料失敗：${error.message}`);
    perfSession.end(false, error.message);
    ErrorHandler.handle('讀取批次老師資料', error, ERROR_LEVELS.ERROR, ERROR_CATEGORIES.DATA);
    return null;
  }
}

/**
 * 驗證老師資訊格式
 * @param {Object} teacherInfo 老師資訊對象
 * @return {Object} 驗證結果 {isValid: boolean, errors: Array}
 */
function validateTeacherInfo(teacherInfo) {
  const errors = [];
  
  if (!teacherInfo) {
    errors.push('老師資訊對象不存在');
    return { isValid: false, errors };
  }
  
  // 驗證老師姓名
  if (!teacherInfo.name || typeof teacherInfo.name !== 'string' || !teacherInfo.name.trim()) {
    errors.push('老師姓名必須是非空字符串');
  }
  
  // 驗證科目
  if (!teacherInfo.subject || typeof teacherInfo.subject !== 'string' || !teacherInfo.subject.trim()) {
    errors.push('科目必須是非空字符串');
  }
  
  // 驗證班級陣列
  if (!teacherInfo.classes || !Array.isArray(teacherInfo.classes) || teacherInfo.classes.length === 0) {
    errors.push('班級必須是非空陣列');
  } else {
    // 檢查每個班級
    teacherInfo.classes.forEach((cls, index) => {
      if (!cls || typeof cls !== 'string' || !cls.trim()) {
        errors.push(`班級[${index}]必須是非空字符串`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * 格式化老師資訊顯示
 * @param {Object} teacherInfo 老師資訊對象
 * @return {string} 格式化後的字符串
 */
function formatTeacherInfoDisplay(teacherInfo) {
  if (!teacherInfo) return '無老師資訊';
  
  const validation = validateTeacherInfo(teacherInfo);
  if (!validation.isValid) {
    return `無效的老師資訊：${validation.errors.join('、')}`;
  }
  
  return `${teacherInfo.name}老師 (${teacherInfo.subject}) - 授課班級：${teacherInfo.classes.join('、')}`;
}

/**
 * 批次驗證老師資料
 * @param {Array} teachersData 老師資料陣列
 * @return {Object} 驗證結果 {validData: Array, invalidData: Array, summary: Object}
 */
function batchValidateTeachersData(teachersData) {
  if (!teachersData || !Array.isArray(teachersData)) {
    return {
      validData: [],
      invalidData: [],
      summary: { total: 0, valid: 0, invalid: 0, errors: ['輸入不是有效的陣列'] }
    };
  }
  
  const validData = [];
  const invalidData = [];
  
  teachersData.forEach((teacherInfo, index) => {
    const validation = validateTeacherInfo(teacherInfo);
    if (validation.isValid) {
      validData.push(teacherInfo);
    } else {
      invalidData.push({
        index: index,
        data: teacherInfo,
        errors: validation.errors
      });
    }
  });
  
  return {
    validData: validData,
    invalidData: invalidData,
    summary: {
      total: teachersData.length,
      valid: validData.length,
      invalid: invalidData.length,
      validRate: teachersData.length > 0 ? (validData.length / teachersData.length * 100).toFixed(1) + '%' : '0%'
    }
  };
}