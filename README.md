# 🛠️ Windows Fix Wizard (윈도우 문제 해결 마법사)

[![Version](https://img.shields.io/badge/version-v3.50.0-blue.svg?style=flat-square)](https://github.com/AhBiYout-all/windows-fix-wizard/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![GitHub Pages Deploy](https://github.com/AhBiYout-all/windows-fix-wizard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/AhBiYout-all/windows-fix-wizard/actions/workflows/deploy-pages.yml)
[![GitOps Collector](https://github.com/AhBiYout-all/windows-fix-wizard/actions/workflows/windows-fix-collector.yml/badge.svg)](https://github.com/AhBiYout-all/windows-fix-wizard/actions/workflows/windows-fix-collector.yml)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb.svg?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.1-38bdf8.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

> **Google Gemini AI 실시간 웹 그라운딩과 1,300+ Microsoft 공인 자가치료 지식베이스를 결합한 차세대 Windows 10/11 시스템 복구 및 자율 수집 GitOps 플랫폼**

---

## 🌐 공식 서비스 접속 및 리소스
- 🚀 **무료 웹 서비스 즉시 접속**: [https://ahbiyout-all.github.io/windows-fix-wizard/](https://ahbiyout-all.github.io/windows-fix-wizard/)
- 🌐 **공식 기술 블로그 (AhBiYout Vibe)**: [https://ahbiyoutvibe.blogspot.com/](https://ahbiyoutvibe.blogspot.com/)
- 💻 **공식 GitHub 소스코드 저장소**: [https://github.com/AhBiYout-all/windows-fix-wizard](https://github.com/AhBiYout-all/windows-fix-wizard)
- 🏢 **공식 협력 네트워크**: [https://www.cisnet.co.kr](https://www.cisnet.co.kr)

---

## 💡 주요 핵심 기능 (Key Features)

### 1. 🤖 Google Gemini AI 실시간 심층 진단 & 음성 인식
- 오류 코드(예: `0x80070005`, `0x800f081f`) 또는 증상 설명("업데이트가 99%에서 멈춤")을 입력하면 AI가 실시간 Google Search Grounding을 통해 최신 해결책과 PowerShell 자가치료 스크립트를 즉시 생성합니다.
- **Web Speech API** 기반 마이크 음성 인식을 지원하여 타이핑 없이 말로 손쉽게 증상을 전달할 수 있습니다.

### 2. ⚡ 1,300+ Known Issues 공인 가이드북 & 하드웨어 분류
- Microsoft 기술 포럼 및 릴리즈 노트 기반의 1,300개 이상 검증된 오류 해결 지식베이스를 내장.
- **10대 하드웨어 부품 분류 필터링**: 메인보드/BIOS, GPU/그래픽, 메모리/RAM, 저장장치/SSD, 프로세서/CPU, 전원/배터리, 디스플레이, 사운드, 네트워크, 주변기기/USB.

### 3. 📦 제로 쿼터(Zero-Quota) Jamstack & IndexedDB 고속 캐싱
- Cloud DB 무료 쿼터 제한(일일 5만 읽기 한도)을 완벽 극복하는 **정적 Jamstack (`data/issues.json`) + 브라우저 IndexedDB 비동기 캐싱** 구조.
- 브라우저 로컬스토리지 5MB 한계를 초과하는 1,300+ 전체 데이터셋을 브라우저에 저장하여 **오프라인 환경에서도 10ms 이내 초고속 검색** 지원.

### 4. 🤖 GitHub Actions GitOps 24/7 자율 수집 엔진
- `.github/workflows/windows-fix-collector.yml`을 통해 6시간마다 무료 클라우드 러너에서 AI가 최신 윈도우 오류를 자동 수집하고 Git 저장소에 자동 커밋.
- **PAT 및 SSH Private Key 듀얼 인증 모드**를 지원하여 보안성이 한층 강화되었습니다.

### 5. 🛡️ 위협 검증기 (Threat Verifier) & PowerShell 무결성 검사
- 의심스러운 외부 스크립트나 명령어가 포함된 배치 파일의 유해성을 사전에 정밀 분석하고, 안전한 롤백(Rollback) 스크립트를 자동 컴파일합니다.

### 6. 📊 실시간 Recharts 쿼타 모니터링 & 읽기 진행률 표시
- Jamstack CDN 히트수, IndexedDB 캐시 쿼리 비율, Gemini AI 호출량을 실시간 Recharts 그래프로 시각화.
- 긴 트러블슈팅 아티클을 읽을 때 현재 진행 위치를 직관적으로 확인할 수 있는 상단 고정 스크롤 진행률 바(`ReadingProgressBar`) 탑재.

---

## 🏗️ 시스템 아키텍처 (System Architecture)

```
[사용자 브라우저] (Desktop / Mobile / Tablet)
       │
       ├─► [정적 Jamstack CDN (GitHub Pages)] ──► data/issues.json (서버리스 0원 운영)
       │         │
       │         └─► [IndexedDB 로컬 스토리지] (1,300+ 이슈 Sub-10ms 인메모리 검색)
       │
       └─► [Express Node.js 풀스택 API (/api/*)]
                 │
                 ├─► /api/ai/* ──► Gemini AI (Multi-Key Rotation & 3분 쿨다운 자동 치유)
                 ├─► /api/github/* ──► GitOps REST API (SSH Private Key & PAT 듀얼 인증)
                 └─► /api/admin/daily-quota-stats ──► Recharts 실시간 텔레메트리
```

---

## 🚀 로컬 개발 및 실행 방법 (Quick Start)

### 요구사항 (Prerequisites)
- Node.js 20 LTS 이상
- npm 또는 yarn

### 설치 및 실행
```bash
# 1. 저장소 복제
git clone https://github.com/AhBiYout-all/windows-fix-wizard.git
cd windows-fix-wizard

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정 (.env 파일 생성)
cp .env.example .env
# .env 파일에 GEMINI_API_KEY 입력 (선택: ADMIN_PASSKEY 등)

# 4. 개발 서버 실행 (포트 3000)
npm run dev

# 5. 프로덕션 빌드
npm run build
```

---

## 📄 라이선스 (License)

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

Copyright (c) 2026 **AhBiYout** (AhBiYout-all). All rights reserved.