import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  Link2,
  Search,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import { LinkRepairProposal } from '../types';

interface BrokenIssueEntry {
  id: string;
  code: string;
  title: string;
  category: string;
  sourceUrls: string[];
  brokenLinks: string[];
  lastLinkCheckAt: string | null;
}

interface LinkSummary {
  totalIssuesWithLinks: number;
  checkedIssuesCount: number;
  brokenIssuesCount: number;
  brokenUrlsCount: number;
  pendingProposalsCount: number;
  approvedProposalsCount: number;
}

interface LinkRepairWorkbenchProps {
  language: 'ko' | 'en';
  getAuthHeaders: () => Promise<Record<string, string>>;
  onLinksRepaired?: () => void;
}

export const LinkRepairWorkbench: React.FC<LinkRepairWorkbenchProps> = ({
  language,
  getAuthHeaders,
  onLinksRepaired
}) => {
  const isEn = language === 'en';
  const [summary, setSummary] = useState<LinkSummary | null>(null);
  const [brokenIssues, setBrokenIssues] = useState<BrokenIssueEntry[]>([]);
  const [proposals, setProposals] = useState<LinkRepairProposal[]>([]);
  const [filterMode, setFilterMode] = useState<'pending' | 'broken' | 'approved' | 'all'>('pending');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isProposing, setIsProposing] = useState<boolean>(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [editingOverrides, setEditingOverrides] = useState<Record<string, string>>({});
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  const loadWorkbench = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/links/proposals', { headers });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setSummary(data.summary);
      setBrokenIssues(Array.isArray(data.brokenIssues) ? data.brokenIssues : []);
      setProposals(Array.isArray(data.proposals) ? data.proposals : []);
    } catch (err: any) {
      setStatusNotice({ type: 'error', text: err?.message || '링크 교정 워크벤치 조회 실패' });
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void loadWorkbench();
  }, [loadWorkbench]);

  const handleScanLinks = async () => {
    setIsScanning(true);
    setStatusNotice(null);
    try {
      const headers = { ...(await getAuthHeaders()), 'Content-Type': 'application/json' };
      const res = await fetch('/api/admin/links/scan', {
        method: 'POST',
        headers,
        body: JSON.stringify({ limit: 40 })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setStatusNotice({
        type: data.brokenUrlsFound > 0 ? 'warning' : 'success',
        text: isEn
          ? `Scanned ${data.checkedIssuesCount} issues: ${data.brokenIssuesFound} issues (${data.brokenUrlsFound} URLs) flagged as unreachable.`
          : `문서 ${data.checkedIssuesCount}건 점검 완료 · 깨진 문서 ${data.brokenIssuesFound}건 (URL ${data.brokenUrlsFound}건) 검출`
      });
      await loadWorkbench();
    } catch (err: any) {
      setStatusNotice({ type: 'error', text: err?.message || '링크 스캔 실패' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleDiscoverRepairs = async (issueId?: string) => {
    setIsProposing(true);
    setStatusNotice(null);
    try {
      const headers = { ...(await getAuthHeaders()), 'Content-Type': 'application/json' };
      const res = await fetch('/api/admin/links/propose-repairs', {
        method: 'POST',
        headers,
        body: JSON.stringify({ maxUrls: 6, ...(issueId ? { issueId } : {}) })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setStatusNotice({
        type: data.createdCount > 0 ? 'success' : 'warning',
        text: isEn
          ? `Processed ${data.processedCount} broken URL(s): ${data.createdCount} official Microsoft replacement(s) verified with HTTP 200.`
          : `대상 ${data.processedCount}건 탐색 완료 · HTTP 200 도달 검증된 공식 Microsoft URL ${data.createdCount}건 제안 생성`
      });
      await loadWorkbench();
    } catch (err: any) {
      setStatusNotice({ type: 'error', text: err?.message || '공식 URL 탐색 실패' });
    } finally {
      setIsProposing(false);
    }
  };

  const handleApplyProposal = async (
    proposalId: string | null,
    action: 'approve' | 'reject',
    approveAllPending = false
  ) => {
    setApplyingId(approveAllPending ? 'ALL' : proposalId);
    setStatusNotice(null);
    try {
      const headers = { ...(await getAuthHeaders()), 'Content-Type': 'application/json' };
      const overrideUrl = proposalId ? editingOverrides[proposalId]?.trim() : undefined;
      const res = await fetch('/api/admin/links/apply', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          proposalId,
          action,
          approveAllPending,
          ...(overrideUrl ? { overrideUrl } : {})
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setStatusNotice({
        type: 'success',
        text: action === 'reject'
          ? (isEn ? `Rejected ${data.rejectedCount} proposal(s).` : `제안 ${data.rejectedCount}건 보류 처리했습니다.`)
          : (isEn ? `Applied ${data.appliedCount} official Microsoft URL(s) to knowledge base.` : `공식 Microsoft 참고 URL ${data.appliedCount}건을 지식베이스에 반영했습니다.`)
      });
      await loadWorkbench();
      if (action === 'approve' && data.appliedCount > 0) {
        onLinksRepaired?.();
      }
    } catch (err: any) {
      setStatusNotice({ type: 'error', text: err?.message || '교정 적용 실패' });
    } finally {
      setApplyingId(null);
    }
  };

  const filteredProposals = useMemo(() => {
    if (filterMode === 'pending') return proposals.filter((p) => p.status === 'pending');
    if (filterMode === 'approved') return proposals.filter((p) => p.status === 'approved');
    return proposals;
  }, [proposals, filterMode]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5">
      {/* Header & Primary Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {isEn ? 'Broken Link Detector & Official Microsoft URL Repair' : '깨진 참고 링크 자동 탐지 & 공식 Microsoft URL 교정 워크벤치'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEn
              ? 'Verifies broken external references, searches canonical Microsoft Learn/Support docs via Search Grounding, and validates HTTP 200 reachability before applying.'
              : '도달 불가(404/만료) 링크를 탐지한 뒤 Google Search Grounding과 서버 HTTP 200 이중 검증을 거친 공식 Microsoft 문서 URL 교정을 제안합니다.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isScanning}
            onClick={() => void handleScanLinks()}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Search className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? (isEn ? 'Scanning...' : '링크 스캔 중...') : (isEn ? 'Scan Links (40)' : '링크 순환 스캔 (40건)')}</span>
          </button>

          <button
            type="button"
            disabled={isProposing || brokenIssues.length === 0}
            onClick={() => void handleDiscoverRepairs()}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isProposing ? 'animate-spin' : ''}`} />
            <span>{isProposing ? (isEn ? 'Finding MS Docs...' : '공식 URL 탐색 중...') : (isEn ? 'AI Find Official URLs' : 'AI 공식 URL 자동 탐색')}</span>
          </button>

          {(summary?.pendingProposalsCount || 0) > 0 && (
            <button
              type="button"
              disabled={applyingId !== null}
              onClick={() => void handleApplyProposal(null, 'approve', true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEn ? `Approve All (${summary?.pendingProposalsCount})` : `대기 제안 일괄 승인 (${summary?.pendingProposalsCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{isEn ? 'Checked Docs' : '점검 완료 문서'}</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {summary.checkedIssuesCount} / {summary.totalIssuesWithLinks}
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{isEn ? 'Broken URLs' : '검출된 깨진 링크'}</div>
            <div className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${summary.brokenUrlsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {summary.brokenUrlsCount}
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{isEn ? 'Pending Proposals' : '승인 대기 교정안'}</div>
            <div className="text-lg font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
              {summary.pendingProposalsCount}
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{isEn ? 'Repaired Total' : '교정 반영 누적'}</div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary.approvedProposalsCount}
            </div>
          </div>
        </div>
      )}

      {statusNotice && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            statusNotice.type === 'success'
              ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
              : statusNotice.type === 'warning'
                ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                : 'border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300'
          }`}
        >
          {statusNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : statusNotice.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusNotice.text}</span>
        </div>
      )}

      {/* Filter Switch */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'pending', labelKo: `승인 대기 (${summary?.pendingProposalsCount ?? 0})`, labelEn: `Pending (${summary?.pendingProposalsCount ?? 0})` },
          { id: 'broken', labelKo: `깨진 링크 이슈 (${brokenIssues.length})`, labelEn: `Broken Issues (${brokenIssues.length})` },
          { id: 'approved', labelKo: `반영 완료 (${summary?.approvedProposalsCount ?? 0})`, labelEn: `Approved (${summary?.approvedProposalsCount ?? 0})` },
          { id: 'all', labelKo: '전체 제안', labelEn: 'All Proposals' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterMode(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterMode === tab.id
                ? 'bg-slate-900 dark:bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isEn ? tab.labelEn : tab.labelKo}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : filterMode === 'broken' ? (
        brokenIssues.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            {isEn ? 'All inspected reference links are healthy and reachable.' : '현재 점검된 이슈 중 깨진 참고 링크가 0건입니다.'}
          </div>
        ) : (
          <div className="space-y-3">
            {brokenIssues.map((issue) => (
              <div key={issue.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    <span className="font-mono text-blue-600 dark:text-blue-400 mr-2">{issue.code}</span>
                    {issue.title}
                  </div>
                  <button
                    type="button"
                    disabled={isProposing}
                    onClick={() => void handleDiscoverRepairs(issue.id)}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold cursor-pointer shrink-0"
                  >
                    {isEn ? 'Find Replacement' : '대체 URL 탐색'}
                  </button>
                </div>
                <div className="space-y-1">
                  {issue.brokenLinks.map((bUrl) => (
                    <div key={bUrl} className="text-[11px] font-mono text-rose-600 dark:text-rose-400 break-all">
                      [BROKEN] {bUrl}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredProposals.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
          {isEn
            ? 'No repair proposals in this view. Click "Scan Links" and "AI Find Official URLs" to detect and heal broken references.'
            : '표시할 교정 제안이 없습니다. 상단의 "링크 순환 스캔" 후 "AI 공식 URL 자동 탐색"으로 깨진 링크 교정안을 생성하세요.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProposals.map((prop) => {
            const overrideVal = editingOverrides[prop.id] ?? prop.proposedUrl;
            const isPending = prop.status === 'pending';
            return (
              <div
                key={prop.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    <span className="font-mono text-blue-600 dark:text-blue-400 mr-2">{prop.issueCode || prop.issueId}</span>
                    {prop.issueTitle}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      HTTP {prop.verifiedHttpStatus || 200} · {prop.groundingDomain}
                    </span>
                    <span>·</span>
                    <span className={prop.status === 'approved' ? 'text-emerald-600' : prop.status === 'rejected' ? 'text-slate-400' : 'text-amber-600'}>
                      {prop.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Before vs After Diff */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20">
                    <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 mb-1">
                      {isEn ? 'Broken Original URL' : '기존 깨진 참고 URL'} ({prop.originalHttpStatus || 'Unreachable'})
                    </div>
                    <div className="font-mono text-[11px] text-rose-800 dark:text-rose-200 break-all">
                      {prop.originalUrl}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        {isEn ? 'Verified Microsoft Replacement' : '검증된 공식 Microsoft URL'}
                      </span>
                      <a
                        href={overrideVal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Check</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {isPending ? (
                      <input
                        type="url"
                        value={overrideVal}
                        onChange={(e) => setEditingOverrides((prev) => ({ ...prev, [prop.id]: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 font-mono text-[11px] text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <div className="font-mono text-[11px] text-emerald-900 dark:text-emerald-200 break-all">
                        {prop.proposedUrl}
                      </div>
                    )}
                    {prop.reason && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">{prop.reason}</p>
                    )}
                  </div>
                </div>

                {isPending && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={applyingId !== null}
                      onClick={() => void handleApplyProposal(prop.id, 'reject')}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Reject' : '보류'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={applyingId !== null}
                      onClick={() => void handleApplyProposal(prop.id, 'approve')}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Approve & Update Issue' : '승인 및 이슈 URL 교체'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
