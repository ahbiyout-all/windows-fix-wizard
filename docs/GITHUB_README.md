# 🛠️ Windows Fix Wizard - GitHub Repository Documentation (v3.50.0)

[![Version](https://img.shields.io/badge/version-v3.50.0-blue.svg?style=flat-square)](https://github.com/AhBiYout-all/windows-fix-wizard/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](../LICENSE)
[![GitHub Pages Deploy](https://github.com/AhBiYout-all/windows-fix-wizard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/AhBiYout-all/windows-fix-wizard/actions/workflows/deploy-pages.yml)
[![GitOps Collector](https://github.com/AhBiYout-all/windows-fix-wizard/actions/workflows/windows-fix-collector.yml/badge.svg)](https://github.com/AhBiYout-all/windows-fix-wizard/actions/workflows/windows-fix-collector.yml)

본 문서는 **Windows Fix Wizard (윈도우 문제 해결 마법사)** 프로젝트의 GitHub 오픈소스 저장소 전용 종합 가이드 및 사양서입니다.

---

## 📌 주요 링크 (Official Channels)
- 🚀 **GitHub Pages 배포 웹사이트**: [https://ahbiyout-all.github.io/windows-fix-wizard/](https://ahbiyout-all.github.io/windows-fix-wizard/)
- 💻 **공식 GitHub 저장소**: [https://github.com/AhBiYout-all/windows-fix-wizard](https://github.com/AhBiYout-all/windows-fix-wizard)
- 🌐 **공식 구글 기술 블로그**: [https://ahbiyoutvibe.blogspot.com/](https://ahbiyoutvibe.blogspot.com/)
- 🏢 **공식 제휴사 (CISNet)**: [https://www.cisnet.co.kr](https://www.cisnet.co.kr)

---

## 🌟 핵심 기술 스택 및 아키텍처
1. **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide Icons, Recharts
2. **Backend**: Express (TypeScript/Node.js), esbuild, Nodemailer
3. **AI Engine**: Google Gemini API (Server-side proxy routes `/api/ai/*`, Multi-key Rotation, 3분 쿨다운 자동 치유)
4. **Data Persistence**:
   - Primary Jamstack Static CDN: `data/issues.json` (1,300+ 건 오류 데이터 영구 보존)
   - Browser Storage: High-Capacity IndexedDB (`src/utils/idbStorage.ts`) Sub-10ms 고속 인메모리 검색
   - GitOps Automation: GitHub Actions (`windows-fix-collector.yml`) 6시간 주기 자동 수집 및 커밋
   - Dual Authentication: Personal Access Token (PAT) & SSH Private Key 듀얼 인증 모드 지원

---

## 🛠️ GitHub Actions 워크플로 목록
| 워크플로 파일 | 역할 | 트리거 주기 | 권한 요구사항 |
| :--- | :--- | :--- | :--- |
| `.github/workflows/deploy-pages.yml` | GitHub Pages 웹사이트 자동 빌드 및 정적 CDN 배포 | `main` 푸시 시 즉시 | `contents: read`, `pages: write`, `id-token: write` |
| `.github/workflows/windows-fix-collector.yml` | Gemini AI 실시간 웹 그라운딩 자율 수집 및 GitOps 자동 커밋 | 매 6시간 (`0 */6 * * *`) 및 수동 디스패치 | `contents: write` |

---

## 📜 라이선스
MIT License. Copyright (c) 2026 AhBiYout.
