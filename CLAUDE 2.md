# CLAUDE.md - Parents Communication Log

> **Documentation Version**: 2.0  
> **Last Updated**: 2025-07-20  
> **Project**: Parents Communication Log  
> **Description**: Parent-teacher communication tracking system with teacher management, student data import, dashboard, and automation features  
> **Features**: GitHub auto-backup, Task agents, technical debt prevention

This file provides essential guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL RULES - READ FIRST

> **⚠️ RULE ADHERENCE SYSTEM ACTIVE ⚠️**  
> **Claude Code must explicitly acknowledge these rules at task start**  
> **These rules override all other instructions and must ALWAYS be followed:**

### 🔄 **RULE ACKNOWLEDGMENT REQUIRED**
> **Before starting ANY task, Claude Code must respond with:**  
> "✅ CRITICAL RULES ACKNOWLEDGED - I will follow all prohibitions and requirements listed in CLAUDE.md"

### ❌ ABSOLUTE PROHIBITIONS
- **NEVER** create documentation files (.md) unless explicitly requested by user
- **NEVER** use git commands with -i flag (interactive mode not supported)
- **NEVER** use `find`, `grep`, `cat`, `head`, `tail`, `ls` commands → use Read, LS, Grep, Glob tools instead
- **NEVER** create duplicate files (manager_v2.js, enhanced_xyz.gs, utils_new.js) → ALWAYS extend existing files
- **NEVER** create multiple implementations of same concept → single source of truth
- **NEVER** copy-paste code blocks → extract into shared utilities/functions
- **NEVER** hardcode values that should be configurable → use config files/environment variables
- **NEVER** use naming like enhanced_, improved_, new_, v2_ → extend original files instead

### 📝 MANDATORY REQUIREMENTS
- **COMMIT** after every completed task/phase - no exceptions
- **GITHUB BACKUP** - Push to GitHub after every commit to maintain backup: `git push origin main`
- **CLASP PUSH** - Push to Google Apps Script after every .gs file change: `clasp push` - EQUALLY IMPORTANT as GitHub backup
- **USE TASK AGENTS** for all long-running operations (>30 seconds) - Bash commands stop when context switches
- **TODOWRITE** for complex tasks (3+ steps) → parallel agents → git checkpoints → test validation
- **READ FILES FIRST** before editing - Edit/Write tools will fail if you didn't read the file first
- **DEBT PREVENTION** - Before creating new files, check for existing similar functionality to extend  
- **SINGLE SOURCE OF TRUTH** - One authoritative implementation per feature/concept

### 🎯 **GOOGLE APPS SCRIPT SPECIFIC RULES**
- **GAS FILES (.gs) IN ROOT** - Google Apps Script requires .gs files in root directory (exception to general "no root files" rule)
- **HTML FILES WITH .gs** - HTML files for web apps should be in root alongside .gs files
- **SHARED UTILITIES** - Extract common functionality into dedicated .gs files (e.g., SystemUtils.gs)
- **PROPER NAMING** - Use descriptive names for .gs files reflecting their purpose (TeacherManagement.gs, not teacher.gs)

### ⚡ EXECUTION PATTERNS
- **PARALLEL TASK AGENTS** - Launch multiple Task agents simultaneously for maximum efficiency
- **SYSTEMATIC WORKFLOW** - TodoWrite → Parallel agents → Git checkpoints → GitHub backup → clasp push → Test validation
- **DUAL BACKUP WORKFLOW** - After every commit: `git push origin main` + `clasp push` to maintain both GitHub and GAS sync
- **BACKGROUND PROCESSING** - ONLY Task agents can run true background operations

### 🔍 MANDATORY PRE-TASK COMPLIANCE CHECK
> **STOP: Before starting any task, Claude Code must explicitly verify ALL points:**

**Step 1: Rule Acknowledgment**
- [ ] ✅ I acknowledge all critical rules in CLAUDE.md and will follow them

**Step 2: Task Analysis**  
- [ ] Will this take >30 seconds? → If YES, use Task agents not Bash
- [ ] Is this 3+ steps? → If YES, use TodoWrite breakdown first
- [ ] Am I about to use grep/find/cat? → If YES, use proper tools instead

**Step 3: Technical Debt Prevention (MANDATORY SEARCH FIRST)**
- [ ] **SEARCH FIRST**: Use Grep pattern="<functionality>.*<keyword>" to find existing implementations
- [ ] **CHECK EXISTING**: Read any found files to understand current functionality
- [ ] Does similar functionality already exist? → If YES, extend existing code
- [ ] Am I creating a duplicate class/manager? → If YES, consolidate instead
- [ ] Will this create multiple sources of truth? → If YES, redesign approach
- [ ] Have I searched for existing implementations? → Use Grep/Glob tools first
- [ ] Can I extend existing code instead of creating new? → Prefer extension over creation
- [ ] Am I about to copy-paste code? → Extract to shared utility instead

**Step 4: Google Apps Script Considerations**
- [ ] Does this need to be a .gs file for GAS compatibility?
- [ ] Can I extend existing .gs files instead of creating new ones?
- [ ] Will this work with GAS runtime limitations?
- [ ] Need clasp push for .gs changes? → If YES, run `clasp push` after commit

**Step 5: Session Management**
- [ ] Is this a long/complex task? → If YES, plan context checkpoints
- [ ] Have I been working >1 hour? → If YES, consider /compact or session break

> **⚠️ DO NOT PROCEED until all checkboxes are explicitly verified**

### 📋 COMPLIANCE VERIFICATION TEMPLATE
**Copy and paste this template for each task:**

```
### 🔍 MANDATORY PRE-TASK COMPLIANCE CHECK

**Step 1: Rule Acknowledgment**
- [x] ✅ I acknowledge all critical rules in CLAUDE.md and will follow them

**Step 2: Task Analysis**  
- [ ] Will this take >30 seconds? → [YES/NO] → [Action if YES]
- [ ] Is this 3+ steps? → [YES/NO] → [Action if YES]
- [ ] Am I about to use grep/find/cat? → [YES/NO] → [Action if YES]

**Step 3: Technical Debt Prevention**
- [ ] **SEARCH FIRST**: [Results of search]
- [ ] **CHECK EXISTING**: [Files reviewed]
- [ ] Does similar functionality already exist? → [YES/NO] → [Decision]
- [ ] Am I creating a duplicate? → [YES/NO] → [Alternative approach]
- [ ] Will this create multiple sources of truth? → [YES/NO] → [Mitigation]

**Step 4: Google Apps Script Considerations**
- [ ] Does this need to be a .gs file? → [YES/NO]
- [ ] Can I extend existing .gs files? → [YES/NO] → [Which files]
- [ ] Will this work with GAS runtime? → [YES/NO]
- [ ] Need clasp push? → [YES/NO]

**Step 5: Session Management**
- [ ] Is this a long/complex task? → [YES/NO] → [Checkpoint plan]
- [ ] Have I been working >1 hour? → [YES/NO] → [Break consideration]

✅ **ALL CHECKS VERIFIED - PROCEEDING WITH TASK**
```

## 🐙 GITHUB SETUP & AUTO-BACKUP

> **🤖 FOR CLAUDE CODE: When initializing any project, automatically ask about GitHub setup**

### 🎯 **GITHUB SETUP PROMPT** (AUTOMATIC)
> **⚠️ CLAUDE CODE MUST ALWAYS ASK THIS QUESTION when setting up a new project:**

```
🐙 GitHub Repository Setup
Would you like to set up a remote GitHub repository for this project?

Options:
1. ✅ YES - Create new GitHub repo and enable auto-push backup
2. ✅ YES - Connect to existing GitHub repo and enable auto-push backup  
3. ❌ NO - Skip GitHub setup (local git only)

[Wait for user choice before proceeding]
```

### 🚀 **OPTION 1: CREATE NEW GITHUB REPO**
If user chooses to create new repo, execute:

```bash
# Ensure GitHub CLI is available
gh --version || echo "⚠️ GitHub CLI (gh) required. Install: brew install gh"

# Authenticate if needed
gh auth status || gh auth login

# Create new GitHub repository
echo "Enter repository name (or press Enter for current directory name):"
read repo_name
repo_name=${repo_name:-$(basename "$PWD")}

# Create repository
gh repo create "$repo_name" --public --description "Google Apps Script project managed with Claude Code" --confirm

# Add remote and push
git remote add origin "https://github.com/$(gh api user --jq .login)/$repo_name.git"
git branch -M main
git push -u origin main

echo "✅ GitHub repository created and connected: https://github.com/$(gh api user --jq .login)/$repo_name"
```

### 🔗 **OPTION 2: CONNECT TO EXISTING REPO**
If user chooses to connect to existing repo, execute:

```bash
# Get repository URL from user
echo "Enter your GitHub repository URL (https://github.com/username/repo-name):"
read repo_url

# Extract repo info and add remote
git remote add origin "$repo_url"
git branch -M main
git push -u origin main

echo "✅ Connected to existing GitHub repository: $repo_url"
```

### 🔄 **AUTO-PUSH CONFIGURATION**
For both options, configure automatic backup:

```bash
# Create git hook for auto-push (optional but recommended)
cat > .git/hooks/post-commit << 'EOF'
#!/bin/bash
# Auto-push to GitHub after every commit
echo "🔄 Auto-pushing to GitHub..."
git push origin main
if [ $? -eq 0 ]; then
    echo "✅ Successfully backed up to GitHub"
else
    echo "⚠️ GitHub push failed - manual push may be required"
fi
EOF

chmod +x .git/hooks/post-commit

echo "✅ Auto-push configured - GitHub backup after every commit"
```

### 📋 **GITHUB BACKUP WORKFLOW** (MANDATORY)
> **⚠️ CLAUDE CODE MUST FOLLOW THIS PATTERN:**

```bash
# After every commit, always run BOTH:
git push origin main    # GitHub backup
clasp push             # Google Apps Script deployment

# This ensures:
# ✅ Remote backup of all changes
# ✅ GAS deployment synchronization
# ✅ Version history preservation
# ✅ Disaster recovery protection
```

### 🎯 **CLAUDE CODE GITHUB COMMANDS**
Essential GitHub operations for Claude Code:

```bash
# Check GitHub connection status
gh auth status && git remote -v

# Create new repository (if needed)
gh repo create [repo-name] --public --confirm

# Push changes (after every commit)
git push origin main

# Check repository status
gh repo view

# Clone repository (for new setup)
gh repo clone username/repo-name
```

## 🏗️ PROJECT OVERVIEW

This is a Google Apps Script-based educational management system with the following components:

### 📁 **Current Project Structure**
```
comm/ (67 files total - Enterprise CI/CD Architecture Complete)
├── 📝 Documentation
│   ├── CLAUDE.md                     # Essential rules for Claude Code
│   └── 系統使用手冊.md               # System manual in Chinese
├── 🎯 Core System (7 files)
│   ├── Code.gs                       # Main application logic
│   ├── SystemUtils.gs               # Shared utility functions
│   ├── TeacherManagement.gs         # Teacher management features
│   ├── StudentDataImport.gs         # Student data import functionality
│   ├── ProgressTracking.gs          # Student progress tracking
│   ├── AutomationTriggers.gs        # Automated triggers and scheduling
│   └── DashboardController.gs       # Dashboard backend controller
├── 🚀 **CI/CD Pipeline Infrastructure (5 files)** - **PHASE 3 COMPLETE**
│   ├── CiCdOrchestrator.gs          # 🎯 Enterprise CI/CD pipeline coordinator
│   ├── CodeQualityChecker.gs        # 🛡️ Code quality gates & CI/CD integration
│   ├── HealthCheckService.gs        # 🏥 Health monitoring & deployment controls
│   ├── DeploymentManager.gs         # 🚀 Advanced deployment strategies & risk assessment
│   └── CiCdPipelineTest.gs          # 🧪 End-to-end CI/CD pipeline testing
├── 🧪 Testing Suite (9 files) - Enhanced with CI/CD Testing
│   ├── ComprehensiveSystemTest.gs   # Full system testing
│   ├── CoreSystemTest.gs            # Integrated core system tests (v2.0)
│   ├── QuickSystemTest.gs           # Quick validation tests
│   ├── SimpleTestRunner.gs          # Basic test runner
│   ├── TestBackupRestore.gs         # Backup/restore testing
│   ├── TestScheduledContactTransfer.gs # Contact transfer testing
│   ├── TestStudentChangeManagement.gs # Student change testing
│   ├── TestSummaryChangeIntegration.gs # Summary worksheet integration testing
│   └── CiCdPipelineTest.gs          # 🆕 CI/CD Pipeline end-to-end testing
├── 🔧 Management Tools (6 files)
│   ├── StudentChangeManager.gs      # Student change operations
│   ├── StudentLocator.gs            # Student search and location
│   ├── DataSyncManager.gs           # Data synchronization
│   ├── RecordFormatValidator.gs     # Record format validation
│   ├── ValidateSystemConfig.gs      # System configuration validation
│   └── AcademicYearManagement.gs    # Academic year management
├── 🏥 Diagnostics & Validation (5 files)
│   ├── FastDiagnostic.gs            # Quick diagnostic tools
│   ├── SystemValidation.gs          # System integrity validation
│   ├── DeploymentVerification.gs    # Deployment verification
│   ├── InitializationAnalyzer.gs    # System initialization analysis
│   └── MasterListIntegrityChecker.gs # Master list integrity checking
├── 🛡️ T01 Protection (2 files) - Essential for Data Integrity
│   ├── T01StudentDetector.gs        # T01 student detection
│   └── T01PreventionSystem.gs       # T01 student data protection
├── 🏗️ **Enterprise Architecture (33+ files)** - Supporting Infrastructure
│   ├── Teacher Domain Services (10 files)
│   ├── Student Domain Services (4 files)
│   ├── System Services (5 files)
│   ├── Performance & Monitoring (6 files)
│   ├── API & Query Services (4 files)
│   └── Error Handling & Events (4+ files)
├── 🌐 Frontend
│   ├── dashboard.html               # Frontend dashboard interface
│   └── appsscript.json             # Google Apps Script configuration
```

### 📊 **Enterprise Architecture Evolution**
- **Phase 1 (Original)**: 8 files (基礎功能)
- **Phase 2 (API重構)**: 30 files (275% growth) - API層重構與智能緩存
- **Phase 3 (CI/CD)**: 67 files (738% growth) - 企業級 CI/CD Pipeline 完成
- **Current Status**: ✅ **ENTERPRISE-READY ARCHITECTURE**

**Phase 3 Growth Analysis**:
  - CI/CD Infrastructure: +5 files (CiCdOrchestrator, enhanced quality/health)
  - Enterprise Architecture: +34 files (microservices, domain services, monitoring)
  - Testing Enhancement: +1 file (CI/CD end-to-end testing)
  - Overall Capability: 738% increase in enterprise functionality

### 🎯 **Organization Status - COMPLETED**
- **Strengths**: ✅ Comprehensive testing and diagnostic coverage maintained
- **Cleanup Results**: ✅ Removed 12 redundant test files (66% reduction in test files)  
- **Architecture**: ✅ Clean structure achieved (28 files total)
- **Technical Debt**: ✅ Eliminated duplicate and obsolete testing code

### 🎯 **DEVELOPMENT STATUS**
- **Setup**: ✅ Complete
- **Core Features**: ✅ **Complete**
- **Contact Record Sorting**: ✅ **Fixed & Verified**
- **Testing**: ✅ Complete
- **Documentation**: 🔄 In Progress

### 🏆 **RECENT MAJOR FIXES**
- **2025-07-18**: 完成電聯記錄排序邏輯修復
  - ✅ 修正學期排序順序：Fall → Spring  
  - ✅ 修正階段排序順序：Beginning → Midterm → Final
  - ✅ 解決 JavaScript 對象屬性訪問失敗問題
  - ✅ 統一 Web 和後端環境排序行為
  - ✅ 建立穩定的 switch-case 映射機制

## 🚨 TECHNICAL DEBT PREVENTION

### ❌ WRONG APPROACH (Creates Technical Debt):
```bash
# Creating new file without searching first
Write(file_path="NewTeacherManager.gs", content="...")
```

### ✅ CORRECT APPROACH (Prevents Technical Debt):
```bash
# 1. SEARCH FIRST
Grep(pattern="teacher.*management", glob="*.gs")
# 2. READ EXISTING FILES  
Read(file_path="TeacherManagement.gs")
# 3. EXTEND EXISTING FUNCTIONALITY
Edit(file_path="TeacherManagement.gs", old_string="...", new_string="...")
```

## 🧹 DEBT PREVENTION WORKFLOW

### Before Creating ANY New File:
1. **🔍 Search First** - Use Grep/Glob to find existing implementations
2. **📋 Analyze Existing** - Read and understand current patterns
3. **🤔 Decision Tree**: Can extend existing? → DO IT | Must create new? → Document why
4. **✅ Follow Patterns** - Use established project patterns
5. **📈 Validate** - Ensure no duplication or technical debt

### 🎯 **ENHANCED DEBT PREVENTION DECISION TREE**

```
📝 BEFORE CREATING ANY NEW FILE:

1. 🔍 MANDATORY SEARCH
   ├── Grep(pattern="[functionality].*[keyword]", glob="*.gs")
   ├── Glob(pattern="**/*[related_term]*")
   └── Result: [FOUND] → Go to step 2 | [NOT_FOUND] → Go to step 4

2. 📖 ANALYZE EXISTING CODE
   ├── Read(file_path="[found_files]") 
   ├── Understand: Purpose, Structure, Patterns
   └── Decision: [EXTENDABLE] → Go to step 3 | [NOT_EXTENDABLE] → Go to step 4

3. ✅ EXTEND EXISTING (PREFERRED)
   ├── Edit(file_path="[existing_file]", ...)
   ├── Add new functions/methods to existing file
   └── Result: ✅ Single source of truth maintained

4. 🤔 CREATE NEW FILE (ONLY IF NECESSARY)
   ├── Document: Why new file is necessary
   ├── Ensure: Clear separation of concerns
   ├── Follow: Established naming patterns
   └── Result: ⚠️ New file created with justification
```

### 🛡️ **DEBT PREVENTION VALIDATION CHECKLIST**

Before any file creation/modification:
- [ ] **Search completed**: Used Grep/Glob to find existing code
- [ ] **Existing code analyzed**: Read and understood current implementations
- [ ] **Extension attempted**: Tried to extend existing code first
- [ ] **Single source verified**: Ensured no duplicate implementations
- [ ] **Patterns followed**: Used established project conventions
- [ ] **Purpose documented**: Clear reason for any new files created

## 🚀 COMMON COMMANDS

```bash
# Complete deployment workflow (ALWAYS do both!)
git add .
git commit -m "Descriptive commit message"
git push origin main    # GitHub backup
clasp push             # Deploy to Google Apps Script - CRITICAL!

# Test Google Apps Script functions
# (Add your testing commands here as you develop them)

# Check clasp status
clasp status

# GitHub repository management
gh repo view           # Check repository status
gh auth status         # Verify GitHub authentication
git remote -v          # Check remote connections
```

## 🎯 RULE COMPLIANCE CHECK

Before starting ANY task, verify:
- [ ] ✅ I acknowledge all critical rules above
- [ ] .gs files can be in root (GAS requirement)
- [ ] Use Task agents for >30 second operations
- [ ] TodoWrite for 3+ step tasks
- [ ] Commit after each completed task
- [ ] **CLASP PUSH** after .gs file changes - EQUALLY IMPORTANT as GitHub backup

## 📈 CONTINUOUS IMPROVEMENT AREAS

### 🔍 Known Compliance Gaps (for future enhancement)
1. **Pre-Task Check Automation**: Need automated verification of compliance checklist
2. **Task Agent Priority**: Strengthen preference for Task agents over Bash commands
3. **Context Management**: Better tracking of session length and complexity
4. **Compliance Metrics**: Implement systematic compliance scoring system

### 💡 Best Practices Learned
- Always use the compliance verification template before starting tasks
- Prioritize technical debt prevention through systematic searching
- Maintain dual backup workflow (GitHub + clasp) consistently
- Document compliance decisions for future reference

---

**⚠️ Prevention is better than consolidation - build clean from the start.**  
**🎯 Focus on single source of truth and extending existing functionality.**  
**📈 Each task should maintain clean architecture and prevent technical debt.**

---

*🎯 Template by Chang Ho Chien | HC AI 說人話channel | v1.0.0*  
*📺 Tutorial: https://youtu.be/8Q1bRZaHH24*