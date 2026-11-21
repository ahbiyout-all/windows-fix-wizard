import React, { useMemo, useState } from 'react';
import {
  Search,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Trash2,
  Play,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

export type ExplorerProviderId =
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

export interface StrategyCatalogItem {
  id: ExplorerProviderId | 'github-models' | 'ovh-anonymous';
  name: string;
  status: 'active' | 'keyless' | 'trial' | 'retired';
  signupRequired?: 'none' | 'free-account';
  cardRequired?: boolean;
  authType?: 'keyless' | 'api-key' | 'account-token';
  koreanJsonRating?: 'high' | 'medium' | 'experimental';
  signupUrl?: string;
  recommendedPriorityRank?: number;
  envVars: string[];
  freeTierLimits: string;
  strengths: string;
  privacyNote: string;
  recommendedWorkload: string;
  endpoint: string;
}

export interface ServerKeyPresence {
  hasGroqKey?: boolean;
  hasMistralKey?: boolean;
  hasNvidiaKey?: boolean;
  hasCohereKey?: boolean;
  hasOpenrouterKey?: boolean;
  hasCloudflareAccountId?: boolean;
  hasCloudflareToken?: boolean;
  hasHuggingfaceKey?: boolean;
  hasCerebrasKey?: boolean;
}

export interface ProbeTestResult {
  success?: boolean;
  isValid?: boolean;
  jsonValid?: boolean;
  provider?: string;
  mode?: 'ping' | 'korean-json';
  modelUsed?: string;
  latencyMs?: number;
  preview?: string;
  message?: string;
  reason?: string;
  error?: string;
  httpStatus?: number;
}

interface FreeAiExplorerTabProps {
  language: 'ko' | 'en';
  isStaticHost: boolean;
  strategyCatalog: StrategyCatalogItem[];
  readiness: Record<string, { configured: boolean; envHint: string; keyless?: boolean }> | undefined;
  providerModels: Record<string, string[]> | undefined;
  openrouterFreeModels?: string[];
  pollinationsModels?: string[];
  ovhModels?: string[];
  testingProviderKey: string | null;
  probeResult: ProbeTestResult | null;
  onProbeProvider: (provider: ExplorerProviderId, mode: 'ping' | 'korean-json') => void;
  onJumpToKeyPanel: () => void;
  onClearProbeResult: () => void;
}

type TierFilter = 'all' | 'keyless' | 'no-card' | 'trial';

export const FreeAiExplorerTab: React.FC<FreeAiExplorerTabProps> = ({
  language,
  isStaticHost,
  strategyCatalog,
  readiness,
  providerModels,
  openrouterFreeModels,
  pollinationsModels,
  ovhModels,
  testingProviderKey,
  probeResult,
  onProbeProvider,
  onJumpToKeyPanel,
  onClearProbeResult
}) => {
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [koreanHighOnly, setKoreanHighOnly] = useState(false);

  const sortedCatalog = useMemo(() => {
    return [...strategyCatalog].sort((a, b) => {
      const rankA = a.recommendedPriorityRank ?? (a.status === 'retired' ? 99 : 50);
      const rankB = b.recommendedPriorityRank ?? (b.status === 'retired' ? 99 : 50);
      return rankA - rankB;
    });
  }, [strategyCatalog]);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedCatalog.filter((item) => {
      if (tierFilter === 'keyless') {
        if (item.signupRequired !== 'none' && item.status !== 'keyless') return false;
      } else if (tierFilter === 'no-card') {
        if (item.status === 'retired' || item.cardRequired === true) return false;
      } else if (tierFilter === 'trial') {
        if (item.status !== 'trial' && item.status !== 'retired') return false;
      }
      if (koreanHighOnly && item.koreanJsonRating !== 'high') {
        return false;
      }
      if (!q) return true;
      const models = (
        item.id === 'openrouter'
          ? (openrouterFreeModels || providerModels?.openrouter || [])
          : item.id === 'pollinations'
            ? (pollinationsModels || providerModels?.pollinations || [])
            : item.id === 'ovh'
              ? (ovhModels || providerModels?.ovh || [])
              : (providerModels?.[item.id] || [])
      ).join(' ').toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.freeTierLimits.toLowerCase().includes(q) ||
        item.strengths.toLowerCase().includes(q) ||
        item.envVars.join(' ').toLowerCase().includes(q) ||
        models.includes(q)
      );
    });
  }, [sortedCatalog, tierFilter, koreanHighOnly, searchQuery, providerModels, openrouterFreeModels, pollinationsModels, ovhModels]);

  const counts = useMemo(() => {
    const activeNonRetired = sortedCatalog.filter((i) => i.status !== 'retired');
    const keylessCount = activeNonRetired.filter((i) => i.status === 'keyless' || i.signupRequired === 'none').length;
    const noCardKeyedCount = activeNonRetired.filter((i) => i.status !== 'keyless' && i.signupRequired !== 'none' && i.cardRequired !== true).length;
    const readyCount = Object.values(readiness || {}).filter((r: { configured?: boolean } | undefined) => Boolean(r?.configured)).length;
    return {
      total: activeNonRetired.length,
      keyless: keylessCount,
      noCardKeyed: noCardKeyedCount,
      ready: readyCount
    };
  }, [sortedCatalog, readiness]);

  const resetFilters = () => {
    setTierFilter('all');
    setSearchQuery('');
    setKoreanHighOnly(false);
  };

  return (
    <div className="space-y-5">
      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {language === 'en' ? 'Free/Trial Providers' : '연동 가능 무료 AI'}
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {counts.total}종
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">2026 실시간 검증 기준</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {language === 'en' ? 'Zero-Signup Keyless' : '무가입·무키 (Keyless)'}
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {counts.keyless}종
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Pollinations · OVHcloud</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {language === 'en' ? 'No-Card Free API Keys' : '카드 불필요 무료 키'}
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {counts.noCardKeyed}종
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">NVIDIA · Cohere · Groq 등</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {language === 'en' ? 'Ready on Server' : '현재 서버 가용'}
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {counts.ready} / {Object.keys(readiness || {}).length || counts.total}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">즉시 폴백 투입 가능</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all' as const, label: '전체 (무가입 우선)' },
            { id: 'keyless' as const, label: '무가입·무키 (Keyless)' },
            { id: 'no-card' as const, label: '카드 불필요 무료' },
            { id: 'trial' as const, label: '체험·제한형 / 종료' }
          ].map((f) => {
            const active = tierFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setTierFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            );
          })}
          <label className="ml-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={koreanHighOnly}
              onChange={(e) => setKoreanHighOnly(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-indigo-600"
            />
            <span>한국어 JSON 우수</span>
          </label>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="모델명·프로바이더·환경변수 검색..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Inline Probe Feedback Banner */}
      {probeResult && (
        <div className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-2 ${
          probeResult.success || probeResult.isValid
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 font-semibold">
              {probeResult.success || probeResult.isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span className="font-mono uppercase">{probeResult.provider || 'PROBE'}</span>
              <span>· {probeResult.message || probeResult.reason || probeResult.error}</span>
            </div>
            {probeResult.preview && (
              <div className="font-mono text-[11px] bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-300 overflow-x-auto">
                {probeResult.preview}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClearProbeResult}
            className="text-[11px] font-semibold opacity-70 hover:opacity-100 shrink-0 cursor-pointer"
          >
            닫기
          </button>
        </div>
      )}

      {/* Provider Catalog List */}
      {filteredCatalog.length === 0 ? (
        <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            선택한 조건 또는 검색어(<span className="font-mono">{searchQuery || tierFilter}</span>)와 일치하는 무료 AI 모델 제공사가 없습니다.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>전체 무료 모델 보기</span>
          </button>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-900">
          {filteredCatalog.map((item) => {
            const isRetired = item.status === 'retired';
            const isKeyless = item.status === 'keyless' || item.signupRequired === 'none';
            const readyInfo = item.id !== 'github-models' && item.id !== 'ovh-anonymous' ? readiness?.[item.id] : undefined;
            const liveModels = item.id === 'openrouter'
              ? (openrouterFreeModels || providerModels?.openrouter || [])
              : item.id === 'pollinations'
                ? (pollinationsModels || providerModels?.pollinations || [])
                : item.id === 'ovh'
                  ? (ovhModels || providerModels?.ovh || [])
                  : (providerModels?.[item.id] || []);

            const isProbingPing = testingProviderKey === `${item.id}:ping`;
            const isProbingJson = testingProviderKey === `${item.id}:korean-json`;

            return (
              <div key={item.id} className={`p-4 space-y-2.5 ${isRetired ? 'bg-slate-50/70 dark:bg-slate-900/50 opacity-75' : ''}`}>
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.name}
                      </span>
                      <span className={`text-[11px] font-mono font-semibold ${
                        isRetired
                          ? 'text-rose-600 dark:text-rose-400'
                          : isKeyless
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : item.cardRequired
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        · {isRetired
                          ? '2026 종료'
                          : isKeyless
                            ? '무가입·무키'
                            : item.cardRequired
                              ? '카드 인증 필요'
                              : '카드 불필요 무료 키'}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        · 한국어 JSON: {item.koreanJsonRating === 'high' ? '우수' : item.koreanJsonRating === 'medium' ? '양호' : '실험적'}
                      </span>
                      {readyInfo && (
                        <span className={`text-[11px] font-semibold tabular-nums ${
                          readyInfo.configured
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          · {readyInfo.configured ? '서버 가용 (연동 완료)' : '키 미등록'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{item.freeTierLimits}</span>
                      {' — '}
                      {item.strengths}
                    </p>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>권장: {item.recommendedWorkload}</span>
                      <span>· 주의: {item.privacyNote}</span>
                      {item.envVars.length > 0 && (
                        <span className="font-mono text-slate-600 dark:text-slate-300">
                          · Env: {item.envVars.join(' / ')}
                        </span>
                      )}
                    </div>

                    {liveModels.length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-0.5">
                          Models:
                        </span>
                        {liveModels.slice(0, 5).map((slug) => (
                          <code
                            key={slug}
                            className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            {slug}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {item.signupUrl && !isRetired && (
                      <a
                        href={item.signupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>{isKeyless ? '엔드포인트 안내' : '무료 키 발급'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {!isRetired && item.id !== 'gemini' && item.id !== 'github-models' && item.id !== 'ovh-anonymous' && (
                      <>
                        <button
                          type="button"
                          disabled={isStaticHost || Boolean(testingProviderKey)}
                          onClick={() => onProbeProvider(item.id as ExplorerProviderId, 'ping')}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                        >
                          {isProbingPing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                          <span>Ping 테스트</span>
                        </button>
                        <button
                          type="button"
                          disabled={isStaticHost || Boolean(testingProviderKey)}
                          onClick={() => onProbeProvider(item.id as ExplorerProviderId, 'korean-json')}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                        >
                          {isProbingJson ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                          <span>한국어 JSON 테스트</span>
                        </button>
                      </>
                    )}
                    {!isRetired && !isKeyless && item.id !== 'gemini' && (
                      <button
                        type="button"
                        onClick={onJumpToKeyPanel}
                        className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Key className="w-3 h-3" />
                        <span>키 등록하기</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Research & Selection Policy Note */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
          2026 무가입·카드 불필요 무료 AI 모델 선별 기준 및 안전 실행 원칙
        </h4>
        <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed list-disc pl-4">
          <li>
            <strong>최우선 추천 — 무가입·무키 2중 안전망 (Pollinations.ai + OVHcloud 익명 티어)</strong>: 회원가입과 API 키가 전혀 없는 초기 상태에서도 즉시 동작하며, 실행 순서에서는 등록된 무료 키(Groq · Mistral · NVIDIA NIM · Cohere · OpenRouter) 소진 뒤 최후 폴백으로 실행되어 2~3 RPM 병목을 피합니다.
          </li>
          <li>
            <strong>2026 무료 키 티어 주의사항</strong>: Hugging Face Router는 무료 계정 월 소액 크레딧(~$0.10/월) 소진 시 HTTP <code className="font-mono">402</code>를 반환하며, Cohere Trial 키는 비상업 평가용 월 1,000건·20 RPM 상한이 적용됩니다.
          </li>
          <li>
            <strong>제외 기준</strong>: GitHub Models는 2026년 엔드포인트(<code className="font-mono">models.github.ai</code>) 종료로 제거했으며, Duck.ai/g4f 비공식 프록시는 캡차·차단 위험으로 제외했습니다.
          </li>
        </ul>
      </div>
    </div>
  );
};

interface SecondaryFreeAiKeysPanelProps {
  language: 'ko' | 'en';
  isStaticHost: boolean;
  readiness: Record<string, { configured: boolean; envHint: string; keyless?: boolean }> | undefined;
  serverKeyPresence: ServerKeyPresence;
  onSaveProviderKey: (payload: Record<string, string>, label: string) => Promise<void>;
  onTestProvider: (params: {
    provider: Exclude<ExplorerProviderId, 'gemini'>;
    key?: string;
    cloudflareAccountId?: string;
    mode: 'ping' | 'korean-json';
  }) => Promise<void>;
  testingKeyId: string | null;
  testResult: ProbeTestResult | null;
}

interface ProviderKeyRowMeta {
  id: Exclude<ExplorerProviderId, 'gemini' | 'ovh' | 'pollinations'>;
  name: string;
  configField: keyof ServerKeyPresence extends never ? string : string;
  presenceKey: keyof ServerKeyPresence;
  envName: string;
  placeholder: string;
  freeTierSummary: string;
  signupUrl: string;
  cardRequired: boolean;
}

const PROVIDER_KEY_ROWS: ProviderKeyRowMeta[] = [
  {
    id: 'groq',
    name: 'Groq LPU Inference',
    configField: 'groqApiKey',
    presenceKey: 'hasGroqKey',
    envName: 'GROQ_API_KEY',
    placeholder: 'gsk_...',
    freeTierSummary: '카드 불필요 · ~30 RPM · 일 1,000~14,400건 (Llama 3.3 70B)',
    signupUrl: 'https://console.groq.com/keys',
    cardRequired: false
  },
  {
    id: 'mistral',
    name: 'Mistral AI (Free Mode)',
    configField: 'mistralApiKey',
    presenceKey: 'hasMistralKey',
    envName: 'MISTRAL_API_KEY',
    placeholder: 'Mistral API Key...',
    freeTierSummary: '카드 불필요 · Free Mode 활성화 · JSON 구조화 강점',
    signupUrl: 'https://console.mistral.ai/api-keys',
    cardRequired: false
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM (Build Free Credits)',
    configField: 'nvidiaApiKey',
    presenceKey: 'hasNvidiaKey',
    envName: 'NVIDIA_API_KEY',
    placeholder: 'nvapi-...',
    freeTierSummary: '카드 불필요 · 가입 즉시 무료 크레딧 · Gemma 4 / Llama 3.3 / Mistral Large',
    signupUrl: 'https://build.nvidia.com/explore/discover',
    cardRequired: false
  },
  {
    id: 'cohere',
    name: 'Cohere Command v2 (Trial)',
    configField: 'cohereApiKey',
    presenceKey: 'hasCohereKey',
    envName: 'COHERE_API_KEY',
    placeholder: 'Cohere Trial Key...',
    freeTierSummary: '카드 불필요 · 20 RPM · 월 1,000건(비상업 평가용) · 한국어 우수',
    signupUrl: 'https://dashboard.cohere.com/api-keys',
    cardRequired: false
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (:free Pool)',
    configField: 'openrouterApiKey',
    presenceKey: 'hasOpenrouterKey',
    envName: 'OPENROUTER_API_KEY',
    placeholder: 'sk-or-v1-...',
    freeTierSummary: '카드 불필요 · 20 RPM · 일 50회(:free 순환 모델)',
    signupUrl: 'https://openrouter.ai/keys',
    cardRequired: false
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Inference Router',
    configField: 'huggingfaceApiKey',
    presenceKey: 'hasHuggingfaceKey',
    envName: 'HF_TOKEN',
    placeholder: 'hf_...',
    freeTierSummary: '카드 불필요 · 월 소액 무료 크레딧 (~$0.10/월 · 소진 시 HTTP 402)',
    signupUrl: 'https://huggingface.co/settings/tokens',
    cardRequired: false
  },
  {
    id: 'cerebras',
    name: 'Cerebras Inference',
    configField: 'cerebrasApiKey',
    presenceKey: 'hasCerebrasKey',
    envName: 'CEREBRAS_API_KEY',
    placeholder: 'csk-...',
    freeTierSummary: '카드 인증 필요 · 30일 $5 프로모션 크레딧 · Qwen 3 / GPT-OSS',
    signupUrl: 'https://cloud.cerebras.ai/',
    cardRequired: true
  }
];

export const SecondaryFreeAiKeysPanel: React.FC<SecondaryFreeAiKeysPanelProps> = ({
  language,
  isStaticHost,
  readiness,
  serverKeyPresence,
  onSaveProviderKey,
  onTestProvider,
  testingKeyId,
  testResult
}) => {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [cfAccountInput, setCfAccountInput] = useState('');
  const [cfTokenInput, setCfTokenInput] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSaveSingle = async (row: ProviderKeyRowMeta) => {
    const val = (inputs[row.id] || '').trim();
    if (!val || val.includes('••••')) return;
    setSavingId(row.id);
    try {
      await onSaveProviderKey({ [row.configField]: val }, row.name);
      setInputs((prev) => ({ ...prev, [row.id]: '' }));
    } finally {
      setSavingId(null);
    }
  };

  const handleClearSingle = async (row: ProviderKeyRowMeta) => {
    setSavingId(`${row.id}:clear`);
    try {
      await onSaveProviderKey({ [row.configField]: '' }, `${row.name} (저장 키 삭제)`);
      setInputs((prev) => ({ ...prev, [row.id]: '' }));
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveCloudflare = async () => {
    const payload: Record<string, string> = {};
    if (cfAccountInput.trim() && !cfAccountInput.includes('••••')) {
      payload.cloudflareAccountId = cfAccountInput.trim();
    }
    if (cfTokenInput.trim() && !cfTokenInput.includes('••••')) {
      payload.cloudflareApiToken = cfTokenInput.trim();
    }
    if (Object.keys(payload).length === 0) return;
    setSavingId('cloudflare');
    try {
      await onSaveProviderKey(payload, 'Cloudflare Workers AI');
      setCfAccountInput('');
      setCfTokenInput('');
    } finally {
      setSavingId(null);
    }
  };

  const handleClearCloudflare = async () => {
    setSavingId('cloudflare:clear');
    try {
      await onSaveProviderKey(
        { cloudflareAccountId: '', cloudflareApiToken: '' },
        'Cloudflare Workers AI (저장 키 삭제)'
      );
      setCfAccountInput('');
      setCfTokenInput('');
    } finally {
      setSavingId(null);
    }
  };

  const isCfConfigured = Boolean(
    readiness?.cloudflare?.configured ||
    (serverKeyPresence.hasCloudflareAccountId && serverKeyPresence.hasCloudflareToken)
  );
  const isCfSavedInConfig = Boolean(serverKeyPresence.hasCloudflareAccountId || serverKeyPresence.hasCloudflareToken);

  return (
    <div id="secondary-free-ai-keys-panel" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'en'
                ? 'Auxiliary Free AI API Keys & Live Probe (Server-Only Storage)'
                : '보조 무료 AI API 키 관리 및 실시간 연결·한국어 JSON 검증'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              보안을 위해 보조 API 키는 브라우저(<code className="font-mono">localStorage</code>)에 저장하지 않으며 서버 설정에만 마스킹 보관됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Keyless Zero-Signup Probe Strip */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
            무가입·무키 즉시 테스트 (Keyless Fallback)
            <span className="text-indigo-600 dark:text-indigo-400 font-normal"> · API 키 발급 전에도 즉시 동작 검증 가능</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Pollinations.ai와 OVHcloud AI Endpoints(익명 ~1-2 RPM)를 실시간으로 호출해 연결 속도(ms)와 한국어 Windows JSON 생성을 점검합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {(['pollinations', 'ovh'] as const).map((kp) => (
            <button
              key={kp}
              type="button"
              disabled={isStaticHost || Boolean(testingKeyId)}
              onClick={() => onTestProvider({ provider: kp, mode: 'korean-json' })}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              {testingKeyId === `${kp}:korean-json` ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>{kp === 'pollinations' ? 'Pollinations JSON 테스트' : 'OVHcloud JSON 테스트'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Inline Test Result Banner */}
      {testResult && (
        <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
          testResult.isValid
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
        }`}>
          <div className="flex flex-wrap items-center gap-2 font-semibold">
            {testResult.isValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-mono uppercase">[{testResult.provider}]</span>
            <span>{testResult.message || testResult.reason || testResult.error}</span>
            {typeof testResult.latencyMs === 'number' && (
              <span className="font-mono text-[11px] opacity-80 tabular-nums">({testResult.latencyMs}ms)</span>
            )}
          </div>
          {testResult.preview && (
            <pre className="font-mono text-[11px] bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-slate-700 dark:text-slate-300 overflow-x-auto">
              {testResult.preview}
            </pre>
          )}
        </div>
      )}

      {/* Keyed Providers List */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
        {PROVIDER_KEY_ROWS.map((row) => {
          const isSavedOnServer = Boolean(serverKeyPresence[row.presenceKey]);
          const isReady = Boolean(readiness?.[row.id]?.configured || isSavedOnServer);
          const inputVal = inputs[row.id] || '';
          const canTestExistingOrNew = Boolean(inputVal.trim() || isReady);

          return (
            <div key={row.id} className="p-4 space-y-2.5 bg-white dark:bg-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{row.name}</span>
                    <span className={`text-[11px] font-semibold ${isReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      · {isReady ? (isSavedOnServer ? '서버 키 저장됨' : '환경변수(Env) 감지됨') : '미설정'}
                    </span>
                    <span className={`text-[11px] ${row.cardRequired ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      · {row.freeTierSummary}
                    </span>
                  </div>
                </div>
                <a
                  href={row.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <span>무료 키 발급</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={inputVal}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [row.id]: e.target.value }))}
                  placeholder={isSavedOnServer ? `서버에 보관됨 (교체하려면 새 ${row.envName} 입력)` : row.placeholder}
                  className="flex-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isStaticHost || !canTestExistingOrNew || Boolean(testingKeyId)}
                    onClick={() => onTestProvider({ provider: row.id, key: inputVal.trim() || undefined, mode: 'ping' })}
                    className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                  >
                    {testingKeyId === `${row.id}:ping` ? '테스트...' : 'Ping'}
                  </button>
                  <button
                    type="button"
                    disabled={isStaticHost || !canTestExistingOrNew || Boolean(testingKeyId)}
                    onClick={() => onTestProvider({ provider: row.id, key: inputVal.trim() || undefined, mode: 'korean-json' })}
                    className="px-2.5 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-semibold text-indigo-700 dark:text-indigo-300 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                  >
                    {testingKeyId === `${row.id}:korean-json` ? '검증중...' : 'JSON 검증'}
                  </button>
                  <button
                    type="button"
                    disabled={isStaticHost || !inputVal.trim() || Boolean(savingId)}
                    onClick={() => handleSaveSingle(row)}
                    className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingId === row.id ? '저장...' : '저장'}</span>
                  </button>
                  {isSavedOnServer && (
                    <button
                      type="button"
                      disabled={isStaticHost || Boolean(savingId)}
                      onClick={() => handleClearSingle(row)}
                      title="서버에 저장된 키 삭제"
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Cloudflare Workers AI (Dual Input: Account ID + API Token) */}
        <div className="p-4 space-y-2.5 bg-white dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Cloudflare Workers AI</span>
                <span className={`text-[11px] font-semibold ${isCfConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  · {isCfConfigured ? (isCfSavedInConfig ? '서버 키 저장됨' : '환경변수(Env) 감지됨') : '미설정'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  · 카드 불필요 · 매일 10,000 Neurons 무료 리셋 (Account ID + API Token 필요)
                </span>
              </div>
            </div>
            <a
              href="https://dash.cloudflare.com/?to=/:account/ai/workers-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>Workers AI 토큰 발급</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex flex-col lg:flex-row gap-2">
            <input
              type="password"
              autoComplete="off"
              value={cfAccountInput}
              onChange={(e) => setCfAccountInput(e.target.value)}
              placeholder={serverKeyPresence.hasCloudflareAccountId ? 'Account ID 서버 저장됨 (교체 시 입력)' : 'CLOUDFLARE_ACCOUNT_ID'}
              className="flex-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={cfTokenInput}
              onChange={(e) => setCfTokenInput(e.target.value)}
              placeholder={serverKeyPresence.hasCloudflareToken ? 'API Token 서버 저장됨 (교체 시 입력)' : 'CLOUDFLARE_API_TOKEN'}
              className="flex-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={isStaticHost || (!isCfConfigured && (!cfAccountInput.trim() || !cfTokenInput.trim())) || Boolean(testingKeyId)}
                onClick={() => onTestProvider({
                  provider: 'cloudflare',
                  key: cfTokenInput.trim() || undefined,
                  cloudflareAccountId: cfAccountInput.trim() || undefined,
                  mode: 'ping'
                })}
                className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-40 whitespace-nowrap"
              >
                {testingKeyId === 'cloudflare:ping' ? '테스트...' : 'Ping'}
              </button>
              <button
                type="button"
                disabled={isStaticHost || (!isCfConfigured && (!cfAccountInput.trim() || !cfTokenInput.trim())) || Boolean(testingKeyId)}
                onClick={() => onTestProvider({
                  provider: 'cloudflare',
                  key: cfTokenInput.trim() || undefined,
                  cloudflareAccountId: cfAccountInput.trim() || undefined,
                  mode: 'korean-json'
                })}
                className="px-2.5 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-semibold text-indigo-700 dark:text-indigo-300 cursor-pointer disabled:opacity-40 whitespace-nowrap"
              >
                {testingKeyId === 'cloudflare:korean-json' ? '검증중...' : 'JSON 검증'}
              </button>
              <button
                type="button"
                disabled={isStaticHost || (!cfAccountInput.trim() && !cfTokenInput.trim()) || Boolean(savingId)}
                onClick={handleSaveCloudflare}
                className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingId === 'cloudflare' ? '저장...' : '저장'}</span>
              </button>
              {isCfSavedInConfig && (
                <button
                  type="button"
                  disabled={isStaticHost || Boolean(savingId)}
                  onClick={handleClearCloudflare}
                  title="서버에 저장된 Cloudflare 설정 삭제"
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
