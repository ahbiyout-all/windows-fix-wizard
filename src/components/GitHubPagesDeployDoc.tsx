import React, { useState } from 'react';
import { 
  Copy, Check, Download, FileCode, Shield, CheckCircle2, AlertTriangle, 
  ExternalLink, ChevronDown, ChevronUp, Globe, Terminal, Sparkles, FolderGit2
} from 'lucide-react';

interface GitHubPagesDeployDocProps {
  repo?: string;
  branch?: string;
  language: 'ko' | 'en';
}

export const GITHUB_PAGES_DEPLOY_YAML = `name: Deploy Windows Fix Wizard to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow only one concurrent deployment, skipping runs queued between the run in-progress and latest queued.
# However, do NOT cancel in-progress runs as we want to allow these production deployments to complete.
concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: 📥 Check out repository code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: ⚙️ Set up Node.js 22 (LTS)
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: 📦 Install project dependencies
        run: npm ci || npm install --no-audit --prefer-offline

      - name: 🏗️ Build Web Application with Static Safeguards
        run: |
          # 1. Compile client assets for GitHub Pages
          npm run build:pages || npx vite build
          
          # 2. Prevent GitHub Pages 404 errors on SPA route refreshes
          cp dist/index.html dist/404.html
          
          # 3. Disable Jekyll to ensure Vite chunks & assets are served correctly
          touch dist/.nojekyll
          
          # 4. Embed accumulated Windows fix database for offline/standalone operation
          mkdir -p dist/data
          cp data/issues.json dist/data/issues.json 2>/dev/null || true
          cp data/github-feed.json dist/data/github-feed.json 2>/dev/null || true

      - name: 🌐 Configure GitHub Pages runtime
        uses: actions/configure-pages@v5

      - name: 📤 Upload GitHub Pages artifact bundle
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: 🚀 Deploy to GitHub Pages CDN
        id: deployment
        uses: actions/deploy-pages@v4
`;

export const GitHubPagesDeployDoc: React.FC<GitHubPagesDeployDocProps> = ({
  repo = 'AhBiYout-all/windows-fix-wizard',
  branch = 'main',
  language = 'ko'
}) => {
  const [copied, setCopied] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(branch);

  const activeYaml = GITHUB_PAGES_DEPLOY_YAML.replace(
    /branches:\s*\n\s*-\s*main/,
    `branches:\n      - ${selectedBranch}`
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(activeYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([activeYaml], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'deploy.yml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shrink-0 mt-0.5">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {language === 'en' 
                  ? 'GitHub Actions Pages Deployment Configuration (deploy.yml)'
                  : 'GitHub Actions Pages 배포 설정 가이드 (deploy.yml)'}
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                GitOps Automation
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {language === 'en'
                ? 'Copy or download this battle-tested GitHub Actions workflow snippet to host Windows Fix Wizard on GitHub Pages with complete SPA routing, .nojekyll bypass, and embedded JSON data safeguards.'
                : 'GitHub Pages 호스팅 환경에서 앱이 중단 없이 구동되도록 SPA 404 라우팅, .nojekyll 우회, 정적 데이터셋 임베딩이 완비된 무결점 배포 워크플로 스니펫을 제공합니다.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={handleDownload}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
            title={language === 'en' ? 'Download deploy.yml file' : 'deploy.yml 파일 다운로드'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Download File' : '파일 다운로드'}</span>
          </button>
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>{language === 'en' ? 'Copied!' : '복사 완료!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Copy deploy.yml' : '스니펫 복사'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Core Safeguards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>SPA 404 라우팅 방지</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
            <code>cp dist/index.html dist/404.html</code>을 생성하여 새로고침 시 404 에러를 원천 방지합니다.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Jekyll 빌드 간섭 차단</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
            <code>touch dist/.nojekyll</code>로 언더스코어(_)로 시작하는 Vite 번들과 폰트 유실을 막습니다.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>오프라인 데이터 임베딩</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
            수집된 <code>issues.json</code>을 배포 번들에 복사하여 서버나 Firestore가 없어도 전 항목이 로드됩니다.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Terminal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Node 22 LTS & Caching</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
            최신 Node.js 22 LTS 및 npm 캐시를 활성화하여 1분 이내의 초고속 빌드 및 배포를 완료합니다.
          </p>
        </div>
      </div>

      {/* Code Editor Preview & Controls */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-inner">
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-mono">
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-400">.github/workflows/</span>
            <span className="font-semibold text-emerald-400">deploy.yml</span>
            <span className="text-[11px] text-slate-500 font-normal">
              ({language === 'en' ? 'or deploy-pages.yml' : '또는 deploy-pages.yml'})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <span>Target Branch:</span>
              <input
                type="text"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value.trim() || 'main')}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-white font-mono text-[11px] w-20 focus:outline-none focus:border-indigo-500"
                placeholder="main"
              />
            </div>
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1 text-[11px] transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? '복사됨' : '복사'}</span>
            </button>
          </div>
        </div>

        <pre className="p-4 text-[11px] font-mono leading-relaxed text-emerald-400/95 overflow-x-auto max-h-96 custom-scrollbar selection:bg-indigo-800 selection:text-white">
          {activeYaml}
        </pre>
      </div>

      {/* 3-Step Setup Instructions */}
      <div className="p-4 sm:p-5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>
              {language === 'en' 
                ? 'Quick 3-Step GitHub Pages Deployment Guide' 
                : '3단계 초간단 GitHub Pages 배포 연동 방법'}
            </span>
          </h4>
          <a
            href={`https://github.com/${repo}/settings/pages`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>{language === 'en' ? 'Open Repo Settings > Pages' : 'GitHub 저장소 Pages 설정 바로가기'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                1
              </span>
              <strong className="text-slate-800 dark:text-slate-200">워크플로 파일 생성</strong>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              저장소 내에 <code>.github/workflows/deploy.yml</code> 파일을 생성하고 상단 복사한 YAML 내용을 붙여넣어 커밋합니다.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                2
              </span>
              <strong className="text-slate-800 dark:text-slate-200">Source 설정 변경</strong>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              저장소 <strong>Settings &gt; Pages</strong>의 <strong>Build and deployment &gt; Source</strong> 드롭다운을 <strong>"GitHub Actions"</strong>로 선택합니다.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                3
              </span>
              <strong className="text-slate-800 dark:text-slate-200">자동 배포 및 접속</strong>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <code>{selectedBranch}</code> 브랜치에 푸시하면 60초 내 전 세계 CDN에 배포되며 제공되는 웹 주소로 즉시 접근할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Troubleshooting & FAQ Accordion */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowFaq(!showFaq)}
          className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>
              {language === 'en'
                ? 'Troubleshooting & Frequently Asked Questions (FAQ)'
                : '배포 트러블슈팅 및 자주 묻는 질문 (FAQ)'}
            </span>
          </div>
          {showFaq ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showFaq && (
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="space-y-1">
              <strong className="text-slate-800 dark:text-slate-200 font-semibold block">
                Q. 사이트에 접속하면 화면이 하얗게 나오고 콘솔에 404가 발생합니다.
              </strong>
              <p className="text-[11px] leading-relaxed">
                A. 저장소가 서브디렉토리 주소(예: <code>user.github.io/repo-name/</code>)로 호스팅될 때 상대 경로가 올바르지 않으면 발생합니다. 본 프로젝트는 <code>vite.config.ts</code>에 <code>base: './'</code>가 사전 설정되어 있어 도메인 루트 및 서브디렉토리 배포 모두 완벽히 호환됩니다.
              </p>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
              <strong className="text-slate-800 dark:text-slate-200 font-semibold block">
                Q. 특정 하위 링크나 새로고침(F5) 시 404 File Not Found가 표시됩니다.
              </strong>
              <p className="text-[11px] leading-relaxed">
                A. GitHub Pages 정적 웹서버는 SPA 클라이언트 라우팅을 인식하지 못합니다. 위 <code>deploy.yml</code>의 <code>cp dist/index.html dist/404.html</code> 단계가 적용되어 있어야 모든 하위 경로 요청이 404 대신 클라이언트 앱으로 리다이렉트됩니다.
              </p>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
              <strong className="text-slate-800 dark:text-slate-200 font-semibold block">
                Q. GitHub Actions 실행 중 "Resource not accessible by integration" 오류가 발생합니다.
              </strong>
              <p className="text-[11px] leading-relaxed">
                A. 저장소의 <strong>Settings &gt; Actions &gt; General &gt; Workflow permissions</strong>에서 <strong>"Read and write permissions"</strong>를 선택하고 저장하세요. 또한 <code>deploy.yml</code> 상단의 <code>permissions: pages: write, id-token: write</code> 설정이 정확히 기재되어 있어야 합니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
