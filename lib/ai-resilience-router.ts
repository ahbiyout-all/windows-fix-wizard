import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

export type ProviderId =
  | 'gemini'
  | 'groq'
  | 'mistral'
  | 'nvidia'
  | 'cohere'
  | 'openrouter'
  | 'cloudflare'
  | 'huggingface'
  | 'cerebras'
  | 'ovh'
  | 'pollinations';

export const KEYLESS_PROVIDER_IDS: ProviderId[] = ['ovh', 'pollinations'];

export const ALL_EXTERNAL_PROVIDER_IDS: Exclude<ProviderId, 'gemini'>[] = [
  'groq',
  'mistral',
  'nvidia',
  'cohere',
  'openrouter',
  'cloudflare',
  'huggingface',
  'cerebras',
  'ovh',
  'pollinations'
];

export const SYSTEM_CONFIG_KEY_FIELDS = [
  'groqApiKey',
  'mistralApiKey',
  'nvidiaApiKey',
  'cohereApiKey',
  'openrouterApiKey',
  'cloudflareAccountId',
  'cloudflareApiToken',
  'huggingfaceApiKey',
  'cerebrasApiKey'
] as const;

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
  ovhModels?: string[];
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
  id: ProviderId | 'github-models';
  name: string;
  status: 'active' | 'keyless' | 'trial' | 'retired';
  signupRequired: 'none' | 'free-account';
  cardRequired: boolean;
  authType: 'keyless' | 'api-key' | 'account-token';
  koreanJsonRating: 'high' | 'medium' | 'experimental';
  signupUrl: string;
  recommendedPriorityRank: number;
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
  version: '3.106.15',
  updatedAt: new Date().toISOString(),
  lastDiscoveryAt: null,
  routingPolicy: 'quota-split',
  keylessFallbackEnabled: true,
  providerOrder: [
    'gemini',
    'groq',
    'mistral',
    'nvidia',
    'cohere',
    'openrouter',
    'cloudflare',
    'huggingface',
    'cerebras',
    'ovh',
    'pollinations'
  ],
  geminiModels: DEFAULT_GEMINI_MODELS,
  openrouterFreeModels: [
    'google/gemma-4-31b-it:free',
    'deepseek/deepseek-chat-v3-0324:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen-2.5-72b-instruct:free'
  ],
  pollinationsModels: [
    'openai',
    'openai-fast',
    'mistral'
  ],
  ovhModels: [
    'Meta-Llama-3_3-70B-Instruct',
    'Mistral-Small-3.2-24B-Instruct-2506',
    'Qwen3.8-27B',
    'gemma-4-26b-a4b'
  ],
  providerModels: {
    groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3-32b'],
    mistral: ['mistral-small-latest', 'open-mistral-nemo'],
    nvidia: [
      'google/gemma-4-31b-it',
      'meta/llama-3.3-70b-instruct',
      'mistralai/mistral-large-4-1t-a52b',
      'google/gemma-3-12b-it'
    ],
    cohere: ['command-a-03-2025', 'command-r-plus-08-2024', 'command-r-08-2024'],
    openrouter: [
      'google/gemma-4-31b-it:free',
      'deepseek/deepseek-chat-v3-0324:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen-2.5-72b-instruct:free'
    ],
    cloudflare: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/google/gemma-3-12b-it'],
    huggingface: [
      'Qwen/Qwen3.8-27B',
      'meta-llama/Llama-3.1-8B-Instruct',
      'google/gemma-4-31B-it',
      'deepseek-ai/DeepSeek-V4.1-Flash'
    ],
    cerebras: ['gpt-oss-120b', 'qwen-3-32b'],
    ovh: [
      'Meta-Llama-3_3-70B-Instruct',
      'Mistral-Small-3.2-24B-Instruct-2506',
      'Qwen3.8-27B',
      'gemma-4-26b-a4b'
    ],
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
      nvidia: 0,
      cohere: 0,
      openrouter: 0,
      cloudflare: 0,
      huggingface: 0,
      cerebras: 0,
      ovh: 0,
      pollinations: 0
    }
  }
};

export const PROVIDER_STRATEGY_CATALOG: ProviderStrategyInfo[] = [
  {
    id: 'pollinations',
    name: 'Pollinations.ai Text API (무가입 · 무키)',
    status: 'keyless',
    signupRequired: 'none',
    cardRequired: false,
    authType: 'keyless',
    koreanJsonRating: 'medium',
    signupUrl: 'https://text.pollinations.ai',
    recommendedPriorityRank: 1,
    envVars: [],
    freeTierLimits: '회원가입 불필요 · API 키 불필요 (공용 IP 속도 제한 풀)',
    strengths: 'OpenAI 호환 규격으로 키 없이 즉시 호출 가능하며 openai / mistral / Qwen 모델 제공',
    privacyNote: '전송 전 내부 키·세션 토큰 자동 마스킹 및 private:true 적용 · 실행 순서는 최후 폴백 전용',
    recommendedWorkload: '초기 키 미설정 상태 및 등록된 모든 API 키 소진(429/404) 시 최후 폴백',
    endpoint: 'https://text.pollinations.ai/openai'
  },
  {
    id: 'ovh',
    name: 'OVHcloud AI Endpoints (무가입 익명 티어)',
    status: 'keyless',
    signupRequired: 'none',
    cardRequired: false,
    authType: 'keyless',
    koreanJsonRating: 'medium',
    signupUrl: 'https://endpoints.ai.cloud.ovh.net',
    recommendedPriorityRank: 2,
    envVars: [],
    freeTierLimits: '회원가입·키 불필요 (익명 IP당 ~1~2 RPM 엄격 제한 · 33개 모델 공개)',
    strengths: '유럽 GDPR 준수 공용 추론 엔드포인트 · Llama 3.3 70B · Qwen3.8 · Mistral Small 3.2',
    privacyNote: 'IP당 분당 호출 상한이 낮아 Pollinations와 함께 2중 키리스 최후 폴백으로 동작',
    recommendedWorkload: 'Pollinations 한도 제한 시 무가입 2중 키리스 백업(프롬프트 자동 마스킹)',
    endpoint: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions'
  },
  {
    id: 'gemini',
    name: 'Google Gemini (AI Studio 무료 티어)',
    status: 'active',
    signupRequired: 'free-account',
    cardRequired: false,
    authType: 'api-key',
    koreanJsonRating: 'high',
    signupUrl: 'https://aistudio.google.com/apikey',
    recommendedPriorityRank: 3,
    envVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    freeTierLimits: '카드 불필요 · 프로젝트별 동적 무료 RPM/RPD (Flash · Lite 무료 제공)',
    strengths: 'Google Search 그라운딩, 네이티브 JSON 스키마, 최상위 한국어 Windows 용어 정확도',
    privacyNote: 'AI Studio 무료 티어 프롬프트는 Google 제품 개선 정책이 적용될 수 있음',
    recommendedWorkload: '실시간 웹 검색 그라운딩, 신규 오류 수집(GitOps), 정밀 진단 1순위',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta'
  },
  {
    id: 'groq',
    name: 'Groq LPU Inference (무료 티어 · 카드 불필요)',
    status: 'active',
    signupRequired: 'free-account',
    cardRequired: false,
    authType: 'api-key',
    koreanJsonRating: 'high',
    signupUrl: 'https://console.groq.com/keys',
    recommendedPriorityRank: 4,
    envVars: ['GROQ_API_KEY'],
    freeTierLimits: '카드 불필요 · ~30 RPM · 1,000~14,400 RPD (모델별) · 6K~8K TPM',
    strengths: 'Llama 3.3 70B 및 Qwen3 32B 1초 미만 초고속 추론, 상시 무료 티어 유지',
    privacyNote: '4K 토큰 이하 단문 프롬프트 및 JSON 응답에서 최고 속도',
    recommendedWorkload: '초고속 단문 Q&A, 이슈 카테고리 재분류, Gemini 429 1순위 우회',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions'
  },
  {
    id: 'mistral',
    name: 'Mistral AI (La Plateforme Free Mode · 카드 불필요)',
    status: 'active',
    signupRequired: 'free-account',
    cardRequired: false,
    authType: 'api-key',
    koreanJsonRating: 'high',
    signupUrl: 'https://console.mistral.ai/api-keys',
    recommendedPriorityRank: 5,
    envVars: ['MISTRAL_API_KEY'],
    freeTierLimits: '카드 불필요 (Free Mode 활성화) · 조직별 동적 RPS/TPM 상한',
    strengths: '안정적인 JSON 구조 출력(mistral-small-latest), 유럽 GDPR 기반 백업 풀',
    privacyNote: 'Mistral Studio Limits 화면에서 실시간 Free Mode 한도 확인 가능',
    recommendedWorkload: 'JSON 무결성 검증, 다국어 번역 보강, Groq/Gemini 병목 시 백업',
    endpoint: 'https://api.mistral.ai/v1/chat/completions'
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM (Build 무료 크레딧 · 카드 불필요)',
    status: 'active',
    signupRequired: 'free-account',
    cardRequired: false,
    authType: 'api-key',
    koreanJsonRating: 'high',
    signupUrl: 'https://build.nvidia.com/explore/discover',
    recommendedPriorityRank: 6,
    envVars: ['NVIDIA_API_KEY'],
    freeTierLimits: '카드 불필요 · 가입 즉시 무료 API 크레딧(1,000~5,000 Credits) · OpenAI 호환',
    strengths: 'Gemma 4 31B, Llama 3.3 70B, Mistral Large 4, DeepSeek 등 대형 무료 카탈로그(33종+)',
    privacyNote: '키는 nvapi- 접두사 형식이며 서버 전용 환경변수·설정에만 보관',
    recommendedWorkload: '대형 오픈모델 한국어 Windows 오류 JSON 수집 및 장문 진단 백업',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions'
  },
  {
    id: 'cohere',
    name: 'Cohere Command API v2 (Trial 무료 티어 · 카드 불필요)',
    status: 'trial',
    signupRequired: 'free-account',
    cardRequired: false,
    authType: 'api-key',
    koreanJsonRating: 'high',
    signupUrl: 'https://dashboard.cohere.com/api-keys',
    recommendedPriorityRank: 7,
    envVars: ['COHERE_API_KEY'],
    freeTierLimits: '카드 불필요 · 20 RPM · 월 1,000건(Trial Key · 비상업 평가용)',
    strengths: 'command-a-03-2025 및 command-r-plus 기반 한국어 문맥·기술 문서 요약 최상급',
    privacyNote: '월 1,000건 상한 및 Retry-After 429 제한 준수(비상업 평가 용도)',
    recommendedWorkload: '한국어 Windows 오류 요약, 해결 단계 구조화 및 정확도 보강 폴백',
    endpoint: 'https://api.cohere.com/v2/chat'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (:free 동적 무료 풀 · 카드 불필요)',
    status: 'active',
    signupRequired: 'free-account',
    cardRequired: false,
    authType: 'api-key',
    koreanJsonRating: 'high',
    signupUrl: 'https://openrouter.ai/keys',
    recommendedPriorityRank: 8,
    envVars: ['OPENROUTER_API_KEY'],
    freeTierLimits: '카드 불필요 · 20 RPM · 일 50회 ($10 충전 이력 시 일 1,000회 영구 상향)',
    strengths: '단일 키로 Gemma 4 31B, DeepSeek V3, Llama 3.3, Qwen 등 :free 모델 자동 순환',
    privacyNote: '무료 모델 슬러그가 수시 변경되므로 실시간 카탈로그 탐색과 연계해 사용',
    recommendedWorkload: '동적 무료 오픈소스 모델 풀백 및 배치 요약 보조',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions'
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI (일일 무료 Neurons · 카드 불필요)',
    status: 'active',
    signupRequired: 'free-account',
    cardRequired: false,
    authType: 'account-token',
    koreanJsonRating: 'medium',
    signupUrl: 'https://dash.cloudflare.com/?to=/:account/ai/workers-ai',
    recommendedPriorityRank: 9,
    envVars: ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'],
    freeTierLimits: '카드 불필요 · 매일 00:00 UTC 10,000 Neurons 무료 리셋',
    strengths: 'Google/Groq 장애와 완전히 독립된 일일 리셋형 무료 할당량 풀',
    privacyNote: 'Account ID와 Workers AI Read/Run Token 두 값이 모두 필요함',
    recommendedWorkload: '일일 리셋 할당량을 활용한 야간 요약 및 태그 정규화',
    endpoint: 'https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/run/{model}'
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Inference Router (월 무료 소액 크레딧 · 카드 불필요)',
    status: 'trial',
    signupRequired: 'free-account',
    cardRequired: false,
    authType: 'api-key',
    koreanJsonRating: 'medium',
    signupUrl: 'https://huggingface.co/settings/tokens',
    recommendedPriorityRank: 10,
    envVars: ['HF_TOKEN'],
    freeTierLimits: '카드 불필요 · 무료 계정 월 소액 크레딧(~$0.10/월, 소진 시 HTTP 402 반환)',
    strengths: 'router.huggingface.co/v1 단일 엔드포인트로 Qwen3.8 · Gemma 4 · Llama 3.1 라우팅(160종+)',
    privacyNote: '무료 월간 크레딧 소진 시 HTTP 402(Payment Required)가 발생하며 다음 달 리셋',
    recommendedWorkload: '보조 오픈소스 모델 테스트 및 여유 크레딧 소진 전 단문 폴백',
    endpoint: 'https://router.huggingface.co/v1/chat/completions'
  },
  {
    id: 'cerebras',
    name: 'Cerebras Inference (프로모션 크레딧 · 카드 필요)',
    status: 'trial',
    signupRequired: 'free-account',
    cardRequired: true,
    authType: 'api-key',
    koreanJsonRating: 'medium',
    signupUrl: 'https://cloud.cerebras.ai/',
    recommendedPriorityRank: 11,
    envVars: ['CEREBRAS_API_KEY'],
    freeTierLimits: '결제 카드 등록 필요 · 30일 $5 프로모션 크레딧 · ~5 RPM / 30K TPM',
    strengths: '웨이퍼 스케일 칩 기반 Qwen 3 및 GPT-OSS 120B 초고속 추론',
    privacyNote: '2026년 영구 무료 티어 종료로 카드 인증 크레딧 보유 시에만 보조 폴백 활용',
    recommendedWorkload: '프로모션 크레딧 보유 시 초고속 대용량 텍스트 처리 버스트',
    endpoint: 'https://api.cerebras.ai/v1/chat/completions'
  },
  {
    id: 'github-models',
    name: 'GitHub Models Inference API (2026 서비스 종료)',
    status: 'retired',
    signupRequired: 'free-account',
    cardRequired: false,
    authType: 'api-key',
    koreanJsonRating: 'experimental',
    signupUrl: 'https://github.com/marketplace/models',
    recommendedPriorityRank: 99,
    envVars: [],
    freeTierLimits: '2026년 종료됨 (구 https://models.github.ai/inference 엔드포인트 폐기)',
    strengths: '과거 GitHub PAT 기반 프로토타이핑 카탈로그',
    privacyNote: '실행 시 확정 404/타임아웃 지연을 유발하므로 라우터에서 완전 제외',
    recommendedWorkload: '사용 중단 — Pollinations · OVH · Groq · NVIDIA NIM · Cohere 등으로 대체',
    endpoint: 'https://models.github.ai/inference (Retired)'
  }
];

let pollinationsCooldownUntil = 0;
let pollinationsCooldownMessage = '';
let ovhCooldownUntil = 0;
let ovhCooldownMessage = '';
let huggingface402Until = 0;

function readSystemConfigForRouter(): Record<string, any> {
  try {
    const sysPath = path.join(DATA_DIR, 'system_config.json');
    if (fs.existsSync(sysPath)) {
      const parsed = JSON.parse(fs.readFileSync(sysPath, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (_) {}
  return {};
}

export function resolveProviderCredentials(
  provider: Exclude<ProviderId, 'gemini'>,
  override?: { customKey?: string; cloudflareAccountId?: string }
): { key: string; cloudflareAccountId?: string } {
  const sysCfg = readSystemConfigForRouter();
  const custom = (override?.customKey || '').trim();
  const validCustom = custom && !custom.includes('••••') && !custom.includes('PLACEHOLDER') ? custom : '';

  switch (provider) {
    case 'groq':
      return { key: (validCustom || process.env.GROQ_API_KEY || String(sysCfg.groqApiKey || '')).trim() };
    case 'mistral':
      return { key: (validCustom || process.env.MISTRAL_API_KEY || String(sysCfg.mistralApiKey || '')).trim() };
    case 'nvidia':
      return { key: (validCustom || process.env.NVIDIA_API_KEY || String(sysCfg.nvidiaApiKey || '')).trim() };
    case 'cohere':
      return { key: (validCustom || process.env.COHERE_API_KEY || String(sysCfg.cohereApiKey || '')).trim() };
    case 'openrouter':
      return { key: (validCustom || process.env.OPENROUTER_API_KEY || String(sysCfg.openrouterApiKey || '')).trim() };
    case 'huggingface':
      return { key: (validCustom || process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || String(sysCfg.huggingfaceApiKey || '')).trim() };
    case 'cerebras':
      return { key: (validCustom || process.env.CEREBRAS_API_KEY || String(sysCfg.cerebrasApiKey || '')).trim() };
    case 'cloudflare': {
      const overrideAcc = (override?.cloudflareAccountId || '').trim();
      const cleanAcc = overrideAcc && !overrideAcc.includes('••••') ? overrideAcc : '';
      return {
        key: (validCustom || process.env.CLOUDFLARE_API_TOKEN || String(sysCfg.cloudflareApiToken || '')).trim(),
        cloudflareAccountId: (cleanAcc || process.env.CLOUDFLARE_ACCOUNT_ID || String(sysCfg.cloudflareAccountId || '')).trim()
      };
    }
    case 'ovh':
    case 'pollinations':
    default:
      return { key: '' };
  }
}

export function sanitizePromptForKeylessEndpoint(promptText: string): string {
  const input = String(promptText || '');
  return input
    .replace(/\bAIza[0-9A-Za-z\-_]{20,}\b/g, '[REDACTED_GEMINI_KEY]')
    .replace(/\bgsk_[0-9A-Za-z_]{16,}\b/g, '[REDACTED_GROQ_KEY]')
    .replace(/\bnvapi-[0-9A-Za-z\-_]{20,}\b/g, '[REDACTED_NVIDIA_KEY]')
    .replace(/\bhf_[0-9A-Za-z]{20,}\b/g, '[REDACTED_HF_TOKEN]')
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

export function normalizeProviderOrder(rawOrder: unknown): ProviderId[] {
  const validSet = new Set<ProviderId>(['gemini', ...ALL_EXTERNAL_PROVIDER_IDS]);
  const defaultOrder = DEFAULT_AI_MODEL_REGISTRY.providerOrder;
  const incoming: ProviderId[] = Array.isArray(rawOrder)
    ? Array.from(new Set(rawOrder.filter((p: any): p is ProviderId => validSet.has(p))))
    : [...defaultOrder];

  const missing = defaultOrder.filter((p) => !incoming.includes(p));
  const combined = [...incoming, ...missing];

  const keyed = combined.filter((p) => !KEYLESS_PROVIDER_IDS.includes(p));
  const keylessInOrder = combined.filter((p) => KEYLESS_PROVIDER_IDS.includes(p));
  const finalKeyless = keylessInOrder.length > 0 ? keylessInOrder : [...KEYLESS_PROVIDER_IDS];

  return [...keyed, ...finalKeyless];
}

export function loadAiModelRegistry(): AiModelRegistry {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(REGISTRY_PATH)) {
      const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      const normalizedOrder = normalizeProviderOrder(parsed?.providerOrder);

      const mergedProviderModels: Record<Exclude<ProviderId, 'gemini'>, string[]> = {
        ...DEFAULT_AI_MODEL_REGISTRY.providerModels
      };
      if (parsed?.providerModels && typeof parsed.providerModels === 'object') {
        for (const pid of ALL_EXTERNAL_PROVIDER_IDS) {
          const list = parsed.providerModels[pid];
          if (Array.isArray(list) && list.length > 0) {
            mergedProviderModels[pid] = list.filter((m: any): m is string => typeof m === 'string' && m.trim().length > 0);
          }
        }
      }

      const merged: AiModelRegistry = {
        ...DEFAULT_AI_MODEL_REGISTRY,
        ...parsed,
        version: '3.106.15',
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
        ovhModels: Array.isArray(parsed?.ovhModels) && parsed.ovhModels.length > 0
          ? parsed.ovhModels.filter((m: any): m is string => typeof m === 'string' && m.trim().length > 0)
          : DEFAULT_AI_MODEL_REGISTRY.ovhModels,
        providerModels: mergedProviderModels,
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

function isNonChatCatalogModel(modelId: string): boolean {
  const lower = (modelId || '').toLowerCase();
  const banned = [
    'embed',
    'rerank',
    'reward',
    'parse',
    'ocr',
    'guard',
    'shield',
    'safety',
    'whisper',
    'tts',
    'audio',
    'speech',
    'transcribe',
    'stable-diffusion',
    'flux',
    'cosmos',
    'trellis',
    'nvclip',
    'deplot',
    'paligemma',
    'vila',
    'video',
    'detector',
    'pii',
    'gliner',
    'starcoder',
    'glimmer',
    '-vl-',
    '-vl:',
    'qwen3-vl',
    'super-vl'
  ];
  return banned.some((kw) => lower.includes(kw));
}

function rankModelsByPreferredKeywords(
  slugs: string[],
  preferred: string[],
  maxCount: number,
  prefixOrExact = false
): string[] {
  return slugs
    .map((id, idx) => {
      const lower = id.toLowerCase();
      const prefIdx = preferred.findIndex((kw) =>
        prefixOrExact ? (lower === kw || lower.startsWith(`${kw}-`)) : lower.includes(kw)
      );
      return { id, idx, score: prefIdx >= 0 ? prefIdx : 999 };
    })
    .sort((a, b) => (a.score !== b.score ? a.score - b.score : a.idx - b.idx))
    .slice(0, maxCount)
    .map((entry) => entry.id);
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
  ovhDiscoveredCount: number;
  nvidiaDiscoveredCount: number;
  huggingfaceDiscoveredCount: number;
  cohereDiscoveredCount: number;
  errors: string[];
}> {
  const registry = loadAiModelRegistry();
  pruneExpiredCircuitBreakers(registry);
  const errors: string[] = [];
  let geminiDiscoveredCount = 0;
  let openrouterDiscoveredCount = 0;
  let pollinationsDiscoveredCount = 0;
  let ovhDiscoveredCount = 0;
  let nvidiaDiscoveredCount = 0;
  let huggingfaceDiscoveredCount = 0;
  let cohereDiscoveredCount = 0;
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

  const cohereCred = resolveProviderCredentials('cohere').key;

  // 2. Discover free & auxiliary catalogs in parallel
  await Promise.all([
    (async () => {
      try {
        const orResp = await fetch('https://openrouter.ai/api/v1/models', {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'WindowsFixWizard-ModelSync/3.106.15' }
        });
        if (orResp.ok) {
          const json: any = await orResp.json();
          const items: any[] = Array.isArray(json?.data) ? json.data : [];
          const freeSlugs = items
            .map((item) => String(item?.id || '').trim())
            .filter((id) => id.endsWith(':free') && !id.includes('gemini-2.0') && !id.includes('gemini-1.5') && !isNonChatCatalogModel(id));
          if (freeSlugs.length > 0) {
            const preferredKeywords = ['gemma-4-26b', 'gemma-4-31b', 'gemma-4', 'deepseek', 'llama-3.3', 'mistral', 'qwen', 'gemma', 'llama-3.1'];
            const ranked = rankModelsByPreferredKeywords(freeSlugs, preferredKeywords, 12);
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
          headers: { 'User-Agent': 'WindowsFixWizard-ModelSync/3.106.15' }
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
            const preferredKeywords = ['openai-fast', 'openai', 'mistral', 'llama', 'qwen', 'deepseek'];
            const ranked = rankModelsByPreferredKeywords(uniqueNames, preferredKeywords, 8, true);
            registry.pollinationsModels = ranked;
            registry.providerModels.pollinations = ranked;
            pollinationsDiscoveredCount = uniqueNames.length;
          }
        }
      } catch (err: any) {
        errors.push(`Pollinations keyless catalog sync: ${err?.message || err}`);
      }
    })(),
    (async () => {
      try {
        const ovhResp = await fetch('https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/models', {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'WindowsFixWizard-ModelSync/3.106.15' }
        });
        if (ovhResp.ok) {
          const json: any = await ovhResp.json();
          const items: any[] = Array.isArray(json?.data) ? json.data : [];
          const chatSlugs = items
            .map((item) => String(item?.id || '').trim())
            .filter((id) => Boolean(id) && !isNonChatCatalogModel(id));
          const uniqueSlugs = Array.from(new Set(chatSlugs));
          if (uniqueSlugs.length > 0) {
            const preferred = ['meta-llama-3_3-70b', 'mistral-small-3.2', 'gemma-4', 'llama-3.1', 'deepseek-v4', 'qwen3'];
            const ranked = rankModelsByPreferredKeywords(uniqueSlugs, preferred, 10);
            registry.ovhModels = ranked;
            registry.providerModels.ovh = ranked;
            ovhDiscoveredCount = uniqueSlugs.length;
          }
        }
      } catch (err: any) {
        errors.push(`OVHcloud keyless catalog sync: ${err?.message || err}`);
      }
    })(),
    (async () => {
      try {
        const nvResp = await fetch('https://integrate.api.nvidia.com/v1/models', {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'WindowsFixWizard-ModelSync/3.106.15' }
        });
        if (nvResp.ok) {
          const json: any = await nvResp.json();
          const items: any[] = Array.isArray(json?.data) ? json.data : [];
          const chatSlugs = items
            .map((item) => String(item?.id || '').trim())
            .filter((id) => Boolean(id) && !isNonChatCatalogModel(id));
          const uniqueSlugs = Array.from(new Set(chatSlugs));
          if (uniqueSlugs.length > 0) {
            const preferred = ['gemma-4', 'llama-3.3-70b', 'mistral-large', 'deepseek', 'qwen', 'gemma-3'];
            const ranked = rankModelsByPreferredKeywords(uniqueSlugs, preferred, 10);
            registry.providerModels.nvidia = ranked;
            nvidiaDiscoveredCount = uniqueSlugs.length;
          }
        }
      } catch (err: any) {
        errors.push(`NVIDIA NIM catalog sync: ${err?.message || err}`);
      }
    })(),
    (async () => {
      try {
        const hfResp = await fetch('https://router.huggingface.co/v1/models', {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'WindowsFixWizard-ModelSync/3.106.15' }
        });
        if (hfResp.ok) {
          const json: any = await hfResp.json();
          const items: any[] = Array.isArray(json?.data) ? json.data : [];
          const chatSlugs = items
            .map((item) => String(item?.id || '').trim())
            .filter((id) => Boolean(id) && !isNonChatCatalogModel(id));
          const uniqueSlugs = Array.from(new Set(chatSlugs));
          if (uniqueSlugs.length > 0) {
            const preferred = ['gemma-4', 'llama-3.1-8b', 'llama-3.3', 'mistral-large', 'deepseek', 'qwen3'];
            const ranked = rankModelsByPreferredKeywords(uniqueSlugs, preferred, 10);
            registry.providerModels.huggingface = ranked;
            huggingfaceDiscoveredCount = uniqueSlugs.length;
          }
        }
      } catch (err: any) {
        errors.push(`Hugging Face Router catalog sync: ${err?.message || err}`);
      }
    })(),
    (async () => {
      if (!cohereCred) return;
      try {
        const cohereResp = await fetch('https://api.cohere.com/v1/models?endpoint=chat&page_size=50', {
          signal: AbortSignal.timeout(8000),
          headers: {
            Authorization: `Bearer ${cohereCred}`,
            'User-Agent': 'WindowsFixWizard-ModelSync/3.106.15'
          }
        });
        if (cohereResp.ok) {
          const json: any = await cohereResp.json();
          const items: any[] = Array.isArray(json?.models) ? json.models : [];
          const names = items
            .map((item) => String(item?.name || '').trim())
            .filter((name) => Boolean(name) && name.startsWith('command'));
          if (names.length > 0) {
            registry.providerModels.cohere = Array.from(new Set(names)).slice(0, 6);
            cohereDiscoveredCount = names.length;
          }
        }
      } catch (err: any) {
        errors.push(`Cohere v2 catalog sync: ${err?.message || err}`);
      }
    })()
  ]);

  registry.lastDiscoveryAt = nowIso;
  saveAiModelRegistry(registry);

  return {
    registry,
    geminiDiscoveredCount,
    openrouterDiscoveredCount,
    pollinationsDiscoveredCount,
    ovhDiscoveredCount,
    nvidiaDiscoveredCount,
    huggingfaceDiscoveredCount,
    cohereDiscoveredCount,
    errors
  };
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

  const hasGemini = Boolean(
    hasConfiguredGeminiKey ||
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().startsWith('AIza')) ||
    (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim().startsWith('AIza')) ||
    (process.env.CUSTOM_API_KEY && process.env.CUSTOM_API_KEY.trim().startsWith('AIza'))
  );

  const groq = resolveProviderCredentials('groq');
  const mistral = resolveProviderCredentials('mistral');
  const nvidia = resolveProviderCredentials('nvidia');
  const cohere = resolveProviderCredentials('cohere');
  const openrouter = resolveProviderCredentials('openrouter');
  const cloudflare = resolveProviderCredentials('cloudflare');
  const huggingface = resolveProviderCredentials('huggingface');
  const cerebras = resolveProviderCredentials('cerebras');

  return {
    gemini: { configured: hasGemini, envHint: 'GEMINI_API_KEY / GOOGLE_API_KEY' },
    groq: { configured: Boolean(groq.key), envHint: 'GROQ_API_KEY' },
    mistral: { configured: Boolean(mistral.key), envHint: 'MISTRAL_API_KEY' },
    nvidia: { configured: Boolean(nvidia.key), envHint: 'NVIDIA_API_KEY' },
    cohere: { configured: Boolean(cohere.key), envHint: 'COHERE_API_KEY' },
    openrouter: { configured: Boolean(openrouter.key), envHint: 'OPENROUTER_API_KEY' },
    cloudflare: {
      configured: Boolean(cloudflare.key && cloudflare.cloudflareAccountId),
      envHint: 'CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN'
    },
    huggingface: { configured: Boolean(huggingface.key), envHint: 'HF_TOKEN' },
    cerebras: { configured: Boolean(cerebras.key), envHint: 'CEREBRAS_API_KEY' },
    ovh: {
      configured: registry.keylessFallbackEnabled !== false,
      envHint: 'No API Key Required (Anonymous ~1-2 RPM)',
      keyless: true
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

function extractCohereV2Text(data: any): string {
  const content = data?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => (typeof part === 'string' ? part : part?.text || ''))
      .filter(Boolean)
      .join('');
  }
  return data?.text || '';
}

function parseNonHtmlCompletionBody(rawBody: string, contentType: string): string {
  try {
    const parsed: any = JSON.parse(rawBody);
    return String(parsed?.choices?.[0]?.message?.content || parsed?.text || '');
  } catch {
    const looksLikeHtml = contentType.includes('text/html') || /^\s*(?:<!doctype|<html|<head|<body)\b/i.test(rawBody);
    if (!looksLikeHtml) {
      return rawBody || '';
    }
    return '';
  }
}

export async function callExternalFreeProvider(
  provider: Exclude<ProviderId, 'gemini'>,
  promptText: string,
  options?: {
    customKey?: string;
    cloudflareAccountId?: string;
    maxTokens?: number;
    timeoutMs?: number;
    registry?: AiModelRegistry;
    bypassEnabledCheck?: boolean;
  }
): Promise<{ text: string; modelUsed: string; keyUsed: string; provider: ProviderId } | null> {
  const registry = options?.registry || loadAiModelRegistry();
  const timeoutMs = Math.min(Math.max(Number(options?.timeoutMs) || 18000, 6000), 45000);
  const creds = resolveProviderCredentials(provider, {
    customKey: options?.customKey,
    cloudflareAccountId: options?.cloudflareAccountId
  });

  if (provider === 'groq') {
    if (!creds.key) return null;
    const models = (registry.providerModels.groq || DEFAULT_AI_MODEL_REGISTRY.providerModels.groq)
      .filter((m) => !isCircuitOpen(registry, m));
    for (const model of models) {
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { Authorization: `Bearer ${creds.key}`, 'Content-Type': 'application/json' },
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
    if (!creds.key) return null;
    const models = (registry.providerModels.mistral || DEFAULT_AI_MODEL_REGISTRY.providerModels.mistral)
      .filter((m) => !isCircuitOpen(registry, m));
    for (const model of models) {
      try {
        const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { Authorization: `Bearer ${creds.key}`, 'Content-Type': 'application/json' },
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

  if (provider === 'nvidia') {
    if (!creds.key) return null;
    const models = (registry.providerModels.nvidia || DEFAULT_AI_MODEL_REGISTRY.providerModels.nvidia)
      .filter((m) => !isCircuitOpen(registry, `nvidia:${m}`));
    for (const model of models.slice(0, 4)) {
      try {
        const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(Math.max(timeoutMs, 22000)),
          headers: {
            Authorization: `Bearer ${creds.key}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: promptText }],
            temperature: 0.3,
            max_tokens: options?.maxTokens || 2048
          })
        });
        if (resp.ok) {
          const data: any = await resp.json();
          const text = data?.choices?.[0]?.message?.content || '';
          if (text.trim()) return { text, modelUsed: `NVIDIA NIM (${model})`, keyUsed: 'NVIDIA_API_KEY', provider: 'nvidia' };
        } else if (resp.status === 404) {
          tripCircuitBreaker(registry, `nvidia:${model}`, 'nvidia', 404, `NVIDIA NIM HTTP 404`);
        } else if (resp.status === 401 || resp.status === 403 || resp.status === 402) {
          break;
        }
      } catch (_) {}
    }
  }

  if (provider === 'cohere') {
    if (!creds.key) return null;
    const models = (registry.providerModels.cohere || DEFAULT_AI_MODEL_REGISTRY.providerModels.cohere)
      .filter((m) => !isCircuitOpen(registry, `cohere:${m}`));
    for (const model of models.slice(0, 3)) {
      try {
        const resp = await fetch('https://api.cohere.com/v2/chat', {
          method: 'POST',
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            Authorization: `Bearer ${creds.key}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
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
          const text = extractCohereV2Text(data);
          if (text.trim()) return { text, modelUsed: `Cohere (${model})`, keyUsed: 'COHERE_API_KEY', provider: 'cohere' };
        } else if (resp.status === 404) {
          tripCircuitBreaker(registry, `cohere:${model}`, 'cohere', 404, `Cohere HTTP 404`);
        } else if (resp.status === 401 || resp.status === 403 || resp.status === 429) {
          break;
        }
      } catch (_) {}
    }
  }

  if (provider === 'openrouter') {
    if (!creds.key) return null;
    const rawModels = registry.openrouterFreeModels?.length
      ? registry.openrouterFreeModels
      : registry.providerModels.openrouter;
    const models = rawModels.filter((m) => !m.includes('gemini-2.0') && !isCircuitOpen(registry, m));
    for (const model of models.slice(0, 5)) {
      try {
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            Authorization: `Bearer ${creds.key}`,
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

  if (provider === 'cloudflare') {
    const accountId = creds.cloudflareAccountId || '';
    const token = creds.key;
    if (!accountId || !token) return null;
    const models = (registry.providerModels.cloudflare || DEFAULT_AI_MODEL_REGISTRY.providerModels.cloudflare)
      .filter((m) => typeof m === 'string' && /^[@a-zA-Z0-9._/-]+$/.test(m) && !m.includes('..') && !isCircuitOpen(registry, m));
    for (const model of models) {
      try {
        const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`, {
          method: 'POST',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: promptText }],
            ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {})
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

  if (provider === 'huggingface') {
    if (!creds.key || Date.now() < huggingface402Until) return null;
    const models = (registry.providerModels.huggingface || DEFAULT_AI_MODEL_REGISTRY.providerModels.huggingface)
      .filter((m) => !isCircuitOpen(registry, `hf:${m}`));
    for (const model of models.slice(0, 4)) {
      try {
        const resp = await fetch('https://router.huggingface.co/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            Authorization: `Bearer ${creds.key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: promptText }],
            temperature: 0.3,
            max_tokens: options?.maxTokens || 2048
          })
        });
        if (resp.ok) {
          const data: any = await resp.json();
          const text = data?.choices?.[0]?.message?.content || '';
          if (text.trim()) return { text, modelUsed: `HuggingFace (${model})`, keyUsed: 'HF_TOKEN', provider: 'huggingface' };
        } else if (resp.status === 402) {
          // Monthly free credit depleted: pause HF calls for 6h so chain moves instantaneously
          huggingface402Until = Date.now() + 6 * 3600 * 1000;
          break;
        } else if (resp.status === 404) {
          tripCircuitBreaker(registry, `hf:${model}`, 'huggingface', 404, `Hugging Face Router HTTP 404`);
        } else if (resp.status === 401 || resp.status === 403) {
          break;
        }
      } catch (_) {}
    }
  }

  if (provider === 'cerebras') {
    if (!creds.key) return null;
    const models = (registry.providerModels.cerebras || DEFAULT_AI_MODEL_REGISTRY.providerModels.cerebras)
      .filter((m) => !isCircuitOpen(registry, m));
    for (const model of models) {
      try {
        const resp = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { Authorization: `Bearer ${creds.key}`, 'Content-Type': 'application/json' },
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

  if (provider === 'ovh') {
    if (!options?.bypassEnabledCheck && registry.keylessFallbackEnabled === false) {
      return null;
    }
    if (Date.now() < ovhCooldownUntil) {
      return null;
    }
    const sanitizedPrompt = sanitizePromptForKeylessEndpoint(promptText);
    const rawModels = registry.ovhModels?.length
      ? registry.ovhModels
      : (registry.providerModels.ovh || DEFAULT_AI_MODEL_REGISTRY.providerModels.ovh);
    const models = rawModels.filter((m) => !isCircuitOpen(registry, `ovh:${m}`));
    const ovhTimeoutMs = Math.min(Math.max(Number(options?.timeoutMs) || 26000, 10000), 40000);

    for (const model of models.slice(0, 3)) {
      try {
        const resp = await fetch('https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(ovhTimeoutMs),
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WindowsFixWizard-ResilienceRouter/3.106.15'
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: sanitizedPrompt }],
            temperature: 0.3,
            ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {})
          })
        });
        if (resp.ok) {
          ovhCooldownUntil = 0;
          ovhCooldownMessage = '';
          const contentType = (resp.headers.get('content-type') || '').toLowerCase();
          const rawBody = await resp.text();
          const text = parseNonHtmlCompletionBody(rawBody, contentType);
          if (text.trim()) {
            return {
              text,
              modelUsed: `OVHcloud (${model}) [Keyless]`,
              keyUsed: 'KEYLESS_NO_AUTH',
              provider: 'ovh'
            };
          }
        } else if (resp.status === 429) {
          const headerRetry = parseInt(resp.headers.get('retry-after') || '', 10);
          const waitSec = Math.min(Math.max(Number.isFinite(headerRetry) ? headerRetry : 45, 5), 90);
          ovhCooldownUntil = Date.now() + waitSec * 1000;
          ovhCooldownMessage = `OVHcloud Anonymous limit (${waitSec}s cooldown)`;
          break;
        } else if (resp.status === 404) {
          tripCircuitBreaker(registry, `ovh:${model}`, 'ovh', 404, 'OVHcloud HTTP 404', 6);
        } else {
          break;
        }
      } catch (err: any) {
        ovhCooldownMessage = err?.message || 'OVHcloud request timeout';
        break;
      }
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
    const pollTimeoutMs = Math.min(Math.max(Number(options?.timeoutMs) || 32000, 10000), 45000);

    for (const model of models.slice(0, 3)) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const remainingCooldownMs = pollinationsCooldownUntil - Date.now();
        if (remainingCooldownMs > 0) {
          if (remainingCooldownMs <= 18000 && attempt === 0) {
            await new Promise((r) => setTimeout(r, remainingCooldownMs + 500));
          } else {
            break;
          }
        }
        try {
          const resp = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            signal: AbortSignal.timeout(pollTimeoutMs),
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'WindowsFixWizard-ResilienceRouter/3.106.15'
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
            pollinationsCooldownUntil = 0;
            pollinationsCooldownMessage = '';
            const contentType = (resp.headers.get('content-type') || '').toLowerCase();
            const rawBody = await resp.text();
            const text = parseNonHtmlCompletionBody(rawBody, contentType);
            if (text.trim()) {
              return {
                text,
                modelUsed: `Pollinations (${model}) [Keyless]`,
                keyUsed: 'KEYLESS_NO_AUTH',
                provider: 'pollinations'
              };
            }
            break;
          } else if (resp.status === 402 || resp.status === 429) {
            const errBody = await resp.text().catch(() => '');
            const retryMatch = errBody.match(/retry after\s+(\d+)\s*s/i) || errBody.match(/(\d+)\s*seconds/i);
            const headerRetry = parseInt(resp.headers.get('retry-after') || '', 10);
            const waitSec = Math.min(
              Math.max(retryMatch ? parseInt(retryMatch[1], 10) : (Number.isFinite(headerRetry) ? headerRetry : 20), 2),
              60
            );
            pollinationsCooldownUntil = Date.now() + waitSec * 1000;
            pollinationsCooldownMessage = `Pollinations FREE_LIMIT (${waitSec}s cooldown)`;
            if (waitSec <= 18 && attempt === 0) {
              await new Promise((r) => setTimeout(r, (waitSec + 1) * 1000));
              continue;
            }
            break;
          } else if (resp.status === 404) {
            tripCircuitBreaker(registry, `pollinations:${model}`, 'pollinations', 404, 'Pollinations HTTP 404', 6);
            break;
          } else {
            break;
          }
        } catch (err: any) {
          pollinationsCooldownMessage = err?.message || 'Pollinations request timeout';
          break;
        }
      }
    }
  }

  return null;
}

export async function probeExternalProvider(params: {
  provider: Exclude<ProviderId, 'gemini'>;
  customKey?: string;
  cloudflareAccountId?: string;
  promptText: string;
  maxTokens?: number;
}): Promise<{
  isValid: boolean;
  provider: Exclude<ProviderId, 'gemini'>;
  modelUsed?: string;
  text?: string;
  latencyMs: number;
  httpStatus?: number;
  reason?: string;
}> {
  const started = Date.now();
  const { provider, promptText, maxTokens = 240 } = params;
  const registry = loadAiModelRegistry();
  const isKeyless = KEYLESS_PROVIDER_IDS.includes(provider);
  const creds = resolveProviderCredentials(provider, {
    customKey: params.customKey,
    cloudflareAccountId: params.cloudflareAccountId
  });

  if (!isKeyless) {
    if (provider === 'cloudflare' && (!creds.key || !creds.cloudflareAccountId)) {
      return {
        isValid: false,
        provider,
        latencyMs: Date.now() - started,
        reason: 'Cloudflare Account ID와 Workers AI API Token을 모두 입력하거나 서버 환경변수에 설정해 주세요.'
      };
    }
    if (provider !== 'cloudflare' && !creds.key) {
      return {
        isValid: false,
        provider,
        latencyMs: Date.now() - started,
        reason: `${provider.toUpperCase()} API 키가 입력되지 않았으며 서버 저장소에도 설정되어 있지 않습니다.`
      };
    }
  }

  const models = provider === 'openrouter'
    ? (registry.openrouterFreeModels?.length ? registry.openrouterFreeModels : registry.providerModels.openrouter)
    : provider === 'ovh'
      ? (registry.ovhModels?.length ? registry.ovhModels : registry.providerModels.ovh)
      : provider === 'pollinations'
        ? (registry.pollinationsModels?.length ? registry.pollinationsModels : registry.providerModels.pollinations)
        : (registry.providerModels?.[provider] || DEFAULT_AI_MODEL_REGISTRY.providerModels[provider]);
  const primaryModel = models[0] || DEFAULT_AI_MODEL_REGISTRY.providerModels[provider][0];

  const sanitizeForKeyless = isKeyless ? sanitizePromptForKeylessEndpoint(promptText) : promptText;

  try {
    let resp: Response;
    if (provider === 'cohere') {
      resp = await fetch('https://api.cohere.com/v2/chat', {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: `Bearer ${creds.key}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          model: primaryModel,
          messages: [{ role: 'user', content: sanitizeForKeyless }],
          temperature: 0.2,
          max_tokens: maxTokens
        })
      });
    } else if (provider === 'cloudflare') {
      resp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(creds.cloudflareAccountId || '')}/ai/run/${primaryModel}`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(20000),
          headers: { Authorization: `Bearer ${creds.key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: sanitizeForKeyless }],
            max_tokens: maxTokens
          })
        }
      );
    } else {
      const endpointMap: Record<string, { url: string; headers: Record<string, string>; extraBody?: Record<string, any> }> = {
        groq: {
          url: 'https://api.groq.com/openai/v1/chat/completions',
          headers: { Authorization: `Bearer ${creds.key}` }
        },
        mistral: {
          url: 'https://api.mistral.ai/v1/chat/completions',
          headers: { Authorization: `Bearer ${creds.key}` }
        },
        nvidia: {
          url: 'https://integrate.api.nvidia.com/v1/chat/completions',
          headers: { Authorization: `Bearer ${creds.key}`, Accept: 'application/json' }
        },
        openrouter: {
          url: 'https://openrouter.ai/api/v1/chat/completions',
          headers: {
            Authorization: `Bearer ${creds.key}`,
            'HTTP-Referer': 'https://windows-fix-wizard.github.io',
            'X-Title': 'Windows Fix Wizard'
          }
        },
        huggingface: {
          url: 'https://router.huggingface.co/v1/chat/completions',
          headers: { Authorization: `Bearer ${creds.key}` }
        },
        cerebras: {
          url: 'https://api.cerebras.ai/v1/chat/completions',
          headers: { Authorization: `Bearer ${creds.key}` }
        },
        ovh: {
          url: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions',
          headers: { 'User-Agent': 'WindowsFixWizard-Probe/3.106.15' }
        },
        pollinations: {
          url: 'https://text.pollinations.ai/openai',
          headers: { 'User-Agent': 'WindowsFixWizard-Probe/3.106.15' },
          extraBody: { private: true }
        }
      };

      const targetSpec = endpointMap[provider];
      resp = await fetch(targetSpec.url, {
        method: 'POST',
        signal: AbortSignal.timeout(isKeyless ? 28000 : 20000),
        headers: {
          'Content-Type': 'application/json',
          ...targetSpec.headers
        },
        body: JSON.stringify({
          model: primaryModel,
          messages: [{ role: 'user', content: sanitizeForKeyless }],
          temperature: 0.2,
          max_tokens: maxTokens,
          ...(targetSpec.extraBody || {})
        })
      });
    }

    const latencyMs = Date.now() - started;
    const rawBody = await resp.text().catch(() => '');

    if (resp.ok) {
      let text = '';
      if (provider === 'cohere') {
        const parsed = JSON.parse(rawBody);
        text = extractCohereV2Text(parsed);
      } else if (provider === 'cloudflare') {
        const parsed = JSON.parse(rawBody);
        text = String(parsed?.result?.response || parsed?.result?.choices?.[0]?.message?.content || '');
      } else {
        text = parseNonHtmlCompletionBody(rawBody, (resp.headers.get('content-type') || '').toLowerCase());
      }
      if (!text.trim()) {
        return {
          isValid: false,
          provider,
          modelUsed: `${provider} (${primaryModel})`,
          latencyMs,
          httpStatus: resp.status,
          reason: '엔드포인트가 빈 응답을 반환했습니다.'
        };
      }
      return {
        isValid: true,
        provider,
        modelUsed: `${provider} (${primaryModel})`,
        text,
        latencyMs,
        httpStatus: resp.status
      };
    }

    if (resp.status === 401 || resp.status === 403) {
      return {
        isValid: false,
        provider,
        latencyMs,
        httpStatus: resp.status,
        reason: `인증 실패 (HTTP ${resp.status}): API 키 또는 권한을 확인해 주세요.`
      };
    }
    if (resp.status === 402) {
      return {
        isValid: false,
        provider,
        latencyMs,
        httpStatus: 402,
        reason: provider === 'huggingface'
          ? 'Hugging Face 무료 월간 크레딧이 소진되었습니다 (HTTP 402 Payment Required). 다음 달 크레딧 리셋을 기다리거나 다른 무료 키(Groq·NVIDIA·Cohere)를 사용하세요.'
          : `무료 크레딧 소진 (HTTP 402): ${rawBody.substring(0, 120)}`
      };
    }
    if (resp.status === 429) {
      const retryAfter = resp.headers.get('retry-after');
      return {
        isValid: false,
        provider,
        latencyMs,
        httpStatus: 429,
        reason: `호출 속도 제한 (HTTP 429${retryAfter ? ` · ${retryAfter}s 후 재시도` : ''}): 잠시 후 다시 시도하세요.`
      };
    }

    return {
      isValid: false,
      provider,
      latencyMs,
      httpStatus: resp.status,
      reason: `HTTP ${resp.status}: ${rawBody.substring(0, 140) || resp.statusText}`
    };
  } catch (err: any) {
    return {
      isValid: false,
      provider,
      latencyMs: Date.now() - started,
      reason: `연결 오류 또는 시간 초과: ${err?.message || err}`
    };
  }
}

export function getPollinationsRateLimitStatus(): {
  inCooldown: boolean;
  remainingSeconds: number;
  message: string;
} {
  const remainingMs = pollinationsCooldownUntil - Date.now();
  if (remainingMs > 0) {
    return {
      inCooldown: true,
      remainingSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
      message: pollinationsCooldownMessage || 'Pollinations rate limit active'
    };
  }
  return { inCooldown: false, remainingSeconds: 0, message: '' };
}

export function getKeylessRateLimitStatus(): {
  inCooldown: boolean;
  remainingSeconds: number;
  message: string;
  pollinations: { inCooldown: boolean; remainingSeconds: number; message: string };
  ovh: { inCooldown: boolean; remainingSeconds: number; message: string };
} {
  const poll = getPollinationsRateLimitStatus();
  const ovhRemMs = ovhCooldownUntil - Date.now();
  const ovh = ovhRemMs > 0
    ? { inCooldown: true, remainingSeconds: Math.max(1, Math.ceil(ovhRemMs / 1000)), message: ovhCooldownMessage || 'OVHcloud rate limit active' }
    : { inCooldown: false, remainingSeconds: 0, message: '' };
  const bothCooling = poll.inCooldown && ovh.inCooldown;
  return {
    inCooldown: bothCooling,
    remainingSeconds: bothCooling ? Math.min(poll.remainingSeconds, ovh.remainingSeconds) : 0,
    message: bothCooling ? `${ovh.message} / ${poll.message}` : '',
    pollinations: poll,
    ovh
  };
}

export function recordRegistryUsage(provider: ProviderId, modelUsed: string, wasFailover = false): void {
  try {
    const registry = loadAiModelRegistry();
    registry.telemetry.totalRequests = (registry.telemetry.totalRequests || 0) + 1;
    if (provider === 'gemini') {
      registry.telemetry.geminiRequests = (registry.telemetry.geminiRequests || 0) + 1;
    } else {
      registry.telemetry.freeProviderRequests = (registry.telemetry.freeProviderRequests || 0) + 1;
      if (KEYLESS_PROVIDER_IDS.includes(provider)) {
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
