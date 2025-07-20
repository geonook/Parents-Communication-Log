/**
 * Simple runner for LT Priority Test
 * This function can be executed from the Google Apps Script console
 */
function runLTTest() {
  // Run the comprehensive LT test
  return runComprehensiveLTTest();
}

/**
 * Run just the LT priority logic test
 */
function runLTPriorityOnly() {
  return testLTPriorityLogic();
}

/**
 * Run just the class consolidation test (original)
 */
function runClassConsolidationOnly() {
  return testClassConsolidation();
}