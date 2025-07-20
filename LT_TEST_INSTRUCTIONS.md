# LT Field Exact Matching Test Instructions

## 🎯 What We're Testing

The updated exact LT field matching functionality that:
- Uses `findLTColumnIndex()` to match **only** "LT" or "Local Teacher" exactly
- **Rejects** "Previous Teacher" and other fuzzy matches
- Provides clear error messages when no LT field is found
- Ensures class dropdown teachers come from the correct LT field

## 🔗 Google Apps Script Editor

**Click this link to access the script editor:**
https://script.google.com/d/1DsBmVS7S9M_2uYlJLybTYI0hHT3SpENq3mQcSMmmiU5AyTcfHZoHCTm1/edit

## 🧪 Available Test Functions

### 1. **Quick Mock Test** (Recommended First)
```javascript
simpleLTFieldTest()
```
- Tests the exact matching logic with mock data
- Verifies "LT" and "Local Teacher" are found
- Confirms "Previous Teacher" is rejected
- **Expected Result:** All 5 tests should pass ✅

### 2. **Real Data Test**
```javascript
testActualMasterListLT()
```
- Tests with your actual master list data
- Shows which LT field was found
- Displays sample teacher data
- **Expected Result:** Should find the correct LT field ✅

### 3. **Complete Test Suite**
```javascript
runCompleteLTTest()
```
- Runs both mock and real data tests
- Provides comprehensive summary
- **Expected Result:** All tests should pass ✅

### 4. **Existing Class Consolidation Test**
```javascript
testClassConsolidation()
```
- Tests the full class consolidation system
- Shows teacher assignments from LT field
- **Expected Result:** Should show teachers from correct LT field ✅

### 5. **LT Priority Logic Test**
```javascript
testLTPriorityLogic()
```
- Tests the LT priority system
- Compares master list vs teacher book assignments
- **Expected Result:** Master list LT should have priority ✅

## 🔍 How to Run Tests

1. **Open the script editor** using the link above
2. **Click on any .gs file** in the left panel (e.g., `SimpleLTTest.gs`)
3. **Open the console:**
   - Go to **Extensions** → **Apps Script** → **View** → **Logs** (or press `Ctrl+Enter`)
4. **Run a test function:**
   - Type function name in the function dropdown (top center)
   - Click the **▶ Run** button
   - OR use the console at the bottom

## 📊 What to Look For

### ✅ Success Indicators:
- **Mock tests pass:** `findLTColumnIndex()` correctly identifies LT fields
- **Real data test finds LT field:** Shows actual column index and name  
- **"Previous Teacher" rejected:** Not selected even if present
- **Sample teacher data displayed:** From the correct LT column
- **Log messages show:** "✅ 找到LT欄位：第X欄 'LT'" or similar

### ❌ Failure Indicators:
- **Mock tests fail:** Function doesn't exist or logic is wrong
- **Real data test shows -1:** No LT field found in master list
- **"Previous Teacher" selected:** Exact matching not working
- **Error messages:** About missing LT field or function errors

## 🐛 Key Changes to Verify

### Before (Problematic):
```javascript
// Old fuzzy matching that could pick up "Previous Teacher"
if (header.includes('Teacher') || header.includes('LT')) {
  return i; // Could match "Previous Teacher"
}
```

### After (Fixed):
```javascript
// New exact matching - only "LT" or "Local Teacher"
if (header === 'LT' || header === 'Local Teacher') {
  Logger.log(`✅ 找到LT欄位：第${i+1}欄 "${header}"`);
  return i;
}
```

## 📋 Expected Test Results

### Test 1: Mock Data Tests
```
✅ 測試 2 成功: 正確識別 LT 欄位
✅ 測試 3 成功: 正確識別 Local Teacher 欄位  
✅ 測試 4 成功: 正確排除 Previous Teacher，選擇了 LT
✅ 測試 5 成功: 正確拒絕了只有 Previous Teacher 的情況
🎉 所有測試都通過！LT 欄位精確匹配功能正常工作
```

### Test 2: Real Data Test
```
✅ 在實際學生總表中找到 LT 欄位
LT 欄位索引: X
LT 欄位名稱: LT (or Local Teacher)
LT 欄位樣本資料: [teacher names from your actual data]
```

### Test 3: Class Consolidation
```
✅ 成功獲取 X 個班級
📊 總學生數: X
✅ 沒有發現重複班級，合併功能正常
✅ getFormattedClassOptions() 成功
```

## 🚨 If Tests Fail

### Issue: "findLTColumnIndex 函數不存在"
**Solution:** Run `clasp push` to deploy the latest code

### Issue: "在實際學生總表中未找到 LT 欄位"
**Solution:** Check if your master list has "LT" or "Local Teacher" column exactly

### Issue: Tests pick up "Previous Teacher"
**Solution:** The exact matching logic needs to be fixed in `SystemUtils.gs`

## 📱 Quick Copy-Paste Test

If you want to quickly test, copy and paste this into the Google Apps Script console:

```javascript
// Quick verification
function quickCheck() {
  console.log('Testing findLTColumnIndex...');
  const testHeaders = ['Class', 'Previous Teacher', 'LT', 'Grade'];
  const result = findLTColumnIndex(testHeaders);
  console.log('Headers:', testHeaders);
  console.log('Found index:', result);
  console.log('Found field:', result >= 0 ? testHeaders[result] : 'None');
  console.log('Success:', result === 2 && testHeaders[result] === 'LT' ? 'YES' : 'NO');
}
quickCheck();
```

## 📞 Report Back

Please report:
1. **Which tests you ran** and their results (✅/❌)
2. **LT field index and name** found in your real data
3. **Any error messages** you see in the console
4. **Teacher assignments** - do they now come from the LT field?
5. **Comparison** - any differences from previous behavior?

The key success metric is: **Teachers in class dropdowns now come from the correct LT field, not from "Previous Teacher" or other incorrect sources.**