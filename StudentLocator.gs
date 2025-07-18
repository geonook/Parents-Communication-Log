/**
 * 學生查找和定位模組
 * 提供學生資料查找、記錄定位、師生關係映射等功能
 * 支援多種查找方式：ID、姓名、班級等
 */

/**
 * 根據學生ID查找學生
 * @param {string} studentId 學生ID
 * @returns {Object} 查找結果
 */
function findStudentByID(studentId) {
  Logger.log(`🔍 根據ID查找學生：${studentId}`);
  
  try {
    // 從學生總表查找
    const masterListResult = findStudentInMasterList(studentId);
    if (masterListResult.found) {
      return {
        found: true,
        student: masterListResult.student,
        source: 'masterList',
        location: masterListResult.location
      };
    }
    
    // 從老師記錄簿查找
    const teacherBooksResult = findStudentInTeacherBooks(studentId);
    if (teacherBooksResult.found) {
      return {
        found: true,
        student: teacherBooksResult.student,
        source: 'teacherBooks',
        location: teacherBooksResult.location
      };
    }
    
    return {
      found: false,
      message: '找不到指定學生：' + studentId
    };
    
  } catch (error) {
    Logger.log('❌ 根據ID查找學生失敗：' + error.message);
    return {
      found: false,
      message: '查找過程發生錯誤：' + error.message
    };
  }
}

/**
 * 根據學生姓名查找學生
 * @param {string} name 學生姓名（中文或英文）
 * @returns {Object} 查找結果
 */
function findStudentByName(name) {
  Logger.log(`🔍 根據姓名查找學生：${name}`);
  
  try {
    const results = [];
    
    // 從學生總表查找
    const masterListResults = findStudentsByNameInMasterList(name);
    results.push(...masterListResults);
    
    // 從老師記錄簿查找
    const teacherBooksResults = findStudentsByNameInTeacherBooks(name);
    results.push(...teacherBooksResults);
    
    // 去重處理
    const uniqueResults = deduplicateStudents(results);
    
    return {
      found: uniqueResults.length > 0,
      students: uniqueResults,
      count: uniqueResults.length
    };
    
  } catch (error) {
    Logger.log('❌ 根據姓名查找學生失敗：' + error.message);
    return {
      found: false,
      message: '查找過程發生錯誤：' + error.message
    };
  }
}

/**
 * 根據班級查找學生
 * @param {string} className 班級名稱
 * @returns {Object} 查找結果
 */
function findStudentsByClass(className) {
  Logger.log(`🔍 根據班級查找學生：${className}`);
  
  try {
    const results = [];
    
    // 從學生總表查找
    const masterListResults = findStudentsByClassInMasterList(className);
    results.push(...masterListResults);
    
    // 從老師記錄簿查找
    const teacherBooksResults = findStudentsByClassInTeacherBooks(className);
    results.push(...teacherBooksResults);
    
    // 去重處理
    const uniqueResults = deduplicateStudents(results);
    
    return {
      found: uniqueResults.length > 0,
      students: uniqueResults,
      count: uniqueResults.length,
      className: className
    };
    
  } catch (error) {
    Logger.log('❌ 根據班級查找學生失敗：' + error.message);
    return {
      found: false,
      message: '查找過程發生錯誤：' + error.message
    };
  }
}

/**
 * 定位學生的所有相關記錄
 * @param {string} studentId 學生ID
 * @returns {Object} 記錄定位結果
 */
function locateStudentRecords(studentId) {
  Logger.log(`📍 定位學生所有記錄：${studentId}`);
  
  try {
    const records = {
      found: false,
      studentId: studentId,
      masterList: null,
      teacherRecords: [],
      contactRecords: []
    };
    
    // 查找學生總表記錄
    const masterListLocation = locateStudentInMasterList(studentId);
    if (masterListLocation.found) {
      records.masterList = masterListLocation;
      records.found = true;
    }
    
    // 查找老師記錄簿中的記錄
    const teacherRecords = locateStudentInAllTeacherBooks(studentId);
    if (teacherRecords.length > 0) {
      records.teacherRecords = teacherRecords;
      records.found = true;
      
      // 獲取電聯記錄
      teacherRecords.forEach(teacherRecord => {
        const contactRecords = getStudentContactRecords(studentId, teacherRecord.fileId);
        if (contactRecords.length > 0) {
          records.contactRecords.push({
            teacherName: teacherRecord.teacherName,
            fileId: teacherRecord.fileId,
            contactRecords: contactRecords
          });
        }
      });
    }
    
    Logger.log(`📍 記錄定位完成，找到 ${records.teacherRecords.length} 個老師記錄，${records.contactRecords.length} 個電聯記錄`);
    return records;
    
  } catch (error) {
    Logger.log('❌ 定位學生記錄失敗：' + error.message);
    return {
      found: false,
      message: '定位過程發生錯誤：' + error.message
    };
  }
}

/**
 * 獲取學生與老師的對應關係
 * @param {string} studentId 學生ID
 * @returns {Object} 師生關係對應
 */
function getStudentTeacherMapping(studentId) {
  Logger.log(`👥 獲取師生關係對應：${studentId}`);
  
  try {
    const mapping = {
      studentId: studentId,
      teachers: [],
      classes: []
    };
    
    const teacherBooks = getAllTeacherBooks();
    
    teacherBooks.forEach(book => {
      try {
        const studentSheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
        if (!studentSheet) return;
        
        const data = studentSheet.getDataRange().getValues();
        const headers = data[0];
        const idCol = headers.indexOf('ID') !== -1 ? headers.indexOf('ID') : headers.indexOf('Student ID');
        
        if (idCol === -1) return;
        
        for (let i = 1; i < data.length; i++) {
          if (data[i][idCol] === studentId) {
            const teacherName = extractTeacherNameFromFileName(book.getName());
            const englishClass = data[i][headers.indexOf('English Class')] || '';
            
            mapping.teachers.push(teacherName);
            if (englishClass && !mapping.classes.includes(englishClass)) {
              mapping.classes.push(englishClass);
            }
            break;
          }
        }
        
      } catch (error) {
        Logger.log(`❌ 處理老師記錄簿失敗：${error.getName()} - ${error.message}`);
      }
    });
    
    return mapping;
    
  } catch (error) {
    Logger.log('❌ 獲取師生關係對應失敗：' + error.message);
    return {
      studentId: studentId,
      teachers: [],
      classes: [],
      error: error.message
    };
  }
}

/**
 * 獲取學生的電聯記錄
 * @param {string} studentId 學生ID
 * @param {string} teacherBookId 老師記錄簿ID（可選）
 * @returns {Array} 電聯記錄列表
 */
function getStudentContactRecords(studentId, teacherBookId = null) {
  Logger.log(`📞 獲取學生電聯記錄：${studentId}`);
  
  try {
    const contactRecords = [];
    let booksToSearch = [];
    
    if (teacherBookId) {
      // 搜尋指定的老師記錄簿
      try {
        const book = SpreadsheetApp.openById(teacherBookId);
        booksToSearch = [book];
      } catch (error) {
        Logger.log(`❌ 無法開啟指定的記錄簿：${teacherBookId}`);
        return [];
      }
    } else {
      // 搜尋所有老師記錄簿
      booksToSearch = getAllTeacherBooks();
    }
    
    booksToSearch.forEach(book => {
      try {
        const contactSheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.CONTACT_LOG);
        if (!contactSheet) return;
        
        const data = contactSheet.getDataRange().getValues();
        if (data.length <= 1) return;
        
        const headers = data[0];
        const studentIdCol = headers.indexOf('Student ID');
        
        if (studentIdCol === -1) return;
        
        for (let i = 1; i < data.length; i++) {
          if (data[i][studentIdCol] === studentId) {
            const contactRecord = {};
            headers.forEach((header, index) => {
              contactRecord[header] = data[i][index];
            });
            
            contactRecord.teacherName = extractTeacherNameFromFileName(book.getName());
            contactRecord.teacherBookId = book.getId();
            contactRecord.rowIndex = i + 1;
            
            contactRecords.push(contactRecord);
          }
        }
        
      } catch (error) {
        Logger.log(`❌ 處理電聯記錄失敗：${book.getName()} - ${error.message}`);
      }
    });
    
    return contactRecords;
    
  } catch (error) {
    Logger.log('❌ 獲取學生電聯記錄失敗：' + error.message);
    return [];
  }
}

/**
 * 從學生總表查找學生
 * @param {string} studentId 學生ID
 * @returns {Object} 查找結果
 */
function findStudentInMasterList(studentId) {
  try {
    const mainFolder = getSystemMainFolder();
    const masterListFiles = mainFolder.getFilesByName('學生總表');
    
    if (!masterListFiles.hasNext()) {
      return { found: false };
    }
    
    const masterListFile = masterListFiles.next();
    const masterSheet = SpreadsheetApp.openById(masterListFile.getId());
    const sheet = masterSheet.getActiveSheet();
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { found: false };
    
    const headers = data[0];
    const idCol = headers.indexOf('ID');
    
    if (idCol === -1) return { found: false };
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === studentId) {
        const student = {};
        headers.forEach((header, index) => {
          student[header] = data[i][index];
        });
        
        return {
          found: true,
          student: student,
          location: {
            fileId: masterListFile.getId(),
            fileName: masterListFile.getName(),
            rowIndex: i + 1
          }
        };
      }
    }
    
    return { found: false };
    
  } catch (error) {
    Logger.log('❌ 從學生總表查找失敗：' + error.message);
    return { found: false };
  }
}

/**
 * 從老師記錄簿查找學生
 * @param {string} studentId 學生ID
 * @returns {Object} 查找結果
 */
function findStudentInTeacherBooks(studentId) {
  try {
    const teacherBooks = getAllTeacherBooks();
    
    for (let book of teacherBooks) {
      try {
        const studentSheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
        if (!studentSheet) continue;
        
        const data = studentSheet.getDataRange().getValues();
        if (data.length <= 1) continue;
        
        const headers = data[0];
        const idCol = headers.indexOf('ID') !== -1 ? headers.indexOf('ID') : headers.indexOf('Student ID');
        
        if (idCol === -1) continue;
        
        for (let i = 1; i < data.length; i++) {
          if (data[i][idCol] === studentId) {
            const student = {};
            headers.forEach((header, index) => {
              student[header] = data[i][index];
            });
            
            return {
              found: true,
              student: student,
              location: {
                fileId: book.getId(),
                fileName: book.getName(),
                teacherName: extractTeacherNameFromFileName(book.getName()),
                rowIndex: i + 1
              }
            };
          }
        }
        
      } catch (error) {
        Logger.log(`❌ 處理老師記錄簿失敗：${book.getName()} - ${error.message}`);
      }
    }
    
    return { found: false };
    
  } catch (error) {
    Logger.log('❌ 從老師記錄簿查找失敗：' + error.message);
    return { found: false };
  }
}

/**
 * 在學生總表中定位學生記錄
 * @param {string} studentId 學生ID
 * @returns {Object} 定位結果
 */
function locateStudentInMasterList(studentId) {
  try {
    const mainFolder = getSystemMainFolder();
    const masterListFiles = mainFolder.getFilesByName('學生總表');
    
    if (!masterListFiles.hasNext()) {
      return { found: false };
    }
    
    const masterListFile = masterListFiles.next();
    const masterSheet = SpreadsheetApp.openById(masterListFile.getId());
    const sheet = masterSheet.getActiveSheet();
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { found: false };
    
    const headers = data[0];
    const idCol = headers.indexOf('ID');
    
    if (idCol === -1) return { found: false };
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === studentId) {
        return {
          found: true,
          fileId: masterListFile.getId(),
          fileName: masterListFile.getName(),
          rowIndex: i + 1,
          columnIndex: idCol + 1
        };
      }
    }
    
    return { found: false };
    
  } catch (error) {
    Logger.log('❌ 在學生總表中定位失敗：' + error.message);
    return { found: false };
  }
}

/**
 * 在所有老師記錄簿中定位學生記錄
 * @param {string} studentId 學生ID
 * @returns {Array} 定位結果列表
 */
function locateStudentInAllTeacherBooks(studentId) {
  const locations = [];
  
  try {
    const teacherBooks = getAllTeacherBooks();
    
    teacherBooks.forEach(book => {
      try {
        const studentSheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
        if (!studentSheet) return;
        
        const data = studentSheet.getDataRange().getValues();
        if (data.length <= 1) return;
        
        const headers = data[0];
        const idCol = headers.indexOf('ID') !== -1 ? headers.indexOf('ID') : headers.indexOf('Student ID');
        
        if (idCol === -1) return;
        
        for (let i = 1; i < data.length; i++) {
          if (data[i][idCol] === studentId) {
            locations.push({
              fileId: book.getId(),
              fileName: book.getName(),
              teacherName: extractTeacherNameFromFileName(book.getName()),
              studentListRow: i + 1,
              studentListCol: idCol + 1
            });
            break;
          }
        }
        
      } catch (error) {
        Logger.log(`❌ 處理老師記錄簿失敗：${book.getName()} - ${error.message}`);
      }
    });
    
  } catch (error) {
    Logger.log('❌ 在老師記錄簿中定位失敗：' + error.message);
  }
  
  return locations;
}

/**
 * 根據姓名在學生總表中查找學生
 * @param {string} name 學生姓名
 * @returns {Array} 查找結果列表
 */
function findStudentsByNameInMasterList(name) {
  const results = [];
  
  try {
    const mainFolder = getSystemMainFolder();
    const masterListFiles = mainFolder.getFilesByName('學生總表');
    
    if (!masterListFiles.hasNext()) {
      return results;
    }
    
    const masterListFile = masterListFiles.next();
    const masterSheet = SpreadsheetApp.openById(masterListFile.getId());
    const sheet = masterSheet.getActiveSheet();
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return results;
    
    const headers = data[0];
    const chineseNameCol = headers.indexOf('Chinese Name');
    const englishNameCol = headers.indexOf('English Name');
    
    for (let i = 1; i < data.length; i++) {
      const chineseName = data[i][chineseNameCol] || '';
      const englishName = data[i][englishNameCol] || '';
      
      if (chineseName.includes(name) || englishName.toLowerCase().includes(name.toLowerCase())) {
        const student = {};
        headers.forEach((header, index) => {
          student[header] = data[i][index];
        });
        
        results.push({
          student: student,
          source: 'masterList',
          location: {
            fileId: masterListFile.getId(),
            fileName: masterListFile.getName(),
            rowIndex: i + 1
          }
        });
      }
    }
    
  } catch (error) {
    Logger.log('❌ 根據姓名在學生總表查找失敗：' + error.message);
  }
  
  return results;
}

/**
 * 根據姓名在老師記錄簿中查找學生
 * @param {string} name 學生姓名
 * @returns {Array} 查找結果列表
 */
function findStudentsByNameInTeacherBooks(name) {
  const results = [];
  
  try {
    const teacherBooks = getAllTeacherBooks();
    
    teacherBooks.forEach(book => {
      try {
        const studentSheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
        if (!studentSheet) return;
        
        const data = studentSheet.getDataRange().getValues();
        if (data.length <= 1) return;
        
        const headers = data[0];
        const chineseNameCol = headers.indexOf('Chinese Name');
        const englishNameCol = headers.indexOf('English Name');
        
        for (let i = 1; i < data.length; i++) {
          const chineseName = data[i][chineseNameCol] || '';
          const englishName = data[i][englishNameCol] || '';
          
          if (chineseName.includes(name) || englishName.toLowerCase().includes(name.toLowerCase())) {
            const student = {};
            headers.forEach((header, index) => {
              student[header] = data[i][index];
            });
            
            results.push({
              student: student,
              source: 'teacherBooks',
              location: {
                fileId: book.getId(),
                fileName: book.getName(),
                teacherName: extractTeacherNameFromFileName(book.getName()),
                rowIndex: i + 1
              }
            });
          }
        }
        
      } catch (error) {
        Logger.log(`❌ 處理老師記錄簿失敗：${book.getName()} - ${error.message}`);
      }
    });
    
  } catch (error) {
    Logger.log('❌ 根據姓名在老師記錄簿查找失敗：' + error.message);
  }
  
  return results;
}

/**
 * 根據班級在學生總表中查找學生
 * @param {string} className 班級名稱
 * @returns {Array} 查找結果列表
 */
function findStudentsByClassInMasterList(className) {
  const results = [];
  
  try {
    const mainFolder = getSystemMainFolder();
    const masterListFiles = mainFolder.getFilesByName('學生總表');
    
    if (!masterListFiles.hasNext()) {
      return results;
    }
    
    const masterListFile = masterListFiles.next();
    const masterSheet = SpreadsheetApp.openById(masterListFile.getId());
    const sheet = masterSheet.getActiveSheet();
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return results;
    
    const headers = data[0];
    const englishClassCol = headers.indexOf('English Class');
    
    if (englishClassCol === -1) return results;
    
    for (let i = 1; i < data.length; i++) {
      const englishClass = data[i][englishClassCol] || '';
      
      if (englishClass === className) {
        const student = {};
        headers.forEach((header, index) => {
          student[header] = data[i][index];
        });
        
        results.push({
          student: student,
          source: 'masterList',
          location: {
            fileId: masterListFile.getId(),
            fileName: masterListFile.getName(),
            rowIndex: i + 1
          }
        });
      }
    }
    
  } catch (error) {
    Logger.log('❌ 根據班級在學生總表查找失敗：' + error.message);
  }
  
  return results;
}

/**
 * 根據班級在老師記錄簿中查找學生
 * @param {string} className 班級名稱
 * @returns {Array} 查找結果列表
 */
function findStudentsByClassInTeacherBooks(className) {
  const results = [];
  
  try {
    const teacherBooks = getAllTeacherBooks();
    
    teacherBooks.forEach(book => {
      try {
        const studentSheet = book.getSheetByName(SYSTEM_CONFIG.SHEET_NAMES.STUDENT_LIST);
        if (!studentSheet) return;
        
        const data = studentSheet.getDataRange().getValues();
        if (data.length <= 1) return;
        
        const headers = data[0];
        const englishClassCol = headers.indexOf('English Class');
        
        if (englishClassCol === -1) return;
        
        for (let i = 1; i < data.length; i++) {
          const englishClass = data[i][englishClassCol] || '';
          
          if (englishClass === className) {
            const student = {};
            headers.forEach((header, index) => {
              student[header] = data[i][index];
            });
            
            results.push({
              student: student,
              source: 'teacherBooks',
              location: {
                fileId: book.getId(),
                fileName: book.getName(),
                teacherName: extractTeacherNameFromFileName(book.getName()),
                rowIndex: i + 1
              }
            });
          }
        }
        
      } catch (error) {
        Logger.log(`❌ 處理老師記錄簿失敗：${book.getName()} - ${error.message}`);
      }
    });
    
  } catch (error) {
    Logger.log('❌ 根據班級在老師記錄簿查找失敗：' + error.message);
  }
  
  return results;
}

/**
 * 去除重複的學生記錄
 * @param {Array} students 學生記錄列表
 * @returns {Array} 去重後的學生記錄列表
 */
function deduplicateStudents(students) {
  const seen = new Set();
  const unique = [];
  
  students.forEach(record => {
    const studentId = record.student.ID || record.student['Student ID'];
    if (studentId && !seen.has(studentId)) {
      seen.add(studentId);
      unique.push(record);
    }
  });
  
  return unique;
}

/**
 * 從檔案名稱提取老師姓名
 * @param {string} fileName 檔案名稱
 * @returns {string} 老師姓名
 */
function extractTeacherNameFromFileName(fileName) {
  try {
    // 假設檔案名稱格式為：老師姓名_電聯記錄簿_學年
    const parts = fileName.split('_');
    return parts[0] || '未知老師';
  } catch (error) {
    Logger.log('❌ 提取老師姓名失敗：' + error.message);
    return '未知老師';
  }
}

/**
 * 獲取學生基本資料
 * @param {string} studentId 學生ID
 * @returns {Object} 學生基本資料
 */
function getStudentBasicData(studentId) {
  try {
    const studentResult = findStudentByID(studentId);
    if (studentResult.found) {
      return studentResult.student;
    }
    return null;
  } catch (error) {
    Logger.log('❌ 獲取學生基本資料失敗：' + error.message);
    return null;
  }
}

/**
 * 獲取學生姓名
 * @param {string} studentId 學生ID
 * @returns {string} 學生姓名
 */
function getStudentName(studentId) {
  try {
    const student = getStudentBasicData(studentId);
    if (student) {
      return student['Chinese Name'] || student['English Name'] || studentId;
    }
    return studentId;
  } catch (error) {
    Logger.log('❌ 獲取學生姓名失敗：' + error.message);
    return studentId;
  }
}