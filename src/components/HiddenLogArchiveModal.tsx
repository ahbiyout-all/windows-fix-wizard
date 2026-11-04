import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Download, 
  Trash2, 
  Clock, 
  HardDrive, 
  FileCheck, 
  Sparkles, 
  RefreshCw, 
  X, 
  ShieldCheck, 
  Layers, 
  AlertCircle,
  Database,
  Lock,
  ArrowDownToLine,
  CheckCircle2
} from 'lucide-react';
import { 
  HiddenLogArchiveMeta, 
  getHiddenArchiveList, 
  downloadHiddenArchive, 
  deleteHiddenArchive, 
  clearAllHiddenArchives 
} from '../utils/logArchiveManager';

interface HiddenLogArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'ko' | 'en';
  onTriggerArchiveNow?: () => Promise<void>;
  isArchivingNow?: boolean;
}

export const HiddenLogArchiveModal: React.FC<HiddenLogArchiveModalProps> = ({
  isOpen,
  onClose,
  language,
  onTriggerArchiveNow,
  isArchivingNow = false
}) => {
  const [archives, setArchives] = useState<HiddenLogArchiveMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadArchives = async () => {
    setIsLoading(true);
    try {
      const list = await getHiddenArchiveList();
      setArchives(list);
    } catch (e) {
      console.warn('Failed to load hidden archives:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadArchives();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const ok = await downloadHiddenArchive(id);
      if (ok) {
        setStatusMessage(language === 'en' ? 'ZIP Archive downloaded successfully!' : 'ZIP 아카이브가 성공적으로 다운로드되었습니다!');
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'en' ? 'Delete this hidden archive permanently?' : '이 은닉 압축 아카이브를 브라우저에서 영구 삭제하시겠습니까?')) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteHiddenArchive(id);
      await loadArchives();
      setStatusMessage(language === 'en' ? 'Archive deleted.' : '아카이브가 삭제되었습니다.');
      setTimeout(() => setStatusMessage(null), 2500);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (archives.length === 0) return;
    if (!window.confirm(language === 'en' ? 'Delete ALL hidden browser archives? This cannot be undone.' : '모든 브라우저 은닉 아카이브를 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    setIsLoading(true);
    try {
      await clearAllHiddenArchives();
      await loadArchives();
      setStatusMessage(language === 'en' ? 'All hidden archives cleared.' : '모든 은닉 아카이브가 정리되었습니다.');
      setTimeout(() => setStatusMessage(null), 2500);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const totalOriginalBytes = archives.reduce((sum, a) => sum + (a.originalSizeBytes || 0), 0);
  const totalCompressedBytes = archives.reduce((sum, a) => sum + (a.compressedSizeBytes || 0), 0);
  const totalRecordsPreserved = archives.reduce((sum, a) => sum + (a.totalArchivedRecords || 0), 0);
  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalCompressedBytes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {language === 'en' ? 'Hidden In-Browser ZIP Archive Vault' : '브라우저 은닉 ZIP 압축 아카이브 보관함'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  IndexedDB
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'en' 
                  ? 'Obsolete logs (>30 days) are safely compressed into high-ratio ZIP binaries before deletion to save storage and optimize memory.' 
                  : '30일 이상 경과된 오래된 로그를 삭제 전 고압축 ZIP 바이너리로 브라우저에 안전하게 은닉 보관하여 스토리지 절약 및 렌더링 성능을 극대화합니다.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message Notification */}
        {statusMessage && (
          <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Top KPI Metrics Bar */}
        <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {language === 'en' ? 'Archived ZIP Packages' : '보관된 ZIP 패키지'}
            </span>
            <span className="text-xl font-mono font-black text-slate-800 dark:text-slate-100 mt-1 block">
              {archives.length} <span className="text-xs font-normal text-slate-400">개</span>
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {language === 'en' ? 'Compressed Vault Size' : '실제 압축 저장 용량'}
            </span>
            <span className="text-xl font-mono font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
              {formatBytes(totalCompressedBytes)}
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {language === 'en' ? 'Storage Saved (Ratio)' : '절감된 스토리지 (압축률)'}
            </span>
            <span className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {formatBytes(totalSavedBytes)}
              <span className="text-xs font-bold text-emerald-500 ml-1">
                ({totalOriginalBytes > 0 ? (((totalSavedBytes / totalOriginalBytes) * 100).toFixed(0)) : 0}%)
              </span>
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {language === 'en' ? 'Safeguarded Records' : '보호된 로그 레코드'}
            </span>
            <span className="text-xl font-mono font-black text-amber-600 dark:text-amber-400 mt-1 block">
              {totalRecordsPreserved.toLocaleString()} <span className="text-xs font-normal text-slate-400">건</span>
            </span>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            {onTriggerArchiveNow && (
              <button
                onClick={async () => {
                  await onTriggerArchiveNow();
                  await loadArchives();
                }}
                disabled={isArchivingNow}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isArchivingNow ? 'animate-spin' : ''}`} />
                <span>
                  {isArchivingNow 
                    ? (language === 'en' ? 'Compressing Logs...' : '로그 압축 보관 진행 중...') 
                    : (language === 'en' ? 'Compress >30d Logs Now' : '⚡ 30일 경과 로그 지금 즉시 압축 보관')}
                </span>
              </button>
            )}

            <button
              onClick={loadArchives}
              disabled={isLoading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{language === 'en' ? 'Refresh' : '새로고침'}</span>
            </button>
          </div>

          {archives.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Clear Entire Vault' : '보관함 전체 비우기'}</span>
            </button>
          )}
        </div>

        {/* Archives List View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {isLoading && archives.length === 0 ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
              <p className="text-xs text-slate-400">{language === 'en' ? 'Reading IndexedDB hidden archives...' : '브라우저 IndexedDB 은닉 보관소를 탐색 중입니다...'}</p>
            </div>
          ) : archives.length === 0 ? (
            <div className="py-16 text-center px-4">
              <Archive className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3 stroke-[1.5]" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {language === 'en' ? 'No Hidden Archives Yet' : '현재 저장된 은닉 압축 아카이브가 없습니다.'}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                {language === 'en'
                  ? 'When logs older than 30 days are pruned or cleared, a high-ratio ZIP snapshot is automatically archived here in browser IndexedDB before deletion.'
                  : '30일 이상 경과된 로그를 정리하거나 삭제할 때, 삭제 직전의 고압축 ZIP 스냅샷이 이 보관함에 안전하게 자동 저장됩니다.'}
              </p>
              {onTriggerArchiveNow && (
                <button
                  onClick={async () => {
                    await onTriggerArchiveNow();
                    await loadArchives();
                  }}
                  disabled={isArchivingNow}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Run 30-Day Compression Now' : '30일 경과 로그 지금 압축 보관 실행'}</span>
                </button>
              )}
            </div>
          ) : (
            archives.map((archive) => {
              const counts = archive.recordCounts || {
                visitor: 0,
                search: 0,
                feedback: 0,
                admin: 0,
                error: 0,
                backend: 0
              };

              return (
                <div 
                  key={archive.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                        {archive.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                        {archive.compressionRatio} {language === 'en' ? 'saved' : '용량 절감'}
                      </span>
                      {archive.isAutomaticPrune && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
                          {language === 'en' ? 'Auto-Prune' : '자동 정돈 전 보존'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(archive.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'ko-KR')}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <HardDrive className="w-3 h-3 text-slate-400" />
                        {formatBytes(archive.compressedSizeBytes)} <span className="text-[10px] text-slate-400">(원본 {formatBytes(archive.originalSizeBytes)})</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <FileCheck className="w-3 h-3 text-indigo-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{archive.totalArchivedRecords.toLocaleString()}</span>건 보존
                      </span>
                    </div>

                    {/* Breakdown Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {counts.visitor > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-medium">
                          방문자 {counts.visitor}
                        </span>
                      )}
                      {counts.search > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium">
                          검색 {counts.search}
                        </span>
                      )}
                      {counts.feedback > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium">
                          피드백 {counts.feedback}
                        </span>
                      )}
                      {counts.admin > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-medium">
                          관리자 {counts.admin}
                        </span>
                      )}
                      {counts.error > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium">
                          에러 {counts.error}
                        </span>
                      )}
                      {counts.backend > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                          백엔드 {counts.backend}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Item Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => handleDownload(archive.id)}
                      disabled={downloadingId === archive.id}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title={language === 'en' ? 'Download ZIP Archive' : 'ZIP 아카이브 다운로드'}
                    >
                      <ArrowDownToLine className={`w-3.5 h-3.5 ${downloadingId === archive.id ? 'animate-bounce' : ''}`} />
                      <span>{downloadingId === archive.id ? (language === 'en' ? 'Downloading...' : '다운로드 중...') : (language === 'en' ? 'Download ZIP' : 'ZIP 다운로드')}</span>
                    </button>

                    <button
                      onClick={() => handleDelete(archive.id)}
                      disabled={deletingId === archive.id}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title={language === 'en' ? 'Delete from browser' : '브라우저에서 영구 삭제'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>{language === 'en' ? 'Zero Cloud Quota: Secure Client-Side IndexedDB Compression' : '제로 클라우드 쿼터: 브라우저 IndexedDB 100% 클라이언트 암호화 압축'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            {language === 'en' ? 'Close' : '닫기'}
          </button>
        </div>
      </div>
    </div>
  );
};
