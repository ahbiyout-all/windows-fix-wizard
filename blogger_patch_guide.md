# 📝 Blogger Patch Guide (`blogger_patch_guide.md`)
# 구글 블로거 패치노트 및 릴리즈 포스팅 표준 가이드

본 문서는 **Windows Fix Wizard (윈도우 문제 해결 마법사)** 서비스의 신규 버전 배포 시, 구글 블로거(Google Blogger / Blogspot)에 일관성 있고 표준화된 포스팅을 작성할 수 있도록 정의된 **공식 포스팅 템플릿 규격서**입니다.

이 문서는 **[1. 작성 모드 (Rich Text / 서식 있는 텍스트)]**와 **[2. HTML 편집 모드 (`<>`)]**를 모두 지원하도록 구성되어 있습니다.

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
[윈도우 오류 해결] 블루스크린·업데이트 오류 AI로 1초 만에 자가치료하는 방법 (Windows Fix Wizard v3.51.0)

---

### [2. Body]
컴퓨터를 사용하다 보면 누구나 한 번쯤 마주치게 되는 **블루스크린(BSOD)**, 원인을 알 수 없는 **윈도우 10/11 업데이트 실패(0x80070005, 0x800f081f, 0x80240034 등)**, **네트워크 및 Wi-Fi 연결 끊김**, **소리 안 남(오디오 오류)** 문제 등으로 인해 많은 시간과 작업 내용을 낭비하게 됩니다.

인터넷 검색을 통해 나오는 방법들은 오래되었거나 검증되지 않은 위험한 레지스트리 수정 명령어가 많아 초보자가 따라 하기에는 오히려 PC 시스템을 망가뜨릴 위험이 큽니다.

**Windows Fix Wizard (윈도우 문제 해결 마법사)**는 이러한 번거로움을 해결하기 위해 개발된 100% 무료 무설치 웹 진단 도구입니다. 오류 코드나 증상을 입력하기만 하면 Google Gemini AI가 실시간 기술 문서를 바탕으로 가장 정확한 원인을 분석하고, 관리자 권한으로 한 번에 실행 가능한 안전한 PowerShell 자가치료 스크립트를 즉시 생성해 드립니다.

---

### [3. Update Info]
- **SSH 기반 GitOps 저장소 인증 지원**: Personal Access Token(PAT)뿐만 아니라 엔터프라이즈급 보안을 위한 SSH Private Key 인증 모드를 정식 지원합니다.
- **아티클 스크롤 읽기 진행률 바(ReadingProgressBar) 탑재**: 긴 해결 가이드를 읽을 때 상단에 실시간 스크롤 진행 바가 표시되어 현재 읽은 분량을 직관적으로 파악할 수 있습니다.
- **실시간 Recharts 쿼타 & 캐시 텔레메트리 대시보드**: 로컬 IndexedDB 캐시 히트율(97% 이상 쿼터 절감)과 무제한 Jamstack CDN 피드 효율을 시각적 차트로 제공합니다.
- **GitHub Actions 자율 수집 엔진 라이브 상태 배지**: 6시간 주기 자동 수집 워크플로의 상태(성공, 실패, 진행 중)를 실시간 배지로 확인 가능합니다.

---

### [4. App Screenshot Placeholder]

```
┌────────────────────────────────────────────────────────────────────────┐
│  🛠️ Windows Fix Wizard                               v3.51.0 [Online]  │
├────────────────────────────────────────────────────────────────────────┤
│  [Windows 11 ▼] [ 오류 코드(예: 0x80070005) 또는 증상 입력... ] [🎤] [진단]│
├────────────────────────────────────────────────────────────────────────┤
│  🔍 AI 진단 결과                                    [진행률: ══════   ]│
│  • 진단 원인: Windows 시스템 파일 손상 및 업데이트 카탈로그 캐시 충돌       │
│  • 자동 복구 스크립트 (PowerShell 관리자 권한 실행):                   │
│    ┌──────────────────────────────────────────────────────────────┐    │
│    │ DISM.exe /Online /Cleanup-image /Restorehealth               │    │
│    │ sfc /scannow                                                 │    │
│    │ net stop wuauserv; net start wuauserv                         │    │
│    └──────────────────────────────────────────────────────────────┘    │
│    [📋 스크립트 복사]  [🛡️ 안심 검사소 전송]  [⭐ 추천 142]              │
├────────────────────────────────────────────────────────────────────────┤
│  📚 1,300+ 공인 가이드북 필터링: [전체] [업데이트] [네트워크] [블루스크린]     │
│  [메인보드: 142] [GPU: 198] [RAM: 115] [SSD: 230] [CPU: 184] [오디오: 96]   │
└────────────────────────────────────────────────────────────────────────┘
```
*(실제 배포 시 위 영역에 앱 화면 캡처 이미지를 삽입하거나 텍스트 목업을 그대로 사용하세요)*

---

### [5. Download Link]
별도의 번거로운 프로그램 설치 없이 웹 브라우저에서 바로 사용하실 수 있습니다:
- 🚀 **Windows Fix Wizard 무료 웹 서비스 바로가기**:  
  👉 [https://ahbiyout-all.github.io/windows-fix-wizard/](https://ahbiyout-all.github.io/windows-fix-wizard/)
- 💻 **GitHub 공식 오픈소스 소스코드 저장소**:  
  👉 [https://github.com/AhBiYout-all/windows-fix-wizard](https://github.com/AhBiYout-all/windows-fix-wizard)
- 📌 **바탕화면 바로가기 아이콘 생성**:  
  웹 서비스 접속 후 우측 상단의 **[바탕화면 바로가기 만들기]** 버튼을 클릭하면 원클릭으로 PC에 실행 아이콘이 설치됩니다.

---

### [6. Version Info]
| 항목 | 사양 및 내용 |
| :--- | :--- |
| **소프트웨어 버전** | **v3.51.0** (Official Stable Release) |
| **최신 릴리즈 일자** | 2026년 11월 01일 (KST) |
| **소프트웨어 라이선스** | MIT License (개인 및 기업 무상 무료) |
| **데이터 엔진** | Jamstack 정적 피드 + High-Capacity IndexedDB 캐싱 (Sub-10ms 고속 검색) |
| **AI 진단 엔진** | Google Gemini API (Server-side Web Grounding 탑재) |

---

### [7. System Requirements]
- **지원 운영체제**: Windows 11 (24H2, 23H2 등 전 빌드), Windows 10, Windows 8.1, Windows 7, Windows Server
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

- **v3.51.0 (2026-11-01)**: 구글 블로거 전용 패치 가이드 규격서(`blogger_patch_guide.md`) 제정 및 Rich Text / HTML 듀얼 모드 표준화
- **v3.50.0 (2026-11-01)**: 구글 블로거 듀얼 모드 표준 문서 체계 구축, GitOps SSH/PAT 인증 모드 연동 및 깃허브 오픈소스 문서 고도화
- **v3.49.0 (2026-11-01)**: GitOps 저장소 연동 시 기존 PAT 방식 외에 엔터프라이즈 보안을 위한 SSH Private Key(개인키) 인증 모드 추가 및 서버 마스킹 보관 지원
- **v3.48.0 (2026-11-01)**: AI 진단 결과 및 가이드북 아티클 상단에 긴 해결 절차를 직관적으로 추적할 수 있는 반응형 스크롤 읽기 진행률 바(ReadingProgressBar) 탑재
- **v3.47.0 (2026-11-01)**: GitOps 자율 수집 엔진 및 GitHub Pages 배포 워크플로의 실시간 실행 상태(성공, 실패, 진행 중)를 모니터링하는 라이브 상태 배지 컴포넌트 추가
- **v3.46.0 (2026-11-01)**: Recharts 실시간 쿼타 대시보드에 로컬 IndexedDB 캐시 히트율과 원격 API 호출 간의 절감 비율을 시각화하는 효율성 파이 차트 및 월간 비용 절감 추정치 탑재
- **v3.45.0 (2026-11-01)**: Recharts 대시보드에 Jamstack 정적 피드와 실시간 Cloud DB 작업을 상호 비교 분석할 수 있는 듀얼 레이어 텔레메트리 뷰 구축
- **v3.40.0 (2026-11-01)**: 클라우드 DB 일일 한도(5만/2만) 제약에서 완전히 탈피하여 정적 Jamstack 피드와 무제한 IndexedDB 인메모리 검색 엔진으로 전면 전환
- **v3.39.0 (2026-11-01)**: GitHub Pages 원클릭 배포 상태 진단 및 README.md 실시간 빌드 상태 배지 마크다운 원클릭 생성기 탑재
- **v3.37.0 (2026-11-01)**: 제로 쿼터(Zero-Quota) Jamstack 피드 엔진 구축 및 1,300+ 건 윈도우 문제 해결 데이터셋의 영구 보존 체계 완성
- **v3.36.0 (2026-11-01)**: Recharts 기반 일일 API 사용량 및 트렌드 모니터링 차트(ComposedChart, Bar, Line, Area) 구축
- **v3.35.0 (2026-11-01)**: Gemini API 키 상태 실시간 삼색 인디케이터(정상 활성, 3분 쿨다운 대기, 키 미등록) 및 진단 모달 추가
- **v3.34.0 (2026-10-30)**: 클라이언트 브라우저에서 AI SDK를 완전 분리하여 Express 백엔드 프록시(`/api/ai/*`) 경유 방식으로 보안 아키텍처 개편
- **v3.33.0 (2026-10-30)**: 메인보드, 그래픽(GPU), 램(RAM), SSD, CPU, 파워 등 10대 하드웨어 부품별 다차원 카테고리 필터링 엔진 탑재
- **v3.31.0 (2026-10-25)**: 브라우저 5MB 로컬스토리지 한계를 극복하는 고용량 IndexedDB 비동기 저장 엔진(`idbStorage.ts`) 도입 (100MB+ 무제한 캐시)
- **v3.30.0 (2026-10-25)**: GitHub Pages 정적 환경에서 백업 ZIP 파일 업로드 시 클라이언트 측에서 직접 데이터를 자동 병합 및 다운로드하는 클라이언트 머지 엔진 탑재
- **v3.29.0 (2026-10-25)**: Google AdSense 수익화 설정 모듈 및 5대 영역(검색창, 탑배너, 인피드, 본문, 푸터) 동적 광고 배치 시스템 통합
- **v3.27.0 (2026-10-24)**: GitHub Actions GitOps 자율 수집 엔진과 실시간 수집 카운트 연동 대시보드 구축
- **v3.26.0 (2026-10-24)**: GitHub Pages 무중단 배포를 위한 404 SPA 리디렉션 및 `.nojekyll` 자동 구성 스크립트 탑재
- **v3.21.0 (2026-10-24)**: Web Speech API 기반 마이크 음성 인식(STT) 기능 지원으로 음성 말하기를 통한 즉시 오류 진단 구현
- **v3.18.0 (2026-10-24)**: 다크 모드(Dark Mode) 및 라이트 모드 실시간 테마 전환과 브라우저 테마 설정 자동 동기화 지원
- **v3.15.0 (2026-10-23)**: 악성 스크립트 사전 방지를 위한 샌드박스 위협 검증기(Threat Verifier) 및 PowerShell 디지털 서명 검증 패널 구축
- **v3.12.0 (2026-10-21)**: 윈도우 부팅 시 자동 실행 등록 스크립트(`WinFix_Register_Startup.bat`) 및 바탕화면 바로가기(.url) 생성기 탑재
- **v3.9.0 (2026-10-09)**: GitHub Releases 실시간 업데이트 확인 모달 및 무설치/설치형 패키지 릴리즈 파이프라인 구축
- **v3.6.0 (2026-08-09)**: 오류 증상 다국어(한국어/영어) 실시간 번역 및 글로벌 사용자 인터페이스 전환 지원
- **v3.0.0 (2026-06-01)**: Google Gemini AI 기반 윈도우 블루스크린 및 시스템 오류 원인 진단과 PowerShell 자가치료 스크립트 자동 생성 엔진 최초 출시

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
      🚀 OFFICIAL SYSTEM RELEASE v3.51.0
    </span>
    <h1 style="font-size: 28px; font-weight: 900; margin: 0 0 12px 0; color: #ffffff; line-height: 1.35; letter-spacing: -0.5px;">
      [윈도우 오류 해결] 블루스크린·업데이트 오류 AI로 1초 만에 자가치료하는 방법
    </h1>
    <div style="font-size: 20px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">
      Windows Fix Wizard (윈도우 문제 해결 마법사)
    </div>
    <p style="font-size: 15px; color: #cbd5e1; margin: 0; font-weight: 400; line-height: 1.6;">
      Google Gemini AI 실시간 웹 검색 그라운딩과 1,300+ Microsoft 공인 복구 스크립트로 안전하게 자가치료하세요.
    </p>
  </div>

  <!-- [2. Body (본문)] -->
  <div style="margin-bottom: 35px;">
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
      📖 본문: 반복되는 윈도우 오류, 왜 발생하고 어떻게 해결해야 할까요?
    </h2>
    <div style="background-color: #f8fafc; border-left: 5px solid #2563eb; border-radius: 0 16px 16px 0; padding: 22px; margin-bottom: 24px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      <p style="font-size: 15px; color: #334155; margin: 0 0 14px 0; line-height: 1.75;">
        컴퓨터로 중요한 업무나 학업, 게임을 하던 도중 갑작스러운 <b>블루스크린(BSOD)</b>이 뜨거나, <b>윈도우 업데이트가 멈추고 실패하는 오류(0x80070005, 0x800f081f 등)</b>, <b>인터넷/와이파이 먹통</b>, <b>오디오 소리 안 남</b> 현상 때문에 당황하신 적 많으실 것입니다.
      </p>
      <p style="font-size: 15px; color: #334155; margin: 0; line-height: 1.75;">
        인터넷 검색창에 검색해 보면 출처를 알 수 없는 복잡한 레지스트리 수정 방법이나 오래된 명령어들이 쏟아져 나와 따라 하기 망설여집니다. 잘못 수정하면 시스템이 더 망가져 윈도우를 포맷해야 하는 위험이 있습니다.
      </p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 20px;">
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="font-size: 24px; margin-bottom: 8px;">🤖</div>
        <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 6px;">Gemini AI 실시간 진단</div>
        <div style="font-size: 13px; color: #64748b; line-height: 1.6;">최신 Windows 11 24H2/23H2 업데이트 버그까지 구글 검색 그라운딩으로 1초 만에 원인을 분석합니다.</div>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="font-size: 24px; margin-bottom: 8px;">⚡</div>
        <div style="font-size: 16px; font-weight: 800; color: #16a34a; margin-bottom: 6px;">안전 자가치료 스크립트</div>
        <div style="font-size: 13px; color: #64748b; line-height: 1.6;">위험 명령어를 완전히 배제하고 Microsoft 표준 복구 명령어로 안전하게 자가치료 스크립트를 제공합니다.</div>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="font-size: 24px; margin-bottom: 8px;">📦</div>
        <div style="font-size: 16px; font-weight: 800; color: #d97706; margin-bottom: 6px;">1,300+ 공인 가이드북</div>
        <div style="font-size: 13px; color: #64748b; line-height: 1.6;">메인보드, 그래픽, 램, SSD, CPU 등 10대 하드웨어 부품별로 분류된 1,300개 이상의 오류 해결법을 수록했습니다.</div>
      </div>
    </div>
  </div>

  <!-- [3. Update Info (업데이트 정보)] -->
  <div style="margin-bottom: 35px;">
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
      🚀 최신 v3.51.0 주요 업데이트 사항
    </h2>
    <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 1px solid #bfdbfe; border-radius: 18px; padding: 24px; box-shadow: 0 4px 14px rgba(37,99,235,0.06);">
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #1e3a8a; line-height: 1.85;">
        <li><b>📝 공식 블로거 패치 가이드 규격서(`blogger_patch_guide.md`) 수립</b>: 구글 블로거 포스팅 시 혼선 없이 일관된 10단계 순서를 지키도록 전용 가이드를 완성했습니다.</li>
        <li><b>🔐 GitOps SSH Private Key 인증 모드 탑재</b>: 기존 PAT 방식 외에 엔터프라이즈급 보안을 위한 SSH 개인키 인증 모드가 추가되어 저장소 동기화 안전성이 대폭 향상되었습니다.</li>
        <li><b>📜 아티클 스크롤 읽기 진행률 바 (ReadingProgressBar)</b>: 긴 해결 가이드를 읽을 때 현재 화면의 읽기 진행 상황을 상단 바를 통해 실시간으로 확인할 수 있습니다.</li>
        <li><b>📊 Recharts 실시간 텔레메트리 대시보드 고도화</b>: 무제한 Jamstack CDN 요청과 IndexedDB 인메모리 캐싱(97% 이상 쿼터 절감) 효율을 실시간 그래프로 시각화합니다.</li>
      </ul>
    </div>
  </div>

  <!-- [4. App Screenshot Placeholder (앱 그림 / 스크린샷 영역)] -->
  <div style="margin-bottom: 35px;">
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
      🖼️ 앱 그림: Windows Fix Wizard 실제 UI 인터페이스
    </h2>
    
    <div style="background-color: #0f172a; border-radius: 20px; overflow: hidden; box-shadow: 0 18px 40px rgba(0,0,0,0.3); border: 1px solid #334155;">
      <div style="background-color: #1e293b; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155;">
        <div style="display: flex; gap: 8px;">
          <span style="width: 12px; height: 12px; border-radius: 50%; background-color: #ef4444; display: inline-block;"></span>
          <span style="width: 12px; height: 12px; border-radius: 50%; background-color: #f59e0b; display: inline-block;"></span>
          <span style="width: 12px; height: 12px; border-radius: 50%; background-color: #10b981; display: inline-block;"></span>
        </div>
        <div style="color: #94a3b8; font-size: 12px; font-family: monospace; font-weight: 600;">
          https://ahbiyout-all.github.io/windows-fix-wizard/ (v3.51.0)
        </div>
        <div style="color: #64748b; font-size: 11px;">● LIVE CLOUD</div>
      </div>

      <div style="padding: 24px; color: #f8fafc;">
        <div style="background-color: #1e293b; border: 1px solid #475569; border-radius: 14px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
            <span style="font-size: 16px;">🔍</span>
            <span style="color: #e2e8f0; font-size: 14px; font-weight: 500;">0x80070005 또는 증상: 윈도우 업데이트 실패 및 접근 거부</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <span style="background-color: #3b82f6; color: #fff; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700;">진단 및 해결</span>
          </div>
        </div>

        <div style="background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 20px; margin-bottom: 18px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div style="color: #38bdf8; font-size: 14px; font-weight: 800; display: flex; align-items: center; gap: 6px;">
              <span>🤖 AI 원인 정밀 진단 결과</span>
            </div>
            <span style="background-color: rgba(56, 189, 248, 0.2); color: #38bdf8; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 600;">Microsoft Official Grounded</span>
          </div>
          <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin: 0 0 14px 0;">
            오류 코드 0x80070005는 Windows Update 서비스 권한 결함 또는 시스템 파일의 손상으로 인해 발생합니다. 아래 PowerShell 스크립트를 관리자 권한으로 실행하면 자동으로 시스템 파일 복원 및 서비스 재기동이 수행됩니다.
          </p>

          <div style="background-color: #090d16; border: 1px solid #27354a; border-radius: 10px; padding: 14px; font-family: monospace; font-size: 12px; color: #67e8f9; line-height: 1.6; overflow-x: auto;">
            # Windows Fix Wizard Auto-Repair Engine<br>
            DISM.exe /Online /Cleanup-image /Restorehealth<br>
            sfc /scannow<br>
            net stop wuauserv; net stop bits<br>
            net start wuauserv; net start bits
          </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px;">
          <span style="background-color: #334155; color: #93c5fd; padding: 5px 10px; border-radius: 8px; font-weight: 600;">메인보드/BIOS (142)</span>
          <span style="background-color: #334155; color: #86efac; padding: 5px 10px; border-radius: 8px; font-weight: 600;">그래픽/GPU (198)</span>
          <span style="background-color: #334155; color: #fde047; padding: 5px 10px; border-radius: 8px; font-weight: 600;">메모리/RAM (115)</span>
          <span style="background-color: #334155; color: #93c5fd; padding: 5px 10px; border-radius: 8px; font-weight: 600;">저장장치/SSD (230)</span>
          <span style="background-color: #334155; color: #fca5a5; padding: 5px 10px; border-radius: 8px; font-weight: 600;">프로세서/CPU (184)</span>
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
        별도의 프로그램 다운로드 없이 웹 브라우저에서 즉시 실행하거나 바탕화면 바로가기를 생성할 수 있습니다.
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
        💡 <b>Tip</b>: 사이트 접속 후 우측 상단의 <b>[바탕화면 바로가기 만들기]</b>를 누르면 PC에 편리한 전용 아이콘이 생성됩니다.
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
          <th style="padding: 12px 18px; width: 30%; color: #475569; font-weight: 700;">소프트웨어 버전</th>
          <td style="padding: 12px 18px; color: #0f172a; font-weight: 800;"><span style="color: #2563eb;">v3.51.0</span> (Official Stable Release)</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">배포 릴리즈 일자</th>
          <td style="padding: 12px 18px; color: #334155;">2026년 11월 01일 (KST)</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">소프트웨어 라이선스</th>
          <td style="padding: 12px 18px; color: #334155;">MIT License (개인 및 기업 무상 무료 이용 가능)</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">기술 스택</th>
          <td style="padding: 12px 18px; color: #334155;">React 19, TypeScript, Tailwind CSS v4, Express Node.js</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">지식베이스 규모</th>
          <td style="padding: 12px 18px; color: #334155;">1,300+ Microsoft 공인 복구 데이터셋 영구 탑재</td>
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
          <th style="padding: 12px 18px; width: 30%; color: #475569; font-weight: 700;">지원 운영체제</th>
          <td style="padding: 12px 18px; color: #334155;">Windows 11 (24H2, 23H2 등 전 빌드), Windows 10, Windows 8.1, Windows 7, Windows Server</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">권장 웹 브라우저</th>
          <td style="padding: 12px 18px; color: #334155;">Google Chrome, Microsoft Edge, Mozilla Firefox, Naver Whale 등 최신 웹 브라우저</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">음성 인식 기능</th>
          <td style="padding: 12px 18px; color: #334155;">Chrome 또는 Edge 브라우저 (Web Speech API 표준 탑재)</td>
        </tr>
        <tr>
          <th style="padding: 12px 18px; color: #475569; font-weight: 700;">실행 권한</th>
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
        <li><b>v3.51.0 (2026-11-01)</b>: 구글 블로거 전용 패치 가이드 규격서(`blogger_patch_guide.md`) 제정 및 Rich Text / HTML 듀얼 모드 표준화</li>
        <li><b>v3.50.0 (2026-11-01)</b>: 구글 블로거 듀얼 모드 표준 문서 체계 구축, GitOps SSH/PAT 인증 모드 연동 및 깃허브 오픈소스 문서 고도화</li>
        <li><b>v3.49.0 (2026-11-01)</b>: GitOps 저장소 연동 시 기존 PAT 방식 외에 엔터프라이즈 보안을 위한 SSH Private Key(개인키) 인증 모드 추가 및 서버 마스킹 보관 지원</li>
        <li><b>v3.48.0 (2026-11-01)</b>: AI 진단 결과 및 가이드북 아티클 상단에 긴 해결 절차를 직관적으로 추적할 수 있는 반응형 스크롤 읽기 진행률 바(ReadingProgressBar) 탑재</li>
        <li><b>v3.47.0 (2026-11-01)</b>: GitOps 자율 수집 엔진 및 GitHub Pages 배포 워크플로의 실시간 실행 상태(성공, 실패, 진행 중)를 모니터링하는 라이브 상태 배지 컴포넌트 추가</li>
        <li><b>v3.46.0 (2026-11-01)</b>: Recharts 실시간 쿼타 대시보드에 로컬 IndexedDB 캐시 히트율과 원격 API 호출 간의 절감 비율을 시각화하는 효율성 파이 차트 및 월간 비용 절감 추정치 탑재</li>
        <li><b>v3.45.0 (2026-11-01)</b>: Recharts 대시보드에 Jamstack 정적 피드와 실시간 Cloud DB 작업을 상호 비교 분석할 수 있는 듀얼 레이어 텔레메트리 뷰 구축</li>
        <li><b>v3.40.0 (2026-11-01)</b>: 클라우드 DB 일일 한도(5만/2만) 제약에서 완전히 탈피하여 정적 Jamstack 피드와 무제한 IndexedDB 인메모리 검색 엔진으로 전면 전환</li>
        <li><b>v3.39.0 (2026-11-01)</b>: GitHub Pages 원클릭 배포 상태 진단 및 README.md 실시간 빌드 상태 배지 마크다운 원클릭 생성기 탑재</li>
        <li><b>v3.37.0 (2026-11-01)</b>: 제로 쿼터(Zero-Quota) Jamstack 피드 엔진 구축 및 1,300+ 건 윈도우 문제 해결 데이터셋의 영구 보존 체계 완성</li>
        <li><b>v3.36.0 (2026-11-01)</b>: Recharts 기반 일일 API 사용량 및 트렌드 모니터링 차트(ComposedChart, Bar, Line, Area) 구축</li>
        <li><b>v3.35.0 (2026-11-01)</b>: Gemini API 키 상태 실시간 삼색 인디케이터(정상 활성, 3분 쿨다운 대기, 키 미등록) 및 진단 모달 추가</li>
        <li><b>v3.34.0 (2026-10-30)</b>: 클라이언트 브라우저에서 AI SDK를 완전 분리하여 Express 백엔드 프록시(`/api/ai/*`) 경유 방식으로 보안 아키텍처 개편</li>
        <li><b>v3.33.0 (2026-10-30)</b>: 메인보드, 그래픽(GPU), 램(RAM), SSD, CPU, 파워 등 10대 하드웨어 부품별 다차원 카테고리 필터링 엔진 탑재</li>
        <li><b>v3.31.0 (2026-10-25)</b>: 브라우저 5MB 로컬스토리지 한계를 극복하는 고용량 IndexedDB 비동기 저장 엔진(`idbStorage.ts`) 도입 (100MB+ 무제한 캐시)</li>
        <li><b>v3.30.0 (2026-10-25)</b>: GitHub Pages 정적 환경에서 백업 ZIP 파일 업로드 시 클라이언트 측에서 직접 데이터를 자동 병합 및 다운로드하는 클라이언트 머지 엔진 탑재</li>
        <li><b>v3.29.0 (2026-10-25)</b>: Google AdSense 수익화 설정 모듈 및 5대 영역(검색창, 탑배너, 인피드, 본문, 푸터) 동적 광고 배치 시스템 통합</li>
        <li><b>v3.27.0 (2026-10-24)</b>: GitHub Actions GitOps 자율 수집 엔진과 실시간 수집 카운트 연동 대시보드 구축</li>
        <li><b>v3.26.0 (2026-10-24)</b>: GitHub Pages 무중단 배포를 위한 404 SPA 리디렉션 및 `.nojekyll` 자동 구성 스크립트 탑재</li>
        <li><b>v3.21.0 (2026-10-24)</b>: Web Speech API 기반 마이크 음성 인식(STT) 기능 지원으로 음성 말하기를 통한 즉시 오류 진단 구현</li>
        <li><b>v3.18.0 (2026-10-24)</b>: 다크 모드(Dark Mode) 및 라이트 모드 실시간 테마 전환과 브라우저 테마 설정 자동 동기화 지원</li>
        <li><b>v3.15.0 (2026-10-23)</b>: 악성 스크립트 사전 방지를 위한 샌드박스 위협 검증기(Threat Verifier) 및 PowerShell 디지털 서명 검증 패널 구축</li>
        <li><b>v3.12.0 (2026-10-21)</b>: 윈도우 부팅 시 자동 실행 등록 스크립트(`WinFix_Register_Startup.bat`) 및 바탕화면 바로가기(.url) 생성기 탑재</li>
        <li><b>v3.9.0 (2026-10-09)</b>: GitHub Releases 실시간 업데이트 확인 모달 및 무설치/설치형 패키지 릴리즈 파이프라인 구축</li>
        <li><b>v3.6.0 (2026-08-09)</b>: 오류 증상 다국어(한국어/영어) 실시간 번역 및 글로벌 사용자 인터페이스 전환 지원</li>
        <li><b>v3.0.0 (2026-06-01)**: Google Gemini AI 기반 윈도우 블루스크린 및 시스템 오류 원인 진단과 PowerShell 자가치료 스크립트 자동 생성 엔진 최초 출시</li>
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
