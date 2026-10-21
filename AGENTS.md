# AI Coding Agent Directives & Project Rules

## 📌 Automated Patch Note & Version Management Directive
Whenever significant architectural changes, bug fixes, feature implementations, or security enhancements occur in the codebase:
1. **Document in Patch Notes**: Update `/docs/PATCH_NOTE.md` with:
   - Incremented SemVer version number (e.g., `v3.7.0` -> `v3.8.0` for features, or `v3.7.1` for fixes).
   - Timestamp date (ISO/KST).
   - Structured breakdown:
     - 🚀 Major New Features & Integrations
     - 🛡️ Security Hardening & Authentication
     - 🔧 Bug Fixes & Stability Improvements
     - 📈 UI/UX & Performance Optimizations
2. **Synchronize System Versioning**: Keep top-level document headers and metadata aligned with the latest patch version.
