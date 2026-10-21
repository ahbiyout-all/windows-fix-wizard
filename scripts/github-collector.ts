/**
 * Windows Fix Wizard - Autonomous GitHub Actions Data Collector
 * 
 * Runs in GitHub Actions on schedule or dispatch.
 * 1. Collects fresh Windows 10/11 known issues & fixes via Google Gemini AI.
 * 2. Formats & deduplicates into `data/issues.json`.
 * 3. Notifies the live web app via webhook (/api/github/sync) if configured.
 * 4. Generates step summaries for GitHub Actions UI.
 */

import "dotenv/config";
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI } from '@google/genai';

interface KnownIssue {
  id: string;
  category: string;
  code: string;
  title: string;
  title_en?: string;
  symptoms: string;
  symptoms_en?: string;
  script?: string;
  manualSteps: string[];
  manualSteps_en?: string[];
  sourceUrls: string[];
  source?: string;
  windowsVersions?: string[];
  searchKeywords?: string[];
  upvoteCount?: number;
  upvotedBy?: string[];
  downvotedBy?: string[];
  isLatest?: boolean;
  createdAt?: string;
  updatedAt?: string;
  verifiedAt?: string;
  verificationStatus?: 'pending' | 'verified' | 'needs_update' | 'obsolete';
}

const CATEGORIES = [
  '업데이트',
  '네트워크',
  '시스템/블루스크린',
  '스토어/앱',
  '정품인증',
  '보안/백신',
  '오디오/사운드',
  '디스플레이/그래픽'
];

async function runCollector() {
  console.log('====================================================');
  console.log('🚀 Windows Fix Wizard - GitHub Actions Data Collector');
  console.log(`⏰ Execution Time: ${new Date().toISOString()}`);
  console.log('====================================================\n');

  const apiKey = process.env.GEMINI_API_KEY || process.env.CUSTOM_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY or CUSTOM_API_KEY secret is not configured.');
    console.error('Please configure GEMINI_API_KEY in your GitHub Repository Settings > Secrets and variables > Actions.');
    process.exit(1);
  }

  const dataDir = path.resolve(process.cwd(), 'data');
  const issuesFilePath = path.join(dataDir, 'issues.json');
  const feedFilePath = path.join(dataDir, 'github-feed.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing issues
  let existingIssues: KnownIssue[] = [];
  if (fs.existsSync(issuesFilePath)) {
    try {
      const raw = fs.readFileSync(issuesFilePath, 'utf-8');
      existingIssues = JSON.parse(raw);
      console.log(`📂 Loaded ${existingIssues.length} existing issues from ${issuesFilePath}`);
    } catch (e: any) {
      console.warn(`⚠️ Failed to parse existing issues.json, starting fresh:`, e.message);
      existingIssues = [];
    }
  }

  // Build avoidance list
  const avoidCodes = new Set(existingIssues.map(i => (i.code || '').trim().toLowerCase()).filter(Boolean));
  const avoidTitles = existingIssues.slice(-25).map(i => i.title).join(', ');

  // Select target category
  const targetCategory = process.env.INPUT_TOPIC && process.env.INPUT_TOPIC !== 'all'
    ? process.env.INPUT_TOPIC
    : CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  console.log(`🎯 Target Category: [${targetCategory}]`);

  const batchSize = Math.min(Math.max(parseInt(process.env.BATCH_SIZE || '2', 10), 1), 4);
  console.log(`📦 Batch Size: ${batchSize}`);

  const ai = new GoogleGenAI({ apiKey });
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite'
  ];

  const prompt = `Search and identify ${batchSize} verified and LATEST (2024-2026) Windows 10/11 troubleshooting guide(s) or error code(s).
Category focus: "${targetCategory}".
Do NOT generate these existing issues: [${avoidTitles.substring(0, 400)}...].
Avoid error codes already present: [${Array.from(avoidCodes).slice(-15).join(', ')}].

Requirements for each item:
1. Specific Windows error code (e.g., 0x80070005, 0x8024402f, WHEA_UNCORRECTABLE_ERROR, 0x80073D02) or clear identifier.
2. Accurate Korean title & symptoms explaining why it occurs in recent Windows 10/11 updates.
3. English title and English symptoms.
4. A safe, non-destructive PowerShell script for diagnostic/repair if applicable (or empty string if purely manual).
5. 3-5 structured step-by-step recovery instructions in Korean (manualSteps) and English (manualSteps_en).
6. 1-2 legitimate source URLs (e.g. support.microsoft.com, learn.microsoft.com, or official tech portals).
7. Applicable Windows versions (['Windows 11', 'Windows 10']).
8. 4-6 search keywords in Korean & English.

IMPORTANT JSON FORMATTING RULES:
- Return ONLY a valid JSON array of ${batchSize} objects.
- Double-escape backslashes in Windows file paths (e.g. C:\\\\Windows\\\\System32).
- Do not use markdown wrappers or trailing comments.

JSON Schema:
[
  {
    "category": "${targetCategory}",
    "code": "string",
    "title": "Korean Title",
    "title_en": "English Title",
    "symptoms": "Korean Symptoms",
    "symptoms_en": "English Symptoms",
    "script": "PowerShell Script or empty",
    "manualSteps": ["Step 1", "Step 2", "Step 3"],
    "manualSteps_en": ["Step 1", "Step 2", "Step 3"],
    "sourceUrls": ["https://support.microsoft.com/..."],
    "windowsVersions": ["Windows 11", "Windows 10"],
    "searchKeywords": ["Keyword1", "Keyword2"]
  }
]`;

  let generatedText = '';
  let successfulModel = '';

  for (const model of modelsToTry) {
    try {
      console.log(`🤖 Attempting generation with model: ${model}...`);
      let response;
      try {
        // Attempt with Google Search grounding for real-time web verification
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { tools: [{ googleSearch: {} }] }
        });
      } catch (groundingErr: any) {
        console.warn(`⚠️ Search grounding not available for ${model} (${groundingErr.message || groundingErr}). Retrying standard generation...`);
        response = await ai.models.generateContent({
          model,
          contents: prompt
        });
      }

      if (response && response.text) {
        generatedText = response.text;
        successfulModel = model;
        console.log(`✅ Successfully generated response using model: ${model}`);
        break;
      }
    } catch (modelErr: any) {
      console.warn(`⚠️ Model ${model} failed: ${modelErr.message || modelErr}`);
    }
  }

  if (!generatedText) {
    console.error('❌ Failed to generate issue content across all candidate models.');
    process.exit(1);
  }

  // Parse JSON response
  let cleaned = generatedText.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/i, '');
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '');
  if (cleaned.endsWith('```')) cleaned = cleaned.replace(/\s*```$/, '');
  cleaned = cleaned.trim();

  let parsedItems: any[] = [];
  try {
    parsedItems = JSON.parse(cleaned);
    if (!Array.isArray(parsedItems)) {
      parsedItems = [parsedItems];
    }
  } catch (parseErr: any) {
    console.error('❌ Failed to parse JSON from AI response:', parseErr.message);
    console.log('Raw output preview:', cleaned.substring(0, 300));
    process.exit(1);
  }

  // Normalize, deduplicate and format into KnownIssue
  const newIssues: KnownIssue[] = [];
  const nowIso = new Date().toISOString();

  for (const raw of parsedItems) {
    const code = (raw.code || '').trim();
    const title = (raw.title || '').trim();

    if (!title) continue;

    // Check duplication
    const normalizedCode = code.toLowerCase();
    const isDupCode = normalizedCode && avoidCodes.has(normalizedCode);
    const isDupTitle = existingIssues.some(
      ex => ex.title.toLowerCase().replace(/\s+/g, '') === title.toLowerCase().replace(/\s+/g, '')
    );

    if (isDupCode || isDupTitle) {
      console.log(`⏭️ Skipping duplicate issue: [${code}] ${title}`);
      continue;
    }

    const cleanCode = code || 'WIN-GEN-' + Math.floor(1000 + Math.random() * 9000);
    const issueId = `gh-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;

    const formattedIssue: KnownIssue = {
      id: issueId,
      category: raw.category || targetCategory,
      code: cleanCode,
      title: title,
      title_en: raw.title_en || title,
      symptoms: raw.symptoms || title,
      symptoms_en: raw.symptoms_en || raw.symptoms || '',
      script: raw.script || '',
      manualSteps: Array.isArray(raw.manualSteps) && raw.manualSteps.length > 0 ? raw.manualSteps : [
        'Windows 설정 > 문제 해결 도구를 실행합니다.',
        '관리자 권한 명령 프롬프트에서 sfc /scannow 검사를 진행합니다.'
      ],
      manualSteps_en: Array.isArray(raw.manualSteps_en) && raw.manualSteps_en.length > 0 ? raw.manualSteps_en : [
        'Run Windows Settings > Troubleshooters.',
        'Run sfc /scannow in Administrator Command Prompt.'
      ],
      sourceUrls: Array.isArray(raw.sourceUrls) && raw.sourceUrls.length > 0 ? raw.sourceUrls : [
        'https://support.microsoft.com/windows'
      ],
      source: 'GitHub Actions Autonomous Collector',
      windowsVersions: Array.isArray(raw.windowsVersions) ? raw.windowsVersions : ['Windows 11', 'Windows 10'],
      searchKeywords: Array.isArray(raw.searchKeywords) ? raw.searchKeywords : [cleanCode, targetCategory, 'Windows Fix'],
      upvoteCount: 0,
      upvotedBy: [],
      downvotedBy: [],
      isLatest: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      verifiedAt: nowIso,
      verificationStatus: 'verified'
    };

    newIssues.push(formattedIssue);
    avoidCodes.add(normalizedCode);
  }

  console.log(`\n✨ Discovered and formatted ${newIssues.length} new unique issues!`);

  if (newIssues.length > 0) {
    // Merge into issues.json
    const updatedIssues = [...existingIssues, ...newIssues];
    fs.writeFileSync(issuesFilePath, JSON.stringify(updatedIssues, null, 2), 'utf-8');
    console.log(`💾 Saved updated dataset (${updatedIssues.length} total) to ${issuesFilePath}`);

    // Update github-feed.json
    const feedData = {
      lastCollectedAt: nowIso,
      modelUsed: successfulModel,
      targetCategory,
      newlyAddedCount: newIssues.length,
      totalIssuesCount: updatedIssues.length,
      newIssues: newIssues.map(i => ({
        id: i.id,
        code: i.code,
        title: i.title,
        category: i.category
      }))
    };
    fs.writeFileSync(feedFilePath, JSON.stringify(feedData, null, 2), 'utf-8');
    console.log(`📄 Wrote feed summary to ${feedFilePath}`);

    // Optional Webhook Push to Live Web Application
    const webhookUrl = process.env.APP_WEBHOOK_URL;
    const cronSecret = process.env.CRON_SECRET;

    if (webhookUrl && webhookUrl.startsWith('http')) {
      console.log(`\n📡 Transmitting new data to live app webhook: ${webhookUrl}...`);
      try {
        const syncEndpoint = webhookUrl.replace(/\/+$/, '') + '/api/github/sync';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (cronSecret) {
          headers['x-cron-secret'] = cronSecret;
        }

        const webhookRes = await fetch(syncEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            issues: newIssues,
            source: 'GitHub Actions Automated Collector',
            feed: feedData
          })
        });

        const webhookData = await webhookRes.json();
        console.log(`✅ Live Webhook Response (${webhookRes.status}):`, webhookData);
      } catch (webhookErr: any) {
        console.warn(`⚠️ Failed to ping web application webhook:`, webhookErr.message);
      }
    } else {
      console.log('ℹ️ APP_WEBHOOK_URL not set; skipping live web app push.');
    }
  } else {
    console.log('ℹ️ No new unique issues were discovered in this cycle.');
  }

  // GitHub Actions Step Summary
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile && fs.existsSync(summaryFile)) {
    let md = `## 🤖 Windows Fix Wizard - Data Collection Report\n\n`;
    md += `- **Execution Time**: \`${nowIso}\`\n`;
    md += `- **AI Model**: \`${successfulModel}\`\n`;
    md += `- **Target Category**: \`${targetCategory}\`\n`;
    md += `- **New Issues Collected**: \`${newIssues.length}\`\n`;
    md += `- **Total Issues in Database**: \`${existingIssues.length + newIssues.length}\`\n\n`;

    if (newIssues.length > 0) {
      md += `### 📋 Newly Added Windows Solutions\n\n`;
      md += `| Category | Error Code | Title | Versions |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      for (const item of newIssues) {
        md += `| ${item.category} | \`${item.code}\` | **${item.title}** | ${item.windowsVersions?.join(', ') || 'Windows 10/11'} |\n`;
      }
    } else {
      md += `> No new unique issues discovered this cycle (prevented duplicates).\n`;
    }

    fs.appendFileSync(summaryFile, md, 'utf-8');
    console.log('📊 Written report to GitHub Actions Step Summary.');
  }

  console.log('\n🏁 Autonomous Data Collection Cycle Complete!\n');
}

runCollector().catch(err => {
  console.error('💥 Fatal collector failure:', err);
  process.exit(1);
});
