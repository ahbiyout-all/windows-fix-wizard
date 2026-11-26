import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  GitBranch,
  GitCommit,
  KeyRound,
  Pause,
  Play,
  RefreshCw,
  Rocket,
  Search,
  Terminal,
  XCircle
} from 'lucide-react';

interface PagesWorkflowRun {
  id: number;
  name?: string;
  run_number: number;
  status: string;
  conclusion: string | null;
  event?: string;
  head_branch?: string;
  head_sha?: string;
  display_title?: string;
  head_commit?: {
    message?: string;
  };
  actor?: {
    login?: string;
  };
  html_url: string;
  created_at: string;
  run_started_at?: string;
  updated_at?: string;
}

interface WorkflowStep {
  number: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

interface WorkflowJob {
  id: number;
  run_id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  html_url: string;
  runner_name?: string;
  steps: WorkflowStep[];
}

export interface PagesDeploymentLogMonitorProps {
  language: 'ko' | 'en';
  repo: string;
  branch?: string;
  token?: string;
  hasServerToken?: boolean;
  isServerMode?: boolean;
  getAuthHeaders: () => Promise<Record<string, string>>;
  onDeployTriggered?: () => void;
}

type RunFilterStatus = 'all' | 'success' | 'failure' | 'active';

function formatRelativeTime(dateStr: string | undefined, isEn: boolean): string {
  if (!dateStr) return '-';
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return dateStr;
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 45) return isEn ? 'just now' : '방금 전';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isEn ? `${diffMin}m ago` : `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return isEn ? `${diffHr}h ago` : `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return isEn ? `${diffDay}d ago` : `${diffDay}일 전`;
  return new Date(ts).toLocaleDateString(isEn ? 'en-US' : 'ko-KR');
}

function formatDuration(start?: string | null, end?: string | null): string {
  if (!start) return '-';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return '-';
  const sec = Math.floor((e - s) / 1000);
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function formatExactTimestamp(dateStr: string | undefined, isEn: boolean, compact = false): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  if (compact) {
    return d.toLocaleString(isEn ? 'en-US' : 'ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }
  return d.toLocaleString(isEn ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function getRunStateLabel(status: string, conclusion: string | null, isEn: boolean) {
  if (status !== 'completed') {
    return {
      key: 'active' as const,
      label: status === 'queued' ? (isEn ? 'Queued' : '대기 중') : (isEn ? 'Running' : '배포 중'),
      textClass: 'text-amber-600 dark:text-amber-400',
      dotClass: 'bg-amber-500'
    };
  }
  if (conclusion === 'success') {
    return {
      key: 'success' as const,
      label: isEn ? 'Passed' : '성공',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      dotClass: 'bg-emerald-500'
    };
  }
  if (conclusion === 'cancelled' || conclusion === 'skipped') {
    return {
      key: 'cancelled' as const,
      label: isEn ? 'Cancelled' : '취소됨',
      textClass: 'text-slate-500 dark:text-slate-400',
      dotClass: 'bg-slate-400'
    };
  }
  return {
    key: 'failure' as const,
    label: isEn ? 'Failed' : '실패',
    textClass: 'text-rose-600 dark:text-rose-400',
    dotClass: 'bg-rose-500'
  };
}

export const PagesDeploymentLogMonitor: React.FC<PagesDeploymentLogMonitorProps> = ({
  language,
  repo,
  branch = 'main',
  token,
  hasServerToken = false,
  isServerMode = true,
  getAuthHeaders,
  onDeployTriggered
}) => {
  const isEn = language === 'en';
  const cleanRepo = (repo || 'AhBiYout-all/windows-fix-wizard').trim();
  const cleanClientToken = token && !token.includes('••••') ? token.trim() : '';

  const [runs, setRuns] = useState<PagesWorkflowRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<RunFilterStatus>('all');
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const [rawLogs, setRawLogs] = useState<string>('');
  const [logsTruncated, setLogsTruncated] = useState<boolean>(false);
  const [logsRequiresToken, setLogsRequiresToken] = useState<boolean>(false);
  const [logsStatusMsg, setLogsStatusMsg] = useState<string>('');
  const [serverTokenAvailable, setServerTokenAvailable] = useState<boolean>(hasServerToken);

  const [logFilter, setLogFilter] = useState<string>('');
  const [errorsOnly, setErrorsOnly] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [autoPoll, setAutoPoll] = useState<boolean>(true);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);

  const [isLoadingRuns, setIsLoadingRuns] = useState<boolean>(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [isTriggeringDeploy, setIsTriggeringDeploy] = useState<boolean>(false);
  const [triggerFeedback, setTriggerFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('');

  const logViewerRef = useRef<HTMLDivElement | null>(null);

  const fetchRuns = useCallback(async (forceRefresh = false) => {
    setIsLoadingRuns(true);
    setErrorMsg(null);
    try {
      let fetchedRuns: PagesWorkflowRun[] = [];
      if (isServerMode) {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams({
          repo: cleanRepo,
          workflowFile: 'deploy-pages.yml',
          perPage: '15'
        });
        if (forceRefresh) params.set('refresh', '1');
        const res = await fetch(`/api/github/workflow-runs?${params.toString()}`, { headers });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        if (data.rateLimited) {
          throw new Error(
            isEn
              ? 'GitHub API rate limit reached. Add a PAT in Admin GitHub settings for 5,000 req/hr.'
              : 'GitHub API 호출 한도에 도달했습니다. 관리자 GitHub 설정에 PAT를 등록하면 즉시 복구됩니다.'
          );
        }
        setServerTokenAvailable(Boolean(data.hasServerToken));
        fetchedRuns = Array.isArray(data.runs) ? data.runs : [];
      } else {
        const ghHeaders: Record<string, string> = {
          Accept: 'application/vnd.github.v3+json'
        };
        if (cleanClientToken) {
          ghHeaders.Authorization = `Bearer ${cleanClientToken}`;
        }
        const res = await fetch(
          `https://api.github.com/repos/${cleanRepo}/actions/workflows/deploy-pages.yml/runs?per_page=15`,
          { headers: ghHeaders, cache: forceRefresh ? 'no-store' : 'default' }
        );
        if (!res.ok) {
          throw new Error(`GitHub API HTTP ${res.status}`);
        }
        const data = await res.json();
        fetchedRuns = Array.isArray(data?.workflow_runs) ? data.workflow_runs : [];
      }

      setRuns(fetchedRuns);
      setLastUpdatedAt(new Date().toISOString());
      setSelectedRunId((prev) => {
        if (prev && fetchedRuns.some((r) => r.id === prev)) return prev;
        return fetchedRuns.length > 0 ? fetchedRuns[0].id : null;
      });
    } catch (err: any) {
      setErrorMsg(err?.message || (isEn ? 'Failed to load deploy-pages.yml runs' : 'deploy-pages.yml 실행 이력 조회 실패'));
    } finally {
      setIsLoadingRuns(false);
    }
  }, [isServerMode, cleanRepo, cleanClientToken, getAuthHeaders, isEn]);

  const fetchRunJobs = useCallback(async (runId: number, forceRefresh = false) => {
    setIsLoadingJobs(true);
    try {
      let fetchedJobs: WorkflowJob[] = [];
      if (isServerMode) {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams({
          repo: cleanRepo,
          runId: String(runId)
        });
        if (forceRefresh) params.set('refresh', '1');
        const res = await fetch(`/api/github/workflow-run-jobs?${params.toString()}`, { headers });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        setServerTokenAvailable(Boolean(data.hasServerToken));
        fetchedJobs = Array.isArray(data.jobs) ? data.jobs : [];
      } else {
        const ghHeaders: Record<string, string> = {
          Accept: 'application/vnd.github.v3+json'
        };
        if (cleanClientToken) {
          ghHeaders.Authorization = `Bearer ${cleanClientToken}`;
        }
        const res = await fetch(
          `https://api.github.com/repos/${cleanRepo}/actions/runs/${runId}/jobs?per_page=30`,
          { headers: ghHeaders, cache: forceRefresh ? 'no-store' : 'default' }
        );
        if (!res.ok) {
          throw new Error(`GitHub Jobs API HTTP ${res.status}`);
        }
        const data = await res.json();
        fetchedJobs = Array.isArray(data?.jobs) ? data.jobs : [];
      }

      setJobs(fetchedJobs);
      setSelectedJobId((prev) => {
        if (prev && fetchedJobs.some((j) => j.id === prev)) return prev;
        // Prefer failed job first if any, otherwise first job
        const failed = fetchedJobs.find((j) => j.conclusion === 'failure');
        return failed ? failed.id : (fetchedJobs[0]?.id ?? null);
      });
    } catch (err: any) {
      setErrorMsg(err?.message || (isEn ? 'Failed to fetch run jobs' : 'Job 단계 정보 조회 실패'));
      setJobs([]);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [isServerMode, cleanRepo, cleanClientToken, getAuthHeaders, isEn]);

  const fetchJobLogs = useCallback(async (jobId: number, forceRefresh = false) => {
    setIsLoadingLogs(true);
    setLogsStatusMsg('');
    try {
      if (isServerMode) {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams({
          repo: cleanRepo,
          jobId: String(jobId)
        });
        if (forceRefresh) params.set('refresh', '1');
        const res = await fetch(`/api/github/workflow-job-logs?${params.toString()}`, { headers });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        setServerTokenAvailable(Boolean(data.hasServerToken));
        setLogsRequiresToken(Boolean(data.requiresToken));
        setLogsTruncated(Boolean(data.truncated));
        setRawLogs(typeof data.logs === 'string' ? data.logs : '');
        if (data.message) setLogsStatusMsg(data.message);
      } else {
        if (!cleanClientToken) {
          setLogsRequiresToken(true);
          setRawLogs('');
          setLogsStatusMsg(
            isEn
              ? 'Raw console logs require a GitHub PAT with repo/actions:read permissions.'
              : '원시 콘솔 로그(Raw Console)는 GitHub PAT(repo 또는 actions:read 권한) 설정 후 조회할 수 있습니다.'
          );
          return;
        }
        const res = await fetch(
          `https://api.github.com/repos/${cleanRepo}/actions/jobs/${jobId}/logs`,
          {
            headers: {
              Authorization: `Bearer ${cleanClientToken}`,
              Accept: 'application/vnd.github.v3+json'
            }
          }
        );
        if (res.status === 401 || res.status === 403) {
          setLogsRequiresToken(true);
          setRawLogs('');
          setLogsStatusMsg(
            isEn
              ? `Token missing actions:read/repo permission (HTTP ${res.status}).`
              : `PAT 권한 부족 또는 만료 (HTTP ${res.status}) — GitHub Actions 페이지에서 원문을 확인하세요.`
          );
          return;
        }
        if (!res.ok) {
          setLogsRequiresToken(false);
          setRawLogs('');
          setLogsStatusMsg(
            isEn
              ? `Log stream unavailable yet (HTTP ${res.status}).`
              : `작업 로그가 아직 생성 중이거나 조회할 수 없습니다 (HTTP ${res.status}).`
          );
          return;
        }
        const text = await res.text();
        // eslint-disable-next-line no-control-regex
        const cleaned = text.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
        const maxChars = 350000;
        const truncated = cleaned.length > maxChars;
        setLogsRequiresToken(false);
        setLogsTruncated(truncated);
        setRawLogs(truncated ? cleaned.slice(cleaned.length - maxChars) : cleaned);
      }
    } catch (err: any) {
      setLogsStatusMsg(err?.message || (isEn ? 'Failed to load job log' : '콘솔 로그 불러오기 실패'));
      setRawLogs('');
    } finally {
      setIsLoadingLogs(false);
    }
  }, [isServerMode, cleanRepo, cleanClientToken, getAuthHeaders, isEn]);

  // Initial load & when repo switches
  useEffect(() => {
    void fetchRuns(false);
  }, [fetchRuns]);

  // Fetch jobs whenever selectedRunId changes
  useEffect(() => {
    if (selectedRunId) {
      void fetchRunJobs(selectedRunId, false);
    } else {
      setJobs([]);
      setSelectedJobId(null);
    }
  }, [selectedRunId, fetchRunJobs]);

  // Fetch raw logs whenever selectedJobId changes
  useEffect(() => {
    if (selectedJobId) {
      void fetchJobLogs(selectedJobId, false);
    } else {
      setRawLogs('');
      setLogsStatusMsg('');
    }
  }, [selectedJobId, fetchJobLogs]);

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId) || null,
    [runs, selectedRunId]
  );

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const hasActiveRun = useMemo(
    () => runs.some((r) => r.status !== 'completed'),
    [runs]
  );

  // Adaptive live polling: 10s when running/queued, 30s when idle
  useEffect(() => {
    if (!autoPoll) return;
    const intervalMs = hasActiveRun ? 10000 : 30000;
    const timer = setInterval(() => {
      void fetchRuns(true);
      if (selectedRunId && (hasActiveRun || (selectedRun && selectedRun.status !== 'completed'))) {
        void fetchRunJobs(selectedRunId, true);
        if (selectedJobId) {
          void fetchJobLogs(selectedJobId, true);
        }
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoPoll, hasActiveRun, selectedRunId, selectedRun, selectedJobId, fetchRuns, fetchRunJobs, fetchJobLogs]);

  const handleManualRefresh = () => {
    void fetchRuns(true);
    if (selectedRunId) void fetchRunJobs(selectedRunId, true);
    if (selectedJobId) void fetchJobLogs(selectedJobId, true);
  };

  const handleTriggerDeploy = async () => {
    setIsTriggeringDeploy(true);
    setTriggerFeedback(null);
    try {
      if (isServerMode) {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/github/deploy-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ repo: cleanRepo, branch })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        setTriggerFeedback({
          type: 'ok',
          text: isEn
            ? 'deploy-pages.yml dispatched! Watching for new run...'
            : 'deploy-pages.yml 배포를 시작했습니다. 약 3~5초 후 새 실행 로그가 표시됩니다.'
        });
      } else {
        if (!cleanClientToken) {
          throw new Error(
            isEn
              ? 'GitHub PAT with workflow scope is required.'
              : 'deploy-pages.yml 원격 실행을 위해 PAT 토큰(workflow 권한)이 필요합니다.'
          );
        }
        const res = await fetch(
          `https://api.github.com/repos/${cleanRepo}/actions/workflows/deploy-pages.yml/dispatches`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cleanClientToken}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ref: branch })
          }
        );
        if (!res.ok) {
          throw new Error(`GitHub Dispatch HTTP ${res.status}`);
        }
        setTriggerFeedback({
          type: 'ok',
          text: isEn
            ? 'deploy-pages.yml dispatched! Polling for new run...'
            : 'deploy-pages.yml 배포를 시작했습니다. 실행 목록을 자동 갱신합니다.'
        });
      }
      onDeployTriggered?.();
      setTimeout(() => {
        void fetchRuns(true);
      }, 3000);
    } catch (err: any) {
      setTriggerFeedback({
        type: 'err',
        text: err?.message || (isEn ? 'Failed to trigger deploy-pages.yml' : 'Pages 배포 실행 실패')
      });
    } finally {
      setIsTriggeringDeploy(false);
    }
  };

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      if (statusFilter === 'all') return true;
      const state = getRunStateLabel(run.status, run.conclusion, isEn).key;
      if (statusFilter === 'success') return state === 'success';
      if (statusFilter === 'failure') return state === 'failure';
      if (statusFilter === 'active') return state === 'active';
      return true;
    });
  }, [runs, statusFilter, isEn]);

  const parsedLogLines = useMemo(() => {
    if (!rawLogs) return [];
    const lines = rawLogs.split(/\r?\n/);
    const q = logFilter.trim().toLowerCase();
    return lines
      .map((line, index) => ({ lineNumber: index + 1, text: line }))
      .filter(({ text }) => {
        if (errorsOnly && !/(error|failed|fatal|exception|err!|unrecognized|exit code [1-9])/i.test(text)) {
          return false;
        }
        if (q && !text.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      });
  }, [rawLogs, logFilter, errorsOnly]);

  // Auto-scroll terminal to bottom when logs update and autoScroll is enabled
  useEffect(() => {
    if (autoScroll && logViewerRef.current && parsedLogLines.length > 0) {
      logViewerRef.current.scrollTop = logViewerRef.current.scrollHeight;
    }
  }, [parsedLogLines, autoScroll]);

  const handleCopyLogs = async () => {
    const content = parsedLogLines.map((l) => l.text).join('\n');
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 1800);
    } catch (_) {}
  };

  const handleDownloadLogs = () => {
    const content = rawLogs || parsedLogLines.map((l) => l.text).join('\n');
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deploy-pages-run-${selectedRun?.run_number || selectedRunId || 'log'}-${selectedJob?.name || 'job'}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const completedStepsCount = useMemo(
    () => (selectedJob?.steps || []).filter((s) => s.status === 'completed').length,
    [selectedJob]
  );

  const runMetrics = useMemo(() => {
    const passed = runs.filter((r) => r.status === 'completed' && r.conclusion === 'success').length;
    const failed = runs.filter(
      (r) => r.status === 'completed' && r.conclusion !== 'success' && r.conclusion !== 'cancelled' && r.conclusion !== 'skipped'
    ).length;
    const active = runs.filter((r) => r.status !== 'completed').length;
    const finished = passed + failed;
    const successRate = finished > 0 ? Math.round((passed / finished) * 100) : null;
    const latest = runs[0] || null;
    const latestState = latest ? getRunStateLabel(latest.status, latest.conclusion, isEn) : null;
    return { passed, failed, active, successRate, latest, latestState };
  }, [runs, isEn]);

  return (
    <section
      id="pages-deploy-logs-section"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
    >
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {isEn
                ? 'GitHub Pages Real-Time Deployment Logs'
                : 'GitHub Pages 배포 실시간 로그 관제'}
            </h3>
            <code className="text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">
              deploy-pages.yml
            </code>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            <span>{cleanRepo}</span>
            <span aria-hidden="true">·</span>
            <span>{branch}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hasActiveRun
                    ? 'bg-amber-500 animate-pulse'
                    : autoPoll
                    ? 'bg-emerald-500'
                    : 'bg-slate-400'
                }`}
              />
              {autoPoll
                ? hasActiveRun
                  ? (isEn ? 'Live 10s poll' : '실시간 10초 폴링')
                  : (isEn ? 'Auto 30s poll' : '자동 30초 폴링')
                : (isEn ? 'Paused' : '일시정지')}
            </span>
            {lastUpdatedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {new Date(lastUpdatedAt).toLocaleTimeString(isEn ? 'en-US' : 'ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAutoPoll((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            {autoPoll ? <Pause className="w-3.5 h-3.5 text-amber-500" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
            <span>{autoPoll ? (isEn ? 'Pause Poll' : '폴링 정지') : (isEn ? 'Resume Poll' : '자동 갱신')}</span>
          </button>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoadingRuns || isLoadingJobs || isLoadingLogs}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRuns || isLoadingJobs ? 'animate-spin text-blue-500' : ''}`} />
            <span>{isEn ? 'Refresh' : '새로고침'}</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerDeploy}
            disabled={isTriggeringDeploy}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            {isTriggeringDeploy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
            <span>{isEn ? 'Deploy Pages Now' : '즉시 Pages 배포'}</span>
          </button>

          <a
            href={`https://github.com/${cleanRepo}/actions/workflows/deploy-pages.yml`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Feedback / Error Strip */}
      {(triggerFeedback || errorMsg) && (
        <div
          className={`px-5 py-2.5 text-xs font-medium border-b flex items-center justify-between gap-3 ${
            errorMsg || triggerFeedback?.type === 'err'
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          <span className="flex items-center gap-2">
            {errorMsg || triggerFeedback?.type === 'err' ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{errorMsg || triggerFeedback?.text}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setTriggerFeedback(null);
            }}
            className="text-[11px] opacity-70 hover:opacity-100 underline cursor-pointer"
          >
            {isEn ? 'Dismiss' : '닫기'}
          </button>
        </div>
      )}

      {/* Summary KPI Strip: Status, Recent Timestamp & Pass/Fail Tally */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
        <div className="px-4 py-3 space-y-0.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isEn ? 'Latest Deploy Status' : '최신 배포 상태'}
          </div>
          {runMetrics.latest && runMetrics.latestState ? (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold">
              <span className={`w-2 h-2 rounded-full ${runMetrics.latestState.dotClass}`} />
              <span className={runMetrics.latestState.textClass}>{runMetrics.latestState.label}</span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                #{runMetrics.latest.run_number}
              </span>
            </div>
          ) : (
            <div className="text-xs font-mono text-slate-400">{isLoadingRuns ? '...' : '-'}</div>
          )}
        </div>

        <div className="px-4 py-3 space-y-0.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isEn ? 'Recent Execution Time' : '최근 실행 시각'}
          </div>
          {runMetrics.latest ? (
            <div className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums truncate">
              {formatExactTimestamp(runMetrics.latest.created_at, isEn)}
              <span className="ml-1.5 font-sans text-[11px] font-normal text-slate-500 dark:text-slate-400">
                ({formatRelativeTime(runMetrics.latest.created_at, isEn)})
              </span>
            </div>
          ) : (
            <div className="text-xs font-mono text-slate-400">{isLoadingRuns ? '...' : '-'}</div>
          )}
        </div>

        <div className="px-4 py-3 space-y-0.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isEn ? 'Recent Pass / Fail' : '최근 성공 · 실패 집계'}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-xs font-mono font-bold tabular-nums">
            <span className="text-emerald-600 dark:text-emerald-400">
              {runMetrics.passed} {isEn ? 'Passed' : '성공'}
            </span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className={runMetrics.failed > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}>
              {runMetrics.failed} {isEn ? 'Failed' : '실패'}
            </span>
            {runMetrics.successRate !== null && (
              <>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="text-slate-700 dark:text-slate-300">{runMetrics.successRate}%</span>
              </>
            )}
          </div>
        </div>

        <div className="px-4 py-3 space-y-0.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isEn ? 'Latest Trigger & Duration' : '트리거 · 소요 시간'}
          </div>
          {runMetrics.latest ? (
            <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              <span>{runMetrics.latest.event || 'push'}</span>
              <span aria-hidden="true" className="mx-1.5 text-slate-400">·</span>
              <span>
                {formatDuration(
                  runMetrics.latest.run_started_at || runMetrics.latest.created_at,
                  runMetrics.latest.status === 'completed' ? runMetrics.latest.updated_at : null
                )}
              </span>
            </div>
          ) : (
            <div className="text-xs font-mono text-slate-400">{isLoadingRuns ? '...' : '-'}</div>
          )}
        </div>
      </div>

      {/* Main Two-Column Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
        {/* Left Pane: deploy-pages.yml Run History */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/40 dark:bg-slate-900/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isEn ? 'Workflow Runs' : '배포 실행 이력'} ({filteredRuns.length})
            </span>
            <div className="flex items-center gap-1" role="tablist" aria-label="Filter workflow runs">
              {(['all', 'success', 'failure', 'active'] as const).map((f) => {
                const labels: Record<RunFilterStatus, string> = isEn
                  ? { all: 'All', success: 'Pass', failure: 'Fail', active: 'Live' }
                  : { all: '전체', success: '성공', failure: '실패', active: '진행' };
                const active = statusFilter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatusFilter(f)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                    }`}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70 custom-scrollbar">
            {isLoadingRuns && runs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span>{isEn ? 'Loading deploy-pages.yml runs...' : 'deploy-pages.yml 이력 불러오는 중...'}</span>
              </div>
            ) : filteredRuns.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {isEn ? 'No matching workflow runs found.' : '조건에 맞는 배포 이력이 없습니다.'}
              </div>
            ) : (
              filteredRuns.map((run) => {
                const st = getRunStateLabel(run.status, run.conclusion, isEn);
                const isSelected = run.id === selectedRunId;
                const commitMsg = run.head_commit?.message?.split('\n')[0] || run.display_title || run.name || 'GitHub Pages Deploy';
                return (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={`w-full text-left px-4 py-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {st.key === 'active' ? (
                        <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                      ) : st.key === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : st.key === 'failure' ? (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                          #{run.run_number}
                          <span className={`ml-1.5 font-sans text-[11px] font-semibold ${st.textClass}`}>
                            {st.label}
                          </span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
                          {formatRelativeTime(run.created_at, isEn)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 truncate font-medium">
                        {commitMsg}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        <span>{formatExactTimestamp(run.created_at, isEn, true)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{run.event || 'push'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{run.head_branch || branch}</span>
                        {run.head_sha && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{run.head_sha.slice(0, 7)}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{formatDuration(run.run_started_at || run.created_at, run.status === 'completed' ? run.updated_at : null)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Jobs, Steps & Raw Log Console */}
        <div className="lg:col-span-8 flex flex-col min-w-0">
          {!selectedRun ? (
            <div className="p-10 text-center text-xs text-slate-500">
              {isEn ? 'Select a workflow run from the left panel to inspect deployment steps and logs.' : '좌측 목록에서 실행 이력을 선택하면 단계별 로그가 표시됩니다.'}
            </div>
          ) : (
            <>
              {/* Selected Run Meta Strip */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/40 dark:bg-slate-900/50">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                    <span className="font-mono">Run #{selectedRun.run_number}</span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="truncate">
                      {selectedRun.head_commit?.message?.split('\n')[0] || selectedRun.display_title || 'deploy-pages.yml'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {selectedRun.head_branch || branch}
                    </span>
                    {selectedRun.head_sha && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <GitCommit className="w-3 h-3" />
                          {selectedRun.head_sha.slice(0, 7)}
                        </span>
                      </>
                    )}
                    {selectedRun.actor?.login && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>@{selectedRun.actor.login}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>
                      {new Date(selectedRun.created_at).toLocaleString(isEn ? 'en-US' : 'ko-KR')}
                    </span>
                  </div>
                </div>

                <a
                  href={selectedRun.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <span>{isEn ? 'View Run on GitHub' : 'GitHub Actions 원본'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Job Selector Tabs + Step Timeline */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {jobs.length === 0 ? (
                      <span className="text-xs text-slate-500">
                        {isLoadingJobs
                          ? (isEn ? 'Fetching jobs...' : 'Job 단계 불러오는 중...')
                          : (isEn ? 'No jobs reported yet.' : '아직 보고된 Job 단계가 없습니다.')}
                      </span>
                    ) : (
                      jobs.map((job) => {
                        const jst = getRunStateLabel(job.status, job.conclusion, isEn);
                        const active = job.id === selectedJobId;
                        return (
                          <button
                            key={job.id}
                            type="button"
                            onClick={() => setSelectedJobId(job.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                              active
                                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${jst.dotClass}`} />
                            <span>{job.name}</span>
                            <span className="font-mono text-[10px] opacity-75 tabular-nums">
                              {formatDuration(job.started_at, job.completed_at)}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {selectedJob && (
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      {isEn
                        ? `${completedStepsCount}/${selectedJob.steps.length} steps`
                        : `${completedStepsCount}/${selectedJob.steps.length} 단계 완료`}
                      {selectedJob.runner_name ? ` · ${selectedJob.runner_name}` : ''}
                    </span>
                  )}
                </div>

                {/* Step-by-step Execution Breakdown */}
                {selectedJob && selectedJob.steps.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                    {selectedJob.steps.map((step) => {
                      const sst = getRunStateLabel(step.status, step.conclusion, isEn);
                      return (
                        <div
                          key={`${selectedJob.id}-step-${step.number}`}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-[11px]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {sst.key === 'active' ? (
                              <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
                            ) : sst.key === 'success' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : sst.key === 'failure' ? (
                              <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="font-mono text-slate-400 shrink-0 tabular-nums">{step.number}.</span>
                            <span className="truncate font-medium text-slate-800 dark:text-slate-200" title={step.name}>
                              {step.name}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                            {formatDuration(step.started_at, step.completed_at)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Console Toolbar */}
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      placeholder={isEn ? 'Filter console output...' : '로그 키워드 검색...'}
                      className="w-full pl-8 pr-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 text-[11px] font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setErrorsOnly((prev) => !prev)}
                    className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer shrink-0 ${
                      errorsOnly
                        ? 'bg-rose-600/20 border-rose-500/60 text-rose-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isEn ? 'Errors Only' : '오류만'}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setAutoScroll((prev) => !prev)}
                    className={`px-2 py-1 rounded border transition-colors cursor-pointer ${
                      autoScroll
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isEn ? 'Auto-scroll' : '하단 고정'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLogs}
                    disabled={parsedLogLines.length === 0}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLog ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLog ? (isEn ? 'Copied' : '복사됨') : (isEn ? 'Copy' : '복사')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadLogs}
                    disabled={!rawLogs}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>.log</span>
                  </button>
                </div>
              </div>

              {/* Dark Terminal Console Surface */}
              <div
                ref={logViewerRef}
                className="bg-slate-950 text-slate-200 font-mono text-[11.5px] leading-5 h-[320px] overflow-auto p-3 custom-scrollbar"
              >
                {isLoadingLogs && !rawLogs ? (
                  <div className="h-full flex items-center justify-center text-slate-400 gap-2 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>{isEn ? 'Streaming job console log...' : 'Actions 작업 콘솔 로그를 불러오는 중...'}</span>
                  </div>
                ) : logsRequiresToken ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6 space-y-2.5">
                    <KeyRound className="w-6 h-6 text-amber-400" />
                    <p className="text-xs font-semibold text-slate-200">
                      {isEn
                        ? 'GitHub PAT Required for Raw Console Log Stream'
                        : '원시 콘솔 로그 스트리밍에는 GitHub PAT 토큰이 필요합니다'}
                    </p>
                    <p className="text-[11px] font-sans text-slate-400 max-w-md leading-relaxed">
                      {logsStatusMsg ||
                        (isEn
                          ? 'Step progress above updates live without a token. Configure a PAT with repo or actions:read scope in Admin settings to stream full console output directly here.'
                          : '상단의 단계별 진행 상태는 토큰 없이 실시간 조회됩니다. 전체 터미널 출력까지 이곳에서 보려면 GitHub PAT(repo / actions:read 권한)를 저장해 주세요.')}
                    </p>
                    {selectedJob?.html_url && (
                      <a
                        href={selectedJob.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-sans font-semibold inline-flex items-center gap-1.5 border border-slate-700"
                      >
                        <span>{isEn ? 'Open Full Job Log on GitHub' : 'GitHub에서 전체 작업 로그 열기'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ) : parsedLogLines.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 text-xs font-sans">
                    <Activity className="w-5 h-5 text-slate-600" />
                    <span>
                      {logsStatusMsg ||
                        (rawLogs
                          ? (isEn ? 'No lines match your filter.' : '검색 필터와 일치하는 로그 라인이 없습니다.')
                          : (isEn ? 'No console output available for this job yet.' : '선택한 Job의 콘솔 출력이 아직 없습니다.'))}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {logsTruncated && (
                      <div className="mb-2 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10.5px] text-amber-300 font-sans">
                        {isEn
                          ? 'Log truncated to the latest 350 KB for fast rendering. Use .log download or GitHub link if older lines are needed.'
                          : '빠른 화면 출력을 위해 최근 350 KB 구간만 표시 중입니다.'}
                      </div>
                    )}
                    {parsedLogLines.map((entry) => {
                      const isErrLine = /(##\[error\]|error:|fatal:|unrecognized|exception|exit code [1-9])/i.test(entry.text);
                      const isWarnLine = /(##\[warning\]|warn\b|deprecated)/i.test(entry.text);
                      const isGroupLine = /##\[group\]/i.test(entry.text);
                      return (
                        <div
                          key={entry.lineNumber}
                          className={`flex gap-3 px-1.5 rounded-xs hover:bg-slate-900/90 ${
                            isErrLine
                              ? 'bg-rose-950/40 text-rose-300'
                              : isWarnLine
                              ? 'text-amber-300'
                              : isGroupLine
                              ? 'text-cyan-300 font-semibold'
                              : 'text-slate-300'
                          }`}
                        >
                          <span className="select-none text-slate-600 text-right w-10 shrink-0 tabular-nums">
                            {entry.lineNumber}
                          </span>
                          <span className="whitespace-pre-wrap break-all">{entry.text || ' '}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer Telemetry */}
              <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-mono text-slate-400">
                <span>
                  {selectedJob ? `${selectedJob.name} · ${parsedLogLines.length.toLocaleString()} lines` : 'Ready'}
                </span>
                <span>
                  {serverTokenAvailable || cleanClientToken
                    ? (isEn ? 'Authenticated Actions API Mode (5,000 req/hr)' : 'PAT 인증 모드 활성 (5,000 req/hr)')
                    : (isEn ? 'Public Actions Telemetry Mode (60 req/hr)' : '공개 Actions API 모드 (60 req/hr)')}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
