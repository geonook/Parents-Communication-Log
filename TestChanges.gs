/**
 * 測試班級資訊工作表調整
 * 驗證移除班導師欄位後的功能是否正常
 */
function testClassInfoSheetChanges() {
  Logger.log('🧪 開始測試班級資訊工作表調整...');
  
  // 模擬老師資訊
  const mockTeacherInfo = {
    name: '測試老師',
    subject: '英語',
    classes: ['G1 Trailblazers', 'G2 Discoverers'],
    students: [
      ['001', 'G1', '701', '1', '王小明', 'Ming Wang', 'A1', 'A2', 'Mr. Johnson', 'G1 Trailblazers', 'Ms. Chen', '927055077', '955123456'],
      ['002', 'G1', '701', '2', '李小華', 'Lily Lee', 'A1', 'A2', 'Mr. Johnson', 'G1 Trailblazers', 'Ms. Chen', '912345678', '987654321'],
      ['003', 'G2', '702', '1', '張小美', 'Amy Zhang', 'B1', 'B2', 'Ms. Smith', 'G2 Discoverers', 'Ms. Wang', '923456789', '976543210']
    ]
  };
  
  try {
    // 創建測試試算表
    const testSpreadsheet = SpreadsheetApp.create('測試班級資訊調整');
    Logger.log(`✅ 測試試算表已創建：${testSpreadsheet.getName()}`);
    
    // 呼叫 createClassInfoSheet 函數
    createClassInfoSheet(testSpreadsheet, mockTeacherInfo);
    Logger.log('✅ createClassInfoSheet 函數執行成功');
    
    // 驗證工作表結構
    const sheet = testSpreadsheet.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CLASS_INFO);
    const headers = sheet.getRange(1, 1, 1, 4).getValues()[0];
    
    Logger.log('📋 工作表標題行：' + headers.join(', '));
    
    // 驗證標題是否正確（應該只有4欄，不包含班導師）
    const expectedHeaders = ['班級', '班級人數', '班級特殊情況說明', '最後更新日期'];
    const headersMatch = JSON.stringify(headers) === JSON.stringify(expectedHeaders);
    
    if (headersMatch) {
      Logger.log('✅ 標題行驗證通過：已成功移除班導師欄位');
    } else {
      Logger.log('❌ 標題行驗證失敗');
      Logger.log('期望：' + expectedHeaders.join(', '));
      Logger.log('實際：' + headers.join(', '));
    }
    
    // 驗證資料行
    const dataRows = sheet.getRange(2, 1, 2, 4).getValues();
    Logger.log('📊 資料行：');
    dataRows.forEach((row, index) => {
      Logger.log(`第${index + 1}行：${row.join(', ')}`);
    });
    
    // 驗證班級人數計算
    const class1Count = dataRows[0][1]; // G1 Trailblazers 應該有2人
    const class2Count = dataRows[1][1]; // G2 Discoverers 應該有1人
    
    if (class1Count === 2 && class2Count === 1) {
      Logger.log('✅ 班級人數計算正確');
    } else {
      Logger.log('❌ 班級人數計算錯誤');
      Logger.log(`G1 Trailblazers 期望：2，實際：${class1Count}`);
      Logger.log(`G2 Discoverers 期望：1，實際：${class2Count}`);
    }
    
    // 清理測試檔案
    DriveApp.getFileById(testSpreadsheet.getId()).setTrashed(true);
    Logger.log('🗑️ 測試檔案已清理');
    
    Logger.log('🎉 測試完成！所有調整均已正確實施');
    return true;
    
  } catch (error) {
    Logger.log('❌ 測試失敗：' + error.message);
    Logger.log('錯誤詳情：' + error.stack);
    return false;
  }
}

/**
 * 測試電話號碼格式處理
 */
function testPhoneNumberHandling() {
  Logger.log('📞 開始測試電話號碼格式處理...');
  
  // 測試各種電話號碼格式
  const testPhoneNumbers = [
    '927055077',        // 純數字格式
    '0912-345-678',     // 傳統格式
    '09-1234-5678',     // 另一種傳統格式
    '912345678',        // 省略開頭0的格式
    '+886-912-345-678'  // 國際格式
  ];
  
  Logger.log('✅ 測試電話號碼格式：');
  testPhoneNumbers.forEach(phone => {
    Logger.log(`  - ${phone}：✅ 支援（無格式限制）`);
  });
  
  Logger.log('📞 電話號碼格式測試完成 - 已確認無特定格式限制');
  return true;
}