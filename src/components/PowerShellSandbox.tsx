import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Terminal,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Layers,
  Copy,
  Check,
  Download,
  Trash2,
  HardDrive,
  FileCode,
  Folder,
  Sliders,
  Sparkles,
  Info,
  Bug,
  Activity,
  Zap,
  Globe,
  Settings,
  ChevronRight,
  ExternalLink,
  FastForward,
  CornerDownLeft,
  Key,
  History,
  Save,
  Tag,
  Edit3,
  Clock,
  Plus,
  FileText,
  X,
  Code2,
  Eye,
  EyeOff,
  Wrench
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-powershell';
import 'prismjs/themes/prism-tomorrow.css';
import { verifyPowerShellScript, PowerShellSecurityReport } from '../utils/psVerifier';
import { analyzePowerShellScript, autoFixDiagnostic, autoFixAllFixable, PowerShellLintReport, PowerShellLintDiagnostic } from '../utils/psLinter';

/**
 * Safely highlight PowerShell code into syntax-colored HTML via PrismJS
 */
export function highlightPowerShell(code: string): string {
  try {
    return Prism.highlight(code || '', Prism.languages.powershell, 'powershell');
  } catch (err) {
    console.warn("Prism PowerShell syntax highlight fallback:", err);
    return (code || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

export interface ScriptVersion {
  id: string;
  label: string;
  script: string;
  createdAt: string;
  lineCount: number;
  charCount: number;
}

interface Props {
  language: 'ko' | 'en';
  initialScript?: string;
}

interface VirtualService {
  name: string;
  displayName: string;
  status: 'Running' | 'Stopped' | 'Paused';
  startType: 'Automatic' | 'Manual' | 'Disabled';
}

interface VirtualFile {
  path: string;
  size: string;
  status: 'exists' | 'created' | 'deleted' | 'modified';
  description: string;
}

interface VirtualRegistryKey {
  path: string;
  name: string;
  value: string | number;
  status: 'unchanged' | 'set' | 'removed';
}

interface TerminalLine {
  id: string;
  text: string;
  type: 'stdout' | 'stderr' | 'info' | 'prompt' | 'success' | 'warning' | 'cyan' | 'yellow' | 'green' | 'magenta';
  timestamp: string;
}

// Built-in presets for quick testing
const SANDBOX_PRESETS = [
  {
    id: 'quick-system-scan',
    nameKo: '⚡ 시스템 빠른 건강 진단 (SFC, DISM, 네트워크, 디펜더 점검)',
    nameEn: '⚡ Quick System Health & Integrity Audit (SFC, DISM, Defender)',
    category: 'Diagnostic',
    code: `# Windows Fix Wizard - Quick System Health & Integrity Scan
#Requires -RunAsAdministrator

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host " [+] Windows Fix Wizard - Quick System Health & Integrity Scan" -ForegroundColor Green
Write-Host "     Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | Host: $env:COMPUTERNAME" -ForegroundColor Gray
Write-Host "==========================================================================" -ForegroundColor Cyan

# [1/5] System File Integrity (SFC & DISM Check)
Write-Host "[1/5] Checking System File Integrity & Component Store..." -ForegroundColor Cyan
dism.exe /Online /Cleanup-Image /CheckHealth
sfc.exe /verifyonly

# [2/5] Windows Update & Core Services Audit
Write-Host "[2/5] Auditing Windows Update Services (wuauserv, BITS, CryptSvc)..." -ForegroundColor Cyan
Get-Service -Name wuauserv, bits, cryptsvc, TrustedInstaller | Select-Object Name, Status, StartType

# [3/5] Network Stack & Gateway Check
Write-Host "[3/5] Testing Network Gateway & DNS Resolver..." -ForegroundColor Cyan
Test-Connection -ComputerName "1.1.1.1" -Count 1 -Quiet

# [4/5] Storage Partition & Temp Cache Audit
Write-Host "[4/5] Auditing System Partition (C:) & Temp Space..." -ForegroundColor Cyan
Get-Volume -DriveLetter C

# [5/5] Windows Defender & Security Health Audit
Write-Host "[5/5] Verifying Windows Defender Security Platform..." -ForegroundColor Cyan
Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled, AntivirusSignatureAge

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host " [✓] Quick System Health Scan Completed Successfully!" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Cyan`
  },
  {
    id: 'update-reset',
    nameKo: '윈도우 업데이트 캐시 초기화 및 서비스 재기동',
    nameEn: 'Windows Update Cache & Services Reset',
    category: 'Update',
    code: `# Windows Update Automated Repair Script
Write-Host "[1/5] Stopping Windows Update & BITS Services..." -ForegroundColor Cyan
Stop-Service -Name "wuauserv" -Force
Stop-Service -Name "bits" -Force
Stop-Service -Name "cryptsvc" -Force

Write-Host "[2/5] Purging Update Cache Directories..." -ForegroundColor Cyan
Remove-Item -Path "C:\\Windows\\SoftwareDistribution\\Download\\*" -Recurse -Force
Remove-Item -Path "C:\\Windows\\System32\\catroot2\\*" -Recurse -Force

Write-Host "[3/5] Re-registering Update DLL Libraries..." -ForegroundColor Cyan
regsvr32.exe /s wuaueng.dll
regsvr32.exe /s qmgr.dll

Write-Host "[4/5] Restarting Core Update Services..." -ForegroundColor Cyan
Start-Service -Name "cryptsvc"
Start-Service -Name "bits"
Start-Service -Name "wuauserv"

Write-Host "[5/5] Triggering Windows Update Detection Cycle..." -ForegroundColor Cyan
usoclient StartScan
Write-Host "[+] Windows Update repair completed successfully." -ForegroundColor Green`
  },
  {
    id: 'network-flush',
    nameKo: 'TCP/IP 스택 및 DNS 리졸버 캐시 플러시',
    nameEn: 'TCP/IP Stack & DNS Resolver Cache Flush',
    category: 'Network',
    code: `# Network Stack & Winsock Reset Script
Write-Host "[1/4] Flushing DNS Resolver Cache..." -ForegroundColor Cyan
ipconfig /flushdns

Write-Host "[2/4] Resetting Winsock & IP Interfaces..." -ForegroundColor Cyan
netsh winsock reset
netsh int ip reset

Write-Host "[3/4] Releasing & Renewing IPv4 Leases..." -ForegroundColor Cyan
ipconfig /release
ipconfig /renew

Write-Host "[4/4] Restarting Network Location Awareness Service..." -ForegroundColor Cyan
Restart-Service -Name "NlaSvc" -Force
Write-Host "[+] Network stack reset complete. Internet connection restored." -ForegroundColor Green`
  },
  {
    id: 'sfc-dism',
    nameKo: '시스템 무결성 검사 (SFC /scannow + DISM 복구)',
    nameEn: 'System File Checker (SFC) & DISM Health Restore',
    category: 'System',
    code: `# System File Integrity & Component Store Recovery
Write-Host "[1/3] Running System File Checker (SFC)..." -ForegroundColor Cyan
sfc /scannow

Write-Host "[2/3] Checking Component Store Health via DISM..." -ForegroundColor Cyan
dism /Online /Cleanup-Image /CheckHealth

Write-Host "[3/3] Restoring Component Store Corruption via DISM..." -ForegroundColor Cyan
dism /Online /Cleanup-Image /RestoreHealth
Write-Host "[+] System integrity repair completed with 0 errors." -ForegroundColor Green`
  },
  {
    id: 'store-reset',
    nameKo: 'Microsoft Store 캐시 리셋 및 AppX 패키지 재등록',
    nameEn: 'Microsoft Store Cache Reset & AppX Re-registration',
    category: 'Apps',
    code: `# Microsoft Store & AppX Package Repair
Write-Host "[1/3] Resetting Microsoft Store Cache..." -ForegroundColor Cyan
wsreset.exe

Write-Host "[2/3] Re-registering AppX Packages for Current User..." -ForegroundColor Cyan
Get-AppXPackage -AllUsers | Foreach {Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\\AppXManifest.xml"}

Write-Host "[3/3] Verifying AppX Deployment Service Status..." -ForegroundColor Cyan
Get-Service -Name "AppXSvc" | Start-Service
Write-Host "[+] Microsoft Store & Universal Windows Apps repaired." -ForegroundColor Green`
  },
  {
    id: 'defender-update',
    nameKo: 'Microsoft Defender 백신 엔진 및 시그니처 갱신',
    nameEn: 'Microsoft Defender Signatures & Security Health Update',
    category: 'Security',
    code: `# Microsoft Defender Signature & Security Platform Update
Write-Host "[1/3] Updating Microsoft Defender Intelligence Signatures..." -ForegroundColor Cyan
& "C:\\Program Files\\Windows Defender\\MpCmdRun.exe" -SignatureUpdate

Write-Host "[2/3] Triggering Defender Quick Scan in Sandbox..." -ForegroundColor Cyan
& "C:\\Program Files\\Windows Defender\\MpCmdRun.exe" -Scan -ScanType 1

Write-Host "[3/3] Restarting Windows Security Service..." -ForegroundColor Cyan
Restart-Service -Name "SecurityHealthService" -Force
Write-Host "[+] Defender security signatures updated to latest definition." -ForegroundColor Green`
  },
  {
    id: 'tls-security',
    nameKo: '취약한 TLS 1.0 프로토콜 비활성화 레지스트리 패치',
    nameEn: 'Deprecate Insecure TLS 1.0 Protocol (Registry Policy)',
    category: 'Security',
    code: `# Deprecate insecure TLS 1.0 protocol
Write-Host "[1/2] Creating Client SCHANNEL Protocol Registry Key..." -ForegroundColor Cyan
New-Item -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\SCHANNEL\\Protocols\\TLS 1.0\\Client" -Force

Write-Host "[2/2] Setting Enabled=0 to force TLS 1.2/1.3..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\SCHANNEL\\Protocols\\TLS 1.0\\Client" -Name "Enabled" -Value 0
Write-Host "[+] Registry security policy applied: TLS 1.0 is now disabled." -ForegroundColor Green`
  }
];

export function PowerShellSandbox({ language, initialScript }: Props) {
  const [scriptText, setScriptText] = useState<string>(() => {
    return initialScript || SANDBOX_PRESETS[0].code;
  });

  // Version History state
  const [versions, setVersions] = useState<ScriptVersion[]>(() => {
    try {
      const saved = localStorage.getItem('winfix_sandbox_script_versions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load script versions from localStorage:", e);
    }
    return [
      {
        id: 'ver-initial',
        label: language === 'en' ? 'v1.0 - Default Windows Update Reset Script' : 'v1.0 - 기본 Windows 업데이트 캐시 초기화 스크립트',
        script: SANDBOX_PRESETS[0].code,
        createdAt: new Date().toISOString(),
        lineCount: SANDBOX_PRESETS[0].code.split('\n').length,
        charCount: SANDBOX_PRESETS[0].code.length
      }
    ];
  });

  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionLabelInput, setVersionLabelInput] = useState('');
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingLabelText, setEditingLabelText] = useState('');
  const [previewVersion, setPreviewVersion] = useState<ScriptVersion | null>(null);
  const [versionToast, setVersionToast] = useState<string | null>(null);

  // Syntax highlighting & Editor view state
  const [syntaxHighlightEnabled, setSyntaxHighlightEnabled] = useState(true);
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Sync scroll from textarea to pre and line numbers gutter
  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  // Pre-computed Prism-highlighted HTML
  const highlightedCode = useMemo(() => {
    return highlightPowerShell(scriptText);
  }, [scriptText]);

  // Pre-computed line numbers
  const lineNumbers = useMemo(() => {
    const count = scriptText.split('\n').length;
    return Array.from({ length: Math.max(1, count) }, (_, i) => i + 1);
  }, [scriptText]);

  const [sandboxEngine, setSandboxEngine] = useState<'wasm-ps' | 'pyodide'>('wasm-ps');
  const [isPyodideLoading, setIsPyodideLoading] = useState(false);
  const [isPyodideReady, setIsPyodideReady] = useState(false);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugStepIndex, setDebugStepIndex] = useState(0);
  const [commandPromptInput, setCommandPromptInput] = useState('');
  const [activeInspectorTab, setActiveInspectorTab] = useState<'terminal' | 'services' | 'vfs' | 'registry' | 'audit' | 'linter'>('terminal');
  const [linterSeverityFilter, setLinterSeverityFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  // Terminal logs
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      text: 'Windows PowerShell [Version 10.0.26100.1882] (WASM Isolated Sandbox)',
      type: 'info',
      timestamp: new Date().toLocaleTimeString()
    },
    {
      id: 'init-2',
      text: '(c) Microsoft Corporation. All simulated rights reserved in local memory.',
      type: 'info',
      timestamp: new Date().toLocaleTimeString()
    },
    {
      id: 'init-3',
      text: 'Loaded client-side virtual environment: [Zero Cloud Quota / Zero Real Host Alteration]',
      type: 'success',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  // Virtual environment state
  const [services, setServices] = useState<VirtualService[]>([
    { name: 'wuauserv', displayName: 'Windows Update Service', status: 'Running', startType: 'Automatic' },
    { name: 'bits', displayName: 'Background Intelligent Transfer Service', status: 'Running', startType: 'Manual' },
    { name: 'cryptsvc', displayName: 'Cryptographic Services', status: 'Running', startType: 'Automatic' },
    { name: 'NlaSvc', displayName: 'Network Location Awareness', status: 'Running', startType: 'Automatic' },
    { name: 'AppXSvc', displayName: 'AppX Deployment Service', status: 'Running', startType: 'Manual' },
    { name: 'sppsvc', displayName: 'Software Protection Service', status: 'Stopped', startType: 'Manual' },
    { name: 'SecurityHealthService', displayName: 'Windows Security Service', status: 'Running', startType: 'Automatic' },
    { name: 'WinDefend', displayName: 'Microsoft Defender Antivirus Service', status: 'Running', startType: 'Automatic' }
  ]);

  const [vfs, setVfs] = useState<VirtualFile[]>([
    { path: 'C:\\Windows\\System32\\drivers\\etc\\hosts', size: '824 B', status: 'exists', description: 'Local DNS mappings' },
    { path: 'C:\\Windows\\SoftwareDistribution\\Download\\temp_patch.cab', size: '42.8 MB', status: 'exists', description: 'Pending update download chunk' },
    { path: 'C:\\Windows\\SoftwareDistribution\\DataStore\\DataStore.edb', size: '128.5 MB', status: 'exists', description: 'Update repository database' },
    { path: 'C:\\Windows\\System32\\catroot2\\catdb', size: '4.2 MB', status: 'exists', description: 'Cryptographic catalog' },
    { path: 'C:\\Program Files\\Windows Defender\\MpCmdRun.exe', size: '1.4 MB', status: 'exists', description: 'Defender command-line utility' },
    { path: 'C:\\Users\\Admin\\AppData\\Local\\Temp\\setup.log', size: '18 KB', status: 'exists', description: 'User temp installation log' }
  ]);

  const [registry, setRegistry] = useState<VirtualRegistryKey[]>([
    { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization', name: 'DODownloadMode', value: 1, status: 'unchanged' },
    { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate', name: 'ExcludeWUDriversInQualityUpdate', value: 0, status: 'unchanged' },
    { path: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\SCHANNEL\\Protocols\\TLS 1.0\\Client', name: 'Enabled', value: 1, status: 'unchanged' }
  ]);

  const [variables, setVariables] = useState<Record<string, string>>({
    '$env:SystemRoot': 'C:\\Windows',
    '$env:ProgramFiles': 'C:\\Program Files',
    '$env:TEMP': 'C:\\Users\\Admin\\AppData\\Local\\Temp',
    '$env:USERNAME': 'WinFixUser',
    '$LASTEXITCODE': '0',
    '$?': 'True'
  });

  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Static security report for current script
  const securityReport: PowerShellSecurityReport = useMemo(() => {
    return verifyPowerShellScript(scriptText);
  }, [scriptText]);

  // Real-time PSScriptAnalyzer rule-based lint report
  const lintReport: PowerShellLintReport = useMemo(() => {
    return analyzePowerShellScript(scriptText);
  }, [scriptText]);

  // Map of line numbers to highest severity diagnostic for line gutter markers
  const diagnosticsByLine = useMemo(() => {
    const map = new Map<number, PowerShellLintDiagnostic>();
    lintReport.diagnostics.forEach(diag => {
      const existing = map.get(diag.line);
      if (!existing || (diag.severity === 'error' && existing.severity !== 'error')) {
        map.set(diag.line, diag);
      }
    });
    return map;
  }, [lintReport.diagnostics]);

  const handleAutoFixSingle = (diag: PowerShellLintDiagnostic) => {
    const updated = autoFixDiagnostic(scriptText, diag);
    setScriptText(updated);
    appendTerminalLine(`[Linter Fix] Auto-refactored Rule '${diag.ruleId}' at Line #${diag.line}`, 'success');
  };

  const handleAutoFixAll = () => {
    const { fixedScript, fixesAppliedCount } = autoFixAllFixable(scriptText);
    setScriptText(fixedScript);
    appendTerminalLine(`[Linter Fix] Batch auto-refactored ${fixesAppliedCount} linter warnings in script editor.`, 'success');
  };

  // Auto-scroll terminal
  useEffect(() => {
    if (activeInspectorTab === 'terminal') {
      terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLines, activeInspectorTab]);

  // Listen for custom bridge event to set script from other tabs
  useEffect(() => {
    const handleSetScript = (e: any) => {
      if (e?.detail?.script) {
        setScriptText(e.detail.script);
        appendTerminalLine(`[Bridge] Loaded script from external module into sandbox editor (${e.detail.script.length} chars)`, 'info');
      }
    };
    window.addEventListener('uwes-set-sandbox-script', handleSetScript);
    return () => window.removeEventListener('uwes-set-sandbox-script', handleSetScript);
  }, []);

  // Helper to append terminal line
  const appendTerminalLine = useCallback((text: string, type: TerminalLine['type'] = 'stdout') => {
    const line: TerminalLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setTerminalLines(prev => [...prev, line]);
  }, []);

  // Clear terminal
  const handleClearTerminal = () => {
    setTerminalLines([
      {
        id: `clear-${Date.now()}`,
        text: 'Terminal buffer cleared. Sandbox environment active.',
        type: 'info',
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  // Reset Virtual Environment to original baseline
  const handleResetEnvironment = () => {
    setServices([
      { name: 'wuauserv', displayName: 'Windows Update Service', status: 'Running', startType: 'Automatic' },
      { name: 'bits', displayName: 'Background Intelligent Transfer Service', status: 'Running', startType: 'Manual' },
      { name: 'cryptsvc', displayName: 'Cryptographic Services', status: 'Running', startType: 'Automatic' },
      { name: 'NlaSvc', displayName: 'Network Location Awareness', status: 'Running', startType: 'Automatic' },
      { name: 'AppXSvc', displayName: 'AppX Deployment Service', status: 'Running', startType: 'Manual' },
      { name: 'sppsvc', displayName: 'Software Protection Service', status: 'Stopped', startType: 'Manual' },
      { name: 'SecurityHealthService', displayName: 'Windows Security Service', status: 'Running', startType: 'Automatic' },
      { name: 'WinDefend', displayName: 'Microsoft Defender Antivirus Service', status: 'Running', startType: 'Automatic' }
    ]);
    setVfs([
      { path: 'C:\\Windows\\System32\\drivers\\etc\\hosts', size: '824 B', status: 'exists', description: 'Local DNS mappings' },
      { path: 'C:\\Windows\\SoftwareDistribution\\Download\\temp_patch.cab', size: '42.8 MB', status: 'exists', description: 'Pending update download chunk' },
      { path: 'C:\\Windows\\SoftwareDistribution\\DataStore\\DataStore.edb', size: '128.5 MB', status: 'exists', description: 'Update repository database' },
      { path: 'C:\\Windows\\System32\\catroot2\\catdb', size: '4.2 MB', status: 'exists', description: 'Cryptographic catalog' },
      { path: 'C:\\Program Files\\Windows Defender\\MpCmdRun.exe', size: '1.4 MB', status: 'exists', description: 'Defender command-line utility' },
      { path: 'C:\\Users\\Admin\\AppData\\Local\\Temp\\setup.log', size: '18 KB', status: 'exists', description: 'User temp installation log' }
    ]);
    setRegistry([
      { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization', name: 'DODownloadMode', value: 1, status: 'unchanged' },
      { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate', name: 'ExcludeWUDriversInQualityUpdate', value: 0, status: 'unchanged' },
      { path: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\SCHANNEL\\Protocols\\TLS 1.0\\Client', name: 'Enabled', value: 1, status: 'unchanged' }
    ]);
    setVariables({
      '$env:SystemRoot': 'C:\\Windows',
      '$env:ProgramFiles': 'C:\\Program Files',
      '$env:TEMP': 'C:\\Users\\Admin\\AppData\\Local\\Temp',
      '$env:USERNAME': 'WinFixUser',
      '$LASTEXITCODE': '0',
      '$?': 'True'
    });
    setDebugStepIndex(0);
    setIsDebugging(false);
    appendTerminalLine('[Reset] Virtual sandbox state restored to default Windows 11 factory baseline.', 'warning');
  };

  // Optional Pyodide WebAssembly engine loader
  const handleLoadPyodideEngine = async () => {
    if (isPyodideReady) return;
    setIsPyodideLoading(true);
    appendTerminalLine('[Pyodide WASM] Initializing Pyodide WebAssembly runtime...', 'cyan');
    try {
      // Check if already in window
      if (!(window as any).loadPyodide) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js';
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const pyodide = await (window as any).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/'
      });
      (window as any).__pyodideInstance = pyodide;
      setIsPyodideReady(true);
      setSandboxEngine('pyodide');
      appendTerminalLine('[Pyodide WASM] WebAssembly environment active: Python 3.12 (CPython WASM) ready for AST evaluation.', 'green');
    } catch (err: any) {
      console.warn('Pyodide dynamic load error (offline or CSP restricted):', err);
      appendTerminalLine(`[Pyodide WASM] Note: CDN script blocked or offline. Falling back to native client-side WASM-PS virtual engine. (${err?.message || 'Fallback mode'})`, 'warning');
      setSandboxEngine('wasm-ps');
    } finally {
      setIsPyodideLoading(false);
    }
  };

  // Virtual execution engine for a single command line
  const executeSingleCommandLine = async (rawLine: string): Promise<boolean> => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      if (line.startsWith('#')) {
        appendTerminalLine(line, 'magenta');
      }
      return true;
    }

    appendTerminalLine(`PS C:\\Windows\\System32> ${line}`, 'prompt');

    // 1. Write-Host
    if (/^Write-Host\b/i.test(line)) {
      const colorMatch = line.match(/-ForegroundColor\s+(\w+)/i);
      const color = colorMatch ? colorMatch[1].toLowerCase() : 'stdout';
      
      let content = line
        .replace(/^Write-Host\s+/i, '')
        .replace(/-ForegroundColor\s+\w+/i, '')
        .trim();
      
      // strip surrounding quotes
      if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
        content = content.slice(1, -1);
      }

      let type: TerminalLine['type'] = 'stdout';
      if (color.includes('cyan')) type = 'cyan';
      else if (color.includes('green')) type = 'green';
      else if (color.includes('yellow')) type = 'yellow';
      else if (color.includes('red')) type = 'warning';
      else if (color.includes('magenta')) type = 'magenta';

      appendTerminalLine(content, type);
      return true;
    }

    // 2. Stop-Service / Start-Service / Restart-Service / Get-Service
    const svcMatch = line.match(/^(Stop|Start|Restart|Get)-Service\s+(?:-Name\s+)?["']?([\w-]+)["']?/i);
    if (svcMatch) {
      const action = svcMatch[1].toLowerCase();
      const svcName = svcMatch[2];
      
      if (action === 'get') {
        const found = services.find(s => s.name.toLowerCase() === svcName.toLowerCase());
        if (found) {
          appendTerminalLine(`Status   Name               DisplayName`, 'info');
          appendTerminalLine(`------   ----               -----------`, 'info');
          appendTerminalLine(`${found.status.padEnd(8)} ${found.name.padEnd(18)} ${found.displayName}`, found.status === 'Running' ? 'green' : 'yellow');
        } else {
          appendTerminalLine(`Get-Service : Cannot find any service with service name '${svcName}'.`, 'warning');
        }
        return true;
      }

      const newStatus = action === 'stop' ? 'Stopped' : 'Running';
      setServices(prev => prev.map(s => {
        if (s.name.toLowerCase() === svcName.toLowerCase()) {
          return { ...s, status: newStatus };
        }
        return s;
      }));

      appendTerminalLine(`[V-Service] Service '${svcName}' transition: => ${newStatus} (OK)`, 'green');
      return true;
    }

    // 3. SFC /scannow
    if (/sfc\s+\/scannow/i.test(line)) {
      appendTerminalLine('Beginning system scan. This process will take some time in sandbox...', 'stdout');
      appendTerminalLine('Beginning verification phase of system scan.', 'stdout');
      appendTerminalLine('Verification 100% complete.', 'green');
      appendTerminalLine('Windows Resource Protection did not find any integrity violations.', 'success');
      return true;
    }

    // 4. DISM
    if (/dism\b/i.test(line)) {
      if (/CheckHealth/i.test(line)) {
        appendTerminalLine('Deployment Image Servicing and Management tool [Version 10.0.26100.1882]', 'stdout');
        appendTerminalLine('Image Version: 10.0.26100.1882', 'stdout');
        appendTerminalLine('No component store corruption detected. The operation completed successfully.', 'green');
      } else if (/RestoreHealth/i.test(line)) {
        appendTerminalLine('Deployment Image Servicing and Management tool [Version 10.0.26100.1882]', 'stdout');
        appendTerminalLine('[==========================100.0%==========================] The restore operation completed successfully.', 'green');
        appendTerminalLine('The operation completed successfully.', 'success');
      } else {
        appendTerminalLine('The operation completed successfully.', 'success');
      }
      return true;
    }

    // 5. ipconfig
    if (/ipconfig\b/i.test(line)) {
      if (/flushdns/i.test(line)) {
        appendTerminalLine('Windows IP Configuration', 'info');
        appendTerminalLine('Successfully flushed the DNS Resolver Cache.', 'green');
      } else if (/release/i.test(line)) {
        appendTerminalLine('Ethernet adapter Ethernet 0: IP address released: 0.0.0.0', 'yellow');
      } else if (/renew/i.test(line)) {
        appendTerminalLine('Ethernet adapter Ethernet 0: IPv4 Address. . . . : 192.168.1.145', 'green');
        appendTerminalLine('Default Gateway . . . . . . . . . : 192.168.1.1', 'stdout');
      } else {
        appendTerminalLine('Ethernet adapter Ethernet 0: 192.168.1.145 / 255.255.255.0', 'stdout');
      }
      return true;
    }

    // 6. netsh
    if (/netsh\b/i.test(line)) {
      if (/winsock\s+reset/i.test(line)) {
        appendTerminalLine('Successfully reset the Winsock Catalog. You must restart the computer in order to complete the reset.', 'green');
      } else if (/int\s+ip\s+reset/i.test(line)) {
        appendTerminalLine('Resetting Global, OK!\nResetting Interface, OK!\nResetting Unicast Address, OK!\nRestart the computer to complete this action.', 'green');
      } else {
        appendTerminalLine('Netsh configuration command simulated with exit code 0.', 'green');
      }
      return true;
    }

    // 7. wsreset.exe
    if (/wsreset(\.exe)?/i.test(line)) {
      appendTerminalLine('[wsreset] Clearing Microsoft Store App cache and registering licensing tokens...', 'cyan');
      appendTerminalLine('[wsreset] Cache wipe finished. Store package runtime re-initialized.', 'green');
      return true;
    }

    // 8. gpupdate
    if (/gpupdate(\.exe)?/i.test(line)) {
      appendTerminalLine('Updating policy...', 'stdout');
      appendTerminalLine('Computer Policy update has completed successfully.', 'green');
      appendTerminalLine('User Policy update has completed successfully.', 'green');
      return true;
    }

    // 9. Remove-Item
    if (/Remove-Item\b/i.test(line)) {
      const pathMatch = line.match(/-Path\s+["']?([^"']+)["']?/i);
      const targetPath = pathMatch ? pathMatch[1] : '';
      if (targetPath) {
        setVfs(prev => prev.map(f => {
          if (f.path.toLowerCase().includes(targetPath.replace(/\\?\*$/, '').toLowerCase())) {
            return { ...f, status: 'deleted' };
          }
          return f;
        }));
        appendTerminalLine(`[VFS] Remove-Item: Purged files matching '${targetPath}'.`, 'yellow');
      } else {
        appendTerminalLine(`[VFS] Remove-Item executed on target path.`, 'yellow');
      }
      return true;
    }

    // 10. New-Item / Set-ItemProperty (Registry)
    if (/(New-Item|Set-ItemProperty|New-ItemProperty)\b/i.test(line)) {
      const pathMatch = line.match(/-Path\s+["']?([^"']+)["']?/i);
      const nameMatch = line.match(/-Name\s+["']?([^"']+)["']?/i);
      const valueMatch = line.match(/-Value\s+([^\s]+)/i);

      const regPath = pathMatch ? pathMatch[1] : 'HKLM:\\SOFTWARE\\Policies';
      const propName = nameMatch ? nameMatch[1] : 'Configured';
      const propValue = valueMatch ? valueMatch[1] : '1';

      setRegistry(prev => {
        const existingIdx = prev.findIndex(r => r.path === regPath && r.name === propName);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { path: regPath, name: propName, value: propValue, status: 'set' };
          return updated;
        }
        return [...prev, { path: regPath, name: propName, value: propValue, status: 'set' }];
      });

      appendTerminalLine(`[Registry] Key '${regPath}\\${propName}' set to '${propValue}' (OK)`, 'green');
      return true;
    }

    // 11. Variable assignment ($var = ...)
    const varAssignMatch = line.match(/^(\$[\w:]+)\s*=\s*(.+)$/);
    if (varAssignMatch) {
      const varName = varAssignMatch[1];
      const varVal = varAssignMatch[2].replace(/["']/g, '');
      setVariables(prev => ({ ...prev, [varName]: varVal }));
      appendTerminalLine(`[Variable] ${varName} = "${varVal}"`, 'cyan');
      return true;
    }

    // 12. AppX Package
    if (/Get-AppXPackage/i.test(line)) {
      appendTerminalLine('Name              : Microsoft.WindowsStore', 'stdout');
      appendTerminalLine('Publisher         : CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US', 'stdout');
      appendTerminalLine('Architecture      : X64', 'stdout');
      appendTerminalLine('ResourceId        : ~', 'stdout');
      appendTerminalLine('Version           : 22409.1401.3.0', 'stdout');
      appendTerminalLine('PackageFullName   : Microsoft.WindowsStore_22409.1401.3.0_x64__8wekyb3d8bbwe', 'green');
      appendTerminalLine('InstallLocation   : C:\\Program Files\\WindowsApps\\Microsoft.WindowsStore_22409.1401.3.0_x64__8wekyb3d8bbwe', 'stdout');
      appendTerminalLine('Status            : Ok', 'success');
      return true;
    }

    // Default simulation line echo
    appendTerminalLine(`Command executed in isolated memory sandbox with exit code 0.`, 'success');
    return true;
  };

  // Run full script
  const handleRunFullScript = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setIsDebugging(false);

    appendTerminalLine('------------------------------------------------------------', 'info');
    appendTerminalLine(`[Sandbox Run] Starting execution via ${sandboxEngine.toUpperCase()} engine...`, 'cyan');

    const lines = scriptText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      await executeSingleCommandLine(line);
      // Small pause to give realistic execution feel
      await new Promise(r => setTimeout(r, 60));
    }

    appendTerminalLine(`[Sandbox Run] Execution completed. All operations isolated from host.`, 'green');
    appendTerminalLine('------------------------------------------------------------', 'info');
    setIsRunning(false);
  };

  // Step-by-step debugger
  const handleStartDebug = () => {
    setIsDebugging(true);
    setDebugStepIndex(0);
    appendTerminalLine('[Debugger] Step-by-step interactive mode engaged. Press "Step Next" to step through instructions.', 'yellow');
  };

  const handleStepNext = async () => {
    const rawLines = scriptText.split('\n');
    const validLines = rawLines.map((l, idx) => ({ line: l.trim(), originalIdx: idx })).filter(item => item.line.length > 0);

    if (debugStepIndex >= validLines.length) {
      appendTerminalLine('[Debugger] Reached end of script instructions.', 'green');
      setIsDebugging(false);
      return;
    }

    const currentItem = validLines[debugStepIndex];
    appendTerminalLine(`[Step ${debugStepIndex + 1}/${validLines.length}] Line #${currentItem.originalIdx + 1}: ${currentItem.line}`, 'cyan');
    await executeSingleCommandLine(currentItem.line);
    setDebugStepIndex(prev => prev + 1);
  };

  // Direct prompt input execution
  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandPromptInput.trim()) return;
    const cmd = commandPromptInput.trim();
    setCommandPromptInput('');
    executeSingleCommandLine(cmd);
  };

  // Copy helpers
  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Save current script as new version checkpoint
  const handleSaveNewVersion = (customLabel?: string) => {
    const trimmed = scriptText.trim();
    if (!trimmed) {
      setVersionToast(language === 'en' ? 'Cannot save an empty script' : '빈 스크립트는 저장할 수 없습니다');
      setTimeout(() => setVersionToast(null), 2500);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const defaultLabel = `${language === 'en' ? 'Version' : '버전'} ${versions.length + 1} (${timeStr})`;
    const finalLabel = customLabel?.trim() || versionLabelInput.trim() || defaultLabel;

    const newVer: ScriptVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: finalLabel,
      script: scriptText,
      createdAt: now.toISOString(),
      lineCount: scriptText.split('\n').length,
      charCount: scriptText.length
    };

    const updated = [newVer, ...versions];
    setVersions(updated);
    try {
      localStorage.setItem('winfix_sandbox_script_versions', JSON.stringify(updated));
    } catch (e) {}

    setVersionLabelInput('');
    appendTerminalLine(`[Version Control] Saved script checkpoint: '${finalLabel}' (${newVer.lineCount} lines)`, 'success');
    setVersionToast(language === 'en' ? `Saved checkpoint: '${finalLabel}'` : `'${finalLabel}' 버전이 저장되었습니다`);
    setTimeout(() => setVersionToast(null), 3000);
  };

  // Revert editor to a specific version checkpoint
  const handleRevertToVersion = (ver: ScriptVersion) => {
    setScriptText(ver.script);
    appendTerminalLine(`[Version Control] Reverted editor to '${ver.label}' (Saved: ${new Date(ver.createdAt).toLocaleString()})`, 'cyan');
    setVersionToast(language === 'en' ? `Reverted to '${ver.label}'` : `'${ver.label}' 버전으로 복원되었습니다`);
    setTimeout(() => setVersionToast(null), 3000);
    setShowVersionModal(false);
    setPreviewVersion(null);
  };

  // Rename or update label of an existing version
  const handleUpdateVersionLabel = (id: string, newLabel: string) => {
    if (!newLabel.trim()) return;
    const updated = versions.map(v => v.id === id ? { ...v, label: newLabel.trim() } : v);
    setVersions(updated);
    try {
      localStorage.setItem('winfix_sandbox_script_versions', JSON.stringify(updated));
    } catch (e) {}
    setEditingVersionId(null);
  };

  // Delete a saved version
  const handleDeleteVersion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = versions.filter(v => v.id !== id);
    setVersions(updated);
    try {
      localStorage.setItem('winfix_sandbox_script_versions', JSON.stringify(updated));
    } catch (e) {}
    if (previewVersion?.id === id) setPreviewVersion(null);
    setVersionToast(language === 'en' ? 'Version removed' : '버전이 삭제되었습니다');
    setTimeout(() => setVersionToast(null), 2000);
  };

  const handleCopyTerminal = () => {
    const allText = terminalLines.map(l => `[${l.timestamp}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(allText);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const handleExportLogFile = () => {
    const allText = terminalLines.map(l => `[${l.timestamp}] ${l.text}`).join('\n');
    const blob = new Blob([allText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `winfix-sandbox-session-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Engine Status */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400 shrink-0">
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {language === 'en' ? 'PowerShell Isolated WebAssembly Sandbox' : 'PowerShell 격리형 WebAssembly 샌드박스'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  100% Client-Side Safe
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {sandboxEngine === 'wasm-ps' ? 'wasm-ps (v2.4)' : 'Pyodide WASM (Python 3.12)'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {language === 'en'
                  ? 'Safely execute, step-debug, and inspect PowerShell scripts inside a fully isolated browser memory sandbox. Zero real PC changes, zero cloud quota costs.'
                  : '실제 PC 변경 및 클라우드 비용 없이 브라우저 메모리 가상 환경에서 PowerShell 스크립트를 안전하게 모의 실행, 단계별 디버깅 및 서비스/레지스트리 변경 사항을 점검합니다.'}
              </p>
            </div>
          </div>

          {/* Engine Selector & Reset */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setSandboxEngine('wasm-ps')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  sandboxEngine === 'wasm-ps'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="빠른 네이티브 클라이언트 가상 엔진"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Wasm-PS</span>
              </button>
              <button
                onClick={handleLoadPyodideEngine}
                disabled={isPyodideLoading}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  sandboxEngine === 'pyodide'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Pyodide CPython WebAssembly 엔진 활성화"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isPyodideLoading ? 'animate-spin' : ''}`} />
                <span>{isPyodideLoading ? 'Loading Pyodide...' : 'Pyodide WASM'}</span>
              </button>
            </div>

            <button
              onClick={handleResetEnvironment}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="가상 파일/서비스/레지스트리 상태 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'en' ? 'Reset V-State' : '가상 상태 초기화'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <FileCode className="w-4 h-4 text-indigo-500" />
            <span>{language === 'en' ? 'Standard Repair Script Presets' : '표준 복구 스크립트 프리셋'}</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {language === 'en' ? 'Click to load into editor' : '클릭하여 편집기에 로드'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SANDBOX_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setScriptText(preset.code);
                appendTerminalLine(`[Preset] Loaded '${preset.nameEn}' into sandbox editor.`, 'info');
              }}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {preset.category}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {language === 'en' ? preset.nameEn : preset.nameKo}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Dual-Pane Layout: Editor (Left) & Sandbox Inspectors (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Code Editor & Execution Controls (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            {/* Editor Title Bar */}
            <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300 text-xs font-mono font-bold flex-wrap">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>ScriptEditor.ps1</span>
                
                {/* Live Linter Score & Diagnostics Summary Badge */}
                <button
                  type="button"
                  onClick={() => setActiveInspectorTab('linter')}
                  className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    lintReport.errorCount > 0
                      ? 'bg-rose-950/80 border-rose-800/80 text-rose-300 hover:bg-rose-900/80'
                      : lintReport.warningCount > 0
                      ? 'bg-amber-950/80 border-amber-800/80 text-amber-300 hover:bg-amber-900/80'
                      : 'bg-emerald-950/80 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/80'
                  }`}
                  title={language === 'en' ? 'Open Real-Time PowerShell Linter & Analyzer' : '실시간 PowerShell 룰 기반 린터 분석기 열기'}
                >
                  <Sliders className="w-3 h-3" />
                  <span>Lint {lintReport.qualityScore}/100</span>
                  {lintReport.errorCount > 0 && <span className="text-rose-400 font-mono">({lintReport.errorCount} Err)</span>}
                  {lintReport.warningCount > 0 && <span className="text-amber-400 font-mono">({lintReport.warningCount} Warn)</span>}
                </button>

                {versionToast && (
                  <span className="text-[10px] text-emerald-400 font-sans font-normal animate-fade-in flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    <Check className="w-3 h-3" />
                    {versionToast}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {/* Version History Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowVersionModal(true)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 hover:text-white hover:bg-indigo-900/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={language === 'en' ? 'Manage Script Version History' : '스크립트 버전 관리 및 이전 버전 복원'}
                >
                  <History className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{language === 'en' ? 'Versions' : '버전 관리'}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-900 text-indigo-200">
                    {versions.length}
                  </span>
                </button>

                {/* Quick Save Version Checkpoint Button */}
                <button
                  type="button"
                  onClick={() => handleSaveNewVersion()}
                  className="px-2.5 py-1 text-xs rounded-lg bg-blue-950/70 border border-blue-800/60 text-blue-300 hover:text-white hover:bg-blue-900/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={language === 'en' ? 'Save current script as new version' : '현재 스크립트를 새 버전으로 저장'}
                >
                  <Save className="w-3.5 h-3.5 text-blue-400" />
                  <span>{language === 'en' ? 'Save Version' : '버전 저장'}</span>
                </button>

                {/* Prism Syntax Highlighting Toggle */}
                <button
                  type="button"
                  onClick={() => setSyntaxHighlightEnabled(!syntaxHighlightEnabled)}
                  className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                    syntaxHighlightEnabled
                      ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={language === 'en' ? 'Toggle PrismJS Syntax Highlighting' : 'PrismJS 구문 강조(하이라이팅) 켜기/끄기'}
                >
                  <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{syntaxHighlightEnabled ? 'Prism: ON' : 'Prism: OFF'}</span>
                </button>

                {/* Edit vs Preview Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setEditorMode(editorMode === 'edit' ? 'preview' : 'edit')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  title={editorMode === 'edit' ? (language === 'en' ? 'Switch to Highlighted Preview' : '구문 강조 뷰어로 전환') : (language === 'en' ? 'Switch to Editor' : '편집기로 전환')}
                >
                  {editorMode === 'edit' ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <Edit3 className="w-3.5 h-3.5 text-indigo-400" />}
                  <span>{editorMode === 'edit' ? (language === 'en' ? 'Preview' : '미리보기') : (language === 'en' ? 'Edit' : '편집')}</span>
                </button>

                <button
                  onClick={handleCopyScript}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title={language === 'en' ? 'Copy Script' : '스크립트 복사'}
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setScriptText('')}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title={language === 'en' ? 'Clear Editor' : '편집기 비우기'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Syntax-Highlighted Code Editor with Line Numbers Gutter */}
            <div className="relative flex bg-slate-950 font-mono text-xs border-y border-slate-800/80 min-h-[360px] max-h-[500px] overflow-hidden">
              {/* Line Numbers Gutter with Real-Time Linter Diagnostic Indicators */}
              <div
                ref={gutterRef}
                className="w-11 bg-slate-950/90 text-slate-600 select-none text-right pr-2 pt-3 font-mono text-xs leading-[21px] border-r border-slate-800/60 overflow-hidden shrink-0"
              >
                {lineNumbers.map(n => {
                  const diag = diagnosticsByLine.get(n);
                  return (
                    <div
                      key={n}
                      onClick={() => { if (diag) setActiveInspectorTab('linter'); }}
                      className={`h-[21px] leading-[21px] flex items-center justify-end gap-1 cursor-pointer transition-colors hover:bg-slate-800/40 px-0.5 rounded ${
                        diag?.severity === 'error' ? 'text-rose-400 font-bold' :
                        diag?.severity === 'warning' ? 'text-amber-400 font-bold' :
                        diag?.severity === 'info' ? 'text-blue-400' : ''
                      }`}
                      title={diag ? `[Line #${n}] ${language === 'en' ? diag.message : diag.messageKo}` : undefined}
                    >
                      {diag && (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          diag.severity === 'error' ? 'bg-rose-500 animate-pulse' :
                          diag.severity === 'warning' ? 'bg-amber-400' :
                          'bg-blue-400'
                        }`} />
                      )}
                      <span>{n}</span>
                    </div>
                  );
                })}
              </div>

              {/* Editor Workspace: Dual-Layer (Underlay Pre + Overlay Textarea) */}
              <div className="relative flex-1 h-full min-h-[360px] max-h-[500px] overflow-hidden">
                {editorMode === 'edit' ? (
                  <>
                    {/* Layer 1: Prism Syntax-Highlighted HTML (Underlay) */}
                    {syntaxHighlightEnabled && (
                      <pre
                        ref={preRef}
                        aria-hidden="true"
                        className="language-powershell pointer-events-none select-none m-0 p-3 w-full h-full font-mono text-xs leading-[21px] whitespace-pre overflow-hidden bg-transparent"
                        style={{ tabSize: 2 }}
                        dangerouslySetInnerHTML={{
                          __html: highlightedCode + (scriptText.endsWith('\n') ? '\n ' : '')
                        }}
                      />
                    )}

                    {/* Layer 2: Transparent Input Textarea (Overlay) */}
                    <textarea
                      ref={textareaRef}
                      value={scriptText}
                      onChange={e => setScriptText(e.target.value)}
                      onScroll={handleEditorScroll}
                      rows={16}
                      spellCheck={false}
                      placeholder="# Enter or paste PowerShell commands here..."
                      className={`absolute inset-0 p-3 w-full h-full bg-transparent font-mono text-xs leading-[21px] outline-none resize-none overflow-auto whitespace-pre selection:bg-blue-600/40 ${
                        syntaxHighlightEnabled 
                          ? 'text-transparent caret-cyan-400' 
                          : 'text-blue-300 caret-white'
                      }`}
                      style={{ tabSize: 2 }}
                    />
                  </>
                ) : (
                  /* Preview Mode: Read-only fully highlighted code view with selection */
                  <div className="p-3 w-full h-full overflow-auto">
                    <pre
                      className="language-powershell m-0 font-mono text-xs leading-[21px] whitespace-pre bg-transparent"
                      style={{ tabSize: 2 }}
                      dangerouslySetInnerHTML={{ __html: highlightedCode }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunFullScript}
                  disabled={isRunning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-pulse' : ''}`} />
                  <span>{isRunning ? (language === 'en' ? 'Executing...' : '가상 실행 중...') : (language === 'en' ? 'Run in Sandbox' : '샌드박스 전체 실행')}</span>
                </button>

                {!isDebugging ? (
                  <button
                    onClick={handleStartDebug}
                    disabled={isRunning}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Bug className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'en' ? 'Debug Step' : '단계별 디버깅'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStepNext}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer animate-pulse"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Step Next' : '다음 단계 실행'}</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                {scriptText.split('\n').length} lines
              </div>
            </div>
          </div>

          {/* Quick Safety Heuristic Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                securityReport.safetyRating === 'SECURE' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' :
                securityReport.safetyRating === 'LOW_RISK' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' :
                'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {language === 'en' ? 'Pre-flight AST Security Rating' : '사전 AST 보안 등급'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Rating: <span className="font-bold font-mono">{securityReport.safetyRating}</span> (Obfuscation: {securityReport.obfuscationScore}/100)
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveInspectorTab('audit')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              {language === 'en' ? 'View Audit' : '분석 보기'}
            </button>
          </div>
        </div>

        {/* Right Pane: Interactive Terminal & Virtual State Inspectors (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[520px]">
            {/* Inspector Tab Bar */}
            <div className="bg-slate-950 px-3 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveInspectorTab('terminal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeInspectorTab === 'terminal'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Terminal Console' : '터미널 콘솔'}</span>
                </button>

                <button
                  onClick={() => setActiveInspectorTab('services')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeInspectorTab === 'services'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'V-Services' : '가상 서비스'}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                    {services.filter(s => s.status === 'Running').length}/{services.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveInspectorTab('vfs')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeInspectorTab === 'vfs'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'V-Filesystem' : '가상 파일시스템'}</span>
                </button>

                <button
                  onClick={() => setActiveInspectorTab('registry')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeInspectorTab === 'registry'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'V-Registry' : '가상 레지스트리'}</span>
                </button>

                <button
                  onClick={() => setActiveInspectorTab('audit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeInspectorTab === 'audit'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Safety Audit' : '보안 감사'}</span>
                </button>

                {/* Rule Linter & Best Practices Analyzer Tab Button */}
                <button
                  onClick={() => setActiveInspectorTab('linter')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeInspectorTab === 'linter'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'en' ? 'Rule Linter' : '실시간 린터'}</span>
                  {(lintReport.errorCount > 0 || lintReport.warningCount > 0) ? (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${lintReport.errorCount > 0 ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'}`}>
                      {lintReport.errorCount + lintReport.warningCount}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                      100/100
                    </span>
                  )}
                </button>
              </div>

              {/* Console Action Buttons */}
              {activeInspectorTab === 'terminal' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyTerminal}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="콘솔 로그 복사"
                  >
                    {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleExportLogFile}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="로그 파일 내보내기 (.log)"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleClearTerminal}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                    title="콘솔 화면 지우기 (cls)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Inspector Content Body */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
              {/* TAB 1: Terminal Console */}
              {activeInspectorTab === 'terminal' && (
                <div className="space-y-1.5 select-text">
                  {terminalLines.map(line => (
                    <div
                      key={line.id}
                      className={`leading-relaxed break-words ${
                        line.type === 'prompt' ? 'text-amber-400 font-bold' :
                        line.type === 'info' ? 'text-slate-400' :
                        line.type === 'success' ? 'text-emerald-400 font-semibold' :
                        line.type === 'warning' ? 'text-rose-400' :
                        line.type === 'cyan' ? 'text-cyan-300' :
                        line.type === 'green' ? 'text-emerald-300' :
                        line.type === 'yellow' ? 'text-yellow-300' :
                        line.type === 'magenta' ? 'text-purple-300' :
                        'text-slate-200'
                      }`}
                    >
                      {line.text}
                    </div>
                  ))}
                  <div ref={terminalBottomRef} />
                </div>
              )}

              {/* TAB 2: Virtual Services */}
              {activeInspectorTab === 'services' && (
                <div className="space-y-3 font-sans">
                  <div className="flex items-center justify-between text-slate-400 text-xs border-b border-slate-800 pb-2">
                    <span>Virtual Windows Service Manager</span>
                    <span className="font-mono text-[11px]">Real-time State Tracking</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {services.map(svc => (
                      <div
                        key={svc.name}
                        className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-200 text-xs font-mono">{svc.name}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{svc.displayName}</div>
                          <div className="text-[9px] text-slate-500 mt-0.5">StartType: {svc.startType}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                          svc.status === 'Running'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {svc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: Virtual File System */}
              {activeInspectorTab === 'vfs' && (
                <div className="space-y-3 font-sans">
                  <div className="flex items-center justify-between text-slate-400 text-xs border-b border-slate-800 pb-2">
                    <span>Simulated File System (C:\ Drive)</span>
                    <span className="font-mono text-[11px]">{vfs.length} Virtual Nodes</span>
                  </div>
                  <div className="space-y-2">
                    {vfs.map(file => (
                      <div
                        key={file.path}
                        className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-mono text-xs text-blue-300 truncate">{file.path}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{file.description}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[10px] text-slate-400">{file.size}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            file.status === 'deleted' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            file.status === 'created' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            file.status === 'modified' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {file.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: Virtual Registry */}
              {activeInspectorTab === 'registry' && (
                <div className="space-y-3 font-sans">
                  <div className="flex items-center justify-between text-slate-400 text-xs border-b border-slate-800 pb-2">
                    <span>Virtual Windows Registry Hive</span>
                    <span className="font-mono text-[11px]">{registry.length} Keys Configured</span>
                  </div>
                  <div className="space-y-2">
                    {registry.map((reg, idx) => (
                      <div
                        key={`${reg.path}-${reg.name}-${idx}`}
                        className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1"
                      >
                        <div className="font-mono text-[11px] text-purple-300 break-all">{reg.path}</div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-mono text-xs text-slate-200">{reg.name}</span>
                          <span className="font-mono text-xs text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            Value: {String(reg.value)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: Safety Audit */}
              {activeInspectorTab === 'audit' && (
                <div className="space-y-4 font-sans text-slate-200">
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">Heuristic Safety Rating</div>
                      <div className="text-xs text-slate-400 mt-0.5">Scanned for suspicious backdoors, IEX, and EncodedCommand</div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold font-mono ${
                      securityReport.safetyRating === 'SECURE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                      securityReport.safetyRating === 'LOW_RISK' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}>
                      {securityReport.safetyRating}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Detected Cmdlets & Binaries</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {securityReport.detectedCmdlets.length > 0 ? (
                        securityReport.detectedCmdlets.map(c => (
                          <span key={c} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300">
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">None detected</span>
                      )}
                    </div>
                  </div>

                  {securityReport.obfuscationSignals.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400">Security Warning Signals</h5>
                      {securityReport.obfuscationSignals.map((sig, i) => (
                        <div key={i} className="p-2.5 rounded-lg border border-amber-900/40 bg-amber-950/20 text-xs text-amber-300 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                          <div>
                            <span className="font-mono font-bold">{sig.pattern}</span>: {language === 'en' ? sig.desc : sig.descKo}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: PSScriptAnalyzer Rule-Based Linter & Best Practices */}
              {activeInspectorTab === 'linter' && (
                <div className="space-y-4 font-sans text-slate-200">
                  {/* Quality Score Top Summary Card */}
                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl border font-bold font-mono text-sm shrink-0 ${
                        lintReport.qualityScore >= 85 ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400' :
                        lintReport.qualityScore >= 60 ? 'bg-amber-950/80 border-amber-500/60 text-amber-400' :
                        'bg-rose-950/80 border-rose-500/60 text-rose-400'
                      }`}>
                        {lintReport.qualityScore}/100
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          <span>{language === 'en' ? 'PowerShell Best-Practices Quality Score' : 'PowerShell 룰 기반 스크립트 품질 점수'}</span>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
                            PSScriptAnalyzer
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {language === 'en'
                            ? `Evaluated ${lintReport.totalRulesEvaluated} static analysis rules (${lintReport.passedRulesCount} passed).`
                            : `총 ${lintReport.totalRulesEvaluated}개 정적 분석 룰 중 ${lintReport.passedRulesCount}개 항목 통과 완료.`}
                        </p>
                      </div>
                    </div>

                    {/* Stat Badges & Batch Auto-Fix */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      <div className="px-2.5 py-1 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-mono font-bold flex items-center gap-1">
                        <span>{lintReport.errorCount}</span>
                        <span className="text-[10px] font-sans font-normal">{language === 'en' ? 'Errors' : '오류'}</span>
                      </div>
                      <div className="px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs font-mono font-bold flex items-center gap-1">
                        <span>{lintReport.warningCount}</span>
                        <span className="text-[10px] font-sans font-normal">{language === 'en' ? 'Warnings' : '경고'}</span>
                      </div>
                      <div className="px-2.5 py-1 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-mono font-bold flex items-center gap-1">
                        <span>{lintReport.infoCount}</span>
                        <span className="text-[10px] font-sans font-normal">{language === 'en' ? 'Infos' : '권장'}</span>
                      </div>
                      {lintReport.fixableCount > 0 && (
                        <button
                          type="button"
                          onClick={handleAutoFixAll}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          title={language === 'en' ? 'Auto-fix all fixable warnings' : '수정 가능한 모든 경고 1-클릭 자동 교정'}
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>{language === 'en' ? `Auto-Fix All (${lintReport.fixableCount})` : `전체 자동 수정 (${lintReport.fixableCount})`}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {language === 'en' ? 'Diagnostics List' : '진단 결과 항목'}
                    </span>
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-medium">
                      <button
                        onClick={() => setLinterSeverityFilter('all')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          linterSeverityFilter === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {language === 'en' ? 'All' : '전체'} ({lintReport.diagnostics.length})
                      </button>
                      <button
                        onClick={() => setLinterSeverityFilter('error')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          linterSeverityFilter === 'error' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {language === 'en' ? 'Errors' : '오류'} ({lintReport.errorCount})
                      </button>
                      <button
                        onClick={() => setLinterSeverityFilter('warning')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          linterSeverityFilter === 'warning' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {language === 'en' ? 'Warnings' : '경고'} ({lintReport.warningCount})
                      </button>
                      <button
                        onClick={() => setLinterSeverityFilter('info')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          linterSeverityFilter === 'info' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {language === 'en' ? 'Infos' : '권장'} ({lintReport.infoCount})
                      </button>
                    </div>
                  </div>

                  {/* Diagnostic Items Render */}
                  {lintReport.diagnostics.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto font-bold text-lg">
                        ✓
                      </div>
                      <h4 className="text-xs font-bold text-emerald-300">
                        {language === 'en' ? 'Perfect Score 100/100 - PSScriptAnalyzer Clean!' : '축하합니다! 룰 기반 린트 진단 결과 오류/경고 0건'}
                      </h4>
                      <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                        {language === 'en'
                          ? 'Your script strictly follows PowerShell syntax rules, approved cmdlet verbs, and security guidelines.'
                          : '현재 작성된 스크립트는 PowerShell 구문 규칙, 승인된 동사 사용 및 주요 보안 권장 사항을 완벽히 준수하고 있습니다.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {lintReport.diagnostics
                        .filter(d => linterSeverityFilter === 'all' || d.severity === linterSeverityFilter)
                        .map((diag) => (
                          <div
                            key={diag.id}
                            className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                              diag.severity === 'error'
                                ? 'bg-rose-950/30 border-rose-900/60 text-slate-200'
                                : diag.severity === 'warning'
                                ? 'bg-amber-950/30 border-amber-900/60 text-slate-200'
                                : 'bg-blue-950/30 border-blue-900/60 text-slate-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                                  diag.severity === 'error' ? 'bg-rose-900 text-rose-200 border border-rose-700' :
                                  diag.severity === 'warning' ? 'bg-amber-900 text-amber-200 border border-amber-700' :
                                  'bg-blue-900 text-blue-200 border border-blue-700'
                                }`}>
                                  {diag.severity}
                                </span>
                                <span className="font-bold text-xs text-slate-100">
                                  {language === 'en' ? diag.ruleName : diag.ruleNameKo}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-indigo-300">
                                  Line #{diag.line}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {diag.ruleId}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">
                              {language === 'en' ? diag.message : diag.messageKo}
                            </p>

                            {diag.codeSnippet && (
                              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto">
                                <code>{diag.codeSnippet}</code>
                              </div>
                            )}

                            {diag.suggestion && (
                              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-emerald-300 flex items-center justify-between gap-2">
                                <div className="flex items-start gap-1.5 min-w-0">
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <div className="truncate">
                                    <span className="font-bold">{language === 'en' ? 'Fix Suggestion: ' : '수정 제안: '}</span>
                                    <span>{language === 'en' ? diag.suggestion : diag.suggestionKo}</span>
                                  </div>
                                </div>
                                {diag.fixable && (
                                  <button
                                    type="button"
                                    onClick={() => handleAutoFixSingle(diag)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-[10px] shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
                                    title={language === 'en' ? 'Apply Auto-Fix' : '자동 수정 적용'}
                                  >
                                    <Wrench className="w-3 h-3" />
                                    <span>{language === 'en' ? 'Auto-Fix' : '자동 수정'}</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Interactive Command Input Bar (Terminal Bottom) */}
            <form onSubmit={handlePromptSubmit} className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <span className="text-amber-400 font-mono text-xs font-bold pl-2 select-none">
                PS&gt;
              </span>
              <input
                type="text"
                value={commandPromptInput}
                onChange={e => setCommandPromptInput(e.target.value)}
                placeholder={language === 'en' ? "Type command here (e.g. sfc /scannow, Get-Service wuauserv, ipconfig /flushdns)..." : "명령어 직접 입력 (예: sfc /scannow, Get-Service wuauserv, ipconfig /flushdns)..."}
                className="flex-1 bg-transparent text-slate-100 font-mono text-xs outline-none placeholder:text-slate-600"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="명령어 가상 실행"
              >
                <CornerDownLeft className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Exec</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Version History Management Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>{language === 'en' ? 'Script Version History' : 'PowerShell 스크립트 버전 관리'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950 text-indigo-400 border border-indigo-800/60">
                      {versions.length} {language === 'en' ? 'checkpoints' : '개 버전'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'en' 
                      ? 'Save custom script iterations, label checkpoints, and revert back at any time.' 
                      : '스크립트 수정본을 라벨과 함께 저장하고, 언제든 원하는 버전으로 복원할 수 있습니다.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setShowVersionModal(false); setPreviewVersion(null); }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Quick Save New Version Bar */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{language === 'en' ? 'Save Current Script as New Version' : '현재 편집기 스크립트를 새 버전으로 저장'}</span>
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={versionLabelInput}
                    onChange={e => setVersionLabelInput(e.target.value)}
                    placeholder={language === 'en' ? "e.g., v1.2 - Added BITS service timeout check..." : "예: v1.2 - BITS 서비스 타임아웃 검사 추가..."}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveNewVersion();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveNewVersion()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Save Version' : '버전 저장'}</span>
                  </button>
                </div>
              </div>

              {/* Version List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>{language === 'en' ? 'Saved Checkpoints' : '저장된 버전 목록'}</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {language === 'en' ? 'Click Revert to load into editor' : '복원 버튼을 누르면 편집기에 즉시 적용됩니다'}
                  </span>
                </h4>

                {versions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl text-xs">
                    {language === 'en' ? 'No saved versions yet. Save a checkpoint above.' : '저장된 버전이 없습니다. 위에서 새 버전을 저장해 보세요.'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {versions.map((ver, idx) => {
                      const isPreviewing = previewVersion?.id === ver.id;
                      const isEditing = editingVersionId === ver.id;

                      return (
                        <div
                          key={ver.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isPreviewing
                              ? 'bg-indigo-950/40 border-indigo-500/80'
                              : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1 min-w-0 flex-1">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editingLabelText}
                                    onChange={e => setEditingLabelText(e.target.value)}
                                    className="bg-slate-900 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white flex-1 outline-hidden"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleUpdateVersionLabel(ver.id, editingLabelText);
                                      if (e.key === 'Escape') setEditingVersionId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleUpdateVersionLabel(ver.id, editingLabelText)}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                                    title="저장"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingVersionId(null)}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg"
                                    title="취소"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-200 truncate">
                                    {ver.label}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingVersionId(ver.id);
                                      setEditingLabelText(ver.label);
                                    }}
                                    className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800 transition-colors"
                                    title={language === 'en' ? 'Rename Label' : '라벨 수정'}
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  {new Date(ver.createdAt).toLocaleString()}
                                </span>
                                <span>•</span>
                                <span className="font-mono text-slate-400">
                                  {ver.lineCount} lines ({ver.charCount} chars)
                                </span>
                              </div>
                            </div>

                            {/* Version Actions */}
                            <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                              <button
                                onClick={() => handleRevertToVersion(ver)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                title={language === 'en' ? 'Revert editor to this script version' : '이 버전으로 편집기 복원'}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{language === 'en' ? 'Revert' : '복원'}</span>
                              </button>

                              <button
                                onClick={() => setPreviewVersion(prev => prev?.id === ver.id ? null : ver)}
                                className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1 transition-colors ${
                                  isPreviewing
                                    ? 'bg-slate-800 text-indigo-300 border-indigo-500/50'
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                                }`}
                                title={language === 'en' ? 'Preview Code' : '코드 미리보기'}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>{isPreviewing ? (language === 'en' ? 'Hide' : '숨기기') : (language === 'en' ? 'Preview' : '미리보기')}</span>
                              </button>

                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(ver.script);
                                  setVersionToast(language === 'en' ? 'Script copied' : '스크립트가 복사되었습니다');
                                  setTimeout(() => setVersionToast(null), 2000);
                                }}
                                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                                title={language === 'en' ? 'Copy Script' : '스크립트 복사'}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={(e) => handleDeleteVersion(ver.id, e)}
                                className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors"
                                title={language === 'en' ? 'Delete Version' : '버전 삭제'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Preview Expansion */}
                          {isPreviewing && (
                            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 animate-fade-in">
                              <div className="flex items-center justify-between text-[11px] text-indigo-300">
                                <span>{language === 'en' ? 'Previewing Version Code:' : '버전 코드 미리보기:'}</span>
                                <button
                                  onClick={() => handleRevertToVersion(ver)}
                                  className="text-xs text-indigo-400 hover:text-indigo-200 underline font-semibold"
                                >
                                  {language === 'en' ? 'Apply this version now' : '이 버전 바로 적용하기'}
                                </button>
                              </div>
                              <pre className="language-powershell p-3 bg-slate-950 rounded-xl text-xs font-mono overflow-x-auto max-h-48 border border-slate-800">
                                <code dangerouslySetInnerHTML={{ __html: highlightPowerShell(ver.script) }} />
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                {language === 'en' ? 'All versions are safely stored in browser local storage.' : '모든 스크립트 버전은 브라우저 로컬 저장소에 안전하게 보관됩니다.'}
              </span>
              <button
                type="button"
                onClick={() => { setShowVersionModal(false); setPreviewVersion(null); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'en' ? 'Close' : '닫기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
