# Google Apps Script Educational Management System

A comprehensive educational management system built with Google Apps Script, featuring teacher management, student data import, progress tracking, and automated dashboards.

## 🚀 Quick Start

1. **Read CLAUDE.md first** - Contains essential rules for Claude Code development
2. Follow the pre-task compliance checklist before starting any work
3. Use proper Google Apps Script structure with .gs files in root
4. Commit after every completed task

## 📁 Project Structure

```
comm/
├── CLAUDE.md                 # Essential Claude Code development rules
├── README.md                 # This file
├── .gitignore               # Git ignore patterns
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

## 🎯 Core Features

- **Teacher Management**: Comprehensive teacher data management and operations
- **Student Data Import**: Automated student data import and processing
- **Progress Tracking**: Real-time student progress monitoring
- **Dashboard Interface**: Interactive web-based dashboard
- **Automation Triggers**: Scheduled tasks and automated workflows
- **System Utilities**: Shared functionality and helper functions

## 🛠️ Development Guidelines

### ✅ Best Practices
- **Always search first** before creating new .gs files
- **Extend existing** functionality rather than duplicating  
- **Use Task agents** for operations >30 seconds
- **Single source of truth** for all functionality
- **Follow GAS conventions** - .gs files in root directory
- **Descriptive naming** - TeacherManagement.gs not teacher.gs

### ❌ Avoid
- Creating duplicate files (enhanced_*, v2_*, new_*)
- Multiple implementations of same concept
- Hardcoded values that should be configurable
- Copy-pasting code instead of extracting utilities

## 🔧 Development Workflow

1. **Before starting any task**: Follow CLAUDE.md compliance checklist
2. **Search existing code**: Use Grep/Glob to find similar functionality
3. **Extend, don't duplicate**: Prefer extending existing .gs files
4. **Test thoroughly**: Verify functionality in Google Apps Script environment
5. **Commit frequently**: After each completed feature/task
6. **Document changes**: Update this README if structure changes

## 📚 Google Apps Script Specific Notes

- **.gs files in root**: Required by Google Apps Script runtime
- **HTML files**: Web app interfaces should be in root alongside .gs files
- **Shared utilities**: Use SystemUtils.gs for common functionality
- **Error handling**: Implement proper GAS error handling patterns
- **Triggers**: Use AutomationTriggers.gs for time-based and event triggers

## 🚀 Getting Started

### For Development:
1. Clone this repository
2. Read CLAUDE.md for development rules
3. Open in Google Apps Script editor
4. Follow the compliance checklist before any changes

### For Users:
See `系統使用手冊.md` for complete user documentation in Chinese.

## 🤝 Contributing

When contributing to this project:

1. **Acknowledge CLAUDE.md rules** before starting
2. **Search existing code** before creating new functionality
3. **Follow GAS conventions** for file structure and naming
4. **Test in GAS environment** before committing
5. **Document your changes** in commit messages and code comments

## 📄 License

[Add your license information here]

---

*🎯 Template by Chang Ho Chien | HC AI 說人話channel | v1.0.0*  
*📺 Tutorial: https://youtu.be/8Q1bRZaHH24*

**⚠️ Always follow CLAUDE.md rules for clean, maintainable development**