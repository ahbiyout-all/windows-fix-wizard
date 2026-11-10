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

  // Load system config if present
  const sysConfigPath = path.join(dataDir, 'system_config.json');
  let configEngineBatchSize: number | undefined;
  if (fs.existsSync(sysConfigPath)) {
    try {
      const cfgRaw = fs.readFileSync(sysConfigPath, 'utf-8');
      const cfg = JSON.parse(cfgRaw);
      if (cfg.engineBatchSize && typeof cfg.engineBatchSize === 'number') {
        configEngineBatchSize = cfg.engineBatchSize;
      }
    } catch (e: any) {
      console.warn(`⚠️ Could not read system_config.json:`, e.message);
    }
  }

  // Select target category
  const targetCategory = process.env.INPUT_TOPIC && process.env.INPUT_TOPIC !== 'all'
    ? process.env.INPUT_TOPIC
    : CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  console.log(`🎯 Target Category: [${targetCategory}]`);

  const rawBatchSize = process.env.BATCH_SIZE || (configEngineBatchSize ? String(configEngineBatchSize) : '2');
  const batchSize = Math.min(Math.max(parseInt(rawBatchSize, 10), 1), 10);
  console.log(`📦 Batch Size: ${batchSize}`);

  const ai = new GoogleGenAI({ apiKey });
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-pro'
  ];

function generateDefaultPowerShellScript(code: string = '', category: string = '', title: string = ''): string {
  const codeUpper = (code || '').toUpperCase();
  const cat = (category || '').trim();
  const titleLower = (title || '').toLowerCase();

  if (cat.includes('네트워크') || cat.includes('Network') || codeUpper.includes('0X80072EFE') || codeUpper.includes('0X80072F78') || titleLower.includes('network') || titleLower.includes('인터넷')) {
    return `# Windows ${codeUpper || 'Network'} Automatic Recovery Script\n# Target: Reset TCP/IP Stack, DNS Cache & Winsock Catalog\n\nWrite-Host "[1/4] Flushing DNS Resolver Cache..." -ForegroundColor Cyan\nipconfig /flushdns\n\nWrite-Host "[2/4] Resetting Winsock & IP Interfaces..." -ForegroundColor Cyan\nnetsh winsock reset\nnetsh int ip reset\n\nWrite-Host "[3/4] Releasing & Renewing IPv4 Leases..." -ForegroundColor Cyan\nipconfig /release\nipconfig /renew\n\nWrite-Host "[4/4] Restarting Network Location Awareness Service..." -ForegroundColor Cyan\nRestart-Service -Name "NlaSvc" -Force -ErrorAction SilentlyContinue\n\nWrite-Host "[+] Network stack reset complete. Please restart your PC." -ForegroundColor Green`;
  }

  if (cat.includes('업데이트') || cat.includes('Update') || codeUpper.startsWith('0X8024') || codeUpper.startsWith('0X80070') || titleLower.includes('update') || titleLower.includes('업데이트')) {
    return `# Windows Update ${codeUpper || 'Error'} Automated Repair Script\n# Target: Reset Windows Update Components & SoftwareDistribution Cache\n\nWrite-Host "[1/5] Stopping Windows Update & BITS Services..." -ForegroundColor Cyan\nStop-Service -Name "wuauserv" -Force -ErrorAction SilentlyContinue\nStop-Service -Name "bits" -Force -ErrorAction SilentlyContinue\nStop-Service -Name "cryptsvc" -Force -ErrorAction SilentlyContinue\n\nWrite-Host "[2/5] Purging Update Cache Directories..." -ForegroundColor Cyan\nRemove-Item -Path "$env:SystemRoot\\SoftwareDistribution\\Download\\*" -Recurse -Force -ErrorAction SilentlyContinue\nRemove-Item -Path "$env:SystemRoot\\System32\\catroot2\\*" -Recurse -Force -ErrorAction SilentlyContinue\n\nWrite-Host "[3/5] Re-registering Update DLL Libraries..." -ForegroundColor Cyan\nregsvr32.exe /s wuaueng.dll\nregsvr32.exe /s qmgr.dll\n\nWrite-Host "[4/5] Restarting Core Update Services..." -ForegroundColor Cyan\nStart-Service -Name "cryptsvc" -ErrorAction SilentlyContinue\nStart-Service -Name "bits" -ErrorAction SilentlyContinue\nStart-Service -Name "wuauserv" -ErrorAction SilentlyContinue\n\nWrite-Host "[5/5] Triggering Windows Update Detection Cycle..." -ForegroundColor Cyan\nusoclient StartScan\n\nWrite-Host "[+] Windows Update repair complete. Retry updating now." -ForegroundColor Green`;
  }

  if (cat.includes('스토어') || cat.includes('Store') || cat.includes('앱') || codeUpper.startsWith('0X80073') || titleLower.includes('store') || titleLower.includes('스토어')) {
    return `# Windows Store & AppX Package Repair Script\n# Target: Re-register Microsoft Store & Repair System Apps\n\nWrite-Host "[1/3] Resetting Microsoft Store Cache..." -ForegroundColor Cyan\nwsreset.exe\n\nWrite-Host "[2/3] Re-registering all AppX Packages for Current User..." -ForegroundColor Cyan\nGet-AppXPackage -AllUsers | Foreach {Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\\AppXManifest.xml" -ErrorAction SilentlyContinue}\n\nWrite-Host "[3/3] Checking AppX Deployment Service Status..." -ForegroundColor Cyan\nGet-Service -Name "AppXSvc" | Start-Service -ErrorAction SilentlyContinue\n\nWrite-Host "[+] Microsoft Store repair completed." -ForegroundColor Green`;
  }

  if (cat.includes('정품인증') || cat.includes('Activation') || codeUpper.startsWith('0XC004') || titleLower.includes('activation') || titleLower.includes('정품')) {
    return `# Windows Licensing & Software Protection Service Diagnostic Script\n# Target: Clear License Cache & Restart Software Protection Service (sppsvc)\n\nWrite-Host "[1/3] Restarting Software Protection Service..." -ForegroundColor Cyan\nRestart-Service -Name "sppsvc" -Force -ErrorAction SilentlyContinue\n\nWrite-Host "[2/3] Querying Current Licensing Status..." -ForegroundColor Cyan\ncscript.exe //NoLogo "$env:SystemRoot\\System32\\slmgr.vbs" /dli\n\nWrite-Host "[3/3] Re-arm License State..." -ForegroundColor Cyan\ncscript.exe //NoLogo "$env:SystemRoot\\System32\\slmgr.vbs" /ato\n\nWrite-Host "[+] Windows activation diagnostic complete." -ForegroundColor Green`;
  }

  if (cat.includes('보안') || cat.includes('Security') || cat.includes('백신') || titleLower.includes('defender') || titleLower.includes('security')) {
    return `# Windows Security & Defender Repair Script\n# Target: Update Defender Signatures & Reset Security Platform\n\nWrite-Host "[1/3] Updating Microsoft Defender Intelligence Signatures..." -ForegroundColor Cyan\n& "$env:ProgramFiles\\Windows Defender\\MpCmdRun.exe" -SignatureUpdate\n\nWrite-Host "[2/3] Triggering Defender Quick Scan..." -ForegroundColor Cyan\n& "$env:ProgramFiles\\Windows Defender\\MpCmdRun.exe" -Scan -ScanType 1\n\nWrite-Host "[3/3] Resetting Windows Security Service..." -ForegroundColor Cyan\nRestart-Service -Name "SecurityHealthService" -Force -ErrorAction SilentlyContinue\n\nWrite-Host "[+] Windows Security diagnostic complete." -ForegroundColor Green`;
  }

  return `# Windows System Integrity Repair Script (${codeUpper || 'System Fix'})\n# Target: SFC System File Checker & DISM Image Servicing\n\nWrite-Host "[1/3] Running System File Checker (SFC)..." -ForegroundColor Cyan\nsfc /scannow\n\nWrite-Host "[2/3] Checking Component Store Health via DISM..." -ForegroundColor Cyan\ndism /Online /Cleanup-Image /CheckHealth\n\nWrite-Host "[3/3] Restoring Component Store Corruption via DISM..." -ForegroundColor Cyan\ndism /Online /Cleanup-Image /RestoreHealth\n\nWrite-Host "[+] System file integrity repair complete. Please restart your system." -ForegroundColor Green`;
}

  const prompt = `Search and identify ${batchSize} verified and LATEST (2024-2026) Windows 10/11 troubleshooting guide(s) or error code(s).
Category focus: "${targetCategory}".
Do NOT generate these existing issues: [${avoidTitles.substring(0, 400)}...].
Avoid error codes already present: [${Array.from(avoidCodes).slice(-15).join(', ')}].

Requirements for each item:
1. Specific Windows error code (e.g., 0x80070005, 0x8024402f, WHEA_UNCORRECTABLE_ERROR, 0x80073D02) or clear identifier.
2. Accurate Korean title & symptoms explaining why it occurs in recent Windows 10/11 updates.
3. English title and English symptoms.
4. A MANDATORY, working, non-destructive PowerShell repair or diagnostic script specifically tailored for this error (e.g. sfc /scannow, DISM, Get-AppxPackage, netsh winsock reset, etc.). Do NOT leave script empty or null!
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
    "script": "Mandatory PowerShell Script for this error",
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

  if (!generatedText && process.env.GROQ_API_KEY) {
    console.log('🔄 Attempting Groq API secondary failover in collector...');
    const groqKey = process.env.GROQ_API_KEY.trim();
    const groqModels = ['llama-3.3-70b-versatile', 'llama3-8b-8192', 'mixtral-8x7b-32768'];
    for (const gModel of groqModels) {
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: gModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          const text = data?.choices?.[0]?.message?.content || '';
          if (text.trim()) {
            generatedText = text;
            successfulModel = `Groq (${gModel})`;
            console.log(`✅ Successfully generated response via Groq API (${gModel})!`);
            break;
          }
        }
      } catch (gErr: any) {
        console.warn(`⚠️ Groq ${gModel} failed:`, gErr.message || gErr);
      }
    }
  }

  if (!generatedText && process.env.OPENROUTER_API_KEY) {
    console.log('🔄 Attempting OpenRouter API secondary failover in collector...');
    const openrouterKey = process.env.OPENROUTER_API_KEY.trim();
    const openrouterModels = ['deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct:free'];
    for (const oModel of openrouterModels) {
      try {
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://windows-fix-wizard.github.io',
            'X-Title': 'Windows Fix Wizard'
          },
          body: JSON.stringify({
            model: oModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          const text = data?.choices?.[0]?.message?.content || '';
          if (text.trim()) {
            generatedText = text;
            successfulModel = `OpenRouter (${oModel})`;
            console.log(`✅ Successfully generated response via OpenRouter API (${oModel})!`);
            break;
          }
        }
      } catch (oErr: any) {
        console.warn(`⚠️ OpenRouter ${oModel} failed:`, oErr.message || oErr);
      }
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

    // Check duplication (only skip if exact title matches or both code and title match)
    const normalizedCode = code.toLowerCase().trim();
    const normalizedTitle = title.toLowerCase().replace(/\s+/g, '');
    const isDupTitle = existingIssues.some(
      ex => ex.title.toLowerCase().replace(/\s+/g, '') === normalizedTitle
    );
    const isDupCodeAndTitle = existingIssues.some(
      ex => ex.code && ex.code.toLowerCase().trim() === normalizedCode && ex.title.toLowerCase().replace(/\s+/g, '') === normalizedTitle
    );

    if (isDupTitle || isDupCodeAndTitle) {
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
      script: (raw.script && typeof raw.script === 'string' && raw.script.trim().length >= 15)
        ? raw.script.trim()
        : generateDefaultPowerShellScript(cleanCode, raw.category || targetCategory, title),
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
