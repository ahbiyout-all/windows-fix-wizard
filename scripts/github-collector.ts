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
import * as crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import {
  loadAiModelRegistry,
  getHealthyGeminiCandidates,
  classifyAiError,
  tripCircuitBreaker,
  discoverLiveModels,
  callExternalFreeProvider,
  buildExternalFallbackPrompt,
  recordRegistryUsage,
  KEYLESS_PROVIDER_IDS,
  type ProviderId
} from '../lib/ai-resilience-router';
import { parseAiJson } from '../src/utils/safeFetch';

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

  let registry = loadAiModelRegistry();
  const apiKey = (process.env.GEMINI_API_KEY || process.env.CUSTOM_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const hasGeminiKey = apiKey.startsWith('AIza') && apiKey.length >= 30;
  const hasAnyKeyedExternal = Boolean(
    process.env.GROQ_API_KEY?.trim() ||
    process.env.MISTRAL_API_KEY?.trim() ||
    process.env.NVIDIA_API_KEY?.trim() ||
    process.env.COHERE_API_KEY?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.HF_TOKEN?.trim() ||
    process.env.HUGGINGFACE_API_KEY?.trim() ||
    process.env.CEREBRAS_API_KEY?.trim() ||
    (process.env.CLOUDFLARE_ACCOUNT_ID?.trim() && process.env.CLOUDFLARE_API_TOKEN?.trim())
  );
  const canUseKeylessFallback = registry.keylessFallbackEnabled !== false;

  if (!hasGeminiKey && !hasAnyKeyedExternal && !canUseKeylessFallback) {
    console.warn('⚠️ Warning: No GEMINI_API_KEY or external AI keys configured and keyless fallback is disabled.');
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile && fs.existsSync(summaryFile)) {
      const md = `## ⚠️ Autonomous Data Collection Notice\n\n- **Status**: No active AI credentials found and keyless fallback is disabled.\n- **Action**: Collection cycle skipped safely.\n`;
      fs.appendFileSync(summaryFile, md, 'utf-8');
    }
    return;
  }
  if (!hasGeminiKey) {
    console.log('ℹ️ GEMINI_API_KEY not configured; routing directly to external free-tier / last-resort keyless fallback.');
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

  // Load system config & GitHub collector options if present
  const sysConfigPath = path.join(dataDir, 'system_config.json');
  const collectorOptionsPath = path.join(dataDir, 'github-collector-options.json');
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

  let collectorOpts: any = {};
  if (fs.existsSync(collectorOptionsPath)) {
    try {
      collectorOpts = JSON.parse(fs.readFileSync(collectorOptionsPath, 'utf-8'));
      console.log(`⚙️ Loaded collector options from ${collectorOptionsPath}`);
    } catch (e: any) {
      console.warn(`⚠️ Could not parse github-collector-options.json:`, e.message);
    }
  }

  // Respect pause state on scheduled runs (manual workflow_dispatch can still run explicitly)
  const eventName = process.env.GITHUB_EVENT_NAME || '';
  if (collectorOpts.enabled === false && eventName === 'schedule') {
    console.log('⏸️ GitHub Auto-Collection is currently PAUSED in data/github-collector-options.json. Skipping scheduled run.');
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile && fs.existsSync(summaryFile)) {
      fs.appendFileSync(summaryFile, `## ⏸️ Autonomous Collection Paused\n\n- Scheduled collection was skipped because \`enabled: false\` is set in \`data/github-collector-options.json\`.\n`, 'utf-8');
    }
    return;
  }

  // Select target category using INPUT_TOPIC > fixed/rotate options > all categories
  const envTopic = (process.env.INPUT_TOPIC || '').trim();
  const preferredPool: string[] = Array.isArray(collectorOpts.preferredTopics) && collectorOpts.preferredTopics.length > 0
    ? collectorOpts.preferredTopics.filter((c: string) => CATEGORIES.includes(c))
    : CATEGORIES;
  const activePool = preferredPool.length > 0 ? preferredPool : CATEGORIES;

  let targetCategory = '';
  if (envTopic && envTopic !== 'all' && CATEGORIES.includes(envTopic)) {
    targetCategory = envTopic;
  } else if (collectorOpts.topicMode === 'fixed' && collectorOpts.fixedTopic && collectorOpts.fixedTopic !== 'all' && CATEGORIES.includes(collectorOpts.fixedTopic)) {
    targetCategory = collectorOpts.fixedTopic;
  } else if (collectorOpts.topicMode === 'rotate') {
    targetCategory = activePool[Math.floor(Math.random() * activePool.length)];
  } else {
    targetCategory = activePool[Math.floor(Math.random() * activePool.length)];
  }

  console.log(`🎯 Target Category: [${targetCategory}] (Mode: ${collectorOpts.topicMode || 'all'})`);

  const rawBatchSize = (process.env.INPUT_BATCH_SIZE || process.env.BATCH_SIZE || '').trim()
    || (collectorOpts.batchSize ? String(collectorOpts.batchSize) : '')
    || (configEngineBatchSize ? String(configEngineBatchSize) : '2');
  const parsedBatch = parseInt(rawBatchSize, 10);
  const batchSize = Math.min(Math.max(isNaN(parsedBatch) ? 2 : parsedBatch, 1), 10);
  console.log(`📦 Batch Size: ${batchSize}`);

  const envTargetWindows = (process.env.INPUT_TARGET_WINDOWS || '').split(',').map(s => s.trim()).filter(Boolean);
  const targetWindowsVersions: string[] = envTargetWindows.length > 0
    ? envTargetWindows
    : (Array.isArray(collectorOpts.targetWindowsVersions) && collectorOpts.targetWindowsVersions.length > 0
      ? collectorOpts.targetWindowsVersions
      : ['Windows 11', 'Windows 10']);
  console.log(`🪟 Target OS Versions: ${targetWindowsVersions.join(', ')}`);

  const dedupStrictness: 'strict' | 'balanced' = collectorOpts.dedupStrictness === 'balanced' ? 'balanced' : 'strict';
  const autoIntegrateSeed: boolean = collectorOpts.autoIntegrateSeed !== false;

  const ai = hasGeminiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      })
    : null;
  const preferredModel = (process.env.INPUT_MODEL_PREFERENCE || collectorOpts.modelPreference || 'auto').trim();
  let modelsToTry = getHealthyGeminiCandidates(preferredModel, registry);
  console.log(`🤖 AI Model Priority (Registry-Backed): ${modelsToTry.join(' -> ')}`);

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

  const prompt = `Search and identify ${batchSize} verified and LATEST (2024-2026) ${targetWindowsVersions.join(' / ')} troubleshooting guide(s) or error code(s).
Category focus: "${targetCategory}".
Target OS focus: ${JSON.stringify(targetWindowsVersions)}.
Do NOT generate these existing issues: [${avoidTitles.substring(0, 400)}...].
Avoid error codes already present: [${Array.from(avoidCodes).slice(-25).join(', ')}].

Requirements for each item:
1. Specific Windows error code (e.g., 0x80070005, 0x8024402f, WHEA_UNCORRECTABLE_ERROR, 0x80073D02) or clear identifier.
2. Accurate Korean title & symptoms explaining why it occurs in recent Windows updates.
3. English title and English symptoms.
4. A MANDATORY, working, non-destructive PowerShell repair or diagnostic script specifically tailored for this error (e.g. sfc /scannow, DISM, Get-AppxPackage, netsh winsock reset, etc.). Do NOT leave script empty or null!
5. 3-5 structured step-by-step recovery instructions in Korean (manualSteps) and English (manualSteps_en).
6. 1-2 legitimate source URLs (e.g. support.microsoft.com, learn.microsoft.com, or official tech portals).
7. Applicable Windows versions (${JSON.stringify(targetWindowsVersions)}).
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
    "windowsVersions": ${JSON.stringify(targetWindowsVersions)},
    "searchKeywords": ["Keyword1", "Keyword2"]
  }
]`;

  let generatedText = '';
  let successfulModel = '';
  let encountered404 = false;

  const tryGeminiList = async (candidates: string[]) => {
    if (!ai) return false;
    for (const model of candidates) {
      try {
        console.log(`🤖 Attempting generation with model: ${model}...`);
        let response;
        try {
          response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
          });
        } catch (groundingErr: any) {
          const classifiedGround = classifyAiError(groundingErr);
          if (
            classifiedGround.type === 'MODEL_NOT_FOUND_404' ||
            classifiedGround.type === 'INVALID_KEY' ||
            classifiedGround.type === 'QUOTA_EXHAUSTED_429'
          ) {
            throw groundingErr;
          }
          console.info(`ℹ️ Search grounding skipped for ${model} (${classifiedGround.message.substring(0, 120)}). Retrying standard generation...`);
          response = await ai.models.generateContent({
            model,
            contents: prompt
          });
        }

        if (response && response.text) {
          generatedText = response.text;
          successfulModel = model;
          recordRegistryUsage('gemini', model, false);
          console.log(`✅ Successfully generated response using model: ${model}`);
          return true;
        }
      } catch (modelErr: any) {
        const classified = classifyAiError(modelErr);
        console.warn(`⚠️ Model ${model} failed [${classified.type}]: ${classified.message.substring(0, 140)}`);
        if (classified.type === 'MODEL_NOT_FOUND_404') {
          encountered404 = true;
          tripCircuitBreaker(registry, model, 'gemini', 404, classified.message);
        } else if (classified.type === 'INVALID_KEY') {
          break;
        }
      }
    }
    return false;
  };

  if (hasGeminiKey) {
    await tryGeminiList(modelsToTry);

    // If 404s occurred and Gemini generation didn't succeed, attempt live catalog discovery once
    if (!generatedText && encountered404) {
      console.log('🔎 404 model error detected; running live Gemini model auto-discovery...');
      try {
        const discovery = await discoverLiveModels({ geminiApiKey: apiKey });
        registry = discovery.registry;
        const freshCandidates = getHealthyGeminiCandidates(preferredModel, registry).filter((m) => !modelsToTry.includes(m));
        if (freshCandidates.length > 0) {
          console.log(`🆕 Discovered fresh healthy Gemini models: ${freshCandidates.join(', ')}`);
          await tryGeminiList(freshCandidates);
        }
      } catch (_) {}
    }
  }

  // Multi-provider Keyed Free-Tier Failover across configured external providers
  if (!generatedText) {
    const externalPrompt = buildExternalFallbackPrompt(prompt, { responseMimeType: 'application/json' });
    const orderList = (registry.providerOrder || ['groq', 'mistral', 'nvidia', 'cohere', 'openrouter', 'cloudflare', 'huggingface', 'cerebras', 'ovh', 'pollinations']);
    const keyedProviders = orderList
      .filter((p): p is Exclude<ProviderId, 'gemini'> => p !== 'gemini' && !KEYLESS_PROVIDER_IDS.includes(p));
    for (const providerId of keyedProviders) {
      console.log(`🔄 Attempting external free-tier failover via ${providerId.toUpperCase()}...`);
      const extRes = await callExternalFreeProvider(providerId, externalPrompt, { registry });
      if (extRes && extRes.text) {
        generatedText = extRes.text;
        successfulModel = extRes.modelUsed;
        recordRegistryUsage(providerId, extRes.modelUsed, true);
        console.log(`✅ Successfully generated response via ${extRes.modelUsed}!`);
        break;
      }
    }

    // Last-resort keyless serverless fallback (OVHcloud / Pollinations) ONLY if enabled and all keyed tiers failed
    if (!generatedText && registry.keylessFallbackEnabled !== false) {
      const keylessProviders = orderList.filter((p): p is Exclude<ProviderId, 'gemini'> => KEYLESS_PROVIDER_IDS.includes(p));
      for (const keylessPid of keylessProviders) {
        console.log(`🔄 Attempting last-resort keyless failover via ${keylessPid.toUpperCase()}...`);
        const keylessRes = await callExternalFreeProvider(keylessPid, externalPrompt, { registry });
        if (keylessRes && keylessRes.text) {
          generatedText = keylessRes.text;
          successfulModel = keylessRes.modelUsed;
          recordRegistryUsage(keylessPid, keylessRes.modelUsed, true);
          console.log(`✅ Successfully generated response via ${keylessRes.modelUsed}!`);
          break;
        }
      }
    }
  }

  if (!generatedText) {
    console.warn('⚠️ Could not generate issue content across candidate models (quota exhausted or API unavailable). Skipping cycle.');
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile && fs.existsSync(summaryFile)) {
      const md = `## ⚠️ Autonomous Data Collection Notice\n\n- **Status**: AI generation skipped (Quota exhausted or models unavailable).\n- **Action**: Database retained safely; system will retry on next schedule.\n`;
      fs.appendFileSync(summaryFile, md, 'utf-8');
    }
    return;
  }

  // Parse JSON response resiliently (handles Markdown code fences, prose preambles, and Windows paths)
  let parsedItems: any[] = [];
  try {
    const parsed = parseAiJson(generatedText);
    parsedItems = Array.isArray(parsed)
      ? parsed
      : (parsed && Array.isArray((parsed as any).issues) ? (parsed as any).issues : [parsed]);
  } catch (parseErr: any) {
    console.warn('⚠️ Failed to parse JSON from AI response:', parseErr.message);
    console.log('Raw output preview:', generatedText.trim().substring(0, 300));
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile && fs.existsSync(summaryFile)) {
      const md = `## ⚠️ Autonomous Data Collection Notice\n\n- **Status**: AI output JSON parse error. Cycle skipped safely.\n`;
      fs.appendFileSync(summaryFile, md, 'utf-8');
    }
    return;
  }

  // Normalize, deduplicate and format into KnownIssue
  const newIssues: KnownIssue[] = [];
  const batchNormalizedTitles = new Set<string>();
  const nowIso = new Date().toISOString();

  const asCleanString = (val: unknown): string => {
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number' && Number.isFinite(val)) return String(val);
    return '';
  };
  const asCleanStringArray = (val: unknown): string[] => {
    if (!Array.isArray(val)) return [];
    return val.map((item) => asCleanString(item)).filter(Boolean);
  };
  const filterSafeHttpUrls = (val: unknown): string[] => {
    return asCleanStringArray(val).filter((u) => /^https?:\/\//i.test(u));
  };

  for (const raw of parsedItems) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const code = asCleanString((raw as any).code);
    const title = asCleanString((raw as any).title);

    if (!title) continue;

    // Check duplication according to dedupStrictness option
    const normalizedCode = code.toLowerCase().trim();
    const normalizedTitle = title.toLowerCase().replace(/\s+/g, '');
    const isDupTitle =
      batchNormalizedTitles.has(normalizedTitle) ||
      existingIssues.some(ex => typeof ex?.title === 'string' && ex.title.toLowerCase().replace(/\s+/g, '') === normalizedTitle);
    const isDupCodeStrict = dedupStrictness === 'strict' && normalizedCode.length >= 4 && avoidCodes.has(normalizedCode);
    const isDupCodeAndTitle = existingIssues.some(
      ex => typeof ex?.code === 'string' && typeof ex?.title === 'string' && ex.code.toLowerCase().trim() === normalizedCode && ex.title.toLowerCase().replace(/\s+/g, '') === normalizedTitle
    );

    if (isDupTitle || isDupCodeAndTitle || isDupCodeStrict) {
      console.log(`⏭️ Skipping duplicate issue (${dedupStrictness}): [${code}] ${title}`);
      continue;
    }

    const cleanCode = code || 'WIN-GEN-' + Math.floor(1000 + Math.random() * 9000);
    const issueId = `gh-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;
    const resolvedCategory = asCleanString((raw as any).category) || targetCategory;
    const resolvedTitleEn = asCleanString((raw as any).title_en) || title;
    const resolvedSymptoms = asCleanString((raw as any).symptoms) || title;
    const resolvedSymptomsEn = asCleanString((raw as any).symptoms_en) || resolvedSymptoms;
    const resolvedScript = asCleanString((raw as any).script);
    const resolvedSteps = asCleanStringArray((raw as any).manualSteps);
    const resolvedStepsEn = asCleanStringArray((raw as any).manualSteps_en);
    const resolvedUrls = filterSafeHttpUrls((raw as any).sourceUrls);
    const resolvedVersions = asCleanStringArray((raw as any).windowsVersions);
    const resolvedKeywords = asCleanStringArray((raw as any).searchKeywords);

    const formattedIssue: KnownIssue = {
      id: issueId,
      category: resolvedCategory,
      code: cleanCode,
      title,
      title_en: resolvedTitleEn,
      symptoms: resolvedSymptoms,
      symptoms_en: resolvedSymptomsEn,
      script: resolvedScript.length >= 15
        ? resolvedScript
        : generateDefaultPowerShellScript(cleanCode, resolvedCategory, title),
      manualSteps: resolvedSteps.length > 0 ? resolvedSteps : [
        'Windows 설정 > 문제 해결 도구를 실행합니다.',
        '관리자 권한 명령 프롬프트에서 sfc /scannow 검사를 진행합니다.'
      ],
      manualSteps_en: resolvedStepsEn.length > 0 ? resolvedStepsEn : [
        'Run Windows Settings > Troubleshooters.',
        'Run sfc /scannow in Administrator Command Prompt.'
      ],
      sourceUrls: resolvedUrls.length > 0 ? resolvedUrls : [
        'https://support.microsoft.com/windows'
      ],
      source: 'GitHub Actions Autonomous Collector',
      windowsVersions: resolvedVersions.length > 0 ? resolvedVersions : targetWindowsVersions,
      searchKeywords: resolvedKeywords.length > 0 ? resolvedKeywords : [cleanCode, targetCategory, 'Windows Fix'],
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
    batchNormalizedTitles.add(normalizedTitle);
    if (normalizedCode) avoidCodes.add(normalizedCode);
  }

  console.log(`\n✨ Discovered and formatted ${newIssues.length} new unique issues!`);

  if (newIssues.length > 0) {
    // Merge into issues.json
    const updatedIssues = [...existingIssues, ...newIssues];
    fs.writeFileSync(issuesFilePath, JSON.stringify(updatedIssues, null, 2), 'utf-8');
    console.log(`💾 Saved updated dataset (${updatedIssues.length} total) to ${issuesFilePath}`);

    // Automatically synchronize bundled main seed (src/data/knownIssues.ts) if enabled
    if (autoIntegrateSeed) {
      try {
        const knownIssuesTsPath = path.resolve(process.cwd(), 'src', 'data', 'knownIssues.ts');
        const tsContent = `import { KnownIssue } from "../types";\n\nexport const KNOWN_ISSUES: KnownIssue[] = ${JSON.stringify(updatedIssues, null, 2)};\n`;
        fs.writeFileSync(knownIssuesTsPath, tsContent, 'utf-8');
        console.log(`🔄 Auto-integrated ${updatedIssues.length} issues into ${knownIssuesTsPath}`);
      } catch (syncErr: any) {
        console.warn(`⚠️ Failed to sync src/data/knownIssues.ts:`, syncErr.message);
      }
    } else {
      console.log('ℹ️ Skipping src/data/knownIssues.ts sync (autoIntegrateSeed: false).');
    }

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

    // Optional Webhook Push to Live Web Application (HMAC-SHA256 signed)
    const webhookUrl = process.env.APP_WEBHOOK_URL;
    const cronSecret = process.env.CRON_SECRET;

    if (webhookUrl && webhookUrl.startsWith('http')) {
      console.log(`\n📡 Transmitting new data to live app webhook: ${webhookUrl}...`);
      try {
        const syncEndpoint = webhookUrl.replace(/\/+$/, '') + '/api/github/sync';
        const bodyStr = JSON.stringify({
          issues: newIssues,
          source: 'GitHub Actions Automated Collector',
          feed: feedData
        });
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (cronSecret) {
          headers['x-cron-secret'] = cronSecret;
          const hmac = crypto.createHmac('sha256', cronSecret).update(bodyStr, 'utf8').digest('hex');
          headers['x-winfix-signature-256'] = `sha256=${hmac}`;
        }

        const webhookRes = await fetch(syncEndpoint, {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers,
          body: bodyStr
        });

        const rawWebhookText = await webhookRes.text();
        const trimmedPreview = rawWebhookText.trim().slice(0, 200);
        const isHtmlResponse = /^\s*<(?:!doctype|html)/i.test(rawWebhookText);
        let webhookData: any = trimmedPreview;
        if (!isHtmlResponse) {
          try {
            webhookData = JSON.parse(rawWebhookText);
          } catch {
            // keep text preview
          }
        }
        if (!webhookRes.ok || isHtmlResponse) {
          console.warn(
            `⚠️ Live Webhook returned HTTP ${webhookRes.status}${isHtmlResponse ? ' (HTML auth/login redirect detected — ensure APP_WEBHOOK_URL uses the published public URL such as https://windows-fix-wizard.ai.studio instead of https://ais-dev-...)' : ''}:`,
            webhookData
          );
        } else {
          console.log(`✅ Live Webhook Response (${webhookRes.status}):`, webhookData);
        }
      } catch (webhookErr: any) {
        console.warn(`⚠️ Failed to ping web application webhook:`, webhookErr.message);
      }
    } else {
      console.log('ℹ️ APP_WEBHOOK_URL not set; skipping live web app push.');
    }
  } else {
    console.log('ℹ️ No new unique issues were discovered in this cycle.');
    const webhookUrl = process.env.APP_WEBHOOK_URL;
    const cronSecret = process.env.CRON_SECRET;
    if (webhookUrl && webhookUrl.startsWith('http')) {
      try {
        const hbEndpoint = webhookUrl.replace(/\/+$/, '') + '/api/github/webhook/heartbeat';
        const hbBody = JSON.stringify({
          eventType: 'collector-heartbeat',
          source: 'GitHub Actions Automated Collector',
          summary: `수집 주기 완료 (${targetCategory}, 모델: ${successfulModel}) — 신규 중복 제외 0건`,
          details: { targetCategory, modelUsed: successfulModel, totalIssues: existingIssues.length }
        });
        const hbHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (cronSecret) {
          hbHeaders['x-cron-secret'] = cronSecret;
          hbHeaders['x-winfix-signature-256'] = `sha256=${crypto.createHmac('sha256', cronSecret).update(hbBody, 'utf8').digest('hex')}`;
        }
        const hbRes = await fetch(hbEndpoint, { method: 'POST', signal: AbortSignal.timeout(10000), headers: hbHeaders, body: hbBody });
        console.log(`💓 Collector heartbeat sent (${hbRes.status})`);
      } catch (hbErr: any) {
        console.warn(`⚠️ Collector heartbeat skipped:`, hbErr?.message);
      }
    }
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
