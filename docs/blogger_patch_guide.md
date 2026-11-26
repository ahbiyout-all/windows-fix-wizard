# 📝 Blogger Patch Guide (`blogger_patch_guide.md`)
# 구글 블로거 패치노트 및 릴리즈 포스팅 표준 가이드 (v3.111.0)

본 문서는 **Windows Fix Wizard (윈도우 문제 해결 마법사)** 서비스의 신규 버전 배포 시, 구글 블로거(Google Blogger / Blogspot)에 일관성 있고 표준화된 포스팅을 작성할 수 있도록 정의된 **공식 포스팅 템플릿 규격서**입니다.

이 문서는 **[1. 작성 모드 (Rich Text / 서식 있는 텍스트)]**와 **[2. HTML 편집 모드 (`<>`)]**를 모두 지원하도록 구성되어 있으며, 개별 복사용 문서는 [`BLOGGER_COMPOSE_MODE.md`](./BLOGGER_COMPOSE_MODE.md) 및 [`BLOGGER_HTML_MODE.md`](./BLOGGER_HTML_MODE.md)와 항상 동기화됩니다.

---

## 📌 블로그 포스팅 표준 10단계 구성 순서
구글 블로그 발행 시 반드시 아래의 10단계 순서를 지켜 작성합니다:
1. **Title** (제목)
2. **Body** (본문)
3. **Update Info** (업데이트 정보)
4. **App Screenshot Placeholder** (앱 그림 / 스크린샷 영역)
5. **Download Link** (다운로드 및 서비스 접속 링크)
6. **Version Info** (버전 정보)
7. **System Requirements** (시스템 요구 사항)
8. **Official Channels** (제작자 및 공식 채널 안내)
9. **Patch Notes (from latest commits)** (패치노트 - 최신 커밋 및 릴리즈 기능 개선 기록)
10. **Recommended Tags** (추천 태그 - 한글/영문 혼합 20개, 200자 이내)

---

## 🏷️ 추천 태그 (Recommended Tags) 규격
블로거 우측 `라벨(Labels)` 입력창에 그대로 복사하여 붙여넣습니다:
```text
윈도우오류,블루스크린,윈도우11,윈도우10,업데이트오류,PowerShell,자가치료,AI진단,WindowsFix,BSOD,AhBiYout,GitOps,시스템복구,오류해결,Win11,Win10,WindowsRepair,Troubleshoot,스크립트,자가수리
```
- **태그 수**: 정확히 20개 (한글 14개, 영문 6개)
- **총 글자 수**: 129자 (200글자 이내 제한 완벽 준수)

---

# 📑 PART 1: [작성 모드 (Rich Text / 서식 있는 텍스트)] 템플릿

> 구글 블로거 글 작성기의 **[작성 모드]** 화면에서 아래 내용을 그대로 드래그하여 복사(Ctrl+C) 후 붙여넣기(Ctrl+V) 하세요.

---

### [1. Title]
[윈도우 오류 해결] 블루스크린·업데이트 오류 AI 4단계 마법사로 안전하게 자가치료하는 방법 (Windows Fix Wizard v3.111.0)

---

### [2. Body]
Windows 11이나 Windows 10 PC를 사용하다 보면 누구나 한 번쯤 마주치게 되는 **블루스크린(BSOD)**, 원인을 알 수 없는 **윈도우 업데이트 실패(`0x80070005`, `0x800f081f`, `0x80240034` 등)**, **네트워크 및 Wi-Fi 연결 끊김**, **디스크 100% 점유율 및 프리징** 문제로 많은 시간과 작업 내용을 잃게 됩니다.

인터넷 검색으로 찾은 오래된 글이나 출처가 불분명한 레지스트리 수정 명령어는 현재 Windows 빌드와 맞지 않거나 초보자가 따라 하다가 오히려 시스템을 손상시킬 위험이 큽니다.

**Windows Fix Wizard (윈도우 문제 해결 마법사)**는 오류 코드를 모르는 사용자도 **증상 선택형 4단계 진단 마법사**로 원인을 짚어내고, **Pre-Flight AST+린트 사전 안전 검증**과 **자동 복원 지점·레지스트리 롤백 백업 래퍼**가 결합된 PowerShell 자가치료 스크립트를 100% 무료 무설치로 제공합니다.

---

### [3. Update Info]
- **증상 선택형 4단계 진단 마법사 (`SymptomDiagnosticWizard`) 탑재**: 문제 영역(Windows Update · 네트워크 · 부팅/BSOD · 성능/디스크 · 하드웨어/드라이버 · 보안/앱) → 세부 증상·발생 시점 → Windows 11/10 환경·자동 롤백 설정 → 내장 DB 랭킹 처방 및 Gemini AI 심층 진단을 단계별로 진행합니다.
- **Pre-Flight AST+린트 사전 안전 검증 & 자동 롤백 래퍼 (`psRollback`)**: 복사 및 샌드박스 실행 전 고위험 명령을 자동 점검하고, 실행 직전 `Checkpoint-Computer` 복원 지점 생성과 대상 레지스트리 키 자동 백업(`Restore_Registry.cmd`)을 스크립트 상단에 결합합니다.
- **PowerShell 샌드박스 '실행 기록(Execution History)' 사이드바**: 전체 스크립트 및 `PS>` 단문 진단 명령 실행 이력을 최대 30건까지 `localStorage`에 저장해 검색·필터·1-클릭 재실행 및 편집을 지원합니다.
- **깨진 참고 링크 자동 탐지 & 공식 Microsoft URL 교정**: `404/410` 링크를 검출해 Google Search Grounding과 Microsoft 공식 도메인·HTTP 200 실검증으로 최신 공식 URL로 복구합니다.
- **3각 연동 실시간 모니터 & HMAC-SHA256 웹훅 완성**: 3시간 주기(`0 */3 * * *`) `Windows 11 · Windows 10` 자율 수집, 원시 바이트 HMAC-SHA256 웹훅 및 미사용 자산(약 2.1MB) 경량화를 완료했습니다.

---

### [4. App Screenshot Placeholder]

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
*(실제 배포 시 위 영역에 앱 화면 캡처 이미지를 삽입하거나 텍스트 목업을 그대로 사용하세요)*

---

### [5. Download Link]
별도의 번거로운 프로그램 설치 없이 웹 브라우저에서 바로 사용하실 수 있습니다:
- 🚀 **Windows Fix Wizard 무료 웹 서비스 바로가기**:  
  👉 [https://ahbiyout-all.github.io/windows-fix-wizard/](https://ahbiyout-all.github.io/windows-fix-wizard/)
- 💻 **GitHub 공식 오픈소스 소스코드 저장소**:  
  👉 [https://github.com/AhBiYout-all/windows-fix-wizard](https://github.com/AhBiYout-all/windows-fix-wizard)
- 📌 **바탕화면 바로가기 및 PWA 앱 설치**:  
  웹 서비스 접속 후 상단의 **[바탕화면 바로가기 만들기]** 또는 브라우저 주소창의 **앱 설치(PWA)** 버튼을 클릭하면 PC에 전용 실행 아이콘이 설치됩니다.

---

### [6. Version Info]
| 항목 | 사양 및 내용 |
| :--- | :--- |
| **소프트웨어 버전** | **v3.111.0** (Official Stable Release) |
| **최신 업데이트 일자** | 2026년 11월 26일 (KST) |
| **소프트웨어 라이선스** | MIT License (개인 및 기업 무상 무료) |
| **데이터 및 보안 아키텍처** | Zero Cloud DB (`160+` 공인 DB + 3시간 주기 GitOps 피드 + IndexedDB) · AES-256-GCM 비공개 금고 |
| **AI 진단 엔진** | Google Gemini API (Search Grounding) + 다중 무료 AI 폴백 라우터 |

---

### [7. System Requirements]
- **지원 운영체제**: Windows 11 (24H2, 23H2 등 전 빌드), Windows 10
- **지원 브라우저**: Google Chrome, Microsoft Edge, Mozilla Firefox, Naver Whale, Safari 등 최신 브라우저
- **음성 인식 (STT)**: Chrome 또는 Edge 브라우저 권장 (마이크 장치 필요)
- **스크립트 실행 권한**: Windows PowerShell 관리자 권한 (`Run as Administrator`)

---

### [8. Official Channels]
- 👤 **제작자 및 개발자**: **AhBiYout** (GitHub: `@AhBiYout-all`)
- 🌐 **공식 구글 기술 블로그**: [AhBiYout Vibe (https://ahbiyoutvibe.blogspot.com/)](https://ahbiyoutvibe.blogspot.com/)
- 💻 **공식 GitHub 저장소**: [https://github.com/AhBiYout-all/windows-fix-wizard](https://github.com/AhBiYout-all/windows-fix-wizard)
- 🏢 **공식 협력 네트워크**: [CISNet (https://www.cisnet.co.kr)](https://www.cisnet.co.kr)
- 📧 **공식 문의 이메일**: [ahbiyoutwinfix@gmail.com](mailto:ahbiyoutwinfix@gmail.com)

---

### [9. Patch Notes (from latest commits)]
*(최신 커밋 및 릴리즈 기준 **기능 개선에 대한 내용만 엄선하여 기록**되었습니다)*

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

### [10. Recommended Tags]
윈도우오류,블루스크린,윈도우11,윈도우10,업데이트오류,PowerShell,자가치료,AI진단,WindowsFix,BSOD,AhBiYout,GitOps,시스템복구,오류해결,Win11,Win10,WindowsRepair,Troubleshoot,스크립트,자가수리

---

# 💻 PART 2: [HTML 편집 모드 (`<>`)] 템플릿 코드

> 구글 블로거 글 작성기의 좌측 상단 연필 아이콘을 클릭하여 **[HTML 보기 (`<>`)]** 모드로 전환한 뒤 아래 코드 전체를 그대로 붙여넣으세요.

```html
<div style="font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.8; color: #1e293b; max-width: 860px; margin: 0 auto; padding: 10px 16px; background-color: #ffffff;">

  <!-- [1. Title (제목)] -->
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #2563eb 100%); color: #ffffff; padding: 42px 28px; border-radius: 24px; text-align: center; box-shadow: 0 16px 36px rgba(15, 23, 42, 0.25); margin-bottom: 35px; border: 1px solid rgba(255,255,255,0.15);">
    <span style="background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); color: #ffffff; text-transform: uppercase; font-size: 11px; font-weight: 800; padding: 6px 16px; border-radius: 20px; letter-spacing: 1.5px; display: inline-block; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.25);">
      🚀 OFFICIAL SYSTEM RELEASE v3.111.0
    </span>
    <h1 style="font-size: 27px; font-weight: 900; margin: 0 0 12px 0; color: #ffffff; line-height: 1.38; letter-spacing: -0.5px;">
      [윈도우 오류 해결] 블루스크린·업데이트 오류 AI 4단계 마법사로 안전하게 자가치료하는 방법
    </h1>
    <div style="font-size: 20px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">
      Windows Fix Wizard (윈도우 문제 해결 마법사)
    </div>
    <p style="font-size: 15px; color: #cbd5e1; margin: 0; font-weight: 400; line-height: 1.6;">
      증상 선택형 4단계 진단 마법사, Pre-Flight AST 안전 검증 &amp; 자동 롤백 포인트, Google Gemini 실시간 검색 그라운딩으로 Windows 11 · 10 오류를 안전하게 해결하세요.
    </p>
  </div>

  <!-- [2. Body (본문)] -->
  <div style="margin-bottom: 35px;">
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
      📖 본문: 오류 코드를 몰라도 안전한 자가치료가 필요한 이유
    </h2>
    <div style="background-color: #f8fafc; border-left: 5px solid #2563eb; border-radius: 0 16px 16px 0; padding: 22px; margin-bottom: 24px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      <p style="font-size: 15px; color: #334155; margin: 0 0 14px 0; line-height: 1.75;">
        Windows 11이나 Windows 10을 사용하다 보면 갑작스러운 <b>블루스크린(BSOD)</b>, 멈춰버리는 <b>윈도우 업데이트 오류(0x80070005, 0x800f081f, 0x80240034 등)</b>, <b>인터넷/와이파이 단절</b>, <b>디스크 100% 점유 및 프리징</b> 문제로 작업 시간을 허비하게 됩니다.
      </p>
      <p style="font-size: 15px; color: #334155; margin: 0; line-height: 1.75;">
        출처가 불분명한 레지스트리 수정 명령어를 무작정 따라 하면 시스템이 손상될 위험이 큽니다. <b>Windows Fix Wizard</b>는 <b>4단계 증상 진단 마법사</b>와 <b>사전 안전 검증(Pre-Flight AST+린트) · 자동 롤백 백업 래퍼</b>를 통해 초보자도 안심하고 실행할 수 있는 무설치 무료 웹 복구 솔루션을 제공합니다.
      </p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 20px;">
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="font-size: 24px; margin-bottom: 8px;">🎯</div>
        <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 6px;">4단계 증상 진단 마법사</div>
        <div style="font-size: 13px; color: #64748b; line-height: 1.6;">오류 코드를 몰라도 영역·세부 증상·PC 환경을 순서대로 골라 내장 DB + Gemini AI 복합 진단을 받습니다.</div>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="font-size: 24px; margin-bottom: 8px;">🛡️</div>
        <div style="font-size: 16px; font-weight: 800; color: #16a34a; margin-bottom: 6px;">사전 검증 &amp; 자동 롤백</div>
        <div style="font-size: 13px; color: #64748b; line-height: 1.6;">Pre-Flight AST+린트 게이트와 시스템 복원 지점 · 레지스트리 자동 백업(Restore_Registry.cmd)을 제공합니다.</div>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="font-size: 24px; margin-bottom: 8px;">⚡</div>
        <div style="font-size: 16px; font-weight: 800; color: #d97706; margin-bottom: 6px;">샌드박스 &amp; 실행 기록</div>
        <div style="font-size: 13px; color: #64748b; line-height: 1.6;">브라우저 격리 PowerShell 샌드박스에서 먼저 시험하고, 실행 기록 사이드바에서 1-클릭 재실행·편집합니다.</div>
      </div>
    </div>
  </div>

  <!-- [3. Update Info (업데이트 정보)] -->
  <div style="margin-bottom: 35px;">
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
      🚀 최신 v3.111.0 주요 업데이트 사항
    </h2>
    <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 1px solid #bfdbfe; border-radius: 18px; padding: 24px; box-shadow: 0 4px 14px rgba(37,99,235,0.06);">
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #1e3a8a; line-height: 1.85;">
        <li><b>🎯 증상 선택형 4단계 진단 마법사 (`SymptomDiagnosticWizard`)</b>: 문제 영역(업데이트·네트워크·부팅/BSOD·성능/디스크·드라이버·보안/앱)부터 증상 칩·Windows 11/10 환경·롤백 옵션까지 단계별 처방을 제공합니다.</li>
        <li><b>🛡️ Pre-Flight AST+린트 사전 검증 &amp; 자동 롤백 래퍼 (`psRollback`)</b>: 고위험 스크립트를 실행 전 단계에서 차단하고, 복원 지점 생성과 수정 대상 레지스트리 백업 스크립트를 멱등하게 결합합니다.</li>
        <li><b>📜 PowerShell 샌드박스 '실행 기록(Execution History)' 사이드바</b>: 전체 스크립트와 <code>PS&gt;</code> 단문 진단 명령을 최대 30건까지 자동 저장해 검색·필터·1-클릭 재실행 및 편집을 지원합니다.</li>
        <li><b>🔗 깨진 참고 링크 자동 탐지 &amp; Microsoft 공식 URL 교정</b>: HTTP 404/410 링크를 자동 검출하고 Search Grounding과 HTTP 200 실검증을 거쳐 공식 문서(<code>learn.microsoft.com</code>, <code>support.microsoft.com</code>)로 교정합니다.</li>
        <li><b>🔄 3각 연동 실시간 모니터 &amp; HMAC-SHA256 웹훅 완성</b>: 3시간 주기(`0 */3 * * *`) Windows 11/10 자율 수집, GitHub·Pages·프리뷰 4노드 상태 프로브 및 미사용 자산(약 2.1MB) 경량화를 완료했습니다.</li>
      </ul>
    </div>
  </div>

  <!-- [4. App Screenshot Placeholder (앱 그림 / 스크린샷 영역)] -->
  <div style="margin-bottom: 35px;">
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
      🖼️ 앱 그림: Windows Fix Wizard 실제 UI 인터페이스
    </h2>

    <div style="background-color: #0f172a; border-radius: 20px; overflow: hidden; box-shadow: 0 18px 40px rgba(0,0,0,0.3); border: 1px solid #334155;">
      <div style="background-color: #1e293b; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; gap: 8px;">
          <span style="width: 12px; height: 12px; border-radius: 50%; background-color: #ef4444; display: inline-block;"></span>
          <span style="width: 12px; height: 12px; border-radius: 50%; background-color: #f59e0b; display: inline-block;"></span>
          <span style="width: 12px; height: 12px; border-radius: 50%; background-color: #10b981; display: inline-block;"></span>
        </div>
        <div style="color: #94a3b8; font-size: 12px; font-family: monospace; font-weight: 600;">
          https://ahbiyout-all.github.io/windows-fix-wizard/ (v3.111.0)
        </div>
        <div style="color: #34d399; font-size: 11px; font-weight: 700;">● ZERO CLOUD DB</div>
      </div>

      <div style="padding: 24px; color: #f8fafc;">
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
          <span style="background-color: #2563eb; color: #ffffff; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700;">🎯 4단계 증상 진단 마법사</span>
          <span style="background-color: #1e293b; border: 1px solid #475569; color: #cbd5e1; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;">🔍 오류코드 · 🎤 음성 직접 검색</span>
        </div>

        <div style="background-color: #1e293b; border: 1px solid #475569; border-radius: 14px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 220px;">
            <span style="font-size: 16px;">🔍</span>
            <span style="color: #e2e8f0; font-size: 13px; font-weight: 500;">Step 1: Windows Update → Step 2: 0x80070005 실패 → Step 3: Windows 11 + 자동 롤백 ON</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <span style="background-color: #10b981; color: #052e16; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 800;">Step 4 진단 완료</span>
          </div>
        </div>

        <div style="background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 20px; margin-bottom: 18px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="color: #38bdf8; font-size: 14px; font-weight: 800; display: flex; align-items: center; gap: 6px;">
              <span>🤖 AI · 지식베이스 처방 결과</span>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <span style="background-color: rgba(16, 185, 129, 0.18); color: #34d399; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 700;">🛡️ Pre-Flight AST+린트 통과</span>
              <span style="background-color: rgba(56, 189, 248, 0.2); color: #38bdf8; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 600;">Microsoft 공식 문서 검증</span>
            </div>
          </div>
          <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin: 0 0 14px 0;">
            오류 코드 0x80070005는 Windows Update 서비스 권한 결함 또는 시스템 파일 손상으로 발생합니다. 자동 롤백 래퍼가 포함된 아래 PowerShell 스크립트를 관리자 권한으로 실행하면 복원 지점 생성 후 안전하게 복구됩니다.
          </p>

          <div style="background-color: #090d16; border: 1px solid #27354a; border-radius: 10px; padding: 14px; font-family: monospace; font-size: 12px; color: #67e8f9; line-height: 1.65; overflow-x: auto;">
            # [WinFix Auto-Rollback] 시스템 복원 지점 및 레지스트리 백업<br>
            Checkpoint-Computer -Description "WinFix_0x80070005" -RestorePointType "MODIFY_SETTINGS" -ErrorAction SilentlyContinue<br>
            DISM.exe /Online /Cleanup-image /Restorehealth<br>
            sfc /scannow<br>
            net stop wuauserv; net stop bits; net start wuauserv; net start bits
          </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px;">
          <span style="background-color: #334155; color: #93c5fd; padding: 5px 10px; border-radius: 8px; font-weight: 600;">Windows Update</span>
          <span style="background-color: #334155; color: #86efac; padding: 5px 10px; border-radius: 8px; font-weight: 600;">네트워크/Wi-Fi</span>
          <span style="background-color: #334155; color: #fde047; padding: 5px 10px; border-radius: 8px; font-weight: 600;">부팅/BSOD</span>
          <span style="background-color: #334155; color: #c4b5fd; padding: 5px 10px; border-radius: 8px; font-weight: 600;">성능/프리징 · 디스크</span>
          <span style="background-color: #334155; color: #fca5a5; padding: 5px 10px; border-radius: 8px; font-weight: 600;">하드웨어/드라이버</span>
          <span style="background-color: #334155; color: #67e8f9; padding: 5px 10px; border-radius: 8px; font-weight: 600;">샌드박스 실행 기록(30건)</span>
        </div>
      </div>
    </div>
  </div>

  <!-- [5. Download Link (다운로드 및 접속 링크)] -->
  <div style="margin-bottom: 35px;">
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
      📥 다운로드 및 공식 접속 링크
    </h2>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 26px; text-align: center;">
      <p style="font-size: 15px; color: #475569; margin: 0 0 20px 0;">
        별도의 프로그램 다운로드 없이 웹 브라우저에서 즉시 실행하거나 바탕화면 바로가기·PWA 앱으로 설치할 수 있습니다.
      </p>

      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 14px;">
        <a href="https://ahbiyout-all.github.io/windows-fix-wizard/" target="_blank" rel="noopener noreferrer" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 26px; border-radius: 12px; font-size: 15px; font-weight: 800; box-shadow: 0 8px 18px rgba(37,99,235,0.3); display: inline-flex; align-items: center; gap: 8px;">
          🚀 웹 서비스 즉시 무료 접속하기
        </a>
        <a href="https://github.com/AhBiYout-all/windows-fix-wizard" target="_blank" rel="noopener noreferrer" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-size: 15px; font-weight: 800; box-shadow: 0 8px 18px rgba(15,23,42,0.2); display: inline-flex; align-items: center; gap: 8px;">
          💻 GitHub 오픈소스 저장소 방문
        </a>
      </div>

      <div style="margin-top: 18px; font-size: 12px; color: #64748b;">
        💡 <b>Tip</b>: 사이트 접속 후 상단의 <b>[바탕화면 바로가기]</b> 또는 브라우저의 <b>PWA 앱 설치</b> 버튼을 누르면 PC에 전용 아이콘이 생성됩니다.
      </div>
    </div>
  </div>

  <!-- [6. Version Info (버전 정보)] -->
  <div style="margin-bottom: 35px;">
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
      📋 버전 정보 (Version Info)
    </h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0;">
      <tbody>
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
          <th style="padding: 12px 18px; width: 32%; color: #475569; font-weight: 700;">소프트웨어 버전</th>
          <td style="padding: 12px 18px; color: #0f172a; font-weight: 800;"><span style="color: #2563eb;">v3.111.0</span> (Official Stable Release)</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">최신 업데이트 일자</th>
          <td style="padding: 12px 18px; color: #334155;">2026년 11월 26일 (KST)</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">소프트웨어 라이선스</th>
          <td style="padding: 12px 18px; color: #334155;">MIT License (개인 및 기업 무상 무료 이용 가능)</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">기술 스택</th>
          <td style="padding: 12px 18px; color: #334155;">React 19, TypeScript, Express Node.js, Tailwind CSS v4, Motion</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">AI 진단 엔진</th>
          <td style="padding: 12px 18px; color: #334155;">Google Gemini API (Search Grounding) + 다중 무료 AI 폴백 라우터</td>
        </tr>
        <tr>
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">데이터 및 보안 아키텍처</th>
          <td style="padding: 12px 18px; color: #334155;">Zero Cloud DB (160+ 공인 DB + 3시간 주기 GitOps 피드 + IndexedDB) · AES-256-GCM 비공개 백업 금고</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- [7. System Requirements (시스템 요구 사항)] -->
  <div style="margin-bottom: 35px;">
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
      ⚙️ 시스템 요구 사항 (System Requirements)
    </h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0;">
      <tbody>
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
          <th style="padding: 12px 18px; width: 32%; color: #475569; font-weight: 700;">지원 운영체제</th>
          <td style="padding: 12px 18px; color: #334155;">Windows 11 (24H2, 23H2 등 전 빌드), Windows 10</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">권장 웹 브라우저</th>
          <td style="padding: 12px 18px; color: #334155;">Google Chrome, Microsoft Edge, Mozilla Firefox, Naver Whale, Safari 최신 버전</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">음성 인식 기능</th>
          <td style="padding: 12px 18px; color: #334155;">Chrome 또는 Edge 브라우저 (Web Speech API 표준 탑재)</td>
        </tr>
        <tr>
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">스크립트 실행 권한</th>
          <td style="padding: 12px 18px; color: #334155;">PowerShell 복구 스크립트 실행 시 <b>관리자 권한(Run as Administrator)</b> 필요</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- [8. Official Channels (제작자 및 공식 채널 안내)] -->
  <div style="margin-bottom: 35px;">
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
      👨‍💻 제작자 및 공식 채널 안내 (Official Channels)
    </h2>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px;">
      <div style="margin-bottom: 12px;"><b>• 제작자 / 개발자</b>: <b>AhBiYout</b> (GitHub: <code>@AhBiYout-all</code>)</div>
      <div style="margin-bottom: 12px;"><b>• 공식 구글 블로그</b>: <a href="https://ahbiyoutvibe.blogspot.com/" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; font-weight: 600;">AhBiYout Vibe (https://ahbiyoutvibe.blogspot.com/)</a></div>
      <div style="margin-bottom: 12px;"><b>• 공식 GitHub 저장소</b>: <a href="https://github.com/AhBiYout-all/windows-fix-wizard" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; font-weight: 600;">https://github.com/AhBiYout-all/windows-fix-wizard</a></div>
      <div style="margin-bottom: 12px;"><b>• 공식 협력 네트워크</b>: <a href="https://www.cisnet.co.kr" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; font-weight: 600;">CISNet (https://www.cisnet.co.kr)</a></div>
      <div><b>• 공식 이메일 문의</b>: <a href="mailto:ahbiyoutwinfix@gmail.com" style="color: #2563eb; text-decoration: underline; font-weight: 600;">ahbiyoutwinfix@gmail.com</a></div>
    </div>
  </div>

  <!-- [9. Patch Notes (from latest commits) (패치노트)] -->
  <div style="margin-bottom: 35px;">
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
      📜 Patch Notes (from latest commits)
    </h2>
    <div style="max-height: 480px; overflow-y: auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 20px 22px; font-size: 13px; line-height: 1.8; color: #334155;">
      <ul style="margin: 0; padding-left: 20px;">
        <li><b>v3.111.0 (2026-11-26)</b>: 증상 선택형 4단계 진단 마법사(<code>SymptomDiagnosticWizard</code>) 도입, Pre-Flight AST+린트 사전 검증 및 자동 복원 지점·레지스트리 롤백 래퍼(<code>psRollback</code>) 구현, 깨진 참고 링크 자동 탐지·공식 Microsoft URL 교정 워크벤치 구축, 3각 연동 실시간 모니터 및 원시 바이트 HMAC-SHA256 웹훅 완성, <code>Windows 11 · Windows 10</code> 기본 수집 집중 및 미사용 자산/의존성 경량화</li>
        <li><b>v3.110.0 (2026-11-25)</b>: PowerShell 샌드박스 '실행 기록(Execution History)' 사이드바(<code>localStorage</code> 30건 영속화 · 재실행/편집) 추가, GitHub·Pages·프리뷰 3각 연동 일괄 복구 및 Workbox <code>/data/*.json</code> <code>NetworkOnly</code> 적용</li>
        <li><b>v3.109.0 (2026-11-21)</b>: 비공개 금고 일별 스냅샷·LKG 복원점·감사 로그 통합 보존 정책 모달 및 오프라인 지원 수동 긴급 AES-256-GCM 암호화 키 순환 기능 추가</li>
        <li><b>v3.108.0 (2026-11-21)</b>: 비공개 저장소(<code>windows-fix-wizard-admin</code>) 통합 보안·스냅샷·헬스체크 운영 허브 구축 (시스템 설정/다중 AI 키 금고 분리, 일별 스냅샷 자동 회전, 월간 감사 로그 아카이빙)</li>
        <li><b>v3.107.0 (2026-11-21)</b>: 비공개 저장소 전용 AES-256-GCM 암호화 회원 백업·복원(<code>winfix-admin-vault</code>) 및 로컬 <code>.enc.json</code> 오프라인 금고 내보내기/복구 지원</li>
        <li><b>v3.106.0 ~ v3.106.15 (2026-11-21)</b>: 키리스 무료 폴백(<code>pollinations</code>) 및 보조 무료 AI 4종 추가 연동, 로컬 회원 직접 등록·수정 및 JSON 복구 파서 고도화</li>
        <li><b>v3.105.0 (2026-11-16)</b>: 모듈러 카드 레이아웃 및 실시간 API 쿼터/캐시 차트 대시보드 구축, 동적 유지보수 자동 스케줄러 추가</li>
        <li><b>v3.102.0 (2026-11-16)</b>: PowerShell 샌드박스 상하 2단 가변창(Stacked 2-Tier) 및 좌우 분할 레이아웃 모드 신설</li>
        <li><b>v3.100.0 ~ v3.101.0 (2026-11-15)</b>: 적응형 AI 모델 복원력 라우터(<code>ai-resilience-router</code>) 및 엄지손가락 존(Thumb-Zone) 기반 모바일 하단 내비게이션 개편</li>
        <li><b>v3.99.0 (2026-11-14)</b>: 관리자 GitOps 자율 수집 옵션 설정 패널(<code>github-collector-options.json</code>) 및 일일 수집 브리핑 배너 추가</li>
        <li><b>v3.94.0 (2026-11-09)</b>: 다중 무료 AI 우회 엔진(<code>callSecondaryFreeAiApi</code>) 및 영구 로컬 회원 데이터베이스 신설</li>
        <li><b>v3.90.0 (2026-11-08)</b>: Windows 이벤트 뷰어 시스템 로그 모니터 및 빠른 시스템 건강 진단 버튼(<code>QuickSystemScanUtility</code>) 탑재</li>
        <li><b>v3.84.0 ~ v3.87.0 (2026-11-08)</b>: Cloud Firestore 완전 제거 및 100% Zero Cloud DB (<code>data/*.json</code> + Jamstack + IndexedDB) 아키텍처 전환 완료</li>
        <li><b>v3.73.0 ~ v3.80.0 (2026-11-06)</b>: 브라우저 WebAssembly 격리 PowerShell 샌드박스, PrismJS 구문 강조, 스크립트 버전 히스토리, 규칙 기반 린터(<code>psLinter</code>) 및 시스템 복원 지점 유틸리티 구축</li>
        <li><b>v3.68.0 ~ v3.69.0 (2026-11-05)</b>: 서버 프록시 기반 풀스택 Gemini AI 아키텍처 전환 및 진단 결과 인쇄용 PDF 리포트 생성 기능 추가</li>
        <li><b>v3.50.0 ~ v3.54.0 (2026-11-01)</b>: GitHub Pages 정적 SPA 직접 연동, GitOps SSH/PAT 인증, 아티클 스크롤 읽기 진행률 바(<code>ReadingProgressBar</code>) 및 블로거 듀얼 모드 문서 체계 수립</li>
        <li><b>v3.31.0 ~ v3.34.0 (2026-10-30)</b>: 고용량 IndexedDB 비동기 저장 엔진(<code>idbStorage.ts</code>) 도입, 하드웨어 부품별 다차원 필터링 및 백엔드 프록시 보안 개편</li>
        <li><b>v3.15.0 ~ v3.26.0 (2026-10-24)</b>: PowerShell 위협 검증기, 다크/라이트 테마 전환, Web Speech API 음성 인식(STT) 및 GitHub Pages 무중단 SPA 배포 구성</li>
        <li><b>v3.0.0 (2026-06-01)</b>: Google Gemini AI 기반 윈도우 블루스크린·시스템 오류 진단 및 PowerShell 자가치료 스크립트 생성 엔진 최초 출시</li>
      </ul>
    </div>
  </div>

  <!-- [10. Recommended Tags (추천 태그)] -->
  <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #cbd5e1; border-radius: 18px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
    <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
      <span>🏷️ Recommended Tags (추천 태그)</span>
    </div>
    <div style="background-color: #ffffff; border: 1px dashed #94a3b8; border-radius: 12px; padding: 12px 16px; font-size: 13px; color: #2563eb; font-weight: 600; line-height: 1.7; word-break: break-all;">
      윈도우오류,블루스크린,윈도우11,윈도우10,업데이트오류,PowerShell,자가치료,AI진단,WindowsFix,BSOD,AhBiYout,GitOps,시스템복구,오류해결,Win11,Win10,WindowsRepair,Troubleshoot,스크립트,자가수리
    </div>
    <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
      ✓ 총 20개 태그 (한글/영문 혼합) | 총 129자 (200자 제한 이내 완벽 준수)
    </div>
  </div>

</div>
```
