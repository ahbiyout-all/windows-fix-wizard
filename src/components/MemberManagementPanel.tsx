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
  EyeOff
} from 'lucide-react';

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
    return () => {
      isMountedRef.current = false;
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
  }, []);

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
    </div>
  );
};
