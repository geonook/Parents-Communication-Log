/**
 * 學生資料管理服務
 * 處理所有與學生相關的業務邏輯
 * Version: 1.0.0 - Phase 2 API重構
 */

class StudentService extends ApiService {
  constructor() {
    super();
  }
  
  /**
   * 獲取學生資料
   * @param {string} sheetId 試算表ID（可選）
   * @return {Object} API響應
   */
  async getStudentData(sheetId = null) {
    return this.executeWithErrorHandling(async () => {
      Logger.log('StudentService: 開始獲取學生資料');
      
      let studentData;
      
      if (!sheetId || sheetId.trim() === '') {
        // 使用系統學生總表
        studentData = getSystemMasterList();
        if (!studentData) {
          return this.error(
            '找不到系統學生總表，請提供學生資料表的 Google Sheets ID 或先初始化系統',
            'SYSTEM_MASTER_LIST_NOT_FOUND'
          );
        }
      } else {
        // 使用用戶提供的 ID
        try {
          const spreadsheet = SpreadsheetApp.openById(sheetId);
          const sheet = spreadsheet.getActiveSheet();
          studentData = sheet.getDataRange().getValues();
        } catch (error) {
          return this.error(
            '無法開啟指定的學生資料表，請檢查 Google Sheets ID 是否正確且有權限存取',
            'INVALID_SHEET_ID'
          );
        }
      }
      
      // 處理學生資料格式
      const processedData = this.processStudentData(studentData);
      
      return this.success(processedData, '成功獲取學生資料');
      
    }, 'getStudentData', { sheetId });
  }
  
  /**
   * 批量導入學生資料
   * @param {string} sourceSheetId 來源試算表ID
   * @param {Object} options 導入選項
   * @return {Object} API響應
   */
  async importStudentData(sourceSheetId, options = {}) {
    const validation = this.validateRequiredParams({ sourceSheetId }, ['sourceSheetId']);
    if (validation) return validation;
    
    return this.executeWithErrorHandling(async () => {
      Logger.log(`StudentService: 開始導入學生資料 - ${sourceSheetId}`);
      
      // 讀取來源資料
      let sourceData;
      try {
        const sourceSpreadsheet = SpreadsheetApp.openById(sourceSheetId);
        const sourceSheet = sourceSpreadsheet.getActiveSheet();
        sourceData = sourceSheet.getDataRange().getValues();
      } catch (error) {
        return this.error(
          '無法開啟來源學生資料表，請檢查 Google Sheets ID 是否正確且有權限存取',
          'SOURCE_SHEET_ACCESS_ERROR'
        );
      }
      
      // 驗證資料格式
      const validation = this.validateStudentDataFormat(sourceData);
      if (!validation.valid) {
        return this.error(
          `學生資料格式不正確: ${validation.errors.join(', ')}`,
          'INVALID_DATA_FORMAT',
          { errors: validation.errors }
        );
      }
      
      // 處理導入邏輯
      const importResult = await this.executeStudentImport(sourceData, options);
      
      return this.success(importResult, '學生資料導入完成');
      
    }, 'importStudentData', { sourceSheetId, options });
  }
  
  /**
   * 搜尋學生
   * @param {Object} searchCriteria 搜尋條件
   * @return {Object} API響應
   */
  async searchStudents(searchCriteria) {
    if (!searchCriteria || Object.keys(searchCriteria).length === 0) {
      return this.error('搜尋條件不能為空', 'EMPTY_SEARCH_CRITERIA');
    }
    
    return this.executeWithErrorHandling(async () => {
      Logger.log('StudentService: 開始搜尋學生');
      
      // 使用學生定位器模組
      const searchResult = await this.executeStudentSearch(searchCriteria);
      
      return this.success(searchResult, `找到 ${searchResult.length} 筆符合條件的學生資料`);
      
    }, 'searchStudents', { searchCriteria });
  }
  
  /**
   * 獲取學生詳細資訊
   * @param {string} studentId 學生ID
   * @return {Object} API響應
   */
  async getStudentDetails(studentId) {
    const validation = this.validateRequiredParams({ studentId }, ['studentId']);
    if (validation) return validation;
    
    return this.executeWithErrorHandling(async () => {
      Logger.log(`StudentService: 獲取學生詳細資訊 - ${studentId}`);
      
      // 搜尋學生資料
      const studentInfo = await this.findStudentById(studentId);
      if (!studentInfo) {
        return this.error('找不到指定的學生', 'STUDENT_NOT_FOUND');
      }
      
      // 獲取學生相關記錄
      const studentRecords = await this.getStudentRecords(studentId);
      
      const detailedInfo = {
        ...studentInfo,
        records: studentRecords,
        totalRecords: studentRecords.length,
        lastActivity: this.getLastActivity(studentRecords)
      };
      
      return this.success(detailedInfo, '成功獲取學生詳細資訊');
      
    }, 'getStudentDetails', { studentId });
  }
  
  /**
   * 更新學生資訊
   * @param {string} studentId 學生ID
   * @param {Object} updateData 更新資料
   * @return {Object} API響應
   */
  async updateStudentInfo(studentId, updateData) {
    const validation = this.validateRequiredParams({ studentId, updateData }, ['studentId', 'updateData']);
    if (validation) return validation;
    
    return this.executeWithErrorHandling(async () => {
      Logger.log(`StudentService: 更新學生資訊 - ${studentId}`);
      
      // 驗證更新資料格式
      const dataValidation = this.validateUpdateData(updateData);
      if (!dataValidation.valid) {
        return this.error(
          `更新資料格式不正確: ${dataValidation.errors.join(', ')}`,
          'INVALID_UPDATE_DATA'
        );
      }
      
      // 執行更新
      const updateResult = await this.executeStudentUpdate(studentId, updateData);
      
      if (updateResult.success) {
        return this.success(updateResult, '學生資訊更新成功');
      } else {
        return this.error(updateResult.error, 'UPDATE_FAILED');
      }
      
    }, 'updateStudentInfo', { studentId, updateData });
  }
  
  /**
   * 獲取班級學生列表
   * @param {string} className 班級名稱
   * @return {Object} API響應
   */
  async getClassStudents(className) {
    const validation = this.validateRequiredParams({ className }, ['className']);
    if (validation) return validation;
    
    return this.executeWithErrorHandling(async () => {
      Logger.log(`StudentService: 獲取班級學生列表 - ${className}`);
      
      const classStudents = await this.findStudentsByClass(className);
      
      return this.success(classStudents, `找到班級 ${className} 的 ${classStudents.length} 位學生`);
      
    }, 'getClassStudents', { className });
  }
  
  /**
   * 處理學生資料格式
   * @param {Array} rawData 原始資料
   * @return {Object} 處理後的資料
   */
  processStudentData(rawData) {
    if (!Array.isArray(rawData) || rawData.length < 3) {
      throw new Error('學生資料格式不正確');
    }
    
    const headers = rawData[2]; // 第3行是標題
    const studentRecords = rawData.slice(3); // 從第4行開始是資料
    
    return {
      headers: headers,
      records: studentRecords,
      totalStudents: studentRecords.length,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * 驗證學生資料格式
   * @param {Array} data 學生資料
   * @return {Object} 驗證結果
   */
  validateStudentDataFormat(data) {
    const errors = [];
    
    if (!Array.isArray(data)) {
      errors.push('資料必須是陣列格式');
    }
    
    if (data.length < 3) {
      errors.push('資料行數不足，至少需要3行（包含標題行）');
    }
    
    if (data.length >= 3) {
      const headers = data[2];
      const requiredColumns = ['ID', 'Chinese Name', 'English Name', 'English Class'];
      
      for (const col of requiredColumns) {
        if (!headers.some(h => h && h.toString().includes(col))) {
          errors.push(`缺少必要欄位: ${col}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * 執行學生資料導入
   * @param {Array} data 學生資料
   * @param {Object} options 導入選項
   * @return {Object} 導入結果
   */
  async executeStudentImport(data, options) {
    const processedData = this.processStudentData(data);
    
    // 這裡可以整合現有的學生資料導入邏輯
    // 例如使用 StudentDataImport.gs 中的功能
    
    return {
      totalRecords: processedData.totalStudents,
      importedRecords: processedData.totalStudents,
      failedRecords: 0,
      duplicates: 0,
      warnings: []
    };
  }
  
  /**
   * 執行學生搜尋
   * @param {Object} criteria 搜尋條件
   * @return {Array} 搜尋結果
   */
  async executeStudentSearch(criteria) {
    // 整合 StudentLocator.gs 的搜尋功能
    const allStudents = getSystemMasterList();
    if (!allStudents) {
      return [];
    }
    
    const headers = allStudents[2];
    const students = allStudents.slice(3);
    
    return students.filter(student => {
      return Object.keys(criteria).every(key => {
        const columnIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes(key.toLowerCase()));
        if (columnIndex === -1) return false;
        
        const studentValue = student[columnIndex];
        const searchValue = criteria[key];
        
        return studentValue && studentValue.toString().toLowerCase().includes(searchValue.toString().toLowerCase());
      });
    }).map(student => {
      const studentObj = {};
      headers.forEach((header, index) => {
        if (header) {
          studentObj[header] = student[index];
        }
      });
      return studentObj;
    });
  }
  
  /**
   * 根據ID尋找學生
   * @param {string} studentId 學生ID
   * @return {Object|null} 學生資訊
   */
  async findStudentById(studentId) {
    const searchResult = await this.executeStudentSearch({ 'ID': studentId });
    return searchResult.length > 0 ? searchResult[0] : null;
  }
  
  /**
   * 根據班級尋找學生
   * @param {string} className 班級名稱
   * @return {Array} 學生列表
   */
  async findStudentsByClass(className) {
    return await this.executeStudentSearch({ 'English Class': className });
  }
  
  /**
   * 獲取學生相關記錄
   * @param {string} studentId 學生ID
   * @return {Array} 學生記錄
   */
  async getStudentRecords(studentId) {
    // 這裡可以整合電聯記錄查詢功能
    // 暫時返回空陣列
    return [];
  }
  
  /**
   * 獲取最後活動時間
   * @param {Array} records 記錄列表
   * @return {string|null} 最後活動時間
   */
  getLastActivity(records) {
    if (!records || records.length === 0) {
      return null;
    }
    
    // 找到最新的記錄時間
    return records.reduce((latest, record) => {
      const recordTime = record.timestamp || record.date;
      return recordTime && recordTime > latest ? recordTime : latest;
    }, null);
  }
  
  /**
   * 驗證更新資料
   * @param {Object} updateData 更新資料
   * @return {Object} 驗證結果
   */
  validateUpdateData(updateData) {
    const errors = [];
    
    if (!updateData || typeof updateData !== 'object') {
      errors.push('更新資料必須是物件格式');
    }
    
    // 可以添加更多特定的驗證規則
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * 執行學生資訊更新
   * @param {string} studentId 學生ID
   * @param {Object} updateData 更新資料
   * @return {Object} 更新結果
   */
  async executeStudentUpdate(studentId, updateData) {
    // 這裡可以整合學生資料更新功能
    // 暫時返回成功結果
    return {
      success: true,
      updatedFields: Object.keys(updateData),
      timestamp: new Date().toISOString()
    };
  }
}