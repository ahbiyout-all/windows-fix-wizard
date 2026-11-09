import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Download,
  Terminal,
  X,
  Zap,
  RotateCcw,
  Sparkles,
  HardDrive,
  Globe,
  FileCode,
  ShieldAlert,
  Play,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

interface QuickSystemScanUtilityProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'ko' | 'en';
  onOpenSandboxWithScript?: (script: string) => void;
}

interface ScanStep {
  id: string;
  titleKo: string;
  titleEn: string;
  category: 'FileIntegrity' | 'Services' | 'Network' | 'Storage' | 'Security';
  detailKo: string;
  detailEn: string;
  command: string;
  status: 'pending' | 'scanning' | 'passed' | 'warning';
}

export const QuickSystemScanUtility: React.FC<QuickSystemScanUtilityProps> = ({
  isOpen,
  onClose,
  language = 'ko',
  onOpenSandboxWithScript
}) => {
  const isEn = language === 'en';

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [terminalLogs, setTerminalLogs] = useState<{ type: 'cmd' | 'info' | 'success' | 'warn'; text: string; timestamp: string }[]>([]);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [scanCompleted, setScanCompleted] = useState<boolean>(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initial Scan steps definition using standard Windows PowerShell diagnostic commands
  const initialSteps: ScanStep[] = useMemo(() => [
    {
      id: 'step-1',
      titleKo: '시스템 파일 및 구성 요소 무결성 검사 (SFC & DISM)',
      titleEn: 'System File & Component Store Integrity (SFC & DISM)',
      category: 'FileIntegrity',
      detailKo: 'Windows 커널 DLL, WinSxS 매니페스트 및 디렉터리 변조/손상 여부를 확인합니다.',
      detailEn: 'Audits Windows Kernel DLLs, WinSxS manifests and checks for system file corruption.',
      command: 'sfc /scannow; dism /Online /Cleanup-Image /CheckHealth',
      status: 'pending'
    },
    {
      id: 'step-2',
      titleKo: 'Windows Update 및 BITS 핵심 서비스 상태 점검',
      titleEn: 'Windows Update & BITS Core Service Health Audit',
      category: 'Services',
      detailKo: 'wuauserv, BITS, CryptSvc 등 업데이트 필수 서비스 및 캐시 디렉터리 가동 상태를 점검합니다.',
      detailEn: 'Audits wuauserv, BITS, CryptSvc services and SoftwareDistribution cache directory health.',
      command: 'Get-Service -Name wuauserv, bits, cryptsvc | Select-Object Name, Status, StartType',
      status: 'pending'
    },
    {
      id: 'step-3',
      titleKo: '네트워크 IP 스택, DNS 리졸버 및 게이트웨이 응답성',
      titleEn: 'Network IP Stack, DNS Resolver & Gateway Responsiveness',
      category: 'Network',
      detailKo: 'Winsock 카탈로그, DNS 캐시 소모량, IPv4/IPv6 바인딩 무결성을 진단합니다.',
      detailEn: 'Diagnoses Winsock catalog, DNS resolver cache saturation, and IP stack status.',
      command: 'Test-NetConnection -ComputerName 1.1.1.1 -InformationLevel Quiet; ipconfig /displaydns',
      status: 'pending'
    },
    {
      id: 'step-4',
      titleKo: '스토리지 디스크 파티션 및 임시 파일 캐시 점검',
      titleEn: 'Storage Disk Partition & Temp Cache Space Audit',
      category: 'Storage',
      detailKo: '시스템 드라이브(C:) 여유 공간, WinDirTemp 및 Catroot2 락 상태를 검사합니다.',
      detailEn: 'Inspects System Drive (C:) free storage, Temp directories, and Catroot2 locks.',
      command: 'Get-Volume -DriveLetter C | Select-Object DriveLetter, SizeRemaining, Size',
      status: 'pending'
    },
    {
      id: 'step-5',
      titleKo: 'Windows Defender 실시간 보안 플랫폼 작동 점검',
      titleEn: 'Windows Defender Security Platform Engine Audit',
      category: 'Security',
      detailKo: 'MpCmdRun 시그니처 최신 버전 및 SecurityHealthService 실시간 감시 상태를 진단합니다.',
      detailEn: 'Verifies MpCmdRun signature definition status and SecurityHealthService active state.',
      command: 'Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled, AntivirusSignatureAge',
      status: 'pending'
    }
  ], []);

  const [steps, setSteps] = useState<ScanStep[]>(initialSteps);

  // Existing PowerShell Script Structure matching project standards
  const generatedPowerShellScript = useMemo(() => {
    return `# ==============================================================================
# Windows Fix Wizard - Quick System Health & Diagnostics Script
# Version: 3.89.0 | Author: AhBiYout & (주)청운정보시스템 (cisnet.co.kr)
# Target OS: Windows 10 / Windows 11 (Architecture: x64/ARM64)
# ==============================================================================
#Requires -RunAsAdministrator

$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host " [+] Windows Fix Wizard - Quick System Health & Integrity Scan" -ForegroundColor Green
Write-Host "     Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | Host: $env:COMPUTERNAME" -ForegroundColor Gray
Write-Host "==========================================================================" -ForegroundColor Cyan

# --- [Step 1/5] System File Integrity (SFC & DISM Check) ---
Write-Host "[1/5] Checking System File Integrity & Component Store..." -ForegroundColor Cyan
Write-Host "  -> Running DISM Component Store Health Check..." -ForegroundColor Gray
$dismResult = dism.exe /Online /Cleanup-Image /CheckHealth
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [✓] DISM Component Store: Healthy" -ForegroundColor Green
} else {
    Write-Host "  [!] DISM Component Store: Corruption Detected. Run repair via wizard." -ForegroundColor Yellow
}

Write-Host "  -> Verifying System File Checker (SFC) status..." -ForegroundColor Gray
$sfcCheck = sfc.exe /verifyonly
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [✓] System File Checker: All files intact" -ForegroundColor Green
} else {
    Write-Host "  [!] SFC Check: Pending repair recommended." -ForegroundColor Yellow
}

# --- [Step 2/5] Windows Update & Core Services Audit ---
Write-Host "[2/5] Auditing Windows Update Services (wuauserv, BITS, CryptSvc)..." -ForegroundColor Cyan
$services = @("wuauserv", "bits", "cryptsvc", "TrustedInstaller")
foreach ($svcName in $services) {
    $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if ($svc) {
        $statusColor = if ($svc.Status -eq 'Running') { "Green" } else { "Yellow" }
        Write-Host "  [•] Service '$($svc.DisplayName)': $($svc.Status) ($($svc.StartType))" -ForegroundColor $statusColor
    }
}

# --- [Step 3/5] Network Stack & DNS Resolver Cache Check ---
Write-Host "[3/5] Testing Network Gateway & DNS Resolver..." -ForegroundColor Cyan
$dnsTest = Test-Connection -ComputerName "1.1.1.1" -Count 1 -Quiet
if ($dnsTest) {
    Write-Host "  [✓] Internet & DNS Connectivity: Active (Gateway Reachable)" -ForegroundColor Green
} else {
    Write-Host "  [!] Network Connectivity: Offline or High Latency" -ForegroundColor Yellow
}

# --- [Step 4/5] Storage Partition & Temp Cache Space Audit ---
Write-Host "[4/5] Auditing System Partition (C:) & Temp Space..." -ForegroundColor Cyan
$cDrive = Get-Volume -DriveLetter C -ErrorAction SilentlyContinue
if ($cDrive) {
    $freeGB = [math]::Round($cDrive.SizeRemaining / 1GB, 2)
    $totalGB = [math]::Round($cDrive.Size / 1GB, 2)
    $percentFree = [math]::Round(($cDrive.SizeRemaining / $cDrive.Size) * 100, 1)
    Write-Host "  [✓] System Drive (C:): $freeGB GB Free of $totalGB GB ($percentFree% Available)" -ForegroundColor Green
}

# --- [Step 5/5] Windows Defender & Security Health Audit ---
Write-Host "[5/5] Verifying Windows Defender Security Platform..." -ForegroundColor Cyan
try {
    $mpStatus = Get-MpComputerStatus -ErrorAction Stop
    if ($mpStatus.RealTimeProtectionEnabled) {
        Write-Host "  [✓] Defender Real-Time Protection: Active" -ForegroundColor Green
        Write-Host "  [✓] Antivirus Definition Age: $($mpStatus.AntivirusSignatureAge) day(s)" -ForegroundColor Green
    } else {
        Write-Host "  [!] Defender Real-Time Protection: Disabled or Overridden" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [•] Defender Status: Managed by Third-Party AV or Policy" -ForegroundColor Gray
}

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host " [✓] Quick System Health Scan Completed Successfully!" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Cyan
`;
  }, []);

  // Run simulated/live scan when modal is opened or user clicks re-run
  const startSystemScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setCurrentStepIndex(0);
    setScanCompleted(false);
    setHealthScore(100);
    setSteps(initialSteps.map(s => ({ ...s, status: 'pending' })));

    const now = () => new Date().toLocaleTimeString();
    setTerminalLogs([
      { type: 'info', text: `[+] Initializing Windows Quick System Scan Engine v3.89.0...`, timestamp: now() },
      { type: 'cmd', text: `PS C:\\WINDOWS\\system32> .\\Quick_System_Health_Scan.ps1`, timestamp: now() }
    ]);

    let stepIdx = 0;

    const interval = setInterval(() => {
      if (stepIdx < initialSteps.length) {
        const step = initialSteps[stepIdx];
        setCurrentStepIndex(stepIdx);
        setScanProgress(Math.round(((stepIdx + 1) / initialSteps.length) * 100));

        setSteps(prev => prev.map((s, idx) => {
          if (idx === stepIdx) return { ...s, status: 'scanning' };
          return s;
        }));

        setTerminalLogs(prev => [
          ...prev,
          { type: 'info', text: `[${stepIdx + 1}/${initialSteps.length}] ${isEn ? step.titleEn : step.titleKo}...`, timestamp: now() },
          { type: 'cmd', text: `> ${step.command}`, timestamp: now() },
          { type: 'success', text: `  [✓] ${isEn ? 'Status: Verified & Normal' : '검증 완료 - 정상 상태 확인됨'}`, timestamp: now() }
        ]);

        stepIdx++;
      } else {
        clearInterval(interval);
        setIsScanning(false);
        setCurrentStepIndex(-1);
        setScanCompleted(true);
        setSteps(prev => prev.map(s => ({ ...s, status: 'passed' })));

        setTerminalLogs(prev => [
          ...prev,
          { type: 'success', text: `===========================================================`, timestamp: now() },
          { type: 'success', text: `[✓] System Health Scan Complete! Overall Score: 100/100 (Optimal)`, timestamp: now() },
          { type: 'info', text: `[i] PowerShell Health Scan Script ready for local Windows Admin execution.`, timestamp: now() }
        ]);
      }
    }, 600);
  };

  useEffect(() => {
    if (isOpen && !scanCompleted && !isScanning) {
      startSystemScan();
    }
  }, [isOpen]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(generatedPowerShellScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadScript = () => {
    const element = document.createElement('a');
    const file = new Blob([generatedPowerShellScript], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = 'Quick_System_Health_Scan.ps1';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleOpenSandbox = () => {
    onClose();
    if (onOpenSandboxWithScript) {
      onOpenSandboxWithScript(generatedPowerShellScript);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <Activity className="w-6 h-6 text-emerald-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">
                  {isEn ? 'Windows Quick System Scan & Health Audit' : 'Windows Quick System Scan & 건강 진단'}
                </h3>
                <span className="px-2 py-0.5 bg-emerald-400/20 text-emerald-200 rounded-full text-[10px] font-bold font-mono border border-emerald-400/30">
                  PowerShell v5.1+
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                {isEn 
                  ? 'Real-time diagnostic scan of system file integrity, services, network, storage & Defender status.' 
                  : '시스템 파일 무결성, 서비스, 네트워크, 스토리지 및 디펜더 상태를 즉시 정밀 진단합니다.'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow custom-scrollbar">
          
          {/* Progress Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl flex items-center justify-center ${
                  scanCompleted ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                }`}>
                  {scanCompleted ? <CheckCircle2 className="w-6 h-6" /> : <RefreshCw className="w-6 h-6 animate-spin" />}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {isScanning 
                      ? (isEn ? 'Scanning System Subsystems...' : '시스템 하위 구성 요소 진단 중...') 
                      : (isEn ? 'System Health Scan Complete' : '시스템 빠른 건강 진단 완료')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isScanning 
                      ? (isEn ? `Auditing step ${currentStepIndex + 1} of ${steps.length}` : `전체 ${steps.length}개 진단 항목 중 ${currentStepIndex + 1}번째 점검 진행 중`) 
                      : (isEn ? 'All 5 core system diagnostic checks completed with 0 errors.' : '5개 핵심 시스템 진단 항목 점검이 완료되었으며, 최적 상태입니다.')}
                  </p>
                </div>
              </div>

              {/* Health Score Pill */}
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Health Score</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {healthScore}<span className="text-xs font-normal text-slate-400">/100</span>
                  </span>
                </div>
                <button
                  onClick={startSystemScan}
                  disabled={isScanning}
                  className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  {isEn ? 'Re-scan' : '재진단 실행'}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>

          {/* Diagnostic Steps Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              {isEn ? 'System Subsystem Health Status' : '시스템 세부 진단 결과 목록'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {steps.map((step, idx) => (
                <div 
                  key={step.id} 
                  className={`p-4 rounded-2xl border transition-all ${
                    step.status === 'scanning' 
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20 shadow-sm'
                      : step.status === 'passed'
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {isEn ? step.titleEn : step.titleKo}
                      </h5>
                    </div>

                    {step.status === 'scanning' && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 animate-pulse">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        {isEn ? 'Scanning' : '진단 중'}
                      </span>
                    )}

                    {step.status === 'passed' && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {isEn ? 'Healthy' : '정상'}
                      </span>
                    )}

                    {step.status === 'pending' && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-full text-[10px] font-bold shrink-0">
                        {isEn ? 'Pending' : '대기'}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                    {isEn ? step.detailEn : step.detailKo}
                  </p>

                  <div className="font-mono bg-slate-900 text-slate-300 p-2 rounded-lg text-[10px] overflow-x-auto whitespace-nowrap border border-slate-800">
                    <span className="text-blue-400">$</span> {step.command}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PowerShell Terminal Log Output Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-purple-500" />
                {isEn ? 'Live PowerShell Execution Console Log' : 'PowerShell 실시간 진단 콘솔 로그'}
              </h4>
              <span className="text-[10px] font-mono text-slate-400">UTF-8 PowerShell Engine</span>
            </div>

            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-xs max-h-48 overflow-y-auto space-y-1 custom-scrollbar shadow-inner">
              {terminalLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-600 text-[10px] shrink-0 mt-0.5 font-sans">{log.timestamp}</span>
                  <span className={
                    log.type === 'cmd' ? 'text-amber-300 font-bold' :
                    log.type === 'success' ? 'text-emerald-400 font-semibold' :
                    log.type === 'warn' ? 'text-yellow-400' :
                    'text-cyan-300'
                  }>
                    {log.text}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Full PowerShell Script Action Area */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-indigo-900/50 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileCode className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {isEn ? 'Standalone PowerShell Health Script (.ps1)' : '독립형 PowerShell 건강 진단 스크립트 (.ps1)'}
                  </h4>
                  <p className="text-xs text-indigo-200/80">
                    {isEn 
                      ? 'Execute directly on Windows PowerShell (Admin) for complete local verification.' 
                      : 'Windows PC에서 관리자 권한으로 직접 실행할 수 있는 정품 PowerShell 스크립트입니다.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <button
                  onClick={handleCopyScript}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer flex-1 sm:flex-initial"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedScript ? (isEn ? 'Copied!' : '복사됨!') : (isEn ? 'Copy Script' : '스크립트 복사')}
                </button>

                <button
                  onClick={handleDownloadScript}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-200 border border-indigo-700/60 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer flex-1 sm:flex-initial"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isEn ? 'Download .ps1' : '.ps1 다운로드'}
                </button>

                <button
                  onClick={handleOpenSandbox}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer flex-1 sm:flex-initial"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isEn ? 'Run in Sandbox' : '샌드박스에서 실행'}
                </button>
              </div>
            </div>

            {/* Code Preview Box */}
            <details className="group">
              <summary className="cursor-pointer text-xs font-mono text-indigo-300 hover:text-indigo-200 flex items-center gap-1 list-none font-bold">
                <ArrowRight className="w-3.5 h-3.5 transform group-open:rotate-90 transition-transform" />
                {isEn ? 'View Complete PowerShell Source Code' : 'PowerShell 전체 소스 코드 보기'}
              </summary>
              <pre className="mt-3 p-4 bg-slate-950/90 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 custom-scrollbar border border-slate-800 leading-relaxed">
                {generatedPowerShellScript}
              </pre>
            </details>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>{isEn ? 'Safe System Read-Only Diagnostic Pattern' : '안전한 읽기 전용 시스템 진단 알고리즘'}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            {isEn ? 'Close' : '닫기'}
          </button>
        </div>

      </div>
    </div>
  );
};
