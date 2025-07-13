# CLAUDE.md - Google Apps Script Educational Management System

> **Documentation Version**: 1.0  
> **Last Updated**: 2025-07-13  
> **Project**: Google Apps Script Educational Management System  
> **Description**: Educational management system with teacher management, student data import, dashboard, and automation features  
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
- **SYSTEMATIC WORKFLOW** - TodoWrite → Parallel agents → Git checkpoints → GitHub backup → Test validation
- **GITHUB BACKUP WORKFLOW** - After every commit: `git push origin main` to maintain GitHub backup
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

**Step 5: Session Management**
- [ ] Is this a long/complex task? → If YES, plan context checkpoints
- [ ] Have I been working >1 hour? → If YES, consider /compact or session break

> **⚠️ DO NOT PROCEED until all checkboxes are explicitly verified**

## 🏗️ PROJECT OVERVIEW

This is a Google Apps Script-based educational management system with the following components:

### 📁 **Current Project Structure**
```
comm/
├── CLAUDE.md                 # This file - essential rules for Claude Code
├── AutomationTriggers.gs     # Automated triggers and scheduling
├── Code.gs                   # Main application logic
├── DashboardController.gs    # Dashboard backend controller
├── ProgressTracking.gs       # Student progress tracking
├── StudentDataImport.gs      # Student data import functionality
├── SystemUtils.gs           # Shared utility functions
├── TeacherManagement.gs     # Teacher management features
├── dashboard.html           # Frontend dashboard interface
└── 系統使用手冊.md          # System manual in Chinese
```

### 🎯 **DEVELOPMENT STATUS**
- **Setup**: ✅ Complete
- **Core Features**: 🔄 In Development
- **Testing**: ⏳ Pending
- **Documentation**: 🔄 In Progress

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

## 🚀 COMMON COMMANDS

```bash
# Test Google Apps Script functions
# (Add your testing commands here as you develop them)

# Deploy to Google Apps Script
# (Add deployment commands here)

# Backup to GitHub
git add .
git commit -m "Descriptive commit message"
git push origin main
```

## 🎯 RULE COMPLIANCE CHECK

Before starting ANY task, verify:
- [ ] ✅ I acknowledge all critical rules above
- [ ] .gs files can be in root (GAS requirement)
- [ ] Use Task agents for >30 second operations
- [ ] TodoWrite for 3+ step tasks
- [ ] Commit after each completed task

---

**⚠️ Prevention is better than consolidation - build clean from the start.**  
**🎯 Focus on single source of truth and extending existing functionality.**  
**📈 Each task should maintain clean architecture and prevent technical debt.**

---

*🎯 Template by Chang Ho Chien | HC AI 說人話channel | v1.0.0*  
*📺 Tutorial: https://youtu.be/8Q1bRZaHH24*