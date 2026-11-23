# 🛠️ Windows Fix Wizard (윈도우 문제 해결 마법사)

[![Version](https://img.shields.io/badge/version-v3.110.0-blue.svg?style=flat-square)](https://github.com/AhBiYout-all/windows-fix-wizard/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![GitHub Pages Deploy](https://github.com/AhBiYout-all/windows-fix-wizard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/AhBiYout-all/windows-fix-wizard/actions/workflows/deploy-pages.yml)
[![GitOps Collector](https://github.com/AhBiYout-all/windows-fix-wizard/actions/workflows/windows-fix-collector.yml/badge.svg)](https://github.com/AhBiYout-all/windows-fix-wizard/actions/workflows/windows-fix-collector.yml)

> **Google Gemini AI 실시간 웹 그라운딩과 Zero Cloud DB (`data/*.json` + AES-256-GCM 비공개 백업 금고), GitHub Actions/Pages 3각 자동 연동 파이프라인을 결합한 Windows 10/11/Server 시스템 복구 플랫폼**

---

## 🌐 공식 서비스 접속 및 리소스
- 🚀 **무료 웹 서비스 즉시 접속**: [https://ahbiyout-all.github.io/windows-fix-wizard/](https://ahbiyout-all.github.io/windows-fix-wizard/)
- 🌐 **공식 기술 블로그 (AhBiYout Vibe)**: [https://ahbiyoutvibe.blogspot.com/](https://ahbiyoutvibe.blogspot.com/)
- 💻 **공식 GitHub 소스코드 저장소**: [https://github.com/AhBiYout-all/windows-fix-wizard](https://github.com/AhBiYout-all/windows-fix-wizard)
- 🏢 **공식 협력 네트워크**: [https://www.cisnet.co.kr](https://www.cisnet.co.kr)

---

## 💡 주요 핵심 기능 (Key Features)

### 1. 🤖 Google Gemini AI 실시간 심층 진단 & 음성 인식
- 오류 코드(예: `0x80070005`, `0x800f081f`) 또는 증상 설명("업데이트가 99%에서 멈춤")을 입력하면 AI가 실시간 Google Search Grounding 및 다중 무료 AI 폴백(Groq, Mistral, OpenRouter, NVIDIA NIM 등)을 통해 최신 해결책과 PowerShell 자가치료 스크립트를 즉시 생성합니다.
- **Web Speech API** 기반 마이크 음성 인식을 지원하여 타이핑 없이 말로 손쉽게 증상을 전달할 수 있습니다.

### 2. ⚡ 검증된 Known Issues 가이드북 & 하드웨어 분류
- Microsoft 기술 포럼 및 GitHub Actions 자율 수집으로 누적된 검증된 Windows 오류 해결 지식베이스를 내장(`data/issues.json`).
- **10대 하드웨어 부품 분류 필터링**: 메인보드/BIOS, GPU/그래픽, 메모리/RAM, 저장장치/SSD, 프로세서/CPU, 전원/배터리, 디스플레이, 사운드, 네트워크, 주변기기/USB.

### 3. 📦 Zero Cloud DB + Jamstack PWA + IndexedDB 고속 캐싱
- 외부 클라우드 DB 과금이나 일일 쿼터 제한 없는 **로컬 파일 DB(`data/*.json`) + GitHub Pages 정적 PWA + 브라우저 IndexedDB(`winfix_merged_issues`)** 하이브리드 구조.
- Workbox PWA 서비스 워커가 `/data/*.json`·`/api/*` 경로를 항상 네트워크 우선(`NetworkOnly`)으로 조회해 재배포 직후에도 최신 데이터셋을 즉시 반영합니다.

### 4. 🔄 GitHub · GitHub Pages · AI Studio 프리뷰 3각 자동 연동
- `.github/workflows/windows-fix-collector.yml`이 3시간마다(`0 */3 * * *`) 무료 클라우드 러너에서 최신 윈도우 오류를 자동 수집해 Git 저장소에 커밋하고, `autoDeployPages` 설정에 따라 `deploy-pages.yml`로 GitHub Pages를 단일 파이프라인 배포합니다.
- **실시간 웹훅 + 5분 백그라운드/탭 복귀 자동 통합**: 공유 앱 URL(`https://ais-pre-...`)로 웹훅을 즉시 수신하고, 서버 부팅 및 탭 복귀 시 GitHub Contents API로 CDN 지연 없이 최신 이슈·피드·수집 옵션을 자동 병합합니다.
- **서버 PAT 프록시 텔레메트리**: 브라우저에 평문 토큰을 노출하지 않고 서버 프록시(`/api/github/workflow-status`, `/api/github/workflow-runs`)를 통해 워크플로 상태와 원클릭 `Run` 실행을 제공합니다.

### 5. 🔐 비공개 저장소 AES-256-GCM 암호화 백업 금고 (`windows-fix-wizard-admin`)
- 회원 계정(`data/users.json`), AI API 키·시스템 설정, 보안 차단 규칙, 월간 감사 로그 및 일별 스냅샷을 별도 비공개 저장소에 AES-256-GCM(scrypt 키 유도)으로 분리 암호화 백업·복원하며, **보존 정책 및 긴급 키 순환 모달**을 지원합니다.

### 6. 🛡️ 위협 검증기 (Threat Verifier) & PowerShell 무결성 검사
- 의심스러운 외부 스크립트나 명령어가 포함된 배치 파일의 유해성을 사전에 정밀 분석하고, 안전한 롤백(Rollback) 스크립트를 자동 컴파일합니다.

---

## 🏗️ 시스템 아키텍처 (System Architecture)

```
[사용자 브라우저] (Desktop / Mobile / PWA)
       │
       ├─► [GitHub Pages 정적 PWA] ──► data/issues.json · github-feed.json (Workbox NetworkOnly)
       │         │
       │         └─► [IndexedDB 로컬 스토리지] (오프라인·초고속 인메모리 검색)
       │
       └─► [Express Node.js 풀스택 API (Zero Cloud DB)]
                 │
                 ├─► /api/ai/*      ──► Gemini AI + 다중 무료 AI 폴백 & 쿨다운 자동 치유
                 ├─► /api/github/*  ──► GitOps API · 서버 PAT 텔레메트리 프록시 · 웹훅(/sync)
                 └─► /api/admin/*   ──► 로컬 파일 DB(data/*.json) + 비공개 저장소 AES-256-GCM 금고
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