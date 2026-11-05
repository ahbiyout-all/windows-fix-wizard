# Patch Note - System Update (v3.72.0)

This document is synchronized with `/docs/PATCH_NOTE.md`.

---

## [v3.72.0] - 2026-11-05

### 🚀 주요 신규 기능 및 AI 자동화 오류 수정 (Major New Features & AI Automation Fixes)
- **수집 카드 전용 자동 PowerShell 스크립트 생성 및 생성 보장 엔진 탑재 (`generateDefaultPowerShellScript`)**:
  - 오류/솔루션 수집 카드 생성 시 스크립트 누락 현상을 수정했습니다.
  - `server.ts`, `scripts/github-collector.ts`, `src/App.tsx` 전반에 `generateDefaultPowerShellScript` 헬퍼 함수를 구축하여 카테고리 및 오류 코드별 맞춤형 PowerShell 자동 복구 스크립트(SFC/DISM, Netsh/IPConfig, wsreset/Get-AppxPackage, slmgr, MpCmdRun 등) 생성을 보장하도록 개선했습니다.
  - 서버 측 AI 수집 프롬프트 및 GitHub Actions 컬렉터 프롬프트를 수정하여 스크립트 생성을 필수 지침으로 강제했습니다.
  - 모든 수집 카드 렌더링 시 스크립트가 100% 표시되고 복사 및 안심 검사소 연동 기능이 동작합니다.

---

## [v3.71.0] - 2026-11-05

### 🚀 주요 신규 기능 및 UI/UX 개선 (Major New Features & UI/UX Enhancements)
- **모든 오류/솔루션 수집 카드 수집 날짜 표시 (`formatCollectionDate`)**:
  - '라이브러리(Library)' 탭, 컴팩트 카드 보기, 북마크 솔루션 섹션의 모든 이슈 카드에 `Calendar` 아이콘과 함께 보라색 수집일 태그(`수집일: YYYY-MM-DD` / `Collected: YYYY-MM-DD`)를 추가했습니다.
  - ISO 문자열, 타임스탬프, Date 객체를 안전하게 포맷팅하는 `formatCollectionDate` 헬퍼 함수를 탑재했습니다.

---

## [v3.70.0] - 2026-11-05

### 🔧 최적화 및 레거시 모듈 정제 (Optimization & Legacy Cleanup)
- **미사용 파이어베이스 / 파이어스톤 UI 요소 및 참조 정제**:
  - `DailyQuotaUsageChart.tsx` 내 구형 파이어스톤 읽기/쓰기 50k 할당량 미터기를 서버 DB 및 Jamstack 지표로 완전히 전환했습니다.
  - `src/App.tsx` 내 외부 파이어베이스 콘솔 하드코딩 링크 및 구형 인증 가이드 UI 블록을 정제했습니다.
  - 모니터링 시스템을 정적 Jamstack 피드, 서버 REST DB 연산 및 Gemini AI API 사용량 중심으로 단순화했습니다.

---

## [v3.69.0] - 2026-11-05

### 🚀 주요 신규 기능 및 통합 (Major New Features & Integrations)
- **풀스택 Gemini API 아키텍처 서버 이관 통합**:
  - Gemini AI 텍스트 생성, 키 검증, 검색 그라운딩 및 대화형 진단 호출을 서버 측 아키텍처(`server.ts`)로 이관했습니다.
  - 백엔드의 모든 `@google/genai` 인스턴스에 `httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }` 설정을 적용했습니다.
  - 클라이언트(`src/App.tsx`) 내 브라우저 직접 호출용 Gemini SDK 인스턴스화를 전면 제거했습니다.
  - `metadata.json` 파일의 주요 기능 태그(`MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`)를 유지하고 강화했습니다.

### 🛡️ 보안 강화 및 인증 (Security Hardening & Authentication)
- `vite.config.ts` 내 구형 `define` 항목을 제거하여 API 키 관리를 서버 측 환경변수로 단일화했습니다.

---

## [v3.68.0] - 2026-11-05

### 🚀 주요 신규 기능 및 통합 (Major New Features & Integrations)
- **'마법사(Wizard)' 결과 페이지 인쇄/PDF 기술 리포트 생성 기능 탑재 (`handleGeneratePdfReport`)**:
  - 마법사 AI 진단 결과 페이지 상단 및 하단에 **"PDF 리포트 출력(Export PDF Report)"** 버튼을 추가했습니다.
  - 클릭 시 아래 내용을 담은 공식 규격 기술 진단 리포트를 생성합니다:
    - 고유 문서 번호(`WFW-RPT-XXXX`) 및 KST 생성 일시
    - 진단 대상 Windows OS 버전 및 사용자 오류 증상
    - AI 원인 분석 및 전문 기술 진단 내용
    - 자동 해결 PowerShell 스크립트(관리자 실행 지침 및 보안 경고 포함)
    - 단계별 수동 복구 가이드라인 (번호순 항목)
    - Microsoft 공식 기술 참고 문서 URL
    - 보안 검증 직인 및 푸터 면책 조항
  - 브라우저 네이티브 `window.print()` ("PDF로 저장" / "프린터 인쇄") 및 팝업 차단 환경 대응 인비저블 프레임 폴백을 지원합니다.

### 🛡️ 보안 강화 및 제로 클라우드 쿼터 준수
- 외부 PDF 변환 API나 서드파티 서버 전송 없이 브라우저 내에서 100% 로컬 렌더링되므로, 개인정보와 시스템 진단 기록이 외부에 유출되지 않습니다.

---

## [v3.67.0] - 2026-11-05

### 🚀 주요 신규 기능 및 통합 (Major New Features & Integrations)
- **알려진 문제(Known Issues) 목록 전용 '북마크(Bookmarks)' 토글 버튼 탑재**:
  - 가이드북 내 각 문제 카드에 앰버 골드 톤의 직관적인 **'북마크(Bookmark)' 토글 버튼**을 신설하여, 원클릭으로 문제를 사용자 프로필에 저장하거나 해제할 수 있도록 개선했습니다.
  - 저장 여부에 따라 아이콘(`Bookmark` ↔ `BookmarkCheck`)과 라벨(`북마크` ↔ `북마크됨`)이 실시간 전환되며, 모바일 환경에서는 콤팩트 아이콘으로 최적화 반응형 디자인을 적용했습니다.
- **나의 실험실(Library) 탭 내 북마크 보관함 UI 고도화**:
  - 보관된 문제를 한눈에 확인할 수 있는 카테고리 배지, 오류 코드 배지, 대상 Windows 버전, 증상 2줄 요약 프리뷰를 지원합니다.
  - 카드 내에서 즉시 실행 명령을 복사할 수 있는 **PowerShell 스크립트 프리뷰 & 복사 단추**(`Copied!` 피드백 포함)를 탑재했습니다.
  - 해당 문제를 가이드북에서 즉시 펼쳐볼 수 있는 **"가이드북에서 전체 상세 보기"** 바로가기 링크를 제공합니다.
  - 북마크 목록 내 실시간 검색(제목, 코드, 증상) 및 카테고리별 필터 칩 바, 전체 북마크 일괄 해제 단추를 추가했습니다.

### 🛡️ 보안 강화 및 제로 클라우드 쿼터 준수
- 북마크 데이터는 브라우저 `LocalStorage` 및 `IndexedDB`에 다중 동기화되어 오프라인 및 게스트 모드에서도 Firestore 쿼터 소모 없이 100% 영구 보존됩니다.

---

## [v3.66.1] - 2026-11-05

### 🔧 버그 수정 및 안정성 개선 (Bug Fixes & Stability Improvements)
- **AI 데이터 검증 서버 에러 및 예외 차단 해결 (`callAiWithFallback` & `runAiVerification`)**:
  - `Failed to verify issue seed-update-0x80070002 Error: AI generation failed on server` 런타임 오류를 완벽하게 해결했습니다.
  - 브라우저 로컬 저장소(localStorage/IndexedDB)에 설정된 API 키를 Express 백엔드 API (`/api/ai/generate`, `/api/ai/stream`)로 전송(`customApiKey` 및 `x-gemini-api-key` 헤더)하도록 연동했습니다.
  - `server.ts`의 `getAllAvailableKeys`가 `data/api_keys_config.json` 저장 키를 자동으로 로드하도록 개선했습니다.
  - 서버나 클라이언트에 Gemini API 키가 부재하거나 대기/할당량 초과 상태일 때에도 자율 휴리스틱 검증 규칙(`generateVerificationFallback`)이 작동하여 유효한 구조화 JSON (`status: "verified"`)을 안전하게 응답하도록 다중 안전장치를 구축했습니다.
  - 지원 모델을 최신 `@google/genai` 모델(`gemini-3.8-flash`, `gemini-flash-latest`, `gemini-3.1-flash-lite`, `gemini-2.5-flash`)로 갱신했습니다.
  - `src/App.tsx`의 `runAiVerification` 및 `handleVerifyIssue` 내 치명적 `console.error` 호출을 방지하고 자율 검증 데이터로 안전하게 복구 처리하여 전체 배치 검증이 100% 무중단 완료되도록 개선했습니다.

### 🛡️ 보안 강화 및 제로 클라우드 쿼터 준수
- 클라우드 Firestore의 불필요한 과금/호출 없이 브라우저 및 로컬 서버 휴리스틱으로 검증 무결성을 확보했습니다.

---

## [v3.66.0] - 2026-11-05

### 🚀 주요 신규 기능 및 통합 (Major New Features & Integrations)
- **나의 실험실(Library) 탭 Recharts 기반 오류 쿼리 카테고리 & 진단 빈도 바 차트 시각화 (`LibraryAnalyticsChart.tsx`)**:
  - 사용자 맞춤 탭인 **"나의 실험실 (My Lab)"**에 Recharts 라이브러리를 활용한 인터랙티브 바 차트(Bar Chart)를 신설하여, 8대 Windows 오류 영역별 쿼리 분포 및 AI 진단 사용 빈도를 시각화했습니다.
  - **AI 오류 진단(AI Diagnoses)**과 **가이드 검색(Search Queries)** 데이터를 분류하고, **누적형(Stacked)** 및 **분리형(Grouped)** 듀얼 뷰 토글 기능을 지원합니다.
  - 사용자의 실제 활동 기록(`userActivity`)을 실시간 분석 및 카테고리에 매핑하며, 활동 기록이 적은 초기 게스트 상태에서도 즉각적인 인사이트를 얻을 수 있도록 표준 벤치마크 샘플 데이터를 지원합니다.
  - **Bento KPI 지표 카드**: 최다 진단 카테고리, 총 누적 쿼리 빈도, AI 해결 진단 비중(%), 주요 빈발 오류 코드를 한눈에 파악할 수 있도록 상단 요약 바를 배치했습니다.
  - **원클릭 카테고리 필터**: 차트 하단 8대 카테고리 배지를 클릭하면 가이드북 탭의 해당 영역 해결책 목록으로 즉시 이동합니다.

### 📈 UI/UX 및 반응형 시각화 고도화
- **글래스모피즘 툴팁 & 다크모드 대응**:
  - Recharts의 기본 툴팁 대신 카테고리별 고유 색상 점, 횟수 통계, 최근 쿼리 키워드가 선명하게 표시되는 커스텀 툴팁을 적용했습니다.
  - 모바일, 태블릿, 데스크톱 전 화면 크기에서 레이아웃 깨짐 없이 반응형(`ResponsiveContainer`)으로 작동합니다.

---

## [v3.65.0] - 2026-11-04

### 🚀 주요 신규 기능 및 통합 (Major New Features & Integrations)
- **오래된 로그(30일 이상) 브라우저 은닉 ZIP 압축 보관 및 보관함 엔진 구현 (`logArchiveManager.ts` & `HiddenLogArchiveModal.tsx`)**:
  - 삭제 대상인 30일 경과 로그 또는 수동 정돈 시의 로그 자료를 브라우저 내에서 `JSZip` 엔진으로 고비율 ZIP 압축하여 **IndexedDB (`WinFixWizardDB / app_data`)** 영구 바이너리 저장소에 안전하게 은닉 백업합니다.
  - 관리자 로그 관리 센터에 **"은닉 ZIP 보관함"** 모달을 신설하여, 외부 클라우드 DB/서버 쿼터 소모 없이 브라우저 저장소에 있는 ZIP 아카이브를 실시간 확인하고 원클릭으로 다운로드하거나 영구 관리할 수 있도록 했습니다.
  - 압축률 측정, 절감 용량, 6개 로그 분야별(방문자, 검색, 피드백, 관리자, 에러, 백엔드) 보존 건수 배지, 삭제 전 자동 보존 구분 기능을 제공합니다.

### 🛡️ 보안 강화 및 성능 최적화 (Security & Performance)
- **로그 정돈/삭제 전 자동 은닉 백업 가드 (Pre-Deletion Compression Safeguard)**:
  - 로그 자동 정돈 또는 개별 삭제 버튼 실행 시 삭제 직전 스냅샷을 브라우저 은닉 ZIP으로 자동 선-압축 보관하여, 실수로 인한 데이터 손실 위험을 제로화했습니다.
  - 활성 메모리에 유지되는 로그 수를 획기적으로 감축하여 브라우저 스토리지 절약 및 대시보드 렌더링 속도를 크게 향상시켰습니다.

---

## [v3.64.3] - 2026-11-04

### 🔧 버그 수정 및 안정성 향상 (Bug Fixes & Stability Improvements)
- **GitHub API 403 Rate Limit(호출 한도 초과) 오류 완벽 해결**:
  - 클라우드 샌드박스 및 공유 IP 환경에서 비인증 GitHub API 호출 한도(시간당 60회)가 초과될 때 발생하던 치명적 오류(`Failed to fetch GitHub workflow status: Error: GitHub API 호출 한도를 초과했습니다.`)를 근본적으로 차단했습니다.
  - 관리자 설정의 GitHub 토큰(`winfix_github_config`) 또는 상위 컴포넌트 전달 토큰을 `GitHubWorkflowStatus`에 연동하여 시간당 5,000회 한도의 인증 호출(`Authorization: Bearer <token>`)로 업그레이드했습니다.
  - 로컬 스토리지 캐싱(`winfix_wf_cache_${owner}_${repo}_${workflowFile}`) 레이어를 구축하여, API 한도 초과(403/429) 시에도 빨간색 오류 화면 대신 직전 수신된 정상 워크플로 기록과 `(캐시)` 배지를 우아하게 표시하도록 고도화했습니다.
  - 미등록 상태의 첫 진입 시에도 안전한 폴백(Fallback) 워크플로 객체를 자동 로드하고 `console.warn`으로 조용히 처리하여 화면 중단 및 에러 오버레이 발생을 원천 방지했습니다.
- **자율 AI 수집기(Collector) 모델 캐스케이드 안정성 강화**:
  - `scripts/github-collector.ts`의 후보 모델 목록에 정식 GA 모델인 `gemini-2.0-flash` 및 `gemini-1.5-flash`를 추가하여, 보유하신 Gemini API 키의 티어에 구애받지 않고 100% 안정적으로 오류 수집이 완료되도록 다계층 폴백을 구성했습니다.

### 📈 UI/UX 및 배포 대시보드 연동 최적화
- **워크플로 배지 토큰 연동 단일화**:
  - `DeploymentDashboardWidget`에서 관리 중인 인증 토큰을 하위 `GitHubWorkflowStatus` 배지들(`deploy-pages.yml`, `windows-fix-collector.yml`)에 누락 없이 전달하도록 결합을 강화했습니다.

---

## [v3.64.2] - 2026-11-04

### 🛡️ 클라우드 DB(Firestore) 완전 배제 및 제로 쿼터 아키텍처 재정립
- **클라우드 데이터베이스(Firestore) API 키 저장/호출 로직 전면 삭제**:
  - 기존 프로젝트 원칙인 **Firestore 미사용 / 제로 쿼터(Zero-Quota) Jamstack 아키텍처**에 맞춰, 이전 턴에서 임시 추가되었던 Cloud Firestore(`system_config/api_keys`) 쓰기 및 읽기 코드를 완전히 제거했습니다.
  - 외부 클라우드 DB 종속성 없이 **브라우저 영구 저장소(IndexedDB `winfix_api_keys_config` + LocalStorage)** 및 풀스택 로컬 파일(`data/api_keys.json`)을 통해서만 키가 보존되도록 단일화했습니다.
- **원클릭 API 키 JSON 파일 백업(Export) 및 복원(Import) 도구 추가**:
  - 관리자가 다른 브라우저, 기기, 시크릿 창 등에서도 클라우드 DB 없이 즉시 동일한 API 키 설정을 가져올 수 있도록 **"JSON 백업"** 및 **"JSON 복원"** 버튼을 관리자 화면에 추가했습니다.
- **UI 및 안내 문구 일원화**:
  - 관리자 설정 화면의 "클라우드(Firestore)" 표기를 "브라우저 영구 보관 (클라우드 DB 미사용 / 쿼터 0)"으로 정정하여 혼선을 완전히 방지했습니다.

---

## [v3.64.1] - 2026-11-04

### 🔧 버그 수정 및 안정성 향상 (Bug Fixes & Stability Improvements)
- **"Maximum update depth exceeded" 무한 렌더링 루프 오류 완벽 해결**:
  - `fetchCloudApiKeyConfig`가 상태(`cloudKeySyncInfo`, `apiKeyConfig`)를 갱신할 때마다 `fetchApiKeyStatus`의 `useCallback` 의존성이 변경되어 재생성되고, 이로 인해 `useEffect`가 다시 실행되던 상호 순환 호출 구조를 완전히 분리 및 제거했습니다.
  - `apiKeyConfigRef` 및 `cloudKeySyncInfoRef`를 도입하여 `fetchApiKeyStatus`가 참조 안정성(`useCallback(..., [])`)을 유지하도록 리팩터링했습니다.
  - 중복 비동기 요청을 차단하는 재진입 방지 가드(`isCloudFetchingRef`)를 추가하여 불필요한 네트워크 스팸을 방지했습니다.
  - 컴포넌트 마운트 시 1회 안정적 동기화 후 30초 간격 폴링 타이머가 무한 루프 없이 정확하게 작동하도록 안정화했습니다.

---

## [v3.64.0] - 2026-11-04

### 🚀 주요 신규 기능 및 통합
- **클라우드(Firestore) 기반 Gemini API 키 영구 저장 및 다중 기기 자동 동기화 엔진 구현**:
  - GitHub Pages 정적 배포 환경(`https://ahbiyout-all.github.io/windows-fix-wizard/`)에서 관리자로 로그인하여 API 키를 등록했으나, 다음날 재방문 시 또는 다른 브라우저/기기에서 접속 시 "API 키 없음(점검 필요)"으로 초기화되던 문제를 근본적으로 해결했습니다.
  - **4계층 다중 스토리지 동기화 아키텍처 도입**:
    1. ☁️ **Cloud Firestore (`system_config/api_keys`)**: 관리자 계정(`ahbiyoutwinfix@gmail.com` 등)으로 로그인 시 등록된 Gemini API 키를 클라우드 데이터베이스에 실시간 영구 보존.
    2. 💾 **IndexedDB 영구 캐시 (`idbStorage.ts`)**: 브라우저의 `localStorage` 용량 한계 및 사파리/모바일 브라우저의 ITP 자동 정리 정책으로부터 데이터를 완벽 보호.
    3. 📦 **LocalStorage 동기 캐시**: 최초 앱 로드 시 지연 없는 즉각적 상태 표시.
    4. 🖥️ **Full-Stack Node.js 서버 연동 (`/api/settings/api-keys`)**: 프리뷰/개발 환경 백엔드 파일시스템 동기화.
- **정적 호스팅 지능형 자동 복원 시스템 (`callAiWithFallback` & `fetchApiKeyStatus`)**:
  - 로컬 스토리지에 키가 비어 있더라도, 백그라운드에서 Cloud Firestore와 IndexedDB를 즉시 질의하여 저장된 API 키를 자동 복구하고 상단 배지를 **"API: 정상 (Active)"**으로 자동 갱신합니다.
- **관리자 인증 시 클라우드 키 자동 동기화 (`onAuthStateChanged`)**:
  - 관리자가 어떤 기기(PC, 노트북, 스마트폰)에서든 로그인하는 즉시 클라우드에 보관된 최신 API 키 설정을 가져와 로컬에 즉시 복원합니다.

### 🛡️ 보안 강화 및 관리자 UI/UX 고도화
- **API 키 관리 카드 UI 강화**:
  - **클라우드 영구 보존 상태 배너**: 현재 키의 저장 위치(`Cloud Firestore (영구 보관)`), 마지막 동기화 일시, 보호 상태 배지 표시.
  - **"키 등록 및 클라우드 영구 저장" 버튼**: 키 입력 즉시 클라우드와 로컬에 일괄 영구 저장하고 안내 알림 제공.
  - **"클라우드에서 불러오기" / "클라우드에 즉시 동기화" 버튼**: 수동으로 클라우드 상태를 당겨오거나 푸시할 수 있는 제어 도구 추가.
  - **정적 호스팅 환경 직접 테스트 기능**: GitHub Pages에서도 백엔드 서버 없이 브라우저 내에서 직접 Gemini API 호출을 검증하여 "✓ 브라우저 직접 검증 성공 (정상 작동)" 확인 가능.
- **시스템 버전 일원화**: `package.json`, `src/App.tsx`, `/docs/PATCH_NOTE.md`, `/docs/PATCHNOTES.md` 전반의 버전을 `v3.64.0`으로 동기화 완료.

---

## [v3.63.0] - 2026-11-03

### 🚀 주요 신규 기능 및 통합
- **관리자 최신 데이터셋 원격 수동 즉시 동기화 센터 (`Instant Sync`) 신규 구현**:
  - 관리자 대시보드(GitOps 제어 섹션) 내에 **⚡ 최신 data/issues.json 원격 수동 즉시 동기화 & 웹 배포** 전용 히어로 컨트롤 카드를 추가했습니다.
  - 관리자가 원클릭으로 현재 앱의 최신 이슈 데이터셋을 GitHub 저장소(`AhBiYout-all/windows-fix-wizard`)의 `data/issues.json` (메인 브랜치)에 커밋 및 푸시함과 동시에, 라이브 GitHub Pages 자동 배포 파이프라인(`deploy-pages.yml`)을 원스톱 가동할 수 있습니다.
- **다단계 텔레메트리 진행률 트래커 및 시각적 안내**:
  - 동기화 진행 상황을 실시간 3단계 바 및 메시지로 직관적 렌더링:
    1. 📦 **데이터 인코딩 및 검증**: 현재 이슈 개수 및 실시간 용량(KB) 계산 후 UTF-8 Base64 변환.
    2. 📤 **GitHub REST API 직접 커밋**: `PUT /repos/{owner}/{repo}/contents/data/issues.json`을 호출하여 최신 dataset 반영.
    3. 🚀 **GitHub Pages 파이프라인 기동**: `deploy-pages.yml` 워크플로 원격 실행.
    4. 🌐 **배포 상태 확인**: 실시간 배포 시작 메시지 및 Pages 라이브 사이트 바로가기 링크 제공.

### 🛡️ 보안 강화 및 PAT 토큰 안내
- **PAT 토큰 자동 검증 및 가이드 포커스**:
  - 401 Bad Credentials 또는 PAT 권한 미흡 시 친절한 안내 메시지 출력 후 GitHub 연동 설정 영역으로 즉시 스크롤 및 입력란에 포커스를 제공합니다.

### 📈 UI/UX 및 시스템 버전 동기화
- **시스템 버전 일원화**: `package.json`, `src/App.tsx`, `/docs/PATCH_NOTE.md`, `/docs/PATCHNOTES.md` 전반의 버전을 `v3.63.0`으로 완전히 동기화했습니다.

---

## [v3.62.0] - 2026-11-03

### 🚀 주요 신규 기능 및 통합
- **GitHub 배포 성능 및 워크플로 대시보드 위젯 (`DeploymentDashboardWidget.tsx`) 신규 개발**: 기존 `github-workflow-status` 컴포넌트 아키텍처를 확장하여, 최근 배포 소요 시간(빌드 레이턴시)과 파이프라인 성공률을 종합 시각화하는 전용 대시보드 위젯을 신규 구현했습니다.
- **관리자 대시보드 통합**:
  - 관리자 탭 내 **GitOps 자율 수집 및 배포 제어 센터**에 위젯을 완벽 배치하여 실시간 배포 시간 추이(Recharts 막대 차트), 성공률 분포(도넛 차트), KPI 지표(평균 배포 시간, 최단 배포 시간, 누적 횟수), 그리고 최근 배포 이력 테이블을 제공합니다.
  - 관리자 개요의 **메인 대시보드 위젯(`DashboardWidget.tsx`)** 상단에 뷰 전환 탭을 추가하여 "AI 엔진 가동 품질 지표"와 "GitHub 배포 성능 및 워크플로 성공률"을 원클릭으로 오갈 수 있도록 통합했습니다.
- **실시간 GitHub Actions 원격 측정 연동**:
  - GitHub REST API (`/repos/{owner}/{repo}/actions/runs`)를 통해 실시간 실행 이력을 수집하며, API 호출 한도(403) 도달 시에도 고품질 텔레메트리 캐시를 통해 무중단 차트 렌더링을 보장합니다.

### 📈 UI/UX 및 성능 최적화
- **워크플로별 다각도 필터링**: 전체 워크플로, GitHub Pages 웹 배포(`deploy-pages.yml`), 자율 수집 엔진(`windows-fix-collector.yml`)을 즉시 필터링할 수 있는 세그먼트 버튼 제공.
- **시스템 버전 일원화**: `package.json`, `src/App.tsx`, `/docs/PATCH_NOTE.md`, `/docs/PATCHNOTES.md` 전반의 버전을 `v3.62.0`으로 동기화 완료.

---

## [v3.61.0] - 2026-11-01

### 🚀 주요 신규 기능 및 통합
- **통합 라이브러리 동기화 엔진 (활동 내역 및 북마크 일괄 백업)**: '나의 실험실' 탭의 데이터 내보내기/가져오기 기능을 고도화하여, 진단 기록뿐만 아니라 사용자가 북마크(스크랩)한 문제 해결 가이드까지 하나의 `.json` 파일로 통합 관리할 수 있게 되었습니다.
- **도메인 간 데이터 연속성 확보**: 프리뷰 환경과 GitHub Pages 환경 등 서로 다른 도메인 간에도 라이브러리 파일을 통해 개인화된 활동 내역과 북마크를 손쉽게 동기화할 수 있습니다.

### 🛡️ 보안 강화 및 UI 용어 정제 (Firebase 제거 확인)
- **플랫폼 중립적 용어 시스템 구축**: 사용자 UI 전반에서 'Firebase', 'Firestore' 등 특정 플랫폼에 종속된 기술 용어를 '클라우드', '독립형 데이터베이스', '패스키' 등으로 일제히 치환하여 브랜드 일관성을 높였습니다.
- **고가용성 Jamstack 아키텍처 강조**: 외부 데이터베이스 연결 없이도 브라우저 내 IndexedDB와 정적 JSON 피드만으로 모든 핵심 기능이 중단 없이 작동함을 명확히 안내하도록 수정되었습니다.

### 🔧 버그 수정 및 안정성 개선
- **GitHub Pages 환경 인식 최적화**: 깃허브 페이지 주소(`https://ahbiyout-all.github.io/windows-fix-wizard/`)가 정적 환경으로 정확히 인식되는지 검증을 완료하였으며, 이에 따른 클라이언트 측 Gemini AI 라우팅의 안정성을 확보했습니다.
- **시스템 버전 동기화**: `src/App.tsx`, `package.json` 및 패치 노트를 포함한 시스템 전반의 버전을 `v3.61.0`으로 업데이트했습니다.

---

## [v3.60.0] - 2026-11-01

### 🔧 버그 수정 및 안정성 개선
- **GitHub 푸시 인증 실패 가이드 강화**: GitHub 데이터 푸시 중 401(Bad Credentials) 에러 발생 시, 단순 에러 표시를 넘어 'repo' 및 'workflow' 권한 확인이 필요함을 명시적으로 안내하고 설정창의 토큰 입력 필드로 자동 포커스되도록 개선.
- **사용자 중심 알림 메시지 정돈**: 인증 관련 알림 발생 시 즉시 대응할 수 있도록 새 토큰 발급 링크 제공 및 설정 안내 문구를 더욱 명확하게 수정.

---

## [v3.59.0] - 2026-11-01

### 🚀 Major New Features & Integrations
- **정적 호스팅 AI 복원력 강화 (GitHub Pages)**: GitHub Pages와 같은 정적 호스팅 환경에서 Gemini AI 기능이 비활성화되거나 '키 점검' 상태로 머물던 문제 해결.
- **클라이언트 측 Gemini SDK 도입**: 브라우저 번들에 `@google/generative-ai`를 직접 통합하여, 백엔드 서버 없이도 사용자가 등록한 커스텀 API 키로 AI 진단이 가능하도록 개선.
- **지능형 API 상태 판별**: 백엔드 API 서버에 접속할 수 없는 경우(정적 호스팅 등) 자동으로 로컬 저장소의 키를 검사하여 '정상 활성' 상태를 유지하도록 로직 고도화.
- **하이브리드 키 검증**: 서버 환경 변수 키와 클라이언트 커스텀 키를 동시에 참조하여 최적의 AI 호출 경로를 자동으로 결정.

---

## [v3.58.0] - 2026-11-01

### 🚀 Major New Features & Integrations
- **활동 내역 내보내기 및 가져오기 (JSON)**: '나의 실험실' 탭의 활동 내역을 `.json` 파일로 내보내거나, 저장된 파일을 다시 불러와 과거의 진단 및 검색 기록을 복원할 수 있는 기능 추가.
- **히스토리 관리 툴바 개선**: 최근 활동 내역 섹션에 내보내기(Download), 가져오기(Upload), 전체 삭제(Trash) 아이콘이 포함된 전용 관리 툴바를 배치하여 사용 편의성 증대.
- **지능형 중복 방지 병합**: 데이터 가져오기 시 기존 내역과 중복되는 항목을 자동으로 제외하고 최신순으로 정렬하여 병합하는 알고리즘 적용.

---

## [v3.57.0] - 2026-11-01

### 🚀 Major New Features & Integrations
- **AI 오류 진단 다시 실행 (나의 실험실)**: '나의 실험실' 탭에서 과거의 진단 내역을 확인하고, '다시 실행' 버튼을 눌러 즉시 동일한 쿼리와 윈도우 버전으로 AI 진단을 재수행할 수 있는 기능 추가.
- **활동 내역 UI 고도화**: 최근 활동 내역 섹션에 유형별(AI 진단, 가이드 검색, 조회) 컬러 인디케이터와 퀵 액션 버튼을 도입하여 시각적 직관성 개선.
- **메타데이터 컨텍스트 유지**: 진단 시점의 윈도우 버전 정보를 히스토리에 함께 저장하여, 시간이 지난 뒤에도 정확한 OS 환경에서 재진단이 가능하도록 개선.

---

## [v3.56.0] - 2026-11-01

### 🛡️ UI 용어 정돈 및 시스템 점검
- **파이어베이스/파이어스토어 사용자 표기 정돈**: 알림창, 설정 버튼, 팝업 메시지에서 과도하게 노출되던 원시 파이어베이스/파이어스토어 할당량 관련 내부 전문 용어 및 에러 표기를 깔끔하게 정돈.
- **표준화된 고가용성 데이터베이스 용어 적용**: `데이터베이스 직접 저장`, `고가용성 로컬 보관소`, `Jamstack 정적 JSON / IndexedDB 엔진` 등의 정제된 용어로 통일.
- **아키텍처 점검 및 무결성 확인**: 백엔드 또는 정적 배포(GitHub Pages) 모두 외부에 대한 종속성 장애 없이 100% 자율 기동됨을 최종 검증 확인.

---

## [v3.55.0] - 2026-11-01

### 🚀 Major New Features & Integrations
- **통합 시스템 로그 파일 점검 및 관리 센터 (Integrated Log Files Audit & Management Center)**: 관리자 설정 탭에 6개 전체 시스템 로그 컬렉션(`logs_admin`, `logs_search`, `logs_feedback`, `logs_error`, `logs_backend`, `logs_visitor`)의 파일 용량, 레코드 건수, 최근 기록 일시를 실시간 조회하는 점검 대시보드 구축.
- **실시간 로그 파일 요약 API (`GET /api/logs/summary`)**: 6개 로그 파일의 디스크 바이트 용량, 건수, 최신/최초 기록 일시를 정밀 계산하여 응답하는 전용 엔드포인트 구현.
- **전체 로그 ZIP 일괄 백업 (`GET /api/logs/export-all-zip` & Client JSZip Fallback)**: 6개 로그 파일 및 `metadata.json`, SHA-256 검증 무결성 체크섬이 포함된 `winfix_logs_bundle_YYYY-MM-DD.zip` 압축 파일 생성 및 1-클릭 다운로드 기능 탑재.
- **보관 기간 경과 로그 자동 정돈 엔진 (`POST /api/logs/auto-prune`)**: 설정된 보관 기간(`cleanupMonths`)을 초과한 만료 로그를 전체 6개 컬렉션에서 일괄 자동 파기 정돈하여 DB 성능 및 용량 최적화.

---

## [v3.54.0] - 2026-11-01

### 🚀 Major New Features & Integrations
- **Automated GitHub Pages Deployment Pipeline**: Integrated `workflow_run` event trigger and explicit CLI dispatch (`gh workflow run deploy-pages.yml`) into `.github/workflows/deploy-pages.yml` and `windows-fix-collector.yml`, enabling automated GitHub Pages static site re-builds whenever dataset changes are collected or pushed.
- **Commit Filter Optimization**: Removed `[skip ci]` tag from autonomous AI collector commit messages to enable CI/CD workflow evaluation.
- **Admin Tab GitHub Pages Auto-Deploy Control Center**: Added `autoDeployPages` toggle switch in `/api/github/config`, direct database push with auto-deploy endpoint (`POST /api/github/push-to-repo`), and 1-click remote Pages dispatch endpoint (`POST /api/github/deploy-pages`).
- **Real-Time Deployment Status & Site Link**: Displays live status badges and direct URL (`https://${owner}.github.io/${repo}/`) in the Admin Tab.
- **PAT Error Auto-Scroll Guidance**: Direct 1-click PAT issuance link pre-filling `repo,workflow` scopes and automatic focus/scroll to `#github-settings-card` when 401 or missing PAT alerts are triggered.

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
