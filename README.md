# 🛠️ Windows Fix Wizard (윈도우 문제 해결 마법사)

[![Version](https://img.shields.io/badge/version-v3.111.0-blue.svg?style=flat-square)](https://github.com/AhBiYout-all/windows-fix-wizard/releases)
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

### 1. 🎯 증상 선택형 4단계 진단 마법사 & Google Gemini AI 심층 진단
- 오류 코드를 몰라도 **문제 영역 → 세부 증상·발생 시점 → PC 환경·자동 롤백 옵션 → 내장 DB 랭킹 처방 / AI 복합 진단**의 4단계 퍼널을 따라 맞춤형 해결책을 제시합니다.
- 오류 코드 직접 입력 및 **Web Speech API** 기반 음성 받아쓰기도 함께 지원하며, 실시간 Google Search Grounding 및 다중 무료 AI 폴백으로 최신 해결책을 생성합니다.

### 2. 🛡️ 복구 스크립트 사전 안전 검증(Pre-Flight AST+린트) & 자동 롤백 포인트 래퍼
- 스크립트 복사 또는 WebAssembly 샌드박스 모의 실행 전 **AST 보안 분석(`psVerifier`) + 17종 품질 린트(`psLinter`)** 사전 게이트를 실행합니다.
- 자동 롤백 옵션을 켜면 `Checkpoint-Computer` 시스템 복원 지점 생성과 수정 대상 레지스트리 키 자동 백업(`reg.exe export` + `Restore_Registry.cmd`)을 스크립트 상단에 멱등하게 결합합니다.

### 3. 🔗 깨진 참고 링크 자동 탐지 & 공식 Microsoft URL 교정 워크벤치
- 참고 URL의 HTTP 도달 가능 여부를 순환 점검하고, Google Search Grounding과 Microsoft 공식 도메인(`learn.microsoft.com`, `support.microsoft.com`) + 서버 HTTP 200 실검증을 거쳐 관리자 화면에서 1-클릭/일괄 URL 교정을 반영합니다.

### 4. 🔄 GitHub · GitHub Pages · AI Studio 프리뷰 3각 실시간 관제 & HMAC 웹훅
- `.github/workflows/windows-fix-collector.yml`(3시간 주기)과 `deploy-pages.yml`이 **원시 바이트 기반 HMAC-SHA256(`x-winfix-signature-256`)** 서명으로 `/api/github/sync` 및 `/api/github/webhook/heartbeat` 웹훅을 전송합니다.
- 관리자 **3각 연동 실시간 모니터**가 로컬 서버 · GitHub 저장소 · GitHub Pages · 공유 프리뷰(`ais-pre-*`) 4개 노드의 상태·지연시간·데이터셋 차이(`UNPUBLISHED_404` / `AUTH_GATE_HTML` 진단 포함)와 웹훅 감사 로그를 실시간 추적합니다.

### 5. 📦 Zero Cloud DB + Jamstack PWA + AES-256-GCM 비공개 금고
- 외부 클라우드 DB 과금 없는 **로컬 파일 DB(`data/*.json`) + GitHub Pages 정적 PWA(`NetworkOnly`) + IndexedDB** 구조와 별도 비공개 저장소 AES-256-GCM 암호화 백업·긴급 키 순환 금고(`windows-fix-wizard-admin`)를 제공합니다.

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
                 ├─► /api/ai/*      ──► Gemini AI + 다중 무료 AI 폴백 & Search Grounding 링크 교정
                 ├─► /api/scripts/* ──► Pre-Flight AST+린트 검증 · 자동 롤백 포인트 컴파일러
                 ├─► /api/github/*  ──► GitOps · HMAC-SHA256 웹훅(/sync, /heartbeat) · 3각 상태 프로브
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