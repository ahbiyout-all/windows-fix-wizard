import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Github,
  KeyRound,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Webhook
} from 'lucide-react';
import { TriangleNodeTelemetry, WebhookTelemetryEvent } from '../types';

interface TriangleSyncMonitorProps {
  language: 'ko' | 'en';
  repo: string;
  branch: string;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

export const TriangleSyncMonitor: React.FC<TriangleSyncMonitorProps> = ({
  language,
  repo,
  branch,
  getAuthHeaders
}) => {
  const isEn = language === 'en';
  const defaultDerivedShared = (() => {
    if (typeof window === 'undefined') return 'https://windows-fix-wizard.ai.studio';
    try {
      const saved = localStorage.getItem('winfix_shared_webhook_url');
      if (saved && /^https?:\/\//i.test(saved) && !/ais-(dev|pre)-/i.test(saved)) {
        return saved.replace(/\/+$/, '');
      }
    } catch (_) {}
    if (window.location.hostname.endsWith('.ai.studio')) {
      return window.location.origin;
    }
    return 'https://windows-fix-wizard.ai.studio';
  })();

  const [sharedUrlInput, setSharedUrlInput] = useState<string>(defaultDerivedShared);
  const [nodes, setNodes] = useState<TriangleNodeTelemetry[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookTelemetryEvent[]>([]);
  const [hasWebhookSecret, setHasWebhookSecret] = useState<boolean>(false);
  const [hasServerToken, setHasServerToken] = useState<boolean>(false);
  const [checkedAt, setCheckedAt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const runTriangleProbe = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({
        repo: repo || 'AhBiYout-all/windows-fix-wizard',
        branch: branch || 'main'
      });
      if (sharedUrlInput.trim()) {
        params.set('sharedUrl', sharedUrlInput.trim());
      }
      const res = await fetch(`/api/github/triangle-status?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setNodes(Array.isArray(data.nodes) ? data.nodes : []);
      setWebhookEvents(Array.isArray(data.webhookEvents) ? data.webhookEvents : []);
      setHasWebhookSecret(Boolean(data.hasWebhookSecret));
      setHasServerToken(Boolean(data.hasServerGithubToken));
      setCheckedAt(data.checkedAt || new Date().toISOString());
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Failed to probe 3-way pipeline' : '3각 연동 상태 조회 실패'));
    } finally {
      setIsLoading(false);
    }
  }, [repo, branch, sharedUrlInput, getAuthHeaders, isEn]);

  useEffect(() => {
    void runTriangleProbe();
  }, [runTriangleProbe]);

  const getNodeIcon = (id: TriangleNodeTelemetry['id']) => {
    switch (id) {
      case 'localServer':
        return <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'githubRepo':
        return <Github className="w-4 h-4 text-slate-700 dark:text-slate-200" />;
      case 'githubPages':
        return <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'sharedWebhook':
        return <Webhook className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  const getStatusBadge = (status: TriangleNodeTelemetry['status']) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            OK
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            WARN
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5" />
            ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            UNSET
          </span>
        );
    }
  };

  const webhookNode = nodes.find((n) => n.id === 'sharedWebhook');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {isEn ? '3-Way Real-Time Sync & Webhook Monitor' : '3각 연동 실시간 상태 모니터링 & 웹훅 관제'}
            </h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{repo}</span>
            <span>·</span>
            <span>{branch}</span>
            <span>·</span>
            <span className={hasWebhookSecret ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
              {hasWebhookSecret ? 'HMAC/CRON Secret Active' : 'CRON_SECRET Unset'}
            </span>
            <span>·</span>
            <span className={hasServerToken ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>
              {hasServerToken ? 'Server PAT Connected' : 'Public API Mode'}
            </span>
            {checkedAt && (
              <>
                <span>·</span>
                <span className="font-mono tabular-nums">
                  {new Date(checkedAt).toLocaleTimeString()}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="url"
            value={sharedUrlInput}
            onChange={(e) => {
              const val = e.target.value;
              setSharedUrlInput(val);
              try {
                if (val.trim()) localStorage.setItem('winfix_shared_webhook_url', val.trim());
                else localStorage.removeItem('winfix_shared_webhook_url');
              } catch (_) {}
            }}
            placeholder="https://windows-fix-wizard.ai.studio"
            aria-label={isEn ? 'Shared App Webhook URL' : '공유 앱 웹훅 URL'}
            className="w-full sm:w-64 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void runTriangleProbe()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isEn ? 'Probe 3-Way Pipeline' : '실시간 3각 정밀 진단'}</span>
          </button>
        </div>
      </div>

      {/* Diagnostic Alert for Auth Gate / Unpublished Shared URL */}
      {webhookNode && (webhookNode.diagnosticCode === 'UNPUBLISHED_404' || webhookNode.diagnosticCode === 'AUTH_GATE_HTML') && (
        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/25 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">
              {webhookNode.diagnosticCode === 'UNPUBLISHED_404'
                ? (isEn ? 'AI Studio Shared App URL (ais-pre-*) Not Published Yet' : 'AI Studio 공유 앱(ais-pre-*) 미발행 상태 (HTTP 404)')
                : (isEn ? 'Google Login Auth Gate Detected on URL' : '외부 웹훅 차단: 로그인 인증 게이트 HTML 응답 감지')}
            </div>
            <p className="mt-0.5 opacity-90 leading-relaxed">{webhookNode.message}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4-Node Live Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading && nodes.length === 0 ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 animate-pulse" />
          ))
        ) : (
          nodes.map((node) => (
            <div
              key={node.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {getNodeIcon(node.id)}
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {node.label}
                  </span>
                </div>
                {getStatusBadge(node.status)}
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {node.message}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                <span>
                  {node.httpStatus ? `HTTP ${node.httpStatus}` : 'N/A'}
                  {typeof node.latencyMs === 'number' ? ` · ${node.latencyMs}ms` : ''}
                </span>
                {node.targetUrl ? (
                  <a
                    href={node.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  typeof node.issueCount === 'number' && <span>{node.issueCount} issues</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Webhook Audit Log Table */}
      <div className="pt-2 space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isEn ? 'Recent Signed Webhook Audit Events' : '최근 서명 검증 웹훅 수신 감사 로그'}</span>
          </h4>
          <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {webhookEvents.length} {isEn ? 'events' : '건'}
          </span>
        </div>

        {webhookEvents.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            {isEn
              ? 'No webhook events recorded yet. Collector cycles or Pages deploy callbacks using HMAC-SHA256 / x-cron-secret will appear here.'
              : '아직 수신된 웹훅 이벤트가 없습니다. GitHub Actions 수집기 또는 Pages 배포 완료 시 HMAC-SHA256 서명 검증과 함께 이곳에 실시간 기록됩니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 px-3 font-medium">{isEn ? 'Time' : '수신 시각'}</th>
                  <th className="py-2 px-3 font-medium">{isEn ? 'Event' : '유형'}</th>
                  <th className="py-2 px-3 font-medium">{isEn ? 'Auth / Signature' : '인증 · 서명'}</th>
                  <th className="py-2 px-3 font-medium">{isEn ? 'Summary' : '요약'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {webhookEvents.slice(0, 8).map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-mono tabular-nums text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {ev.eventType}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-mono ${
                          ev.signatureValid
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {ev.signatureValid ? <ShieldCheck className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
                        {ev.authMode} ({ev.httpStatus})
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                      {ev.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
