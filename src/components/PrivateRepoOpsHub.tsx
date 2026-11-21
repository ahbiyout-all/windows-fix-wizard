import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Database,
  RefreshCw,
  Upload,
  Download,
  RotateCcw,
  Key,
  Calendar,
  Activity,
  Lock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Save,
  Eye,
  EyeOff,
  Archive,
  Github
} from 'lucide-react';

interface PrivateRepoOpsHubProps {
  language: 'ko' | 'en';
}

interface ExtendedPrivateVaultConfig {
  repo: string;
  branch: string;
  backupPath: string;
  systemBackupPath: string;
  securityBackupPath: string;
  dailySnapshotPrefix: string;
  auditArchivePrefix: string;
  hasSavedToken: boolean;
  hasServerEnvToken: boolean;
  hasToken: boolean;
  hasSavedEncryptionKey: boolean;
  hasServerEnvKey: boolean;
  hasEncryptionKey: boolean;
  autoSyncOnUserChange: boolean;
  autoSyncSystemOnChange: boolean;
  autoSyncSecurityOnChange: boolean;
  includeLogs: boolean;
  dailySnapshotEnabled: boolean;
  dailySnapshotRetentionDays: number;
  dailySnapshotHourKst: number;
  keyGeneration: number;
  lastSystemBackupAt: string | null;
  lastSystemBackupStatus: string | null;
  lastSecurityBackupAt: string | null;
  lastSecurityBackupStatus: string | null;
  lastAuditArchiveAt: string | null;
  lastAuditArchiveStatus: string | null;
  lastDailySnapshotDate: string | null;
  lastDailySnapshotAt: string | null;
  lastDailySnapshotStatus: string | null;
  lastKeyRotationAt: string | null;
  lastHealthWorkflowDeployAt: string | null;
  lastHealthWorkflowStatus: string | null;
  healthcheckTargetUrl: string;
  healthcheckIntervalMin: number;
  healthcheckFailureThreshold: number;
  healthcheckAlertMode: 'issue' | 'webhook' | 'both';
}

interface SnapshotEntry {
  date: string;
  path: string;
  htmlUrl?: string;
}

type HubTab = 'system' | 'snapshots' | 'security' | 'workflow';

export const PrivateRepoOpsHub: React.FC<PrivateRepoOpsHubProps> = ({ language }) => {
  const isEn = language === 'en';
  const isMountedRef = useRef(true);
  const localSystemFileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<HubTab>('system');
  const [config, setConfig] = useState<ExtendedPrivateVaultConfig>({
    repo: 'AhBiYout-all/windows-fix-wizard-admin',
    branch: 'main',
    backupPath: 'backups/winfix-admin-vault.enc.json',
    systemBackupPath: 'backups/winfix-system-vault.enc.json',
    securityBackupPath: 'backups/winfix-security-vault.enc.json',
    dailySnapshotPrefix: 'backups/daily',
    auditArchivePrefix: 'archives',
    hasSavedToken: false,
    hasServerEnvToken: false,
    hasToken: false,
    hasSavedEncryptionKey: false,
    hasServerEnvKey: false,
    hasEncryptionKey: false,
    autoSyncOnUserChange: false,
    autoSyncSystemOnChange: true,
    autoSyncSecurityOnChange: true,
    includeLogs: true,
    dailySnapshotEnabled: true,
    dailySnapshotRetentionDays: 14,
    dailySnapshotHourKst: 3,
    keyGeneration: 1,
    lastSystemBackupAt: null,
    lastSystemBackupStatus: null,
    lastSecurityBackupAt: null,
    lastSecurityBackupStatus: null,
    lastAuditArchiveAt: null,
    lastAuditArchiveStatus: null,
    lastDailySnapshotDate: null,
    lastDailySnapshotAt: null,
    lastDailySnapshotStatus: null,
    lastKeyRotationAt: null,
    lastHealthWorkflowDeployAt: null,
    lastHealthWorkflowStatus: null,
    healthcheckTargetUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/health` : '',
    healthcheckIntervalMin: 15,
    healthcheckFailureThreshold: 2,
    healthcheckAlertMode: 'issue'
  });

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Restore modes
  const [systemRestoreMode, setSystemRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [securityRestoreMode, setSecurityRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [snapshotRestoreMode, setSnapshotRestoreMode] = useState<'merge' | 'replace'>('merge');

  // Snapshots state
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);

  // Key rotation state
  const [currentKeyInput, setCurrentKeyInput] = useState('');
  const [newKeyInput, setNewKeyInput] = useState('');
  const [confirmNewKeyInput, setConfirmNewKeyInput] = useState('');
  const [showRotateKeys, setShowRotateKeys] = useState(false);

  // Healthcheck workflow state
  const [workflowYaml, setWorkflowYaml] = useState('');
  const [workflowUrlLink, setWorkflowUrlLink] = useState<string | null>(null);
  const [copiedYaml, setCopiedYaml] = useState(false);

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

  const notifyVaultUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('winfix-private-vault-updated'));
    }
  };

  const openBackupPolicyModal = (tab: 'retention' | 'emergency-key' = 'retention') => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('winfix-open-backup-policy', { detail: { tab } }));
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/private-backup/config', { headers: getAuthHeader() });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (res.ok && data.success && data.config) {
        setConfig(prev => ({
          ...prev,
          ...data.config,
          healthcheckTargetUrl:
            data.config.healthcheckTargetUrl ||
            prev.healthcheckTargetUrl ||
            (typeof window !== 'undefined' ? `${window.location.origin}/api/health` : '')
        }));
      }
    } catch (_) {
    } finally {
      if (isMountedRef.current) setLoadingConfig(false);
    }
  };

  const fetchSnapshots = async () => {
    setLoadingSnapshots(true);
    try {
      const res = await fetch('/api/admin/private-backup/snapshots', { headers: getAuthHeader() });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (res.ok && data.success) {
        setSnapshots(Array.isArray(data.snapshots) ? data.snapshots : []);
      } else if (data?.error) {
        setStatusBanner({ text: data.error, type: 'error' });
      }
    } catch (e: any) {
      if (isMountedRef.current) {
        setStatusBanner({ text: e?.message || '스냅샷 목록 조회 실패', type: 'error' });
      }
    } finally {
      if (isMountedRef.current) setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchConfig();
    const onExternalSync = () => {
      fetchConfig();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('winfix-private-vault-updated', onExternalSync);
    }
    return () => {
      isMountedRef.current = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('winfix-private-vault-updated', onExternalSync);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'snapshots' && config.hasToken) {
      fetchSnapshots();
    }
  }, [activeTab, config.hasToken]);

  const handleSaveExtendedSettings = async () => {
    setBusyAction('save-settings');
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/private-backup/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          systemBackupPath: config.systemBackupPath.trim(),
          securityBackupPath: config.securityBackupPath.trim(),
          dailySnapshotPrefix: config.dailySnapshotPrefix.trim(),
          auditArchivePrefix: config.auditArchivePrefix.trim(),
          autoSyncSystemOnChange: config.autoSyncSystemOnChange,
          autoSyncSecurityOnChange: config.autoSyncSecurityOnChange,
          dailySnapshotEnabled: config.dailySnapshotEnabled,
          dailySnapshotRetentionDays: config.dailySnapshotRetentionDays,
          dailySnapshotHourKst: config.dailySnapshotHourKst,
          healthcheckTargetUrl: config.healthcheckTargetUrl.trim(),
          healthcheckIntervalMin: config.healthcheckIntervalMin,
          healthcheckFailureThreshold: config.healthcheckFailureThreshold,
          healthcheckAlertMode: config.healthcheckAlertMode
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setStatusBanner({ text: data?.error || '설정 저장에 실패했습니다.', type: 'error' });
        return;
      }
      if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
      notifyVaultUpdated();
      setStatusBanner({
        text: isEn ? 'Private repository extended settings saved.' : '비공개 저장소 통합 운영 설정을 저장했습니다.',
        type: 'success'
      });
    } catch (e: any) {
      if (isMountedRef.current) setStatusBanner({ text: e?.message || '설정 저장 요청 오류', type: 'error' });
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handlePushSystemVault = async () => {
    setBusyAction('system-push');
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/private-backup/system/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ systemBackupPath: config.systemBackupPath.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setStatusBanner({ text: data?.error || '시스템 금고 백업 실패', type: 'error' });
        return;
      }
      if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
      notifyVaultUpdated();
      setStatusBanner({
        text: isEn
          ? `System & AI keys encrypted vault pushed (${data.backup?.counts?.apiKeys ?? 0} keys).`
          : `전체 시스템 · AI 키 금고(${data.backup?.backupPath}) 암호화 백업을 완료했습니다.`,
        type: 'success'
      });
    } catch (e: any) {
      if (isMountedRef.current) setStatusBanner({ text: e?.message || '시스템 금고 백업 오류', type: 'error' });
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handleRestoreSystemVault = async () => {
    setBusyAction('system-restore');
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/private-backup/system/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          mode: systemRestoreMode,
          systemBackupPath: config.systemBackupPath.trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setStatusBanner({ text: data?.error || '시스템 금고 복원 실패', type: 'error' });
        return;
      }
      if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
      notifyVaultUpdated();
      const sections = Array.isArray(data.restore?.restoredSections) ? data.restore.restoredSections.join(', ') : '';
      setStatusBanner({
        text: isEn
          ? `System vault restored (${systemRestoreMode}): ${sections}`
          : `전체 시스템 · AI 키 복원 완료(${systemRestoreMode === 'replace' ? '전체 교체' : '병합'}): ${sections}`,
        type: 'success'
      });
    } catch (e: any) {
      if (isMountedRef.current) setStatusBanner({ text: e?.message || '시스템 금고 복원 오류', type: 'error' });
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handleExportLocalSystemVault = async () => {
    setBusyAction('system-export-local');
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/private-backup/system/export-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({})
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success || !data.vault) {
        setStatusBanner({ text: data?.error || '로컬 시스템 암호화 파일 생성 실패', type: 'error' });
        return;
      }
      const blob = new Blob([JSON.stringify(data.vault, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `winfix-system-vault-${new Date().toISOString().slice(0, 10)}.enc.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatusBanner({
        text: isEn ? 'Encrypted system vault downloaded (.enc.json).' : '전체 시스템 · AI 키 암호화 파일(.enc.json)을 다운로드했습니다.',
        type: 'success'
      });
    } catch (e: any) {
      if (isMountedRef.current) setStatusBanner({ text: e?.message || '로컬 다운로드 오류', type: 'error' });
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handleUploadLocalSystemVault = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusyAction('system-restore-local');
    setStatusBanner(null);
    try {
      const text = await file.text();
      const vault = JSON.parse(text);
      const res = await fetch('/api/admin/private-backup/system/restore-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ vault, mode: systemRestoreMode })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setStatusBanner({ text: data?.error || '로컬 시스템 파일 복원 실패', type: 'error' });
        return;
      }
      if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
      notifyVaultUpdated();
      setStatusBanner({
        text: isEn
          ? `Restored system config from file (${data.restore?.restoredSections?.join(', ') || ''}).`
          : `로컬 시스템 암호화 파일 복원 완료: ${data.restore?.restoredSections?.join(', ') || ''}`,
        type: 'success'
      });
    } catch (err: any) {
      if (isMountedRef.current) setStatusBanner({ text: err?.message || '유효한 시스템 .enc.json 파일이 아닙니다.', type: 'error' });
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handleRunDailySnapshot = async () => {
    setBusyAction('snapshot-run');
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/private-backup/snapshots/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ retentionDays: config.dailySnapshotRetentionDays })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setStatusBanner({ text: data?.error || '일별 스냅샷 실행 실패', type: 'error' });
        return;
      }
      if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
      await fetchSnapshots();
      const pruned = Array.isArray(data.snapshot?.prunedDates) ? data.snapshot.prunedDates.length : 0;
      setStatusBanner({
        text: isEn
          ? `Daily snapshot ${data.snapshot?.kstDate} created (pruned ${pruned} expired).`
          : `일별 암호화 스냅샷(${data.snapshot?.kstDate}) 생성 완료 · 만료 스냅샷 ${pruned}건 정리됨`,
        type: 'success'
      });
    } catch (e: any) {
      if (isMountedRef.current) setStatusBanner({ text: e?.message || '일별 스냅샷 오류', type: 'error' });
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handleRestoreDailySnapshot = async (dateStr: string) => {
    setBusyAction(`snapshot-restore:${dateStr}`);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/private-backup/snapshots/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          date: dateStr,
          mode: snapshotRestoreMode,
          restoreMembers: true,
          restoreSystem: true,
          restoreSecurity: true
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setStatusBanner({ text: data?.error || `${dateStr} 스냅샷 복원 실패`, type: 'error' });
        return;
      }
      if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
      notifyVaultUpdated();
      setStatusBanner({
        text: isEn
          ? `Restored snapshot ${dateStr} (${snapshotRestoreMode}).`
          : `${dateStr} 일별 스냅샷 시점으로 회원·시스템·보안 설정 복원을 완료했습니다.`,
        type: 'success'
      });
    } catch (e: any) {
      if (isMountedRef.current) setStatusBanner({ text: e?.message || '스냅샷 복원 오류', type: 'error' });
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handleRotateEncryptionKey = async () => {
    setStatusBanner(null);
    if (newKeyInput.trim().length < 8) {
      setStatusBanner({ text: isEn ? 'New key must be at least 8 characters.' : '새 AES-256 암호화 키는 8자 이상이어야 합니다.', type: 'error' });
      return;
    }
    if (newKeyInput.trim() !== confirmNewKeyInput.trim()) {
      setStatusBanner({ text: isEn ? 'New key confirmation does not match.' : '새 암호화 키 확인 입력이 일치하지 않습니다.', type: 'error' });
      return;
    }

    setBusyAction('rotate-key');
    try {
      const res = await fetch('/api/admin/private-backup/rotate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          ...(currentKeyInput.trim() ? { currentPassphrase: currentKeyInput.trim() } : {}),
          newPassphrase: newKeyInput.trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setStatusBanner({ text: data?.error || '암호화 키 순환 실패', type: 'error' });
        return;
      }
      if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
      setCurrentKeyInput('');
      setNewKeyInput('');
      setConfirmNewKeyInput('');
      notifyVaultUpdated();
      setStatusBanner({
        text: isEn
          ? `Key rotated to Generation #${data.keyGeneration}. All active vaults re-encrypted.`
          : `AES-256 암호화 키 순환 완료 (세대 #${data.keyGeneration}) · 회원/시스템/보안 금고 3종 재암호화 커밋 완료`,
        type: 'success'
      });
    } catch (e: any) {
      if (isMountedRef.current) setStatusBanner({ text: e?.message || '키 순환 요청 오류', type: 'error' });
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handlePushSecurityVault = async () => {
    setBusyAction('security-push');
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/private-backup/security/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ securityBackupPath: config.securityBackupPath.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setStatusBanner({ text: data?.error || '보안 차단 금고 백업 실패', type: 'error' });
        return;
      }
      if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
      setStatusBanner({
        text: isEn
          ? `Security blocklist synced (${data.backup?.counts?.blockedVisitors ?? 0} blocked rules).`
          : `보안 차단 규칙·감사 금고 동기화 완료 (차단 규칙 ${data.backup?.counts?.blockedVisitors ?? 0}건)`,
        type: 'success'
      });
    } catch (e: any) {
      if (isMountedRef.current) setStatusBanner({ text: e?.message || '보안 금고 백업 오류', type: 'error' });
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handleRestoreSecurityVault = async () => {
    setBusyAction('security-restore');
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/private-backup/security/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          mode: securityRestoreMode,
          securityBackupPath: config.securityBackupPath.trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setStatusBanner({ text: data?.error || '보안 차단 금고 복원 실패', type: 'error' });
        return;
      }
      if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
      setStatusBanner({
        text: isEn
          ? `Security blocklist restored (${data.restore?.blockedRestored ?? 0} entries).`
          : `보안 차단 규칙 금고 복원 완료 (복원된 차단 규칙 ${data.restore?.blockedRestored ?? 0}건)`,
        type: 'success'
      });
    } catch (e: any) {
      if (isMountedRef.current) setStatusBanner({ text: e?.message || '보안 금고 복원 오류', type: 'error' });
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handlePushAuditArchive = async () => {
    setBusyAction('audit-archive');
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/private-backup/audit-archive/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({})
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setStatusBanner({ text: data?.error || '감사 로그 아카이빙 실패', type: 'error' });
        return;
      }
      if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
      setStatusBanner({
        text: isEn
          ? `Monthly audit archive pushed (${data.archive?.counts?.totalRecords ?? 0} logs).`
          : `월간 감사 로그(${data.archive?.kstMonth}) 암호화 아카이빙 완료 · 총 ${data.archive?.counts?.totalRecords ?? 0}건`,
        type: 'success'
      });
    } catch (e: any) {
      if (isMountedRef.current) setStatusBanner({ text: e?.message || '감사 아카이브 오류', type: 'error' });
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handlePreviewWorkflow = async () => {
    setBusyAction('workflow-preview');
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/private-backup/workflow/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          healthUrl: config.healthcheckTargetUrl.trim(),
          intervalMinutes: config.healthcheckIntervalMin,
          failureThreshold: config.healthcheckFailureThreshold,
          alertMode: config.healthcheckAlertMode
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setStatusBanner({ text: data?.error || '워크플로 미리보기 생성 실패', type: 'error' });
        return;
      }
      setWorkflowYaml(data.yaml || '');
    } catch (e: any) {
      if (isMountedRef.current) setStatusBanner({ text: e?.message || '워크플로 미리보기 오류', type: 'error' });
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handleDeployWorkflow = async () => {
    setBusyAction('workflow-deploy');
    setStatusBanner(null);
    setWorkflowUrlLink(null);
    try {
      const res = await fetch('/api/admin/private-backup/workflow/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          healthUrl: config.healthcheckTargetUrl.trim(),
          intervalMinutes: config.healthcheckIntervalMin,
          failureThreshold: config.healthcheckFailureThreshold,
          alertMode: config.healthcheckAlertMode
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (data.yaml) setWorkflowYaml(data.yaml);
      if (!res.ok || !data.success) {
        setStatusBanner({ text: data?.error || '워크플로 배포 실패', type: data?.requiresWorkflowScope ? 'info' : 'error' });
        return;
      }
      if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
      if (data.htmlUrl) setWorkflowUrlLink(data.htmlUrl);
      setStatusBanner({
        text: isEn
          ? `Healthcheck workflow deployed to ${config.repo}.`
          : `비공개 저장소(${config.repo})에 헬스체크 · 알림 워크플로를 배포했습니다.`,
        type: 'success'
      });
    } catch (e: any) {
      if (isMountedRef.current) setStatusBanner({ text: e?.message || '워크플로 배포 오류', type: 'error' });
    } finally {
      if (isMountedRef.current) setBusyAction(null);
    }
  };

  const handleDownloadYaml = () => {
    if (!workflowYaml) return;
    const blob = new Blob([workflowYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'winfix-private-healthcheck.yml';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleCopyYaml = async () => {
    if (!workflowYaml) return;
    try {
      await navigator.clipboard.writeText(workflowYaml);
      setCopiedYaml(true);
      setTimeout(() => setCopiedYaml(false), 1800);
    } catch (_) {}
  };

  const credentialsReady = config.hasToken && config.hasEncryptionKey;

  return (
    <section className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
      {/* Clean Single-Level Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <Github className="w-3.5 h-3.5" />
              <span className="font-mono">{config.repo}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {isEn ? `Key Gen #${config.keyGeneration}` : `암호화 키 세대 #${config.keyGeneration}`}
            </span>
            <span aria-hidden="true">·</span>
            <span className={credentialsReady ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-amber-700 dark:text-amber-400 font-semibold'}>
              {credentialsReady
                ? (isEn ? 'Private Vault Active' : '연동 준비 완료 (PAT · AES-256 활성)')
                : (isEn ? 'PAT or AES-256 key needed above' : '상단 비공개 저장소 설정에서 PAT · 키 저장 필요')}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {isEn ? 'Private Repository Operations & Multi-Vault Hub' : '비공개 저장소 통합 보안 · 스냅샷 · 헬스체크 운영 허브'}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
          <button
            type="button"
            onClick={() => openBackupPolicyModal('retention')}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{isEn ? 'Admin Backup Policy' : '백업 보존 · 긴급 키 정책'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveExtendedSettings}
            disabled={busyAction === 'save-settings' || loadingConfig}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {busyAction === 'save-settings' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isEn ? 'Save Operations Settings' : '운영 허브 설정 저장'}</span>
          </button>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
        {(
          [
            { id: 'system', icon: Database, ko: '전체 시스템 · AI 키 금고', en: 'System & AI Vault' },
            { id: 'snapshots', icon: Calendar, ko: '일별 스냅샷 · 키 순환', en: 'Daily Snapshots & Key Rotation' },
            { id: 'security', icon: ShieldCheck, ko: '차단 규칙 · 감사 아카이브', en: 'Security & Audit Archive' },
            { id: 'workflow', icon: Activity, ko: '비공개 헬스체크 워크플로', en: 'Private Healthcheck' }
          ] as const
        ).map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{isEn ? tab.en : tab.ko}</span>
            </button>
          );
        })}
      </div>

      {/* Status Notice */}
      {statusBanner && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 border ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : statusBanner.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{statusBanner.text}</span>
          </div>
          {workflowUrlLink && (
            <a
              href={workflowUrlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline shrink-0"
            >
              <span>GitHub 열기</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* TAB 1: System & AI Keys Encrypted Vault */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isEn ? 'Full System Config & Multi-Provider AI Keys Vault' : '전체 시스템 설정 · 다중 AI API 키 암호화 금고 (회원 금고와 분리 저장)'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isEn
                  ? 'Encrypts Gemini/Groq/Mistral/OpenRouter/NIM/HF/Cohere keys, collector options, maintenance schedule, and SMTP config separately from members.'
                  : 'Gemini · Groq · Mistral · OpenRouter · NVIDIA NIM · Hugging Face · Cohere API 키와 자동수집 옵션, 유지보수 스케줄을 별도 암호화 파일로 보관합니다.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {isEn ? 'System Vault Path (.json)' : '시스템 금고 저장 경로 (.json)'}
              </label>
              <input
                type="text"
                value={config.systemBackupPath}
                onChange={(e) => setConfig(prev => ({ ...prev, systemBackupPath: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-end pb-1.5">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoSyncSystemOnChange}
                  onChange={(e) => setConfig(prev => ({ ...prev, autoSyncSystemOnChange: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>{isEn ? 'Auto-sync system vault when API keys or configs change' : 'API 키 · 수집 옵션 · 시스템 설정 변경 시 자동 암호화 동기화'}</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePushSystemVault}
                disabled={busyAction !== null}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {busyAction === 'system-push' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isEn ? 'Push System Vault' : '시스템·AI 키 금고 백업'}</span>
              </button>

              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 overflow-hidden">
                <select
                  value={systemRestoreMode}
                  onChange={(e) => setSystemRestoreMode(e.target.value as 'merge' | 'replace')}
                  className="px-2.5 py-2 bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 outline-none"
                  aria-label="System restore mode"
                >
                  <option value="merge">{isEn ? 'Merge (Safe)' : '병합 복원'}</option>
                  <option value="replace">{isEn ? 'Replace All' : '전체 교체'}</option>
                </select>
                <button
                  type="button"
                  onClick={handleRestoreSystemVault}
                  disabled={busyAction !== null}
                  className="px-3.5 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {busyAction === 'system-restore' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>{isEn ? 'Restore System Vault' : '비공개 저장소에서 복원'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportLocalSystemVault}
                disabled={busyAction !== null}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isEn ? 'Download .enc.json' : '시스템 .enc.json 저장'}</span>
              </button>
              <input
                ref={localSystemFileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleUploadLocalSystemVault}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => localSystemFileInputRef.current?.click()}
                disabled={busyAction !== null}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isEn ? 'Restore .enc.json' : '로컬 파일 복원'}</span>
              </button>
            </div>
          </div>

          {config.lastSystemBackupStatus && (
            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 font-mono tabular-nums">
              <span>{config.lastSystemBackupStatus}</span>
              {config.lastSystemBackupAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{new Date(config.lastSystemBackupAt).toLocaleString()}</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Daily Snapshots & Encryption Key Rotation */}
      {activeTab === 'snapshots' && (
        <div className="space-y-6">
          {/* Section A: Daily Snapshots */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isEn ? 'Daily Encrypted Snapshot Rotation (KST)' : '일 1회 자동 일별 스냅샷 회전 · 시점 복원'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isEn
                    ? 'Snapshots bundle members, system configs, and security rules once per day and automatically prune files past the retention window.'
                    : '매일 1회 회원·시스템·보안 금고 통합 스냅샷을 날짜별 폴더에 저장하고, 보관 일수를 넘긴 오래된 스냅샷은 자동 정리합니다.'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchSnapshots}
                  disabled={loadingSnapshots}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSnapshots ? 'animate-spin' : ''}`} />
                  <span>{isEn ? 'Refresh' : '목록 새로고침'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRunDailySnapshot}
                  disabled={busyAction !== null}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  {busyAction === 'snapshot-run' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  <span>{isEn ? 'Run Snapshot Now' : '지금 일별 스냅샷 생성'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              <div className="flex items-center pt-4">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.dailySnapshotEnabled}
                    onChange={(e) => setConfig(prev => ({ ...prev, dailySnapshotEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{isEn ? 'Daily auto snapshot' : '매일 1회 자동 스냅샷'}</span>
                </label>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Run Hour (KST 0~23)' : '실행 시각 (KST 0~23시)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={config.dailySnapshotHourKst}
                  onChange={(e) => setConfig(prev => ({ ...prev, dailySnapshotHourKst: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Retention Days (1~90)' : '보관 일수 (1~90일)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={config.dailySnapshotRetentionDays}
                  onChange={(e) => setConfig(prev => ({ ...prev, dailySnapshotRetentionDays: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Snapshot Folder Prefix' : '스냅샷 저장 폴더'}
                </label>
                <input
                  type="text"
                  value={config.dailySnapshotPrefix}
                  onChange={(e) => setConfig(prev => ({ ...prev, dailySnapshotPrefix: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Snapshot List Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isEn ? 'Stored Daily Snapshots' : '비공개 저장소 일별 스냅샷 보관 목록'}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{isEn ? 'Restore mode:' : '복원 방식:'}</span>
                  <select
                    value={snapshotRestoreMode}
                    onChange={(e) => setSnapshotRestoreMode(e.target.value as 'merge' | 'replace')}
                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <option value="merge">{isEn ? 'Merge (Safe)' : '병합 복원'}</option>
                    <option value="replace">{isEn ? 'Replace All' : '전체 교체'}</option>
                  </select>
                </div>
              </div>

              {loadingSnapshots ? (
                <div className="p-4 space-y-2">
                  <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                </div>
              ) : snapshots.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-500 dark:text-slate-400">
                  {config.hasToken
                    ? (isEn ? 'No daily snapshots found yet. Click "Run Snapshot Now" to create your first daily point.' : '아직 생성된 일별 스냅샷이 없습니다. 우측 상단 버튼으로 첫 스냅샷을 생성해 보세요.')
                    : (isEn ? 'Configure Private Repo PAT & AES-256 key first to browse daily snapshots.' : '비공개 저장소 PAT와 암호화 키를 설정하면 스냅샷 목록을 조회할 수 있습니다.')}
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-56 overflow-y-auto">
                  {snapshots.map(snap => (
                    <div key={snap.date} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">{snap.date}</span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">{snap.path}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {snap.htmlUrl && (
                          <a
                            href={snap.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:underline inline-flex items-center gap-1"
                          >
                            <span>GitHub</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRestoreDailySnapshot(snap.date)}
                          disabled={busyAction !== null}
                          className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded font-semibold text-[11px] flex items-center gap-1 whitespace-nowrap cursor-pointer"
                        >
                          {busyAction === `snapshot-restore:${snap.date}` ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          <span>{isEn ? 'Restore Date' : '이 시점으로 복원'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section B: AES-256 Encryption Key Rotation */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>{isEn ? 'AES-256 Encryption Key Rotation' : 'AES-256 암호화 키 순환 (무손실 일괄 재암호화)'}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isEn
                    ? `Current generation: #${config.keyGeneration}. Rotating verifies your current key, re-encrypts active member/system/security vaults, and updates the active key atomically.`
                    : `현재 키 세대 #${config.keyGeneration}. 기존 키 검증 후 회원·시스템·보안 금고 3종을 새 키로 재암호화해 비공개 저장소에 일괄 반영합니다.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openBackupPolicyModal('emergency-key')}
                  className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Emergency Rotation Policy' : '긴급 키 순환 모달'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRotateKeys(p => !p)}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {showRotateKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showRotateKeys ? (isEn ? 'Hide Inputs' : '키 숨기기') : (isEn ? 'Show Inputs' : '입력 표시')}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type={showRotateKeys ? 'text' : 'password'}
                autoComplete="new-password"
                value={currentKeyInput}
                onChange={(e) => setCurrentKeyInput(e.target.value)}
                placeholder={config.hasEncryptionKey ? '현재 암호화 키 (저장된 키 사용 시 생략 가능)' : '현재 암호화 키 (8자 이상)'}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
              />
              <input
                type={showRotateKeys ? 'text' : 'password'}
                autoComplete="new-password"
                value={newKeyInput}
                onChange={(e) => setNewKeyInput(e.target.value)}
                placeholder={isEn ? 'New AES-256 passphrase (8+ chars)' : '새 AES-256 암호화 키 (8자 이상)'}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
              />
              <input
                type={showRotateKeys ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmNewKeyInput}
                onChange={(e) => setConfirmNewKeyInput(e.target.value)}
                placeholder={isEn ? 'Confirm new passphrase' : '새 암호화 키 다시 입력'}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {config.lastKeyRotationAt
                  ? (isEn ? `Last rotated: ${new Date(config.lastKeyRotationAt).toLocaleString()}` : `최근 키 순환: ${new Date(config.lastKeyRotationAt).toLocaleString()}`)
                  : (isEn ? 'No key rotation recorded yet.' : '아직 키 순환 이력이 없습니다.')}
              </span>
              <button
                type="button"
                onClick={handleRotateEncryptionKey}
                disabled={busyAction !== null}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {busyAction === 'rotate-key' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{isEn ? 'Rotate Key & Re-Encrypt Vaults' : '암호화 키 교체 및 금고 일괄 재암호화'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Security Blocklist & Audit Log Archiving */}
      {activeTab === 'security' && (
        <div className="space-y-5">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isEn ? 'Private Security Blocklist & Auto-Block Rules' : '비공개 보안 차단 규칙 · 자동 차단 정책 동기화'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isEn
                  ? 'Stores visitor blocklists, IP/burst protection thresholds, and ban reasons strictly in the private repository.'
                  : '자동 차단 임계값, 차단된 방문자 식별자 및 사유, 최근 감사 기록을 공개 저장소와 격리해 암호화 동기화합니다.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Security Vault Path (.json)' : '보안 차단 금고 경로 (.json)'}
                </label>
                <input
                  type="text"
                  value={config.securityBackupPath}
                  onChange={(e) => setConfig(prev => ({ ...prev, securityBackupPath: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex items-end pb-1.5">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoSyncSecurityOnChange}
                    onChange={(e) => setConfig(prev => ({ ...prev, autoSyncSecurityOnChange: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{isEn ? 'Auto-sync when block rules change' : '방문자 차단 · 자동 차단 정책 변경 시 자동 암호화 동기화'}</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePushSecurityVault}
                disabled={busyAction !== null}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {busyAction === 'security-push' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isEn ? 'Push Security Rules' : '차단 규칙 암호화 백업'}</span>
              </button>

              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 overflow-hidden">
                <select
                  value={securityRestoreMode}
                  onChange={(e) => setSecurityRestoreMode(e.target.value as 'merge' | 'replace')}
                  className="px-2.5 py-2 bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 outline-none"
                >
                  <option value="merge">{isEn ? 'Merge (Safe)' : '병합 복원'}</option>
                  <option value="replace">{isEn ? 'Replace All' : '전체 교체'}</option>
                </select>
                <button
                  type="button"
                  onClick={handleRestoreSecurityVault}
                  disabled={busyAction !== null}
                  className="px-3.5 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  {busyAction === 'security-restore' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>{isEn ? 'Restore Security Rules' : '차단 규칙 복원'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{isEn ? 'Monthly Encrypted Audit Log Archiving' : '월간 시스템 · 보안 감사 로그 암호화 아카이빙'}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isEn
                    ? 'Archives admin, visitor, error, backend, feedback, and system event logs into monthly encrypted files.'
                    : '관리자 활동, 방문자 보안, 에러, 백엔드 크론, 시스템 이벤트 로그를 월별 암호화 아카이브 파일로 안전하게 영구 보관합니다.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handlePushAuditArchive}
                disabled={busyAction !== null}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {busyAction === 'audit-archive' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                <span>{isEn ? 'Archive Current Month Logs' : '이번 달 감사 로그 암호화 아카이빙'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Archive Folder Prefix' : '감사 아카이브 저장 폴더'}
                </label>
                <input
                  type="text"
                  value={config.auditArchivePrefix}
                  onChange={(e) => setConfig(prev => ({ ...prev, auditArchivePrefix: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums pt-4">
                {config.lastAuditArchiveStatus || (isEn ? 'No monthly archive created yet.' : '아직 생성된 월간 아카이브가 없습니다.')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Private Healthcheck & Alert GitHub Actions Workflow */}
      {activeTab === 'workflow' && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isEn ? 'Private Repo Healthcheck & Incident Alert Workflow' : '비공개 저장소 전용 서버 헬스체크 · 장애 알림 워크플로 배포'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEn
                ? 'Monitors your server /api/health endpoint from the private repo without exposing uptime incidents or webhook URLs publicly.'
                : '공개 저장소에 서버 상태·알림 기록을 노출하지 않고 비공개 저장소의 GitHub Actions가 주기적으로 /api/health를 점검해 장애 시 이슈 자동 등록 또는 웹훅 알림을 발송합니다.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {isEn ? 'Target Health URL' : '점검 대상 서버 헬스체크 URL'}
              </label>
              <input
                type="url"
                value={config.healthcheckTargetUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, healthcheckTargetUrl: e.target.value }))}
                placeholder="https://.../api/health"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {isEn ? 'Check Interval' : '점검 주기'}
              </label>
              <select
                value={config.healthcheckIntervalMin}
                onChange={(e) => setConfig(prev => ({ ...prev, healthcheckIntervalMin: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
              >
                <option value={15}>{isEn ? 'Every 15 min' : '매 15분마다'}</option>
                <option value={30}>{isEn ? 'Every 30 min' : '매 30분마다'}</option>
                <option value={60}>{isEn ? 'Hourly' : '매 1시간마다'}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {isEn ? 'Alert Channel' : '장애 알림 방식'}
              </label>
              <select
                value={config.healthcheckAlertMode}
                onChange={(e) => setConfig(prev => ({ ...prev, healthcheckAlertMode: e.target.value as 'issue' | 'webhook' | 'both' }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="issue">{isEn ? 'Private GitHub Issue' : '비공개 저장소 이슈 자동 등록'}</option>
                <option value="webhook">{isEn ? 'Webhook Secret Only' : 'Webhook Secret 알림'}</option>
                <option value="both">{isEn ? 'Issue + Webhook' : '이슈 등록 + Webhook 병행'}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span>{isEn ? 'Retry attempts before alert:' : '알림 전 재시도 횟수:'}</span>
              <input
                type="number"
                min={1}
                max={5}
                value={config.healthcheckFailureThreshold}
                onChange={(e) => setConfig(prev => ({ ...prev, healthcheckFailureThreshold: Number(e.target.value) }))}
                className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono tabular-nums text-center"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePreviewWorkflow}
                disabled={busyAction !== null}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isEn ? 'Preview YAML' : 'YAML 미리보기'}</span>
              </button>
              <button
                type="button"
                onClick={handleDeployWorkflow}
                disabled={busyAction !== null}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {busyAction === 'workflow-deploy' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isEn ? 'Deploy to Private Repo' : '비공개 저장소에 워크플로 배포'}</span>
              </button>
            </div>
          </div>

          {workflowYaml && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                  .github/workflows/winfix-private-healthcheck.yml
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyYaml}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedYaml ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedYaml ? (isEn ? 'Copied' : '복사됨') : (isEn ? 'Copy' : '복사')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadYaml}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>{isEn ? 'Download YAML' : 'YAML 다운로드'}</span>
                  </button>
                </div>
              </div>
              <pre className="p-3.5 text-[11px] font-mono text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-950/60 max-h-64 overflow-auto leading-relaxed">
                {workflowYaml}
              </pre>
            </div>
          )}

          {config.lastHealthWorkflowStatus && (
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {config.lastHealthWorkflowStatus}
              {config.lastHealthWorkflowDeployAt ? ` · ${new Date(config.lastHealthWorkflowDeployAt).toLocaleString()}` : ''}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
