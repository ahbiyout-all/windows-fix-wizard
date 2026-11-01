# Windows Fix Wizard - System Architecture Overview

This document describes the high-level architecture, database configuration, security, and recovery strategies implemented in the Windows Fix Wizard.

---

## 1. Multi-Tier Architecture

The application runs as a full-stack Node.js + React application built on Vite and Express, running on Cloud Run containers.

```
       ┌────────────────────────┐
       │   React 18 / Vite UI   │
       └───────────┬────────────┘
                   │
                   │ (HTTP API / Auth Token)
                   ▼
       ┌────────────────────────┐
       │      Express API       │
       └───────────┬────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌────────────────┐   ┌────────────────┐
│  Firestore DB  │   │ Server JSON DB │
│  (Persistent)  │   │ (HA Fallback)  │
└────────────────┘   └────────────────┘
```

### Frontend (Client-Side)
- **Framework**: React 18 with Vite.
- **Styling**: Tailwind CSS with standard visual colors, generous negative spacing, and reactive layouts.
- **Interactions**: Integrated animation patterns using Framer Motion (`motion/react`).
- **Icons**: Standardized using `lucide-react`.

### Backend (Server-Side)
- **Engine**: Express with TypeScript running on port `3000`.
- **Packaging**: Bundled into CJS format in production via `esbuild` to optimize cold-starts and solve native path resolutions.

---

## 2. High-Availability (HA) Dual Database

To guarantee 100% service uptime under free-tier database limits (such as Firestore daily read/write quota exhaustion), the application incorporates a dual-mode persistence layer:

1. **Firestore DB (Primary Mode)**:
   - Synchronizes live data, user logs, and system states.
   - Leverages Firestore rules to secure reads and writes.
2. **Server JSON File DB (High-Availability Fallback)**:
   - Locally stored JSON database located in the server's `./data` directory.
   - If a Firestore operation fails due to quota limit exceeded errors (e.g., `Quota limit exceeded...`), the system automatically switches the active fetch mode to the server-side JSON file database.

---

## 3. Installation & OS Integration Features

Windows Fix Wizard provides two primary native-like features for PC users:
- **Desktop Shortcut Creator**: Generates and downloads a preconfigured `.url` shortcut that can be placed on the user's desktop for immediate launching.
- **Startup Folder Registration**: Generates and downloads a custom `WinFix_Register_Startup.bat` script. When executed on Windows, it creates an internet shortcut inside the user's `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` folder to launch the service automatically when the computer boots up.

---

## 4. Disaster Recovery & System Backups

An **Automated System Recovery Backup** tool is provided inside the Administrator console:
- **Zip Compression**: Leverages `jszip` to aggregate both Firestore collections and local database backups into a single `.zip` file on demand.
- **Encrypted Authentication**: Only authorized admin users can invoke this route. Requests are guarded by Firebase Auth ID token verification.

---

## 5. Real SMTP Gateway & Alert Relay

The system incorporates an automated sentinel alerting engine:
- **Nodemailer Transport**: Dynamically configured via server configuration (`/data/maintenance_config.json` and Firestore `system_config/maintenance`).
- **Live Connection Handshake**: Evaluates socket connection and credentials using `POST /api/admin/smtp/verify` before applying changes.
- **Fallback Sandbox**: If external SMTP settings are omitted or reset, the system operates in sandbox mode logging email payloads safely to server logs.

---

## 6. Security Hardening & Rate Limiting

Comprehensive application security features enforced on the backend:
- **Header Hardening**: Suppressed `X-Powered-By` fingerprinting and injected `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, and `Referrer-Policy`.
- **IP-Based Rate Limiting**: In-memory rate limiting applied on sensitive routes (`/api/admin/smtp/verify` limited to 10 req/min; `/api/visitor/log` limited to 60 req/min).
- **Admin Verification Middleware**: Strict Firebase Auth token authentication required (`requireAdmin`) for all administrative actions.

---

## 7. Zero-Quota Jamstack & IndexedDB In-Browser Engine (v3.50.0)

To overcome cloud database free tier quotas (e.g., Firestore 50k reads/day) and deliver instantaneous response times:
- **100% Static Jamstack Deployment**: Supports serverless hosting on GitHub Pages with complete dataset (`data/issues.json`) bundled directly.
- **High-Capacity IndexedDB Cache**: Caches 1,300+ known Windows troubleshooting guides asynchronously in browser storage via `src/utils/idbStorage.ts`, bypassing the 5MB `localStorage` limit.
- **Hardware Component Multi-Dimensional Taxonomy**: Fast in-memory filtering by Motherboard/BIOS, GPU, RAM, Storage, CPU, Power, Display, Audio, Network, and Peripherals.

---

## 8. Server-Side Gemini API Routing & Multi-Key Rotation

- **Zero Client-Side Keys**: The browser client never handles API keys or imports `@google/genai` directly. All AI requests proxy through Express endpoints (`/api/ai/diagnose`, `/api/ai/generate`, `/api/ai/verify-issue`).
- **Dynamic Quota Healing & Multi-Key Fallback**: Automatically rotates between configured Gemini API keys (`CUSTOM_API_KEY`, `GEMINI_API_KEY`) and engages a 3-minute cooldown on 429 quota exhaustion rather than throwing fatal crashes.

---

## 9. Live Recharts API Telemetry & GitOps Monitoring

- **Dual-Layer Analytics**: Displays real-time charts in the Admin Dashboard tracking Jamstack Feed Requests, IndexedDB queries, Gemini API requests, and GitHub Actions sync executions.
- **Live Workflow Status Badges**: Real-time GitHub API integration displaying the health of `.github/workflows/windows-fix-collector.yml` and `.github/workflows/deploy-pages.yml`.

---

## 10. Scroll-Based Reading Progress Bar & GitOps SSH Auth

- **ReadingProgressBar**: Smooth scroll indicator built on Framer Motion's `useScroll` tracking reading progress through long multi-step troubleshooting articles.
- **GitOps SSH Authentication**: Supports both Personal Access Tokens (PAT) and SSH Private Key credentials for repository synchronization.

