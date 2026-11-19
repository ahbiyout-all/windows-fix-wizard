import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

export type ProviderId =
  | 'gemini'
  | 'groq'
  | 'mistral'
  | 'openrouter'
  | 'cerebras'
  | 'cloudflare'
  | 'pollinations';

export type RoutingPolicy = 'quota-split' | 'gemini-first';
export type WorkloadType = 'heavy-grounded' | 'fast-diagnostic' | 'classification' | 'stream';

export interface DiscoveredGeminiModel {
  id: string;
  displayName: string;
  tier: 'generation-4' | 'generation-3' | 'lite' | 'latest-alias' | 'other';
  supportsGrounding: boolean;
  enabled: boolean;
  priority: number;
  source: 'default' | 'auto-discovered';
  lastVerifiedAt?: string;
}

export interface CircuitBreakerEntry {
  modelId: string;
  provider: ProviderId;
  statusCode: number;
  reason: string;
  trippedAt: string;
  expiresAt: string;
  failureCount: number;
}

export interface AiModelRegistry {
  version: string;
  updatedAt: string;
  lastDiscoveryAt: string | null;
  routingPolicy: RoutingPolicy;
  keylessFallbackEnabled: boolean;
  providerOrder: ProviderId[];
  geminiModels: DiscoveredGeminiModel[];
  openrouterFreeModels: string[];
  pollinationsModels: string[];
  providerModels: Record<Exclude<ProviderId, 'gemini'>, string[]>;
  circuitBreakers: Record<string, CircuitBreakerEntry>;
  telemetry: {
    totalRequests: number;
    geminiRequests: number;
    freeProviderRequests: number;
    keylessRequests: number;
    failoverSaves: number;
    circuitTrips404: number;
    lastProviderUsed: string | null;
    lastModelUsed: string | null;
    lastUpdatedAt: string | null;
    perProviderUsage: Record<ProviderId, number>;
  };
}

export interface ProviderStrategyInfo {
  id: ProviderId | 'github-models' | 'ovh-anonymous';
  name: string;
  status: 'active' | 'keyless' | 'trial' | 'retired';
  envVars: string[];
  freeTierLimits: string;
  strengths: string;
  privacyNote: string;
  recommendedWorkload: string;
  endpoint: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const REGISTRY_PATH = path.join(DATA_DIR, 'ai-model-registry.json');

const PROHIBITED_GEMINI_PATTERNS = [
  'gemini-1.0',
  'gemini-1.5',
  'gemini-pro-vision',
  'gemini-2.0',
  'aqa',
  'embedding',
  'imagen',
  'veo',
  'lyria',
  'tts',
  'transcribe',
  'live',
  'nano-banana',
  '-image'
];

export const DEFAULT_GEMINI_MODELS: DiscoveredGeminiModel[] = [
  {
    id: 'gemini-4-hydrogen',
    displayName: 'Gemini 4 Hydrogen (Flash Default)',
    tier: 'generation-4',
    supportsGrounding: true,
    enabled: true,
    priority: 1,
    source: 'default'
  },
  {
    id: 'gemini-3.1-flash-lite',
    displayName: 'Gemini 3.1 Flash Lite (High Quota / Fast)',
    tier: 'lite',
    supportsGrounding: true,
    enabled: true,
    priority: 2,
    source: 'default'
  },
  {
    id: 'gemini-3.8-flash',
    displayName: 'Gemini 3.8 Flash',
    tier: 'generation-3',
    supportsGrounding: true,
    enabled: true,
    priority: 3,
    source: 'default'
  },
  {
    id: 'gemini-flash-latest',
    displayName: 'Gemini Flash Latest (Rolling Alias)',
    tier: 'latest-alias',
    supportsGrounding: true,
    enabled: true,
    priority: 4,
    source: 'default'
  }
];

export const DEFAULT_AI_MODEL_REGISTRY: AiModelRegistry = {
  version: '3.106.7',
  updatedAt: new Date().toISOString(),
  lastDiscoveryAt: null,
  routingPolicy: 'quota-split',
  keylessFallbackEnabled: true,
  providerOrder: ['gemini', 'groq', 'mistral', 'openrouter', 'cerebras', 'cloudflare', 'pollinations'],
  geminiModels: DEFAULT_GEMINI_MODELS,
  openrouterFreeModels: [
    'deepseek/deepseek-chat-v3-0324:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen-2.5-72b-instruct:free',
    'mistralai/mistral-small-3.1-24b-instruct:free'
  ],
  pollinationsModels: [
    'openai',
    'openai-fast',
    'mistral'
  ],
  providerModels: {
    groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3-32b'],
    mistral: ['mistral-small-latest', 'open-mistral-nemo'],
    openrouter: [
      'deepseek/deepseek-chat-v3-0324:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen-2.5-72b-instruct:free'
    ],
    cerebras: ['gpt-oss-120b', 'qwen-3-32b'],
    cloudflare: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/google/gemma-3-12b-it'],
    pollinations: ['openai', 'openai-fast', 'mistral']
  },
  circuitBreakers: {},
  telemetry: {
    totalRequests: 0,
    geminiRequests: 0,
    freeProviderRequests: 0,
    keylessRequests: 0,
    failoverSaves: 0,
    circuitTrips404: 0,
    lastProviderUsed: null,
    lastModelUsed: null,
    lastUpdatedAt: null,
    perProviderUsage: {
      gemini: 0,
      groq: 0,
      mistral: 0,
      openrouter: 0,
      cerebras: 0,
      cloudflare: 0,
      pollinations: 0
    }
  }
};

export const PROVIDER_STRATEGY_CATALOG: ProviderStrategyInfo[] = [
  {
    id: 'gemini',
    name: 'Google Gemini (AI Studio Free Tier)',
    status: 'active',
    envVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    freeTierLimits: 'Dynamic RPM/RPD per project (Flash & Lite tiers free; billing unlocks Tier 1)',
    strengths: 'Google Search Grounding, native JSON schema, highest Korean Windows terminology accuracy',
    privacyNote: 'Free tier prompts may be used by Google for product improvement',
    recommendedWorkload: '실시간 웹 검색 그라운딩, 신규 오류 수집(GitOps), 정밀 진단',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta'
  },
  {
    id: 'groq',
    name: 'Groq LPU Inference (Free Tier)',
    status: 'active',
    envVars: ['GROQ_API_KEY'],
    freeTierLimits: '~30 RPM · 1,000–14,400 RPD (model-dependent) · 6K–8K TPM cap',
    strengths: 'Sub-second token latency on Llama 3.3 70B & Llama 3.1 8B, standing free tier (no card)',
    privacyNote: 'Standard API retention; best for stateless short prompts under 4K tokens',
    recommendedWorkload: '초고속 단문 Q&A, 이슈 카테고리 재분류, Gemini 429 1순위 우회',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions'
  },
  {
    id: 'mistral',
    name: 'Mistral AI (La Plateforme Free Mode)',
    status: 'active',
    envVars: ['MISTRAL_API_KEY'],
    freeTierLimits: 'Dynamic org-level RPS/TPM caps (no credit card required for Free Mode)',
    strengths: 'Strong structured JSON output (mistral-small-latest), European GDPR-aligned fallback pool',
    privacyNote: 'Free mode usage tracked dynamically inside Mistral Studio Limits panel',
    recommendedWorkload: 'JSON 무결성 검증, 다국어 번역 보강, Groq/Gemini 병목 시 백업',
    endpoint: 'https://api.mistral.ai/v1/chat/completions'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (:free Catalog Pool)',
    status: 'active',
    envVars: ['OPENROUTER_API_KEY'],
    freeTierLimits: '20 RPM global · 50 RPD free (1,000 RPD unlocked permanently with $10 lifetime credit)',
    strengths: 'Single key accesses rotating :free models (DeepSeek V3, Llama 3.3, Qwen, Mistral)',
    privacyNote: 'Must filter :free slugs dynamically via /api/v1/models as models rotate frequently',
    recommendedWorkload: '동적 무료 오픈소스 모델 풀백 및 배치 요약 보조',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions'
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI (Free Daily Neurons)',
    status: 'active',
    envVars: ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'],
    freeTierLimits: '10,000 Neurons/day free (resets daily at 00:00 UTC)',
    strengths: 'Predictable daily resetting quota completely independent of Google/Groq',
    privacyNote: 'Heavy proprietary models require $5/mo paid plan; use Llama 3.3 / Gemma 3 variants',
    recommendedWorkload: '일일 리셋 보너스 할당량을 활용한 야간 요약 및 태그 정규화',
    endpoint: 'https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/run/{model}'
  },
  {
    id: 'cerebras',
    name: 'Cerebras Inference (Trial Credit Tier)',
    status: 'trial',
    envVars: ['CEREBRAS_API_KEY'],
    freeTierLimits: '$5 promotional credit (30 days, card required) · ~5 RPM / 30K TPM',
    strengths: 'Wafer-scale ultra-fast inference for Qwen 3 & GPT-OSS 120B',
    privacyNote: 'Permanent free tier discontinued in 2026; keep as optional burst fallback',
    recommendedWorkload: '프로모션 크레딧 보유 시 초고속 대용량 텍스트 처리 버스트',
    endpoint: 'https://api.cerebras.ai/v1/chat/completions'
  },
  {
    id: 'pollinations',
    name: 'Pollinations.ai Text API (Keyless Fallback)',
    status: 'keyless',
    envVars: [],
    freeTierLimits: 'Zero signup · Zero API key (Shared IP rate-limited community pool)',
    strengths: 'OpenAI-compatible endpoint with rotating openai / mistral / Llama / Qwen models',
    privacyNote: 'Public community endpoint: prompt credentials scrubbed & private:true enforced; last-resort only',
    recommendedWorkload: '기존 모든 API 키 미설정 또는 429/404 전면 소진 시 최후 폴백 (로컬 DB fallback 직전)',
    endpoint: 'https://text.pollinations.ai/openai'
  },
  {
    id: 'ovh-anonymous',
    name: 'OVHcloud AI Endpoints (Anonymous Tier)',
    status: 'trial',
    envVars: [],
    freeTierLimits: 'No signup for anonymous test (~2 RPM/IP strict rate cap)',
    strengths: 'European GDPR-compliant public inference endpoints for open-weight models',
    privacyNote: 'Too strict (~2 RPM) for multi-user primary traffic; documented for reference comparison',
    recommendedWorkload: '연구 비교 참조용 (2 RPM 제한으로 서버 공용 폴백엔 Pollinations 채택)',
    endpoint: 'https://endpoints.ai.cloud.ovh.net'
  },
  {
    id: 'github-models',
    name: 'GitHub Models Inference API',
    status: 'retired',
    envVars: [],
    freeTierLimits: 'Retired in 2026 (endpoint https://models.github.ai/inference decommissioned)',
    strengths: 'Historical developer prototyping catalog via GitHub PAT',
    privacyNote: 'Excluded from live HTTP routing to avoid guaranteed 404/timeout waste',
    recommendedWorkload: '사용 중단됨 — Groq · Mistral · OpenRouter :free · Cloudflare · Pollinations로 대체',
    endpoint: 'https://models.github.ai/inference (Retired)'
  }
];

export function sanitizePromptForKeylessEndpoint(promptText: string): string {
  const input = String(promptText || '');
  return input
    .replace(/\bAIza[0-9A-Za-z\-_]{20,}\b/g, '[REDACTED_GEMINI_KEY]')
    .replace(/\bgsk_[0-9A-Za-z_]{16,}\b/g, '[REDACTED_GROQ_KEY]')
    .replace(/\bsk-or-[0-9A-Za-z\-_]{16,}\b/g, '[REDACTED_OPENROUTER_KEY]')
    .replace(/\bsk-[0-9A-Za-z\-_]{20,}\b/g, '[REDACTED_API_KEY]')
    .replace(/\bghp_[0-9A-Za-z]{20,}\b/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/\bgithub_pat_[0-9A-Za-z_]{20,}\b/g, '[REDACTED_GITHUB_PAT]')
    .replace(/\bxox[bpa]-[0-9A-Za-z\-]{16,}\b/g, '[REDACTED_SLACK_TOKEN]')
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_AWS_KEY]')
    .replace(/\badm_sess_[0-9A-Za-z_]{12,}\b/g, '[REDACTED_ADMIN_SESSION]')
    .replace(/\bpasskey:[^\s"'`]+/gi, 'passkey:[REDACTED_PASSKEY]')
    .replace(/([?&](?:secret|token|key|api_key)=)[^&\s]+/gi, '$1[REDACTED_PARAM]')
    .replace(/(Authorization\s*:\s*)?Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]');
}

export function buildExternalFallbackPrompt(
  promptText: string,
  config?: { systemInstruction?: any; responseMimeType?: string }
): string {
  const parts: string[] = [];
  if (config?.systemInstruction) {
    const sysText = contentsToPromptText(config.systemInstruction).trim();
    if (sysText) {
      parts.push(`[System Instructions]\n${sysText}`);
    }
  }
  parts.push(String(promptText || ''));
  if (config?.responseMimeType === 'application/json') {
    parts.push('[Output Format Requirement]\nReturn strictly valid raw JSON matching the requested fields. Do not include markdown code fences or conversational preamble.');
  }
  return parts.join('\n\n');
}

export function stripMarkdownJsonFences(rawText: string): string {
  let cleaned = String(rawText || '').trim();
  const fencedMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch && fencedMatch[1]) {
    cleaned = fencedMatch[1].trim();
  }
  if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/i, '');
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '');
  if (cleaned.endsWith('```')) cleaned = cleaned.replace(/\s*```$/, '');
  return cleaned.trim();
}

export function loadAiModelRegistry(): AiModelRegistry {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(REGISTRY_PATH)) {
      const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      const validProviderSet = new Set<ProviderId>([
        'gemini', 'groq', 'mistral', 'openrouter', 'cerebras', 'cloudflare', 'pollinations'
      ]);
      const rawOrder: ProviderId[] = Array.isArray(parsed?.providerOrder) && parsed.providerOrder.length > 0
        ? Array.from(new Set(parsed.providerOrder.filter((p: any): p is ProviderId => validProviderSet.has(p))))
        : DEFAULT_AI_MODEL_REGISTRY.providerOrder;
      const keyedInOrder = rawOrder.filter((p) => p !== 'pollinations');
      const normalizedOrder: ProviderId[] = [...keyedInOrder, 'pollinations'];
      const merged: AiModelRegistry = {
        ...DEFAULT_AI_MODEL_REGISTRY,
        ...parsed,
        keylessFallbackEnabled: typeof parsed?.keylessFallbackEnabled === 'boolean'
          ? parsed.keylessFallbackEnabled
          : true,
        geminiModels: Array.isArray(parsed?.geminiModels) && parsed.geminiModels.length > 0
          ? parsed.geminiModels.filter((m: any): m is DiscoveredGeminiModel => Boolean(m && typeof m === 'object' && typeof m.id === 'string' && !isProhibitedGeminiModel(m.id)))
          : DEFAULT_GEMINI_MODELS,
        providerOrder: normalizedOrder,
        openrouterFreeModels: Array.isArray(parsed?.openrouterFreeModels) && parsed.openrouterFreeModels.length > 0
          ? parsed.openrouterFreeModels.filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0 && !id.includes('gemini-2.0'))
          : DEFAULT_AI_MODEL_REGISTRY.openrouterFreeModels,
        pollinationsModels: Array.isArray(parsed?.pollinationsModels) && parsed.pollinationsModels.length > 0
          ? parsed.pollinationsModels.filter((m: any): m is string => typeof m === 'string' && m.trim().length > 0)
          : DEFAULT_AI_MODEL_REGISTRY.pollinationsModels,
        providerModels: {
          ...DEFAULT_AI_MODEL_REGISTRY.providerModels,
          ...(parsed?.providerModels || {})
        },
        circuitBreakers: parsed?.circuitBreakers || {},
        telemetry: {
          ...DEFAULT_AI_MODEL_REGISTRY.telemetry,
          ...(parsed?.telemetry || {}),
          keylessRequests: Number(parsed?.telemetry?.keylessRequests || 0),
          perProviderUsage: {
            ...DEFAULT_AI_MODEL_REGISTRY.telemetry.perProviderUsage,
            ...(parsed?.telemetry?.perProviderUsage || {})
          }
        }
      };
      if (merged.geminiModels.length === 0) {
        merged.geminiModels = DEFAULT_GEMINI_MODELS;
      }
      return merged;
    }
  } catch (err: any) {
    console.warn('[AI Registry] Failed to read registry, using defaults:', err?.message || err);
  }
  saveAiModelRegistry(DEFAULT_AI_MODEL_REGISTRY);
  return JSON.parse(JSON.stringify(DEFAULT_AI_MODEL_REGISTRY));
}

export function saveAiModelRegistry(registry: AiModelRegistry): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    registry.updatedAt = new Date().toISOString();
    const serialized = JSON.stringify(registry, null, 2) + '\n';
    const tmpPath = `${REGISTRY_PATH}.tmp.${process.pid}.${Date.now()}`;
    try {
      fs.writeFileSync(tmpPath, serialized, 'utf8');
      fs.renameSync(tmpPath, REGISTRY_PATH);
    } catch {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {}
      fs.writeFileSync(REGISTRY_PATH, serialized, 'utf8');
    }
  } catch (err: any) {
    console.warn('[AI Registry] Failed to save registry:', err?.message || err);
  }
}

export function isProhibitedGeminiModel(modelId: string): boolean {
  const lower = (modelId || '').toLowerCase();
  return PROHIBITED_GEMINI_PATTERNS.some((p) => lower.includes(p));
}

export function pruneExpiredCircuitBreakers(registry: AiModelRegistry): boolean {
  const now = Date.now();
  let changed = false;
  for (const [id, entry] of Object.entries(registry.circuitBreakers || {})) {
    const exp = new Date(entry.expiresAt).getTime();
    if (!exp || exp <= now) {
      delete registry.circuitBreakers[id];
      changed = true;
    }
  }
  return changed;
}

export function isCircuitOpen(registry: AiModelRegistry, modelId: string): boolean {
  const entry = registry.circuitBreakers?.[modelId];
  if (!entry) return false;
  const exp = new Date(entry.expiresAt).getTime();
  if (!exp || exp <= Date.now()) {
    delete registry.circuitBreakers[modelId];
    return false;
  }
  return true;
}

export function tripCircuitBreaker(
  registry: AiModelRegistry,
  modelId: string,
  provider: ProviderId,
  statusCode: number,
  reason: string,
  ttlHours = 24
): void {
  const existing = registry.circuitBreakers[modelId];
  const now = Date.now();
  registry.circuitBreakers[modelId] = {
    modelId,
    provider,
    statusCode,
    reason: reason.substring(0, 220),
    trippedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlHours * 3600 * 1000).toISOString(),
    failureCount: (existing?.failureCount || 0) + 1
  };
  registry.telemetry.circuitTrips404 = (registry.telemetry.circuitTrips404 || 0) + 1;
  saveAiModelRegistry(registry);
}

export type ErrorClassification =
  | 'MODEL_NOT_FOUND_404'
  | 'QUOTA_EXHAUSTED_429'
  | 'INVALID_KEY'
  | 'TRANSIENT_ERROR';

export function classifyAiError(err: any): { type: ErrorClassification; message: string; statusCode: number } {
  const raw = typeof err === 'string'
    ? err
    : (err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err || '')));
  const lower = raw.toLowerCase();
  const statusCode = Number(err?.status || err?.code || (lower.includes('404') ? 404 : lower.includes('429') ? 429 : lower.includes('401') ? 401 : lower.includes('403') ? 403 : 500));

  if (
    statusCode === 404 ||
    lower.includes('not_found') ||
    lower.includes('is not found for api version') ||
    lower.includes('model_not_found') ||
    lower.includes('not supported for generatecontent') ||
    lower.includes('does not exist or you do not have access')
  ) {
    return { type: 'MODEL_NOT_FOUND_404', message: raw, statusCode: 404 };
  }

  if (
    lower.includes('api key not valid') ||
    lower.includes('api_key_invalid') ||
    lower.includes('invalid api key') ||
    lower.includes('api key expired') ||
    (lower.includes('invalid_argument') && lower.includes('api key')) ||
    lower.includes('permission_denied') ||
    statusCode === 401 ||
    statusCode === 403
  ) {
    return {
      type: 'INVALID_KEY',
      message: raw,
      statusCode: statusCode === 400 ? 400 : statusCode === 401 ? 401 : 403
    };
  }

  if (
    statusCode === 429 ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    return { type: 'QUOTA_EXHAUSTED_429', message: raw, statusCode: 429 };
  }

  return { type: 'TRANSIENT_ERROR', message: raw, statusCode };
}

function scoreDiscoveredGeminiModel(id: string): { priority: number; tier: DiscoveredGeminiModel['tier'] } {
  const lower = id.toLowerCase();
  if (lower === 'gemini-4-hydrogen') return { priority: 1, tier: 'generation-4' };
  if (lower.startsWith('gemini-4') && lower.includes('hydrogen')) return { priority: 2, tier: 'generation-4' };
  if (lower.includes('4') && lower.includes('flash')) return { priority: 3, tier: 'generation-4' };
  if (lower === 'gemini-3.1-flash-lite') return { priority: 4, tier: 'lite' };
  if (lower === 'gemini-3.8-flash') return { priority: 5, tier: 'generation-3' };
  if (lower === 'gemini-flash-latest') return { priority: 6, tier: 'latest-alias' };
  if (lower.includes('flash-lite')) return { priority: 7, tier: 'lite' };
  if (lower.includes('flash')) return { priority: 8, tier: 'generation-3' };
  if (lower === 'gemini-4-argon') return { priority: 9, tier: 'generation-4' };
  if (lower.includes('pro')) return { priority: 12, tier: 'other' };
  return { priority: 20, tier: 'other' };
}

export async function discoverLiveModels(options?: {
  geminiApiKey?: string;
}): Promise<{
  registry: AiModelRegistry;
  geminiDiscoveredCount: number;
  openrouterDiscoveredCount: number;
  pollinationsDiscoveredCount: number;
  errors: string[];
}> {
  const registry = loadAiModelRegistry();
  pruneExpiredCircuitBreakers(registry);
  const errors: string[] = [];
  let geminiDiscoveredCount = 0;
  let openrouterDiscoveredCount = 0;
  let pollinationsDiscoveredCount = 0;
  const nowIso = new Date().toISOString();

  // 1. Discover Gemini models via @google/genai ai.models.list()
  const geminiKey = (options?.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (geminiKey && geminiKey.startsWith('AIza')) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const pager = await ai.models.list({ config: { pageSize: 100 } });
      const discoveredMap = new Map<string, DiscoveredGeminiModel>();

      // Preserve existing enabled flags and defaults
      for (const existing of registry.geminiModels) {
        if (!isProhibitedGeminiModel(existing.id)) {
          discoveredMap.set(existing.id, existing);
        }
      }

      for await (const model of pager) {
        const rawName = (model.name || '').replace(/^models\//, '').trim();
        if (!rawName || isProhibitedGeminiModel(rawName)) continue;
        const methods: string[] = Array.isArray((model as any).supportedActions)
          ? (model as any).supportedActions
          : (Array.isArray((model as any).supportedGenerationMethods) ? (model as any).supportedGenerationMethods : ['generateContent']);
        if (!methods.some((m) => String(m).toLowerCase().includes('generatecontent'))) continue;
        if (!rawName.toLowerCase().includes('gemini')) continue;

        geminiDiscoveredCount++;
        const { priority, tier } = scoreDiscoveredGeminiModel(rawName);
        const existing = discoveredMap.get(rawName);
        discoveredMap.set(rawName, {
          id: rawName,
          displayName: model.displayName || existing?.displayName || rawName,
          tier,
          supportsGrounding: !rawName.toLowerCase().includes('gemma'),
          enabled: existing ? existing.enabled : priority <= 12,
          priority: existing?.source === 'default' && existing.priority <= 10 ? existing.priority : priority,
          source: existing?.source === 'default' ? 'default' : 'auto-discovered',
          lastVerifiedAt: nowIso
        });
      }

      registry.geminiModels = Array.from(discoveredMap.values())
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 18);
    } catch (err: any) {
      errors.push(`Gemini catalog discovery: ${err?.message || err}`);
    }
  } else {
    errors.push('Gemini discovery skipped (no valid server AIza key configured).');
  }

  // 2. Discover active OpenRouter :free & Pollinations keyless text models in parallel
  await Promise.all([
    (async () => {
      try {
        const orResp = await fetch('https://openrouter.ai/api/v1/models', {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'WindowsFixWizard-ModelSync/3.106.7' }
        });
        if (orResp.ok) {
          const json: any = await orResp.json();
          const items: any[] = Array.isArray(json?.data) ? json.data : [];
          const freeSlugs = items
            .map((item) => String(item?.id || '').trim())
            .filter((id) => id.endsWith(':free') && !id.includes('gemini-2.0') && !id.includes('gemini-1.5'));
          if (freeSlugs.length > 0) {
            const preferredKeywords = ['deepseek', 'llama-3.3', 'qwen', 'mistral', 'gemma', 'llama-3.1'];
            const ranked = [
              ...freeSlugs.filter((id) => preferredKeywords.some((kw) => id.toLowerCase().includes(kw))),
              ...freeSlugs.filter((id) => !preferredKeywords.some((kw) => id.toLowerCase().includes(kw)))
            ].slice(0, 12);
            registry.openrouterFreeModels = ranked;
            registry.providerModels.openrouter = ranked;
            openrouterDiscoveredCount = freeSlugs.length;
          }
        }
      } catch (err: any) {
        errors.push(`OpenRouter :free catalog sync: ${err?.message || err}`);
      }
    })(),
    (async () => {
      try {
        const pollResp = await fetch('https://text.pollinations.ai/models', {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'WindowsFixWizard-ModelSync/3.106.7' }
        });
        if (pollResp.ok) {
          const json: any = await pollResp.json();
          const list: any[] = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
          const textNames = list
            .map((item) => {
              if (typeof item === 'string') return item.trim();
              const modelType = String(item?.type || item?.output_modalities || 'text').toLowerCase();
              if (item?.type && !modelType.includes('text') && !modelType.includes('chat')) return '';
              if (item?.community === true) return '';
              return String(item?.name || item?.id || '').trim();
            })
            .filter((name) => Boolean(name) && name.length <= 64);
          const uniqueNames = Array.from(new Set(textNames));
          if (uniqueNames.length > 0) {
            const preferredKeywords = ['openai', 'openai-fast', 'mistral', 'llama', 'qwen', 'deepseek'];
            const ranked = [
              ...uniqueNames.filter((name) => preferredKeywords.some((kw) => name.toLowerCase() === kw || name.toLowerCase().startsWith(`${kw}-`))),
              ...uniqueNames.filter((name) => !preferredKeywords.some((kw) => name.toLowerCase() === kw || name.toLowerCase().startsWith(`${kw}-`)))
            ].slice(0, 8);
            registry.pollinationsModels = ranked;
            registry.providerModels.pollinations = ranked;
            pollinationsDiscoveredCount = uniqueNames.length;
          }
        }
      } catch (err: any) {
        errors.push(`Pollinations keyless catalog sync: ${err?.message || err}`);
      }
    })()
  ]);

  registry.lastDiscoveryAt = nowIso;
  saveAiModelRegistry(registry);

  return { registry, geminiDiscoveredCount, openrouterDiscoveredCount, pollinationsDiscoveredCount, errors };
}

export function getProviderServerReadiness(
  registryInput?: AiModelRegistry
): Record<ProviderId, { configured: boolean; envHint: string; keyless?: boolean }> {
  const registry = registryInput || loadAiModelRegistry();

  let hasConfiguredGeminiKey = false;
  try {
    const apiKeysPath = path.join(DATA_DIR, 'api_keys_config.json');
    if (fs.existsSync(apiKeysPath)) {
      const parsed = JSON.parse(fs.readFileSync(apiKeysPath, 'utf8'));
      if (Array.isArray(parsed?.keys)) {
        hasConfiguredGeminiKey = parsed.keys.some(
          (k: any) => k && k.isActive !== false && typeof k.key === 'string' && k.key.trim().startsWith('AIza') && k.key.trim().length >= 30
        );
      }
    }
  } catch (_) {}

  let sysConfig: Record<string, any> = {};
  try {
    const sysPath = path.join(DATA_DIR, 'system_config.json');
    if (fs.existsSync(sysPath)) {
      const parsed = JSON.parse(fs.readFileSync(sysPath, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        sysConfig = parsed;
      }
    }
  } catch (_) {}

  const hasGemini = Boolean(
    hasConfiguredGeminiKey ||
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().startsWith('AIza')) ||
    (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim().startsWith('AIza')) ||
    (process.env.CUSTOM_API_KEY && process.env.CUSTOM_API_KEY.trim().startsWith('AIza'))
  );
  return {
    gemini: { configured: hasGemini, envHint: 'GEMINI_API_KEY / GOOGLE_API_KEY' },
    groq: { configured: Boolean(process.env.GROQ_API_KEY?.trim() || String(sysConfig.groqApiKey || '').trim()), envHint: 'GROQ_API_KEY' },
    mistral: { configured: Boolean(process.env.MISTRAL_API_KEY?.trim()), envHint: 'MISTRAL_API_KEY' },
    openrouter: { configured: Boolean(process.env.OPENROUTER_API_KEY?.trim() || String(sysConfig.openrouterApiKey || '').trim()), envHint: 'OPENROUTER_API_KEY' },
    cerebras: { configured: Boolean(process.env.CEREBRAS_API_KEY?.trim()), envHint: 'CEREBRAS_API_KEY' },
    cloudflare: {
      configured: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID?.trim() && process.env.CLOUDFLARE_API_TOKEN?.trim()),
      envHint: 'CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN'
    },
    pollinations: {
      configured: registry.keylessFallbackEnabled !== false,
      envHint: 'No API Key Required (Keyless Toggle)',
      keyless: true
    }
  };
}

export function getHealthyGeminiCandidates(
  preferredModel?: string,
  registryInput?: AiModelRegistry
): string[] {
  const registry = registryInput || loadAiModelRegistry();
  pruneExpiredCircuitBreakers(registry);

  const enabled = registry.geminiModels
    .filter((m) => m.enabled && !isProhibitedGeminiModel(m.id) && !isCircuitOpen(registry, m.id))
    .sort((a, b) => a.priority - b.priority)
    .map((m) => m.id);

  const baseList = enabled.length > 0
    ? enabled
    : DEFAULT_GEMINI_MODELS.map((m) => m.id).filter((id) => !isCircuitOpen(registry, id));

  if (preferredModel && preferredModel !== 'auto' && !isProhibitedGeminiModel(preferredModel) && !isCircuitOpen(registry, preferredModel)) {
    return [preferredModel, ...baseList.filter((m) => m !== preferredModel)];
  }
  return baseList;
}

export function contentsToPromptText(contents: any): string {
  if (typeof contents === 'string') return contents;
  if (Array.isArray(contents)) {
    return contents.map((c) => (typeof c === 'string' ? c : c?.text || JSON.stringify(c))).join('\n');
  }
  if (contents && typeof contents === 'object') {
    if (Array.isArray(contents.parts)) {
      return contents.parts.map((p: any) => p?.text || '').filter(Boolean).join('\n');
    }
    return JSON.stringify(contents);
  }
  return String(contents || '');
}

export async function callExternalFreeProvider(
  provider: Exclude<ProviderId, 'gemini'>,
  promptText: string,
  options?: {
    customKey?: string;
    cloudflareAccountId?: string;
    maxTokens?: number;
    registry?: AiModelRegistry;
    bypassEnabledCheck?: boolean;
  }
): Promise<{ text: string; modelUsed: string; keyUsed: string; provider: ProviderId } | null> {
  const registry = options?.registry || loadAiModelRegistry();

  if (provider === 'groq') {
    const key = (options?.customKey || process.env.GROQ_API_KEY || '').trim();
    if (!key || key.includes('PLACEHOLDER')) return null;
    const models = (registry.providerModels.groq || DEFAULT_AI_MODEL_REGISTRY.providerModels.groq)
      .filter((m) => !isCircuitOpen(registry, m));
    for (const model of models) {
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: promptText }],
            temperature: 0.3,
            ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {})
          })
        });
        if (resp.ok) {
          const data: any = await resp.json();
          const text = data?.choices?.[0]?.message?.content || '';
          if (text.trim()) return { text, modelUsed: `Groq (${model})`, keyUsed: 'GROQ_API_KEY', provider: 'groq' };
        } else if (resp.status === 404) {
          tripCircuitBreaker(registry, model, 'groq', 404, `Groq HTTP 404`);
        }
      } catch (_) {}
    }
  }

  if (provider === 'mistral') {
    const key = (options?.customKey || process.env.MISTRAL_API_KEY || '').trim();
    if (!key || key.includes('PLACEHOLDER')) return null;
    const models = (registry.providerModels.mistral || DEFAULT_AI_MODEL_REGISTRY.providerModels.mistral)
      .filter((m) => !isCircuitOpen(registry, m));
    for (const model of models) {
      try {
        const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: promptText }],
            temperature: 0.3,
            ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {})
          })
        });
        if (resp.ok) {
          const data: any = await resp.json();
          const text = data?.choices?.[0]?.message?.content || '';
          if (text.trim()) return { text, modelUsed: `Mistral (${model})`, keyUsed: 'MISTRAL_API_KEY', provider: 'mistral' };
        } else if (resp.status === 404) {
          tripCircuitBreaker(registry, model, 'mistral', 404, `Mistral HTTP 404`);
        }
      } catch (_) {}
    }
  }

  if (provider === 'openrouter') {
    const key = (options?.customKey || process.env.OPENROUTER_API_KEY || '').trim();
    if (!key || key.includes('PLACEHOLDER')) return null;
    const rawModels = registry.openrouterFreeModels?.length
      ? registry.openrouterFreeModels
      : registry.providerModels.openrouter;
    const models = rawModels.filter((m) => !m.includes('gemini-2.0') && !isCircuitOpen(registry, m));
    for (const model of models.slice(0, 5)) {
      try {
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://windows-fix-wizard.github.io',
            'X-Title': 'Windows Fix Wizard'
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: promptText }],
            temperature: 0.3,
            ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {})
          })
        });
        if (resp.ok) {
          const data: any = await resp.json();
          const text = data?.choices?.[0]?.message?.content || '';
          if (text.trim()) return { text, modelUsed: `OpenRouter (${model})`, keyUsed: 'OPENROUTER_API_KEY', provider: 'openrouter' };
        } else if (resp.status === 404) {
          tripCircuitBreaker(registry, model, 'openrouter', 404, `OpenRouter HTTP 404`);
        }
      } catch (_) {}
    }
  }

  if (provider === 'cerebras') {
    const key = (options?.customKey || process.env.CEREBRAS_API_KEY || '').trim();
    if (!key || key.includes('PLACEHOLDER')) return null;
    const models = (registry.providerModels.cerebras || DEFAULT_AI_MODEL_REGISTRY.providerModels.cerebras)
      .filter((m) => !isCircuitOpen(registry, m));
    for (const model of models) {
      try {
        const resp = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: promptText }],
            temperature: 0.3,
            ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {})
          })
        });
        if (resp.ok) {
          const data: any = await resp.json();
          const text = data?.choices?.[0]?.message?.content || '';
          if (text.trim()) return { text, modelUsed: `Cerebras (${model})`, keyUsed: 'CEREBRAS_API_KEY', provider: 'cerebras' };
        } else if (resp.status === 404) {
          tripCircuitBreaker(registry, model, 'cerebras', 404, `Cerebras HTTP 404`);
        }
      } catch (_) {}
    }
  }

  if (provider === 'cloudflare') {
    const accountId = (options?.cloudflareAccountId || process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
    const token = (options?.customKey || process.env.CLOUDFLARE_API_TOKEN || '').trim();
    if (!accountId || !token) return null;
    const models = (registry.providerModels.cloudflare || DEFAULT_AI_MODEL_REGISTRY.providerModels.cloudflare)
      .filter((m) => typeof m === 'string' && /^[@a-zA-Z0-9._/-]+$/.test(m) && !m.includes('..') && !isCircuitOpen(registry, m));
    for (const model of models) {
      try {
        const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`, {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: promptText }]
          })
        });
        if (resp.ok) {
          const data: any = await resp.json();
          const text = data?.result?.response || data?.result?.choices?.[0]?.message?.content || '';
          if (String(text).trim()) {
            return { text: String(text), modelUsed: `Cloudflare (${model})`, keyUsed: 'CLOUDFLARE_API_TOKEN', provider: 'cloudflare' };
          }
        } else if (resp.status === 404) {
          tripCircuitBreaker(registry, model, 'cloudflare', 404, `Cloudflare HTTP 404`);
        }
      } catch (_) {}
    }
  }

  if (provider === 'pollinations') {
    if (!options?.bypassEnabledCheck && registry.keylessFallbackEnabled === false) {
      return null;
    }
    const sanitizedPrompt = sanitizePromptForKeylessEndpoint(promptText);
    const rawModels = registry.pollinationsModels?.length
      ? registry.pollinationsModels
      : (registry.providerModels.pollinations || DEFAULT_AI_MODEL_REGISTRY.providerModels.pollinations);
    const models = rawModels.filter((m) => !isCircuitOpen(registry, `pollinations:${m}`));
    for (const model of models.slice(0, 3)) {
      try {
        const resp = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WindowsFixWizard-ResilienceRouter/3.106.7'
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: sanitizedPrompt }],
            temperature: 0.3,
            private: true,
            ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {})
          })
        });
        if (resp.ok) {
          const contentType = (resp.headers.get('content-type') || '').toLowerCase();
          const rawBody = await resp.text();
          let text = '';
          let parsedJson = false;
          try {
            const parsed: any = JSON.parse(rawBody);
            parsedJson = true;
            text = parsed?.choices?.[0]?.message?.content || parsed?.text || '';
          } catch {
            const looksLikeHtml = contentType.includes('text/html') || /^\s*(?:<!doctype|<html|<head|<body)\b/i.test(rawBody);
            if (!looksLikeHtml) {
              text = rawBody || '';
            }
          }
          if ((!parsedJson || String(text).trim()) && String(text).trim()) {
            return {
              text: String(text),
              modelUsed: `Pollinations (${model}) [Keyless]`,
              keyUsed: 'KEYLESS_NO_AUTH',
              provider: 'pollinations'
            };
          }
        } else if (resp.status === 404) {
          tripCircuitBreaker(registry, `pollinations:${model}`, 'pollinations', 404, 'Pollinations HTTP 404', 6);
        }
      } catch (_) {}
    }
  }

  return null;
}

export function recordRegistryUsage(provider: ProviderId, modelUsed: string, wasFailover = false): void {
  try {
    const registry = loadAiModelRegistry();
    registry.telemetry.totalRequests = (registry.telemetry.totalRequests || 0) + 1;
    if (provider === 'gemini') {
      registry.telemetry.geminiRequests = (registry.telemetry.geminiRequests || 0) + 1;
    } else {
      registry.telemetry.freeProviderRequests = (registry.telemetry.freeProviderRequests || 0) + 1;
      if (provider === 'pollinations') {
        registry.telemetry.keylessRequests = (registry.telemetry.keylessRequests || 0) + 1;
      }
    }
    if (wasFailover) {
      registry.telemetry.failoverSaves = (registry.telemetry.failoverSaves || 0) + 1;
    }
    registry.telemetry.perProviderUsage[provider] = (registry.telemetry.perProviderUsage[provider] || 0) + 1;
    registry.telemetry.lastProviderUsed = provider;
    registry.telemetry.lastModelUsed = modelUsed;
    registry.telemetry.lastUpdatedAt = new Date().toISOString();
    saveAiModelRegistry(registry);
  } catch (_) {}
}
