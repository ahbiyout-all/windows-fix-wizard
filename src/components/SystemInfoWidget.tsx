import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Globe, 
  Cpu, 
  Copy, 
  Check, 
  Filter, 
  Sparkles, 
  Maximize2, 
  Info, 
  Smartphone, 
  Wifi, 
  Layers, 
  ChevronRight,
  ShieldCheck,
  HardDrive
} from 'lucide-react';

export interface SystemInfoData {
  osName: string;
  osVersion: string;
  matchedVersionFilter: string; // 'Windows 11' | 'Windows 10' | 'Windows 8.1' | 'Windows 7' | 'Other'
  browserName: string;
  browserVersion: string;
  screenResolution: string;
  viewportSize: string;
  devicePixelRatio: number;
  colorDepth: number;
  cpuCores: number | string;
  deviceMemory: number | string;
  language: string;
  timezone: string;
  isOnline: boolean;
  userAgent: string;
  gpuRenderer: string;
  isTouchDevice: boolean;
}

interface SystemInfoWidgetProps {
  language: 'en' | 'kr';
  selectedVersionFilter: string;
  onApplyVersionFilter: (version: string) => void;
  guidebookQuery: string;
  onUpdateSearchQuery: (query: string) => void;
  className?: string;
}

export const detectSystemInfo = async (): Promise<SystemInfoData> => {
  const ua = navigator.userAgent;
  let osName = 'Unknown OS';
  let osVersion = '';
  let matchedVersionFilter = '전체';

  // High entropy user agent data check if available (Chrome / Edge modern)
  let highEntropyData: any = null;
  if ((navigator as any).userAgentData?.getHighEntropyValues) {
    try {
      highEntropyData = await (navigator as any).userAgentData.getHighEntropyValues([
        'platformVersion',
        'architecture',
        'model',
        'bitness'
      ]);
    } catch (e) {
      // ignore
    }
  }

  // OS Detection
  if (ua.includes('Win')) {
    osName = 'Windows';
    if (highEntropyData && highEntropyData.platformVersion) {
      const majorVersion = parseInt(highEntropyData.platformVersion.split('.')[0], 10);
      // In Chromium userAgentData, platformVersion >= 13.0.0 represents Windows 11
      if (majorVersion >= 13) {
        osVersion = '11';
        matchedVersionFilter = 'Windows 11';
      } else {
        osVersion = '10';
        matchedVersionFilter = 'Windows 10';
      }
    } else {
      if (ua.includes('Windows NT 10.0')) {
        // Default to Windows 10/11
        osVersion = '10/11';
        matchedVersionFilter = 'Windows 11'; // default modern preference
      } else if (ua.includes('Windows NT 6.3')) {
        osVersion = '8.1';
        matchedVersionFilter = 'Windows 8.1';
      } else if (ua.includes('Windows NT 6.1')) {
        osVersion = '7';
        matchedVersionFilter = 'Windows 7';
      } else {
        osVersion = 'Legacy';
      }
    }
  } else if (ua.includes('Mac')) {
    osName = 'macOS';
    matchedVersionFilter = 'Other';
  } else if (ua.includes('Linux')) {
    osName = 'Linux';
    matchedVersionFilter = 'Other';
  } else if (ua.includes('Android')) {
    osName = 'Android';
    matchedVersionFilter = 'Other';
  } else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) {
    osName = 'iOS';
    matchedVersionFilter = 'Other';
  }

  // Browser Detection
  let browserName = 'Browser';
  let browserVersion = '';

  if (ua.includes('Edg/')) {
    browserName = 'Microsoft Edge';
    const match = ua.match(/Edg\/([\d.]+)/);
    if (match) browserVersion = match[1].split('.')[0];
  } else if (ua.includes('Chrome/')) {
    browserName = 'Google Chrome';
    const match = ua.match(/Chrome\/([\d.]+)/);
    if (match) browserVersion = match[1].split('.')[0];
  } else if (ua.includes('Firefox/')) {
    browserName = 'Mozilla Firefox';
    const match = ua.match(/Firefox\/([\d.]+)/);
    if (match) browserVersion = match[1].split('.')[0];
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browserName = 'Apple Safari';
    const match = ua.match(/Version\/([\d.]+)/);
    if (match) browserVersion = match[1].split('.')[0];
  } else if (ua.includes('OPR/') || ua.includes('Opera/')) {
    browserName = 'Opera';
    const match = ua.match(/(?:OPR|Opera)\/([\d.]+)/);
    if (match) browserVersion = match[1].split('.')[0];
  }

  // WebGL GPU Renderer
  let gpuRenderer = 'N/A';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuRenderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'N/A';
      }
    }
  } catch (e) {
    // ignore
  }

  return {
    osName,
    osVersion,
    matchedVersionFilter,
    browserName,
    browserVersion,
    screenResolution: `${window.screen.width} x ${window.screen.height}`,
    viewportSize: `${window.innerWidth} x ${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio || 1,
    colorDepth: window.screen.colorDepth || 24,
    cpuCores: navigator.hardwareConcurrency || 'N/A',
    deviceMemory: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'N/A',
    language: navigator.language || 'en-US',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    isOnline: navigator.onLine,
    userAgent: navigator.userAgent,
    gpuRenderer,
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0
  };
};

export const SystemInfoWidget: React.FC<SystemInfoWidgetProps> = ({
  language,
  selectedVersionFilter,
  onApplyVersionFilter,
  guidebookQuery,
  onUpdateSearchQuery,
  className = ''
}) => {
  const [sysInfo, setSysInfo] = useState<SystemInfoData | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {
    detectSystemInfo().then(info => setSysInfo(info));

    const handleResize = () => {
      setSysInfo(prev => prev ? {
        ...prev,
        viewportSize: `${window.innerWidth} x ${window.innerHeight}`
      } : null);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!sysInfo) return null;

  const handleCopyDiagnostics = () => {
    const diagText = [
      `=== WinFix Diagnostic System Context ===`,
      `OS: ${sysInfo.osName} ${sysInfo.osVersion}`.trim(),
      `Browser: ${sysInfo.browserName} ${sysInfo.browserVersion}`,
      `Display Resolution: ${sysInfo.screenResolution} (Viewport: ${sysInfo.viewportSize}, DPR: ${sysInfo.devicePixelRatio})`,
      `Hardware: ${sysInfo.cpuCores} CPU Cores | Memory: ${sysInfo.deviceMemory}`,
      `GPU: ${sysInfo.gpuRenderer}`,
      `Language: ${sysInfo.language} | Timezone: ${sysInfo.timezone}`,
      `Network: ${sysInfo.isOnline ? 'Online' : 'Offline'}`,
      `UserAgent: ${sysInfo.userAgent}`,
      `=======================================`
    ].join('\n');

    navigator.clipboard.writeText(diagText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAppendOsToSearch = () => {
    const osKeyword = sysInfo.matchedVersionFilter !== 'Other' ? sysInfo.matchedVersionFilter : `${sysInfo.osName} ${sysInfo.osVersion}`.trim();
    if (!guidebookQuery.toLowerCase().includes(osKeyword.toLowerCase())) {
      const newQuery = guidebookQuery ? `${guidebookQuery} ${osKeyword}` : osKeyword;
      onUpdateSearchQuery(newQuery);
    }
  };

  const isCurrentFilterApplied = selectedVersionFilter === sysInfo.matchedVersionFilter;

  return (
    <div className={`bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 shadow-xl border border-slate-700/60 relative overflow-hidden transition-all ${className}`}>
      {/* Background Accent Mesh */}
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Bar */}
      <div className={`flex items-center justify-between ${isMinimized ? 'mb-0' : 'mb-3'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Monitor className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              {language === 'en' ? 'System Info Context Auto-Detected' : '사용자 시스템 환경 자동 감지'}
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block shrink-0" />
            </h4>
            {isMinimized && (
              <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">
                {sysInfo.osName} {sysInfo.osVersion} · {sysInfo.browserName} · {sysInfo.screenResolution}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 transition-colors"
          >
            {isMinimized 
              ? (language === 'en' ? 'Expand' : '펼치기') 
              : (language === 'en' ? 'Collapse' : '접기')}
          </button>
          
          <button
            onClick={() => setShowDetailModal(true)}
            title={language === 'en' ? 'View Complete System Specs' : '전체 상세 시스템 명세 보기'}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Main Detected Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {/* OS Badge */}
            <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase tracking-tight">{language === 'en' ? 'OS Version' : '운영체제(OS)'}</div>
                <div className="text-xs font-bold text-white truncate">{sysInfo.osName} {sysInfo.osVersion}</div>
              </div>
            </div>

            {/* Browser Badge */}
            <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase tracking-tight">{language === 'en' ? 'Browser' : '웹 브라우저'}</div>
                <div className="text-xs font-bold text-white truncate">{sysInfo.browserName} {sysInfo.browserVersion && `v${sysInfo.browserVersion}`}</div>
              </div>
            </div>

            {/* Screen Resolution */}
            <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase tracking-tight">{language === 'en' ? 'Display Res' : '해상도'}</div>
                <div className="text-xs font-bold text-white truncate">{sysInfo.screenResolution}</div>
              </div>
            </div>

            {/* Hardware Quick Info */}
            <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase tracking-tight">{language === 'en' ? 'Hardware' : 'CPU / 메모리'}</div>
                <div className="text-xs font-bold text-white truncate">
                  {sysInfo.cpuCores !== 'N/A' ? `${sysInfo.cpuCores} Cores` : 'Std CPU'} {sysInfo.deviceMemory !== 'N/A' && `| ${sysInfo.deviceMemory}`}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Context Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {language === 'en' 
                  ? `Optimized for ${sysInfo.matchedVersionFilter !== 'Other' ? sysInfo.matchedVersionFilter : sysInfo.osName}` 
                  : `${sysInfo.matchedVersionFilter !== 'Other' ? sysInfo.matchedVersionFilter : sysInfo.osName} 오류 검색 가이드 연동 완료`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Filter by OS Button */}
              {sysInfo.matchedVersionFilter !== 'Other' && (
                <button
                  onClick={() => onApplyVersionFilter(isCurrentFilterApplied ? '전체' : sysInfo.matchedVersionFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                    isCurrentFilterApplied
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  {isCurrentFilterApplied
                    ? (language === 'en' ? `Filter Applied: ${sysInfo.matchedVersionFilter}` : `OS 필터 적용됨 (${sysInfo.matchedVersionFilter})`)
                    : (language === 'en' ? `Auto-Filter: ${sysInfo.matchedVersionFilter}` : `${sysInfo.matchedVersionFilter} 전용 필터 적용`)}
                </button>
              )}

              {/* Append OS to Search Box */}
              <button
                onClick={handleAppendOsToSearch}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1 transition-colors"
                title={language === 'en' ? 'Add detected OS to search input' : '검색창에 감지된 OS 키워드 추가'}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                {language === 'en' ? '+ Add OS Tag' : '+ OS 태그 추가'}
              </button>

              {/* Copy Diagnostics Button */}
              <button
                onClick={handleCopyDiagnostics}
                className="px-2.5 py-1.5 bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 rounded-lg text-xs font-medium border border-indigo-700/60 flex items-center gap-1 transition-colors"
                title={language === 'en' ? 'Copy full system context for bug reports or AI' : '오류 제보 및 AI 질문용 진단 정보 복사'}
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied 
                  ? (language === 'en' ? 'Copied!' : '복사완료!') 
                  : (language === 'en' ? 'Copy Diag' : '진단정보 복사')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Full Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-lg w-full p-6 border border-slate-800 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">
                  {language === 'en' ? 'Detailed System Diagnostics' : '상세 시스템 자동 진단 명세'}
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="text-xs text-blue-400 font-bold mb-1 uppercase tracking-wider">
                  {language === 'en' ? 'Operating System' : '운영체제 및 플랫폼'}
                </div>
                <div className="text-slate-200">Name: <span className="font-semibold text-white">{sysInfo.osName}</span></div>
                <div className="text-slate-200">Version: <span className="font-semibold text-white">{sysInfo.osVersion || 'Detected via User Agent'}</span></div>
                <div className="text-slate-200">Matched Guide Filter: <span className="font-semibold text-emerald-400">{sysInfo.matchedVersionFilter}</span></div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="text-xs text-indigo-400 font-bold mb-1 uppercase tracking-wider">
                  {language === 'en' ? 'Browser & Environment' : '웹 브라우저 및 환경'}
                </div>
                <div className="text-slate-200">Browser: <span className="font-semibold text-white">{sysInfo.browserName} {sysInfo.browserVersion}</span></div>
                <div className="text-slate-200">Language: <span className="font-semibold text-white">{sysInfo.language}</span></div>
                <div className="text-slate-200">Timezone: <span className="font-semibold text-white">{sysInfo.timezone}</span></div>
                <div className="text-slate-200">Network: <span className={sysInfo.isOnline ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{sysInfo.isOnline ? 'Online' : 'Offline'}</span></div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="text-xs text-purple-400 font-bold mb-1 uppercase tracking-wider">
                  {language === 'en' ? 'Display & Graphics' : '디스플레이 및 그래픽(GPU)'}
                </div>
                <div className="text-slate-200">Screen Resolution: <span className="font-semibold text-white">{sysInfo.screenResolution}</span></div>
                <div className="text-slate-200">Viewport Size: <span className="font-semibold text-white">{sysInfo.viewportSize}</span></div>
                <div className="text-slate-200">Device Pixel Ratio (DPR): <span className="font-semibold text-white">{sysInfo.devicePixelRatio}</span></div>
                <div className="text-slate-200">Color Depth: <span className="font-semibold text-white">{sysInfo.colorDepth}-bit</span></div>
                <div className="text-slate-200 truncate" title={sysInfo.gpuRenderer}>GPU Renderer: <span className="font-semibold text-white">{sysInfo.gpuRenderer}</span></div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="text-xs text-emerald-400 font-bold mb-1 uppercase tracking-wider">
                  {language === 'en' ? 'Hardware & Touch' : '하드웨어 스펙'}
                </div>
                <div className="text-slate-200">Logical CPU Cores: <span className="font-semibold text-white">{sysInfo.cpuCores}</span></div>
                <div className="text-slate-200">Approx. Device RAM: <span className="font-semibold text-white">{sysInfo.deviceMemory}</span></div>
                <div className="text-slate-200">Touch Device: <span className="font-semibold text-white">{sysInfo.isTouchDevice ? 'Yes' : 'No'}</span></div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="text-xs text-amber-400 font-bold mb-1 uppercase tracking-wider">User Agent String</div>
                <div className="text-xs text-slate-400 font-mono break-all bg-slate-950 p-2 rounded-lg border border-slate-800 mt-1 select-all">
                  {sysInfo.userAgent}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={handleCopyDiagnostics}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied 
                  ? (language === 'en' ? 'Copied to Clipboard!' : '진단 정보 복사 완료!') 
                  : (language === 'en' ? 'Copy Full Diagnostics' : '진단 정보 전체 복사')}
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-sm transition-colors"
              >
                {language === 'en' ? 'Close' : '닫기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
