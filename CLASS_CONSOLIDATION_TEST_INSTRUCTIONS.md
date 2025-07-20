# Class Consolidation Test Instructions

## 🧪 How to Test the Class Consolidation Functionality

### Step 1: Open Google Apps Script
1. Go to https://script.google.com
2. Open your **Parents Communication Log** project
3. Make sure all files are loaded (you should see 33 files including FastDiagnostic.gs)

### Step 2: Run the Class Consolidation Test

#### Option A: Run Specific Class Test Only
1. In the Google Apps Script editor, open **FastDiagnostic.gs**
2. Find the function `testClassConsolidation()` (around line 430)
3. Click on the function name in the dropdown (top of editor)
4. Click the **Run** button ▶️
5. Check the **Execution transcript** tab at the bottom for results

#### Option B: Run Complete Diagnosis (Recommended)
1. In the Google Apps Script editor, open **FastDiagnostic.gs**
2. Find the function `oneClickDiagnosis()` (around line 612)
3. Click on the function name in the dropdown (top of editor)
4. Click the **Run** button ▶️
5. Check the **Execution transcript** tab at the bottom for comprehensive results

### Step 3: What to Look For

#### ✅ Success Indicators:
- **Functions Exist**: All class-related functions are properly defined
- **Classes Retrieved**: `getAllAvailableClasses()` returns multiple classes
- **No Duplicates**: Each class appears only once in the results
- **Student Counts**: Accurate student numbers for each class
- **Formatted Options**: `getFormattedClassOptions()` works correctly

#### ❌ Failure Indicators:
- Missing functions error messages
- Empty class list
- Duplicate class entries found
- Zero student counts
- Formatting function errors

### Step 4: Expected Output Format

You should see output similar to this:

```
🏫 開始測試班級資料合併功能
🔍 步驟1: 檢查班級相關函數存在性
✅ 所有班級相關函數都存在
🔍 步驟2: 測試 getAllAvailableClasses()
✅ 成功獲取 [X] 個班級
📊 總學生數: [Y]
📋 班級樣本:
  1. Class1 (Teacher1 - Z人)
  2. Class2 (Teacher2 - Z人)
  ...
🔍 步驟3: 檢查是否有重複班級
✅ 沒有發現重複班級，合併功能正常
🔍 步驟4: 測試 getFormattedClassOptions()
✅ getFormattedClassOptions() 成功，返回 [X] 個選項
📋 格式化選項樣本:
  1. Class1 (Teacher1 - Z人)
  2. Class2 (Teacher2 - Z人)
  ...

=== 班級合併測試報告 ===
測試時間: [X.XX]秒
測試結果: ✅ 成功
合併後班級數: [X]
重複班級數: 0
總學生數: [Y]
格式化功能: ✅ 正常
```

### Step 5: Report Results

Please copy the full execution transcript and report:

1. **Number of classes before/after consolidation**: [From the output]
2. **Any duplicate class entries found**: [Should be 0]
3. **Student counts accuracy**: [Check if numbers make sense]
4. **Overall success/failure**: [Based on the test result]
5. **Any error messages**: [If any appeared]

### 🔧 Troubleshooting

#### If you get permission errors:
1. Click **Review permissions** when prompted
2. Allow the script to access your Google Sheets
3. Re-run the test

#### If you get "function not found" errors:
1. Make sure `clasp push` was successful
2. Refresh the Google Apps Script page
3. Try running the test again

#### If you get empty results:
1. Check that your Google Sheets contain student/class data
2. Verify the master student list has class information
3. Ensure teacher record books exist and contain data

### 📊 Additional Tests (Optional)

If the main test works, you can also try these individual functions:

1. **Test getAllAvailableClasses only**:
   ```javascript
   function testGetAllClasses() {
     const classes = getAllAvailableClasses();
     console.log('Classes found:', classes.length);
     console.log('Sample:', classes.slice(0, 3));
   }
   ```

2. **Test getFormattedClassOptions only**:
   ```javascript
   function testFormattedOptions() {
     const options = getFormattedClassOptions();
     console.log('Formatted options:', options.length);
     console.log('Sample:', options.slice(0, 3));
   }
   ```

---

**Please run the test and share the complete execution transcript for analysis!**