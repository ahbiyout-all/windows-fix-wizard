import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  UserCheck,
  Ban,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Download
} from 'lucide-react';

export interface MemberUser {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'member';
  authProvider: 'google' | 'email';
  status: 'active' | 'blocked';
  createdAt: string;
  lastLoginAt: string;
}

interface MemberManagementPanelProps {
  language?: 'ko' | 'en';
}

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

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('winfix_admin_token') || 'local-admin-token';
      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          setUsers(data.users);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch users from server DB:", e);
    }
    // Fallback default admin user display
    setUsers([
      {
        id: 'usr-admin-default',
        email: 'ahbiyoutwinfix@gmail.com',
        displayName: 'AhBiYout Administrator',
        role: 'admin',
        authProvider: 'google',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      }
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateStatus = async (user: MemberUser, newStatus: 'active' | 'blocked') => {
    try {
      const token = localStorage.getItem('winfix_admin_token') || 'local-admin-token';
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
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
      setActionMessage({ text: e.message || 'Error updating status', type: 'error' });
    }
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleDeleteUser = async (user: MemberUser) => {
    if (!window.confirm(isEn ? `Are you sure you want to delete ${user.email}?` : `정말로 회원 (${user.email}) 계정을 영구 삭제하시겠습니까?`)) {
      return;
    }
    try {
      const token = localStorage.getItem('winfix_admin_token') || 'local-admin-token';
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
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
      setActionMessage({ text: e.message || 'Error deleting user', type: 'error' });
    }
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(users, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `winfix_users_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return u.email.toLowerCase().includes(q) || (u.displayName || '').toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    members: users.filter(u => u.role !== 'admin').length,
    blocked: users.filter(u => u.status === 'blocked').length
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800/40">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {isEn ? 'Member & Account Management' : '회원 및 계정 데이터 관리 (Zero Cloud DB)'}
              </h3>
              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-mono font-bold border border-emerald-200 dark:border-emerald-800">
                Local DB: data/users.json
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEn 
                ? 'Manage registered Google OAuth and email members stored permanently in the local file database with zero cloud charges.' 
                : '클라우드 과금 없이 로컬 파일 DB(data/users.json)에 영구 저장된 Google 및 이메일 회원 계정을 안전하게 관리합니다.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isEn ? 'Refresh' : '새로고침'}</span>
          </button>

          <button
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
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? "Search by email or name..." : "이메일 또는 닉네임 검색..."}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-slate-100"
          />
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

      {/* User Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 w-48">{isEn ? 'Email / Account' : '이메일 계정'}</th>
                <th className="py-3 px-3 w-32">{isEn ? 'Display Name' : '닉네임/이름'}</th>
                <th className="py-3 px-3 w-28">{isEn ? 'Role' : '권한/등급'}</th>
                <th className="py-3 px-3 w-28">{isEn ? 'Auth Provider' : '가입 경로'}</th>
                <th className="py-3 px-3 w-24">{isEn ? 'Status' : '계정 상태'}</th>
                <th className="py-3 px-3 w-36">{isEn ? 'Last Login' : '최근 접속'}</th>
                <th className="py-3 px-3 w-28 text-center">{isEn ? 'Actions' : '관리'}</th>
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
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    {isEn ? "No members match criteria." : "해당 조건의 회원이 없습니다."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Email */}
                    <td className="py-3 px-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {u.email}
                    </td>

                    {/* Display Name */}
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {u.displayName || u.email.split('@')[0]}
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

                    {/* Provider */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {u.authProvider === 'google' ? 'Google OAuth' : 'Email/Password'}
                      </span>
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
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '-'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {u.role !== 'admin' && (
                          <>
                            <button
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

                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="계정 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {u.role === 'admin' && (
                          <span className="text-[10px] text-slate-400 italic">Protected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
