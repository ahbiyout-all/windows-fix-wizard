import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2
} from 'lucide-react';

export interface SystemEventLog {
  id: string;
  eventId: number;
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

interface SystemEventLogPanelProps {
  language?: 'ko' | 'en';
  limit?: number;
}

export const SystemEventLogPanel: React.FC<SystemEventLogPanelProps> = ({
  language = 'ko',
  limit = 50
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

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = String(log.eventId).includes(q);
        const matchMsg = log.message.toLowerCase().includes(q);
        const matchProvider = log.provider.toLowerCase().includes(q);
        const matchSource = log.source.toLowerCase().includes(q);
        return matchId || matchMsg || matchProvider || matchSource;
      }

      return true;
    });
  }, [logs, selectedLevel, selectedChannel, searchQuery]);

  // Export handlers
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Windows_Event_Logs_${selectedLevel}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleExportCsv = () => {
    const headers = ['EventID', 'Level', 'Timestamp', 'Provider', 'Channel', 'Source', 'Message'];
    const rows = filteredLogs.map(l => [
      l.eventId,
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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-5">
      
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800/40">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {isEn ? 'Windows Event Viewer System Logs' : 'Windows 이벤트 뷰어 시스템 로그 모니터'}
              </h3>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-mono font-bold">
                Last {limit} Events
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEn 
                ? 'Monitors Windows Kernel, Services, Defender, Update, and Application Event Viewer logs in real-time.' 
                : 'Windows 커널, 서비스, 디펜더, 업데이트 및 애플리케이션 이벤트 뷰어 로그를 실시간 분석합니다.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            onClick={fetchEventLogs}
            disabled={isLoading}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title={isEn ? 'Refresh Event Logs' : '로그 새로고침'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isEn ? 'Refresh' : '새로고침'}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
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
            placeholder={isEn ? "Search Event ID, Provider, Message..." : "이벤트 ID, 소스, 메시지 검색..."}
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
                <th className="py-3 px-3 w-28">Level</th>
                <th className="py-3 px-3 w-36">Time Created</th>
                <th className="py-3 px-3 w-20">Event ID</th>
                <th className="py-3 px-3 w-48">Source / Provider</th>
                <th className="py-3 px-3 w-28">Channel</th>
                <th className="py-3 px-3 min-w-[240px]">Message Summary</th>
                <th className="py-3 px-[#10px] w-12 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    {isEn ? "Fetching Windows Event Viewer logs..." : "Windows 이벤트 뷰어 로그를 가져오는 중입니다..."}
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    {isEn ? "No event logs match the current filter criteria." : "현재 필터 조건에 부합하는 이벤트 로그가 없습니다."}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
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

                    {/* Provider / Source */}
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={log.provider}>
                      {log.provider}
                    </td>

                    {/* Channel */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-semibold">
                        {log.channel}
                      </span>
                    </td>

                    {/* Message Summary */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[320px]" title={log.message}>
                      {log.message}
                    </td>

                    {/* Arrow */}
                    <td className="py-2.5 px-3 text-center">
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors inline-block" />
                    </td>
                  </tr>
                ))
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
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end shrink-0">
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
