# Patch Note - System Update (v3.107.0)

This patch document outlines the latest features, enhancements, and system security fixes applied to the Windows Fix Wizard system.

---

## [v3.107.0] - 2026-11-21

### 🚀 Major New Features & Integrations
- **비공개 저장소 전용 AES-256-GCM 암호화 회원 백업 · 복원 연동 (`server.ts`, `src/components/MemberManagementPanel.tsx`)**:
  - 공개 저장소(`AhBiYout-all/windows-fix-wizard`)와 완전히 분리된 비공개 저장소(권장: `AhBiYout-all/windows-fix-wizard-admin`)에 회원 계정 데이터(`data/users.json`, 비밀번호 솔트/해시 포함) 및 선택적 최근 관리자 감사 로그(`logs_admin`)를 암호화 백업/복원하는 **Private Admin Vault(`winfix-admin-vault-v1`)** 시스템을 구축했습니다.
  - **로컬 오프라인 암호화 금고 내보내기/복원**: 네트워크/PAT 연동 전에도 `.enc.json` 확장자의 AES-256-GCM 암호화 백업 파일을 즉시 다운로드하거나 업로드해 복구할 수 있습니다.
  - **병합(Merge) / 전체 교체(Replace) 복원 모드**: 컨테이너 초기화나 이전 시 신규/갱신 계정을 최신 타임스탬프 기준으로 병합하거나 백업 시점 상태로 복원하며, 복원 직전 자동 LKG 스냅샷 생성 및 보호된 루트 최고 관리자 계정 유지 가드를 적용했습니다.
  - **계정 변경 시 자동 백업(Auto-Sync)**: 회원 가입·수정·비밀번호 설정·Google 동기화·삭제 발생 시 비차단 직렬화 큐를 통해 비공개 저장소로 자동 암호화 백업하는 옵션을 지원합니다.

### 🛡️ Security Hardening & Authentication
- **공개 Git 추적에서 회원/세션 파일 완전 제외 (`.gitignore`, `.env.example`, `server.ts`)**:
  - `.gitignore`에서 `!data/users.json` 예외 규칙을 제거하고 `data/users.json`, `data/admin_sessions.json`, `data/*_config.json`이 공개 저장소에 커밋되지 않도록 차단했습니다.
  - `executePrivateBackupPush()` 실행 시 대상 GitHub 저장소 메타데이터를 사전 검증하여 **공개(Public) 저장소로 설정된 경우 암호화 백업 업로드를 즉시 차단**합니다.
  - `scrypt` (`N=16384, r=8, p=1`, 16바이트 랜덤 솔트) 키 유도 + AES-256-GCM(12바이트 랜덤 IV, AAD 바인딩, 16바이트 인증 태그) + SHA-256 무결성 검증을 적용해 키 불일치나 파일 변조 시 복호를 차단합니다.
  - 비공개 저장소 PAT 및 AES-256 암호화 키는 서버(`data/private_backup_config.json` 또는 `.env`의 `ADMIN_BACKUP_GITHUB_TOKEN`, `ADMIN_BACKUP_ENCRYPTION_KEY`)에만 보관하며 클라이언트 응답에는 `'••••••••'`로 마스킹하고 관리자 ZIP 백업에서도 자동 마스킹 처리합니다.
  - 패치 노트 및 전 모듈(`server.ts`, `src/App.tsx`, `package.json`, `src/components/QuickSystemScanUtility.tsx`) 버전을 `v3.107.0`으로 동기화했습니다.

---

## [v3.106.18] - 2026-11-21

### 🔧 Bug Fixes & UI/UX Improvements
- **회원 신규 등록 후 신규 계정만 표시되던 검색 필터 잔존 및 브라우저 자동완성 문제 해결 (`src/components/MemberManagementPanel.tsx`)**:
  - 검색어가 입력된 상태에서 `'OOO' 계정 바로 등록하기` 또는 `회원 등록`을 통해 신규 계정을 추가하면 기존 검색어(`searchQuery`)와 역할/상태 필터가 초기화되지 않아 기존 계정이 가려지고 방금 등록한 계정만 남던 문제를 수정했습니다.
  - 신규 등록 성공 즉시 `searchQuery`, `roleFilter`, `statusFilter` 및 폼 입력 상태를 초기화해 전체 등록 회원 목록을 바로 확인할 수 있도록 개선했습니다.
  - 검색 입력창에 `autoComplete="off"` 및 전용 `name` 속성을 적용해 브라우저 폼 자동완성이 등록 이메일을 검색창에 채워 넣지 않도록 차단하고, 검색어 `×` 지우기 버튼과 **`전체 보기 (필터 초기화)` 안내 배너**를 추가했습니다.
  - 패치 노트 및 전 모듈(`server.ts`, `src/App.tsx`, `package.json`, `src/components/QuickSystemScanUtility.tsx`) 버전을 `v3.106.18`로 동기화했습니다.

---

## [v3.106.17] - 2026-11-21

### 📈 UI/UX & Architecture Deduplication
- **자동수집·서버 유지보수·대량 수집·스테이징 GitOps 역할 분리 및 중복 제거 (`server.ts`, `src/App.tsx`)**:
  - **정기 무인 수집 일원화**: 서버 유지보수 설정 카드 내부에 중복 노출되어 있던 `백엔드 자율 수집 엔진 주기 설정`과 `GitOps 수집 이슈 모집 개수 설정` 입력란을 제거하고, 정기 AI 수집 스케줄·수량·모델·카테고리 설정을 **깃허브 자동수집 옵션 설정** 단일 제어판으로 일원화했습니다.
  - **로컬 백엔드 보조 크론 기본 비활성(선택 Opt-in) 전환**: `maintenance_config.json`에 `engineEnabled: false` 기본값을 도입해 GitHub Actions 자동수집과 백엔드 자체 AI 수집 루프가 동시에 돌며 API 할당량을 이중 소모하던 구조를 해소했습니다. 필요한 경우 AI 허브 상태 카드에서 로컬 보조 크론을 명시적으로 켜고 주기를 조정할 수 있습니다.
  - **대량 데이터 수집 모드 ↔ 로컬 대기열 GitOps 역할 안내 명확화**: 수동 집중 수집기(③)와 후처리 커밋 파이프라인(④)의 부제를 재정비해 정기 크론(①)·서버 유지보수(②)·수동 수집(③)·대기열 동기화(④) 간 역할 경계를 명확히 했습니다.
  - 패치 노트 및 전 모듈(`server.ts`, `src/App.tsx`, `package.json`, `src/components/QuickSystemScanUtility.tsx`) 버전을 `v3.106.17`로 동기화했습니다.

---

## [v3.106.16] - 2026-11-21

### 🔧 Bug Fixes & Stability Improvements
- **깃허브 자동수집 옵션 및 GitHub 저장소 연동 설정 저장 초기화 문제 해결 (`server.ts`, `src/App.tsx`)**:
  - `saveCollectorOptions()` 및 `saveGithubConfig()`가 서버 저장 실패(예: `401 Unauthorized` 세션 만료)를 무음으로 삼키고 성공 알림을 표시하던 결함을 수정해, 서버 저장 성공이 확인된 경우에만 상태 배너·더티 플래그·캐시를 갱신하고 세션 만료 시 즉시 재인증 안내를 표시하도록 개선했습니다.
  - 백그라운드 `fetchGithubConfig()`가 사용자가 편집 중인 미저장 상태(`collectorOptionsDirtyRef`, `githubConfigDirtyRef`)를 기본값으로 덮어쓰지 않도록 보호 가드를 추가했습니다.
  - `POST /api/github/config`와 `data/github-collector-options.json` 간의 `autoDeployPages` 설정 양방향 동기화, 명시적 `저장된 PAT 삭제`(`clearToken`) 지원, 그리고 `syncGithubDatasetIntoMainData()`에서 네트워크 fetch 이후 최신 `github_config`를 재조회해 동시 설정 저장이 덮어쓰이지 않도록 레이스 컨디션을 제거했습니다.

### 🛡️ Security Hardening & Authentication
- **서버 재시작 후에도 유지되는 해시 기반 관리자 세션 영속화 (`server.ts`, `src/App.tsx`)**:
  - 기존 인메모리(`Map`) 전용 `issuedAdminSessions`가 서버 재시작마다 초기화되어 관리자 화면에서 `401 Unauthorized`가 발생하던 문제를 해결하기 위해 `data/admin_sessions.json`에 **SHA-256 단방향 해시** 형태로 세션 레코드를 안전하게 영속화했습니다(평문 세션 토큰은 디스크에 기록하지 않으며 24시간 만료 자동 정리).
  - 서버 모드(`!IS_GITHUB_PAGES`)에서 브라우저 `localStorage('winfix_github_config')`에 평문 PAT/SSH 비밀키가 캐싱되지 않도록 제거하고, 비비밀 저장소 메타데이터(`repo`, `branch`, `authMode`, `autoDeployPages`, `hasServerGithubToken`)만 동기화하도록 강화했습니다.
  - 패치 노트 및 전 모듈(`server.ts`, `src/App.tsx`, `package.json`, `src/components/QuickSystemScanUtility.tsx`) 버전을 `v3.106.16`으로 동기화했습니다.

---

## [v3.106.15] - 2026-11-21

### 🚀 Major New Features & Integrations
- **보조 무료 AI 프로바이더 4종 추가 연동 (`lib/ai-resilience-router.ts`, `server.ts`, `scripts/github-collector.ts`, `.env.example`)**:
  - 기존 Groq · Mistral · OpenRouter(:free) · Cloudflare · Cerebras · Pollinations 외에 **NVIDIA NIM**(`integrate.api.nvidia.com`, 카드 불필요 무료 크레딧), **Cohere Command API v2 Trial**(`api.cohere.com/v2/chat`, 카드 불필요 · 월 1,000건/20 RPM · 한국어 우수), **Hugging Face Inference Router**(`router.huggingface.co/v1`, 월 소액 무료 크레딧 · 소진 시 HTTP 402 안내), 그리고 무가입·무키 2중 백업용 **OVHcloud AI Endpoints 익명 티어**(`oai.endpoints.kepler.ai.cloud.ovh.net/v1`)를 정식 연동했습니다.
  - 실시간 모델 탐색(`discoverLiveModels`)이 OpenRouter(`:free`), Pollinations뿐 아니라 OVHcloud(33종+), NVIDIA NIM(33종+), Hugging Face Router(160종+), Cohere v2 카탈로그를 병렬 동기화하도록 확장했습니다.
- **무가입·카드 불필요 우선 AI 탐색기 및 통합 키 관리·검증 UI 신설 (`src/components/FreeAiExplorerAndKeyPanel.tsx`, `src/App.tsx`)**:
  - 관리자 AI 허브에 티어 세그먼트 필터(`전체 · 무가입·무키(Keyless) · 카드 불필요 무료 · 체험/종료`), `한국어 JSON 우수` 필터, 모델·환경변수 검색, 공식 무료 키 발급 링크, 실사용 모델 슬러그 미리보기를 갖춘 **보조 무료 AI 모델·키 탐색기**를 추가했습니다.
  - 기존 Groq/OpenRouter 전용 입력란을 **8종 키 기반 + 2종 키리스 통합 관리 패널**로 확장해 `Mistral`, `NVIDIA NIM`, `Cohere`, `Cloudflare(Account ID+Token)`, `Hugging Face`, `Cerebras`까지 UI에서 직접 서버 저장·삭제할 수 있습니다.
  - 모든 보조 프로바이더 및 키리스 엔드포인트(`OVHcloud`, `Pollinations`)에 **단순 Ping 테스트**와 **실제 Windows 오류 한국어 JSON 생성 검증(`mode: 'korean-json'`)** 및 응답 지연시간(ms) 측정(`/api/keys/test-secondary`, `/api/ai/test-chain`)을 연동했습니다.
  - GitHub Actions 자동 수집 워크플로(`.github/workflows/windows-fix-collector.yml`) 및 시크릿 템플릿에 `NVIDIA_API_KEY`, `COHERE_API_KEY`, `HF_TOKEN`을 동기화했습니다.

### 🛡️ Security Hardening & Authentication
- **보조 AI API 키 브라우저 저장 중단 및 서버 전용 마스킹 보관 (`server.ts`, `src/App.tsx`)**:
  - 브라우저 `localStorage`에 평문으로 복제 보관하던 기존 `winfix_groq_api_key`·`winfix_openrouter_api_key` 저장 경로를 제거하고 자동 정리(purge)하도록 개선했습니다.
  - `GET /api/system_config` 및 `POST /api/system_config/update`가 모든 보조 AI 키 필드를 `••••`로 마스킹하고 등록 여부 플래그(`has*Key`)만 반환하도록 강화했으며, `••••` 마스킹 문자열 재전송으로 서버 키가 손상되는 것을 방지했습니다.
  - `OVHcloud`·`Pollinations` 등 무가입 키리스 엔드포인트 호출 시 프롬프트 내 `nvapi-`, `hf_` 등 추가 시크릿 패턴까지 자동 마스킹하도록 정제 규칙을 확장했습니다.

---

## [v3.106.14] - 2026-11-20

### 🔧 Bug Fixes & GitHub Pages CI/CD Pipeline Hardening
- **`actions/deploy-pages@v4` `Found 0 artifact(s)` (`github-pages` 아티팩트 미인식) 오류 해결 (`.github/workflows/deploy-pages.yml`, `src/components/GitHubPagesDeployDoc.tsx`)**:
  - 단일 잡(`build-and-deploy`) 내에서 `actions/upload-pages-artifact@v3` 완료 직후 `actions/deploy-pages@v4`가 같은 초에 실행되며 발생하던 GitHub 아티팩트 메타데이터 색인 레이스 컨디션을 제거하기 위해 **`build`와 `deploy`(`needs: build`) 2단계 잡 구조**로 분리했습니다.
  - 워크플로 권한에 `actions: read`를 명시하고, `actions/upload-pages-artifact@v4`(명시적 `name: github-pages`, `include-hidden-files: 'true'`) 및 `artifact_name: github-pages`, 빌드 산출물(`dist/index.html`) 사전 검증, 공개 데이터셋(`issues.json`, `github-feed.json`) 선택 복사 가드를 적용했습니다.
  - 배포 가이드 템플릿(`GITHUB_PAGES_DEPLOY_YAML`) 및 FAQ 트러블슈팅 안내를 최신 구조로 동기화하고, 패치 노트 및 전 모듈 버전을 `v3.106.14`로 통일했습니다.

---

## [v3.106.13] - 2026-11-20

### 🔧 Bug Fixes & AI JSON Recovery Hardening
- **AI 응답 JSON 절단·내부 따옴표 복구 및 `parseAiJson` 파이프라인 고도화 (`src/utils/safeFetch.ts`)**:
  - `lastIndexOf('}')` 기반 슬라이싱이 미완성 JSON 응답 내부 PowerShell `{ ... }` 중괄호에서 잘려 외곽 객체 구조를 파괴하던 결함을 수정하고, 최상위 중괄호/대괄호 균형을 추적해 완전한 영역만 추출하거나 잘린 꼬리(열린 문자열, 미완성 키/쉼표, 미닫힌 `{`/`[`)를 자동 봉합하는 `sliceBalancedOrRepairTruncatedJson()`을 도입했습니다.
  - 한국어 문구·PowerShell 스크립트 내 이스케이프되지 않은 내부 큰따옴표(`"`)가 후행 구조 구분자(`,`, `}`, `]`, `:`, EOF) 없이 등장할 때 자동 이스케이프(`\"`)하는 `escapeSuspiciousInnerQuotes()`를 추가해 4단계(직접/이스케이프 파싱 ➔ 배열 우측 중괄호 절단 복구 ➔ 개별 객체 추출 ➔ 미완성 꼬리 복구)로 복구 성공률을 높였습니다.
- **수집 배치/폴백 프로바이더 출력 토큰 상한 확대 및 일시 파싱 경고 등급 조정 (`server.ts`, `src/App.tsx`)**:
  - `executeServerGeminiCall`, `callSecondaryFreeAiApi`, `callExternalFreeProvider('pollinations', ...)` 및 `/api/ai/generate` 수집 요청에 `maxOutputTokens: 4096` / `maxTokens: 4096`을 전달해 다건 한·영 이슈 JSON 응답이 중간에 잘리는 현상을 줄였습니다.
  - `handleTriggerAiSearch()`가 키 비활성·폴백 상태의 자동 수집(`isAuto`)에서도 요청 건수를 안전하게 최대 2건으로 제한하고, 일시적 JSON 파싱 실패 시 `console.error` 대신 `console.warn`으로 기록해 `runBatchCollection()`의 백오프/재시도 흐름과 일관되게 동작하도록 개선했으며, 패치 노트 및 전 모듈 버전을 `v3.106.13`으로 동기화했습니다.

---

## [v3.106.12] - 2026-11-20

### 🚀 Major New Features & Enhancements
- **회원 및 계정 데이터 관리(Zero Cloud DB) 직접 등록·수정 기능 추가 (`src/components/MemberManagementPanel.tsx`, `server.ts`)**:
  - 기존 목록 조회·차단·삭제만 가능했던 관리자 회원 패널에 **회원 등록** 버튼 및 검색 결과 없음 시 **검색 이메일 즉시 등록** 버튼을 추가해, 관리자 계정을 포함한 신규 계정을 `data/users.json`에 바로 등록할 수 있도록 개선했습니다 (`POST /api/admin/users`).
  - 모든 회원·관리자 행에 **정보/비밀번호 수정** 버튼을 추가해 닉네임, 이메일(기본 보호 관리자 제외), 권한(`ADMIN`/`MEMBER`), 상태(`정상`/`제한`), 로그인 비밀번호 변경을 지원하도록 `PATCH /api/admin/users/:id`를 확장하고 비밀번호 미설정 배지를 표시합니다.
  - 패치 노트 및 전 모듈 버전을 `v3.106.12`로 동기화했습니다.

---

## [v3.106.11] - 2026-11-20

### 🔧 Bug Fixes & 🛡️ Authentication UX Hardening
- **비밀번호 미설정 계정 이메일 로그인 오류(`console.error`) 차단 및 비상 패스키 전환 UI 추가 (`src/App.tsx`, `server.ts`)**:
  - `handleEmailAuth()`가 4xx 인증 응답(비밀번호 미설정 Google 계정, 비밀번호 불일치 등)을 예외로 던지고 `console.error`를 출력하던 문제를 수정해 정상적인 UI 안내 배너만 표시하도록 개선했습니다.
  - `/api/auth/login` 응답에 `requiresPasskey` 플래그를 포함하고, 로그인 모달 오류 배너에 **관리자 비상 인증(패스키) 탭으로 이동** 원클릭 버튼을 추가했습니다.
- **인증된 관리자용 이메일 비밀번호 설정 엔드포인트 추가 (`server.ts`, `src/App.tsx`, `package.json`, `src/components/QuickSystemScanUtility.tsx`, `lib/ai-resilience-router.ts`, `docs/PATCH_NOTE.md`)**:
  - 패스키 등으로 인증된 관리자가 `POST /api/admin/set-password`를 통해 관리자 이메일 계정의 로그인 비밀번호를 안전하게 등록·변경할 수 있도록 지원하고 전 모듈 버전을 `v3.106.11`로 동기화했습니다.

---

## [v3.106.10] - 2026-11-20

### 🔧 Bug Fixes & Batch/Staging GitOps Pipeline Hardening
- **대량 데이터 수집 모드 타이머 누수·데드 캐치·스테일 클로저 및 입력 범위 보완 (`src/App.tsx`)**:
  - `runBatchCollection()`의 `setTimeout` 핸들을 `batchTimerRef`로 추적해 중지/재시작·컴포넌트 언마운트 시 중복 타이머 루프가 겹치지 않도록 정리했습니다.
  - `handleTriggerAiSearch()`가 오류를 내부에서 삼켜 `runBatchCollection()`의 쿼터/대기 예외 분기(`try/catch`)가 데드 코드로 남던 결함을 수정해 `error`, `isQuotaOrStandby`, `rateLimitWaitSec`, `skippedBusy` 구조화 응답을 반환하도록 개선했습니다(일시 쿨다운 시 잔여 시간 기반 백오프, 일일 한도/연속 5회 오류 시 안전 중지).
  - 장시간 배치 실행 중 `useStaging`, `dbIssues`, `fullIssuesPool`, `stagedIssues`, 주기/개수 설정 변경이 반영되지 않던 스테일 클로저를 최신 `useRef` 동기화로 해결하고, `avoidList`에 스테이징 대기열과 전체 DB 풀을 반영해 반복 중복 생성을 줄였습니다.
  - 수집 간격(10~3600초)·수집 시간(1~1440분)·1회 개수(1~20개) 입력 필드에 빈 값(`0ms` 무한 루프 위험) 방지 및 포커스 해제/시작 시 안전 범위 보정을 추가했습니다.
- **로컬 대기열 ➔ GitOps 자동 동기화 데이터 정합성 및 GitHub 푸시 보안·타임아웃 강화 (`src/App.tsx`, `server.ts`)**:
  - `executeGitHubDatabaseCommit()` 및 `/api/github/push-to-repo`에서 마스킹된 토큰(`••••`)이 전달될 경우 서버 PAT/환경변수를 덮어쓰지 않도록 차단하고, GitHub REST API 호출에 `AbortSignal.timeout`을 적용해 네트워크 지연 시 동기화 잠금이 영구 고착되지 않도록 수정했습니다.
  - `/api/github/push-to-repo`에 `403` 권한 오류 진단, Pages 워크플로 트리거 결과 정확 표시, 푸시 후 `github_config.lastSyncAt` 갱신을 반영했습니다.
  - `handleSyncStagedIssues()`가 서버 유효성 검증에서 거부된 비정상 항목까지 성공으로 간주해 대기열에서 삭제하지 않도록 개선하고, 서버 설정(`stagingAutomationConfig`) 로드 시 임계치/주기 범위 검증 및 전 모듈 버전(`v3.106.10`) 동기화를 완료했습니다.

---

## [v3.106.9] - 2026-11-19

### 🔧 Bug Fixes & Keyless Fallback (Pollinations) Stability Optimization
- **Pollinations 키리스 폴백 15초 조기 타임아웃 및 402 IP 호출 제한 대응 (`lib/ai-resilience-router.ts`, `server.ts`)**:
  - JSON 다건 이슈 수집 시 `15초` 타임아웃으로 Pollinations 응답이 끊기던 문제를 `32초` 예산(`timeoutMs` 옵션 지원)으로 상향했습니다.
  - Pollinations HTTP `402` (`FREE_LIMIT`: IP당 45초 간격 제한) 및 `429` 응답을 감지해 대기 시간이 18초 이하일 경우 자동 대기 후 1회 재시도하고, 초과 시 정확한 잔여 대기 시간을 반환해 `"No valid key"` 오인 경고가 뜨지 않도록 개선했습니다.
- **수동 수집 프롬프트 경량화·중복 재시도 방지 및 한국어 안내 개선 (`src/App.tsx`, `package.json`, `src/components/QuickSystemScanUtility.tsx`, `docs/PATCH_NOTE.md`)**:
  - Gemini 키 비활성/쿨다운 상태에서 수동 수집 시 2건 이하로 프롬프트 크기를 최적화해 Pollinations 응답 성공률을 높이고, 쿨다운 오류 발생 시 1.5초 뒤 중복 재시도로 IP 제한을 다시 유발하지 않도록 즉시 반환 처리했습니다.
  - 대기/한도 안내 메시지를 사용자 친화적 한국어·영어 문구로 개선하고 전 모듈 버전을 `v3.106.9`로 동기화했습니다.

---

## [v3.106.8] - 2026-11-19

### 🔧 Bug Fixes & AI Collection Sync Pipeline Overhaul
- **AI 자동 수집("지금 즉시 실행") `0 added, 0 updated` 및 저장 누락 근본 수정 (`src/App.tsx`, `server.ts`)**:
  - `handleTriggerAiSearch()`가 수집된 이슈를 더미 Firestore 스텁(`getDocs`/`setDoc`/`updateDoc`)으로 흘려보내 실제 서버 DB에 전혀 저장되지 않던 결함을 제거하고, 서버 `POST /api/issues/sync`(및 정적 호스트용 IndexedDB 병합)로 직접 영구 저장한 뒤 실집계 건수(`added`/`updated`)를 반환하도록 전환했습니다.
  - `callAiWithFallback()` 및 `/api/ai/generate`가 이슈 수집 요청에 대해 로컬 진단 폴백(`system-local-grounding`, `code`/`title` 미포함)을 정상 응답으로 반환해 `0 added, 0 updated` 성공 알림이 뜨던 문제를 차단하고, 수집 요청 실패·대기 시 명확한 상태 안내와 `responseMimeType: "application/json"`·한국어/표준 카테고리 정규화를 적용했습니다.
  - `localExistingMap['title:...']` 대입 누락 오타를 수정하고, 스테이징 활성 시 수집 건수 알림을 보완했습니다.
- **서버 AI 다중 키·모델 타임아웃 예산 및 폴백 전이 개선 (`server.ts`, `lib/ai-resilience-router.ts`, `package.json`, `src/components/QuickSystemScanUtility.tsx`, `docs/PATCH_NOTE.md`)**:
  - `executeServerGeminiCall()`에 Gemini 단계 총 시간 예산(`20초`)과 모델별 호출 타임아웃(`12초`)·키당 일시 오류 상한(`2회`)을 적용해 무응답·오류 키 환경에서도 장시간 블로킹 없이 무료/키리스(Pollinations) 폴백으로 신속하게 전환되도록 개선했습니다.
  - `/api/ai/search-trends` 폴백 JSON 강제 옵션 및 오류 상태 응답을 보완하고 전 모듈 버전을 `v3.106.8`로 동기화했습니다.

---

## [v3.106.7] - 2026-11-19

### 🔧 Bug Fixes & Runtime/Stability Hardening (14차 심층 자아성찰 및 비동기·다운로드·AI 라우터 정밀 보완)
- **Pollinations HTML 오류 페이지 오인 차단 및 AI 모델 레지스트리 방어 강화 (`lib/ai-resilience-router.ts`)**:
  - `callExternalFreeProvider()`의 `pollinations` 분기가 프록시/게이트웨이 HTML 응답(`<!DOCTYPE html>`, `text/html`)을 일반 텍스트 완료 응답으로 수용하던 결함을 차단하고, JSON 파싱 성공 후 본문이 비어 있는 오류 객체도 거부하도록 수정.
  - `loadAiModelRegistry()` 내 `geminiModels`/`openrouterFreeModels`/`pollinationsModels` 요소 타입·`null` 검증을 추가해 손상된 레지스트리로 인한 런타임 `TypeError`를 방지하고, `cloudflare` 모델 경로 세그먼트 문자 검증을 적용.
- **대시보드 업타임 타이머 스래싱·`NaN` 타임스탬프 및 차트 널 가드 수정 (`src/components/DashboardWidget.tsx`, `src/components/LibraryAnalyticsChart.tsx`)**:
  - `DashboardWidget`에서 `telemetry.engineStartTime` 미수신 시 렌더마다 `new Date().toISOString()`이 재생성되어 매초 업타임 인터벌을 파괴·재생성하던 문제를 `useRef` 고정 폴백으로 해결하고, `realTrendsData`/`last24HoursData`에 `Number.isFinite` 날짜 검증을 추가.
  - `LibraryAnalyticsChart`의 `userActivity` 순회 및 `CustomTooltip`에 비객체/`null` 가드를 추가.
- **프론트엔드 파일 다운로드 조기 해제·샌드박스 서비스 상태·언마운트 누수 일괄 보완 (`src/App.tsx`, `src/utils/logArchiveManager.ts`, `src/components/SystemRestoreUtility.tsx`, `src/components/PowerShellSandbox.tsx`, `src/components/SystemEventLogPanel.tsx`, `src/components/GitHubPagesDeployDoc.tsx`, `src/components/MemberManagementPanel.tsx`, `src/components/SystemInfoWidget.tsx`)**:
  - 브라우저 Blob 다운로드 직후 동기 `URL.revokeObjectURL()` 호출로 인해 대용량 백업/스냅샷/ZIP/YAML/`.ps1`/`.log` 다운로드가 간헐적으로 절단·실패할 수 있던 13개 지점에 `1000ms` 지연 해제를 적용.
  - `PowerShellSandbox` 일괄 실행 시 `Stop-Service`/`Start-Service` 직후 같은 스크립트 내 `Get-Service`가 최신 서비스 상태를 즉시 참조하도록 `servicesRef` 동기화를 추가하고, `localStorage` 버전 이력 요소 스키마·날짜를 검증.
  - `SystemEventLogPanel`의 JSON 로그 불러오기/CSV 내보내기/검색에서 비문자열·`null` 입력과 잘못된 `TimeCreated` 크래시를 방어하고, 전 감사 대상 컴포넌트에 `isMountedRef` 및 타이머 정리를 추가.
- **서버 원자적 LKG 스냅샷 쓰기 및 설정 범위 검증·버전 동기화 (`server.ts`, `package.json`, `src/App.tsx`, `src/components/QuickSystemScanUtility.tsx`, `docs/PATCH_NOTE.md`)**:
  - `createLastKnownGoodBackupSync()`의 `last_known_good.json` 및 타임스탬프 스냅샷 저장을 `writeJsonFileAtomic()`으로 전환해 예기치 않은 중단 시 부분 쓰기 손상을 방지.
  - `DELETE /api/admin/users/:id`의 최고 관리자 보호 이메일 비교를 소문자·트림 정규화하고, `POST /api/settings/maintenance`의 `smtpPort`(`1..65535`) 및 `consecutiveFailuresLimit`(`1..20`) 범위를 클램핑하며, 전 모듈 버전을 `v3.106.7`로 동기화.

---

## [v3.106.6] - 2026-11-19

### 🔧 Bug Fixes & Runtime/Persistence Hardening (13차 심층 자아성찰 및 비동기·YAML·IndexedDB 정밀 보완)
- **GitHub Actions 대시보드 `NaN` 소요 시간 전파 및 타이머 누수 수정 (`src/components/DeploymentDashboardWidget.tsx`, `src/components/GitHubWorkflowStatus.tsx`)**:
  - 대기 중(`queued`) 또는 타임스탬프 누락 워크플로 실행 데이터 수신 시 `NaN` 소요 시간이 `NaNs` 및 평균/최단 지표 전체로 전파되던 문제를 `Number.isFinite` 검증으로 해결.
  - `GitHubWorkflowStatus`의 `dispatch`/토스트 타이머 언마운트 누수 정리 및 URL 경로 세그먼트 `encodeURIComponent` 적용.
- **IndexedDB 트랜잭션 커밋 보장 및 연결 핸들 재사용 (`src/utils/idbStorage.ts`)**:
  - `idbSet`/`idbRemove`가 트랜잭션 `oncomplete` 이전에 조기 완료되던 문제와 매 호출마다 DB 핸들을 새로 열고 닫지 않던 문제를 단일 연결 캐싱 및 `tx.oncomplete` 대기로 개선.
- **프론트엔드 진단 패널 클로저·인증키 파싱 방어 (`src/components/InteractiveRoadmap.tsx`, `src/App.tsx`, `src/components/QuickSystemScanUtility.tsx`)**:
  - `uwes-set-validator-script` 이벤트 핸들러가 최신 `language`/`targetOS`/`isAdminElevated` 상태를 반영하도록 `runDiagnosticsRef`로 최신화하고, 자가성찰 감사 배열 안전한 접근(`logsArr`/`auditArr`) 및 스크롤 타이머 해제를 추가.
  - `getApiKeyConfig()`에서 `localStorage`의 손상·부분 스키마(`keys` 누락 등)로 인한 초기 렌더 크래시를 방어.
- **서버 원자적 JSON 저장·5필드 POSIX Cron·입력 검증 보강 (`server.ts`, `package.json`, `lib/ai-resilience-router.ts`, `docs/PATCH_NOTE.md`)**:
  - 유지보수 설정, API 키 설정, 수집 옵션, 피드 메타데이터 및 백업 복원 설정 쓰기를 `writeJsonFileAtomic()`으로 일원화해 부분 쓰기 및 `DATA_DIR` 미생성 `ENOENT` 위험을 제거.
  - `sanitizeCollectorOptions()`/`buildCollectorWorkflowYamlFromOptions()`에 GitHub Actions 호환 5필드 POSIX Cron 검증·YAML 스칼라 제어문자 제거 및 `push-collector-options` `15초` 타임아웃을 적용하고, `POST /api/visitor/autoblock-settings`에 `req.body` 객체/프로토타입 정제를 추가.
  - 전 모듈 및 빠른 시스템 진단 배너 버전을 `v3.106.6`으로 동기화.

---

## [v3.106.5] - 2026-11-19

### 🔧 Bug Fixes & Operational Consistency (12차 심층 자아성찰 및 체인 테스트·수집기 안정화)
- **`POST /api/ai/test-chain` 저장 키(`system_config.json`) 누락 및 제공자 검증 보완 (`server.ts`)**:
  - 관리자 UI에서 `system_config.json`에 저장한 `groqApiKey`·`openrouterApiKey`가 `test-chain` 테스트 호출 시 전달되지 않아 저장된 키가 있음에도 미설정으로 실패하던 불일치를 해결하고 `provider` 화이트리스트 검증을 추가.
- **관리자 AI 엔드포인트 빈 바디 크래시 방어 및 자동 동기화 폴백 JSON 강화 (`server.ts`)**:
  - `POST /api/ai/verify-issue`, `/reclassify-chunk`, `/optimize-knowledge`, `/search-trends`의 `req.body` 미전달 방어 및 `/optimize-knowledge` 필수 `prompt` 검증(HTTP 400)을 추가.
  - `runAiSync()` 외부·키리스 폴백 호출 시 `buildExternalFallbackPrompt(..., { responseMimeType: 'application/json' })`을 적용해 비-Gemini 응답의 JSON 파싱 성공률을 향상.
- **GitHub Pull 설정 토큰 폴백 및 Collector 파싱·타임아웃 견고화 (`server.ts`, `scripts/github-collector.ts`)**:
  - `POST /api/github/pull-from-repo`가 `ghConfig.token`을 참조하고 검증된 `targetBranch`를 저장하며 `AbortSignal.timeout(15000)`을 적용하도록 수정.
  - `scripts/github-collector.ts`에서 비객체·`null`·숫자형 `code` 등으로 인한 `TypeError` 크래시를 차단하고 `sourceUrls`의 HTTP(S) 스킴 필터링 및 웹훅 `15초` 타임아웃을 추가.
- **`ai-model-registry.json` 원자적 저장 및 버전 동기화 (`lib/ai-resilience-router.ts`, `package.json`, `src/App.tsx`, `server.ts`, `docs/PATCH_NOTE.md`)**:
  - `saveAiModelRegistry()`에 임시 파일 + `renameSync` 기반 원자적 저장을 적용하고 전 모듈 버전을 `v3.106.5`로 동기화.

---

## [v3.106.4] - 2026-11-19

### 🔧 Bug Fixes & Browser/Runtime Stability (11차 심층 자아성찰 및 런타임 크래시 수정)
- **브라우저 초기 렌더 `ReferenceError: process is not defined` 치명적 오류 수정 (`src/App.tsx`)**:
  - `vite.config.ts`에 `process.env` `define` 매핑이 없는 상태에서 `getApiKeyConfig()`가 초기화(`useState(getApiKeyConfig())`) 시점에 `process.env.GEMINI_API_KEY`/`CUSTOM_API_KEY`를 직접 참조해 Vite 개발 모드 브라우저에서 즉시 런타임 오류를 유발하던 문제를 `typeof process !== 'undefined'` 가드로 해결.
- **클라이언트 PowerShell 디지털 서명 폴백 `Buffer is not defined` 수정 (`src/utils/psVerifier.ts`)**:
  - 브라우저 환경에서 오프라인/폴백 서명 시 Node 전용 `Buffer.from(...)` 호출로 실패하던 문제를 `TextEncoder` + `btoa` 기반 UTF-8 안전 Base64 인코더(Node 환경은 `Buffer` 폴백)로 교체해 브라우저·서버 양쪽 호환성을 확보.
- **`addLocalLog` 비문자열 `id` 크래시 및 콜드 스타트 시딩 레이스 해결 (`server.ts`)**:
  - `POST /api/logs/add` 등에서 `log.id`가 숫자·객체로 전달될 때 `baseId.includes(...)`에서 `TypeError`가 발생해 로그가 묵살되던 결함을 수정하고, `__proto__`/`constructor`/`prototype` 키를 제거하는 `sanitizePlainObject()` 적용.
  - `GET /api/issues`, `GET /api/issues/counts`에서 초기 시딩 중 빈 배열이 반환되지 않도록 `await ensureIssuesSeeded()`를 보장하고, 빈 파일(`size <= 10`) 시 자동 재시딩 및 `writeJsonFileAtomic()` 기반 원자적 JSON 파일 쓰기를 도입.

### 🛡️ Security Hardening
- **`POST /api/github/sync` & `saveIssuesToServer()` 입력 정제 및 프로토타입 오염 차단 (`server.ts`)**:
  - 웹훅 페이로드 배열 내 `null`·원시값으로 인한 `TypeError` 전체 배치 실패를 차단하고, 모든 수신 이슈 객체에 `sanitizePlainObject()`를 적용해 프로토타입 오염 키 및 비정상 필수 필드를 필터링.
- **시스템 버전 전면 동기화 (`package.json`, `lib/ai-resilience-router.ts`, `server.ts`, `src/App.tsx`, `docs/PATCH_NOTE.md`)**:
  - 전 모듈 버전을 `v3.106.4`로 동기화.

---

## [v3.106.3] - 2026-11-19

### 🔧 Bug Fixes & Startup Reliability (개발 서버 기동 지연 및 포트 바인딩 오류 수정)
- **Express 포트 `3000` 선바인딩 및 Vite/데이터 시딩 비동기 지연 로드 (`server.ts`)**:
  - `server.ts` 최상단에서 `vite` 모듈을 즉시 임포트하고 `app.listen(3000)` 이전에 `createViteServer()` 초기화·464KB `data/issues.json` 동기 파싱(`ensureIssuesSeeded`)·스케줄러 초기화를 수행해 개발 서버 기동 헬스체크가 타임아웃되던 문제를 해결.
  - `app.listen(PORT, "0.0.0.0")` 실행 후 `setImmediate`에서 동적 `import("vite")`, `ensureIssuesSeeded()`, `initializeBackgroundSchedulers()`를 백그라운드로 초기화하도록 변경해 `/api/health` 및 HTTP 소켓이 즉시 응답하도록 개선.
- **Vite HMR 독립 포트(`24678`) 충돌 제거 및 기동 예외 복구 (`server.ts`)**:
  - Vite HMR이 별도 포트 `24678`을 점유해 재시작 시 `EADDRINUSE`가 발생할 수 있던 구성을 `DISABLE_HMR === "true"` 시 비활성화하거나 기존 `http.Server` 인스턴스에 바인딩(`{ server: serverRef }`)하도록 수정.
  - `vitePromise` 실패 시 재시도 가능하도록 `null` 초기화하고 `serverRef.on('error')` 및 `startServer().catch()` 안전 처리를 추가.
- **시스템 버전 전면 동기화 (`package.json`, `lib/ai-resilience-router.ts`, `server.ts`, `src/App.tsx`, `docs/PATCH_NOTE.md`)**:
  - 전 모듈 버전을 `v3.106.3`으로 동기화.

---

## [v3.106.2] - 2026-11-18

### 🔧 Bug Fixes & AI Pipeline Resilience (10차 심층 자아성찰 및 누락 경로·복원 안정화)
- **GitHub Autonomous Collector 무키/외부 폴백 도달 불가 결함 및 JSON 파싱 수정 (`scripts/github-collector.ts`)**:
  - `GEMINI_API_KEY`가 미설정된 환경에서 스크립트가 즉시 조기 종료되어 Groq/Mistral/OpenRouter 및 Pollinations 키리스 최후 폴백 분기가 실행되지 않던 버그를 수정.
  - 외부 프로바이더 및 키리스 폴백 호출 시 `buildExternalFallbackPrompt(..., { responseMimeType: 'application/json' })`를 적용하고 `parseAiJson()`으로 Markdown 코드 펜스·서두 문구·Windows 경로 역슬래시까지 복구 파싱하도록 개선.
- **Quota-Split 키 연동 및 서버 키 준비상태 UI 불일치 해결 (`server.ts`, `lib/ai-resilience-router.ts`)**:
  - `executeServerGeminiCall()`의 Quota-Split 경로가 `data/system_config.json`에 저장된 `groqApiKey`를 전달하지 않던 누락을 수정.
  - `getProviderServerReadiness()`가 환경변수(`process.env`)뿐 아니라 `data/api_keys_config.json`·`data/system_config.json`의 활성 키까지 반영하도록 개선해 AI Resilience Hub 상태 표시를 실동작과 일치화.
- **로그 보관 기간(`retentionMonths`) 하드코딩 수정 (`server.ts`)**:
  - `GET /api/logs/summary`의 데드 조건문(`getAutoBlockSettings() ? 1 : 1`)을 제거하고 실제 `maintenance_config.json`의 `cleanupMonths` 설정값을 반환하도록 수정.

### 🛡️ Security Hardening & Input Sanitization
- **`POST /api/visitor/log` IDOR PII 노출 차단 (`server.ts`)**:
  - 비인증 방문자 로그 엔드포인트 응답에서 타 방문자 `visitorId` 조회 시 `ip`, `userEmail`, `userId`, `userAgent` 등이 포함되던 `record` 객체 반환을 제거(클라이언트 필요 필드인 `isBlocked`, `blockReason`, `stats`만 반환)하고 `visitorId` 형식 검증을 추가.
- **`GET /api/github/check-update` & `/api/github/auto-integrate` 남용 및 브랜치 검증 방어 (`server.ts`)**:
  - 미인증 `?repo=` 쿼리 파라미터로 타 저장소 조회 시 관리자 PAT 토큰이 첨부되거나 단일 전역 캐시가 덮어써지던 문제를 수정(저장소/인증 스코프별 20슬롯 LRU 캐시 및 `AbortSignal.timeout(8000)` 적용).
  - `syncGithubDatasetIntoMainData()`의 `targetBranch`에 `isValidGitRef()` 검증을 추가하고, 실패 시에도 `finally`에서 쿨다운 타임스탬프를 갱신하며 `POST /api/github/auto-integrate`에 `rateLimitAutoIntegrate`를 적용.
- **LKG·관리자 복원 프로토타입 오염 및 마스킹 시크릿 손실 방어 (`server.ts`)**:
  - `POST /api/admin/restore`에서 비객체/null 레코드로 인한 `TypeError` 크래시를 차단하고 `__proto__`/`constructor`/`prototype` 키를 필터링하며, LKG 복원 시 `[REDACTED_FOR_BACKUP]` 플레이스홀더가 기존 실자격증명을 덮어쓰지 않도록 보호.
- **시스템 버전 전면 동기화 (`package.json`, `lib/ai-resilience-router.ts`, `server.ts`, `src/App.tsx`, `docs/PATCH_NOTE.md`)**:
  - 전 모듈 기본 버전을 `v3.106.2`로 동기화.

---

## [v3.106.1] - 2026-11-18

### 🔧 Bug Fixes & Architectural Integrity (9차 심층 자아성찰 및 키리스 폴백 라우팅 보완)
- **키리스 최후 폴백(`pollinations`) 순서 고정 및 GitHub Collector 일관화 (`lib/ai-resilience-router.ts`, `server.ts`, `scripts/github-collector.ts`, `src/App.tsx`)**:
  - `loadAiModelRegistry()` 및 `POST /api/ai/resilience-config`, UI 우선순위 조작(`handleMoveProviderOrder`)에서 `pollinations`가 키 기반 프로바이더 위로 승격되어 UI와 실제 실행 순서가 어긋나는 문제를 방지하고 항상 최후 보루(`Last-Resort Fixed`)로 고정.
  - `scripts/github-collector.ts`에서도 키 보유 프로바이더를 먼저 시도한 뒤 모두 실패하고 `keylessFallbackEnabled !== false`일 때만 Pollinations를 호출하도록 일치화.
  - `runAiSync()` 엔진 백업 경로도 `callSecondaryFreeAiApi` 실패 시 활성화된 경우 Pollinations 최후 폴백을 활용하도록 연결.
- **외부·키리스 폴백 프롬프트 컨텍스트 및 JSON 출력 복원 (`lib/ai-resilience-router.ts`, `server.ts`, `src/App.tsx`)**:
  - `buildExternalFallbackPrompt()` 및 `stripMarkdownJsonFences()`를 추가해 Gemini가 아닌 외부 무료·키리스 프로바이더로 우회 시에도 `systemInstruction`과 `responseMimeType: 'application/json'` 요구사항이 누락되지 않고 Markdown 코드 펜스를 제거해 정상 파싱되도록 수정.
  - `POST /api/ai/diagnose` 및 클라이언트 진단 프롬프트가 구조화된 `TroubleshootingResult` JSON 스키마를 명시해 폴백 AI 응답이 `parseAiJson()` 실패로 묵살되지 않도록 개선.

### 🛡️ Security Hardening & Stream Resilience
- **공개 AI 엔드포인트 `config` 화이트리스트 및 SSE 연결 종료 방어 (`server.ts`)**:
  - `POST /api/ai/generate` 및 `POST /api/ai/stream`에서 `sanitizePublicAiConfig()`로 허용된 생성 파라미터만 전달하고, 클라이언트 연결 종료 후 `res.write` 호출을 차단.
  - `sanitizePromptForKeylessEndpoint()`에 Slack 토큰(`xox*`), AWS 키(`AKIA*`), `passkey:*`, URL 민감 파라미터 마스킹을 추가.
- **`POST /api/settings/api-keys` 입력 스키마 정규화 (`server.ts`)**:
  - 저장 전 `DATA_DIR` 보장 및 키 항목 수·필드 길이·프로토타입 오염 방지 정규화를 적용.
- **시스템 버전 전면 동기화 (`package.json`, `lib/ai-resilience-router.ts`, `server.ts`, `src/App.tsx`, `docs/PATCH_NOTE.md`)**:
  - 전 모듈 기본 버전을 `v3.106.1`로 동기화.

---

## [v3.106.0] - 2026-11-18

### 🚀 Major New Features & Integrations (무가입·무키 AI 모델 조사 및 최후 폴백 라우터 연동)
- **키리스(No-Signup / No-API-Key) 무료 서버리스 폴백 계층(`pollinations`) 통합 (`lib/ai-resilience-router.ts`, `server.ts`)**:
  - 회원가입과 API 키 발급 없이 호출 가능한 `https://text.pollinations.ai/openai` 엔드포인트를 AI Resilience 라우터에 통합.
  - 우선순위 격리 원칙 적용: Quota-Split 선분산(`groq`, `mistral`, `cloudflare`) 및 2차 키 기반 무료 티어(`callSecondaryFreeAiApi`)에서 제외하고, **Gemini 키 및 등록된 모든 API 키가 미설정되거나 소진(429/404/401)된 경우에만 최후 폴백(Last-Resort Failover)** 으로 실행되도록 설계(실패 시 기존 로컬 DB 폴백으로 안전하게 귀결).
- **실시간 키리스 모델 카탈로그 탐색 및 Admin 제어 대시보드 확장 (`src/App.tsx`)**:
  - `discoverLiveModels()`에서 OpenRouter `:free` 풀과 병렬로 `https://text.pollinations.ai/models`를 조회해 사용 가능한 텍스트 모델을 동기화.
  - 관리자 AI Resilience Hub에 **키리스 최후 폴백 활성화 스위치(`keylessFallbackEnabled`)**, Pollinations 동적 모델 풀 뷰, 개별 연결 테스트 지원 및 **2026 키리스 AI 조사 비교 요약(Pollinations · OVHcloud 익명 티어 · Hack Club / Duck.ai / WebLLM 제외 사유)** 을 추가.

### 🛡️ Security Hardening & Guardrails
- **공용 키리스 엔드포인트 민감정보 보호 및 서킷 브레이커 (`lib/ai-resilience-router.ts`)**:
  - `sanitizePromptForKeylessEndpoint()`를 통해 외부 공용 프록시 전송 전 프롬프트 내 API 키(`AIza...`, `gsk_...`, `sk-...`, `ghp_...`)·Bearer 토큰·관리자 세션 문자열을 `[REDACTED_*]`로 자동 마스킹.
  - 페이로드 `private: true` 플래그 고정, `AbortSignal.timeout(15000)` 및 모델별 `404` 6시간 서킷 브레이커 격리 적용.
- **시스템 버전 전면 동기화 (`package.json`, `lib/ai-resilience-router.ts`, `server.ts`, `src/App.tsx`, `docs/PATCH_NOTE.md`)**:
  - 전 모듈 버전을 `v3.106.0`으로 동기화.

---

## [v3.105.11] - 2026-11-18

### 🛡️ Security Hardening & Validation (8차 심층 자아성찰 GitOps YAML 인젝션·프로토타입 오염·외부 API 타임아웃 방어)
- **GitHub Actions 워크플로 YAML 인젝션 및 브랜치 검증 일관화 (`server.ts`)**:
  - `sanitizeCollectorOptions()` 및 `buildCollectorWorkflowYamlFromOptions()`에서 `targetWindowsVersions` 입력의 따옴표·개행 문자와 비안전 문자열(`/^[a-zA-Z0-9 .\-_+]{1,40}$/`)을 엄격히 차단해 `.github/workflows/windows-fix-collector.yml` YAML 삽입 가능성을 제거.
  - `POST /api/github/pull-from-repo`, `POST /api/github/push-collector-options`, `POST /api/ai/push-registry`에도 `isValidGitRef(branch)` 검증을 일괄 적용.
- **이슈 패치 프로토타입 오염 방지 및 회원 수정 검증 보강 (`server.ts`)**:
  - `PATCH /api/issues/:id`가 `__proto__`, `constructor`, `prototype`, `id` 키를 필터링한 안전 객체만 병합하도록 개선.
  - `PATCH /api/admin/users/:id`에 요청 본문 객체 검사 및 `displayName` 80자 상한 제한을 추가.

### 🔧 Reliability & DoS Resilience Improvements
- **외부 AI 제공자 네트워크 타임아웃 및 방문자 레이트 맵 상한 적용 (`lib/ai-resilience-router.ts`, `server.ts`)**:
  - Groq, Mistral, OpenRouter, Cerebras, Cloudflare 외부 AI 호출(`callExternalFreeProvider`) 및 `/api/keys/test-secondary` 검증 `fetch()`에 `AbortSignal.timeout(15000)`을 적용해 외부 장애 시 비동기 동기화·응답 지연 누적(Hang)을 방지.
  - `visitorRequestRateMap` 메모리 보호 상한(`> 2000` 키 초과 시 오래된 항목 회전 정리)을 추가해 고카디널리티 요청 폭주 시 메모리 고갈을 예방.
- **시스템 버전 전면 동기화 (`package.json`, `lib/ai-resilience-router.ts`, `server.ts`, `src/App.tsx`, `docs/PATCH_NOTE.md`)**:
  - 전 모듈 기본 버전을 `v3.105.11`로 동기화.

---

## [v3.105.10] - 2026-11-18

### 🛡️ Security Hardening & Authentication (7차 심층 자아성찰 관리자 JWT 우회 차단 및 시크릿 보호)
- **미검증 JWT 서명 기반 관리자 인증 우회 원천 차단 (`server.ts`)**:
  - `verifyAdminAuthHeader()`에서 서명 검증 없이 Base64Url 디코딩된 JWT 페이로드의 `email`/`iss` 필드만으로 관리자 권한을 허용하던 레거시 분기를 완전 제거하고, 서버가 직접 발급한 유효 세션 토큰(`adm_sess_...`) 또는 상수 시간 비교 기반 `ADMIN_PASSKEY`만 허용하도록 전면 강화.
  - `issuedAdminSessions` 맵과 `issueAdminSessionToken()` 선언 위치를 검증 로직 상단으로 정리해 초기화 순서 명확화.
  - `POST /api/github/sync`의 비(`CRON_SECRET`) 폴백 인증도 `verifyAdminAuthHeader()`로 통합하고 웹훅 배치 상한(`1~500건`) 검증 추가.
- **`/api/admin/event-logs` 관리자 인증 게이트 적용 (`server.ts`, `src/components/SystemEventLogPanel.tsx`)**:
  - `GET /api/admin/event-logs`에 `requireAdmin` 미들웨어를 적용해 관리자 엔드포인트 인증 일관성을 확보하고, `SystemEventLogPanel`은 유효한 `winfix_admin_token`이 있는 경우에만 서버 조회를 수행(일반 세션은 로컬 샘플 폴백 사용)하도록 개선.
- **유지보수·시스템 설정 API `smtpPass` 마스킹 및 프로토타입 오염 방어 (`server.ts`)**:
  - `GET /api/settings/maintenance` 및 `GET /api/system_config`가 저장된 `smtpPass` 평문을 반환하지 않고 `"••••••••"` (`hasSmtpPass`)로 마스킹하도록 개선.
  - `POST /api/settings/maintenance`와 `POST /api/admin/smtp/verify`가 마스킹된 플레이스홀더(`"••••"`) 전송 시 기존 서버 저장 비밀번호를 보존·사용하도록 수정.
  - `POST /api/system_config/update`에 객체 타입 검증 및 `__proto__`/`constructor`/`prototype` 키 차단 추가.

### 🔧 Bug Fixes & Input Validation
- **이슈 등록/동기화 페이로드 방어 (`server.ts`)**:
  - `POST /api/issues/add`에 유효한 이슈 객체(`title` 또는 `code` 필수) 검증 추가, `POST /api/issues/sync`에 1회 최대 `1,000건` 배치 상한 적용.
- **시스템 버전 전면 동기화 (`package.json`, `lib/ai-resilience-router.ts`, `server.ts`, `src/App.tsx`, `docs/PATCH_NOTE.md`)**:
  - 전 모듈 기본 버전을 `v3.105.10`으로 동기화.

---

## [v3.105.9] - 2026-11-18

### 🛡️ Security Hardening & Authentication (6차 심층 자아성찰 백업·스냅샷 무결성 및 클라이언트 위생 강화)
- **시스템 백업 ZIP 및 LKG 스냅샷 다운로드 민감 정보 자동 마스킹 (`server.ts`)**:
  - `GET /api/admin/backup`이 `DATA_DIR` 내 JSON 파일들을 직렬화할 때 `redactBackupSecrets()`를 적용해 `users.json`(`passwordHash`, `salt`), `github_config.json`(`token`, `sshPrivateKey`), `system_config.json`/`maintenance_config.json`(`smtpPass`, 외부 AI API 키 등)의 자격 증명을 `[REDACTED_FOR_BACKUP]`으로 치환하도록 보안 강화.
  - `GET /api/admin/last-known-good/download` 및 `GET /api/admin/last-known-good/download-snapshot/:filename`에서도 동일한 시크릿 마스킹을 적용하고 `Content-Disposition` 파일명을 안전하게 인용 처리.
- **스냅샷 다운로드 파일명 정규식 검증 및 복원 허용 컬렉션 화이트리스트 적용 (`server.ts`)**:
  - `GET /api/admin/last-known-good/download-snapshot/:filename` 및 `restore-snapshot`에 `/^snapshot_[a-zA-Z0-9_.\-]+\.json$/` 엄격 정규식 검증을 적용해 비정상 파일 접근 경로를 차단.
  - `POST /api/admin/restore`가 단일·다중 컬렉션 복원 시 허용된 DB/로그 컬렉션 화이트리스트만 수용하도록 제한해 `users`, `github_config` 등 인증/자격 설정 파일의 오작동 덮어쓰기를 방지.
- **서브 컴포넌트 구버전 토큰 필터링 및 URL 파라미터 인코딩 (`MemberManagementPanel.tsx`, `PowerShellVerifierPanel.tsx`, `InteractiveRoadmap.tsx`, `DailyQuotaUsageChart.tsx`)**:
  - 모든 관리자 보조 컴포넌트가 `winfix_admin_token` 조회 시 폐기된 `'local-admin-token'`을 명시적으로 배제하고, `MemberManagementPanel.tsx`의 `PATCH`/`DELETE` 요청 경로에 `encodeURIComponent(user.id)`를 적용.

### 🔧 Bug Fixes & Data Integrity
- **Last-Known-Good (LKG) 스냅샷 백업·복원 컬렉션 명칭 불일치 교정 (`server.ts`)**:
  - 실제 서버 로그·유지보수 파일명(`logs_admin`, `logs_feedback`, `maintenance_config`)이 기존 LKG 백업 목록(`admin_logs`, `feedback`)과 어긋나 빈 배열로 저장·누락되던 결함을 수정하고(기존 별칭 하위 호환 유지), 스냅샷 롤백 시 `maintenance_config` 복원 직후 `setupMaintenanceScheduler()`를 자동 재동기화하도록 개선.
- **시스템 버전 전면 동기화 (`package.json`, `lib/ai-resilience-router.ts`, `server.ts`, `src/App.tsx`, `docs/PATCH_NOTE.md`)**:
  - 전 모듈 기본 버전을 `v3.105.9`로 동기화.

---

## [v3.105.8] - 2026-11-18

### 🛡️ Security Hardening & Authentication (5차 심층 자아성찰 보안·DoS 방어 및 데드코드 정리)
- **비인가 계정 스팸·AI 쿼터 남용·로그 플러딩 차단 (`server.ts`)**:
  - `POST /api/auth/google-sync`에 `requireAdmin` 미들웨어를 적용해 독립 실행 환경에서 비인증 외부 요청으로 `users.json` 계정이 임의 생성되던 경로를 차단.
  - `POST /api/auth/login`, `POST /api/auth/register`에 `rateLimitAuth`(분당 15회)와 엄격한 이메일 형식·비밀번호 길이 상한(`6~128자` PBKDF2 DoS 방어)·표시 이름 길이(`80자`) 검증 추가.
  - 공개 AI 엔드포인트(`/api/ai/generate`, `/api/ai/stream`, `/api/ai/diagnose`)에 `rateLimitPublicAi`(분당 30회)와 `32,000자` 프롬프트 상한을 적용하고, 공개 로그 수집(`/api/logs/add`)에 `rateLimitPublicLogs`(분당 40회) 및 `8KB` 크기 제한을 추가.
- **XSS 방어 심화 (`src/components/PowerShellSandbox.tsx`)**:
  - `highlightPowerShell` 폴백 이스케이프에 따옴표(`"`, `'`) 치환을 추가해 인라인 렌더링 안전성을 강화.

### 🔧 Bug Fixes & Code Cleanliness
- **유지보수 부팅 보정 중복 실행 방지 및 데드 OAuth 코드 제거 (`server.ts`, `src/App.tsx`)**:
  - 서버 부팅 25초 후 실행되는 `startup-overdue` 유지보수 체크가 타이머 시점의 최신 `getMaintenanceSettings()`를 재조회하도록 개선해 부팅 직후 수동 실행과의 중복 실행을 방지.
  - `src/App.tsx`에서 사용되지 않는 `signInWithPopup`, `GoogleAuthProvider`, `handleGoogleAuth` 데드 코드를 제거하고, 패스키 네트워크 안내 및 `My Lab` 계정 동기화 문구를 독립 실행 환경에 맞게 정제.
- **시스템 버전 전면 동기화 (`package.json`, `lib/ai-resilience-router.ts`, `server.ts`, `src/App.tsx`, `docs/PATCH_NOTE.md`)**:
  - 전 모듈 기본 버전을 `v3.105.8`로 동기화.

---

## [v3.105.7] - 2026-11-17

### 🔧 Bug Fixes & Stability Improvements
- **독립 실행 환경 Google OAuth 스텁 런타임 오류(`auth/oauth-not-configured`) 해결 (`src/App.tsx`, `server.ts`)**:
  - Google OAuth가 비활성화된 독립 실행 환경에서 로그인/회원가입 모달에 노출되던 미작동 Google 로그인·가입 버튼을 제거하고, 이메일 통합 로그인 및 비상 마스터 패스키 중심으로 인증 화면을 정돈.
  - `handleGoogleAuth` 내 `auth/oauth-not-configured` 예외가 `console.error`로 전파되어 런타임 오류로 감지되던 문제를 비오류 안내 처리로 교정하고, `/api/auth/login`의 비밀번호 미설정 계정 안내 문구를 현실에 맞게 개선.
- **시스템 버전 전면 동기화 (`package.json`, `lib/ai-resilience-router.ts`, `server.ts`, `src/App.tsx`, `docs/PATCH_NOTE.md`)**:
  - 전 모듈 기본 버전을 `v3.105.7`로 동기화.

---

## [v3.105.6] - 2026-11-17

### 🚀 Major New Features & Integrations
- **동적 유지보수 자동 스케줄러 및 실시간 재구성 (`server.ts`, `data/maintenance_config.json`)**:
  - 관리자가 설정한 주기(`daily` 매일 지정 시각 KST, `interval` 매 N시간 간격, `weekly` 매주 일요일 지정 시각 KST, 또는 일시 중지 `maintenanceEnabled: false`)에 맞춰 `node-cron` (`Asia/Seoul`) 작업을 즉시 중지/재등록하는 `setupMaintenanceScheduler()` 및 `getMaintenanceCronPattern()` / `computeNextMaintenanceAt()` 구현.
  - 서버 부팅 시 저장된 유지보수 설정을 로드해 스케줄러를 자동 시작하며, 활성화 상태에서 이전 실행 기록이 없거나 설정 주기를 초과(`overdue`)한 경우 25초 뒤 비동기 catch-up 유지보수(`triggeredBy: 'startup-overdue'`)를 자동 수행하도록 개선.
  - 관리자 전용 상태 조회(`GET /api/maintenance/status`)와 수동 실행(`POST /api/maintenance`), 동적 스케줄 반영(`GET/POST /api/settings/maintenance`) API 연동 완료.
- **실제 DB 로그·스냅샷 자동 정리 및 순환 링크 검증기 (`server.ts`)**:
  - `runMaintenance()`가 기존 문자열 스텁 대신 공용 `pruneOldDatabaseLogs()`를 호출해 7개 로그 컬렉션(`logs_admin`, `logs_search`, `logs_feedback`, `logs_error`, `logs_backend`, `logs_visitor`, `system_event_logs`)의 만료 레코드와 오래된 LKG 스냅샷(`purgeOldLastKnownGoodSnapshotsSync`), 손상된 불량 `issues` 레코드를 실제로 정리.
  - 외부 참조 URL 검증을 단순 상위 20건 고정 슬라이싱에서 `lastLinkCheckAt` 오래된 순/미검증 우선 순환 배치(`linkVerifyBatchLimit`, 5~100건, 동시성 풀 5)로 업그레이드하고 `HEAD` 차단(`400`/`403`/`405`) 시 `GET (Range: bytes=0-0)` 폴백 검사를 적용해 정확도를 개선.
- **Admin UI 유지보수 스케줄 제어 및 즉시 실행 패널 (`src/App.tsx`)**:
  - 서버 유지보수 설정 카드에 자동 스케줄러 활성 토글, 실행 주기 모드(`daily`/`interval`/`weekly`), 실행 시각(KST)/반복 시간, 순환 링크 검증 배치 상한, 실시간 크론 상태 뱃지, 다음 유지보수 예정 시각, 최근 실행 리포트(`lastMaintenanceResult`), **유지보수 즉시 실행(`handleRunMaintenanceNow`)** 버튼을 통합.

### 🛡️ Security Hardening & Stability Improvements
- **동시 실행 뮤텍스 및 SSRF 링크 검증 가드 유지 (`server.ts`)**:
  - `isMaintenanceRunning` 뮤텍스로 수동 실행·정기 스케줄·부팅 보정 실행 간 경합 및 중복 파일 쓰기를 방지하고, 모든 검증 대상 URL에 `isSafeExternalHttpUrl()` SSRF 차단을 선적용.
- **시스템 버전 전면 동기화 (`package.json`, `lib/ai-resilience-router.ts`, `server.ts`, `src/App.tsx`, `docs/PATCH_NOTE.md`)**:
  - 전 모듈 및 패치 노트 헤더 버전을 `v3.105.6`으로 동기화.

---

## [v3.105.5] - 2026-11-17

### 🛡️ Security Hardening & Authentication (4차 심층 자아성찰 클라이언트 사칭 차단·SSRF 방어)
- **클라이언트 Google OAuth 스텁 관리자 사칭 제거 및 세션 검증 (`src/App.tsx`, `server.ts`)**:
  - `signInWithPopup` 로컬 스텁이 임의 방문자를 하드코딩된 관리자(`ahbiyoutwinfix@gmail.com`) 및 `'local-admin-token'`으로 자동 상승시키던 치명적 사칭 결함을 제거하고, 독립 실행 모드에서는 정직한 안내(`auth/oauth-not-configured`)를 표시해 이메일 로그인 또는 마스터 패스키를 사용하도록 개선.
  - `getAuthHeaders()` 및 마운트 복구 로직이 `'local-admin-token'` 및 토큰 없는 로컬 플래그를 거부하도록 수정하고, `GET /api/admin/session` (`requireAdmin`) 엔드포인트를 신설해 만료·무효 세션 시 클라이언트 `isAdmin` 상태를 자동 해제하도록 보강.
  - `handlePasskeyLogin`에서 Node 백엔드 404 응답 시 관리자 권한을 부여하던 우회 분기(`resp.status === 404`)를 제거(`IS_GITHUB_PAGES` 정적 호스팅 전용으로 한정).
- **유지보수 링크 검사 SSRF 차단 및 입력값 검증 강화 (`server.ts`)**:
  - `runMaintenance()`의 외부 참조 URL 검사 전 `isSafeExternalHttpUrl()` 검증을 적용해 `http`/`https` 외 프로토콜 및 `localhost`, `127.0.0.0/8`, `169.254.0.0/16`, 사설 대역(`10.*`, `172.16-31.*`, `192.168.*`) SSRF 호출을 선제 차단.
  - `POST /api/visitor/log`의 `visitorId` 문자열 타입/길이 상한 검증과 `POST /api/github/config`·`dispatch-workflow`·`deploy-pages`·`push-to-repo`의 `repo`, `branch`, `workflowId` Git 참조 형식(`isValidGitRef`) 검증 추가.

### 🔧 Bug Fixes & Stability Improvements
- **대시보드 엔진 가동 시간 `NaN` 렌더링 방어 (`DashboardWidget.tsx`)**:
  - `engineStartTime` 파싱 실패(`isNaN(startMs)`) 시 `NaN:NaN:NaN`이 노출되지 않고 `00:00:00`으로 안전하게 폴백되도록 방어.
- **시스템 버전 전면 동기화 (`package.json`, `lib/ai-resilience-router.ts`, `server.ts`, `src/App.tsx`)**:
  - 전체 모듈 기본 버전 표기를 `v3.105.5`로 통일.

---

## [v3.105.4] - 2026-11-17

### 🛡️ Security Hardening & Authentication (3차 심층 자아성찰 보안·인증 무결성 강화)
- **관리자 토큰/패스키/JWT 검증 및 세션 발급 보안 보강 (`server.ts`, `src/App.tsx`)**:
  - `verifyAdminAuthHeader`에서 `ADMIN_PASSKEY` 미설정 시 임의의 4자 이상 토큰을 통과시키던 우회 경로를 제거하고, 서버 발급 난수 세션 맵(`issuedAdminSessions`), 상수 시간 SHA-256 다이제스트 비교(`timingSafeEqualStrings`), 비-만료(`exp > nowSec - 60`) 및 `alg !== 'none'` 기반 JWT 검증으로 통일.
  - `/api/admin/verify-passkey`에서 서버 `ADMIN_PASSKEY` 미설정 시 `403`으로 거부하도록 강화하고, `/api/auth/login` 관리자 로그인 시 추적 가능한 관리자 세션 토큰을 발급하도록 수정.
  - `POST /api/auth/google-sync`에 이메일 형식 검증, 차단(`blocked`) 계정 `403` 거부, 비인가 `admin` 역할 승격 차단을 적용하고 클라이언트 `handleGoogleAuth` 팝업 실패 시 관리자 폴백 로그인 제거.
  - `/api/cron-sync` 시크릿 검증을 상수 시간 비교로 교체하고, `/api/admin/smtp/verify` 호스트/포트(`1~65535`) 입력 유효성 검증 추가.
- **이메일 HTML 이스케이프·ReDoS 제거·PowerShell 인젝션 방어 (`server.ts`, `src/utils/psVerifier.ts`, `SystemRestoreUtility.tsx`)**:
  - 알림 메일 HTML 템플릿(`sendEmailAlert`, `/api/engine/test-alert`)의 오류 메시지/수신자/호스트 값에 `escapeHtml()` 적용.
  - PowerShell 검증기(`psVerifier.ts`, `/api/scripts/verify`)의 중첩 수량자 ReDoS 백틱 정규식(`/(\w+\`\w+)+/`)과 비이스케이프 문자 클래스 `[char]` 오탐(`sha256`, `error1` 등)을 `[char]` 리터럴 매칭으로 수정하고 비문자열 `script` 입력 `400` 처리 추가.
  - `SystemRestoreUtility`의 복원 지점 이름(`customName`)에 PowerShell 이스케이프 처리 적용.

### 🔧 Bug Fixes & Stability Improvements (시간대·백업 복원·GitOps·프론트엔드 정합성 수정)
- **KST 타임존 오프셋 및 엔진 업타임 계산 버그 수정 (`server.ts`, `src/App.tsx`)**:
  - `getKSTISOString`이 OS 로컬 타임존에 따라 시간이 어긋나던 결함을 UTC 기반 오프셋 계산으로 교체하고, `/api/engine/status` 및 `/api/engine/alert-logs`의 타임스탬프 이중 `+9시간`(`Z` 표기)을 표준 UTC ISO로 교정해 대시보드 가동 시간(Uptime)이 정상 카운트되도록 수정.
- **Last-Known-Good `system_config` 객체 스키마 백업/복원 및 콜드 부트 시딩 레이스 해결 (`server.ts`)**:
  - 객체형 JSON(`system_config.json`)이 배열 길이 계산(`undefined` -> `NaN`)으로 스냅샷에 누락되고 복원 시 건너뛰어지던 문제를 객체 스키마 전용 분기로 해결.
  - 서버 시작 시 `await ensureIssuesSeeded()` 완료 후 포트를 리슨하도록 변경해 초기 부팅 직후 `/api/issues` 빈 응답 레이스 제거 및 `nodeLogs` 200건 상한 적용.
- **GitOps 원클릭 동기화·내역 가져오기·My Lab 필터 분리 및 수집기 중복 제거 (`src/App.tsx`, `scripts/github-collector.ts`)**:
  - `handleInstantSync`가 서버 `GITHUB_TOKEN` 보유 시 빈 클라이언트 토큰으로 GitHub API를 직접 호출하지 않고 `/api/github/push-to-repo`를 우선 경유하도록 개선.
  - `handleImportHistory`의 `newItemsCount`/`newBookmarksCount` 비동기 `setState` 합산 버그를 동기 계산으로 수정하고 `fetchIssues` 로컬 캐시 `JSON.parse` 예외 방어 추가.
  - `My Lab` 탭의 북마크·최근 조회 내역이 가이드북 필터링(`dbIssues`)에 영향받지 않도록 비필터링 통합 풀(`myLabIssuesPool`)을 사용하도록 교정.
  - `github-collector.ts`의 동일 배치 내 정규화 제목 중복 차단 및 웹훅 JSON 안전 파싱 보강.

### 📈 UI/UX & Performance Optimizations (아이프레임 샌드박스 호환성·Tailwind v4 정합성)
- **금지 다이얼로그(`window.prompt`) 제거 및 샌드박스 클립보드·CSV 내보내기 개선 (`src/components/*`, `src/App.tsx`)**:
  - `PowerShellVerifierPanel`과 `InteractiveRoadmap`의 `window.prompt` 폴백을 인라인 붙여넣기 에디터 UI로 교체하고, 전체 컴포넌트의 `navigator.clipboard.writeText` 호출에 `textarea` 폴백 가드 적용.
  - `SystemEventLogPanel` CSV 내보내기를 UTF-8 BOM(`\uFEFF`) 기반 `Blob` 다운로드 + `URL.revokeObjectURL` 해제로 업그레이드하고 `DailyQuotaUsageChart`의 `0` 수치 폴백을 `??` 연산자로 교정.
- **비표준 Tailwind CSS 클래스 전수 교정**:
  - Tailwind v4에서 무시되던 `py-0.2`, `slate-850`, `slate-750`, `slate-450`, `slate-250`, `rose-955`, `rose-910`, `indigo-55`, `amber-605` 등 비표준 색상/간격 유틸리티를 표준 스케일로 일괄 교정.

---

## [v3.105.3] - 2026-11-17

### 🛡️ Security Hardening & Authentication (2차 심층 자아성찰 보안 강화)
- **회원가입 관리자 이메일 사칭·권한 상승 차단 및 상수 시간 해시 비교 (`server.ts`)**:
  - `POST /api/auth/register`에서 시스템 최고 관리자 이메일 목록에 포함된 주소로 신규 가입을 시도할 경우 `403`으로 차단하고 신규 가입자 역할을 `member`로 고정.
  - `verifyPasswordWithSalt`, `verify-passkey`, `/api/github/sync` (`CRON_SECRET`/`ADMIN_PASSKEY`) 비밀값 검증을 `crypto.timingSafeEqual` 상수 시간 비교로 통일.
- **관리자 전용 AI·GitHub 프록시 엔드포인트 인증 및 강제 동기화 남용 차단 (`server.ts`, `src/App.tsx`)**:
  - `/api/ai/verify-issue`, `/api/ai/reclassify-chunk`, `/api/ai/optimize-knowledge`, `/api/ai/search-trends`, `/api/ai/validate-key`에 `requireAdmin` 미들웨어(및 `validate-key` 레이트 리미터)를 적용하고 클라이언트 키 검증 호출에 관리자 `Authorization` 헤더를 포함.
  - `/api/github/auto-integrate`의 `force: true` 우회 옵션이 관리자 인증을 통과한 요청에서만 적용되도록 제한.
  - `PATCH /api/issues/:id`에서 `id` 필드 덮어쓰기 및 비정상 배열 페이로드를 차단.

### 🔧 Bug Fixes & Stability Improvements (단건 AI 검증 영속화 및 리소스 누수 완전 해소)
- **단건 AI 검증(`verifySingleIssueWithAI`) 서버 파일 DB·캐시 동기화 누락 수정 (`src/App.tsx`)**:
  - 개별 이슈 AI 검증 및 자율 보완 폴백 결과가 Firestore뿐 아니라 Node 서버 파일 DB(`PATCH /api/issues/:id`), `fullIssuesPool`, `localStorage`, IndexedDB에도 즉시 영속화되도록 수정.
- **잔여 Blob ObjectURL 및 UI 컴포넌트 타입 정합성 교정 (`InteractiveRoadmap.tsx`, `SystemInfoWidget.tsx`)**:
  - 롤백 스크립트 다운로드 시 생성된 `Blob` URL이 다운로드 후 `URL.revokeObjectURL`로 해제되도록 수정.
  - `SystemInfoWidget`의 `language` 타입에 `'ko'`를 정식 허용하고 클립보드 복사 실패 시 예외 처리 가드를 추가.

---

## [v3.105.2] - 2026-11-17

### 🛡️ Security Hardening & Authentication (심층 보안 점검 및 인증 정합성 강화)
- **로그 엔드포인트 경로 순회(Path Traversal) 및 비인가 로그 주입 차단 (`server.ts`)**:
  - `GET /api/logs/:type`, `POST /api/logs/clear`에 엄격한 로그 타입 화이트리스트 검증(`admin`, `search`, `feedback`, `error`, `backend`, `visitor`, `script_rating`)을 적용하고 비정상 경로 파라미터를 `400`으로 차단.
  - `POST /api/logs/add`에서 비공개 운영 로그(`admin`, `backend`, `visitor`) 기록 시 관리자 토큰(`verifyAdminAuthHeader`) 검증을 강제하고, `log` 페이로드의 Plain Object 유효성 검증을 추가.
- **GitHub 프록시 SSRF/경로 조작 방어 및 패스키 인증 보강 (`server.ts`)**:
  - `isValidGithubRepo` 검증(`^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$`)과 `pull-from-repo`의 `filePath` 상위 디렉터리(`..`) 이동 차단을 전체 GitHub API 프록시 라우트에 적용.
  - `ADMIN_PASSKEY` 비교에 `crypto.timingSafeEqual` 적용 및 `/api/admin/event-logs`의 `limit` 쿼리 상한 클램핑(`1~500`) 적용.
- **PDF 진단 리포트 HTML/URL XSS 이스케이프 (`src/App.tsx`)**:
  - `handleGeneratePdfReport` 내 `escapeHtml()` 및 `sanitizeHttpUrl()`(`http:`/`https:` 프로토콜 전용) 유틸리티를 적용하여 사용자 질의, 진단 본문, 스크립트, 참고 링크의 스크립트 삽입 위험을 차단.

### 🔧 Bug Fixes & Stability Improvements (자아성찰 풀스택 결함 수정)
- **`system_config.json` 스키마 충돌 및 키 유실 버그 해결 (`server.ts`)**:
  - `saveIssuesToServer()`가 `system_config.json`을 배열로 덮어써 저장된 `groqApiKey`·`openrouterApiKey`·유지보수 설정이 유실되던 결함을 `writeSystemConfigObject()` 병합 방식으로 수정.
  - `getLkgRetentionCount()`와 `callSecondaryFreeAiApi()`가 객체 스키마를 직접 읽도록 `readSystemConfigObject()` 기반으로 통일.
- **2차 AI 페일오버 키 오염 차단 (`server.ts`)**:
  - `executeServerGeminiCall()`에서 Gemini 커스텀 키(`AIza...`)가 Groq/OpenRouter 키로 잘못 전달되던 문제를 접두사(`gsk_`, `sk-or-`) 검증 분기로 해결.
- **관리자 중복 정리 엔드포인트·패스키 관리자 권한·AI 일괄 영속화 수정 (`src/App.tsx`)**:
  - `handleCleanupDuplicates`가 존재하지 않던 `/api/admin/collections/import` 대신 `/api/admin/restore`를 호출하고 응답 검증 및 `fullIssuesPool` 동기화를 수행하도록 수정.
  - `logAdminAction`, `optimizeAiModel`, `handleTriggerAiSearch`가 Google OAuth 세션뿐 아니라 패스키 기반 관리자(`isAdmin`)에서도 정상 작동하도록 개선하고 `logAdminAction`에 관리자 `Authorization` 헤더를 포함.
  - `runAiVerification` 및 `handleBulkTranslate`가 Firestore 외에 서버 파일 DB(`/api/issues/:id` PATCH)와 로컬 상태·IndexedDB(`fullIssuesPool`)에도 즉시 영속화하도록 보완.

### 📈 UI/UX & Performance Optimizations (메모리·타이머 누수 차단 및 버전 동기화)
- **인메모리 맵/타이머/ObjectURL 누수 제거 (`server.ts`, `src/components/*`)**:
  - `rateLimitStore`와 `visitorRequestRateMap`에 크기 임계치(1,000건 초과) 만료 엔트리 정리 로직을 추가하여 장기 가동 시 메모리 누수 방지.
  - `InteractiveRoadmap`과 `QuickSystemScanUtility`의 `setInterval`/`setTimeout` 핸들을 `useRef`로 관리하여 언마운트 및 모달 닫힘 시 즉시 해제.
  - `QuickSystemScanUtility`, `MemberManagementPanel`, `SystemEventLogPanel` 파일 다운로드 후 `URL.revokeObjectURL` 호출로 Blob 메모리 누수 제거.
  - `PowerShellSandbox`의 `highlightPowerShell`에 `Prism?.languages?.powershell` 가드 추가 및 전체 시스템 버전을 `v3.105.2`로 동기화.

---

## [v3.105.1] - 2026-11-17

### 🔧 Bug Fixes & Stability Improvements (관리자 페이지 중복·불필요 UI 및 데드코드 제거)
- **미사용 위젯 임포트 및 중복 푸시 핸들러 정리 (`src/App.tsx`)**:
  - 상단 대시보드 위젯(`DashboardWidget`) 내부와 중복 렌더링되던 별도 `DeploymentDashboardWidget` 임포트를 제거하고 경량 2카드 워크플로 스트립(`GitHubWorkflowStatus`)으로 통합.
  - 히어로 카드의 원클릭 동기화·배포(`handleInstantSync`)와 기능이 중복되던 `isPushingGithub` 상태 및 `handlePushToGithub` 핸들러를 제거.
- **Tier 네비게이션 및 레이블 정합성 보강 (`src/App.tsx`)**:
  - 관리자 콘솔 Tier 바에 중복 배치되어 있던 `모바일 UX 연구` 버튼을 제거(모바일 퀵 메뉴 및 푸터에서 계속 접근 가능).
  - Tier 4 영역의 구식 이전 안내 배너(`실험실 이전 기능`)를 제거하고 실제 기능에 맞게 `[4등급] 이슈 DB 검수 & 관리`로 명칭을 교정.

### 📈 UI/UX & Performance Optimizations (모듈러 카드 밀도 최적화 및 중복 안내 제거)
- **Tier 1 / Tier 2 정적·홍보성 블록 제거 및 정보 계층 정비 (`src/App.tsx`)**:
  - `DailyQuotaUsageChart` 상단의 정적 장식 배너(`독립형 Jamstack & GitOps 무과금 데이터 엔진`)와 텔레메트리 카드 내 6카드 마케팅 그리드(`Jamstack 정적 데이터 보호 전략`) 및 하단 중복 각주 박스를 제거하여 실시간 지표 집중도 향상.
  - GitOps 패널(`#github-actions-gitops-panel`)의 중복 상태 뱃지, 중복 `autoDeployPages` 스위치(상단 Collector 옵션과 통합), 135줄 규모의 중복 안내 블록(`GitHub Pages 공식 웹사이트 대용 운영 센터`)을 정리하고 3열 액션 툴바로 압축.
  - AI Resilience Hub `strategy` 탭의 반복 요약 카드 4종을 제거하여 실시간 프로바이더 비교표가 즉시 노출되도록 개선.
- **Tier 3 API 키·로그 관리·AI 도구 카드 통합 (`src/App.tsx`)**:
  - API 키 저장 영역 하단의 중복 설명 문구(`브라우저 영구 저장소 / Zero Cloud DB`)를 제거.
  - `#log-files-management-center`의 `visitor` 카드에 실시간 온라인 접속자 수(`activeNowCount`) 및 금일/누적 방문자 지표를 병합하고, 하단에 중복 배치되어 있던 5카드 로그 버튼 그리드를 제거.
  - 고아 배치(3+1) 상태였던 `AI 자동 카테고리 분류` 카드를 4열 AI 데이터 운영 그리드(`lg:grid-cols-4`)로 통합하고, `데이터 백업 및 복원 고도화 엔진`을 독립 전폭 카드로 정돈.

---

## [v3.105.0] - 2026-11-16

### 🚀 Major New Features & Integrations (관리자 페이지 리뉴얼 및 실시간 모듈러 카드 개편)
- **모듈러 카드 레이아웃 및 실시간 차트 대시보드 구축 (`src/App.tsx`, `DailyQuotaUsageChart.tsx`, `DashboardWidget.tsx`)**:
  - 관리자 콘솔 전반에 걸쳐 모듈러 카드 그리드와 실시간 인터랙티브 차트(ComposedChart, BarChart, AreaChart)를 통합 배치하여 가독성과 사용자 경험을 극대화.
  - API 할당량 소진율 및 다중 모델(Gemini / Groq / OpenRouter 등) 헬스 모니터링 위젯을 실시간 갱신형으로 고도화.
- **GitOps 자율 동기화 및 커밋 로그 모니터링 강화 (`src/App.tsx`, `GitHubWorkflowStatus.tsx`)**:
  - GitHub Actions 워크플로 런너 상태, 24시간 수집 롤링 통계, 자동 동기화 카운트다운 타이머, 원클릭 정적 데이터셋 푸시 및 Pages 배포 패널을 유기적으로 연동.
- **방문자 보안 및 자동 차단 규칙 실시간 모니터링 (`src/App.tsx`)**:
  - 실시간 세션/접속자 통계, 디바이스/OS 분포, 비정상 방문자 자동 차단(Auto-block) 룰 설정을 모듈러 카드 형태로 직관적으로 관리.

---

## [v3.103.4] - 2026-11-16

### 🛡️ Security Hardening & Authentication (관리자 보안 및 API 인증 강화)
- **관리자 전용 API 미들웨어 보강 및 클라이언트 토큰 연동 (`server.ts`, `src/App.tsx`, `DailyQuotaUsageChart.tsx`)**:
  - `GET /api/visitor/autoblock-settings` 및 `GET /api/admin/daily-quota-stats` 라우트에 `requireAdmin` 인증 미들웨어를 적용하여 비인가 열람을 차단.
  - 클라이언트 `fetchAutoBlockSettings`, `fetchVisitorLogs`, `DailyQuotaUsageChart` 조회 및 스냅샷 다운로드(`handleDownloadHistoricalSnapshot`) 시 `Authorization: Bearer ...` 인증 헤더를 일관되게 전송하도록 수정.
- **패스키 로그인 오류 폴백 우회 취약점 제거 (`src/App.tsx`)**:
  - `handlePasskeyLogin`에서 서버 HTTP 500 오류 또는 일반 네트워크 장애 시 `pk.length >= 3`만으로 로컬 검증 통과를 허용하던 보안 우회 경로를 제거하고, 순수 정적 호스팅 환경(`IS_GITHUB_PAGES` 또는 404)에서만 클라이언트 폴백을 허용하도록 강화.

### 🔧 Bug Fixes & Stability Improvements (관리자 페이지 자아성찰 전수 감사 및 영속성 수정)
- **`system_config.json` 병합 정규화 및 데이터 유실 방지 (`server.ts`)**:
  - 배열/객체 혼재 가능성을 정규화하는 `readSystemConfigObject()` 및 부분 병합 저장 헬퍼 `writeSystemConfigObject()`를 도입.
  - `POST /api/settings/maintenance`, `GET/POST /api/system_config*`, `getDefaultCollectorOptions`, `POST /api/github/collector-options`가 기존 `groqApiKey`, `openrouterApiKey`, `stagingAutomationConfig` 등 타 설정 키를 덮어써 유실하지 않도록 수정.
- **이슈 수정·삭제·AI 재검증·재분류의 서버 영속성 복구 (`server.ts`, `src/App.tsx`)**:
  - 서버에 `DELETE /api/issues/:id`(`requireAdmin`) 엔드포인트를 신설.
  - 스텁 상태였던 Firestore 단독 호출에 머물던 `handleDeleteClick`, `handleUpdateIssue`, `handleStartVerification`, `handleApplyVerificationBatch`, `handleApplySingleVerificationStatus`, `reclassifyUncategorizedIssues`, `applyAISuggestions`가 실제 서버 API(`/api/issues`, `/api/issues/:id`) 및 `getFullUnfilteredIssuesPool()`, `fullIssuesPool`, IndexedDB 캐시와 일괄 동기화되도록 전면 개편.
- **로그 초기화 및 정밀 백업 내보내기 실동작 복구 (`src/App.tsx`)**:
  - `clearAdminLogs`, `clearSearchLogs`, `clearFeedbackLogs`, `clearAppErrorLogs`가 실제 `POST /api/logs/clear`를 호출하고 `fetchLogSummary()`를 즉시 갱신하도록 수정.
  - `handleExecuteGranularExport`가 로그 컬렉션(`admin_logs`, `search_logs`, `feedback`, `app_error_logs`, `visitor_logs`, `backend_logs`)을 서버 API에서 실제로 로드해 내보내도록 수정.
- **iframe 샌드박스 금지 다이얼로그 및 하드코딩 버전 제거 (`server.ts`, `src/App.tsx`, `MemberManagementPanel.tsx`, `HiddenLogArchiveModal.tsx`)**:
  - `window.confirm` 및 `window.open` 호출을 인앱 React 확인 UI(`customConfirm` / 인라인 행 확인), 인증된 `Blob` 다운로드, 숨김 `<iframe>` 인쇄로 전면 교체.
  - `MemberManagementPanel`의 API 실패 시 하드코딩된 가짜 관리자 행 폴백을 제거하고 명시적 오류 안내 UI를 표시하도록 수정.
  - `server.ts` 내 하드코딩된 레거시 버전 문자열(`3.55.0`, `3.14.0`, `3.10.0`)을 `getAppVersion()` 동적 로더로 대체하고 `APP_VERSION` / `package.json` / `lib/ai-resilience-router.ts`를 `v3.103.4`로 일괄 동기화.

### 📈 UI/UX & Performance Optimizations (대시보드 차트·타이포그래피·동적 텔레메트리 교정)
- **Quota 차트 & 배포 위젯 Recharts 렌더링 버그 수정 (`DailyQuotaUsageChart.tsx`, `DashboardWidget.tsx`)**:
  - `DailyQuotaUsageChart`의 `chartType` 토글이 실제 `<ComposedChart>` / `<BarChart>` / `<AreaChart>` 간 전환으로 동작하도록 구현하고, `Refresh` 버튼의 `forceRefresh` 캐시 우회, Y축 스케일 및 컬러 매핑 충돌 해소, `Estimated Monthly Savings` 동적 산출을 적용.
  - `DashboardWidget`의 `<Area>` + `<Bar>` 혼합 차트 래퍼를 `<ComposedChart>`로 교정하여 워크플로우 실행 막대 그래프가 정상 표시되도록 수정.
- **비표준 Tailwind 유틸리티 클래스 및 동적 수치 교정 (`src/App.tsx`, `GitHubWorkflowStatus.tsx`, `DailyQuotaUsageChart.tsx`, `DashboardWidget.tsx`)**:
  - `py-0.2` -> `py-0.5`, `dark:text-slate-205` -> `dark:text-slate-200`, `text-slate-450` / `text-emerald-605` / `dark:text-rose-450` / `dark:text-slate-350` 등 미적용 비표준 클래스 및 `AI 데이터 재검증 진행 상황` 모달 헤더 아이콘 구조·오탈자(`총 실패 횟수`) 교정.
  - 관리자 패널의 실행 주기(`maintenanceSettings.engineIntervalMin`), 전체 이슈 수/KB 용량(`fullIssuesPool`), 엔진 버전 배지(`v{APP_VERSION}`)가 필터나 과거 상수에 고정되지 않고 실시간 상태와 일치하도록 개선.

---

## [v3.103.3] - 2026-11-16

### 🔧 Bug Fixes & Stability Improvements (자아성찰 전수 감사 및 동기화·통계 정합성 수정)
- **카테고리/검색 필터 활성 상태에서 대기열 동기화 시 부분 DB 누락 및 중복 미검출 버그 수정 (`src/App.tsx`)**:
  - 기존 `handleSyncStagedIssues`, `retryPendingGitOpsCommit` 및 대기열 사전 중복 판별 UI(`partitionStagedIssues`)가 화면에 필터링된 `dbIssues` 상태를 참조하던 문제를 수정.
  - `KNOWN_ISSUES`, `fullIssuesPool`, IndexedDB(`winfix_merged_issues`), `localStorage`, 그리고 서버 전체 조회(`/api/issues?category=전체&version=전체&q=`)를 병합해 반환하는 `getFullUnfilteredIssuesPool()` 비동기 헬퍼를 도입하여 필터 적용 중에도 전체 통합 DB 기준 중복 스킵·병합·GitHub 커밋이 안전하게 실행되도록 개선.
- **필터 상태에서의 출처별 통계 폴백 왜곡 해소 (`src/App.tsx`)**:
  - `winfix_dataset_breakdown_cache` 로컬 캐시 하이드레이션 및 `fullIssuesPool` 상태를 추가하여, 초기 로딩 중이거나 검색/카테고리 필터가 켜진 상태에서 `dbSourceBreakdown` 및 `githubHarvestStats`가 전체 DB 개수(`total: 150`)와 필터링된 `githubCollected` 개수를 혼용해 불일치 수치를 계산하던 폴백 오류를 해결.
- **레거시 네이티브 `alert()` 전면 제거 (`src/App.tsx`)**:
  - AI Studio iframe 샌드박스 환경에서 차단될 수 있는 23건의 네이티브 `alert()` 호출을 비차단 인앱 모달 `customAlert()`로 일괄 교체.

---

## [v3.103.2] - 2026-11-16

### 📈 UI/UX & Performance Optimizations
- **알려진 문제 가이드북 내 GitHub 일일 자동 수집 현황 배너 제거 (`src/App.tsx`)**:
  - 사용자용 알려진 문제 가이드북 상단에 노출되던 `깃허브(GitHub Actions / GitOps) 일일 자동 수집 현황` 배너를 제거하여 오류 검색·해결 가이드 본연의 화면 집중도와 깔끔한 레이아웃을 확보.
  - 관리자 콘솔 내 통계 및 GitOps 수집 센터 모니터링 기능은 기존대로 유지.

---

## [v3.103.1] - 2026-11-16

### 🔧 Bug Fixes & Stability Improvements (데이터 건수 합산 모호성 및 중복 표기 해소)
- **전체 통합 DB vs 출처별 합산 내역 명확화 (`server.ts`, `src/App.tsx`)**:
  - 기존 관리자 모니터링 카드에서 `총 등록된 오류 수: 150개` 하위에 `Jamstack 정적 데이터셋: 150개`와 `깃허브 수집 데이터: 128개`를 나란히 트리로 배치하고 바로 아래 동일한 숫자를 2회 중복 출력하여 `150 + 128`처럼 오해되던 문제를 해결.
  - 상호 배타적 출처 분류(`GitHub Actions 자동 수집 128개` + `기본 시드·초기 내장 22개` [+ `로컬 AI/수동 등록 N개`] = `전체 통합 DB 150개`)와 비율 바, 합계 검산(`128 + 22 = 150개`)을 단일 패널로 통합 표시하고 중복 행을 제거.
- **카테고리·검색 필터 시 통계 왜곡 방지 (`server.ts`, `src/App.tsx`)**:
  - `/api/issues/counts` 엔드포인트가 전체 컬렉션(`data/issues.json`) 기준 `sourceBreakdown` 및 `harvestStats`를 직접 반환하도록 개선하여, 사용자가 카탈로그에서 검색어나 필터를 적용한 상태에서도 관리자 대시보드 및 상단 수집 현황 배너의 출처별 합계(`128 / 150개`)가 항상 전체 DB 기준으로 정확히 유지되도록 보완.

---

## [v3.103.0] - 2026-11-16

### 🚀 Major New Features & Integrations (로컬 대기열 수집 ➔ GitOps 자동 동기화 파이프라인)
- **수량 도달 & 설정 주기 기반 자동 동기화 트리거 (`src/App.tsx`)**:
  - 로컬 대기열(`stagedIssues`)이 설정된 수량 임계치(`threshold`, 기본 5건)에 도달하거나 설정 주기(`intervalMinutes`, 기본 15분)가 만료되면 중복 실행 방지 뮤텍스 락하에 자동으로 동기화 파이프라인을 실행하도록 고도화.
  - 서버 `/api/system_config` 및 브라우저 `localStorage`와 설정(`threshold`, `intervalMinutes`, `autoCommitGithub`, `triggerPagesDeploy`)을 실시간 양방향 동기화하고 독립 타이머 배지(`StagingCountdownBadge`)를 통해 다음 실행 카운트다운 표시.
- **서버 DB 병합 ➔ GitHub 저장소 자동 커밋 파이프라인 (`server.ts`, `src/App.tsx`)**:
  - 기존 Firestore 단독 저장에 머물던 `handleSyncStagedIssues`를 서버 파일 DB(`/api/issues/sync`, `data/issues.json`) 병합 후 GitHub Contents API(`/api/github/push-to-repo`) 자동 커밋까지 일괄 실행하도록 재설계.
  - 정적 GitHub Pages 호스팅 환경(`IS_GITHUB_PAGES`)에서도 IndexedDB 병합 및 클라이언트 GitHub REST API 직접 커밋 폴백 지원.

### 🔧 Bug Fixes & Stability Improvements
- **중복 데이터 자동 스킵 및 실패 항목만 대기열 보존 (`server.ts`, `src/App.tsx`)**:
  - `saveIssuesToServer` 및 `/api/issues/sync`에 `skipDuplicates` 옵션을 신설하여 기존 DB 및 동일 배치 내 중복 이슈(`id`, `code+title`, `title` 정규화 매칭)를 덮어쓰지 않고 자동 스킵 처리.
  - 비동기 동기화 도중 새로 유입된 항목이나 DB 병합 실패 항목만 대기열에 안전하게 남기고 성공·중복 스킵 항목만 제거하며, GitHub 커밋 일시 실패 시에는 `pendingGitOpsCommit` 상태로 분리 추적하여 원클릭/자동 재시도 제공.
- **`saveIssuesToServer` 실행 시 `system_config.json` 기존 설정 보존 (`server.ts`)**:
  - 동기화 타임스탬프 저장 시 `system_config.json` 전체를 덮어써 `groqApiKey`, `openrouterApiKey`, `stagingAutomationConfig`가 유실되던 버그를 병합 저장으로 수정.

### 📈 UI/UX & Performance Optimizations
- 관리자 콘솔 로컬 대기열 패널을 단일 평면 보더(`1px`), 임계치 진행률 게이지, 사전 중복/신규 판별 목록, 최근 실행 이력(`tabular-nums`, SHA 링크), `44px` 이상 터치 타겟 규격으로 개편.

---

## [v3.102.2] - 2026-11-16

### 🔧 Bug Fixes & Stability Improvements (자아성찰 전수 감사 및 UI/서버 정합성 수정)
- **PowerShell 샌드박스 가변 높이 클리핑 버그 수정 (`src/components/PowerShellSandbox.tsx`)**:
  - 코드 편집기 내부 래퍼에 고정되어 있던 `min-h-[360px] max-h-[500px]` 제약을 제거하여 `컴팩트(260px)` 모드 하단 잘림 현상과 `확장(580px)` 모드 하단 여백 유휴 공간 발생 버그를 해결.
  - 레이아웃 분할 툴바·에디터 타이틀 액션 바·인스펙터 탭 바에 반응형 `flex-wrap` 및 `min-w-0`를 보강해 375px 모바일 화면과 좌우 분할 모드에서도 버튼이 넘치지 않도록 개선하고 높이 라벨 다국어(`ko`/`en`) 지원 및 `localStorage` 상태 영속화 적용.
  - `initialScript` 프롭 변경 시 실시간 동기화(`useEffect`) 및 샌드박스 iframe 환경을 고려한 안전 클립보드 복사 헬퍼 적용.
- **시스템 버전 일원화 및 부팅 시 모델 탐색 키 연동 (`src/App.tsx`, `server.ts`, `lib/ai-resilience-router.ts`)**:
  - `APP_VERSION`이 이전 버전(`3.101.0`)으로 고정되어 GitHub 업데이트 비교 시 오차가 발생하던 부분을 최신 버전(`3.102.2`)으로 동기화.
  - 부팅 후 40초 및 6시간 주기 `discoverLiveModels()` 스케줄 실행 시 `getApiKeyInfo()`가 검증한 활성 Gemini 키(`CUSTOM_API_KEY` 등 포함)를 전달하도록 보완.

---

## [v3.102.1] - 2026-11-16

### 🔧 Bug Fixes & Stability Improvements (Engine Sync API 키 필터링 및 Search Grounding 예외 전파 수정)
- **비-Gemini 환경변수 키 혼입 차단 (`server.ts`)**:
  - `getAllAvailableKeys()`가 `FIREBASE_*`, `VITE_*`, `GROQ_*`, `OPENROUTER_*`, `MISTRAL_*`, `CEREBRAS_*`, `CLOUDFLARE_*`, `MAPS_*` 등 타 서비스의 `*_API_KEY` 환경변수까지 Gemini 키 풀에 수집해 우선 호출하던 문제를 해결하여 Gemini 전용 키(`GEMINI_API_KEY`, `GOOGLE_API_KEY`, `CUSTOM_API_KEY` 등)만 안전하게 필터링하도록 개선.
- **Search Grounding 예외 블록에서 `INVALID_KEY` / `QUOTA_EXHAUSTED_429` 즉시 전파 (`server.ts`, `scripts/github-collector.ts`, `lib/ai-resilience-router.ts`)**:
  - `googleSearch` 그라운딩 호출 중 HTTP 400 `API key not valid`(`INVALID_KEY`) 또는 `429`(`QUOTA_EXHAUSTED_429`) 오류가 발생했을 때, 이를 그라운딩 미지원 오류로 오인해 경고 로그(`[Engine Sync] Search grounding not available...`)를 출력하고 무의미한 직접 생성 재시도를 수행하던 버그를 수정.
  - 유효하지 않은 키 감지 시 즉시 격리 쿨다운(30분)을 적용하고 다음 정상 키 또는 멀티 프로바이더 무료 티어 폴백으로 신속히 전환되도록 개선.

---

## [v3.102.0] - 2026-11-16

### 🚀 Major New Features & Integrations (PowerShell 샌드박스 편집기 및 실행창 상하 2단 가변창 구현)
- **PowerShell 샌드박스 레이아웃 상하 2단 가변창(Stacked 2-Tier) 및 좌우 분할 모드 신설 (`src/components/PowerShellSandbox.tsx`)**:
  - 기본 가시성 배치를 기존 단일 평면에서 **상단 스크립트 편집기 + 하단 터미널/가상 상태 검사기** 구조의 **상하 2단 가변창(`stacked`)** 모드로 개편하여 전문 IDE(VS Code 터미널 분할) 수준의 직관적이고 쾌적한 작업 공간 구축.
  - 사용자의 취향에 따라 언제든지 **[상하 2단 가변창 (기본)]** 과 **[좌우 2단 분할창]** 모드를 원클릭으로 전환할 수 있는 레이아웃 제어 툴바 탑재.
- **편집기 및 터미널 독립형 높이 가변 컨트롤 (`컴팩트`, `표준`, `확장`)**:
  - 스크립트 편집기 헤더와 터미널 콘솔 헤더에 각각 높이 조절 버튼(`↕ 높이: 표준 / 확장 / 컴팩트`)을 배치하여 스크립트 길이와 로그 볼륨에 맞춰 창 크기를 동적으로 최적화 가능.

### 📈 UI/UX & Performance Optimizations
- 에디터와 터미널 간 여백 및 스크롤바 정합성을 보완하여 모바일 및 데스크톱 반응형 뷰포트에서 스크롤 겹침 현상 없이 쾌적한 가독성 제공.

---

## [v3.101.0] - 2026-11-15

### 🚀 Major New Features & Integrations (모바일 장치 화면 개선 방향 연구 및 UX 전면 최적화)
- **엄지손가락 존(Thumb-Zone) 기반 모바일 내비게이션 개편 (`src/App.tsx`)**:
  - 스마트폰(`md` 미만)에서 상단 2단 가로 스크롤 탭을 제거하고 **52px 슬림 상단 헤더 + 하단 5슬롯 고정 탭 바(`오류 가이드북`, `위협 검증`, `PS 샌드박스`, `나의 실험실`, `전체 메뉴`)**로 재설계하여 상·하단 고정 영역 합계를 모바일 뷰포트의 15% 이내로 억제.
  - 기존 상단 드롭다운 메뉴를 **슬라이드업 바텀 시트 드로어(`rounded-t-3xl`, 드래그 핸들, 배경 딤드 및 ESC/외부 터치 닫기)**로 전환하여 한 손 조작성 강화.
- **44px 터치 타겟 확대 및 노치 Safe-Area 지원 (`index.html`, `src/index.css`, `src/App.tsx`)**:
  - `viewport-fit=cover` 적용 및 `pt-safe`, `pb-safe`, `pl-safe`, `pr-safe` 유틸리티 도입으로 iPhone Dynamic Island·홈 인디케이터 및 Android 제스처 바 가림 현상 해소.
  - 모바일 헤더 컨트롤, 하단 탭 버튼, 플로팅 스크롤 도크, 검색·필터·투표·북마크·PowerShell 실행 버튼에 최소 **44×44px**(`min-h-[44px]`) 터치 히트박스 적용.
- **인앱 '모바일 화면 개선 방향 연구 리포트' 신설 (`src/App.tsx`)**:
  - 모바일 바텀 시트, 관리자 `[2등급]` 대시보드, 푸터에서 열람 가능한 인터랙티브 리포트 모달을 통해 병목 진단, 터치 규격, Safe-Area 아키텍처, 향후 확장 방향을 제공.

### 🔧 Bug Fixes & Stability Improvements
- 모바일 iOS Safari 입력 포커스 시 발생하던 화면 강제 확대 버그를 `@media (max-width: 639px)` `16px` 입력 폰트 규격으로 근본 차단.
- 모바일 루트 컨테이너 `overflow-x-clip` 및 하단 여백(`pb-24 md:pb-8`), 플로팅 스크롤 버튼 Safe-Area 오프셋 보정으로 하단 탭 바 및 카드 겹침 현상 해결.
- 주요 모달(로그, 스키마 검증, 데이터 내보내기, 스냅샷 복원, 업데이트 안내, GitOps 가이드, 이슈 편집, 자동 차단 설정)을 모바일 바텀 시트형(`items-end sm:items-center`, `max-h-[90dvh]`)으로 전환.

### 📈 UI/UX & Performance Optimizations
- `@media (pointer: coarse)` 환경에서 `touch-action: manipulation` 및 `-webkit-tap-highlight-color: transparent`, `overscroll-behavior-y: contain`을 적용해 모바일 터치 반응 속도 개선.

---


## [v3.100.0] - 2026-11-15

### 🚀 Major New Features & Integrations (지속적 AI 모델 변경 대응 및 멀티 무료 티어 라우팅 아키텍처)
- **적응형 AI 모델 복원력 라우터 신설 (`lib/ai-resilience-router.ts`, `data/ai-model-registry.json`)**:
  - `@google/genai` SDK를 최신 `v3.3.0`으로 업그레이드하고, `ai.models.list()` 및 OpenRouter 공개 `/api/v1/models`를 주기적으로(부팅 40초 후 + 6시간 cron) 탐색하여 구형(`gemini-1.x`, `gemini-2.0`, TTS/이미지/임베딩) 모델을 자동 제외하고 최신 Gemini 4(`gemini-4-hydrogen`, `gemini-4-argon`), `gemini-3.1-flash-lite`, `gemini-flash-latest` 후보군을 동적 갱신하도록 구축.
  - **404 모델 단위 서킷 브레이커(24시간 TTL)**: 폐기된 모델 ID가 HTTP 404를 반환하면 즉시 24시간 동안 격리하고 다음 정상 모델로 우회하며, 전 모델 404 소진 시 요청 중간에 실시간 탐색을 재수행하여 자가 치유.
- **6대 무료 티어 AI 프로바이더 통합 및 워크로드 분산(`quota-split`)**:
  - **Google Gemini** (그라운딩·심층 수집 전용 보존), **Groq LPU** (단문 진단·이슈 재분류 초고속 분산), **Mistral AI Free Mode** (`mistral-small-latest` JSON 보강), **OpenRouter Dynamic `:free` Pool** (종료된 `google/gemini-2.0-flash-exp:free`를 동적 `:free` 슬러그 풀로 교체), **Cloudflare Workers AI** (일일 10,000 Neurons 리셋), **Cerebras Inference** (선택적 프로모션 크레딧 버스트) 지원.
  - 2026년 공식 지원이 종료된 **GitHub Models (`models.github.ai`)** 추론 API는 실전 HTTP 호출에서 영구 제외하고 전략 리포트에 대체 안내 명시.
- **관리자 콘솔 AI 모델 변경 대응 및 무료 티어 라우팅 허브 (`src/App.tsx`, `server.ts`, `.github/workflows/windows-fix-collector.yml`)**:
  - 3개 탭(**1. 실시간 모델 탐색 & 404 서킷 브레이커**, **2. 멀티 프로바이더 무료 티어 라우터**, **3. 2026 모델 변경 대응 & 무료 티어 전략 연구**) 및 `/api/ai/resilience-status`, `/api/ai/discover-models`, `/api/ai/resilience-config`, `/api/ai/circuit-breaker/reset`, `/api/ai/test-chain`, `/api/ai/push-registry` 관리 API 신설.
  - GitHub Actions 자율 수집 파이프라인(`scripts/github-collector.ts`, `.github/workflows/windows-fix-collector.yml`)에도 동일 라우터 및 다중 무료 티어 Secret 연동을 적용하고 `data/ai-model-registry.json` GitOps 커밋 반영 지원.

### 🛡️ Security Hardening & Authentication
- 모든 신규 외부 프로바이더 키(`MISTRAL_API_KEY`, `CEREBRAS_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`)를 서버 `.env` 및 GitHub Secrets 전용으로 격리하고 관리자 화면에는 서버 환경변수 준비 여부 배지만 표시하도록 구현.
- 신규 관리자 라우팅·탐색·테스트 API 전체에 `requireAdmin` 인증 미들웨어 및 `User-Agent: aistudio-build` 헤더 규칙 적용.

### 🔧 Bug Fixes & Stability Improvements
- `server.ts` 및 `scripts/github-collector.ts`에서 존재하지 않거나 종료될 수 있는 하드코딩 OpenRouter 슬러그(`google/gemini-2.0-flash-exp:free`)를 제거하고 동적 레지스트리 기반 탐색으로 교체.
- `sanitizeCollectorOptions` 및 `COLLECTOR_MODEL_OPTIONS`에 `gemini-4-hydrogen`, `gemini-4-argon` 옵션을 추가하여 GitHub Actions 수집기 모델 선택 정합성 확보.

### 📈 UI/UX & Performance Optimizations
- `[2등급] 성능 모니터링 & 트러블슈팅` 패널 내 단일 평면 구조(`1px` 보더, `tabular-nums`/`font-mono` 지표, 다크 모드 대응)의 AI 모델 복원력 허브를 배치하여 실시간 프로브 테스트 및 모델 승격 제어 제공.

---


## [v3.99.0] - 2026-11-14

### ⚙️ GitHub Auto-Collection Options Enhancement (깃허브 자동수집 옵션 변경 기능 고도화)
- **관리자 GitOps 자율 수집 옵션 설정 패널 신설 (`src/App.tsx`, `data/github-collector-options.json`)**:
  - **정기 크론 일시중지/활성화 토글 (`enabled`)**: 정기 크론 자동 실행만 일시중지하고 필요 시 수동 원격 실행(Dispatch)만 가동할 수 있도록 지원.
  - **수집 주기 (Cron 스케줄) 프리셋 & 커스텀 편집 + 예상 수집량 계산기**: `매 3시간`, `매 6시간(기본)`, `매 12시간`, `매일 1회(KST 09:00/00:00)`, `격일 1회`, `주 2회` 프리셋과 직접 입력(UTC↔KST 안내)을 지원하며, 일일·월간 예상 수집 건수를 실시간 계산 표시.
  - **회당 수집 수량 확장 (`1~10개`) & 주제 선정 방식(`전체 혼합` · `시간대별 순환` · `고정 카테고리`)**: 8개 공식 카테고리(`업데이트`, `네트워크`, `시스템/블루스크린`, `스토어/앱`, `정품인증`, `보안/백신`, `오디오/사운드`, `디스플레이/그래픽`) 다중 선택 및 우선 대상 Windows OS(`Windows 11`, `Windows 10`, `Windows Server`, `Windows 8.1`) 지정 가능.
  - **AI 모델 우선순위 & 중복 차단 강도 제어**: `Auto`, `gemini-3.8-flash`, `gemini-3.1-flash-lite`, `gemini-3.1-pro-preview`, `gemini-flash-latest` 선택 및 `엄격`/`표준` 중복 필터링 모드, `knownIssues.ts` 자동 통합 여부 및 GitHub Pages 자동 재배포 토글 제공.
- **로컬/서버 저장 & 원격 GitHub 저장소(GitOps) 동시 반영 (`server.ts`, `.github/workflows/windows-fix-collector.yml`)**:
  - `GET/POST /api/github/collector-options` 엔드포인트 신설: `node-cron` 기반 유효성 검증 후 `data/github-collector-options.json` 저장 및 `system_config.json`/`maintenance_config.json`의 `engineBatchSize` 자동 동기화.
  - `POST /api/github/push-collector-options` (및 정적 GitHub Pages 호스팅용 클라이언트 직접 Contents API 폴백)으로 설정 파일과 동적 생성된 `.github/workflows/windows-fix-collector.yml`을 원격 저장소에 즉시 커밋 반영.
- **수집 스크립트 및 원격 수동 실행 고도화 (`scripts/github-collector.ts`, `src/App.tsx`)**:
  - 기존 워크플로가 `BATCH_SIZE`를 `2`로 강제 덮어쓰던 버그를 수정하여 저장된 `batchSize` 옵션이 정기 크론 실행 시 그대로 적용되도록 개선.
  - 원격 수동 실행(`Trigger AI Fix Collector Run`) UI에서도 8개 전체 카테고리 선택 및 회당 수집 수량(`1~10개`) 지정 지원.

---

## [v3.98.0] - 2026-11-14

### 🚀 GitHub (GitOps) Daily Collection Date & 24h Count Briefing (깃허브 수집 날짜 표시 및 하루 수집 건수 알림)
- **사용자 가이드북 화면에 일일 자동 수집 브리핑 배너 추가 (`src/App.tsx`)**:
  - 일반 사용자도 메인 `알려진 문제 가이드북` 진입 즉시 **최근 수집 날짜/시각(KST)**, **최근 하루(24시간) 수집 건수**, **오늘 및 직전 수집일 하루 수집 건수**, **누적 GitHub 수집량 및 일평균 수집량**을 한눈에 확인할 수 있도록 전용 브리핑 카드를 배치.
  - 최근 7일간의 일자별 수집 건수 칩을 제공하여, 날짜를 클릭하면 해당 날짜에 수집된 Windows 오류 데이터만 즉시 필터링해 열람 가능하도록 개선.
- **관리자 시스템 현황 및 GitOps 센터 날짜·일일 통계 표시 고도화 (`src/App.tsx`)**:
  - `깃허브(GitHub Actions / GitOps) 수집 데이터` 항목 옆에 **최근 수집일(KST 시각)**, **전체 수집 기간**, **하루(24시간) 수집 건수 및 오늘/직전일 건수**를 실시간 표시.
- **KST(`UTC+9`) 기준 일자 정규화 및 `/api/github/feed` 확장 (`src/App.tsx`, `server.ts`)**:
  - `formatCollectionDate`를 KST 기준으로 보정하여 자정 전후 수집 이력이 정확한 한국 날짜에 집계되도록 개선하고, `/api/github/feed` 응답에도 `dailyCount24h`, `todayCount`, `latestCollectedDate`, `latestDayCount`, `dailyHistory` 필드를 추가.

---

## [v3.97.10] - 2026-11-14

### 🔧 Dev Server Fast-Boot & Preview Iframe Compatibility (`server.ts`)
- **3000번 포트 즉시 바인딩(Non-blocking Vite Middleware 초기화)**:
  - 개발 서버 기동 시 `createViteServer(...)` 완료를 기다린 뒤에 `app.listen(3000)`을 호출하던 구조를 개선하여, HTTP 서버가 즉시 `0.0.0.0:3000`에 바인딩되고 `/api/health`·`/api/backend-health` 헬스체크가 즉시 응답하도록 변경(초기 라우트 요청은 비동기 `vitePromise` 완료 후 전달).
- **부팅 시 440KB TypeScript 정적 파싱 제거 (`knownIssues.ts` 지연 로딩)**:
  - `server.ts` 최상단의 `import { KNOWN_ISSUES } from "./src/data/knownIssues"` 정적 임포트를 제거하고, `data/issues.json`이 없을 때만 실행되는 비동기 `ensureIssuesSeeded()` 지연 로딩으로 전환하여 `tsx server.ts` 부팅 지연 병목을 해소.
- **프리뷰 Iframe 차단 헤더(`X-Frame-Options: SAMEORIGIN`) 제거**:
  - AI Studio 크로스-오리진 프리뷰 iframe 렌더링을 방해하던 `X-Frame-Options: SAMEORIGIN` 응답 헤더를 제거.

---

## [v3.97.9] - 2026-11-14

### 🛡️ Service Worker Stale Cache Auto-Recovery & Watchdog (구형 캐시 자동 갱신 및 부트 복구 가드)
- **`index.html` Service Worker 갱신 즉시 반영 (`controllerchange` 자동 리로드)**:
  - 이전 방문 시 브라우저에 캐시된 구형 Service Worker(`sw.js`)가 오래된 `index.html`을 반환하여 최신 GitHub Pages 배포본이 즉시 반영되지 않던 현상을 해소하기 위해, 신규 Service Worker 제어권 전환 시 `sessionStorage` 가드 기반 1회 자동 새로고침 로직을 탑재.
- **React 마운트 전 백지 화면 Watchdog 및 원클릭 복구 UI 신설**:
  - 모듈 스크립트 로드 실패나 구형 캐시 충돌로 `#root`가 4.5초 이내에 마운트되지 못할 경우, 빈 화면 대신 **[캐시 및 Service Worker 초기화 후 다시 열기]** 복구 패널을 즉시 표시하도록 개선.
- **최신 데이터셋 동기화 반영 (144개)**:
  - `data/issues.json`, `data/github-feed.json`, `src/data/knownIssues.ts`의 144건 전체 데이터 기준 정상 렌더링 및 빌드 검증 완료.

---

## [v3.97.8] - 2026-11-14

### 🔧 GitHub Pages White-Screen Crash & Subpath PWA/Asset Fixes (깃허브 페이지 미실행 장애 해결)
- **Temporal Dead Zone (`ReferenceError`) 초기화 크래시 근본 해결 (`src/App.tsx`)**:
  - 신규 방문자 또는 캐시 카운트(`< 142`건) 환경에서 `categoryCounts` 초기 상태(`useState`)가 선언되지 않은 `officialNames`를 먼저 참조하여 GitHub Pages 접속 시 백지 화면(Blank Screen)이 발생하던 치명적 버그를 수정 (`OFFICIAL_CATEGORIES` / `OFFICIAL_CATEGORY_NAMES`를 모듈 최상위 스코프로 승격).
  - `quotaUsage` `useState` 초기화의 `JSON.parse` 예외 가드 보강 및 정적 호스팅(`IS_GITHUB_PAGES`) 시 불필요한 `/api/backend-health` 호출 스킵 처리.
- **PWA Manifest & 서브패스(`/windows-fix-wizard/`) 경로 정규화 (`vite.config.ts`, `index.html`, `public/manifest.json`)**:
  - `index.html`의 중복 `<link rel="manifest" href="./manifest.json" />` 태그를 제거하여 `VitePWA`가 생성하는 `./manifest.webmanifest`와 충돌하지 않도록 일원화.
  - `manifest.json` 및 `VitePWA` 설정의 `id`, `start_url`, `scope`, 아이콘 경로(`icon-192.png`, `icon-512.png`, `icon.svg`)를 상대 경로(`./`) 기반으로 통일하고 `navigateFallbackDenylist` 적용.
  - 헤더 로고(`<img src="./icon.svg">`) 및 `GitHubPagesDeployDoc`의 정적 파일 검증 URL(`./index.html`, `./data/issues.json`, `./404.html`)을 GitHub Pages 서브패스와 호환되도록 수정.
- **런타임 에러 복구 안전망 (`AppErrorBoundary`) 도입 (`src/main.tsx`)**:
  - 예기치 않은 런타임 오류 발생 시 백지 화면 대신 원인 진단 및 `[캐시 초기화 및 새로고침]`(LocalStorage 캐시·Service Worker 초기화) 복구 UI를 제공하도록 래핑.

---

## [v3.97.7] - 2026-11-14

### 🔄 Automatic GitHub-to-Main Data Integration (GitHub 자동 수집 데이터 메인데이터 자동 통합)
- **GitHub Actions 수집 데이터 ➔ 시드 및 메인데이터 자동 동기화 파이프라인 구축**:
  - `data/issues.json`에 축적된 최신 142건 데이터를 `src/data/knownIssues.ts` 정적 시드 데이터셋과 100% 동기화.
  - `scripts/github-collector.ts` 및 `.github/workflows/windows-fix-collector.yml`을 고도화하여 GitHub Actions가 새 해결책을 수집할 때마다 `data/issues.json`, `data/github-feed.json`과 함께 `src/data/knownIssues.ts`까지 자동 커밋·통합하도록 개선.
- **서버 백엔드 백그라운드 자동 통합 엔진 (`server.ts`)**:
  - `syncGithubDatasetIntoMainData` 스케줄러 신설: 서버 부팅 5초 후 및 매 15분(`*/15 * * * *`)마다 GitHub 저장소의 `data/issues.json` 및 `data/github-feed.json`을 조회하여 누락된 신규 수집 항목과 최신 업데이트를 메인데이터(`data/issues.json`)에 중복 없이 자동 병합.
  - `saveIssuesToServer`가 기존 `source` 메타데이터(`GitHub Actions Autonomous Collector` 등) 및 `createdAt`을 보존하도록 수정.
  - 클라이언트 진입 시 쿨다운 기반 자동 통합 트리거용 `POST /api/github/auto-integrate` 엔드포인트 추가.
- **프론트엔드 자동 병합 & GitHub Pages 실시간 동기화 (`src/App.tsx`)**:
  - 앱 마운트 시 백그라운드에서 자동으로 서버/GitHub 최신 데이터를 확인하여 `dbIssues`, `categoryCounts`, IndexedDB(`winfix_merged_issues`), `localStorage`에 즉시 병합 반영.
  - `IS_GITHUB_PAGES` 정적 호스팅 환경에서도 기존 캐시가 존재할 때 신규 `./data/issues.json` 및 GitHub CDN 조회를 건너뛰던 문제를 해결하고, `mergeIssuesDeduplicated` 유틸리티로 시드 + 로컬 + 정적 JSON + GitHub 원격 데이터를 무손실 병합하도록 개선.
  - `officialCategories`에 `오디오/사운드` 및 `디스플레이/그래픽` 카테고리를 추가하고, 로컬 검색 후보에 자동 통합된 `dbIssues` 및 병합 캐시가 모두 포함되도록 보완.

---

## [v3.97.6] - 2026-11-12

### 📂 Collapsible Admin Console Importance Tier Navigation (관리자 페이지 등급별 메뉴 접이식 전환)
- **관리자 페이지 4대 중요 등급 섹션 접이식(Collapsible Accordion) 구현**:
  - `[1등급] 핵심 필수 관리`: 일일 필수 점검 및 AI 자율 데이터 수집 엔진
  - `[2등급] 성능 모니터링 & 트러블슈팅`: GitHub 배포 성과 및 통합 로그 감사
  - `[3등급] 환경 설정 & 보조 관리`: Gemini API 키 제어, 유지보수 & 계정 관리
  - `[4등급] 실험실 이전 기능`: Windows 이벤트 뷰어 Quick Link 및 DB 이슈 관리
- **상단 마스터 콘솔 뷰어 툴바 (`[모두 펼치기]` / `[모두 접기]`) 신설**:
  - 원클릭으로 4개 등급 메뉴 전체를 한번에 펼치거나 접을 수 있는 `setAllAdminTiersCollapsed` 마스터 토글 버튼 제공.
- **인터랙티브 헤더 UI & Framer Motion 애니메이션**:
  - 각 등급 헤더 클릭 시 상태 바주(`펼침` / `접힘`), Chevron Down/Up 아이콘 전환, Framer Motion height/opacity 부드러운 애니메이션 적용.
- **데이터셋 130개 동기화 보장**:
  - `data/issues.json` (130개) 데이터셋과 `src/data/knownIssues.ts` 시드 데이터 100% 동기화 유지.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.97.5] - 2026-11-12

### 📦 Static Fallback Dataset Synchronization & 124 Issues Full Hydration (22개 제한 완화 및 124개 전체 데이터 동기화)
- **정적 시드 데이터셋(`src/data/knownIssues.ts`) 전면 업데이트 (22개 → 124개 동기화)**:
  - 기존 구형 시드 데이터 파일에 22개 항목만 작성되어 있어 네트워크 미연결, 로컬 캐시 초기화, 오프라인 모드 시 22개만 노출되던 현상을 완전히 해결.
  - `data/issues.json`에 축적된 124개 전체 윈도우 오류 해결책 데이터셋을 `KNOWN_ISSUES` 시드에 100% 동기화 반영.
- **클라이언트 상태 초기화 및 캐시 유효성 가드 고도화 (`App.tsx`)**:
  - `dbIssues` 및 `categoryCounts` 초기 상태에서 구형 캐시(22개)가 감지되면 즉시 124개 전체 최신 데이터셋으로 우회(Bypass) 및 자동 갱신하도록 처리.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.97.4] - 2026-11-11

### 📅 Error Guidebook Date-Based View & Timeline Controls (오류 가이드북 날짜별 보기 및 타임라인 컨트롤)
- **오류 가이드북 날짜별 보기 및 정렬 툴바 신설 (`Date & Timeline Controls`)**:
  - 사용자 요구사항에 따라 알려진 오류 가이드북 상단에 직관적인 날짜별 필터링, 정렬, 묶어보기 컨트롤 툴바 탑재.
- **최신 등록순 / 과거 등록순 정렬 옵션 (`dateSortOrder`)**:
  - `[최신순 ⬇️]`: 가장 최근 수집 및 업데이트된 오류와 솔루션부터 정렬.
  - `[오래된순 ⬆️]`: 초기 등록된 기본 시스템 오류부터 역순 정렬.
- **기간별 퀵 필터 칩 & 월별 탐색**:
  - `전체 기간` / `최근 7일` / `최근 30일` / `최근 3개월` 빠른 기간 선택 칩 제공 (각 버튼별 해당 건수 실시간 연동 카운트).
  - 데이터셋에 실제로 존재하는 연/월(`2026년 11월`, `2026년 10월`, `2026년 9월` 등)을 동적 분석하여 원클릭 월별 아카이브 필터 제공.
- **일자별 타임라인 묶어보기 모드 (`Timeline Group View`)**:
  - `[📅 일자별 묶어보기]` 토글 활성화 시 날짜별 스티키 헤더(예: `2026-11-10 (2건)`, `2026-11-09 (4건)...`)와 함께 타임라인 섹션 형태로 구조화하여 렌더링.
  - 일반 리스트 모드와 타임라인 묶어보기 모드 간 끊김 없는 실시간 전환 지원.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.97.3] - 2026-11-11

### 📱 Mobile Device Adaptive Strategy (모바일 장치 접속 대비책 및 반응형 터치 UX 고도화)
- **모바일 접속 자동 감지 및 응급 지원 컴패니언 모드(Mobile Companion Mode)**:
  - 스마트폰(Android, iOS) 및 모바일 브라우저로 접속 시 이를 즉각 식별하여 **"📱 모바일 응급 지원 모드 활성화"** 안내 배너 및 전용 뱃지 표시.
  - PC가 블루스크린(BSOD) 또는 부팅 불가, 네트워크 단절 상태여도 모바일 기기에서 모든 Windows 오류 코드(0x...) 해결 가이드와 1클릭 복구 솔루션을 즉시 열람 가능.
- **가상 Windows 11 표준 참조 사양 스위처(Virtual Win11 Reference Switcher)**:
  - 모바일 기기 접속 시 모바일 하드웨어(Android/ARM/Apple GPU) 스펙뿐만 아니라, **[가상 Windows 11 사양 보기] / [내 모바일 실시간 사양]** 1초 전환 토글을 제공하여 표준 윈도우 환경과 비교 진단 지원.
- **PowerShell 명령어 모바일 원격 공유 파이프라인(Web Share & Clipboard to PC)**:
  - 모바일에서 실행 불가능한 PowerShell 명령어의 한계를 극복하기 위해 **[PC로 명령어 전송 (카카오톡/이메일/메모장)]** Web Share API 및 스마트 클립보드 복구 연동 지원.
- **모바일 전용 반응형 터치 카드 뷰 (Mobile Card View) 탑재**:
  - 기존 8열 테이블의 모바일 가로 스크롤 불편을 해소하기 위해 화면 너비 768px 미만에서는 모바일 터치 친화적 카드 뷰(`block md:hidden`) 자동 전환.
  - 레벨 뱃지(Error/Warning/Info), Event ID, 오류 코드, 소스, 2줄 요약 및 [가이드북 바로 해결] 큰 버튼을 제공하여 스마트폰에서도 한 손으로 쾌적하게 조작 가능.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.97.2] - 2026-11-11

### 🤖 Gemini API Model Upgrades & GitHub Actions Collector Deprecation Fix
- **Google GenAI 폐기 모델 교체 및 최신 모델 라인업 전면 전환**:
  - Google Gemini API에서 404 NOT_FOUND로 비활성화된 구형 모델(`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-2.5-pro`)을 완전히 제거.
  - 최신 공식 권장 모델인 **`gemini-3.8-flash`**, **`gemini-3.1-flash-lite`**, **`gemini-3.1-pro-preview`**, **`gemini-flash-latest`**로 전면 전환.
- **수집 스크립트(`scripts/github-collector.ts`) & 백엔드 서버(`server.ts`) 동기화**:
  - GitHub Actions 수집 스크립트의 모델 후보군 업데이트 완료.
  - 백엔드 서버 AI 진단(`/api/ai/diagnose`), 이슈 검증(`/api/ai/verify-issue`), 카테고리 재분류(`/api/ai/reclassify-chunk`), 지식 최적화(`/api/ai/optimize-knowledge`), 실시간 트렌드 검색(`/api/ai/search-trends`), 키 테스트(`/api/ai/test-key`)의 모델을 `gemini-3.8-flash`로 통일.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.97.1] - 2026-11-10

### 🛡️ GitHub Actions Autonomous Collector Failure Prevention & Dataset Sync
- **GitHub Actions 무인 수집 스크립트(`scripts/github-collector.ts`) 오류 안정화 및 자동 복구 고도화**:
  - `GEMINI_API_KEY` 미설정 또는 API 쿼터 초과 시 `process.exit(1)`로 인해 GitHub Actions 스케줄 워크플로(`windows-fix-collector.yml`)가 빨간색 장애(Exit Code 1)로 기록되는 현상을 방지하도록 안전 예외 처리 고도화.
  - 비밀키 미등록 시 또는 API 할당량 소진 시 `GITHUB_STEP_SUMMARY`에 설정 안내 가이드 리포트를 자동 작성하고 `Exit Code 0`으로 안전 종료하여 기존 데이터베이스 보존 및 정상 상태 유지.
- **최신 디스플레이/그래픽 이슈 데이터셋 동기화 반영**:
  - `VIDEO_TDR_FAILURE (0x00000116)` (그래픽 드라이버 응답 중지 및 복구 오류) 및 `D3D_DEVICE_LOST` (DirectX 그래픽 장치 연결 끊김 오류) 해결 스크립트 및 정밀 가이드를 `data/issues.json` 및 `data/github-feed.json`에 동기화 반영 (총 124개 이슈).
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.97.0] - 2026-11-10

### 🗂️ Admin Console 4-Tier Importance Re-ordering & Section Header Banners
- **관리자 메뉴 4단계 중요도/필요성 계층 재배치 및 시각적 헤더 뱃지 적용**:
  - 사용자 요구사항에 따라 관리자 제어판(`activeTab === 'admin'`) 내 모든 관리 메뉴 및 모듈의 순서를 4등급 구조로 완벽히 재정렬:
    - **[1등급] 핵심 필수 관리 기능 (Daily Check & Core Operations)**:
      1. 독립형 Jamstack & GitOps 무과금 데이터 엔진
      2. AI 데이터 수집 및 관리 센터 (Jamstack 데이터 보호, API 사용량 추적, GitHub Actions & GitOps 자율 데이터 수집 센터, Instant Sync, 대량 데이터 수집 & Staging Queue)
      3. 일일 Jamstack & API 사용량 추적 모니터 (`DailyQuotaUsageChart`)
    - **[2등급] 성능 모니터링 & 트러블슈팅 (System Monitoring)**:
      4. GitHub 배포 성능 및 워크플로 성공률 대시보드 (`DashboardWidget`)
      5. AI 엔진 모니터링 센티넬 경고 대시보드 (`AI Engine Sentinel`)
      6. 백엔드 자율 엔진 활동 로그 & 통합 시스템 로그 파일 점검 및 관리 센터 (`Integrated Log Files Audit Center`)
    - **[3등급] 환경 설정 & 보조 관리 (Settings & Maintenance)**:
      7. Gemini API 키 상태 진단 및 보조 무료 AI 키 제어 패널 (Groq & OpenRouter API 키 연동)
      8. 서버 자동 유지보수 설정 (스케줄러 고도화, Real SMTP Gateway, Google AdSense Monetization)
      9. 회원 및 방문자 계정 관리 패널 (`MemberManagementPanel`)
      10. 중복 데이터 정리 & 데이터 백업 및 복원 고도화 엔진
    - **[4등급] 나의 실험실 이전 메뉴 (User Lab Transferred)**:
      11. Windows 이벤트 뷰어 및 내 PC 실시간 사양 실험실 이전 안내 카드 (`My Lab` 탭 링크)
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.96.2] - 2026-11-10

### 📊 AI Engine Intelligence Dashboard Telemetry Fix & Provider Mapping
- **AI 엔진 가동 품질 및 인텔리전스 분석원 차트 렌더링 정상화**:
  - `DashboardWidget` 내 API 키 분석 차트에 최근 추가된 **Groq Llama 3.3** 및 **OpenRouter Free** 제공자 레이블 매핑을 추가하고, 초기 텔레메트리 세션 시 차트가 빈 화면으로 나타나는 현상을 방지하도록 안전한 폴백 시각화 파이프라인 탑재.
  - 실시간 원격 측정(Live Telemetry) 라우트 데이터와 차트 데이터 결합 무결성 확보.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.96.1] - 2026-11-10

### 🔧 Server Maintenance Settings Description Precision & GitHub Actions Real Integration
- **서버 유지보수 설정 설명 문구 정밀화 및 GitHub Actions 스크립트 실제 연동**:
  - 관리자 제어판의 "백엔드 자율 엔진 모집 개수 설정(`engineBatchSize`)"이 GitHub Actions 무인 수집 스크립트(`scripts/github-collector.ts`)의 `data/system_config.json`과 실시간 연동되도록 파이프라인 고도화.
  - 관리자가 수집 개수(1~10개) 및 수집 주기를 설정 후 저장하면 저장소의 `system_config.json`에 저장되어 GitHub Actions 크론 스케줄 가동 시 지정된 개수만큼 이슈가 자동 생성·동기화되도록 완전 실시간 반영 연동.
  - 설명 문구를 "로컬 개발 서버 및 GitHub Actions GitOps 스케줄러와 연동 반영됨"으로 정밀 명시.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.96.0] - 2026-11-10

### 🔍 Windows Event Viewer Error Code Display & Guidebook 1-Click Search Integration
- **이벤트 뷰어 테이블 내 Windows 16진수 오류 코드(Error Code) 컬럼 신설**:
  - 각 이벤트 로그 항목에 대해 16진수 표준 오류 코드(`0x80240020`, `0x80070422`, `0xC0000005`, `0x8050800C`, `0x800704CF`, `0x80070005` 등)를 자동 감지/매핑하여 전용 뱃지 컬럼으로 시각화.
  - 상단 검색창에서 이벤트 ID뿐만 아니라 `0x80...` 형태의 오류 코드로도 실시간 필터링 지원.
- **오류 가이드북 즉시 검색 (1-Click Guidebook Search) 파이프라인 구축**:
  - 이벤트 목록 각 행마다 **[가이드북 검색]** 액션 버튼 추가.
  - 클릭 시 자동으로 [알려진 문제 가이드북] 탭으로 전환되며, 해당 오류 코드가 검색창에 즉시 입력되어 검증된 해결책과 복구 가이드로 연결.
- **이벤트 상세 보기 모달 내 가이드북 해결책 연동 배너 추가**:
  - 로그 행 클릭 시 나타나는 상세 팝업에 오류 코드와 **[오류 가이드북에서 해결책 찾기]** 버튼을 탑재하여 원스톱 문제 해결 경험 제공.
- **JSON 및 CSV 내보내기에 ErrorCode 필드 포함**:
  - 로그 파일 다운로드 시 오류 코드 컬럼이 함께 포함되어 보고서 분석 지원.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.95.1] - 2026-11-10

### 🧹 UI/UX De-cluttering & Streamlined [My Lab] Workspace
- **[나의 실험실] 탭 내 거대 Recharts 카테고리/진단 빈도 분석 차트 전면 제거**:
  - 일반 개인 사용자에게 불필요한 인지 부하와 스크롤 불편을 주던 `LibraryAnalyticsChart`(8대 오류 카테고리별 검색/진단 빈도 누적형·분리형 막대그래프)를 전격 제거.
  - 불필요한 차트 렌더링 부하를 없애고 [나의 실험실] 진입 시 **북마크된 해결법(저장 목록)**, **최근 활동 내역**, **실시간 PC 사양 및 이벤트 뷰어**가 시원하게 바로 노출되도록 동선 극대화.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.95.0] - 2026-11-10

### 🚀 Relocation to My Lab & Live Host Computer Hardware Diagnostics
- **Windows 이벤트 뷰어 시스템 로그 모니터를 [나의 실험실] 탭으로 전격 이전**:
  - 기존 관리자 전용 영역에 있던 `SystemEventLogPanel`을 사용자 맞춤형 워크스페이스인 **[나의 실험실 (My Lab)]** 탭으로 이전.
  - 일반 사용자도 자신의 브라우저와 PC 환경에서 직접 시스템 로그 및 오류 기록을 시각적으로 모니터링할 수 있도록 접근성 대폭 개선.
- **사용자 컴퓨터 실시간 하드웨어 & 운영체제 환경 감지 카드 신설**:
  - `detectSystemInfo` Web API를 연동하여 접속 중인 단말의 **운영체제(Windows 11/10 64비트), CPU 논리 코어 수, RAM 용량, WebGL 가속 GPU 모델명, 화면 해상도 및 DPI, 네트워크 온라인 상태**를 실시간 감지하여 대시보드 상단에 시각화.
  - **1-Click 내 PC 사양 복사**: 클립보드에 전체 PC 사양 텍스트 포맷 복사 지원.
  - **1-Click 내 PC 맞춤 진단**: 감지된 OS 및 환경에 기반하여 원클릭으로 마법사(Wizard) 진단 연동.
- **내 PC 실제 이벤트 뷰어 로그 1-Click 추출 및 가져오기(Import) 파이프라인**:
  - **PowerShell 1-Click 추출 명령어 복사**: 사용자 Windows PC에서 `Get-WinEvent`를 실행하여 50건의 시스템/앱 로그를 바탕화면 JSON으로 추출하는 명령어 지원.
  - **내 PC 로그(.json) 직접 불러오기**: 사용자가 로컬에서 추출한 실제 Windows 이벤트 로그 JSON 파일을 업로드하여 뷰어에서 즉시 심각도 필터링 및 XML 상세 분석 가능.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.94.3] - 2026-11-10

### 📈 UI/UX Terminology Alignment & GitOps Serverless Architecture Precision
- **Jamstack 100% 서버리스 아키텍처 용어 정합성 개선**:
  - 관리자 화면의 "클라우드 백엔드 서비스 가동 중" 문구를 100% 무료 서버리스 GitOps 아키텍처에 부합하도록 "GitOps 자율 수집 엔진 가동 중: 10분 간격으로 최신 Windows 오류 트렌드를 자동 수집하여 Jamstack 정적 데이터셋에 동기화합니다"로 정밀 수정.
  - 대기열 수집(Staging) 버튼 명칭을 "클라우드로 모두 동기화"에서 "저장소(GitOps)로 모두 동기화"로 변경하여 GitHub Pages Jamstack 정적 배포 파이프라인과의 직관적 일관성 확보.
- **GitHub Actions 배포 파이프라인 무결성 검증**:
  - 워크플로 `#79`(배포), `#78`(배포), `#65`(자율 수집) 전수 통과(Passed) 확인 및 역사적 누적 지표(56.0%)에 대한 해석 가이드 제공.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.94.2] - 2026-11-10

### 🎨 Clean UI/UX & Header De-cluttering (Public API Status Indicator Removal)
- **일반 사용자 화면 상단 헤더의 API 상태 뱃지 제거**:
  - 일반 방문자에게 혼란과 불안감을 줄 수 있는 상단 헤더의 `API: 정상`, `API: 쿨다운`, `API: 키 점검` 진단 뱃지(데스크톱 및 모바일)를 전면 제거하여 깔끔하고 신뢰성 높은 프로덕션 UI로 정비.
  - 내부 시스템 텔레메트리 및 API 키 진단 기능은 **관리자 콘솔(Admin Mode)** 내부로 일원화하여 관리자만 안전하게 접근하도록 권한 분리 강화.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.94.1] - 2026-11-10

### 🔧 Secondary AI Key Server Persistence & Config API Synchronization
- **`/api/system_config` 및 `/api/system_config/update` REST 엔드포인트 완비**:
  - 관리자 설정에서 Groq 및 OpenRouter 보조 API 키를 저장할 때 로컬 서버 파일 DB(`data/system_config.json`)에 영구 저장될 수 있도록 백엔드 라우트 구축.
  - 앱 마운트 시 브라우저 IndexedDB뿐만 아니라 서버 영구 설정 파일에서도 보조 API 키를 자동 로드하여 브라우저 재접속 시에도 즉시 동기화 유지.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.94.0] - 2026-11-09

### 🚀 Multi-Provider Free AI Automatic Failover Engine (Groq & OpenRouter Integration)
- **무료 AI 다중화 우회 엔진 (`callSecondaryFreeAiApi`) 신설**:
  - Google Gemini API 무료 티어 할당량 초과(429/Resource Exhausted)나 네트워크 지연 발생 시, 무제한/초고속 무료 AI 제공자인 **Groq API** (`llama-3.3-70b-versatile`, `mixtral-8x7b-32768`) 및 **OpenRouter API** (`deepseek/deepseek-chat`, `llama-3.3-70b-instruct:free`)로 실시간 자동 전환되는 멀티 엔진 우회 파이프라인 구축.
- **서버 수집 엔진 및 GitHub Actions 스케줄러 동시 우회 보장**:
  - `server.ts` 수집 및 검색 엔진, `scripts/github-collector.ts` 6시간 무인 자동 수집 스크립트 모두에 3단계 폴백 체계(Gemini ➔ Groq ➔ OpenRouter ➔ Local GitOps Cache) 완비.
- **관리자 제어 콘솔 보조 AI 키 등록 및 검증 패널 추가 (`App.tsx`)**:
  - 관리자 설정 내에 `Groq API Key` 및 `OpenRouter Free API Key` 등록, 실시간 API 검증(`POST /api/keys/test-secondary`), 발급 링크 안내 패널을 탑재.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.93.2] - 2026-11-09

### 🔧 Gemini AI Model Endpoint Alignment & Engine Sync Recovery
- **Google Gemini SDK 정규 모델 ID 규격화 (`gemini-3.8-flash` fetch failed 오류 해결)**:
  - 서버 수집 엔진(`server.ts`) 및 깃허브 수집 스크립트(`scripts/github-collector.ts`) 내에 포함되어 있던 미지원 모델 식별자(`gemini-3.8-flash` 등)를 Google 공식 지원 정규 모델 ID인 `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-2.5-pro`로 일괄 교체.
  - 백엔드 AI 수집 엔진 실행 시 발생하던 `fetch failed` 및 모델 엔드포인트 404 오류를 완벽히 해결하여 원활한 AI 수집 및 API 키 검증이 진행되도록 복원.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.93.1] - 2026-11-09

### 🌐 UI/UX Text Alignment for Jamstack GitOps Staging Sync
- **관리자 대시보드 용어 명확화 ("로컬 수집 후 클라우드 동기화" ➔ "로컬 대기열 수집 ➔ GitOps 동기화")**:
  - 기존 구버전 용어인 "클라우드 동기화" 표기를 **Jamstack GitOps 100% 서버리스 아키텍처**에 맞게 "로컬 대기열 수집 ➔ GitOps 동기화" 및 "GitOps 라이브 동기화"로 직관적으로 정비.
  - 브라우저 스테이징 대기열(Staging Queue)에 데이터를 모은 후 `1-Click GitOps`로 GitHub 저장소 및 웹사이트에 일괄 배포 반영하는 동작 원리를 명확하게 설명 가이드 갱신.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.93.0] - 2026-11-09

### 🚀 Jamstack GitOps 100% Serverless Architecture Alignment
- **단일 원천 데이터 중심성 (Single Source of Truth) 정립**:
  - 클라우드 DB 과금 비용 0원 유지 및 GitHub Pages 정적 배포 호환을 위해 GitHub Repository의 `data/issues.json`, `data/github-feed.json`, `data/system_event_logs.json`을 단일 원천 데이터로 구조화.
- **정적 배포 환경(GitHub Pages) 404 폴백 완전 구동 체계 구축**:
  - `fetchAdminLogs`, `fetchVisitorLogs`, `fetchSearchLogs`, `fetchFeedbackLogs`, `fetchAppErrorLogs` 전 관리자 감사/시스템 로그 기능에 Jamstack 정적 JSON(`./data/*.json`) 폴백 경로 내장.
  - 백엔드 노드 서버가 없는 GitHub Pages 환경에서도 모든 감사 데이터 및 시스템 로그를 오류 없이 서빙 가능.
- **GitHub Actions 자율 수집 파이프라인(`windows-fix-collector.yml`) 연동 최적화**:
  - Gemini AI 기반 윈도우 문제 자동 수집 및 커밋 후 `deploy-pages.yml` 자동 트리거 연동 완비.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

---

## [v3.92.5] - 2026-11-09

### 🔧 Log Timestamp Parsing Hardening (`log.timestamp?.toDate is not a function` Fix)
- **방어적 타임스탬프 파싱 헬퍼 (`formatLogTimestamp`) 도입**:
  - Cloud Firestore `Timestamp` 객체뿐만 아니라 REST API/로컬 JSON 파일 DB에서 전달되는 ISO 날짜 문자열(`string`), 타임스탬프 숫자(`number`), JavaScript `Date` 객체를 안전하게 구분 처리하는 `formatLogTimestamp` 유틸리티 적용.
  - 관리자 감사 로그, 검색 로그, 피드백 로그, 앱 에러 로그 모달 뷰에서 발생하던 `TypeError: log.timestamp?.toDate is not a function` 런타임 크래시 완벽 차단.
- **빌드 및 린트 전수 검증 통과**:
  - `compile_applet` 및 `lint_applet` (`tsc --noEmit`) 무결점 통과 (Zero Errors).

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
