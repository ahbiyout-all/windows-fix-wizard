# WinFix Security Hardening & Real SMTP Gateway Guide

This document provides a detailed technical reference for the application security mechanisms, rate limiting policies, HTTP response headers, and the real SMTP email delivery gateway implemented in Windows Fix Wizard.

---

## 1. Application Security & Hardening Architecture

### 🛡️ HTTP Response Headers
To prevent common web application vulnerabilities, the Express backend server (`server.ts`) enforces the following HTTP security headers on all responses:

- **`X-Powered-By` Header Suppression**: Express default `X-Powered-By: Express` header is explicitly disabled via `app.disable("x-powered-by")` to prevent technology stack disclosure and targeted automated fingerprinting.
- **`X-Content-Type-Options: nosniff`**: Prevents browsers from MIME-sniffing response content types, enforcing declared content types (e.g., preventing executable scripts from running disguised as text or images).
- **`X-Frame-Options: SAMEORIGIN`**: Mitigates clickjacking attacks by preventing external sites from embedding the application inside malicious `<iframe>` tags.
- **`X-XSS-Protection: 1; mode=block`**: Enables browser-level reflected cross-site scripting (XSS) filters to block page rendering when malicious script injection is detected.
- **`Referrer-Policy: strict-origin-when-cross-origin`**: Protects privacy by stripping path and query string parameters when navigating away to external websites.

---

## 2. In-Memory IP Rate Limiting

Sensitive endpoints susceptible to abuse, log flooding, or credential-stuffing attacks are protected by an in-memory IP rate limiter (`createRateLimiter` store in `server.ts`):

| Endpoint Path | Rate Limit Threshold | Window Period | Purpose |
|---|---|---|---|
| `POST /api/admin/smtp/verify` | 10 requests / IP | 60 seconds (1 min) | Prevents brute-forcing or abusing external SMTP servers via handshake verification. |
| `POST /api/visitor/log` | 60 requests / IP | 60 seconds (1 min) | Prevents log-flooding attacks on visitor telemetry and database storage. |

When an IP exceeds the allowed threshold within the time window, the server returns HTTP `429 Too Many Requests`:
```json
{
  "success": false,
  "error": "TOO_MANY_REQUESTS: SMTP_VERIFY 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요."
}
```

---

## 3. Administrative Route Access Controls

All administrative endpoints are guarded by the `requireAdmin` Express middleware:
1. Extracts the HTTP `Authorization: Bearer <ID_TOKEN>` header sent from the client.
2. Verifies the token authenticity using Firebase Admin Authentication SDK.
3. Checks if the decoded user UID matches the designated admin user or contains admin claims.
4. Rejects unauthorized or missing token requests with HTTP `401 Unauthorized` or `403 Forbidden`.

---

## 4. Real SMTP Email Gateway Integration

The system supports real-time email delivery for AI engine health alarms and automated maintenance reports.

### 📧 Supported SMTP Providers & Preset Settings
The administration dashboard (`App.tsx`) provides quick preset buttons for common email providers:

- **Gmail**: `smtp.gmail.com` (Port 587 - TLS)
  - *Requirement*: Requires generating a 16-character **Google App Password** under Account Security (2-Step Verification must be enabled).
- **Naver**: `smtp.naver.com` (Port 587 - TLS)
  - *Requirement*: Must enable `POP3/SMTP 사용함` in Naver Mail Settings (`환경설정 → POP3/IMAP`).
- **Outlook / Office 365**: `smtp.office365.com` (Port 587 - TLS)

### 🔌 Live Connection Verification (`POST /api/admin/smtp/verify`)
Before saving SMTP settings, administrators can verify the connection:
1. The server constructs a temporary Nodemailer transport with configured socket timeouts (10 seconds).
2. Executes `await transporter.verify()` to perform a socket connection, TLS negotiation, and SMTP `AUTH LOGIN` handshake.
3. Returns instant feedback to the frontend banner (`HANDSHAKE OK` vs `VERIFY FAILED`).

### 🔄 Settings Reset & Fallback Mode
- Clicking **설정 초기화 (Reset Settings)** clears the saved SMTP configuration (`smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`).
- The system gracefully falls back to **Virtual Sandbox Mode**, where email payloads are safely logged to system logs without throwing runtime errors.
