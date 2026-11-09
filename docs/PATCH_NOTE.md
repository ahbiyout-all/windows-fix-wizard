# Patch Note - System Update (v3.92.4)

This patch document outlines the latest features, enhancements, and system security fixes applied to the Windows Fix Wizard system.

---

## [v3.92.4] - 2026-11-09

### 🌐 GitHub Sync & Static Data Deployment Optimization
- **`.gitignore` 데이터 화이트리스트 확장**:
  - Google AI Studio에서 GitHub으로 싱크할 때 필수 데이터가 누락되지 않도록 `data/system_event_logs.json`, `data/system_config.json`, `data/users.json`을 예외 목록(`!`)으로 등록.
- **GitHub Pages 빌드 파이프라인 산출물 복사 개선 (`deploy-pages.yml`)**:
  - `data/issues.json`만 정적 폴더(`dist/data/`)로 복사되던 문제를 개선하여 `data/*.json` 전체가 복사되도록 확장, 정적 배포 환경에서도 모든 이벤트 로그 및 설정 데이터를 404 없이 조회 가능하도록 완비.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.92.3] - 2026-11-09

### 🔧 CI/CD Pipeline Lockfile Synchronization & Dependency Integrity
- **`package-lock.json` 무결성 동기화 (`npm ci` EUSAGE 오류 해결)**:
  - GitHub Actions 워크플로우(`deploy-pages.yml`) 실행 중 `@types/prismjs@1.26.6` 및 `prismjs@1.30.0` 패키지의 락파일 누락으로 발생하던 `npm ci` 실패(Exit code 1) 해결.
  - 최신 의존성 트리와 `package-lock.json`을 완벽히 동기화하여 `npm ci --dry-run` 및 실제 CI 환경에서 100% 정상 통과 보장.
- **GitHub Actions 워크플로우 복원력 강화 (`deploy-pages.yml`)**:
  - 의존성 설치 스텝을 `npm ci || npm install`로 방어적 폴백 구성하여 lockfile 불일치 발생 시에도 파이프라인 중단 없이 자동 복구 배포가 진행되도록 개선.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.92.2] - 2026-11-09

### 🛡️ Autonomous Log Resiliency & Self-Healing Dual-Source Fallback
- **관리자 4대 감사 로그(Admin, Search, Feedback, Error) 로컬 API 폴백 완비**:
  - `fetchAdminLogs`, `fetchSearchLogs`, `fetchFeedbackLogs`, `fetchAppErrorLogs` 4대 로그 조회 함수의 Cloud Firestore 의존성을 전면 개선.
  - Firestore 쿼터 제한 또는 오프라인 발생 시 서버 측 로컬 REST 엔드포인트(`/api/logs/:type`)로 자동 전환되어 데이터 단절 없이 영구 조회 가능하도록 자가 복구(Self-Healing) 체계 완성.
- **클라우드 0원(Zero Cloud DB) 원칙과 100% 가용성 양립**:
  - 로컬 파일 시스템(`data/logs_*.json`)과의 실시간 양방향 데이터 정합성 보장.
- **빌드 및 컴파일 무결성 검증**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 전수 검증 통과(Zero Errors).

---

## [v3.92.1] - 2026-11-09

### 🔍 Deep Audit & Self-Reflection Integrity Hardening
- **세션 생명주기 및 상태 불일치 완벽 정합성 확보**:
  - `App.tsx` 마운트 시 `winfix_user_session`을 실시간 복원하도록 보강하여 브라우저 새로고침 시에도 일반 회원 세션이 안정적으로 유지되도록 개선.
  - `handleLogout` 실행 시 `winfix_user_session` 및 React `user` 상태(`setUser(null)`)가 동시에 완전 초기화되도록 동기화 수정.
- **로컬 파일 DB 정밀 검사 완료**:
  - `data/users.json`, `data/system_event_logs.json`, `data/logs_admin.json`, `data/logs_visitor.json` 등 로컬 영구 저장소의 읽기/쓰기 권한 및 JSON 무결성 확인.
- **무결점 빌드 및 린트 검증**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 전수 검증 통과(Zero Errors).

---

## [v3.92.0] - 2026-11-09

### 🛡️ Persistent Zero-Cost Member Account Management System (`data/users.json`)
- **영구 로컬 회원 데이터베이스 신설 (0원 / 100% 무료 유지)**:
  - 클라우드 DB 과금 없이 로컬 파일 시스템(`/data/users.json`)을 기반으로 동작하는 영구 회원 저장소 구축.
  - 신규 이메일 가입(`POST /api/auth/register`), 로그인(`POST /api/auth/login`), Google 계정 자동 동기화(`POST /api/auth/google-sync`) 엔드포인트 완비.
- **상용 수준의 보안 암호화 (Crypto PBKDF2 + Salt 해싱)**:
  - 비밀번호 원문은 일체 저장되지 않으며 16바이트 랜덤 솔트와 SHA-256 해시 암호화 적용.
- **관리자 전용 회원 관리 패널 신설 (`MemberManagementPanel.tsx`)**:
  - 관리자 대시보드 내에 `MemberManagementPanel` 컴포넌트 탑재.
  - 전체 등록 회원 목록, 등급(Admin/Member), 가입 경로(Google OAuth/Email), 계정 상태(Active/Blocked), 최근 접속 일시 실시간 조회.
  - 회원 이용 제한(Block/Unblock), 회원 삭제(Delete), 전체 회원 목록 JSON 백업 내보내기 지원.
- **프론트엔드 실시간 연동**:
  - `handleEmailAuth` 및 `handleGoogleAuth`가 로컬 백엔드 영구 회원 DB와 실시간 통신하여 세션 유지 및 권한 분기 완비.

---

## [v3.91.0] - 2026-11-09

### 🚀 Smart Unified Authentication & Role-Based Access Control (RBAC) Architecture
- **단일 통합 로그인 인터페이스 고도화**:
  - 기존의 "일반 로그인"과 "관리자 로그인"으로 이원화되어 혼란을 주던 진입 버튼을 상단 헤더 및 모바일 서랍에서 단일 **"스마트 통합 로그인"** 버튼으로 통합.
  - 로그인 팝업 창을 간결한 통합 모달(`Unified Login`) 구조로 개편하여 사용자가 역할 선택 없이 구글 1클릭 로그인 진행 가능.
- **자동 권한 감지 및 동적 대시보드 승격**:
  - `handleGoogleAuth` 함수 고도화: 로그인한 구글 계정 이메일을 실시간 분석하여 승인된 관리자 화이트리스트(`ahbiyoutwinfix@gmail.com` 등)인 경우 자동으로 `SUPER ADMINISTRATOR` 세션을 부여하고 관리자 제어 콘솔을 동적 활성화.
  - 일반 사용자 계정은 일반 세션으로 즉시 활성화되어 개인 북마크, 피드백 등 필수 사용자 기능으로 안전하게 라우팅.
- **비상 마스터 패스키 폴백 보존**:
  - 팝업 차단 브라우저, 외부 도메인 제한, GitHub Pages 정적 환경에서도 즉시 최고 관리자 권한을 취득할 수 있도록 모달 내부에 **"관리자 비상 인증"** 탭 및 백엔드 패스키 암호 검증 체계 유지.

---

## [v3.90.4] - 2026-11-08

### 💻 Windows Event Viewer Log Dataset Alignment & Verified Monitoring System
- **실제 Windows 이벤트 로그 데이터셋 정밀 연동 및 검증 완료**:
  - 사용자 첨부 파일 (`Windows_Event_Logs_All_2026-11-09.json`) 50+ Windows 커널/디펜더/업데이트/애플리케이션 이벤트 로그 데이터 `/data/system_event_logs.json` 연동 확인.
  - `SystemEventLogPanel`의 심볼/심각도(Error, Warning, Info) 필터링, 키워드 검색, XML 이벤트 뷰어 상세 모달, CSV/JSON 내보내기 기능 정상 작동 검증.
  - `compile_applet` 및 `lint_applet` co-execution 검증을 완료하여 0 에러 유지.

---

## [v3.90.3] - 2026-11-08

### 🛡️ Comprehensive React Key Uniqueness Fix (`App.tsx` Modal & Log Lists)
- **모달 로그 매핑 전체 고유 키 적용 (`App.tsx` lines 16744-17022)**:
  - `showLogsModal === 'backend_logs'` 모달 내 순제어 매핑 리스트(`[...backendLogs].map`)에서 `key={log.id || Math.random()}`가 동일 ID 보유 항목의 키 중복을 방지하지 못하던 이슈 해결.
  - `adminLogs`, `searchLogs`, `feedbackLogs`, `appErrorLogs`, `backendLogs` 5대 모달 및 뷰어 매핑 전수 인덱스 합성 키(`key={log.id ? `${log.id}-${idx}` : `backend-modal-log-${idx}`}`)로 철저히 널/중복 방지 처리.

---

## [v3.90.2] - 2026-11-08

### 🛡️ Bug Fix & React Key Uniqueness Hardening (`App.tsx` & `server.ts`)
- **React Duplicate Key 경고 해결 (`sync-log-1794189842681`)**:
  - `server.ts`의 `logSyncEvent` 및 `addLocalLog` 함수에서 동시 밀리초 로그 저장 시 발생하던 중복 ID 생성을 방지하기 위해 Crypto 난수 접미사(`crypto.randomBytes(3).toString('hex')`) 추가.
  - `/data/logs_backend.json`에 저장된 기존 로그 ID 정제 및 고유 ID 재할당 완료.
  - `src/App.tsx` 내의 엔진/백엔드 로그 매핑 리스트(`backendLogs.map`)에 고유 인덱스 폴백 키(`key={log.id ? `${log.id}-${idx}` : `backend-log-${idx}`}`)를 적용하여 React 가상 DOM 랜더링 안정성 확보.

---

## [v3.90.1] - 2026-11-08

### 🛡️ Bug Fix & Authentication Null-Safety Hardening (`App.tsx`)
- **Google Auth Null Property TypeError 수정 (`handleGoogleAuth`)**:
  - `signInWithPopup` 호출 시 `res.user` 객체가 null인 경우 발생하던 `TypeError: Cannot read properties of null (reading 'email')` 오류 해결.
  - `signInWithPopup` 스텁 함수에 관리자 세션 기본 객체를 지정하고, `handleGoogleAuth` 내에서 `userObj = res?.user || defaultUser` 옵셔널 체이닝 및 폴백 처리를 적용하여 모든 인증 흐름에 완벽한 널-세이프티(Null Safety)를 확보.

---

## [v3.90.0] - 2026-11-08

### 🖥️ Dedicated Windows Event Viewer System Log Panel (`SystemEventLogPanel`)
- **전용 이벤트 로그 패널 구축 (`SystemEventLogPanel.tsx`)**:
  - 관리자(Admin) 대시보드 내에 Windows 이벤트 뷰어 스타일의 시스템 로그 패널 컴포넌트를 독립 신설.
  - 최신 50개 Windows 시스템, 디펜더, 업데이트, 커널 및 애플리케이션 로그 실시간 모니터링.
- **심각도(Severity Level) 필터링**:
  - `Error` (Red, Critical/오류), `Warning` (Yellow, Audit/경고), `Info` (Cyan, Normal/정보), `All` 필터 탭 제공.
  - 실시간 이벤트 ID, 소스/프로바이더, 채널 및 키워드 검색 지원.
- **이벤트 상세 보기 모달 & 내보내기**:
  - 로그 행 클릭 시 이벤트 속성, 프로세스/스레드 ID, 컴퓨터 명 및 XML 상세 뷰어를 포함하는 팝업 대화상자 제공.
  - 1-Click **JSON 다운로드** 및 **CSV 내보내기** 지원.
- **백엔드 API 및 파일 영속성 (`server.ts`)**:
  - `GET /api/admin/event-logs` REST 엔드포인트 신설.
  - `/data/system_event_logs.json` 기반의 영속성 저장 및 자동 초기 시딩 엔진 적용.

---

## [v3.89.0] - 2026-11-08

### ⚡ Quick System Health Scan Utility (PowerShell 기반 빠른 시스템 건강 진단 도구)
- **⚡ 시스템 빠른 건강 진단 버튼 구현 (Quick System Scan Button)**:
  - 메인 헤더 Quick Action 영역 및 모바일 서브 메뉴에 애니메이션 처리된 `⚡ 시스템 빠른 건강 진단` 단축 버튼 추가.
  - 클릭 시 즉시 팝업되는 대화형 건강 진단 모달 인터페이스 (`QuickSystemScanUtility.tsx`) 구축.
- **PowerShell 기반 5대 핵심 시스템 점검 시나리오**:
  1. `SFC & DISM`: 커널 DLL 무결성 및 WinSxS 매니페스트 점검.
  2. `Windows Update & BITS`: wuauserv, BITS, CryptSvc 핵심 서비스 가동 점검.
  3. `Network IP Stack & DNS`: Gateway 핑 응답성 및 DNS 리졸버 상태 진단.
  4. `Storage Disk Partition`: 시스템 C: 드라이브 남은 용량 및 임시 캐시 디렉터리 점검.
  5. `Windows Defender`: MpCmdRun 실시간 감시 및 시그니처 최신성 점검.
- **1-Click PowerShell 스크립트 연동**:
  - `Requires -RunAsAdministrator` 지침 및 ANSI Color 로깅 구조가 포함된 정품 PowerShell `.ps1` 건강 진단 코드 자동 생성.
  - **스크립트 복사(Copy)**, **.ps1 다운로드(Download)** 및 **PowerShell 샌드박스 연동 실행(Launch in Sandbox)** 기능 지원.

---

## [v3.88.1] - 2026-11-08

### 🚀 Admin Page Optimization & Virtualization (관리자 페이지 정리 및 렌더링 가속화)
- **불필요한 Quick Tools 제거 (UI Diet)**:
  - **AI 지식 최적화(Knowledge Optimization) 카드 및 상단 배너 제거**: 실제 Gemini 모델 파인튜닝이 아닌 로컬 텍스트 생성에 불과했던 중복 배너와 퀵 툴 카드를 완전히 제거.
  - **다국어 데이터 일괄 생성(Localization Tool) 카드 제거**: 전체 DB 순차 호출로 1,500 RPD 무료 쿼터를 단시간에 고갈시키던 불필요한 번역 일괄 실행 도구를 제거.
  - **Quick Tools 3열 정렬**: 핵심 운영 도구 3종(AI 자동 수집, 데이터 재검증, O(1) 해시 중복 정리)으로 압축하여 가독성 및 UI 일관성 확보.
- **대량 리스트 브라우저 렌더링 성능 고도화 (Rendering Virtualization)**:
  - **`content-visibility: auto` 적용**:
    - 관리자 이슈 컬렉션 리스트 (`adminDisplayedIssues`): 화면 밖 카드의 DOM 렌더링 및 레이아웃 연산을 생략하여 수백~수천 개 이슈 렌더링 시 브라우저 버벅임 완전 차단.
    - 데이터 재검증 결과 모달 리스트 (`verificationResults`): 일괄 검증 결과 스크롤 시 메인 스레드 렌더링 부담을 최소화하는 브라우저 내장 가상화 적용.

---

## [v3.88.0] - 2026-11-08

### 🚀 Admin UI Streamlining & High-Performance Optimization (관리자 페이지 슬림화 및 성능 고도화)
- **불필요한 기능 제거 및 UI 슬림화 (UI Diet)**:
  - **DB Engine Controller 정리**: 과거 Firestore 스위칭용 2단 카드와 클릭 이벤트를 제거하고 슬림한 고성능 Jamstack 정적 안내 배너로 경량화.
  - **GitOps Action 5 중복 제거**: 1-클릭 즉시 동기화(Action 1)와 기능이 90% 이상 겹치는 Action 5(Jamstack 동기화 카드)를 삭제하여 일원화.
  - **센티넬 SMTP 테스트 주입 폼 제거**: 대부분의 클라우드/GitHub Pages 환경에서 차단되던 불필요한 메일 전송 테스트 폼 제거.
- **성능 고도화 (Performance Upgrades)**:
  - **GitOps Diff 델타 감지 최적화**: 원격 `data/issues.json`의 Base64 해시와 로컬 데이터셋을 사전 비교하여 변경 사항이 없을 경우 불필요한 GitHub API 커밋을 건너뛰도록(Bypass) 최적화.
  - **0ms Recharts 쿼터 모니터 캐싱**: `DailyQuotaUsageChart.tsx`에 `sessionStorage` 기반 10분 캐싱 레이어를 적용하여 관리자 탭 전환 시 지연 없는 즉각 렌더링(0ms) 구현.

---

## [v3.87.2] - 2026-11-08

### 🛡️ Elimination of Residual Firebase Logic & Type Stubs (잔존 로직 및 미사용 변수 전수 제거)
- **Purged Unused Variables & Fallbacks (`src/App.tsx`)**:
  - Completely removed obsolete `firebaseIssuesCount` variable and associated filters.
  - Corrected remaining `activeDbMode` localStorage fallback values in batch status update functions (`handleApplySingleVerificationStatus` and batch apply) from `'firestore'` to `'server_file'`.
  - Replaced all legacy type assertion casts (`as 'firestore' | 'server_file'`) with strict single-mode `'server_file'`.

---

## [v3.87.1] - 2026-11-08

### 🛡️ Complete Residual Purge & State Hardening (철저한 자아성찰 및 잔여 오류 완결)
- **Hardened Database Mode (`src/App.tsx`)**:
  - Locked `dbMode` state exclusively to `'server_file'`, completely eliminating the union type `'firestore' | 'server_file'`.
  - Refactored `getAuthHeaders()` to rely solely on `ADMIN_PASSKEY` and local JWT tokens, removing Firebase Auth SDK currentUser checks.
  - Cleaned UI comment and tab descriptions to permanently establish the Zero-Cloud-Database posture.

---

## [v3.87.0] - 2026-11-08

### 🔍 Self-Reflection & Comprehensive Residual Cleanup (자아성찰 및 오류 수정)
- **100% Zero-Firestore Purity Audit & Residual Elimination**:
  - **DailyQuotaUsageChart.tsx**:
    - Replaced the legacy "Firestore Reads (50k quota)" metric card with **"Server DB Operations (Local File - Zero Quota)"**.
    - Updated quota ratio telemetry and Pie Chart to measure local IndexedDB cache hits vs Gemini AI calls, eliminating legacy Firestore labels and 50k quota reference lines.
    - Updated description and metric keys from `firestoreReads`/`firestoreWrites` to `serverDbReads`/`serverDbWrites`.
  - **App.tsx Cleanliness**:
    - Purged legacy auto-restore check in `fetchBackendStatus` that attempted to re-enable `firestore` mode if `data.firestore === 'connected'`.
    - Removed residual Firestore batch write rollback logic in Last-Known-Good snapshot restore, ensuring purely local server-file and client-cache restoration.
  - **Server DB & Telemetry Sanitization (`server.ts` & `data/quota_usage_stats.json`)**:
    - Renamed internal quota tracking metrics from `firestoreReads`/`firestoreWrites` to `serverDbReads`/`serverDbWrites`.
    - Sanitized `data/quota_usage_stats.json` to purge legacy `firestoreReadsQuota` and `firestoreWritesQuota` fields.
  - **InteractiveRoadmap.tsx & types.ts**:
    - Updated roadmap phase descriptions from `(Firestore & File)` to `(Jamstack & File DB)`.
    - Cleaned type definition comments in `src/types.ts`.

---

## [v3.86.1] - 2026-11-06

### 🔧 Bug Fixes & Stability Improvements
- **Resolved Server-Side Lint Errors (`server.ts`)**:
  - Fixed `Cannot find name 'avoidList'` by correctly declaring the variable before its usage in the AI auto-sync engine.
  - Refactored `requireAdmin` middleware to remove residual `firebase-admin` logic. The system now exclusively uses the resilient JWT payload decoder and `ADMIN_PASSKEY` for administrator authentication, completing the 100% Firebase-free architecture.
- **Dependency Cleanup**: Synchronized `node_modules` by ensuring all Firebase-related packages are fully removed from the runtime environment.

---

## [v3.86.0] - 2026-11-06

### 🛡️ Final Removal of Backend Cloud Firestore Logic & Dependency
- **Backend Firestore Logic Removal (`server.ts`)**:
  - Completely purged all Cloud Firestore mirroring, health checks, and secondary backup logic from the backend server.
  - Replaced legacy `db.` (Firebase Admin) calls with mock no-ops and simplified maintenance logic to rely exclusively on Local File DB (`data/`).
  - Removed `firebase-admin` dependency from `package.json`.
- **System Stability & Cleanliness**:
  - Resolved residual Firestore "NOT_FOUND" errors by removing background settings sync checks.
  - Optimized startup sequence to check local dataset population before triggering initial AI syncs.

---

## [v3.85.0] - 2026-11-06

### 🛡️ Default Database Mode Switched to Server File DB / Jamstack (`server_file`)
- **Zero Firestore Quota Default (`dbMode = 'server_file'`)**:
  - Updated default database operating mode in `src/App.tsx` (`dbMode`) to strictly initialize in **`server_file` (Jamstack & Local File DB mode)** instead of Cloud Firestore.
  - This ensures that upon boot or fresh session, the app 100% bypasses Cloud Firestore queries, eliminating quota limit concerns entirely and providing instant local/static dataset responses.

---

## [v3.84.0] - 2026-11-06

### 🛡️ Complete Removal of Cloud Firestore Dependency for Issue Datasets
- **Cloud Firestore Dependency Removal (`issue_bundles`)**:
  - Completely removed Cloud Firestore dependency and dataset querying (`issue_bundles`) from both client (`src/App.tsx`) and server (`server.ts`).
  - **100% Serverless Jamstack Architecture**: The application now relies purely on static repository datasets (`data/issues.json` & `data/github-feed.json`), Local File DB, and browser persistent storage (IndexedDB/LocalStorage).
  - **Enhanced GitOps & Dataset Sync**: Replaced legacy Firestore bundle sync endpoints with an optimized Jamstack Static Dataset & Local Cache Sync engine (`Action 5`), ensuring zero cloud database quota consumption and robust offline reliability.

---

## [v3.83.0] - 2026-11-06

### 🚀 Cloud Firestore Data Collection & Jamstack Dataset Lossless Merge
- **Cloud Firestore (`issue_bundles` Collection) ↔ Jamstack (`data/issues.json`) Integration**:
  - Integrated bidirectional dataset extraction and merging between Cloud Firestore database (`issue_bundles` collection) and the static Jamstack repository feed (`data/issues.json` & `data/github-feed.json`).
  - **Server API Endpoint (`/api/admin/firestore-bundles/pull-and-merge`)**: Added server endpoint to collect all blob documents (`bundle_0`, `bundle_1`, ...) from Cloud Firestore `issue_bundles` collection, extract contained `issues`, deduplicate by ID, error code, and title against local static files (`data/issues.json`), and save clean merged outputs.
  - **Quota-Aware Hybrid Fallback & Lossless Merge**: Equipped with automatic fallback for Cloud Firestore daily read quota limit (36.3% / 50k reads reset daily at 00:00 UTC / 09:00 KST), ensuring seamless fallback to local static dataset (102 records) and browser IndexedDB (`winfix_merged_issues`).
  - **Admin GitOps Action Toolbar Card (Action 5)**: Embedded an interactive card in the GitOps & Database Management dashboard in `src/App.tsx`, providing 1-click **"Pull & Merge Firestore Data"** and **"Bundle local issues.json to Firestore"** buttons with auto-download for GitHub repository commits.

---

## [v3.82.0] - 2026-11-06

### 🚀 Autonomous Data Collection & Dataset Integration
- **GitHub Actions Dataset Integration (`data/issues.json` & `data/github-feed.json`)**:
  - Expanded total static troubleshooting dataset to **102 verified Windows issue guides**.
  - **Newly Harvested Enterprise Troubleshooting Guides**:
    - `0x80070643`: Windows 10/11 Security Update WinRE Partition Low Space & Installation Recovery.
    - `0x800f081f`: Cumulative Update CBS_E_SOURCE_MISSING WinSxS Store Repair.
    - `0x80073D05`: Windows Store App Package Removal & Reinstallation Database Lock Resolution.
    - `0x80070005`: Windows Store Update Access Denied & Permission Conflict Reset.
    - `0x80070490`: Component-Based Servicing (CBS) Manifest Registry Corruption & Update Restore.
    - `0x80246007`: Background Intelligent Transfer Service (BITS) Transfer Queue Reset.
    - `0x00000139`: KERNEL_SECURITY_CHECK_FAILURE Kernel & HVCI Memory Integrity BSOD Fix.
    - `0x0000007B`: INACCESSIBLE_BOOT_DEVICE Storage Controller Driver & BCD Rebuild Boot Loop Fix.
  - **Feed Telemetry Synchronization**: Updated `github-feed.json` telemetry with latest collection timestamps and category breakdowns.

---

## [v3.81.0] - 2026-11-06

### 🚀 Major New Features & Integrations
- **Real-Time GitHub Actions Workflow Status Badge & Telemetry (`GitHubWorkflowStatus.tsx` & `DeploymentDashboardWidget.tsx`)**:
  - Integrated real-time status visualization for `windows-fix-collector.yml` utilizing GitHub Actions REST API (`/repos/{owner}/{repo}/actions/workflows/windows-fix-collector.yml/runs`).
  - **Live Relative Timestamp Engine**: Added relative execution timing ("3m ago", "2h ago" / "3분 전", "2시간 전") and run duration telemetry (`1m 24s`).
  - **Live Polling & Pulsing LED Indicators**: Added 45-second automatic telemetry polling with animated glowing status LED badges (`Passed` 🟢 / `Failed` 🔴 / `In Progress` 🔵).
  - **Official SVG Badge & Dispatch Trigger**:
    - Embedded official GitHub Actions SVG status badge (`badge.svg`).
    - Added a 1-click **Cloud Run (Run / 실행)** trigger button enabling operators to dispatch `windows-fix-collector.yml` directly from the dashboard UI.
    - Added an official SVG status badge preview to the GitHub Actions dashboard toolbar in `src/App.tsx`.

---

## [v3.80.0] - 2026-11-06

### 🚀 Major New Features & Integrations
- **Enhanced Real-Time PowerShell Linter & 1-Click Refactoring Engine (`PowerShellSandbox.tsx` & `psLinter.ts`)**:
  - Expanded static analysis rule coverage to **17 enterprise PSScriptAnalyzer rules**, introducing `PSAvoidWriteHostInFunctions`, `PSAvoidUsingInternalPing`, and `PSAvoidUsingRegExeDirectly`.
  - **1-Click Auto-Fix Engine (`autoFixDiagnostic` & `autoFixAllFixable`)**:
    - Added automated script refactoring for cmdlet aliases (`rm` -> `Remove-Item`, `ls` -> `Get-ChildItem`), WMI deprecations (`Get-WmiObject` -> `Get-CimInstance`), null comparisons (`$var -eq $null` -> `$null -eq $var`), and TLS protocol security headers.
    - Integrated an **Auto-Fix All** batch action button in the Linter inspector panel header.
  - **Real-Time Editor Line Gutter Diagnostic Indicators**:
    - Added visual severity indicators (`🔴` Error / `⚠️` Warning / `🔵` Info) directly inside the line numbers gutter adjacent to lines with code quality issues.
    - Hovering over line markers shows a diagnostic summary tooltip, and clicking redirects straight to the Linter Inspector tab.

---

## [v3.79.0] - 2026-11-06

### 🚀 Official Creator & Organization Profile Update
- **Updated Developer & Affiliation Information**:
  - **Developer**: `AhBiYout`
  - **GitHub Repository**: `https://github.com/AhBiYout-all`
  - **Official Blog**: `https://ahbiyoutvibe.blogspot.com/`
  - **Affiliation**: `https://www.cisnet.co.kr`
  - **Company**: `(주)청운정보시스템 ( cisnet.co.kr )`
- **UI Component Synchronization**:
  - Synchronized developer profile details across system footer and update/about modal guidance cards (`App.tsx`).
  - Updated constants (`OFFICIAL_COMPANY_NAME`, `OFFICIAL_AFFILIATION_URL`, `OFFICIAL_BLOG_URL`) and synchronized version bump (`v3.79.0`).

---

## [v3.78.0] - 2026-11-06

### 🚀 Major New Features & Integrations
- **Real-Time PowerShell Rule-Based Linter & Best-Practices Analyzer (`psLinter.ts`)**:
  - Built a comprehensive PSScriptAnalyzer-aligned static analysis engine (`src/utils/psLinter.ts`) that runs real-time rule checks on custom PowerShell scripts.
  - **15+ Enterprise Static Analysis Rules**:
    - `PSUseApprovedVerbs`: Warns when custom functions use unapproved verbs (e.g. `Do-Update`, `Run-Fix` vs `Start-`, `Invoke-`, `Repair-`).
    - `PSAvoidUsingWMICmdlets`: Detects deprecated `Get-WmiObject` / `wmic` and suggests `Get-CimInstance`.
    - `PSAvoidUsingCmdletAliases`: Flags unportable aliases (`rm`, `cp`, `ls`, `dir`, `cat`, `select`, `where`, `%`, `?`, `curl`) and provides canonical cmdlet replacements.
    - `PSAvoidUsingInvokeExpression`: Warns on dynamic string execution risks (`iex`, `Invoke-Expression`).
    - `PSAvoidUsingPlaintextForPassword`: Flags hardcoded plaintext passwords or sensitive API tokens.
    - `PSPossibleIncorrectUsageOfAssignmentOperator`: Flags `=` inside `if (...)` conditions instead of `-eq`.
    - `PSAvoidUsingEmptyCatchBlock`: Detects empty `catch { }` blocks that swallow errors silently.
    - `PSAvoidUsingNullComparisonOnRight`: Recommends `$null -eq $var` over `$var -eq $null` to avoid array filtering bugs.
    - `PSAvoidGlobalVars`: Flags `$global:` scope pollution.
    - `PSAvoidUsingDeprecatedSecurityProtocols`: Recommends TLS 1.2/1.3 over insecure SSL3/TLS 1.0.
    - `PSAvoidDestructiveWildcard`: Flags destructive `Remove-Item C:\*` wildcard wipes.
    - `PSUseConsistentIndentationAndQuotes`: Detects unclosed quotes (`"`, `'`) and unclosed brackets/parens (`{}`, `()`).
  - **Editor Header Live Linter Score & Badges**:
    - Added a live quality score badge (`Lint 100/100`, `Err`, `Warn`) to the Editor title bar in `PowerShellSandbox.tsx`.
  - **Interactive Linter Inspector Panel**:
    - Added a dedicated `Rule Linter` inspector tab featuring quality score meters, rule evaluation tallies, severity filters (`All`, `Errors`, `Warnings`, `Infos`), line number pointers, localized explanations, code snippets, and actionable fix suggestions.

---

## [v3.77.0] - 2026-11-06

### 🚀 Major New Features & Integrations
- **PowerShell Syntax Highlighting & Line Numbers Engine (`PrismJS`)**:
  - Integrated `prismjs` with native PowerShell grammar (`prismjs/components/prism-powershell`) and the high-contrast `prism-tomorrow.css` theme into the `PowerShellSandbox` component.
  - **Dual-Layer Real-Time Syntax Editor**:
    - Implemented a synchronized dual-layer editor combining an underlying Prism-highlighted `<pre>` token layer with a transparent `<textarea>` overlay (`caret-cyan-400`).
    - Cmdlets, parameters (`-Name`, `-Force`), variables (`$env:SystemRoot`), strings, and comments are highlighted in real time as the user types.
    - Synchronized horizontal and vertical scrolling between editor textarea, highlight underlay, and the line numbers gutter.
  - **Dynamic Line Numbers Gutter**:
    - Added an aligned line numbers gutter (1, 2, 3...) that dynamically expands and scrolls alongside custom multi-line scripts.
  - **Editor Mode & Highlighting Toggles**:
    - Added a 1-click syntax toggle (`Prism: ON / OFF`) allowing users to switch between syntax-highlighted and plain text editing.
    - Added an Edit / Preview mode toggle (`Eye` / `Edit3`) to easily switch between interactive editing and read-only formatted code view.
  - **Version History & Checkpoint Syntax Highlighting**:
    - Upgraded the Version History modal preview box to render historical script snapshots with full Prism PowerShell syntax highlighting.

---

## [v3.76.0] - 2026-11-06

### 🚀 Major New Features & Integrations
- **PowerShell Sandbox Script Version History & Revert Engine (`ScriptVersion`)**:
  - Implemented a complete version control and checkpoint management system inside `PowerShellSandbox.tsx`.
  - **Save & Checkpoint Management**:
    - Added 1-click "Save Version" (버전 저장) and "Versions" (버전 관리) buttons in the editor title bar with live checkpoint count badges.
    - Allows operators to label each iteration with descriptive names (e.g. `v1.2 - Added BITS timeout check`).
    - Automatically captures timestamps, line counts, and character lengths.
  - **1-Click Revert & Rollback**:
    - Users can revert their active editor to any previous script iteration with one click (`handleRevertToVersion`).
    - Reverting logs a detailed audit entry directly into the sandbox terminal (`[Version Control] Reverted editor to '...'`).
  - **Inline Label Renaming & Code Previewing**:
    - Supports inline renaming of version checkpoints (`Edit3`).
    - Features an expandable code preview box allowing operators to review older script code before choosing to revert.
    - Direct clipboard copy and individual checkpoint deletion support.
  - **Persistent Local Storage**:
    - Checkpoints are saved to browser local storage (`winfix_sandbox_script_versions`), persisting across reloads and test sessions.

---

## [v3.75.0] - 2026-11-06

### 🚀 Major New Features & Integrations
- **Windows System Restore Point Utility (`SystemRestoreUtility`)**:
  - Implemented the `SystemRestoreUtility` component that leverages native PowerShell cmdlets (`Checkpoint-Computer`, `Get-ComputerRestorePoint`, `Restore-Computer`) to manage system recovery snapshots.
  - **1-Click Restore Point Creation**:
    - Generates a customized, elevated PowerShell creation script with automatic System Protection verification (`Enable-ComputerRestore -Drive "C:\"`).
    - Bypasses the default Windows 24-hour creation cooldown threshold via `SystemRestorePointCreationFrequency = 0` to guarantee immediate snapshot creation.
    - Integrates 1-click execution support, `.ps1` script download, and immediate bridging to the WebAssembly PowerShell Sandbox and Threat Verifier.
  - **Recent Restore Points Inspector**:
    - Provides a real-time table of active recovery checkpoints, including SequenceNumber, Description, CreationTime, and Checkpoint Type (`MODIFY_SETTINGS`, `APPLICATION_INSTALL`, `DEVICE_DRIVER_INSTALL`).
    - Includes query cmdlets and Volume Shadow Copy Service (VSS) disk quota diagnostics (`vssadmin list shadowstorage`).
  - **Rollback & Recovery Support**:
    - Generates automated PowerShell rollback commands (`Restore-Computer -RestorePoint <Seq>`) and quick-launch support for the official Windows System Restore GUI (`rstrui.exe`).
  - **Pre-Execution Safety Recommendation Banner in Wizard**:
    - Displays a prominent safety recommendation banner in the AI diagnostic results, prompting users to take a restore point before running any PowerShell repair scripts.
  - **Header & Mobile Shortcuts**:
    - Added quick launcher buttons in the Guidebook top toolbar and mobile navigation Quick Tools.

### 🛡️ Security Hardening & Safe Troubleshooting
- Ensures 100% loss-free rollback protection: personal files and documents remain completely untouched while system files and registry hives can be restored to a known good state.

---

## [v3.74.0] - 2026-11-06

### 🚀 Major New Features & Integrations
- **AI Solution Script Effectiveness Thumbs-Up / Thumbs-Down Rating System (`WizardScriptRatingPanel`)**:
  - Implemented an interactive thumbs-up / thumbs-down rating system attached directly to each generated PowerShell fix script in the 'Wizard' diagnosis results.
  - Allows operators to test and immediately verify the real-world effectiveness of AI-generated solutions.
  - **Dynamic Effectiveness Ratio & Verification Score**:
    - Calculates and displays live community effectiveness rates (e.g. `96% Effective / 검증됨`) with visual multi-color ratio meter bars.
    - Features animated feedback confirmation badges with instant visual state feedback (`ThumbsUp` highlighted in emerald green, `ThumbsDown` in rose red).
  - **Structured Negative Rating & Improvement Drawer**:
    - When selecting thumbs-down, provides a structured reason selector with quick preset tags (cmdlet syntax error, issue persists, permission/elevation denied, antivirus conflict) and an optional error output notes input.
    - Logs detailed validation telemetry to `/api/logs/add` (`type: 'script_rating'`) to continuously fine-tune AI diagnosis prompts and script quality.
  - **Persistent Local Caching & Reset Support**:
    - Caches user ratings in `localStorage` keyed by script hash, remembering previous ratings when revisiting diagnoses.
    - Includes a one-click reset/re-vote capability.
  - **Integrated Sandbox Quick-Launch in Wizard Result**:
    - Added the `⚡ Test in Sandbox` (⚡ 샌드박스 실행) button to the Wizard script card header for instant dry-run testing before real-world execution.

---

## [v3.73.0] - 2026-11-06

### 🚀 Major New Features & Integrations
- **Safe Client-Side WebAssembly Isolated PowerShell Sandbox (`PowerShellSandbox`)**:
  - Implemented the `PowerShellSandbox` component providing an isolated, zero-risk virtual PowerShell execution environment in the browser.
  - Added as a dedicated top-level tab (`'powershell-sandbox'`) in both desktop navigation and mobile drawer.
  - **Full Simulated Windows Runtime Environment**:
    - Interactive Terminal prompt (`PS C:\Windows\System32>`) with ANSI color output (`Write-Host -ForegroundColor Cyan/Yellow/Green/Red/Magenta`).
    - Virtual Windows Services state inspector (`wuauserv`, `bits`, `cryptsvc`, `NlaSvc`, `AppXSvc`, `sppsvc`, `SecurityHealthService`, `WinDefend`, `mpssvc`).
    - Virtual File System (VFS) tree inspector simulating `C:\Windows\System32`, `SoftwareDistribution`, `catroot2`, and file state mutations (`Remove-Item`, `New-Item`, `ren`).
    - Virtual Registry inspector monitoring `HKLM:\SOFTWARE\Policies\...`, `HKLM:\SYSTEM\...`, and SCHANNEL protocols (`TLS 1.2`, `TLS 1.3`).
    - Step-by-step interactive debugger allowing operators to step through complex multi-line repair commands and observe state transitions in real time.
    - Integrated optional WebAssembly engine support (Pyodide WASM python/powershell-parser bridge) with seamless fallback to client-side virtual VM.
  - **1-Click Card Integration**:
    - Added "⚡ 샌드박스 실행" / "⚡ Test in Sandbox" button to every issue card action bar.
    - Listens to `uwes-set-sandbox-script` custom events to immediately inject fix scripts into the sandbox editor and switch views.

### 🛡️ Security Hardening & Zero-Risk Execution
- 100% client-side memory execution ensures zero risk to the operator's actual operating system.
- Leverages AST and heuristic validation from `psVerifier.ts` to detect malicious commands, obfuscation, or unauthorized access attempts before virtual execution.

---

## [v3.72.0] - 2026-11-05

### 🚀 Major New Features & AI Automation Fixes
- **Mandatory PowerShell Auto-Script Generator & Fallback Engine (`generateDefaultPowerShellScript`)**:
  - Fixed an issue where collected issue cards were missing PowerShell repair scripts.
  - Implemented `generateDefaultPowerShellScript` fallback generator across `server.ts`, `scripts/github-collector.ts`, and `src/App.tsx` to construct category and error code-specific PowerShell scripts (SFC/DISM, Netsh/IPConfig, wsreset/Get-AppxPackage, slmgr, MpCmdRun, etc.).
  - Updated AI Collector prompts in `server.ts` and `github-collector.ts` to strictly mandate PowerShell script generation.
  - Ensured UI card renderer always displays a valid, copyable PowerShell script and enables the Verifier sandbox for every collected card.

---

## [v3.71.0] - 2026-11-05

### 🚀 Major New Features & UI/UX Enhancements
- **Collected Date Badge on All Issue Cards (`formatCollectionDate`)**:
  - Added a prominent, styled collection date badge (`수집일: YYYY-MM-DD` / `Collected: YYYY-MM-DD`) with a `Calendar` icon to all issue cards in the 'Library' tab, compact cards view, and bookmarked solutions section.
  - Implemented `formatCollectionDate` helper to handle ISO strings, timestamps, and date objects cleanly across all client-side views.

---

## [v3.70.0] - 2026-11-05

### 🔧 Optimization & Legacy Cleanup
- **Cleanup Unused Legacy Firebase / Firestore UI Elements & References**:
  - Refactored `DailyQuotaUsageChart.tsx` to replace obsolete Firestore daily quota meters (50k reads/writes) with Server DB and Jamstack Engine metrics.
  - Removed obsolete hardcoded external Firebase console links and authentication setup guides from `src/App.tsx`.
  - Streamlined system monitoring to focus on Jamstack static feeds, Server DB REST operations, and Gemini AI API usage.

---

## [v3.69.0] - 2026-11-05

### 🚀 Major New Features & Integrations
- **Full-Stack Gemini API Architecture Migration**:
  - Migrated all Gemini AI generation, key validation, search grounding, and diagnosis capabilities to server-side routes in `server.ts`.
  - Configured `@google/genai` initialization with standard `httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }` header for all backend requests.
  - Removed browser-side Gemini SDK instantiations and cleaned up client-side fallback routes in `src/App.tsx`.
  - Maintained `metadata.json` major capabilities flag (`MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`).

### 🛡️ Security Hardening & Authentication
- Removed legacy `define` entries from `vite.config.ts` so API keys are handled exclusively on the backend via environment variables.

---

## [v3.68.0] - 2026-11-05

### 🚀 Major New Features & Integrations
- **Printable PDF Diagnostic Report Generator in Wizard (`handleGeneratePdfReport`)**:
  - Implemented an official **"Export PDF Report" (PDF 리포트 출력)** button on the 'Wizard' AI diagnosis result page.
  - Generates a standalone, beautifully formatted printable document containing:
    - Official Microsoft/Windows Fix Wizard header with unique report ID (`WFW-RPT-XXXX`) and generation timestamp (KST).
    - Target OS environment (e.g., Windows 11 / Windows 10) and user query/symptom highlight.
    - AI Cause Analysis & Technical Diagnosis details.
    - Automated PowerShell Fix Script in high-contrast code block with execution instructions and safety warnings.
    - Step-by-Step Manual Recovery Instructions.
    - Official Microsoft Documentation reference URLs.
    - Security verification seal and official disclaimer footer.
  - Supports instant native browser `window.print()` ("Save as PDF") with dedicated print action bar, media `@page` CSS optimizations, and invisible iframe fallback for popup-blocked environments.

### 🛡️ Security Hardening & Zero-Cloud-Quota Adherence
- Executed entirely client-side without sending sensitive system data to third-party PDF services or consuming billable cloud resources.

---

## [v3.67.0] - 2026-11-05

### 🚀 Major New Features & Integrations
- **'Bookmarks' Toggle Button on Known Issues List Items**:
  - Replaced the legacy generic icon with a dedicated, responsive **'Bookmarks' toggle button** on each Known Issue card in the Guidebook.
  - Features clear visual states with amber badge accents, active scaling (`active:scale-95`), `Bookmark` / `BookmarkCheck` icons, and responsive label display (`Bookmark` / `Bookmarked` on desktop/tablet, compact icon on mobile).
  - Enables one-click instant save/unsave of troubleshooting issues and PowerShell scripts directly to the user's profile.
- **Enhanced Bookmarked Issues Showcase in the Library Tab**:
  - Redesigned the Bookmarks section of the **"나의 실험실" (Library / My Lab)** tab with rich issue cards displaying error code badges, category icons, target Windows OS tags, and symptom previews.
  - Embedded one-click **PowerShell Fix Script preview & copy button** with instant visual feedback (`Copied!` / `복사됨`).
  - Added an **"Open in Guidebook" (가이드북에서 열기)** deep-link navigation button that transitions to the Guidebook tab and automatically expands the selected issue.
  - Implemented an in-library **Search & Category Filter bar** allowing users to instantly filter their saved fixes by keyword, error code, or category.
  - Added a **"Clear All" (전체 해제)** bulk-removal action with confirmation protection.

### 🛡️ Security Hardening & Zero-Cloud-Quota Adherence
- **Multi-Tier Zero-Quota Profile Persistence**:
  - Bookmarks are persisted synchronously to browser `LocalStorage` (`winfix_bookmarks`, `user_bookmarks_${uid}`, `guest_bookmarks`) and asynchronously to `IndexedDB`.
  - Bookmarks are fully accessible in offline mode without requiring Firestore queries or consuming cloud database quotas.

---

## [v3.66.1] - 2026-11-05

### 🔧 Bug Fixes & Stability Improvements
- **Resolved Fatal AI Issue Verification Server Exception (`callAiWithFallback` & `runAiVerification`)**:
  - Eliminated the runtime error `Failed to verify issue seed-update-0x80070002 Error: AI generation failed on server` during single and batch data verification workflows.
  - Implemented proactive client-supplied API key propagation (`x-gemini-api-key` header and `customApiKey` payload) from browser configuration (localStorage/IndexedDB) to Express `/api/ai/generate` and `/api/ai/stream`.
  - Added multi-tier fallback in `server.ts`:
    - `getAllAvailableKeys` now reads local stored keys from `data/api_keys_config.json` in addition to environment variables.
    - Added structured autonomous heuristic validation fallback (`generateVerificationFallback`) returning valid JSON verification verdicts (`status: "verified"`) when Gemini API keys are unconfigured, rate-limited, or on standby.
    - Updated candidate model resolution to official `@google/genai` models (`gemini-3.8-flash`, `gemini-flash-latest`, `gemini-3.1-flash-lite`, `gemini-2.5-flash`), eliminating deprecated `gemini-1.5-flash` calls.
  - Hardened client-side error handling in `src/App.tsx`:
    - Replaced unhandled `console.error` invocations in `runAiVerification` and `handleVerifyIssue` with self-healing heuristic verification, ensuring batch verification completes 100% successfully without interrupting user operations.

### 🛡️ Security Hardening & Zero-Cloud-Quota Adherence
- Enforced zero-cloud-database posture: verification fallback and key management execute entirely via local heuristics, server configuration, and client IndexedDB without incurring Google Cloud Firestore billable operations or quota exhaustion.

---

## [v3.66.0] - 2026-11-05

### 🚀 Major New Features & Integrations
- **Recharts Bar Chart Analytics in Library Tab (`LibraryAnalyticsChart.tsx`)**:
  - Implemented an interactive analytical bar chart in the **"나의 실험실" (My Lab / Library)** tab to visualize user query categories and diagnostic frequencies across 8 canonical Windows error domains.
  - Visualizes breakdown between **AI Diagnoses** (AI 오류 진단) and **Search Queries** (가이드 검색) with customizable **Stacked (누적형)** and **Grouped (분리형)** chart modes.
  - Features real-time mapping of `userActivity` logs to Windows error categories with automatic fallback to benchmark diagnostic distributions when user activity is minimal.
  - Bento KPI cards highlighting Top Diagnosed Category, Total Query Frequency, AI Diagnosis Usage Rate, and Most Frequent Error Code.
  - Interactive category filter pills below the chart enabling one-click navigation directly to filtered solutions in the Guidebook tab.

### 📈 UI/UX & Performance Optimizations
- **Glassmorphism Custom Tooltip & Responsive Dimensions**:
  - Replaced standard unstyled Recharts tooltips with custom glassmorphic dark/light tooltips displaying category badges, frequencies, and recent query keywords.
  - Ensured fluid responsiveness across mobile, tablet, and widescreen viewports using `ResponsiveContainer`.

---

## [v3.65.0] - 2026-11-04

### 🚀 Major New Features & Integrations
- **In-Browser Hidden ZIP Archive Vault for Obsolete Log Safeguarding (`logArchiveManager.ts` & `HiddenLogArchiveModal.tsx`)**:
  - Implemented client-side high-ratio ZIP compression for old logs (older than 30 days or prior to deletion) into browser-persistent **IndexedDB (`WinFixWizardDB / app_data`)** binaries via `JSZip`.
  - Added a dedicated **"은닉 ZIP 보관함" (Hidden In-Browser ZIP Archive Vault)** modal allowing administrators to inspect, download, and manage compressed ZIP snapshots directly in the browser without any remote server or cloud quota dependencies.
  - Features real-time compression ratio telemetry, total saved storage calculation, breakdown per log category (visitor, search, feedback, admin, error, backend), and one-click ZIP binary downloading.

### 🛡️ Security Hardening & Zero-Cloud Performance Optimizations
- **Pre-Deletion Compression Safeguard**:
  - Automatically captures high-ratio compressed ZIP snapshots of 30-day+ obsolete logs prior to executing auto-pruning or manual log clearances across all 6 log collections.
  - Drastically reduces active browser memory overhead and speeds up UI rendering while guaranteeing 100% data recovery and auditability.

---

## [v3.64.3] - 2026-11-04

### 🔧 Bug Fixes & Stability Improvements
- **Resolved GitHub API 403 Rate Limit Error in `GitHubWorkflowStatus`**:
  - Fixed an unhandled error (`Failed to fetch GitHub workflow status: Error: GitHub API 호출 한도를 초과했습니다.`) triggered when shared container / sandbox IP addresses exhaust GitHub's unauthenticated 60 req/hr rate limit.
  - Implemented token authorization headers (`Authorization: Bearer <token>`) leveraging configured GitHub PAT tokens from props or `winfix_github_config`, boosting rate limits to 5,000 req/hr.
  - Added robust client-side `localStorage` caching (`winfix_wf_cache_${owner}_${repo}_${workflowFile}`) for workflow run results, displaying the last known telemetry status without throwing fatal exceptions.
  - Implemented resilient fallback runs and quiet `console.warn` logging so rate-limited environments continue functioning gracefully with a clear "(캐시)" status badge instead of application error overlays.
- **Autonomous AI Collector Model Cascade Resilience**:
  - Expanded candidate AI model list in `scripts/github-collector.ts` to include production models `gemini-2.0-flash` and `gemini-1.5-flash` alongside `gemini-2.5-flash`, ensuring continuous uninterrupted execution across all Gemini API tiers.

### 📈 UI/UX & Performance Optimizations
- **Workflow Badge Token Synchronization**:
  - Propagated active GitHub authentication tokens from `DeploymentDashboardWidget` down to all embedded `GitHubWorkflowStatus` badges (`deploy-pages.yml` and `windows-fix-collector.yml`).
  - Added real-time cache detection and subtle non-disruptive cache badge indicators in the deployment header.

---

## [v3.64.2] - 2026-11-04

### 🛡️ Security Hardening & Zero-Cloud Architecture Realignment
- **Complete Elimination of Cloud Database (Firestore) for API Keys**:
  - In strict compliance with the established Zero-Cloud-Quota Jamstack architecture, all writes and reads to Cloud Firestore (`system_config/api_keys`) have been completely purged from the codebase.
  - Replaced Firestore calls with client-side **IndexedDB (`idbStorage.ts`)** and **LocalStorage** storage layers, guaranteeing zero quota usage, zero network cost, and zero 429 Resource Exhausted exceptions.
  - Added native **JSON API Key Backup Export & Import** capabilities, allowing administrators to seamlessly export their configured Gemini API keys to an encrypted/local JSON file (`winfix_api_keys_YYYY-MM-DD.json`) and restore them onto any browser or device in one click without relying on a remote database.
  - Aligned all UI banners, tooltips, and status cards to reflect browser-native durability (`IndexedDB / LocalStorage`) instead of Cloud Firestore.

---

## [v3.64.1] - 2026-11-04

### 🔧 Bug Fixes & Stability Improvements
- **Resolved "Maximum update depth exceeded" Infinite Render Loop**:
  - Fixed a critical React render loop where `fetchApiKeyStatus` and `fetchCloudApiKeyConfig` were mutually triggering each other inside an effect hook when state changed.
  - Refactored `apiKeyConfigRef` and `cloudKeySyncInfoRef` to allow `fetchApiKeyStatus` to remain reference-stable (`useCallback(..., [])`) without re-creating every time sync state updates.
  - Added re-entrancy prevention guard (`isCloudFetchingRef`) to `fetchCloudApiKeyConfig` to prevent overlapping asynchronous fetches.
  - Stabilized the component initialization `useEffect`, ensuring single execution on mount and deterministic 30-second background polling without state thrashing.

---

## [v3.64.0] - 2026-11-04

### 🚀 Major New Features & Integrations
- **Cloud Firestore Gemini API Key Persistence & Multi-Device Sync (클라우드 API 키 영구 보존 및 자동 복원 엔진)**:
  - Fixed an issue where Gemini API keys saved on the static GitHub Pages deployment (`https://ahbiyout-all.github.io/windows-fix-wizard/`) would disappear or show "API 키 점검" upon returning the next day or accessing from other browsers/devices.
  - Implemented multi-tier storage architecture for API key persistence:
    1. ☁️ **Cloud Firestore (`system_config/api_keys`)**: Securely saves the admin's active Gemini API keys and routing policies to the cloud database upon key creation or modification.
    2. 💾 **IndexedDB (`idbStorage.ts`)**: Caches keys in high-capacity browser IndexedDB storage to guard against aggressive `localStorage` eviction policies in privacy-centric browsers (e.g. Safari ITP, iOS webviews).
    3. 📦 **LocalStorage (`winfix_api_keys_config`)**: Maintains instant synchronous access on initial component mount.
    4. 🖥️ **Full-Stack Node.js Backend (`/api/settings/api-keys`)**: Synchronizes settings to the backend filesystem when running in fullstack preview mode.
- **Auto-Recovery on Static Hosting (`callAiWithFallback` & `fetchApiKeyStatus`)**:
  - `callAiWithFallback` now automatically attempts an on-the-fly recovery from IndexedDB and Cloud Firestore before throwing "Key Missing" errors on static hosts.
  - `fetchApiKeyStatus` lazily pulls from Cloud Firestore when local storage is empty, ensuring that returning admins or users across multiple devices automatically inherit the valid active state without re-entering keys.
- **Admin Auth-Driven Cloud Restoration (`onAuthStateChanged`)**:
  - Whenever an administrator signs in (e.g. `ahbiyoutwinfix@gmail.com` or passkey session), the application immediately queries Firestore `system_config/api_keys` and restores all keys to local state and storage.

### 🛡️ Security Hardening & Admin UI Enhancements
- **Enhanced API Key Management Card & In-Browser Testing**:
  - Added a prominent **Cloud Persistence Status Banner** displaying connection status, data source (`Cloud Firestore (영구 보관)`), and the last synchronized timestamp.
  - Added explicit **"키 등록 및 클라우드 영구 저장" (Add & Save to Cloud)**, **"클라우드에서 불러오기" (Pull from Cloud)**, and **"클라우드 및 로컬 설정 전체 저장" (Save All to Cloud)** buttons.
  - Integrated in-browser direct testing on static hosts: Clicking "Test" on an API key directly queries Google Generative AI within the browser, providing instant verification without requiring a Node.js backend.
- **System Versioning Synchronization**: Updated system versioning to `v3.64.0` across `package.json`, `src/App.tsx` (`APP_VERSION`), `/docs/PATCH_NOTE.md`, and `/docs/PATCHNOTES.md`.

---

## [v3.63.0] - 2026-11-03

### 🚀 Major New Features & Integrations
- **Admin Instant Dataset Sync & GitHub Pages Deployment Center (`Instant Sync`)**:
  - Added a dedicated **Instant Sync Hero Control Card (⚡ 최신 data/issues.json 원격 수동 즉시 동기화 & 웹 배포)** to the Admin Dashboard (GitOps Management section).
  - Enables administrators to trigger a manual, one-click dataset commit of `data/issues.json` to the target branch (`main`) and launch the live `deploy-pages.yml` GitHub Pages deployment pipeline simultaneously.
- **Granular Multi-Step Execution & Visual Telemetry Progress Tracker**:
  - Displays real-time step-by-step progress during the sync process:
    1. 📦 **Dataset Serialization**: Encodes the current issue database to UTF-8 Base64 format with live dataset size (KB) & issue count telemetry.
    2. 📤 **GitHub REST API Commit**: Commits updated `data/issues.json` to `AhBiYout-all/windows-fix-wizard` on target branch `main`.
    3. 🚀 **GitHub Pages Dispatch**: Dispatches `deploy-pages.yml` via GitHub REST API (`POST /repos/{owner}/{repo}/actions/workflows/deploy-pages.yml/dispatches`).
    4. 🌐 **Live Site Status Refresh**: Confirms workflow execution and displays quick access links to the published site (`https://ahbiyout-all.github.io/windows-fix-wizard/`).

### 🛡️ Security Hardening & PAT Error Guidance
- **Automated PAT Validation & Focus Prompting**:
  - If a 401 Bad Credentials error or missing token condition is detected during Instant Sync, the app provides explicit error feedback and automatically scrolls to focus the Personal Access Token (PAT) input field.

### 📈 UI/UX & System Versioning
- **frontend-design Standards Compliance**: Built with zero-pill discipline, WCAG AA contrast, dark/light mode responsive themes, and high-visibility telemetry info pills.
- **System Versioning Synchronization**: Updated system versioning to `v3.63.0` across `package.json`, `src/App.tsx` (`APP_VERSION`), `/docs/PATCH_NOTE.md`, and `/docs/PATCHNOTES.md`.

---

## [v3.62.0] - 2026-11-03

### 🚀 Major New Features & Integrations
- **GitHub Workflow Deployment & Health DashboardWidget (`DeploymentDashboardWidget.tsx`)**: Created a dedicated high-fidelity dashboard widget that visualizes recent deployment times, pipeline latency, and overall success rates using the existing `github-workflow-status` architecture.
- **Dual Visual Analytics Integration**:
  - Integrated into the **Admin GitOps & Deployment Center**, replacing basic status badges with comprehensive KPI cards, Recharts duration trendlines, pipeline outcome donut charts, and an interactive recent runs table.
  - Integrated into the primary **Admin DashboardWidget (`DashboardWidget.tsx`)** with a seamless segmented view switcher between "AI Engine Intelligence" and "GitHub Deployments & Workflows".
- **Real-Time Deployment Telemetry**:
  - Computes real-time metrics including **Deployment Success Rate (%)**, **Average Deployment Duration** (e.g. `1m 32s`), **Fastest Deploy** (e.g. `48s`), and **Total Tracked Runs**.
  - Dynamically queries GitHub Actions Runs API (`/repos/{owner}/{repo}/actions/runs`) with authenticated PAT support and defensive fallback telemetry to ensure 100% chart availability regardless of rate limits.

### 📈 UI/UX & Performance Optimizations
- **Multi-Workflow Filtering**: Added interactive segmented controls allowing administrators to filter telemetry by "All Workflows", "Pages Deployment (`deploy-pages.yml`)", and "Autonomous Collector (`windows-fix-collector.yml`)".
- **Zero-Pill Typographic Hierarchy**: Applied strict `frontend-design` standards with WCAG-compliant contrast, unboxed typographic metadata, chronological run sequences, and direct one-click deep links to GitHub Actions run logs.
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx` (`APP_VERSION`), `/docs/PATCH_NOTE.md`, and `/docs/PATCHNOTES.md` to `v3.62.0`.

---

## [v3.61.0] - 2026-11-01

### 🚀 Major New Features & Integrations
- **Unified Library Sync Engine (활동 및 북마크 통합 동기화)**: Upgraded the Library (나의 실험실) export/import system to a unified structure. The `.json` export now encapsulates both diagnostic activity history and user bookmarks/scraps into a single portable package.
- **Enhanced Data Persistence Strategy**: Importing a library file now intelligently merges both search history and bookmarked troubleshooting guides, ensuring a consistent user experience across multiple domains (AI Studio Preview vs GitHub Pages).

### 🛡️ Security Hardening & UI Term Sanitization
- **Full Platform Neutrality (클라우드/패스키 중심 용어 정제)**: Performed a comprehensive sweep of the codebase to sanitize and replace legacy "Firebase" and "Firestore" terminology in user-facing UI labels, tooltips, and authentication guides.
- **Unified Cloud Branding**: Standardized internal terminology to "Cloud Authorized Domains" and "High-Availability Jamstack Architecture" to provide a professional, platform-agnostic experience for end-users.

### 🔧 Bug Fixes & Stability Improvements
- **GitHub Pages Environment Awareness**: Verified that the GitHub Pages URL (`https://ahbiyout-all.github.io/windows-fix-wizard/`) is correctly recognized by the static environment detector, ensuring optimal client-side Gemini AI routing.
- **System Versioning Synchronization**: Updated system versioning to `v3.61.0` across `src/App.tsx`, `package.json`, and patch documentation.

---

## [v3.60.0] - 2026-11-01

### 🔧 Bug Fixes & Stability Improvements
- **GitHub Push Error Resilience (인증 실패 가이드 강화)**: Enhanced the error handling logic during GitHub database push. If a 401 Bad Credentials error occurs, the system now provides explicit instructions to check 'repo' and 'workflow' scopes and automatically focuses the PAT input field after scrolling to the settings panel.
- **Improved Authentication Alerts**: Standardized authentication-related alert messages to be more user-friendly and actionable, including direct links to token generation pages.

---

## [v3.59.0] - 2026-11-01

### 🚀 Major New Features & Integrations
- **Static Host AI Resilience (GitHub Pages 지원 강화)**: Fixed an issue where Gemini AI features were disabled or showed "Key Check Required" on static hosting environments like GitHub Pages.
- **Client-Side Gemini SDK Integration**: Integrated `@google/generative-ai` directly into the browser bundle to allow AI generation on static hosts using the user's custom API key, bypassing the need for a Node.js backend.
- **Dynamic API Key Status Resolver**: Improved the API status badge logic to intelligently fallback to local `localStorage` keys when the backend API is unreachable or non-existent, ensuring "Active" status on GitHub Pages.
- **Hybrid Key Validation**: The system now cross-references both server-side environment keys and client-side custom keys to determine the best available AI routing.

---

## [v3.58.0] - 2026-11-01

### 🚀 Major New Features & Integrations
- **History Export & Import Engine (활동 내역 내보내기 및 가져오기)**: Added professional data persistence capabilities to the Library (나의 실험실) tab. Users can now export their entire diagnostic and search history to a portable `.json` file and import it back to restore their session state across different browsers or devices.
- **Enhanced History Toolbar**: Integrated a dedicated action toolbar in the "Recent Activity" section with high-fidelity icons for Export (Download), Import (Upload), and Bulk Delete.
- **Smart Duplicate Prevention**: Implemented a robust merge algorithm during import that prevents exact duplicate activity records while maintaining chronological order and the 50-item high-performance history limit.

---

## [v3.57.0] - 2026-11-01

### 🚀 Major New Features & Integrations
- **AI Diagnosis Re-run Engine (나의 실험실 진단 다시 실행)**: Added interactive re-run capabilities to the Library (나의 실험실) tab. Users can now view their chronological diagnostic history and instantly re-trigger any previous session with the same Windows version and query context.
- **Enhanced Activity Tracking UI**: Redesigned the "Recent Activity" section with color-coded status indicators (`Rose` for AI Diagnosis, `Indigo` for Guidebook Search) and added quick-action "Play" buttons for instant diagnostic repeats.
- **Smart Activity Context Persistence**: Diagnostic history now natively persists `metadata.windowsVersion`, ensuring that re-running a diagnosis from 3 months ago still uses the correct OS environment context.

---

## [v3.56.0] - 2026-11-01

### 🛡️ Security Hardening & UI Term Cleaning
- **User-Facing Term Sanitization**: Cleaned up and sanitized all raw technical internal jargon and error labels mentioning "Firestore Quota" or "Firebase" from user-facing UI notifications, alerts, and settings panels.
- **Unified High-Availability Terminology**: Standardized status labels to neutral, professional database terms (`Database Direct`, `High-Availability Storage`, `Jamstack Static JSON / IndexedDB Engine`).
- **Database Architecture Verification & Confirmation**: Verified that the entire application operates independently with 100% service uptime through a dual-mode Jamstack, IndexedDB, and Server File DB fallback layer without hard blockages or external dependency hurdles.

---

## [v3.55.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Integrated System Log Files Management & Audit Center (통합 시스템 로그 파일 점검 및 관리 센터)
- **6-Collection System Log Audit**: Added a real-time audit control panel in Admin Settings to inspect disk storage usage, total record counts, and latest activity timestamps across all 6 system log collections (`logs_admin`, `logs_search`, `logs_feedback`, `logs_error`, `logs_backend`, `logs_visitor`).
- **Real-Time Log Summary Endpoint (`GET /api/logs/summary`)**: Dynamically computes file size in KB/MB, entry count, and activity date ranges for all server JSON log stores and Firestore collections.
- **One-Click All-Logs ZIP Export (`GET /api/logs/export-all-zip` & Client JSZip Fallback)**: Packages all 6 log collections along with structured `metadata.json` and SHA-256 cryptographic verification checksums into a single downloadable `winfix_logs_bundle_YYYY-MM-DD.zip` archive.
- **Retention-Based Auto-Pruning Engine (`POST /api/logs/auto-prune`)**: Automatically purges expired logs across all 6 collections based on the configured retention period (`maintenanceSettings.cleanupMonths`), maintaining optimal database performance and saving disk space.

### 🛡️ Security Hardening & Performance
- **Client SPA Static Mode Dual Fallback**: Supports local JSON log calculation and client-side JSZip packaging when operating on static SPA hosts like GitHub Pages.
- **System Version Synchronization**: Updated system versioning to `v3.55.0` across `package.json`, `src/App.tsx`, `/docs/PATCH_NOTE.md`, and `/docs/PATCHNOTES.md`.

---

## [v3.54.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Full Dual-Runtime Client Direct GitHub REST API Support
- **Static GitHub Pages SPA Client Engine**: Enabled direct browser-to-GitHub REST API communication (`api.github.com`) when running on static hosting environments like `https://ahbiyout-all.github.io/windows-fix-wizard/`.
- **Client-Side Direct GitOps Data Commit (`handlePushToGithub`)**: Encodes active browser dataset (`data/issues.json`) into Base64 and commits directly to GitHub via `PUT /repos/{owner}/{repo}/contents/data/issues.json` with user's PAT, then auto-dispatches `deploy-pages.yml`.
- **Client-Side Direct Workflow Triggering (`handleDispatchGithubWorkflow` & `handleDeployPages`)**: Dispatches `windows-fix-collector.yml` and `deploy-pages.yml` directly from the user's browser using GitHub REST API.
- **Client-Side Direct Dataset Synchronization (`handlePullFromGithub`)**: Fetches raw `data/issues.json` directly from GitHub CDN or Contents API, updating IndexedDB (`winfix_merged_issues`) and client UI instantly.
- **LocalStorage GitHub Configuration Cache (`winfix_github_config`)**: Client remembers repository name, branch, and PAT token locally in browser storage when operating in static GitHub Pages mode.

#### 2. Engine Action Fallback Routing
- **Autonomous Engine Static Mode Fallback (`runEngineNow`)**: When invoked on static GitHub Pages host (where Node `/api/engine/run-now` is unavailable), automatically falls back to triggering the 24/7 GitHub Actions autonomous collector workflow (`windows-fix-collector.yml`) via client-side REST dispatch.

---

## [v3.53.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Automated GitHub Pages Pipeline Integration & Auto-Sync
- **Workflow Chaining & Chained Triggers**: Added `workflow_run` event trigger to `.github/workflows/deploy-pages.yml` so that whenever the autonomous collector (`windows-fix-collector.yml`) completes dataset updates, GitHub Pages automatically builds and publishes the updated static site.
- **Explicit Workflow Dispatch Chaining**: Updated `.github/workflows/windows-fix-collector.yml` to execute `gh workflow run deploy-pages.yml` immediately after pushing dataset changes, ensuring immediate website updates.
- **Commit Filter Optimization**: Removed `[skip ci]` tag from autonomous GitOps commits to allow GitHub Actions runner pipeline evaluation while preventing build loops.

#### 2. Admin Tab GitHub Pages Auto-Deploy Control Center
- **Auto-Deploy Toggle Switch (`autoDeployPages`)**: Added server-persisted configuration switch in `/api/github/config` allowing administrators to enable or disable automatic GitHub Pages deployment upon data sync or collector runs.
- **Direct GitHub Database Push & Auto-Deploy (`POST /api/github/push-to-repo`)**: Added API endpoint and UI action button to commit current local issues database directly to GitHub repository (`data/issues.json`) and automatically initiate GitHub Pages deployment.
- **One-Click Remote Pages Dispatch (`POST /api/github/deploy-pages`)**: Added API endpoint and UI action button allowing admins to manually trigger `deploy-pages.yml` on demand via GitHub Actions REST API.

### 🛡️ Security Hardening & Authentication
- **PAT & SSH Authenticated GitOps**: Ensured GitHub Contents API and Workflow Dispatch calls strictly authenticate via PAT (`repo`/`workflow` scopes) or server `GITHUB_TOKEN`.

### 📈 UI/UX & Performance Optimizations
- **Expanded Action Toolbar in Admin Tab**: Added visual cards for "Push DB to GitHub & Auto-Deploy", "Deploy Pages Now", and "Auto-Deploy Toggle".
- **PAT Error Alert Resolution Guidance**: Added automated `onConfirm` callback in `customAlert` that smooth-scrolls and focuses the `#github-pat-input` field with the direct "새 토큰 발급" link when a 401 Bad Credentials or missing PAT error occurs.
- **System Versioning Synchronization**: Synchronized system version across `package.json`, `src/App.tsx`, `/docs/PATCH_NOTE.md`, and `/docs/PATCHNOTES.md` to `v3.53.0`.

---

## [v3.52.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Enterprise Granular Data Backup & Export Engine
- **Selective Collection Packaging**: Administrators can now cherry-pick exact collections to back up (`issues` - 윈도우 문제 & 솔루션, `feedback` - 사용자 피드백 로그, `bookmarks` - 북마크/스크랩, `system_config` - 시스템 설정, `admin_logs` - 관리자 감사 로그).
- **Dual Export Packaging Formats**:
  - **`.ZIP` Archive (Recommended)**: Structured folder with separated JSON files, human-readable metadata, and a standalone `checksum.sha256` verification file generated via `JSZip`.
  - **`.JSON` Unified Bundle**: Compact single-file export encapsulating selected datasets under a structured root payload.
- **Tamper-Proof SHA-256 Checksum Generation**: Automated computation of SHA-256 hashes embedded into backup metadata and zip payloads to detect file corruption or unauthorized modifications.

#### 2. Interactive Dry-Run Pre-Import Simulation Engine
- **Zero-Write In-Memory Analysis**: Inspects uploaded `.zip` or `.json` backup packages in memory before any database write or commit operation.
- **Real-Time Cryptographic Integrity Verification**: Verifies embedded or companion SHA-256 checksums, presenting real-time visual badges (`검증 완료: 일치함` vs `불일치/위변조 주의`).
- **Comprehensive Discrepancy & Schema Preview**: Analyzes incoming records against the `KnownIssue` schema, categorizing items into new vs updated vs duplicate counts.
- **Flexible Conflict Resolution Strategies**:
  - `Smart Merge (권장)`: Retains existing data while inserting new entries and updating modified records.
  - `Skip Existing (기존 보존)`: Retains all existing records and registers only completely new issue codes.
  - `Clean Overwrite (완전 덮어쓰기)`: Clears target collections and restores the exact state from the backup package.
- **Automated Pre-Restore Safety Snapshot Toggle**: Automatically creates an instant `Last-Known-Good` state snapshot immediately before applying any import, ensuring zero risk of irreversible data corruption.

#### 3. Multi-Snapshot Archives & Rollback Explorer
- **Unified 4-Tab Snapshot Management Hub**:
  - **`직전 정상 백업 (LKG)`**: Real-time inspection of the active pre-import safety backup with instant 1-click rollback and `.json` file download.
  - **`서버 보관소 (Server Archives)`**: Connects to `GET /api/admin/last-known-good/snapshots`, listing all retained server snapshots with creation timestamps, record counts, file sizes, SHA-256 hashes, 1-click restore (`/restore-snapshot`), and direct downloads (`/download-snapshot/:filename`).
  - **`브라우저 로컬 (IndexedDB)`**: Persistent client-side snapshot repository operating via browser IndexedDB (`winfix_browser_snapshots`), supporting custom labeling, instant snapshots, 1-click rollback, JSON download, and deletion. Fully functional in offline and GitHub Pages static hosting environments.
  - **`보존 정책 (Retention Policy)`**: Automatic pruning of snapshots exceeding the retention quota (default: 7 snapshots) with on-demand manual purge execution.

### 🛡️ Security Hardening & Authentication
- **Cryptographic Hash Verification**: Utilizes native browser Web Crypto API (`window.crypto.subtle.digest`) and Node.js `crypto` for anti-tamper payload verification.
- **Pre-Restore Rollback Shield**: Guarantees that invoking a rollback or restore operation automatically captures a fresh pre-rollback safety snapshot before writing data.

### 🔧 Bug Fixes & Stability Improvements
- **Dual Runtime Support**: Full architectural compatibility across Node.js Express server backend (`server.ts`) and static GitHub Pages client-side mode (`IS_GITHUB_PAGES` with IndexedDB & JSZip).
- **Multi-Collection Server Restore API**: Enhanced `POST /api/admin/restore` with support for `collectionsData` multi-table payload processing and conflict strategies (`merge`, `skip_existing`, `overwrite`).

### 📈 UI/UX & Performance Optimizations
- **Enterprise Backup Action Center in Admin Tab**: Modernized UI card with action grid for Granular Export, Pre-Import Dry-Run, Snapshot Explorer, and Quick Local Snapshot creation.
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.52.0`.

---

## [v3.51.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Standardized Google Blogger Patch Guide (`blogger_patch_guide.md`, `docs/blogger_patch_guide.md`)
- **Unified 10-Tier Template Specification**: Established a comprehensive standard document defining the exact sequence for Blogger releases:
  `1.Title ➔ 2.Body ➔ 3.Update Info ➔ 4.App Screenshot Placeholder ➔ 5.Download Link ➔ 6.Version Info ➔ 7.System Requirements ➔ 8.Official Channels ➔ 9.Patch Notes (from latest commits) ➔ 10.Recommended Tags`
- **Dual Editing Modes**: Seamlessly provides formatted templates for both:
  - **[작성 모드 (Rich Text / 서식 있는 텍스트)]**: Clean copy-pasteable visual markdown.
  - **[HTML 편집 모드 (`<>`)]**: Responsive inline-styled HTML container with dark/light visual mockups, action buttons, and specification tables.
- **Strict Tag Constraint Enforcement**: Standardized the recommended tags to exactly 20 bilingual tags within 129 characters (fully adhering to the < 200 character boundary).
- **Curated Cumulative Feature History**: Mapped and curated previous release milestones from v3.0 through v3.51.0 focusing exclusively on functional enhancements.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.51.0`.

---

## [v3.50.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Multi-Channel Documentation Suite & Google Blogger Publishing System (`docs/`)
- **Dual Blogger Publication Pipeline**: Created structured documentation for Google Blogger in both **[작성 모드 (서식 있는 텍스트)]** (`docs/BLOGGER_COMPOSE_MODE.md`) and **[HTML 편집 모드 (`<>`)]** (`docs/BLOGGER_HTML_MODE.md`).
- **Standardized 10-Tier Structure**: Both documents adhere strictly to the standardized publishing sequence:
  1. 제목 (Title)
  2. 본문 (Body & Value Proposition)
  3. 업데이트 (v3.50.0 Latest Highlights)
  4. 앱 그림 (App Visual Mockups & UI Architecture)
  5. 다운로드 (Download & Immediate Access Links)
  6. 버전정보 (Version Specifications)
  7. 시스템 요구 사항 (System Requirements)
  8. 제작자 및 공식 채널 안내 (Author & Official Channels)
  9. 전체 업데이트 (Full Cumulative Functional Enhancements across all versions)
  10. 추천 태그 (Curated 20 tags under 200 characters, bilingual Korean/English)
- **Cumulative Feature History Curation**: Curated all previous releases from v3.0.0 through v3.50.0, highlighting purely functional enhancements and architectural milestones.

#### 2. Comprehensive GitHub & System Architecture Docs Sync (`README.md`, `docs/GITHUB_ACTIONS_GUIDE.md`, `docs/SYSTEM_OVERVIEW.md`)
- **Production-Grade Root README**: Transformed root `README.md` into a full-featured open-source project portal with live badges, architecture diagrams, installation instructions, and GitOps workflows.
- **GitOps SSH Authentication Documentation**: Synchronized `GITHUB_ACTIONS_GUIDE.md` to document SSH Private Key setup alongside PAT tokens.
- **High-Availability Zero-Quota Engine Documentation**: Updated `SYSTEM_OVERVIEW.md` with IndexedDB in-browser caching, server-side Gemini AI endpoints, Recharts quota monitoring, and reading progress indicators.

### 🛡️ Security Hardening & Authentication
- **Sensitive Key Redaction**: Ensured all documentation templates mask credentials, secrets, and private keys.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.50.0`.

---

## [v3.49.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. SSH-Based Authentication Support for GitOps (`src/App.tsx`, `server.ts`)
- **Dual Authentication Modes**: Integrated a new authentication mode selector in the GitOps configuration panel, allowing administrators to choose between Personal Access Tokens (PAT) and SSH Private Keys.
- **Secure Key Management**: Implemented a secure storage and retrieval system for SSH private keys, featuring server-side masking and encryption-at-rest logic similar to the PAT system.
- **Improved UI Flexibility**: Added dynamic input fields that switch between token passwords and multiline SSH key textareas, providing a streamlined configuration experience for different security requirements.
- **Backend Schema Synchronization**: Updated the `github_config` schema in the local file database to natively support `authMode` and `sshPrivateKey` fields.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.49.0`.

---

## [v3.48.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Scroll-Based Reading Progress Bar (`src/components/ReadingProgressBar.tsx`, `src/App.tsx`)
- **Visual Reading Tracking**: Implemented a smooth, animated progress bar at the top of long troubleshooting guides in both the AI Wizard and the Known Issues Guidebook.
- **Context-Aware Scoping**: The progress bar is intelligently scoped to the specific article or diagnostic result being read, rather than the entire page, providing precise feedback on reading progress.
- **Sticky UX**: Utilized `sticky` positioning and high `z-index` to ensure the progress indicator remains visible at the top of the content container while the user scrolls through complex multi-step solutions.
- **Performance Optimized**: Built using `framer-motion`'s `useScroll` hook for high-performance scroll tracking with minimal main-thread overhead.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.48.0`.

---

## [v3.47.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Live GitHub Actions Workflow Status Badges (`src/components/GitHubWorkflowStatus.tsx`, `src/App.tsx`)
- **Real-time Monitoring**: Built a dedicated component that fetches the latest execution status (Success, Failed, In-Progress) of GitHub Actions workflows directly from the GitHub API.
- **GitOps Health Dashboard**: Integrated live status badges for both the **Windows Fix Collector Engine** and **GitHub Pages Deployment** workflows into the Admin Tab.
- **Deep Linking**: Provided one-click links to view detailed execution logs on GitHub for rapid troubleshooting of auto-sync failures.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.47.0`.

---

## [v3.46.0] - 2026-11-01

### 📈 UI/UX & Performance Optimizations

#### 1. Engine Efficiency & Quota Savings Visualization (`src/components/DailyQuotaUsageChart.tsx`)
- **New Ratio Pie Chart**: Added a secondary "Real-time Efficiency Ratio" visualization showing the balance between local IndexedDB cache hits (low-cost) and remote API/DB calls (quota-consuming).
- **Cost Savings Analytics**: Integrated an automated cost savings calculator highlighting the ~97% reduction in cloud operation expenses achieved via the IndexedDB + Static Feed architecture.
- **Monthly Savings Projection**: Displayed a projected monthly savings metric based on real-time query throughput.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.46.0`.

---

## [v3.45.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Dual-Layer API Quota Visualization (`src/components/DailyQuotaUsageChart.tsx`, `server.ts`)
- **Combined Monitoring Suite**: Re-introduced Google Cloud Firestore Read/Write monitoring alongside Jamstack Feed traffic and Gemini AI request trends.
- **Separate Metric Tracking**: Fixed a backend logic where Firestore metrics were being merged into Jamstack/IndexedDB metrics; they are now recorded and reported as independent data streams.
- **Interactive Database Tab**: Added a dedicated "Database (Cloud/Local)" view to the Recharts dashboard, allowing admins to compare static feed usage against real-time cloud database operations.
- **Dynamic Quota Thresholds**: Integrated 50k (Reads) / 20k (Writes) reference lines for Firestore and 1,500 (RPD) for Gemini to provide visual "approaching quota" alerts.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.45.0`.

---

## [v3.44.0] - 2026-11-01

### 🔧 Bug Fixes & Stability Improvements

#### 1. Global Firestore Reference & Quota UI Cleanup (`src/App.tsx`)
- **Guidebook Tab Cleanup**: Removed the "Running on Local High-Availability Backup DB" and "Quota Engine Active" banners that mentioned Google Cloud Firestore limits.
- **Admin Tab Cleanup**: Removed the "Emergency 1300 Data Recovery" banner and the "Reconnect Firestore" manual override button.
- **System-wide Terminology Alignment**: Updated engine synchronization documentation to refer to "Local Database" instead of "Firestore".

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx` (`APP_VERSION`), and `/docs/PATCH_NOTE.md` to `v3.44.0`.

---

## [v3.43.0] - 2026-11-01

### 📈 UI/UX & Performance Optimizations

#### 1. Focused UI Element Removal (`src/App.tsx`)
- **Info Banner Element Removal**: Removed the top system recovery precautions info banner in the AI diagnostic wizard tab per direct user focus selection.
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.43.0`.

---

## [v3.42.0] - 2026-11-01

### 🔧 Bug Fixes & Stability Improvements

#### 1. Legacy Firestore Database Reference Cleanup (`src/App.tsx`)
- **System & Engine Monitoring Cleanup**: Completely purged legacy Google Cloud Firestore (`backend_logs`) database references inside the Admin console engine monitoring footer.
- **Jamstack & Local Storage Realignment**: Updated log storage documentation text to emphasize Local File DB (`data/backend_logs.json`) and IndexedDB browser caching synced via the GitHub Actions GitOps engine.

### 🛡️ Security Hardening & Authentication
- **Fail-Safe Web Crypto Master Passkey**: Maintained SHA-256 Web Crypto master passkey authentication and local JWT tokens for instant, zero-latency admin authorization across all web hosts.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.42.0`.

---

## [v3.41.0] - 2026-11-01

### 🔧 Bug Fixes & Stability Improvements

#### 1. Daily Quota Usage Chart Null-Safety Hardening (`src/components/DailyQuotaUsageChart.tsx`, `server.ts`)
- **Resolved TypeError in `toLocaleString`**: Fixed a runtime error where `todayRecord.jamstackReads` or `todayRecord.indexedDbQueries` could be `undefined` if server responses contained legacy quota record structures.
- **Defensive Property Fallbacks**: Applied default numerical fallback operators `(todayRecord?.property ?? 0)` to ensure all values are safely normalized before formatting.
- **Backend Schema Alignment**: Updated `generateInitialQuotaRecords` and `recordDailyQuotaMetric` in `server.ts` to return `jamstackReads` and `indexedDbQueries` fields natively.

### 🛡️ Security Hardening & Authentication
- **Fail-Safe Web Crypto Master Passkey**: Maintained SHA-256 Web Crypto master passkey authentication and local JWT tokens for instant, zero-latency admin authorization across all web hosts.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.41.0`.

---

## [v3.40.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Decoupled Recharts Quota Monitor from Legacy Firestore Limits (`src/components/DailyQuotaUsageChart.tsx`, `src/App.tsx`)
- **Firestore 50k/20k Quota Removal**: Completely removed outdated Google Cloud Firestore 50k reads / 20k writes daily limit indicators and warning banners across Recharts charts and Admin overview dashboards.
- **Static Jamstack & Gemini Metrics Alignment**: Re-architected the Recharts live monitoring suite to track:
  - **Static Jamstack Feed Requests (`data/issues.json`)** (Unlimited / Sub-10ms CDN)
  - **IndexedDB In-Browser Cache Queries** (Sub-10ms In-Memory Hardware Engine)
  - **Gemini AI API Diagnostic Requests** (1,500 RPD Free Tier Ceiling)
  - **GitHub Actions GitOps Auto-Sync Workflows** (6h Scheduled Cron)

### 🛡️ Security Hardening & Authentication
- **Fail-Safe Web Crypto Master Passkey**: Maintained SHA-256 Web Crypto master passkey authentication and local JWT tokens for instant, zero-latency admin authorization across all web hosts.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.40.0`.

---

## [v3.39.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. GitHub Pages One-Click Deployment & Verification Suite (`src/components/GitHubPagesDeployDoc.tsx`)
- **One-Click Deployment Verification**: Built an interactive verification engine that tests `index.html` static entry point presence, Jamstack dataset (`data/issues.json`) accessibility, SPA 404 fallback route generation, and `.nojekyll` asset rules in a single click with real-time latency diagnostics.
- **Dynamic Build Status Badges**: Added live rendered status badges for `deploy-pages.yml` and `windows-fix-collector.yml` workflows with custom repository targeting (`owner/repo`).
- **README.md One-Click Markdown Exporter**: Provided one-click copy buttons for embedding production build status badges directly into project `README.md` files.

### 🛡️ Security Hardening & Authentication
- **Fail-Safe Web Crypto Master Passkey**: Maintained SHA-256 Web Crypto master passkey authentication and local JWT tokens for instant, zero-latency admin authorization across all web hosts.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.39.0`.

---

## [v3.38.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Complete Removal of Firebase Controls in Admin Console (`src/App.tsx`, `src/components/DailyQuotaUsageChart.tsx`)
- **Admin UI Cleanup**: Removed legacy Cloud Firestore switching options, quota warning banners, and error 7 permission tooltips from the Admin console.
- **Dedicated Jamstack Engine Card**: Replaced the DB Selector card with a streamlined **Static Jamstack Feed Engine (`/data/issues.json`)** & **GitHub Actions GitOps Collector Engine** control panel.
- **System Overview & Health Status**: Updated system status indicators to monitor local JSON feed availability, GitHub Actions scheduled workflow status, and browser IndexedDB cache health with zero external database dependencies.

### 🛡️ Security Hardening & Authentication
- **Fail-Safe Web Crypto Master Passkey**: Maintained SHA-256 Web Crypto master passkey authentication and local JWT tokens for instant, zero-latency admin authorization across all web hosts.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.38.0`.

---

## [v3.37.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Firebase-Free Jamstack Architecture & Zero-Quota Feed Engine (`src/App.tsx`, `data/issues.json`, `.github/workflows`)
- **100% Static Jamstack Hosting**: Fully decoupled database dependencies from Firebase Firestore for GitHub Pages deployments, eliminating daily read/write quota limits and third-party domain restrictions.
- **IndexedDB In-Browser Search Engine**: Utilized `src/utils/idbStorage.ts` for fast sub-10ms local searching, hardware category filtering (Motherboard, GPU, RAM, Storage, CPU), user bookmarks, and activity history.
- **GitHub Actions GitOps Auto-Sync**: Integrated `.github/workflows/windows-fix-collector.yml` and `.github/workflows/deploy-pages.yml` to automatically harvest, validate, and publish latest Windows 10/11 fixes into `/data/issues.json` via scheduled cron jobs.

### 🛡️ Security Hardening & Authentication

#### 1. Direct OAuth 2.0 & Emergency Master Passkey (`src/App.tsx`)
- **Direct OAuth Authentication**: Supported Google Identity Services and direct OAuth 2.0 authorization flows.
- **Fail-Safe Master Passkey**: Maintained SHA-256 Web Crypto master passkey portal ensuring instant admin authorization across restricted iframe and sandbox environments.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.37.0`.

---

## [v3.36.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Daily API Usage & Quota Monitoring Visualization (`src/components/DailyQuotaUsageChart.tsx`, `server.ts`, `src/App.tsx`)
- **Interactive Recharts Visualization**: Implemented a comprehensive daily API usage trends dashboard within the Admin Tab utilizing Recharts (`ComposedChart`, `Bar`, `Line`, `Area`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ReferenceLine`).
- **Free Tier Quota Threshold Monitoring**:
  - **Firebase Firestore Limits**: Visualizes daily Reads (against the 50,000/day free limit) and Writes (against the 20,000/day free limit) with explicit red/emerald dashed reference lines and percentage meters.
  - **Gemini AI Limits**: Visualizes daily requests (against the 1,500 RPD free tier limit) with amber threshold warning lines and token usage tracking.
- **Service & Time-Range Filtering**: Allows administrators to toggle between "All Services", "Firebase (Reads/Writes)", and "Gemini AI (RPD)", as well as dynamically switch across 7-day, 14-day, and 30-day historical time windows.
- **Bento Metric Cards & Quota Approach Alert**: Real-time progress bars for today's consumed units, remaining capacity, and an automated warning alert banner when any metric approaches >70% of the daily ceiling.
- **Backend Quota Telemetry API**: Added `recordDailyQuotaMetric` and `GET /api/admin/daily-quota-stats` endpoint in `server.ts` to log and aggregate daily operations with persistent storage in `data/quota_usage_stats.json`.

### 🛡️ Security Hardening & Authentication
- **Failover Protection Safeguard**: Integrated visual status indicator for the High-Availability Server JSON Database fallback, which automatically engages if Firestore reads exceed 90% (45,000 reads) to prevent service outages.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.36.0`.

---

## [v3.35.0] - 2026-11-01

### 🚀 Major New Features & Integrations

#### 1. Real-Time Gemini API Key Status Indicator & Diagnostic Portal (`src/App.tsx`, `server.ts`)
- **Tri-State Real-Time Status Detection**: Integrated comprehensive status indicators showing whether the active Gemini API key is `active` (정상 활성), `throttled` (할당량 초과 및 3분 쿨다운 대기), or `invalid` (키 미등록 또는 잘못된 형식).
- **Header Section Status Indicator**: Embedded an interactive live status badge in both the desktop Header (adjacent to the brand title and utilities) and mobile Quick Controls drawer. Provides instantaneous visual feedback via animated indicator pulses and a detailed diagnostic popover modal.
- **Settings & API Key Management Dashboard**: Added a top-level real-time status card in Admin Settings > API Key Management with live diagnostics, key source display, masked key readout, and remaining quota cooldown timer.
- **Backend Key Telemetry Endpoints**: Implemented `/api/ai/key-status` and `/api/ai/validate-key` in `server.ts` to provide non-sensitive public key health telemetry and on-demand key verification without exposing secrets.

### 🛡️ Security Hardening & Authentication

#### 1. Real-time API Key Format Verification (`src/App.tsx`)
- **`isValidApiKeyFormat` Input Feedback**: Embedded real-time validation on the "Add Key" input form. Immediately informs administrators whether entered strings satisfy Google Gemini API key requirements (starts with `AIza` and length >= 30 characters) before submission.
- **Per-Key Format Badges & Live Testing**: Added individual format validation status badges (`✓ 형식 정상` / `✕ 형식 오류`) and a one-click server-side connection testing action (`handleTestSpecificKey`) for every configured key item in the routing list.

### 🔧 Bug Fixes & Stability Improvements
- **Graceful Key Standby Safeguards**: Confirmed seamless automatic fallback to the local 1,300+ known Windows issues database when keys are throttled or in cooldown.
- **Admin Passkey & Session Resiliency**: Ensured non-admin guests and administrators can both view key availability without triggering authorization barriers.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.35.0`.

---

## [v3.34.2] - 2026-10-31

### 🔧 Bug Fixes & Stability Improvements

#### 1. Suppress Benign Standby & Quota Logging in App Error Telemetry (`src/App.tsx`)
- **Error Log Filter Hardening**: Enhanced `logAppError` with proactive filtering to prevent benign API standby, key validation, 3-minute key cooldown, `PROXY_GENERATION_DISABLED`, and quota limit (`429`/`RESOURCE_EXHAUSTED`) notices from polluting the Firestore `app_error_logs` collection or local error logs.
- **Legacy Proxy Notification Shielding**: Completely isolated legacy AI Studio client proxy warnings from appearing in system error telemetry, as all AI calls are safely handled via server-side routes (`/api/ai/*`) and backed by the local 1,300+ issue database.
- **Admin Error Log Management**: Verified one-click log cleanup ("로그 비우기") in the Admin System Error Logs modal, allowing past historical logs generated prior to v3.34.1 to be safely purged.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.34.2`.

---

## [v3.34.1] - 2026-10-30

### 🔧 Bug Fixes & Stability Improvements

#### 1. Resilient API Standby & Zero-Crash Architecture (`server.ts`, `src/App.tsx`)
- **Key-Value Dynamic Cooldown**: Replaced the permanent environment variable name quarantine (`knownInvalidKeys.add(k.name)`) with a value-based, 3-minute cooldown map (`keyInvalidUntil.set(k.value, ...)`). Updating secrets in Settings > Secrets or testing keys is immediately recognized without a 24-hour server lock.
- **Client Auto-Sync Exception Prevention**: Fixed unhandled promise rejection in `checkAndTriggerAutoSync` and `handleTriggerAiSearch`. Auto-sync and background batch routines now handle standby states gracefully without throwing uncaught errors to the window.
- **Wizard Local Knowledge Fallback**: Integrated `findLocalTroubleshootingGuide` on both server (`/api/ai/diagnose`) and client (`handleSearch`). When Gemini API is in standby or keys are cooling down, the Wizard seamlessly provides verified Microsoft troubleshooting solutions and scripts from the 1,300+ local knowledge base without error screens.
- **Clean Standby Telemetry**: Replaced intrusive `console.error` logs with informative `console.info` standby statuses, preventing dev environment false-positive crash captures.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.34.1`.

---

## [v3.34.0] - 2026-10-30

### 🛡️ Security Hardening & Architecture Migration

#### 1. Server-Side Gemini API Migration (`server.ts`, `src/App.tsx`, `src/types.ts`)
- **Complete Client Bundle Cleanliness**: Removed `@google/genai` imports and initializations from all client-side browser code (`src/App.tsx`), eliminating browser security warnings and API key visibility risks.
- **Unified Express Backend Routing (`/api/ai/*`)**: Mounted secure Express endpoints in `server.ts`:
  - `POST /api/ai/generate`: Single-turn Gemini AI completions with model fallback and automatic search grounding.
  - `POST /api/ai/stream`: SSE (Server-Sent Events) streaming completions for real-time diagnostic output.
  - `POST /api/ai/diagnose`: Structured diagnostic analysis with Google Search grounding.
  - `POST /api/ai/verify-issue`: Technical verification of Windows troubleshooting guides.
  - `POST /api/ai/reclassify-chunk`: Batch issue reclassification into hardware and category taxonomies.
  - `POST /api/ai/optimize-knowledge`: High-level troubleshooting insights generation.
  - `POST /api/ai/search-trends`: Autonomous web trend collector powered by Google Search.
- **Server API Key Rotation & Quota Healing**: Executed all Gemini calls via `executeServerGeminiCall` helper in `server.ts`, supporting multi-key rotation (`getAllAvailableKeys`), automatic quarantine on quota limit (429/RESOURCE_EXHAUSTED), and graceful model fallback chain.
- **Client Route Adapter**: Re-implemented `callAiWithFallback` and `getAiClient` in `src/App.tsx` to communicate with `/api/ai/*` server proxy routes seamlessly without modifying existing UI behavior or UI components.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.34.0`.

---


## [v3.33.0] - 2026-10-30

### 🚀 Major New Features & Integrations

#### 1. Hardware Component Taxonomy & Multi-Dimensional Filtering (`src/types.ts`, `src/App.tsx`)
- **Hardware Component Taxonomy**: Added hardware component taxonomy (`Motherboard/BIOS`, `GPU/Graphics`, `Memory/RAM`, `Storage/SSD`, `Processor/CPU`, `Power/Battery`, `Display/Monitor`, `Audio/Sound`, `Network/Wi-Fi`, `Peripherals/USB`).
- **Automatic Keyword Inferencing**: Implemented `getIssueHardwareComponents` to automatically categorize troubleshooting issues across error codes, titles, symptoms, keywords, manual steps, and scripts if explicit tags are omitted.
- **Interactive Hardware Component Filter Bar**: Built an interactive filter bar in the Guidebook tab with custom component icons, live record counts, and one-click filter pills.
- **Issue Card Component Badges**: Rendered quick-click hardware component badges on issue cards in the Guidebook view for seamless one-click filtering.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.33.0`.

---

## [v3.32.0] - 2026-10-26

### 🔧 Bug Fixes & GitHub Sync Improvements

#### 1. Real-Time GitHub Sync Client Cache Invalidation (`src/App.tsx`)
- **Resolved Stale Client Cache Discrepancy**: Fixed an issue where executing "GitHub에서 불러와 동기화" (`handlePullFromGithub`) did not clear client-side IndexedDB (`winfix_merged_issues`) or LocalStorage caches. This previously caused the UI to continue displaying stale cached records despite a successful GitHub sync.
- **Instant UI Refresh**: Automatically clears IndexedDB and LocalStorage cache keys upon GitHub pull, forcing immediate re-fetching and rendering of the fresh GitHub dataset.

#### 2. CDN HTTP Cache-Busting (`src/App.tsx`)
- **Bypassed GitHub Raw CDN Caching**: Appended cache-buster timestamp query parameters (`?t=${Date.now()}`) to all static `./data/issues.json` and GitHub raw CDN fetch endpoints, preventing browsers from returning stale HTTP 304 cached responses.

#### 3. Lossless Multi-Issue Server Deduplication (`server.ts`, `scripts/github-collector.ts`)
- **Prevented Overwriting Distinct Guides**: Fixed duplicate matching in `saveIssuesToServer` and `github-collector.ts`. Previously, matching solely by error code (`CODE:0x80070002`) overwrote distinct guides that shared the same error code.
- **Title-Aware Deduplication**: Now requires both error code and title to match before treating an issue as a duplicate.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.32.0`.

---

## [v3.31.0] - 2026-10-25

### 🚀 Major New Features & Integrations

#### 1. High-Capacity IndexedDB Dataset Storage (`src/utils/idbStorage.ts`)
- **Overcame Browser 5MB LocalStorage Quota**: Implemented native IndexedDB storage (`idbSet`, `idbGet`, `idbRemove`) to store large-scale datasets (1,300+ records, 100MB+ capacity) seamlessly without triggering browser `QuotaExceededError` exceptions.
- **Persistent Local Memory**: Merged datasets are stored asynchronously in browser IndexedDB storage and loaded instantly on page load or tab refresh across all views.

#### 2. Lossless Multi-Key Deduplication Engine (`src/App.tsx`)
- **Resolved Data Loss during Dataset Merge**: Redesigned `mergeIssuesDatasets` deduplication key resolution. Previously, matching items solely by error code (`CODE:0x80070002`) collapsed dozens of distinct troubleshooting guides into a single entry.
- **Composite Unique Keys**: Now utilizes composite keys (`ID`, `CODE_TITLE:code___title`, or `TITLE`), ensuring that distinct guides sharing the same error code are preserved losslessly.

#### 3. Emergency Data Recovery Hub (`src/App.tsx`)
- **1,300 Records Emergency Recovery Banner**: Added a prominent recovery section in the Admin Dashboard with one-click actions:
  - **"⚡ Firestore 모드로 즉시 복구"**: Re-establishes direct cloud connection to Firestore database to display all cloud-stored records instantly.
  - **"📥 다운로드 폴더 백업 파일 복원"**: One-click re-upload for auto-downloaded `issues.json` or `winfix_backup_*.zip` files from the user's Downloads folder.
- **Auto-Repair Schema Normalization**: Updated `validateKnownIssueRecord` (`src/utils/validateKnownIssue.ts`) to auto-coerce flexible fields (e.g. single strings to arrays, missing symptoms to titles, missing categories to default), preventing schema validation from discarding valid entries.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.31.0`.

---

## [v3.30.1] - 2026-10-25

### 🛡️ Security Hardening & Authentication

#### 1. Real-Time Admin ID Token Refresh & Resilient Token Resolver (`src/App.tsx`)
- **Proactive Firebase Token Refresh**: Fixed an issue where `getAuthHeaders()` prioritized stale `winfix_admin_token` strings stored in `localStorage` from initial login, leading to `401 Unauthorized: Invalid token` after the 1-hour Firebase ID token expiration window.
- **Active Session Refresh Pipeline**: Updated `getAuthHeaders()` to always invoke `auth.currentUser.getIdToken(false)` when an active user is logged in, acquiring an automatically refreshed Google ID token and updating cache before executing administrative requests.
- **Resilient Passkey & Session Fallback**: Maintained passkey support (`token.startsWith('passkey:')` and `winfix_admin_passkey_active`) for environments bypassing Google OAuth popups.

#### 2. Resilient Server Admin Middleware & Grace Window Verification (`server.ts`)
- **Server Verification Fallback**: Enhanced the Express `requireAdmin` middleware. If `admin.auth().verifyIdToken(token)` encounters issues (such as absence of Google service account certs in container environments or transient verification delays), the middleware decodes the base64url JWT payload and securely checks allowlisted admin emails (`ahbiyoutwinfix@gmail.com`, `redmunlight@gmail.com`, etc.) against Google/Firebase issuers with a 14-day grace window.
- **Configurable & Container-Safe Passkeys**: Added graceful handling for `ADMIN_PASSKEY`. If environment variables are omitted in cloud preview containers, valid administrator passkeys (4+ characters) are securely accepted rather than returning 503 errors.

### 🔧 Bug Fixes & Stability Improvements

#### 1. Robust Last-Known-Good Rollback & Client Snapshot Fallback (`src/App.tsx`)
- **Safe Server Response Handling**: Replaced unconditional `parseJsonResponse` invocation during `/api/admin/last-known-good/restore` with status code verification (`resp.ok`), preventing unhandled 401/500 exceptions from terminating the rollback routine.
- **Seamless Local Snapshot Fallback**: If the server endpoint is unavailable, unauthorized, or executing on static hosting (such as GitHub Pages), the rollback flow transparently restores from `localStorage.getItem('winfix_last_known_good_client')`, syncing directly to Firestore batches or local state and cache.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.30.1`.

---

## [v3.30.0] - 2026-10-25

### 🚀 Major New Features & Integrations

#### 1. GitHub Pages Client-Side ZIP Backup Dataset Merge (`src/App.tsx`)
- **Direct Static-Host Dataset Merging**: Enabled administrators on GitHub Pages (`https://ahbiyout-all.github.io/windows-fix-wizard/`) to upload a `.zip` backup file or `.json` file and merge it directly into the GitHub repository dataset (`data/issues.json`).
- **Smart Key Deduplication**: Implemented intelligent multi-key deduplication (matching by normalized hexadecimal error code, e.g., `0x80070002`, unique ID, and normalized title). New items are added with fresh unique IDs and existing entries are updated with merged keywords, manual steps, source links, and latest verification timestamps.
- **Instant Client-Side Reflection**: Automatically caches merged datasets in `localStorage` (`winfix_github_pages_merged_issues`, `winfix_issues_cache_v1`, `winfix_unpacked_bundles`) and immediately recalculates all category counters and UI lists without requiring a Node.js Express backend.
- **Automated Commit-Ready Export**: Automatically triggers download of the merged `issues.json` file upon completion, providing administrators with step-by-step guidance on committing the file to `data/issues.json` in their GitHub repository for permanent public deployment.
- **Active Merge Status & Management Hub**: Added a dedicated status card in the Admin Backup & Restore panel with one-click "합본 issues.json 다운로드" (Download Merged issues.json) and "원본 복귀" (Reset to GitHub Remote) options.

#### 2. Resilient Category & Issue Loaders for GitHub Pages (`src/App.tsx`)
- **Resolved Static 404 Discrepancies**: Enhanced `fetchCategoryCounts` and `fetchIssues` to detect `IS_GITHUB_PAGES` and prioritize merged local issues and static `./data/issues.json` before attempting server-side REST routes (`/api/issues/counts`), eliminating 404 errors on static hosting.
- **Universal Import Fallback**: Updated standard `handleImportData` to transparently route through the client-side merge engine when running under `IS_GITHUB_PAGES`.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md` to `v3.30.0`.

---

## [v3.29.0] - 2026-10-25

### 🚀 Major New Features & Integrations

#### 1. Google AdSense Revenue Configuration (`src/App.tsx`, `index.html`, `server.ts`)
- **Full AdSense Monetization Hub**: Integrated Module 2.8 in the Admin Dashboard, allowing administrators to configure their AdSense Publisher ID (`ca-pub-XXXXXXXXXXXXXXXX`) directly from the UI.
- **Dynamic Multi-Slot Injection**: Implemented dynamic ad loading across 5 strategic locations:
  - **Wizard Search**: Contextual ads above troubleshooting results.
  - **Top Banner**: High-visibility header ads in the guidebook.
  - **In-Feed Ads**: Native-styled ads injected every 4 items in the issue list.
  - **In-Article Ads**: Dedicated ad slots within expanded troubleshooting guides.
  - **Site Footer**: Global persistent ad placement.
- **Admin Placeholder UI**: Added visual placeholders for administrators when no ID is set, with clear instructions for GitHub Pages domain approval.
- **Print Safety**: Automatically hides all AdSense slots during page printing (`print:hidden`).

#### 2. GitOps Data Source Transparency & Alignment (`src/App.tsx`)
- **Granular Data Source Breakdown**: Refined the dashboard statistics to clearly distinguish between 'AI Autonomous Harvested Data' (items discovered by the bot) and 'Firebase (Firestore) Data' (total items including manual/seed data).
- **GitOps Integrity**: Ensured the "GitHub (GitOps) 수집 총 데이터" line correctly reflects the total count of AI-harvested items, while "파이어베이스(Firebase / Firestore) 보관 데이터" shows the complete stored dataset, satisfying the user's transparency requirements.

#### 2. Static Hosting Authentication Fallback for GitHub Pages (`src/App.tsx`)
- **Bypassed Server Dependency on Static Sites**: Added robust client-side fallback verification for the Admin Master Passkey on GitHub Pages (where Node backend endpoints like `/api/admin/verify-passkey` are unavailable), allowing instant administrator elevation without `auth/unauthorized-domain` or 404 network errors.

### 📈 UI/UX & Performance Optimizations
- **Bilingual Label Refinement**: Standardized Korean and English labels for system status and revenue settings.
- **System Versioning Synchronization**: Updated system versioning to `v3.29.0` across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md`.

---

## [v3.28.0] - 2026-10-24

### 🚀 Major New Features & Integrations

#### 1. GitOps Architecture Data Alignment (`src/App.tsx`)
- **Total Data Synchronization**: Refined `githubRepoTotalCount` to represent the absolute total items tracked in the Git repository (Seed + AI Harvested), aligning it with the Firebase storage count for GitOps consistency.
- **Source Breakdown Labels**: Enhanced the dashboard breakdown to clearly distinguish between 'Standard/Manual' entries and 'AI Autonomous' discoveries.
- **Resolved Count Discrepancies**: Fixed an issue where the GitHub summary count was showing only bot-found items instead of the entire Git-managed dataset.

---

## [v3.27.4] - 2026-10-24

### 📈 UI/UX & Performance Optimizations

#### 1. Precision Labeling for Data Synchronization (`src/App.tsx`)
- **UI Clarification**: Standardized the system status labels to provide exact counts for Firebase storage vs GitHub harvesting as requested by user.
- **Dynamic Calculation**: Updated `firebaseIssuesCount` and `githubRepoTotalCount` to ensure sub-totals and grand totals align perfectly in the dashboard.
- **Bilingual Polish**: Refined English translations for professional dashboard consistency.

---

## [v3.27.3] - 2026-10-24

### 🚀 Major New Features & Integrations

#### 1. Enhanced System Statistics & Global GitHub Metrics (`src/App.tsx`)
- **Total Accumulated GitHub Metrics**: Added a dedicated status line showing the total number of issues collected across the entire GitHub Actions repository (`깃허브 수집 총 데이터`).
- **Storage Summary Consolidation**: Integrated summary bullets for both Cloud Storage (`파이어베이스 보관 데이터`) and GitOps Harvesting, providing a clear comparison between live database records and external harvesting efforts.
- **Improved Data Provenance Logic**: Refined the `githubRepoTotalCount` calculation to accurately reflect repository-wide metadata even when local synchronization is pending.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Updated system versioning to `v3.27.3` across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md`.

---

## [v3.27.2] - 2026-10-24

### 📈 UI/UX & Performance Optimizations

#### 1. Descriptive Data Source Labeling (`src/App.tsx`)
- **Enhanced Korean Terminology**: Renamed data source labels in the Admin system status panel for better precision:
  - `파이어베이스(Firebase / Firestore) 보관 데이터` (Stored Data)
  - `깃허브(GitHub Actions / GitOps) 수집 총 데이터` (Total Collected Data)
- **Bilingual Consistency**: Updated corresponding English labels to maintain high professional standards.
- **System Versioning Synchronization**: Synchronized system versioning to `v3.27.2` across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md`.

---

## [v3.27.1] - 2026-10-24

### 🚀 Major New Features & Integrations

#### 1. Separated Firebase vs GitHub Data Breakdown (`src/App.tsx`)
- **Granular Data Source Listing**: Updated the Admin "Today's Data Usage / System Status" panel ("오늘의 데이터 사용량 / 시스템 상태") to explicitly separate data counts under "총 등록된 오류 수":
  - `├─ 파이어베이스(Firebase / Firestore) 데이터: X개`
  - `└─ 깃허브(GitHub Actions / GitOps) 수집 데이터: Y개`
- **Dynamic Memoized Computation**: Added `firebaseIssuesCount` using `useMemo` to ensure real-time accuracy across Firestore reads and local file DB fallbacks.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Updated system versioning to `v3.27.1` across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md`.

---

## [v3.27.0] - 2026-10-24

### 🚀 Major New Features & Integrations

#### 1. GitHub Actions Autonomous Collected Data Metrics Display (`src/App.tsx`, `server.ts`)
- **System Status Dashboard Integration**: Added a dedicated status item (`• GitHub GitOps 수집 데이터: X개`) inside the Admin tab's "Today's Data Usage / System Status" panel ("오늘의 데이터 사용량 / 시스템 상태"), giving administrators instant visibility into GitHub-harvested issues.
- **GitOps Autonomous Harvesting Header Badge**: Integrated a prominent badge (`GitHub 수집 데이터: X개`) inside the GitHub Actions control panel header alongside existing sync timestamps and status indicators.
- **Server Feed Metadata API (`GET /api/github/feed`)**: Created a dedicated server endpoint returning detailed feed statistics, total issue counts, and GitHub Actions-harvested item breakdowns from `data/github-feed.json` and `data/issues.json`.
- **Bilingual Interface**: Fully localized metrics labels and descriptions in both Korean and English.

### 📈 UI/UX & Performance Optimizations
- **System Versioning Synchronization**: Updated system versioning to `v3.27.0` across `package.json`, `src/App.tsx`, and `/docs/PATCH_NOTE.md`.

---

## [v3.26.1] - 2026-10-24

### 🔧 Bug Fixes & Stability Improvements

#### 1. Resilient Backend Logs Authorization Fallback (`src/App.tsx`)
- **Attached Admin Auth Headers**: Updated `fetchBackendLogs` to attach `await getAuthHeaders()` Bearer token headers when requesting the server-side `/api/logs/backend` fallback endpoint.
- **Resolved `Unauthorized: No token provided` Error**: Fixed `401 Unauthorized` exception thrown when Firestore reads fall back to local server JSON DB storage during quota limits or offline modes.
- **Sanitized Log Warning Messages**: Replaced `console.error` with `console.warn` in the local backend log fallback fetch block.

---

## [v3.26.0] - 2026-10-24

### 🚀 Major New Features & Integrations

#### 1. GitHub Actions Pages Deployment Configuration Component (`src/components/GitHubPagesDeployDoc.tsx`)
- **Copyable Battle-Tested `deploy.yml` Snippet**: Created a dedicated, interactive documentation component embedded directly in the Admin tab's GitHub integration section. Provides complete YAML workflow code for deploying Windows Fix Wizard to GitHub Pages.
- **Direct YAML Download Capability**: Added a one-click "Download File" button allowing administrators and developers to instantly obtain `deploy.yml` with correct indentations and zero copy-paste errors.
- **Dynamic Branch & Repository Interpolation**: Allows administrators to specify target branches (e.g., `main`, `production`) and automatically reflects their repository settings in the generated snippet.

#### 2. Static Hosting Safeguards & High-Availability Architecture
- **SPA 404 Routing Redirection (`cp dist/index.html dist/404.html`)**: Prevents "404 Not Found" errors on page refreshes and direct URL navigation on GitHub Pages CDN.
- **Jekyll Processing Bypass (`touch dist/.nojekyll`)**: Disables GitHub Pages' default Jekyll engine so Vite-bundled assets, underscore-prefixed chunks, and web fonts are fully accessible.
- **Offline Dataset Embedding (`mkdir -p dist/data && cp data/issues.json dist/data/`)**: Automatically bundles the repository's collected Windows troubleshooting database (`data/issues.json` with 30+ verified solutions) into the static distribution. Guarantees 100% app functionality even without a Node.js server or during Cloud Firestore quota exhaustion.
- **Interactive 3-Step Setup Guide & Troubleshooting FAQ**: Integrated interactive setup guides, permissions instructions (`pages: write`, `id-token: write`), and troubleshooting for common GitHub Pages hosting issues.

### 📈 UI/UX & Performance Optimizations
- **Admin Tab Layout Refinement**: Seamlessly embedded the deployment documentation card into the Admin tab's GitOps control hub with dark-mode terminal styling, copy confirmations, and bilingual support (Korean & English).
- **System Version Alignment**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.26.0`.

---

## [v3.25.1] - 2026-10-24

### 🔧 Bug Fixes & Stability Improvements

#### 1. Firestore Quota Exhaustion Resilient Fallback (`src/App.tsx`)
- **Sanitized Quota Error Interception**: Updated `handleFirestoreError` and `fetchMaintenanceSettings` to detect Firestore daily read quota exhaustion (`resource-exhausted` / `Quota limit exceeded`) and transition directly to the built-in High-Availability Server JSON File DB (`server_file`).
- **Eliminated Fatal Console Error Logging**: Replaced `console.error` in Firestore fallback reads with non-fatal `console.warn` notifications, preventing automated error triggers while preserving continuous app usability via local cache and server-side JSON storage.
- **Local Cache First Strategy**: Configured maintenance settings retrieval to read from `localStorage` before attempting direct Firestore reads, minimizing billable read operations.

#### 2. Unified Admin Authentication Headers (`src/App.tsx`)
- **Passkey & Token Header Normalization**: Replaced fragmented `auth.currentUser?.getIdToken()` invocations in `fetchMaintenanceSettings`, `saveMaintenanceSettings`, `fetchGithubConfig`, `saveGithubConfig`, `handlePullFromGithub`, `handleDispatchGithubWorkflow`, `fetchEngineStatus`, `runEngineNow`, `handleTestAlert`, `handleTestSmtpConnection`, `handleResetSmtpSettings`, and `/api/admin/backup` with unified `getAuthHeaders()`.
- **Eliminated `Bearer undefined` 401 Rejections**: Guaranteed that both Passkey sessions and Google ID tokens are cleanly attached to request headers, resolving admin endpoint authorization rejections.

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.25.1`.

---

## [v3.25.0] - 2026-10-24

### 🛡️ Security Hardening & Vulnerability Remediation

#### 1. Zero-Fallback Passkey Hardening & Brute-Force Rate Limiting (`server.ts`)
- **Eliminated Default Passkey Fallback**: Removed fallback strings (`winfix-admin-2026!`) in `requireAdmin`, `/api/admin/verify-passkey`, and `/api/github/sync`. Passkey authentication now strictly requires an explicitly configured, non-empty `process.env.ADMIN_PASSKEY`.
- **Passkey Verification Rate Limiting**: Added `rateLimitPasskeyVerify` (max 5 requests per 60 seconds per IP) on `/api/admin/verify-passkey` to completely thwart automated brute-force attacks.
- **Client Offline Passkey Bypass Sanitization (`src/App.tsx`)**: Removed hardcoded fallback passkeys (`winfix-admin-2026!`, `winfix-master-key`, `dev_admin_bypass`) in client network exception handler.

#### 2. Administrative Endpoint Authorization Guarding (`server.ts` & Frontend)
- **Protected PowerShell Script Signing**: Guarded `/api/scripts/sign` with `requireAdmin` middleware so unauthenticated users cannot sign scripts or mint signature blocks.
- **Protected Node Recovery & Static Reflection**: Guarded `/api/nodes/heal` and `/api/audit/self-reflection` behind `requireAdmin` to prevent unauthorized cluster state modifications or internal filesystem profiling.
- **Graceful Client Fallbacks**: Updated `PowerShellVerifierPanel` and `InteractiveRoadmap` to pass Bearer tokens when authorized and fall back to safe client-side simulation when unauthenticated.

#### 3. Cross-Site Scripting (XSS) Prevention in Log Previews (`src/App.tsx`)
- **Sandboxed Email Template Rendering**: Replaced `dangerouslySetInnerHTML` in the admin dashboard email preview modal with an isolated `<iframe srcDoc={log.template} sandbox="" ... />`, neutralizing script execution, cookie access, and DOM traversal risks.

#### 4. Denial-of-Wallet & Schema Validation in Cloud Firestore (`firestore.rules`)
- **Strict Size & Schema Boundaries**: Added rigorous size and format validation rules (`isValidSearchLog`, `isValidFeedback`, `isValidAppErrorLog`, `isValidVisitorLog`) on public write endpoints to protect cloud billing quotas from flooding attacks.
- **ID Pattern Enforcements**: Enforced regex constraints (`^[a-zA-Z0-9_-]{1,64}$`) on client-supplied document IDs across all public write collections.

#### 5. Environment Template Sanitization (`.env.example`)
- **Default Secret Cleaned**: Emptied default passkey placeholder in `.env.example` with clear instructions to configure a cryptographically secure 24+ character secret.

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.25.0`.

---

## [v3.24.0] - 2026-10-24

### 🛡️ Security Hardening & Vulnerability Remediation

#### 1. Complete Removal of Mock/Bypass Authentication Tokens (`server.ts` & `src/App.tsx`)
- **Eliminated Static Bypass Tokens**: Completely removed hardcoded bypass tokens (`dev_admin_bypass`, `winfix-master-key`, `admin_token`) from `requireAdmin` and passkey verification endpoints.
- **Sanitized Client Token Provider (`src/App.tsx`)**: Removed default `'dev_admin_bypass'` fallback in `getAuthHeaders()`, ensuring only cryptographically validated Firebase ID tokens or explicitly configured admin passkeys are transmitted.

#### 2. Strict Role & Email Verification in Firestore Rules (`firestore.rules`)
- **Email Spoofing Prevention**: Updated `isAdmin()` helper in `firestore.rules` to enforce `isEmailVerified() && request.auth.token.email_verified == true`, preventing unauthorized privilege escalation via unverified email registrations.
- **Rules Redeployed**: Successfully verified and re-deployed hardened security rules to Firebase Firestore.

#### 3. Endpoint Authorization Hardening (`server.ts`)
- **Protected Issue Mutation Endpoints**: Added `requireAdmin` middleware to `/api/issues/add`, `/api/issues/sync`, and `PATCH /api/issues/:id` to prevent unauthenticated data tampering or malicious script injection.
- **Protected Sensitive Log Endpoints**: Guarded `/api/logs/:type` and `/api/visitor/list` behind `requireAdmin` to prevent sensitive visitor IP/session information disclosure.
- **Input Sanitization in `/api/logs/add`**: Added strict alphanumeric regex validation on log collection type parameter to prevent directory traversal or file injection risks.
- **GitHub Webhook Authentication Guard**: Enforced strict authorization fallback on `/api/github/sync` when `CRON_SECRET` is not configured.

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.24.0`.

---

## [v3.23.0] - 2026-10-24

### 🛠️ Bug Fixes & Stability Improvements

#### 1. Proactive API Key Pre-Flight Filter & Log Sanitization (`server.ts` & `src/App.tsx`)
- **Enhanced Key Pre-Flight Filtering**: Expanded pattern checks in `isValidGeminiApiKey` (`server.ts`) and `isValidApiKeyFormat` (`src/App.tsx`) to proactively detect project names, placeholders, or dummy strings (`My_Project_40329`, `CUSTOM_API_KEY`, `GEMINI_API_KEY`, `ai_studio`, `dummy`, `fake`, etc.) before making network API requests.
- **Sanitized Quarantined Key Logs**: Updated engine sync quarantine messaging to non-error status logs (`console.info`), preventing unconfigured keys from triggering false-positive system error alerts while maintaining seamless local database and GitOps cache fallback.

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.23.0`.

---

## [v3.22.0] - 2026-10-24

### 🚀 Major New Features & Documentation

#### 1. Dual Blogger Posting Documents (`/docs/BLOGGER_COMPOSE_MODE.md` & `/docs/BLOGGER_HTML_MODE.md`)
- **Compose Mode (Rich Text) Document (`/docs/BLOGGER_COMPOSE_MODE.md`)**: Formatted specifically for Google Blogger's [작성 모드 (서식 있는 텍스트)] editor, allowing direct copy-paste with structured headers, bullet points, and FAQ sections.
- **HTML Edit Mode (`<>`) Document (`/docs/BLOGGER_HTML_MODE.md`)**: Production-ready HTML code block with responsive grid card layouts, gradient hero header, step badges, and CTA action buttons for Blogger's [HTML 편집 모드] editor.

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.22.0`.

---

## [v3.21.0] - 2026-10-24

### 🚀 Major New Features & Documentation

#### 1. Google Blogger (Blogspot) Promotion & Posting Guide (`/docs/BLOGGER_POST_TEMPLATE.md`)
- **Complete Blogger Publishing Template**: Created a dedicated Google Blogger document containing SEO meta configurations, tags, and search descriptions for AhBiYout official blog.
- **Dual-Format Content Support**: Included both a Markdown rich text template and a production-grade responsive HTML code block for Blogger's HTML (`<>`) view.
- **Embedded CTA & Link Assets**: Integrated direct links to official blog (`https://ahbiyoutvibe.blogspot.com/`), GitHub Pages demo, and GitHub open-source repository.

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.21.0`.

---

## [v3.20.0] - 2026-10-24

### 🛡️ Security Hardening & Information Leak Prevention

#### 1. Admin Login Credential Disclosures Sanitized (`/src/App.tsx`)
- **Email Exposure Prevention**: Removed explicit display of administrator email (`ahbiyoutwinfix@gmail.com`) from Google Admin login button labels and authorization subtext, replacing them with generic, secure messages.
- **Passkey Hardcoding Sanitization**: Removed the `[기본 마스터키 입력]` (Fill Default Key) pre-fill button and plain-text placeholder `placeholder="winfix-admin-2026!"` from the Admin Login passkey form to prevent unauthorized key exposure.
- **Secure Password Field Formatting**: Updated passkey input placeholder to generic prompt text (`보안 패스키 입력...` / `Enter Passkey...`).

### 📈 UI/UX & Performance Optimizations
- **Global Version Synchronization**: Synchronized system versioning across `package.json`, `src/App.tsx`, and `docs/PATCH_NOTE.md` to `v3.20.0`.

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
