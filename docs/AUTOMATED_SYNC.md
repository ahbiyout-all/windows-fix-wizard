# Automated AI & GitOps Sync Documentation (v3.110.0)

This document explains how automated data collection and 3-way synchronization (**GitHub Repository ↔ GitHub Pages ↔ AI Studio Preview Server**) work in Windows Fix Wizard.

## 1. Overview
Windows Fix Wizard operates on a **Zero Cloud DB** architecture (`data/*.json` atomic local persistence + GitHub GitOps + GitHub Pages PWA). Because Cloud Run preview instances scale down when idle or run behind developer auth gates, the system combines push webhooks, boot/visibility auto-integration, and CDN-bypassed GitHub API polling.

## 2. Webhook Endpoints

### A. GitHub Actions Live Sync Webhook (Primary)
- **URL**: `https://<SHARED_APP_URL>/api/github/sync`
- **Method**: `POST`
- **Authentication**:
  - `x-cron-secret` header matching server `CRON_SECRET` env var (constant-time comparison), **or**
  - Verified Admin `Authorization: Bearer <token>` header when `CRON_SECRET` is unset.
- **Behavior**: Deduplicates incoming `issues`, merges into `data/issues.json`, atomically updates `data/github-feed.json` from payload `feed`, and resets auto-integration cooldown.

### B. External Keep-Alive / Cron Collection Trigger
- **URL**: `https://<SHARED_APP_URL>/api/cron-sync`
- **Method**: `GET` / `POST`
- **Authentication**: `x-cron-secret` header matching `CRON_SECRET`.

> ⚠️ **CRITICAL — `ais-dev-*` vs `ais-pre-*` URL Rule**:
> Never use the private Development App URL (`https://ais-dev-...`) for `APP_WEBHOOK_URL` in GitHub Secrets. External `POST` requests to `ais-dev-*` are intercepted by Google auth and receive an HTML login page (`HTTP 200 HTML` or redirect). Publish/Share the app in AI Studio and register the public **Shared App URL (`https://ais-pre-...`)** after confirming `GET /api/health` returns JSON `{"status":"ok"}`. `scripts/github-collector.ts` explicitly inspects webhook responses and logs a diagnostic warning if HTML or non-2xx is returned.

## 3. Server Configuration (Environment / Secrets)
1. **`CRON_SECRET`**: Shared secret between your Express server and GitHub Actions repository secret `CRON_SECRET`.
2. **`CUSTOM_API_KEY` / `GEMINI_API_KEY`**: Gemini API key(s) for server-side & runner AI generation.
3. **`GITHUB_TOKEN`** *(Recommended for AI Studio Preview reverse sync)*: GitHub PAT (`repo` + `workflow` scopes) set via server env or Admin UI GitHub Settings so AI Studio Preview can push commits, dispatch workflows, and trigger GitHub Pages deployments without exposing plaintext tokens to the browser.

## 4. GitHub Actions GitOps Pipeline
- **Collector Workflow (`.github/workflows/windows-fix-collector.yml`)**:
  - Runs every 3 hours (`0 */3 * * *` UTC) or manually via `workflow_dispatch`.
  - Runs `npx tsx scripts/github-collector.ts` with multi-model / keyless AI resilience, updates `data/issues.json`, `data/github-feed.json`, `data/ai-model-registry.json`, and `src/data/knownIssues.ts` (when `autoIntegrateSeed` is enabled).
  - Commits and pushes changes to `main` (with 3x `git pull --rebase` retry).
  - Triggers `deploy-pages.yml` via `gh workflow run` when datasets change (respecting `data/github-collector-options.json` `autoDeployPages`).
- **Pages Deploy Workflow (`.github/workflows/deploy-pages.yml`)**:
  - Single-triggered on `push` to `main` or `workflow_dispatch` (no duplicate `workflow_run` trigger).
  - Builds Vite + Workbox PWA (`NetworkOnly` for `/data/*.json` & `/api/*`, `cleanupOutdatedCaches: true`) and copies `issues.json`, `github-feed.json`, `ai-model-registry.json`, and `github-collector-options.json` into `dist/data/`.

## 5. Server Auto-Integration & Monitoring
- **Boot & Visibility Auto-Integrate (`POST /api/github/auto-integrate`)**: Runs on server startup and frontend tab focus (`visibilitychange` with 5-minute client / 2-minute server cooldown). Prefers GitHub Contents API (`Accept: application/vnd.github.v3.raw`, `Cache-Control: no-cache`) over cached raw CDN when PAT or `force` is used, and synchronizes `data/issues.json`, `data/github-feed.json`, and `data/github-collector-options.json`.
- **Telemetry Proxies**: `GET /api/github/workflow-status` and `GET /api/github/workflow-runs` allow AI Studio Preview to display live Actions telemetry and one-click `Run` triggers using server-side PAT credentials cleanly.

## 6. Automated `curl` E2E Pipeline Verification
Run the non-destructive automated verification suite (`scripts/verify-sync-pipeline.sh`) to audit server health, version parity, feed integrity, webhook secret & HTML-redirect guards, admin endpoint `401` protections, server PAT workflow proxies, and non-destructive auto-integrate behavior:
- **Local API Suite**: `npm run verify:sync`
- **Full Check (Remote Pages + Shared URL + Lint + PWA Build)**:
  `bash scripts/verify-sync-pipeline.sh --check-remote --shared-url https://<SHARED_APP_URL> --with-build`

