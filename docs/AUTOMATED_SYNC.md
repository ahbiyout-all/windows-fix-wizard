# Automated AI & GitOps Sync Documentation (v3.111.0)

This document explains how automated data collection, HMAC-signed webhooks, live triangle telemetry, and 3-way synchronization (**GitHub Repository ↔ GitHub Pages ↔ AI Studio Preview Server**) work in Windows Fix Wizard.

## 1. Overview
Windows Fix Wizard operates on a **Zero Cloud DB** architecture (`data/*.json` atomic local persistence + GitHub GitOps + GitHub Pages PWA). Because Cloud Run preview instances scale down when idle or run behind developer auth gates, the system combines HMAC-SHA256 signed push/heartbeat webhooks, live 4-node triangle probes, boot/visibility auto-integration, and CDN-bypassed GitHub API polling.

## 2. Webhook Endpoints

### A. GitHub Actions Live Sync Webhook (Primary)
- **URL**: `https://<SHARED_APP_URL>/api/github/sync`
- **Method**: `POST`
- **Authentication**:
  - `x-winfix-signature-256` (or `x-hub-signature-256`) `sha256=<hex>` HMAC-SHA256 signature computed over the raw UTF-8 request body using `GITHUB_WEBHOOK_SECRET` or `CRON_SECRET` (`crypto.timingSafeEqual`), **or**
  - `x-cron-secret` header matching server `CRON_SECRET` env var (constant-time comparison), **or**
  - Verified Admin `Authorization: Bearer <token>` header when `CRON_SECRET` is unset.
- **Behavior**: Deduplicates incoming `issues`, merges into `data/issues.json`, atomically updates `data/github-feed.json` from payload `feed`, records signed telemetry in `data/webhook_events.json`, and resets auto-integration cooldown.

### B. Collector Heartbeat & Pages Deployment Webhook
- **URL**: `https://<SHARED_APP_URL>/api/github/webhook/heartbeat`
- **Method**: `POST`
- **Authentication**: Same HMAC-SHA256 (`x-winfix-signature-256`) / `x-cron-secret` verification as `/api/github/sync`.
- **Behavior**: Records `collector-heartbeat` events (when `scripts/github-collector.ts` finishes with 0 new duplicates) and `pages-deploy` completion events (from `.github/workflows/deploy-pages.yml`) into `data/webhook_events.json`.

### C. External Keep-Alive / Cron Collection Trigger
- **URL**: `https://<SHARED_APP_URL>/api/cron-sync`
- **Method**: `GET` / `POST`
- **Authentication**: `x-cron-secret` header matching `CRON_SECRET`.

> ⚠️ **CRITICAL — `ais-dev-*` vs `ais-pre-*` URL Rule**:
> Never use the private Development App URL (`https://ais-dev-...`) for `APP_WEBHOOK_URL` in GitHub Secrets. External `POST` requests to `ais-dev-*` are intercepted by Google auth and receive an HTML login page (`HTTP 200 HTML` or redirect). Publish/Share the app in AI Studio and register the public **Shared App URL (`https://ais-pre-...`)** after confirming `GET /api/health` returns JSON `{"status":"ok"}`. Both `scripts/github-collector.ts` and `GET /api/github/triangle-status` explicitly detect `UNPUBLISHED_404` and `AUTH_GATE_HTML`.

## 3. Server Configuration (Environment / Secrets)
1. **`CRON_SECRET`** *(and optional `GITHUB_WEBHOOK_SECRET`)*: Shared secret between Express and GitHub Actions for constant-time secret and HMAC-SHA256 webhook verification.
2. **`SHARED_APP_URL`**: Public Shared App URL (`https://ais-pre-...run.app`) displayed in Admin setup guides and probed by `GET /api/github/triangle-status`.
3. **`CUSTOM_API_KEY` / `GEMINI_API_KEY`**: Gemini API key(s) for server-side & runner AI generation and Search Grounded official Microsoft link repair.
4. **`GITHUB_TOKEN`** *(Recommended for AI Studio Preview reverse sync)*: GitHub PAT (`repo` + `workflow` scopes) set via server env or Admin UI GitHub Settings so AI Studio Preview can push commits, dispatch workflows, and trigger GitHub Pages deployments without exposing plaintext tokens to the browser.

## 4. GitHub Actions GitOps Pipeline
- **Collector Workflow (`.github/workflows/windows-fix-collector.yml`)**:
  - Runs every 3 hours (`0 */3 * * *` UTC) or manually via `workflow_dispatch`, targeting **`Windows 11, Windows 10`** by default (`data/github-collector-options.json`).
  - Runs `npx tsx scripts/github-collector.ts` with multi-model / keyless AI resilience, updates `data/issues.json`, `data/github-feed.json`, `data/ai-model-registry.json`, and `src/data/knownIssues.ts` (when `autoIntegrateSeed` is enabled).
  - Signs and pushes `/api/github/sync` (new issues) or `/api/github/webhook/heartbeat` (0 new issues), commits/pushes changes to `main`, and triggers `deploy-pages.yml` when datasets change (respecting `autoDeployPages`).
- **Pages Deploy Workflow (`.github/workflows/deploy-pages.yml`)**:
  - Single-triggered on `push` to `main` or `workflow_dispatch` (no duplicate `workflow_run` trigger).
  - Builds Vite + Workbox PWA (`NetworkOnly` for `/data/*.json` & `/api/*`, `cleanupOutdatedCaches: true`), copies dataset JSONs into `dist/data/`, and sends an optional HMAC-signed `pages-deploy` heartbeat callback when `APP_WEBHOOK_URL` and `CRON_SECRET` are configured.

## 5. Server Auto-Integration & Live 4-Node Triangle Monitoring
- **Boot & Visibility Auto-Integrate (`POST /api/github/auto-integrate`)**: Runs on server startup and frontend tab focus (`visibilitychange` with 5-minute client / 2-minute server cooldown). Prefers GitHub Contents API (`Accept: application/vnd.github.v3.raw`, `Cache-Control: no-cache`) over cached raw CDN when PAT or `force` is used, and synchronizes `data/issues.json`, `data/github-feed.json`, and `data/github-collector-options.json`.
- **3-Way Triangle Telemetry Probe (`GET /api/github/triangle-status`, Admin)**: Simultaneously probes Local Server, GitHub Repo API, GitHub Pages `data/issues.json` drift, and Shared App Webhook (`ais-pre-*`) reachability + recent HMAC audit events.
- **Workflow Proxies**: `GET /api/github/workflow-status` and `GET /api/github/workflow-runs` allow AI Studio Preview to display live Actions telemetry and one-click `Run` triggers using server-side PAT credentials cleanly.

## 6. Automated `curl` E2E Pipeline Verification
Run the non-destructive 9-stage automated verification suite (`scripts/verify-sync-pipeline.sh`) to audit server health, version parity, feed integrity, webhook secret/HMAC/HTML-redirect guards, admin endpoint `401` protections, server PAT workflow proxies, non-destructive auto-integrate behavior, pre-flight script safety/rollback compilation, and optional remote/PWA build checks:
- **Local API Suite**: `npm run verify:sync`
- **Full Check (Remote Pages + Shared URL + Lint + PWA Build)**:
  `bash scripts/verify-sync-pipeline.sh --check-remote --shared-url https://<SHARED_APP_URL> --with-build`

