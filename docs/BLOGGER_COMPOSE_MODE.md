# 📝 구글 블로거 [작성 모드 (서식 있는 텍스트)] 전용 포스팅 문서 (v3.111.0)

> **안내**: 본 문서는 구글 블로거(Blogger / Blogspot)의 **[작성 모드 (서식 있는 텍스트)]** 에디터에 그대로 드래그하여 복사/붙여넣기(`Ctrl+C` → `Ctrl+V`)하여 바로 발행할 수 있도록 최적화된 서식 텍스트 포스팅 문서입니다.  
> 지정된 순서: **1.제목 → 2.본문 → 3.업데이트 → 4.앱 그림 → 5.다운로드 → 6.버전정보 → 7.시스템 요구 사항 → 8.제작자 및 공식 채널 안내 → 9.전체 업데이트 → 10.추천 태그**를 엄격히 준수합니다.

---

# [1. 제목]
[윈도우 오류 해결] 블루스크린·업데이트 오류 AI 4단계 마법사로 안전하게 자가치료하는 방법 (Windows Fix Wizard v3.111.0)

---

# [2. 본문]
Windows 11이나 Windows 10 PC를 업무, 학업, 게임으로 사용하다 보면 예고 없이 찾아오는 **블루스크린(BSOD)**, 멈추거나 실패하는 **윈도우 업데이트 오류(`0x80070005`, `0x800f081f`, `0x80240034` 등)**, **와이파이/네트워크 끊김**, **디스크 100% 점유율 및 프리징** 때문에 귀중한 시간과 작업 내용을 잃어버리곤 합니다.

인터넷 검색으로 찾은 오래된 블로그 글이나 출처 불명의 레지스트리 수정 명령어는 현재 Windows 빌드와 맞지 않거나 오히려 시스템을 손상시킬 위험이 큽니다. 더구나 일반 사용자는 에러 코드조차 뜨지 않는 애매한 증상 앞에서 무엇을 검색해야 할지조차 막막한 경우가 많습니다.

**Windows Fix Wizard (윈도우 문제 해결 마법사)**는 이러한 불안을 없애기 위해 설계된 100% 무료 무설치 웹 진단·자가치료 플랫폼입니다.

### 💡 왜 Windows Fix Wizard를 사용해야 할까요?
1. **증상 선택형 4단계 진단 마법사**: 오류 코드를 몰라도 **문제 영역 → 세부 증상·발생 시점 → Windows 11/10 환경·롤백 옵션 → 내장 DB 및 AI 복합 진단** 순서로 클릭 몇 번만으로 정확한 처방을 받습니다.
2. **복구 스크립트 사전 안전 검증 & 자동 롤백 래퍼**: 실행 전 AST 보안 분석과 17종 품질 린트(`Pre-Flight`)를 통과한 스크립트만 제공하며, **자동 롤백 옵션**을 켜면 실행 직전 `Checkpoint-Computer` 복원 지점과 수정 대상 레지스트리 백업(`Restore_Registry.cmd`)을 스크립트 상단에 자동으로 결합합니다.
3. **WebAssembly PowerShell 샌드박스 & 실행 기록 사이드바**: 내 PC에 스크립트를 바로 실행하기 전에 브라우저 격리 샌드박스에서 동작을 미리 시험해 보고, 성공한 진단 명령을 `localStorage` 실행 기록 사이드바에서 언제든 1-클릭 재실행·편집할 수 있습니다.
4. **Google Gemini AI 실시간 검색 그라운딩 & 무키 다중 폴백**: 최신 Windows 11(24H2/23H2)·Windows 10 패치 이슈까지 실시간 검색 그라운딩과 다중 무료 AI 폴백 라우터로 끊김 없이 진단합니다.
5. **160+ 공인 데이터베이스 & 3시간 주기 GitOps 자율 수집**: 검증된 내장 가이드북과 3시간마다 자동 업데이트되는 GitHub Actions 기반 해결책 피드를 IndexedDB 오프라인 캐시로 빠르게 검색할 수 있습니다.
6. **100% 무료 무설치 오픈소스 웹 앱**: 별도 설치나 클라우드 DB 과금 없이 브라우저에서 즉시 사용 가능하며, 바탕화면 바로가기 및 PWA 앱 설치도 지원합니다.

---

# [3. 업데이트]
### 🚀 이번 v3.111.0 최신 버전 주요 업데이트 안내
- **증상 선택형 4단계 진단 마법사 (`SymptomDiagnosticWizard`) 탑재**: 문제 영역(Windows Update · 네트워크 · 부팅/BSOD · 성능/디스크 · 하드웨어/드라이버 · 보안/앱) 선택부터 세부 증상·발생 시점·OS 환경 설정까지 단계별 퍼널 진단을 제공합니다.
- **Pre-Flight AST+린트 사전 안전 검증 & 자동 롤백 포인트 컴파일러 (`psRollback`) 적용**: 고위험 명령을 실행 전 단계에서 차단/경고하고, 복원 지점 생성 및 수정 대상 레지스트리 키 자동 백업·원클릭 복구 배치(`Restore_Registry.cmd`)를 자동으로 감싸 안전성을 높였습니다.
- **PowerShell 샌드박스 '실행 기록(Execution History)' 사이드바 신설**: 전체 스크립트와 `PS>` 단문 진단 명령 실행 이력을 최대 30건까지 자동 저장하며 실시간 검색·필터·원클릭 재실행·편집기 불러오기를 지원합니다.
- **깨진 참고 링크 자동 탐지 & 공식 Microsoft URL 자가 치유**: `404/410` 등 끊어진 참고 문서를 자동 검출하고, Google Search Grounding과 Microsoft 공식 도메인(`learn.microsoft.com`, `support.microsoft.com`)·HTTP 200 실검증을 통해 최신 공식 URL로 교정합니다.
- **GitHub · GitHub Pages · AI Studio 3각 실시간 관제 & HMAC-SHA256 웹훅 완성**: 3시간 주기(`0 */3 * * *`)로 `Windows 11`, `Windows 10` 이슈를 집중 수집하고, 원시 바이트 HMAC-SHA256 서명 웹훅 및 4노드 실시간 헬스 모니터로 동기화 상태를 투명하게 추적합니다.
- **프론트엔드 번들·문서 경량화 (2026-11-26 최적화)**: 미사용 컴포넌트·중복 문서·미참조 정적 파일(약 2.1MB)·미사용 npm 패키지를 정리해 PWA 로딩 속도와 빌드 안정성을 높였습니다.

---

# [4. 앱 그림]
*(구글 블로거 [작성 모드]에서는 아래 레이아웃 목업을 그대로 사용하거나 실제 앱 스크린샷 이미지를 삽입하세요)*

```text
┌────────────────────────────────────────────────────────────────────────────┐
│  🛠️ Windows Fix Wizard                                   v3.111.0 [Online] │
├────────────────────────────────────────────────────────────────────────────┤
│  모드: [🎯 4단계 증상 진단 마법사]  |  [🔍 오류코드 · 🎤 음성 직접 검색]    │
│  Step 1 영역 선택 ─► Step 2 세부 증상 ─► Step 3 Win11/10·롤백 ─► Step 4 결과 │
├────────────────────────────────────────────────────────────────────────────┤
│  🔍 AI & 지식베이스 진단 결과         [🛡️ Pre-Flight 안전 통과] [Microsoft 공식]│
│  • 진단 원인: Windows Update 서비스 권한 결함 및 카탈로그 캐시 충돌          │
│  • 자동 롤백 + 복구 스크립트 (PowerShell 관리자 권한 실행):                 │
│    ┌────────────────────────────────────────────────────────────────────┐  │
│    │ Checkpoint-Computer -Description "WinFix_0x80070005" ...           │  │
│    │ DISM.exe /Online /Cleanup-image /Restorehealth                     │  │
│    │ sfc /scannow; net stop wuauserv; net start wuauserv                │  │
│    └────────────────────────────────────────────────────────────────────┘  │
│    [📋 안전 복사]  [⚡ 샌드박스 시험(실행기록)]  [⭐ 추천]  [📄 PDF 리포트] │
├────────────────────────────────────────────────────────────────────────────┤
│  📚 160+ 공인 가이드북 + 3시간 주기 GitOps 피드: [전체] [업데이트] [BSOD]   │
│  [네트워크] [성능/프리징] [파일시스템/SSD] [드라이버] [보안/스토어]         │
└────────────────────────────────────────────────────────────────────────────┘
```

> **주요 화면 구성**:
> - **1. 4단계 증상 진단 마법사**: 오류 코드를 몰라도 증상 칩을 골라 원인과 PowerShell 복구 스크립트를 즉시 도출합니다.
> - **2. Pre-Flight 안전 게이트 & 자동 롤백**: 실행 전 AST 위협·린트 점수를 검사하고 시스템 복원 지점 및 레지스트리 백업 래퍼를 자동 삽입합니다.
> - **3. PowerShell 샌드박스 & 실행 기록 사이드바**: 상하/좌우 분할 편집기에서 명령을 시뮬레이션하고 이전 실행 기록을 1-클릭으로 재실행합니다.
> - **4. 3각 연동 모니터 & 링크 복구 워크벤치**: GitHub · GitHub Pages · 프리뷰 동기화 상태와 공식 Microsoft 참고 링크 무결성을 실시간 검증합니다.

---

# [5. 다운로드]
별도의 프로그램 설치 없이 웹 브라우저에서 바로 실행하거나 바탕화면 바로가기·PWA 앱으로 등록해 사용할 수 있습니다:

- 🚀 **웹 브라우저에서 즉시 실행 (무설치 무료)**:  
  👉 [https://ahbiyout-all.github.io/windows-fix-wizard/](https://ahbiyout-all.github.io/windows-fix-wizard/)
- 💻 **공식 GitHub 최신 릴리즈 및 소스코드**:  
  👉 [https://github.com/AhBiYout-all/windows-fix-wizard](https://github.com/AhBiYout-all/windows-fix-wizard)
- 📌 **바탕화면 바로가기 및 PWA 설치**:  
  웹 서비스 접속 후 상단의 **[바탕화면 바로가기 만들기]** 또는 브라우저 주소창의 **앱 설치(PWA)** 버튼을 누르면 전용 아이콘으로 빠르게 실행할 수 있습니다.

---

# [6. 버전정보]
| 항목 | 사양 및 정보 |
| :--- | :--- |
| **소프트웨어 버전** | **v3.111.0 (Official Stable Release)** |
| **최신 업데이트 일자** | 2026년 11월 26일 (KST) |
| **소프트웨어 라이선스** | 오픈소스 (MIT License, 개인/기업 무료) |
| **기술 스택** | React 19, TypeScript, Express Node.js, Tailwind CSS v4, Motion |
| **AI 진단 엔진** | Google Gemini API (Search Grounding) + 다중 무료 AI 폴백 라우터 |
| **데이터 및 보안 아키텍처** | Zero Cloud DB (`data/*.json` + IndexedDB) + 비공개 저장소 AES-256-GCM 금고 |

---

# [7. 시스템 요구 사항]
| 구성 요소 | 최소 및 권장 사양 |
| :--- | :--- |
| **지원 운영체제** | Windows 11 (24H2, 23H2 등 전 빌드), Windows 10 |
| **지원 웹 브라우저** | Google Chrome, Microsoft Edge, Mozilla Firefox, Naver Whale, Safari 최신 버전 |
| **음성 인식 (STT)** | Chrome 또는 Edge 브라우저 (Web Speech API 지원) 권장 |
| **스크립트 실행 권한** | Windows PowerShell 관리자 권한 (`Run as Administrator`) |
| **오프라인 지원** | 최초 접속 후 160+ 내장 가이드북 및 IndexedDB 캐시 오프라인 검색 지원 |

---

# [8. 제작자 및 공식 채널 안내]
- 👤 **제작자 및 총괄 개발**: **AhBiYout** (GitHub: `@AhBiYout-all`)
- 🌐 **공식 구글 블로그**: [AhBiYout Vibe (https://ahbiyoutvibe.blogspot.com/)](https://ahbiyoutvibe.blogspot.com/)
- 💻 **공식 GitHub 저장소**: [https://github.com/AhBiYout-all/windows-fix-wizard](https://github.com/AhBiYout-all/windows-fix-wizard)
- 🏢 **공식 협력 네트워크**: [CISNet (https://www.cisnet.co.kr)](https://www.cisnet.co.kr)
- 📧 **기술 지원 및 문의**: [ahbiyoutwinfix@gmail.com](mailto:ahbiyoutwinfix@gmail.com)

---

# [9. 전체 업데이트]
*(Windows Fix Wizard `v3.0.0`부터 현재 `v3.111.0`까지의 **주요 기능 개선 히스토리**입니다)*

- **v3.111.0 (2026-11-26)**: 증상 선택형 4단계 진단 마법사(`SymptomDiagnosticWizard`) 신설, Pre-Flight AST+린트 사전 검증 및 자동 복원 지점·레지스트리 롤백 래퍼(`psRollback`) 도입, 깨진 참고 링크 자동 탐지 및 Microsoft 공식 URL 교정 워크벤치 구축, 3각 연동 실시간 모니터(`TriangleSyncMonitor`) 및 원시 바이트 HMAC-SHA256 웹훅 완성, `Windows 11 · Windows 10` 기본 수집 대상 집중 및 미사용 자산/의존성 경량화
- **v3.110.0 (2026-11-25)**: PowerShell 샌드박스 '실행 기록(Execution History)' 사이드바(`localStorage` 30건 영속화 · 재실행/편집) 추가, GitHub · Pages · 프리뷰 3각 연동 일괄 복구 및 Workbox `/data/*.json` `NetworkOnly` 무결성 적용
- **v3.109.0 (2026-11-21)**: 비공개 금고 일별 스냅샷·LKG 복원점·감사 로그 통합 보존 정책 모달 및 오프라인 지원 수동 긴급 AES-256-GCM 암호화 키 순환 기능 추가
- **v3.108.0 (2026-11-21)**: 비공개 저장소(`windows-fix-wizard-admin`) 통합 보안·스냅샷·헬스체크 운영 허브 구축 (시스템 설정/다중 AI 키 금고 분리, 일별 스냅샷 자동 회전, 월간 감사 로그 아카이빙)
- **v3.107.0 (2026-11-21)**: 비공개 저장소 전용 AES-256-GCM 암호화 회원 백업·복원(`winfix-admin-vault`) 및 로컬 `.enc.json` 오프라인 금고 내보내기/복구 지원
- **v3.106.0 ~ v3.106.15 (2026-11-21)**: 키리스 무료 폴백(`pollinations`) 및 보조 무료 AI 4종 추가 연동, 로컬 회원 직접 등록·수정 및 JSON 복구 파서 고도화
- **v3.105.0 (2026-11-16)**: 모듈러 카드 레이아웃 및 실시간 API 쿼터/캐시 차트 대시보드 구축, 동적 유지보수 자동 스케줄러 추가
- **v3.102.0 (2026-11-16)**: PowerShell 샌드박스 상하 2단 가변창(Stacked 2-Tier) 및 좌우 분할 레이아웃 모드 신설
- **v3.100.0 ~ v3.101.0 (2026-11-15)**: 적응형 AI 모델 복원력 라우터(`ai-resilience-router`) 및 엄지손가락 존(Thumb-Zone) 기반 모바일 하단 내비게이션 개편
- **v3.99.0 (2026-11-14)**: 관리자 GitOps 자율 수집 옵션 설정 패널(`github-collector-options.json`) 및 일일 수집 브리핑 배너 추가
- **v3.94.0 (2026-11-09)**: 다중 무료 AI 우회 엔진(`callSecondaryFreeAiApi`) 및 영구 로컬 회원 데이터베이스 신설
- **v3.90.0 (2026-11-08)**: Windows 이벤트 뷰어 시스템 로그 모니터 및 빠른 시스템 건강 진단 버튼(`QuickSystemScanUtility`) 탑재
- **v3.84.0 ~ v3.87.0 (2026-11-08)**: Cloud Firestore 완전 제거 및 100% Zero Cloud DB (`data/*.json` + Jamstack + IndexedDB) 아키텍처 전환 완료
- **v3.73.0 ~ v3.80.0 (2026-11-06)**: 브라우저 WebAssembly 격리 PowerShell 샌드박스, PrismJS 구문 강조, 스크립트 버전 히스토리, 규칙 기반 린터(`psLinter`) 및 시스템 복원 지점 유틸리티 구축
- **v3.68.0 ~ v3.69.0 (2026-11-05)**: 서버 프록시 기반 풀스택 Gemini AI 아키텍처 전환 및 진단 결과 인쇄용 PDF 리포트 생성 기능 추가
- **v3.50.0 ~ v3.54.0 (2026-11-01)**: GitHub Pages 정적 SPA 직접 연동, GitOps SSH/PAT 인증, 아티클 스크롤 읽기 진행률 바(`ReadingProgressBar`) 및 블로거 듀얼 모드 문서 체계 수립
- **v3.31.0 ~ v3.34.0 (2026-10-30)**: 고용량 IndexedDB 비동기 저장 엔진(`idbStorage.ts`) 도입, 하드웨어 부품별 다차원 필터링 및 백엔드 프록시 보안 개편
- **v3.15.0 ~ v3.26.0 (2026-10-24)**: PowerShell 위협 검증기, 다크/라이트 테마 전환, Web Speech API 음성 인식(STT) 및 GitHub Pages 무중단 SPA 배포 구성
- **v3.0.0 (2026-06-01)**: Google Gemini AI 기반 윈도우 블루스크린·시스템 오류 진단 및 PowerShell 자가치료 스크립트 생성 엔진 최초 출시

---

# [10. 추천 태그]
윈도우오류,블루스크린,윈도우11,윈도우10,업데이트오류,PowerShell,자가치료,AI진단,WindowsFix,BSOD,AhBiYout,GitOps,시스템복구,오류해결,Win11,Win10,WindowsRepair,Troubleshoot,스크립트,자가수리
