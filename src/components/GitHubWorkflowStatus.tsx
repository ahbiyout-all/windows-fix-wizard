import React, { useState, useEffect, useCallback } from 'react';
import { 
  Github, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Clock, 
  ExternalLink,
  Activity,
  AlertTriangle,
  Play
} from 'lucide-react';

interface GitHubWorkflowStatusProps {
  owner: string;
  repo: string;
  workflowFile: string;
  language: 'ko' | 'en';
  title?: string;
  className?: string;
}

interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  run_number: number;
}

export const GitHubWorkflowStatus: React.FC<GitHubWorkflowStatusProps> = ({
  owner,
  repo,
  workflowFile,
  language,
  title,
  className = ''
}) => {
  const [lastRun, setLastRun] = useState<WorkflowRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!owner || !repo || !workflowFile) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Use the workflow file name to get runs
      const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/runs?per_page=1`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(language === 'en' ? 'Workflow or Repo not found' : '워크플로 또는 저장소를 찾을 수 없습니다.');
        }
        if (res.status === 403) {
          throw new Error(language === 'en' ? 'GitHub API rate limit exceeded' : 'GitHub API 호출 한도를 초과했습니다.');
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.workflow_runs && data.workflow_runs.length > 0) {
        setLastRun(data.workflow_runs[0]);
      } else {
        setLastRun(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch GitHub workflow status:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo, workflowFile, language]);

  useEffect(() => {
    fetchStatus();
    // Refresh every 5 minutes if tab is active
    const interval = setInterval(fetchStatus, 300000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const getStatusColor = () => {
    if (isLoading && !lastRun) return 'text-slate-400';
    if (error) return 'text-rose-500';
    if (!lastRun) return 'text-slate-400';

    if (lastRun.status === 'completed') {
      return lastRun.conclusion === 'success' ? 'text-emerald-500' : 'text-rose-500';
    }
    return 'text-blue-500'; // in_progress, queued, etc.
  };

  const getStatusBg = () => {
    if (isLoading && !lastRun) return 'bg-slate-100 dark:bg-slate-800';
    if (error) return 'bg-rose-50 dark:bg-rose-950/30';
    if (!lastRun) return 'bg-slate-100 dark:bg-slate-800';

    if (lastRun.status === 'completed') {
      return lastRun.conclusion === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30';
    }
    return 'bg-blue-50 dark:bg-blue-950/30';
  };

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (error) return <AlertTriangle className="w-4 h-4" />;
    if (!lastRun) return <Activity className="w-4 h-4" />;

    if (lastRun.status === 'completed') {
      return lastRun.conclusion === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />;
    }
    return <Play className="w-4 h-4 animate-pulse" />;
  };

  return (
    <div className={`p-4 rounded-xl border transition-all ${getStatusBg()} ${error ? 'border-rose-200 dark:border-rose-800' : 'border-slate-200 dark:border-slate-700'} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Github className={`w-4 h-4 ${getStatusColor()}`} />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
            {title || workflowFile}
          </span>
        </div>
        <button 
          onClick={fetchStatus} 
          disabled={isLoading}
          className="p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded transition-colors"
          title={language === 'en' ? 'Refresh Status' : '상태 갱신'}
        >
          <RefreshCw className={`w-3 h-3 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className={`flex items-center gap-1.5 text-[11px] font-bold ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="uppercase">
              {isLoading ? (language === 'en' ? 'Updating...' : '갱신 중...') : 
               error ? (language === 'en' ? 'Error' : '오류') :
               !lastRun ? (language === 'en' ? 'No Runs' : '실행 기록 없음') :
               lastRun.status === 'completed' ? (lastRun.conclusion === 'success' ? 'Success' : 'Failed') :
               lastRun.status.replace('_', ' ')}
            </span>
          </div>
          {lastRun && (
            <span className="text-[10px] font-mono text-slate-500">
              #{lastRun.run_number}
            </span>
          )}
        </div>

        {lastRun && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3" />
              <span>
                {new Date(lastRun.created_at).toLocaleString(language === 'en' ? 'en-US' : 'ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <a 
              href={lastRun.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1 font-medium"
            >
              <span>{language === 'en' ? 'View Run Log' : '로그 상세 보기'}</span>
              <ExternalLink className="w-2.5 h-3" />
            </a>
          </div>
        )}

        {error && (
          <p className="text-[10px] text-rose-600 dark:text-rose-400 leading-tight">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
