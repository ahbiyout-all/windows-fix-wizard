import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends React.Component<{children: React.ReactNode}, ErrorBoundaryState> {
  declare state: ErrorBoundaryState;
  declare props: {children: React.ReactNode};

  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary caught runtime error:', error, errorInfo);
  }

  handleRecover = async () => {
    try {
      localStorage.removeItem('ai_auto_sync_counts');
      localStorage.removeItem('cached_category_counts');
      localStorage.removeItem('winfix_db_issues_cache');
      localStorage.removeItem('winfix_github_pages_merged_issues');
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (_) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg">!</div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Windows Fix Wizard 복구 모드</h1>
                <p className="text-xs text-slate-500">렌더링 중 예기치 않은 오류가 감지되었습니다.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 text-xs font-mono text-rose-700 break-words">
              {this.state.error?.message || 'Unknown Runtime Error'}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={this.handleRecover}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                캐시 초기화 및 새로고침
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                단순 새로고침
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

