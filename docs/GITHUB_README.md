# 🛠️ Windows Fix Wizard - GitHub Repository Documentation (v3.110.0)

[![Version](https://img.shields.io/badge/version-v3.110.0-blue.svg?style=flat-square)](https://github.com/AhBiYout-all/windows-fix-wizard/releases)
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
1. **Frontend**: React 19, Vite, Tailwind CSS v4, Workbox PWA (`NetworkOnly` 정적 JSON), Framer Motion, Lucide Icons, Recharts
2. **Backend**: Express (TypeScript/Node.js), esbuild, Nodemailer, Zero Cloud DB (`data/*.json` 원자적 로컬 저장)
3. **AI Engine**: Google Gemini API + Multi-Model/Keyless Fallback (Server-side proxy routes `/api/ai/*`, Multi-key Rotation, 쿨다운 자동 치유)
4. **Data Persistence & 3각 자동 연동**:
   - **Jamstack Static CDN & PWA**: `data/issues.json`, `data/github-feed.json`, `data/ai-model-registry.json`, `data/github-collector-options.json`을 GitHub Pages 정적 빌드에 포함해 0원 서빙
   - **Browser Storage**: High-Capacity IndexedDB (`src/utils/idbStorage.ts`) 기반 고속 인메모리 검색 및 사용자 지정 저장소·브랜치 병합
   - **GitOps Automation**: `.github/workflows/windows-fix-collector.yml`이 3시간 주기(`0 */3 * * *`)로 수집·커밋하고 `autoDeployPages` 설정에 따라 `deploy-pages.yml` 단일 트리거 실행
   - **Preview Auto-Sync**: 서버 부팅·5분 쿨다운·탭 복귀(`visibilitychange`) 시 `/api/github/auto-integrate`가 GitHub Contents API로 CDN 지연 없이 이슈·피드·수집 옵션을 동기화하며, 공유 앱 URL(`ais-pre-*`) 웹훅(`/api/github/sync`)으로 즉시 반영
   - **Private Admin Vault**: 별도 비공개 저장소(`windows-fix-wizard-admin`)에 회원·설정·보안 금고 및 일별 스냅샷을 AES-256-GCM으로 암호화 백업·복원 (일부 긴급 키 순환 정책 지원)

---

## 🛠️ GitHub Actions 워크플로 목록
| 워크플로 파일 | 역할 | 트리거 주기 | 권한 요구사항 |
| :--- | :--- | :--- | :--- |
| `.github/workflows/deploy-pages.yml` | GitHub Pages 웹 앱 빌드 및 정적 데이터 4종 배포 (`NetworkOnly` PWA) | `main` 푸시 · 수동 디스패치 (`collector` 완료 후 옵션 연동) | `contents: read`, `pages: write`, `id-token: write`, `actions: read` |
| `.github/workflows/windows-fix-collector.yml` | Gemini/다중 AI 실시간 수집, GitOps 커밋, 웹훅 전송 및 Pages 연동 | 매 3시간 (`0 */3 * * *`) 및 수동 디스패치 | `contents: write`, `actions: write` |

---

## 📜 라이선스
MIT License. Copyright (c) 2026 AhBiYout.
