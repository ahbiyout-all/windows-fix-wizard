import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Shield,
  UserCheck,
  UserPlus,
  Ban,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Download,
  Edit2,
  X,
  Key,
  Save,
  Eye,
  EyeOff,
  Lock,
  Upload,
  RotateCcw,
  Github,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface PrivateBackupConfigState {
  repo: string;
  branch: string;
  backupPath: string;
  hasSavedToken: boolean;
  hasServerEnvToken: boolean;
  hasToken: boolean;
  hasSavedEncryptionKey: boolean;
  hasServerEnvKey: boolean;
  hasEncryptionKey: boolean;
  autoSyncOnUserChange: boolean;
  includeLogs: boolean;
  lastBackupAt: string | null;
  lastBackupStatus: string | null;
  lastBackupCount: number;
  lastBackupCommitSha: string | null;
  lastRestoreAt: string | null;
  lastRestoreStatus: string | null;
}

export interface MemberUser {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'member';
  authProvider: 'google' | 'email';
  status: 'active' | 'blocked';
  hasPassword?: boolean;
  createdAt: string;
  lastLoginAt: string;
}

interface MemberManagementPanelProps {
  language?: 'ko' | 'en';
}

const PROTECTED_ADMIN_EMAILS = new Set([
  'redmunlight@gmail.com',
  'ahbiyout@gmail.com',
  'ahbiyoutwinfixwizard@gmail.com',
  'ahbiyoutwinfix@gmail.com'
]);

export const MemberManagementPanel: React.FC<MemberManagementPanelProps> = ({
  language = 'ko'
}) => {
  const isEn = language === 'en';
  const [users, setUsers] = useState<MemberUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Add / Edit Member Modal State
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formEmail, setFormEmail] = useState<string>('');
  const [formDisplayName, setFormDisplayName] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formRole, setFormRole] = useState<'admin' | 'member'>('member');
  const [formStatus, setFormStatus] = useState<'active' | 'blocked'>('active');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClearMessage = () => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setActionMessage(null);
    }, 3500);
  };

  useEffect(() => {
    isMountedRef.current = true;
    const handleVaultSyncEvent = () => {
      if (!isMountedRef.current) return;
      void fetchPrivateBackupConfig();
      void fetchUsers();
    };
    window.addEventListener('winfix-private-vault-updated', handleVaultSyncEvent);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('winfix-private-vault-updated', handleVaultSyncEvent);
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = null;
      }
    };
  }, []);

  const getAuthHeader = (): Record<string, string> => {
    const rawToken = localStorage.getItem('winfix_admin_token');
    const token = rawToken && rawToken !== 'local-admin-token' ? rawToken : '';
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: getAuthHeader()
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (res.ok && data.success && Array.isArray(data.users)) {
        setUsers(data.users);
        setActionMessage(null);
        setIsLoading(false);
        return;
      }
      setActionMessage({
        text: data?.error || (res.status === 401
          ? (isEn ? 'Admin authentication required to view members.' : '회원 목록을 조회하려면 관리자 인증이 필요합니다.')
          : (isEn ? `Failed to load members (HTTP ${res.status}).` : `회원 목록 조회 실패 (HTTP ${res.status})`)),
        type: 'error'
      });
    } catch (e: any) {
      if (!isMountedRef.current) return;
      console.warn("Failed to fetch users from server DB:", e);
      setActionMessage({
        text: isEn ? 'Unable to reach member database API.' : '서버 회원 데이터베이스에 연결할 수 없습니다.',
        type: 'error'
      });
    }
    if (isMountedRef.current) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPrivateBackupConfig();
  }, []);

  // Private Admin Repository AES-256-GCM Backup & Restore State
  const [showVaultConfig, setShowVaultConfig] = useState<boolean>(false);
  const [vaultConfig, setVaultConfig] = useState<PrivateBackupConfigState>({
    repo: 'AhBiYout-all/windows-fix-wizard-admin',
    branch: 'main',
    backupPath: 'backups/winfix-admin-vault.enc.json',
    hasSavedToken: false,
    hasServerEnvToken: false,
    hasToken: false,
    hasSavedEncryptionKey: false,
    hasServerEnvKey: false,
    hasEncryptionKey: false,
    autoSyncOnUserChange: false,
    includeLogs: true,
    lastBackupAt: null,
    lastBackupStatus: null,
    lastBackupCount: 0,
    lastBackupCommitSha: null,
    lastRestoreAt: null,
    lastRestoreStatus: null
  });
  const [vaultTokenInput, setVaultTokenInput] = useState<string>('');
  const [vaultKeyInput, setVaultKeyInput] = useState<string>('');
  const [showVaultKey, setShowVaultKey] = useState<boolean>(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isSavingVaultConfig, setIsSavingVaultConfig] = useState<boolean>(false);
  const [isPushingVault, setIsPushingVault] = useState<boolean>(false);
  const [isRestoringVault, setIsRestoringVault] = useState<boolean>(false);
  const [vaultMessage, setVaultMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const localVaultFileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPrivateBackupConfig = async () => {
    try {
      const res = await fetch('/api/admin/private-backup/config', {
        headers: getAuthHeader()
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (res.ok && data.success && data.config) {
        setVaultConfig(data.config);
      }
    } catch (_) {}
  };

  const handleSaveVaultConfig = async (overrides?: { clearToken?: boolean; clearEncryptionKey?: boolean }) => {
    setIsSavingVaultConfig(true);
    setVaultMessage(null);
    try {
      const payload: Record<string, any> = {
        repo: vaultConfig.repo.trim(),
        branch: vaultConfig.branch.trim() || 'main',
        backupPath: vaultConfig.backupPath.trim() || 'backups/winfix-admin-vault.enc.json',
        autoSyncOnUserChange: vaultConfig.autoSyncOnUserChange,
        includeLogs: vaultConfig.includeLogs
      };
      if (overrides?.clearToken) {
        payload.clearToken = true;
      } else if (vaultTokenInput.trim()) {
        payload.token = vaultTokenInput.trim();
      }
      if (overrides?.clearEncryptionKey) {
        payload.clearEncryptionKey = true;
      } else if (vaultKeyInput.trim()) {
        payload.encryptionKey = vaultKeyInput.trim();
      }

      const res = await fetch('/api/admin/private-backup/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success || !data.config) {
        setVaultMessage({
          text: data?.error || (isEn ? `Failed to save config (HTTP ${res.status})` : `설정 저장 실패 (HTTP ${res.status})`),
          type: 'error'
        });
        return;
      }
      setVaultConfig(data.config);
      if (overrides?.clearToken || vaultTokenInput.trim()) setVaultTokenInput('');
      if (overrides?.clearEncryptionKey || vaultKeyInput.trim()) setVaultKeyInput('');
      window.dispatchEvent(new CustomEvent('winfix-private-vault-updated'));
      setVaultMessage({
        text: overrides?.clearToken
          ? (isEn ? 'Saved Private Repo PAT cleared.' : '저장된 비공개 저장소 PAT가 삭제되었습니다.')
          : overrides?.clearEncryptionKey
            ? (isEn ? 'Saved AES-256 encryption key cleared.' : '저장된 AES-256 암호화 키가 삭제되었습니다.')
            : (isEn ? 'Private encrypted vault settings saved on server.' : '비공개 저장소 AES-256 백업 설정이 서버에 안전하게 저장되었습니다.'),
        type: 'success'
      });
    } catch (e: any) {
      if (!isMountedRef.current) return;
      setVaultMessage({ text: e?.message || '설정 저장 요청 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      if (isMountedRef.current) setIsSavingVaultConfig(false);
    }
  };

  const handlePushEncryptedBackup = async () => {
    setIsPushingVault(true);
    setVaultMessage(null);
    try {
      const res = await fetch('/api/admin/private-backup/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          repo: vaultConfig.repo.trim(),
          branch: vaultConfig.branch.trim() || 'main',
          backupPath: vaultConfig.backupPath.trim() || 'backups/winfix-admin-vault.enc.json',
          includeLogs: vaultConfig.includeLogs,
          ...(vaultKeyInput.trim() ? { passphrase: vaultKeyInput.trim() } : {})
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setVaultMessage({
          text: data?.error || (isEn ? `Backup failed (HTTP ${res.status})` : `암호화 백업 실패 (HTTP ${res.status})`),
          type: 'error'
        });
        return;
      }
      if (data.config) setVaultConfig(data.config);
      setVaultMessage({
        text: isEn
          ? `Encrypted backup committed to ${data.backup?.repo} (${data.backup?.usersCount} users).`
          : `비공개 저장소(${data.backup?.repo})에 회원 ${data.backup?.usersCount}명 AES-256-GCM 암호화 백업을 완료했습니다.`,
        type: 'success'
      });
    } catch (e: any) {
      if (!isMountedRef.current) return;
      setVaultMessage({ text: e?.message || '비공개 저장소 백업 요청 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      if (isMountedRef.current) setIsPushingVault(false);
    }
  };

  const handleRestoreEncryptedBackup = async () => {
    setIsRestoringVault(true);
    setVaultMessage(null);
    try {
      const res = await fetch('/api/admin/private-backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          mode: restoreMode,
          repo: vaultConfig.repo.trim(),
          branch: vaultConfig.branch.trim() || 'main',
          backupPath: vaultConfig.backupPath.trim() || 'backups/winfix-admin-vault.enc.json',
          ...(vaultKeyInput.trim() ? { passphrase: vaultKeyInput.trim() } : {})
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setVaultMessage({
          text: data?.error || (isEn ? `Restore failed (HTTP ${res.status})` : `복원 실패 (HTTP ${res.status})`),
          type: 'error'
        });
        return;
      }
      if (data.config) setVaultConfig(data.config);
      await fetchUsers();
      setVaultMessage({
        text: isEn
          ? `Restored ${data.restore?.totalUsersAfter} users (+${data.restore?.added} added, ~${data.restore?.updated} updated).`
          : `암호화 복원 완료: 총 ${data.restore?.totalUsersAfter}명 (신규 +${data.restore?.added}명, 갱신 ${data.restore?.updated}명).`,
        type: 'success'
      });
    } catch (e: any) {
      if (!isMountedRef.current) return;
      setVaultMessage({ text: e?.message || '비공개 저장소 복원 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      if (isMountedRef.current) setIsRestoringVault(false);
    }
  };

  const handleDownloadLocalEncryptedVault = async () => {
    setVaultMessage(null);
    try {
      const res = await fetch('/api/admin/private-backup/export-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          includeLogs: vaultConfig.includeLogs,
          ...(vaultKeyInput.trim() ? { passphrase: vaultKeyInput.trim() } : {})
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success || !data.vault) {
        setVaultMessage({ text: data?.error || '암호화 파일 생성에 실패했습니다.', type: 'error' });
        return;
      }
      const blob = new Blob([JSON.stringify(data.vault, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `winfix-admin-vault-${new Date().toISOString().slice(0, 10)}.enc.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setVaultMessage({
        text: isEn
          ? `Downloaded AES-256-GCM encrypted vault (${data.usersCount} users).`
          : `AES-256-GCM 암호화 백업 파일(${data.usersCount}명)을 다운로드했습니다.`,
        type: 'success'
      });
    } catch (e: any) {
      if (!isMountedRef.current) return;
      setVaultMessage({ text: e?.message || '로컬 암호화 내보내기 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleUploadLocalEncryptedVault = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsRestoringVault(true);
    setVaultMessage(null);
    try {
      const text = await file.text();
      const parsedVault = JSON.parse(text);
      const res = await fetch('/api/admin/private-backup/restore-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          vault: parsedVault,
          mode: restoreMode,
          ...(vaultKeyInput.trim() ? { passphrase: vaultKeyInput.trim() } : {})
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (!res.ok || !data.success) {
        setVaultMessage({ text: data?.error || '암호화 파일 복원에 실패했습니다.', type: 'error' });
        return;
      }
      if (data.config) setVaultConfig(data.config);
      await fetchUsers();
      setVaultMessage({
        text: isEn
          ? `Restored from local encrypted vault (${data.restore?.totalUsersAfter} users).`
          : `로컬 암호화 파일 복원 완료: 총 ${data.restore?.totalUsersAfter}명 (신규 +${data.restore?.added}명, 갱신 ${data.restore?.updated}명).`,
        type: 'success'
      });
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setVaultMessage({ text: err?.message || '유효한 .enc.json 암호화 백업 파일이 아닙니다.', type: 'error' });
    } finally {
      if (isMountedRef.current) setIsRestoringVault(false);
    }
  };

  const openCreateModal = (prefillEmail = '') => {
    const clean = prefillEmail.trim().toLowerCase();
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
    setEditorMode('create');
    setEditingUserId(null);
    setFormEmail(clean);
    setFormDisplayName(looksLikeEmail ? clean.split('@')[0] : '');
    setFormPassword('');
    setFormRole(PROTECTED_ADMIN_EMAILS.has(clean) ? 'admin' : 'member');
    setFormStatus('active');
    setShowPassword(false);
    setFormError('');
  };

  const openEditModal = (u: MemberUser) => {
    setEditorMode('edit');
    setEditingUserId(u.id);
    setFormEmail(u.email);
    setFormDisplayName(u.displayName || u.email.split('@')[0] || '');
    setFormPassword('');
    setFormRole(u.role);
    setFormStatus(u.status);
    setShowPassword(false);
    setFormError('');
  };

  const closeEditorModal = () => {
    if (isSubmitting) return;
    setEditorMode(null);
    setEditingUserId(null);
    setFormError('');
    setFormPassword('');
  };

  const handleSubmitMemberForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanEmail = formEmail.trim().toLowerCase();
    const cleanName = formDisplayName.trim();
    const pwd = formPassword;

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError(isEn ? 'Please enter a valid email address.' : '유효한 이메일 주소를 입력해주세요.');
      return;
    }

    if (editorMode === 'create') {
      if (!pwd || pwd.length < 6 || pwd.length > 128) {
        setFormError(isEn ? 'Password must be 6-128 characters.' : '초기 비밀번호는 6자 이상 128자 이하로 입력해주세요.');
        return;
      }
    } else if (editorMode === 'edit') {
      if (!cleanName) {
        setFormError(isEn ? 'Display name cannot be empty.' : '닉네임/이름을 입력해주세요.');
        return;
      }
      if (pwd && (pwd.length < 6 || pwd.length > 128)) {
        setFormError(isEn ? 'New password must be 6-128 characters.' : '변경할 비밀번호는 6자 이상 128자 이하로 입력해주세요.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editorMode === 'create') {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({
            email: cleanEmail,
            displayName: cleanName || cleanEmail.split('@')[0],
            password: pwd,
            role: formRole,
            status: formStatus
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!isMountedRef.current) return;
        if (!res.ok || !data.success || !data.user) {
          setFormError(data?.error || (isEn ? `Registration failed (HTTP ${res.status})` : `회원 등록 실패 (HTTP ${res.status})`));
          setIsSubmitting(false);
          return;
        }
        setUsers(prev => [data.user, ...prev.filter(u => u.id !== data.user.id)]);
        setSearchQuery('');
        setRoleFilter('all');
        setStatusFilter('all');
        setFormEmail('');
        setFormDisplayName('');
        setFormPassword('');
        setEditorMode(null);
        setActionMessage({
          text: isEn ? `Registered ${data.user.email} successfully.` : `회원 '${data.user.email}' 계정이 등록되었습니다. 전체 회원 목록에서 바로 확인할 수 있습니다.`,
          type: 'success'
        });
        scheduleClearMessage();
      } else if (editorMode === 'edit' && editingUserId) {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(editingUserId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({
            email: cleanEmail,
            displayName: cleanName,
            role: formRole,
            status: formStatus,
            ...(pwd ? { newPassword: pwd } : {})
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!isMountedRef.current) return;
        if (!res.ok || !data.success || !data.user) {
          setFormError(data?.error || (isEn ? `Update failed (HTTP ${res.status})` : `회원 수정 실패 (HTTP ${res.status})`));
          setIsSubmitting(false);
          return;
        }
        setUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, ...data.user } : u));
        setEditorMode(null);
        setEditingUserId(null);
        setActionMessage({
          text: isEn ? `Updated ${data.user.email} successfully.` : `회원 '${data.user.email}' 정보가 수정되었습니다.`,
          type: 'success'
        });
        scheduleClearMessage();
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setFormError(err?.message || (isEn ? 'Network request failed.' : '서버 통신 중 오류가 발생했습니다.'));
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (user: MemberUser, newStatus: 'active' | 'blocked') => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (res.ok && data.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
        setActionMessage({
          text: isEn ? `User ${user.email} status changed to ${newStatus}.` : `회원 ${user.email} 상태가 '${newStatus === 'active' ? '정상 활성' : '이용 제한'}'으로 변경되었습니다.`,
          type: 'success'
        });
      } else {
        setActionMessage({ text: data.error || 'Failed to update user', type: 'error' });
      }
    } catch (e: any) {
      if (!isMountedRef.current) return;
      setActionMessage({ text: e.message || 'Error updating status', type: 'error' });
    }
    scheduleClearMessage();
  };

  const handleDeleteUser = async (user: MemberUser) => {
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json().catch(() => ({}));
      if (!isMountedRef.current) return;
      if (res.ok && data.success) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setActionMessage({
          text: isEn ? `User ${user.email} deleted.` : `회원 ${user.email} 계정이 삭제되었습니다.`,
          type: 'success'
        });
      } else {
        setActionMessage({ text: data.error || 'Failed to delete user', type: 'error' });
      }
    } catch (e: any) {
      if (!isMountedRef.current) return;
      setActionMessage({ text: e.message || 'Error deleting user', type: 'error' });
    }
    scheduleClearMessage();
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(users, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `winfix_users_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (u.email || '').toLowerCase().includes(q) || (u.displayName || '').toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    members: users.filter(u => u.role !== 'admin').length,
    blocked: users.filter(u => u.status === 'blocked').length
  };

  const editingTargetUser = editingUserId ? users.find(u => u.id === editingUserId) : null;
  const isEditingProtectedAdmin = Boolean(
    editingTargetUser &&
    PROTECTED_ADMIN_EMAILS.has((editingTargetUser.email || '').toLowerCase().trim())
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800/40">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {isEn ? 'Member & Account Management' : '회원 및 계정 데이터 관리 (Zero Cloud DB)'}
              </h3>
              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-mono font-bold border border-emerald-200 dark:border-emerald-800">
                Local DB: data/users.json
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEn 
                ? 'Register, edit, and manage Google OAuth and email members stored permanently in the local file database.' 
                : '클라우드 과금 없이 로컬 파일 DB(data/users.json)에 영구 저장된 Google 및 이메일 회원 계정을 등록·수정·관리합니다.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isEn ? 'Add Member' : '회원 등록'}</span>
          </button>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={isLoading}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isEn ? 'Refresh' : '새로고침'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            title={isEn ? 'Export user list to JSON' : '회원 목록 JSON 백업 내보내기'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Inline Create / Edit Member Drawer */}
      {editorMode && (
        <form
          onSubmit={handleSubmitMemberForm}
          autoComplete="off"
          className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-indigo-200 dark:border-indigo-800/60 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editorMode === 'create' ? (
                <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Edit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              )}
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editorMode === 'create'
                  ? (isEn ? 'Register New Member' : '신규 회원 / 관리자 계정 등록')
                  : (isEn ? 'Edit Member Details' : '회원 정보 및 비밀번호 수정')}
              </h4>
            </div>
            <button
              type="button"
              onClick={closeEditorModal}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {isEn ? 'Email Address' : '이메일 계정'}
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                disabled={editorMode === 'edit' && isEditingProtectedAdmin}
                required
                placeholder="name@example.com"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {isEn ? 'Display Name' : '닉네임 / 이름'}
              </label>
              <input
                type="text"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                maxLength={80}
                placeholder={isEn ? 'Display name' : '홍길동 또는 관리자'}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {isEn ? 'Role' : '권한 / 등급'}
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as 'admin' | 'member')}
                disabled={editorMode === 'edit' && isEditingProtectedAdmin}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                <option value="member">{isEn ? 'Member (Standard)' : '일반 회원 (MEMBER)'}</option>
                <option value="admin">{isEn ? 'Administrator (ADMIN)' : '관리자 (ADMIN)'}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {isEn ? 'Status' : '계정 상태'}
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as 'active' | 'blocked')}
                disabled={editorMode === 'edit' && isEditingProtectedAdmin}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                <option value="active">{isEn ? 'Active' : '정상 활성'}</option>
                <option value="blocked">{isEn ? 'Blocked' : '이용 제한'}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1">
            <div className="flex-1 max-w-md">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {editorMode === 'create'
                    ? (isEn ? 'Initial Password (min 6 chars)' : '초기 로그인 비밀번호 (6자 이상 필수)')
                    : (isEn ? 'New Password (leave blank to keep current)' : '새 비밀번호 변경/설정 (유지하려면 비워둠)')}
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  minLength={editorMode === 'create' ? 6 : undefined}
                  maxLength={128}
                  required={editorMode === 'create'}
                  placeholder={editorMode === 'create' ? '•••••••• (6+)' : (isEn ? 'Optional new password' : '새 비밀번호 입력 (선택)')}
                  className="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={closeEditorModal}
                disabled={isSubmitting}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                {isEn ? 'Cancel' : '취소'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting
                    ? (isEn ? 'Saving...' : '저장 중...')
                    : editorMode === 'create'
                      ? (isEn ? 'Register Account' : '회원 등록 저장')
                      : (isEn ? 'Save Changes' : '수정 내용 저장')}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{isEn ? 'Total Members' : '전체 등록 회원'}</div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">{counts.total}명</div>
        </div>
        <div className="p-3.5 rounded-xl border bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50">
          <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">{isEn ? 'Super Admins' : '최고 관리자'}</div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">{counts.admins}명</div>
        </div>
        <div className="p-3.5 rounded-xl border bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50">
          <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">{isEn ? 'Standard Members' : '일반 회원'}</div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">{counts.members}명</div>
        </div>
        <div className="p-3.5 rounded-xl border bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50">
          <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1">{isEn ? 'Restricted Accounts' : '이용 제한 계정'}</div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">{counts.blocked}명</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            name="member-directory-filter"
            autoComplete="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? "Search by email or name..." : "이메일 또는 닉네임 검색..."}
            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-slate-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={isEn ? 'Clear search' : '검색어 지우기'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>{isEn ? "Role:" : "역할:"}</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none"
          >
            <option value="all">{isEn ? "All Roles" : "전체 역할"}</option>
            <option value="admin">{isEn ? "Admins" : "관리자"}</option>
            <option value="member">{isEn ? "Members" : "일반회원"}</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-2">
            <span>{isEn ? "Status:" : "상태:"}</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none"
          >
            <option value="all">{isEn ? "All Status" : "전체 상태"}</option>
            <option value="active">{isEn ? "Active" : "정상 활성"}</option>
            <option value="blocked">{isEn ? "Blocked" : "이용 제한"}</option>
          </select>
        </div>
      </div>

      {(searchQuery.trim() !== '' || roleFilter !== 'all' || statusFilter !== 'all') && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 text-xs text-indigo-800 dark:text-indigo-200">
          <span>
            {isEn
              ? `Filtered view: showing ${filteredUsers.length} of ${users.length} total accounts`
              : `검색·필터 적용 중: 전체 ${users.length}명 중 ${filteredUsers.length}명 표시${searchQuery.trim() ? ` (검색어: "${searchQuery.trim()}")` : ''}`}
          </span>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setRoleFilter('all');
              setStatusFilter('all');
            }}
            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-[11px] font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer shrink-0"
          >
            {isEn ? 'Show All' : '전체 보기 (필터 초기화)'}
          </button>
        </div>
      )}

      {/* User Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 w-48">{isEn ? 'Email / Account' : '이메일 계정'}</th>
                <th className="py-3 px-3 w-32">{isEn ? 'Display Name' : '닉네임/이름'}</th>
                <th className="py-3 px-3 w-28">{isEn ? 'Role' : '권한/등급'}</th>
                <th className="py-3 px-3 w-32">{isEn ? 'Auth / Password' : '가입 경로'}</th>
                <th className="py-3 px-3 w-24">{isEn ? 'Status' : '계정 상태'}</th>
                <th className="py-3 px-3 w-36">{isEn ? 'Last Login' : '최근 접속'}</th>
                <th className="py-3 px-3 w-32 text-center">{isEn ? 'Actions' : '관리'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    {isEn ? "Loading member database..." : "회원 데이터베이스를 불러오는 중..."}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <div className="mb-3">
                      {isEn ? "No members match criteria." : "해당 조건의 회원이 없습니다."}
                    </div>
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => openCreateModal(searchQuery.trim())}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>
                          {isEn
                            ? `Register "${searchQuery.trim()}"`
                            : `'${searchQuery.trim()}' 계정 바로 등록하기`}
                        </span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isProtectedRow = PROTECTED_ADMIN_EMAILS.has((u.email || '').toLowerCase().trim());
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Email */}
                      <td className="py-3 px-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                        {u.email}
                      </td>

                      {/* Display Name */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {u.displayName || (u.email || '').split('@')[0] || '-'}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                            <Shield className="w-3 h-3 text-amber-500" />
                            ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            <UserCheck className="w-3 h-3 text-blue-500" />
                            MEMBER
                          </span>
                        )}
                      </td>

                      {/* Provider & Password Status */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {u.authProvider === 'google' ? 'Google OAuth' : 'Email/Password'}
                          </span>
                          {u.hasPassword === false && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                              {isEn ? 'No PW' : '비번 미설정'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {u.status === 'blocked' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                            {isEn ? 'Blocked' : '제한'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                            {isEn ? 'Active' : '정상'}
                          </span>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {u.lastLoginAt && !Number.isNaN(Date.parse(u.lastLoginAt)) ? new Date(u.lastLoginAt).toLocaleDateString() : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                            title={isEn ? 'Edit member' : '회원 정보 / 비밀번호 수정'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isProtectedRow && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(u, u.status === 'blocked' ? 'active' : 'blocked')}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  u.status === 'blocked'
                                    ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                    : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                }`}
                                title={u.status === 'blocked' ? '계정 제한 해제' : '계정 이용 제한'}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>

                              {confirmDeleteId === u.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u)}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold cursor-pointer"
                                  >
                                    {isEn ? 'Confirm' : '삭제'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[10px] font-semibold cursor-pointer"
                                  >
                                    {isEn ? 'Cancel' : '취소'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(u.id)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                  title="계정 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Private Admin Repository AES-256-GCM Encrypted Backup & Restore */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isEn ? 'Private Repository AES-256-GCM Encrypted Vault' : '비공개 저장소 전용 AES-256 암호화 백업 · 복원'}
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  vaultConfig.hasToken && vaultConfig.hasEncryptionKey
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}>
                  {vaultConfig.hasToken && vaultConfig.hasEncryptionKey
                    ? (isEn ? 'Vault Ready' : '연동 준비 완료')
                    : (isEn ? 'Setup Required' : 'PAT · 암호화 키 설정 필요')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isEn
                  ? `Encrypts member credentials (including password hashes) with AES-256-GCM before pushing to private GitHub repo (${vaultConfig.repo}).`
                  : `회원 DB(비밀번호 해시 포함)와 감사 로그를 AES-256-GCM으로 암호화해 비공개 저장소(${vaultConfig.repo})에 영구 백업하고 즉시 복원합니다.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowVaultConfig(p => !p)}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer self-end sm:self-center shrink-0"
          >
            <Github className="w-3.5 h-3.5" />
            <span>{showVaultConfig ? (isEn ? 'Hide Setup' : '백업 설정 접기') : (isEn ? 'Vault Setup' : '비공개 저장소 설정')}</span>
            {showVaultConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePushEncryptedBackup}
              disabled={isPushingVault || isRestoringVault}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isPushingVault ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{isEn ? 'Push Encrypted Backup' : '비공개 저장소에 암호화 백업'}</span>
            </button>

            <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <select
                value={restoreMode}
                onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'replace')}
                className="px-2.5 py-2 bg-transparent text-[11px] font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 outline-none"
                aria-label={isEn ? 'Restore mode' : '복원 방식'}
              >
                <option value="merge">{isEn ? 'Merge (Safe)' : '병합 복원 (안전)'}</option>
                <option value="replace">{isEn ? 'Replace All' : '전체 교체'}</option>
              </select>
              <button
                type="button"
                onClick={handleRestoreEncryptedBackup}
                disabled={isRestoringVault || isPushingVault}
                className="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isRestoringVault ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>{isEn ? 'Restore from Vault' : '비공개 저장소에서 복원'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadLocalEncryptedVault}
              className="px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
              title={isEn ? 'Download encrypted vault file locally' : 'AES-256 암호화 백업 파일(.enc.json) 로컬 저장'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isEn ? 'Save .enc.json' : '암호화 파일 저장'}</span>
            </button>

            <input
              ref={localVaultFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleUploadLocalEncryptedVault}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => localVaultFileInputRef.current?.click()}
              disabled={isRestoringVault}
              className="px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isEn ? 'Restore .enc.json' : '암호화 파일 복원'}</span>
            </button>
          </div>
        </div>

        {/* Vault Status Notice */}
        {vaultMessage && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            vaultMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : vaultMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
          }`}>
            {vaultMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{vaultMessage.text}</span>
          </div>
        )}

        {/* Last Sync Summary */}
        {(vaultConfig.lastBackupStatus || vaultConfig.lastRestoreStatus) && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/70 dark:border-slate-800">
            {vaultConfig.lastBackupStatus && (
              <span>
                <strong className="text-slate-700 dark:text-slate-300">{isEn ? 'Last Backup:' : '최근 백업:'}</strong> {vaultConfig.lastBackupStatus}
                {vaultConfig.lastBackupAt ? ` (${new Date(vaultConfig.lastBackupAt).toLocaleString()})` : ''}
              </span>
            )}
            {vaultConfig.lastRestoreStatus && (
              <span>
                <strong className="text-slate-700 dark:text-slate-300">{isEn ? 'Last Restore:' : '최근 복원:'}</strong> {vaultConfig.lastRestoreStatus}
              </span>
            )}
          </div>
        )}

        {/* Collapsible Configuration Panel */}
        {showVaultConfig && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Private GitHub Repo (owner/repo)' : '비공개 GitHub 저장소 (소유자/저장소명)'}
                </label>
                <input
                  type="text"
                  value={vaultConfig.repo}
                  onChange={(e) => setVaultConfig(prev => ({ ...prev, repo: e.target.value }))}
                  placeholder="AhBiYout-all/windows-fix-wizard-admin"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Branch' : '브랜치'}
                </label>
                <input
                  type="text"
                  value={vaultConfig.branch}
                  onChange={(e) => setVaultConfig(prev => ({ ...prev, branch: e.target.value }))}
                  placeholder="main"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Encrypted Vault Path (.json)' : '암호화 백업 파일 경로 (.json)'}
                </label>
                <input
                  type="text"
                  value={vaultConfig.backupPath}
                  onChange={(e) => setVaultConfig(prev => ({ ...prev, backupPath: e.target.value }))}
                  placeholder="backups/winfix-admin-vault.enc.json"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    {isEn ? 'Private Repo PAT (Fine-grained Contents R/W)' : '비공개 저장소 전용 PAT (Contents 읽기/쓰기)'}
                  </label>
                  <div className="flex items-center gap-1.5">
                    {vaultConfig.hasToken && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        {vaultConfig.hasServerEnvToken && !vaultConfig.hasSavedToken ? '서버 환경변수 활성' : '서버에 저장됨'}
                      </span>
                    )}
                    {vaultConfig.hasSavedToken && (
                      <button
                        type="button"
                        onClick={() => handleSaveVaultConfig({ clearToken: true })}
                        className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={vaultTokenInput}
                  onChange={(e) => setVaultTokenInput(e.target.value)}
                  placeholder={vaultConfig.hasToken ? '새 토큰을 입력할 때만 덮어씁니다 (••••••••)' : 'github_pat_... 또는 ghp_...'}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    {isEn ? 'AES-256-GCM Encryption Key (min 8 chars)' : 'AES-256-GCM 암호화 키 (8자 이상)'}
                  </label>
                  <div className="flex items-center gap-1.5">
                    {vaultConfig.hasEncryptionKey && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        {vaultConfig.hasServerEnvKey && !vaultConfig.hasSavedEncryptionKey ? '서버 환경변수 활성' : '서버에 저장됨'}
                      </span>
                    )}
                    {vaultConfig.hasSavedEncryptionKey && (
                      <button
                        type="button"
                        onClick={() => handleSaveVaultConfig({ clearEncryptionKey: true })}
                        className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={showVaultKey ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={vaultKeyInput}
                    onChange={(e) => setVaultKeyInput(e.target.value)}
                    placeholder={vaultConfig.hasEncryptionKey ? '새 암호화 키 입력 시 교체 (••••••••)' : '강력한 복구 비밀번호 입력 (8자 이상)'}
                    className="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowVaultKey(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Toggle encryption key visibility"
                  >
                    {showVaultKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaultConfig.autoSyncOnUserChange}
                    onChange={(e) => setVaultConfig(prev => ({ ...prev, autoSyncOnUserChange: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{isEn ? 'Auto-backup on member create/edit/delete' : '회원 등록·수정·삭제 시 자동 암호화 백업'}</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaultConfig.includeLogs}
                    onChange={(e) => setVaultConfig(prev => ({ ...prev, includeLogs: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{isEn ? 'Include recent admin audit logs' : '최근 관리자 감사 로그(200건) 함께 암호화'}</span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => handleSaveVaultConfig()}
                disabled={isSavingVaultConfig}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 self-end sm:self-auto"
              >
                {isSavingVaultConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isEn ? 'Save Vault Settings' : '비공개 백업 설정 저장'}</span>
              </button>
            </div>

            <p className="text-[11px] text-amber-700 dark:text-amber-300/90">
              {isEn
                ? 'Note: Backup fails safely if the target repository is Public. Keep your AES-256 encryption key safe—without it, vaulted backups cannot be decrypted.'
                : '※ 대상 저장소가 Public이면 보안상 업로드를 차단합니다. 설정한 AES-256 암호화 키를 분실하면 저장소의 백업 파일을 복호화할 수 없으니 별도로 안전하게 보관하세요.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
