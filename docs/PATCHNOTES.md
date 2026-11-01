# Patch Note - System Update (v3.53.0)

This document is synchronized with `/docs/PATCH_NOTE.md`.

---

## [v3.53.0] - 2026-11-01

### 🚀 Major New Features & Integrations
- **Automated GitHub Pages Deployment Pipeline**: Integrated `workflow_run` event trigger and explicit CLI dispatch (`gh workflow run deploy-pages.yml`) into `.github/workflows/deploy-pages.yml` and `windows-fix-collector.yml`, enabling automated GitHub Pages static site re-builds whenever dataset changes are collected or pushed.
- **Commit Filter Optimization**: Removed `[skip ci]` tag from autonomous AI collector commit messages to enable CI/CD workflow evaluation.
- **Admin Tab GitHub Pages Auto-Deploy Control Center**: Added `autoDeployPages` toggle switch in `/api/github/config`, direct database push with auto-deploy endpoint (`POST /api/github/push-to-repo`), and 1-click remote Pages dispatch endpoint (`POST /api/github/deploy-pages`).
- **Real-Time Deployment Status & Site Link**: Displays live status badges and direct URL (`https://${owner}.github.io/${repo}/`) in the Admin Tab.

---

## [v3.52.0] - 2026-11-01

### 🚀 Major New Features & Integrations
- **Enterprise Data Backup & Granular Export**: Customizable collection selector (`issues`, `feedback`, `bookmarks`, `system_config`, `admin_logs`), dual formats (`.zip` multi-collection vs `.json`), and automated SHA-256 tamper-proof checksum generation.
- **Interactive Dry-Run Pre-Import Simulation**: Zero-write in-memory inspection of uploaded `.zip`/`.json` backup archives before database writes, verifying SHA-256 hashes, displaying schema discrepancy reports, and offering conflict resolution modes (`Smart Merge`, `Skip Existing`, `Clean Overwrite`).
- **Multi-Snapshot Archives & Rollback Explorer**: 4-tab central management hub covering active Last-Known-Good state rollback, server-side historical snapshot archives (`/api/admin/last-known-good/snapshots`), browser-local persistent IndexedDB snapshots with 1-click restore/export, and automated retention cleanup policies.
- **Dual Runtime Support**: Fully functional on both Node.js Express server backend and static GitHub Pages client-side mode (via IndexedDB and client-side JSZip).

---

## [v3.51.0] - 2026-11-01

### 🚀 Major New Features & Integrations
- **Blogger Patch Guide Document (`blogger_patch_guide.md`)**: Comprehensive standardized template specification supporting both **[Rich Text (작성 모드)]** and **[HTML Editing Mode (`<>`)]** following the strict 10-tier order:
  `1.Title ➔ 2.Body ➔ 3.Update Info ➔ 4.App Screenshot Placeholder ➔ 5.Download Link ➔ 6.Version Info ➔ 7.System Requirements ➔ 8.Official Channels ➔ 9.Patch Notes (from latest commits) ➔ 10.Recommended Tags`
- **Recommended Tags Standardization**: Exactly 20 bilingual tags within 129 characters (< 200 characters).
- **Curated Functional Changelog**: Curated all previous releases focusing on functional improvements.

**Official Channels:**
- Developer: AhBiYout (GitHub: AhBiYout-all)
- GitHub Repo: https://github.com/AhBiYout-all/windows-fix-wizard
- Live Web Service: https://ahbiyout-all.github.io/windows-fix-wizard/
- Official Google Blog: https://ahbiyoutvibe.blogspot.com/
- Affiliation: CISNet (https://www.cisnet.co.kr)
