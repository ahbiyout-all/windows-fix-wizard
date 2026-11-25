# Windows Fix Wizard - System Architecture Overview (v3.111.0)

This document describes the architecture, Zero Cloud DB persistence, 3-way GitOps synchronization, Pre-Flight PowerShell safety/rollback compilation, automated Microsoft link repair, and security hardening implemented in Windows Fix Wizard.

---

## 1. Multi-Tier Architecture

The application runs as a full-stack Node.js + React 19 application built on Vite + Express (`server.ts`, port `3000`), paired with a zero-cost GitHub Pages static PWA build:

```
┌───────────────────────────────────────────────┐
│  React 19 / Vite UI (+ Workbox PWA Cache)     │
└──────────┬──────────────────────┬─────────────┘
           │ Server Mode          │ GitHub Pages Static Mode
           ▼                      ▼
┌─────────────────────┐  ┌──────────────────────────────┐
│ Express API (/api/*)│  │ Static ./data/*.json +       │
│ + GitHub Proxy      │  │ raw.githubusercontent.com +  │
└──────────┬──────────┘  │ IndexedDB Merged Cache       │
           │             └──────────────────────────────┘
           ▼
┌───────────────────────────────────────────────┐
│ Zero Cloud DB: Atomic Local JSON (data/*.json)│
│ + Private Repo AES-256-GCM Admin Vault        │
└───────────────────────────────────────────────┘
```

### Frontend (Client-Side)
- **Framework**: React 19 with TypeScript and Vite.
- **PWA Offline / Cache Control**: `vite-plugin-pwa` with `cleanupOutdatedCaches: true` and `NetworkOnly` rules for `/data/*.json` and `/api/*` so newly deployed datasets are immediately visible.
- **Styling & UI**: Tailwind CSS v4, Framer Motion (`motion/react`), `lucide-react`, Recharts.

### Backend (Server-Side)
- **Engine**: Express with TypeScript running on port `3000` (Vite middleware in dev, CJS `esbuild` bundle in production).
- **Zero Cloud DB Storage**: Atomic temp-file write + rename (`writeJsonFileAtomic`) across `data/issues.json`, `data/users.json`, `data/github-feed.json`, `data/github-collector-options.json`, `data/ai-model-registry.json`, and structured log collections.

---

## 2. 3-Way Automated Synchronization (GitHub ↔ Pages ↔ AI Studio Preview)
1. **GitHub Actions Collector (`.github/workflows/windows-fix-collector.yml`)**:
   - Runs every 3 hours (`0 */3 * * *`) using `scripts/github-collector.ts` with multi-model & keyless fallback.
   - Updates `data/issues.json`, `data/github-feed.json`, `data/ai-model-registry.json`, and `src/data/knownIssues.ts`.
   - Signs payloads with `x-winfix-signature-256` HMAC-SHA256 + `x-cron-secret` to `/api/github/sync` (or `/api/github/webhook/heartbeat` when 0 new issues are added) with HTML login redirect detection (`ais-dev-*` vs `ais-pre-*`).
   - Conditionally dispatches `deploy-pages.yml` based on `data/github-collector-options.json` (`autoDeployPages`).
2. **GitHub Pages Deployment (`.github/workflows/deploy-pages.yml`)**:
   - Triggered cleanly via `push` or `workflow_dispatch` (no duplicate `workflow_run` trigger).
   - Builds static SPA, copies `issues.json`, `github-feed.json`, `ai-model-registry.json`, and `github-collector-options.json` into `dist/data/`, and notifies `/api/github/webhook/heartbeat` (`pages-deploy`) when configured.
3. **AI Studio Preview Sync & Live Telemetry**:
   - **Boot & Visibility Auto-Integration (`/api/github/auto-integrate`)**: Uses GitHub Contents API (`Cache-Control: no-cache`) to bypass raw CDN caching and merges remote issues, feed metadata, and collector options.
   - **Live 4-Node Triangle Monitor (`/api/github/triangle-status`)**: Probes Local Server, GitHub Repo API, GitHub Pages dataset drift, and Shared App Webhook (`UNPUBLISHED_404` / `AUTH_GATE_HTML` / `WEBHOOK_READY`) + displays `data/webhook_events.json` audit logs.
   - **Workflow Proxies**: `GET /api/github/workflow-status` and `GET /api/github/workflow-runs` proxy GitHub Actions status with server PAT scoping and 30s TTL caching.
   - **Automated Verification (`npm run verify:sync`)**: Executes 9-stage non-destructive `curl` E2E checks across health, version parity, feed counts, HMAC/secret/HTML-gate guards, admin auth guards, proxy telemetry, pre-flight script rollback compilation, and optional remote/PWA build probes.

---

## 3. Encrypted Private Repo Vault (`windows-fix-wizard-admin`) & Disaster Recovery
- **Separated Encrypted Vaults (AES-256-GCM + `scrypt` key derivation)**:
  - Members Vault (`winfix-admin-vault.enc.json`), System/API-Keys Vault (`winfix-system-vault.enc.json`), Security/Blocklist Vault (`winfix-security-vault.enc.json`), Daily Bundled Snapshots (`backups/daily/YYYY-MM-DD/vault-bundle.enc.json`), and Monthly Audit Archives.
- **Admin Backup Policy Modal (`AdminBackupPolicyModal.tsx`)**: Configure snapshot retention days (1–90), LKG local restore points (1–50), audit retention months, and perform emergency manual AES-256-GCM key rotation (`keyGeneration` bump + local recovery bundle).
- **Public Repo Guard**: Upload/push operations strictly verify repository privacy and reject public targets.
- **Full System Recovery ZIP**: Admin-authenticated `.zip` export (`jszip`) with automatic secret masking.

---

## 4. Real SMTP Gateway & Alert Relay
- **Nodemailer Transport**: Configured via `data/maintenance_config.json` with live handshake verification (`POST /api/admin/smtp/verify`) and safe virtual sandbox fallback when unconfigured.

---

## 5. Security Hardening, Pre-Flight Safety & Rate Limiting
- **HTTP Response Headers & URL Sanitization**: `X-Powered-By` disabled; `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy: strict-origin-when-cross-origin` enforced. Outbound server link checks validate every redirect hop (`fetchWithValidatedRedirects`) against private/loopback/IPv6 ranges and enforce official Microsoft domain allowlists (`learn.microsoft.com`, `support.microsoft.com`, etc.).
- **Pre-Flight AST + Lint & Auto-Rollback Wrapper (`src/utils/psRollback.ts`, `POST /api/scripts/preflight`)**: Evaluates scripts through `psVerifier` and `psLinter` before copy/sandbox execution, prepends non-fatal `Checkpoint-Computer` Restore Point creation, and exports detected registry keys to `Restore_Registry.cmd`.
- **HMAC-SHA256 Webhook Verification**: Validates raw request body bytes (`req.rawBody`) with `crypto.timingSafeEqual` on `x-winfix-signature-256` and `x-cron-secret`.
- **Rate Limiting**: In-memory IP rate limiting on `/api/admin/smtp/verify`, `/api/visitor/log`, `/api/scripts/preflight`, and `/api/github/auto-integrate`.
- **Admin Authentication & Secret Isolation**: `requireAdmin` middleware validates signed admin session tokens (`admin_sessions.json`), while plaintext GitHub PATs, private vault keys, and AI API keys stay strictly server-side (masked as `'••••••••'` in client API responses).

---

## 6. Server-Side AI Proxy, Multi-Key Resilience & Link Repair Workbench
- **Zero Client-Side Keys**: All AI diagnosis, script generation, and Search Grounded official Microsoft link repair routes (`/api/ai/*`, `/api/admin/links/propose-repairs`) execute server-side (`gemini-4-hydrogen`) with Gemini multi-key rotation, cooldown recovery, and free external AI provider fallback.


