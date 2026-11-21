import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ShieldCheck,
  Key,
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  Trash2,
  Sparkles,
  Lock,
  Save,
  HardDrive
} from 'lucide-react';

export interface BackupPolicyState {
  dailySnapshotEnabled: boolean;
  dailySnapshotRetentionDays: number;
  dailySnapshotHourKst: number;
  dailySnapshotPrefix: string;
  lkgRetentionCount: number;
  storedLkgSnapshotsCount: number;
  logRetentionMonths: number;
  keyGeneration: number;
  lastKeyRotationAt: string | null;
  lastDailySnapshotDate: string | null;
  lastDailySnapshotAt: string | null;
  lastDailySnapshotStatus: string | null;
  repo: string;
  branch: string;
  hasToken: boolean;
  hasEncryptionKey: boolean;
}

interface LocalRecoveryBundle {
  membersVault: Record<string, any>;
  systemVault: Record<string, any>;
  securityVault: Record<string, any>;
}

interface AdminBackupPolicyModalProps {
  isOpen: boolean;
  initialTab?: 'retention' | 'emergency-key';
  language: 'ko' | 'en';
  onClose: () => void;
  onPolicyUpdated?: () => void;
}

const DEFAULT_POLICY: BackupPolicyState = {
  dailySnapshotEnabled: true,
  dailySnapshotRetentionDays: 14,
  dailySnapshotHourKst: 3,
  dailySnapshotPrefix: 'backups/daily',
  lkgRetentionCount: 7,
  storedLkgSnapshotsCount: 0,
  logRetentionMonths: 1,
  keyGeneration: 1,
  lastKeyRotationAt: null,
  lastDailySnapshotDate: null,
  lastDailySnapshotAt: null,
  lastDailySnapshotStatus: null,
  repo: 'AhBiYout-all/windows-fix-wizard-admin',
  branch: 'main',
  hasToken: false,
  hasEncryptionKey: false
};

export const AdminBackupPolicyModal: React.FC<AdminBackupPolicyModalProps> = ({
  isOpen,
  initialTab = 'retention',
  language,
  onClose,
  onPolicyUpdated
}) => {
  const isEn = language === 'en';
  const isMountedRef = useRef(true);

  const [activeTab, setActiveTab] = useState<'retention' | 'emergency-key'>(initialTab);
  const [policy, setPolicy] = useState<BackupPolicyState>(DEFAULT_POLICY);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Retention form state
  const [dailyEnabled, setDailyEnabled] = useState(true);
  const [dailyRetentionDays, setDailyRetentionDays] = useState(14);
  const [dailyHourKst, setDailyHourKst] = useState(3);
  const [lkgRetentionCount, setLkgRetentionCount] = useState(7);
  const [logRetentionMonths, setLogRetentionMonths] = useState(1);

  // Emergency key rotation form state
  const [currentPassphrase, setCurrentPassphrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmNewPassphrase, setConfirmNewPassphrase] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [localOnlyRotation, setLocalOnlyRotation] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [copiedNewKey, setCopiedNewKey] = useState(false);
  const [recoveryBundle, setRecoveryBundle] = useState<{
    keyGeneration: number;
    rotatedAt: string;
    bundle: LocalRecoveryBundle;
  } | null>(null);

  const getAuthHeader = (): Record<string, string> => {
    try {
      const rawToken = localStorage.getItem('winfix_admin_token') || sessionStorage.getItem('winfix_admin_token');
      const token = rawToken && rawToken !== 'local-admin-token' ? rawToken.trim() : '';
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    } catch (_) {}
    return {};
  };

  const notifySync = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('winfix-private-vault-updated'));
    }
    onPolicyUpdated?.();
  };

  const applyLoadedPolicy = useCallback((loaded: BackupPolicyState) => {
    setPolicy(loaded);
    setDailyEnabled(loaded.dailySnapshotEnabled !== false);
    setDailyRetentionDays(Number(loaded.dailySnapshotRetentionDays) || 14);
    setDailyHourKst(Number.isFinite(Number(loaded.dailySnapshotHourKst)) ? Number(loaded.dailySnapshotHourKst) : 3);
    setLkgRetentionCount(Number(loaded.lkgRetentionCount) || 7);
    setLogRetentionMonths(Number.isFinite(Number(loaded.logRetentionMonths)) ? Number(loaded.logRetentionMonths) : 1);
    setLocalOnlyRotation(!loaded.hasToken);
  }, []);

  const fetchPolicy = useCallback(async () => {
    setLoading(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/backup-policy', { headers: getAuthHeader() });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (res.ok && data.success && data.policy) {
        applyLoadedPolicy(data.policy);
      } else {
        setStatusBanner({
          text: data?.error || (isEn ? 'Failed to load backup policy.' : '백업 보존 정책을 불러오지 못했습니다.'),
          type: 'error'
        });
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setStatusBanner({
          text: err?.message || (isEn ? 'Network error loading policy.' : '정책 조회 중 네트워크 오류가 발생했습니다.'),
          type: 'error'
        });
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [applyLoadedPolicy, isEn]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setStatusBanner(null);
      setAcknowledged(false);
      fetchPolicy();
    }
  }, [isOpen, initialTab, fetchPolicy]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && busyAction === null) {
        onClose();
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, busyAction, onClose]);

  if (!isOpen) return null;

  const handleSaveRetentionPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusBanner(null);

    if (!Number.isInteger(dailyRetentionDays) || dailyRetentionDays < 1 || dailyRetentionDays > 90) {
      setStatusBanner({
        text: isEn ? 'Private daily snapshot retention must be between 1 and 90 days.' : '비공개 일별 스냅샷 보존 일수는 1~90일 사이의 정수여야 합니다.',
        type: 'error'
      });
      return;
    }
    if (!Number.isInteger(dailyHourKst) || dailyHourKst < 0 || dailyHourKst > 23) {
      setStatusBanner({
        text: isEn ? 'Daily snapshot hour (KST) must be between 0 and 23.' : '일별 스냅샷 실행 시각(KST)은 0~23시 사이여야 합니다.',
        type: 'error'
      });
      return;
    }
    if (!Number.isInteger(lkgRetentionCount) || lkgRetentionCount < 1 || lkgRetentionCount > 50) {
      setStatusBanner({
        text: isEn ? 'Local LKG snapshot retention count must be between 1 and 50.' : '로컬 LKG 스냅샷 보존 개수는 1~50개 사이여야 합니다.',
        type: 'error'
      });
      return;
    }
    if (!Number.isInteger(logRetentionMonths) || logRetentionMonths < 0 || logRetentionMonths > 36) {
      setStatusBanner({
        text: isEn ? 'Audit log retention months must be between 0 and 36.' : '감사 로그 보존 개월 수는 0~36개월 사이여야 합니다.',
        type: 'error'
      });
      return;
    }

    setBusyAction('save-policy');
    try {
      const res = await fetch('/api/admin/backup-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          dailySnapshotEnabled: dailyEnabled,
          dailySnapshotRetentionDays: dailyRetentionDays,
          dailySnapshotHourKst: dailyHourKst,
          lkgRetentionCount,
          logRetentionMonths
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setStatusBanner({
          text: data?.error || (isEn ? 'Failed to save backup policy.' : '백업 보존 정책 저장에 실패했습니다.'),
          type: 'error'
        });
        return;
      }
      if (data.policy) applyLoadedPolicy(data.policy);
      notifySync();
      setStatusBanner({
        text: isEn
          ? `Backup policy saved (${dailyRetentionDays}d private snapshots · ${lkgRetentionCount} local LKG · ${logRetentionMonths === 0 ? 'unlimited' : `${logRetentionMonths}mo`} logs).`
          : `백업 보존 정책을 저장했습니다 (비공개 스냅샷 ${dailyRetentionDays}일 · 로컬 LKG ${lkgRetentionCount}개 · 로그 ${logRetentionMonths === 0 ? '무제한' : `${logRetentionMonths}개월`}).`,
        type: 'success'
      });
    } catch (err: any) {
      if (isMountedRef.current) {
        setStatusBanner({
          text: err?.message || (isEn ? 'Error saving retention policy.' : '정책 저장 요청 오류'),
          type: 'error'
        });
      }
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handlePruneLkgNow = async () => {
    setBusyAction('purge-lkg');
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/last-known-good/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ maxRetention: lkgRetentionCount })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setStatusBanner({
          text: data?.error || (isEn ? 'Failed to prune expired snapshots.' : '오래된 로컬 스냅샷 정리에 실패했습니다.'),
          type: 'error'
        });
        return;
      }
      await fetchPolicy();
      notifySync();
      setStatusBanner({
        text: isEn
          ? `Pruned ${data.purgedCount ?? 0} expired local LKG snapshot(s). ${data.remainingCount ?? 0} remaining.`
          : `보존 한도(${lkgRetentionCount}개) 초과 스냅샷 ${data.purgedCount ?? 0}건을 정리했습니다 (남은 개수: ${data.remainingCount ?? 0}개).`,
        type: 'success'
      });
    } catch (err: any) {
      if (isMountedRef.current) {
        setStatusBanner({ text: err?.message || (isEn ? 'Purge error.' : '스냅샷 정리 오류'), type: 'error' });
      }
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handleGenerateStrongKey = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_';
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    const generated = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
    setNewPassphrase(generated);
    setConfirmNewPassphrase(generated);
    setShowSecrets(true);
    setCopiedNewKey(false);
  };

  const handleCopyNewKey = async () => {
    if (!newPassphrase.trim()) return;
    try {
      await navigator.clipboard.writeText(newPassphrase.trim());
      setCopiedNewKey(true);
      setTimeout(() => {
        if (isMountedRef.current) setCopiedNewKey(false);
      }, 1800);
    } catch (_) {}
  };

  const downloadEncryptedVaultFile = (filename: string, vaultData: Record<string, any>) => {
    const blob = new Blob([JSON.stringify(vaultData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadAllBundle = () => {
    if (!recoveryBundle) return;
    const gen = recoveryBundle.keyGeneration;
    downloadEncryptedVaultFile(`winfix-admin-vault-gen${gen}.enc.json`, recoveryBundle.bundle.membersVault);
    setTimeout(() => {
      downloadEncryptedVaultFile(`winfix-system-vault-gen${gen}.enc.json`, recoveryBundle.bundle.systemVault);
    }, 150);
    setTimeout(() => {
      downloadEncryptedVaultFile(`winfix-security-vault-gen${gen}.enc.json`, recoveryBundle.bundle.securityVault);
    }, 300);
  };

  const handleEmergencyRotateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusBanner(null);

    const trimmedNew = newPassphrase.trim();
    const trimmedConfirm = confirmNewPassphrase.trim();
    const trimmedCurrent = currentPassphrase.trim();

    if (!policy.hasEncryptionKey && trimmedCurrent.length < 8) {
      setStatusBanner({
        text: isEn ? 'Enter the current AES-256 key (at least 8 characters).' : '기존 AES-256 암호화 키(8자 이상)를 입력해 주세요.',
        type: 'error'
      });
      return;
    }
    if (trimmedNew.length < 8 || trimmedNew.length > 256) {
      setStatusBanner({
        text: isEn ? 'New AES-256 key must be 8 to 256 characters.' : '새 AES-256 암호화 키는 8자~256자로 입력해 주세요.',
        type: 'error'
      });
      return;
    }
    if (trimmedNew !== trimmedConfirm) {
      setStatusBanner({
        text: isEn ? 'New key confirmation does not match.' : '새 암호화 키 확인 입력이 일치하지 않습니다.',
        type: 'error'
      });
      return;
    }
    if (!acknowledged) {
      setStatusBanner({
        text: isEn
          ? 'Please confirm that you have safely stored the new key before rotating.'
          : '새 암호화 키를 안전한 곳에 백업했음을 확인 체크해 주세요.',
        type: 'error'
      });
      return;
    }

    setBusyAction('rotate-key');
    try {
      const res = await fetch('/api/admin/private-backup/rotate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          ...(trimmedCurrent ? { currentPassphrase: trimmedCurrent } : {}),
          newPassphrase: trimmedNew,
          localOnly: localOnlyRotation,
          ...(emergencyReason.trim() ? { emergencyReason: emergencyReason.trim() } : {})
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;

      if (!res.ok || !data.success) {
        setStatusBanner({
          text: data?.error || (isEn ? 'Emergency key rotation failed.' : 'AES-256 긴급 키 순환에 실패했습니다.'),
          type: 'error'
        });
        return;
      }

      if (data.mode === 'local-only' && data.localRecoveryBundle) {
        setRecoveryBundle({
          keyGeneration: Number(data.keyGeneration) || (policy.keyGeneration + 1),
          rotatedAt: data.rotatedAt || new Date().toISOString(),
          bundle: data.localRecoveryBundle
        });
      } else {
        setRecoveryBundle(null);
      }

      setCurrentPassphrase('');
      setNewPassphrase('');
      setConfirmNewPassphrase('');
      setEmergencyReason('');
      setAcknowledged(false);

      await fetchPolicy();
      notifySync();

      setStatusBanner({
        text: data.mode === 'local-only'
          ? (isEn
              ? `Offline emergency key rotation complete (Key Generation #${data.keyGeneration}). Download your re-encrypted .enc.json vaults below.`
              : `오프라인 긴급 키 순환 완료 (세대 #${data.keyGeneration}). 아래에서 재암호화된 3종 .enc.json 복구 파일을 즉시 내려받아 보관하세요.`)
          : (isEn
              ? `Emergency key rotation complete (Key Generation #${data.keyGeneration}). Member, system, and security vaults re-encrypted and pushed.`
              : `AES-256 긴급 키 순환 완료 (세대 #${data.keyGeneration}) · 회원/시스템/보안 금고 3종을 재암호화해 비공개 저장소에 커밋했습니다.`),
        type: 'success'
      });
    } catch (err: any) {
      if (isMountedRef.current) {
        setStatusBanner({
          text: err?.message || (isEn ? 'Key rotation network error.' : '키 순환 요청 중 네트워크 오류가 발생했습니다.'),
          type: 'error'
        });
      }
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && busyAction === null) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-backup-policy-title"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              <span className="truncate max-w-[240px]">{policy.repo}</span>
              <span aria-hidden="true">·</span>
              <span>{isEn ? `Key Gen #${policy.keyGeneration}` : `키 세대 #${policy.keyGeneration}`}</span>
              <span aria-hidden="true">·</span>
              <span>
                {isEn
                  ? `LKG ${policy.storedLkgSnapshotsCount}/${policy.lkgRetentionCount}`
                  : `LKG 보관 ${policy.storedLkgSnapshotsCount}/${policy.lkgRetentionCount}`}
              </span>
            </div>
            <h2
              id="admin-backup-policy-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{isEn ? 'Admin Backup Policy' : '관리자 백업 보존 · 긴급 키 정책'}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busyAction !== null}
            aria-label={isEn ? 'Close modal' : '모달 닫기'}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('retention');
                setStatusBanner(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'retention'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isEn ? 'Retention Periods' : '스냅샷 · 로그 보존 기간'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('emergency-key');
                setStatusBanner(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'emergency-key'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{isEn ? 'Emergency Key Rotation' : '긴급 암호화 키 순환'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {statusBanner && (
            <div
              role="status"
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                statusBanner.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : statusBanner.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
              }`}
            >
              {statusBanner.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusBanner.text}</span>
            </div>
          )}

          {loading ? (
            <div className="space-y-3 py-4">
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
          ) : activeTab === 'retention' ? (
            <form id="backup-retention-form" onSubmit={handleSaveRetentionPolicy} className="space-y-5">
              {/* Section 1: Private GitHub Vault Daily Snapshots */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {isEn ? 'Private Repository Daily Snapshots' : '비공개 저장소 일별 암호화 스냅샷 보존'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isEn
                        ? 'Controls how many days encrypted daily vault bundles remain in your private GitHub repository.'
                        : '비공개 저장소(backups/daily/YYYY-MM-DD)에 생성되는 통합 암호화 스냅샷의 자동 보관 일수입니다.'}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={dailyEnabled}
                      onChange={(e) => setDailyEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{isEn ? 'Daily Auto-Snapshot' : '일 1회 자동 실행'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="policy-daily-retention"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      {isEn ? 'Snapshot Retention (1–90 days)' : '일별 스냅샷 보관 일수 (1~90일)'}
                    </label>
                    <input
                      id="policy-daily-retention"
                      type="number"
                      min={1}
                      max={90}
                      value={dailyRetentionDays}
                      onChange={(e) => setDailyRetentionDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[7, 14, 30, 60, 90].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setDailyRetentionDays(days)}
                          className={`px-2 py-1 rounded text-[11px] font-mono tabular-nums border cursor-pointer transition-colors ${
                            dailyRetentionDays === days
                              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 font-bold'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {days}{isEn ? 'd' : '일'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="policy-daily-hour"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      {isEn ? 'Scheduled Run Hour (KST 0–23)' : '자동 생성 시각 (KST 0~23시)'}
                    </label>
                    <input
                      id="policy-daily-hour"
                      type="number"
                      min={0}
                      max={23}
                      disabled={!dailyEnabled}
                      value={dailyHourKst}
                      onChange={(e) => setDailyHourKst(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono tabular-nums">
                      {policy.lastDailySnapshotDate
                        ? (isEn ? `Last run: ${policy.lastDailySnapshotDate}` : `최근 스냅샷: ${policy.lastDailySnapshotDate}`)
                        : (isEn ? 'No remote daily snapshot yet' : '아직 원격 일별 스냅샷 이력 없음')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Local Server LKG Snapshots & Audit Log Retention */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>{isEn ? 'Local Server LKG & Audit Log Retention' : '로컬 서버 직전 복원점(LKG) · 로그 보존'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isEn
                        ? 'Caps local rollback snapshots created before restores and sets automatic pruning for historical logs.'
                        : '복원 전 서버에 자동 생성되는 직전 정상 스냅샷(LKG) 최대 개수와 과거 로그 보관 개월 수를 관리합니다.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handlePruneLkgNow}
                    disabled={busyAction !== null}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {busyAction === 'purge-lkg' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    <span>{isEn ? 'Prune Expired LKG Now' : '초과 LKG 즉시 정리'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="policy-lkg-count"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      {isEn ? 'Local LKG Snapshots Limit (1–50)' : '로컬 LKG 스냅샷 보존 개수 (1~50개)'}
                    </label>
                    <input
                      id="policy-lkg-count"
                      type="number"
                      min={1}
                      max={50}
                      value={lkgRetentionCount}
                      onChange={(e) => setLkgRetentionCount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[5, 7, 14, 30].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setLkgRetentionCount(cnt)}
                          className={`px-2 py-1 rounded text-[11px] font-mono tabular-nums border cursor-pointer transition-colors ${
                            lkgRetentionCount === cnt
                              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 font-bold'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {cnt}{isEn ? '' : '개'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="policy-log-months"
                      className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                    >
                      {isEn ? 'Audit Log Retention (0–36 months, 0 = forever)' : '감사 · 운영 로그 보관 기간 (0~36개월 · 0=영구)'}
                    </label>
                    <input
                      id="policy-log-months"
                      type="number"
                      min={0}
                      max={36}
                      value={logRetentionMonths}
                      onChange={(e) => setLogRetentionMonths(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono tabular-nums">
                      {isEn
                        ? `Stored on server: ${policy.storedLkgSnapshotsCount} LKG snapshots`
                        : `현재 서버 디스크 보관 LKG: ${policy.storedLkgSnapshotsCount}개`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plain-language safeguards summary */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {isEn ? 'Built-in Safeguards' : '자동 안전 보호 장치'}
                </p>
                <p>
                  {isEn
                    ? '• Every restore automatically captures a fresh pre-restore LKG snapshot with a SHA-256 checksum before overwriting local data.'
                    : '• 모든 복원 직전에 SHA-256 체크섬이 포함된 로컬 복원점(LKG)을 자동 저장하며, 초과 스냅샷만 오래된 순서대로 안전하게 정리합니다.'}
                </p>
              </div>
            </form>
          ) : (
            <form id="emergency-key-rotation-form" onSubmit={handleEmergencyRotateKey} className="space-y-4">
              {/* Overview bar */}
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>{isEn ? 'Manual Emergency AES-256-GCM Key Rotation' : '수동 긴급 AES-256-GCM 마스터 키 순환'}</span>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-amber-800 dark:text-amber-300">
                    {isEn ? `Active Gen #${policy.keyGeneration}` : `현재 활성 세대 #${policy.keyGeneration}`}
                    {policy.lastKeyRotationAt
                      ? ` · ${new Date(policy.lastKeyRotationAt).toLocaleDateString()}`
                      : ''}
                  </span>
                </div>
                <p className="text-xs text-amber-900/85 dark:text-amber-200/85 leading-relaxed">
                  {isEn
                    ? 'Use immediately if your master encryption key may be exposed or during scheduled key hygiene. All 3 active vaults (Members, System & AI Keys, Security Blocklist) are re-encrypted atomically with a new scrypt salt and 12-byte GCM IV.'
                    : '암호화 키 유출이 의심되거나 정기 보안 교체 시 즉시 사용하세요. 기존 키 검증 후 회원·시스템·보안 금고 3종을 새 scrypt 솔트와 12바이트 IV로 일괄 재암호화하고 키 세대 번호를 올립니다.'}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="rotate-current-key"
                      className="text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                    >
                      {isEn
                        ? `Current AES-256 Key ${policy.hasEncryptionKey ? '(leave blank to use saved server key)' : '(required)'}`
                        : `현재 AES-256 암호화 키 ${policy.hasEncryptionKey ? '(비워두면 서버 저장 키 자동 검증)' : '(필수 입력)'}`}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSecrets(s => !s)}
                      className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showSecrets ? (isEn ? 'Hide' : '숨기기') : (isEn ? 'Show' : '표시')}</span>
                    </button>
                  </div>
                  <input
                    id="rotate-current-key"
                    type={showSecrets ? 'text' : 'password'}
                    value={currentPassphrase}
                    onChange={(e) => setCurrentPassphrase(e.target.value)}
                    placeholder={
                      policy.hasEncryptionKey
                        ? '•••••••• (or enter explicitly to verify)'
                        : (isEn ? 'Enter current 8+ character encryption key' : '현재 사용 중인 8자 이상 암호화 키')
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <label
                      htmlFor="rotate-new-key"
                      className="text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                    >
                      {isEn ? 'New AES-256 Master Key (8–256 chars)' : '새 AES-256 마스터 키 (8자~256자)'}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateStrongKey}
                        className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{isEn ? 'Generate Strong 256-bit Key' : '강력한 무작위 키 생성'}</span>
                      </button>
                      {newPassphrase && (
                        <button
                          type="button"
                          onClick={handleCopyNewKey}
                          className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedNewKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedNewKey ? (isEn ? 'Copied' : '복사됨') : (isEn ? 'Copy' : '복사')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    id="rotate-new-key"
                    type={showSecrets ? 'text' : 'password'}
                    value={newPassphrase}
                    onChange={(e) => setNewPassphrase(e.target.value)}
                    placeholder={isEn ? 'Enter or generate a strong new key' : '새 암호화 키 입력 또는 무작위 생성'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex items-center justify-between mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    <span>
                      {isEn ? `Length: ${newPassphrase.trim().length} / 256` : `길이: ${newPassphrase.trim().length} / 256자`}
                    </span>
                    <span>
                      {newPassphrase.trim().length >= 24
                        ? (isEn ? 'High entropy' : '높은 보안 강도')
                        : newPassphrase.trim().length >= 8
                          ? (isEn ? 'Valid minimum' : '최소 기준 충족')
                          : (isEn ? 'Minimum 8 characters required' : '8자 이상 필요')}
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rotate-confirm-key"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                  >
                    {isEn ? 'Confirm New AES-256 Master Key' : '새 암호화 키 다시 입력 (확인)'}
                  </label>
                  <input
                    id="rotate-confirm-key"
                    type={showSecrets ? 'text' : 'password'}
                    value={confirmNewPassphrase}
                    onChange={(e) => setConfirmNewPassphrase(e.target.value)}
                    placeholder={isEn ? 'Re-enter new key to confirm' : '새 키 한 번 더 입력'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="rotate-emergency-reason"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                  >
                    {isEn ? 'Audit Log Note / Reason (Optional)' : '관리자 감사 로그 메모 / 긴급 교체 사유 (선택)'}
                  </label>
                  <input
                    id="rotate-emergency-reason"
                    type="text"
                    maxLength={160}
                    value={emergencyReason}
                    onChange={(e) => setEmergencyReason(e.target.value)}
                    placeholder={isEn ? 'e.g. Scheduled rotation or suspected exposure' : '예: 정기 마스터 키 교체 또는 자격 증명 노출 의심 대응'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Execution mode & safety confirmation */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-2.5">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localOnlyRotation}
                    onChange={(e) => setLocalOnlyRotation(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 shrink-0"
                  />
                  <span>
                    <strong className="text-slate-900 dark:text-slate-100">
                      {isEn
                        ? 'Emergency offline rotation (skip GitHub push & export .enc.json bundle)'
                        : '오프라인 긴급 순환 모드 (GitHub 원격 푸시 건너뛰고 새 .enc.json 복구 번들 다운로드)'}
                    </strong>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {policy.hasToken
                        ? (isEn
                            ? 'Private Repo PAT is active. Leave unchecked to push re-encrypted vaults directly to GitHub.'
                            : '비공개 저장소 PAT가 연결되어 있습니다. 해제하면 재암호화된 금고 3종을 GitHub에 즉시 커밋합니다.')
                        : (isEn
                            ? 'Private Repo PAT is not configured — offline mode rotates the server key immediately and builds downloadable .enc.json vaults.'
                            : '현재 비공개 저장소 PAT가 미설정 상태이므로 오프라인 모드로 서버 활성 키를 교체하고 3종 암호화 파일을 제공합니다.')}
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer pt-2 border-t border-slate-200 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                  />
                  <span className="font-medium">
                    {isEn
                      ? 'I have stored the new AES-256 master key in a secure password manager. Without this key, rotated encrypted backups cannot be decrypted.'
                      : '새 AES-256 마스터 키를 안전한 별도 보관소(비밀번호 관리자 등)에 백업했으며, 키 분실 시 복호가 불가능함을 확인합니다.'}
                  </span>
                </label>
              </div>

              {/* Post-rotation offline recovery bundle downloads */}
              {recoveryBundle && (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        {isEn
                          ? `Re-encrypted Recovery Bundle Ready (Gen #${recoveryBundle.keyGeneration})`
                          : `새 키 세대 #${recoveryBundle.keyGeneration} 재암호화 복구 파일 준비 완료`}
                      </h4>
                      <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                        {isEn
                          ? 'Save these .enc.json vaults offline or upload them manually to your private repository.'
                          : '아래 3개 암호화 금고 파일을 PC에 보관하거나 비공개 저장소에 수동 업로드하세요.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadAllBundle}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Download All (3)' : '전체 3종 다운로드'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        downloadEncryptedVaultFile(
                          `winfix-admin-vault-gen${recoveryBundle.keyGeneration}.enc.json`,
                          recoveryBundle.bundle.membersVault
                        )
                      }
                      className="px-2.5 py-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 rounded-lg text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>{isEn ? 'Members Vault' : '회원 금고'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadEncryptedVaultFile(
                          `winfix-system-vault-gen${recoveryBundle.keyGeneration}.enc.json`,
                          recoveryBundle.bundle.systemVault
                        )
                      }
                      className="px-2.5 py-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 rounded-lg text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>{isEn ? 'System & AI Vault' : '시스템·AI 키 금고'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadEncryptedVaultFile(
                          `winfix-security-vault-gen${recoveryBundle.keyGeneration}.enc.json`,
                          recoveryBundle.bundle.securityVault
                        )
                      }
                      className="px-2.5 py-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 rounded-lg text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>{isEn ? 'Security Vault' : '보안 차단 금고'}</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {isEn ? 'AES-256-GCM · scrypt KDF · SHA-256' : 'AES-256-GCM · scrypt 키 유도 · SHA-256 무결성'}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={busyAction !== null}
              className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {isEn ? 'Close' : '닫기'}
            </button>

            {activeTab === 'retention' ? (
              <button
                type="submit"
                form="backup-retention-form"
                disabled={loading || busyAction !== null}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:opacity-90 disabled:opacity-50 text-white dark:text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {busyAction === 'save-policy' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{isEn ? 'Save Retention Policy' : '보존 정책 저장'}</span>
              </button>
            ) : (
              <button
                type="submit"
                form="emergency-key-rotation-form"
                disabled={loading || busyAction !== null || !acknowledged}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {busyAction === 'rotate-key' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Key className="w-3.5 h-3.5" />
                )}
                <span>
                  {localOnlyRotation
                    ? (isEn ? 'Rotate Key & Build Bundle' : '긴급 오프라인 키 순환')
                    : (isEn ? 'Execute Emergency Rotation' : '긴급 키 순환 실행')}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
