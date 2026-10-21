import React, { useState, useEffect, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  Terminal, Search, AlertCircle, Wrench, CheckCircle2, Copy, LayoutList,
  ExternalLink, ShieldCheck, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, ChevronsUp, ChevronsDown, Info, BookOpen, 
  RefreshCw, Wifi, Monitor, ShoppingBag, Key, Shield, Database, Globe, LogIn, LogOut, AlertTriangle, Moon, Sun, Download, Upload, Edit2, Trash2, X, XCircle, Save, ThumbsUp, ThumbsDown, FileCheck, Sparkles, Flame, Settings, Cloud, Zap, Layers, ShieldAlert, Check, ArrowRight, Activity, Sliders, Mail, RotateCcw,
  Heart, Bookmark, Clock, History, User as UserIcon, Filter, Users, UserCheck, Smartphone, Laptop, Tablet, Ban, Eye, EyeOff, Server, Bot, HelpCircle, LifeBuoy, Menu,
  Github, GitBranch, Play, Code2, Rocket, ArrowUpCircle, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, getDoc, setDoc, doc, query as firestoreQuery, limit, startAfter, orderBy, where, QueryDocumentSnapshot, updateDoc, deleteDoc, writeBatch, getCountFromServer } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from './firebase';
import { 
  OperationType, 
  FirestoreErrorInfo, 
  TroubleshootingResult, 
  KnownIssue,
  AdminLog,
  SearchLog,
  FeedbackLog,
  UserActivity,
  BackendLog,
  VisitorLog,
  AutoBlockSettings
} from './types';
import { PowerShellVerifierPanel } from './components/PowerShellVerifierPanel';
import { InteractiveRoadmap } from './components/InteractiveRoadmap';
import { DashboardWidget } from './components/DashboardWidget';
import { SystemInfoWidget } from './components/SystemInfoWidget';
import { parseJsonResponse, parseAiJson } from './utils/safeFetch';
import { validateKnownIssuesData, ValidationResult } from './utils/validateKnownIssue';

interface AppErrorLog {
  id?: string;
  message: string;
  stack?: string;
  component?: string;
  severity: 'error' | 'warning' | 'fatal';
  timestamp: any;
  userId?: string;
  metadata?: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || undefined,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified || undefined,
      isAnonymous: auth.currentUser?.isAnonymous || undefined,
      tenantId: auth.currentUser?.tenantId || undefined,
    },
    operationType,
    path
  }
  console.error('Firestore Error (Global): ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function getAuthHeaders() {
  const token = (await auth.currentUser?.getIdToken()) || 'dev_admin_bypass';
  return {
    'Authorization': `Bearer ${token}`
  };
}

// Initialize Gemini
export type ApiKeyConfig = {
  keys: { name: string, key: string, isActive: boolean, isCustom: boolean }[];
  mode: 'load-balance' | 'priority' | 'single';
};

export const getApiKeyConfig = (): ApiKeyConfig => {
  let config: ApiKeyConfig = { keys: [], mode: 'priority' };
  try {
    const saved = localStorage.getItem('winfix_api_keys_config');
    if (saved) {
      config = JSON.parse(saved);
    }
  } catch(e) {}
  
  // Ensure env keys always exist in the config if not manually removed
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && !config.keys.some(k => k.key === envKey)) {
    config.keys.push({ name: 'Default App Key', key: envKey, isActive: true, isCustom: false });
  }

  const customEnvKey = process.env.CUSTOM_API_KEY;
  if (customEnvKey && !config.keys.some(k => k.key === customEnvKey)) {
    config.keys.push({ name: 'Secret Custom Key', key: customEnvKey, isActive: true, isCustom: false });
  }

  return config;
};

export const saveApiKeyConfig = (config: ApiKeyConfig) => {
  localStorage.setItem('winfix_api_keys_config', JSON.stringify(config));
};

let currentAutoKeyIndex = 0;

export const getAiClient = () => {
  const config = getApiKeyConfig();
  const activeKeys = config.keys.filter(k => k.isActive && k.key);
  
  if (activeKeys.length === 0) {
    throw new Error("No active API keys available. Please check your API Key configuration.");
  }

  let finalKey = activeKeys[0].key;

  if (config.mode === 'priority') {
    const custom = activeKeys.find(k => k.isCustom);
    if (custom) finalKey = custom.key;
    else finalKey = activeKeys[0].key;
  } else if (config.mode === 'load-balance') {
    finalKey = activeKeys[currentAutoKeyIndex % activeKeys.length].key;
    currentAutoKeyIndex++;
  }

  return new GoogleGenAI({ apiKey: finalKey });
};

const MODELS_TO_TRY = [
  "gemini-2.5-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash"
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const callAiWithFallback = async (ai: any, contents: string, config?: any) => {
  let lastError;
  let hasQuotaError = false;

  for (const model of MODELS_TO_TRY) {
    let retryCount = 0;
    while (retryCount < 2) {
      try {
        const result = await ai.models.generateContent({ model, contents, ...config });
        const text = result.text;
        if (text) return text;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed (attempt ${retryCount + 1}):`, err);
        
        const errMsg = err.message || "";
        const status = err.status || (errMsg.includes("429") ? 429 : (errMsg.includes("503") ? 503 : 0));
        const isQuota = status === 429 || errMsg.toLowerCase().includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED");
        const isHighDemand = status === 503 || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE") || errMsg.includes("overloaded");
        
        if (isQuota || isHighDemand) {
          if (isQuota) hasQuotaError = true;
          retryCount++;
          if (retryCount < 2) {
            await sleep(1000 * retryCount); 
            continue; 
          }
        }
        
        if (status === 400 && errMsg.includes("API key not valid")) {
           throw err;
        }
        break; // Next model
      }
    }
  }
  
  if (hasQuotaError) {
    throw new Error("할당량 초과(429): 현재 모든 AI 모델의 트래픽이 가득 찼습니다. 잠시 후 다시 시도해주세요.");
  }
  throw lastError;
};

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

import { KNOWN_ISSUES } from './data/knownIssues';

const WINDOWS_VERSIONS = [
  "Windows 11",
  "Windows 10",
  "Windows 8.1",
  "Windows 7",
  "Windows Server 2022",
  "Windows Server 2019"
];

// AdSense Component
const AdSense = ({ slot }: { slot: string }) => {
  const adClient = import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID || 'ca-pub-PLACEHOLDER';
  const adSlot = slot || import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_ID || 'PLACEHOLDER_SLOT_ID';
  const isPlaceholder = adClient === 'ca-pub-PLACEHOLDER';

  useEffect(() => {
    if (isPlaceholder) return;
    try {
      // Check if the script is loaded and there are uninitialized ads
      const ads = document.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status])');
      if (ads.length > 0) {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, [isPlaceholder]);

  if (isPlaceholder) {
    return (
      <div className="my-8 flex justify-center overflow-hidden">
        <div className="w-full max-w-3xl h-24 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
          <span className="text-sm font-medium">광고 영역 (Google AdSense)</span>
          <span className="text-xs mt-1">실제 광고는 AdSense Client ID 등록 후 표시됩니다.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-8 flex justify-center overflow-hidden">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minWidth: '300px', maxWidth: '100%' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

const APP_VERSION = "3.11.0";
const DEVELOPER_NAME = "AhBiYout";
const GITHUB_USERNAME = "AhBiYout-all";
const GITHUB_REPO_NAME = "windows-fix-wizard";
const GITHUB_REPO_URL = "https://github.com/AhBiYout-all/windows-fix-wizard";
const GITHUB_PAGES_URL = "https://ahbiyout-all.github.io/windows-fix-wizard/";
const OFFICIAL_BLOG_URL = "https://ahbiyoutvibe.blogspot.com/";
const OFFICIAL_AFFILIATION_URL = "https://www.cisnet.co.kr";

const getKSTISOString = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (9 * 3600000));
  const pad = (n: number) => n.toString().padStart(2, '0');
  const msPad = (n: number) => n.toString().padStart(3, '0');
  return `${kst.getFullYear()}-${pad(kst.getMonth() + 1)}-${pad(kst.getDate())}T${pad(kst.getHours())}:${pad(kst.getMinutes())}:${pad(kst.getSeconds())}.${msPad(kst.getMilliseconds())}+09:00`;
};

const GITHUB_WORKFLOW_YAML = `name: Windows Fix Autonomous Collector & GitOps Sync

on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:
    inputs:
      topic:
        description: 'Target Error Category (or all)'
        required: false
        default: 'all'
        type: choice
        options:
          - 'all'
          - '업데이트'
          - '네트워크'
          - '시스템/블루스크린'
          - '스토어/앱'
          - '정품인증'
          - '보안/백신'
          - '오디오/사운드'
          - '디스플레이/그래픽'
      batch_size:
        description: 'Number of fixes to collect (1-4)'
        required: false
        default: '2'

permissions:
  contents: write

jobs:
  collect-and-sync:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: 📥 Check out repository code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: ⚙️ Set up Node.js 22 (LTS)
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: 📦 Install project dependencies
        run: |
          npm ci || npm install --no-audit --prefer-offline

      - name: 🤖 Run Autonomous Windows Fix Collector via Gemini AI
        id: run-collector
        env:
          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}
          APP_WEBHOOK_URL: \${{ secrets.APP_WEBHOOK_URL }}
          CRON_SECRET: \${{ secrets.CRON_SECRET }}
          INPUT_TOPIC: \${{ github.event.inputs.topic || 'all' }}
          BATCH_SIZE: \${{ github.event.inputs.batch_size || '2' }}
        run: |
          npx tsx scripts/github-collector.ts

      - name: 🚀 Commit & Push updated issues dataset (GitOps)
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          
          if [ -n "$(git status --porcelain data/issues.json data/github-feed.json)" ]; then
            git add data/issues.json data/github-feed.json
            TIMESTAMP=$(date -u +'%Y-%m-%d %H:%M UTC')
            git commit -m "🤖 [GitOps] Autonomous AI Windows Fixes collected ($TIMESTAMP) [skip ci]"
            
            for i in {1..3}; do
              git pull --rebase origin \${{ github.ref_name }} || true
              git push origin HEAD:\${{ github.ref_name }} && break || sleep 5
            done
            echo "✅ Successfully committed and pushed updated dataset to repository."
          else
            echo "ℹ️ No dataset changes to commit in this cycle."
          fi
`;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'wizard' | 'guidebook' | 'admin' | 'library' | 'threat-verifier'>('guidebook');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scriptSignedOverrides, setScriptSignedOverrides] = useState<Record<string, string>>({});
  const [dbMode, setDbMode] = useState<'firestore' | 'server_file'>(() => {
    return (localStorage.getItem('winfix_db_mode') as 'firestore' | 'server_file') || 'firestore';
  });
  
  const [isOptimizingAi, setIsOptimizingAi] = useState(false);
  const [aiOptimizedKnowledge, setAiOptimizedKnowledge] = useState<string | null>(null);
  const [aiOptimizedAt, setAiOptimizedAt] = useState<Date | null>(null);
  
  // Cache Persistence Helper
  const syncItemsToLocalCache = (issues: KnownIssue[]) => {
    try {
      // We only cache the first 100 items to avoid localStorage size limits
      const chunkToCache = issues.slice(0, 100);
      localStorage.setItem(ISSUES_CACHE_KEY, JSON.stringify(chunkToCache));
      localStorage.setItem(ISSUES_CACHE_KEY + '_time', Date.now().toString());
    } catch (e) {
      console.warn("Failed to sync cache to localStorage:", e);
    }
  };
  
  // User Personalization State
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [isLoadingPersonal, setIsLoadingPersonal] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'local_active' | 'permission_denied' | 'error'>('checking');
  const [backendError, setBackendError] = useState<string | null>(null);

  // GitHub Actions & GitOps State
  const [githubRepo, setGithubRepo] = useState<string>('AhBiYout-all/windows-fix-wizard');
  const [githubBranch, setGithubBranch] = useState<string>('main');
  const [githubWorkflowId, setGithubWorkflowId] = useState<string>('windows-fix-collector.yml');
  const [githubToken, setGithubToken] = useState<string>('');
  const [hasServerGithubToken, setHasServerGithubToken] = useState<boolean>(false);
  const [githubLastSync, setGithubLastSync] = useState<{ at: string | null; count?: number; status?: string } | null>(null);
  const [isPullingGithub, setIsPullingGithub] = useState<boolean>(false);
  const [isDispatchingWorkflow, setIsDispatchingWorkflow] = useState<boolean>(false);
  const [isSavingGithubConfig, setIsSavingGithubConfig] = useState<boolean>(false);
  const [showWorkflowScriptModal, setShowWorkflowScriptModal] = useState<boolean>(false);
  const [copiedWorkflow, setCopiedWorkflow] = useState<boolean>(false);
  const [selectedGithubTopic, setSelectedGithubTopic] = useState<string>('all');
  const [showGitOpsGuideModal, setShowGitOpsGuideModal] = useState<boolean>(false);
  const [gitOpsGuideActiveTab, setGitOpsGuideActiveTab] = useState<'architecture' | 'permissions' | 'secrets' | 'cron' | 'cli'>('architecture');
  const [copiedGuideMarkdown, setCopiedGuideMarkdown] = useState<boolean>(false);

  // GitHub Releases Real-Time Auto-Update System
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string;
    tagName?: string;
    releaseName?: string;
    releaseNotes?: string;
    publishedAt?: string;
    htmlUrl?: string;
    installerDownloadUrl?: string;
    installerName?: string;
    repoUrl?: string;
    author?: string;
    developerAccount?: string;
    blogUrl?: string;
    companyUrl?: string;
  } | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);

  const fetchBackendStatus = async () => {
    setBackendStatus('checking');
    try {
      const response = await fetch('/api/backend-health');
      const data = await parseJsonResponse(response);
      if (data.success) {
        if (data.firestore === 'connected') {
          setBackendStatus('connected');
          // Auto-recovery check: if we were in fallback server_file mode, auto-switch back to firestore because Firestore is verified online!
          if (localStorage.getItem('winfix_db_mode_fallback') === 'true') {
            console.log("Firestore recovered! Auto-restoring Cloud Firestore database mode.");
            setDbMode('firestore');
            localStorage.setItem('winfix_db_mode', 'firestore');
            localStorage.removeItem('winfix_db_mode_fallback');
            // Re-fetch category counts and issues under firestore mode
            setTimeout(() => {
              fetchCategoryCounts(true);
              fetchIssues(false, true);
            }, 100);
          }
        } else {
          setBackendStatus('local_active');
        }
      } else {
        setBackendStatus(data.firestore === 'permission_denied' ? 'permission_denied' : 'error');
        setBackendError(data.error || 'Unknown server error');
      }
    } catch (err) {
      setBackendStatus('error');
    }
  };

  const handleStatusRefresh = async () => {
    console.log("Global status refresh initiated...");
    await Promise.all([
      fetchCategoryCounts(true),
      fetchBackendStatus(),
      checkAndTriggerAutoSync(),
      fetchBackendLogs()
    ]);
  };

  const logAppError = async (
    message: string, 
    severity: 'error' | 'warning' | 'fatal' = 'error', 
    component?: string, 
    stack?: string,
    metadata?: any
  ) => {
    const errorDetails = {
      message,
      severity,
      component: component || 'App',
      stack: stack || null,
      metadata: metadata || null,
      timestamp: new Date().toISOString(),
      userId: user?.uid || 'anonymous',
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 1. Log to server-side local JSON DB
    try {
      await fetch('/api/logs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'error', log: errorDetails })
      });
    } catch (err) {
      console.warn("Server file log failed for error:", err);
    }

    // 2. Log to Firestore if alive
    const path = 'app_error_logs';
    try {
      const logRef = doc(collection(db, path));
      await setDoc(logRef, {
        ...errorDetails,
        timestamp: new Date()
      });
    } catch (e) {
      console.warn("Silent failure to log app error to database:", e);
    }
  };

  const handleFirestoreError = (error: any, operationType: string, path: string | null) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMsg = errorMessage.toLowerCase();
    const isQuotaError = 
      lowerMsg.includes('quota') || 
      lowerMsg.includes('429') || 
      lowerMsg.includes('resource_exhausted') || 
      lowerMsg.includes('resource-exhausted') ||
      lowerMsg.includes('free daily read units') ||
      lowerMsg.includes('free tier database') ||
      error?.code === 'resource-exhausted';
    
    const errInfo = {
      error: errorMessage,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData?.map(provider => ({
          providerId: provider?.providerId || null,
          displayName: provider?.displayName || null,
          email: provider?.email || null,
          photoUrl: provider?.photoURL || null
        })) || []
      },
      operationType,
      path
    };

    if (isQuotaError) {
      console.warn('Firestore Quota Exceeded:', JSON.stringify(errInfo));
      setDbMode('server_file');
      localStorage.setItem('winfix_db_mode', 'server_file');
      localStorage.setItem('winfix_db_mode_fallback', 'true');
      setDbStatus('quota');
      return;
    }

    logAppError(errorMessage, 'error', 'Firestore', error?.stack, errInfo);
    console.error('Firestore Operation Error:', JSON.stringify(errInfo));
  };
  const [version, setVersion] = useState(WINDOWS_VERSIONS[0]);
  const [language, setLanguage] = useState<'ko' | 'en'>(() => {
    const savedLang = localStorage.getItem('winfix_language');
    if (savedLang === 'ko' || savedLang === 'en') return savedLang;
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('ko') ? 'ko' : 'en';
  });
  
  // Save language preference when it changes
  useEffect(() => {
    localStorage.setItem('winfix_language', language);
  }, [language]);

  const [hasAcceptedTos, setHasAcceptedTos] = useState<boolean>(() => {
    return localStorage.getItem('winfix_tos_accepted') === 'true';
  });

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TroubleshootingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>('전체');
  const [selectedVersionFilter, setSelectedVersionFilter] = useState<string>('전체');
  const [quotaUsage, setQuotaUsage] = useState<{ reads: number, writes: number }>(() => {
    const today = getKSTISOString().split('T')[0];
    const saved = localStorage.getItem(`winfix_quota_${today}`);
    return saved ? JSON.parse(saved) : { reads: 0, writes: 0 };
  });

  const trackUsage = useCallback((reads: number, writes: number) => {
    const today = getKSTISOString().split('T')[0];
    setQuotaUsage(prev => {
      const next = { reads: prev.reads + reads, writes: prev.writes + writes };
      localStorage.setItem(`winfix_quota_${today}`, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    // Clear old quota tracking
    const today = getKSTISOString().split('T')[0];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('winfix_quota_') && key !== `winfix_quota_${today}`) {
        localStorage.removeItem(key);
      }
    }
  }, []);
  
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [guidebookQuery, setGuidebookQuery] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  
  const [dbIssues, setDbIssues] = useState<KnownIssue[]>(() => {
    // Try to load from LocalStorage on initialization
    try {
      const saved = localStorage.getItem('winfix_db_issues_cache');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load dbIssues from cache", e);
    }
    return [];
  });
  const [dbIssuesLastUpdated, setDbIssuesLastUpdated] = useState<number>(() => {
    return Number(localStorage.getItem('winfix_db_issues_updated') || 0);
  });
  const [recentIssues, setRecentIssues] = useState<KnownIssue[]>([]);
  const [popularIssues, setPopularIssues] = useState<KnownIssue[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error' | 'quota' | 'cached'>('checking');
  const [searchCache, setSearchCache] = useState<Record<string, { data: KnownIssue[], timestamp: number }>>({});
  const [triggeringAi, setTriggeringAi] = useState(false);
  const [verifyingData, setVerifyingData] = useState(false);
  const [verifyingIssueId, setVerifyingIssueId] = useState<string | null>(null);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [hideVerifiedInAdmin, setHideVerifiedInAdmin] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [verificationResults, setVerificationResults] = useState<any[]>([]);
  const [verificationMonths, setVerificationMonths] = useState(3);
  const [appUnlocked, setAppUnlocked] = useState(false);
  const [editingIssue, setEditingIssue] = useState<KnownIssue | null>(null);
  const [isBatchCollecting, setIsBatchCollecting] = useState(false);
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);
  const [batchCollectionCount, setBatchCollectionCount] = useState(0);
  const [batchCollectionUpdatedCount, setBatchCollectionUpdatedCount] = useState(0);
  const [batchStatus, setBatchStatus] = useState<string>('');
  const isBatchCollectingRef = useRef(false);
  const batchCollectionCountRef = useRef(0);
  const batchCollectionUpdatedCountRef = useRef(0);
  
  // Custom batch settings
  const [batchIntervalSeconds, setBatchIntervalSeconds] = useState(60);
  const [batchDurationMinutes, setBatchDurationMinutes] = useState(60);
  const [batchItemCount, setBatchItemCount] = useState(3);
  const batchEndTimeRef = useRef(0);
  const [editForm, setEditForm] = useState<Partial<KnownIssue>>({});
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('winfix_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('winfix_dark_mode', isDarkMode.toString());
  }, [isDarkMode]);
  const [categories, setCategories] = useState<string[]>(() => {
    const defaultCats = ['전체', '업데이트', '네트워크', '시스템/블루스크린', '스토어/앱', '정품인증', '보안/백신'];
    try {
      const saved = localStorage.getItem('ai_auto_sync_counts');
      if (saved) {
        const parsed = JSON.parse(saved);
        const existingCats = Object.keys(parsed).filter(k => k !== '전체' && k !== '네트워크');
        // Ensure '네트워크' is treated consistently if correctly spelled Ne-teu-wo-keu
        const finalCats = ['전체'];
        const base = ['업데이트', '네트워크', '시스템/블루스크린', '스토어/앱', '정품인증', '보안/백신'];
        base.forEach(b => {
          if (parsed[b] !== undefined) finalCats.push(b);
        });
        existingCats.forEach(e => {
          if (!finalCats.includes(e) && !base.includes(e)) finalCats.push(e);
        });
        return finalCats.length > 1 ? finalCats : defaultCats;
      }
    } catch (e) {}
    return defaultCats;
  });
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(() => {
    // Try to load last known counts from localStorage on initialization
    try {
      const saved = localStorage.getItem('ai_auto_sync_counts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load counts from localStorage", e);
    }
    return {};
  });
  const [showFeedbackModal, setShowFeedbackModal] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSolved, setFeedbackSolved] = useState<boolean | null>(null);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [searchLogs, setSearchLogs] = useState<any[]>([]);
  const [feedbackLogs, setFeedbackLogs] = useState<any[]>([]);
  const [appErrorLogs, setAppErrorLogs] = useState<AppErrorLog[]>([]);
  const [backendLogs, setBackendLogs] = useState<BackendLog[]>([]);
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [isEngineActionLoading, setIsEngineActionLoading] = useState(false);
  const [isLoadingBackendLogs, setIsLoadingBackendLogs] = useState(false);
  const [backendPage, setBackendPage] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState<'admin' | 'search' | 'feedback' | 'error' | 'backend_logs' | 'visitor' | null>(null);

  // Visitor Management States
  const [visitorId] = useState<string>(() => {
    let vid = localStorage.getItem('winfix_visitor_id');
    if (!vid) {
      vid = `v_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('winfix_visitor_id', vid);
    }
    return vid;
  });

  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
  const [visitorStats, setVisitorStats] = useState<{
    totalVisitors: number;
    todayVisitors: number;
    activeNowCount: number;
    memberCount: number;
    guestCount: number;
    autoBlockedCount?: number;
  }>({
    totalVisitors: 0,
    todayVisitors: 0,
    activeNowCount: 0,
    memberCount: 0,
    guestCount: 0,
    autoBlockedCount: 0
  });

  const [isCurrentVisitorBlocked, setIsCurrentVisitorBlocked] = useState(false);
  const [visitorBlockReason, setVisitorBlockReason] = useState('');
  const [autoBlockSettings, setAutoBlockSettings] = useState<AutoBlockSettings>({
    enableBotFilter: true,
    enableBurstFilter: true,
    maxRequestsPerMinute: 30,
    enableAnomalyFilter: true
  });
  const [showAutoBlockSettingsModal, setShowAutoBlockSettingsModal] = useState(false);

  const [visitorFilter, setVisitorFilter] = useState<'all' | 'members' | 'guests' | 'blocked' | 'autoblocked'>('all');
  const [visitorDeviceFilter, setVisitorDeviceFilter] = useState<'all' | 'desktop' | 'mobile' | 'tablet'>('all');
  const [visitorQuery, setVisitorQuery] = useState('');
  const [selectedVisitorDetail, setSelectedVisitorDetail] = useState<VisitorLog | null>(null);

  // Custom Confirm/Alert Dialog State
  const [uiDialog, setUiDialog] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', message: '' });

  const customAlert = (message: string) => {
    setUiDialog({ isOpen: true, type: 'alert', message });
  };

  const customConfirm = (message: string, onConfirm: () => void) => {
    setUiDialog({ isOpen: true, type: 'confirm', message, onConfirm });
  };
  
  // Logs Pagination State
  const [logCursors, setLogCursors] = useState<{
    admin: QueryDocumentSnapshot[];
    search: QueryDocumentSnapshot[];
    feedback: QueryDocumentSnapshot[];
    error: QueryDocumentSnapshot[];
    backend: QueryDocumentSnapshot[];
  }>({ admin: [], search: [], feedback: [], error: [], backend: [] });
  const [logPages, setLogPages] = useState({ admin: 0, search: 0, feedback: 0, error: 0, backend: 0 });
  const [logHasMore, setLogHasMore] = useState({ admin: true, search: true, feedback: true, error: true, backend: true });
  
  // Cache Constants
  const ISSUES_CACHE_KEY = 'winfix_issues_cache_v1';
  const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes
  
  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [stagedIssues, setStagedIssues] = useState<KnownIssue[]>(() => {
    try {
      const saved = localStorage.getItem('winfix_staged_issues');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [useStaging, setUseStaging] = useState(() => localStorage.getItem('winfix_use_staging') === 'true');
  const [isSyncingStaged, setIsSyncingStaged] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const [maintenanceSettings, setMaintenanceSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('winfix_maintenance_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      cleanupMonths: 1,
      linkVerifyFrequencyDays: 7,
      engineIntervalMin: 60,
      engineBatchSize: 4,
      alertEmail: "admin@cisnet.co.kr",
      enableAlerts: true,
      alertOnApiExhaustion: true,
      alertOnTimeout: true,
      consecutiveFailuresLimit: 3,
      smtpHost: "",
      smtpPort: 587,
      smtpUser: "",
      smtpPass: "",
      lastMaintenanceAt: null as string | null
    };
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTestingAlert, setIsTestingAlert] = useState(false);
  const [isTestingSmtpConn, setIsTestingSmtpConn] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [testAlertRecipient, setTestAlertRecipient] = useState('admin@cisnet.co.kr');
  const [testAlertResult, setTestAlertResult] = useState<any>(null);

  const [apiKeyConfig, setApiKeyConfigState] = useState<ApiKeyConfig>(getApiKeyConfig());
  const [newKeyInput, setNewKeyInput] = useState('');
  
  const handleAddKey = () => {
    if (!newKeyInput.trim()) return;
    const newConfig = { ...apiKeyConfig };
    newConfig.keys.push({
      name: `Custom Key ${newConfig.keys.length + 1}`,
      key: newKeyInput.trim(),
      isActive: true,
      isCustom: true
    });
    saveApiKeyConfig(newConfig);
    setApiKeyConfigState(newConfig);
    setNewKeyInput('');
  };

  const handleToggleKey = (index: number) => {
    const newConfig = { ...apiKeyConfig };
    newConfig.keys[index].isActive = !newConfig.keys[index].isActive;
    saveApiKeyConfig(newConfig);
    setApiKeyConfigState(newConfig);
  };

  const handleRemoveKey = (index: number) => {
    const newConfig = { ...apiKeyConfig };
    newConfig.keys.splice(index, 1);
    saveApiKeyConfig(newConfig);
    setApiKeyConfigState(newConfig);
  };

  const handleModeChange = (mode: 'load-balance' | 'priority' | 'single') => {
    const newConfig = { ...apiKeyConfig, mode };
    saveApiKeyConfig(newConfig);
    setApiKeyConfigState(newConfig);
  };

  // Save staging toggle
  useEffect(() => {
    localStorage.setItem('winfix_use_staging', useStaging.toString());
  }, [useStaging]);

  // Save staged issues to localStorage
  useEffect(() => {
    localStorage.setItem('winfix_staged_issues', JSON.stringify(stagedIssues));
  }, [stagedIssues]);

  const fetchMaintenanceSettings = async () => {
    if (!isAdmin) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch("/api/settings/maintenance", {
        headers: { "Authorization": `Bearer ${idToken}` }
      });
      const data = await parseJsonResponse(resp);
      if (data.success && data.settings) {
        setMaintenanceSettings(data.settings);
        localStorage.setItem('winfix_maintenance_settings', JSON.stringify(data.settings));
      } else {
        throw new Error("API call failed");
      }
    } catch (err: any) {
      console.warn("API maintenance settings fetch failed, trying Firestore direct fallback:", err);
      // Fallback direct read as before
      try {
        const configDoc = await getDoc(doc(db, 'system_config', 'maintenance'));
        if (configDoc.exists()) {
          const data = configDoc.data();
          const settings = {
            cleanupMonths: data.cleanupMonths || 1,
            linkVerifyFrequencyDays: data.linkVerifyFrequencyDays || 7,
            engineIntervalMin: data.engineIntervalMin || 60,
            engineBatchSize: data.engineBatchSize || 4,
            lastMaintenanceAt: data.lastMaintenanceAt || null
          };
          setMaintenanceSettings(settings);
          localStorage.setItem('winfix_maintenance_settings', JSON.stringify(settings));
        }
      } catch (innerErr) {
        console.error("Firestore fallback read failed:", innerErr);
      }
    }
  };

  const handleSaveMaintenanceSettings = async () => {
    if (!isAdmin) return;
    setIsSavingSettings(true);
    try {
      const updatedSettings = {
        ...maintenanceSettings,
        updatedAt: getKSTISOString()
      };

      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch("/api/settings/maintenance", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify(updatedSettings)
      });
      const data = await parseJsonResponse(resp);

      if (!data.success) {
        throw new Error(data.error || "Server settings update failed");
      }

      const finalSettings = data.settings || updatedSettings;
      setMaintenanceSettings(finalSettings);
      localStorage.setItem('winfix_maintenance_settings', JSON.stringify(finalSettings));
      await logAdminAction('update', 'system_config', `유지보수 설정 업데이트: 정리 ${finalSettings.cleanupMonths}개월, 검증 ${finalSettings.linkVerifyFrequencyDays}일, 수집주기 ${finalSettings.engineIntervalMin}분, 모집개수 ${finalSettings.engineBatchSize}개`, 'success', 'SYSTEM');
      customAlert(language === 'en' ? "Maintenance settings saved successfully to the server." : "유지보수 및 자율 엔진 설정이 서버와 데이터베이스에 안전하게 저장되었습니다.");
    } catch (err: any) {
      console.warn("API settings save failed, trying direct Firestore write fallback:", err);
      try {
        const updatedSettings = {
          ...maintenanceSettings,
          updatedAt: getKSTISOString()
        };
        await setDoc(doc(db, 'system_config', 'maintenance'), updatedSettings, { merge: true });
        setMaintenanceSettings(updatedSettings);
        localStorage.setItem('winfix_maintenance_settings', JSON.stringify(updatedSettings));
        await logAdminAction('update', 'system_config', `유지보수 설정 업데이트(다이렉트): 정리 ${updatedSettings.cleanupMonths}개월, 검증 ${updatedSettings.linkVerifyFrequencyDays}일, 수집주기 ${updatedSettings.engineIntervalMin}분, 모집개수 ${updatedSettings.engineBatchSize}개`, 'success', 'SYSTEM');
        customAlert(language === 'en' ? "Settings saved successfully (Firestore Direct)." : "설정 및 엔진 옵션이 데이터베이스로 직접 저장되었습니다.");
      } catch (innerErr: any) {
        handleFirestoreError(innerErr, OperationType.WRITE, 'system_config/maintenance');
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchGithubConfig = async () => {
    if (!isAdmin) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch("/api/github/config", {
        headers: { "Authorization": `Bearer ${idToken}` }
      });
      const data = await parseJsonResponse(resp);
      if (data.success && data.config) {
        setGithubRepo(data.config.repo || '');
        setGithubBranch(data.config.branch || 'main');
        setGithubWorkflowId(data.config.workflowId || 'windows-fix-collector.yml');
        setHasServerGithubToken(!!data.config.hasToken);
        if (data.config.lastSyncAt) {
          setGithubLastSync({
            at: data.config.lastSyncAt,
            count: data.config.lastSyncCount,
            status: data.config.lastSyncStatus
          });
        }
      }
    } catch (e) {
      console.warn("GitHub config load failed:", e);
    }
  };

  const saveGithubConfig = async () => {
    if (!isAdmin) return;
    setIsSavingGithubConfig(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch("/api/github/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          repo: githubRepo.trim(),
          branch: githubBranch.trim(),
          workflowId: githubWorkflowId.trim(),
          token: githubToken.trim()
        })
      });
      const data = await parseJsonResponse(resp);
      if (data.success) {
        setHasServerGithubToken(!!data.config.hasToken);
        setGithubToken('');
        customAlert(language === 'en' ? "GitHub configuration saved successfully." : "GitHub 연동 설정이 성공적으로 저장되었습니다.");
      } else {
        throw new Error(data.error || "Save failed");
      }
    } catch (err: any) {
      customAlert(language === 'en' ? `Failed to save GitHub settings: ${err.message}` : `GitHub 설정 저장 실패: ${err.message}`);
    } finally {
      setIsSavingGithubConfig(false);
    }
  };

  const handlePullFromGithub = async () => {
    if (!isAdmin) return;
    if (!githubRepo.trim()) {
      customAlert(language === 'en' ? "Please enter a GitHub repository (e.g. username/repo)." : "저장소 이름(예: 사용자명/저장소명)을 입력해 주세요.");
      return;
    }
    setIsPullingGithub(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch("/api/github/pull-from-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          repo: githubRepo.trim(),
          branch: githubBranch.trim() || 'main',
          filePath: 'data/issues.json',
          token: githubToken.trim() || undefined
        })
      });
      const data = await parseJsonResponse(resp);
      if (data.success) {
        customAlert(data.message || (language === 'en' ? "Successfully synced data from GitHub!" : "GitHub에서 데이터를 성공적으로 동기화했습니다!"));
        await Promise.all([
          fetchCategoryCounts(true),
          fetchIssues(false, true),
          fetchBackendLogs(),
          fetchGithubConfig()
        ]);
      } else {
        throw new Error(data.error || "Pull failed");
      }
    } catch (err: any) {
      customAlert(language === 'en' ? `GitHub pull failed: ${err.message}` : `GitHub 데이터 가져오기 실패: ${err.message}`);
    } finally {
      setIsPullingGithub(false);
    }
  };

  const handleDispatchGithubWorkflow = async (topic = 'all') => {
    if (!isAdmin) return;
    if (!githubRepo.trim()) {
      customAlert(language === 'en' ? "Please enter a GitHub repository (e.g. username/repo)." : "저장소 이름(예: 사용자명/저장소명)을 입력해 주세요.");
      return;
    }
    setIsDispatchingWorkflow(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch("/api/github/dispatch-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          repo: githubRepo.trim(),
          workflowId: githubWorkflowId.trim() || 'windows-fix-collector.yml',
          branch: githubBranch.trim() || 'main',
          token: githubToken.trim() || undefined,
          topic,
          batchSize: 2
        })
      });
      const data = await parseJsonResponse(resp);
      if (data.success) {
        customAlert(data.message || (language === 'en' ? "Workflow dispatched successfully!" : "워크플로가 성공적으로 원격 실행되었습니다!"));
      } else {
        throw new Error(data.error || "Dispatch failed");
      }
    } catch (err: any) {
      customAlert(language === 'en' ? `Workflow dispatch failed: ${err.message}` : `워크플로 원격 실행 실패: ${err.message}`);
    } finally {
      setIsDispatchingWorkflow(false);
    }
  };

  const checkForUpdates = async (isManual = false) => {
    setIsCheckingUpdate(true);
    try {
      const targetRepo = githubRepo.trim() || 'AhBiYout-all/windows-fix-wizard';
      let data: any = null;
      try {
        const resp = await fetch(`/api/github/check-update?repo=${encodeURIComponent(targetRepo)}`);
        data = await parseJsonResponse(resp);
      } catch (err) {
        data = null;
      }

      // If backend endpoint is unavailable (e.g. running statically on GitHub Pages), fallback to GitHub REST API directly
      if (!data || !data.success) {
        try {
          const ghResp = await fetch(`https://api.github.com/repos/${targetRepo}/releases/latest`, {
            headers: { Accept: 'application/vnd.github.v3+json' }
          });
          if (ghResp.ok) {
            const ghData = await ghResp.json();
            const latestTag = (ghData.tag_name || '').trim();
            const cleanLatest = latestTag.replace(/^v/, '');
            const cleanCurrent = APP_VERSION.replace(/^v/, '');

            const compareVersions = (v1: string, v2: string): number => {
              const p1 = v1.split('.').map(n => parseInt(n, 10) || 0);
              const p2 = v2.split('.').map(n => parseInt(n, 10) || 0);
              for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
                const num1 = p1[i] || 0;
                const num2 = p2[i] || 0;
                if (num1 > num2) return 1;
                if (num1 < num2) return -1;
              }
              return 0;
            };

            const hasUpdate = compareVersions(cleanLatest, cleanCurrent) > 0;
            const exeAsset = Array.isArray(ghData.assets)
              ? ghData.assets.find((a: any) => a.name && (a.name.endsWith('.exe') || a.name.includes('Setup')))
              : null;

            data = {
              success: true,
              hasUpdate,
              currentVersion: APP_VERSION,
              latestVersion: cleanLatest,
              releaseName: ghData.name || latestTag,
              publishedAt: ghData.published_at,
              releaseNotes: ghData.body || '',
              htmlUrl: ghData.html_url || `https://github.com/${targetRepo}/releases`,
              installerDownloadUrl: exeAsset?.browser_download_url || ghData.html_url || `https://github.com/${targetRepo}/releases`,
              installerAsset: exeAsset ? {
                name: exeAsset.name,
                downloadUrl: exeAsset.browser_download_url,
                size: exeAsset.size
              } : null,
              repo: targetRepo,
              repoUrl: `https://github.com/${targetRepo}`,
              author: DEVELOPER_NAME,
              developerAccount: GITHUB_USERNAME,
              blogUrl: OFFICIAL_BLOG_URL,
              companyUrl: OFFICIAL_AFFILIATION_URL,
              pagesUrl: GITHUB_PAGES_URL,
              isStaticPagesMode: true
            };
          }
        } catch (ghErr) {
          console.warn("Direct GitHub API fallback failed:", ghErr);
        }
      }

      if (data && data.success) {
        setUpdateInfo(data);
        if (data.hasUpdate) {
          const snoozeUntil = localStorage.getItem('winfix_update_snooze_until');
          const isSnoozed = snoozeUntil && (Date.now() < parseInt(snoozeUntil));
          if (!isSnoozed || isManual) {
            setUpdateModalOpen(true);
          }
        } else if (isManual) {
          customAlert(language === 'en'
            ? `You are running the latest version (${data.currentVersion || APP_VERSION}).`
            : `현재 최신 버전(v${data.currentVersion || APP_VERSION})을 사용 중입니다.`);
        }
      } else if (isManual) {
        customAlert(language === 'en'
          ? "Unable to verify updates from GitHub."
          : "GitHub 저장소로부터 업데이트 정보를 확인하지 못했습니다.");
      }
    } catch (e: any) {
      if (isManual) {
        customAlert(language === 'en' ? "Failed to check update." : "업데이트 확인 중 오류가 발생했습니다.");
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const generateSearchKeywords = (issue: Partial<KnownIssue>): string[] => {
    const keywords = new Set<string>();
    
    // Add category
    if (issue.category) keywords.add(issue.category.toLowerCase());
    
    // Add error code
    if (issue.code) {
      const code = issue.code.toLowerCase();
      keywords.add(code);
      if (code.startsWith('0x')) keywords.add(code.substring(2));
    }
    
    // Helper to tokenize and add words
    const addWords = (text?: string) => {
      if (!text) return;
      // Remove special characters and split by whitespace
      const words = text.toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
        .split(/\s+/)
        .filter(w => w.length >= 2); // Only keep words with 2+ characters
      words.forEach(w => keywords.add(w));
    };
    
    addWords(issue.title);
    addWords(issue.title_en);
    addWords(issue.symptoms);
    addWords(issue.symptoms_en);
    
    return Array.from(keywords).slice(0, 50); // Limit to 50 keywords for Firestore index limits
  };

  // Database State
  const officialCategories = [
    { kr: '업데이트', en: 'Update' },
    { kr: '네트워크', en: 'Network' },
    { kr: '시스템/블루스크린', en: 'System/BSOD' },
    { kr: '스토어/앱', en: 'Store/Apps' },
    { kr: '정품인증', en: 'Activation' },
    { kr: '보안/백신', en: 'Security/Defender' },
    { kr: '하드웨어/드라이버', en: 'Hardware/Drivers' },
    { kr: '성능/프리징', en: 'Performance' },
    { kr: '파일 시스템/저장소', en: 'File System' }
  ];
  const officialNames = officialCategories.map(c => c.kr);

  const fetchCategoryCounts = async (force: boolean = false) => {
    const activeDbMode = (localStorage.getItem('winfix_db_mode') as 'firestore' | 'server_file') || dbMode;
    console.log("Fetching category counts...", { force, dbMode, activeDbMode });

    const path = 'issues';
    setDbStatus('checking');
    try {
      if (activeDbMode === 'server_file') {
        const response = await fetch('/api/issues/counts');
        const data = await parseJsonResponse(response);
        if (data.success) {
          setCategoryCounts(data.counts);
          setCategories(data.categories);
          setDbStatus('connected');
          setLoadingDb(false);
          return;
        } else {
          throw new Error(data.error || "Failed key load");
        }
      }

      if (useStaging && !force) {
        console.log("Skipping category count fetch during local staging mode to save quota.");
        setDbStatus('connected');
        setLoadingDb(false);
        return;
      }

      const cached = localStorage.getItem('cached_category_counts');
      const cachedTime = localStorage.getItem('cached_category_counts_time');
      
      // Cache for 1 hour
      if (!force && cached && cachedTime && Date.now() - Number(cachedTime) < 1000 * 60 * 60) {
        const parsedCounts = JSON.parse(cached);
        setCategoryCounts(parsedCounts);
        
        // Also update categories state
        const existingCats = Object.keys(parsedCounts).filter(k => k !== '전체');
        const finalCats = ['전체'];
        
        officialNames.forEach(c => {
          if (existingCats.includes(c)) finalCats.push(c);
        });
        existingCats.forEach(c => {
          if (!finalCats.includes(c)) finalCats.push(c);
        });
        
        setCategories(finalCats);
        setDbStatus('connected');
        setLoadingDb(false);
        return;
      }

      // Use getCountFromServer for a cheap total count check
      const coll = collection(db, path);
      const snapshot = await getCountFromServer(coll);
      trackUsage(1, 0);
      const totalCount = snapshot.data().count;
      console.log("Firestore total issues count:", totalCount);

      if (totalCount === 0) {
        setDbStatus('connected');
        const localCounts: Record<string, number> = { '전체': KNOWN_ISSUES.length };
        KNOWN_ISSUES.forEach(issue => {
          if (issue.category) localCounts[issue.category] = (localCounts[issue.category] || 0) + 1;
        });
        setCategoryCounts(localCounts);
        setCategories(['전체', ...officialNames]);
        setLoadingDb(false);
        return;
      }

      const counts: Record<string, number> = { '전체': totalCount };
      let countedTotal = 0;
      for (const cat of officialNames) {
        try {
          const q = firestoreQuery(coll, where('category', '==', cat));
          const catSnap = await getCountFromServer(q);
          trackUsage(1, 0);
          const count = catSnap.data().count;
          counts[cat] = count;
          countedTotal += count;
        } catch (err) {
          console.warn(`Failed to get count for category ${cat}:`, err);
        }
      }
      
      if (totalCount > countedTotal) {
        counts['기타/미분류'] = totalCount - countedTotal;
      }
      
      setCategoryCounts(counts);
      localStorage.setItem('cached_category_counts', JSON.stringify(counts));
      localStorage.setItem('cached_category_counts_time', Date.now().toString());
      
      const activeCategories = ['전체', ...officialNames];
      if (counts['기타/미분류']) activeCategories.push('기타/미분류');
      setCategories(activeCategories);
      
      setDbStatus('connected');
      setLoadingDb(false);
    } catch (error: any) {
      console.warn("fetchCategoryCounts failed:", error);
      const isQuota = error.message?.includes('Quota') || error.message?.includes('429') || error.code === 'resource-exhausted';
      const isPermission = error.message?.includes('permission') || error.code === 'permission-denied';

      if (isQuota || isPermission) {
        console.warn("Automatically switching fetchCategoryCounts to high-availability server JSON.");
        setDbMode('server_file');
        localStorage.setItem('winfix_db_mode', 'server_file');
        localStorage.setItem('winfix_db_mode_fallback', 'true');
        setTimeout(() => {
          fetchCategoryCounts(force);
        }, 100);
        return;
      }

      const isQuotaDirect = error.message?.includes('Quota exceeded') || error.message?.includes('429');
      setDbStatus(isQuotaDirect ? 'quota' : 'error');
      setLoadingDb(false); 
      
      // Fallback to local data ONLY if we have NO previous count
      setCategoryCounts(prev => {
        if (prev['전체'] && prev['전체'] > KNOWN_ISSUES.length) {
          return prev; 
        }
        
        const localCounts: Record<string, number> = {};
        let localTotal = 0;
        KNOWN_ISSUES.forEach(issue => {
          if (issue.category) {
            localCounts[issue.category] = (localCounts[issue.category] || 0) + 1;
            localTotal++;
          }
        });
        localCounts['전체'] = localTotal;
        return localCounts;
      });
      setDbIssues(KNOWN_ISSUES);
    }
  };

  const fetchRecentIssues = async (force: boolean = false) => {
    const path = 'issues';
    try {
      const activeDbMode = (localStorage.getItem('winfix_db_mode') as 'firestore' | 'server_file') || dbMode;
      if (activeDbMode === 'server_file') {
        setRecentIssues(KNOWN_ISSUES.slice(0, 3));
        return;
      }

      const cached = localStorage.getItem('cached_recent_issues');
      const cachedTime = localStorage.getItem('cached_recent_issues_time');
      
      // Cache for 1 hour
      if (!force && cached && cachedTime && Date.now() - Number(cachedTime) < 1000 * 60 * 60) {
        setRecentIssues(JSON.parse(cached));
        return;
      }

      const q = firestoreQuery(
        collection(db, path),
        where('isLatest', '==', true),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const querySnapshot = await getDocs(q);
      trackUsage(querySnapshot.size, 0);
      const issues: KnownIssue[] = [];
      querySnapshot.forEach((doc) => {
        issues.push(doc.data() as KnownIssue);
      });

      if (issues.length === 0) {
        setRecentIssues(KNOWN_ISSUES.slice(0, 3));
      } else {
        setRecentIssues(issues);
        localStorage.setItem('cached_recent_issues', JSON.stringify(issues));
        localStorage.setItem('cached_recent_issues_time', Date.now().toString());
      }
    } catch (error: any) {
      console.warn("fetchRecentIssues failed (likely quota):", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const lowerMsg = errorMessage.toLowerCase();
      const isQuota = lowerMsg.includes('quota') || lowerMsg.includes('429') || lowerMsg.includes('resource_exhausted') || error?.code === 'resource-exhausted';
      
      handleFirestoreError(error, OperationType.LIST, path);

      if (isQuota) {
        setRecentIssues(KNOWN_ISSUES.slice(0, 3));
        return;
      }

      // Fallback 1: Simple order by if composite index is missing or query fails
      try {
        const fallbackQ = firestoreQuery(
          collection(db, path),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const fallbackSnapshot = await getDocs(fallbackQ);
        const fallbackIssues: KnownIssue[] = [];
        fallbackSnapshot.forEach((doc) => {
          fallbackIssues.push(doc.data() as KnownIssue);
        });
        const finalIssues = fallbackIssues.length > 0 ? fallbackIssues : KNOWN_ISSUES.slice(0, 3);
        setRecentIssues(finalIssues);
        localStorage.setItem('cached_recent_issues', JSON.stringify(finalIssues));
        localStorage.setItem('cached_recent_issues_time', Date.now().toString());
      } catch (e) {
        // Fallback 2: Local data
        setRecentIssues(KNOWN_ISSUES.slice(0, 3));
      }
    }
  };

  const fetchPopularIssues = async (force: boolean = false) => {
    const path = 'issues';
    try {
      const activeDbMode = (localStorage.getItem('winfix_db_mode') as 'firestore' | 'server_file') || dbMode;
      if (activeDbMode === 'server_file') {
        setPopularIssues(KNOWN_ISSUES.slice(0, 3));
        return;
      }

      const cached = localStorage.getItem('cached_popular_issues');
      const cachedTime = localStorage.getItem('cached_popular_issues_time');
      
      // Cache for 1 hour
      if (!force && cached && cachedTime && Date.now() - Number(cachedTime) < 1000 * 60 * 60) {
        setPopularIssues(JSON.parse(cached));
        return;
      }

      const q = firestoreQuery(
        collection(db, path),
        orderBy('upvoteCount', 'desc'),
        limit(3)
      );
      const querySnapshot = await getDocs(q);
      trackUsage(querySnapshot.size, 0);
      const issues: KnownIssue[] = [];
      querySnapshot.forEach((doc) => {
        issues.push(doc.data() as KnownIssue);
      });
      
      let top3 = issues;
      if (top3.length === 0) {
        top3 = KNOWN_ISSUES.slice(0, 3);
      }
      
      setPopularIssues(top3);
      sessionStorage.setItem('cached_popular_issues', JSON.stringify(top3));
      sessionStorage.setItem('cached_popular_issues_time', Date.now().toString());
    } catch (error: any) {
      console.warn("fetchPopularIssues failed (likely quota):", error);
      handleFirestoreError(error, OperationType.LIST, path);
      // Fallback to first 3 known issues
      setPopularIssues(KNOWN_ISSUES.slice(0, 3));
    }
  };

  useEffect(() => {
    fetchCategoryCounts();
    fetchBackendStatus();
  }, [user]); // Fetch on mount and when user auth state changes

  useEffect(() => {
    if (activeTab === 'guidebook') {
      fetchRecentIssues();
      fetchPopularIssues();
    }
  }, [user, activeTab]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    // Download a Windows .url shortcut file pointing to the short URL
    const shortcutUrl = "https://tinyurl.com/2fsfjuuk";
    const urlContent = `[InternetShortcut]\r\nURL=${shortcutUrl}`;
    
    const blob = new Blob([urlContent], { type: 'application/x-mswebsite' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Windows_Fix_Wizard.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(language === 'en' 
      ? "Shortcut file downloaded. You can place it on your desktop." 
      : "바탕화면 바로가기 파일(.url)이 다운로드되었습니다. 바탕화면 등에 두고 사용하세요.");
  };

  const handleRegisterStartupClick = () => {
    const shortcutUrl = "https://tinyurl.com/2fsfjuuk";
    const batContent = `@echo off\r\n` +
      `title Windows Fix Wizard Startup Registration\r\n` +
      `echo =======================================================\r\n` +
      `echo  WinFix Wizard - ${language === 'en' ? 'Startup Registry Helper' : '시작프로그램 등록 보조 도구'}\r\n` +
      `echo =======================================================\r\n` +
      `echo.\r\n` +
      `echo ${language === 'en' ? 'This helper will create a direct startup program shortcut in your Startup folder.' : '이 도구는 PC가 구동될 때 Windows Fix Wizard가 자동 기동되도록 시작프로그램 폴더에 등록합니다.'}\r\n` +
      `echo ${language === 'en' ? 'Target URL:' : '대상 경로:'} ${shortcutUrl}\r\n` +
      `echo.\r\n` +
      `echo ${language === 'en' ? 'Press any key to register...' : '계속하시려면 아무 키나 누르십시오...'}\r\n` +
      `pause > nul\r\n` +
      `\r\n` +
      `set "STARTUP_DIR=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"\r\n` +
      `set "SHORTCUT_PATH=%STARTUP_DIR%\\Windows_Fix_Wizard.url"\r\n` +
      `\r\n` +
      `echo [InternetShortcut] > "%SHORTCUT_PATH%"\r\n` +
      `echo URL=${shortcutUrl} >> "%SHORTCUT_PATH%"\r\n` +
      `\r\n` +
      `echo.\r\n` +
      `echo -------------------------------------------------------\r\n` +
      `echo  ${language === 'en' ? 'Startup Shortcut successfully registered!' : '시작프로그램 등록 완료!'}\r\n` +
      `echo  ${language === 'en' ? 'Windows Fix Wizard will now start automatically on PC boot.' : '이제 PC를 켤 때 이 웹 서비스가 바로 자동 실행됩니다.'}\r\n` +
      `echo -------------------------------------------------------\r\n` +
      `echo.\r\n` +
      `pause\r\n`;

    const blob = new Blob([batContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'WinFix_Register_Startup.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(language === 'en'
      ? "Startup installation batch file (WinFix_Register_Startup.bat) downloaded.\nDouble-click the downloaded file to securely add the program to Windows Startup."
      : "시작프로그램 등록용 배치 파일(WinFix_Register_Startup.bat)이 다운로드되었습니다.\n다운로드된 파일을 실행하시면 PC 부팅 시 자동 시작하도록 시작프로그램 폴더에 안전하게 바로가기가 추가됩니다.");
  };

  const handleEditClick = (issue: KnownIssue) => {
    setEditingIssue(issue);
    setEditForm({ ...issue });
  };

  const logAdminAction = async (
    action: 'create' | 'update' | 'delete' | 'verify' | 'export' | 'import' | 'system', 
    targetId: string, 
    details: string,
    severity: 'info' | 'success' | 'warning' | 'error' = 'info',
    category: 'ISSUE' | 'AI' | 'DATABASE' | 'AUTH' | 'SYSTEM' = 'SYSTEM',
    changes?: Record<string, { old: any, new: any }>
  ) => {
    if (!user || !isAdmin) return;
    const logData = {
      action,
      targetId,
      details,
      severity,
      category,
      changes: changes || null,
      timestamp: new Date().toISOString(),
      adminEmail: user?.email || null,
      adminUid: user.uid,
      metadata: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    };

    // 1. Log locally override
    try {
      await fetch('/api/logs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'admin', log: logData })
      });
    } catch (err) {
      console.warn("Local API admin logging failed:", err);
    }

    // 2. Log to Firestore if working
    const path = 'admin_logs';
    try {
      const logRef = doc(collection(db, path));
      await setDoc(logRef, {
        ...logData,
        timestamp: new Date()
      });
      trackUsage(0, 1);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const logSearch = async (searchQuery: string, winVersion: string) => {
    const logData = {
      query: searchQuery,
      version: winVersion,
      timestamp: new Date().toISOString(),
      userId: user?.uid || 'anonymous'
    };

    // 1. Log locally
    try {
      await fetch('/api/logs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'search', log: logData })
      });
    } catch (err) {
      console.warn("Local API search logging failed:", err);
    }

    // 2. Log to Firestore if working
    const path = 'search_logs';
    try {
      const logRef = doc(collection(db, path));
      await setDoc(logRef, {
        ...logData,
        timestamp: new Date()
      });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const logFeedback = async (issueId: string, issueTitle: string, isSolved: boolean, comment: string) => {
    const logData = {
      issueId,
      issueTitle,
      isSolved,
      comment,
      timestamp: new Date().toISOString(),
      userId: user?.uid || 'anonymous'
    };

    // 1. Log locally
    try {
      await fetch('/api/logs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'feedback', log: logData })
      });
    } catch (err) {
      console.warn("Local API feedback logging failed:", err);
    }

    // 2. Log to Firestore if working
    const path = 'feedback';
    try {
      const feedbackRef = doc(collection(db, path));
      await setDoc(feedbackRef, {
        ...logData,
        timestamp: new Date()
      });
      alert(language === 'en' ? "Feedback sent. Thank you!" : "피드백이 전송되었습니다. 감사합니다!");
      setShowFeedbackModal(null);
      setFeedbackComment('');
      setFeedbackSolved(null);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const fetchAdminLogs = async (page = 0) => {
    if (!isAdmin) return;
    setLoadingLogs(true);
    const path = 'admin_logs';
    try {
      let q;
      const baseQ = firestoreQuery(collection(db, path), orderBy('timestamp', 'desc'));
      
      if (page === 0) {
        q = firestoreQuery(baseQ, limit(51));
      } else {
        const cursor = logCursors.admin[page - 1];
        if (!cursor) throw new Error("Invalid page cursor");
        q = firestoreQuery(baseQ, startAfter(cursor), limit(51));
      }
      
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.slice(0, 50);
      const logs = docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      setAdminLogs(logs);
      setLogHasMore(prev => ({ ...prev, admin: querySnapshot.docs.length > 50 }));
      setLogPages(prev => ({ ...prev, admin: page }));
      
      // Store the last doc of the current page as the cursor for the NEXT page
      if (docs.length > 0) {
        const nextCursor = docs[docs.length - 1];
        setLogCursors(prev => {
          const newCursors = [...prev.admin];
          newCursors[page] = nextCursor;
          return { ...prev, admin: newCursors };
        });
      }
      
      setShowLogsModal('admin');
    } catch (e: any) {
      if (e.message?.includes('Quota') || e.message?.includes('quota')) {
        alert(language === 'en' ? "Failed to load logs: Quota exceeded." : "로그를 불러오는데 실패했습니다: 할당량 초과.");
      } else {
        alert(language === 'en' ? "Failed to load logs." : "로그를 불러오는데 실패했습니다.");
      }
      try {
        handleFirestoreError(e, OperationType.LIST, path);
      } catch (err) {
        // Ignore the thrown error from handleFirestoreError
      }
    } finally {
      setLoadingLogs(false);
    }
  };

  const logVisitorSession = useCallback(async (currentTab?: string, actionType?: string) => {
    try {
      const activeTabName = currentTab || activeTab;
      const payload = {
        visitorId,
        userId: user?.uid || null,
        userEmail: user?.email || null,
        activeTab: activeTabName,
        entryUrl: window.location.pathname,
        action: actionType || 'heartbeat'
      };

      const resp = await fetch('/api/visitor/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          if (data.stats) setVisitorStats(data.stats);
          if (data.isBlocked) {
            setIsCurrentVisitorBlocked(true);
            setVisitorBlockReason(data.blockReason || '보안 및 비정상 접근 차단 가드레일에 의해 접속이 제한되었습니다.');
          } else {
            setIsCurrentVisitorBlocked(false);
          }
        }
      }

      const activeDbMode = (localStorage.getItem('winfix_db_mode') as 'firestore' | 'server_file') || dbMode;
      if (activeDbMode === 'server_file') return;

      const docId = `vis_${visitorId}`;
      await setDoc(doc(db, 'visitor_logs', docId), {
        visitorId,
        userId: user?.uid || null,
        userEmail: user?.email || 'anonymous',
        activeTab: activeTabName,
        language: language || 'ko',
        lastActiveAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      // Silent catch
    }
  }, [visitorId, user, activeTab, language]);

  useEffect(() => {
    logVisitorSession(activeTab, 'pageview');
  }, [activeTab]);

  const fetchAutoBlockSettings = async () => {
    try {
      const resp = await fetch('/api/visitor/autoblock-settings');
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.settings) {
          setAutoBlockSettings(data.settings);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch auto-block settings:", e);
    }
  };

  const saveAutoBlockSettings = async (updatedSettings: AutoBlockSettings) => {
    try {
      const authHeaders = await getAuthHeaders();
      const resp = await fetch('/api/visitor/autoblock-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(updatedSettings)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.settings) {
          setAutoBlockSettings(data.settings);
          await logAdminAction('update', 'autoblock_settings', '비정상 방문자 자동 차단 설정 변경', 'info', user?.email || 'ADMIN');
          customAlert(language === 'en' ? "Auto-block security rules saved!" : "비정상 방문자 자동 차단 규칙이 업데이트되었습니다.");
          setShowAutoBlockSettingsModal(false);
        }
      }
    } catch (e: any) {
      customAlert(language === 'en' ? "Failed to save settings." : "자동 차단 설정 저장에 실패했습니다.");
    }
  };

  const fetchVisitorLogs = async () => {
    setLoadingLogs(true);
    setShowLogsModal('visitor');
    fetchAutoBlockSettings();
    try {
      const resp = await fetch('/api/visitor/list');
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          setVisitorLogs(data.logs || []);
          if (data.stats) setVisitorStats(data.stats);
        }
      } else {
        const q = firestoreQuery(collection(db, 'visitor_logs'), limit(100));
        const snap = await getDocs(q);
        const list: VisitorLog[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as VisitorLog));
        setVisitorLogs(list);
      }
    } catch (err) {
      console.warn("Failed to fetch visitor logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleToggleBlockVisitor = async (targetVisitorId: string, currentBlocked: boolean) => {
    try {
      const authHeaders = await getAuthHeaders();
      const resp = await fetch('/api/visitor/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ visitorId: targetVisitorId, block: !currentBlocked })
      });
      if (resp.ok) {
        setVisitorLogs(prev => prev.map(v => v.visitorId === targetVisitorId ? { ...v, isBlocked: !currentBlocked } : v));
        customAlert(
          language === 'en'
            ? (!currentBlocked ? "Visitor blocked successfully." : "Visitor unblocked.")
            : (!currentBlocked ? "해당 방문자가 차단 등록되었습니다." : "해당 방문자의 차단이 해제되었습니다.")
        );
      }
    } catch (err: any) {
      customAlert(language === 'en' ? "Failed to update block status." : "방문자 차단 상태 변경에 실패했습니다.");
    }
  };

  const clearVisitorLogs = async () => {
    customConfirm(
      language === 'en' 
        ? "Are you sure you want to clear all visitor logs? This action cannot be undone."
        : "모든 방문자 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      async () => {
        setLoadingLogs(true);
        try {
          const authHeaders = await getAuthHeaders();
          await fetch('/api/logs/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ type: 'visitor' })
          });
          setVisitorLogs([]);
          setVisitorStats({ totalVisitors: 0, todayVisitors: 0, activeNowCount: 0, memberCount: 0, guestCount: 0 });
          await logAdminAction('delete', 'visitor_logs', '방문자 정보 기록 전체 삭제', 'warning', user?.email || 'ADMIN');
          customAlert(language === 'en' ? "Visitor logs cleared successfully." : "방문자 로그가 성공적으로 초기화되었습니다.");
        } catch (e: any) {
          customAlert(language === 'en' ? "Failed to clear visitor logs." : "방문자 로그 삭제 중 오류가 발생했습니다.");
        } finally {
          setLoadingLogs(false);
        }
      }
    );
  };

  const handleDownloadLogs = () => {
    if (!showLogsModal) return;
    
    let logsToDownload: any[] = [];
    let fileName = `winfix_${showLogsModal}_logs_${new Date().toISOString().split('T')[0]}.json`;

    if (showLogsModal === 'admin') logsToDownload = adminLogs;
    else if (showLogsModal === 'search') logsToDownload = searchLogs;
    else if (showLogsModal === 'feedback') logsToDownload = feedbackLogs;
    else if (showLogsModal === 'error') logsToDownload = appErrorLogs;
    else if (showLogsModal === 'backend_logs') logsToDownload = backendLogs;
    else if (showLogsModal === 'visitor') logsToDownload = visitorLogs;

    const cleanedLogs = logsToDownload.map((log) => {
      const cleanLog = { ...log };
      
      if (cleanLog.timestamp && typeof cleanLog.timestamp.toDate === 'function') {
        try {
          cleanLog.formattedTimestamp = cleanLog.timestamp.toDate().toLocaleString();
          cleanLog.isoTimestamp = cleanLog.timestamp.toDate().toISOString();
          cleanLog.timestamp = {
            seconds: cleanLog.timestamp.seconds,
            nanoseconds: cleanLog.timestamp.nanoseconds
          };
        } catch (e) {
          console.warn("Failed to convert log timestamp", e);
        }
      } else if (cleanLog.timestamp) {
        try {
          const d = new Date(cleanLog.timestamp);
          if (!isNaN(d.getTime())) {
            cleanLog.formattedTimestamp = d.toLocaleString();
            cleanLog.isoTimestamp = d.toISOString();
          }
        } catch {}
      }
      return cleanLog;
    });

    try {
      const jsonStr = JSON.stringify(cleanedLogs, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      customAlert(language === 'en' ? `Logs downloaded successfully: ${cleanedLogs.length} items.` : `현재 로그 자료 ${cleanedLogs.length}건이 JSON 파일로 다운로드되었습니다.`);
    } catch (e: any) {
      customAlert(language === 'en' ? `Failed to download: ${e.message}` : `다운로드 실패: ${e.message}`);
    }
  };

  const filteredVisitorLogs = visitorLogs.filter((v) => {
    if (visitorFilter === 'members' && (!v.userEmail || v.userEmail === 'anonymous')) return false;
    if (visitorFilter === 'guests' && (v.userEmail && v.userEmail !== 'anonymous')) return false;
    if (visitorFilter === 'blocked' && !v.isBlocked) return false;
    if (visitorFilter === 'autoblocked' && (!v.isBlocked || !v.autoBlocked)) return false;

    if (visitorDeviceFilter !== 'all' && v.deviceType !== visitorDeviceFilter) return false;

    if (visitorQuery.trim()) {
      const q = visitorQuery.toLowerCase();
      const matchId = (v.visitorId || '').toLowerCase().includes(q);
      const matchEmail = (v.userEmail || '').toLowerCase().includes(q);
      const matchIp = (v.ip || '').toLowerCase().includes(q);
      const matchBrowser = (v.browser || '').toLowerCase().includes(q);
      const matchOs = (v.os || '').toLowerCase().includes(q);
      const matchReason = (v.blockReason || '').toLowerCase().includes(q);
      return matchId || matchEmail || matchIp || matchBrowser || matchOs || matchReason;
    }

    return true;
  });

  const clearAdminLogs = () => {
    if (!isAdmin) {
      customAlert(language === 'en' ? "Permission denied. Admin access required." : "권한이 없습니다. 관리자 권한이 필요합니다.");
      return;
    }
    customConfirm(language === 'en' ? "Clear all admin activity logs?" : "모든 관리자 활동 로그를 삭제하시겠습니까?", async () => {
      setLoadingLogs(true);
    const path = 'admin_logs';
    try {
      let deletedCount = 0;
      let hasMore = true;
      
      while (hasMore) {
        const q = firestoreQuery(collection(db, path), limit(500));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          hasMore = false;
          break;
        }

        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        
        deletedCount += snap.size;
        // Increase safety break for logs
        if (deletedCount > 50000) {
           console.warn("Too many logs, stopping cleanup early.");
           hasMore = false;
        }
      }

      setAdminLogs([]);
      setLogCursors(prev => ({ ...prev, admin: [] }));
      setLogPages(prev => ({ ...prev, admin: 0 }));
      setLogHasMore(prev => ({ ...prev, admin: false }));
      
      await logAdminAction('delete', 'system', `관리자 활동 로그가 시스템 관리자에 의해 초기화되었습니다. (${deletedCount}건)`, 'warning', 'SYSTEM');
      customAlert(language === 'en' ? `Logs cleared (${deletedCount} deleted).` : `로그가 삭제되었습니다. (${deletedCount}건 삭제됨)`);
    } catch (e: any) {
      if (e.message?.includes('Quota') || e.message?.includes('quota') || e.code === 'resource-exhausted') {
        console.warn("Failed to clear admin logs: Quota Exceeded");
        customAlert(language === 'en' ? "Failed: Database quota exceeded. Please try again tomorrow." : "삭제 실패: 데이터베이스 할당량이 초과되었습니다. 내일 다시 시도해주세요.");
      } else {
        console.error("Failed to clear admin logs:", e);
        customAlert(language === 'en' ? "Error clearing logs:" : "로그 삭제 오류:");
      }
      try { handleFirestoreError(e, OperationType.DELETE, path); } catch(err) {}
    } finally {
      setLoadingLogs(false);
    }
    });
  };

  const fetchSearchLogs = async (page = 0) => {
    if (!isAdmin) return;
    setLoadingLogs(true);
    const path = 'search_logs';
    try {
      let q;
      const baseQ = firestoreQuery(collection(db, path), orderBy('timestamp', 'desc'));
      
      if (page === 0) {
        q = firestoreQuery(baseQ, limit(51));
      } else {
        const cursor = logCursors.search[page - 1];
        if (!cursor) throw new Error("Invalid page cursor");
        q = firestoreQuery(baseQ, startAfter(cursor), limit(51));
      }
      
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.slice(0, 50);
      const logs = docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      setSearchLogs(logs);
      setLogHasMore(prev => ({ ...prev, search: querySnapshot.docs.length > 50 }));
      setLogPages(prev => ({ ...prev, search: page }));
      
      if (docs.length > 0) {
        const nextCursor = docs[docs.length - 1];
        setLogCursors(prev => {
          const newCursors = [...prev.search];
          newCursors[page] = nextCursor;
          return { ...prev, search: newCursors };
        });
      }
      
      setShowLogsModal('search');
    } catch (e: any) {
      if (e.message?.includes('Quota') || e.message?.includes('quota')) {
        alert(language === 'en' ? "Failed to load logs: Quota exceeded." : "로그를 불러오는데 실패했습니다: 할당량 초과.");
      } else {
        alert(language === 'en' ? "Failed to load logs." : "로그를 불러오는데 실패했습니다.");
      }
      try {
        handleFirestoreError(e, OperationType.LIST, path);
      } catch (err) {
        // Ignore the thrown error from handleFirestoreError
      }
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchFeedbackLogs = async (page = 0) => {
    if (!isAdmin) return;
    setLoadingLogs(true);
    const path = 'feedback';
    try {
      let q;
      const baseQ = firestoreQuery(collection(db, path), orderBy('timestamp', 'desc'));
      
      if (page === 0) {
        q = firestoreQuery(baseQ, limit(51));
      } else {
        const cursor = logCursors.feedback[page - 1];
        if (!cursor) throw new Error("Invalid page cursor");
        q = firestoreQuery(baseQ, startAfter(cursor), limit(51));
      }
      
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.slice(0, 50);
      const logs = docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      setFeedbackLogs(logs);
      setLogHasMore(prev => ({ ...prev, feedback: querySnapshot.docs.length > 50 }));
      setLogPages(prev => ({ ...prev, feedback: page }));
      
      if (docs.length > 0) {
        const nextCursor = docs[docs.length - 1];
        setLogCursors(prev => {
          const newCursors = [...prev.feedback];
          newCursors[page] = nextCursor;
          return { ...prev, feedback: newCursors };
        });
      }
      
      setShowLogsModal('feedback');
    } catch (e: any) {
      if (e.message?.includes('Quota') || e.message?.includes('quota')) {
        alert(language === 'en' ? "Failed to load logs: Quota exceeded." : "로그를 불러오는데 실패했습니다: 할당량 초과.");
      } else {
        alert(language === 'en' ? "Failed to load logs." : "로그를 불러오는데 실패했습니다.");
      }
      try {
        handleFirestoreError(e, OperationType.LIST, path);
      } catch (err) {
        // Ignore the thrown error from handleFirestoreError
      }
    } finally {
      setLoadingLogs(false);
    }
  };

  const clearSearchLogs = () => {
    if (!isAdmin) {
      customAlert(language === 'en' ? "Permission denied. Admin access required." : "권한이 없습니다. 관리자 권한이 필요합니다.");
      return;
    }
    customConfirm(language === 'en' ? "Clear all search logs?" : "모든 검색 로그를 삭제하시겠습니까?", async () => {
      setLoadingLogs(true);
    const path = 'search_logs';
    try {
      let deletedCount = 0;
      let hasMore = true;
      while (hasMore) {
        const q = firestoreQuery(collection(db, path), limit(500));
        const snap = await getDocs(q);
        if (snap.empty) {
          hasMore = false;
          break;
        }
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        deletedCount += snap.size;
        if (deletedCount > 50000) break;
      }
      setSearchLogs([]);
      setLogCursors(prev => ({ ...prev, search: [] }));
      setLogPages(prev => ({ ...prev, search: 0 }));
      setLogHasMore(prev => ({ ...prev, search: false }));
      
      await logAdminAction('delete', 'system', `검색 로그가 시스템 관리자에 의해 초기화되었습니다. (${deletedCount}건)`, 'warning', 'SYSTEM');
      customAlert(language === 'en' ? `Search logs cleared (${deletedCount} deleted).` : `검색 로그가 삭제되었습니다. (${deletedCount}건 삭제됨)`);
    } catch (e: any) {
      if (e.message?.includes('Quota') || e.message?.includes('quota') || e.code === 'resource-exhausted') {
        console.warn("Failed to clear search logs: Quota Exceeded");
        customAlert(language === 'en' ? "Failed: Database quota exceeded. Please try again tomorrow." : "삭제 실패: 데이터베이스 할당량이 초과되었습니다. 내일 다시 시도해주세요.");
      } else {
        console.error("Failed to clear search logs:", e);
        customAlert(language === 'en' ? "Error clearing logs:" : "로그 삭제 오류:");
      }
      try { handleFirestoreError(e, OperationType.DELETE, path); } catch(err) {}
    } finally {
      setLoadingLogs(false);
    }
    });
  };

  const clearFeedbackLogs = () => {
    if (!isAdmin) {
      customAlert(language === 'en' ? "Permission denied. Admin access required." : "권한이 없습니다. 관리자 권한이 필요합니다.");
      return;
    }
    customConfirm(language === 'en' ? "Clear all feedback logs?" : "모든 피드백 로그를 삭제하시겠습니까?", async () => {
      setLoadingLogs(true);
    const path = 'feedback';
    try {
      let deletedCount = 0;
      let hasMore = true;
      while (hasMore) {
        const q = firestoreQuery(collection(db, path), limit(500));
        const snap = await getDocs(q);
        if (snap.empty) {
          hasMore = false;
          break;
        }
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        deletedCount += snap.size;
        if (deletedCount > 50000) break;
      }
      setFeedbackLogs([]);
      setLogCursors(prev => ({ ...prev, feedback: [] }));
      setLogPages(prev => ({ ...prev, feedback: 0 }));
      setLogHasMore(prev => ({ ...prev, feedback: false }));
      
      await logAdminAction('delete', 'system', `피드백 로그가 시스템 관리자에 의해 초기화되었습니다. (${deletedCount}건)`, 'warning', 'SYSTEM');
      customAlert(language === 'en' ? `Feedback cleared (${deletedCount} deleted).` : `피드백 로그가 삭제되었습니다. (${deletedCount}건 삭제됨)`);
    } catch (e: any) {
      if (e.message?.includes('Quota') || e.message?.includes('quota') || e.code === 'resource-exhausted') {
        console.warn("Failed to clear feedback logs: Quota Exceeded");
        customAlert(language === 'en' ? "Failed: Database quota exceeded. Please try again tomorrow." : "삭제 실패: 데이터베이스 할당량이 초과되었습니다. 내일 다시 시도해주세요.");
      } else {
        console.error("Failed to clear feedback logs:", e);
        customAlert(language === 'en' ? "Error clearing logs:" : "로그 삭제 오류:");
      }
      try { handleFirestoreError(e, OperationType.DELETE, path); } catch(err) {}
    } finally {
      setLoadingLogs(false);
    }
    });
  };
  const fetchEngineStatus = async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch("/api/engine/status", {
        headers: { "Authorization": `Bearer ${idToken}` }
      });
      const data = await parseJsonResponse(resp);
      if (data.success) {
        setEngineStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch engine status:", e);
    }
  };

  const runEngineNow = async () => {
    setIsEngineActionLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch("/api/engine/run-now", {
        method: "POST",
        headers: { "Authorization": `Bearer ${idToken}` }
      });
      const data = await parseJsonResponse(resp);
      if (data.success) {
        customAlert(language === 'en' ? "Engine triggered successfully. Please refresh logs in a few seconds." : "엔진이 가동되었습니다. 잠시 후 로그를 새로고침 하세요.");
        setTimeout(() => fetchBackendLogs(false), 3000);
      } else {
        customAlert(`Error: ${data.error}`);
      }
    } catch (e: any) {
      customAlert(`Error: ${e.message}`);
    } finally {
      setIsEngineActionLoading(false);
    }
  };

  const handleTestAlert = async () => {
    setIsTestingAlert(true);
    setTestAlertResult(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch("/api/engine/test-alert", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ recipient: testAlertRecipient })
      });
      const data = await parseJsonResponse(resp);
      setTestAlertResult(data);
      if (data.success) {
        setTimeout(fetchEngineStatus, 1500);
      }
    } catch (e: any) {
      setTestAlertResult({ success: false, error: e.message });
    } finally {
      setIsTestingAlert(false);
    }
  };

  const handleTestSmtpConnection = async () => {
    setIsTestingSmtpConn(true);
    setSmtpTestResult(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch("/api/admin/smtp/verify", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          smtpHost: maintenanceSettings.smtpHost,
          smtpPort: maintenanceSettings.smtpPort,
          smtpUser: maintenanceSettings.smtpUser,
          smtpPass: maintenanceSettings.smtpPass
        })
      });
      const data = await parseJsonResponse(resp);
      if (data.success) {
        setSmtpTestResult({
          success: true,
          message: data.message || (language === 'en' ? 'SMTP connection and authentication verified!' : 'SMTP 서버 연결 및 인증이 정상 확인되었습니다.')
        });
      } else {
        setSmtpTestResult({
          success: false,
          error: data.error || (language === 'en' ? 'SMTP connection test failed.' : 'SMTP 연결 및 계정 검증 실패')
        });
      }
    } catch (e: any) {
      setSmtpTestResult({
        success: false,
        error: e.message || (language === 'en' ? 'Network or server error during SMTP verify.' : 'SMTP 검증 중 네트워크 오류가 발생했습니다.')
      });
    } finally {
      setIsTestingSmtpConn(false);
    }
  };

  const handleResetSmtpSettings = () => {
    customConfirm(
      language === 'en'
        ? 'Are you sure you want to reset SMTP settings to default? (Real email delivery will be disabled)'
        : 'SMTP 서버 연동 설정을 초기 상태로 되돌리시겠습니까? (실제 메일 연동이 해제되고 가상 샌드박스 모드로 전환됩니다)',
      async () => {
        setIsSavingSettings(true);
        setSmtpTestResult(null);
        try {
          const resetSettings = {
            ...maintenanceSettings,
            smtpHost: "",
            smtpPort: 587,
            smtpUser: "",
            smtpPass: "",
            updatedAt: getKSTISOString()
          };
          const idToken = await auth.currentUser?.getIdToken();
          const resp = await fetch("/api/settings/maintenance", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${idToken}`
            },
            body: JSON.stringify(resetSettings)
          });
          const data = await parseJsonResponse(resp);
          const finalSettings = data.settings || resetSettings;
          setMaintenanceSettings(finalSettings);
          localStorage.setItem('winfix_maintenance_settings', JSON.stringify(finalSettings));
          await logAdminAction('update', 'system_config', 'SMTP 연동 설정 초기화', 'success', 'SYSTEM');
          customAlert(language === 'en' ? 'SMTP settings have been reset to default.' : 'SMTP 연동 설정이 성공적으로 초기화되었습니다.');
        } catch (err: any) {
          console.error("Reset SMTP settings error:", err);
          customAlert(language === 'en' ? 'Failed to reset SMTP settings.' : 'SMTP 설정 초기화 중 오류가 발생했습니다.');
        } finally {
          setIsSavingSettings(false);
        }
      }
    );
  };

  const fetchAppErrorLogs = async (page = 0) => {
    if (!isAdmin) return;
    setLoadingLogs(true);
    const path = 'app_error_logs';
    try {
      let q;
      const baseQ = firestoreQuery(collection(db, path), orderBy('timestamp', 'desc'));
      
      if (page === 0) {
        q = firestoreQuery(baseQ, limit(51));
      } else {
        const cursor = logCursors.error[page - 1];
        if (!cursor) throw new Error("Invalid page cursor");
        q = firestoreQuery(baseQ, startAfter(cursor), limit(51));
      }
      
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.slice(0, 50);
      const logs = docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      setAppErrorLogs(logs);
      setLogHasMore(prev => ({ ...prev, error: querySnapshot.docs.length > 50 }));
      setLogPages(prev => ({ ...prev, error: page }));
      
      if (docs.length > 0) {
        const nextCursor = docs[docs.length - 1];
        setLogCursors(prev => {
          const newCursors = [...prev.error];
          newCursors[page] = nextCursor;
          return { ...prev, error: newCursors };
        });
      }
      
      setShowLogsModal('error');
    } catch (e: any) {
      if (e.message?.includes('Quota') || e.message?.includes('quota')) {
        alert(language === 'en' ? "Failed to load error logs: Quota exceeded." : "에러 로그를 불러오는데 실패했습니다: 할당량 초과.");
      } else {
        alert(language === 'en' ? "Failed to load error logs." : "에러 로그를 불러오는데 실패했습니다.");
      }
    } finally {
      setLoadingLogs(false);
    }
  };

  const clearBackendLogs = async () => {
    if (!isAdmin) return;
    customConfirm(language === 'en' ? "Clear all backend activity logs?" : "모든 백엔드 엔진 로그를 삭제하시겠습니까?", async () => {
      setIsLoadingBackendLogs(true);
      try {
        // 1. Clear Firestore Logs
        const snap = await getDocs(collection(db, 'backend_logs'));
        const chunks = [];
        for (let i = 0; i < snap.docs.length; i += 500) {
          chunks.push(snap.docs.slice(i, i + 500));
        }
        
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }

        // 2. Clear Local JSON Log File via API
        try {
          const idToken = await auth.currentUser?.getIdToken();
          if (idToken) {
            await fetch('/api/logs/clear', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({ type: 'backend' })
            });
          }
        } catch (localErr) {
          console.warn("Local JSON backend logs clear skipped/failed:", localErr);
        }
        
        setBackendLogs([]);
        customAlert(language === 'en' ? "Logs cleared." : "로그가 삭제되었습니다.");
      } catch (e: any) {
        customAlert(`Error: ${e.message}`);
      } finally {
        setIsLoadingBackendLogs(false);
      }
    });
  };

  const fetchBackendLogs = async (isModal = false) => {
    if (!isAdmin) return;
    setIsLoadingBackendLogs(true);
    let logsLoaded = false;

    // 1. Try fetching from Cloud Firestore
    try {
      const q = firestoreQuery(
        collection(db, 'backend_logs'),
        orderBy('timestamp', 'desc'),
        limit(isModal ? 100 : 100)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const logs = snap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          timestamp: d.data().timestamp?.toDate ? d.data().timestamp.toDate() : new Date(d.data().timestamp)
        } as BackendLog));
        setBackendLogs(logs);
        logsLoaded = true;
      }
    } catch (e: any) {
      console.warn("Backend logs fetch from Firestore skipped/failed, trying local server API:", e.message || e);
    }

    // 2. Resilient Dual-Source Fallback: Fetch from server-side local File Database
    if (!logsLoaded) {
      try {
        const resp = await fetch('/api/logs/backend');
        const json = await parseJsonResponse(resp);
        if (json.success && Array.isArray(json.logs)) {
          const logs = json.logs.slice(0, isModal ? 100 : 100).map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp)
          }));
          setBackendLogs(logs);
          logsLoaded = true;
        }
      } catch (localErr: any) {
        console.error("Local backend logs fetch fallback failed:", localErr);
        if (isModal) {
          alert(language === 'en' ? "Failed to load backend logs from all sources." : "모든 경로에서 엔진 로그를 불러오는데 실패했습니다.");
        }
      }
    }

    if (isModal && logsLoaded) {
      fetchEngineStatus();
      setShowLogsModal('backend_logs');
    }
    
    setIsLoadingBackendLogs(false);
  };

  const [isReclassifying, setIsReclassifying] = useState(false);
  const [reclassifyProgress, setReclassifyProgress] = useState({ current: 0, total: 0 });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  const reclassifyUncategorizedIssues = async () => {
    if (!isAdmin) return;
    
    setIsReclassifying(true);
    setAiSuggestions([]);
    setReclassifyProgress({ current: 0, total: 0 });
    const path = 'issues';
    
    try {
      // 1. Identify all "others" style categories from the current counts
      const officialNames = ['업데이트', '네트워크', '시스템/블루스크린', '스토어/앱', '정품인증', '보안/백신', '하드웨어/드라이버', '성능/프리징', '파일 시스템/저장소'];
      const othersVariations = ['기타', '미분류', '기타/미분류', 'Others', 'Uncategorized', 'ETC', 'None', 'undefined'];
      
      let actualOthersCategories = Object.keys(categoryCounts).filter(cat => 
        othersVariations.some(v => cat.toLowerCase().includes(v.toLowerCase())) || 
        (cat !== '전체' && !officialNames.includes(cat))
      );

      console.log("Detected 'Others' categories in DB:", actualOthersCategories);

      const activeDbMode = (localStorage.getItem('winfix_db_mode') as 'firestore' | 'server_file') || dbMode;
      let docsToAnalyze: { id: string; title: string; title_en?: string; symptoms?: string; content?: string; description?: string; category?: string }[] = [];

      if (activeDbMode === 'server_file') {
        console.log("Fetching issues from server JSON for re-classification...");
        try {
          const resp = await fetch('/api/issues?category=전체');
          const json = await parseJsonResponse(resp);
          if (json.success && Array.isArray(json.issues)) {
            const allIssues = json.issues;
            docsToAnalyze = allIssues.filter((i: any) => {
              const cat = i.category;
              return !cat || 
                cat === "" || 
                othersVariations.some(v => String(cat).toLowerCase().includes(v.toLowerCase())) ||
                !officialNames.includes(cat);
            });
          }
        } catch (restErr: any) {
          console.error("Local issues REST fetch failed:", restErr);
        }
      } else {
        try {
          let snapDocs: any[] = [];
          // Step A: Fetch explicit 'Others' categories
          if (actualOthersCategories.length > 0) {
            const queryCategories = actualOthersCategories.slice(0, 10);
            const q = firestoreQuery(
              collection(db, path), 
              where('category', 'in', queryCategories),
              limit(200) 
            );
            const snap = await getDocs(q);
            snapDocs = [...snap.docs];
          }

          // Step B: Fallback/Supplement for missing categories (where field is null or missing)
          if (snapDocs.length < 50) {
            console.log("Fetching recent docs to find missing categories...");
            const qRecent = firestoreQuery(collection(db, path), orderBy('createdAt', 'desc'), limit(500));
            const snapRecent = await getDocs(qRecent);
            const missingCatDocs = snapRecent.docs.filter(d => {
              const cat = d.data().category;
              return !cat || 
                cat === "" || 
                othersVariations.some(v => String(cat).toLowerCase().includes(v.toLowerCase())) ||
                !officialNames.includes(cat);
            });
            
            const existingIds = new Set(snapDocs.map(d => d.id));
            for (const doc of missingCatDocs) {
              if (!existingIds.has(doc.id)) {
                snapDocs.push(doc);
                if (snapDocs.length >= 300) break;
              }
            }
          }

          docsToAnalyze = snapDocs.map(d => ({
            id: d.id,
            title: d.data().title,
            title_en: d.data().title_en,
            symptoms: d.data().symptoms,
            content: d.data().content,
            description: d.data().description,
            category: d.data().category
          }));
        } catch (dbErr: any) {
          console.warn("Firestore fetch for reclassify failed (likely quota limit), falling back to REST JSON source.");
          setDbMode('server_file');
          localStorage.setItem('winfix_db_mode', 'server_file');
          localStorage.setItem('winfix_db_mode_fallback', 'true');
          setDbStatus('quota');

          try {
            const resp = await fetch('/api/issues?category=전체');
            const json = await parseJsonResponse(resp);
            if (json.success && Array.isArray(json.issues)) {
              docsToAnalyze = json.issues.filter((i: any) => {
                const cat = i.category;
                return !cat || 
                  cat === "" || 
                  othersVariations.some(v => String(cat).toLowerCase().includes(v.toLowerCase())) ||
                  !officialNames.includes(cat);
              });
            }
          } catch (restErr: any) {
            console.error("Local issues REST fetch fallback failed:", restErr);
          }
        }
      }

      console.log(`Analyzing ${docsToAnalyze.length} candidate issues for re-classification.`);

      if (docsToAnalyze.length === 0) {
        alert(language === 'en' ? "No issues found in 'Others' categories for re-classification." : "'기타/미분류'로 분류할 항목을 찾지 못했습니다. 이미 모두 분류되었거나 데이터가 없습니다.");
        setIsReclassifying(false);
        return;
      }

      setReclassifyProgress({ current: 0, total: docsToAnalyze.length });
      const ai = getAiClient();

      const batchSize = 10;
      const allSuggestions: any[] = [];

      for (let i = 0; i < docsToAnalyze.length; i += batchSize) {
        const batchDocs = docsToAnalyze.slice(i, i + batchSize);
        const chunkToAnalyze = batchDocs.map(d => ({
          id: d.id,
          title: d.title || d.title_en || "No Title",
          content: (d.symptoms || d.content || d.description || "").substring(0, 400),
          currentCategory: d.category
        }));

        const prompt = `Task: Re-classify these Windows troubleshooting records.
        Target Categories: [${officialCategories.map(c => c.kr).join(', ')}]
        
        Rules:
        1. If a case fits an official category, suggest it.
        2. If it doesn't fit, suggest "KEEP".
        3. Return ONLY JSON array.
        
        Input: ${JSON.stringify(chunkToAnalyze)}
        Format: [{"id": "...", "suggestedCategory": "..."}]`;

        const response = await callAiWithFallback(ai, prompt);
        let text = response.trim();
        
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) text = jsonMatch[0];

        try {
          const batchRes = parseAiJson(text);
          batchRes.forEach((s: any) => {
            if (s.suggestedCategory && s.suggestedCategory !== 'KEEP' && officialNames.includes(s.suggestedCategory)) {
              const docMatch = batchDocs.find(d => d.id === s.id);
              if (docMatch) {
                allSuggestions.push({
                  id: s.id,
                  title: docMatch.title || docMatch.title_en,
                  currentCategory: docMatch.category || 'Uncategorized',
                  suggestedCategory: s.suggestedCategory,
                  selected: true
                });
              }
            }
          });
        } catch (e) {
          console.error("AI parse error:", text);
        }

        setReclassifyProgress(prev => ({ ...prev, current: Math.min(i + batchSize, docsToAnalyze.length) }));
      }

      if (allSuggestions.length === 0) {
        alert(language === 'en' ? "AI did not find better categories." : "AI가 더 적합한 카테고리를 찾지 못했습니다.");
      } else {
        setAiSuggestions(allSuggestions);
        setShowReviewModal(true);
      }
    } catch (err: any) {
      console.error("Analysis failed:", err);
      logAppError(err.message, 'error', 'AiReclassify', err.stack);
      alert(language === 'en' ? "An error occurred during re-classification: " + err.message : "재분류 진행 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsReclassifying(false);
    }
  };

  const applyAISuggestions = () => {
    const selected = aiSuggestions.filter(s => s.selected);
    if (selected.length === 0) return;
    
    customConfirm(language === 'en' ? `Are you sure you want to apply the suggested categories to ${selected.length} items?` : `${selected.length}건의 항목에 대해 제안된 카테고리를 일괄 적용하시겠습니까?`, async () => {
      setIsReclassifying(true);
      try {
        console.log(`Starting patch application for ${selected.length} items...`);
        const pathToken = 'issues';
        
        const activeDbMode = (localStorage.getItem('winfix_db_mode') as 'firestore' | 'server_file') || dbMode;
        if (activeDbMode === 'server_file') {
          console.log("Applying updates to server file-based database...");
          for (const s of selected) {
            try {
              await fetch(`/api/issues/${s.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  category: s.suggestedCategory,
                  updatedAt: new Date().toISOString(),
                  _aiReclassifiedAt: new Date().toISOString(),
                  _reviewedByAdmin: true
                })
              });
            } catch (restErr: any) {
              console.error(`Failed to patch local issue ${s.id}:`, restErr);
            }
          }
        } else {
          try {
            // Process in chunks of 500 (Firestore batch limit)
            for (let i = 0; i < selected.length; i += 500) {
              const batch = writeBatch(db);
              const chunk = selected.slice(i, i + 500);
              
              chunk.forEach(s => {
                const docRef = doc(db, pathToken, s.id);
                batch.update(docRef, {
                  category: s.suggestedCategory,
                  updatedAt: new Date(),
                  _aiReclassifiedAt: new Date(),
                  _reviewedByAdmin: true
                });
              });
              
              await batch.commit();
              trackUsage(0, chunk.length);
              
              setReclassifyProgress({ current: Math.min(i + 500, selected.length), total: selected.length });
            }
          } catch (batchErr: any) {
            console.warn("Firestore batch apply failed (likely quota limit), automatically switching to REST JSON apply.");
            setDbMode('server_file');
            localStorage.setItem('winfix_db_mode', 'server_file');
            localStorage.setItem('winfix_db_mode_fallback', 'true');
            setDbStatus('quota');

            // Fallback REST PATCH updates
            for (const s of selected) {
              try {
                await fetch(`/api/issues/${s.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    category: s.suggestedCategory,
                    updatedAt: new Date().toISOString(),
                    _aiReclassifiedAt: new Date().toISOString(),
                    _reviewedByAdmin: true
                  })
                });
              } catch (restErr: any) {
                console.error(`Failed to patch local issue ${s.id}:`, restErr);
              }
            }
          }
        }

        customAlert(language === 'en' ? `Applied successfully: ${selected.length} items updated.` : `성공적으로 적용되었습니다: ${selected.length}개 항목 업데이트 완료.`);
        setShowReviewModal(false);
        setAiSuggestions([]);
        
        // Force refresh data
        await Promise.all([
          fetchCategoryCounts(true),
          fetchIssues(false, true)
        ]);
        
        await logAdminAction('update', 'system', `관리자 검토 후 AI 재분류 결과를 ${selected.length}건 적용했습니다.`, 'info', 'SYSTEM');
      } catch (err: any) {
        console.error("Apply operation failed:", err);
        logAppError(err.message, 'error', 'AiApply', err.stack);
        customAlert(language === 'en' ? "Failed to apply changes: " + err.message : "적용 실패: " + err.message);
      } finally {
        setIsReclassifying(false);
      }
    });
  };

  const clearAppErrorLogs = () => {
    if (!isAdmin) {
      customAlert(language === 'en' ? "Permission denied. Admin access required." : "권한이 없습니다. 관리자 권한이 필요합니다.");
      return;
    }
    customConfirm(language === 'en' ? "Clear all app error logs?" : "모든 앱 에러 로그를 삭제하시겠습니까?", async () => {
      setLoadingLogs(true);
    const path = 'app_error_logs';
    try {
      let deletedCount = 0;
      let hasMore = true;
      
      while (hasMore) {
        const q = firestoreQuery(collection(db, path), limit(500));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          hasMore = false;
          break;
        }

        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        
        deletedCount += snap.size;
        if (deletedCount > 50000) {
           console.warn("Too many logs, stopping cleanup early.");
           hasMore = false;
        }
      }

      setAppErrorLogs([]);
      setLogCursors(prev => ({ ...prev, error: [] }));
      setLogPages(prev => ({ ...prev, error: 0 }));
      setLogHasMore(prev => ({ ...prev, error: false }));
      
      try {
        await logAdminAction('delete', 'system', `앱 에러 로그가 시스템 관리자에 의해 초기화되었습니다. (${deletedCount}건)`, 'warning', 'SYSTEM');
      } catch (logErr) {
        console.warn("Failed to log admin action for cleanup:", logErr);
      }
      customAlert(language === 'en' ? `Logs cleared (${deletedCount} deleted).` : `로그가 삭제되었습니다. (${deletedCount}건 삭제됨)`);
    } catch (e: any) {
      if (e.message?.includes('Quota') || e.message?.includes('quota') || e.code === 'resource-exhausted') {
        console.warn("Failed to clear app error logs: Quota Exceeded");
        customAlert(language === 'en' ? "Failed: Database quota exceeded. Please try again tomorrow." : "삭제 실패: 데이터베이스 할당량이 초과되었습니다. 내일 다시 시도해주세요.");
      } else {
        console.error("Failed to clear app error logs:", e);
        customAlert(language === 'en' ? "Error clearing logs:" : "로그 삭제 오류:");
      }
      try { handleFirestoreError(e, OperationType.DELETE, path); } catch(err) {}
    } finally {
      setLoadingLogs(false);
    }
    });
  };

  const handleDeleteClick = (issueId: string) => {
    customConfirm(language === 'en' ? "Are you sure you want to delete this issue?" : "정말로 이 이슈를 삭제하시겠습니까?", async () => {
      const path = `issues/${issueId}`;
      try {
        await deleteDoc(doc(db, 'issues', issueId));
        await logAdminAction('delete', issueId, `Deleted issue: ${issueId}`, 'warning', 'ISSUE');
        setDbIssues(prev => {
          const filtered = prev.filter(i => i.id !== issueId);
          syncItemsToLocalCache(filtered);
          return filtered;
        });
        customAlert(language === 'en' ? "Deleted successfully." : "삭제되었습니다.");
      } catch (error: any) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    });
  };

  const handleUpdateIssue = async () => {
    if (!editingIssue) return;
    const path = `issues/${editingIssue.id}`;
    try {
      const issueRef = doc(db, 'issues', editingIssue.id);
      const searchKeywords = generateSearchKeywords({ ...editingIssue, ...editForm });
      const updatedData = {
        ...editForm,
        searchKeywords,
        verifiedAt: getKSTISOString(),
        verificationStatus: 'verified',
        aiFeedback: "관리자에 의해 수동으로 검증 및 수정된 데이터입니다."
      };

      // Calculate changes for logging
      const changes: Record<string, { old: any, new: any }> = {};
      const fieldsToTrack = ['title', 'code', 'symptoms', 'script', 'manualSteps', 'category', 'osVersion'];
      fieldsToTrack.forEach(field => {
        const oldVal = (editingIssue as any)[field];
        const newVal = (updatedData as any)[field];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes[field] = { old: oldVal, new: newVal };
        }
      });

      await updateDoc(issueRef, updatedData);
      trackUsage(0, 1);
      await logAdminAction('update', editingIssue.id, `Updated issue: ${editingIssue.title}`, 'success', 'ISSUE', changes);
      setDbIssues(prev => {
        const mapped = prev.map(i => i.id === editingIssue.id ? { ...i, ...updatedData } as KnownIssue : i);
        syncItemsToLocalCache(mapped);
        return mapped;
      });
      setEditingIssue(null);
      alert(language === 'en' ? "Updated successfully." : "수정되었습니다.");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleVote = async (issueId: string, voteType: 'up' | 'down') => {
    if (!user) {
      alert(language === 'en' ? "Please log in to vote." : "투표하려면 로그인이 필요합니다.");
      return;
    }

    const issue = dbIssues.find(i => i.id === issueId);
    if (!issue) return;

    const upvotedBy = issue.upvotedBy || [];
    const downvotedBy = issue.downvotedBy || [];

    let newUpvotedBy = [...upvotedBy];
    let newDownvotedBy = [...downvotedBy];

    if (voteType === 'up') {
      if (upvotedBy.includes(user.uid)) {
        newUpvotedBy = newUpvotedBy.filter(id => id !== user.uid);
      } else {
        newUpvotedBy.push(user.uid);
        newDownvotedBy = newDownvotedBy.filter(id => id !== user.uid);
      }
    } else {
      if (downvotedBy.includes(user.uid)) {
        newDownvotedBy = newDownvotedBy.filter(id => id !== user.uid);
      } else {
        newDownvotedBy.push(user.uid);
        newUpvotedBy = newUpvotedBy.filter(id => id !== user.uid);
      }
    }

    const path = `issues/${issueId}`;
    try {
      const issueRef = doc(db, 'issues', issueId);
      await updateDoc(issueRef, {
        upvotedBy: newUpvotedBy,
        downvotedBy: newDownvotedBy,
        upvoteCount: newUpvotedBy.length
      });

      const updatedIssues = dbIssues.map(i => 
        i.id === issueId 
          ? { ...i, upvotedBy: newUpvotedBy, downvotedBy: newDownvotedBy, upvoteCount: newUpvotedBy.length } as KnownIssue
          : i
      );
      setDbIssues(updatedIssues);
      syncItemsToLocalCache(updatedIssues);
      
      // Update popularIssues locally
      setPopularIssues(prev => {
        const updated = prev.map(i => 
          i.id === issueId 
            ? { ...i, upvotedBy: newUpvotedBy, downvotedBy: newDownvotedBy } 
            : i
        );
        // Re-sort in case the order changed
        return updated.sort((a, b) => (b.upvotedBy?.length || 0) - (a.upvotedBy?.length || 0));
      });

      // Update recentIssues locally
      setRecentIssues(prev => prev.map(i => 
        i.id === issueId 
          ? { ...i, upvotedBy: newUpvotedBy, downvotedBy: newDownvotedBy } 
          : i
      ));
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Pagination states
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastIssueElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && selectedCategory !== null) {
        fetchIssues(true);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore, selectedCategory, lastDoc]);

  const fetchAiKnowledge = async () => {
    try {
      // Free Usage Strategy: Cache AI knowledge for 6 hours to minimize reads
      const cached = localStorage.getItem('ai_knowledge_cache');
      const cachedTime = localStorage.getItem('ai_knowledge_cache_time');
      if (cached && cachedTime && Date.now() - Number(cachedTime) < 1000 * 60 * 60 * 6) {
        setAiOptimizedKnowledge(cached);
        console.log("Serving AI Knowledge from cache");
        return;
      }

      const docSnap = await getDoc(doc(db, 'ai_config', 'knowledge'));
      trackUsage(1, 0);
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        const text = data.content;
        setAiOptimizedKnowledge(text);
        if (data.updatedAt) {
          setAiOptimizedAt(data.updatedAt instanceof Date ? data.updatedAt : data.updatedAt.toDate());
        }
        localStorage.setItem('ai_knowledge_cache', text);
        localStorage.setItem('ai_knowledge_cache_time', Date.now().toString());
      }
    } catch (e) {
      console.warn("Failed to fetch AI knowledge", e);
    }
  };

  const optimizeAiModel = async () => {
    if (!isAdmin || !user) return;
    setIsOptimizingAi(true);
    try {
      const feedbackSnap = await getDocs(firestoreQuery(collection(db, 'feedback'), where('isSolved', '==', true), limit(30)));
      const adminLogsSnap = await getDocs(firestoreQuery(collection(db, 'admin_logs'), where('category', '==', 'ISSUE'), limit(30)));
      
      let solvedPatterns: any[] = feedbackSnap.docs.map(d => ({ title: d.data().issueTitle, comment: d.data().comment }));
      const updatePatterns = adminLogsSnap.docs.map(d => {
        const data = d.data();
        if (data.changes) {
          return { details: data.details, changes: data.changes };
        }
        return { details: data.details };
      });

      // If no feedback/logs, use current issues as a general knowledge source
      if (solvedPatterns.length === 0 && updatePatterns.length === 0) {
        const issuesSnap = await getDocs(firestoreQuery(collection(db, 'issues'), limit(20)));
        if (issuesSnap.empty) {
          alert(language === 'en' ? "Insufficient data for optimization. No issues or feedback found." : "데이터가 부족합니다. 등록된 오류나 피드백이 없어 최적화할 수 없습니다.");
          setIsOptimizingAi(false);
          return;
        }
        solvedPatterns = issuesSnap.docs.map(d => ({ 
          title: d.data().title, 
          code: d.data().code,
          symptoms: d.data().symptoms,
          category: d.data().category
        }));
      }

      const ai = getAiClient();
      const prompt = `You are an AI Expert for Windows. Analyze these actual resolution patterns and create 7 concise, high-level troubleshooting "Knowledge Insights" that will help an AI diagnose issues better.
      Solved User Feedback: ${JSON.stringify(solvedPatterns)}
      Admin Corrections: ${JSON.stringify(updatePatterns)}
      Format: A numbered list in ${language === 'en' ? 'English' : 'Korean'}.`;

      let text = "";
      let retries = 3;
      for (let i = 0; i < retries; i++) {
        try {
          const response = await callAiWithFallback(ai, prompt);
          text = response;
          if (text) break;
        } catch (err: any) {
          if ((err.message?.includes('429') || JSON.stringify(err).includes('429')) && i < retries - 1) {
            await new Promise(res => setTimeout(res, 2000 * Math.pow(2, i)));
            continue;
          }
          throw err;
        }
      }

      if (!text) throw new Error("No response from AI");

      await setDoc(doc(db, 'ai_config', 'knowledge'), {
        content: text,
        updatedAt: new Date(),
        optimizedBy: user?.email || 'unknown',
        dataPoints: solvedPatterns.length + updatePatterns.length
      });

      setAiOptimizedKnowledge(text);
      setAiOptimizedAt(new Date());
      await logAdminAction('system', 'ai_opt', 'AI 지식 베이스 최적화 완료', 'success', 'AI');
      
      // Clear results message first if any, then show success
      setSyncResult(language === 'en' ? "AI Optimization successful!" : "AI 엔진 최적화 성공!");
      alert(language === 'en' ? "AI Engine optimized with latest patterns!" : "AI 엔진이 최신 해결 패턴으로 최적화되었습니다.");
      setTimeout(() => setSyncResult(null), 5000);
    } catch (error: any) {
      console.error("Optimization failed", error);
      alert(language === 'en' ? `Optimization failed: ${error.message || "Unknown error"}` : `최적화 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setIsOptimizingAi(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const adminEmails = [
        'redmunlight@gmail.com', 
        'ahbiyout@gmail.com', 
        'ahbiyoutwinfixwizard@gmail.com',
        'ahbiyoutwinfix@gmail.com'
      ].map(e => e.toLowerCase().trim());
      
      const userEmail = (currentUser?.email || '').toLowerCase().trim();
      const isCurrentlyAdmin = !!(currentUser && userEmail && adminEmails.includes(userEmail));
      setIsAdmin(isCurrentlyAdmin);

      // Fetch AI Knowledge for everyone to enhance search
      fetchAiKnowledge();

      if (!currentUser) {
        // Not logged in
        if (activeTab === 'admin' || activeTab === 'wizard' || activeTab === 'library') {
          setActiveTab('guidebook');
        }
      } else if (!isCurrentlyAdmin) {
        // Logged in but not admin
        if (activeTab === 'admin' || activeTab === 'wizard') {
          setActiveTab('guidebook');
        }
      }
    });
    return () => unsubscribe();
  }, [activeTab, language]);

  // Real-Time GitHub Releases Auto-Update Check on App Launch
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdates(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [githubRepo]);

  useEffect(() => {
    const loadGuestData = () => {
      try {
        const guestBookmarks = localStorage.getItem('guest_bookmarks');
        if (guestBookmarks) {
          setBookmarkedIds(new Set(JSON.parse(guestBookmarks)));
        } else {
          setBookmarkedIds(new Set());
        }
        
        const guestHistory = localStorage.getItem('guest_history');
        if (guestHistory) {
          setUserActivity(JSON.parse(guestHistory));
        } else {
          setUserActivity([]);
        }
      } catch (e) {
        console.warn("Failed to load guest data:", e);
      }
    };

    const initializeUser = async () => {
      await syncLocalDataToFirestore();
      await fetchUserPersonalData();
    };

    if (user) {
      initializeUser();
    } else {
      loadGuestData();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'admin' && isAdmin) {
      fetchBackendLogs();
      fetchAdminLogs();
      fetchSearchLogs();
      fetchFeedbackLogs();
      fetchAppErrorLogs();
      fetchMaintenanceSettings();
      fetchGithubConfig();
      fetchEngineStatus();
    }
  }, [activeTab, isAdmin]);

  const syncLocalDataToFirestore = async () => {
    if (!user) return;
    try {
      const guestBookmarks = localStorage.getItem('guest_bookmarks');
      if (guestBookmarks) {
        const ids = JSON.parse(guestBookmarks) as string[];
        const batch = writeBatch(db);
        for (const issueId of ids) {
          const bookmarkRef = doc(collection(db, 'bookmarks'));
          batch.set(bookmarkRef, {
            userId: user.uid,
            issueId,
            timestamp: getKSTISOString(),
            syncedFromGuest: true
          });
        }
        await batch.commit();
        localStorage.removeItem('guest_bookmarks');
      }

      const guestHistory = localStorage.getItem('guest_history');
      if (guestHistory) {
        const history = JSON.parse(guestHistory) as any[];
        const batch = writeBatch(db);
        for (const act of history) {
          const activityRef = doc(collection(db, 'user_activities'));
          batch.set(activityRef, {
            ...act,
            userId: user.uid,
            syncedFromGuest: true
          });
        }
        await batch.commit();
        localStorage.removeItem('guest_history');
      }
    } catch (err) {
      console.warn("Failed to sync guest data:", err);
    }
  };

  const recordUserActivity = async (type: 'search' | 'view', targetId?: string, queryText?: string) => {
    const activityData = {
      type,
      targetId: targetId || null,
      query: queryText || null,
      timestamp: getKSTISOString()
    };

    if (!user) {
      // Store in LocalStorage for guests
      try {
        const guestHistory = localStorage.getItem('guest_history');
        const history = guestHistory ? JSON.parse(guestHistory) : [];
        const newHistory = [activityData, ...history.slice(0, 19)];
        localStorage.setItem('guest_history', JSON.stringify(newHistory));
        setUserActivity(newHistory);
      } catch (e) {
        console.warn("Guest activity recording failed:", e);
      }
      return;
    }

    try {
      const activityRef = collection(db, 'user_activities');
      await setDoc(doc(activityRef), {
        ...activityData,
        userId: user.uid,
      });
      // Update local state if it's already loaded
      if (activeTab === 'library') {
        setUserActivity(prev => [activityData, ...prev.slice(0, 19)]);
      }
    } catch (err) {
      console.warn("Failed to record activity:", err);
    }
  };

  const handleToggleBookmark = async (issueId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!user) {
      // Guest mode: Use LocalStorage
      const next = new Set(bookmarkedIds);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      setBookmarkedIds(next);
      localStorage.setItem('guest_bookmarks', JSON.stringify(Array.from(next)));
      return;
    }

    const isBookmarked = bookmarkedIds.has(issueId);
    
    try {
      if (isBookmarked) {
        const q = firestoreQuery(collection(db, 'bookmarks'), where('userId', '==', user.uid), where('issueId', '==', issueId));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        
        const next = new Set(bookmarkedIds);
        next.delete(issueId);
        setBookmarkedIds(next);
      } else {
        const bookmarkRef = doc(collection(db, 'bookmarks'));
        await setDoc(bookmarkRef, {
          userId: user.uid,
          issueId,
          timestamp: getKSTISOString()
        });
        
        const next = new Set(bookmarkedIds);
        next.add(issueId);
        setBookmarkedIds(next);
      }
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
    }
  };

  const handleDeleteSingleActivity = async (activityToRemove: any, index: number) => {
    if (!user) {
      try {
        const guestHistory = localStorage.getItem('guest_history');
        if (guestHistory) {
          const history = JSON.parse(guestHistory) as any[];
          const nextHistory = history.filter((_, idx) => idx !== index);
          localStorage.setItem('guest_history', JSON.stringify(nextHistory));
          setUserActivity(nextHistory);
        }
      } catch (e) {
        console.warn("Failed to delete guest activity:", e);
      }
      return;
    }

    try {
      if (activityToRemove.id) {
        await deleteDoc(doc(db, 'user_activities', activityToRemove.id));
      } else {
        const q = firestoreQuery(
          collection(db, 'user_activities'),
          where('userId', '==', user.uid),
          where('timestamp', '==', activityToRemove.timestamp)
        );
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      setUserActivity(prev => prev.filter((_, idx) => idx !== index));
    } catch (err) {
      console.error("Failed to delete activity:", err);
    }
  };

  const handleClearAllActivities = async () => {
    const msg = language === 'en' 
      ? "Are you sure you want to delete all recent activity logs?" 
      : "모든 최근 활동 내역을 삭제하시겠습니까?";
    
    customConfirm(msg, async () => {
      if (!user) {
        localStorage.removeItem('guest_history');
        setUserActivity([]);
        return;
      }

      setIsLoadingPersonal(true);
      try {
        const q = firestoreQuery(
          collection(db, 'user_activities'),
          where('userId', '==', user.uid),
          limit(100)
        );
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        setUserActivity([]);
      } catch (err) {
        console.error("Failed to clear all user activities:", err);
      } finally {
        setIsLoadingPersonal(false);
      }
    });
  };

  const fetchUserPersonalData = async () => {
    if (!user) return;
    setIsLoadingPersonal(true);
    try {
      const bq = firestoreQuery(collection(db, 'bookmarks'), where('userId', '==', user.uid));
      const bSnap = await getDocs(bq);
      const ids = new Set(bSnap.docs.map(d => d.data().issueId));
      setBookmarkedIds(ids);

      const hq = firestoreQuery(
        collection(db, 'user_activities'), 
        where('userId', '==', user.uid), 
        limit(20)
      ); // Note: Simple query to avoid index errors initially, can add orderBy later
      const hSnap = await getDocs(hq);
      const hData = hSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      hData.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setUserActivity(hData);
    } catch (err: any) {
      console.warn("Failed to fetch personal data:", err);
    } finally {
      setIsLoadingPersonal(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error: any) {
      console.error("Email auth failed", error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError(language === 'en' ? "Email already in use." : "이미 사용 중인 이메일입니다.");
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setAuthError(language === 'en' ? "Invalid email or password." : "이메일 또는 비밀번호가 잘못되었습니다.");
      } else if (error.code === 'auth/weak-password') {
        setAuthError(language === 'en' ? "Password should be at least 6 characters." : "비밀번호는 6자리 이상이어야 합니다.");
      } else {
        setAuthError(error.message);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    setAuthLoading(true);
    setAuthError('');
    try {
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
    } catch (error: any) {
      const errCode = error?.code || '';
      const errMsg = error?.message || '';
      const isCancelled = errCode === 'auth/user-cancelled' || 
                          errCode === 'auth/popup-closed-by-user' || 
                          errCode === 'auth/cancelled-popup-request' ||
                          errMsg.includes('popup-closed-by-user') ||
                          errMsg.includes('cancelled-popup-request');
      const isDomainError = errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain');
      const isPopupBlocked = errCode === 'auth/popup-blocked';
      
      if (isCancelled) {
        console.info("Google login popup closed by user.");
        setAuthError('');
      } else {
        console.error("Google auth failed", error);
        if (isPopupBlocked) {
          setAuthError(language === 'en' ? "Popup blocked by browser. Please allow popups for this site." : "브라우저에서 팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.");
        } else if (isDomainError) {
          const appUrl = window.location.origin;
          setAuthError(language === 'en' 
            ? `Domain ${appUrl} needs to be added to "Authorized Domains" in Firebase Authentication console.` 
            : `이 도메인(${appUrl})을 Firebase 콘솔의 승인된 도메인(Authorized Domains)에 추가해야 합니다.`);
        } else {
          setAuthError(errMsg || (language === 'en' ? "Google login failed. Please try again." : "구글 로그인이 실패했습니다. 다시 시도해 주세요."));
        }
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginStatus = () => {
    setShowAuthModal(true);
    setAuthMode('login');
    setAuthError('');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const fetchIssues = async (isLoadMore = false, force = false) => {
    if (selectedCategory === null) {
      setDbIssues([]);
      setHasMore(false);
      setLoadingDb(false);
      return;
    }

    const searchQuery = guidebookQuery.trim();
    const cacheKey = `${selectedCategory}_${selectedVersionFilter}_${searchQuery}`;

    // 1. Search Result Caching for 5 minutes
    if (!isLoadMore && !force && searchCache[cacheKey] && Date.now() - searchCache[cacheKey].timestamp < 1000 * 60 * 5) {
      setDbIssues(searchCache[cacheKey].data);
      setHasMore(false);
      setDbStatus('cached');
      return;
    }

    // 2. Instant Local/Memory Search across all known issues & cached bundles to completely eliminate Firestore reads
    if (!isLoadMore && searchQuery) {
      const allCandidates: KnownIssue[] = (() => {
        const stored = localStorage.getItem('winfix_unpacked_bundles');
        const bundleIssues: KnownIssue[] = stored ? JSON.parse(stored) : [];
        const cachedDefault = localStorage.getItem(ISSUES_CACHE_KEY);
        const defaultIssues: KnownIssue[] = cachedDefault ? JSON.parse(cachedDefault) : [];
        const merged = [...KNOWN_ISSUES];
        [...bundleIssues, ...defaultIssues].forEach(b => {
          if (!merged.some(m => m.id === b.id || (m.code && b.code && m.code.toUpperCase() === b.code.toUpperCase()))) {
            merged.push(b);
          }
        });
        return merged;
      })();

      const sq = searchQuery.toLowerCase();
      const tokens = sq.split(/\s+/).filter(Boolean);
      const localMatches = allCandidates.filter(i => {
        const matchesCategory = selectedCategory === '전체' || i.category === selectedCategory;
        const matchesVersion = selectedVersionFilter === '전체' || 
          (i.windowsVersions && i.windowsVersions.includes(selectedVersionFilter));
        if (!matchesCategory || !matchesVersion) return false;

        const combined = [
          i.title,
          i.title_en,
          i.code,
          i.symptoms,
          i.symptoms_en,
          i.category,
          ...(i.searchKeywords || []),
          ...(i.manualSteps || []),
          ...(i.manualSteps_en || [])
        ].filter(Boolean).join(' ').toLowerCase();

        return combined.includes(sq) || tokens.every(token => combined.includes(token));
      });

      if (localMatches.length > 0) {
        setDbIssues(localMatches);
        setHasMore(false);
        setLoadingDb(false);
        setLoadingMore(false);
        setDbStatus('cached');
        setSearchCache(prev => ({
          ...prev,
          [cacheKey]: { data: localMatches, timestamp: Date.now() }
        }));
        return;
      }
    }

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoadingDb(true);
    }

    const activeDbMode = (localStorage.getItem('winfix_db_mode') as 'firestore' | 'server_file') || dbMode;

    try {
      if (activeDbMode === 'server_file') {
        const url = `/api/issues?category=${encodeURIComponent(selectedCategory)}&version=${encodeURIComponent(selectedVersionFilter)}&q=${encodeURIComponent(searchQuery)}`;
        const response = await fetch(url);
        const data = await parseJsonResponse(response);
        if (data.success) {
          setDbIssues(data.issues);
          setHasMore(false);
          setDbStatus('connected');
          setSearchCache(prev => ({
            ...prev,
            [cacheKey]: { data: data.issues, timestamp: Date.now() }
          }));
        } else {
          throw new Error(data.error || "REST load failed");
        }
        setLoadingDb(false);
        setLoadingMore(false);
        return;
      }

      // Hybrid Blob Bundle Fetching (cached for 2 hours to minimize reads to 0-1)
      const bundleCache = localStorage.getItem('winfix_unpacked_bundles');
      const bundleCacheTime = localStorage.getItem('winfix_unpacked_bundles_time');
      let allUnpacked: KnownIssue[] = [];

      if (!force && bundleCache && bundleCacheTime && Date.now() - Number(bundleCacheTime) < 1000 * 60 * 120) {
        try {
          allUnpacked = JSON.parse(bundleCache);
        } catch (e) {
          allUnpacked = [];
        }
      }

      if (allUnpacked.length === 0) {
        try {
          const bundlesSnap = await getDocs(collection(db, 'issue_bundles'));
          if (!bundlesSnap.empty) {
            trackUsage(bundlesSnap.size, 0);
            bundlesSnap.forEach((bDoc) => {
              if (bDoc.id !== '_metadata') {
                const bData = bDoc.data();
                if (Array.isArray(bData.issues)) {
                  allUnpacked.push(...bData.issues);
                }
              }
            });
            if (allUnpacked.length > 0) {
              localStorage.setItem('winfix_unpacked_bundles', JSON.stringify(allUnpacked));
              localStorage.setItem('winfix_unpacked_bundles_time', Date.now().toString());
            }
          }
        } catch (bundleErr) {
          console.info("Firestore blob bundle fetch skipped, using local fallback...", bundleErr);
        }
      }

      if (allUnpacked.length > 0) {
        let filtered = allUnpacked;
        if (selectedCategory !== '전체') {
          filtered = filtered.filter(i => i.category === selectedCategory);
        }
        if (selectedVersionFilter !== '전체') {
          filtered = filtered.filter(i => i.windowsVersions && i.windowsVersions.includes(selectedVersionFilter));
        }
        if (searchQuery) {
          const sq = searchQuery.toLowerCase();
          const tokens = sq.split(/\s+/).filter(Boolean);
          filtered = filtered.filter(i => {
            const combined = [
              i.title,
              i.title_en,
              i.code,
              i.symptoms,
              i.symptoms_en,
              i.category,
              ...(i.searchKeywords || []),
              ...(i.manualSteps || []),
              ...(i.manualSteps_en || [])
            ].filter(Boolean).join(' ').toLowerCase();
            return combined.includes(sq) || tokens.every(token => combined.includes(token));
          });
        }

        setDbIssues(filtered);
        setHasMore(false);
        setDbStatus('connected');
        setLoadingDb(false);
        setLoadingMore(false);
        setSearchCache(prev => ({
          ...prev,
          [cacheKey]: { data: filtered, timestamp: Date.now() }
        }));
        return;
      }

      // Default fetch with strict limit(15) only if bundle is completely unavailable
      const path = 'issues';
      const constraints: any[] = [];
      const isDefaultFetch = !isLoadMore && selectedCategory === '전체' && selectedVersionFilter === '전체' && guidebookQuery.trim() === '';
      
      if (isDefaultFetch && !force) {
        const cached = localStorage.getItem(ISSUES_CACHE_KEY);
        const cachedTime = localStorage.getItem(ISSUES_CACHE_KEY + '_time');
        if (cached && cachedTime && Date.now() - Number(cachedTime) < CACHE_EXPIRY) {
          setDbIssues(JSON.parse(cached));
          setHasMore(true);
          setLoadingDb(false);
          setDbStatus('connected');
          return;
        }
      }
      
      if (selectedCategory !== '전체') {
        constraints.push(where('category', '==', selectedCategory));
      }
      if (selectedVersionFilter !== '전체') {
        constraints.push(where('windowsVersions', 'array-contains', selectedVersionFilter));
      }
      
      const fetchLimit = 15;
      let q = isLoadMore && lastDoc
        ? firestoreQuery(collection(db, path), ...constraints, startAfter(lastDoc), limit(fetchLimit))
        : firestoreQuery(collection(db, path), ...constraints, limit(fetchLimit));

      const querySnapshot = await getDocs(q);
      trackUsage(querySnapshot.size, 0);
      const issues: KnownIssue[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        issues.push({ id: doc.id, ...data } as KnownIssue);
      });

      if (isDefaultFetch && issues.length > 0) {
        localStorage.setItem(ISSUES_CACHE_KEY, JSON.stringify(issues));
        localStorage.setItem(ISSUES_CACHE_KEY + '_time', Date.now().toString());
        setDbIssuesLastUpdated(Date.now());
      }

      if (querySnapshot.docs.length > 0) {
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
      setHasMore(querySnapshot.docs.length >= fetchLimit);

      if (isLoadMore) {
        setDbIssues(prev => {
          const newIssues = issues.filter(issue => !prev.some(p => p.id === issue.id));
          return [...prev, ...newIssues];
        });
      } else {
        if (issues.length === 0) {
          const localIssues = selectedCategory === '전체' 
            ? KNOWN_ISSUES 
            : KNOWN_ISSUES.filter(i => i.category === selectedCategory);
          setDbIssues(localIssues);
        } else {
          setDbIssues(issues);
        }
      }
      setDbStatus('connected');
    } catch (err: any) {
      console.warn("fetchIssues encountered error, falling back cleanly:", err);
      const isQuota = err.message?.includes('Quota') || err.message?.includes('429') || err.code === 'resource-exhausted';
      
      // Clean fallback to local data and server API
      setDbMode('server_file');
      localStorage.setItem('winfix_db_mode', 'server_file');
      localStorage.setItem('winfix_db_mode_fallback', 'true');
      setDbStatus(isQuota ? 'quota' : 'connected');

      // Attempt to load from server_file API immediately
      try {
        const url = `/api/issues?category=${encodeURIComponent(selectedCategory)}&version=${encodeURIComponent(selectedVersionFilter)}&q=${encodeURIComponent(searchQuery)}`;
        const resp = await fetch(url);
        const data = await parseJsonResponse(resp);
        if (data.success && Array.isArray(data.issues) && data.issues.length > 0) {
          setDbIssues(data.issues);
          setHasMore(false);
          setLoadingDb(false);
          setLoadingMore(false);
          return;
        }
      } catch (restErr) {
        console.warn("Fallback REST fetch error:", restErr);
      }

      // If REST also fails, use local KNOWN_ISSUES
      const localIssues = selectedCategory === '전체' 
        ? KNOWN_ISSUES 
        : KNOWN_ISSUES.filter(i => i.category === selectedCategory);
      setDbIssues(localIssues);
      setHasMore(false);
    } finally {
      setLoadingDb(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setLastDoc(null);
    fetchIssues(false);
  }, [selectedCategory, selectedVersionFilter]);

  const handleStartBatchCollection = async () => {
    if (isBatchCollecting) return;
    setIsBatchCollecting(true);
    isBatchCollectingRef.current = true;
    setBatchCollectionCount(0);
    setBatchCollectionUpdatedCount(0);
    batchCollectionCountRef.current = 0;
    batchCollectionUpdatedCountRef.current = 0;
    batchEndTimeRef.current = Date.now() + (batchDurationMinutes * 60 * 1000);
    setBatchStatus(language === 'en' ? "Initializing..." : "초기화 중...");
    
    runBatchCollection();
  };

  const handleStopBatchCollection = () => {
    setIsBatchCollecting(false);
    isBatchCollectingRef.current = false;
    fetchCategoryCounts();
    fetchIssues(false);
  };

  const runBatchCollection = async () => {
    if (!isBatchCollectingRef.current) return;

    if (Date.now() > batchEndTimeRef.current) {
      setBatchStatus(language === 'en' ? "Time limit reached." : "수집 시간 만료.");
      alert(language === 'en' ? "Batch collection time limit reached." : "설정된 수집 시간이 만료되어 자동 수집을 종료합니다.");
      handleStopBatchCollection();
      return;
    }

    try {
      setBatchStatus(language === 'en' ? "Analyzing web trends..." : "웹 트렌드 분석 중...");
      const result = await handleTriggerAiSearch(true, batchItemCount);
      batchCollectionCountRef.current += result.added;
      batchCollectionUpdatedCountRef.current += result.updated;
      setBatchCollectionCount(batchCollectionCountRef.current);
      setBatchCollectionUpdatedCount(batchCollectionUpdatedCountRef.current);
      
      if (isBatchCollectingRef.current) {
        setBatchStatus(language === 'en' ? `Waiting ${batchIntervalSeconds}s...` : `${batchIntervalSeconds}초 대기 중...`);
        setTimeout(runBatchCollection, batchIntervalSeconds * 1000);
      }
    } catch (err: any) {
      console.error("Batch iteration failed:", err);
      logAppError(err.message || String(err), 'error', 'BatchCollection', err.stack);
      const isQuotaError = err.message?.includes('Quota exceeded') || 
                          err.message?.includes('429') || 
                          err.message?.includes('Resource has been exhausted') ||
                          err.message?.includes('rate limit');
      
      const isDbQuota = err.message?.includes('Firestore') && err.message?.includes('Quota');

      if (isQuotaError || isDbQuota) {
        setBatchStatus(language === 'en' ? "Quota exceeded." : "할당량 초과.");
        alert(language === 'en' 
          ? `Quota exceeded (AI or DB). Collected a total of ${batchCollectionCountRef.current} new items.` 
          : `할당량이 모두 소모되었습니다 (AI 또는 DB). 총 ${batchCollectionCountRef.current}개의 신규 항목을 수집했습니다.`);
        handleStopBatchCollection();
      } else {
        // Generic error (e.g. AI malformed response, 503, search error)
        // We wait and continue instead of stopping the whole batch
        setBatchStatus(language === 'en' ? "AI Error - retrying soon..." : "AI 오류 - 곧 재시도...");
        if (isBatchCollectingRef.current) {
          setTimeout(runBatchCollection, (batchIntervalSeconds + 30) * 1000); // Wait longer on error
        }
      }
    }
  };

  const handleTriggerAiSearch = async (isAuto = false, count = 3): Promise<{ added: number, updated: number }> => {
    if (!isAuto && !user) {
      alert(language === 'en' ? "Login required." : "로그인이 필요합니다.");
      return { added: 0, updated: 0 };
    }
    
    if (triggeringAi) return { added: 0, updated: 0 };

    let addedCount = 0;
    let updatedCount = 0;

    setTriggeringAi(true);
    try {
      if (!isAuto) {
        await logAdminAction('verify', 'ai_search', 'AI 수집 프로세스 시작', 'info', 'AI');
      } else {
        await logAdminAction('verify', 'ai_search', language === 'en' ? `Bulk Data Auto-Collection started (Count: ${count})` : `대량 데이터 자동 수집 시작 (수집 목표: ${count}개)`, 'info', 'AI');
      }
      
      const ai = getAiClient();
      
      const promptCategories = ['Windows Update', 'Network & Internet', 'Blue Screen of Death (BSOD)', 'Microsoft Store & Apps', 'Activation & Licensing', 'Security & Windows Defender', 'Hardware & Drivers', 'File System & Storage', 'User Accounts & Login', 'Performance & Freezing'];
      const randomCategory = promptCategories[Math.floor(Math.random() * promptCategories.length)];
      const focusAreas = [
        'rare and obscure error codes', 
        'recently trending issues in Windows 11', 
        'registry-related issues',
        'complex enterprise environment issues',
        'legacy compatibility issues with modern Windows',
        'Specific error codes starting with 0xC... or 0x8...',
        'Windows Store app deployment/launch errors'
      ];
      const randomFocus = focusAreas[Math.floor(Math.random() * focusAreas.length)];

      const avoidList = dbIssues.slice(0, 20).map(i => i.title_en || i.title).join(', ');

      const prompt = `Search the web for details on ${count} DIFFERENT troubleshooting guides for Windows error codes or issues.
        CRITICAL: Focus on category "${randomCategory}" and area "${randomFocus}". 
        
        DO NOT generate any of the following issues as they already exist in my database:
        [${avoidList}]

        Do NOT generate generic errors like 'Update is slow'. Find unique, specific error codes or new trending issues (2024-2025).
        
        IMPORTANT JSON RULES:
        - Escape all backslashes in file paths, registry keys, and scripts (use double backslashes e.g. C:\\\\Windows\\\\System32 or HKLM:\\\\SOFTWARE).
        - Ensure double quotes within strings are properly escaped.
        - Return ONLY a raw JSON array of ${count} objects without markdown decoration:
        [
          { 
            "category": "업데이트"|"네트워크"|"시스템/블루스크린"|"스토어/앱"|"정품인증"|"보안/백신", 
            "code": "0x...", 
            "title": "Korean title", 
            "title_en": "English title", 
            "symptoms": "Korean detailed symptoms", 
            "symptoms_en": "English detailed symptoms", 
            "script": "PowerShell fix", 
            "manualSteps": ["Korean steps"], 
            "manualSteps_en": ["English steps"], 
            "sourceUrls": ["https://..."], 
            "isLatest": true, 
            "windowsVersions": ["Windows 11", "Windows 10"] 
          }
        ]`;

      let text = "";
      let retries = 3;
      
      for (let i = 0; i < retries; i++) {
        try {
          const response = await callAiWithFallback(ai, prompt, {
              tools: [{ googleSearch: {} }]
            });
          text = response;
          break;
        } catch (err: any) {
          if (i === retries - 1) throw err;
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      if (!text) throw new Error("No response from AI");
      
      let issuesData: any;
      try {
        const parsed = parseAiJson(text);
        if (Array.isArray(parsed)) {
          issuesData = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.issues)) {
            issuesData = parsed.issues;
          } else if (Array.isArray(parsed.data)) {
            issuesData = parsed.data;
          } else {
            issuesData = [parsed];
          }
        } else {
          throw new Error("Parsed AI result is neither an array nor an object");
        }
      } catch (parseErr: any) {
        console.error("AI JSON Parse & Recovery Error:", parseErr);
        throw parseErr;
      }

      if (!Array.isArray(issuesData) || issuesData.length === 0) {
        throw new Error("AI response did not contain any valid issue items");
      }

      if (useStaging) {
        const newIssues = issuesData.map((data, idx) => ({
          ...data,
          id: `staged-${Date.now()}-${idx}`,
          source: "AI Auto-Search",
          createdAt: getKSTISOString()
        } as KnownIssue));
        
        setStagedIssues(prev => [...prev, ...newIssues]);
        setTriggeringAi(false);
        // Do NOT refresh counts or lists during local staging to save quota
        return { added: issuesData.length, updated: 0 };
      }

      const issuesRef = collection(db, "issues");
      
      // 1. Local Cache Deduplication & Change Detection 
      // We check dbIssues (already loaded in memory) to avoid initial Firestore reads
      const localExistingMap: Record<string, KnownIssue> = {};
      dbIssues.forEach(iss => {
        if (iss.code) localExistingMap[`code:${iss.code}`] = iss;
        if (iss.title) localExistingMap[`title:${iss.title}`]; // Prefer code if both exist
      });

      // 2. Efficient Bulk Duplicate Check for items NOT in local memory
      const remainingData = issuesData.filter(issueData => {
        const localMatch = localExistingMap[`code:${issueData.code}`] || localExistingMap[`title:${issueData.title}`];
        return !localMatch;
      });

      const codes = Array.from(new Set(remainingData.map(i => String(i.code)).filter(Boolean)));
      const titles = Array.from(new Set(remainingData.map(i => String(i.title)).filter(Boolean)));
      
      const existingIds: Record<string, string> = {}; // key -> docId

      // Firestore 'in' queries can handle up to 30 elements
      if (codes.length > 0) {
        try {
          const qC = firestoreQuery(issuesRef, where("code", "in", codes));
          const snapC = await getDocs(qC);
          snapC.forEach(d => { existingIds[`code:${d.data().code}`] = d.id; });
        } catch (e) { console.warn("Bulk code lookup failed", e); }
      }
      
      if (titles.length > 0) {
        try {
          const qT = firestoreQuery(issuesRef, where("title", "in", titles));
          const snapT = await getDocs(qT);
          snapT.forEach(d => { 
            if (!existingIds[`code:${d.data().code}`]) {
              existingIds[`title:${d.data().title}`] = d.id; 
            }
          });
        } catch (e) { console.warn("Bulk title lookup failed", e); }
      }

      // 3. Process Sync with batched knowledge
      for (const issueData of issuesData) {
        if (!issueData.code || !issueData.title) continue;

        // Check local memory first, then found IDs
        const localMatch = localExistingMap[`code:${issueData.code}`] || localExistingMap[`title:${issueData.title}`];
        const existingId = localMatch?.id || existingIds[`code:${issueData.code}`] || existingIds[`title:${issueData.title}`];

        if (existingId) {
          // Change Detection (Anti-Redundant-Update)
          // If we have local data, check if any meaningful field changed
          let shouldUpdate = true;
          if (localMatch) {
            const hasChanges = 
              issueData.title !== localMatch.title ||
              issueData.symptoms !== localMatch.symptoms ||
              issueData.script !== localMatch.script ||
              JSON.stringify(issueData.manualSteps) !== JSON.stringify(localMatch.manualSteps) ||
              issueData.category !== localMatch.category;
            
            if (!hasChanges) {
              shouldUpdate = false;
              console.log(`Skipping update for [${issueData.title}] - no changes detected.`);
            }
          }

          if (shouldUpdate) {
            await updateDoc(doc(db, "issues", existingId), { 
              ...issueData, 
              updatedAt: new Date() 
            });
            updatedCount++;
          }
        } else {
          const issueId = `ai-${Date.now()}-${addedCount}`;
          await setDoc(doc(db, "issues", issueId), { 
            id: issueId, 
            ...issueData, 
            source: "AI Auto-Search", 
            createdAt: new Date() 
          });
          addedCount++;
        }
      }
    
      if (!isAuto) {
        fetchCategoryCounts(true);
        fetchIssues(false, true);
        alert(`Sync successful: ${addedCount} added, ${updatedCount} updated`);
      } else {
        await logAdminAction('verify', 'ai_search', language === 'en' ? `Bulk Auto-Collection finished: ${addedCount} added, ${updatedCount} updated` : `대량 자동 수집 완료: ${addedCount}개 추가됨, ${updatedCount}개 업데이트됨`, 'success', 'AI');
      }
      const now = new Date();
      setLastSyncAt(now);
      
      // Persist to Firestore status
      try {
        await setDoc(doc(db, 'system_config', 'status'), { 
          lastSyncAt: now.toISOString(),
          lastSyncBy: user?.email || (isAuto ? 'system-auto' : 'manual')
        }, { merge: true });
        trackUsage(0, 1);
      } catch (dbErr) {
        console.warn("Failed to persist sync status:", dbErr);
      }

      return { added: addedCount, updated: updatedCount };

    } catch (err: any) {
      console.error("AI Sync Error:", err);
      logAppError(err.message || String(err), 'error', 'AiSync', err.stack, { isAuto, addedCount, updatedCount });
      let errorMsg = err.message || String(err);
      if (typeof errorMsg === 'string' && (errorMsg.includes('429') || errorMsg.includes('Quota') || errorMsg.includes('RESOURCE_EXHAUSTED'))) {
        errorMsg = language === 'en' ? "Gemini API Quota Exceeded. Please try again tomorrow or upgrade your plan." : "Gemini API 하루 사용량을 초과했습니다. 내일 다시 시도해주세요.";
      } else if (typeof errorMsg === 'string' && (errorMsg.includes('403') || errorMsg.includes('PERMISSION_DENIED'))) {
        errorMsg = language === 'en' ? "Gemini API Access Denied. Search grounding requires API Key billing." : "Gemini API 접근이 거부되었습니다. 결제가 필요한 기능일 수 있습니다.";
      }
      
      if (!isAuto) {
        alert("AI Sync failed: " + errorMsg);
      } else {
        await logAdminAction('verify', 'ai_search', language === 'en' ? `Bulk Auto-Collection failed: ${errorMsg}` : `대량 자동 수집 실패: ${errorMsg}`, 'error', 'AI');
        throw new Error(errorMsg);
      }
      return { added: 0, updated: 0 };
    } finally {
      setTriggeringAi(false);
    }
  };

  const handleSyncStagedIssues = async () => {
    if (stagedIssues.length === 0 || isSyncingStaged) return;
    
    setIsSyncingStaged(true);
    setSyncTotal(stagedIssues.length);
    setSyncProgress(0);
    
    let added = 0;
    let updated = 0;
    const issuesToSync = [...stagedIssues];
    const path = 'issues';
    
    try {
      // 1. Local Cache Deduplication Map 
      const localExistingMap: Record<string, KnownIssue> = {};
      dbIssues.forEach(iss => {
        if (iss.code) localExistingMap[`code:${iss.code}`] = iss;
        if (iss.title) localExistingMap[`title:${iss.title}`];
      });

      // Efficiently process in chunks of 10 to manage reads
      const chunkSize = 10;
      for (let i = 0; i < issuesToSync.length; i += chunkSize) {
        const chunk = issuesToSync.slice(i, i + chunkSize);
        
        // 2. Filter out what we already know from local memory
        const subChunkToLookup = chunk.filter(iss => !(localExistingMap[`code:${iss.code}`] || localExistingMap[`title:${iss.title}`]));
        
        const codes = subChunkToLookup.map(iss => String(iss.code)).filter(Boolean);
        const titles = subChunkToLookup.map(iss => String(iss.title)).filter(Boolean);
        
        const issuesRef = collection(db, path);
        const dbExistingIds: Record<string, string> = {};

        // 3. Batch checks for items NOT in local memory
        if (codes.length > 0) {
          try {
            const qC = firestoreQuery(issuesRef, where("code", "in", codes));
            const sC = await getDocs(qC);
            sC.forEach(d => { dbExistingIds[`code:${d.data().code}`] = d.id; });
          } catch (e) { console.warn("Code lookup failed for chunk", e); }
        }
        if (titles.length > 0) {
          try {
            const qT = firestoreQuery(issuesRef, where("title", "in", titles));
            const sT = await getDocs(qT);
            sT.forEach(d => { dbExistingIds[`title:${d.data().title}`] = d.id; });
          } catch (e) { console.warn("Title lookup failed for chunk", e); }
        }

        for (const issue of chunk) {
          const localMatch = localExistingMap[`code:${issue.code}`] || localExistingMap[`title:${issue.title}`];
          const existingDocId = localMatch?.id || dbExistingIds[`code:${issue.code}`] || dbExistingIds[`title:${issue.title}`];

          if (existingDocId) {
            // Change Detection
            let shouldUpdate = true;
            if (localMatch) {
              const hasChanges = 
                issue.title !== localMatch.title ||
                issue.symptoms !== localMatch.symptoms ||
                issue.script !== localMatch.script ||
                JSON.stringify(issue.manualSteps) !== JSON.stringify(localMatch.manualSteps) ||
                issue.category !== localMatch.category;
              
              if (!hasChanges) {
                shouldUpdate = false;
                console.log(`Skipping manual sync update for [${issue.title}] - no changes.`);
              }
            }

            if (shouldUpdate) {
              await updateDoc(doc(db, path, existingDocId), {
                ...issue,
                updatedAt: getKSTISOString(),
                id: existingDocId
              });
              updated++;
            }
          } else {
            const newId = `ai-${Date.now()}-${added}`;
            await setDoc(doc(db, path, newId), {
              ...issue,
              id: newId,
              createdAt: getKSTISOString()
            });
            added++;
          }
          setSyncProgress(prev => prev + 1);
        }
      }
      
      await logAdminAction('system', 'sync', `로컬 데이터 클라우드 동기화 완료: ${added} 추가, ${updated} 업데이트`, 'success', 'DATABASE');
      setStagedIssues([]);
      alert(language === 'en' ? `Sync Complete: ${added} added, ${updated} updated.` : `동기화 완료: ${added}개 추가, ${updated}개 업데이트되었습니다.`);
      fetchCategoryCounts(true);
    } catch (err: any) {
      console.error("Sync error:", err);
      const isQuota = err.message?.includes('Quota') || err.message?.includes('429');
      alert(language === 'en' 
        ? (isQuota ? "Database Quota Exceeded. Remaining items kept in local storage." : "An error occurred during sync.")
        : (isQuota ? "데이터베이스 할당량이 초과되었습니다. 남은 항목은 로컬에 유지됩니다." : "동기화 중 오류가 발생했습니다."));
      
      // Remove successfully synced items from staged
      setStagedIssues(prev => prev.slice(syncProgress));
    } finally {
      setIsSyncingStaged(false);
    }
  };

  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isSystemBackingUp, setIsSystemBackingUp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupResult, setBackupResult] = useState<string | null>(null);
  const [lastKnownGoodInfo, setLastKnownGoodInfo] = useState<{ createdAt: string; totalRecords: number; collections?: Record<string, number>; retentionCount?: number; storedSnapshotsCount?: number } | null>(null);
  const [showLkgDetailsModal, setShowLkgDetailsModal] = useState(false);
  const [validationReportModal, setValidationReportModal] = useState<ValidationResult | null>(null);
  const validateFileInputRef = useRef<HTMLInputElement>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [translationTotal, setTranslationTotal] = useState(0);
  const [translationResult, setTranslationResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLastKnownGoodStatus = useCallback(async () => {
    try {
      const authHeaders = await getAuthHeaders();
      const resp = await fetch('/api/admin/last-known-good/status', {
        headers: authHeaders
      });
      const json = await parseJsonResponse(resp);
      if (json.exists && json.metadata) {
        setLastKnownGoodInfo({
          createdAt: json.metadata.createdAt,
          totalRecords: json.metadata.totalRecords,
          collections: json.metadata.collectionsCount,
          retentionCount: json.retentionCount || 7,
          storedSnapshotsCount: json.storedSnapshotsCount || 1
        });
      } else {
        const clientSnap = localStorage.getItem('winfix_last_known_good_client');
        if (clientSnap) {
          const parsed = JSON.parse(clientSnap);
          setLastKnownGoodInfo({
            createdAt: parsed.timestamp,
            totalRecords: parsed.issuesCount || parsed.issues?.length || 0,
            retentionCount: 7,
            storedSnapshotsCount: 1
          });
        }
      }
    } catch (e) {
      const clientSnap = localStorage.getItem('winfix_last_known_good_client');
      if (clientSnap) {
        try {
          const parsed = JSON.parse(clientSnap);
          setLastKnownGoodInfo({
            createdAt: parsed.timestamp,
            totalRecords: parsed.issuesCount || parsed.issues?.length || 0,
            retentionCount: 7,
            storedSnapshotsCount: 1
          });
        } catch (_) {}
      }
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchLastKnownGoodStatus();
    }
  }, [isAdmin, fetchLastKnownGoodStatus]);

  const handleRestoreLastKnownGood = async () => {
    if (!isAdmin) return;
    const createdTime = lastKnownGoodInfo?.createdAt ? new Date(lastKnownGoodInfo.createdAt).toLocaleString() : '직전 스냅샷';
    const totalRecs = lastKnownGoodInfo?.totalRecords || dbIssues.length;

    const confirmMsg = language === 'en'
      ? `[Restore Last-Known-Good Backup State]\n\nDo you want to roll back the database to the automatic snapshot created right before the last import?\n• Snapshot Time: ${createdTime}\n• Records Count: ${totalRecs}\n\nThis will instantly undo any recent data corruption or invalid records introduced by the import.`
      : `[직전 정상 백업(Last-Known-Good) 상태 복원]\n\n불러오기 직전에 자동으로 저장된 정상 데이터베이스 스냅샷으로 롤백 복원하시겠습니까?\n• 백업 시각: ${createdTime}\n• 백업 레코드: ${totalRecs}개\n\n이 작업은 불러오기로 인한 데이터 오염이나 손상 항목을 이전 정상 상태로 즉시 되돌립니다.`;

    customConfirm(confirmMsg, async () => {
      setIsImporting(true);
      setBackupResult(null);
      try {
        const activeDbMode = (localStorage.getItem('winfix_db_mode') as 'firestore' | 'server_file') || dbMode;
        let restoredCount = 0;

        const authHeaders = await getAuthHeaders();
        const resp = await fetch('/api/admin/last-known-good/restore', { method: 'POST', headers: authHeaders });
        const json = await parseJsonResponse(resp);

        if (json.success) {
          restoredCount = json.restoredRecordsCount || 0;
        } else {
          const clientSnapshotRaw = localStorage.getItem('winfix_last_known_good_client');
          if (clientSnapshotRaw) {
            const clientSnapshot = JSON.parse(clientSnapshotRaw);
            if (Array.isArray(clientSnapshot.issues) && clientSnapshot.issues.length > 0) {
              if (activeDbMode === 'server_file') {
                const res = await fetch('/api/admin/restore', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...authHeaders },
                  body: JSON.stringify({ collection: 'issues', data: clientSnapshot.issues, mode: 'overwrite', skipAutoBackup: true })
                });
                const resJson = await parseJsonResponse(res);
                restoredCount = resJson.count || clientSnapshot.issues.length;
              } else {
                for (let i = 0; i < clientSnapshot.issues.length; i += 500) {
                  const batch = writeBatch(db);
                  const chunk = clientSnapshot.issues.slice(i, i + 500);
                  chunk.forEach((docData: any) => {
                    const { id, ...data } = docData;
                    if (id) {
                      const docRef = doc(db, 'issues', id);
                      batch.set(docRef, data);
                    }
                  });
                  await batch.commit();
                }
                restoredCount = clientSnapshot.issues.length;
              }
            }
          }
        }

        setBackupResult(
          language === 'en'
            ? `Successfully restored to Last-Known-Good state! (${restoredCount} records restored)`
            : `직전 정상 백업 상태로 성공적으로 롤백 복원되었습니다! (${restoredCount}개 레코드 복구 완료)`
        );
        await logAdminAction('import', 'last_known_good_restore', `Last-Known-Good 롤백 완료: ${restoredCount}개 레코드`, 'success', 'DATABASE');
        fetchIssues(false);
        fetchCategoryCounts();
        fetchLastKnownGoodStatus();
      } catch (err: any) {
        console.error("Rollback failed:", err);
        setBackupResult(language === 'en' ? "Rollback to Last-Known-Good state failed." : "직전 정상 백업 상태로의 롤백 복원에 실패했습니다.");
      } finally {
        setIsImporting(false);
        setTimeout(() => setBackupResult(null), 7000);
      }
    });
  };

  const handleManualSync = async () => {
    if (!isAdmin || isSyncing) return;
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await handleTriggerAiSearch(false, 3);
      if (result && (result.added > 0 || result.updated > 0)) {
        setSyncResult(language === 'en' ? `Sync completed: ${result.added} added, ${result.updated} updated` : `수집 완료: ${result.added} 추가, ${result.updated} 업데이트`);
      } else {
        setSyncResult(language === 'en' ? "Sync completed (No new items)" : "수집 완료 (새로운 항목 없음)");
      }
    } catch (error: any) {
      console.error("Manual sync failed:", error);
      setSyncResult(language === 'en' ? `Error: ${error.message}` : `오류: ${error.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncResult(null), 5000);
    }
  };

  const handleDownloadStartupScript = () => {
    // Use the user-provided short URL
    const appUrl = "https://tinyurl.com/2fsfjuuk";
    
    const batContentEn = `@echo off
chcp 65001 >nul
echo.
echo ===================================================
echo.
echo AI Auto-Sync System Background Startup Setup
echo.
echo ===================================================
echo.
echo This will automatically open the app in the background on boot to maintain AI sync.
echo.
set "STARTUP_DIR=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
echo.
set "BATCH_FILE=%STARTUP_DIR%\\Run_AI_AutoSync.bat"
echo.
echo @echo off > "%BATCH_FILE%"
echo.
echo start /min msedge "${appUrl}" >> "%BATCH_FILE%"
echo.
echo Setup complete! It will run automatically in the background on next boot.
echo.
echo Press any key to run it now.
echo.
pause
start /min msedge "${appUrl}"
`;

    const batContentKo = `@echo off
chcp 65001 >nul
echo.
echo ===================================================
echo.
echo AI 자동 수집 시스템 백그라운드 시작 프로그램 등록
echo.
echo ===================================================
echo.
echo 컴퓨터 부팅 시 자동으로 앱에 접속하여 AI 수집을 유지합니다.
echo.
set "STARTUP_DIR=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
echo.
set "BATCH_FILE=%STARTUP_DIR%\\Run_AI_AutoSync.bat"
echo.
echo @echo off > "%BATCH_FILE%"
echo.
echo start /min msedge "${appUrl}" >> "%BATCH_FILE%"
echo.
echo 설치가 완료되었습니다! 다음 부팅부터 백그라운드(최소화)로 자동 실행됩니다.
echo.
echo 지금 바로 실행하려면 아무 키나 누르세요.
echo.
pause
start /min msedge "${appUrl}"
`;

    // CRITICAL: Windows batch files with UTF-8 (chcp 65001) MUST use CRLF (\r\n) line endings.
    // If LF (\n) is used, CMD miscalculates byte offsets and executes random fragments of the script.
    const batContent = (language === 'en' ? batContentEn : batContentKo).replace(/\r?\n/g, '\r\n');
    
    // Create blob without BOM (BOM causes '癤?echo' error in Windows CMD)
    const blob = new Blob([batContent], { type: 'application/bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AI_AutoSync_Setup.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(language === 'en' 
      ? "Script downloaded. Please run 'AI_AutoSync_Setup.bat' to install it to your Windows Startup folder." 
      : "스크립트가 다운로드되었습니다. 다운로드된 'AI_AutoSync_Setup.bat' 파일을 실행하면 Windows 시작 프로그램에 등록됩니다.");
  };

  const handleCleanupDuplicates = async () => {
    if (!isAdmin) return;
    
    console.log("Starting cleanup duplicates. isAdmin:", isAdmin);
    setIsCleaningDuplicates(true);
    setCleanupResult(null);
    const path = 'issues';
    try {
      // Fetch documents with safe limit to prevent exhausting Firestore daily read quotas
      const q = firestoreQuery(collection(db, path), limit(100));
      const snapshot = await getDocs(q);
      console.log(`Fetched ${snapshot.size} documents for cleanup.`);
      
      const allDocs = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as KnownIssue;
        let createdAt = 0;
        const rawCreatedAt = data.createdAt;
        if (rawCreatedAt) {
          if (typeof rawCreatedAt.toDate === 'function') {
            createdAt = rawCreatedAt.toDate().getTime();
          } else {
            const d = new Date(rawCreatedAt);
            createdAt = isNaN(d.getTime()) ? 0 : d.getTime();
          }
        }
        return { id: docSnap.id, data, createdAt };
      });

      // Sort in memory: newest first
      allDocs.sort((a, b) => b.createdAt - a.createdAt);
      
      const seenCodes = new Map<string, string>(); // code -> id
      const seenTitles = new Map<string, string>(); // title -> id
      const seenDataIds = new Map<string, string>(); // data.id -> id
      const toDelete: string[] = [];
      let duplicateCount = 0;

      const normalize = (str: string) => {
        if (!str) return "";
        // Remove punctuation, extra spaces, and lowercase
        return str.trim().toLowerCase().replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, "").replace(/\s+/g, " ");
      };

      allDocs.forEach(item => {
        const { id, data } = item;
        const code = data.code?.trim().toLowerCase();
        const title = normalize(data.title);
        const dataId = data.id?.trim();

        let isDuplicate = false;

        // Check by data.id (if exists)
        if (dataId) {
          if (seenDataIds.has(dataId)) {
            isDuplicate = true;
          } else {
            seenDataIds.set(dataId, id);
          }
        }

        // Check by code (if valid code)
        if (!isDuplicate && code && code !== 'n/a' && code !== '알 수 없음' && code !== 'unknown') {
          if (seenCodes.has(code)) {
            isDuplicate = true;
          } else {
            seenCodes.set(code, id);
          }
        }

        // Check by title
        if (!isDuplicate && title) {
          if (seenTitles.has(title)) {
            isDuplicate = true;
          } else {
            seenTitles.set(title, id);
          }
        }

        if (isDuplicate) {
          toDelete.push(id);
          duplicateCount++;
        }
      });

      console.log(`Identified ${duplicateCount} duplicates to delete.`);

      if (toDelete.length > 0) {
        // Delete in batches of 500 (Firestore limit)
        const batches = [];
        for (let i = 0; i < toDelete.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = toDelete.slice(i, i + 500);
          chunk.forEach(id => {
            batch.delete(doc(db, path, id));
          });
          batches.push(batch.commit());
        }
        
        await Promise.all(batches);
        console.log("All deletion batches committed.");

        await logAdminAction('delete', 'batch_cleanup', `중복 데이터 정리 완료: ${duplicateCount}개 항목 삭제됨`, 'info', 'DATABASE');
        setCleanupResult(language === 'en' ? `Cleaned up ${duplicateCount} duplicate entries.` : `${duplicateCount}개의 중복 항목을 정리했습니다.`);
        fetchIssues(false);
        fetchCategoryCounts();
      } else {
        setCleanupResult(language === 'en' ? "No duplicate data found." : "중복된 데이터가 없습니다.");
      }
    } catch (error: any) {
      const errMsg = error.message || '';
      if (errMsg.includes("Quota") || errMsg.includes("quota")) {
        console.warn("Cleanup error: Quota Exceeded");
        setCleanupResult(language === 'en' ? "Cleanup stopped: Database Read Quota Exceeded." : "중복 정리 중단: 데이터베이스 읽기 할당량을 초과했습니다.");
      } else {
        console.error("Cleanup error:", error);
        setCleanupResult(language === 'en' ? "An error occurred during cleanup. Check console." : "중복 정리 중 오류가 발생했습니다. 콘솔을 확인하세요.");
        handleFirestoreError(error, OperationType.LIST, path);
      }
    } finally {
      setIsCleaningDuplicates(false);
      setShowCleanupConfirm(false);
      // Clear result after 5 seconds
      setTimeout(() => setCleanupResult(null), 5000);
    }
  };

  const handleExportData = async () => {
    if (!isAdmin) return;
    setIsExporting(true);
    setBackupResult(null);
    try {
      // Omitted high-volume logging collections ('search_logs', 'admin_logs') to prevent Firestore reading quota limit issues.
      const collectionsToBackup = ['issues', 'feedback', 'system_config'];
      const zip = new JSZip();
      const timestamp = getKSTISOString().split('T')[0];
      const folder = zip.folder(`winfix_backup_${timestamp}`);

      for (const colName of collectionsToBackup) {
        let data: any[] = [];
        if (colName === 'issues' && ((localStorage.getItem('winfix_db_mode') as string) === 'server_file')) {
          try {
            const resp = await fetch('/api/issues');
            const d = await parseJsonResponse(resp);
            data = d.issues || [];
          } catch (e) {
            data = [];
          }
        } else {
          const querySnapshot = await getDocs(firestoreQuery(collection(db, colName), limit(200)));
          data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        if (folder) {
          folder.file(`${colName}.json`, JSON.stringify(data, null, 2));
        }
      }

      // Also include a manifest/metadata file
      if (folder) {
        folder.file('metadata.json', JSON.stringify({
          version: '2.0',
          timestamp: getKSTISOString(),
          collections: collectionsToBackup,
          total_collections: collectionsToBackup.length
        }, null, 2));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
      const fileName = `winfix_backup_${timestamp}.zip`;

      const fallbackDownload = (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        downloadAnchorNode.setAttribute("download", fileName);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        URL.revokeObjectURL(url);
        setBackupResult(language === 'en' ? "Backup completed successfully (ZIP)." : "백업이 성공적으로 완료되었습니다 (ZIP).");
      };

      if ('showSaveFilePicker' in window && window.self === window.top) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'ZIP Files',
              accept: { 'application/zip': ['.zip'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(zipBlob);
          await writable.close();
          setBackupResult(language === 'en' ? "Backup completed successfully (ZIP)." : "백업이 성공적으로 완료되었습니다 (ZIP).");
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setIsExporting(false);
            setBackupResult(null);
            return;
          }
          console.warn("showSaveFilePicker failed, falling back to traditional download:", err);
          fallbackDownload(zipBlob);
        }
      } else {
        fallbackDownload(zipBlob);
      }
      
      await logAdminAction('export', 'data_backup', '전체 데이터 압축 백업 완료', 'info', 'DATABASE');
    } catch (error: any) {
      const errMsg = error.message || '';
      if (errMsg.includes("Quota") || errMsg.includes("quota")) {
         console.warn("Export failed: Quota Exceeded");
         setBackupResult(language === 'en' ? "Backup failed: Database Read Quota Exceeded. Please try again tomorrow." : "백업 실패: 일일 데이터베이스 읽기 할당량을 초과했습니다. 내일 다시 시도해 주세요.");
      } else {
         console.error("Export failed:", error);
         setBackupResult(language === 'en' ? "Backup failed." : "백업에 실패했습니다.");
      }
    } finally {
      setIsExporting(false);
      setTimeout(() => setBackupResult(null), 5000);
    }
  };

  const handleDownloadSystemBackupZip = async () => {
    if (!isAdmin) return;
    setIsSystemBackingUp(true);
    setBackupResult(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error(language === 'en' ? "Not authenticated." : "인증되지 않은 사용자입니다.");
      }

      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/backup', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || (language === 'en' ? "Server backup request failed" : "서버 백업 요청이 실패했습니다."));
      }

      const blob = await response.blob();
      const timestamp = getKSTISOString().split('T')[0];
      const fileName = `winfix_system_backup_${timestamp}.zip`;

      const fallbackDownload = (blobObj: Blob) => {
        const url = URL.createObjectURL(blobObj);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        downloadAnchorNode.setAttribute("download", fileName);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        URL.revokeObjectURL(url);
      };

      if ('showSaveFilePicker' in window && window.self === window.top) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'ZIP Files',
              accept: { 'application/zip': ['.zip'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setIsSystemBackingUp(false);
            return;
          }
          console.warn("showSaveFilePicker failed, falling back to traditional download:", err);
          fallbackDownload(blob);
        }
      } else {
        fallbackDownload(blob);
      }

      setBackupResult(language === 'en' ? "Automated system backup downloaded successfully." : "자동화 시스템 백업 ZIP 다운로드가 완료되었습니다.");
      await logAdminAction('export', 'system_backup', '자동화 시스템 백업 ZIP 다운로드 완료', 'success', 'DATABASE');
    } catch (error: any) {
      console.error("System backup download failed:", error);
      setBackupResult(language === 'en' ? `Backup failed: ${error.message}` : `백업 실패: ${error.message}`);
    } finally {
      setIsSystemBackingUp(false);
      setTimeout(() => setBackupResult(null), 8000);
    }
  };

  const handleRunBundleSync = async () => {
    if (!isAdmin) return;
    try {
      const authHeaders = await getAuthHeaders();
      const resp = await fetch('/api/admin/bundle-sync', {
        method: 'POST',
        headers: authHeaders
      });
      const json = await parseJsonResponse(resp);
      if (json.success) {
        customAlert(json.message);
      } else {
        customAlert(language === 'en' ? `Bundle sync failed: ${json.error}` : `번들링 동기화 실패: ${json.error}`);
      }
    } catch (err: any) {
      customAlert(language === 'en' ? `Error: ${err.message}` : `오류 발생: ${err.message}`);
    }
  };

  const handleDownloadLastKnownGoodJson = async () => {
    if (!isAdmin) return;
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/admin/last-known-good/download', {
        headers: authHeaders
      });
      if (response.ok) {
        const blob = await response.blob();
        const timestamp = getKSTISOString().split('T')[0];
        const fileName = `last_known_good_snapshot_${timestamp}.json`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        await logAdminAction('export', 'last_known_good_download', 'Last-Known-Good 스냅샷 JSON 다운로드 완료', 'info', 'DATABASE');
      } else {
        const clientSnap = localStorage.getItem('winfix_last_known_good_client');
        if (clientSnap) {
          const blob = new Blob([clientSnap], { type: 'application/json' });
          const timestamp = getKSTISOString().split('T')[0];
          const fileName = `last_known_good_snapshot_${timestamp}.json`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } else {
          customAlert(language === 'en' ? "No snapshot file available for download." : "다운로드 가능한 스냅샷 파일이 없습니다.");
        }
      }
    } catch (err: any) {
      console.error("Download failed:", err);
      customAlert(language === 'en' ? "Failed to download snapshot file." : "스냅샷 파일 다운로드에 실패했습니다.");
    }
  };

  const handlePurgeOldSnapshots = async (customRetention?: number) => {
    if (!isAdmin) return;
    try {
      const authHeaders = await getAuthHeaders();
      const resp = await fetch('/api/admin/last-known-good/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ maxRetention: customRetention || lastKnownGoodInfo?.retentionCount || 7 })
      });
      const json = await parseJsonResponse(resp);
      if (json.success) {
        customAlert(
          language === 'en'
            ? `Automated purge policy executed. ${json.purgedCount} old snapshots purged. (${json.remainingCount} active snapshots retained)`
            : `자동 정리 정책 실행 완료: 오래된 스냅샷 ${json.purgedCount}개가 정리되었습니다. (현재 최신 ${json.remainingCount}개 스냅샷 보관 중)`
        );
        fetchLastKnownGoodStatus();
      }
    } catch (e) {
      console.error("Purge error:", e);
      customAlert(language === 'en' ? "Failed to execute snapshot purge policy." : "스냅샷 자동 정리 정책 실행 중 오류가 발생했습니다.");
    }
  };

  const handleValidateJsonFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let backupData: any = {};
      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        for (const filename of Object.keys(zipContent.files)) {
          if (filename.endsWith('.json') && !filename.includes('metadata.json')) {
            const content = await zipContent.files[filename].async('string');
            const data = JSON.parse(content);
            const parts = filename.split('/');
            const colNameWithExt = parts[parts.length - 1];
            const colName = colNameWithExt.replace('.json', '');
            backupData[colName] = data;
          }
        }
      } else {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsText(file);
        });
        backupData = JSON.parse(content);
      }

      let issuesArray = backupData['issues'] || backupData['KnownIssue'] || backupData['items'];
      if (!issuesArray && Array.isArray(backupData)) {
        issuesArray = backupData;
      }

      if (!issuesArray || !Array.isArray(issuesArray)) {
        customAlert(language === 'en' ? "No 'issues' dataset found in the selected file to validate." : "선택한 파일에서 검증할 'issues' 데이터셋을 찾을 수 없습니다.");
        return;
      }

      const result = validateKnownIssuesData(issuesArray);
      setValidationReportModal(result);
    } catch (err: any) {
      customAlert(language === 'en' ? `File parsing failed: ${err.message}` : `파일 파싱 실패: ${err.message}`);
    } finally {
      event.target.value = '';
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setBackupResult(null);

    try {
      let backupData: any = {};
      let totalRestored = 0;

      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        
        for (const filename of Object.keys(zipContent.files)) {
          if (filename.endsWith('.json') && !filename.includes('metadata.json')) {
            const content = await zipContent.files[filename].async('string');
            const data = JSON.parse(content);
            const parts = filename.split('/');
            const colNameWithExt = parts[parts.length - 1];
            const colName = colNameWithExt.replace('.json', '');
            backupData[colName] = data;
          }
        }
      } else {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsText(file);
        });
        backupData = JSON.parse(content);
      }

      if (Array.isArray(backupData)) {
        backupData = { issues: backupData };
      }

      // 1. Run Schema Validation before attempting to overwrite existing records!
      let issuesArray = backupData['issues'] || backupData['KnownIssue'];
      if (issuesArray && Array.isArray(issuesArray)) {
        const validation = validateKnownIssuesData(issuesArray);

        if (validation.invalidCount > 0) {
          const sampleErrors = validation.errors.slice(0, 8).map(err => `• ${err}`).join('\n');
          const remainingCount = validation.errors.length > 8 ? validation.errors.length - 8 : 0;
          const overflowText = remainingCount > 0 ? `\n...외 ${remainingCount}개 추가 불일치 항목` : '';

          const confirmMsg = language === 'en'
            ? `[KnownIssue Schema Validation Discrepancy Report]\n\nFound ${validation.invalidCount} record(s) with schema discrepancies out of ${validation.totalRecords} total records.\n\nDiscrepancies found:\n${sampleErrors}${overflowText}\n\nDo you want to proceed by importing ONLY the ${validation.validCount} valid record(s) and skipping the invalid ones?`
            : `[KnownIssue 스키마 규격 불일치 검증 보고서]\n\n가져올 전체 ${validation.totalRecords}개 항목 중 ${validation.invalidCount}개 항목이 규격 스키마와 일치하지 않습니다.\n\n발견된 주요 불일치 내역:\n${sampleErrors}${overflowText}\n\n유효한 ${validation.validCount}개 항목만 선택하여 복원하고 불일치 항목은 제외하시겠습니까?`;

          let shouldProceed = false;
          await new Promise<void>((resolve) => {
            customConfirm(confirmMsg, () => {
              shouldProceed = true;
              resolve();
            });
            // If user closes or cancels, resolve after timeout or click
            setTimeout(() => {
              if (!shouldProceed) resolve();
            }, 10000);
          });

          if (!shouldProceed) {
            setBackupResult(language === 'en' ? "Import aborted due to schema validation discrepancies." : "스키마 불일치로 인해 불러오기가 취소되었습니다.");
            await logAdminAction('import', 'schema_validation_abort', `스키마 검증 불일치로 복원 중단 (유효: ${validation.validCount}, 불일치: ${validation.invalidCount})`, 'warning', 'DATABASE');
            setIsImporting(false);
            event.target.value = '';
            return;
          }

          backupData['issues'] = validation.validRecords;
        }
      }

      // 1.5 Trigger automatic 'Last-Known-Good' backup snapshot right before writing imported data
      let initialSnapshotCount = dbIssues ? dbIssues.length : 0;
      const authHeaders = await getAuthHeaders();
      try {
        const lkgResp = await fetch('/api/admin/last-known-good/create', { method: 'POST', headers: authHeaders });
        const lkgJson = await parseJsonResponse(lkgResp);
        if (lkgJson.success && lkgJson.snapshot) {
          initialSnapshotCount = lkgJson.snapshot.totalRecords || initialSnapshotCount;
          setLastKnownGoodInfo({
            createdAt: lkgJson.snapshot.createdAt,
            totalRecords: lkgJson.snapshot.totalRecords,
            collections: lkgJson.snapshot.collections
          });
        }
      } catch (lkgErr) {
        console.warn("Server last-known-good backup trigger error:", lkgErr);
      }

      if (dbIssues && dbIssues.length > 0) {
        try {
          localStorage.setItem('winfix_last_known_good_client', JSON.stringify({
            timestamp: new Date().toISOString(),
            issuesCount: dbIssues.length,
            issues: dbIssues
          }));
        } catch (_) {}
      }

      // 2. Perform Overwrite / Restore
      const activeDbMode = (localStorage.getItem('winfix_db_mode') as 'firestore' | 'server_file') || dbMode;

      if (activeDbMode === 'server_file') {
        for (const originalColName of Object.keys(backupData)) {
          let colName = originalColName;
          if (colName === 'feedback_logs') colName = 'feedback';
          const docs = backupData[originalColName];
          if (Array.isArray(docs) && docs.length > 0) {
            const resp = await fetch('/api/admin/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeaders },
              body: JSON.stringify({ collection: colName, data: docs, mode: 'merge' })
            });
            const json = await parseJsonResponse(resp);
            if (json.success) {
              totalRestored += json.count || docs.length;
            }
          }
        }
      } else {
        try {
          for (const originalColName of Object.keys(backupData)) {
            let colName = originalColName;
            if (colName === 'feedback_logs') colName = 'feedback';
            
            const docs = backupData[originalColName];
            if (Array.isArray(docs)) {
              for (let i = 0; i < docs.length; i += 500) {
                const batch = writeBatch(db);
                const chunk = docs.slice(i, i + 500);
                chunk.forEach(docData => {
                  const { id, ...data } = docData;
                  if (id) {
                    const docRef = doc(db, colName, id);
                    batch.set(docRef, data, { merge: true });
                    totalRestored++;
                  }
                });
                await batch.commit();
              }
            }
          }
        } catch (firestoreErr: any) {
          console.warn("Firestore import failed (likely quota limit), falling back to REST JSON server restore:", firestoreErr);
          setDbMode('server_file');
          localStorage.setItem('winfix_db_mode', 'server_file');
          localStorage.setItem('winfix_db_mode_fallback', 'true');
          setDbStatus('quota');

          totalRestored = 0;
          for (const originalColName of Object.keys(backupData)) {
            let colName = originalColName;
            if (colName === 'feedback_logs') colName = 'feedback';
            const docs = backupData[originalColName];
            if (Array.isArray(docs) && docs.length > 0) {
              const resp = await fetch('/api/admin/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ collection: colName, data: docs, mode: 'merge' })
              });
              const json = await parseJsonResponse(resp);
              if (json.success) {
                totalRestored += json.count || docs.length;
              }
            }
          }
        }
      }

      setBackupResult(
        language === 'en'
          ? `Restore completed. ${totalRestored} valid records imported. (Last-Known-Good snapshot saved automatically)`
          : `복원 완료. ${totalRestored}개의 유효한 레코드를 가져왔습니다. (직전 정상 백업(Last-Known-Good)이 자동 생성되었습니다)`
      );
      await logAdminAction('import', 'data_restore', `데이터 복원 완료: ${totalRestored}개 레코드`, 'success', 'DATABASE');
      fetchIssues(false);
      fetchCategoryCounts();
      fetchLastKnownGoodStatus();

      // Post-import deviation status check
      if (initialSnapshotCount > 0) {
        const deviationRatio = Math.abs(totalRestored - initialSnapshotCount) / initialSnapshotCount;
        if (totalRestored < initialSnapshotCount * 0.7 || deviationRatio > 0.5) {
          const warnMsg = language === 'en'
            ? `[Data Deviation Warning]\n\nThe imported dataset count (${totalRestored} records) deviates significantly from the pre-import snapshot (${initialSnapshotCount} records).\n\nIf the new import caused data loss or corruption, click "Restore Last-Known-Good State" in the backup panel to immediately roll back.`
            : `[데이터 레코드 수 변경 감지 경고]\n\n가져온 데이터 레코드 수(${totalRestored}개)가 사전 백업 스냅샷(${initialSnapshotCount}개)과 상당한 차이를 보입니다.\n\n불러오기로 인해 데이터 오염이나 손상이 발생한 경우, 백업 패널의 "직전 정상 백업 상태로 롤백" 버튼을 클릭하여 즉시 복구할 수 있습니다.`;
          
          setTimeout(() => {
            customAlert(warnMsg);
          }, 300);
        }
      }
    } catch (error: any) {
      console.error("Import failed:", error);
      setBackupResult(language === 'en' ? "Import failed." : "불러오기에 실패했습니다.");
    } finally {
      setIsImporting(false);
      setTimeout(() => setBackupResult(null), 5000);
      event.target.value = '';
    }
  };

  const handleBulkTranslate = async () => {
    if (!isAdmin || isTranslating) return;

    setIsTranslating(true);
    setTranslationProgress(0);
    setTranslationResult(null);

    try {
      // 1. Fetch issues with safety limit
      const issuesSnapshot = await getDocs(firestoreQuery(collection(db, 'issues'), limit(30)));
      const allIssues = issuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnownIssue));
      
      // 2. Filter issues missing English data
      const issuesToTranslate = allIssues.filter(issue => !issue.title_en || !issue.symptoms_en || !issue.manualSteps_en);
      
      if (issuesToTranslate.length === 0) {
        setTranslationResult(language === 'en' ? "All documents already have English data." : "모든 문서에 이미 영어 데이터가 존재합니다.");
        setIsTranslating(false);
        return;
      }

      setTranslationTotal(issuesToTranslate.length);
      let translatedCount = 0;

      // 3. Setup AI
      const ai = getAiClient();

      // 4. Translate in small batches
      const batchSize = 3;
      for (let i = 0; i < issuesToTranslate.length; i += batchSize) {
        const batch = issuesToTranslate.slice(i, i + batchSize);
        
        const prompt = `
          Translate the following Windows troubleshooting guides from Korean to English.
          Return the result strictly as a JSON array of objects matching this schema:
          { "id": "original_id", "title_en": "English Title", "symptoms_en": "English Symptoms", "manualSteps_en": ["Step 1", "Step 2"] }
          
          CRITICAL: 
          1. Do NOT translate PowerShell scripts or commands.
          2. Keep technical terms like 'Windows 11', 'Registry', 'PowerShell' as is.
          3. Ensure the translation is professional and accurate.
          
          Data to translate:
          ${JSON.stringify(batch.map(issue => ({
            id: issue.id,
            title: issue.title,
            symptoms: issue.symptoms,
            manualSteps: issue.manualSteps
          })), null, 2)}
        `;

        try {
          const response = await callAiWithFallback(ai, prompt, {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title_en: { type: Type.STRING },
                    symptoms_en: { type: Type.STRING },
                    manualSteps_en: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ["id", "title_en", "symptoms_en", "manualSteps_en"]
                }
              }
            });
          const responseText = response.trim();
        
        if (responseText) {
          let results;
          try {
            results = parseAiJson(responseText);
          } catch (e) {
            console.error("AI Translation parse error. Raw text:", responseText);
            continue; // Skip this batch if invalid
          }
          
          const firestoreBatch = writeBatch(db);
          
          results.forEach((res: any) => {
            const issueRef = doc(db, 'issues', res.id);
            firestoreBatch.update(issueRef, {
              title_en: res.title_en,
              symptoms_en: res.symptoms_en,
              manualSteps_en: res.manualSteps_en
            });
          });
          
          await firestoreBatch.commit();
          translatedCount += results.length;
          setTranslationProgress(translatedCount);
        }
        } catch (genErr) {
          console.error("AI Generation failed for batch:", genErr);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setTranslationResult(language === 'en' ? `Successfully translated ${translatedCount} documents.` : `${translatedCount}개의 문서를 성공적으로 번역했습니다.`);
      await logAdminAction('verify', 'bulk_translate', `${translatedCount}개 문서 영어 데이터 생성 완료`, 'success', 'AI');
      fetchIssues(false);
    } catch (error: any) {
      const errMsg = error.message || '';
      if (errMsg.includes("Quota") || errMsg.includes("quota")) {
        console.warn("Bulk translation stopped: Quota Exceeded");
        setTranslationResult(language === 'en' ? "Bulk translation stopped: Database Read Quota Exceeded." : "일괄 번역 중단: 데이터베이스 읽기 할당량을 초과했습니다.");
      } else {
        console.error("Bulk translation failed:", error);
        setTranslationResult(language === 'en' ? "Bulk translation failed. Check console." : "일괄 번역에 실패했습니다. 콘솔을 확인하세요.");
      }
    } finally {
      setIsTranslating(false);
      setTimeout(() => setTranslationResult(null), 10000);
    }
  };

  const [verificationViewMode, setVerificationViewMode] = useState<'list' | 'json'>('list');

  const verifySingleIssueWithAI = async (issue: KnownIssue) => {
    if (verifyingIssueId) return;
    setVerifyingIssueId(issue.id);
    
    try {
      // Check for API key in both places (Vite env and Secrets)
      const ai = getAiClient();
      
      const prompt = `
        You are a Windows technical expert. Please verify if the following troubleshooting information is still valid and accurate for the current Windows 10/11 environment.
        
        Issue Title: ${issue.title}
        Category: ${issue.category}
        Error Code: ${issue.code}
        Symptoms: ${issue.symptoms}
        Script: ${issue.script}
        Manual Steps: ${issue.manualSteps.join('\n')}
        
        Please provide your verdict in JSON format:
        {
          "status": "verified" | "needs_update" | "obsolete",
          "feedback": "A brief explanation of why it's valid or what needs to be updated. If obsolete, explain why."
        }
      `;

      let responseText = "";
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          const response = await callAiWithFallback(ai, prompt, {
              responseMimeType: "application/json",
            });
          responseText = response.trim();
          break;
        } catch (err: any) {
          const is429 = err.message?.includes('429') || JSON.stringify(err).includes('429');
          if (is429 && retryCount < maxRetries) {
            retryCount++;
            await new Promise(res => setTimeout(res, 2000 * Math.pow(2, retryCount)));
          } else {
            throw err;
          }
        }
      }

      if (responseText) {
        let verdict;
        try {
          verdict = parseAiJson(responseText);
        } catch (e: any) {
          throw new Error("AI Verification parse error: " + (e.message || "Invalid JSON"));
        }
        
        // Update Firestore
        const isRevised = verdict.status === 'needs_update' && (verdict.revisedScript || (verdict.revisedManualSteps && verdict.revisedManualSteps.length > 0));
        const finalStatus = isRevised ? 'verified' : verdict.status;
        const finalFeedback = isRevised ? `[AI 보완 적용 완료] ${verdict.feedback}` : verdict.feedback;

        const issueRef = doc(db, 'issues', issue.id);
        const updateData: any = {
          verifiedAt: getKSTISOString(),
          verificationStatus: finalStatus,
          aiFeedback: finalFeedback
        };
        if (verdict.revisedScript) updateData.script = verdict.revisedScript;
        if (verdict.revisedManualSteps && Array.isArray(verdict.revisedManualSteps) && verdict.revisedManualSteps.length > 0) updateData.manualSteps = verdict.revisedManualSteps;
        if (verdict.revisedSymptoms) updateData.symptoms = verdict.revisedSymptoms;
        
        await updateDoc(issueRef, updateData);
        trackUsage(0, 1);

        const logSev = verdict.status === 'verified' ? 'success' : verdict.status === 'needs_update' ? 'warning' : 'error';
        await logAdminAction('verify', issue.id, `개별 AI 데이터 점검 [${issue.title}]: ${verdict.status}. 피드백: ${verdict.feedback}`, logSev, 'AI');

        // Update local state for immediate UI feedback
        setDbIssues(prev => prev.map(i => i.id === issue.id ? { ...i, ...updateData } : i));
        
        if (language === 'en') {
          alert(`Verification complete: ${verdict.status}`);
        } else {
          alert(`검증이 완료되었습니다: ${verdict.status === 'verified' ? '정상' : verdict.status === 'needs_update' ? '업데이트 필요' : '폐기 권장'}`);
        }
      } else {
        throw new Error("Invalid AI response format");
      }
    } catch (err: any) {
      const isQuota = err.message?.includes('Quota exceeded') || err.message?.includes('429');
      if (isQuota) {
        console.warn(`Failed to verify issue ${issue.id}: AI Quota exceeded`);
      } else {
        console.error(`Failed to verify issue ${issue.id}`, err);
      }
      alert(isQuota 
        ? (language === 'en' ? "AI Quota exceeded. Please try again later." : "AI 할당량이 초과되었습니다. 나중에 다시 시도하세요.")
        : (language === 'en' ? "Verification failed: " : "검증 실패: ") + err.message
      );
    } finally {
      setVerifyingIssueId(null);
    }
  };

  const handleBatchVerifyCollectedIssues = async (onlyUnverified = false) => {
    if (verifyingData) return;
    if (dbIssues.length === 0) {
      alert(language === 'en' ? "No issues in database to verify." : "데이터베이스에 수집된 이슈가 없습니다.");
      return;
    }

    const targetIssues = onlyUnverified 
      ? dbIssues.filter(i => !i.verificationStatus) 
      : dbIssues;

    if (targetIssues.length === 0) {
      alert(language === 'en' ? "All collected issues are already verified!" : "모든 수집 항목이 이미 검증 완료되었습니다.");
      return;
    }

    setVerifyingData(true);
    setVerificationProgress(0);
    setVerificationResults([]);
    setShowVerificationModal(true);

    try {
      await logAdminAction('verify', 'batch_collected_start', `수집 항목 AI 일괄 검증 시작 (대상: ${targetIssues.length}개 항목, 조건: ${onlyUnverified ? '미검증만' : '전체'})`, 'info', 'AI');
      await runAiVerification(targetIssues);
      await logAdminAction('verify', 'batch_collected_end', `수집 항목 AI 일괄 검증 완료 (${targetIssues.length}개 항목)`, 'success', 'AI');
    } catch (error) {
      console.error("Batch verification failed", error);
      alert(language === 'en' ? "An error occurred during batch verification." : "일괄 검증 처리 중 오류가 발생했습니다.");
    } finally {
      setVerifyingData(false);
    }
  };

  const handleApplyBatchVerificationStatus = async (targetStatus: 'verified' | 'needs_update' | 'obsolete' | 'all') => {
    if (isApplyingBatch) return;

    const targets = verificationResults.filter(r => {
      if (r.status === 'error' || r.applied) return false;
      if (targetStatus === 'all') return r.status === 'verified' || r.status === 'needs_update' || r.status === 'obsolete';
      return r.status === targetStatus;
    });

    if (targets.length === 0) {
      customAlert(language === 'en' ? "No target items found for this action." : "해당 상태의 적용 가능한 대상 항목이 없습니다.");
      return;
    }

    const statusLabel = 
      targetStatus === 'verified' ? (language === 'en' ? 'Verified' : '검증완료') :
      targetStatus === 'needs_update' ? (language === 'en' ? 'Needs Revision' : '수정필요') :
      targetStatus === 'obsolete' ? (language === 'en' ? 'Obsolete' : '폐기권장') :
      (language === 'en' ? 'All Results' : '전체 결과');

    const confirmMsg = language === 'en'
      ? `Do you want to batch apply [${statusLabel}] status to ${targets.length} items in the database?`
      : `총 ${targets.length}개 항목을 [${statusLabel}] 상태로 데이터베이스에 일괄 적용하시겠습니까?`;

    customConfirm(confirmMsg, async () => {
      setIsApplyingBatch(true);
      try {
        const kstNow = getKSTISOString();
        const activeDbMode = localStorage.getItem('winfix_db_mode') || 'firestore';

        if (activeDbMode === 'server_file') {
          for (const target of targets) {
            try {
              const isAppliedFix = target.status === 'needs_update' || !!target.revisedScript || (target.revisedManualSteps && target.revisedManualSteps.length > 0);
              const finalStatus = isAppliedFix ? 'verified' : target.status;
              const rawFb = target.feedback || '';
              const finalFeedback = isAppliedFix 
                ? (rawFb.startsWith('[AI 보완 적용 완료]') ? rawFb : `[AI 보완 적용 완료] ${rawFb}`)
                : rawFb;

              const patchData: any = {
                verificationStatus: finalStatus,
                verifiedAt: kstNow,
                aiFeedback: finalFeedback
              };
              if (target.revisedScript) patchData.script = target.revisedScript;
              if (target.revisedManualSteps && target.revisedManualSteps.length > 0) patchData.manualSteps = target.revisedManualSteps;
              if (target.revisedSymptoms) patchData.symptoms = target.revisedSymptoms;

              await fetch(`/api/issues/${target.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patchData)
              });
            } catch (e) {
              console.error(`Failed to update issue ${target.id}`, e);
            }
          }
        } else {
          const batch = writeBatch(db);
          targets.forEach(target => {
            const docRef = doc(db, 'issues', target.id);
            const isAppliedFix = target.status === 'needs_update' || !!target.revisedScript || (target.revisedManualSteps && target.revisedManualSteps.length > 0);
            const finalStatus = isAppliedFix ? 'verified' : target.status;
            const rawFb = target.feedback || '';
            const finalFeedback = isAppliedFix 
              ? (rawFb.startsWith('[AI 보완 적용 완료]') ? rawFb : `[AI 보완 적용 완료] ${rawFb}`)
              : rawFb;

            const patchData: any = {
              verificationStatus: finalStatus,
              verifiedAt: kstNow,
              aiFeedback: finalFeedback
            };
            if (target.revisedScript) patchData.script = target.revisedScript;
            if (target.revisedManualSteps && target.revisedManualSteps.length > 0) patchData.manualSteps = target.revisedManualSteps;
            if (target.revisedSymptoms) patchData.symptoms = target.revisedSymptoms;

            batch.set(docRef, patchData, { merge: true });
          });
          await batch.commit();
          trackUsage(0, targets.length);
        }

        setDbIssues(prev => prev.map(item => {
          const match = targets.find(t => t.id === item.id);
          if (match) {
            const isAppliedFix = match.status === 'needs_update' || !!match.revisedScript || (match.revisedManualSteps && match.revisedManualSteps.length > 0);
            const finalStatus = isAppliedFix ? 'verified' : match.status;
            const rawFb = match.feedback || '';
            const finalFeedback = isAppliedFix 
              ? (rawFb.startsWith('[AI 보완 적용 완료]') ? rawFb : `[AI 보완 적용 완료] ${rawFb}`)
              : rawFb;

            const updated: any = {
              ...item,
              verificationStatus: finalStatus,
              verifiedAt: kstNow,
              aiFeedback: finalFeedback
            };
            if (match.revisedScript) updated.script = match.revisedScript;
            if (match.revisedManualSteps && match.revisedManualSteps.length > 0) updated.manualSteps = match.revisedManualSteps;
            if (match.revisedSymptoms) updated.symptoms = match.revisedSymptoms;
            return updated;
          }
          return item;
        }));

        setVerificationResults(prev => prev.filter(res => !targets.some(t => t.id === res.id)));

        await logAdminAction('verify', 'batch_apply', `AI 검증 결과 일괄 적용 [${statusLabel}]: ${targets.length}개 항목`, 'success', 'AI');

        customAlert(language === 'en'
          ? `Successfully applied [${statusLabel}] and complemented issues in DB!`
          : `총 ${targets.length}개 항목에 [${statusLabel}] 검증 상태 및 보완 내용이 데이터베이스에 성공적으로 일괄 적용되었습니다!`
        );
      } catch (err: any) {
        console.error("Failed to batch apply verification status", err);
        customAlert(language === 'en' ? "Failed to apply changes to database." : "데이터베이스 적용 중 오류가 발생했습니다.");
      } finally {
        setIsApplyingBatch(false);
      }
    });
  };

  const handleApplySingleVerificationStatus = async (item: any) => {
    if (isApplyingBatch) return;
    setIsApplyingBatch(true);
    const kstNow = getKSTISOString();
    const activeDbMode = localStorage.getItem('winfix_db_mode') || 'firestore';

    try {
      const isAppliedFix = item.status === 'needs_update' || !!item.revisedScript || (item.revisedManualSteps && item.revisedManualSteps.length > 0);
      const finalStatus = isAppliedFix ? 'verified' : item.status;
      const rawFb = item.feedback || '';
      const finalFeedback = isAppliedFix 
        ? (rawFb.startsWith('[AI 보완 적용 완료]') ? rawFb : `[AI 보완 적용 완료] ${rawFb}`)
        : rawFb;

      const patchData: any = {
        verificationStatus: finalStatus,
        verifiedAt: kstNow,
        aiFeedback: finalFeedback
      };
      if (item.revisedScript) patchData.script = item.revisedScript;
      if (item.revisedManualSteps && item.revisedManualSteps.length > 0) patchData.manualSteps = item.revisedManualSteps;
      if (item.revisedSymptoms) patchData.symptoms = item.revisedSymptoms;

      if (activeDbMode === 'server_file') {
        await fetch(`/api/issues/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchData)
        });
      } else {
        const docRef = doc(db, 'issues', item.id);
        await setDoc(docRef, patchData, { merge: true });
      }

      setDbIssues(prev => prev.map(i => {
        if (i.id === item.id) {
          const updated: any = {
            ...i,
            verificationStatus: finalStatus,
            verifiedAt: kstNow,
            aiFeedback: finalFeedback
          };
          if (item.revisedScript) updated.script = item.revisedScript;
          if (item.revisedManualSteps && item.revisedManualSteps.length > 0) updated.manualSteps = item.revisedManualSteps;
          if (item.revisedSymptoms) updated.symptoms = item.revisedSymptoms;
          return updated;
        }
        return i;
      }));

      setVerificationResults(prev => prev.filter(r => r.id !== item.id));

      await logAdminAction('verify', item.id, `AI 검증 단일 적용 [${item.title}]: ${item.status}`, 'success', 'AI');
      customAlert(language === 'en' ? `Applied [${item.status}] and complemented "${item.title}"` : `"${item.title}" 항목에 [${item.status}] 검증 상태 및 보완 내용이 적용되었습니다.`);
    } catch (err) {
      console.error("Failed to apply single item verification status", err);
      customAlert(language === 'en' ? "Failed to apply item." : "해당 항목 적용에 실패했습니다.");
    } finally {
      setIsApplyingBatch(false);
    }
  };

  const handleStartVerification = async (months: number) => {
    if (verifyingData) return;
    
    setVerifyingData(true);
    setVerificationProgress(0);
    setVerificationResults([]);
    setShowVerificationModal(true);

    try {
      // 1. Fetch issues that need verification
      const path = 'issues';
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
      
      // We'll fetch issues that haven't been verified recently or at all
      // Firestore doesn't support querying for missing fields easily,
      // so we'll fetch a batch by verifiedAt (asc) and another by createdAt (asc)
      // to catch both old verified issues and new unverified issues.
      const issuesToVerify: KnownIssue[] = [];
      const seenIds = new Set<string>();

      // 1. Fetch issues with oldest verification dates
      const qVerified = firestoreQuery(
        collection(db, path),
        orderBy('verifiedAt', 'asc'),
        limit(20)
      );
      
      const snapshotVerified = await getDocs(qVerified);
      snapshotVerified.forEach(doc => {
        const data = doc.data() as KnownIssue;
        if (new Date(data.verifiedAt) < cutoffDate) {
          issuesToVerify.push(data);
          seenIds.add(data.id);
        }
      });

      // 2. Fetch oldest issues that might not have been verified at all
      // (If we still need more candidates)
      if (issuesToVerify.length < 10) {
        const qCreated = firestoreQuery(
          collection(db, path),
          orderBy('createdAt', 'asc'),
          limit(30)
        );
        const snapshotCreated = await getDocs(qCreated);
        snapshotCreated.forEach(doc => {
          const data = doc.data() as KnownIssue;
          if (!seenIds.has(data.id)) {
            if (!data.verifiedAt || new Date(data.verifiedAt) < cutoffDate) {
              issuesToVerify.push(data);
              seenIds.add(data.id);
            }
          }
        });
      }

      // Limit to 10 for the actual verification batch
      let finalBatch = issuesToVerify.slice(0, 10);

      // --- INTEGRATED DUPLICATE CHECK ---
      // Check if any of these are duplicates of each other or existing items
      const cleanedBatch: KnownIssue[] = [];
      for (const issue of finalBatch) {
        const qCode = firestoreQuery(collection(db, path), where('code', '==', issue.code), limit(2));
        const qTitle = firestoreQuery(collection(db, path), where('title', '==', issue.title), limit(2));
        
        const [snapCode, snapTitle] = await Promise.all([getDocs(qCode), getDocs(qTitle)]);
        
        // If there's more than 1 document with the same code or title, it's a duplicate
        // We'll keep the current one if it's the newest, otherwise we might delete it
        // For simplicity in this batch, if we find another doc with same code/title that isn't this one, 
        // and that doc was created/updated more recently, we'll skip this one.
        let isDuplicate = false;
        
        const checkDuplicate = (snap: any) => {
          for (const docSnap of snap.docs) {
            if (docSnap.id !== issue.id) {
              const otherData = docSnap.data();
              
              const getTs = (val: any) => {
                if (!val) return 0;
                if (typeof val.toDate === 'function') return val.toDate().getTime();
                const d = new Date(val);
                return isNaN(d.getTime()) ? 0 : d.getTime();
              };

              const otherTs = getTs(otherData.createdAt);
              const currentTs = getTs(issue.createdAt);

              // If other doc is newer, this one is a duplicate to be removed
              if (otherTs > currentTs) {
                isDuplicate = true;
                return;
              }
            }
          }
        };

        if (issue.code && issue.code !== 'n/a' && issue.code !== '알 수 없음') checkDuplicate(snapCode);
        if (!isDuplicate) checkDuplicate(snapTitle);

        if (isDuplicate) {
          console.log(`Deleting duplicate found during verification: ${issue.id} (${issue.title})`);
          await deleteDoc(doc(db, path, issue.id));
          await logAdminAction('delete', issue.id, `재검증 중 중복 데이터 자동 삭제: ${issue.title}`, 'warning', 'DATABASE');
        } else {
          cleanedBatch.push(issue);
        }
      }
      
      finalBatch = cleanedBatch;

      if (finalBatch.length === 0) {
        alert(language === 'en' ? "No data to verify after duplicate cleanup. Please try again." : "중복 정리 후 검증할 데이터가 없습니다. 다시 실행해 주세요.");
        setVerifyingData(false);
        setShowVerificationModal(false);
        return;
      }
      // --- END DUPLICATE CHECK ---

      await logAdminAction('verify', 'batch_start', `AI 데이터 재검증 시작 (대상: ${finalBatch.length}개 항목, 범위: 최근 ${months}개월)`, 'info', 'AI');

      // 2. Run AI verification
      await runAiVerification(finalBatch);
      
      await logAdminAction('verify', 'batch_end', `AI 데이터 재검증 완료 (${finalBatch.length}개 항목 처리됨)`, 'success', 'AI');
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'issues');
      alert(language === 'en' ? "An error occurred during data verification." : "데이터 검증 중 오류가 발생했습니다.");
    } finally {
      setVerifyingData(false);
    }
  };

  const runAiVerification = async (issues: KnownIssue[]) => {
    const ai = getAiClient();
    const batchResults: { id: string, data: any, verdict: any }[] = [];

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      setVerificationProgress(Math.round(((i + 1) / issues.length) * 100));

      // Rate limit protection: small delay between requests
      if (i > 0) await new Promise(res => setTimeout(res, 800));

      const prompt = `
        You are a Windows technical expert. Please verify if the following troubleshooting information is still valid and accurate for the current Windows 10/11 environment.
        
        Issue Title: ${issue.title}
        Category: ${issue.category}
        Error Code: ${issue.code}
        Symptoms: ${issue.symptoms}
        Script: ${issue.script}
        Manual Steps: ${issue.manualSteps.join('\n')}
        
        Please provide your verdict in JSON format:
        {
          "status": "verified" | "needs_update" | "obsolete",
          "feedback": "A brief explanation of why it's valid or what needs to be updated. If obsolete, explain why.",
          "revisedScript": "If status is 'needs_update', provide a complete, updated/corrected PowerShell command or script to fix the issue on Windows 10/11. Otherwise null.",
          "revisedManualSteps": ["If status is 'needs_update', an array of corrected step-by-step instructions. Otherwise null."],
          "revisedSymptoms": "If status is 'needs_update', improved symptoms string if applicable. Otherwise null."
        }
      `;

      let retryCount = 0;
      const maxRetries = 2;
      let success = false;

      while (retryCount <= maxRetries && !success) {
        try {
          const response = await callAiWithFallback(ai, prompt, {
              responseMimeType: "application/json",
            });
          const responseText = response.trim();
          
          if (responseText) {
            let verdict;
            try {
              verdict = parseAiJson(responseText);
            } catch (e) {
              console.error("AI Verification parse error. Raw text:", responseText);
              break; // Don't retry on parse error
            }
            
            const isRevised = verdict.status === 'needs_update' && (verdict.revisedScript || (verdict.revisedManualSteps && verdict.revisedManualSteps.length > 0));
            const finalStatus = isRevised ? 'verified' : verdict.status;
            const finalFeedback = isRevised ? `[AI 보완 적용 완료] ${verdict.feedback}` : verdict.feedback;

            const updateData: any = {
              verifiedAt: getKSTISOString(),
              verificationStatus: finalStatus,
              aiFeedback: finalFeedback
            };
            if (verdict.revisedScript) {
              updateData.revisedScript = verdict.revisedScript;
              updateData.script = verdict.revisedScript;
            }
            if (verdict.revisedManualSteps && Array.isArray(verdict.revisedManualSteps) && verdict.revisedManualSteps.length > 0) {
              updateData.revisedManualSteps = verdict.revisedManualSteps;
              updateData.manualSteps = verdict.revisedManualSteps;
            }
            if (verdict.revisedSymptoms) {
              updateData.revisedSymptoms = verdict.revisedSymptoms;
              updateData.symptoms = verdict.revisedSymptoms;
            }

            batchResults.push({ id: issue.id, data: updateData, verdict });

            setVerificationResults(prev => [...prev, {
              id: issue.id,
              title: issue.title,
              status: verdict.status,
              feedback: verdict.feedback,
              revisedScript: verdict.revisedScript || null,
              revisedManualSteps: verdict.revisedManualSteps || null,
              revisedSymptoms: verdict.revisedSymptoms || null
            }]);
            success = true;
          }
        } catch (err: any) {
          const isQuotaError = err.message?.includes('429') || 
                              err.message?.includes('Quota') || 
                              JSON.stringify(err).includes('429');
          
          if (isQuotaError && retryCount < maxRetries) {
            retryCount++;
            const waitTime = Math.pow(2, retryCount) * 2000;
            console.warn(`AI Rate Limit (429). Retrying in ${waitTime}ms... (${retryCount}/${maxRetries})`);
            await new Promise(res => setTimeout(res, waitTime));
          } else {
            console.error(`Failed to verify issue ${issue.id}`, err);
            setVerificationResults(prev => [...prev, {
              id: issue.id,
              title: issue.title,
              status: 'error',
              feedback: language === 'en' ? "API quota exhausted or server error. Please try again later." : "API 할당량 초과 또는 서버 오류입니다. 나중에 다시 시도해주세요."
            }]);
            break;
          }
        }
      }
    }

    // After all AI calls in this batch, use Write Batch for efficiency (Delta Update strategy)
    if (batchResults.length > 0) {
      try {
        const batch = writeBatch(db);
        batchResults.forEach(res => {
          const issueRef = doc(db, 'issues', res.id);
          batch.update(issueRef, res.data);
        });
        await batch.commit();
        trackUsage(0, batchResults.length); // Track writes
        
        // Immediately update local state so cards refresh instantly
        setDbIssues(prev => prev.map(item => {
          const match = batchResults.find(res => res.id === item.id);
          return match ? { ...item, ...match.data } : item;
        }));

        // Log all at once or individually for accountability
        for (const res of batchResults) {
          const logSev = res.verdict.status === 'verified' ? 'success' : res.verdict.status === 'needs_update' ? 'warning' : 'error';
          await logAdminAction('verify', res.id, `AI 데이터 재검증 [${issues.find(iss => iss.id === res.id)?.title}]: ${res.verdict.status}. 피드백: ${res.verdict.feedback}`, logSev, 'AI');
        }
      } catch (err) {
        console.error("Batch write failed in AI verification", err);
      }
    }
  };

  const checkAndTriggerAutoSync = async () => {
    console.log("checkAndTriggerAutoSync called");
    if (!isAdmin) return;
    
    const path = 'system_config/status';
    try {
      console.log("Checking system_config/status...");
      const configDoc = await getDoc(doc(db, 'system_config', 'status'));
      let lastSync: Date | null = null;
      
      if (configDoc.exists()) {
        const data = configDoc.data();
        if (data.lastSyncAt) {
          lastSync = new Date(data.lastSyncAt);
          setLastSyncAt(lastSync);
        }
      }

      const now = new Date();
      const kstHour = (now.getUTCHours() + 9) % 24;
      
      if (kstHour % 2 === 0) {
        const startOfHour = new Date(now);
        startOfHour.setMinutes(0, 0, 0);
        
        if (!lastSync || lastSync < startOfHour) {
          console.log(`Auto-sync triggered: KST ${kstHour}시 정시 동기화 실행 (2시간 간격)`);
          handleTriggerAiSearch(true);
        }
      }
    } catch (err: any) {
      const isQuotaError = err.message?.includes('Quota exceeded') || 
                          err.message?.includes('429') || 
                          err.message?.includes('Resource has been exhausted');
      if (isQuotaError) {
        console.warn("Auto-sync skipped due to quota.");
        return;
      }
      console.log("Auto-sync did not complete successfully:", err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      checkAndTriggerAutoSync();
      fetchMaintenanceSettings();
      fetchGithubConfig();
      const intervalId = setInterval(checkAndTriggerAutoSync, 30 * 60 * 1000);
      return () => clearInterval(intervalId);
    }
  }, [isAdmin]);

  const getLocalizedText = (issue: KnownIssue, field: 'title' | 'symptoms') => {
    if (language === 'en' && issue[`${field}_en`]) {
      return issue[`${field}_en`];
    }
    return issue[field];
  };

  const highlightText = (text: string, query: string) => {
    if (!query || !query.trim()) return <span>{text}</span>;
    try {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      const parts = text.split(regex);
      return (
        <>
          {parts.map((part, index) => 
            regex.test(part) ? (
              <mark key={index} className="bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold px-0.5 rounded">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </>
      );
    } catch (e) {
      return <span>{text}</span>;
    }
  };

  const getLocalizedSteps = (issue: KnownIssue) => {
    if (language === 'en' && issue.manualSteps_en && issue.manualSteps_en.length > 0) {
      return issue.manualSteps_en;
    }
    return issue.manualSteps;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Record activity
    recordUserActivity('search', undefined, query);

    setLoading(true);
    setError(null);
    setResult(null);

    let retries = 3;
    let delay = 2000;

    let ai;
    try {
      ai = getAiClient();
    } catch (err: any) {
      setError(language === 'en' ? `API Config Error: ${err.message}` : `설정 오류: ${err.message}`);
      logAppError(err.message, 'error', 'API_Config');
      setLoading(false);
      return;
    }

    for (let i = 0; i < retries; i++) {
      try {
        const knowledgeContext = aiOptimizedKnowledge 
          ? `\n\n[Advanced Knowledge Base - High Priority]\n${aiOptimizedKnowledge}\n\nApply the patterns above to your diagnosis if relevant.`
          : '';

        const promptData = `Windows Version: ${version}\nError/Symptom: ${query}${knowledgeContext}\n\nPlease provide the official Microsoft solution or highly trusted community solutions for this specific error. Provide a clear diagnosis, a safe PowerShell fix script (if applicable). \n\nCRITICAL SAFETY RULES:\n1. If you provide a script, you MUST explicitly detail all potential risks in the 'scriptSafetyWarning' field. This includes registry modifications, system service changes, file deletions, or security settings changes.\n2. If a script is too risky or not applicable, leave the 'script' field empty and set 'isScriptApplicable' to false, then explain why in 'scriptSafetyWarning'.\n3. Ensure any provided script is safe, effective, and follows best practices.\n\nProvide step-by-step manual instructions and source URLs. Respond in ${language === 'en' ? 'English' : 'Korean'}.`;
        const response = await callAiWithFallback(ai, promptData, {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              diagnosis: { type: Type.STRING },
              isScriptApplicable: { type: Type.BOOLEAN },
              script: { type: Type.STRING },
              scriptSafetyWarning: { type: Type.STRING },
              manualSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              sourceUrls: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["diagnosis", "isScriptApplicable", "script", "scriptSafetyWarning", "manualSteps", "sourceUrls"]
          }
        });

        const text = response;
        if (!text) throw new Error(language === 'en' ? "Failed to receive response." : "응답을 받지 못했습니다.");

        let parsedResult: TroubleshootingResult;
        try {
          parsedResult = parseAiJson(text);
        } catch (err: any) {
          console.error("AI Wizard parse error:", err);
          throw new Error(language === 'en' ? "Failed to parse AI response." : "AI 응답 분석에 실패했습니다.");
        }
        setResult(parsedResult);
        await logSearch(query, version);
        break; // Success!
      } catch (err: any) {
        const msg = err.message || "";
        if ((msg.includes("429") || msg.includes("Quota") || msg.includes("UNAVAILABLE") || msg.includes("503")) && i < retries - 1) {
          console.log(`Gemini API busy or rate limited. Retrying in ${delay}ms... (Attempt ${i+1}/${retries})`);
          await new Promise(res => setTimeout(res, delay));
          delay *= 2;
          continue;
        }
        console.error("Error fetching solution:", err);
        setError(err.message || (language === 'en' ? "An error occurred while finding the solution." : "오류 해결 방법을 찾는 중 문제가 발생했습니다."));
        break; // Don't retry for other errors
      }
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch (e) {
      console.warn("Navigator clipboard write failed inside sandbox:", e);
    }
    // Store in global memory register for robust sandbox-pasting support
    (window as any).__lastCopiedScript = text;
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const filteredIssues = dbIssues.filter(issue => {
    if (selectedCategory === null) return false;
    
    const matchesCategory = selectedCategory === '전체' || issue.category === selectedCategory;
    const matchesVersion = selectedVersionFilter === '전체' || 
      (issue.windowsVersions && issue.windowsVersions.includes(selectedVersionFilter));
      
    const searchLower = guidebookQuery.trim().toLowerCase();
    if (!searchLower) return matchesCategory && matchesVersion;
    
    const tokens = searchLower.split(/\s+/).filter(Boolean);
    const combined = [
      issue.title,
      issue.title_en,
      issue.code,
      issue.symptoms,
      issue.symptoms_en,
      issue.category,
      ...(issue.searchKeywords || [])
    ].filter(Boolean).join(' ').toLowerCase();

    const matchesSearch = combined.includes(searchLower) || tokens.every(t => combined.includes(t));
    
    return matchesCategory && matchesVersion && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '업데이트': return <RefreshCw className="w-4 h-4" />;
      case '네트워크': return <Wifi className="w-4 h-4" />;
      case '시스템/블루스크린': return <Monitor className="w-4 h-4" />;
      case '스토어/앱': return <ShoppingBag className="w-4 h-4" />;
      case '정품인증': return <Key className="w-4 h-4" />;
      case '보안/백신': return <Shield className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-200 dark:selection:bg-blue-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Logo & Brand Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <img src="/icon.svg" alt="WinFix Logo" className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 drop-shadow-xs" />
            <h1 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
              Windows Fix Wizard
            </h1>
          </div>

          {/* Desktop Utilities (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Gemini & MS Docs</span>
            </div>

            <button
              onClick={() => setLanguage(lang => lang === 'ko' ? 'en' : 'ko')}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700"
              title={language === 'ko' ? 'Switch to English' : '한국어로 전환'}
            >
              {language === 'ko' ? 'EN' : 'KO'}
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              title={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>

            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors text-xs font-medium border border-blue-200 dark:border-blue-800"
              title={language === 'ko' ? "바로가기 생성" : "Create Shortcut"}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'ko' ? "바로가기" : "Shortcut"}</span>
            </button>

            <button
              onClick={handleRegisterStartupClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors text-xs font-medium border border-indigo-200 dark:border-indigo-800"
              title={language === 'ko' ? "시작프로그램에 등록" : "Add to Startup"}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{language === 'ko' ? "시작프로그램" : "Startup"}</span>
            </button>

            <button
              onClick={() => checkForUpdates(true)}
              disabled={isCheckingUpdate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-xs font-medium border border-emerald-200 dark:border-emerald-800/60 disabled:opacity-50"
              title={language === 'ko' ? "GitHub Releases 실시간 업데이트 확인" : "Check for Updates via GitHub"}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? (language === 'ko' ? "확인 중" : "Checking") : (language === 'ko' ? "업데이트 확인" : "Update Check")}</span>
            </button>

            <div className="pl-2 border-l border-slate-200 dark:border-slate-700">
              {user ? (
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-xs font-medium"
                  title={user?.email || '로그아웃'}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Logout' : '로그아웃'}</span>
                </button>
              ) : (
                <button 
                  onClick={handleLoginStatus}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs font-semibold shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Login' : '로그인'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Quick Controls (visible only on mobile) */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            <button
              onClick={() => setLanguage(lang => lang === 'ko' ? 'en' : 'ko')}
              className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              title={language === 'ko' ? 'Switch to English' : '한국어로 전환'}
            >
              {language === 'ko' ? 'EN' : 'KO'}
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              title={isDarkMode ? '라이트 모드' : '다크 모드'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-1.5 rounded-lg transition-colors border ${
                mobileMenuOpen 
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
              }`}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg overflow-hidden"
            >
              <div className="px-4 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* User Account / Profile status */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 font-bold text-xs">
                      {user ? (user.email?.[0]?.toUpperCase() || 'U') : 'G'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {user ? user.email : (language === 'en' ? 'Guest User' : '게스트 사용자')}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isAdmin && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                            {language === 'en' ? 'Administrator' : '관리자'}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {user ? (language === 'en' ? 'Online Account' : '로그인됨') : (language === 'en' ? 'Guest Mode' : '게스트 모드')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {user ? (
                      <button
                        onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Logout' : '로그아웃'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => { handleLoginStatus(); setMobileMenuOpen(false); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center gap-1"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Login' : '로그인'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Navigation Menu Links */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
                    {language === 'en' ? 'Menu & Features' : '주요 기능 메뉴'}
                  </p>
                  <div className="space-y-1">
                    {isAdmin && (
                      <button
                        onClick={() => { setActiveTab('wizard'); setMobileMenuOpen(false); }}
                        className={`w-full p-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-colors ${
                          activeTab === 'wizard'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Search className="w-4 h-4 text-blue-500" />
                          <span>{language === 'en' ? 'AI Error Diagnostic Wizard' : 'AI 오류 진단 마법사'}</span>
                        </div>
                        {activeTab === 'wizard' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                      </button>
                    )}

                    <button
                      onClick={() => { setActiveTab('guidebook'); setMobileMenuOpen(false); }}
                      className={`w-full p-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-colors ${
                        activeTab === 'guidebook'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <BookOpen className="w-4 h-4 text-emerald-500" />
                        <span>{language === 'en' ? 'Known Issues Guidebook' : '알려진 문제 가이드북'}</span>
                      </div>
                      {activeTab === 'guidebook' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </button>

                    <button
                      onClick={() => { setActiveTab('threat-verifier'); setMobileMenuOpen(false); }}
                      className={`w-full p-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-colors ${
                        activeTab === 'threat-verifier'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-indigo-500" />
                        <span>{language === 'en' ? 'System Threat Verifier' : '지능형 위협 검증관'}</span>
                      </div>
                      {activeTab === 'threat-verifier' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </button>

                    <button
                      onClick={() => { setActiveTab('library'); setMobileMenuOpen(false); }}
                      className={`w-full p-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-colors ${
                        activeTab === 'library'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Heart className="w-4 h-4 text-rose-500" />
                        <span>{language === 'en' ? 'My Lab (Bookmarks & History)' : '나의 실험실 (북마크/기록)'}</span>
                      </div>
                      {activeTab === 'library' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
                        className={`w-full p-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-colors ${
                          activeTab === 'admin'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Database className="w-4 h-4 text-purple-500" />
                          <span>{language === 'en' ? 'Admin Tools (AI Auto-Sync)' : '관리자 도구 (AI 자동 수집)'}</span>
                        </div>
                        {activeTab === 'admin' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Utilities */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
                    {language === 'en' ? 'Quick Tools' : '빠른 도구'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { handleInstallClick(); setMobileMenuOpen(false); }}
                      className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40 text-xs font-semibold flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{language === 'ko' ? "바로가기 생성" : "Create Shortcut"}</span>
                    </button>

                    <button
                      onClick={() => { handleRegisterStartupClick(); setMobileMenuOpen(false); }}
                      className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40 text-xs font-semibold flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{language === 'ko' ? "시작프로그램 등록" : "Add to Startup"}</span>
                    </button>

                    <button
                      onClick={() => { checkForUpdates(true); setMobileMenuOpen(false); }}
                      disabled={isCheckingUpdate}
                      className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/40 text-xs font-semibold flex items-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                      <span>{isCheckingUpdate ? (language === 'ko' ? "업데이트 확인 중..." : "Checking Updates...") : (language === 'ko' ? "새 버전 업데이트 확인" : "Check for Updates")}</span>
                    </button>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/60 px-1">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Gemini & MS Docs</span>
                  </div>
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-400">v{APP_VERSION}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Horizontal Navigation Tabs Bar */}
        {appUnlocked && (
          <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
            <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8">
              <nav 
                className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1.5 sm:py-2 scrollbar-none no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {isAdmin && (
                  <button
                    onClick={() => { setActiveTab('wizard'); setMobileMenuOpen(false); }}
                    className={`shrink-0 py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      activeTab === 'wizard' 
                        ? 'bg-blue-600 text-white shadow-xs font-semibold' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{language === 'en' ? 'AI Diagnostic' : 'AI 오류 진단'}</span>
                  </button>
                )}
                
                <button
                  onClick={() => { setActiveTab('guidebook'); setMobileMenuOpen(false); }}
                  className={`shrink-0 py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                    activeTab === 'guidebook' 
                      ? 'bg-blue-600 text-white shadow-xs font-semibold' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{language === 'en' ? 'Known Issues' : '오류 가이드북'}</span>
                </button>

                <button
                  onClick={() => { setActiveTab('threat-verifier'); setMobileMenuOpen(false); }}
                  className={`shrink-0 py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                    activeTab === 'threat-verifier' 
                      ? 'bg-blue-600 text-white shadow-xs font-semibold' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{language === 'en' ? 'Threat Verifier' : '지능형 위협 검증'}</span>
                </button>

                <button
                  onClick={() => { setActiveTab('library'); setMobileMenuOpen(false); }}
                  className={`shrink-0 py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                    activeTab === 'library' 
                      ? 'bg-blue-600 text-white shadow-xs font-semibold' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{language === 'en' ? 'My Lab' : '나의 실험실'}</span>
                  {!user && (
                    <span className="text-[9px] bg-slate-200/70 dark:bg-slate-800 px-1 py-0.2 rounded text-slate-500 ml-0.5">
                      Guest
                    </span>
                  )}
                </button>

                {isAdmin && (
                  <button
                    onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
                    className={`shrink-0 py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      activeTab === 'admin' 
                        ? 'bg-blue-600 text-white shadow-xs font-semibold' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{language === 'en' ? 'Admin' : '관리자'}</span>
                  </button>
                )}
              </nav>
            </div>
          </div>
        )}
      </header>

      {!appUnlocked ? (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{language === 'en' ? 'Terms of Service Agreement' : '서비스 이용 동의'}</h2>
            </div>
            
            <div className="space-y-4 text-slate-600 dark:text-slate-300 mb-8">
              <p>{language === 'en' ? 'Please check the following before using Windows Fix Wizard.' : 'Windows Fix Wizard를 사용하기 전에 다음 사항을 반드시 확인해 주세요.'}</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>{language === 'en' ? 'Reference Information:' : '참고용 정보:'}</strong> {language === 'en' ? 'The AI analysis results and PowerShell scripts provided in this app are generated based on official Microsoft documentation, but completeness is not guaranteed.' : '본 앱에서 제공하는 AI 분석 결과 및 PowerShell 스크립트는 Microsoft 공식 문서 등을 기반으로 생성되지만, 완벽성을 보장하지 않는 참고용 자료입니다.'}</li>
                <li><strong>{language === 'en' ? 'User Responsibility:' : '사용자 책임:'}</strong> {language === 'en' ? 'The user is responsible for all consequences, such as system damage or data loss, resulting from running the provided scripts. Be sure to check the script content before running.' : '제공된 스크립트를 실행하여 발생하는 시스템 손상, 데이터 손실 등 모든 결과에 대한 책임은 사용자 본인에게 있습니다. 반드시 스크립트 내용을 확인한 후 실행하세요.'}</li>
                <li><strong>{language === 'en' ? 'Privacy Protection:' : '개인정보 보호:'}</strong> {language === 'en' ? 'When entering search terms for error diagnosis, please be extra careful not to include sensitive personal information such as names, IP addresses, emails, passwords, or company secrets.' : '오류 진단을 위해 검색어를 입력할 때, 이름, IP 주소, 이메일, 비밀번호, 사내 기밀 등 민감한 개인정보가 포함되지 않도록 각별히 주의해 주세요.'}</li>
              </ul>
            </div>

            <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-6">
              <input 
                type="checkbox" 
                checked={disclaimerChecked}
                onChange={(e) => setDisclaimerChecked(e.target.checked)}
                className="mt-1 w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700"
              />
              <span className="text-slate-700 dark:text-slate-200 font-medium">
                {language === 'en' ? '(Required) I have read and agree to all the above precautions and disclaimers.' : '(필수) 위 주의사항 및 면책 조항을 모두 읽었으며, 이에 동의합니다.'}
              </span>
            </label>

            <button
              onClick={() => setAppUnlocked(true)}
              disabled={!disclaimerChecked}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-lg"
            >
              {language === 'en' ? 'Agree and Start' : '확인 및 시작하기'}
            </button>
          </div>
        </main>
      ) : (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* WIZARD TAB */}
        {activeTab === 'wizard' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Info Banner */}
            <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-4 flex gap-3 text-blue-800 dark:text-blue-300 text-sm leading-relaxed">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium mb-1">{language === 'en' ? 'AI-based System Recovery Guide & Precautions' : 'AI 기반 시스템 복구 안내 및 주의사항'}</p>
                <p>
                  {language === 'en' 
                    ? 'This wizard suggests reference solutions and PowerShell scripts based on official Microsoft documentation and trusted community information. Provided scripts may cause unexpected results depending on your system environment, so please review the contents and execute them at your own risk.' 
                    : '이 마법사는 Microsoft 공식 문서 및 신뢰할 수 있는 커뮤니티 정보를 바탕으로 참고용 해결 방법과 PowerShell 스크립트를 제안합니다. 제공된 스크립트는 시스템 환경에 따라 예상치 못한 결과를 초래할 수 있으므로, 반드시 내용을 확인한 후 본인의 책임 하에 실행하시기 바랍니다.'}
                </p>
              </div>
            </div>

            {/* Search Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-8">
              <form onSubmit={handleSearch} className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative md:w-48 flex-shrink-0">
                    <select
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 pr-10 font-medium"
                    >
                      {WINDOWS_VERSIONS.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
                  </div>
                  
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-3 placeholder-slate-400 dark:placeholder-slate-500"
                      placeholder={language === 'en' ? "Enter error code (e.g., 0x80070005) or symptoms..." : "오류 코드 (예: 0x80070005) 또는 증상을 입력하세요..."}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="md:w-auto w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-xl text-sm px-6 py-3 text-center inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </motion.div>
                        {language === 'en' ? 'Diagnosing...' : '진단 중...'}
                      </>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4" />
                        {language === 'en' ? 'Diagnose & Fix' : '진단 및 해결'}
                      </>
                    )}
                  </button>
                </div>
                
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    {language === 'en' ? 'Please be careful not to include personal information (name, IP address, email, corporate secrets, etc.) in your search terms.' : '검색어에 개인정보(이름, IP 주소, 이메일, 사내 기밀 등)가 포함되지 않도록 주의해 주세요.'}
                  </p>
                </div>
              </form>
            </div>

            {/* WIZARD TAB AD */}
            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 mb-8">
              <AdSense slot="WIZARD_SEARCH_SLOT_ID" />
            </div>

            {/* Error State */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 rounded-xl p-4 mb-8 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Section */}
            <AnimatePresence>
              {loading && !result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 animate-pulse">
                    <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-5/6"></div>
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-4/6"></div>
                    </div>
                  </div>
                  <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 animate-pulse">
                    <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-4">
                          <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800 flex-shrink-0"></div>
                          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full mt-1"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Diagnosis Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      {language === 'en' ? 'Diagnosis' : '원인 진단'}
                    </h2>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{result.diagnosis}</p>
                  </div>

                  {/* Script Safety Warning banner */}
                  {(result.scriptSafetyWarning || !result.isScriptApplicable) && (
                    <div className={`rounded-xl border p-4 flex gap-3 ${result.isScriptApplicable ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300'}`}>
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-medium mb-1">
                          {result.isScriptApplicable 
                            ? (language === 'en' ? 'Script Warning' : '스크립트 주의사항')
                            : (language === 'en' ? 'Script Not Applicable / Risky' : '자동 스크립트 적용 불가 / 위험')}
                        </h3>
                        <p className="text-sm opacity-90 leading-relaxed">{result.scriptSafetyWarning || (language === 'en' ? 'Using an automated script is not recommended for this issue because it requires manual verification or specific configurations.' : '이 문제는 시스템의 중요한 설정을 변경하거나 정확한 확인이 필요하므로 자동 스크립트 사용을 권장하지 않습니다.')}</p>
                      </div>
                    </div>
                  )}

                  {/* Script Card */}
                  {result.script && result.isScriptApplicable && (
                    <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-800 dark:border-slate-800/50 overflow-hidden">
                      <div className="bg-slate-800/50 dark:bg-slate-900/50 px-4 py-3 border-b border-slate-700/50 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                          <Terminal className="w-4 h-4" />
                          {language === 'en' ? 'Auto-fix Script (PowerShell Admin)' : '자동 해결 스크립트 (PowerShell 관리자 권한)'}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const scriptToSend = result.script;
                              copyToClipboard(scriptToSend, 'wizard-script');
                              const event = new CustomEvent('uwes-set-validator-script', {
                                detail: { script: scriptToSend }
                              });
                              window.dispatchEvent(event);
                              setActiveTab('threat-verifier');
                            }}
                            className="text-indigo-300 hover:text-white hover:bg-indigo-700/60 transition-colors flex items-center gap-1.5 text-xs font-medium bg-indigo-950/40 border border-indigo-900/50 px-2.5 py-1.5 rounded-md"
                            title={language === 'ko' ? '이 해결 스크립트를 안심 검사소 가상 편집기로 즉시 보내 검증 및 롤백 스크립트를 컴파일합니다.' : 'Transmit this resolution script straight to the secure sandbox verifier code block.'}
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                            <span>{language === 'ko' ? '🛡️ 안심 검사소로 전송' : '🛡️ Send to Verifier'}</span>
                          </button>
                          <button
                            onClick={() => copyToClipboard(result.script, 'wizard-script')}
                            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium bg-slate-700/50 hover:bg-slate-700 px-3 py-1.5 rounded-md"
                          >
                            {copiedScript === 'wizard-script' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">{language === 'en' ? 'Copied' : '복사됨'}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                {language === 'en' ? 'Copy' : '복사하기'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="p-4 overflow-x-auto">
                        <pre className="text-sm font-mono text-blue-300 leading-relaxed">
                          <code>{result.script}</code>
                        </pre>
                      </div>
                      <div className="bg-blue-900/20 px-4 py-3 border-t border-slate-800 text-xs text-blue-300 flex items-center gap-2">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        {language === 'en' ? "Search for 'PowerShell' in the Start menu, click 'Run as Administrator', and paste the code above." : "시작 메뉴에서 'PowerShell'을 검색하고 '관리자 권한으로 실행'을 클릭한 후 위 코드를 붙여넣으세요."}
                      </div>
                    </div>
                  )}

                  {/* PowerShell Advanced Signature and Obfuscated Verification Analyzer */}
                  {result.script && result.isScriptApplicable && (
                    <PowerShellVerifierPanel
                      scriptText={result.script}
                      language={language}
                      onScriptSigned={(newScript) => {
                        setResult(prev => prev ? { ...prev, script: newScript } : null);
                      }}
                    />
                  )}

                  {/* Manual Steps Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      {language === 'en' ? 'Manual Fix Steps' : '수동 해결 방법'}
                    </h2>
                    <ol className="space-y-4">
                      {result.manualSteps.map((step, index) => (
                        <li key={index} className="flex gap-4">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Sources */}
                  {result.sourceUrls && result.sourceUrls.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">{language === 'en' ? 'References (Microsoft Official)' : '참고 문서 (Microsoft 공식)'}</h2>
                      <ul className="space-y-2">
                        {result.sourceUrls.map((url, index) => (
                          <li key={index}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 text-sm"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="truncate">{url}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Feedback Section */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                        <ThumbsUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{language === 'en' ? 'Was this solution helpful?' : '이 해결 방법이 도움이 되었나요?'}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'en' ? 'Your feedback helps us improve the service.' : '여러분의 피드백은 서비스 개선에 큰 도움이 됩니다.'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setFeedbackSolved(true); setShowFeedbackModal('wizard-result'); }}
                        className="px-5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center gap-2 shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        {language === 'en' ? 'Yes, it solved it' : '예, 해결되었습니다'}
                      </button>
                      <button
                        onClick={() => { setFeedbackSolved(false); setShowFeedbackModal('wizard-result'); }}
                        className="px-5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 transition-all flex items-center gap-2 shadow-sm"
                      >
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        {language === 'en' ? 'No, it did not' : '아니요, 부족합니다'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* GUIDEBOOK TAB */}
        {activeTab === 'guidebook' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {dbMode === 'server_file' && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                 className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-start gap-4 mb-2 shadow-sm"
              >
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-full shrink-0">
                  <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                    {language === 'en' ? 'Running on Local High-Availability Backup DB' : '서버 로컬 고가용성 파일 데이터베이스 활성화'}
                  </h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400/80 leading-relaxed">
                    {language === 'en' 
                      ? 'The cloud Firestore database exceeded its daily free-tier limits. We automatically switched to the offline high-availability server database so you can keep troubleshooting. All cloud data will automatically re-link once daily limits reset at PDT midnight (KST 5:00-6:00 PM).'
                      : '구글 Cloud Firestore 데이터베이스의 일일 무료 트래픽 한도가 소모되어, 서비스 중단 방지를 위해 로컬 고가용성 파일 데이터베이스로 자동 전환되었습니다. 전체 대용량 클라우드 데이터는 태평양 표준시(PST) 기준 자정(한국시간 오후 5시-6시) 데이터베이스 한도가 리셋되면 자동으로 재연동됩니다.'}
                  </p>
                </div>
              </motion.div>
            )}

            {dbStatus === 'quota' && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl flex items-start gap-4 mb-6 shadow-sm"
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400">
                  <Database className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">
                      {language === 'en' ? 'High-Availability Server Cache Engine Active' : '고가용성 로컬/서버 캐시 모드 가동 중'}
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {language === 'en' ? 'Unlimited Search' : '무제한 고속 검색'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300/90 mt-1">
                    {language === 'en' 
                      ? "Cloud read quotas are safely protected. All issue searches and resolution guides are served instantly from memory and local server storage."
                      : "클라우드 일일 할당량을 안전하게 보호하기 위해 고가용성 로컬/서버 엔진으로 자동 전환되었습니다. 모든 오류 코드 검색과 문제 해결 가이드북을 제한 없이 이용하실 수 있습니다."}
                  </p>
                </div>
              </motion.div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                  <BookOpen className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  {language === 'en' ? 'Known Issues Guidebook' : '알려진 문제 가이드북'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{language === 'en' ? 'Check frequently occurring Windows errors and verified solutions.' : '자주 발생하는 Windows 오류와 검증된 해결 방법을 확인하세요.'}</p>
              </div>

              {/* Header Quick Action Shortcuts */}
              <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
                <button
                  onClick={() => setShowHelpCenter(!showHelpCenter)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                    showHelpCenter
                      ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  {language === 'en' ? 'Help & Support Center' : '도움말 및 지원 센터'}
                  {showHelpCenter ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                </button>
              </div>
            </div>

            {/* Prominent Help & Support Center (Top Banner & FAQ Section) */}
            <AnimatePresence>
              {showHelpCenter && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden space-y-4"
                >
                  <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 dark:from-blue-900/25 dark:via-indigo-900/25 dark:to-purple-900/25 border border-blue-200/80 dark:border-blue-800/60 p-5 sm:p-6 rounded-2xl shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md flex-shrink-0 mt-0.5">
                          <HelpCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                              {language === 'en' ? 'Help & Support Center' : '도움말 및 지원 센터'}
                            </h3>
                            <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-[11px] font-bold border border-blue-200 dark:border-blue-800">
                              FAQ & Troubleshooting Guide
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                            {language === 'en'
                              ? 'Frequently asked questions and practical troubleshooting tips to help you resolve Windows issues effectively.'
                              : '마법사 스크립트를 안전하고 효과적으로 활용하기 위한 자주 묻는 질문과 실전 문제 해결 가이드입니다.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Wizard Usage Tips Cards */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3.5 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                      {language === 'en' ? 'Effective Wizard Usage Tips' : '마법사 200% 효과적 활용 꿀팁'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-mono font-bold text-xs">
                          01
                        </div>
                        <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {language === 'en' ? 'Search by Error Code' : '정확한 오류 코드 입력'}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                          {language === 'en'
                            ? 'Search with hex error codes like 0x80070005 for 99% accuracy.'
                            : '0x80070005 같은 16진수 오류 코드를 검색하면 매칭률이 높아집니다.'}
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
                          02
                        </div>
                        <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {language === 'en' ? 'Run as Administrator' : '관리자 권한 필수 실행'}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                          {language === 'en'
                            ? 'Right-click downloaded .bat files and choose Run as administrator.'
                            : '다운로드한 .bat 파일 우클릭 후 [관리자 권한으로 실행]을 선택하세요.'}
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-mono font-bold text-xs">
                          03
                        </div>
                        <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {language === 'en' ? 'Create Restore Point' : '복원 지점 사전 생성'}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                          {language === 'en'
                            ? 'Create a system restore point before applying major system changes.'
                            : '대규모 스크립트 실행 전 상단의 [복원 지점 생성]으로 안전장치를 마련하세요.'}
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-mono font-bold text-xs">
                          04
                        </div>
                        <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {language === 'en' ? 'Threat Verification' : '위협 검증기 사전 검사'}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                          {language === 'en'
                            ? 'Paste suspicious external scripts into Threat Verifier to check safety.'
                            : '외부 스크립트 실행 전 [위협 검증기] 탭에서 유해성 검사를 먼저 받으세요.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* FAQ Accordion List */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <LifeBuoy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        {language === 'en' ? 'Frequently Asked Questions (FAQ)' : '자주 묻는 질문 (FAQ)'}
                      </h4>
                      <span className="text-xs text-slate-400 font-medium">
                        {language === 'en' ? 'Click to expand question' : '질문을 클릭하여 답변 확인'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {[
                        {
                          id: 'faq-1',
                          badge: language === 'en' ? 'Safety' : '안전성',
                          question: language === 'en'
                            ? 'Are the automated fix scripts (.bat / PowerShell) safe to execute?'
                            : '마법사가 제공하는 자동 복구 스크립트(.bat / PowerShell)는 안심하고 실행해도 되나요?',
                          answer: language === 'en'
                            ? 'Yes, absolutely. All scripts generated or served by WinFix use native Windows commands (e.g. sfc, DISM, netsh, chkdsk). Every script is pre-verified through our automated Threat Verifier engine to guarantee no malicious payloads, unauthorized file downloads, or harmful registry tampering.'
                            : '네, 100% 안심하고 실행하셔도 됩니다. 모든 스크립트는 Windows 표준 내장 명령어(sfc, DISM, netsh, chkdsk 등)로 구성되어 있으며, 백엔드 위협 검증기(Threat Verifier)의 정밀 자동 검수를 통과하여 악성코드나 유해 스크립트가 전혀 포함되지 않음을 검증받았습니다.'
                        },
                        {
                          id: 'faq-2',
                          badge: language === 'en' ? 'Permissions' : '권한 설정',
                          question: language === 'en'
                            ? 'Why do I get administrator permission errors when running scripts?'
                            : '스크립트 실행 시 관리자 권한 관련 오류가 발생할 때는 어떻게 하나요?',
                          answer: language === 'en'
                            ? 'Modifying Windows system settings, resetting network stacks, or restarting update services requires elevated privileges. Please right-click the downloaded .bat or .cmd file and select "Run as administrator". For PowerShell scripts, ensure ExecutionPolicy allows local script execution.'
                            : 'Windows 시스템 파일 및 서비스 초기화, 레지스트리 수정, 네트워크 어댑터 리셋 등은 보안 정책상 관리자 권한이 필수입니다. 다운로드받은 .bat 및 .cmd 파일 마우스 우클릭 후 [관리자 권한으로 실행]을 선택해 주세요.'
                        },
                        {
                          id: 'faq-3',
                          badge: language === 'en' ? 'Troubleshooting' : '오류 지속',
                          question: language === 'en'
                            ? 'What should I do if the Windows error persists after applying the fix?'
                            : '해결법을 적용한 후에도 오류가 해결되지 않으면 어떻게 해야 하나요?',
                          answer: language === 'en'
                            ? '1) Restart your computer to apply system service registry updates. 2) Use the AI Sentinel Diagnosis tab to describe additional symptoms and error codes for custom AI troubleshooting. 3) If needed, restore your system to a previous state using the created Restore Point.'
                            : '1) 스크립트 실행 후 컴퓨터를 재부팅하여 변경된 시스템 서비스 및 레지스트리가 올바르게 적용되었는지 확인하세요. 2) 문제가 지속되면 [AI Sentinel 진단] 탭에서 구체적인 증상을 입력하여 2차 정밀 AI 진단을 받아보세요. 3) 필요시 [시스템 복원 지점]으로 안전하게 복구할 수 있습니다.'
                        },
                        {
                          id: 'faq-4',
                          badge: language === 'en' ? 'Offline Usage' : '오프라인/저장',
                          question: language === 'en'
                            ? 'Can I view guidebooks and troubleshooting commands while offline?'
                            : '인터넷 연결이 끊긴 오프라인 환경에서도 가이드북을 사용할 수 있나요?',
                          answer: language === 'en'
                            ? 'Yes. WinFix caches viewed guidebook articles and bookmarked fixes in your browser\'s LocalStorage. You can access your saved items anytime under "My Lab" tab and copy fix commands even without active internet connectivity.'
                            : '네, 가능합니다! 한 번 로드된 가이드북 데이터 및 하트 아이콘으로 즐겨찾기 해둔 보관함 자료는 브라우저 로컬 캐시(LocalStorage)에 저장되어 인터넷이 끊긴 상태에서도 [나의 실험실] 탭에서 가이드를 확인하고 커맨드를 복사할 수 있습니다.'
                        },
                        {
                          id: 'faq-5',
                          badge: language === 'en' ? 'Search Tips' : '검색 팁',
                          question: language === 'en'
                            ? 'How can I search effectively for rare or unknown Windows errors?'
                            : '잘 알려지지 않은 생소한 Windows 오류 코드는 어떻게 검색하는 것이 가장 효과적인가요?',
                          answer: language === 'en'
                            ? 'Search directly using 16-character hex error codes (e.g. 0x80070005, 0x80240034) or key English error terms from Event Viewer (e.g. "Access Denied", "Kernel-Power"). Hex code searches provide the highest matching precision.'
                            : 'Windows 이벤트 뷰어나 에러 창에 나오는 0x80070005 같은 16진수 오류 코드 또는 핵심 영문 에러명(예: Access Denied, DPC WATCHDOG VIOLATION)을 가이드북 검색창에 입력하면 99% 정확한 해결책으로 다이렉트 매칭됩니다.'
                        }
                      ].map((faq) => {
                        const isOpen = openFaqId === faq.id;
                        return (
                          <div
                            key={faq.id}
                            className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden transition-all bg-slate-50/50 dark:bg-slate-900/50"
                          >
                            <button
                              onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                              className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-[10px] whitespace-nowrap mt-0.5">
                                  {faq.badge}
                                </span>
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-snug">
                                  {faq.question}
                                </span>
                              </div>
                              <div className="p-1 rounded-lg text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                                {isOpen ? <ChevronDown className="w-4 h-4 rotate-180 transition-transform" /> : <ChevronDown className="w-4 h-4 transition-transform" />}
                              </div>
                            </button>

                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="px-4 pb-4 pt-1 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900"
                                >
                                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80 mt-1">
                                    {faq.answer}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* System Info Auto-Detector Widget */}
            <SystemInfoWidget
              language={language}
              selectedVersionFilter={selectedVersionFilter}
              onApplyVersionFilter={(v) => setSelectedVersionFilter(v)}
              guidebookQuery={guidebookQuery}
              onUpdateSearchQuery={(q) => setGuidebookQuery(q)}
              className="mb-4"
            />

            {/* Guidebook Search Bar */}
            <div className="flex gap-2 mb-6">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={guidebookQuery}
                  onChange={(e) => setGuidebookQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchIssues(false)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-3 shadow-sm placeholder-slate-400 dark:placeholder-slate-500"
                  placeholder={language === 'en' ? "Search by error code, symptoms, or title..." : "오류 코드, 증상 또는 제목으로 검색..."}
                />
              </div>
              <button
                onClick={() => fetchIssues(false)}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">검색</span>
              </button>
              
              <button
                onClick={() => fetchIssues(false, true)}
                title={language === 'en' ? "Force Refresh Cache" : "데이터 수동 갱신 (캐시 무시)"}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl transition-all shadow-sm"
              >
                <RefreshCw className={`w-5 h-5 ${(loadingDb || loadingMore) ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
              {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap transition-colors ${
                      selectedCategory === category
                        ? 'bg-slate-800 dark:bg-slate-700 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {getCategoryIcon(category)}
                    <span>{category}</span> {categoryCounts[category] !== undefined ? <span className="opacity-70 text-[11px]">({categoryCounts[category]})</span> : ''}
                  </button>
                ))}
            </div>

            {/* Version Filter */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-6 items-center">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mr-1 sm:mr-2 shrink-0 whitespace-nowrap">
                <Monitor className="w-3.5 h-3.5" />
                Windows 버전:
              </span>
              {['전체', 'Windows 11', 'Windows 10', 'Windows 8.1', 'Windows 7'].map(v => (
                <button
                  key={v}
                  onClick={() => setSelectedVersionFilter(v)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold shrink-0 whitespace-nowrap transition-all ${
                    selectedVersionFilter === v
                      ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {loadingDb && filteredIssues.length === 0 && (
                <>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 animate-pulse">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-3 w-3/4">
                          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                        </div>
                        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
                        <div className="h-5 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* TOP BANNER AD */}
              { (guidebookQuery.trim() !== '' || selectedCategory !== '전체' || selectedVersionFilter !== '전체' || dbIssues.length > 0) && (
                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 mb-6">
                  <AdSense slot="TOP_BANNER_SLOT_ID" />
                </div>
              )}
              
              { (guidebookQuery.trim() !== '' || selectedCategory !== '전체' || selectedVersionFilter !== '전체' || dbIssues.length > 0) ? (
                <>
                  {filteredIssues.map((issue, index) => {
                    const isLastElement = index === filteredIssues.length - 1;
                    const isExpanded = expandedIssue === issue.id;
                    return (
                      <React.Fragment key={issue.id}>
                        {/* IN-FEED AD every 4 items */}
                        {index > 0 && index % 4 === 0 && (
                          <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 my-4">
                            <AdSense slot="INFEED_SLOT_ID" />
                          </div>
                        )}
                        <div 
                          id={`issue-${issue.id}`}
                          ref={isLastElement ? lastIssueElementRef : null}
                      className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isExpanded 
                          ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20' 
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                      }`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedIssue(isExpanded ? null : issue.id);
                            if (!isExpanded) recordUserActivity('view', issue.id);
                          }
                        }}
                        onClick={() => {
                          setExpandedIssue(isExpanded ? null : issue.id);
                          if (!isExpanded) recordUserActivity('view', issue.id);
                        }}
                        className="w-full p-4 sm:p-5 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                          {/* Left / Main Content */}
                          <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                            <div className={`hidden sm:flex w-11 h-11 rounded-xl items-center justify-center shrink-0 mt-0.5 ${
                              isExpanded ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}>
                              {getCategoryIcon(issue.category)}
                            </div>
                            <div className="min-w-0 flex-1">
                              {/* Badges & Tags Row */}
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shrink-0 whitespace-nowrap border border-slate-200/60 dark:border-slate-700/60">
                                  {issue.category}
                                </span>
                                <span className="text-xs sm:text-sm font-mono text-red-500 dark:text-red-400 font-bold shrink-0 whitespace-nowrap flex items-center gap-1 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-100 dark:border-red-900/40">
                                  {issue.code}
                                  <a
                                    href={`https://www.google.com/search?q=Windows+${encodeURIComponent(issue.code)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-400 hover:text-blue-500 transition-colors p-0.5"
                                    title="Google에서 이 오류 검색"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </span>

                                {issue.isLatest && (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded-md font-bold text-[10px] uppercase tracking-wider shrink-0 whitespace-nowrap flex items-center gap-1 border border-amber-200 dark:border-amber-800/60 shadow-xs">
                                    <Flame className="w-3 h-3 text-orange-500" />
                                    {language === 'en' ? 'Latest Trend' : '최신 트렌드'}
                                  </span>
                                )}

                                {issue.verifiedAt && (
                                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap border ${
                                    issue.verificationStatus === 'verified' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' :
                                    issue.verificationStatus === 'needs_update' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60' :
                                    'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60'
                                  }`}>
                                    <FileCheck className="w-3 h-3" />
                                    {language === 'en' ? 'AI Verified' : 'AI 검증됨'}
                                  </div>
                                )}
                              </div>

                              {/* Title */}
                              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug break-words my-1">
                                {highlightText(getLocalizedText(issue, 'title'), guidebookQuery)}
                              </h3>

                              {/* OS Versions & Date */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {issue.windowsVersions && issue.windowsVersions.length > 0 && issue.windowsVersions.map(v => (
                                  <span key={v} className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap border border-blue-100 dark:border-blue-900/40">
                                    {v}
                                  </span>
                                ))}
                                {issue.verifiedAt && (
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0 whitespace-nowrap ml-0.5">
                                    {language === 'en' ? 'Verified:' : '검증:'} {new Date(issue.verifiedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action & Reaction Bar */}
                          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleVote(issue.id, 'up'); }}
                                className={`flex items-center justify-center px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                                  issue.upvotedBy?.includes(user?.uid || '')
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'
                                }`}
                                title={language === 'en' ? 'Upvote' : '추천하기'}
                              >
                                <ThumbsUp className={`w-3.5 h-3.5 ${issue.upvotedBy?.includes(user?.uid || '') ? 'fill-current' : ''}`} />
                                <span className="ml-1 font-mono">{issue.upvotedBy?.length || 0}</span>
                              </button>
                              
                              <button
                                onClick={(e) => { e.stopPropagation(); handleVote(issue.id, 'down'); }}
                                className={`flex items-center justify-center px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                                  issue.downvotedBy?.includes(user?.uid || '')
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400'
                                }`}
                                title={language === 'en' ? 'Downvote' : '비추천하기'}
                              >
                                <ThumbsDown className={`w-3.5 h-3.5 ${issue.downvotedBy?.includes(user?.uid || '') ? 'fill-current' : ''}`} />
                                <span className="ml-1 font-mono">{issue.downvotedBy?.length || 0}</span>
                              </button>

                              <button
                                onClick={(e) => handleToggleBookmark(issue.id, e)}
                                className={`p-1.5 sm:p-2 rounded-lg transition-all active:scale-90 border ${
                                  bookmarkedIds.has(issue.id) 
                                    ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-500 border-rose-200 dark:border-rose-800' 
                                    : 'text-slate-400 hover:text-rose-500 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title={bookmarkedIds.has(issue.id) ? (language === 'en' ? 'Remove from saved' : '저장 해제') : (language === 'en' ? 'Save for later' : '나중을 위해 저장')}
                              >
                                <Heart className={`w-4 h-4 ${bookmarkedIds.has(issue.id) ? 'fill-current' : ''}`} />
                              </button>
                            </div>

                            <div className="flex items-center gap-1 text-slate-400 text-xs font-medium pl-1">
                              <span className="sm:hidden text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                {isExpanded ? (language === 'en' ? 'Close' : '접기') : (language === 'en' ? 'Details' : '상세보기')}
                              </span>
                              <ChevronDown 
                                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-blue-500' : ''
                                }`} 
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-100 dark:border-slate-800"
                          >
                            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">{language === 'en' ? 'Symptoms & Causes' : '증상 및 원인'}</h4>
                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{highlightText(getLocalizedText(issue, 'symptoms'), guidebookQuery)}</p>
                              </div>

                              {issue.aiFeedback && (
                                <div className={`p-4 rounded-xl border ${
                                  issue.verificationStatus === 'verified' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50' :
                                  issue.verificationStatus === 'needs_update' ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/50' :
                                  'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50'
                                }`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className={`w-4 h-4 ${
                                      issue.verificationStatus === 'verified' ? 'text-emerald-500' :
                                      issue.verificationStatus === 'needs_update' ? 'text-amber-500' : 'text-red-500'
                                    }`} />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">{language === 'en' ? 'AI Verification Feedback' : 'AI 검증 피드백'}</h4>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                    "{issue.aiFeedback}"
                                  </p>
                                </div>
                              )}

                              {issue.script && (
                                <div className="space-y-4">
                                  <div className="bg-slate-900 dark:bg-slate-950 rounded-xl overflow-hidden">
                                    <div className="bg-slate-800/50 dark:bg-slate-900/50 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-700/50 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                                        <Terminal className="w-3.5 h-3.5" />
                                        {language === 'en' ? 'Fix Script (PowerShell)' : '해결 스크립트 (PowerShell)'}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        <button
                                          onClick={() => {
                                            const scriptToSend = scriptSignedOverrides[issue.id] || issue.script!;
                                            copyToClipboard(scriptToSend, issue.id);
                                            const event = new CustomEvent('uwes-set-validator-script', {
                                              detail: { script: scriptToSend }
                                            });
                                            window.dispatchEvent(event);
                                            setActiveTab('threat-verifier');
                                          }}
                                          className="text-indigo-300 hover:text-white hover:bg-indigo-700/60 transition-colors flex items-center gap-1.5 text-xs font-medium bg-indigo-950/40 border border-indigo-900/50 px-2.5 py-1 rounded-md"
                                          title={language === 'ko' ? '이 해결 스크립트를 안심 검사소 가상 편집기로 즉시 보내 검증 및 롤백 스크립트를 컴파일합니다.' : 'Transmit this resolution script straight to the secure sandbox verifier code block.'}
                                        >
                                          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                                          <span>{language === 'ko' ? '🛡️ 안심 검사소로 전송' : '🛡️ Send to Verifier'}</span>
                                        </button>
                                        <button
                                          onClick={() => copyToClipboard(scriptSignedOverrides[issue.id] || issue.script!, issue.id)}
                                          className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium bg-slate-700/50 hover:bg-slate-700 px-2.5 py-1 rounded-md"
                                        >
                                          {copiedScript === issue.id ? (
                                            <>
                                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                              <span className="text-emerald-400">{language === 'en' ? 'Copied' : '복사됨'}</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3 h-3" />
                                              {language === 'en' ? 'Copy' : '복사'}
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="p-4 overflow-x-auto">
                                      <pre className="text-sm font-mono text-blue-300 leading-relaxed">
                                        <code>{scriptSignedOverrides[issue.id] || issue.script}</code>
                                      </pre>
                                    </div>
                                  </div>

                                  <PowerShellVerifierPanel
                                    scriptText={scriptSignedOverrides[issue.id] || issue.script}
                                    language={language}
                                    onScriptSigned={(newScript) => {
                                      setScriptSignedOverrides(prev => ({
                                        ...prev,
                                        [issue.id]: newScript
                                      }));
                                    }}
                                  />
                                </div>
                              )}

                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">{language === 'en' ? 'Manual Steps' : '수동 해결 단계'}</h4>
                                <ol className="space-y-3">
                                  {getLocalizedSteps(issue).map((step, index) => (
                                    <li key={index} className="flex gap-3 text-sm">
                                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-medium">
                                        {index + 1}
                                      </span>
                                      <span className="text-slate-600 dark:text-slate-300 mt-0.5">{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>

                              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">{language === 'en' ? 'References (Source)' : '참고 문서 (출처)'}</h4>
                                <ul className="space-y-2">
                                  {issue.sourceUrls && issue.sourceUrls.length > 0 && issue.sourceUrls.map((url, index) => (
                                    <li key={index}>
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 text-sm"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span className="truncate">{url}</span>
                                      </a>
                                    </li>
                                  ))}
                                  <li>
                                    <a
                                      href={`https://www.google.com/search?q=Windows+${encodeURIComponent(issue.code)}+${encodeURIComponent(getLocalizedText(issue, 'title'))}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300 hover:underline flex items-center gap-1.5 text-sm"
                                    >
                                      <Search className="w-3.5 h-3.5" />
                                      <span>{language === 'en' ? 'Search this error on Google (Safe alternative link)' : 'Google에서 이 오류 검색하기 (안전한 대체 링크)'}</span>
                                    </a>
                                  </li>
                                </ul>
                              </div>

                              {/* IN-ARTICLE AD */}
                              <div className="mt-6">
                                <AdSense slot="IN_ARTICLE_SLOT_ID" />
                              </div>

                              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{language === 'en' ? 'Need more context?' : '추가적인 피드백이 필요하신가요?'}</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setShowFeedbackModal(issue.id); setFeedbackSolved(true); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                                    >
                                      <Info className="w-4 h-4" />
                                      {language === 'en' ? 'Detailed Feedback' : '상세 피드백 보내기'}
                                    </button>
                                  </div>
                                </div>

                                {isAdmin && (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleEditClick(issue); }}
                                      className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                      {language === 'en' ? 'Edit' : '편집'}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(issue.id); }}
                                      className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1.5"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      {language === 'en' ? 'Delete' : '삭제'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    </React.Fragment>
                    );
                  })}
                  
                  {filteredIssues.length === 0 && (
                    <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{language === 'en' ? 'No search results found' : '검색 결과가 없습니다'}</h3>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">{language === 'en' ? 'Try entering a different search term or changing the category.' : '다른 검색어를 입력하거나 카테고리를 변경해 보세요.'}</p>
                    </div>
                  )}
                  
                  {hasMore && filteredIssues.length > 0 && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={() => fetchIssues(true)}
                        disabled={loadingMore}
                        className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                      >
                        {loadingMore ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />
                            {language === 'en' ? 'Loading...' : '불러오는 중...'}
                          </>
                        ) : (
                          language === 'en' ? 'Load More' : '더 보기'
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Search className="w-12 h-12 text-blue-500/30 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{language === 'en' ? 'Enter a search term' : '검색어를 입력하세요'}</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">{language === 'en' ? 'Find solutions by entering error codes or symptoms.' : '오류 코드나 증상을 입력하여 해결 방법을 찾아보세요.'}</p>
                </div>
              )}
            </div>

            {/* Popular & Recent Sections (Fixed at bottom) */}
            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 space-y-12">
              {/* Popular Troubleshooting (Recommendations) */}
              {popularIssues.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{language === 'en' ? 'Popular Solutions (Recommended)' : '인기 해결 방법 (추천)'}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {popularIssues.map((issue) => (
                      <div
                        key={`pop-bottom-${issue.id}`}
                        onClick={() => {
                          setGuidebookQuery(getLocalizedText(issue, 'title'));
                          setSelectedCategory('전체');
                          setDbIssues([issue]);
                          setExpandedIssue(issue.id);
                          setHasMore(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-orange-500 dark:hover:border-orange-500 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                            {issue.category}
                          </span>
                          <span className="text-[10px] font-mono text-red-500 font-bold">{issue.code}</span>
                        </div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                          {getLocalizedText(issue, 'title')}
                        </h4>
                        <div className="flex items-center gap-1 mt-3 text-[10px] text-slate-400 font-medium">
                          <ThumbsUp className="w-3 h-3" />
                          {issue.upvotedBy?.length || 0}명이 도움을 받음
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Updates Section */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{language === 'en' ? 'Latest Updates' : '최신 업데이트 자료'}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentIssues.map((issue) => (
                    <div 
                      key={`recent-${issue.id}`}
                      onClick={() => {
                        setGuidebookQuery(getLocalizedText(issue, 'title'));
                        setSelectedCategory('전체');
                        setDbIssues([issue]);
                        setExpandedIssue(issue.id);
                        setHasMore(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {issue.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : (language === 'en' ? 'Recent' : '최근')}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {getLocalizedText(issue, 'title')}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {getLocalizedText(issue, 'symptoms')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* LIBRARY TAB */}
        {activeTab === 'library' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />
                {language === 'en' ? 'My Lab' : '나의 실험실'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {language === 'en' ? 'Review your saved fixes and recent search history.' : '저장된 해결법과 최근 활동 내역을 확인하세요.'}
              </p>

              {!user && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center gap-3 shadow-sm"
                >
                  <Info className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium leading-snug">
                      {language === 'en' 
                        ? 'Guest Mode: Your library is temporarily saved in this browser.' 
                        : '게스트 모드: 현재 브라우저에 임시 저장 중입니다.'}
                    </p>
                    <p className="text-[11px] text-amber-600/80 dark:text-amber-500/80 mt-0.5">
                      {language === 'en'
                        ? 'Log in to sync your data and access it from any device.'
                        : '로그인하면 모든 기기에서 동기화된 데이터를 확인할 수 있습니다.'}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Side: Bookmarks */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-blue-500" />
                    {language === 'en' ? 'Saved Solutions' : '관심 있는 해결법'}
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-xs font-bold text-slate-500">{bookmarkedIds.size}</span>
                  </h3>
                </div>

                {isLoadingPersonal ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse">
                        <div className="flex gap-2 mb-3">
                          <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                          <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                        </div>
                        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-full mb-3"></div>
                        <div className="flex gap-2">
                          <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-800 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : bookmarkedIds.size === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bookmark className="w-8 h-8 text-slate-300" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{language === 'en' ? 'No Saved Solutions' : '저장된 해결법이 없습니다'}</h4>
                    <p className="text-sm text-slate-500 mt-2">{language === 'en' ? 'Click the heart icon on any issue to save it here.' : '해결 방법 옆의 하트 아이콘을 눌러 이곳에 보관하세요.'}</p>
                    <button 
                      onClick={() => setActiveTab('guidebook')}
                      className="mt-6 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-bold text-sm hover:bg-blue-200 transition-colors"
                    >
                      {language === 'en' ? 'Go to Guidebook' : '가이드북 둘러보기'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dbIssues.filter(i => bookmarkedIds.has(i.id)).map(issue => (
                      <div 
                        key={issue.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center justify-between group shadow-sm"
                      >
                        <div className="flex items-center gap-4 cursor-pointer overflow-hidden" onClick={() => { setActiveTab('guidebook'); setExpandedIssue(issue.id); }}>
                           <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-inner flex-shrink-0">
                             {getCategoryIcon(issue.category)}
                           </div>
                           <div className="truncate">
                             <h4 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors truncate">{getLocalizedText(issue, 'title')}</h4>
                             <p className="text-[10px] text-slate-500 font-mono mt-0.5">{issue.code}</p>
                           </div>
                        </div>
                        <button 
                          onClick={() => handleToggleBookmark(issue.id)}
                          className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all active:scale-95 shadow-sm"
                        >
                          <Heart className="w-5 h-5 fill-current" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Side: History */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-500" />
                    {language === 'en' ? 'Recent Activity' : '최근 활동 내역'}
                  </h3>
                  {userActivity.length > 0 && (
                    <button
                      onClick={handleClearAllActivities}
                      className="text-xs font-semibold text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-indigo-950/25 px-2.5 py-1.5 rounded-lg border border-slate-250 dark:border-slate-750 shadow-sm cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === 'en' ? 'Clear All' : '전체 삭제'}</span>
                    </button>
                  )}
                </div>
                
                {isLoadingPersonal ? (
                   <div className="space-y-4">
                     {[1, 2, 3, 4, 5].map(i => (
                       <div key={i} className="flex gap-4 items-start animate-pulse">
                         <div className="mt-1.5 flex-shrink-0 w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                         <div className="flex-grow space-y-2">
                           <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                           <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                         </div>
                       </div>
                     ))}
                   </div>
                ) : userActivity.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
                    <p className="text-xs text-slate-400">{language === 'en' ? 'No recent activity.' : '활동 내역이 아직 없습니다.'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userActivity.map((activity, idx) => (
                      <div key={activity.id || idx} className="flex gap-4 items-start group justify-between hover:bg-slate-50/50 dark:hover:bg-slate-850/30 p-2.5 rounded-xl -mx-2.5 transition-all">
                        <div className="flex gap-4 items-start flex-1 min-w-0">
                          <div className="mt-1.5 flex-shrink-0 w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 group-hover:bg-indigo-500 transition-colors shadow-sm"></div>
                          <div className="flex-grow min-w-0">
                             <div className="flex flex-col">
                               <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                 {activity.type === 'search' ? (language === 'en' ? 'Searched' : '검색 수행') : (language === 'en' ? 'Viewed Issue' : '해결법 조회')}
                               </p>
                               <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-1 truncate max-w-[200px]">
                                 "{activity.query || activity.targetId}"
                               </p>
                               <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                                 <Clock className="w-3 h-3" />
                                 {new Date(activity.timestamp).toLocaleString()}
                               </span>
                             </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSingleActivity(activity, idx)}
                          title={language === 'en' ? "Delete" : "삭제"}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-95 flex-shrink-0 ml-2 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                   <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-white/10 rotate-12" />
                   <h4 className="font-bold relative z-10">{language === 'en' ? 'Sync Ready' : '계정 동기화 완료'}</h4>
                   <p className="text-xs text-white/80 mt-2 relative z-10">
                     {language === 'en' ? 'Your bookmarks and history are securely synced with your Google account.' : '구글 계정에 로그인하여 북마크와 활동 내역을 동기화했습니다.'}
                   </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* DATABASE ENGINE CONTROL CENTER (High Availability Fallback) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 dark:bg-emerald-950/35 p-2 rounded-lg">
                    <Database className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {language === 'en' ? 'Database Engine Controller' : '데이터베이스 엔진 다중화 설정 (HA)'}
                    </h2>
                    <p className="text-xs text-slate-500 max-w-xl">
                      {language === 'en'
                        ? 'Switch between Google Cloud Firestore and native Server JSON File Storage.'
                        : '구글 파이어스토어(클라우드)와 서버 내장형 고가용성 JSON 데이터베이스를 상호 스위칭합니다.'}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 self-start sm:self-auto ${
                  dbMode === 'firestore' 
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' 
                    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${dbMode === 'firestore' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></span>
                  {dbMode === 'firestore' ? 'Firestore Mode' : 'Server File DB Mode'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Firestore Mode Config */}
                <div 
                  onClick={() => {
                    setDbMode('firestore');
                    localStorage.setItem('winfix_db_mode', 'firestore');
                    fetchCategoryCounts(true);
                  }}
                  className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    dbMode === 'firestore'
                      ? 'bg-amber-500/5 border-amber-500 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        1. Google Cloud Firestore
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        backendStatus === 'connected' 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : backendStatus === 'permission_denied' 
                            ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/25'
                      }`}>
                        {backendStatus === 'connected' ? '● Online' : backendStatus === 'permission_denied' ? '● Unauthorized' : '● Quota Limit/Error'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {language === 'en'
                        ? 'Standard client-side cloud engine. Uses firestore.js query snapshots directly inside the frame. Free tiers are prone to daily quota limits.'
                        : '기본 클라우드 분산 데이터 세트. 프레임 내에서 Firestore 쿼리를 직접 실행합니다. 구글 무료 한도(일일 할당량) 초과 시 서비스가 조기 정지될 수 있습니다.'}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-end">
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      {dbMode === 'firestore' && '✓ Active Engine Selected'}
                    </span>
                  </div>
                </div>

                {/* Local Server File Mode Config */}
                <div 
                  onClick={() => {
                    setDbMode('server_file');
                    localStorage.setItem('winfix_db_mode', 'server_file');
                    fetchCategoryCounts(true);
                  }}
                  className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    dbMode === 'server_file'
                      ? 'bg-emerald-500/5 border-emerald-500 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        2. High-Availability Server JSON File DB
                      </span>
                      <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full">
                        ● Unlimited / Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {language === 'en'
                        ? 'Uses the server-side Node disk JSON system. Extremely stable, completely bypasses Cloud API quotas, zero-lag rendering.'
                        : '서버 하드드라이브에 완전히 안전하게 정적 동기화되는 로컬 파일-DB. 할당량 에러와 토큰 접근 장애가 전혀 발생하지 않는 무제한 독립 기동 모드입니다.'}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-end">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      {dbMode === 'server_file' && '✓ Active Engine Selected'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-505 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  <strong>{language === 'en' ? 'Robust Fail-over Engine:' : '지능형 자동 고장 극복 대책 (Failover Support):'}</strong>{' '}
                  {language === 'en'
                    ? 'The UI automatically activates server JSON mode if Firestore gets blocked (e.g. Quota Exceeded 429). Fully offline-proof!'
                    : '가이드북 및 카테고리 로딩 중 파이어베이스 API 429 할당량 초과 에러나 권한 부족(Permission Denied) 에러 발생 즉시, 유저 끊김을 미연에 방지하고자 이 고장 방지용 서버 엔드포인트 수집 데이터셋 모드로 자율 강제 롤오버됩니다.'}
                </p>
              </div>
            </div>

            <DashboardWidget engineStatus={engineStatus} language={language} />

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                  <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{language === 'en' ? 'AI Auto-Sync System (Admin)' : 'AI 자동 수집 시스템 (관리자)'}</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-6 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                 {language === 'en' 
                  ? 'Cloud Background Service: Active. Automatically monitoring Windows error trends via server-side engine (10m intervals).' 
                  : '클라우드 백엔드 서비스 가동 중: 서버 측 엔진이 10분 간격으로 새로운 Windows 오류 트렌드를 자동 수집합니다.'}
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="max-w-2xl">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {language === 'en' ? 'AI Diagnostic Optimization' : 'AI 진단 엔진 최적화'}
                        </h3>
                      </div>
                      {aiOptimizedAt && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                          <Clock className="w-2.5 h-2.5" />
                          {language === 'en' ? 'Last optimized:' : '마지막 최적화:'} {aiOptimizedAt.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      {language === 'en' 
                        ? "Analyze recent user feedback patterns and admin corrections to fine-tune the AI's diagnostic accuracy. This creates a specialized knowledge base for standard resolutions."
                        : "최근 사용자 피드백 패턴과 관리자 수정 내역을 분석하여 AI의 진단 정확도를 최적화합니다. 이는 표준 해결을 위한 특수 지식 베이스를 생성합니다."}
                    </p>
                    
                    {aiOptimizedKnowledge && (
                      <details className="group">
                        <summary className="flex items-center gap-2 cursor-pointer text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-[10px] mb-2 list-none hover:opacity-80 transition-opacity">
                          <div className="flex items-center justify-between w-full bg-white/40 dark:bg-slate-900/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                            <span className="flex items-center gap-2">
                              <Database className="w-3.5 h-3.5" />
                              {language === 'en' ? 'View Active Knowledge Insights' : '활성화된 진단 지식 인사이트 보기'}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 transform group-open:rotate-180 transition-transform" />
                          </div>
                        </summary>
                        <div className="bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-indigo-200/50 dark:border-indigo-700/50 text-sm text-slate-700 dark:text-slate-300 shadow-inner mt-2">
                          <div className="whitespace-pre-wrap leading-relaxed space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {aiOptimizedKnowledge}
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                  
                  <button
                    onClick={optimizeAiModel}
                    disabled={isOptimizingAi}
                    className="shrink-0 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group"
                  >
                    {isOptimizingAi ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    )}
                    {language === 'en' ? 'Run Optimization' : '최적화 실행'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {language === 'en' ? 'Firebase Usage Data Shield' : '파이어베이스 데이터 보호 전략'}
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      {language === 'en' ? 'Smart Search Cache' : '스마트 검색 캐시'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {language === 'en' ? 'Search results are cached in memory for 5 mins to prevent redundant database requests.' : '동일한 검색어에 대해 5분간 메모리 캐시를 사용하여 DB 중복 호출을 차단합니다.'}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      {language === 'en' ? 'Server-Side Counts' : '서버 측 집계 (Aggregation)'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {language === 'en' ? 'Uses low-cost server aggregation instead of full document reads for category statistics.' : '카테고리 개수 집계 시 문서 전체를 읽지 않고 서버 측 집계 API를 사용해 비용을 아낍니다.'}
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      {language === 'en' ? 'Knowledge Persistence' : 'AI 지식 캐싱'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {language === 'en' ? 'AI patterns are saved centrally (6h TTL), saving heavy AI & DB read operations for all users.' : 'AI 분석 결과를 6시간 동안 전역 캐싱하여 모든 사용자의 AI 및 DB 읽기 할당량을 보존합니다.'}
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5" />
                      {language === 'en' ? 'Confirmed Fetching' : '확정적 데이터 수집'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {language === 'en' ? 'Only fetches data on Enter key or Click, avoiding unnecessary reads during typing.' : '입력 중에는 통신하지 않고 Enter나 버튼 클릭 시에만 통신하여 비효율적인 읽기를 방지합니다.'}
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" />
                      {language === 'en' ? 'Local Persistence' : '로컬 영속성 로드'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {language === 'en' ? 'Frequently accessed lists are synced to LocalStorage, serving instant data with zero DB cost.' : '자주 쓰이는 리스트를 로컬 저장소에 동기화하여 DB 비용 없이 즉시 데이터를 제공합니다.'}
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {language === 'en' ? 'Quota Guard' : '할당량 선제 대응'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {language === 'en' ? 'Automatically falls back to local data when daily free tier limits are reached.' : '파이어베이스 무료 할당량 초과 시 자동으로 감지하여 서비스 중단 없이 로컬 데이터로 전환합니다.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 mb-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2 shrink-0">
                      <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 shrink-0" />
                      <span>{language === 'en' ? 'Today\'s Data Usage (Estimate)' : '오늘의 데이터 사용량 (추정치)'}</span>
                    </h3>
                    <button 
                      onClick={handleStatusRefresh}
                      className="p-1.5 sm:hidden text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                      title={language === 'en' ? "Refresh Status" : "상태 새로고침"}
                      aria-label={language === 'en' ? "Refresh Status" : "상태 새로고침"}
                    >
                      <motion.div
                        animate={(dbStatus === 'checking' || backendStatus === 'checking' || isLoadingBackendLogs) ? { rotate: 360 } : { rotate: 0 }}
                        transition={(dbStatus === 'checking' || backendStatus === 'checking' || isLoadingBackendLogs) ? { repeat: Infinity, duration: 1.5, ease: "linear" } : { duration: 0.5, type: "spring" }}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </motion.div>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4">
                    {/* Read / Write Stat Indicators */}
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{language === 'en' ? 'Reads' : '읽기'}</p>
                        <p className="text-xs sm:text-sm font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {quotaUsage.reads.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">/ 50k</span>
                        </p>
                      </div>
                      <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700" />
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{language === 'en' ? 'Writes' : '쓰기'}</p>
                        <p className="text-xs sm:text-sm font-mono font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                          {quotaUsage.writes.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">/ 20k</span>
                        </p>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 shadow-2xs ${
                          isSyncing 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'text-purple-700 bg-purple-100 hover:bg-purple-200 dark:text-purple-300 dark:bg-purple-900/50 dark:hover:bg-purple-800/50 border border-purple-200/70 dark:border-purple-800/40'
                        }`}
                        title={language === 'en' ? "Trigger AI Sync Now" : "지금 AI 수집 시작"}
                      >
                        <motion.div
                          animate={isSyncing ? { rotate: 360 } : { rotate: 0 }}
                          transition={{ repeat: isSyncing ? Infinity : 0, duration: 2, ease: "linear" }}
                          className="shrink-0"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </motion.div>
                        <span>{language === 'en' ? (isSyncing ? 'Syncing...' : 'Sync Now') : (isSyncing ? '수집 중...' : '지금 수집')}</span>
                      </button>

                      <button 
                        onClick={handleDownloadStartupScript}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900/50 dark:hover:bg-blue-800/50 rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap border border-blue-200/70 dark:border-blue-800/40 active:scale-95 shadow-2xs"
                        title={language === 'en' ? "Install Windows Auto-Start" : "Windows 자동 시작 설치"}
                      >
                        <Monitor className="w-3.5 h-3.5 shrink-0" />
                        <span>{language === 'en' ? 'Auto-Start Setup' : '자동 시작 설치'}</span>
                      </button>

                      <a 
                        href="https://console.firebase.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 text-xs font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 dark:text-orange-300 dark:bg-orange-900/50 dark:hover:bg-orange-800/50 rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap border border-orange-200/70 dark:border-orange-800/40 active:scale-95 shadow-2xs"
                        title={language === 'en' ? "Advanced Settings (Firebase)" : "고급 설정 (Firebase 콘솔)"}
                      >
                        <Settings className="w-3.5 h-3.5 shrink-0" />
                        <span>{language === 'en' ? 'Console' : '콘솔'}</span>
                      </a>

                      <button 
                        onClick={handleStatusRefresh}
                        className="hidden sm:flex p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0"
                        title={language === 'en' ? "Refresh Status" : "상태 새로고침"}
                        aria-label={language === 'en' ? "Refresh Status" : "상태 새로고침"}
                      >
                        <motion.div
                          animate={(dbStatus === 'checking' || backendStatus === 'checking' || isLoadingBackendLogs) ? { rotate: 360 } : { rotate: 0 }}
                          transition={(dbStatus === 'checking' || backendStatus === 'checking' || isLoadingBackendLogs) ? { repeat: Infinity, duration: 1.5, ease: "linear" } : { duration: 0.5, type: "spring" }}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </motion.div>
                      </button>
                    </div>
                  </div>
                </div>
                {syncResult && (
                  <div className={`mt-2 p-3 rounded-lg text-xs font-medium ${syncResult.includes('Error') || syncResult.includes('오류') || syncResult.includes('할당량') ? 'bg-red-50 border border-red-100 text-red-700' : 'bg-green-50 border border-green-100 text-green-700'}`}>
                    <div className="flex items-start gap-2">
                       {syncResult.includes('할당량') || syncResult.includes('quota') ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 shrink-0 mt-0.5" />}
                       <div>
                         {syncResult}
                         {(syncResult.includes('할당량') || syncResult.includes('quota')) && (
                           <div className="mt-2 pt-2 border-t border-red-100 font-normal">
                             <p className="font-semibold mb-1">🛠️ {language === 'en' ? 'How to fix:' : '해결 방법:'}</p>
                             <ol className="list-decimal list-inside space-y-1 ml-1 opacity-90">
                               <li>
                                 {language === 'en' ? 'Visit ' : ''}
                                 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold text-blue-600 hover:text-blue-800">
                                   Google AI Studio
                                 </a>
                                 {language === 'en' ? ' to get your free API key.' : '에서 무료 API 키를 발급받으세요.'}
                               </li>
                               <li>{language === 'en' ? 'Open Settings menu (Gear icon in top right of editor)' : '에디터 우측 상단의 Settings(톱니바퀴) 메뉴를 엽니다.'}</li>
                               <li>{language === 'en' ? 'Go to "Secrets" tab and add "CUSTOM_API_KEY" with your key' : '"Secrets" 탭으로 이동하여 "CUSTOM_API_KEY"라는 이름으로 키를 등록합니다.'}</li>
                             </ol>
                             <p className="mt-2 text-[10px] italic">{language === 'en' ? '* AI Search uses "Google Search" tool which has stricter limits on shared keys.' : '* AI 검색 기능은 공유 키에서 제한이 엄격한 "Google 검색" 도구를 사용합니다.'}</p>
                           </div>
                         )}
                       </div>
                    </div>
                  </div>
                )}
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <li>• {language === 'en' ? 'Total registered issues:' : '총 등록된 오류 수:'} <span className="font-semibold text-slate-900 dark:text-slate-100">{(categoryCounts['전체'] || 0)}{language === 'en' ? '' : '개'}</span></li>
                  <li>• {language === 'en' ? 'Database connection (Browser):' : '데이터베이스 연결 (브라우저):'} {
                    dbStatus === 'checking' ? (
                      <span className="text-yellow-500 flex items-center gap-1.5 inline-flex">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        {language === 'en' ? 'Checking...' : '확인 중...'}
                      </span>
                    ) :
                    dbStatus === 'connected' ? <span className="text-green-500 font-medium flex items-center gap-1.5 inline-flex"><CheckCircle2 className="w-3 h-3" /> {language === 'en' ? 'Normal (Firestore)' : '정상 (Firestore)'}</span> :
                    dbStatus === 'quota' ? <span className="text-orange-500 font-medium flex items-center gap-1.5 inline-flex"><AlertTriangle className="w-3 h-3" /> {language === 'en' ? 'Quota Exceeded' : '할당량 초과 (내일 재개)'}</span> :
                    <span className="text-red-500 font-medium flex items-center gap-1.5 inline-flex"><AlertTriangle className="w-3 h-3" /> {language === 'en' ? 'Connection Error' : '연결 오류'}</span>
                  }</li>
                  <li>• {language === 'en' ? 'Backend Autonomous Engine (Cron):' : '백엔드 자율 엔진 (Cron):'} {
                    backendStatus === 'checking' ? (
                      <span className="text-yellow-500 flex items-center gap-1.5 inline-flex">
                        <RefreshCw className="w-3" />
                        {language === 'en' ? 'Monitoring...' : '모니터링 중...'}
                      </span>
                    ) :
                    backendStatus === 'connected' ? (
                      <span className="text-green-500 font-medium flex items-center gap-1.5 inline-flex">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        {language === 'en' ? 'Cloud Active' : '클라우드 활성 상태 (24/7)'}
                      </span>
                    ) :
                    backendStatus === 'local_active' ? (
                      <span className="text-emerald-500 font-medium flex items-center gap-1.5 inline-flex">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        {language === 'en' ? 'Active (Local Sandbox)' : '로컬 자율 수집 활성 상태 (24/7)'}
                      </span>
                    ) :
                    backendStatus === 'permission_denied' ? (
                      <span className="text-rose-500 font-medium flex items-center gap-1.5 inline-flex group relative cursor-help">
                        <ShieldAlert className="w-3 h-3" /> 
                        {language === 'en' ? 'Permission Denied' : '권한 제한됨 (설정 필요)'}
                        <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none font-normal leading-relaxed">
                          {language === 'en' 
                            ? "Error 7: The server lacks permission to write to Firestore. You MUST add FIREBASE_SERVICE_ACCOUNT (JSON) to Secrets for background sync to work." 
                            : "Error 7: 서버가 Firestore에 쓰기 권한이 없습니다. 자동 수집/백그라운드 동기화를 위해 Google Cloud Console에서 서비스 계정 키(JSON)를 생성하여 Secrets에 'FIREBASE_SERVICE_ACCOUNT'로 등록해야 합니다."}
                        </div>
                      </span>
                    ) :
                    <span className="text-slate-400 font-medium flex items-center gap-1.5 inline-flex"><XCircle className="w-3 h-3" /> {language === 'en' ? 'Not Configured' : '구성되지 않음'}</span>
                  }</li>
                  <li>• {language === 'en' ? 'Last auto-sync:' : '마지막 자동 수집:'} <span className="font-medium text-slate-900 dark:text-slate-100">{lastSyncAt ? lastSyncAt.toLocaleString() : (language === 'en' ? 'No record' : '기록 없음')}</span></li>
                  <li>• {language === 'en' ? 'Next scheduled sync:' : '다음 자동 수집 예정:'} <span className="font-medium text-slate-900 dark:text-slate-100">{lastSyncAt ? new Date(lastSyncAt.getTime() + 10 * 60 * 1000).toLocaleString() : (language === 'en' ? 'Immediately' : '10분 이내 예정')}</span></li>
                </ul>

                {/* Backend Engine Logs Display */}
                <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <Terminal className="w-4 h-4 text-slate-400 shrink-0" />
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {language === 'en' ? 'Backend Sync Activity (Autonomous - Recent 100)' : '백엔드 자율 엔진 활동 로그 (최근 100건)'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                      <button 
                        onClick={() => fetchBackendLogs()}
                        disabled={isLoadingBackendLogs}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 shrink-0"
                        title={language === 'en' ? 'Refresh logs' : '로그 새로고침'}
                        aria-label={language === 'en' ? 'Refresh logs' : '로그 새로고침'}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackendLogs ? 'animate-spin' : ''}`} />
                      </button>
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => fetchBackendLogs(true)}
                            disabled={loadingLogs || isLoadingBackendLogs}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/40 rounded-lg transition-colors text-xs font-semibold shrink-0 whitespace-nowrap active:scale-95 shadow-2xs"
                            title={language === 'en' ? 'Open detailed log viewer' : '상세 로그 뷰어 열기'}
                          >
                            <Database className="w-3.5 h-3.5 shrink-0" />
                            <span>{language === 'en' ? 'View All' : '전체보기'}</span>
                          </button>
                          <button 
                            onClick={clearBackendLogs}
                            disabled={loadingLogs || isLoadingBackendLogs}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-xs font-semibold shrink-0 whitespace-nowrap active:scale-95 shadow-2xs"
                            title={language === 'en' ? 'Clear all sync logs' : '모든 엔진 로그 삭제'}
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{language === 'en' ? 'Clear' : '비우기'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-slate-900 dark:bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                    <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-[9px] font-bold tracking-wider uppercase">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <Activity className="w-3 h-3" />
                          {language === 'en' ? 'Active' : '엔진 가동중'}
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-400">
                          <Clock className="w-3 h-3" />
                          {language === 'en' ? '30m Interval' : '30분 주기'}
                        </span>
                        {backendLogs.length > 0 && (
                          <span className={`flex items-center gap-1.5 ${backendLogs[0].type === 'failure' ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {backendLogs[0].type === 'failure' ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            {language === 'en' ? 'Last Status:' : '최근 상태:'} {backendLogs[0].type === 'failure' ? 'ERROR' : 'OK'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                      {backendLogs.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-xs text-slate-500 italic">
                            {isLoadingBackendLogs ? (
                              <span className="flex items-center justify-center gap-2">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                {language === 'en' ? 'Fetching backend logs...' : '백엔드 로그를 가져오는 중...'}
                              </span>
                            ) : (
                              language === 'en' ? 'No backend logs found. The autonomous engine may not have run yet.' : '백엔드 자율 엔진 로그가 없습니다. 아직 엔진이 가동되지 않았을 수 있습니다.'
                            )}
                          </p>
                        </div>
                      ) : (
                        <table className="w-full text-[10px] text-left border-collapse">
                          <thead className="sticky top-0 bg-slate-800 text-slate-400 uppercase tracking-widest border-b border-white/5">
                            <tr>
                              <th className="p-2 pl-4">{language === 'en' ? 'Time' : '시각'}</th>
                              <th className="p-2">{language === 'en' ? 'Type' : '구분'}</th>
                              <th className="p-2">{language === 'en' ? 'Source' : '소스'}</th>
                              <th className="p-2 pr-4">{language === 'en' ? 'Message' : '메시지'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono">
                            {backendLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-2 pl-4 text-slate-500 whitespace-nowrap">
                                  {log.timestamp instanceof Date ? log.timestamp.toLocaleString([], { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'N/A'}
                                </td>
                                <td className="p-2">
                                  <span className={`px-1.5 py-0.5 rounded uppercase text-[9px] font-bold ${
                                    log.type === 'success' ? 'bg-green-500/20 text-green-400' :
                                    log.type === 'failure' ? 'bg-rose-500/20 text-rose-400' :
                                    log.type === 'start' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-slate-700 text-slate-300'
                                  }`}>
                                    {log.type}
                                  </span>
                                </td>
                                <td className="p-2 text-slate-400 whitespace-nowrap">{log.source}</td>
                                <td className="p-2 pr-4 text-slate-300 leading-relaxed min-w-[200px]">
                                  {log.message}
                                  {log.details && (
                                    <div className="mt-1 text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {JSON.stringify(log.details)}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex gap-2 items-start">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-[10px] leading-relaxed">
                        <p className="text-slate-700 dark:text-slate-300 font-bold mb-1">
                          {language === 'en' ? 'Engine Monitoring & Troubleshooting' : '엔진 모니터링 및 트러블슈팅'}
                        </p>
                        <p className="text-slate-500">
                          {language === 'en' 
                            ? 'Logs are stored in Cloud Firestore (backend_logs). The engine runs every 30 minutes. If logs show placeholder errors, please set GEMINI_API_KEY in AI Studio Settings (Secrets).' 
                            : '로그는 클라우드(backend_logs)에 기록됩니다. 엔진은 30분 주기로 가동됩니다. 로그에 Placeholder 오류가 보이면 AI Studio 설정(Secrets)에 API Key를 등록하세요.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* GITHUB ACTIONS & GITOPS AUTONOMOUS DATA HARVESTING CENTER */}
              <div id="github-actions-gitops-panel" className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-900 dark:bg-slate-800 text-white p-2.5 rounded-xl shadow-xs">
                      <Github className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                          {language === 'en' ? 'GitHub Actions & GitOps Autonomous Engine' : 'GitHub Actions & GitOps 자율 데이터 수집 센터'}
                        </h2>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          GitOps Free Tier
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
                        {language === 'en'
                          ? 'Automate 24/7 Windows error collection using GitHub Actions free runner and Google Gemini, keeping issues version-controlled in Git with zero server quota burn.'
                          : 'GitHub Actions의 무료 런너와 Gemini AI를 결합하여, 서버 과금 및 DB 한도 소진 없이 최신 Windows 10/11 트렌드를 자동 수집하고 Git에 영구 버전 관리합니다.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {githubLastSync?.at ? (
                      <span className="px-2.5 py-1 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{language === 'en' ? 'Last Synced:' : '최근 동기화:'} {new Date(githubLastSync.at).toLocaleDateString()}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{language === 'en' ? 'Standby / Ready' : '연동 대기 중'}</span>
                      </span>
                    )}

                    <button
                      onClick={() => setShowGitOpsGuideModal(true)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 font-bold transition-all shadow-xs"
                      title={language === 'en' ? 'Open Full GitOps Guidebook' : 'GitHub Actions & GitOps 자율 수집 시스템 구축 가이드 전문 열람'}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-200" />
                      <span>{language === 'en' ? 'Full Guidebook' : '구축 가이드 전문'}</span>
                    </button>
                  </div>
                </div>

                {/* GitOps Architecture Diagram (Interactive Card) */}
                <div className="bg-gradient-to-r from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-800/40 dark:via-indigo-950/20 dark:to-purple-950/20 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      {language === 'en' ? 'Autonomous Data Harvesting Architecture' : 'GitHub Actions ➔ GitOps 데이터 파이프라인 흐름도'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1 text-xs">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        1. 무료 클라우드 크론
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        GitHub Actions가 매 6시간마다 슬립 없이 자율 기동
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1 text-xs">
                        <Bot className="w-3.5 h-3.5 text-purple-500" />
                        2. Gemini AI 자율 수집
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        실시간 웹 검색 그라운딩으로 최신 오류와 해결 스크립트 발굴
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1 text-xs">
                        <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
                        3. Git 자동 커밋 (GitOps)
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        data/issues.json에 누적 커밋하여 영구 보존 및 무제한 CDN 활용
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1 text-xs">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        4. 앱 웹훅 & 실시간 반영
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        수집 즉시 앱(/api/github/sync)으로 전송되어 사용자에게 노출
                      </p>
                    </div>
                  </div>
                </div>

                {/* Operations & Action Toolbar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Action 1: Pull from GitHub */}
                  <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {language === 'en' ? 'Pull Latest Issues from GitHub' : 'GitHub 저장소 최신 데이터 불러오기'}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {language === 'en'
                          ? 'Directly pulls data/issues.json from your GitHub repository into Firestore and Local File DB without invoking AI.'
                          : 'GitHub 저장소의 data/issues.json 파일을 즉시 읽어와 Firestore와 서버 로컬 DB에 병합합니다 (AI API 소진 없음).'}
                      </p>
                    </div>

                    <button
                      onClick={handlePullFromGithub}
                      disabled={isPullingGithub || !githubRepo}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      {isPullingGithub ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{language === 'en' ? 'Pulling from GitHub...' : 'GitHub에서 불러오는 중...'}</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>{language === 'en' ? 'Pull Data Now' : '지금 데이터 불러와 동기화'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Action 2: Trigger GitHub Actions Workflow remotely */}
                  <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Play className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {language === 'en' ? 'Trigger GitHub Actions Remote Run' : 'GitHub Actions 원격 수집 실행 (Dispatch)'}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {language === 'en'
                          ? 'Triggers the windows-fix-collector workflow immediately in the cloud using GitHub REST API.'
                          : 'GitHub API를 통해 클라우드 Actions 워크플로를 원격에서 즉시 1회 기동시킵니다 (PAT 필요).'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={selectedGithubTopic}
                        onChange={(e) => setSelectedGithubTopic(e.target.value)}
                        className="py-2 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="all">카테고리: 전체</option>
                        <option value="업데이트">업데이트 오류</option>
                        <option value="시스템/블루스크린">블루스크린(BSOD)</option>
                        <option value="네트워크">네트워크 오류</option>
                        <option value="스토어/앱">MS 스토어/앱</option>
                        <option value="오디오/사운드">오디오/사운드</option>
                        <option value="디스플레이/그래픽">디스플레이/그래픽</option>
                      </select>

                      <button
                        onClick={() => handleDispatchGithubWorkflow(selectedGithubTopic)}
                        disabled={isDispatchingWorkflow || !githubRepo}
                        className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        {isDispatchingWorkflow ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>{language === 'en' ? 'Dispatching...' : '원격 실행 요청 중...'}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span>{language === 'en' ? 'Run Workflow' : '워크플로 가동'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* GitHub Repository & Token Configuration */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-slate-500" />
                      {language === 'en' ? 'GitHub Repository Settings' : 'GitHub 연동 저장소 및 토큰 설정'}
                    </h4>
                    {hasServerGithubToken && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {language === 'en' ? 'Token Active' : 'PAT 토큰 설정됨'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {language === 'en' ? 'Repository (owner/repo)' : '저장소 (사용자명/저장소명)'}
                      </label>
                      <input
                        type="text"
                        value={githubRepo}
                        onChange={(e) => setGithubRepo(e.target.value)}
                        placeholder="예: octocat/windows-fix-wizard"
                        className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {language === 'en' ? 'Branch' : '브랜치'}
                      </label>
                      <input
                        type="text"
                        value={githubBranch}
                        onChange={(e) => setGithubBranch(e.target.value)}
                        placeholder="main"
                        className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {language === 'en' ? 'Personal Access Token (PAT)' : 'GitHub PAT 토큰 (선택)'}
                      </label>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder={hasServerGithubToken ? "•••••••• (저장됨)" : "ghp_..."}
                        className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <p className="text-[11px] text-slate-500">
                      💡 원격 워크플로 실행이나 비공개(Private) 저장소 접근 시에만 PAT(`repo` 또는 `workflow` 권한)이 필요합니다.
                    </p>
                    <button
                      onClick={saveGithubConfig}
                      disabled={isSavingGithubConfig}
                      className="py-2 px-4 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 self-end sm:self-auto shrink-0"
                    >
                      {isSavingGithubConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{language === 'en' ? 'Save Settings' : '연동 설정 저장'}</span>
                    </button>
                  </div>
                </div>

                {/* Workflow Script (.github/workflows/windows-fix-collector.yml) Viewer Toggle */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div
                    onClick={() => setShowWorkflowScriptModal(!showWorkflowScriptModal)}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {language === 'en'
                          ? 'GitHub Actions Workflow Script (.github/workflows/windows-fix-collector.yml)'
                          : 'GitHub Actions 워크플로 스크립트 (.github/workflows/windows-fix-collector.yml) 확인 및 복사'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        {showWorkflowScriptModal ? (language === 'en' ? 'Hide Code' : '코드 닫기') : (language === 'en' ? 'View YAML' : 'YAML 스크립트 보기')}
                      </span>
                      {showWorkflowScriptModal ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </div>

                  {showWorkflowScriptModal && (
                    <div className="p-4 bg-slate-900 text-slate-100 border-t border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-400 font-mono">
                          📁 .github/workflows/windows-fix-collector.yml
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(GITHUB_WORKFLOW_YAML);
                            setCopiedWorkflow(true);
                            setTimeout(() => setCopiedWorkflow(false), 2500);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          {copiedWorkflow ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{language === 'en' ? 'Copied!' : '복사 완료!'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{language === 'en' ? 'Copy Workflow YAML' : '워크플로 YAML 전체 복사'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      <pre className="text-[11px] font-mono leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto text-emerald-400 max-h-72 custom-scrollbar">
                        {GITHUB_WORKFLOW_YAML}
                      </pre>

                      <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 text-xs space-y-2">
                        <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                          <Key className="w-3.5 h-3.5" />
                          <span>GitHub 저장소 필수 Secrets 설정 가이드 (Settings &gt; Secrets and variables &gt; Actions)</span>
                        </div>
                        <ul className="text-[11px] text-slate-300 space-y-1 list-disc pl-5">
                          <li>
                            <strong className="text-white font-mono">GEMINI_API_KEY</strong>: Google AI Studio에서 발급받은 Gemini API 키
                          </li>
                          <li>
                            <strong className="text-white font-mono">APP_WEBHOOK_URL</strong>: 본 앱의 웹훅 주소 (예: <span className="font-mono text-indigo-300">{window.location.origin}</span>)
                          </li>
                          <li>
                            <strong className="text-white font-mono">CRON_SECRET</strong>: 본 앱 서버의 환경변수 <span className="font-mono text-indigo-300">CRON_SECRET</span>과 일치하는 비밀값
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* GitHub Pages Web Operations Hub */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-indigo-800/40 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/50 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shrink-0">
                        <Globe className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">
                            {language === 'en' ? 'GitHub Pages Web Portal Center' : 'GitHub Pages 공식 웹사이트 대용 운영 센터'}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Live Ready
                          </span>
                        </div>
                        <p className="text-xs text-indigo-200/80 mt-0.5">
                          {language === 'en'
                            ? 'Host and run Windows Fix Wizard as a full standalone website on GitHub Pages.'
                            : '별도 서버 호스팅 비용 없이 GitHub Pages를 통해 실시간 웹사이트로 완벽 구동합니다.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={GITHUB_PAGES_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Open Website' : '웹사이트 열기'}</span>
                      </a>
                    </div>
                  </div>

                  {/* URL Bar & Copy */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs text-indigo-300 font-mono font-semibold shrink-0">🌐 URL:</span>
                      <a
                        href={GITHUB_PAGES_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 font-mono hover:underline truncate"
                      >
                        {GITHUB_PAGES_URL}
                      </a>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(GITHUB_PAGES_URL);
                        customAlert(language === 'en' ? 'GitHub Pages website URL copied!' : 'GitHub Pages 공식 웹사이트 주소가 클립보드에 복사되었습니다!');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 text-xs font-medium border border-indigo-700/50 flex items-center gap-1.5 shrink-0 self-end sm:self-auto transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{language === 'en' ? 'Copy URL' : '주소 복사'}</span>
                    </button>
                  </div>

                  {/* Feature Highlights Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 space-y-1">
                      <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>단독 정적 웹사이트 (SPA)</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Node.js 서버 없이도 클라이언트에서 AI 검색, 가이드북, 위협 검증, PWA 설치까지 즉시 동작합니다.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 space-y-1">
                      <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>자동 릴리즈 연동</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        GitHub Releases API와 실시간 통신하여 웹사이트 방문자에게 최신 인스톨러 다운로드를 자동 안내합니다.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 space-y-1">
                      <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>자동 배포 파이프라인</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        <code>.github/workflows/deploy-pages.yml</code>을 통해 main 브랜치 푸시 시 1분 내 자동 배포됩니다.
                      </p>
                    </div>
                  </div>

                  {/* 3-Step Setup Guide */}
                  <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/30 space-y-2.5">
                    <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-indigo-400" />
                      <span>GitHub 저장소 활성화 3단계 가이드</span>
                    </div>
                    <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-5">
                      <li>
                        GitHub 저장소 (<a href={`${GITHUB_REPO_URL}/settings/pages`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-mono">Settings &gt; Pages</a>) 로 이동합니다.
                      </li>
                      <li>
                        <strong>Build and deployment</strong> 섹션의 <strong>Source</strong> 드롭다운을 <span className="text-white font-semibold underline decoration-emerald-400">GitHub Actions</span> 로 선택합니다.
                      </li>
                      <li>
                        제공된 <code>scripts/github_push.bat</code>을 실행하거나 <code>main</code> 브랜치로 푸시하면 사이트가 즉시 오픈됩니다!
                      </li>
                    </ol>

                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <a
                        href={`${GITHUB_REPO_URL}/settings/pages`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>GitHub Pages 설정 바로가기</span>
                      </a>
                      <a
                        href={`${GITHUB_REPO_URL}/actions`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>GitHub Actions 배포 로그 확인</span>
                      </a>
                    </div>
                  </div>
                </div>

              </div>

              {/* AI ENGINE SENTINEL HEALTH & ALARM CONTROLLER */}
              <div id="ai-engine-sentinel-panel" className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-rose-100 dark:bg-rose-950/40 p-2 rounded-lg">
                      <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {language === 'en' ? 'AI Engine Sentinel & Warning System' : 'AI 엔진 모니터링 센티넬 및 경고 대시보드'}
                      </h2>
                      <p className="text-xs text-slate-500 max-w-xl">
                        {language === 'en'
                          ? 'Tracks AI engine outages, manages automatic email warnings, and validates SMTP gateway deliveries.'
                          : '진단 복구 지연, API 할당량 소진 상황을 실시간 모니터링하여 관리자에게 장애 경고 이메일을 전송합니다.'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 self-start sm:self-auto ${
                    (engineStatus?.consecutiveFailures || 0) === 0
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-350 border border-rose-200 dark:border-rose-800'
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${ (engineStatus?.consecutiveFailures || 0) === 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'}`}></span>
                    {(engineStatus?.consecutiveFailures || 0) === 0 ? (language === 'en' ? 'Sentinel Guard: SAFE' : '모니터링 경비중: 정상') : (language === 'en' ? '⚠️ WARNING OUTAGE' : '⚠️ 장애 발생 감지')}
                  </span>
                </div>

                {/* Grid 1: Stability gauge & Integrity parameters */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Gauge */}
                  <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-4 text-slate-500">
                        {language === 'en' ? 'Engine Stability Index' : 'AI 자동 수집 엔진 건강도'}
                      </h4>
                      <div className="flex items-center justify-center py-4 relative">
                        {/* Circle SVG */}
                        <svg className="w-28 h-28 transform -rotate-90">
                          <circle cx="56" cy="56" r="46" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="8" fill="transparent" />
                          <circle cx="56" cy="56" r="46" 
                            className={`${(engineStatus?.consecutiveFailures || 0) === 0 ? 'stroke-emerald-500' : 'stroke-rose-500'}`} 
                            strokeWidth="8" 
                            fill="transparent" 
                            strokeDasharray="290" 
                            strokeDashoffset={Math.round(290 - (290 * Math.max(0, 100 - (engineStatus?.consecutiveFailures || 0) * 33)) / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-mono font-bold text-slate-850 dark:text-slate-100">
                            {Math.max(0, 100 - (engineStatus?.consecutiveFailures || 0) * 33)}%
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase font-semibold">
                            {language === 'en' ? 'Stability' : '기동 안정성'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-850">
                      <p className="text-xs text-slate-500">
                        {language === 'en' ? 'Consecutive Failures: ' : '장애 수집 복구 단계: '}
                        <span className="font-mono font-bold text-slate-800 dark:text-white">
                          {engineStatus?.consecutiveFailures || 0} / {maintenanceSettings.consecutiveFailuresLimit || 3}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* API Parameters Status */}
                  <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {language === 'en' ? 'Sentinel Credentials Integrity' : 'AI 연동 무결성 상태'}
                    </h4>
                    <div className="space-y-3 text-xs leading-relaxed">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{language === 'en' ? 'Active Key Provider' : '백그라운드 활성 키 종류'}</p>
                        <p className="font-sans font-medium text-slate-800 dark:text-slate-200">{engineStatus?.apiKeySource || 'Loading...'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{language === 'en' ? 'Masked Secret string' : '마스킹된 보안키 주소'}</p>
                        <p className="font-mono text-slate-850 dark:text-slate-300">{engineStatus?.maskedKey || 'No custom API key active'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{language === 'en' ? 'Cooperative Multi-Routing' : '자동 우회 고장 대응 모드'}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="px-1.5 py-0.5 bg-indigo-55 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded text-[9px] border border-indigo-100 dark:border-indigo-900/40 font-bold">
                            {engineStatus?.isPlaceholder ? (language === 'en' ? 'Placeholder Active' : '에러 복원 가동중') : (language === 'en' ? 'Production Ready' : '보안 연동 확인됨')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cooldown stats */}
                  <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {language === 'en' ? 'Live Throttling Timers (API 429)' : '실시간 할당량 초과 격리 타임라인'}
                    </h4>
                    <div className="text-xs leading-relaxed max-h-32 overflow-y-auto custom-scrollbar space-y-2">
                      {engineStatus?.telemetry && Object.keys(engineStatus.telemetry.throttledKeys || {}).length > 0 ? (
                        Object.entries(engineStatus.telemetry.throttledKeys).map(([kName, secs]: any) => (
                          <div key={kName} className="flex justify-between items-center text-amber-605 dark:text-amber-400 font-medium">
                            <span className="font-mono truncate max-w-[120px]">{kName}</span>
                            <span className="font-mono font-bold shrink-0">{secs}초 강제 격리 대기</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-450 italic py-2">{language === 'en' ? 'No keys actively throttled currently' : '일시 정지되거나 격리 조치된 API 키 없음'}</p>
                      )}
                      
                      {engineStatus?.telemetry && Object.keys(engineStatus.telemetry.searchThrottledKeys || {}).length > 0 && (
                        <div className="border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                          <p className="text-[9px] font-bold uppercase text-slate-400 mb-1">{language === 'en' ? 'Search Grounding Cooldowns' : '구글 실시간 검색 격리 타임'}</p>
                          {Object.entries(engineStatus.telemetry.searchThrottledKeys).map(([kName, secs]: any) => (
                            <div key={kName} className="flex justify-between items-center text-blue-600 dark:text-blue-400 font-medium">
                              <span className="font-mono truncate max-w-[120px]">{kName}</span>
                              <span className="font-mono font-bold shrink-0">{secs}초 후 리서치 재개</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form: Formulation policy configuration */}
                <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sliders className="w-4 h-4 text-rose-500" />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {language === 'en' ? 'Configure Alarm Dispatch Rules' : '실시간 시스템 오류 메일 알림 매핑 설정'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                          {language === 'en' ? 'Target Email Recipient' : '장애 알림 수신 이메일 주소'}
                        </label>
                        <input
                          type="email"
                          value={maintenanceSettings.alertEmail || ""}
                          placeholder="admin@cisnet.co.kr"
                          onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, alertEmail: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 font-mono text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                          {language === 'en' ? 'Outage Failures Limit before alarm' : '이메일 통지 임계치 (최대 허용 연속 에러 횟수)'}
                        </label>
                        <select
                          value={maintenanceSettings.consecutiveFailuresLimit || 3}
                          onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, consecutiveFailuresLimit: parseInt(e.target.value) })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                        >
                          <option value="1">1회 실패 즉시 발송 (강력 통제)</option>
                          <option value="2">2회 연속 실패 후 알림 발송</option>
                          <option value="3">3회 연속 수집 지연/에러 시 알림 발송 (추천)</option>
                          <option value="5">5회 연속 대기와 네트워크 타임아웃 지연 시 발송</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3 flex flex-col justify-center">
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-205">이메일 알림 연동 기능 활성화</span>
                          <p className="text-[10px] text-slate-500">지정된 관리 수신함으로 자동 메일 통지를 시행합니다.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={maintenanceSettings.enableAlerts !== false}
                          onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, enableAlerts: e.target.checked })}
                          className="h-4 w-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-205">할당량 완전 소진(RESOURCE_EXHAUSTED) 통지</span>
                          <p className="text-[10px] text-slate-500">API 사용 한도 초과(429) 감지 시 즉각 통보합니다.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={maintenanceSettings.alertOnApiExhaustion !== false}
                          onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, alertOnApiExhaustion: e.target.checked })}
                          className="h-4 w-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-205">서버 네트워크 타임아웃 감지 경보</span>
                          <p className="text-[10px] text-slate-500">외부 수집망 타임아웃 상황을 격리 통보합니다.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={maintenanceSettings.alertOnTimeout !== false}
                          onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, alertOnTimeout: e.target.checked })}
                          className="h-4 w-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                    <button
                      onClick={handleSaveMaintenanceSettings}
                      disabled={isSavingSettings}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-bold rounded-lg shadow-lg shadow-rose-600/15 text-xs transition-colors flex items-center gap-2"
                    >
                      {isSavingSettings ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {language === 'en' ? 'Save Alarm Policies' : '장애 통지 설정 저장 및 활성화'}
                    </button>
                  </div>
                </div>

                {/* Module 2: Live Test broadcast system */}
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">{language === 'en' ? 'Sentinel Alarm Live Transmit Test' : '센티넬 경고 메일 주입 테스트 (SMTP Gateway 검증)'}</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {language === 'en'
                      ? 'Manually triggers a simulated warning email using the current configuration. Delivers to sandbox logs or physical SMTP if configured.'
                      : '현재 백온 보안 설정을 기동하여 이메일 즉시 전송 테스트를 수행합니다. SMTP 정보가 없을 경우 로컬 샌드박스로 가상 우회되어 이메일 템플릿의 무결성을 로그에서 보실 수 있습니다.'}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={testAlertRecipient}
                      onChange={(e) => setTestAlertRecipient(e.target.value)}
                      placeholder="수신 테스트 이메일 입력..."
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-slate-100"
                    />
                    <button
                      onClick={handleTestAlert}
                      disabled={isTestingAlert}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5"
                    >
                      {isTestingAlert ? <RefreshCw className="w-3 animate-spin" /> : <Sparkles className="w-3" />}
                      {language === 'en' ? 'Trigger Test Alarm' : '테스트 경보 이메일 전송'}
                    </button>
                  </div>

                  {testAlertResult && (
                    <div className={`p-4 rounded-xl text-xs space-y-2 border ${testAlertResult.success ? 'bg-green-50/50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-850' : 'bg-rose-50/50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-850'}`}>
                      <div className="flex items-center gap-2 font-bold justify-between">
                        <span className="flex items-center gap-1.5">
                          {testAlertResult.success ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                          {testAlertResult.success ? '전송 완료: SMTP 중계 성공' : '전송 실패: SMTP 연결 에러'}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono">STATUS: {testAlertResult.success ? '250 COMPLETE' : '550 FAILURE'}</span>
                      </div>
                      <p className="font-mono text-[10px] bg-white/60 dark:bg-black/40 p-2 rounded border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">{testAlertResult.info || testAlertResult.error}</p>
                    </div>
                  )}
                </div>

                {/* Module 2.5: Real SMTP Gateway Delivery Configuration Menu */}
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
                        {language === 'en' ? 'Real Email Relay (SMTP Server Configuration)' : '실제 메일 송신을 위한 SMTP 서버 연동 설정 (Real SMTP Gateway)'}
                      </h4>
                    </div>
                    <div>
                      {maintenanceSettings.smtpHost && maintenanceSettings.smtpUser ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {language === 'en' ? 'Real SMTP Active' : '실제 SMTP 전송 활성화'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                          <Info className="w-3 h-3 text-amber-600" />
                          {language === 'en' ? 'Sandbox Mode (No SMTP Host)' : '가상 샌드박스 중계 모드'}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {language === 'en'
                      ? 'Configure external SMTP settings (e.g. Gmail, Naver, Outlook) to send physical email notifications directly to target recipient inboxes.'
                      : '경보 알림 및 AI 이상 감지 리포트를 사용자/관리자 실제 이메일 수신함으로 전달하기 위한 발송용 외부 SMTP 서버 연결 정보를 구성하세요.'}
                  </p>

                  {/* Preset Helper Tags */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-bold">{language === 'en' ? 'Quick Presets:' : '빠른 설정을 위한 주요 SMTP 제공자:'}</span>
                    <button
                      type="button"
                      onClick={() => setMaintenanceSettings({ ...maintenanceSettings, smtpHost: 'smtp.gmail.com', smtpPort: 587 })}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      Gmail (smtp.gmail.com : 587)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaintenanceSettings({ ...maintenanceSettings, smtpHost: 'smtp.naver.com', smtpPort: 587 })}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      Naver (smtp.naver.com : 587)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaintenanceSettings({ ...maintenanceSettings, smtpHost: 'smtp.office365.com', smtpPort: 587 })}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      Outlook / Office 365
                    </button>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                        {language === 'en' ? 'SMTP Server Host' : 'SMTP 서버 호스트 (Host)'}
                      </label>
                      <input
                        type="text"
                        value={maintenanceSettings.smtpHost || ''}
                        onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, smtpHost: e.target.value })}
                        placeholder="예: smtp.gmail.com"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                        {language === 'en' ? 'SMTP Port' : 'SMTP 포트 (Port)'}
                      </label>
                      <input
                        type="number"
                        value={maintenanceSettings.smtpPort || 587}
                        onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, smtpPort: parseInt(e.target.value) || 587 })}
                        placeholder="587 (TLS) 또는 465 (SSL)"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                        {language === 'en' ? 'SMTP Auth User / Email' : 'SMTP 계정 ID / 이메일'}
                      </label>
                      <input
                        type="text"
                        value={maintenanceSettings.smtpUser || ''}
                        onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, smtpUser: e.target.value })}
                        placeholder="예: your_email@gmail.com"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                        {language === 'en' ? 'SMTP Password / App Password' : 'SMTP 비밀번호 / 앱 전용 암호'}
                      </label>
                      <div className="relative">
                        <input
                          type={showSmtpPass ? "text" : "password"}
                          value={maintenanceSettings.smtpPass || ''}
                          onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, smtpPass: e.target.value })}
                          placeholder="••••••••••••"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPass(!showSmtpPass)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          title={showSmtpPass ? "비밀번호 숨기기" : "비밀번호 보기"}
                        >
                          {showSmtpPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SMTP Usage Security Note */}
                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-lg text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">{language === 'en' ? 'Important Provider Specific Notes:' : '실제 메일 송신 설정 안내'}</p>
                      <ul className="list-disc list-inside text-[11px] space-y-0.5 opacity-90 leading-relaxed">
                        <li><strong>Gmail:</strong> 구글 계정 [보안] 탭에서 2차 인증을 켠 후 발급받은 16자리 <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">앱 비밀번호</code>를 입력해야 합니다.</li>
                        <li><strong>Naver:</strong> 네이버 메일 [환경설정 → POP3/IMAP]에서 <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">POP3/SMTP 사용함</code>을 활성화해야 연결됩니다.</li>
                      </ul>
                    </div>
                  </div>

                  {/* SMTP Test Result Banner */}
                  {smtpTestResult && (
                    <div className={`p-3 rounded-lg text-xs border ${smtpTestResult.success ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'} flex items-start gap-2.5`}>
                      {smtpTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5 flex-1">
                        <div className="font-bold flex items-center justify-between">
                          <span>{smtpTestResult.success ? (language === 'en' ? 'Connection Test Succeeded' : 'SMTP 연결 및 계정 검증 성공') : (language === 'en' ? 'Connection Test Failed' : 'SMTP 연결 검증 실패')}</span>
                          <span className="font-mono text-[10px] opacity-75">{smtpTestResult.success ? 'HANDSHAKE OK' : 'VERIFY FAILED'}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed font-mono opacity-90">{smtpTestResult.message || smtpTestResult.error}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                    <button
                      type="button"
                      onClick={handleResetSmtpSettings}
                      disabled={isSavingSettings}
                      className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      {language === 'en' ? 'Reset Settings' : '설정 초기화'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestSmtpConnection}
                        disabled={isTestingSmtpConn}
                        className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isTestingSmtpConn ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        ) : (
                          <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                        {language === 'en' ? 'Test Connection' : 'SMTP 연결 테스트'}
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveMaintenanceSettings}
                        disabled={isSavingSettings}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold rounded-lg shadow-md text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSavingSettings ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        {language === 'en' ? 'Save SMTP Settings' : 'SMTP 연결 설정 저장 및 적용'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Queue 3: SMTP Gateway log logs timeline */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-405">
                      {language === 'en' ? 'SMTP Notification Historical Queue' : '최근 생성된 Sentinel 경고 알람 (최근 5건)'}
                    </h4>
                  </div>
                  
                  {(!engineStatus?.emailAlertLogs || engineStatus.emailAlertLogs.length === 0) ? (
                    <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <p className="text-xs text-slate-450 italic">{language === 'en' ? 'No recent warning alerts dispatched' : '등록된 최근 가상/실제 이메일 전송 내역이 아직 없습니다.'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {engineStatus.emailAlertLogs.map((log: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 space-y-3">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-205">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${log.success ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>
                                {log.success ? 'SENT' : 'FAIL'}
                              </span>
                              <span className="truncate max-w-xs">{log.subject}</span>
                            </div>
                            <span className="text-[10px] text-slate-450 font-mono">{log.time}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-650 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-850 pt-3">
                            <div>
                              <p className="font-semibold text-slate-700 dark:text-slate-350">{language === 'en' ? 'Receiver details' : '이메일 수신 기동처'}</p>
                              <p className="font-mono">{log.recipient}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-700 dark:text-slate-350">{language === 'en' ? 'Handshake Delivery feedback' : '전달 핸드셰이크 응답 요약'}</p>
                              <p className="italic text-[10px] truncate" title={log.info}>{log.info}</p>
                            </div>
                          </div>

                          <details className="text-xs border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-black/20">
                            <summary className="p-2 cursor-pointer font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between list-none">
                              <span>🖥️ {language === 'en' ? 'Preview HTML Alarm design' : '경고 이메일 템플릿 실시간 실물 디자인 모의'}</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </summary>
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
                              <div className="border border-slate-200 dark:border-slate-800 rounded p-4 bg-white text-slate-800 max-h-60 overflow-y-auto" dangerouslySetInnerHTML={{ __html: log.template }} />
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* API Key Management */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-lg">
                    <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {language === 'en' ? 'API Key Management' : 'API 키 관리 (로드밸런싱 및 백업)'}
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 gap-6 mb-6">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={newKeyInput}
                      onChange={(e) => setNewKeyInput(e.target.value)}
                      placeholder={language === 'en' ? 'Add new Gemini API Key...' : '추가할 Gemini API 키 입력...'}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleAddKey}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      {language === 'en' ? 'Add Key' : '키 추가'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/80">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {language === 'en' ? 'Routing Mode:' : '라우팅 모드:'}
                      </span>
                      <select 
                        value={apiKeyConfig.mode}
                        onChange={(e) => handleModeChange(e.target.value as any)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="priority">{language === 'en' ? 'Priority (Custom First)' : '우선순위 (커스텀 키 우선)'}</option>
                        <option value="load-balance">{language === 'en' ? 'Load Balance (Round Robin)' : '로드밸런스 (라운드로빈)'}</option>
                      </select>
                    </div>
                  </div>
                  <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {apiKeyConfig.keys.map((k, index) => (
                      <li key={index} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{k.name}</span>
                            {!k.isCustom && <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-400">Environment</span>}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                            {k.key.substring(0, 6)}...{k.key.substring(k.key.length - 4)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center cursor-pointer">
                            <div className="relative">
                              <input type="checkbox" className="sr-only" checked={k.isActive} onChange={() => handleToggleKey(index)} />
                              <div className={`block w-10 h-6 rounded-full transition-colors ${k.isActive ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${k.isActive ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                            <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">
                              {k.isActive ? (language === 'en' ? 'Active' : '활성') : (language === 'en' ? 'Inactive' : '비활성')}
                            </span>
                          </label>
                          {k.isCustom && (
                            <button
                              onClick={() => handleRemoveKey(index)}
                              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-1"
                              title="Delete Key"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                    {apiKeyConfig.keys.length === 0 && (
                      <li className="px-4 py-6 text-center text-sm text-slate-500">
                        {language === 'en' ? 'No API keys configured.' : '설정된 API 키가 없습니다.'}
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg">
                      <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {language === 'en' ? 'Server Maintenance Settings' : '서버 유지보수 설정 (스케줄러 고도화)'}
                    </h3>
                  </div>
                  <button 
                    onClick={handleSaveMaintenanceSettings}
                    disabled={isSavingSettings}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm"
                  >
                    {isSavingSettings ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    {language === 'en' ? 'Save Settings' : '설정 저장'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cleanup Period */}
                  <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Trash2 className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{language === 'en' ? 'Log Cleanup Period' : '로그 정리 기간 설정'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <select 
                        value={maintenanceSettings.cleanupMonths}
                        onChange={(e) => setMaintenanceSettings(prev => ({ ...prev, cleanupMonths: parseInt(e.target.value) }))}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 select-auto appearance-none"
                      >
                        <option value={1}>{language === 'en' ? '1 Month' : '1개월 (30일)'}</option>
                        <option value={3}>{language === 'en' ? '3 Months' : '3개월 (90일)'}</option>
                        <option value={6}>{language === 'en' ? '6 Months' : '6개월 (180일)'}</option>
                        <option value={12}>{language === 'en' ? '12 Months' : '12개월 (365일)'}</option>
                        <option value={0}>{language === 'en' ? 'Disable Cleanup' : '정리 사용 안함'}</option>
                      </select>
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        {language === 'en' ? (
                          maintenanceSettings.cleanupMonths === 0 ? 'Log cleanup disabled (All logs kept)' :
                          `Automatically discard logs older than ${maintenanceSettings.cleanupMonths} Month${maintenanceSettings.cleanupMonths > 1 ? 's' : ''}`
                        ) : (
                          maintenanceSettings.cleanupMonths === 0 ? '오래된 로그 자동 파기 중단 (모두 유지)' :
                          `${maintenanceSettings.cleanupMonths}개월 (${maintenanceSettings.cleanupMonths * 30}일) 경과시 오래된 로그 자동 파기됨`
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Link Verification Period */}
                  <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-2 mb-3">
                      <ExternalLink className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{language === 'en' ? 'Link Verification Frequency' : '링크 검증 주기 설정'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <select 
                        value={maintenanceSettings.linkVerifyFrequencyDays}
                        onChange={(e) => setMaintenanceSettings(prev => ({ ...prev, linkVerifyFrequencyDays: parseInt(e.target.value) }))}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 select-auto appearance-none"
                      >
                        <option value={1}>{language === 'en' ? 'Daily' : '매일 1회'}</option>
                        <option value={3}>{language === 'en' ? 'Every 3 Days' : '3일마다'}</option>
                        <option value={7}>{language === 'en' ? 'Weekly' : '매주 1회 (7일)'}</option>
                        <option value={30}>{language === 'en' ? 'Monthly' : '매월 1회 (30일)'}</option>
                        <option value={0}>{language === 'en' ? 'Disable Check' : '검증 사용 안함'}</option>
                      </select>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {language === 'en' ? (
                          maintenanceSettings.linkVerifyFrequencyDays === 0 ? 'Reference document link check disabled' :
                          maintenanceSettings.linkVerifyFrequencyDays === 1 ? 'Check for broken URLs Daily' :
                          maintenanceSettings.linkVerifyFrequencyDays === 7 ? 'Check for broken URLs Weekly (7 days)' :
                          maintenanceSettings.linkVerifyFrequencyDays === 30 ? 'Check for broken URLs Monthly (30 days)' :
                          `Check for broken URLs Every ${maintenanceSettings.linkVerifyFrequencyDays} Days`
                        ) : (
                          maintenanceSettings.linkVerifyFrequencyDays === 0 ? '참고 문서 유효성 체크 기능 비활성화' :
                          maintenanceSettings.linkVerifyFrequencyDays === 1 ? '매일 1회 참고 문서 유효성 체크' :
                          maintenanceSettings.linkVerifyFrequencyDays === 7 ? '매주 1회 (7일) 참고 문서 유효성 체크' :
                          maintenanceSettings.linkVerifyFrequencyDays === 30 ? '매월 1회 (30일) 참고 문서 유효성 체크' :
                          `${maintenanceSettings.linkVerifyFrequencyDays}일마다 참고 문서 유효성 체크`
                        )}
                      </span>
                    </div>
                  </div>

                  {/* AI Engine Auto-Collect Scheduler */}
                  <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{language === 'en' ? 'AI Engine Sync Interval' : '백엔드 자율 엔진 수집 주기 설정'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number"
                        min={1}
                        max={10080}
                        value={maintenanceSettings.engineIntervalMin || 60}
                        onChange={(e) => setMaintenanceSettings(prev => ({ ...prev, engineIntervalMin: Math.max(1, parseInt(e.target.value) || 60) }))}
                        className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {language === 'en' ? 'minutes' : '분 주기'}
                      </span>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {language === 'en' ? 
                          `Runs auto-collection every ${(maintenanceSettings.engineIntervalMin || 60)} min(s).` : 
                          `매 ${(maintenanceSettings.engineIntervalMin || 60)}분마다 크론 스케줄이 실시간 작동합니다.`
                        }
                      </span>
                    </div>
                  </div>

                  {/* AI Engine Auto-Collect Batch Size */}
                  <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{language === 'en' ? 'AI Engine Collection Count' : '백엔드 자율 엔진 모집 개수 설정'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number"
                        min={1}
                        max={10}
                        value={maintenanceSettings.engineBatchSize || 4}
                        onChange={(e) => setMaintenanceSettings(prev => ({ ...prev, engineBatchSize: Math.max(1, Math.min(10, parseInt(e.target.value) || 4)) }))}
                        className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {language === 'en' ? 'issues' : '개 이슈'}
                      </span>
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                        {language === 'en' ? 
                          `Collects ${(maintenanceSettings.engineBatchSize || 4)} issue(s) per run.` : 
                          `1회 가동마다 약 ${(maintenanceSettings.engineBatchSize || 4)}개 이슈를 자동 수집합니다.`
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-900/30 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-blue-500" />
                    <span>
                      {language === 'en' ? 'Next maintenance:' : '다음 유지보수 예정:'} {' '}
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {maintenanceSettings.lastMaintenanceAt ? new Date(new Date(maintenanceSettings.lastMaintenanceAt).getTime() + 24 * 60 * 60 * 1000).toLocaleString() : (language === 'en' ? 'At Midnight' : '오늘 자정')}
                      </span>
                    </span>
                  </div>
                  <span className="font-medium text-slate-500">
                    {language === 'en' ? '* Run daily at 00:00 KST' : '* 매일 한국시간 00:00에 실행됩니다.'}
                  </span>
                </div>
              </div>

              {isReclassifying && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                      <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                        {language === 'en' ? 'AI Re-Classification in Progress' : 'AI 카테고리 자동 재분류 작업 진행 중'}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                      {Math.round((reclassifyProgress.current / (reclassifyProgress.total || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-indigo-200 dark:bg-indigo-900 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(reclassifyProgress.current / (reclassifyProgress.total || 1)) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-2">
                    {language === 'en' 
                      ? `AI is analyzing symptoms and moving items to appropriate categories. Please do not close this window.` 
                      : `AI가 각 이슈의 증상을 분석하여 적절한 카테고리로 이동시키고 있습니다. 분석량이 많을 경우 다소 시간이 걸릴 수 있으니 창을 닫지 마세요.`}
                  </p>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <button
                  onClick={fetchVisitorLogs}
                  disabled={loadingLogs}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-cyan-500 transition-all text-left group shadow-sm relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-6 h-6 text-cyan-500 group-hover:scale-110 transition-transform" />
                    {visitorStats.activeNowCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {visitorStats.activeNowCount} {language === 'en' ? 'Online' : '접속 중'}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{language === 'en' ? 'Visitor Management' : '방문자 정보 관리'}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'en' 
                      ? 'Monitor real-time visitors, device stats, OS distribution, and session logs.' 
                      : '실시간 접속자, 기기/OS 정보, 방문 수 및 세션 로그를 종합 관리합니다.'}
                  </p>
                  {visitorStats.todayVisitors > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex justify-between">
                      <span>오늘 방문자: <strong className="text-slate-800 dark:text-slate-200">{visitorStats.todayVisitors}명</strong></span>
                      <span>총 누적: <strong className="text-slate-800 dark:text-slate-200">{visitorStats.totalVisitors}명</strong></span>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => fetchSearchLogs(0)}
                  disabled={loadingLogs}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-500 transition-all text-left group shadow-sm"
                >
                  <Search className="w-6 h-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{language === 'en' ? 'Search Logs' : '검색 로그'}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{language === 'en' ? 'Check user search queries and OS versions.' : '사용자들의 검색 쿼리 및 OS 버전을 확인합니다.'}</p>
                </button>
                <button
                  onClick={() => fetchFeedbackLogs(0)}
                  disabled={loadingLogs}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 transition-all text-left group shadow-sm"
                >
                  <ThumbsUp className="w-6 h-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{language === 'en' ? 'User Feedback' : '사용자 피드백'}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{language === 'en' ? 'Check resolution status and user comments.' : '해결 여부 및 사용자 의견을 확인합니다.'}</p>
                </button>
                <button
                  onClick={() => fetchAdminLogs(0)}
                  disabled={loadingLogs}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-purple-500 transition-all text-left group shadow-sm"
                >
                  <ShieldCheck className="w-6 h-6 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{language === 'en' ? 'Admin Activity' : '관리자 활동'}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{language === 'en' ? 'Check issue addition, modification, and deletion history.' : '이슈 추가, 수정, 삭제 내역을 확인합니다.'}</p>
                </button>
                <button
                  onClick={() => fetchAppErrorLogs(0)}
                  disabled={loadingLogs}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-rose-500 transition-all text-left group shadow-sm"
                >
                  <AlertTriangle className="w-6 h-6 text-rose-500 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{language === 'en' ? 'App Error Logs' : '앱 시스템 에러'}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{language === 'en' ? 'Monitor runtime errors and diagnosis failures.' : '런타임 에러 및 진단 실패 로그를 모니터링합니다.'}</p>
                </button>
                <button
                  onClick={reclassifyUncategorizedIssues}
                  disabled={isReclassifying}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500 transition-all text-left group shadow-sm relative overflow-hidden"
                >
                  {isReclassifying && (
                    <motion.div 
                      className="absolute bottom-0 left-0 h-1.5 bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(reclassifyProgress.current / (reclassifyProgress.total || 1)) * 100}%` }}
                    />
                  )}
                  <Sparkles className={`w-6 h-6 text-indigo-500 mb-2 ${isReclassifying ? 'animate-bounce' : 'group-hover:scale-110 transition-transform'}`} />
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    {language === 'en' ? 'AI Auto-Classification' : 'AI 자동 카테고리 분류'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isReclassifying 
                      ? (language === 'en' ? `In Progress... ${reclassifyProgress.current}/${reclassifyProgress.total}` : `처리 중... ${reclassifyProgress.current}/${reclassifyProgress.total}`)
                      : (language === 'en' ? 'Organize items in the Others category using AI.' : '기타 카테고리의 이슈들을 AI가 분석하여 적절한 위치로 이동합니다.')}
                  </p>
                  {isReclassifying && (
                    <div className="mt-2 text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                      STEP {Math.ceil(reclassifyProgress.current / 10)} / {Math.ceil(reclassifyProgress.total / 10)}
                    </div>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* AI Model Optimization Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-full ring-2 ring-blue-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                      <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{language === 'en' ? 'Knowledge Optimization' : 'AI 지식 최적화'}</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 flex-grow">
                    {language === 'en' ? 'Fine-tune AI diagnostic accuracy by extracting patterns from search logs, admin edits, and resolved feedback.' : '검색 로그, 관리자 수정 내역, 해결된 피드백에서 패턴을 추출하여 AI의 진단 정확도를 정밀하게 조정합니다.'}
                  </p>
                  
                  {aiOptimizedKnowledge && (
                    <div className="mb-4 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 max-h-[80px] overflow-y-auto text-[10px] text-slate-400 italic">
                      {aiOptimizedKnowledge}
                    </div>
                  )}

                  <button
                    onClick={optimizeAiModel}
                    disabled={isOptimizingAi}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 dark:disabled:bg-emerald-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
                  >
                    {isOptimizingAi ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {language === 'en' ? 'Optimizing...' : '최적화 중...'}
                      </>
                    ) : (
                      <>
                        <Flame className="w-4 h-4" />
                        {language === 'en' ? 'Optimize Engine' : '엔진 최적화 실행'}
                      </>
                    )}
                  </button>
                </div>

                {/* Batch Processing Status Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                      <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{language === 'en' ? 'AI Auto-Collection' : 'AI 자동 수집'}</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 flex-grow">
                    {language === 'en' ? 'Instantly search the internet for the latest Windows error trends and solutions and add them to the database.' : '인터넷에서 최신 Windows 오류 트렌드와 해결 방법을 즉시 검색하여 데이터베이스에 추가합니다.'}
                  </p>
                  <button
                    onClick={() => handleTriggerAiSearch(false)}
                    disabled={triggeringAi}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 dark:disabled:bg-purple-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
                  >
                    {triggeringAi ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {language === 'en' ? 'Collecting...' : '수집 중...'}
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        {language === 'en' ? 'Run Now' : '지금 즉시 실행'}
                      </>
                    )}
                  </button>
                </div>

                {/* AI Verification Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                      <FileCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{language === 'en' ? 'Data Re-verification' : '데이터 재검증'}</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex-grow">
                    {language === 'en' ? 'AI re-checks if existing data is still valid in the current Windows environment and updates its status.' : '기존 데이터가 현재 Windows 환경에서도 여전히 유효한지 AI가 다시 확인하고 상태를 업데이트합니다.'}
                  </p>
                  <div className="space-y-3">
                    <select 
                      value={verificationMonths}
                      onChange={(e) => setVerificationMonths(parseInt(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value={1}>{language === 'en' ? 'Last 1 month' : '최근 1개월 대상'}</option>
                      <option value={3}>{language === 'en' ? 'Last 3 months' : '최근 3개월 대상'}</option>
                      <option value={6}>{language === 'en' ? 'Last 6 months' : '최근 6개월 대상'}</option>
                      <option value={12}>{language === 'en' ? 'Last 12 months' : '최근 12개월 대상'}</option>
                    </select>
                    <button
                      onClick={() => handleStartVerification(verificationMonths)}
                      disabled={verifyingData}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                      {verifyingData ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          {language === 'en' ? 'Verifying...' : '검증 중...'}
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-4 h-4" />
                          {language === 'en' ? 'Run Re-verification' : '재검증 실행'}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Localization Tool Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
                      <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{language === 'en' ? 'Localization Tool' : '다국어 데이터 생성'}</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 flex-grow">
                    {language === 'en' ? 'Automatically generate English data for documents missing translations using AI. This helps support global users.' : '번역이 누락된 문서에 대해 AI를 사용하여 자동으로 영어 데이터를 생성합니다. 글로벌 사용자 지원을 위해 필요합니다.'}
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={handleBulkTranslate}
                      disabled={isTranslating}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                      {isTranslating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          {language === 'en' ? `Translating (${translationProgress}/${translationTotal})` : `번역 중 (${translationProgress}/${translationTotal})`}
                        </>
                      ) : (
                        <>
                          <Globe className="w-4 h-4" />
                          {language === 'en' ? 'Generate English Data' : '영어 데이터 생성 실행'}
                        </>
                      )}
                    </button>
                    {translationResult && (
                      <div className={`text-center text-[10px] font-bold py-1.5 px-3 rounded-lg animate-fade-in ${translationResult.includes('실패') || translationResult.includes('failed') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {translationResult}
                      </div>
                    )}
                  </div>
                </div>

                {/* Duplicate Cleanup Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                      <Trash2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{language === 'en' ? 'Duplicate Cleanup' : '중복 데이터 정리'}</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 flex-grow">
                    {language === 'en' ? 'Automatically find and clean up duplicate entries with the same title or error code to optimize the database.' : '제목이나 에러 코드가 동일한 중복 항목을 찾아 자동으로 정리하여 데이터베이스를 최적화합니다.'}
                  </p>
                  <div className="space-y-3">
                    {!showCleanupConfirm ? (
                      <button
                        onClick={() => setShowCleanupConfirm(true)}
                        disabled={isCleaningDuplicates}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md active:scale-[0.98]"
                      >
                        <Trash2 className="w-4 h-4" />
                        {language === 'en' ? 'Run Cleanup' : '중복 정리 실행'}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleCleanupDuplicates}
                          disabled={isCleaningDuplicates}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
                        >
                          {isCleaningDuplicates ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          {language === 'en' ? 'Confirm' : '확인'}
                        </button>
                        <button
                          onClick={() => setShowCleanupConfirm(false)}
                          disabled={isCleaningDuplicates}
                          className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-[0.98]"
                        >
                          {language === 'en' ? 'Cancel' : '취소'}
                        </button>
                      </div>
                    )}
                    {cleanupResult && (
                      <div className={`text-center text-[10px] font-bold py-1.5 px-3 rounded-lg animate-fade-in ${cleanupResult.includes('오류') || cleanupResult.includes('error') || cleanupResult.includes('failed') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {cleanupResult}
                      </div>
                    )}
                  </div>
                </div>

                {/* Backup & Restore Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                      <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{language === 'en' ? 'Data Backup & Restore' : '데이터 백업 및 복원'}</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 flex-grow">
                    {language === 'en' ? 'Export all database records to a JSON file for backup, or import a previously exported file to restore data.' : '전체 데이터베이스 레코드를 JSON 파일로 내보내 백업하거나, 이전에 내보낸 파일을 불러와 데이터를 복원합니다.'}
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={handleExportData}
                      disabled={isExporting || isImporting}
                      className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md active:scale-[0.98] text-xs"
                    >
                      {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {language === 'en' ? 'Export Data' : '데이터 내보내기'}
                    </button>
                    <button
                      onClick={() => validateFileInputRef.current?.click()}
                      disabled={isExporting || isImporting}
                      className="w-full py-2.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 disabled:opacity-50 text-blue-700 dark:text-blue-300 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-blue-200/60 dark:border-blue-800/60 text-xs shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                      <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      {language === 'en' ? 'Validate JSON Schema' : 'JSON 스키마 규격 사전 검증'}
                    </button>
                    <input
                      type="file"
                      accept=".json,.zip"
                      ref={validateFileInputRef}
                      onChange={handleValidateJsonFile}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isExporting || isImporting}
                      className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md active:scale-[0.98] text-xs"
                    >
                      {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {language === 'en' ? 'Import Data (Auto-Validate)' : '데이터 불러오기 (자동 검증)'}
                    </button>
                    <input
                      type="file"
                      accept=".json,.zip"
                      ref={fileInputRef}
                      onChange={handleImportData}
                      className="hidden"
                    />
                    <button
                      onClick={handleDownloadSystemBackupZip}
                      disabled={isSystemBackingUp || isExporting || isImporting}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                      {isSystemBackingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {language === 'en' ? 'System Recovery Backup (ZIP)' : '시스템 복원용 백업 (ZIP)'}
                    </button>
                    
                    {/* Last-Known-Good Automatic Rollback Button */}
                    <button
                      onClick={handleRestoreLastKnownGood}
                      disabled={isExporting || isImporting}
                      className="w-full py-2.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 disabled:opacity-50 text-amber-800 dark:text-amber-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-amber-300/70 dark:border-amber-700/70 text-xs shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                      <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      {language === 'en' ? 'Restore Last-Known-Good State' : '직전 정상 백업 상태로 롤백 (Last-Known-Good)'}
                    </button>

                    {lastKnownGoodInfo && (
                      <div className="text-[11px] bg-amber-100/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl p-2.5 text-amber-900 dark:text-amber-200 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            {language === 'en' ? 'Last-Known-Good Snapshot' : '직전 자동 스냅샷 보관됨'}
                          </span>
                          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">
                            {new Date(lastKnownGoodInfo.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[10px] opacity-90">
                          {language === 'en'
                            ? `Contains ${lastKnownGoodInfo.totalRecords} verified records saved prior to import.`
                            : `불러오기 직전 보관된 ${lastKnownGoodInfo.totalRecords}개 정상 레코드 (데이터 손상 시 롤백)`}
                        </div>
                        <button
                          onClick={() => setShowLkgDetailsModal(true)}
                          className="text-[10px] font-bold text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100 underline decoration-amber-400/80 hover:decoration-amber-600 flex items-center gap-1 cursor-pointer transition-colors pt-0.5"
                        >
                          <Eye className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          {language === 'en' ? 'View Snapshot Metadata Details' : '스냅샷 규격/컬렉션 메타데이터 상세보기'}
                        </button>
                      </div>
                    )}

                    {backupResult && (
                      <div className={`text-center text-[10px] font-bold py-1.5 px-3 rounded-lg animate-fade-in ${backupResult.includes('오류') || backupResult.includes('실패') || backupResult.includes('failed') || backupResult.includes('aborted') || backupResult.includes('취소') ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300'}`}>
                        {backupResult}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-inner">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                  <div className="text-center sm:text-left">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center sm:justify-start gap-2">
                      <Database className="w-5 h-5 text-blue-500" />
                      {language === 'en' ? 'Bulk Data Collection Mode' : '대량 데이터 수집 모드'}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {language === 'en' ? 'Customize collection interval, duration, and batch size.' : '사용할 수집 간격, 수집 시간, 수집 개수를 설정하여 자동 수집을 진행합니다.'}
                    </p>
                  </div>
                  {isBatchCollecting && (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold animate-pulse border border-blue-200 dark:border-blue-800">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        {language === 'en' 
                          ? (useStaging ? 'Collecting (Local)...' : 'Collecting (Sync)...') 
                          : (useStaging ? '로컬 수집 중...' : '서버 동기화 중...')}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {useStaging ? (
                            language === 'en' ? `Staged: ${batchCollectionCount}` : `로컬 저장됨: ${batchCollectionCount}`
                          ) : (
                            language === 'en' ? `New: ${batchCollectionCount} | Updated: ${batchCollectionUpdatedCount}` : `신규: ${batchCollectionCount} | 업데이트: ${batchCollectionUpdatedCount}`
                          )}
                        </div>
                        {batchStatus && (
                          <div className="text-[9px] font-bold text-blue-500 dark:text-blue-400 animate-pulse">
                            {batchStatus}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {!isBatchCollecting && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'en' ? 'Interval (seconds)' : '수집 간격 (초)'}
                      </label>
                      <input 
                        type="number" 
                        min="5" 
                        max="300" 
                        value={batchIntervalSeconds}
                        onChange={(e) => setBatchIntervalSeconds(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'en' ? 'Duration (minutes)' : '수집 시간 (분)'}
                      </label>
                      <input 
                        type="number" 
                        min="1" 
                        max="1440" 
                        value={batchDurationMinutes}
                        onChange={(e) => setBatchDurationMinutes(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'en' ? 'Items per batch' : '1회당 수집 개수'}
                      </label>
                      <input 
                        type="number" 
                        min="1" 
                        max="20" 
                        value={batchItemCount}
                        onChange={(e) => setBatchItemCount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {!isBatchCollecting ? (
                    <button
                      onClick={handleStartBatchCollection}
                      className="flex-1 py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md active:scale-[0.99]"
                    >
                      <Download className="w-5 h-5" />
                      {language === 'en' ? 'Start Continuous Auto-Collection' : '연속 자동 수집 시작'}
                    </button>
                  ) : (
                    <button
                      onClick={handleStopBatchCollection}
                      className="flex-1 py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md active:scale-[0.99]"
                    >
                      <XCircle className="w-5 h-5" />
                      {language === 'en' ? 'Stop Continuous Auto-Collection' : '연속 자동 수집 중지'}
                    </button>
                  )}
                </div>

                {/* Staging Control UI */}
                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                   <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-500" />
                        {language === 'en' ? 'Local Staging & Cloud Sync' : '로컬 수집 후 클라우드 동기화'}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {language === 'en' ? 'Collect items to your computer first, then upload them to the server all at once.' : '데이터를 먼저 내 컴퓨터에 수집한 뒤, 나중에 한꺼번에 서버로 전송합니다. (할당량 관리 효율적)'}
                      </p>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={useStaging} 
                        onChange={(e) => setUseStaging(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-orange-500"></div>
                      <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">{language === 'en' ? 'Use Local Staging' : '로컬 수집 모드 사용'}</span>
                    </label>
                  </div>

                  {stagedIssues.length > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/40 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-orange-100 dark:bg-orange-900/40 p-2 rounded-lg">
                            <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {language === 'en' ? 'Staging Queue' : '수집 대기열'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {language === 'en' ? `${stagedIssues.length} items waiting for sync` : `${stagedIssues.length}개의 항목이 동기화 대기 중입니다.`}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setStagedIssues([])}
                            disabled={isSyncingStaged}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors"
                          >
                            {language === 'en' ? 'Clear List' : '목록 초기화'}
                          </button>
                          <button
                            onClick={handleSyncStagedIssues}
                            disabled={isSyncingStaged}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all"
                          >
                            {isSyncingStaged ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                {language === 'en' ? `Syncing (${syncProgress}/${syncTotal})` : `동기화 중 (${syncProgress}/${syncTotal})`}
                              </>
                            ) : (
                              <>
                                <Cloud className="w-4 h-4" />
                                {language === 'en' ? 'Sync All to Cloud' : '클라우드로 모두 동기화'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {stagedIssues.slice(0, 20).map((issue, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white/50 dark:bg-slate-900/50 border border-orange-100 dark:border-orange-900/20 rounded-xl text-xs">
                             <div className="flex items-center gap-3 truncate">
                               <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-md font-bold text-[10px]">{issue.category}</span>
                               <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{issue.title}</span>
                             </div>
                             <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">{issue.code}</span>
                          </div>
                        ))}
                        {stagedIssues.length > 20 && (
                          <div className="text-center py-2 text-xs text-slate-400 italic">
                            ... {language === 'en' ? `and ${stagedIssues.length - 20} more items` : `외 ${stagedIssues.length - 20}개의 항목이 더 있습니다`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Issue Management - Added List to Admin Tab */}
              {(() => {
                const adminDisplayedIssues = dbIssues.filter(issue => {
                  if (hideVerifiedInAdmin && issue.verificationStatus === 'verified') {
                    return false;
                  }
                  return true;
                });

                return (
                  <div className="mt-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                          <LayoutList className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {language === 'en' ? 'Manage & Verify Database Issues' : '데이터베이스 이슈 관리 및 AI 검증'}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {language === 'en' 
                              ? 'Review collected issues and run batch AI verification or individual checks.' 
                              : '수집 및 등록된 이슈 목록을 확인하고 Gemini AI로 수집 항목 전체 일괄 검증 및 개별 점검을 수행합니다.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                        <button
                          onClick={() => setHideVerifiedInAdmin(!hideVerifiedInAdmin)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all border active:scale-95 shadow-sm ${
                            hideVerifiedInAdmin
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/60'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                          title={hideVerifiedInAdmin ? '검증완료 항목 숨김 중 (클릭 시 전체 표시)' : '모든 항목 표시 중 (클릭 시 검증완료 숨김)'}
                        >
                          <Filter className="w-3.5 h-3.5" />
                          {hideVerifiedInAdmin
                            ? (language === 'en' ? 'Hiding Verified' : '검증완료 숨김 중')
                            : (language === 'en' ? 'Show All' : '전체 표시')
                          }
                        </button>

                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          {adminDisplayedIssues.length} / {dbIssues.length} {language === 'en' ? 'Items' : '개 항목'}
                        </div>

                        <button
                          onClick={() => handleBatchVerifyCollectedIssues(true)}
                          disabled={verifyingData || dbIssues.length === 0}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                          title={language === 'en' ? 'Verify unverified items only' : '미검증 항목만 선택하여 일괄 검증'}
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                          {language === 'en' ? 'Verify Unverified' : '미검증만 일괄검증'}
                        </button>

                        <button
                          onClick={() => handleBatchVerifyCollectedIssues(false)}
                          disabled={verifyingData || dbIssues.length === 0}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                          {verifyingData ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              {language === 'en' ? 'Verifying All...' : '일괄 검증 진행 중...'}
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-amber-300" />
                              {language === 'en' ? 'Batch Verify All Collected' : '수집 항목 전체 AI 일괄 검증'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar">
                      {adminDisplayedIssues.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed space-y-2">
                          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                          <p className="text-slate-700 dark:text-slate-200 font-bold text-sm">
                            {dbIssues.length === 0
                              ? (language === 'en' ? 'No issues found in database.' : '데이터베이스에 이슈가 없습니다.')
                              : (language === 'en' ? 'All collected issues have been verified!' : '모든 수집 항목의 검증 및 보완 작성이 완료되었습니다!')}
                          </p>
                          {dbIssues.length > 0 && hideVerifiedInAdmin && (
                            <p className="text-xs text-slate-400">
                              {language === 'en'
                                ? 'Verified items are currently hidden. Toggle "Hiding Verified" to view all.'
                                : '검증 완료된 항목은 목록에서 숨김 처리되어 있습니다. 상단의 "검증완료 숨김 중" 버튼을 클릭하면 전체 항목을 확인할 수 있습니다.'}
                            </p>
                          )}
                        </div>
                      ) : (
                        adminDisplayedIssues.map((issue) => (
                      <div 
                        key={issue.id} 
                        className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md font-bold text-[10px] uppercase">
                                {issue.category}
                              </span>
                              {issue.code && (
                                <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md font-bold text-[10px] uppercase font-mono">
                                  {issue.code}
                                </span>
                              )}
                              {issue.verificationStatus && (
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                                  issue.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                  issue.verificationStatus === 'needs_update' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {issue.verificationStatus === 'verified' ? (language === 'en' ? 'Verified' : '검증완료') : 
                                   issue.verificationStatus === 'needs_update' ? (language === 'en' ? 'Update Needed' : '수정필요') : 
                                   (language === 'en' ? 'Obsolete' : '폐기권장')}
                                </span>
                              )}
                              {issue.isLatest && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-md font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
                                  <Flame className="w-3 h-3 text-orange-500" />
                                  {language === 'en' ? 'Latest' : '최신'}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate mb-1">
                              {issue.title}
                            </h4>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {issue.createdAt ? (typeof issue.createdAt === 'string' ? new Date(issue.createdAt).toLocaleDateString() : (issue.createdAt as any).toDate?.().toLocaleDateString() || 'N/A') : 'Unknown'}
                              </div>
                              {issue.verifiedAt && (
                                <div className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400 font-medium">
                                  <FileCheck className="w-3 h-3" />
                                  {language === 'en' ? 'Last Verified:' : '마지막 검증:'} {new Date(issue.verifiedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => verifySingleIssueWithAI(issue)}
                              disabled={verifyingIssueId === issue.id}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                verifyingIssueId === issue.id
                                  ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 shadow-sm'
                              }`}
                            >
                              {verifyingIssueId === issue.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              )}
                              {language === 'en' ? 'Verify with AI' : 'AI 개별 검증'}
                            </button>
                            
                            <button
                              onClick={() => handleEditClick(issue)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30"
                              title={language === 'en' ? 'Edit' : '편집'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteClick(issue.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                              title={language === 'en' ? 'Delete' : '삭제'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {issue.aiFeedback && (
                          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[10px] text-slate-500 italic border border-slate-100 dark:border-slate-800/60 flex gap-2">
                             <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                             <span className="leading-relaxed">"{issue.aiFeedback}"</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}
            </div>
          </motion.div>
        )}

        {/* SYSTEM THREAT VERIFIER & ROADMAP TAB */}
        {activeTab === 'threat-verifier' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 animate-fade-in"
          >
            <InteractiveRoadmap language={language} />
          </motion.div>
        )}

        {/* Edit Modal */}
        {editingIssue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800"
            >
              <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-10">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-500" />
                  {language === 'en' ? 'Edit Issue' : '이슈 편집'}
                </h3>
                <button
                  onClick={() => setEditingIssue(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{language === 'en' ? 'Category' : '카테고리'}</label>
                  <input
                    type="text"
                    value={editForm.category || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{language === 'en' ? 'Error Code' : '오류 코드'}</label>
                  <input
                    type="text"
                    value={editForm.code || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{language === 'en' ? 'Title' : '제목'}</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{language === 'en' ? 'Symptoms' : '증상'}</label>
                  <textarea
                    value={editForm.symptoms || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, symptoms: e.target.value }))}
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{language === 'en' ? 'Windows Versions (comma separated)' : 'Windows 버전 (쉼표로 구분)'}</label>
                  <input
                    type="text"
                    value={editForm.windowsVersions?.join(', ') || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, windowsVersions: e.target.value.split(',').map(v => v.trim()).filter(v => v) }))}
                    placeholder="Windows 11, Windows 10, Windows 8.1"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{language === 'en' ? 'Script (PowerShell)' : '스크립트 (PowerShell)'}</label>
                  <textarea
                    value={editForm.script || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, script: e.target.value }))}
                    rows={4}
                    className="w-full font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {editForm.script && (
                    <div className="mt-3">
                      <PowerShellVerifierPanel
                        scriptText={editForm.script}
                        language={language}
                        onScriptSigned={(newScript) => {
                          setEditForm(prev => ({ ...prev, script: newScript }));
                        }}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{language === 'en' ? 'Manual Steps (line separated)' : '수동 단계 (줄바꿈으로 구분)'}</label>
                  <textarea
                    value={editForm.manualSteps?.join('\n') || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, manualSteps: e.target.value.split('\n').filter(s => s.trim()) }))}
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{language === 'en' ? 'Reference URLs (line separated)' : '참고 문서 URL (줄바꿈으로 구분)'}</label>
                  <textarea
                    value={editForm.sourceUrls?.join('\n') || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, sourceUrls: e.target.value.split('\n').filter(s => s.trim()) }))}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                  <div className="flex items-center h-5">
                    <input
                      id="isLatest"
                      type="checkbox"
                      checked={editForm.isLatest || false}
                      onChange={e => setEditForm(prev => ({ ...prev, isLatest: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white dark:bg-slate-900 cursor-pointer"
                    />
                  </div>
                  <div className="ml-2 text-sm">
                    <label htmlFor="isLatest" className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 cursor-pointer">
                      <Flame className="w-4 h-4 text-orange-500" />
                      {language === 'en' ? 'Mark as Latest/Trending' : '최신 트렌드/업데이트 이슈로 표시'}
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {language === 'en' ? 'This adds a pulse-animated "Latest" badge to alert users about recently active issues.' : '최신성이나 중요도가 높아진 이슈에 대해 사용자들에게 시각적인 강조 효과를 줍니다.'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 z-10">
                <button
                  onClick={() => setEditingIssue(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {language === 'en' ? 'Cancel' : '취소'}
                </button>
                <button
                  onClick={handleUpdateIssue}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {language === 'en' ? 'Save' : '저장'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* AdSense at the bottom */}
        <AdSense slot="PLACEHOLDER_SLOT_ID" />

        {/* Feedback Modal */}
        <AnimatePresence>
          {showFeedbackModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800"
              >
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">상세 피드백 남기기</h3>
                  <button onClick={() => setShowFeedbackModal(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className={`p-2 rounded-lg ${feedbackSolved ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {feedbackSolved ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{feedbackSolved ? '문제가 해결되었습니다' : '해결되지 않았습니다'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">상태를 변경하려면 아래 버튼을 클릭하세요.</p>
                    </div>
                    <button 
                      onClick={() => setFeedbackSolved(!feedbackSolved)}
                      className="ml-auto text-xs font-bold text-blue-600 hover:underline"
                    >
                      변경
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">추가 의견 (선택 사항)</label>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="해결 과정에서 겪은 문제나 제안 사항이 있다면 적어주세요."
                      rows={4}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                  <button
                    onClick={() => setShowFeedbackModal(null)}
                    className="flex-1 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    {language === 'en' ? 'Cancel' : '취소'}
                  </button>
                  <button
                    onClick={() => {
                      const feedbackIssue = [...dbIssues, ...KNOWN_ISSUES].find(i => i.id === showFeedbackModal);
                      const feedbackTitle = showFeedbackModal === 'wizard-result' 
                        ? (result?.code || 'Wizard Analysis')
                        : (feedbackIssue?.title || 'Unknown Issue');
                      logFeedback(showFeedbackModal, feedbackTitle, feedbackSolved!, feedbackComment);
                    }}
                    className="flex-1 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-colors"
                  >
                    {language === 'en' ? 'Submit Feedback' : '피드백 전송'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Auth Modal */}
        <AnimatePresence>
          {showAuthModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                    {authMode === 'login' 
                      ? (language === 'en' ? 'Log In' : '로그인') 
                      : (language === 'en' ? 'Sign Up' : '회원가입')}
                  </h3>
                  <button onClick={() => setShowAuthModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6">
                  {authError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                      {authError}
                    </div>
                  )}
                  
                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'en' ? 'Email Address' : '이메일 주소'}
                      </label>
                      <input 
                        type="email" 
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="name@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'en' ? 'Password' : '비밀번호'}
                      </label>
                      <input 
                        type="password" 
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="••••••••"
                      />
                    </div>
                    
                    <button 
                      type="submit" 
                      disabled={authLoading}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {authLoading 
                        ? (language === 'en' ? 'Please wait...' : '잠시만 기다려주세요...') 
                        : (authMode === 'login' 
                            ? (language === 'en' ? 'Log In' : '로그인') 
                            : (language === 'en' ? 'Sign Up' : '회원가입'))}
                    </button>
                  </form>
                  
                  <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <button 
                      onClick={handleGoogleAuth}
                      disabled={authLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      {language === 'en' ? 'Continue with Google' : 'Google로 계속하기'}
                    </button>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <button 
                      onClick={() => {
                        setAuthMode(authMode === 'login' ? 'signup' : 'login');
                        setAuthError('');
                      }}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {authMode === 'login' 
                        ? (language === 'en' ? "Don't have an account? Sign up" : '계정이 없으신가요? 회원가입') 
                        : (language === 'en' ? 'Already have an account? Log in' : '이미 계정이 있으신가요? 로그인')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* AI Data Verification Modal */}
        <AnimatePresence>
          {showVerificationModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col"
              >
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{language === 'en' ? 'AI Data Re-verification Progress' : 'AI 데이터 재검증 진행 상황'}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{language === 'en' ? 'AI is re-evaluating the validity of collected data.' : '수집된 데이터의 유효성을 AI가 다시 검토합니다.'}</p>
                    </div>
                  </div>
                  {!verifyingData && (
                    <button 
                      onClick={() => setShowVerificationModal(false)} 
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6 text-slate-400" />
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  {verifyingData ? (
                    <div className="space-y-6">
                      <div className="text-center space-y-2">
                        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{language === 'en' ? 'Analyzing data...' : '데이터를 분석 중입니다...'}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'en' ? 'Gemini AI is verifying against the latest Windows environment.' : 'Gemini AI가 최신 윈도우 환경과 대조하여 검증하고 있습니다.'}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-slate-600 dark:text-slate-400">{language === 'en' ? 'Progress' : '진행률'}</span>
                          <span className="text-blue-600 dark:text-blue-400">{verificationProgress}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${verificationProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{language === 'en' ? 'Verification complete.' : '검증 작업이 완료되었습니다.'}</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                            {language === 'en' ? 'Verification Results & Batch Apply' : '검증 결과 및 카테고리별 일괄 적용'}
                          </h4>
                          <button
                            onClick={() => handleApplyBatchVerificationStatus('all')}
                            disabled={isApplyingBatch || verificationResults.filter(r => r.status !== 'error' && !r.applied).length === 0}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isApplyingBatch ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                {language === 'en' ? 'Applying...' : 'DB 일괄 적용 중...'}
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                {language === 'en' ? 'Batch Apply All Results to DB' : '전체 검증 결과 DB 일괄 적용'}
                              </>
                            )}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Card 1: 검증완료 (Verified) */}
                          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col justify-between text-center gap-3">
                            <div>
                              <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                {language === 'en' ? 'Verified' : '검증완료 (유효)'}
                              </div>
                              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                {verificationResults.filter(r => r.status === 'verified' && !r.applied).length}
                              </span>
                            </div>
                            <button
                              onClick={() => handleApplyBatchVerificationStatus('verified')}
                              disabled={isApplyingBatch || verificationResults.filter(r => r.status === 'verified' && !r.applied).length === 0}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 dark:disabled:bg-emerald-950/50 text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {language === 'en' ? 'Batch Apply Verified' : '검증완료 일괄 적용'}
                            </button>
                          </div>

                          {/* Card 2: 수정필요 (Needs Revision) */}
                          <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 flex flex-col justify-between text-center gap-3">
                            <div>
                              <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                {language === 'en' ? 'Needs Revision' : '수정필요'}
                              </div>
                              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                {verificationResults.filter(r => r.status === 'needs_update' && !r.applied).length}
                              </span>
                            </div>
                            <button
                              onClick={() => handleApplyBatchVerificationStatus('needs_update')}
                              disabled={isApplyingBatch || verificationResults.filter(r => r.status === 'needs_update' && !r.applied).length === 0}
                              className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-200 dark:disabled:bg-amber-950/50 text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {language === 'en' ? 'Batch Apply Needs Revision' : '수정필요 일괄 적용'}
                            </button>
                          </div>

                          {/* Card 3: 폐기권장 (Obsolete) */}
                          <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 rounded-2xl border border-rose-200/60 dark:border-rose-800/40 flex flex-col justify-between text-center gap-3">
                            <div>
                              <div className="flex items-center justify-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
                                <XCircle className="w-4 h-4 text-rose-500" />
                                {language === 'en' ? 'Obsolete' : '폐기권장'}
                              </div>
                              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                                {verificationResults.filter(r => r.status === 'obsolete' && !r.applied).length}
                              </span>
                            </div>
                            <button
                              onClick={() => handleApplyBatchVerificationStatus('obsolete')}
                              disabled={isApplyingBatch || verificationResults.filter(r => r.status === 'obsolete' && !r.applied).length === 0}
                              className="w-full py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-200 dark:disabled:bg-rose-950/50 text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              {language === 'en' ? 'Batch Apply Obsolete' : '폐기권장 일괄 적용'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                            {language === 'en' ? 'Verification Details' : '상세 검증 결과'}
                          </h4>
                          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                              onClick={() => setVerificationViewMode('list')}
                              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${verificationViewMode === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                              LIST
                            </button>
                            <button
                              onClick={() => setVerificationViewMode('json')}
                              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${verificationViewMode === 'json' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                              JSON
                            </button>
                          </div>
                        </div>

                        {verificationViewMode === 'list' ? (
                          verificationResults.length === 0 ? (
                            <div className="p-8 text-center bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3 shadow-sm">
                              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {language === 'en'
                                  ? 'All AI verification results have been applied and registered to the database!'
                                  : '모든 AI 검증 결과가 데이터베이스에 성공적으로 적용 및 보완 등록되었습니다!'}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {language === 'en'
                                  ? 'The updated scripts, manual steps, and statuses are now registered in the main issue list.'
                                  : '보완 수정된 스크립트, 가이드 및 검증 상태가 데이터베이스 이슈 목록에 정상 반영되었습니다.'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                            {verificationResults.map((result, idx) => (
                              <div key={idx} className="p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex items-start justify-between gap-3 shadow-sm">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                                    result.status === 'verified' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                    result.status === 'needs_update' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                    'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                                  }`}>
                                    {result.status === 'verified' ? <CheckCircle2 className="w-4 h-4" /> :
                                     result.status === 'needs_update' ? <AlertTriangle className="w-4 h-4" /> :
                                     <XCircle className="w-4 h-4" />}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{result.title}</p>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        result.status === 'verified' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                        result.status === 'needs_update' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                                        'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                      }`}>
                                        {result.status === 'verified' ? (language === 'en' ? 'Verified' : '검증완료') :
                                         result.status === 'needs_update' ? (language === 'en' ? 'Needs Revision' : '수정필요') :
                                         (language === 'en' ? 'Obsolete' : '폐기권장')}
                                      </span>
                                      {result.applied && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center gap-0.5">
                                          <Check className="w-3 h-3" />
                                          {language === 'en' ? 'Applied' : 'DB 적용됨'}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{result.feedback}</p>
                                    {result.status === 'needs_update' && (result.revisedScript || (result.revisedManualSteps && result.revisedManualSteps.length > 0)) && (
                                      <div className="mt-2 p-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 rounded-lg text-xs space-y-1.5">
                                        <span className="font-bold text-[10px] text-amber-700 dark:text-amber-400 block uppercase tracking-wider">
                                          {language === 'en' ? 'AI Proposed Revision & Complement:' : 'AI 보완 및 수정 제안 내용:'}
                                        </span>
                                        {result.revisedScript && (
                                          <div className="font-mono bg-slate-900 text-amber-300 p-2 rounded text-[11px] overflow-x-auto whitespace-pre-wrap">
                                            {result.revisedScript}
                                          </div>
                                        )}
                                        {result.revisedManualSteps && result.revisedManualSteps.length > 0 && (
                                          <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300 text-[11px]">
                                            {result.revisedManualSteps.map((step: string, sIdx: number) => (
                                              <li key={sIdx}>{step}</li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleApplySingleVerificationStatus(result)}
                                  disabled={isApplyingBatch || result.applied}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                                    result.applied 
                                      ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-default'
                                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95'
                                  }`}
                                >
                                  {result.applied ? (language === 'en' ? 'Applied' : '적용됨 ✓') : (language === 'en' ? 'Apply' : '단일 적용')}
                                </button>
                              </div>
                            ))}
                          </div>
                        )) : (
                          <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 overflow-hidden border border-slate-800">
                            <div className="flex justify-between items-center mb-2 px-1">
                              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Verification.json</span>
                              <button 
                                onClick={() => copyToClipboard(JSON.stringify(verificationResults, null, 2), 'verify-json')}
                                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                {copiedScript === 'verify-json' ? 'COPIED!' : 'COPY JSON'}
                              </button>
                            </div>
                            <pre className="text-[11px] font-mono text-emerald-400/90 overflow-auto max-h-[400px] custom-scrollbar p-2 bg-black/20 rounded-lg">
                              {JSON.stringify(verificationResults, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {!verifyingData && (
                  <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <button
                      onClick={() => setShowVerificationModal(false)}
                      className="w-full py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-2xl hover:opacity-90 transition-opacity"
                    >
                      확인 및 닫기
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Logs Modal */}
        <AnimatePresence>
          {showLogsModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col"
              >
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                  {/* Top Bar: Title & Desktop Actions & Close Button */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
                        {showLogsModal === 'admin' ? <ShieldCheck className="w-5 h-5 text-purple-500" /> : 
                         showLogsModal === 'search' ? <Search className="w-5 h-5 text-blue-500" /> : 
                         showLogsModal === 'error' ? <AlertTriangle className="w-5 h-5 text-rose-500" /> :
                         showLogsModal === 'backend_logs' ? <Database className="w-5 h-5 text-emerald-500" /> :
                         showLogsModal === 'visitor' ? <Users className="w-5 h-5 text-cyan-500" /> :
                         <ThumbsUp className="w-5 h-5 text-emerald-500" />}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                        {showLogsModal === 'admin' ? '관리자 활동 로그' : 
                         showLogsModal === 'search' ? '사용자 검색 로그' : 
                         showLogsModal === 'error' ? '앱 시스템 에러 로그' :
                         showLogsModal === 'backend_logs' ? '백엔드 엔진 로그' :
                         showLogsModal === 'visitor' ? '방문자 정보 관리' :
                         '사용자 피드백 로그'}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Desktop Action Buttons */}
                      {['admin', 'search', 'feedback', 'error', 'backend_logs', 'visitor'].includes(showLogsModal || '') && isAdmin && (
                        <div className="hidden sm:flex items-center gap-2">
                          <button 
                            onClick={handleDownloadLogs}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/70 hover:bg-blue-100/70 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors border border-blue-200/70 dark:border-blue-800/40 shrink-0 whitespace-nowrap active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5 shrink-0" />
                            <span>{language === 'en' ? "Download JSON" : "JSON 다운로드"}</span>
                          </button>
                          <button 
                            onClick={() => {
                              if (showLogsModal === 'admin') clearAdminLogs();
                              else if (showLogsModal === 'search') clearSearchLogs();
                              else if (showLogsModal === 'feedback') clearFeedbackLogs();
                              else if (showLogsModal === 'error') clearAppErrorLogs();
                              else if (showLogsModal === 'backend_logs') clearBackendLogs();
                              else if (showLogsModal === 'visitor') clearVisitorLogs();
                            }}
                            disabled={loadingLogs}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/70 hover:bg-rose-100/70 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 rounded-lg transition-colors border border-rose-200/70 dark:border-rose-800/40 shrink-0 whitespace-nowrap active:scale-95 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{language === 'en' ? "Clear Logs" : "로그 비우기"}</span>
                          </button>
                        </div>
                      )}

                      {/* Close Button */}
                      <button 
                        onClick={() => setShowLogsModal(null)} 
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors shrink-0"
                        title={language === 'en' ? 'Close' : '닫기'}
                        aria-label={language === 'en' ? 'Close' : '닫기'}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile Action Buttons Bar */}
                  {['admin', 'search', 'feedback', 'error', 'backend_logs', 'visitor'].includes(showLogsModal || '') && isAdmin && (
                    <div className="flex sm:hidden items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={handleDownloadLogs}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-900/25 dark:hover:bg-blue-900/40 rounded-xl transition-colors border border-blue-200/70 dark:border-blue-800/50 shrink-0 whitespace-nowrap active:scale-95 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        <span>{language === 'en' ? "Download JSON" : "JSON 다운로드"}</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (showLogsModal === 'admin') clearAdminLogs();
                          else if (showLogsModal === 'search') clearSearchLogs();
                          else if (showLogsModal === 'feedback') clearFeedbackLogs();
                          else if (showLogsModal === 'error') clearAppErrorLogs();
                          else if (showLogsModal === 'backend_logs') clearBackendLogs();
                          else if (showLogsModal === 'visitor') clearVisitorLogs();
                        }}
                        disabled={loadingLogs}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/80 hover:bg-rose-100/80 dark:bg-rose-900/25 dark:hover:bg-rose-900/40 rounded-xl transition-colors border border-rose-200/70 dark:border-rose-800/50 shrink-0 whitespace-nowrap active:scale-95 disabled:opacity-50 shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{language === 'en' ? "Clear Logs" : "로그 비우기"}</span>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  {showLogsModal === 'visitor' ? (
                    <div className="space-y-6">
                      {/* Visitor Quick Overview Banner */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                          <p className="text-[11px] font-medium text-slate-400">{language === 'en' ? "Today's Visitors" : "오늘 방문자수"}</p>
                          <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{visitorStats.todayVisitors} <span className="text-xs font-normal text-slate-400">{language === 'en' ? 'visitors' : '명'}</span></p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                          <p className="text-[11px] font-medium text-slate-400">{language === 'en' ? "Active Now" : "현재 실시간 접속자"}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{visitorStats.activeNowCount} <span className="text-xs font-normal text-slate-400">{language === 'en' ? 'active' : '명'}</span></p>
                          </div>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                          <p className="text-[11px] font-medium text-slate-400">{language === 'en' ? "Total Visitors" : "총 누적 방문자"}</p>
                          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{visitorStats.totalVisitors} <span className="text-xs font-normal text-slate-400">{language === 'en' ? 'total' : '명'}</span></p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                          <p className="text-[11px] font-medium text-slate-400">{language === 'en' ? "Members / Guests" : "회원 / 비회원"}</p>
                          <p className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1">
                            {visitorStats.memberCount} <span className="text-xs font-normal text-slate-400">회원</span> / {visitorStats.guestCount} <span className="text-xs font-normal text-slate-400">비회원</span>
                          </p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-rose-100 dark:border-rose-900/50 shadow-sm flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-medium text-rose-500 dark:text-rose-400">{language === 'en' ? "Auto Blocked" : "자동 차단 현황"}</p>
                            <ShieldAlert className="w-4 h-4 text-rose-500" />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{visitorStats.autoBlockedCount || 0} <span className="text-xs font-normal text-slate-400">{language === 'en' ? 'blocked' : '건'}</span></p>
                            <button
                              onClick={() => setShowAutoBlockSettingsModal(true)}
                              className="px-2 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded text-[11px] font-bold transition-colors flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {language === 'en' ? 'Rules' : '규칙설정'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Filter Toolbar */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-100/70 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={visitorQuery}
                            onChange={(e) => setVisitorQuery(e.target.value)}
                            placeholder={language === 'en' ? "Search visitor ID, Email, IP, Browser, OS, Block reason..." : "방문자 ID, 이메일, IP, 브라우저, OS, 차단사유 검색..."}
                            className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                          />
                          {visitorQuery && (
                            <button onClick={() => setVisitorQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                            <button
                              onClick={() => setVisitorFilter('all')}
                              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${visitorFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                              {language === 'en' ? 'All' : '전체'}
                            </button>
                            <button
                              onClick={() => setVisitorFilter('members')}
                              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${visitorFilter === 'members' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                              {language === 'en' ? 'Members' : '회원만'}
                            </button>
                            <button
                              onClick={() => setVisitorFilter('guests')}
                              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${visitorFilter === 'guests' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                              {language === 'en' ? 'Guests' : '비회원'}
                            </button>
                            <button
                              onClick={() => setVisitorFilter('blocked')}
                              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${visitorFilter === 'blocked' ? 'bg-rose-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                              {language === 'en' ? 'Blocked' : '차단됨'}
                            </button>
                            <button
                              onClick={() => setVisitorFilter('autoblocked')}
                              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${visitorFilter === 'autoblocked' ? 'bg-amber-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                              {language === 'en' ? 'Auto-Blocked' : '🤖 자동차단'}
                            </button>
                          </div>

                          <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                            <button
                              onClick={() => setVisitorDeviceFilter('all')}
                              className={`px-2 py-1 rounded-md font-medium ${visitorDeviceFilter === 'all' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'text-slate-500'}`}
                            >
                              {language === 'en' ? 'All Devices' : '전체기기'}
                            </button>
                            <button
                              onClick={() => setVisitorDeviceFilter('desktop')}
                              className={`px-2 py-1 rounded-md font-medium ${visitorDeviceFilter === 'desktop' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'text-slate-500'}`}
                              title="Desktop"
                            >
                              <Laptop className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setVisitorDeviceFilter('mobile')}
                              className={`px-2 py-1 rounded-md font-medium ${visitorDeviceFilter === 'mobile' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'text-slate-500'}`}
                              title="Mobile"
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Visitor List */}
                      <div className="space-y-3">
                        {filteredVisitorLogs.length === 0 ? (
                          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {language === 'en' ? "No visitor logs match your search criteria." : "검색 조건에 일치하는 방문자 기록이 없습니다."}
                            </p>
                          </div>
                        ) : (
                          filteredVisitorLogs.map((vis) => {
                            const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
                            const isOnline = (vis.lastActiveAt || '') >= tenMinsAgo;

                            return (
                              <div
                                key={vis.id || vis.visitorId}
                                className={`p-4 bg-white dark:bg-slate-900 rounded-xl border transition-all shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                  vis.isBlocked 
                                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10' 
                                    : isOnline 
                                    ? 'border-emerald-300 dark:border-emerald-800/80' 
                                    : 'border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className={`p-2.5 rounded-xl flex-shrink-0 relative ${
                                    vis.isBlocked ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                                    isOnline ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}>
                                    {vis.deviceType === 'mobile' ? <Smartphone className="w-5 h-5" /> :
                                     vis.deviceType === 'tablet' ? <Tablet className="w-5 h-5" /> :
                                     <Laptop className="w-5 h-5" />}
                                    {isOnline && !vis.isBlocked && (
                                      <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                                        {vis.visitorId}
                                      </span>
                                      {vis.userEmail && vis.userEmail !== 'anonymous' ? (
                                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                          <UserCheck className="w-3 h-3" />
                                          {vis.userEmail}
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-semibold">
                                          {language === 'en' ? 'Guest Visitor' : '비회원 방문자'}
                                        </span>
                                      )}

                                      {vis.isBlocked && (
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                          vis.autoBlocked 
                                            ? 'bg-rose-600 text-white' 
                                            : 'bg-rose-500 text-white'
                                        }`}>
                                          <Ban className="w-3 h-3" />
                                          {vis.autoBlocked 
                                            ? (language === 'en' ? 'AUTO-BLOCKED' : '🤖 자동차단됨') 
                                            : (language === 'en' ? 'BLOCKED' : '🚫 관리자 차단')}
                                        </span>
                                      )}

                                      {isOnline && !vis.isBlocked && (
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                                          {language === 'en' ? 'LIVE ONLINE' : '실시간 접속 중'}
                                        </span>
                                      )}
                                    </div>

                                    {vis.isBlocked && vis.blockReason && (
                                      <div className="text-[11px] font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 p-2 rounded-lg border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5 my-1">
                                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                                        <span><strong>차단 사유:</strong> {vis.blockReason}</span>
                                      </div>
                                    )}

                                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        💻 {vis.os || 'Windows 11'} · {vis.browser || 'Chrome'}
                                      </span>
                                      <span>IP: {vis.ip || '127.0.0.1'}</span>
                                      <span>🌐 {vis.language || 'ko-KR'}</span>
                                      <span>📍 현재 탭: <strong className="text-blue-600 dark:text-blue-400">{vis.activeTab || 'guidebook'}</strong></span>
                                    </div>

                                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                                      <span>최근 활동: {vis.lastActiveAt ? new Date(vis.lastActiveAt).toLocaleString() : 'N/A'}</span>
                                      <span>총 방문: <strong>{vis.visitCount || 1}회</strong></span>
                                      <span>세션 상호작용: <strong>{vis.activityCount || 1}회</strong></span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                                  <button
                                    onClick={() => setSelectedVisitorDetail(vis)}
                                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    {language === 'en' ? 'Details' : '상세정보'}
                                  </button>

                                  <button
                                    onClick={() => handleToggleBlockVisitor(vis.visitorId, !!vis.isBlocked)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                                      vis.isBlocked
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        : 'bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300'
                                    }`}
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    {vis.isBlocked 
                                      ? (language === 'en' ? 'Unblock' : '차단 해제') 
                                      : (language === 'en' ? 'Block Visitor' : '방문자 차단')}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Selected Visitor Detail Popover Modal */}
                      {selectedVisitorDetail && (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
                            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-500" />
                                {language === 'en' ? 'Visitor Detailed Profile' : '방문자 상세 정보 프로필'}
                              </h4>
                              <button onClick={() => setSelectedVisitorDetail(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                <X className="w-5 h-5 text-slate-400" />
                              </button>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                                <p className="text-slate-400 text-[10px]">VISITOR IDENTIFIER</p>
                                <p className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">{selectedVisitorDetail.visitorId}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                  <p className="text-slate-400 text-[10px]">USER ID / EMAIL</p>
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                                    {selectedVisitorDetail.userEmail || selectedVisitorDetail.userId || '비회원 (Guest)'}
                                  </p>
                                </div>
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                  <p className="text-slate-400 text-[10px]">DEVICE / OS</p>
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                    {selectedVisitorDetail.os || 'Windows'} ({selectedVisitorDetail.deviceType || 'desktop'})
                                  </p>
                                </div>
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                  <p className="text-slate-400 text-[10px]">BROWSER / IP</p>
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                    {selectedVisitorDetail.browser || 'Chrome'} · {selectedVisitorDetail.ip || '127.0.0.1'}
                                  </p>
                                </div>
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                  <p className="text-slate-400 text-[10px]">TOTAL VISITS / ACTIONS</p>
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                    {selectedVisitorDetail.visitCount || 1}회 방문 / {selectedVisitorDetail.activityCount || 1}회 활동
                                  </p>
                                </div>
                              </div>

                              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                                <p className="text-slate-400 text-[10px]">USER AGENT</p>
                                <p className="font-mono text-[10px] text-slate-600 dark:text-slate-300 break-all bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                                  {selectedVisitorDetail.userAgent || 'N/A'}
                                </p>
                              </div>

                              {selectedVisitorDetail.isBlocked && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-1 text-rose-700 dark:text-rose-300">
                                  <p className="font-bold text-[10px] text-rose-500 uppercase tracking-wider flex items-center gap-1">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    SECURITY BLOCK STATUS & REASON
                                  </p>
                                  <p className="font-semibold text-xs">{selectedVisitorDetail.blockReason || '관리자에 의해 접속 차단됨'}</p>
                                  <div className="flex justify-between text-[10px] text-rose-500 pt-1">
                                    <span>TYPE: {selectedVisitorDetail.autoBlocked ? '🤖 자동 차단 (시스템 탐지)' : '🚫 수동 차단 (관리자)'}</span>
                                    <span>BLOCKED AT: {selectedVisitorDetail.blockedAt ? new Date(selectedVisitorDetail.blockedAt).toLocaleString() : 'N/A'}</span>
                                  </div>
                                </div>
                              )}

                              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex justify-between">
                                <div>
                                  <p className="text-slate-400 text-[10px]">FIRST VISITED</p>
                                  <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                    {selectedVisitorDetail.firstVisitedAt ? new Date(selectedVisitorDetail.firstVisitedAt).toLocaleString() : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-[10px]">LAST ACTIVE</p>
                                  <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                    {selectedVisitorDetail.lastActiveAt ? new Date(selectedVisitorDetail.lastActiveAt).toLocaleString() : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                              <button
                                onClick={() => setSelectedVisitorDetail(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl"
                              >
                                닫기
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Auto-Block Security Rules Configuration Modal */}
                      {showAutoBlockSettingsModal && (
                        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-5"
                          >
                            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-lg">
                                  <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                                    {language === 'en' ? 'Auto-Block & Security Rules' : '비정상 방문자 자동 차단 및 보안 규칙 설정'}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {language === 'en' ? 'Configure real-time automated bot & rate limit blocking.' : '실시간 스캐너, 악성 봇 및 트래픽 과도 요청 자동 차단 기준 관리'}
                                  </p>
                                </div>
                              </div>
                              <button onClick={() => setShowAutoBlockSettingsModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                <X className="w-5 h-5 text-slate-400" />
                              </button>
                            </div>

                            <div className="space-y-4 text-xs">
                              {/* Bot Filter Toggle */}
                              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <Bot className="w-4 h-4 text-purple-500" />
                                    {language === 'en' ? 'Bot & Scanner Auto-Block' : '🤖 웹 스캐너 및 악성 봇 자동 차단'}
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    sqlmap, nikto, python-requests, curl, nmap 등 취약점 탐지 봇 자동 차단
                                  </p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={autoBlockSettings.enableBotFilter}
                                  onChange={(e) => setAutoBlockSettings(prev => ({ ...prev, enableBotFilter: e.target.checked }))}
                                  className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
                                />
                              </div>

                              {/* Rate Limit Burst Filter Toggle */}
                              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                      <Zap className="w-4 h-4 text-amber-500" />
                                      {language === 'en' ? 'Request Burst Rate Limiting' : '⚡ 트래픽 폭주 (DDoS/과도한 요청) 차단'}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      짧은 시간 동안 비정상적으로 다량의 임의 요청을 지속하는 방문자 차단
                                    </p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={autoBlockSettings.enableBurstFilter}
                                    onChange={(e) => setAutoBlockSettings(prev => ({ ...prev, enableBurstFilter: e.target.checked }))}
                                    className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
                                  />
                                </div>

                                {autoBlockSettings.enableBurstFilter && (
                                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                    <div className="flex justify-between items-center text-[11px]">
                                      <span className="font-medium text-slate-600 dark:text-slate-300">분당 최대 허용 요청 수 (Rate Threshold)</span>
                                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                                        {autoBlockSettings.maxRequestsPerMinute}회/분
                                      </span>
                                    </div>
                                    <input
                                      type="range"
                                      min={10}
                                      max={120}
                                      step={5}
                                      value={autoBlockSettings.maxRequestsPerMinute}
                                      onChange={(e) => setAutoBlockSettings(prev => ({ ...prev, maxRequestsPerMinute: Number(e.target.value) }))}
                                      className="w-full accent-rose-600 cursor-pointer"
                                    />
                                    <p className="text-[10px] text-slate-400">권장 기준: 일반 사용자 (10~25회/분), 과도 요청 차단 기준 (30회/분)</p>
                                  </div>
                                )}
                              </div>

                              {/* Anomaly Filter Toggle */}
                              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <Activity className="w-4 h-4 text-blue-500" />
                                    {language === 'en' ? 'Session Anomaly Auto-Detection' : '🔍 세션 이상 행위 및 과도 누적 차단'}
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    단일 세션 내 상호작용 250회 초과 등 비정상 누적 매크로 접속 탐지
                                  </p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={autoBlockSettings.enableAnomalyFilter}
                                  onChange={(e) => setAutoBlockSettings(prev => ({ ...prev, enableAnomalyFilter: e.target.checked }))}
                                  className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
                                />
                              </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                              <button
                                onClick={() => setShowAutoBlockSettingsModal(false)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl"
                              >
                                취소
                              </button>
                              <button
                                onClick={() => saveAutoBlockSettings(autoBlockSettings)}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                {language === 'en' ? 'Save Security Rules' : '규칙 저장 적용'}
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                    {showLogsModal === 'admin' && adminLogs.map((log) => (
                      <div key={log.id} className={`p-4 bg-white dark:bg-slate-900 border-l-4 rounded-r-xl border-y border-r border-slate-200 dark:border-slate-700 text-sm shadow-sm hover:shadow-md transition-shadow ${
                        log.severity === 'error' ? 'border-l-red-500' :
                        log.severity === 'warning' ? 'border-l-amber-500' :
                        log.severity === 'success' ? 'border-l-emerald-500' : 'border-l-blue-500'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-wrap gap-2">
                            <span className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded shadow-sm ${
                              log.action === 'create' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              log.action === 'update' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                              log.action === 'delete' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              log.action === 'verify' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 
                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {log.action}
                            </span>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[9px] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {log.category || 'GENERAL'}
                            </span>
                          </div>
                          <span className="text-slate-400 text-[10px] whitespace-nowrap bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded tabular-nums border border-slate-100 dark:border-slate-700">
                            {log.timestamp?.toDate().toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-900 dark:text-slate-100 font-medium mb-2 leading-relaxed">{log.details}</p>
                        
                        {log.changes && Object.keys(log.changes || {}).length > 0 && (
                          <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-100 dark:border-slate-750 font-mono text-[10px]">
                            <p className="text-slate-400 mb-1 uppercase text-[9px] font-bold">{language === 'en' ? 'Field Changes' : '변경 내역'}</p>
                            <div className="space-y-1.5">
                              {Object.entries(log.changes).map(([field, delta]: [string, any]) => (
                                <div key={field} className="flex flex-col gap-0.5">
                                  <span className="text-blue-600 dark:text-blue-400 font-bold">{field}:</span>
                                  <div className="flex items-center gap-2 pl-2">
                                    <span className="text-red-500 line-through opacity-70 truncate max-w-[150px]">{JSON.stringify(delta.old)}</span>
                                    <ChevronRight className="w-2.5 h-2.5 text-slate-300" />
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[150px]">{JSON.stringify(delta.new)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                                {log.adminEmail?.[0].toUpperCase()}
                            </div>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[150px]">{log.adminEmail}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 italic">
                             ID: {log.targetId?.substring(0, 8)}...
                          </div>
                        </div>
                        {log.metadata && (
                           <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-800/50 flex gap-3 text-[9px] text-slate-400 overflow-hidden">
                              <span className="truncate max-w-[50%]">OS: {log.metadata.platform}</span>
                              <span className="truncate">Lang: {log.metadata.language}</span>
                           </div>
                        )}
                      </div>
                    ))}

                    {showLogsModal === 'search' && searchLogs.map((log) => (
                      <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">
                        <div className="flex justify-between mb-2">
                          <span className="font-bold text-blue-600 dark:text-blue-400">OS: {log.version}</span>
                          <span className="text-slate-400 text-[10px]">{log.timestamp?.toDate().toLocaleString()}</span>
                        </div>
                        <p className="text-slate-900 dark:text-slate-100 font-medium mb-1">"{log.query}"</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">User ID: {log.userId}</p>
                      </div>
                    ))}

                    {showLogsModal === 'feedback' && feedbackLogs.map((log) => (
                      <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">
                        <div className="flex justify-between mb-2">
                          <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${
                            log.isSolved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.isSolved ? 'SOLVED' : 'NOT SOLVED'}
                          </span>
                          <span className="text-slate-400 text-[10px]">{log.timestamp?.toDate().toLocaleString()}</span>
                        </div>
                        <div className="mb-2">
                          <p className="text-slate-900 dark:text-slate-100 font-bold">{log.issueTitle || 'Unknown Issue'}</p>
                          <p className="text-[10px] text-slate-400">ID: {log.issueId}</p>
                        </div>
                        {log.comment && <p className="text-slate-700 dark:text-slate-300 italic mb-1 p-2 bg-white dark:bg-slate-900/50 rounded border border-slate-100 dark:border-slate-800">"{log.comment}"</p>}
                        <p className="text-slate-500 dark:text-slate-400 text-[10px]">User ID: {log.userId}</p>
                      </div>
                    ))}

                    {showLogsModal === 'error' && appErrorLogs.map((log) => (
                      <div key={log.id} className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-rose-100 dark:border-rose-900/30 text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded shrink-0 ${
                            log.severity === 'fatal' ? 'bg-rose-600 text-white' : 
                            log.severity === 'error' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}>
                            {log.severity}
                          </span>
                          <span className="text-slate-400 text-[10px] font-mono shrink-0 ml-2">{log.timestamp?.toDate().toLocaleString()}</span>
                        </div>
                        <div className="mb-2">
                          <p className="text-slate-900 dark:text-slate-100 font-bold break-words leading-relaxed">{log.message}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Component: {log.component}</p>
                        </div>
                        {log.stack && (
                          <details className="mt-2">
                            <summary className="text-[10px] text-blue-500 cursor-pointer hover:underline">View Stack</summary>
                            <pre className="text-[9px] bg-black text-emerald-400 p-2 mt-1 rounded overflow-x-auto max-h-32 font-mono">
                              {typeof log.stack === 'object' ? JSON.stringify(log.stack, null, 2) : log.stack}
                            </pre>
                          </details>
                        )}
                        <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                          <span className="truncate">User: {log.userId}</span>
                        </div>
                      </div>
                    ))}

                    {showLogsModal === 'backend_logs' && backendLogs.map((log) => (
                      <div key={log.id || Math.random()} className="p-4 bg-slate-900 dark:bg-black rounded-xl border border-slate-800 text-xs font-mono">
                        <div className="flex justify-between mb-2 text-slate-500">
                          <span className={`${
                            log.level === 'ERROR' ? 'text-rose-500' : 
                            log.level === 'WARN' ? 'text-amber-500' : 'text-emerald-500'
                          } font-bold`}>[{log.level || 'INFO'}]</span>
                          <span>{log.timestamp?.toLocaleString()}</span>
                        </div>
                        <p className="text-slate-100 leading-relaxed">{log.message}</p>
                        {log.details && <p className="mt-2 text-slate-500 italic opacity-70">Details: {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</p>}
                      </div>
                    ))}

                    {((showLogsModal === 'admin' && adminLogs.length === 0) || 
                      (showLogsModal === 'search' && searchLogs.length === 0) || 
                      (showLogsModal === 'feedback' && feedbackLogs.length === 0) ||
                      (showLogsModal === 'error' && appErrorLogs.length === 0) ||
                      (showLogsModal === 'backend_logs' && backendLogs.length === 0)) && (
                      <div className="text-center py-12">
                        <Database className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">{language === 'en' ? "No logs found." : "기록된 로그가 없습니다."}</p>
                      </div>
                    )}
                  </div>
                  )}
                </div>
                
                {showLogsModal !== 'backend_logs' && showLogsModal !== 'visitor' && (
                  <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        disabled={loadingLogs || (showLogsModal === 'admin' ? logPages.admin === 0 : showLogsModal === 'search' ? logPages.search === 0 : showLogsModal === 'error' ? logPages.error === 0 : logPages.feedback === 0)}
                        onClick={() => {
                          if (showLogsModal === 'admin') fetchAdminLogs(logPages.admin - 1);
                          else if (showLogsModal === 'search') fetchSearchLogs(logPages.search - 1);
                          else if (showLogsModal === 'feedback') fetchFeedbackLogs(logPages.feedback - 1);
                          else if (showLogsModal === 'error') fetchAppErrorLogs(logPages.error - 1);
                        }}
                        className="p-1.5 sm:p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors shrink-0"
                        title={language === 'en' ? "Previous Page" : "이전 페이지"}
                        aria-label={language === 'en' ? "Previous Page" : "이전 페이지"}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 min-w-[70px] sm:min-w-[80px] text-center shrink-0 whitespace-nowrap">
                        {language === 'en' ? 'Page' : '페이지'} {(showLogsModal === 'admin' ? logPages.admin : showLogsModal === 'search' ? logPages.search : showLogsModal === 'error' ? logPages.error : logPages.feedback) + 1}
                      </span>
                      
                      <button
                        disabled={loadingLogs || (showLogsModal === 'admin' ? !logHasMore.admin : showLogsModal === 'search' ? !logHasMore.search : showLogsModal === 'error' ? !logHasMore.error : !logHasMore.feedback)}
                        onClick={() => {
                          if (showLogsModal === 'admin') fetchAdminLogs(logPages.admin + 1);
                          else if (showLogsModal === 'search') fetchSearchLogs(logPages.search + 1);
                          else if (showLogsModal === 'feedback') fetchFeedbackLogs(logPages.feedback + 1);
                          else if (showLogsModal === 'error') fetchAppErrorLogs(logPages.error + 1);
                        }}
                        className="p-1.5 sm:p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors shrink-0"
                        title={language === 'en' ? "Next Page" : "다음 페이지"}
                        aria-label={language === 'en' ? "Next Page" : "다음 페이지"}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => {
                          if (showLogsModal === 'admin') fetchAdminLogs(logPages.admin);
                          else if (showLogsModal === 'search') fetchSearchLogs(logPages.search);
                          else if (showLogsModal === 'feedback') fetchFeedbackLogs(logPages.feedback);
                          else if (showLogsModal === 'error') fetchAppErrorLogs(logPages.error);
                        }}
                        className="ml-1 sm:ml-2 p-1.5 sm:p-2 text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                        title={language === 'en' ? "Refresh Current Page" : "현재 페이지 새로고침"}
                        aria-label={language === 'en' ? "Refresh Current Page" : "현재 페이지 새로고침"}
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    <button
                      onClick={() => setShowLogsModal(null)}
                      className="px-5 sm:px-6 py-2 text-xs sm:text-sm font-bold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 rounded-xl transition-colors shrink-0 whitespace-nowrap active:scale-95 shadow-xs"
                    >
                      {language === 'en' ? 'Close' : '닫기'}
                    </button>
                  </div>
                )}
                
                {showLogsModal === 'backend_logs' && (
                  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            Engine Status (KST: {engineStatus?.currentTimeKST?.split('T')[1]?.split('.')[0] || 'N/A'})
                          </p>
                          <div className={`w-1.5 h-1.5 rounded-full ${engineStatus ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                             Source: {engineStatus?.apiKeySource || 'Loading...'}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                             Key: {engineStatus?.maskedKey || '...'}
                          </span>
                          {engineStatus?.isSyncInProgress && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border border-emerald-300 animate-pulse">
                              RUNNING
                            </span>
                          )}
                          {engineStatus?.isPlaceholder && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              Placeholder Key Detected
                            </span>
                          )}
                        </div>

                        {engineStatus?.telemetry && (
                          <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5 max-w-lg">
                            {/* Model Cache telemetry */}
                            {Object.keys(engineStatus.telemetry.cachedModels || {}).length > 0 && (
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-500 font-semibold">{language === 'en' ? 'Verified Cached Models:' : '검증 캐싱 모델:'}</span>
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {Object.entries(engineStatus.telemetry.cachedModels).map(([kName, model]) => (
                                    <span key={kName} className="px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-mono text-[9px]">
                                      {kName} ➔ {model as string}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Throttled Keys telemetry */}
                            {Object.keys(engineStatus.telemetry.throttledKeys || {}).length > 0 && (
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-amber-600 font-semibold">{language === 'en' ? 'Throttled Keys (Quota Limit):' : '정지된 키 (할당량 회복):'}</span>
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {Object.entries(engineStatus.telemetry.throttledKeys).map(([kName, secs]) => (
                                    <span key={kName} className="px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-mono text-[9px] animate-pulse">
                                      {kName}: {secs as number}s
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Search Throttled Keys telemetry */}
                            {Object.keys(engineStatus.telemetry.searchThrottledKeys || {}).length > 0 && (
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-indigo-600 font-semibold">{language === 'en' ? 'Search Grounding Bypassed (Cooldown):' : '검색 회적 제한 (일반모델 대치):'}</span>
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {Object.entries(engineStatus.telemetry.searchThrottledKeys).map(([kName, secs]) => (
                                    <span key={kName} className="px-1 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-mono text-[9px]">
                                      {kName}: {Math.round((secs as number) / 60)}m
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                          <p className="mt-2 text-[9px] text-amber-600 dark:text-amber-400 leading-tight">
                             * GEMINI_API_KEY는 시스템 예약어입니다. [Secrets]에서 'AI Studio Free Tier' 설정을 유지하세요. 
                             <br />
                             * 직접 발급받은 키는 'CUSTOM_API_KEY' 필드에 입력하세요.
                             <br />
                             <span className="text-red-500 font-bold">
                               1. 구글 클라우드 콘솔(Google Cloud Console) 접속 후 프로젝트 선택<br/>
                               2. [API 및 서비스 &gt; 라이브러리]에서 'Gemini API' 검색 후 [사용(Enable)] 클릭<br/>
                               3. [API 및 서비스 &gt; 사용자 인증 정보] &gt; [+ 사용자 인증 정보 만들기] &gt; <b>'API 키'</b> 선택 (Oauth나 서비스 계정 아님)<br/>
                               4. 생성된 키(AIza...)를 [Secrets]의 'CUSTOM_API_KEY'에 입력하세요.
                             </span>
                          </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={fetchEngineStatus}
                            title={language === 'en' ? "Refresh Status" : "상태 새로고침"}
                            className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isEngineActionLoading ? 'animate-spin' : ''}`} />
                          </button>
                          <button 
                            onClick={runEngineNow}
                            disabled={isEngineActionLoading}
                            className="px-3 py-1.5 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <Zap className="w-3 h-3" />
                            {language === 'en' ? 'RUN NOW' : '즉시 실행'}
                          </button>
                        </div>
                        <button
                          onClick={clearBackendLogs}
                          disabled={isLoadingBackendLogs}
                          className="px-3 py-1 text-[9px] font-bold text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1"
                        >
                           <Trash2 className="w-2.5 h-2.5" />
                           {language === 'en' ? 'Clear All Logs' : '전체 로그 비우기'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-500 italic">
                          {language === 'en' ? 'Showing last 100 autonomous sync events.' : '최근 100건의 자율 동기화 이벤트를 표시하고 있습니다.'}
                        </p>
                        <button
                          onClick={() => fetchBackendLogs(true)}
                          className="ml-2 p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          title={language === 'en' ? "Refresh Logs" : "로그 새로고침"}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackendLogs ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                      <button
                        onClick={() => setShowLogsModal(null)}
                        className="px-6 py-2 text-sm font-bold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 rounded-xl transition-colors"
                      >
                        {language === 'en' ? 'Close' : '닫기'}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReviewModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col"
              >
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {language === 'en' ? 'AI Classification Review' : 'AI 자동 분류 결과 검토'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {language === 'en' 
                          ? `${aiSuggestions.length} items analyzed. Please review before applying.` 
                          : `총 ${aiSuggestions.length}개의 항목이 분석되었습니다. 적용 시 카테고리가 즉시 업데이트됩니다.`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/30">
                  {isReclassifying && (
                    <div className="absolute inset-0 z-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                      <p className="text-sm font-bold text-indigo-600">
                        {language === 'en' ? `Applying changes... (${reclassifyProgress.current}/${reclassifyProgress.total})` : `변경사항 적용 중... (${reclassifyProgress.current}/${reclassifyProgress.total})`}
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {aiSuggestions.map((suggestion, index) => (
                      <div 
                        key={suggestion.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          suggestion.selected 
                            ? 'bg-indigo-50/30 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30' 
                            : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <button 
                            onClick={() => {
                              const newSuggestions = [...aiSuggestions];
                              newSuggestions[index].selected = !newSuggestions[index].selected;
                              setAiSuggestions(newSuggestions);
                            }}
                            className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                              suggestion.selected 
                                ? 'bg-indigo-500 border-indigo-500 text-white' 
                                : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {suggestion.selected && <Check className="w-4 h-4" />}
                          </button>
                          
                          <div className="flex-grow">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">{suggestion.title}</h4>
                            <div className="flex items-center gap-3 text-xs">
                              <div className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">
                                {suggestion.currentCategory}
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                              <div className="px-2.5 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-bold rounded-lg border border-green-200 dark:border-green-500/30 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" />
                                {suggestion.suggestedCategory}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-500">
                    {aiSuggestions.filter(s => s.selected).length} / {aiSuggestions.length} {language === 'en' ? 'Selected' : '항목 선택됨'}
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        const allSelected = aiSuggestions.every(s => s.selected);
                        setAiSuggestions(aiSuggestions.map(s => ({ ...s, selected: !allSelected })));
                      }}
                      className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                      {aiSuggestions.every(s => s.selected) ? (language === 'en' ? 'Deselect All' : '전체 해제') : (language === 'en' ? 'Select All' : '전체 선택')}
                    </button>
                    <button 
                      onClick={applyAISuggestions}
                      disabled={isReclassifying || aiSuggestions.filter(s => s.selected).length === 0}
                      className="px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all"
                    >
                      {isReclassifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {language === 'en' ? 'Apply Selection' : '선택한 결과 적용하기'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <footer className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
          <div className="max-w-4xl mx-auto px-4 space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                개발자: <strong className="text-blue-600 dark:text-blue-400">{DEVELOPER_NAME}</strong> ({GITHUB_USERNAME})
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <a 
                href={OFFICIAL_BLOG_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Globe className="w-3 h-3" />
                공식 구글 블로그
              </a>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <a 
                href={OFFICIAL_AFFILIATION_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Building2 className="w-3 h-3" />
                소속: CISNet
              </a>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <a 
                href={GITHUB_PAGES_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                title="GitHub Pages 공식 웹사이트"
              >
                <Globe className="w-3 h-3" />
                공식 웹사이트
              </a>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <a 
                href={GITHUB_REPO_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 font-medium"
              >
                <Github className="w-3 h-3" />
                GitHub 저장소
              </a>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                v{APP_VERSION}
              </span>
              <button
                onClick={() => checkForUpdates(true)}
                disabled={isCheckingUpdate}
                className="px-2.5 py-0.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-full border border-blue-200 dark:border-blue-900/50 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                <span>{isCheckingUpdate ? "확인 중" : "업데이트 확인"}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              © 2026 Windows Fix Wizard. All rights reserved. | AI-powered Windows Error Diagnostic & Fix Wizard
            </p>
          </div>
        </footer>
        </main>
      )}

      <AnimatePresence>
        {uiDialog.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col"
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${uiDialog.type === 'confirm' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                    {uiDialog.type === 'confirm' ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {uiDialog.type === 'confirm' ? (language === 'en' ? 'Confirmation' : '확인') : (language === 'en' ? 'Notice' : '알림')}
                  </h3>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6 whitespace-pre-line">
                  {uiDialog.message}
                </p>
                <div className="flex justify-end gap-3">
                  {uiDialog.type === 'confirm' && (
                    <button
                      onClick={() => setUiDialog({ ...uiDialog, isOpen: false })}
                      className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                      {language === 'en' ? 'Cancel' : '취소'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setUiDialog({ ...uiDialog, isOpen: false });
                      if (uiDialog.type === 'confirm' && uiDialog.onConfirm) {
                        uiDialog.onConfirm();
                      }
                    }}
                    className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-colors shadow-md ${uiDialog.type === 'confirm' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}
                  >
                    {language === 'en' ? 'OK' : '확인'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!hasAcceptedTos && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {language === 'en' ? 'Terms of Service' : '서비스 이용 약관'}
                  </h3>
                </div>
                <div className="flex bg-slate-200/50 dark:bg-slate-700/50 p-1 rounded-lg">
                  <button
                    onClick={() => setLanguage('ko')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'ko' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    KO
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    EN
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-grow text-sm text-slate-600 dark:text-slate-300 space-y-4">
                {language === 'en' ? (
                  <>
                    <p>Welcome to Windows Fix Wizard. By using this service, you agree to the following terms:</p>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 mt-4">1. Purpose of Service</h4>
                    <p>This service provides AI-powered troubleshooting guides and PowerShell scripts for Windows errors. The information provided is for reference only.</p>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 mt-4">2. Disclaimer of Liability</h4>
                    <p>The scripts and solutions provided by this service are generated by AI and may not be perfect. You are solely responsible for any consequences resulting from the execution of these scripts. We strongly recommend reviewing the scripts before running them and backing up your important data.</p>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 mt-4">3. Data Collection</h4>
                    <p>We may collect anonymous usage data (such as error codes searched) to improve the AI models and the service. We do not collect personally identifiable information without your consent.</p>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 mt-4">4. Administrator Rights</h4>
                    <p>Some scripts may require Administrator privileges to execute successfully. Please ensure you have the necessary rights before proceeding.</p>
                  </>
                ) : (
                  <>
                    <p>Windows Fix Wizard에 오신 것을 환영합니다. 본 서비스를 이용함으로써 귀하는 다음 약관에 동의하게 됩니다:</p>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 mt-4">1. 서비스 목적</h4>
                    <p>본 서비스는 Windows 오류에 대한 AI 기반 문제 해결 가이드 및 PowerShell 스크립트를 제공합니다. 제공되는 정보는 참고용입니다.</p>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 mt-4">2. 책임의 한계</h4>
                    <p>본 서비스에서 제공하는 스크립트 및 해결책은 AI에 의해 생성되며 완벽하지 않을 수 있습니다. 스크립트 실행으로 인해 발생하는 모든 결과에 대한 책임은 전적으로 사용자에게 있습니다. 스크립트를 실행하기 전에 내용을 검토하고 중요한 데이터를 백업할 것을 강력히 권장합니다.</p>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 mt-4">3. 데이터 수집</h4>
                    <p>당사는 AI 모델 및 서비스 개선을 위해 익명의 사용 데이터(예: 검색된 오류 코드)를 수집할 수 있습니다. 귀하의 동의 없이 개인 식별 정보를 수집하지 않습니다.</p>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 mt-4">4. 관리자 권한</h4>
                    <p>일부 스크립트는 성공적으로 실행하기 위해 관리자 권한이 필요할 수 있습니다. 진행하기 전에 필요한 권한이 있는지 확인하십시오.</p>
                  </>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
                <button
                  onClick={() => {
                    localStorage.setItem('winfix_tos_accepted', 'true');
                    setHasAcceptedTos(true);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {language === 'en' ? 'I Agree and Continue' : '동의하고 계속하기'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Blocked Visitor Overlay Modal */}
      {isCurrentVisitorBlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-rose-500/80 p-8 max-w-md w-full shadow-2xl text-center space-y-4 relative overflow-hidden">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {language === 'en' ? 'Access Restricted' : '서비스 접속 제한 안내'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'en'
                  ? 'Your session or device has been blocked by security policies.'
                  : '보안 가드레일에 의해 접속이 차단되었습니다.'}
              </p>
            </div>

            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-left text-xs space-y-1">
              <p className="font-bold text-[10px] text-rose-500 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                SECURITY DETECTED REASON
              </p>
              <p className="font-semibold text-rose-800 dark:text-rose-300 font-mono text-[11px]">
                {visitorBlockReason || '비정상 트래픽 / 스캐너 / 접속 제한 지침에 의한 차단'}
              </p>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {language === 'en'
                ? 'If you believe this is a false positive, please contact system administrator.'
                : '정상적인 접속임에도 차단된 경우, 관리자에게 문의하여 해제를 요청하시기 바랍니다.'}
            </p>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                새로고침 (Refresh)
              </button>
              {isAdmin && (
                <button
                  onClick={() => setIsCurrentVisitorBlocked(false)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  관리자 닫기 (Admin Override)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schema Validation Report Modal */}
      {validationReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${validationReportModal.isValid ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'}`}>
                  {validationReportModal.isValid ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    {language === 'en' ? 'KnownIssue Schema Validation Report' : 'KnownIssue 스키마 규격 검증 보고서'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {validationReportModal.isValid
                      ? (language === 'en' ? 'All records are 100% compliant with the required schema.' : '모든 레코드가 규격 스키마와 100% 일치합니다.')
                      : (language === 'en' ? 'Discrepancies found in imported dataset.' : '가져올 데이터셋에서 규격 불일치 항목이 발견되었습니다.')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setValidationReportModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-center">
                  <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{language === 'en' ? 'Total Checked' : '총 검증 레코드'}</span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">{validationReportModal.totalRecords}</span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 text-center">
                  <span className="block text-xs font-medium text-emerald-600 dark:text-emerald-400">{language === 'en' ? 'Schema Valid' : '규격 일치'}</span>
                  <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1 block">{validationReportModal.validCount}</span>
                </div>
                <div className={`p-3.5 rounded-2xl border text-center ${validationReportModal.invalidCount > 0 ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60'}`}>
                  <span className={`block text-xs font-medium ${validationReportModal.invalidCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>{language === 'en' ? 'Discrepancies' : '규격 불일치'}</span>
                  <span className={`text-xl font-extrabold mt-1 block ${validationReportModal.invalidCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-slate-100'}`}>{validationReportModal.invalidCount}</span>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-800/60 text-center">
                  <span className="block text-xs font-medium text-amber-600 dark:text-amber-400">{language === 'en' ? 'Warnings' : '주의 항목'}</span>
                  <span className="text-xl font-extrabold text-amber-700 dark:text-amber-300 mt-1 block">{validationReportModal.warnings.length}</span>
                </div>
              </div>

              {/* Errors & Discrepancies Details */}
              {validationReportModal.errors.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    {language === 'en' ? 'Discrepancy Log' : '규격 불일치 내역'} ({validationReportModal.errors.length})
                  </h4>
                  <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 max-h-56 overflow-y-auto space-y-2 font-mono text-xs">
                    {validationReportModal.errors.map((err, idx) => (
                      <div key={idx} className="text-rose-700 dark:text-rose-300 flex items-start gap-2">
                        <span className="text-rose-400 select-none">•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings List */}
              {validationReportModal.warnings.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    {language === 'en' ? 'Schema Warnings' : '스키마 권장/주의 사항'} ({validationReportModal.warnings.length})
                  </h4>
                  <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 max-h-40 overflow-y-auto space-y-2 font-mono text-xs">
                    {validationReportModal.warnings.map((warn, idx) => (
                      <div key={idx} className="text-amber-700 dark:text-amber-300 flex items-start gap-2">
                        <span className="text-amber-400 select-none">•</span>
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validationReportModal.isValid && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <p className="text-xs font-semibold">
                    {language === 'en'
                      ? 'This backup dataset is 100% compliant with the KnownIssue schema and safe for database restoration.'
                      : '이 백업 데이터셋은 KnownIssue 스키마 규격과 100% 일치하며 데이터베이스 복원에 안전합니다.'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end gap-3">
              <button
                onClick={() => setValidationReportModal(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all"
              >
                {language === 'en' ? 'Close Report' : '보고서 닫기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Last-Known-Good Snapshot Metadata Read-Only Modal */}
      {showLkgDetailsModal && lastKnownGoodInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    {language === 'en' ? 'Last-Known-Good Snapshot Metadata' : '직전 정상 백업(Last-Known-Good) 스냅샷 메타데이터'}
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    {language === 'en' ? 'Read-only automatic pre-import state backup summary' : '불러오기 직전 자동 보관된 정상 상태 메타데이터 (읽기 전용)'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLkgDetailsModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
              {/* Top Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {language === 'en' ? 'Snapshot Timestamp' : '백업 시각'}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                    {new Date(lastKnownGoodInfo.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-800/60">
                  <span className="block text-[11px] font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    {language === 'en' ? 'Total Records' : '총 레코드 수'}
                  </span>
                  <span className="text-lg font-extrabold text-amber-900 dark:text-amber-200 mt-0.5 block">
                    {lastKnownGoodInfo.totalRecords}개
                  </span>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="block text-[11px] font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {language === 'en' ? 'Rollback Status' : '복원 준비 상태'}
                  </span>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mt-1 block">
                    {language === 'en' ? 'Verified & Ready' : '보관 완료 (즉시 롤백 가능)'}
                  </span>
                </div>
              </div>

              {/* Collections Breakdown Summary */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Layers className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  {language === 'en' ? 'Collection Records Summary' : '컬렉션별 보관 항목 수 요약'}
                </h4>
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2 text-xs">
                  {lastKnownGoodInfo.collections ? (
                    Object.entries(lastKnownGoodInfo.collections).map(([colName, count]) => (
                      <div key={colName} className="flex items-center justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-700/60 last:border-0">
                        <div className="flex items-center gap-2 font-mono text-slate-700 dark:text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span className="font-semibold">{colName}</span>
                          <span className="text-[10px] text-slate-400 font-sans">
                            ({colName === 'issues' ? '윈도우 이슈/솔루션' : colName === 'feedback' ? '사용자 피드백' : colName === 'bookmarks' ? '즐겨찾기' : colName === 'admin_logs' ? '관리자 로그' : '시스템 설정'})
                          </span>
                        </div>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                          {count}개
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between py-1.5 font-mono">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">issues</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        {lastKnownGoodInfo.totalRecords}개
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Automated Retention & Purge Policy Section */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {language === 'en' ? 'Automated Purge & Retention Policy' : '자동 스냅샷 정리 및 보존 정책'}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    {language === 'en' ? `Limit: ${lastKnownGoodInfo.retentionCount || 7} Snapshots` : `보존 한도: 최근 ${lastKnownGoodInfo.retentionCount || 7}개`}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {language === 'en'
                    ? `Old pre-import snapshots exceeding the retention limit (${lastKnownGoodInfo.retentionCount || 7}) are automatically purged upon new imports to conserve storage.`
                    : `불러오기 시 보존 한도(${lastKnownGoodInfo.retentionCount || 7}개)를 초과하는 오래된 스냅샷은 서버 디스크 용량을 최적화하기 위해 자동으로 영구 정리됩니다.`}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {language === 'en' ? `Stored Snapshots: ${lastKnownGoodInfo.storedSnapshotsCount || 1}` : `현재 보관 중인 히스토리 스냅샷: ${lastKnownGoodInfo.storedSnapshotsCount || 1}개`}
                  </span>
                  <button
                    onClick={() => handlePurgeOldSnapshots(lastKnownGoodInfo.retentionCount || 7)}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    {language === 'en' ? 'Run Purge Policy Now' : '오래된 스냅샷 수동 정리 실행'}
                  </button>
                </div>
              </div>

              {/* Information / Transparency Note */}
              <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-4 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  {language === 'en'
                    ? 'This snapshot was automatically created immediately prior to the latest import/restore process. Triggering a restore will replace the current live database state with these exact saved records.'
                    : '이 스냅샷은 가장 최근 데이터 불러오기/복원 작업 직전에 자동으로 생성되었습니다. 롤백을 실행하면 현재의 데이터베이스가 이 보관된 시점의 정상 데이터로 완벽히 원복됩니다.'}
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowLkgDetailsModal(false);
                    handleRestoreLastKnownGood();
                  }}
                  disabled={isImporting}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  {language === 'en' ? 'Restore This Snapshot' : '이 스냅샷으로 롤백 복원 실행'}
                </button>
                <button
                  onClick={handleDownloadLastKnownGoodJson}
                  className="px-4 py-2.5 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-bold text-xs rounded-xl transition-all border border-amber-300/60 dark:border-amber-700/60 flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <Download className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                  {language === 'en' ? 'Download Snapshot (JSON)' : '스냅샷 파일 다운로드 (JSON)'}
                </button>
              </div>
              <button
                onClick={() => setShowLkgDetailsModal(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                {language === 'en' ? 'Close' : '닫기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scroll Top/Bottom Buttons (compact floating at bottom corner to prevent covering card content) */}
      <div className="fixed bottom-20 right-2 sm:bottom-24 sm:right-4 md:bottom-8 md:right-6 z-40 flex flex-col items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title={language === 'en' ? 'Scroll to Top' : '최상단으로 이동'}
          aria-label={language === 'en' ? 'Scroll to Top' : '최상단으로 이동'}
          className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/70 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-600 dark:text-slate-300 transition-all duration-200 shadow-xs active:scale-95 group relative"
        >
          <ChevronsUp className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:-translate-y-0.5" />
          <span className="hidden sm:block absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/90 dark:bg-slate-100/95 text-white dark:text-slate-900 text-xs font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md border border-slate-700 dark:border-slate-300">
            {language === 'en' ? 'Top' : '최상단'}
          </span>
        </button>

        <div className="w-3.5 sm:w-4 h-[1px] bg-slate-200 dark:bg-slate-700/80" />

        <button
          onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight || document.body.scrollHeight, behavior: 'smooth' })}
          title={language === 'en' ? 'Scroll to Bottom' : '최하단으로 이동'}
          aria-label={language === 'en' ? 'Scroll to Bottom' : '최하단으로 이동'}
          className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/70 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-600 dark:text-slate-300 transition-all duration-200 shadow-xs active:scale-95 group relative"
        >
          <ChevronsDown className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-y-0.5" />
          <span className="hidden sm:block absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/90 dark:bg-slate-100/95 text-white dark:text-slate-900 text-xs font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md border border-slate-700 dark:border-slate-300">
            {language === 'en' ? 'Bottom' : '최하단'}
          </span>
        </button>
      </div>

      {/* =========================================================================
          GitHub Releases Real-Time Auto-Update Notification Modal
          ========================================================================= */}
      <AnimatePresence>
        {updateModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 25 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200/90 dark:border-slate-800 flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative">
                <button
                  onClick={() => setUpdateModalOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors"
                  aria-label="Close update modal"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                    <Rocket className="w-5 h-5 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950">
                      Update Available
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                      {language === 'en' ? 'New Version Available!' : '새로운 버전 업데이트 알림'}
                    </h3>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
                  <span className="text-xs text-white/80 font-medium">현재 버전:</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/15 font-mono text-xs font-bold">
                    v{updateInfo?.currentVersion || APP_VERSION}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-xs text-white/80 font-medium">최신 버전:</span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-400 text-slate-950 font-mono text-xs font-extrabold shadow-xs">
                    v{updateInfo?.latestVersion || APP_VERSION}
                  </span>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
                {/* Release Name & Date */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {updateInfo?.releaseName || `Windows Fix Wizard v${updateInfo?.latestVersion}`}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>배포일: {updateInfo?.publishedAt ? new Date(updateInfo.publishedAt).toLocaleDateString() : '최신'}</span>
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-semibold text-[11px]">
                    GitHub Releases
                  </span>
                </div>

                {/* Release Notes Preview */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>업데이트 주요 변경 내역</span>
                  </h4>
                  <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono max-h-40 overflow-y-auto custom-scrollbar border border-slate-800 leading-relaxed whitespace-pre-line">
                    {updateInfo?.releaseNotes || '새로운 안정성 개선 및 크로스 플랫폼 최적화가 포함되었습니다.'}
                  </div>
                </div>

                {/* Installer Package Notice (Installer only) */}
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-semibold">공식 인스톨러 배포:</strong> 개별 파일 풀림(Unpacked Multi-File) 무인 설치 및 방화벽 자동 사전 등록이 적용된 전용 설치 패키지입니다.
                    <div className="text-[11px] font-mono mt-1 text-blue-700 dark:text-blue-300">
                      📦 {updateInfo?.installerName || `Windows-Fix-Wizard-Setup-v${updateInfo?.latestVersion || APP_VERSION}.exe`}
                    </div>
                  </div>
                </div>

                {/* Creator and Official Channels Card */}
                <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>제작자 및 공식 채널 안내</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 text-slate-600 dark:text-slate-400">
                    <div>
                      • 개발자: <strong className="text-slate-900 dark:text-slate-100">{DEVELOPER_NAME}</strong> ({GITHUB_USERNAME})
                    </div>
                    <div>
                      • 소속: <a href={OFFICIAL_AFFILIATION_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">CISNet (cisnet.co.kr)</a>
                    </div>
                    <div className="sm:col-span-2">
                      • 공식 블로그: <a href={OFFICIAL_BLOG_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://ahbiyoutvibe.blogspot.com/</a>
                    </div>
                    <div className="sm:col-span-2">
                      • 공식 웹사이트: <a href={updateInfo?.pagesUrl || GITHUB_PAGES_URL} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline break-all">{updateInfo?.pagesUrl || GITHUB_PAGES_URL}</a>
                    </div>
                    <div className="sm:col-span-2">
                      • GitHub 경로: <a href={updateInfo?.repoUrl || GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{updateInfo?.repoUrl || GITHUB_REPO_URL}</a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  onClick={() => {
                    // Snooze for 24 hours
                    localStorage.setItem('winfix_update_snooze_until', (Date.now() + 24 * 60 * 60 * 1000).toString());
                    setUpdateModalOpen(false);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline self-start sm:self-auto"
                >
                  {language === 'en' ? 'Remind me tomorrow (24h)' : '24시간 동안 알림 숨기기'}
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <a
                    href={updateInfo?.htmlUrl || updateInfo?.repoUrl || GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>GitHub 릴리즈</span>
                  </a>

                  <a
                    href={updateInfo?.installerDownloadUrl || updateInfo?.htmlUrl || GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setUpdateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Update & Download' : '지금 업데이트 다운로드'}</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* GITOPS AUTONOMOUS DATA HARVESTING FULL GUIDEBOOK MODAL */}
        {showGitOpsGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/60 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        {language === 'en'
                          ? 'GitHub Actions & GitOps Autonomous Engine Guide'
                          : 'GitHub Actions & GitOps 자율 데이터 수집 시스템 구축 가이드'}
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        v3.11.0 Master
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200/80 mt-0.5">
                      {language === 'en'
                        ? 'Zero-cost 24/7 cloud runner + Gemini AI Web Grounding + Immutable Git persistence'
                        : '서버 과금 0원 무료 클라우드 크론 + Gemini 실시간 검색 그라운딩 + Git 불변 데이터 보존'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGitOpsGuideModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex items-center gap-1.5 p-2 sm:px-4 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-semibold shrink-0">
                {[
                  { id: 'architecture', label: language === 'en' ? '🏗️ Architecture' : '🏗️ 아키텍처 & 흐름' },
                  { id: 'permissions', label: language === 'en' ? '🚨 403 Write Permissions' : '🚨 403 권한 해결 (필수)' },
                  { id: 'secrets', label: language === 'en' ? '🔑 Repository Secrets' : '🔑 필수 Secrets 등록' },
                  { id: 'cron', label: language === 'en' ? '⏰ Cron & KST Times' : '⏰ 크론 & 한국시간' },
                  { id: 'cli', label: language === 'en' ? '💻 CLI Terminal Run' : '💻 터미널 직접 실행' },
                  { id: 'yaml', label: language === 'en' ? '📜 Workflow YAML' : '📜 워크플로 YAML' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setGitOpsGuideActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                      gitOpsGuideActiveTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm leading-relaxed custom-scrollbar">
                {gitOpsGuideActiveTab === 'architecture' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60">
                      <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-sm mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        핵심 설계 철학: 서버 0원 운영 + GitOps 불변성
                      </h4>
                      <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                        상시 켜두어야 하는 유료 가상서버 대신, GitHub의 무료 Ubuntu 컨테이너가 매 6시간마다 기동되어 Gemini AI로 최신 Windows 오류를 수집합니다. 수집된 데이터는 Git 커밋을 통해 영구 보존되며, GitHub Raw CDN 및 GitHub Pages 웹사이트를 통해 전 세계로 즉시 무상 배포됩니다.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-blue-500" />
                          1. 6시간 주기 자동 스케줄
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">
                          GitHub Actions cron(0 */6 * * *)이 정기적으로 Ubuntu 22 LTS 런타임을 준비합니다.
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-purple-500" />
                          2. Gemini AI 실시간 웹 그라운딩
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">
                          Google Search를 연동하여 MS 공식 지원 문서와 최신 Windows 10/11 24H2/23H2 트렌드를 직접 검색합니다.
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                          <GitBranch className="w-4 h-4 text-emerald-500" />
                          3. 중복 제거 & Git 자동 커밋
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">
                          기존 50+개 오류 코드와 중복을 100% 필터링하고 data/issues.json에 누적 커밋 및 푸시합니다.
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-500" />
                          4. 웹앱 실시간 웹훅 & CDN 배포
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">
                          앱(/api/github/sync) 웹훅으로 전송되어 화면 및 Firestore에 즉각 반영되며 정적 웹에서도 즉시 조회됩니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {gitOpsGuideActiveTab === 'permissions' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs space-y-2">
                      <div className="font-bold flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                        <AlertCircle className="w-4 h-4" />
                        가장 흔히 겪는 "403 Permission Denied" 오류 해결 필수 조치!
                      </div>
                      <p>
                        GitHub의 기본 보안 정책상, Actions 봇은 새 저장소에서 <strong>읽기 전용(Read only)</strong>으로 설정되어 있습니다. 아래 3단계를 완료해야 봇이 수집한 데이터를 Git 저장소로 <code>git push</code>할 수 있습니다.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                          1단계. 저장소 Settings 이동
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          GitHub 저장소 상단 탭에서 <strong>Settings</strong>를 클릭한 후, 좌측 메뉴에서 <strong>Actions</strong> &gt; <strong>General</strong>을 클릭합니다.
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                          2단계. Workflow permissions를 "Read and write permissions"로 변경
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                          페이지 맨 아래쪽의 <strong>Workflow permissions</strong> 항목으로 내려가서 아래 라디오 버튼을 선택합니다:
                        </p>
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 font-mono text-xs font-semibold">
                          ◉ Read and write permissions (Workflows have read and write permissions in the repository)
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                          3단계. PR 생성 허용 및 Save 저장
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          바로 아래의 <strong>"Allow GitHub Actions to create and approve pull requests"</strong> 체크박스를 켜고 초록색 <strong>Save</strong> 버튼을 누르면 설정이 즉시 적용됩니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {gitOpsGuideActiveTab === 'secrets' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      저장소 <strong>Settings &gt; Secrets and variables &gt; Actions</strong> 메뉴의 <strong>New repository secret</strong> 버튼으로 아래 항목들을 등록합니다:
                    </p>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-3 font-bold">Secret Name</th>
                            <th className="p-3 font-bold">필수 여부</th>
                            <th className="p-3 font-bold">설명 및 예시</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">GEMINI_API_KEY</td>
                            <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">필수 (Required)</span></td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              Google AI Studio에서 발급받은 Gemini API 키 (<span className="font-mono">AIzaSy...</span>)
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">APP_WEBHOOK_URL</td>
                            <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">권장 (실시간 앱 동기화)</span></td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              운영 중인 웹 앱 도메인 주소 (<span className="font-mono">{window.location.origin}</span>)
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">CRON_SECRET</td>
                            <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">선택 (보안 인증)</span></td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              웹훅 위변조 방지용 비밀 키 (본 앱 환경변수 <span className="font-mono">CRON_SECRET</span>과 일치)
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {gitOpsGuideActiveTab === 'cron' && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        GitHub Actions Cron 시간대 매핑 규칙 (UTC vs KST)
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">
                        GitHub Actions의 스케줄 크론은 세계 표준시(UTC)를 기준으로 실행됩니다. 한국 시간(KST)은 UTC보다 9시간 빠릅니다 (UTC+9).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-xs">
                        <div className="font-bold text-indigo-600 dark:text-indigo-400 font-mono mb-1">0 */6 * * * (권장)</div>
                        <div className="text-slate-800 dark:text-slate-200 font-semibold text-xs mb-1">매 6시간 주기 (하루 4회)</div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                          KST: <strong>09:00, 15:00, 21:00, 03:00</strong>
                        </div>
                      </div>

                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="font-bold text-slate-700 dark:text-slate-300 font-mono mb-1">0 */4 * * *</div>
                        <div className="text-slate-800 dark:text-slate-200 font-semibold text-xs mb-1">매 4시간 주기 (하루 6회)</div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                          KST: 09:00, 13:00, 17:00, 21:00...
                        </div>
                      </div>

                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="font-bold text-slate-700 dark:text-slate-300 font-mono mb-1">0 0,12 * * *</div>
                        <div className="text-slate-800 dark:text-slate-200 font-semibold text-xs mb-1">출퇴근 시간 (하루 2회)</div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                          KST: 09:00, 21:00
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {gitOpsGuideActiveTab === 'cli' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      GitHub Actions에 푸시하기 전, 개발자의 로컬 PC 터미널에서 즉시 수집기를 실행하여 정상 작동하는지 테스트할 수 있습니다:
                    </p>

                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                          <span>1. Windows PowerShell 환경</span>
                        </div>
                        <pre className="text-xs font-mono p-3 bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 overflow-x-auto">
{`$env:INPUT_TOPIC="시스템/블루스크린"
$env:BATCH_SIZE="3"
npm run collect:github`}
                        </pre>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                          <span>2. Windows 명령 프롬프트 (CMD) 환경</span>
                        </div>
                        <pre className="text-xs font-mono p-3 bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 overflow-x-auto">
{`set INPUT_TOPIC=업데이트
set BATCH_SIZE=2
npm run collect:github`}
                        </pre>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                          <span>3. Linux / macOS / Git Bash 환경</span>
                        </div>
                        <pre className="text-xs font-mono p-3 bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 overflow-x-auto">
{`INPUT_TOPIC="네트워크" BATCH_SIZE=2 npm run collect:github`}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {gitOpsGuideActiveTab === 'yaml' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-500">.github/workflows/windows-fix-collector.yml</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(GITHUB_WORKFLOW_YAML);
                          setCopiedWorkflow(true);
                          setTimeout(() => setCopiedWorkflow(false), 2500);
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        {copiedWorkflow ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedWorkflow ? '복사 완료' : 'YAML 복사'}</span>
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto text-emerald-400 max-h-96 custom-scrollbar">
                      {GITHUB_WORKFLOW_YAML}
                    </pre>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <a
                  href={`${GITHUB_REPO_URL}/settings/actions`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>GitHub 저장소 Actions 권한 설정 바로가기</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const markdownDoc = `# GitHub Actions & GitOps 자율 데이터 수집 시스템 구축 가이드\n\n` +
                        `- 상세 문서는 저장소의 /docs/GITHUB_ACTIONS_GUIDE.md 에서 확인하실 수 있습니다.\n` +
                        `- 워크플로 파일: .github/workflows/windows-fix-collector.yml\n\n` +
                        GITHUB_WORKFLOW_YAML;
                      navigator.clipboard.writeText(markdownDoc);
                      setCopiedGuideMarkdown(true);
                      setTimeout(() => setCopiedGuideMarkdown(false), 2500);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    {copiedGuideMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedGuideMarkdown ? '복사됨' : '가이드 복사'}</span>
                  </button>

                  <button
                    onClick={() => setShowGitOpsGuideModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-xs"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
