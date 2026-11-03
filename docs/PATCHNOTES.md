# Patch Note - System Update (v3.63.0)

This document is synchronized with `/docs/PATCH_NOTE.md`.

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
