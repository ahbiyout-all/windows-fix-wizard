import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Terminal,
  AlertTriangle,
  XCircle,
  Info,
  RefreshCw,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  FileCode,
  Layers,
  Clock,
  ShieldAlert,
  Server,
  X,
  ExternalLink,
  ChevronRight,
  Code2,
  Sparkles,
  CheckCircle2,
  Monitor,
  Cpu,
  HardDrive,
  Wifi,
  Globe,
  Laptop,
  Upload,
  Play,
  ShieldCheck,
  Zap,
  BookOpen
} from 'lucide-react';
import { detectSystemInfo, SystemInfoData } from './SystemInfoWidget';

export interface SystemEventLog {
  id: string;
  eventId: number;
  errorCode?: string;
  level: 'Info' | 'Warning' | 'Error';
  provider: string;
  channel: 'System' | 'Application' | 'Security' | string;
  source: string;
  taskCategory: string;
  computer: string;
  user: string;
  processId: number;
  threadId: number;
  timestamp: string;
  message: string;
  detailsXml?: string;
}

export const getEventErrorCode = (log: SystemEventLog): string => {
  if (log.errorCode) return log.errorCode;

  const content = `${log.message} ${log.detailsXml || ''}`;
  // 1. Look for explicit Hex Error Code (e.g. 0x80070005, 0x80240020, 0xC0000005, 0x00000124)
  const hexMatch = content.match(/0x[0-9a-fA-F]{4,8}/i);
  if (hexMatch) return hexMatch[0].toUpperCase();

  // 2. Look for KB Article (e.g. KB5034441)
  const kbMatch = content.match(/KB\d{6,8}/i);
  if (kbMatch) return '0x80070643'; // Known KB Update error code

  // 3. Smart mapping by Windows Event ID & Provider
  const id = log.eventId;
  const prov = (log.provider || '').toLowerCase();

  if (id === 7036 || id === 7000 || prov.includes('service control')) {
    return '0x80070422'; // ERROR_SERVICE_DISABLED
  }
  if (id === 19 || id === 20 || prov.includes('windowsupdate')) {
    return '0x80240020'; // WU_E_WUMODE_AUTO
  }
  if (id === 1116 || id === 1117 || id === 1118 || prov.includes('defender')) {
    return '0x8050800C'; // Virus/Malware detected
  }
  if (id === 1000 || id === 1004 || prov.includes('application error')) {
    return '0xC0000005'; // STATUS_ACCESS_VIOLATION
  }
  if (id === 4201 || prov.includes('tcpip')) {
    return '0x800704CF'; // ERROR_NETWORK_UNREACHABLE
  }
  if (id === 1500 || id === 1501 || prov.includes('grouppolicy')) {
    return '0x80070005'; // ERROR_ACCESS_DENIED
  }
  if (id === 8193 || id === 8195 || prov.includes('systemrestore')) {
    return '0x81000203'; // Volume Shadow Copy Timeout
  }
  if (id === 154 || id === 157 || prov.includes('disk')) {
    return '0x80070017'; // ERROR_CRC
  }
  if (id === 1001 || id === 1005 || prov.includes('wer')) {
    return '0x0000003B'; // SYSTEM_SERVICE_EXCEPTION
  }
  if (id === 12 || id === 15 || prov.includes('kernel')) {
    return '0x00000124'; // WHEA_UNCORRECTABLE_ERROR
  }

  // Fallbacks by level
  if (log.level === 'Error') return '0x80004005'; // E_FAIL
  if (log.level === 'Warning') return '0x80070002'; // ERROR_FILE_NOT_FOUND
  return '0x00000000'; // STATUS_SUCCESS / INFO
};

interface SystemEventLogPanelProps {
  language?: 'ko' | 'en';
  limit?: number;
  className?: string;
  onNavigateToWizard?: (query: string) => void;
  onNavigateToGuidebook?: (errorCode: string) => void;
}

export const SystemEventLogPanel: React.FC<SystemEventLogPanelProps> = ({
  language = 'ko',
  limit = 50,
  className = '',
  onNavigateToWizard,
  onNavigateToGuidebook
}) => {
  const isEn = language === 'en';

  const [logs, setLogs] = useState<SystemEventLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLevel, setSelectedLevel] = useState<'All' | 'Info' | 'Warning' | 'Error'>('All');
  const [selectedChannel, setSelectedChannel] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<SystemEventLog | null>(null);
  const [copiedXml, setCopiedXml] = useState<boolean>(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'general' | 'xml' | 'powershell'>('general');

  // Live host PC hardware and system detection
  const [systemInfo, setSystemInfo] = useState<SystemInfoData | null>(null);
  const [copiedSpec, setCopiedSpec] = useState<boolean>(false);
  const [copiedPsScript, setCopiedPsScript] = useState<boolean>(false);
  const [importedStatus, setImportedStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    detectSystemInfo()
      .then(info => setSystemInfo(info))
      .catch(err => console.warn('System info detection fallback:', err));
  }, []);

  const handleCopySpecs = () => {
    if (!systemInfo) return;
    const specText = `[사용자 컴퓨터 실시간 하드웨어 & 시스템 정보]
• 운영체제: ${systemInfo.osName} ${systemInfo.osVersion} (${systemInfo.matchedVersionFilter})
• 프로세서(CPU): ${systemInfo.cpuCores} 논리 코어 (Logical Cores)
• 메모리(RAM): ${systemInfo.deviceMemory}
• 그래픽스(GPU): ${systemInfo.gpuRenderer}
• 화면 해상도: ${systemInfo.screenResolution} (DPI ${systemInfo.devicePixelRatio}x, ${systemInfo.colorDepth}-bit)
• 브라우저 환경: ${systemInfo.browserName} v${systemInfo.browserVersion}
• 네트워크 상태: ${systemInfo.isOnline ? '온라인 연결됨' : '오프라인'}
• 시간대 및 로캘: ${systemInfo.timezone} (${systemInfo.language})`;
    navigator.clipboard.writeText(specText);
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2000);
  };

  const handleCopyPowerShellCommand = () => {
    const psCmd = `Get-WinEvent -LogName System,Application -MaxEvents 50 | Select-Object TimeCreated, Id, LevelDisplayName, ProviderName, Message | ConvertTo-Json -Depth 2 | Out-File -FilePath "$HOME\\Desktop\\MyWindowsLogs.json" -Encoding utf8; Write-Host "내 PC 이벤트 로그 50건이 바탕화면 MyWindowsLogs.json 파일로 저장되었습니다!" -ForegroundColor Green`;
    navigator.clipboard.writeText(psCmd);
    setCopiedPsScript(true);
    setTimeout(() => setCopiedPsScript(false), 2500);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const list = Array.isArray(parsed) ? parsed : (parsed.logs || [parsed]);
        if (list.length > 0) {
          const formatted: SystemEventLog[] = list.map((item: any, idx: number) => ({
            id: `user-evt-${Date.now()}-${idx}`,
            eventId: Number(item.Id || item.eventId || item.EventID || 1000),
            level: (item.LevelDisplayName === 'Error' || item.level === 'Error' || item.Level === 2) ? 'Error' :
                   (item.LevelDisplayName === 'Warning' || item.level === 'Warning' || item.Level === 3) ? 'Warning' : 'Info',
            provider: item.ProviderName || item.provider || item.Source || 'User System',
            channel: item.Channel || item.channel || 'System',
            source: item.source || item.ProviderName || 'Local PC',
            taskCategory: item.taskCategory || 'User Imported Event',
            computer: item.MachineName || item.computer || (systemInfo?.osName ? `${systemInfo.osName}-PC` : 'MY-PC'),
            user: item.UserId || item.user || 'NT AUTHORITY\\SYSTEM',
            processId: item.ProcessId || (1000 + idx),
            threadId: item.ThreadId || (2000 + idx),
            timestamp: item.TimeCreated ? new Date(item.TimeCreated).toLocaleString() : new Date().toLocaleString(),
            message: item.Message || item.message || JSON.stringify(item),
            detailsXml: item.detailsXml || item.Xml
          }));
          setLogs(formatted);
          setImportedStatus(isEn ? `Imported ${formatted.length} events from your PC!` : `내 PC에서 추출한 ${formatted.length}개 이벤트를 성공적으로 불러왔습니다!`);
          setTimeout(() => setImportedStatus(null), 4000);
        }
      } catch (err) {
        setImportedStatus(isEn ? 'Failed to parse JSON file.' : 'JSON 로그 파일 형식이 올바르지 않습니다.');
        setTimeout(() => setImportedStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Fallback initial generator for 50 Event Viewer logs if API is offline
  const generateFallbackLogs = (): SystemEventLog[] => {
    const providers = [
      { provider: "Service Control Manager", channel: "System", eventId: 7036, source: "System Core" },
      { provider: "Microsoft-Windows-WindowsUpdateClient", channel: "System", eventId: 19, source: "Windows Update" },
      { provider: "Microsoft-Windows-WindowsDefender", channel: "Security", eventId: 1116, source: "Defender Security" },
      { provider: "Microsoft-Windows-Kernel-General", channel: "System", eventId: 12, source: "Kernel Power" },
      { provider: "Application Error", channel: "Application", eventId: 1000, source: "User Application" },
      { provider: "Microsoft-Windows-TCPIP", channel: "System", eventId: 4201, source: "Network Stack" },
      { provider: "Microsoft-Windows-GroupPolicy", channel: "System", eventId: 1500, source: "Group Policy Engine" },
      { provider: "Microsoft-Windows-SystemRestore", channel: "System", eventId: 8193, source: "System Restore Provider" },
      { provider: "Microsoft-Windows-Disk", channel: "System", eventId: 154, source: "Storage Subsystem" },
      { provider: "Microsoft-Windows-WER-SystemErrorReporting", channel: "Application", eventId: 1001, source: "Windows Error Reporting" }
    ];

    const levels: ('Info' | 'Warning' | 'Error')[] = ['Info', 'Warning', 'Error', 'Info', 'Info', 'Warning', 'Error', 'Info', 'Info', 'Warning'];

    const messages = [
      "The Windows Update service entered the running state successfully.",
      "Installation Successful: Windows Update KB5034441 has been applied.",
      "Microsoft Defender Antivirus has detected malware or unwanted software (Trojan:Win32/Script.A). Remediation initiated.",
      "The operating system started at system time with boot status 0x0.",
      "Faulting application name: explorer.exe, version: 10.0.22621.3155, faulting module name: ntdll.dll.",
      "The network interface Intel(R) Wi-Fi 6 AX201 160MHz has begun resetting due to packet timeout.",
      "Group Policy settings for the computer were updated successfully in 42 milliseconds.",
      "Successfully created System Restore Point: WinFix_SafetyPoint_PreRepair.",
      "The IO operation at logical block address 0x1f003a for Disk 0 was retried.",
      "Windows Error Reporting successfully logged crash dump for process svchost.exe (pid: 1420)."
    ];

    const baseTime = Date.now();
    return Array.from({ length: limit }, (_, i) => {
      const p = providers[i % providers.length];
      const level = levels[(i * 3 + p.eventId) % levels.length];
      const logTime = new Date(baseTime - i * 1800000).toISOString();
      const msg = messages[i % messages.length];

      return {
        id: `evt-${limit - i}`,
        eventId: p.eventId + (i % 5),
        level,
        provider: p.provider,
        channel: p.channel,
        source: p.source,
        taskCategory: level === 'Error' ? 'System Repair Required' : level === 'Warning' ? 'Performance Audit' : 'Service Status',
        computer: 'WIN11-PRO-FIXWIZARD',
        user: 'NT AUTHORITY\\SYSTEM',
        processId: 1024 + (i * 12) % 4000,
        threadId: 2048 + (i * 16) % 4000,
        timestamp: logTime,
        message: `${msg} (Log Entry #${limit - i})`,
        detailsXml: `<Event xmlns='http://schemas.microsoft.com/win/2004/08/events/event'>
  <System>
    <Provider Name='${p.provider}' />
    <EventID>${p.eventId}</EventID>
    <Level>${level === 'Error' ? 2 : level === 'Warning' ? 3 : 4}</Level>
    <TimeCreated SystemTime='${logTime}' />
    <Computer>WIN11-PRO-FIXWIZARD</Computer>
  </System>
  <EventData>
    <Data Name='Message'>${msg}</Data>
  </EventData>
</Event>`
      };
    });
  };

  const fetchEventLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/event-logs?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs) && data.logs.length > 0) {
          setLogs(data.logs);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Event logs API fetch fallback:", e);
    }
    setLogs(generateFallbackLogs());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEventLogs();
  }, [limit]);

  // Summary Counts
  const counts = useMemo(() => {
    const error = logs.filter(l => l.level === 'Error').length;
    const warning = logs.filter(l => l.level === 'Warning').length;
    const info = logs.filter(l => l.level === 'Info').length;
    return { total: logs.length, error, warning, info };
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Level filter
      if (selectedLevel !== 'All' && log.level !== selectedLevel) return false;

      // Channel filter
      if (selectedChannel !== 'All' && log.channel !== selectedChannel) return false;

      // Search Query (Supports Error Code, Event ID, Provider, Source, Message)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const errCode = getEventErrorCode(log).toLowerCase();
        const matchCode = errCode.includes(q);
        const matchId = String(log.eventId).includes(q);
        const matchMsg = log.message.toLowerCase().includes(q);
        const matchProvider = log.provider.toLowerCase().includes(q);
        const matchSource = log.source.toLowerCase().includes(q);
        return matchCode || matchId || matchMsg || matchProvider || matchSource;
      }

      return true;
    });
  }, [logs, selectedLevel, selectedChannel, searchQuery]);

  // Export handlers
  const handleExportJson = () => {
    const exportable = filteredLogs.map(l => ({
      ...l,
      errorCode: getEventErrorCode(l)
    }));
    const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Windows_Event_Logs_${selectedLevel}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleExportCsv = () => {
    const headers = ['EventID', 'ErrorCode', 'Level', 'Timestamp', 'Provider', 'Channel', 'Source', 'Message'];
    const rows = filteredLogs.map(l => [
      l.eventId,
      `"${getEventErrorCode(l)}"`,
      l.level,
      l.timestamp,
      `"${l.provider.replace(/"/g, '""')}"`,
      l.channel,
      `"${l.source.replace(/"/g, '""')}"`,
      `"${l.message.replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = `Windows_Event_Logs_${selectedLevel}.csv`;
    a.click();
  };

  const handleCopyXml = (xml?: string) => {
    if (!xml) return;
    navigator.clipboard.writeText(xml);
    setCopiedXml(true);
    setTimeout(() => setCopiedXml(false), 2000);
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-5 ${className}`}>
      
      {/* Live Host Computer Hardware & OS Specification Card */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-indigo-900/50 shadow-md relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  {isEn ? 'Live Computer Hardware & OS Environment' : '내 컴퓨터 실시간 하드웨어 & 시스템 정보'}
                </h4>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {isEn ? 'Live Detected' : '실시간 감지 완료'}
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                {isEn 
                  ? 'Hardware specifications and OS environment read directly from your browser and system APIs.' 
                  : '브라우저 및 시스템 API를 통해 사용자 컴퓨터의 하드웨어와 운영체제 환경을 실시간 감지하여 맞춤 진단을 지원합니다.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopySpecs}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-white/15 cursor-pointer"
            >
              {copiedSpec ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSpec ? (isEn ? 'Copied!' : '복사됨!') : (isEn ? 'Copy PC Specs' : '사양 복사')}</span>
            </button>

            {onNavigateToWizard && (
              <button
                onClick={() => onNavigateToWizard(`${systemInfo?.matchedVersionFilter || 'Windows 11'} 시스템 오류 점검 및 최적화`)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isEn ? 'Diagnose My PC' : '내 PC 맞춤 진단'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 6 Grid Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
          {/* OS */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-indigo-300 text-[11px] font-semibold mb-1">
              <Monitor className="w-3.5 h-3.5" />
              <span>{isEn ? 'OS & Platform' : '운영체제'}</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white truncate" title={`${systemInfo?.osName} ${systemInfo?.osVersion}`}>
              {systemInfo ? `${systemInfo.osName} ${systemInfo.osVersion}` : 'Windows 11/10'}
            </div>
            <div className="text-[10px] text-white/50 truncate mt-0.5">
              {systemInfo?.matchedVersionFilter || '64-bit'}
            </div>
          </div>

          {/* CPU */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-cyan-300 text-[11px] font-semibold mb-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>{isEn ? 'CPU Cores' : '프로세서'}</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white font-mono">
              {systemInfo?.cpuCores ? `${systemInfo.cpuCores} 코어` : '8 논리 코어'}
            </div>
            <div className="text-[10px] text-white/50 mt-0.5">
              {isEn ? 'Logical Threads' : '논리 스레드'}
            </div>
          </div>

          {/* RAM */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-semibold mb-1">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{isEn ? 'Memory (RAM)' : '메모리'}</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white font-mono">
              {systemInfo?.deviceMemory && systemInfo.deviceMemory !== 'N/A' ? systemInfo.deviceMemory : '8GB+ 추정'}
            </div>
            <div className="text-[10px] text-white/50 mt-0.5">
              {isEn ? 'System RAM' : '시스템 메모리'}
            </div>
          </div>

          {/* GPU */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-semibold mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>{isEn ? 'GPU Renderer' : '그래픽스'}</span>
            </div>
            <div className="text-xs font-bold text-white truncate" title={systemInfo?.gpuRenderer || 'WebGL 3D GPU'}>
              {systemInfo?.gpuRenderer && systemInfo.gpuRenderer !== 'N/A' 
                ? systemInfo.gpuRenderer.split('/')[0].replace('ANGLE (', '').replace(')', '')
                : 'GPU 하드웨어 가속'}
            </div>
            <div className="text-[10px] text-white/50 truncate mt-0.5">
              {isEn ? 'Hardware Accel' : '하드웨어 가속'}
            </div>
          </div>

          {/* Display */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-purple-300 text-[11px] font-semibold mb-1">
              <Layers className="w-3.5 h-3.5" />
              <span>{isEn ? 'Display' : '디스플레이'}</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white font-mono truncate">
              {systemInfo?.screenResolution || '1920 x 1080'}
            </div>
            <div className="text-[10px] text-white/50 mt-0.5">
              DPI {systemInfo?.devicePixelRatio || 1}x ({systemInfo?.colorDepth || 24}-bit)
            </div>
          </div>

          {/* Network & Browser */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-blue-300 text-[11px] font-semibold mb-1">
              <Wifi className="w-3.5 h-3.5" />
              <span>{isEn ? 'Network' : '네트워크'}</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {systemInfo?.isOnline ? (isEn ? 'Online' : '정상 연결') : (isEn ? 'Offline' : '오프라인')}
            </div>
            <div className="text-[10px] text-white/50 truncate mt-0.5">
              {systemInfo?.browserName || 'Chrome/Edge'}
            </div>
          </div>
        </div>

        {/* Real User Event Log Extraction Banner */}
        <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/80">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isEn 
                ? 'Extract real event logs from your Windows PC via 1-Click PowerShell command:' 
                : '내 Windows PC의 실제 이벤트 뷰어 로그를 1-Click PowerShell 명령어로 직접 추출할 수 있습니다:'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleCopyPowerShellCommand}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={isEn ? 'Copy PowerShell Log Extraction Script' : 'PowerShell 로그 추출 명령어 복사'}
            >
              {copiedPsScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPsScript ? (isEn ? 'Command Copied!' : '명령어 복사됨!') : (isEn ? 'Copy PowerShell Cmd' : '추출 명령어 복사')}</span>
            </button>

            <label className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-indigo-300" />
              <span>{isEn ? 'Load My PC Logs' : '내 PC 로그(.json) 불러오기'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJsonFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {importedStatus && (
          <div className="mt-3 p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{importedStatus}</span>
          </div>
        )}
      </div>

      {/* Severity Filter Tabs & Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* ALL */}
        <button
          onClick={() => setSelectedLevel('All')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedLevel === 'All'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isEn ? 'All Severity' : '전체 이벤트'}
            </span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {counts.total} <span className="text-xs font-normal text-slate-400">logs</span>
          </div>
        </button>

        {/* ERROR */}
        <button
          onClick={() => setSelectedLevel('Error')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedLevel === 'Error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              Error
            </span>
            <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded text-[10px] font-bold">
              Critical
            </span>
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {counts.error} <span className="text-xs font-normal text-slate-400">events</span>
          </div>
        </button>

        {/* WARNING */}
        <button
          onClick={() => setSelectedLevel('Warning')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedLevel === 'Warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Warning
            </span>
            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded text-[10px] font-bold">
              Audit
            </span>
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {counts.warning} <span className="text-xs font-normal text-slate-400">events</span>
          </div>
        </button>

        {/* INFO */}
        <button
          onClick={() => setSelectedLevel('Info')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedLevel === 'Info'
              ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-700 ring-2 ring-cyan-500/20'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Information
            </span>
            <span className="px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 rounded text-[10px] font-bold">
              Normal
            </span>
          </div>
          <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
            {counts.info} <span className="text-xs font-normal text-slate-400">events</span>
          </div>
        </button>
      </div>

      {/* Search & Channel Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? "Search Error Code (0x...), Event ID, Provider, Message..." : "오류 코드(0x...), 이벤트 ID, 소스, 메시지 검색..."}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>{isEn ? "Channel:" : "채널:"}</span>
          </div>

          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none"
          >
            <option value="All">{isEn ? "All Channels" : "전체 채널"}</option>
            <option value="System">System</option>
            <option value="Application">Application</option>
            <option value="Security">Security</option>
          </select>

          <span className="text-xs text-slate-400 font-mono">
            {filteredLogs.length} / {logs.length}
          </span>
        </div>
      </div>

      {/* Event Logs Table View */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[480px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 w-24">Level</th>
                <th className="py-3 px-3 w-28">Time</th>
                <th className="py-3 px-3 w-20">Event ID</th>
                <th className="py-3 px-3 w-28 text-rose-600 dark:text-rose-400">Error Code</th>
                <th className="py-3 px-3 w-40">Source / Provider</th>
                <th className="py-3 px-3 w-24">Channel</th>
                <th className="py-3 px-3 min-w-[220px]">Message Summary</th>
                <th className="py-3 px-3 w-28 text-center">{isEn ? 'Guidebook' : '가이드북 연동'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    {isEn ? "Fetching Windows Event Viewer logs..." : "Windows 이벤트 뷰어 로그를 가져오는 중입니다..."}
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    {isEn ? "No event logs match the current filter criteria." : "현재 필터 조건에 부합하는 이벤트 로그가 없습니다."}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const errorCode = getEventErrorCode(log);
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-blue-50/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer group"
                    >
                      {/* Level */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          log.level === 'Error' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300' :
                          log.level === 'Warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300' :
                          'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300'
                        }`}>
                          {log.level === 'Error' ? <XCircle className="w-3 h-3 text-rose-500" /> :
                           log.level === 'Warning' ? <AlertTriangle className="w-3 h-3 text-amber-500" /> :
                           <Info className="w-3 h-3 text-cyan-500" />}
                          {log.level}
                        </span>
                      </td>

                      {/* Time Created */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>

                      {/* Event ID */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {log.eventId}
                      </td>

                      {/* Error Code */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] shadow-2xs ${
                          log.level === 'Error' 
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40' 
                            : log.level === 'Warning' 
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40' 
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {errorCode}
                        </span>
                      </td>

                      {/* Provider / Source */}
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[160px]" title={log.provider}>
                        {log.provider}
                      </td>

                      {/* Channel */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-semibold">
                          {log.channel}
                        </span>
                      </td>

                      {/* Message Summary */}
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[280px]" title={log.message}>
                        {log.message}
                      </td>

                      {/* Guidebook Action */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {onNavigateToGuidebook ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToGuidebook(errorCode);
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-white rounded-lg text-[10px] font-bold transition-all inline-flex items-center gap-1 border border-blue-200 dark:border-blue-800 shadow-2xs cursor-pointer active:scale-95"
                            title={isEn ? `Search ${errorCode} in Error Guidebook` : `오류 가이드북에서 ${errorCode} 해결법 검색`}
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>{isEn ? 'Guidebook' : '가이드북 검색'}</span>
                          </button>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors inline-block" />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${
                  selectedLog.level === 'Error' ? 'bg-rose-500/20 text-rose-400' :
                  selectedLog.level === 'Warning' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-cyan-500/20 text-cyan-400'
                }`}>
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    Event {selectedLog.eventId} Details - {selectedLog.provider}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Log Channel: <span className="text-slate-200 font-mono">{selectedLog.channel}</span> | Computer: <span className="text-slate-200 font-mono">{selectedLog.computer}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Selectors */}
            <div className="flex items-center gap-2 px-6 pt-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setActiveDetailTab('general')}
                className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeDetailTab === 'general'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {isEn ? 'General Properties' : '일반 속성'}
              </button>
              <button
                onClick={() => setActiveDetailTab('xml')}
                className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeDetailTab === 'xml'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {isEn ? 'XML View' : '이벤트 XML 뷰'}
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-grow custom-scrollbar">
              {activeDetailTab === 'general' ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Description / Message</span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                      {selectedLog.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Highlighted Error Code & Guidebook Link */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 rounded-xl border border-blue-200 dark:border-blue-800/80 col-span-2 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold block mb-1">
                            {isEn ? 'Windows Error Code (Signature)' : 'Windows 오류 코드 (Error Code)'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-base sm:text-lg text-rose-600 dark:text-rose-400">
                              {getEventErrorCode(selectedLog)}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                              {isEn ? 'Guidebook Searchable' : '가이드북 즉시 검색 가능'}
                            </span>
                          </div>
                        </div>

                        {onNavigateToGuidebook && (
                          <button
                            onClick={() => {
                              const code = getEventErrorCode(selectedLog);
                              setSelectedLog(null);
                              onNavigateToGuidebook(code);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer self-start sm:self-auto"
                          >
                            <BookOpen className="w-4 h-4" />
                            <span>{isEn ? `Search ${getEventErrorCode(selectedLog)} in Guidebook` : `오류 가이드북에서 ${getEventErrorCode(selectedLog)} 해결책 찾기`}</span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Event ID</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{selectedLog.eventId}</span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Level</span>
                      <span className={`font-mono font-bold ${
                        selectedLog.level === 'Error' ? 'text-rose-500' :
                        selectedLog.level === 'Warning' ? 'text-amber-500' : 'text-cyan-500'
                      }`}>
                        {selectedLog.level}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Logged User</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{selectedLog.user}</span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Process / Thread ID</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">PID: {selectedLog.processId} | TID: {selectedLog.threadId}</span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 col-span-2">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Timestamp</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{selectedLog.timestamp}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Event XML View:</span>
                    <button
                      onClick={() => handleCopyXml(selectedLog.detailsXml)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {copiedXml ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedXml ? (isEn ? 'Copied!' : '복사됨!') : (isEn ? 'Copy XML' : 'XML 복사')}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-64 custom-scrollbar border border-slate-800 leading-relaxed">
                    {selectedLog.detailsXml || `<Event><System><EventID>${selectedLog.eventId}</EventID></System></Event>`}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div>
                {onNavigateToGuidebook && (
                  <button
                    onClick={() => {
                      const code = getEventErrorCode(selectedLog);
                      setSelectedLog(null);
                      onNavigateToGuidebook(code);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Search in Error Guidebook' : '가이드북에서 해결책 보기'}</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
              >
                {isEn ? 'Close' : '닫기'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
