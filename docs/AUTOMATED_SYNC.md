# Automated AI Sync Documentation (Webhook)

This document explains how to use and configure the automated AI collection system implemented in this application.

## 1. Overview
The application supports fully automated background data collection. Since the preview environment (Cloud Run) may go to sleep when there is no traffic, we provide a **Webhook Endpoint** that can be triggered by external "Keep-Alive" or "Cron" services.

## 2. Webhook Endpoint
- **URL**: `https://<YOUR_APP_URL>/api/cron-sync`
- **Method**: `POST`
- **Authentication**: Required via custom header.

### Required Header
| Header Name | Value |
|-------------|-------|
| `x-cron-secret` | The value matching your `CRON_SECRET` environment variable |

## 3. Configuration (Settings > Secrets)
To use this feature, ensure the following secrets are configured in AI Studio:

1. **`CRON_SECRET`**: A private password of your choice (e.g., `WinFixAutoSync2024`). This prevents unauthorized people from triggering your AI quota.
2. **`CUSTOM_API_KEY`**: Your Gemini API Key. Automated tasks strictly require this to ensure stable performance.
3. **`FIREBASE_SERVICE_ACCOUNT`** (Optional but Recommended): 
   - If the server reports "Permission Denied" during automated writes, you must provide a Firebase Service Account JSON.
   - Go to Firebase Console > Project Settings > Service Accounts > Generate New Private Key.
   - Paste the entire JSON content into this secret.

## 4. How to Set Up External Cron
You can use free services like [cron-job.org](https://cron-job.org) or [Google Cloud Scheduler](https://cloud.google.com/scheduler).

### Example Setup (cron-job.org):
1. **Title**: WinFix Auto Sync
2. **URL**: `https://your-app-url.run.app/api/cron-sync`
3. **Execution**: Every 1 hour (or as desired)
4. **Request Method**: `POST`
5. **Custom Headers**:
   - Key: `x-cron-secret`
   - Value: (The password you set in `CRON_SECRET`)

## 5. Built-in Internal Scheduler
The server also includes a built-in scheduler (`node-cron`) that runs every 2 hours:
```javascript
cron.schedule('0 */2 * * *', async () => { ... });
```
*Note: This internal scheduler only works while the server is "awake". Using the Webhook (Section 2) is the most reliable way to ensure the server wakes up and performs the task.*

## 6. High-Availability Server JSON Fallback Integration
When the server performs background collection or counts retrieval, and the Firestore quota has been exceeded or connection issues occur, the system automatically redirects and serves requests using the **High-Availability Server JSON File DB** (`/data/` directory). This ensures 100% uptime for end-users and background collectors even when Firebase hits its free tier limits.

## 7. Monitoring
You can check the status of the last automated sync in the Firestore database:
- **Collection**: `system_config`
- **Document**: `status`
- **Fields**: `lastSyncAt`, `lastCronResult`
