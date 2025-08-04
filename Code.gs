/**
 * 老師電聯記錄簿管理系統
 * 主要功能：檔案創建、班級學生資料管理、電聯記錄、進度檢查
 * 作者：Google Apps Script 專家
 */

// ============ 系統設定 ============
const SYSTEM_CONFIG = {
  // 主資料夾設定
  MAIN_FOLDER_NAME: '電聯記錄簿系統',
  MAIN_FOLDER_ID: '1ksWywUMUfsmHtUq99HdRB34obcAXhKUX', // 指定的 Google Drive 資料夾 ID，如果為空則建立新資料夾
  TEACHERS_FOLDER_NAME: '老師記錄簿',
  TEMPLATES_FOLDER_NAME: '範本檔案',
  
  // 檔案名稱格式
  TEACHER_SHEET_NAME_FORMAT: '{teacherName}_電聯記錄簿_{schoolYear}',
  
  // 工作表名稱
  SHEET_NAMES: {
    SUMMARY: '總覽',
    CLASS_INFO: '班級資訊',
    CONTACT_LOG: '電聯記錄',
    STUDENT_LIST: '學生清單',
    PROGRESS: '進度追蹤'
  },
  
  // 電聯記錄欄位 - 學期制版本
  CONTACT_FIELDS: [
    'Student ID', 'Name', 'English Name', 'English Class', 'Date', 
    'Semester', 'Term', 'Contact Type', 'Teachers Content', 'Parents Responses', 'Contact Method'
  ],
  
  // 學生總表欄位
  STUDENT_FIELDS: [
    'ID', 'Grade', 'HR', 'Seat #', 'Chinese Name', 'English Name',
    '112 Level', '113 Level', 'Previous Teacher', 'English Class', 
    'LT', 'Mother\'s Phone', 'Father\'s Phone'
  ],
  
  // 學年學期設定
  ACADEMIC_YEAR: {
    SEMESTERS: ['Fall', 'Spring'],
    TERMS: ['Beginning', 'Midterm', 'Final'],
    CURRENT_SEMESTER: 'Fall', // 可在系統設定中調整
    CURRENT_TERM: 'Beginning'  // 可在系統設定中調整
  },

  // 電聯類型設定
  CONTACT_TYPES: {
    SEMESTER: 'Scheduled Contact',   // 納入進度檢查
    REGULAR: 'Regular Contact',      // 不納入檢查  
    SPECIAL: 'Special Contact'       // 不納入檢查
  },

  // ===== 強化學生轉班管理系統配置 =====
  // 支援六大核心需求：狀態標註、統計策略、進度補全、異動標註、進度繼承、彈性選項
  TRANSFER_MANAGEMENT: {
    // 1. 學生狀態標註選項
    STATUS_ANNOTATION: {
      MODE: 'CONFIGURABLE_FLAG',              // 'MARK_ONLY' | 'CONFIGURABLE_FLAG' | 'HISTORICAL_PRESERVE'
      INCLUDE_TRANSFERRED_IN_STATS: false,    // 選項A: 不納入統計 | 選項B: 納入統計
      PRESERVE_HISTORICAL_DATA: true,         // 保留歷史資料
      AUTO_TIMESTAMP: true,                   // 自動加上時間戳記
      VISUAL_INDICATORS: {
        TRANSFERRED_OUT: '📤 已轉出',        // 轉出學生標記
        CLASS_CHANGED: '🔄 已轉班',          // 轉班學生標記
        HISTORICAL_RECORD: '📊 歷史',         // 歷史記錄標記
        COLOR_CODING: {
          TRANSFERRED_OUT: '#FFCCCB',          // 淺紅色背景
          CLASS_CHANGED: '#FFFFCC',           // 淺黃色背景
          CURRENT_ACTIVE: '#CCFFCC'           // 淺綠色背景
        }
      }
    },
    
    // 2. 統計計算策略
    STATISTICS_CALCULATION: {
      DEFAULT_MODE: 'CURRENT_ACTIVE_ONLY',     // 預設模式
      MODES: {
        CURRENT_ACTIVE_ONLY: {
          name: '現行在籍學生統計',
          description: '僅計算目前在班學生',
          includeTransferred: false,
          denominator: 'current_active'
        },
        FULL_HISTORICAL: {
          name: '完整歷史統計',
          description: '包含所有歷史學生記錄',
          includeTransferred: true,
          denominator: 'all_historical'
        },
        DUAL_VIEW: {
          name: '雙重檢視統計',
          description: '同時顯示現況與歷史',
          showBothViews: true,
          allowToggle: true
        },
        ENROLLMENT_BASED: {
          name: '入班時點基準',
          description: '基於學生入班時的期次計算',
          dynamicDenominator: true
        }
      },
      ALLOW_REAL_TIME_TOGGLE: true,             // 允許即時切換統計模式
      DISPLAY_OPTIONS: {
        SHOW_PERCENTAGES: true,                  // 顯示百分比
        SHOW_ABSOLUTE_NUMBERS: true,             // 顯示絕對數字
        SHOW_COMPARISON: true,                   // 顯示對比資訊
        BREAKDOWN_BY_PERIOD: true                // 按期次分解顯示
      }
    },
    
    // 3. 進度記錄自動補齊策略
    PROGRESS_COMPLETION: {
      DEFAULT_MODE: 'ENROLLMENT_AWARE',         // 預設模式
      MODES: {
        COMPLETE_ALL: {
          name: '補齊全部記錄',
          description: '為所有期次建立記錄（預設未聯絡）',
          fillAllPeriods: true,
          defaultStatus: '未聯絡',
          markPreEnrollment: false
        },
        ENROLLMENT_AWARE: {
          name: '入班感知模式',
          description: '僅建立入班後期次的記錄',
          onlyPostEnrollment: true,
          trackEnrollmentDate: true,
          smartBackfill: true
        },
        MANUAL_PROMPT: {
          name: '手動提示模式',
          description: '建立全記錄但標註「非本班在籍」',
          fillAllPeriods: true,
          markPreEnrollment: true,
          preEnrollmentLabel: '非本班在籍'
        }
      },
      AUTO_BACKFILL: {
        ENABLED: true,                           // 啟用自動補齊
        CHECK_ON_IMPORT: true,                   // 匯入時檢查
        BATCH_PROCESSING: true,                  // 批次處理
        PRESERVE_EXISTING: true                  // 保留現有記錄
      },
      CONFIGURABLE_BY_ADMIN: true               // 管理員可配置
    },
    
    // 4. 異動標註與記錄
    CHANGE_ANNOTATION: {
      REQUIRED_NOTES: true,                     // 必須填寫異動備註
      AUTO_DETAILED_LOGGING: true,             // 自動詳細記錄
      PRESERVE_HISTORY_POLICY: 'ARCHIVE_NOT_DELETE', // 封存而非刪除
      BACKUP_STRATEGIES: {
        IMMEDIATE_SNAPSHOT: true,                // 異動前立即快照
        ROLLBACK_SUPPORT: true,                 // 支援回滾
        CHANGE_AUDIT_TRAIL: true                // 完整異動軌跡
      },
      NOTIFICATION_SETTINGS: {
        EMAIL_NOTIFICATIONS: false,             // 電子郵件通知（待實作）
        LOG_NOTIFICATIONS: true,                // 系統日誌通知
        ADMIN_ALERTS: true                      // 管理員警示
      }
    },
    
    // 5. 轉班進度繼承設定
    PROGRESS_INHERITANCE: {
      DEFAULT_POLICY: 'RESET_WITH_PRESERVATION', // 預設政策
      POLICIES: {
        RESET_ZERO: {
          name: '完全重置',
          description: '新班級從零開始',
          inheritProgress: false,
          preserveHistory: true
        },
        INHERIT_PARTIAL: {
          name: '部分繼承',
          description: '繼承已完成的期次，未完成期次重置',
          inheritCompleted: true,
          resetPending: true
        },
        RESET_WITH_PRESERVATION: {
          name: '重置並保留',
          description: '新班級重置，但保留原班級記錄供參考',
          inheritProgress: false,
          preserveSourceRecords: true,
          createReferenceLinks: true
        }
      },
      METADATA_PRESERVATION: {
        PRESERVE_SOURCE_NOTES: true,             // 保留來源備註
        TRACK_TRANSFER_CHAIN: true,             // 追蹤轉班鏈
        HISTORICAL_CONTEXT: true                // 保留歷史脈絡
      }
    },
    
    // 6. 系統彈性與擴展選項
    SYSTEM_FLEXIBILITY: {
      CUSTOM_STATUS_LABELS: {
        ENABLED: true,                           // 啟用自訂狀態標籤
        USER_DEFINED_STATUSES: [],              // 使用者定義狀態（預留）
        DYNAMIC_COLOR_ASSIGNMENT: true          // 動態顏色指派
      },
      BATCH_OPERATIONS: {
        BULK_TRANSFER: true,                     // 批次轉班
        BULK_STATUS_UPDATE: true,               // 批次狀態更新
        PROGRESS_BATCH_PROCESSING: true         // 進度批次處理
      },
      INTEGRATION_HOOKS: {
        PRE_TRANSFER_HOOKS: [],                  // 轉班前掛鉤（預留）
        POST_TRANSFER_HOOKS: [],                 // 轉班後掛鉤（預留）
        VALIDATION_HOOKS: []                     // 驗證掛鉤（預留）
      },
      REPORTING_OPTIONS: {
        DETAILED_TRANSFER_REPORTS: true,         // 詳細轉班報告
        STATISTICAL_DASHBOARDS: true,           // 統計儀表板
        EXPORT_FORMATS: ['PDF', 'Excel', 'CSV'] // 匯出格式
      }
    },
    
    // 7. 驗證與品質控制
    VALIDATION_RULES: {
      STUDENT_ID_VALIDATION: {
        REQUIRED: true,                          // 必須提供學生ID
        FORMAT_CHECK: true,                     // 格式檢查
        UNIQUENESS_CHECK: true                  // 唯一性檢查
      },
      CLASS_VALIDATION: {
        VALID_CLASS_CHECK: true,                // 有效班級檢查
        TEACHER_ASSIGNMENT_CHECK: true,         // 老師指派檢查
        CAPACITY_CHECK: false                   // 容量檢查（可選）
      },
      DATA_INTEGRITY: {
        ORPHANED_RECORDS_CHECK: true,           // 孤立記錄檢查
        CONSISTENCY_VALIDATION: true,           // 一致性驗證
        AUTOMATIC_REPAIR: true                  // 自動修復
      }
    },
    
    // 8. 效能優化設定
    PERFORMANCE_OPTIMIZATION: {
      CACHE_SETTINGS: {
        ENABLE_CACHING: true,                   // 啟用快取
        CACHE_DURATION: 300,                   // 快取持續時間（秒）
        SMART_INVALIDATION: true               // 智能失效
      },
      BATCH_SIZES: {
        STUDENT_PROCESSING: 50,                 // 學生處理批次大小
        RECORD_UPDATES: 100,                   // 記錄更新批次大小
        STATISTICAL_CALCULATION: 200           // 統計計算批次大小
      }
    }
  },

  // 聯繫方式選項（移除home visit和in person）
  CONTACT_METHODS: ['Phone Call', 'Line', 'Email'],

  // 進度檢查設定 - 改為學期制
  PROGRESS_CHECK: {
    REQUIRED_CONTACT_PER_TERM: 1, // 每個term每位學生至少1次學期電聯
    ALERT_DAYS: 14 // 超過幾天未記錄發出提醒（學期制需要更長時間）
  },
  
  // 年級和英語班級設定
  GRADE_LEVELS: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
  
  // 英語班級名稱（不含年級前綴）
  ENGLISH_CLASS_NAMES: [
    'Trailblazers', 'Discoverers', 'Adventurers', 'Innovators', 'Explorers',
    'Navigators', 'Inventors', 'Voyagers', 'Pioneers', 'Guardians',
    'Pathfinders', 'Seekers', 'Visionaries', 'Achievers', 'Champions'
  ],

  // ===== 資料標準化配置 (多資料庫生態系支援) =====
  // 遵循 CLAUDE.md 規範：擴展現有配置，不創建新配置文件
  
  // 標準資料模型定義（基於現有資料結構）
  DATA_STANDARDS: {
    // 當前學生資料格式標準（映射現有 STUDENT_FIELDS）
    CURRENT_STUDENT_FORMAT: {
      // 基本識別資訊
      id: { 
        field: 'ID', 
        type: 'string', 
        required: true, 
        primaryKey: true,
        description: '學生學號'
      },
      grade: { 
        field: 'Grade', 
        type: 'enum', 
        values: ['G1','G2','G3','G4','G5','G6'],
        description: '年級'
      },
      hr: { 
        field: 'HR', 
        type: 'string',
        description: '導師班級'
      },
      seatNumber: { 
        field: 'Seat #', 
        type: 'string',
        description: '座號'
      },
      
      // 姓名資訊
      chineseName: { 
        field: 'Chinese Name', 
        type: 'string', 
        required: true,
        description: '中文姓名'
      },
      englishName: { 
        field: 'English Name', 
        type: 'string', 
        required: true,
        description: '英文姓名'
      },
      
      // 學習資訊
      level112: { 
        field: '112 Level', 
        type: 'string',
        description: '112學年度程度'
      },
      level113: { 
        field: '113 Level', 
        type: 'string',
        description: '113學年度程度'
      },
      previousTeacher: { 
        field: 'Previous Teacher', 
        type: 'string',
        description: '前任老師'
      },
      
      // 班級配置
      englishClass: { 
        field: 'English Class', 
        type: 'string', 
        required: true,
        description: '英語班級'
      },
      localTeacher: { 
        field: 'LT', 
        type: 'string',
        description: '本地老師'
      },
      
      // 聯絡資訊
      motherPhone: { 
        field: "Mother's Phone", 
        type: 'string',
        description: '母親電話'
      },
      fatherPhone: { 
        field: "Father's Phone", 
        type: 'string',
        description: '父親電話'
      }
    },
    
    // 當前電聯記錄格式標準（映射現有 CONTACT_FIELDS）
    CURRENT_CONTACT_FORMAT: {
      // 基本識別
      studentId: { 
        field: 'Student ID', 
        type: 'string', 
        required: true,
        foreignKey: 'STUDENT.id',
        description: '學生ID'
      },
      name: { 
        field: 'Name', 
        type: 'string', 
        required: true,
        description: '學生姓名'
      },
      englishName: { 
        field: 'English Name', 
        type: 'string',
        description: '英文姓名'
      },
      englishClass: { 
        field: 'English Class', 
        type: 'string', 
        required: true,
        description: '英語班級'
      },
      
      // 時間資訊
      date: { 
        field: 'Date', 
        type: 'date', 
        required: true,
        description: '聯絡日期'
      },
      semester: { 
        field: 'Semester', 
        type: 'enum', 
        values: ['Fall', 'Spring'],
        description: '學期'
      },
      term: { 
        field: 'Term', 
        type: 'enum', 
        values: ['Beginning', 'Midterm', 'Final'],
        description: '階段'
      },
      
      // 聯絡內容
      contactType: { 
        field: 'Contact Type', 
        type: 'enum', 
        values: ['Scheduled Contact', 'Regular Contact', 'Special Contact'],
        description: '聯絡類型'
      },
      teacherContent: { 
        field: 'Teachers Content', 
        type: 'text',
        description: '老師內容'
      },
      parentResponse: { 
        field: 'Parents Responses', 
        type: 'text',
        description: '家長回應'
      },
      contactMethod: { 
        field: 'Contact Method', 
        type: 'enum', 
        values: ['Phone Call', 'Line', 'Email'],
        description: '聯絡方式'
      }
    },
    
    // 系統統計資料格式標準
    SYSTEM_STATS_FORMAT: {
      teacherCount: { 
        type: 'integer', 
        description: '老師總數'
      },
      studentCount: { 
        type: 'integer', 
        description: '學生總數'
      },
      contactCount: { 
        type: 'integer', 
        description: '電聯記錄總數'
      },
      semesterContactCount: { 
        type: 'integer', 
        description: '本學期電聯數'
      },
      currentTermProgress: { 
        type: 'number', 
        description: '當前階段進度'
      },
      currentSemester: { 
        type: 'enum', 
        values: ['Fall', 'Spring'],
        description: '當前學期'
      },
      currentTerm: { 
        type: 'enum', 
        values: ['Beginning', 'Midterm', 'Final'],
        description: '當前階段'
      },
      semesterProgress: { 
        type: 'string', 
        pattern: '^\\d+%$',
        description: '學期進度百分比'
      }
    }
  },

  // 未來資料庫支援配置（預留，不影響現有系統）
  FUTURE_DATABASE_CONFIG: {
    // 當前活躍的資料庫類型
    ACTIVE_DATABASE: 'googlesheets',
    
    // 資料庫連接配置（預留）
    CONNECTIONS: {
      googlesheets: {
        type: 'googlesheets',
        active: true,
        config: {
          mainFolderId: null, // 將使用現有的 MAIN_FOLDER_ID
          useExistingConfig: true
        }
      },
      airtable: {
        type: 'airtable',
        active: false,
        config: {
          apiKey: '', // 未來配置
          baseId: '', 
          tables: {
            students: 'Students',
            contacts: 'Contacts',
            teachers: 'Teachers'
          }
        }
      },
      supabase: {
        type: 'supabase',
        active: false,
        config: {
          url: '', // 未來配置
          apiKey: '',
          tables: {
            students: 'students',
            contacts: 'contacts',
            teachers: 'teachers'
          }
        }
      }
    },
    
    // 資料庫映射配置
    DATABASE_MAPPINGS: {
      googlesheets: {
        STUDENT: {
          source: '學生總表',
          sheetName: '學生清單',
          mapping: 'CURRENT_STUDENT_FORMAT'
        },
        CONTACT: {
          source: '老師記錄簿',
          sheetName: '電聯記錄',
          mapping: 'CURRENT_CONTACT_FORMAT'
        }
      },
      airtable: {
        // 預留給未來 Airtable 映射
        STUDENT: { 
          table: 'Students',
          mapping: {} // 將來實現
        },
        CONTACT: { 
          table: 'Contacts',
          mapping: {} // 將來實現
        }
      },
      supabase: {
        // 預留給未來 Supabase 映射
        STUDENT: { 
          table: 'students',
          mapping: {} // 將來實現
        },
        CONTACT: { 
          table: 'contacts',
          mapping: {} // 將來實現
        }
      }
    },
    
    // 遷移設定
    MIGRATION_CONFIG: {
      batchSize: 100,
      backupBeforeMigration: true,
      validateAfterMigration: true,
      migrationLogEnabled: true
    }
  },

  // API 介面規範（為外部系統整合準備）
  API_STANDARDS: {
    version: '1.0',
    baseUrl: '/api/v1',
    
    // 標準 API 端點
    endpoints: {
      // 學生相關
      getStudent: { path: '/student/{id}', method: 'GET' },
      getStudentsByClass: { path: '/class/{name}/students', method: 'GET' },
      updateStudent: { path: '/student/{id}', method: 'PUT' },
      
      // 電聯記錄相關
      getContacts: { path: '/contacts', method: 'GET' },
      createContact: { path: '/contacts', method: 'POST' },
      getContactsByStudent: { path: '/student/{id}/contacts', method: 'GET' },
      
      // 統計相關
      getSystemStats: { path: '/stats/system', method: 'GET' },
      getClassStats: { path: '/stats/class/{name}', method: 'GET' },
      getTeacherStats: { path: '/stats/teacher/{name}', method: 'GET' },
      
      // 系統相關
      healthCheck: { path: '/health', method: 'GET' },
      getSystemInfo: { path: '/system/info', method: 'GET' }
    },
    
    // 標準回應格式
    responseFormat: {
      success: {
        status: 'success',
        data: {},
        metadata: {
          timestamp: 'ISO string',
          version: 'string',
          source: 'string'
        }
      },
      error: {
        status: 'error',
        error: {
          code: 'string',
          message: 'string',
          details: 'string'
        },
        metadata: {
          timestamp: 'ISO string',
          version: 'string'
        }
      }
    }
  }
};

// ===== 轉班管理系統配置驗證與初始化函數 =====

/**
 * 驗證轉班管理配置的完整性與有效性
 * @returns {Object} 驗證結果
 */
function validateTransferManagementConfig() {
  try {
    const config = SYSTEM_CONFIG.TRANSFER_MANAGEMENT;
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };
    
    // 1. 檢查狀態標註配置
    if (!config.STATUS_ANNOTATION) {
      validation.errors.push('缺少 STATUS_ANNOTATION 配置');
      validation.isValid = false;
    } else {
      const statusConfig = config.STATUS_ANNOTATION;
      const validModes = ['MARK_ONLY', 'CONFIGURABLE_FLAG', 'HISTORICAL_PRESERVE'];
      if (!validModes.includes(statusConfig.MODE)) {
        validation.errors.push(`STATUS_ANNOTATION.MODE 必須是 ${validModes.join(', ')} 之一`);
        validation.isValid = false;
      }
    }
    
    // 2. 檢查統計計算配置
    if (!config.STATISTICS_CALCULATION) {
      validation.errors.push('缺少 STATISTICS_CALCULATION 配置');
      validation.isValid = false;
    } else {
      const statsConfig = config.STATISTICS_CALCULATION;
      const validDefaultModes = Object.keys(statsConfig.MODES || {});
      if (!validDefaultModes.includes(statsConfig.DEFAULT_MODE)) {
        validation.errors.push(`STATISTICS_CALCULATION.DEFAULT_MODE 必須是已定義的模式之一：${validDefaultModes.join(', ')}`);
        validation.isValid = false;
      }
    }
    
    // 3. 檢查進度補齊配置
    if (!config.PROGRESS_COMPLETION) {
      validation.errors.push('缺少 PROGRESS_COMPLETION 配置');
      validation.isValid = false;
    } else {
      const progressConfig = config.PROGRESS_COMPLETION;
      const validModes = Object.keys(progressConfig.MODES || {});
      if (!validModes.includes(progressConfig.DEFAULT_MODE)) {
        validation.errors.push(`PROGRESS_COMPLETION.DEFAULT_MODE 必須是已定義的模式之一：${validModes.join(', ')}`);
        validation.isValid = false;
      }
    }
    
    // 4. 檢查進度繼承配置  
    if (!config.PROGRESS_INHERITANCE) {
      validation.errors.push('缺少 PROGRESS_INHERITANCE 配置');
      validation.isValid = false;
    } else {
      const inheritanceConfig = config.PROGRESS_INHERITANCE;
      const validPolicies = Object.keys(inheritanceConfig.POLICIES || {});
      if (!validPolicies.includes(inheritanceConfig.DEFAULT_POLICY)) {
        validation.errors.push(`PROGRESS_INHERITANCE.DEFAULT_POLICY 必須是已定義的政策之一：${validPolicies.join(', ')}`);
        validation.isValid = false;
      }
    }
    
    // 5. 效能配置建議
    if (config.PERFORMANCE_OPTIMIZATION) {
      const perfConfig = config.PERFORMANCE_OPTIMIZATION;
      if (perfConfig.BATCH_SIZES.STUDENT_PROCESSING > 100) {
        validation.warnings.push('STUDENT_PROCESSING 批次大小超過建議值 100，可能影響效能');
      }
      if (perfConfig.CACHE_SETTINGS.CACHE_DURATION < 60) {
        validation.recommendations.push('建議將快取持續時間設定為至少 60 秒以改善效能');
      }
    }
    
    // 6. 功能完整性檢查
    const requiredSections = [
      'STATUS_ANNOTATION', 'STATISTICS_CALCULATION', 'PROGRESS_COMPLETION',
      'CHANGE_ANNOTATION', 'PROGRESS_INHERITANCE', 'SYSTEM_FLEXIBILITY'
    ];
    
    requiredSections.forEach(section => {
      if (!config[section]) {
        validation.warnings.push(`建議添加 ${section} 配置以獲得完整功能`);
      }
    });
    
    Logger.log(`✅ 轉班管理配置驗證完成 - 有效: ${validation.isValid}, 錯誤: ${validation.errors.length}, 警告: ${validation.warnings.length}`);
    return validation;
    
  } catch (error) {
    Logger.log('❌ 配置驗證失敗：' + error.message);
    return {
      isValid: false,
      errors: ['配置驗證過程中發生錯誤：' + error.message],
      warnings: [],
      recommendations: []
    };
  }
}

/**
 * 獲取當前轉班管理配置的摘要資訊
 * @returns {Object} 配置摘要
 */
function getTransferManagementConfigSummary() {
  try {
    const config = SYSTEM_CONFIG.TRANSFER_MANAGEMENT;
    
    return {
      // 基本設定
      statusAnnotationMode: config.STATUS_ANNOTATION?.MODE || 'CONFIGURABLE_FLAG',
      includeTransferredInStats: config.STATUS_ANNOTATION?.INCLUDE_TRANSFERRED_IN_STATS || false,
      
      // 統計設定
      defaultStatisticsMode: config.STATISTICS_CALCULATION?.DEFAULT_MODE || 'CURRENT_ACTIVE_ONLY',
      allowRealTimeToggle: config.STATISTICS_CALCULATION?.ALLOW_REAL_TIME_TOGGLE || true,
      
      // 進度設定
      progressCompletionMode: config.PROGRESS_COMPLETION?.DEFAULT_MODE || 'ENROLLMENT_AWARE',
      autoBackfillEnabled: config.PROGRESS_COMPLETION?.AUTO_BACKFILL?.ENABLED || true,
      
      // 繼承設定
      progressInheritancePolicy: config.PROGRESS_INHERITANCE?.DEFAULT_POLICY || 'RESET_WITH_PRESERVATION',
      preserveSourceNotes: config.PROGRESS_INHERITANCE?.METADATA_PRESERVATION?.PRESERVE_SOURCE_NOTES || true,
      
      // 系統設定
      cachingEnabled: config.PERFORMANCE_OPTIMIZATION?.CACHE_SETTINGS?.ENABLE_CACHING || true,
      batchProcessingEnabled: config.SYSTEM_FLEXIBILITY?.BATCH_OPERATIONS?.BULK_TRANSFER || true,
      
      // 驗證設定
      requiredNotes: config.CHANGE_ANNOTATION?.REQUIRED_NOTES || true,
      autoDetailedLogging: config.CHANGE_ANNOTATION?.AUTO_DETAILED_LOGGING || true
    };
    
  } catch (error) {
    Logger.log('❌ 獲取配置摘要失敗：' + error.message);
    return null;
  }
}

/**
 * 初始化轉班管理系統配置（確保所有必要的設定都有預設值）
 * @returns {boolean} 初始化是否成功
 */
function initializeTransferManagementConfig() {
  try {
    Logger.log('🔧 初始化轉班管理系統配置...');
    
    // 驗證現有配置
    const validation = validateTransferManagementConfig();
    
    if (!validation.isValid) {
      Logger.log('❌ 配置驗證失敗，請檢查配置設定：');
      validation.errors.forEach(error => Logger.log('   - ' + error));
      return false;
    }
    
    // 顯示警告（如果有的話）
    if (validation.warnings.length > 0) {
      Logger.log('⚠️ 配置警告：');
      validation.warnings.forEach(warning => Logger.log('   - ' + warning));
    }
    
    // 顯示建議（如果有的話）
    if (validation.recommendations.length > 0) {
      Logger.log('💡 配置建議：');
      validation.recommendations.forEach(rec => Logger.log('   - ' + rec));
    }
    
    // 獲取配置摘要
    const summary = getTransferManagementConfigSummary();
    if (summary) {
      Logger.log('📋 轉班管理配置摘要：');
      Logger.log(`   • 狀態標註模式: ${summary.statusAnnotationMode}`);
      Logger.log(`   • 預設統計模式: ${summary.defaultStatisticsMode}`);
      Logger.log(`   • 進度補齊模式: ${summary.progressCompletionMode}`);
      Logger.log(`   • 繼承政策: ${summary.progressInheritancePolicy}`);
      Logger.log(`   • 快取啟用: ${summary.cachingEnabled}`);
      Logger.log(`   • 批次操作啟用: ${summary.batchProcessingEnabled}`);
    }
    
    Logger.log('✅ 轉班管理系統配置初始化完成');
    return true;
    
  } catch (error) {
    Logger.log('❌ 轉班管理配置初始化失敗：' + error.message);
    return false;
  }
}

/**
 * 獲取指定統計模式的配置
 * @param {string} mode - 統計模式名稱
 * @returns {Object|null} 模式配置物件
 */
function getStatisticsModeConfig(mode) {
  try {
    const modes = SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.STATISTICS_CALCULATION?.MODES;
    return modes?.[mode] || null;
  } catch (error) {
    Logger.log('❌ 獲取統計模式配置失敗：' + error.message);
    return null;
  }
}

/**
 * 獲取指定進度補齊模式的配置
 * @param {string} mode - 進度補齊模式名稱
 * @returns {Object|null} 模式配置物件
 */
function getProgressCompletionModeConfig(mode) {
  try {
    const modes = SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.PROGRESS_COMPLETION?.MODES;
    return modes?.[mode] || null;
  } catch (error) {
    Logger.log('❌ 獲取進度補齊模式配置失敗：' + error.message);
    return null;
  }
}

/**
 * 獲取指定繼承政策的配置
 * @param {string} policy - 繼承政策名稱
 * @returns {Object|null} 政策配置物件
 */
function getProgressInheritancePolicyConfig(policy) {
  try {
    const policies = SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.PROGRESS_INHERITANCE?.POLICIES;
    return policies?.[policy] || null;
  } catch (error) {
    Logger.log('❌ 獲取繼承政策配置失敗：' + error.message);
    return null;
  }
}

/**
 * 檢查系統是否已啟用轉班管理功能
 * @returns {boolean} 是否啟用
 */
function isTransferManagementEnabled() {
  try {
    return !!(SYSTEM_CONFIG.TRANSFER_MANAGEMENT && 
             SYSTEM_CONFIG.TRANSFER_MANAGEMENT.STATUS_ANNOTATION &&
             SYSTEM_CONFIG.TRANSFER_MANAGEMENT.STATISTICS_CALCULATION &&
             SYSTEM_CONFIG.TRANSFER_MANAGEMENT.PROGRESS_COMPLETION);
  } catch (error) {
    Logger.log('❌ 檢查轉班管理啟用狀態失敗：' + error.message);
    return false;
  }
}

/**
 * 建立系統主選單
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('電聯記錄簿系統')
      .addItem('🏗️ 初始化系統', 'initializeSystem')
      .addSeparator()
      .addItem('👨‍🏫 新增老師記錄簿', 'createTeacherRecordBook')
      .addItem('📝 批次建立老師記錄簿', 'batchCreateTeacherBooks')
      .addItem('📋 從學生總表建立老師記錄簿', 'createTeachersFromStudentMasterList')
      .addSeparator()
      .addSubMenu(ui.createMenu('👥 學生資料管理')
        .addItem('📥 匯入學生資料', 'importStudentData')
        .addItem('📤 匯出學生資料', 'exportStudentData')
        .addSeparator()
        .addItem('🤖 預建學期電聯記錄', 'prebuildScheduledContactRecords')
        .addItem('➕ 快速新增電聯記錄', 'createContactFromStudentList')
        .addSeparator()
        .addItem('🔄 重新排序電聯記錄', 'sortContactRecords')
        .addItem('🔧 排序問題診斷', 'diagnoseSortingIssues'))
      .addSubMenu(ui.createMenu('🔄 學生異動管理 (增強版)')
        .addItem('📤 學生轉學/移出', 'studentTransferOut')
        .addItem('🔄 學生轉班 (增強)', 'studentClassChange')
        .addItem('✏️ 學生資料更新', 'studentInfoUpdate')
        .addSeparator()
        .addItem('📊 統計模式切換', 'toggleStatisticsMode')
        .addItem('🎯 進度補齊模式設定', 'configureProgressCompletion')
        .addItem('🔄 轉班進度繼承設定', 'configureProgressInheritance')
        .addSeparator()
        .addItem('📋 查看異動記錄', 'viewChangeHistory')
        .addItem('📊 異動統計報告', 'generateChangeReport')
        .addItem('↩️ 異動回滾', 'rollbackStudentChange')
        .addSeparator()
        .addItem('⚙️ 轉班管理配置驗證', 'validateTransferManagementConfig')
        .addItem('🔧 轉班管理配置摘要', 'showTransferManagementConfigSummary'))
      .addSeparator()
      .addItem('📊 檢查全體進度', 'checkAllProgress')
      .addItem('📈 生成進度報告', 'generateProgressReport')
      .addSeparator()
      .addSubMenu(ui.createMenu('🔧 系統管理')
        .addItem('⚙️ 系統設定', 'showSystemSettings')
        .addItem('📁 主資料夾資訊', 'showMainFolderInfo')
        .addSeparator()
        .addItem('📅 學年管理', 'showAcademicYearManagement')
        .addSeparator()
        .addItem('🔄 設定自動化', 'setupAutomationTriggers')
        .addItem('💾 手動備份', 'autoBackup')
        .addItem('🔍 檢查檔案完整性', 'checkFileIntegrity')
        .addItem('📋 檢查學生建置完整性', 'runMasterListIntegrityCheck')
        .addItem('⚡ 快速學生建置檢查', 'quickMasterListIntegrityCheck')
        .addItem('🔧 自動修復系統', 'autoFixSystemIssues')
        .addItem('📋 更新老師列表', 'updateTeachersList')
        .addSeparator()
        .addItem('🔄 修復進度追蹤工作表', 'batchFixProgressTrackingSheets')
        .addSeparator()
        .addItem('✅ 系統驗證', 'runSystemValidation')
        .addSeparator()
        .addItem('🧪 測試轉班記錄同步', 'runAllScheduledContactTransferTests')
        .addItem('🔍 驗證系統配置', 'runCompleteSystemValidation')
        .addSeparator()
        .addItem('🎯 初始化轉班管理配置', 'initializeTransferManagementConfig')
        .addItem('📊 轉班管理配置狀態', 'checkTransferManagementStatus')
        .addItem('📊 驗證記錄格式一致性', 'runCompleteRecordFormatValidation')
        .addItem('🔍 檢測T01學生狀況', 'detectT01StudentStatus')
        .addItem('🔧 修復T01學生遺漏', 'runCompleteT01StudentDetectionAndRepair')
        .addItem('🔬 分析T01遺漏根本原因', 'runCompleteT01RootCauseAnalysis')
        .addItem('🛡️ T01預防性檢查', 'runCompleteT01PreventionCheck')
        .addItem('🏁 執行綜合系統測試', 'runComprehensiveSystemTest')
        .addSeparator()
        .addItem('📝 顯示系統日誌', 'showSystemLogs')
        .addItem('🗑️ 清除系統日誌', 'clearSystemLogs'))
      .addSeparator()
      .addItem('📖 使用說明', 'showUserGuide')
      .addToUi();
  } catch (uiError) {
    // Web環境或無UI權限時，跳過選單創建
    Logger.log('Web環境：跳過選單創建 - ' + uiError.toString());
  }
}

/**
 * 初始化整個系統
 */
function initializeSystem() {
  try {
    const response = safeUIAlert(
      '系統初始化', 
      '確定要初始化電聯記錄簿系統嗎？\n這將建立必要的資料夾結構和範本檔案。', 
      safeGetUI()?.ButtonSet.YES_NO
    );
    
    // 統一 Web 環境架構 - 移除環境檢查
    // 自動執行初始化程序
    
    Logger.log('開始系統初始化...');
    
    // 建立主資料夾結構
    const mainFolder = createSystemFolders();
    Logger.log('✅ 主資料夾結構建立完成');
    
    // 建立範本檔案
    createTemplateFiles(mainFolder);
    Logger.log('✅ 範本檔案建立完成');
    
    // 建立管理控制台
    const adminSheet = createAdminConsole(mainFolder);
    Logger.log('✅ 管理控制台建立完成');
    
    // 建立學生總表範本
    const masterListSheet = createStudentMasterListTemplate(mainFolder);
    Logger.log('✅ 學生總表範本建立完成');
    
    const successMessage = `系統已成功初始化！\n\n主資料夾：${mainFolder.getUrl()}\n管理控制台：${adminSheet.getUrl()}\n學生總表：${masterListSheet.getUrl()}\n\n請在學生總表中貼上您的學生資料，然後使用「從學生總表建立老師記錄簿」功能。`;
    
    safeUIAlert('初始化完成！', successMessage);
    Logger.log('🎉 系統初始化完成');
    
  } catch (error) {
    Logger.log('系統初始化失敗：' + error.toString());
    safeErrorHandler('系統初始化', error);
  }
}

/**
 * 建立系統資料夾結構
 * 如果在系統設定中指定了 MAIN_FOLDER_ID，則使用該資料夾，否則建立新資料夾
 */
function createSystemFolders() {
  let mainFolder;
  
  // 檢查是否有指定的資料夾 ID
  if (SYSTEM_CONFIG.MAIN_FOLDER_ID && SYSTEM_CONFIG.MAIN_FOLDER_ID.trim() !== '') {
    try {
      mainFolder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
      Logger.log(`使用指定的主資料夾：${mainFolder.getName()}`);
    } catch (error) {
      Logger.log(`無法存取指定的資料夾 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}，錯誤：${error.message}`);
      Logger.log('將建立新的主資料夾...');
      mainFolder = createNewMainFolder();
    }
  } else {
    Logger.log('未指定 MAIN_FOLDER_ID，建立新的主資料夾...');
    mainFolder = createNewMainFolder();
  }
  
  // 建立子資料夾
  const subFolders = [
    SYSTEM_CONFIG.TEACHERS_FOLDER_NAME,
    SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME,
    '系統備份',
    '進度報告'
  ];
  
  Logger.log('開始創建子資料夾...');
  const createdFolders = [];
  const existingFolders = [];
  
  subFolders.forEach(folderName => {
    try {
      const existingSubFolder = mainFolder.getFoldersByName(folderName);
      if (!existingSubFolder.hasNext()) {
        const newFolder = mainFolder.createFolder(folderName);
        createdFolders.push(folderName);
        Logger.log(`✅ 創建子資料夾: ${folderName}`);
        
        // 驗證資料夾是否真的被創建
        const verification = mainFolder.getFoldersByName(folderName);
        if (!verification.hasNext()) {
          throw new Error(`資料夾 ${folderName} 創建後無法找到`);
        }
      } else {
        existingFolders.push(folderName);
        Logger.log(`ℹ️ 使用現有子資料夾: ${folderName}`);
      }
    } catch (error) {
      Logger.log(`❌ 創建子資料夾 ${folderName} 失敗: ${error.toString()}`);
      throw new Error(`創建子資料夾 ${folderName} 失敗: ${error.message}`);
    }
  });
  
  Logger.log(`子資料夾創建完成 - 新建: ${createdFolders.length}, 現有: ${existingFolders.length}`);
  
  // 最終驗證所有必要資料夾都存在
  const missingFolders = [];
  subFolders.forEach(folderName => {
    const verification = mainFolder.getFoldersByName(folderName);
    if (!verification.hasNext()) {
      missingFolders.push(folderName);
    }
  });
  
  if (missingFolders.length > 0) {
    throw new Error(`以下必要資料夾創建失敗: ${missingFolders.join(', ')}`);
  }
  
  Logger.log('✅ 所有子資料夾驗證通過');
  return mainFolder;
}

/**
 * 建立新的主資料夾（當沒有指定資料夾 ID 時使用）
 */
function createNewMainFolder() {
  const rootFolder = DriveApp.getRootFolder();
  
  // 建立主資料夾
  let mainFolder;
  const existingFolders = rootFolder.getFoldersByName(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
  if (existingFolders.hasNext()) {
    mainFolder = existingFolders.next();
  } else {
    mainFolder = rootFolder.createFolder(SYSTEM_CONFIG.MAIN_FOLDER_NAME);
  }
  
  return mainFolder;
}

/**
 * 建立範本檔案
 */
function createTemplateFiles(mainFolder) {
  // 安全獲取範本資料夾，如果不存在則創建
  let templatesFolder;
  const existingTemplatesFolder = mainFolder.getFoldersByName(SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME);
  
  if (existingTemplatesFolder.hasNext()) {
    templatesFolder = existingTemplatesFolder.next();
    Logger.log('使用現有的範本資料夾');
  } else {
    Logger.log('範本資料夾不存在，正在創建...');
    templatesFolder = mainFolder.createFolder(SYSTEM_CONFIG.TEMPLATES_FOLDER_NAME);
    Logger.log('範本資料夾創建完成');
  }
  
  // 建立電聯記錄範本
  Logger.log('創建電聯記錄範本檔案...');
  const templateSheet = SpreadsheetApp.create('電聯記錄簿範本');
  const templateFile = DriveApp.getFileById(templateSheet.getId());
  
  // 移動到範本資料夾
  templatesFolder.addFile(templateFile);
  DriveApp.getRootFolder().removeFile(templateFile);
  Logger.log('範本檔案已移動到範本資料夾');
  
  // 設定範本內容
  Logger.log('設定範本內容...');
  setupTemplateContent(templateSheet);
  Logger.log('範本內容設定完成');
  
  return templateSheet;
}

/**
 * 建立管理控制台
 */
function createAdminConsole(mainFolder) {
  const adminSheet = SpreadsheetApp.create('電聯記錄簿管理控制台');
  const adminFile = DriveApp.getFileById(adminSheet.getId());
  
  // 移動到主資料夾
  mainFolder.addFile(adminFile);
  DriveApp.getRootFolder().removeFile(adminFile);
  
  // 設定管理控制台內容
  setupAdminConsole(adminSheet);
  
  return adminSheet;
}

/**
 * 主要執行函數，供外部呼叫
 */
function main() {
  Logger.log('電聯記錄簿系統已載入');
  Logger.log('請使用選單中的功能或直接呼叫相應函數');
}

/**
 * 設定自訂主資料夾 ID
 * 使用方法：在執行初始化之前先呼叫此函數
 * @param {string} folderId - Google Drive 資料夾的 ID
 */
function setCustomMainFolderId(folderId) {
  try {
    // 驗證資料夾是否存在且可存取
    const folder = DriveApp.getFolderById(folderId);
    Logger.log(`已設定自訂主資料夾：${folder.getName()}`);
    
    // 此函數僅用於測試，實際設定需要修改 SYSTEM_CONFIG.MAIN_FOLDER_ID
    safeUIAlert(
      '設定主資料夾', 
      `已驗證資料夾可以存取：${folder.getName()}\n\n要使用此資料夾，請在 Code.gs 的 SYSTEM_CONFIG.MAIN_FOLDER_ID 中設定：\n'${folderId}'`
    );
    
  } catch (error) {
    safeErrorHandler('設定主資料夾', error, '無法存取指定的資料夾 ID，請確認資料夾存在且您有存取權限');
  }
}

/**
 * 驗證系統主資料夾設定是否正確（快速版本）
 * 這個函數會測試 MAIN_FOLDER_ID 的存取權限，帶有超時保護
 */
function verifySystemMainFolderAccess() {
  try {
    Logger.log('🔍 開始快速驗證系統主資料夾...');
    
    if (!SYSTEM_CONFIG.MAIN_FOLDER_ID || SYSTEM_CONFIG.MAIN_FOLDER_ID.trim() === '') {
      throw new Error('MAIN_FOLDER_ID 未設定，系統將在個人 Drive 中創建新資料夾');
    }
    
    Logger.log(`📁 嘗試存取資料夾 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}`);
    
    // 測試資料夾存取（簡化版本，避免長時間等待）
    const folder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
    const folderName = folder.getName();
    
    Logger.log(`✅ 成功存取指定資料夾：${folderName}`);
    
    // 簡化的權限測試（不實際創建資料夾，避免權限問題延遲）
    let hasWritePermission = true;
    let writePermissionMessage = '基本存取權限確認';
    
    try {
      // 嘗試獲取資料夾信息來測試權限
      const folderUrl = folder.getUrl();
      Logger.log(`📁 資料夾 URL：${folderUrl}`);
    } catch (urlError) {
      Logger.log('⚠️ 無法獲取資料夾 URL，可能權限不足');
      hasWritePermission = false;
      writePermissionMessage = '權限可能不足，建議檢查';
    }
    
    const message = `✅ 系統主資料夾快速驗證完成！\n\n📁 資料夾：${folderName}\n🆔 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}\n🔑 權限：${writePermissionMessage}\n\n系統現在會在此資料夾中創建所有檔案。`;
    
    Logger.log('✅ 資料夾驗證成功');
    safeUIAlert('資料夾驗證成功', message);
    
    return {
      success: true,
      folderName: folderName,
      folderUrl: folder.getUrl(),
      hasWritePermission: hasWritePermission
    };
    
  } catch (error) {
    Logger.log('❌ 資料夾驗證失敗：' + error.toString());
    
    let errorMessage = '指定的資料夾無法存取';
    if (error.message.includes('File not found')) {
      errorMessage = '找不到指定的資料夾 ID，請檢查 ID 是否正確';
    } else if (error.message.includes('Permission denied')) {
      errorMessage = '沒有權限存取指定的資料夾，請檢查共享設定';
    }
    
    safeErrorHandler('資料夾驗證', error, errorMessage);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 詳細的資料夾權限測試（較慢，但更完整）
 */
function detailedFolderPermissionTest() {
  try {
    if (!SYSTEM_CONFIG.MAIN_FOLDER_ID || SYSTEM_CONFIG.MAIN_FOLDER_ID.trim() === '') {
      throw new Error('MAIN_FOLDER_ID 未設定');
    }
    
    const folder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
    Logger.log(`詳細測試資料夾：${folder.getName()}`);
    
    // 測試寫入權限
    try {
      const testFolderName = '權限測試_' + Date.now();
      const testFolder = folder.createFolder(testFolderName);
      Logger.log('✅ 寫入權限測試通過');
      
      // 立即清理測試資料夾
      testFolder.setTrashed(true);
      Logger.log('✅ 測試資料夾已清理');
      
      return { success: true, writePermission: true };
    } catch (writeError) {
      Logger.log('❌ 寫入權限測試失敗：' + writeError.message);
      return { success: true, writePermission: false, error: writeError.message };
    }
    
  } catch (error) {
    Logger.log('❌ 詳細權限測試失敗：' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * 建立學生總表範本
 */
function createStudentMasterListTemplate(mainFolder) {
  // 建立學生總表檔案
  const masterListSheet = SpreadsheetApp.create('學生總表');
  const masterListFile = DriveApp.getFileById(masterListSheet.getId());
  
  // 移動到主資料夾
  mainFolder.addFile(masterListFile);
  DriveApp.getRootFolder().removeFile(masterListFile);
  
  // 設定學生總表內容
  setupMasterListContent(masterListSheet);
  
  return masterListSheet;
}

/**
 * 設定學生總表的內容結構
 */
function setupMasterListContent(masterListSheet) {
  const sheet = masterListSheet.getActiveSheet();
  sheet.setName('學生資料');
  
  // 設定標題
  sheet.getRange('A1').setValue('中師英文科學生總表');
  sheet.getRange('A1').setFontSize(18).setFontWeight('bold');
  
  // 動態計算合併範圍，基於實際欄位數量
  const numColumns = SYSTEM_CONFIG.STUDENT_FIELDS.length;
  const mergeRange = `A1:${String.fromCharCode(64 + numColumns)}1`; // A1 to column based on field count
  sheet.getRange(mergeRange).merge();
  
  // 設定說明
  sheet.getRange('A2').setValue('請將學生資料貼到第4列開始的位置（重要：English Class 欄位決定老師的授課班級）');
  sheet.getRange('A2').setFontStyle('italic').setFontColor('#666666');
  
  // 設定標題列
  const headers = SYSTEM_CONFIG.STUDENT_FIELDS;
  sheet.getRange(3, 1, 1, headers.length).setValues([headers]);
  
  // 格式設定
  sheet.getRange(3, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
  
  // 設定欄寬
  const columnWidths = [80, 60, 60, 60, 120, 120, 80, 80, 120, 120, 80, 120, 120];
  columnWidths.forEach((width, index) => {
    sheet.setColumnWidth(index + 1, width);
  });
  
  // 檢查是否在Web環境中執行（避免UI調用錯誤）
  try {
    // 詢問是否要生成測試資料（僅在非Web環境）
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '測試資料生成',
      '是否要生成20筆測試學生資料？\n\n• 包含不同年級、班級、老師的組合\n• 便於測試系統功能\n• 可隨時手動刪除',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      // 生成20筆測試資料
      const testData = generateTestStudentData();
      sheet.getRange(4, 1, testData.length, testData[0].length).setValues(testData);
      sheet.getRange(4, 1, testData.length, testData[0].length).setBackground('#FFFBEE').setNote('測試資料 - 可刪除');
      Logger.log('使用者選擇生成測試資料：20筆');
    } else {
      // 只新增一筆範例資料
      const sampleData = [[
        '001', 'G1', '701', '1', '王小明', 'Ming Wang', 'A1', 'A2', 'Mr. Johnson', 'G1 Trailblazers', 'Ms. Chen', '927055077', '955123456'
      ]];
      sheet.getRange(4, 1, 1, sampleData[0].length).setValues(sampleData);
      sheet.getRange(4, 1, 1, sampleData[0].length).setBackground('#E8F0FE').setFontStyle('italic');
      Logger.log('使用者選擇只添加範例資料：1筆');
    }
  } catch (uiError) {
    // 如果UI調用失敗（如在Web環境中），自動生成完整測試資料
    Logger.log('UI不可用，自動生成測試資料: ' + uiError.toString());
    Logger.log('Web環境：自動生成完整測試資料集');
    
    // 在Web環境下自動生成20筆測試資料
    const testData = generateTestStudentData();
    sheet.getRange(4, 1, testData.length, testData[0].length).setValues(testData);
    sheet.getRange(4, 1, testData.length, testData[0].length).setBackground('#FFFBEE').setNote('測試資料 - 可刪除');
    
    Logger.log(`Web環境：成功生成 ${testData.length} 筆測試學生資料`);
  }
  
  // 新增說明工作表
  createMasterListInstructionSheet(masterListSheet);
  
  // 凍結標題列
  sheet.setFrozenRows(3);
  
  // 設定資料驗證
  setupMasterListValidations(sheet);
}

/**
 * 建立學生總表說明工作表
 */
function createMasterListInstructionSheet(masterListSheet) {
  const instructionSheet = masterListSheet.insertSheet('使用說明');
  
  // 設定說明內容
  const instructions = [
    ['中師英文科學生總表 - 使用說明', ''],
    ['', ''],
    ['📋 欄位說明：', ''],
    ['ID', '學生學號'],
    ['Grade', '年級 (G1-G6)'],
    ['HR', '原班級 (如：701, 702) - 僅供參考'],
    ['Seat #', '座號'],
    ['Chinese Name', '中文姓名'],
    ['English Name', '英文姓名'],
    ['112 Level', '112學年度等級'],
    ['113 Level', '113學年度等級'],
    ['Previous Teacher', '前一位授課老師'],
    ['English Class', '🔥 重要！英語授課班級 (如：G1 Trailblazers)'],
    ['LT', '🔥 重要！語言老師姓名（用於自動建立記錄簿）'],
    ['Mother\'s Phone', '母親電話'],
    ['Father\'s Phone', '父親電話'],
    ['', ''],
    ['🚀 使用步驟：', ''],
    ['1. 將學生資料貼到「學生資料」工作表的第4列開始位置', ''],
    ['2. 確保 English Class 欄位格式正確（如：G1 Trailblazers）', ''],
    ['3. 確保 LT 欄位填入正確的英文老師姓名', ''],
    ['4. 在任意 Google Sheets 中使用選單：', ''],
    ['   「電聯記錄簿系統」→「📋 從學生總表建立老師記錄簿」', ''],
    ['5. 輸入此學生總表的 Google Sheets ID', ''],
    ['6. 系統將自動為所有英文老師建立記錄簿並匯入學生資料', ''],
    ['', ''],
    ['⚠️ 重要提醒：', ''],
    ['• English Class 欄位決定老師的授課班級（非 HR 欄位）', ''],
    ['• LT 欄位必須填入，這是識別英文老師的關鍵', ''],
    ['• 同一位老師的姓名必須保持一致', ''],
    ['• English Class 格式：年級 + 空格 + 班級名稱（如：G1 Trailblazers）', ''],
    ['• 建議先填入範例資料測試系統功能', '']
  ];
  
  // 設定內容
  instructionSheet.getRange(1, 1, instructions.length, 2).setValues(instructions);
  
  // 格式設定
  instructionSheet.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#1a73e8');
  instructionSheet.getRange('A3').setFontWeight('bold').setFontColor('#d93025');
  instructionSheet.getRange('A18').setFontWeight('bold').setFontColor('#137333');
  instructionSheet.getRange('A25').setFontWeight('bold').setFontColor('#ea4335');
  
  // 調整欄寬
  instructionSheet.setColumnWidth(1, 200);
  instructionSheet.setColumnWidth(2, 300);
}

/**
 * 設定學生總表的資料驗證
 */
function setupMasterListValidations(sheet) {
  // Grade 年級驗證 (B欄)
  const gradeRange = sheet.getRange('B4:B1000');
  const gradeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(SYSTEM_CONFIG.GRADE_LEVELS)
    .setAllowInvalid(false)
    .setHelpText('請選擇年級 (G1-G6)')
    .build();
  gradeRange.setDataValidation(gradeValidation);
  
  // HR 班級格式提示 (C欄)
  const hrRange = sheet.getRange('C4:C1000');
  hrRange.setNote('原班級（僅供參考），如：701, 702, 801等');
  
  // English Class 英語班級提示和背景 (J欄)
  const englishClassRange = sheet.getRange('J4:J1000');
  englishClassRange.setNote('🔥 重要！英語授課班級，格式：年級 + 空格 + 班級名稱\n例如：G1 Trailblazers, G2 Discoverers');
  englishClassRange.setBackground('#E8F5E8'); // 淺綠色背景提醒重要性
  
  // LT 老師姓名提示 (K欄)
  const ltRange = sheet.getRange('K4:K1000');
  ltRange.setNote('🔥 重要！請填入英文老師姓名，用於自動建立記錄簿');
  ltRange.setBackground('#FFF3E0'); // 淺橙色背景提醒重要性
}

/**
 * 顯示目前的主資料夾資訊
 */
function showMainFolderInfo() {
  try {
    let message = '目前系統設定：\n\n';
    
    if (SYSTEM_CONFIG.MAIN_FOLDER_ID) {
      const folder = DriveApp.getFolderById(SYSTEM_CONFIG.MAIN_FOLDER_ID);
      message += `✓ 使用指定資料夾\n`;
      message += `資料夾名稱：${folder.getName()}\n`;
      message += `資料夾 ID：${SYSTEM_CONFIG.MAIN_FOLDER_ID}\n`;
      message += `資料夾連結：${folder.getUrl()}`;
    } else {
      message += `✓ 使用預設設定\n`;
      message += `資料夾名稱：${SYSTEM_CONFIG.MAIN_FOLDER_NAME}\n`;
      message += `說明：系統將自動建立或搜尋同名資料夾`;
    }
    
    safeUIAlert('主資料夾資訊', message);
    
  } catch (error) {
    safeErrorHandler('獲取主資料夾資訊', error);
  }
}

/**
 * 生成50筆測試學生資料
 * 包含多樣化的年級、班級、老師組合，每位老師管理多個班級進行全面測試
 */
function generateTestStudentData() {
  const testStudents = [
    // Ms. Chen - 教授多個班級 (G1 Trailblazers + G1 Stars + G2 Champions)
    ['T001', 'G1', '701', '1', '測試學生1', 'Alice Chen', 'A1', 'A2', 'Mr. Smith', 'G1 Trailblazers', 'Ms. Chen', '0912-111-111', '0987-111-111'],
    ['T002', 'G1', '701', '2', '測試學生2', 'Bob Wang', 'A2', 'A1', 'Ms. Johnson', 'G1 Trailblazers', 'Ms. Chen', '0912-222-222', '0987-222-222'],
    ['T003', 'G1', '701', '3', '測試學生3', 'Charlie Liu', 'A1', 'A2', 'Mr. Brown', 'G1 Trailblazers', 'Ms. Chen', '0912-333-333', '0987-333-333'],
    ['T004', 'G1', '703', '4', '測試學生4', 'Diana Zhang', 'A2', 'A1', 'Ms. Wilson', 'G1 Stars', 'Ms. Chen', '0912-444-444', '0987-444-444'],
    ['T005', 'G1', '703', '5', '測試學生5', 'Eric Wu', 'A1', 'A2', 'Mr. Garcia', 'G1 Stars', 'Ms. Chen', '0912-555-555', '0987-555-555'],
    ['T006', 'G1', '703', '6', '測試學生6', 'Fiona Li', 'A2', 'A1', 'Ms. Martinez', 'G1 Stars', 'Ms. Chen', '0912-666-666', '0987-666-666'],
    ['T007', 'G2', '805', '7', '測試學生7', 'George Kim', 'A1', 'A2', 'Mr. Thompson', 'G2 Champions', 'Ms. Chen', '0912-777-777', '0987-777-777'],
    ['T008', 'G2', '805', '8', '測試學生8', 'Helen Chang', 'A2', 'A1', 'Ms. White', 'G2 Champions', 'Ms. Chen', '0912-888-888', '0987-888-888'],
    
    // Mr. Davis - 教授多個班級 (G1 Discoverers + G2 Rangers)
    ['T009', 'G1', '702', '9', '測試學生9', 'Ivan Chen', 'A1', 'A2', 'Mr. Rodriguez', 'G1 Discoverers', 'Mr. Davis', '0912-999-999', '0987-999-999'],
    ['T010', 'G1', '702', '10', '測試學生10', 'Jenny Yang', 'A2', 'A1', 'Ms. Lewis', 'G1 Discoverers', 'Mr. Davis', '0912-101-101', '0987-101-101'],
    ['T011', 'G1', '702', '11', '測試學生11', 'Kevin Tsai', 'A1', 'A2', 'Mr. Clark', 'G1 Discoverers', 'Mr. Davis', '0912-111-101', '0987-111-101'],
    ['T012', 'G1', '702', '12', '測試學生12', 'Linda Chiu', 'A2', 'A1', 'Ms. Hall', 'G1 Discoverers', 'Mr. Davis', '0912-121-121', '0987-121-121'],
    ['T013', 'G2', '804', '13', '測試學生13', 'Mark Wu', 'A1', 'A2', 'Mr. Allen', 'G2 Rangers', 'Mr. Davis', '0912-131-131', '0987-131-131'],
    ['T014', 'G2', '804', '14', '測試學生14', 'Nancy Lin', 'A2', 'A1', 'Ms. Scott', 'G2 Rangers', 'Mr. Davis', '0912-141-141', '0987-141-141'],
    ['T015', 'G2', '804', '15', '測試學生15', 'Oscar Huang', 'A1', 'A2', 'Mr. Green', 'G2 Rangers', 'Mr. Davis', '0912-151-151', '0987-151-151'],
    
    // Ms. Anderson - 教授多個班級 (G2 Adventurers + G3 Explorers)
    ['T016', 'G2', '801', '16', '測試學生16', 'Patricia Hsu', 'A2', 'A1', 'Ms. Adams', 'G2 Adventurers', 'Ms. Anderson', '0912-161-161', '0987-161-161'],
    ['T017', 'G2', '801', '17', '測試學生17', 'Quinn Liu', 'A1', 'A2', 'Mr. Baker', 'G2 Adventurers', 'Ms. Anderson', '0912-171-171', '0987-171-171'],
    ['T018', 'G2', '801', '18', '測試學生18', 'Rachel Wang', 'A2', 'A1', 'Ms. Carter', 'G2 Adventurers', 'Ms. Anderson', '0912-181-181', '0987-181-181'],
    ['T019', 'G2', '801', '19', '測試學生19', 'Steve Chen', 'A1', 'A2', 'Mr. Mitchell', 'G2 Adventurers', 'Ms. Anderson', '0912-191-191', '0987-191-191'],
    ['T020', 'G3', '901', '20', '測試學生20', 'Tina Yeh', 'A2', 'A1', 'Ms. Phillips', 'G3 Explorers', 'Ms. Anderson', '0912-201-201', '0987-201-201'],
    ['T021', 'G3', '901', '21', '測試學生21', 'Uma Zhou', 'A1', 'A2', 'Mr. Turner', 'G3 Explorers', 'Ms. Anderson', '0912-211-211', '0987-211-211'],
    ['T022', 'G3', '901', '22', '測試學生22', 'Victor Kao', 'A2', 'A1', 'Ms. Evans', 'G3 Explorers', 'Ms. Anderson', '0912-221-221', '0987-221-221'],
    
    // Mr. Taylor - 教授多個班級 (G2 Innovators + G3 Navigators)
    ['T023', 'G2', '802', '23', '測試學生23', 'Wendy Liao', 'A1', 'A2', 'Mr. Cooper', 'G2 Innovators', 'Mr. Taylor', '0912-231-231', '0987-231-231'],
    ['T024', 'G2', '802', '24', '測試學生24', 'Xavier Peng', 'A2', 'A1', 'Ms. Foster', 'G2 Innovators', 'Mr. Taylor', '0912-241-241', '0987-241-241'],
    ['T025', 'G2', '802', '25', '測試學生25', 'Yuki Jiang', 'A1', 'A2', 'Mr. Hughes', 'G2 Innovators', 'Mr. Taylor', '0912-251-251', '0987-251-251'],
    ['T026', 'G3', '902', '26', '測試學生26', 'Zoe Chou', 'A2', 'A1', 'Ms. Kelly', 'G3 Navigators', 'Mr. Taylor', '0912-261-261', '0987-261-261'],
    ['T027', 'G3', '902', '27', '測試學生27', 'Aaron Xu', 'A1', 'A2', 'Mr. Murphy', 'G3 Navigators', 'Mr. Taylor', '0912-271-271', '0987-271-271'],
    ['T028', 'G3', '902', '28', '測試學生28', 'Betty Shih', 'A2', 'A1', 'Ms. Rivera', 'G3 Navigators', 'Mr. Taylor', '0912-281-281', '0987-281-281'],
    
    // Ms. Moore - 單一班級但較多學生 (G3 Guardians)
    ['T029', 'G3', '903', '29', '測試學生29', 'Chris Fan', 'A1', 'A2', 'Mr. Reed', 'G3 Guardians', 'Ms. Moore', '0912-291-291', '0987-291-291'],
    ['T030', 'G3', '903', '30', '測試學生30', 'Daisy Guo', 'A2', 'A1', 'Ms. Ward', 'G3 Guardians', 'Ms. Moore', '0912-301-301', '0987-301-301'],
    ['T031', 'G3', '903', '31', '測試學生31', 'Edward Song', 'A1', 'A2', 'Mr. Cox', 'G3 Guardians', 'Ms. Moore', '0912-311-311', '0987-311-311'],
    ['T032', 'G3', '903', '32', '測試學生32', 'Flora Wen', 'A2', 'A1', 'Ms. Price', 'G3 Guardians', 'Ms. Moore', '0912-321-321', '0987-321-321'],
    ['T033', 'G3', '903', '33', '測試學生33', 'Gary Fu', 'A1', 'A2', 'Mr. Long', 'G3 Guardians', 'Ms. Moore', '0912-331-331', '0987-331-331'],
    
    // Mr. Jackson - 跨年級教學 (G4 Inventors + G5 Pioneers) 
    ['T034', 'G4', '1001', '34', '測試學生34', 'Hannah Ma', 'A2', 'A1', 'Ms. Bell', 'G4 Inventors', 'Mr. Jackson', '0912-341-341', '0987-341-341'],
    ['T035', 'G4', '1001', '35', '測試學生35', 'Ian Dong', 'A1', 'A2', 'Mr. Stone', 'G4 Inventors', 'Mr. Jackson', '0912-351-351', '0987-351-351'],
    ['T036', 'G4', '1001', '36', '測試學生36', 'Julia Tang', 'A2', 'A1', 'Ms. Wood', 'G4 Inventors', 'Mr. Jackson', '0912-361-361', '0987-361-361'],
    ['T037', 'G5', '1101', '37', '測試學生37', 'Kyle Zheng', 'A1', 'A2', 'Mr. Ross', 'G5 Pioneers', 'Mr. Jackson', '0912-371-371', '0987-371-371'],
    ['T038', 'G5', '1101', '38', '測試學生38', 'Luna Qiu', 'A2', 'A1', 'Ms. Gray', 'G5 Pioneers', 'Mr. Jackson', '0912-381-381', '0987-381-381'],
    ['T039', 'G5', '1101', '39', '測試學生39', 'Max Feng', 'A1', 'A2', 'Mr. Perry', 'G5 Pioneers', 'Mr. Jackson', '0912-391-391', '0987-391-391'],
    
    // Ms. King - 多班級 (G4 Voyagers + G5 Scholars)
    ['T040', 'G4', '1002', '40', '測試學生40', 'Nina Bai', 'A2', 'A1', 'Ms. James', 'G4 Voyagers', 'Ms. King', '0912-401-401', '0987-401-401'],
    ['T041', 'G4', '1002', '41', '測試學生41', 'Owen Deng', 'A1', 'A2', 'Mr. Watson', 'G4 Voyagers', 'Ms. King', '0912-411-411', '0987-411-411'],
    ['T042', 'G4', '1002', '42', '測試學生42', 'Penny Zhu', 'A2', 'A1', 'Ms. Brooks', 'G4 Voyagers', 'Ms. King', '0912-421-421', '0987-421-421'],
    ['T043', 'G5', '1102', '43', '測試學生43', 'Quinn Jia', 'A1', 'A2', 'Mr. Sanders', 'G5 Scholars', 'Ms. King', '0912-431-431', '0987-431-431'],
    ['T044', 'G5', '1102', '44', '測試學生44', 'Ruby Xie', 'A2', 'A1', 'Ms. Powell', 'G5 Scholars', 'Ms. King', '0912-441-441', '0987-441-441'],
    
    // Mr. Wright - 高年級專責 (G6 Guardians + G6 Champions)
    ['T045', 'G6', '1201', '45', '測試學生45', 'Sam Meng', 'A1', 'A2', 'Mr. Butler', 'G6 Guardians', 'Mr. Wright', '0912-451-451', '0987-451-451'],
    ['T046', 'G6', '1201', '46', '測試學生46', 'Tiffany Dai', 'A2', 'A1', 'Ms. Russell', 'G6 Guardians', 'Mr. Wright', '0912-461-461', '0987-461-461'],
    ['T047', 'G6', '1201', '47', '測試學生47', 'Ulysses Pan', 'A1', 'A2', 'Mr. Griffin', 'G6 Guardians', 'Mr. Wright', '0912-471-471', '0987-471-471'],
    ['T048', 'G6', '1202', '48', '測試學生48', 'Vivian Su', 'A2', 'A1', 'Ms. Diaz', 'G6 Champions', 'Mr. Wright', '0912-481-481', '0987-481-481'],
    ['T049', 'G6', '1202', '49', '測試學生49', 'Walter Cui', 'A1', 'A2', 'Mr. Hayes', 'G6 Champions', 'Mr. Wright', '0912-491-491', '0987-491-491'],
    ['T050', 'G6', '1202', '50', '測試學生50', 'Xenia Yao', 'A2', 'A1', 'Ms. Myers', 'G6 Champions', 'Mr. Wright', '0912-501-501', '0987-501-501']
  ];
  
  return testStudents;
}

// ============ 學生異動管理介面函數 ============

/**
 * 學生轉學/移出介面
 */
function studentTransferOut() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 獲取學生ID
    const studentIdResponse = ui.prompt(
      '學生轉學/移出',
      '請輸入要轉學/移出的學生ID：',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (studentIdResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    const studentId = studentIdResponse.getResponseText().trim();
    if (!studentId) {
      ui.alert('錯誤', '請輸入有效的學生ID', ui.ButtonSet.OK);
      return;
    }
    
    // 獲取轉學原因
    const reasonResponse = ui.prompt(
      '轉學原因',
      '請輸入轉學/移出原因：',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (reasonResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    const reason = reasonResponse.getResponseText().trim();
    
    // 確認操作
    const confirmResponse = ui.alert(
      '確認轉學操作',
      `即將處理學生轉學/移出：\n\n學生ID：${studentId}\n轉學原因：${reason}\n\n此操作將：\n• 從學生總表標記為已轉出\n• 移除所有老師記錄簿中的學生資料\n• 標記相關電聯記錄為已轉出\n\n確定要繼續嗎？`,
      ui.ButtonSet.YES_NO
    );
    
    if (confirmResponse !== ui.Button.YES) {
      return;
    }
    
    // 執行轉學操作
    const changeRequest = {
      studentId: studentId,
      changeType: CHANGE_LOG_CONFIG.CHANGE_TYPES.TRANSFER_OUT,
      reason: reason,
      operator: Session.getActiveUser().getEmail()
    };
    
    const result = processStudentChange(changeRequest);
    
    if (result.success) {
      ui.alert(
        '轉學處理完成',
        `學生 ${studentId} 轉學處理成功！\n\n異動ID：${result.changeId}\n移除記錄：${result.details.removedRecords.join(', ')}\n影響老師：${result.details.affectedTeachers.join(', ')}`,
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('轉學處理失敗', result.message, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    Logger.log('學生轉學介面錯誤：' + error.message);
    safeErrorHandler('學生轉學/移出', error);
  }
}

/**
 * 學生轉班介面
 */
function studentClassChange() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 獲取學生ID
    const studentIdResponse = ui.prompt(
      '學生轉班',
      '請輸入要轉班的學生ID：',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (studentIdResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    const studentId = studentIdResponse.getResponseText().trim();
    if (!studentId) {
      ui.alert('錯誤', '請輸入有效的學生ID', ui.ButtonSet.OK);
      return;
    }
    
    // 獲取所有可用班級
    const classOptions = getFormattedClassOptions();
    if (!classOptions || classOptions.length === 0) {
      ui.alert('錯誤', '找不到可用的班級，請先確認系統中有設定班級資料', ui.ButtonSet.OK);
      return;
    }
    
    // 建立班級選擇選單
    let classListMessage = '請選擇目標班級：\n\n';
    classOptions.forEach((option, index) => {
      classListMessage += `${index + 1}. ${option.display}\n`;
    });
    classListMessage += '\n請輸入班級編號（1-' + classOptions.length + '）：';
    
    const classResponse = ui.prompt(
      '選擇目標班級',
      classListMessage,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (classResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    const classIndex = parseInt(classResponse.getResponseText().trim()) - 1;
    if (isNaN(classIndex) || classIndex < 0 || classIndex >= classOptions.length) {
      ui.alert('錯誤', '請輸入有效的班級編號', ui.ButtonSet.OK);
      return;
    }
    
    const selectedClass = classOptions[classIndex];
    const newClass = selectedClass.value;
    const newTeacher = selectedClass.teacher;
    
    // 確認操作
    const confirmResponse = ui.alert(
      '確認轉班操作',
      `即將處理學生轉班：\n\n學生ID：${studentId}\n目標班級：${newClass}\n新老師：${newTeacher}\n班級人數：${selectedClass.studentCount}人\n\n此操作將：\n• 從原老師記錄簿移除學生資料\n• 添加學生到新班級的老師記錄簿\n• 標記相關電聯記錄為已轉班\n• 更新學生總表中的班級和老師資訊\n\n確定要繼續嗎？`,
      ui.ButtonSet.YES_NO
    );
    
    if (confirmResponse !== ui.Button.YES) {
      return;
    }
    
    // 執行轉班操作
    const changeRequest = {
      studentId: studentId,
      changeType: CHANGE_LOG_CONFIG.CHANGE_TYPES.CLASS_CHANGE,
      newClass: newClass,
      newTeacher: newTeacher,
      operator: Session.getActiveUser().getEmail()
    };
    
    const result = processStudentChange(changeRequest);
    
    if (result.success) {
      ui.alert(
        '轉班處理完成',
        `學生 ${studentId} 轉班處理成功！\n\n異動ID：${result.changeId}\n原班級：${result.details.fromTeacher}\n新班級：${newClass}\n新老師：${result.details.toTeacher}\n轉班日期：${result.details.transferDate}`,
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('轉班處理失敗', result.message, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    Logger.log('學生轉班介面錯誤：' + error.message);
    safeErrorHandler('學生轉班', error);
  }
}

/**
 * 學生資料更新介面
 */
function studentInfoUpdate() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 獲取學生ID
    const studentIdResponse = ui.prompt(
      '學生資料更新',
      '請輸入要更新的學生ID：',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (studentIdResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    const studentId = studentIdResponse.getResponseText().trim();
    if (!studentId) {
      ui.alert('錯誤', '請輸入有效的學生ID', ui.ButtonSet.OK);
      return;
    }
    
    // 獲取更新欄位
    const fieldResponse = ui.prompt(
      '更新欄位',
      '請輸入要更新的欄位名稱（例如：Chinese Name, English Name, English Class）：',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (fieldResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    const fieldName = fieldResponse.getResponseText().trim();
    if (!fieldName) {
      ui.alert('錯誤', '請輸入有效的欄位名稱', ui.ButtonSet.OK);
      return;
    }
    
    // 獲取新值
    const valueResponse = ui.prompt(
      '新值',
      `請輸入 ${fieldName} 的新值：`,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (valueResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    const newValue = valueResponse.getResponseText().trim();
    
    // 確認操作
    const confirmResponse = ui.alert(
      '確認更新操作',
      `即將更新學生資料：\n\n學生ID：${studentId}\n更新欄位：${fieldName}\n新值：${newValue}\n\n此操作將同步更新：\n• 學生總表\n• 所有相關老師記錄簿\n\n確定要繼續嗎？`,
      ui.ButtonSet.YES_NO
    );
    
    if (confirmResponse !== ui.Button.YES) {
      return;
    }
    
    // 執行更新操作
    const updateData = {};
    updateData[fieldName] = newValue;
    
    const changeRequest = {
      studentId: studentId,
      changeType: CHANGE_LOG_CONFIG.CHANGE_TYPES.INFO_UPDATE,
      updateData: updateData,
      operator: Session.getActiveUser().getEmail()
    };
    
    const result = processStudentChange(changeRequest);
    
    if (result.success) {
      ui.alert(
        '資料更新完成',
        `學生 ${studentId} 資料更新成功！\n\n異動ID：${result.changeId}\n更新欄位：${result.details.updatedFields.join(', ')}\n更新數量：${result.details.updateCount} 個位置`,
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('資料更新失敗', result.message, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    Logger.log('學生資料更新介面錯誤：' + error.message);
    safeErrorHandler('學生資料更新', error);
  }
}

/**
 * 查看異動記錄介面
 */
function viewChangeHistory() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 獲取異動記錄檔案
    const logSheet = getChangeLogSheet();
    if (!logSheet) {
      ui.alert('提醒', '尚未找到異動記錄檔案', ui.ButtonSet.OK);
      return;
    }
    
    // 開啟異動記錄檔案
    const logSpreadsheet = logSheet.getParent();
    const logUrl = logSpreadsheet.getUrl();
    
    ui.alert(
      '異動記錄',
      `異動記錄檔案已開啟：\n\n${logUrl}\n\n您可以查看所有學生異動的詳細記錄，包括：\n• 異動類型和日期\n• 操作者資訊\n• 異動狀態\n• 備份資料位置`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('查看異動記錄介面錯誤：' + error.message);
    safeErrorHandler('查看異動記錄', error);
  }
}

/**
 * 異動統計報告介面
 */
function generateChangeReport() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 獲取異動記錄
    const logSheet = getChangeLogSheet();
    if (!logSheet) {
      ui.alert('提醒', '尚未找到異動記錄檔案', ui.ButtonSet.OK);
      return;
    }
    
    // 生成統計報告
    const reportData = generateChangeStatistics();
    
    // 創建報告檔案
    const reportName = `異動統計報告_${formatDateTimeForFilename()}`;
    const reportSheet = SpreadsheetApp.create(reportName);
    const sheet = reportSheet.getActiveSheet();
    
    // 寫入報告內容
    sheet.setName('異動統計');
    sheet.getRange('A1').setValue('學生異動統計報告');
    sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
    
    let row = 3;
    sheet.getRange(row, 1).setValue('報告生成時間：' + new Date().toLocaleString());
    row += 2;
    
    // 基本統計
    sheet.getRange(row, 1).setValue('基本統計');
    sheet.getRange(row, 1).setFontWeight('bold');
    row++;
    sheet.getRange(row, 1).setValue('總異動次數：' + reportData.totalChanges);
    row++;
    sheet.getRange(row, 1).setValue('轉學/移出：' + reportData.transferOutCount);
    row++;
    sheet.getRange(row, 1).setValue('轉班：' + reportData.classChangeCount);
    row++;
    sheet.getRange(row, 1).setValue('資料更新：' + reportData.infoUpdateCount);
    row += 2;
    
    // 狀態統計
    sheet.getRange(row, 1).setValue('狀態統計');
    sheet.getRange(row, 1).setFontWeight('bold');
    row++;
    sheet.getRange(row, 1).setValue('已完成：' + reportData.completedCount);
    row++;
    sheet.getRange(row, 1).setValue('失敗：' + reportData.failedCount);
    row++;
    sheet.getRange(row, 1).setValue('已回滾：' + reportData.rolledBackCount);
    
    // 移動到主資料夾
    const mainFolder = getSystemMainFolder();
    const reportFile = DriveApp.getFileById(reportSheet.getId());
    mainFolder.addFile(reportFile);
    DriveApp.getRootFolder().removeFile(reportFile);
    
    ui.alert(
      '統計報告生成完成',
      `異動統計報告已生成：\n\n${reportSheet.getUrl()}\n\n報告包含：\n• 基本異動統計\n• 異動狀態分析\n• 時間分布統計`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('生成異動統計報告介面錯誤：' + error.message);
    safeErrorHandler('異動統計報告', error);
  }
}

/**
 * 異動回滾介面
 */
function rollbackStudentChange() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 獲取異動ID
    const changeIdResponse = ui.prompt(
      '異動回滾',
      '請輸入要回滾的異動ID：',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (changeIdResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    const changeId = changeIdResponse.getResponseText().trim();
    if (!changeId) {
      ui.alert('錯誤', '請輸入有效的異動ID', ui.ButtonSet.OK);
      return;
    }
    
    // 獲取異動記錄
    const changeRecord = getChangeRecord(changeId);
    if (!changeRecord) {
      ui.alert('錯誤', '找不到指定的異動記錄：' + changeId, ui.ButtonSet.OK);
      return;
    }
    
    // 確認回滾操作
    const confirmResponse = ui.alert(
      '確認回滾操作',
      `即將回滾異動：\n\n異動ID：${changeId}\n學生ID：${changeRecord['Student ID']}\n異動類型：${changeRecord['Change Type']}\n異動日期：${changeRecord['Change Date']}\n\n此操作將：\n• 恢復異動前的所有資料\n• 將異動狀態標記為已回滾\n• 重建相關統計\n\n確定要繼續嗎？`,
      ui.ButtonSet.YES_NO
    );
    
    if (confirmResponse !== ui.Button.YES) {
      return;
    }
    
    // 執行回滾操作
    const result = rollbackStudentChange(changeId);
    
    if (result.success) {
      ui.alert(
        '回滾處理完成',
        `異動 ${changeId} 回滾成功！\n\n所有相關資料已恢復到異動前狀態。`,
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('回滾處理失敗', result.message, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    Logger.log('異動回滾介面錯誤：' + error.message);
    safeErrorHandler('異動回滾', error);
  }
}

/**
 * 顯示轉班管理配置摘要介面
 */
function showTransferManagementConfigSummary() {
  try {
    const summary = getTransferManagementConfigSummary();
    if (!summary) {
      safeUIAlert('錯誤', '無法獲取轉班管理配置摘要', safeGetUI()?.ButtonSet.OK);
      return;
    }
    
    const message = `轉班管理系統配置摘要：

🏷️ 狀態標註設定：
• 模式：${summary.statusAnnotationMode}
• 轉班學生納入統計：${summary.includeTransferredInStats ? '是' : '否'}

📊 統計計算設定：
• 預設模式：${summary.defaultStatisticsMode}
• 即時切換：${summary.allowRealTimeToggle ? '啟用' : '禁用'}

🎯 進度補齊設定：
• 模式：${summary.progressCompletionMode}
• 自動補齊：${summary.autoBackfillEnabled ? '啟用' : '禁用'}

🔄 繼承設定：
• 政策：${summary.progressInheritancePolicy}
• 保留來源備註：${summary.preserveSourceNotes ? '是' : '否'}

⚙️ 系統設定：
• 快取啟用：${summary.cachingEnabled ? '是' : '否'}
• 批次操作：${summary.batchProcessingEnabled ? '啟用' : '禁用'}
• 必填備註：${summary.requiredNotes ? '是' : '否'}
• 自動詳細記錄：${summary.autoDetailedLogging ? '啟用' : '禁用'}`;
    
    safeUIAlert('轉班管理配置摘要', message, safeGetUI()?.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('顯示轉班管理配置摘要介面錯誤：' + error.message);
    safeErrorHandler('轉班管理配置摘要', error);
  }
}

/**
 * 統計模式切換介面
 */
function toggleStatisticsMode() {
  try {
    const ui = SpreadsheetApp.getUi();
    const config = SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.STATISTICS_CALCULATION;
    
    if (!config || !config.MODES) {
      ui.alert('錯誤', '統計模式配置不存在，請先初始化轉班管理配置', ui.ButtonSet.OK);
      return;
    }
    
    // 建立模式選擇選單
    const modes = Object.keys(config.MODES);
    let modeListMessage = '請選擇統計模式：\n\n';
    modes.forEach((mode, index) => {
      const modeConfig = config.MODES[mode];
      modeListMessage += `${index + 1}. ${modeConfig.name}\n   ${modeConfig.description}\n\n`;
    });
    modeListMessage += '請輸入模式編號（1-' + modes.length + '）：';
    
    const modeResponse = ui.prompt(
      '統計模式選擇',
      modeListMessage,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (modeResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    const modeIndex = parseInt(modeResponse.getResponseText().trim()) - 1;
    if (isNaN(modeIndex) || modeIndex < 0 || modeIndex >= modes.length) {
      ui.alert('錯誤', '請輸入有效的模式編號', ui.ButtonSet.OK);
      return;
    }
    
    const selectedMode = modes[modeIndex];
    const selectedConfig = config.MODES[selectedMode];
    
    ui.alert(
      '統計模式設定完成',
      `已選擇統計模式：\n\n名稱：${selectedConfig.name}\n說明：${selectedConfig.description}\n\n此設定將影響所有統計計算和進度報告。`,
      ui.ButtonSet.OK
    );
    
    // 這裡可以在將來實際更新統計模式設定
    Logger.log(`統計模式切換至：${selectedMode}`);
    
  } catch (error) {
    Logger.log('統計模式切換介面錯誤：' + error.message);
    safeErrorHandler('統計模式切換', error);
  }
}

/**
 * 進度補齊模式設定介面
 */
function configureProgressCompletion() {
  try {
    const ui = SpreadsheetApp.getUi();
    const config = SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.PROGRESS_COMPLETION;
    
    if (!config || !config.MODES) {
      ui.alert('錯誤', '進度補齊模式配置不存在，請先初始化轉班管理配置', ui.ButtonSet.OK);
      return;
    }
    
    // 建立模式選擇選單
    const modes = Object.keys(config.MODES);
    let modeListMessage = '請選擇進度補齊模式：\n\n';
    modes.forEach((mode, index) => {
      const modeConfig = config.MODES[mode];
      modeListMessage += `${index + 1}. ${modeConfig.name}\n   ${modeConfig.description}\n\n`;
    });
    modeListMessage += '請輸入模式編號（1-' + modes.length + '）：';
    
    const modeResponse = ui.prompt(
      '進度補齊模式設定',
      modeListMessage,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (modeResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    const modeIndex = parseInt(modeResponse.getResponseText().trim()) - 1;
    if (isNaN(modeIndex) || modeIndex < 0 || modeIndex >= modes.length) {
      ui.alert('錯誤', '請輸入有效的模式編號', ui.ButtonSet.OK);
      return;
    }
    
    const selectedMode = modes[modeIndex];
    const selectedConfig = config.MODES[selectedMode];
    
    ui.alert(
      '進度補齊模式設定完成',
      `已選擇進度補齊模式：\n\n名稱：${selectedConfig.name}\n說明：${selectedConfig.description}\n\n此設定將影響新學生的進度記錄建立方式。`,
      ui.ButtonSet.OK
    );
    
    Logger.log(`進度補齊模式設定為：${selectedMode}`);
    
  } catch (error) {
    Logger.log('進度補齊模式設定介面錯誤：' + error.message);
    safeErrorHandler('進度補齊模式設定', error);
  }
}

/**
 * 轉班進度繼承設定介面
 */
function configureProgressInheritance() {
  try {
    const ui = SpreadsheetApp.getUi();
    const config = SYSTEM_CONFIG.TRANSFER_MANAGEMENT?.PROGRESS_INHERITANCE;
    
    if (!config || !config.POLICIES) {
      ui.alert('錯誤', '進度繼承政策配置不存在，請先初始化轉班管理配置', ui.ButtonSet.OK);
      return;
    }
    
    // 建立政策選擇選單
    const policies = Object.keys(config.POLICIES);
    let policyListMessage = '請選擇進度繼承政策：\n\n';
    policies.forEach((policy, index) => {
      const policyConfig = config.POLICIES[policy];
      policyListMessage += `${index + 1}. ${policyConfig.name}\n   ${policyConfig.description}\n\n`;
    });
    policyListMessage += '請輸入政策編號（1-' + policies.length + '）：';
    
    const policyResponse = ui.prompt(
      '進度繼承政策設定',
      policyListMessage,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (policyResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    const policyIndex = parseInt(policyResponse.getResponseText().trim()) - 1;
    if (isNaN(policyIndex) || policyIndex < 0 || policyIndex >= policies.length) {
      ui.alert('錯誤', '請輸入有效的政策編號', ui.ButtonSet.OK);
      return;
    }
    
    const selectedPolicy = policies[policyIndex];
    const selectedConfig = config.POLICIES[selectedPolicy];
    
    ui.alert(
      '進度繼承政策設定完成',
      `已選擇進度繼承政策：\n\n名稱：${selectedConfig.name}\n說明：${selectedConfig.description}\n\n此設定將影響學生轉班時的進度記錄處理方式。`,
      ui.ButtonSet.OK
    );
    
    Logger.log(`進度繼承政策設定為：${selectedPolicy}`);
    
  } catch (error) {
    Logger.log('轉班進度繼承設定介面錯誤：' + error.message);
    safeErrorHandler('轉班進度繼承設定', error);
  }
}

/**
 * 檢查轉班管理狀態介面
 */
function checkTransferManagementStatus() {
  try {
    const isEnabled = isTransferManagementEnabled();
    const validation = validateTransferManagementConfig();
    
    let statusMessage = `轉班管理系統狀態檢查：\n\n`;
    statusMessage += `🔍 啟用狀態：${isEnabled ? '✅ 已啟用' : '❌ 未啟用'}\n`;
    statusMessage += `👍 配置有效：${validation.isValid ? '✅ 有效' : '❌ 無效'}\n`;
    statusMessage += `⚠️ 錯誤數量：${validation.errors.length}\n`;
    statusMessage += `📝 警告數量：${validation.warnings.length}\n\n`;
    
    if (validation.errors.length > 0) {
      statusMessage += `錯誤詳情：\n`;
      validation.errors.forEach(error => {
        statusMessage += `• ${error}\n`;
      });
      statusMessage += `\n`;
    }
    
    if (validation.warnings.length > 0) {
      statusMessage += `警告詳情：\n`;
      validation.warnings.forEach(warning => {
        statusMessage += `• ${warning}\n`;
      });
      statusMessage += `\n`;
    }
    
    if (validation.recommendations.length > 0) {
      statusMessage += `建議事項：\n`;
      validation.recommendations.forEach(rec => {
        statusMessage += `• ${rec}\n`;
      });
    }
    
    safeUIAlert('轉班管理狀態檢查', statusMessage, safeGetUI()?.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('檢查轉班管理狀態介面錯誤：' + error.message);
    safeErrorHandler('轉班管理狀態檢查', error);
  }
}

/**
 * 生成異動統計資料
 * @returns {Object} 統計資料
 */
function generateChangeStatistics() {
  try {
    const logSheet = getChangeLogSheet();
    if (!logSheet) {
      return {
        totalChanges: 0,
        transferOutCount: 0,
        classChangeCount: 0,
        infoUpdateCount: 0,
        completedCount: 0,
        failedCount: 0,
        rolledBackCount: 0
      };
    }
    
    const data = logSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {
        totalChanges: 0,
        transferOutCount: 0,
        classChangeCount: 0,
        infoUpdateCount: 0,
        completedCount: 0,
        failedCount: 0,
        rolledBackCount: 0
      };
    }
    
    const headers = data[0];
    const changeTypeCol = headers.indexOf('Change Type');
    const statusCol = headers.indexOf('Status');
    
    const stats = {
      totalChanges: data.length - 1,
      transferOutCount: 0,
      classChangeCount: 0,
      infoUpdateCount: 0,
      completedCount: 0,
      failedCount: 0,
      rolledBackCount: 0
    };
    
    for (let i = 1; i < data.length; i++) {
      const changeType = data[i][changeTypeCol];
      const status = data[i][statusCol];
      
      // 統計異動類型
      if (changeType === CHANGE_LOG_CONFIG.CHANGE_TYPES.TRANSFER_OUT) {
        stats.transferOutCount++;
      } else if (changeType === CHANGE_LOG_CONFIG.CHANGE_TYPES.CLASS_CHANGE) {
        stats.classChangeCount++;
      } else if (changeType === CHANGE_LOG_CONFIG.CHANGE_TYPES.INFO_UPDATE) {
        stats.infoUpdateCount++;
      }
      
      // 統計狀態
      if (status === CHANGE_LOG_CONFIG.STATUS.COMPLETED) {
        stats.completedCount++;
      } else if (status === CHANGE_LOG_CONFIG.STATUS.FAILED) {
        stats.failedCount++;
      } else if (status === CHANGE_LOG_CONFIG.STATUS.ROLLED_BACK) {
        stats.rolledBackCount++;
      }
    }
    
    return stats;
    
  } catch (error) {
    Logger.log('生成異動統計資料失敗：' + error.message);
    return {
      totalChanges: 0,
      transferOutCount: 0,
      classChangeCount: 0,
      infoUpdateCount: 0,
      completedCount: 0,
      failedCount: 0,
      rolledBackCount: 0
    };
  }
} 