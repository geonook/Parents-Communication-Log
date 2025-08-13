/**
 * 快速進度報告診斷工具
 * 簡化版本，專注核心問題診斷
 */

function runQuickDiagnostic() {
  console.log('🚀 開始快速進度報告診斷');
  
  const results = {
    timestamp: new Date().toLocaleString(),
    tests: [],
    overall: 'unknown'
  };
  
  // 測試 1: 資料夾存取
  console.log('📁 測試資料夾存取...');
  try {
    const folder = DriveApp.getFolderById('1ksWywUMUfsmHtUq99HdRB34obcAXhKUX');
    const folderName = folder.getName();
    results.tests.push({
      name: '資料夾存取',
      status: '✅ 成功',
      details: `資料夾名稱: ${folderName}`
    });
    console.log(`✅ 資料夾存取成功: ${folderName}`);
  } catch (error) {
    results.tests.push({
      name: '資料夾存取',
      status: '❌ 失敗',
      details: `錯誤: ${error.message}`
    });
    console.log(`❌ 資料夾存取失敗: ${error.message}`);
  }
  
  // 測試 2: getSystemMainFolder 函數
  console.log('🔧 測試 getSystemMainFolder 函數...');
  try {
    if (typeof getSystemMainFolder === 'function') {
      const systemFolder = getSystemMainFolder();
      results.tests.push({
        name: 'getSystemMainFolder 函數',
        status: '✅ 成功',
        details: `函數正常運作，返回資料夾: ${systemFolder.getName()}`
      });
      console.log(`✅ getSystemMainFolder 函數正常: ${systemFolder.getName()}`);
    } else {
      results.tests.push({
        name: 'getSystemMainFolder 函數',
        status: '❌ 失敗',
        details: '函數不存在'
      });
      console.log('❌ getSystemMainFolder 函數不存在');
    }
  } catch (error) {
    results.tests.push({
      name: 'getSystemMainFolder 函數',
      status: '❌ 失敗',
      details: `錯誤: ${error.message}`
    });
    console.log(`❌ getSystemMainFolder 函數錯誤: ${error.message}`);
  }
  
  // 測試 3: getAllTeacherBooks 函數
  console.log('📚 測試 getAllTeacherBooks 函數...');
  try {
    if (typeof getAllTeacherBooks === 'function') {
      const teacherBooks = getAllTeacherBooks();
      const count = teacherBooks ? teacherBooks.length : 0;
      results.tests.push({
        name: 'getAllTeacherBooks 函數',
        status: count > 0 ? '✅ 成功' : '⚠️ 警告',
        details: `找到 ${count} 本老師記錄簿`
      });
      console.log(`${count > 0 ? '✅' : '⚠️'} getAllTeacherBooks: 找到 ${count} 本記錄簿`);
    } else {
      results.tests.push({
        name: 'getAllTeacherBooks 函數',
        status: '❌ 失敗',
        details: '函數不存在'
      });
      console.log('❌ getAllTeacherBooks 函數不存在');
    }
  } catch (error) {
    results.tests.push({
      name: 'getAllTeacherBooks 函數',
      status: '❌ 失敗',
      details: `錯誤: ${error.message}`
    });
    console.log(`❌ getAllTeacherBooks 函數錯誤: ${error.message}`);
  }
  
  // 測試 4: PropertiesService
  console.log('💾 測試 PropertiesService...');
  try {
    const properties = PropertiesService.getScriptProperties();
    const allProps = properties.getProperties();
    const cacheCount = Object.keys(allProps).length;
    results.tests.push({
      name: 'PropertiesService',
      status: '✅ 成功',
      details: `快取項目數: ${cacheCount}`
    });
    console.log(`✅ PropertiesService 正常: ${cacheCount} 個快取項目`);
  } catch (error) {
    results.tests.push({
      name: 'PropertiesService',
      status: '❌ 失敗',
      details: `錯誤: ${error.message}`
    });
    console.log(`❌ PropertiesService 錯誤: ${error.message}`);
  }
  
  // 測試 5: generateProgressReport 函數執行
  console.log('📊 測試 generateProgressReport 函數...');
  try {
    if (typeof generateProgressReport === 'function') {
      // 嘗試執行函數
      generateProgressReport();
      results.tests.push({
        name: 'generateProgressReport 執行',
        status: '✅ 成功',
        details: '函數執行完成，沒有錯誤'
      });
      console.log('✅ generateProgressReport 執行成功');
    } else {
      results.tests.push({
        name: 'generateProgressReport 執行',
        status: '❌ 失敗',
        details: '函數不存在'
      });
      console.log('❌ generateProgressReport 函數不存在');
    }
  } catch (error) {
    results.tests.push({
      name: 'generateProgressReport 執行',
      status: '❌ 失敗',
      details: `執行錯誤: ${error.message}`
    });
    console.log(`❌ generateProgressReport 執行錯誤: ${error.message}`);
  }
  
  // 計算整體狀態
  const successCount = results.tests.filter(test => test.status.includes('✅')).length;
  const totalTests = results.tests.length;
  
  if (successCount === totalTests) {
    results.overall = '✅ 系統健康';
  } else if (successCount >= totalTests / 2) {
    results.overall = '⚠️ 部分問題';
  } else {
    results.overall = '❌ 需要修復';
  }
  
  // 輸出結果
  console.log('');
  console.log('=== 快速診斷結果 ===');
  console.log(`時間: ${results.timestamp}`);
  console.log(`整體狀態: ${results.overall}`);
  console.log(`通過測試: ${successCount}/${totalTests}`);
  console.log('');
  console.log('詳細結果:');
  results.tests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.status} ${test.name}`);
    console.log(`   ${test.details}`);
  });
  console.log('');
  
  return results;
}

/**
 * 檢查特定函數是否存在
 */
function checkFunctionExists(functionName) {
  try {
    return typeof eval(functionName) === 'function';
  } catch (error) {
    return false;
  }
}

/**
 * 測試資料夾權限
 */
function testFolderPermissions(folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    
    // 測試讀取權限
    const name = folder.getName();
    
    // 測試列出檔案權限
    const files = folder.getFiles();
    const fileCount = Array.from(files).length;
    
    return {
      success: true,
      folderName: name,
      fileCount: fileCount,
      canRead: true,
      canList: true
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      canRead: false,
      canList: false
    };
  }
}