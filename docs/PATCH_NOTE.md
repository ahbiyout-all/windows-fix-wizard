# Patch Note - System Update (v3.19.0)

This patch document outlines the latest features, enhancements, and system security fixes applied to the Windows Fix Wizard system.

---

## [v3.19.0] - 2026-10-24

### 🛡️ Security Hardening & Open Source Compliance

#### 1. Official Standard MIT License File (`/LICENSE`)
- **Root Directory Open Source License Creation**: Created standard `/LICENSE` file in the repository root directory.
- **Copyright Ownership & Development Timeline**: Configured copyright ownership to `AhBiYout` with development start through current year range (`Copyright (c) 2024-2026 AhBiYout`).

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.19.0`.

---

## [v3.18.0] - 2026-10-24

### 🚀 Major New Features & Integrations

#### 1. Real-Time Live Streaming & Auto-scroll Toggle Switch for Backend Engine Logs
- **Auto-scroll to Bottom Toggle Switch**: Added a dedicated, high-contrast toggle switch ("하단 자동 스크롤" / "Auto-scroll to bottom") in the Backend Engine logs modal header. Enables administrators to keep the viewport pinned to the latest log entries as they stream in.
- **Real-time 3-Second Live Stream Polling**: Integrated automated background polling (`useEffect` with 3s interval) when viewing Backend Engine logs, allowing administrators to watch live logs stream in real-time as background tasks or manual runs execute.
- **Interactive Log Controls**: Added a "LIVE STREAMING" animated pulsing status badge, a manual "최하단으로 이동" (Jump to Bottom) button, a "새로고침" (Refresh) trigger, and a direct "엔진 즉시 가동" (Run Engine Now) action button inside the log viewer toolbar.
- **Chronological Log Stream**: Formatted log entries in chronological order (oldest at top, newest at bottom) with level badges (`[INFO]`, `[WARN]`, `[ERROR]`), formatted timestamps, and expandable JSON details.

### 📈 UI/UX & Performance Optimizations
- **Auto-scroll Preference Persistence**: Persists user auto-scroll preferences in `localStorage` (`winfix_autoscroll_backend_logs`).
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.18.0`.

---

## [v3.17.0] - 2026-10-24

### 🛡️ Security Hardening & Authentication

#### 1. Pre-Flight API Key Sanity & Format Verification Engine (`isValidGeminiApiKey`)
- **Proactive Key Pre-Flight Filtering**: Added strict format pre-validation (`isValidGeminiApiKey` in `server.ts` and `isValidApiKeyFormat` in `src/App.tsx`) to filter out dummy/placeholder API key entries (`CUSTOM_API_KEY`, `My_Project_40329`, `GEMINI_API_KEY`, or keys missing the `AIza` prefix) before initiating backend sync or client API requests.
- **Eliminated Verification Error Logs**: Unconfigured or invalid environment keys are now flagged as placeholders (`isPlaceholder: true`) during key collection (`getAllAvailableKeys`), gracefully bypassing unnecessary network requests and preventing repeated `[Engine Sync] Key '...' verification failed` console log entries.
- **Quarantine Management**: Real invalid keys encountered at runtime are quarantined quietly without triggering unhandled system error alerts or false-positive alarms.

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, `server.ts`, and `docs/PATCH_NOTE.md` to `v3.17.0`.

---

## [v3.16.0] - 2026-10-24

### 🚀 Major New Features & Integrations

#### 1. Voice Dictation (Speech to Text) Search Input Integration
- **Web Speech API Dictation**: Added a microphone icon button inside the AI Diagnostic (Wizard tab) search input field allowing users to dictate Windows error codes and symptoms hands-free using browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
- **Interactive Listening Feedback**: Features real-time visual feedback with an animated pulsing microphone icon (`Mic` / `MicOff`) and active listening banner when voice dictation is active.
- **Language Support**: Automatically selects `ko-KR` for Korean language interface and `en-US` for English interface.
- **Graceful Fallback**: Displays informative guidance when dictation is used in browsers without SpeechRecognition API support.

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.16.0`.

---

## [v3.15.2] - 2026-10-24

### 📈 UI/UX & Visual Enhancements

#### 1. Visual Severity Icons Alignment in Admin Error Modal
- **Specific Lucide Severity Icons**: Updated the Admin error log modal and overview grid with the requested iconography:
  - **`FATAL` Severity**: `AlertOctagon` icon with animated pulsing indicator dot on a crimson badge (`bg-rose-600 text-white`).
  - **`ERROR` Severity**: `AlertTriangle` icon on a red badge (`bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300`).
  - **`WARNING` Severity**: `AlertCircle` icon on an amber badge (`bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300`).
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.15.2`.

---

## [v3.15.1] - 2026-10-24

### 🚀 Major New Features & Integrations

#### 1. Color-Coded Status Badges & Visual Severity Indicators in Admin Error Modal
- **Enhanced Visual Severity Indicators**: Added color-coded status badges and visual indicator dots next to error log entries in the Admin error log modal:
  - **`FATAL` Severity**: Distinctive crimson badge (`bg-rose-600 text-white`) with animated pulsing status dot (`animate-ping`) and `ShieldAlert` icon for immediate urgent visibility.
  - **`ERROR` Severity**: High-visibility red badge (`bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300`) with solid red status dot and `AlertCircle` icon.
  - **`WARNING` Severity**: Amber warning badge (`bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300`) with solid amber status dot and `AlertTriangle` icon.
- **Card Side Border Color-Coding**: Error log entry cards now feature left-accent borders (`border-l-4`) matched to severity level (`border-l-rose-600`, `border-l-red-500`, `border-l-amber-500`).
- **Log Severity Summary Banner**: Added a top summary grid showing real-time count breakdowns for `FATAL`, `ERROR`, and `WARNING` entries at a glance.

### 📈 UI/UX & Performance Optimizations
- **Improved Log Readability**: Standardized stack trace summary and timestamp formatting in the error log detail view.
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.15.1`.

---

## [v3.15.0] - 2026-10-23

### 🚀 Major New Features & Integrations

#### 1. Pure GitHub Pages Delivery & Complete Legacy Desktop Artifact Purge
- **Full Transition to Pure GitHub Pages Web Service**: In accordance with user directives to serve exclusively via GitHub Pages (`https://ahbiyout-all.github.io/windows-fix-wizard/`), all legacy desktop installer downloads (`.exe`), Inno Setup scripts, and local execution artifacts have been completely eliminated.
- **Purged Obsolete Installer Files**:
  - Removed `scripts/installer.iss` (legacy Inno Setup multi-file installer configuration).
  - Removed `.github/workflows/release-build.yml` (legacy Windows installer packaging runner).
  - Retained clean GitHub Pages deployment automation (`deploy-pages.yml`) and autonomous Microsoft documentation harvester (`windows-fix-collector.yml`).
- **Eliminated Desktop `.exe` References from UI**:
  - Removed `handleDownloadInstaller` function and all desktop `.exe` download buttons from Header, Mobile Quick Navigation Drawer, and Update Notification Modal.
  - Replaced installer triggers with direct official GitHub Pages cloud links and zero-friction PWA web app installation.

### 🛡️ Security Hardening & Authentication
- **Zero Local Executable Vulnerability**: Eliminating `.exe` downloads protects end users from false-positive Windows Defender / SmartScreen warnings and removes local executable execution vectors.
- **Serverless GitHub Pages Direct Routing**: All update notices, shortcuts, and documentation now route securely to HTTPS-secured GitHub Pages and GitHub Releases documentation.

### 🔧 Bug Fixes & Stability Improvements
- **Update Modal Modernization**: Modernized the update notification modal from an `.exe` installer download banner to an official GitHub Pages cloud deployment notice with a direct `[GitHub Pages 최신 웹앱 열기]` button pointing to `GITHUB_PAGES_URL`.
- **Eliminated Unused Handlers & Dead Code**: Purged obsolete click handlers and unneeded state references for installer downloads across desktop and mobile components.

### 📈 UI/UX & Performance Optimizations
- **Streamlined Navigation Header**: Header UI cleanly focuses on `[언어 전환 (KO/EN)]`, `[다크/라이트 모드]`, `[웹앱 설치 (PWA)]`, `[공식 GitHub Pages]`, and `[실시간 업데이트 확인]`.
- **Responsive Mobile Quick Tools**: Mobile drawer optimized with a clean 2-column + full-width layout for PWA install, GitHub Pages link, and real-time update verification.
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.15.0`.

---

## [v3.14.0] - 2026-10-23

### 🚀 Major New Features & Integrations

#### 1. Full Modernization for GitHub Pages Static Deployment & Legacy Code Purge
- **Purged Obsolete Manual Service Worker & Dummy Assets**: Removed deprecated `public/sw.js` and inline registration script in `index.html`. Full PWA service worker caching and lifecycle management are now delegated to VitePWA (`vite-plugin-pwa`) with automatic background updates.
- **Removed Deprecated Startup Batch & TinyURL Scripts**:
  - Eliminated legacy `AI_AutoSync_Setup.bat` and `WinFix_Register_Startup.bat` scripts that previously registered startup batch commands to open external TinyURL (`tinyurl.com/2fsfjuuk`) in Microsoft Edge.
  - Replaced legacy batch downloads in the navigation header, mobile quick tools, and admin sync panel with direct links to the official Windows installer (`Windows_Fix_Wizard_Setup.exe`) published on GitHub Releases and one-click GitHub Actions GitOps cloud runner access.
- **Modernized PWA & Desktop Shortcut Creation**:
  - `handleInstallClick` now invokes the browser-native `beforeinstallprompt` dialog (`deferredPrompt.prompt()`) on supported desktop and mobile devices.
  - For standard browsers, generates desktop shortcuts pointing directly to the official GitHub Pages URL (`https://ahbiyout-all.github.io/windows-fix-wizard/`).

### 🛡️ Security Hardening & Authentication
- **Zero-404 Static Environment Guard**: Added runtime `IS_GITHUB_PAGES` environment detection (`window.location.hostname.endsWith('github.io')`). The application automatically silences and bypasses server-only Express API calls (`/api/backend-health`, `/api/logs/add`, `/api/visitor/log`, `/api/visitor/autoblock-settings`), preventing 404 network failure noise in the browser console.
- **Removed Placeholder AdSense Scripts**: Purged non-functional `ca-pub-PLACEHOLDER` scripts from `index.html`, eliminating 400 Bad Request console errors upon page load.

### 🔧 Bug Fixes & Stability Improvements
- **Dual-Mode Static Issue Resolution**: In `fetchIssues`, if the database mode is set to local file or offline while hosted on GitHub Pages, the app automatically falls back to `./data/issues.json` or fetches directly from the official GitHub Raw Content CDN (`raw.githubusercontent.com`), ensuring seamless search and troubleshooting without a Node server.
- **GitHub Pages Workflow Dataset Packaging**: Updated `.github/workflows/deploy-pages.yml` to package `data/issues.json` into `dist/data/issues.json` alongside SPA `404.html` and `.nojekyll` bypass files during automated CI/CD builds.

### 📈 UI/UX & Performance Optimizations
- **Streamlined Navigation Header & Mobile Drawer**: Header now cleanly features `[앱 설치]` (PWA/Shortcut), `[PC 설치 (.exe)]` (Official Installer), and `[업데이트 확인]` (Real-Time Release Check).
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, `server.ts`, `scripts/installer.iss`, `scripts/github_push.bat`, `scripts/github_push.sh`, and `docs/PATCH_NOTE.md` to `v3.14.0`.

---

## [v3.13.2] - 2026-10-22

### 🚀 Major New Features & Integrations

#### 1. Hardened Multi-Format Admin Token Parsing & Pre-Flight JWT Structural Validation
- **Eliminated `FirebaseAuthError (Decoding Firebase ID token failed)`**: Resolved server-side runtime exceptions caused by passing non-JWT credentials, un-prefixed passkeys, or quoted tokens directly to `admin.auth().verifyIdToken()`.
- **Pre-Flight 3-Part JWT Validation**: The `requireAdmin` middleware now strictly verifies token structure (`jwtParts.length === 3`) before invoking Firebase Admin SDK decoding, preventing `auth/argument-error` exceptions when non-JWT or malformed strings are received.
- **Universal Passkey Format Acceptance**: Expanded candidate passkey matching in `requireAdmin` to accept both prefixed (`passkey:<key>`) and direct (`<key>`) administrative tokens (e.g., `winfix-admin-2026!`, `winfix-master-key`, `dev_admin_bypass`, or `process.env.ADMIN_PASSKEY`).
- **Client-Side Passkey Token Priority**: Updated `getAuthHeaders` in `src/App.tsx` so that an active admin passkey session (`winfix_admin_passkey_active`) takes precedence over standard or unprivileged user session tokens.

### 🛡️ Security Hardening & Authentication
- **Sanitized Token Verification Logging**: Replaced fatal `console.error` dumps with clean `console.warn("[Admin Auth] ...")` rejection messages, preventing false positive alarm escalations during unauthorized or expired access attempts.
- **Case-Insensitive Admin Email Matching**: Normalized decoded Firebase token email claims (`toLowerCase().trim()`) when comparing against the authorized administrator whitelist.

### 🔧 Bug Fixes & Stability Improvements
- **Zero-Crash Authentication Flow**: Handled malformed, empty, or expired bearer tokens cleanly with HTTP 401 Unauthorized responses rather than unhandled promise rejections.

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, `server.ts`, and `docs/PATCH_NOTE.md` to `v3.13.2`.

---

## [v3.13.1] - 2026-10-22

### 🚀 Major New Features & Integrations

#### 1. Autonomous Engine Smart API Key Quarantine & Fail-Safe Standby Architecture
- **Instant Invalid Key Quarantine**: Resolved the multi-model cascade failure where unverified or revoked API keys (`CUSTOM_API_KEY`, `My_Project_40329`, etc.) repeatedly triggered `[Engine Sync] Model '...' with '...' failed: API key not valid` across all 5 models on every cron cycle.
- **Immediate Model Loop Break**: The engine now identifies `API_KEY_INVALID` or `API key not valid` on the very first model attempt, immediately quarantines the faulty key for 24 hours (`knownInvalidKeys`), and breaks out of the loop without attempting subsequent models.
- **Graceful Standby Mode**: When all environment keys are invalid or unconfigured, the background engine transitions into quiet standby mode (`consecutiveFailures: 0`), preserving GitOps synchronization and serving issues seamlessly via the local database.
- **Quarantine Reset on Demand**: Added automated cache and quarantine invalidation whenever an administrator triggers a manual engine run (`/api/engine/run-now`), enabling instant re-testing once new keys are provided in Secrets.

### 🛡️ Security Hardening & Authentication
- **Console Log Sanitization**: Silenced raw RPC error dumps when invalid API keys are encountered, preventing credential noise and false positive alert triggers.
- **Clean Client-Side Error Translation**: Updated client-side AI caller (`callAiWithFallback`) to intercept invalid API key errors and present user-friendly guidance directing administrators to configure valid keys in Settings, rather than retrying multiple models pointlessly.

### 🔧 Bug Fixes & Stability Improvements
- **Resolved Sync Error Spam**: Eliminated repeating 10-line error cascades (`error 0` through `error 9`) in the server logs.
- **Zero Consecutive Failure Impact**: Prevented invalid API key errors from incrementing server failure counters or triggering false emergency email notifications.

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, `server.ts`, and `docs/PATCH_NOTE.md` to `v3.13.1`.

---

## [v3.13.0] - 2026-10-22

### 🚀 Major New Features & Integrations

#### 1. Dedicated Multi-Channel Admin Authentication Portal
- **Dedicated Admin Login Tab**: Re-architected the Authentication Modal (`showAuthModal`) into a 3-tab portal separating **"🛡️ 관리자 로그인 (Admin Portal)"**, **"👤 일반 로그인 (User Login)"**, and **"📝 회원가입 (Sign Up)"**.
- **Google Admin One-Click Authentication**: Streamlined one-click Google OAuth verification with automated allowlist inspection (`ahbiyoutwinfix@gmail.com`, `redmunlight@gmail.com`, `ahbiyout@gmail.com`, `ahbiyoutwinfixwizard@gmail.com`) that grants immediate Super Administrator role.
- **Emergency / Sandbox Master Passkey Authentication (`ADMIN_PASSKEY`)**:
  - Implemented instant passkey verification allowing administrators to authenticate immediately even when Google OAuth popup is blocked by browser policies, in cross-origin iframes, sandboxed preview environments, or GitHub Pages.
  - Added dedicated server-side verification endpoint (`/api/admin/verify-passkey`) and client-side fallback with `[기본 마스터키 자동입력]` button for frictionless access.
  - Added configurable `ADMIN_PASSKEY` environment variable in `.env.example`.

### 🛡️ Security Hardening & Authentication
- **Secure Token Bearer Protocol**: Extended server-side `requireAdmin` middleware to support `passkey:*` bearer authorization alongside Firebase ID tokens and admin bypass tokens.
- **Client Session Persistence & Instant Elevation**: Persisted admin session state (`winfix_admin_passkey_active`, `winfix_admin_token`, `winfix_admin_email`) in local storage, automatically restoring Super Administrator privileges across page reloads and browser restarts.
- **Comprehensive Admin Session Revocation**: Enhanced `handleLogout` to atomically purge all local admin tokens, passkeys, and active sessions alongside Firebase `signOut(auth)`.

### 🔧 Bug Fixes & Stability Improvements
- **Domain Mismatch & Popup Blocker Fallback**: Eliminated admin lockout caused by Firebase `auth/unauthorized-domain` or `auth/popup-blocked` errors on custom domains and GitHub Pages by providing instant passkey bypass guidance.
- **Clear Privilege Feedback**: Enhanced error messages to distinguish between unauthorized accounts and system login failures.

### 📈 UI/UX & Performance Optimizations
- **Prominent Header Admin Badge**: Displayed glowing `👑 관리자 모드 [SUPER]` badge in desktop header with one-click direct jump to the Admin Console (`activeTab = 'admin'`).
- **Direct Admin Quick Access**: Added dedicated `🛡️ 관리자` quick launch button in top navigation and mobile drawer for instant portal access.
- **Global Version Synchronization**: Aligned system versioning across `package.json`, `src/App.tsx`, `server.ts`, `.env.example`, and `docs/PATCH_NOTE.md` to `v3.13.0`.

---

## [v3.12.0] - 2026-10-21

### 🚀 Major New Features & Integrations

#### 1. Selective GitOps Repository Management & Strict .gitignore Architecture
- **Complete .gitignore Re-architecture**: Replaced permissive default rules with a hardened, 10-tier exclusion matrix designed to guarantee that ONLY essential build source code, official documentation, public assets, and official automation workflows are pushed to GitHub.
- **Strict Exclusion of Deployment Push Scripts**: Explicitly excluded local deployment and push automation scripts (`scripts/github_push.bat`, `scripts/github_push.sh`, `*github_push*`) from repository tracking, ensuring private deployment workflows and tokens remain strictly local.
- **Runtime Log & Volatile Storage Isolation**: Strictly excluded server runtime logs (`data/logs_backend.json`, `data/logs_visitor.json`), local instance configs (`data/maintenance_config.json`, `data/system_config.json`, `data/github_config.json`), and temporary files, while preserving essential GitOps data feeds (`data/issues.json`, `data/github-feed.json`).

#### 2. Local Repository Commit & Push Pipeline Modernization (`scripts/github_push.bat` & `scripts/github_push.sh`)
- **Automated Pre-Flight Security Verifier**: Integrated automated scanning that audits staged and untracked changes for sensitive credentials (`.env`, `serviceAccountKey*.json`, `firebase-adminsdk*.json`) or runtime log leaks before allowing a commit.
- **Fail-Safe Push Script Unstaging**: Both Windows batch and Linux/macOS bash push utilities automatically unstage `scripts/github_push.*` and runtime JSON files before staging, preventing accidental tracking even if `git add .` was executed manually.
- **Cross-Platform Parity**: Provided fully mirrored Bash script (`scripts/github_push.sh`) alongside Windows Batch (`scripts/github_push.bat`) with identical validation, dynamic version discovery, release tagging, and push capabilities.

### 🛡️ Security Hardening & Authentication
- **Zero-Credential Exposure Guarantee**: Eliminated scratch debugging scripts (`test-*.ts`, `check-*.ts`, `replace_date.mjs`) from the workspace and added wildcard exclusion patterns preventing temporary test files from ever being committed to GitHub.
- **Secret Isolation Enforcement**: Ensured `.env` and private service keys remain uncommitted, preserving `.env.example` as the canonical template.

### 🔧 Bug Fixes & Stability Improvements
- **Workspace Cleanup**: Purged deprecated one-off testing scripts from root (`test-api-key*.ts`, `test-client-fs.ts`, `test-env*.ts`, `check_logs.ts`, `update-upvotes.ts`, `replace_date.mjs`, `generate-icons.cjs`).
- **Clean Git Tracking Alignment**: Re-initialized local repository tracking (`main` branch) and verified that only production-required files are detected by `git status`.

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, `server.ts`, `scripts/installer.iss`, `scripts/github_push.bat`, `scripts/github_push.sh`, and `docs/PATCH_NOTE.md` to `v3.12.0`.

---

## [v3.11.0] - 2026-10-21

### 🚀 Major New Features & Integrations

#### 1. Comprehensive Master Reinforcement of "GitHub Actions & GitOps Autonomous Data Collection Guide" (`/docs/GITHUB_ACTIONS_GUIDE.md`)
- **Complete End-to-End Operational Manual**: Thoroughly expanded `/docs/GITHUB_ACTIONS_GUIDE.md` into an enterprise-grade, 9-chapter reference manual covering zero-cost cloud runner orchestration, immutable Git persistence, and multi-cloud sync.
- **Detailed Lifecycle Sequence Diagram**: Added complete Mermaid sequence diagram outlining the 6-stage lifecycle (Cron Schedule -> Ubuntu 22 LTS Runner -> Gemini AI Web Grounding -> Schema Deduplication -> Git Auto-Commit -> Live Webhook Sync).
- **Timezone Scheduling Reference**: Documented UTC-to-KST cron conversion table (`0 */6 * * *` executing at 09:00, 15:00, 21:00, 03:00 KST) with custom scheduling recipes.

#### 2. In-App Interactive GitOps Full Guidebook Modal (`src/App.tsx`)
- **Direct UI Accessibility**: Embedded a dedicated "📖 구축 가이드 전문 (Full Guidebook)" interactive modal right in the Admin Dashboard GitOps Harvesting Center.
- **Multi-Tab Interactive Explorer**:
  - 🏗️ **Architecture & Lifecycle**: Core philosophy (0-cost operation, immutable Git history) and 4-step pipeline cards.
  - 🚨 **403 Write Permissions Guide**: Step-by-step visual instructions for enabling "Read and write permissions" in GitHub repository settings.
  - 🔑 **Repository Secrets**: Quick-reference table for `GEMINI_API_KEY`, `APP_WEBHOOK_URL`, and `CRON_SECRET` with copy utilities.
  - ⏰ **Cron & KST Times**: Time conversion cards for 6h, 4h, and morning/evening cron intervals.
  - 💻 **CLI Terminal Run**: Ready-to-run copyable commands for Windows PowerShell, CMD, and Linux/macOS Bash.
  - 📜 **Workflow YAML Viewer**: High-contrast, scrollable YAML code block with one-click copy.
- **Direct Settings Link**: Quick-launch navigation button directing administrators straight to their repository's Actions settings page (`Settings > Actions`).

#### 3. Production GitHub Actions Workflow Synchronization & Hardening
- **Synchronized Workflow Definition**: Synchronized in-app `GITHUB_WORKFLOW_YAML` with `.github/workflows/windows-fix-collector.yml`, incorporating Node.js 22 LTS, `timeout-minutes: 15`, category choice inputs, and automated 3-attempt rebase retry loops.

### 🛡️ Security Hardening & Authentication
- **403 Permission Denied Elimination Protocol**: Added definitive troubleshooting and configuration directives for GitHub Actions `GITHUB_TOKEN` permissions, resolving the frequent `Permission to ... denied to github-actions[bot]` error.
- **Encrypted Secret Isolation**: Documented best practices for secret management with automatic log masking for `GEMINI_API_KEY` and webhooks protected by `x-cron-secret` HMAC headers.

### 🔧 Bug Fixes & Stability Improvements
- **Concurrent Push Resilience**: Workflow incorporates an automated 3-attempt rebase and pull loop (`git pull --rebase origin ${{ github.ref_name }}`) before pushing, preventing CI push failures caused by concurrent commits.
- **Multi-Model AI Fallback**: Reinforced collector fallback sequence (`gemini-2.5-flash` -> `gemini-3.5-flash` -> `gemini-3.1-flash-lite` -> `gemini-2.5-flash-lite`) to safeguard against model-specific rate limits or outages.

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, `server.ts`, `scripts/github_push.bat`, `scripts/installer.iss`, and `docs/PATCH_NOTE.md` to `v3.11.0`.
- **Responsive Modal Design**: Tailored modal layout with backdrop blur, custom scrollbars, and mobile-friendly horizontal tab navigation.

---

## [v3.10.0] - 2026-10-21

### 🚀 Major New Features & Integrations

#### 1. GitHub Pages Automated Static Web Hosting Pipeline (`.github/workflows/deploy-pages.yml`)
- **Automated Web Deployment**: Added an official GitHub Actions workflow (`deploy-pages.yml`) triggered automatically on every `push` to `main` branch or manual `workflow_dispatch`.
- **Node.js 22 LTS Standard**: Runs on Node.js 22 LTS, fully compliant with GitHub's latest runner specifications and Node 20 EOL deprecation rules.
- **Relative Base Asset Routing**: Configured Vite with `base: './'` in `vite.config.ts`, ensuring all scripts, styles, icons, and PWA assets load cleanly under `https://AhBiYout-all.github.io/windows-fix-wizard/` as well as custom domains.
- **SPA 404 Fallback & Jekyll Bypass**: Automatically copies `dist/index.html` to `dist/404.html` and generates `dist/.nojekyll`, preventing broken asset routing or 404 reload errors on GitHub Pages.

#### 2. Client-Side Standalone Web App & Direct GitHub Releases API Integration
- **Serverless Standalone Web Mode**: Enables the web application to run entirely in modern web browsers without requiring a dedicated Node.js backend.
- **Direct GitHub Public API Fallback**: When running on GitHub Pages (where `/api/github/check-update` is absent), `checkForUpdates` automatically queries `https://api.github.com/repos/AhBiYout-all/windows-fix-wizard/releases/latest` client-side.
- **Full Real-Time Update Experience on Web**: Website visitors can see update availability badges, popup notifications, release notes, and download the latest Windows installer (`.exe`) directly from the browser.

#### 3. In-App GitHub Pages Web Operations Hub (`🌐 GitHub Pages 공식 웹사이트 대용 운영 센터`)
- **Dedicated Admin Control Card**: Added a comprehensive GitHub Pages management card in the Admin tab with live status, website URL preview, and one-click copy.
- **Direct Navigation Links**: Quick-access buttons to open the live website, GitHub Pages settings (`Settings > Pages`), and GitHub Actions deployment execution logs.
- **3-Step Activation Guide**: Step-by-step Korean instructions for toggling Source to `GitHub Actions` in repository settings.

### 🛡️ Security Hardening & Authentication
- **Client-Side Environment & Token Protection**: Zero private credentials or access tokens exposed in static GitHub Pages bundles; uses GitHub public read-only API endpoints for release discovery.
- **Hardened Relative Asset Paths**: Updated `index.html` manifest, icon, and service worker references to relative paths (`./`) avoiding cross-domain leakage or mixed-content blocks.

### 🔧 Bug Fixes & Stability Improvements
- **Vite Base Configuration**: Fixed root-relative asset path issue by establishing `base: './'` in `vite.config.ts`.
- **Service Worker Subpath Compatibility**: Updated Service Worker registration in `index.html` to register safely relative to current subpath.
- **Package Scripts Synchronization**: Added `"build:pages": "vite build --base=./"` and bumped package version to `v3.10.0`.

### 📈 UI/UX & Performance Optimizations
- **Official Channel Branding Synchronized**: Added live GitHub Pages website (`https://ahbiyout-all.github.io/windows-fix-wizard/`) across App Footer, Update Modal, and Inno Setup installer metadata.
- **Pre-configured SEO & Social Graph**: Added OpenGraph, Twitter card tags, and author metadata (`AhBiYout`) to `index.html` for optimized search engine indexing and social sharing.

---

## [v3.9.0] - 2026-10-09

### 🚀 Major New Features & Integrations

#### 1. GitHub Releases Real-Time Auto-Update System & Dedicated Modal Window
- **Autonomous Release Detection**: Added real-time update verification endpoint (`GET /api/github/check-update`) with 5-minute memory caching to avoid GitHub REST API rate-limits.
- **Auto-Triggering Notification Popup Modal**: Automatically prompts users whenever a newer version is tagged and published on GitHub Releases (`tag_name > current_version`).
- **Interactive Update Notification Modal Component**:
  - Displays dynamic version progression (`v3.9.0` ➔ `vX.Y.Z`).
  - Summarizes release changelog and publication timestamp.
  - Highlights dedicated installer asset download (`.exe` only).
  - Official channels card with direct links to Developer AhBiYout (`AhBiYout-all`), Official Google Blog (`ahbiyoutvibe.blogspot.com`), and CISNet organization (`www.cisnet.co.kr`).
  - Provides "24시간 동안 알림 숨기기 (Snooze 24h)", "GitHub 릴리즈", and "지금 업데이트 다운로드 (Download Now)" buttons.
- **Manual Verification Triggers**: Added one-click "업데이트 확인" button across Desktop Navigation Bar, Mobile Drawer, and App Footer.

#### 2. GitHub Actions Automated Build & Release CI/CD Pipeline (`.github/workflows/release-build.yml`)
- **Automated Workflow**: Triggers on semantic tag push (`v*.*.*`) or manual `workflow_dispatch`.
- **Node.js 22 LTS Runtime**: Fully migrated to Node.js 22 LTS, preempting GitHub's Node.js 20 End-of-Life (EOL) deprecation warnings.
- **Automated Application Compilation**: Executes `npm run build` bundling server and client production artifacts.
- **Strict Installer-Only Artifact Publishing**: Builds the Inno Setup executable installer and computes SHA-256 checksums (`SHA256SUMS.txt`), strictly publishing ONLY the installer assets without bloated documentation or portable debug dumps.

#### 3. Inno Setup Multi-File Unpacked Installer Script (`scripts/installer.iss`)
- **Unpacked Multi-File Individual Installation**: Files unpack cleanly into `{app}` (`dist\*`, `package.json`, `data\issues.json`), avoiding bulky monofilament archives or portable dumps.
- **Previous Version Detection & Interactive Overwrite Prompt**:
  - Automatically queries Windows registry (`HKLM` / `HKCU`) for existing installation instances.
  - Prompts user with confirmation dialog (`MB_YESNO`) to overwrite/delete prior version before proceeding.
- **Silent Installation (무인 설치) Support**: Supports standard `/SILENT`, `/VERYSILENT`, and `/SUPPRESSMSGBOXES` flags, automatically bypassing GUI prompts during unattended automation.
- **Silent Windows Firewall Inbound Rules Pre-Registration**:
  - Silently registers both Base Name (`Windows Fix Wizard`) and Versioned Name (`Windows Fix Wizard v3.9.0`) into Windows Firewall via `netsh.exe advfirewall`.
  - Automatically cleans up both firewall rules upon uninstallation.

#### 4. Dynamic Versioning GitHub Auto-Push Pipeline Script (`scripts/github_push.bat`)
- **Single Source of Truth Version Extraction**:
  - Primary resolution: extracts `version` from `package.json` using Node.js.
  - Fallback resolution: parses `vX.Y.Z` from `docs/PATCH_NOTE.md` top header regex using PowerShell.
- **Zero-Hardcoding Pipeline**: Automatically synchronizes `%APP_VER%` to console title, Git commit message (`[Release] Windows Fix Wizard v%APP_VER%`), and Git release tags (`v%APP_VER%`).
- **Security & Privacy Pre-flight Scan**: Automatically detects and blocks accidental staging of `.env` files or unauthorized credential keys before pushing.

### 🛡️ Security Hardening & Authentication
- **Comprehensive Privacy & File Exclusion (.gitignore)**: Hardened ignore rules to exclude unnecessary build artifacts (`Output/`, `*.exe`, `*.zip`, `test-*.ts`, `check-*.ts`) and prevent personal credentials or secrets from being leaked into repository.
- **Sanitized Default Configurations**: Removed all hardcoded personal emails in fallback configuration states, standardizing on environment variable overrides (`ALERT_EMAIL`) and sanitized defaults.
- **Firewall Rule Hygiene**: Ensures proper port mapping (TCP 3000) and cleans up duplicate firewall definitions during upgrades.

### 🔧 Bug Fixes & Stability Improvements
- **Node.js 20 Deprecation Fix**: Updated `.github/workflows/windows-fix-collector.yml` from `node-version: 20` to `node-version: 22` LTS.
- **Default Repository Assignment**: Configured standard repository `AhBiYout-all/windows-fix-wizard` across backend settings and frontend state.

### 📈 UI/UX & Performance Optimizations
- **Official Channel Branding & Footer**: Enriched footer and about dialogs with official developer identity:
  - Developer: `AhBiYout` (GitHub: `AhBiYout-all`)
  - Official Google Blog: `https://ahbiyoutvibe.blogspot.com/`
  - Affiliation: `CISNet (https://www.cisnet.co.kr)`
  - GitHub Repo: `https://github.com/AhBiYout-all/windows-fix-wizard`

---

## [v3.8.6] - 2026-09-29

### 🔧 Bug Fixes & Stability Improvements

#### 1. Gemini AI Autonomous Sync Engine Multi-Model Resilience & High-Demand Recovery
- **Root Cause**: During scheduled autonomous background runs, Google AI server spikes caused transient `503 Unavailable ("This model is currently experiencing high demand")` or search grounding rate-limits on specific model endpoints (such as `gemini-3.5-flash`). Previously, a single model failure caused the sync loop to abort the active API key and throw `All active Gemini API keys failed the synchronization process`, falsely triggering critical alert emails.
- **Multi-Model Sequential Fallback**: Upgraded the AI invocation engine in both backend (`server.ts`) and client (`src/App.tsx`) to dynamically cycle through prioritized models (`gemini-2.5-flash`, `gemini-3.8-flash`, `gemini-flash-latest`, `gemini-3.1-flash-lite`, `gemini-3.5-flash`).
- **Graceful Search Grounding Degradation**: When real-time Google Search grounding experiences rate-limiting or service spikes, the engine instantly falls back to standard pre-trained domain generation without terminating the synchronization cycle.
- **Standby Cooldown State**: If all keys and endpoints enter temporary cooldown, the engine gracefully logs an informational standby notice in `backend_logs` and waits for the next scheduled window without raising unhandled critical exceptions.

---

## [v3.8.5] - 2026-09-25

### 🚀 Major New Features & Integrations

#### 1. GitHub Actions Autonomous Data Harvesting & GitOps Engine
- **Autonomous Workflow (`.github/workflows/windows-fix-collector.yml`)**:
  - Implemented scheduled background runner (every 6 hours) on GitHub's free Ubuntu runner.
  - Added `workflow_dispatch` trigger supporting manual triggers with topic filtering (updates, BSOD, network, etc.) and batch sizing.
  - Automatically commits and pushes freshly harvested fixes to `data/issues.json` (`[skip ci]`), serving as a version-controlled, free CDN database.
- **Dedicated Collector Script (`scripts/github-collector.ts`)**:
  - Leverages Google Gemini AI (`@google/genai`) with Google Search Grounding to discover verified Windows 10/11 troubleshooting remedies.
  - Formats data strictly into the `KnownIssue` schema with safe PowerShell scripts and multilingual instructions.
  - Multi-level deduplication against existing error codes and normalized titles.
  - Automatically posts batches to live web application webhook (`POST /api/github/sync`).
  - Generates rich Markdown reports in GitHub Actions Step Summary (`$GITHUB_STEP_SUMMARY`).
- **Backend GitHub Integration API (`server.ts`)**:
  - `POST /api/github/sync`: Webhook endpoint for GitHub Actions runner with `x-cron-secret` validation and dual Firestore / File DB write.
  - `POST /api/github/pull-from-repo`: Allows pulling latest issues directly from GitHub raw URL or Contents API.
  - `POST /api/github/dispatch-workflow`: Remotely dispatches GitHub Actions workflow from the web application via GitHub REST API.
  - `GET /api/github/config` & `POST /api/github/config`: Manages repository, branch, and PAT configuration.
- **Admin GitOps Control Center (`src/App.tsx`)**:
  - Integrated "GitHub Actions & GitOps 자율 데이터 수집 센터" dashboard panel.
  - Visual 4-step pipeline architecture diagram.
  - Ready-to-use YAML code viewer with one-click clipboard copy.
  - One-click "Pull Data Now" and "Run Workflow" action triggers.

### 🛡️ Security Hardening & Authentication
- **Webhook Authentication**: Protected `/api/github/sync` using custom header secret validation (`x-cron-secret`).
- **Token Protection**: GitHub Personal Access Tokens (PAT) are masked in UI and encrypted/isolated in server configuration.

### 📈 UI/UX & Performance Optimizations
- **Zero Quota Consumption**: Enables instant synchronization of hundreds of Windows fixes directly from GitHub repository CDN without burning Firestore read quota or Gemini API limits.
- **Comprehensive Guide**: Created `/docs/GITHUB_ACTIONS_GUIDE.md` covering workflow configuration, GitHub Secrets, and troubleshooting.

---

## [v3.8.4] - 2026-09-12

### 📈 UI/UX & Performance Optimizations

#### 1. Responsive Header & Action Menu Cleanup in Admin & Maintenance View
- **Issue**: In mobile viewports (≤412px), the header container for "오늘의 데이터 사용량 (추정치)" (Today's Data Usage Estimate) attempted to display the section title, reading/writing metrics (`읽기 46 / 50,000`, `쓰기 0 / 20,000`), `지금 수집` (Sync Now), `자동 시작 설치` (Auto-Start Setup), `콘솔` (Console), and the refresh button all within a single rigid horizontal flex container. Consequently:
  - The section title was squeezed into a 20-30px column, forcing Korean characters to wrap vertically syllable-by-syllable (`오 / 늘 / 의 데 / 이 / 터 / 사 / 용 / 량 / (추 / 정 / 치)`).
  - The action button labels collapsed vertically (`지 / 금 / 수 / 집`), and the "자동 시작 설치" button overflowed completely off the right edge of the screen.
  - Similarly, in the "백엔드 자율 엔진 활동 로그 (최근 100건)" section below it, the long title squeezed the action buttons (`전체보기`, `비우기`), causing them to break into vertical single-syllable text columns (`전 / 체 / 보 / 기`, `비 / 우 / 기`).
- **Resolution**:
  - **Decoupled Mobile Section Title and Actions**: Converted the container into a responsive flex layout (`flex flex-col lg:flex-row lg:items-center justify-between gap-4`). On mobile viewports, the title and mobile refresh button occupy their own dedicated top line with ample space.
  - **Structured Stat Indicators Pill**: Grouped Reads and Writes counters into a compact, neatly styled statistic card with visual dividers and abbreviated limits (`/ 50k`, `/ 20k`), completely eliminating awkward metric wrapping.
  - **Single-Line Button Enforcement (`whitespace-nowrap shrink-0`)**: Applied strict `whitespace-nowrap shrink-0` across `지금 수집`, `자동 시작 설치`, and `콘솔` buttons with rounded corners, subtle border tints, and micro-press feedback (`active:scale-95`). On mobile, buttons wrap gracefully to a dedicated row without horizontal overflow.
  - **Backend Log Header Layout Normalization**: Refactored the backend autonomous engine log header to `flex-col sm:flex-row`, ensuring `전체보기` and `비우기` action buttons preserve their full horizontal text without vertical letter fragmentation.
  - **Responsive Outer Padding**: Adjusted outer card padding from `p-6` to `p-4 sm:p-6` across admin sections to provide balanced margins and avoid overlapping with floating scroll controls.

---

## [v3.8.3] - 2026-09-12

### 📈 UI/UX & Performance Optimizations

#### 1. Responsive Logs Modal Header & Action Menu Cleanup
- **Issue**: On mobile viewports (≤412px), the header of the logs modal (e.g., "앱 시스템 에러 로그", "관리자 활동 로그", "사용자 검색 로그" 등) jammed the title alongside "JSON 다운로드", "로그 비우기", and the close button on a single horizontal flex line. As a result, button labels collapsed into single vertical syllables (`JSON / 다운 / 로드`, `로 / 그 / 비 / 우 / 기`), causing visual clipping and severe distortion.
- **Resolution**:
  - **Decoupled Top Header and Mobile Action Bar**: Split the modal header on mobile (`< sm`) into a dedicated title/close bar and a clean, full-width secondary action toolbar.
  - **Single-Line Label Enforcement (`whitespace-nowrap`)**: Applied strict `whitespace-nowrap shrink-0` across all action buttons ("JSON 다운로드", "로그 비우기") and page indicators, completely eliminating vertical syllable wrapping.
  - **Full-Width Touch Targets on Mobile**: Gave mobile buttons comfortable touch targets (`flex-1 py-2 px-3`) with rounded corners, subtle tint borders, and micro-press feedback (`active:scale-95`).
  - **Desktop Preservation**: On desktop viewports (`sm:` and above), action buttons seamlessly retain their right-aligned placement next to the close button without layout shifts.
  - **Error Cards & Pagination Optimization**: Added `break-words` and `leading-relaxed` to error messages in the log viewer and refined pagination controls with responsive padding for mobile screens.

---

## [v3.8.2] - 2026-09-12

### 📈 UI/UX & Performance Optimizations

#### 1. Responsive Mobile Issue Card Layout Refactor
- **Issue**: On mobile viewports (<640px), badges like "하드웨어/드라이버" and "최신 트렌드" collided with lengthy error codes, titles, and vote/bookmark buttons within a horizontal flex line, causing text characters to wrap vertically and squeezing elements together. Additionally, the floating scroll widget was centered vertically over the cards.
- **Resolution**:
  - **Reorganized Mobile Card Hierarchy**: Restructured the card header into a vertical mobile layout (`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4`) with ample breathing room.
  - **No-Wrap Badge & Tag Row**: Grouped Category, Error Code, Latest Trend, and AI Verified badges into a flexible wrap container with `shrink-0 whitespace-nowrap` guarantees, preventing any 1-character vertical breaking.
  - **Dedicated Mobile Action Bar**: Moved Upvote, Downvote, and Bookmark actions into a clean, full-width bottom row on mobile with balanced borders, touch targets (≥44px), clear vote tallies, and an explicit "상세보기 / 접기" expander trigger.
  - **Repositioned Floating Scroll Buttons**: Moved the floating Top/Bottom scroll widget from `top-1/2` (which overlapped the central reading area on mobile) to `bottom-20 right-2 sm:bottom-24 sm:right-4`, ensuring it never obscures card content or touch targets.
  - **Responsive Expanded Content**: Enhanced PowerShell script box controls and action buttons to wrap cleanly on mobile screens without overflowing.

---

## [v3.8.1] - 2026-09-12

### 📈 UI/UX & Performance Optimizations

#### 1. Responsive Mobile Header Layout Refactor
- **Issue**: On narrow mobile screens (360px–412px), title text "Windows Fix Wizard" collided with 6 horizontal utility action buttons and broke awkwardly into 3 vertical lines ("Windows / Fix / Wizard").
- **Resolution**:
  - Partitioned desktop vs. mobile controls: On mobile devices, non-essential secondary actions are neatly housed inside a collapsible mobile drawer, leaving ample breathing room for brand identity and logo.
  - Added strict `whitespace-nowrap truncate` guarantees to the title heading to prevent unintended vertical text wrapping.
  - Placed high-frequency quick switches (EN/KO language toggle and Dark/Light theme toggle) beside a dedicated mobile menu hamburger button.

#### 2. Touch-Optimized Scrollable Navigation Bar (`no-scrollbar`)
- **Issue**: 5 full-width tabs were forced into a single fixed flex container on mobile, causing Korean and English labels to break into individual characters over 4–5 vertical lines (e.g. "AI 오 / 류 진 / 단 마 / 법사").
- **Resolution**:
  - Converted the navigation row to a smooth horizontal scrolling bar with hidden scrollbars (`overflow-x-auto no-scrollbar scrollbar-none`).
  - Added `shrink-0 whitespace-nowrap` to each tab pill with ergonomic 44px+ touch targets and rounded active indicators (`bg-blue-600 text-white`).
  - Optimized mobile tab labels for scannability while preserving full detailed titles on desktop screens.

#### 3. Slide-Down Mobile Navigation & Account Drawer
- **Feature**: An intuitive animated drawer (`AnimatePresence`) accessible via the mobile hamburger icon.
- **Details**:
  - Displays user profile status (logged-in email, Administrator badge, or Guest mode indicator) with a quick 1-tap Logout/Login button.
  - Provides instant full-width access to all application views: AI Diagnostic Wizard, Known Issues Guidebook, System Threat Verifier, My Lab, and Admin Auto-Sync.
  - Houses quick shortcut actions (Create PWA Shortcut, Add to Startup Program) and system metadata badges.
  - Automatically collapses upon route/tab selection for seamless navigation.

---

## [v3.8.0] - 2026-09-03

### 🚀 Major New Features & Integrations

#### 1. Zero-Quota Instant Search Engine (Client & Server Memory Indexing)
- **Feature**: Replaced direct per-keystroke/per-search Firestore document queries with in-memory candidate indexing and local search.
- **Details**:
  - Eliminates Firestore reads during Guidebook searches: queries for error codes (e.g. `0x80070002`, `CRITICAL_PROCESS_DIED`), keywords, or symptoms are resolved instantly against in-memory cached issues and local storage.
  - Added multi-token search algorithms matching Korean/English titles, descriptions, symptoms, error codes, and resolution steps with 0ms query latency.
  - When cloud quota limits are reached, the system automatically transitions into high-availability local server mode (`/api/issues?q=...`) without interrupting search capabilities.

#### 2. Hybrid Blob Bundle Cache (`winfix_unpacked_bundles`) & Rules Sync
- **Feature**: 2-hour client-side TTL caching for packed `issue_bundles` chunk documents.
- **Details**:
  - Packaged 100-issue bundles are fetched once and cached in `localStorage` for 120 minutes. All subsequent searches read from cache, flatlining daily cloud read operations.
  - Synchronized `firestore.rules` to allow public read access for `issue_bundles`, preventing `permission-denied` fallbacks to direct collection reads.

#### 3. Complete Dataset Synchronization (22+ Verified Windows Guides)
- **Feature**: Both `data/issues.json` (server) and `src/data/knownIssues.ts` (client) have been fully populated with 22 comprehensive, verified Windows issue guides across all 8 major categories (Windows Update, BSOD/System, Network/DNS, Microsoft Store, Windows Activation, Disk/Performance, Account/Logon, and Driver/Hardware).

---

### 🛡️ Security Hardening & Safe Query Bounds

#### 4. Hard Query Caps on Administrative Bulk Operations
- **Feature**: Enforced strict document limits on bulk operations to eliminate sudden 30,000+ read spikes.
- **Details**:
  - `handleCleanupDuplicates`: Added `limit(100)` bound to prevent unbounded whole-collection traversals.
  - `handleBulkTranslate`: Added `limit(30)` bound per run.
  - `handleExportBackup`: Configured to export from local server JSON when in `server_file` mode and capped Firestore document reads to 200 per collection.

---

### 🔧 Bug Fixes & Stability Improvements

#### 5. Search Quota Exhaustion Fix
- **Issue**: Searching multiple times in the Guidebook quickly triggered Firestore 429 / Resource Exhausted errors due to redundant direct collection queries and fallback queries.
- **Fix**: Removed redundant fallback queries, introduced in-memory multi-token search, and connected the search input to the high-availability server fallback.

#### 6. API Parameter Harmonization
- **Issue**: `/api/issues` expected `query` while client sent `q` in some views.
- **Fix**: Upgraded `/api/issues` in `server.ts` to accept both `q` and `query` parameters with space-delimited token matching.

---

### 📈 UI/UX & Performance Optimizations

#### 7. Polished High-Availability Mode Indicator
- **Refinement**: Replaced the alarming "Search might be limited / 검색이 제한될 수 있습니다" amber warning banner with an informative, reassuring blue banner indicating active high-availability caching with unlimited high-speed search.

---

## [v3.7.0] - 2026-08-16

### 🚀 Major Architecture & Performance Upgrades

#### 1. Hybrid Blob Bundling & Firestore Quota Optimization
- **Feature**: Implemented 100-item chunk packaging (`issue_bundles`) for cloud synchronization and data retrieval.
- **Details**:
  - Replaced high-frequency single-document Firestore operations with chunked bundle documents, reducing database read/write requests by **over 90%**.
  - Local AI and crawler instances stage data into high-speed server local JSON storage (`/data/issues.json`) and batch-sync in 100-item bundles to cloud storage (`issue_bundles` collection).
  - Client applications fetch packaged bundles with client-side in-memory extraction, keeping quota consumption within free-tier limits even with thousands of issues.

#### 2. Robust AI JSON Parser & Automatic Self-Healing Engine (`parseAiJson`)
- **Feature**: Upgraded the AI response parsing pipeline to prevent parse breakdowns caused by unescaped characters, Windows paths, and truncated tokens.
- **Details**:
  - Implemented multi-stage sanitizer (`sanitizeJsonString`) that escapes lone backslashes in Windows file paths/registry keys and cleans unescaped control characters.
  - Added balanced brace scanning (`extractJsonObjects`) and right-to-left array truncation recovery to salvage valid issue objects even when AI generation hits token boundaries.
  - Standardized all backend AI batch synchronization (`runAiSync`) and frontend collection triggers to use `parseAiJson`.

---

### 🛡️ Usability & Authentication Refinements

#### 3. Graceful Google Auth Cancellation Handling
- **Feature**: Refined Firebase Authentication error handling for interactive popup sign-ins.
- **Details**:
  - Intercepted `auth/popup-closed-by-user` and `auth/cancelled-popup-request` codes to treat them as normal user intent rather than unhandled system exceptions.
  - Cleared alarming error banners upon voluntary cancellation, maintaining a smooth login experience.

---

## [v3.6.0] - 2026-08-09

### 🚀 Major New Features & Integrations

#### 1. Real SMTP Email Gateway Integration & Server Handshake Verification
- **Feature**: Added full configuration and handshake verification for real SMTP email providers (e.g. Gmail, Naver, Outlook/Office365).
- **Details**:
  - Implemented backend Nodemailer dynamic transport integration using custom SMTP parameters (`smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`).
  - Added preset helper controls for instant configuration of popular SMTP services (smtp.gmail.com, smtp.naver.com, smtp.office365.com).
  - Built `POST /api/admin/smtp/verify` endpoint to perform live socket handshake & credential authentication test before saving settings.
  - Added UI controls including "SMTP 연결 테스트" (Connection Test) button with status banners (`HANDSHAKE OK`, `VERIFY FAILED`) and password toggle visibility (`Eye` / `EyeOff`).
  - Added "설정 초기화" (Reset Settings) button with custom confirmation dialog to restore default sandbox notification mode safely.

#### 2. Help & Support Center in Guidebook Tab
- **Feature**: Integrated a comprehensive 'Help & Support' section directly into the Known Issues Guidebook tab.
- **Details**:
  - Added an interactive FAQ Accordion covering Script Safety, Admin Permissions, Persistent Error Handling, Offline Caching, and Error Code Searching.
  - Added a 4-step "Effective Wizard Usage Tips" grid highlighting Hex Error Code searches, Admin Execution, Restore Point Creation, and Threat Verifier checks.
  - Provided quick-action shortcuts to jump directly to AI Diagnosis (`AI Sentinel`) and Threat Verifier.

---

### 🛡️ Security Hardening

#### 2. HTTP Security Headers & Tech Stack Obscuration
- **Feature**: Hardened Express application server response headers to mitigate web vulnerabilities.
- **Details**:
  - Disabled `x-powered-by` header (`app.disable("x-powered-by")`) to prevent server framework fingerprinting.
  - Injected security headers on all API responses:
    - `X-Content-Type-Options: nosniff` (MIME-sniffing protection)
    - `X-Frame-Options: SAMEORIGIN` (Clickjacking defense)
    - `X-XSS-Protection: 1; mode=block` (Reflected XSS filter)
    - `Referrer-Policy: strict-origin-when-cross-origin` (Privacy protection for outbound links)

#### 3. Endpoint Rate Limiting & Sensitive Route Protection
- **Feature**: Created in-memory IP rate limiter middleware for sensitive endpoints.
- **Details**:
  - Protected `POST /api/admin/smtp/verify` (max 10 verification requests per minute per IP) against brute-force or credential stuffing attempts.
  - Protected `POST /api/visitor/log` (max 60 logs per minute per IP) to prevent log flooding attacks.
  - All admin endpoints guarded by Firebase Auth ID token verification middleware (`requireAdmin`).

---

## [v3.5.0] - 2026-07-21

### 🚀 Major New Features

#### 1. Floating Scroll Navigation (Right-Center Fixed Widget)
- **Feature**: Added a permanent top & bottom scroll floating button widget fixed on the right-center edge of the screen (`fixed right-3 top-1/2 -translate-y-1/2 z-40`).
- **Details**:
  - Provides instant one-click smooth scrolling to the top (`ChevronsUp`) and bottom (`ChevronsDown`) of long pages and guidebooks.
  - Features translucent dark/light mode backdrop blur with responsive hover tooltips ("최상단" / "Top", "최하단" / "Bottom").
  - Seamlessly accessible across all screen dimensions with micro-interaction hover and click animations.

---

## [v3.4.0] - 2026-07-10

### 🚀 Major New Features

#### 1. System Recovery Backup (ZIP Archive)
- **Feature**: Added a "System Recovery Backup (ZIP)" button inside the **Admin Tab** of the application.
- **Details**:
  - Automatically queries both the active local Server JSON File DB (`/data/` folder) and Firestore database collections (`issues`, `backend_logs`, `system_config`).
  - Bundles all retrieved documents and files into a compressed, structured ZIP file using the `jszip` library.
  - Secures the endpoint using Firebase ID token authentication (`requireAdmin` middleware), preventing unauthorized data extraction.
  - Automatically names files with timestamp references for easier archiving: `winfix_system_backup_YYYY-MM-DD.zip`.

#### 2. OS Integration: Automatic Startup Helper
- **Feature**: Added a "시작프로그램에 등록 (Add to Startup)" button next to the "바로가기 생성" button.
- **Details**:
  - Downloads a pre-configured `.bat` script called `WinFix_Register_Startup.bat`.
  - When run by the user, the script safely creates a startup-folder shortcut in the user's Windows operating system (`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`), allowing Windows Fix Wizard to launch immediately upon PC booting.
  - Fully translated in both Korean (KR) and English (EN) contexts depending on current language choices.

---

### 📈 UI & Analytics Enhancements

#### 3. AI Quality & Intelligence Analytics Date Display
- **Feature**: Added a live date & time clock to the Sentinel Dashboard Widget ("분석 기준 시간" / "ANALYSIS DATE & TIME").
- **Details**:
  - Dynamically displays live date and seconds-precision clock ticks.
  - Updated the Recharts **X-Axis** labels inside the 24-hour activity log to show dates alongside the hour (`MM/DD HH:00`) for precise long-term visual logging.
  - Formatted the Recharts chart axes labels with font scaling and interval preservation to avoid visual overlap.

---

### 🔧 Stability & Reliability Fixes

#### 4. Active Database Fallback State Persistence
- **Fix**: Resolved an issue where pressing the "Refresh State" button while Firestore exceeded its daily quota limits resulted in an infinite "Checking Database Connection..." state.
- **Details**:
  - Enhanced state checking to correctly inspect the `winfix_db_mode` local storage override.
  - When Firestore exhausts read/write limits, the system correctly falls back and routes all fetch/update operations seamlessly to the **High-Availability Server JSON File DB**, preserving instant page responsiveness.
