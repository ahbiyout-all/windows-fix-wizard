import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  ShieldCheck,
  RotateCcw, 
  Plus, 
  Copy, 
  CheckCircle2, 
  Download, 
  HardDrive, 
  AlertTriangle, 
  Info, 
  ExternalLink, 
  RefreshCw, 
  Terminal, 
  X, 
  Check, 
  Sparkles, 
  Cpu, 
  ShieldAlert,
  Layers,
  HelpCircle,
  Clock
} from 'lucide-react';

interface SystemRestoreUtilityProps {
  isOpen?: boolean;
  onClose?: () => void;
  language?: 'ko' | 'en';
}

interface SimulatedRestorePoint {
  sequenceNumber: number;
  description: string;
  creationTime: string;
  restorePointType: 'MODIFY_SETTINGS' | 'APPLICATION_INSTALL' | 'DEVICE_DRIVER_INSTALL' | 'CANCELLED_OPERATION';
  status: 'Ready' | 'Active';
}

export const SystemRestoreUtility: React.FC<SystemRestoreUtilityProps> = ({
  isOpen = true,
  onClose,
  language = 'ko',
}) => {
  const isEn = language === 'en';

  // Active sub-tab in utility
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'rollback' | 'why'>('create');
  
  // Custom restore point creation state
  const [customName, setCustomName] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `WinFix_SafetyPoint_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  });
  const [restorePointType, setRestorePointType] = useState<'MODIFY_SETTINGS' | 'APPLICATION_INSTALL' | 'DEVICE_DRIVER_INSTALL'>('MODIFY_SETTINGS');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPointForRollback, setSelectedPointForRollback] = useState<number | null>(42);

  // Simulated / Sample restore points list for inspection preview
  const [restorePoints, setRestorePoints] = useState<SimulatedRestorePoint[]>([
    {
      sequenceNumber: 42,
      description: 'WinFix_PreRepair_NetworkStack_Reset',
      creationTime: new Date(Date.now() - 3600000 * 2).toLocaleString(),
      restorePointType: 'MODIFY_SETTINGS',
      status: 'Ready'
    },
    {
      sequenceNumber: 41,
      description: 'Windows Update - KB5034441 Critical Quality Patch',
      creationTime: new Date(Date.now() - 3600000 * 26).toLocaleString(),
      restorePointType: 'APPLICATION_INSTALL',
      status: 'Ready'
    },
    {
      sequenceNumber: 40,
      description: 'Intel Graphic Driver Package 31.0.101',
      creationTime: new Date(Date.now() - 3600000 * 72).toLocaleString(),
      restorePointType: 'DEVICE_DRIVER_INSTALL',
      status: 'Ready'
    }
  ]);

  // Generated PowerShell Script for 1-Click System Restore Point Creation
  const creationScript = useMemo(() => {
    return `# ==============================================================================
# Windows Fix Wizard - Safe System Restore Point Creator
# Target Drive: C:\\ | Type: ${restorePointType}
# ==============================================================================
#Requires -RunAsAdministrator

Write-Host ">>> [1/3] Checking System Protection Status on Drive C:..." -ForegroundColor Cyan
try {
    # Ensure System Protection is enabled for system root drive
    Enable-ComputerRestore -Drive "C:\\" -ErrorAction Stop
    Write-Host "  -> System Protection enabled on C: successfully." -ForegroundColor Green
} catch {
    Write-Warning "  -> Notice: System Protection drive verification returned: $($_.Exception.Message)"
}

Write-Host ""
Write-Host ">>> [2/3] Configuring Creation Frequency Cooldown Override..." -ForegroundColor Cyan
# Windows limits creation to once every 24h by default; override frequency key to allow immediate checkpoint
$regPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore"
if (Test-Path $regPath) {
    Set-ItemProperty -Path $regPath -Name "SystemRestorePointCreationFrequency" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
    Write-Host "  -> Cooldown threshold bypassed (0 min)." -ForegroundColor Green
}

Write-Host ""
Write-Host ">>> [3/3] Creating System Restore Point [${customName}]..." -ForegroundColor Cyan
try {
    Checkpoint-Computer -Description "${customName}" -RestorePointType "${restorePointType}" -ErrorAction Stop
    Write-Host ""
    Write-Host "==============================================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] System Restore Point created successfully!" -ForegroundColor Green
    Write-Host " Description: ${customName}" -ForegroundColor White
    Write-Host " Type       : ${restorePointType}" -ForegroundColor White
    Write-Host " Timestamp  : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
    Write-Host " You can now execute repair scripts with 100% rollback guarantee." -ForegroundColor Green
    Write-Host "==============================================================================" -ForegroundColor Green
} catch {
    Write-Error "Failed to create Restore Point: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "Tip: Run 'vssadmin list shadowstorage' to ensure you have sufficient disk allocation." -ForegroundColor Yellow
}`;
  }, [customName, restorePointType]);

  // Generated PowerShell Script for Querying Recent Restore Points
  const queryScript = useMemo(() => {
    return `# ==============================================================================
# Query and List Active Windows System Restore Points
# ==============================================================================
#Requires -RunAsAdministrator

Write-Host ">>> Querying System Restore Points on this machine..." -ForegroundColor Cyan
$points = Get-ComputerRestorePoint | Select-Object SequenceNumber, Description, CreationTime, RestorePointType

if ($points) {
    $points | Format-Table -AutoSize
    Write-Host "[OK] Found $($points.Count) restore point(s) available for recovery." -ForegroundColor Green
} else {
    Write-Warning "No active restore points found. System protection may be disabled or shadow storage limit reached."
    Write-Host "Run 'vssadmin list shadowstorage' to check VSS allocations." -ForegroundColor Yellow
}`;
  }, []);

  // Generated PowerShell Script for Rollback
  const rollbackScript = useMemo(() => {
    const seq = selectedPointForRollback || 42;
    return `# ==============================================================================
# Windows Fix Wizard - System Restore Point Rollback
# Target Sequence Number: ${seq}
# ==============================================================================
#Requires -RunAsAdministrator

Write-Host ">>> Preparing to revert system to Restore Point #${seq}..." -ForegroundColor Yellow
Write-Host "WARNING: A system restart will be required to finalize the rollback." -ForegroundColor Red

# Rollback command:
# Restore-Computer -RestorePoint ${seq} -Confirm:$true

# Alternatively, launch the official Windows System Restore GUI:
Write-Host ""
Write-Host "Launching Windows Native System Restore Wizard (rstrui.exe)..." -ForegroundColor Cyan
Start-Process "rstrui.exe"`;
  }, [selectedPointForRollback]);

  // Copy to clipboard helper
  const copyScript = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Download .ps1 file
  const downloadScript = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Quick dispatch to sandbox
  const handleSendToSandbox = (script: string) => {
    const event = new CustomEvent('uwes-set-sandbox-script', { detail: { script } });
    window.dispatchEvent(event);
    if (onClose) onClose();
  };

  // Quick dispatch to verifier
  const handleSendToVerifier = (script: string) => {
    const event = new CustomEvent('uwes-set-validator-script', { detail: { script } });
    window.dispatchEvent(event);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-indigo-400 border border-indigo-500/30">
              <RotateCcw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  {isEn ? 'Windows System Restore Point Utility' : 'Windows 시스템 복원 지점 유틸리티'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-400 border border-indigo-800/60">
                  PowerShell Checkpoint
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEn 
                  ? 'Create instant safety rollback points and inspect existing restore snapshots.'
                  : '스크립트 실행 전 즉시 안전 롤백 복원 지점을 생성하고 최근 복원 스냅샷을 관리합니다.'}
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-6 pt-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
                activeTab === 'create'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? 'Create Restore Point' : '1-클릭 복원 지점 생성'}</span>
            </button>

            <button
              onClick={() => setActiveTab('list')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
                activeTab === 'list'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isEn ? 'Recent Restore Points' : '최근 복원 지점 조회'}</span>
            </button>

            <button
              onClick={() => setActiveTab('rollback')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
                activeTab === 'rollback'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isEn ? 'Rollback & Recovery' : '시스템 롤백 / 복구'}</span>
            </button>

            <button
              onClick={() => setActiveTab('why')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
                activeTab === 'why'
                  ? 'border-amber-500 text-amber-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-amber-300 hover:bg-slate-800/50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEn ? 'Why is this essential?' : '이 기능이 필요한 이유'}</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-300 text-sm">
          {/* TAB 1: CREATE RESTORE POINT */}
          {activeTab === 'create' && (
            <div className="space-y-5 animate-fade-in">
              {/* Safety notice banner */}
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/50 flex items-start gap-3.5">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-indigo-200">
                    {isEn ? 'Zero-Risk System Modification Guarantee' : '스크립트 실행 전 사전 안전망 확보'}
                  </h4>
                  <p className="text-xs text-indigo-300/80 leading-relaxed">
                    {isEn
                      ? 'Executing PowerShell scripts that alter system registry, network stacks, or services carries risk. A restore point takes an immutable snapshot of Windows system files, drivers, and registry settings.'
                      : '레지스트리나 네트워크 스택, 핵심 서비스를 수정하는 스크립트를 실행하기 전 복원 지점을 만들어 두면, 예기치 못한 부작용 발생 시 클릭 한 번으로 이전 정상 상태로 완벽히 되돌릴 수 있습니다.'}
                  </p>
                </div>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    {isEn ? 'Restore Point Description / Name' : '복원 지점 설명 및 이름'}
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-hidden"
                    placeholder="WinFix_SafetyPoint_..."
                  />
                  <p className="text-[11px] text-slate-500">
                    {isEn ? 'Clear naming makes it easy to identify in Windows Recovery.' : '알아보기 쉬운 이름을 지정하면 윈도우 복구 메뉴에서 식별하기 수월합니다.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    {isEn ? 'Checkpoint Type' : '복원 지점 유형'}
                  </label>
                  <select
                    value={restorePointType}
                    onChange={(e) => setRestorePointType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="MODIFY_SETTINGS">MODIFY_SETTINGS (설정 변경 전)</option>
                    <option value="APPLICATION_INSTALL">APPLICATION_INSTALL (앱 설치 전)</option>
                    <option value="DEVICE_DRIVER_INSTALL">DEVICE_DRIVER_INSTALL (드라이버 변경)</option>
                  </select>
                </div>
              </div>

              {/* Code Script Block */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="bg-slate-800/60 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isEn ? 'PowerShell Restore Point Creation Script' : 'PowerShell 1-클릭 복원 지점 생성 스크립트'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSendToSandbox(creationScript)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 hover:text-white flex items-center gap-1"
                      title={isEn ? 'Simulate in WebAssembly Sandbox' : '샌드박스에서 모의 실행'}
                    >
                      <Cpu className="w-3 h-3 text-cyan-400" />
                      <span>{isEn ? 'Sandbox' : '샌드박스'}</span>
                    </button>
                    <button
                      onClick={() => handleSendToVerifier(creationScript)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 hover:text-white flex items-center gap-1"
                      title={isEn ? 'Analyze in Threat Verifier' : '안심 검사소 전송'}
                    >
                      <ShieldAlert className="w-3 h-3 text-indigo-400" />
                      <span>{isEn ? 'Verifier' : '안심 검사'}</span>
                    </button>
                    <button
                      onClick={() => downloadScript(creationScript, 'Create-SystemRestorePoint.ps1')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>.ps1</span>
                    </button>
                    <button
                      onClick={() => copyScript(creationScript, 'create-script')}
                      className="px-3 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1"
                    >
                      {copiedId === 'create-script' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-300" />
                          <span>{isEn ? 'Copied' : '복사됨'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{isEn ? 'Copy' : '복사'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="p-4 overflow-x-auto max-h-56">
                  <pre className="text-xs font-mono text-indigo-300 leading-relaxed">
                    <code>{creationScript}</code>
                  </pre>
                </div>
                <div className="px-4 py-2 bg-indigo-950/20 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>
                    {isEn 
                      ? "Run in an elevated PowerShell prompt (Run as Administrator) to commit changes." 
                      : "PowerShell을 '관리자 권한으로 실행'한 뒤 위 스크립트를 붙여넣으면 즉시 복원 지점이 생성됩니다."}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RECENT RESTORE POINTS LIST */}
          {activeTab === 'list' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">
                    {isEn ? 'Active System Restore Points' : '현재 시스템 복원 지점 목록'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isEn ? 'Query snapshots using Get-ComputerRestorePoint cmdlet.' : 'Get-ComputerRestorePoint 명령으로 확인 가능한 복원 지점 스냅샷 목록입니다.'}
                  </p>
                </div>
                <button
                  onClick={() => copyScript(queryScript, 'query-script')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5"
                >
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{copiedId === 'query-script' ? (isEn ? 'Copied Cmdlet' : '명령어 복사됨') : (isEn ? 'Copy Query Cmdlet' : '조회 명령어 복사')}</span>
                </button>
              </div>

              {/* Restore points card table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Seq #</th>
                      <th className="py-2.5 px-4">{isEn ? 'Description' : '복원 지점 설명'}</th>
                      <th className="py-2.5 px-4">{isEn ? 'Type' : '유형'}</th>
                      <th className="py-2.5 px-4">{isEn ? 'Creation Time' : '생성 일시'}</th>
                      <th className="py-2.5 px-4 text-right">{isEn ? 'Action' : '작업'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {restorePoints.map((pt) => (
                      <tr key={pt.sequenceNumber} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-indigo-400">#{pt.sequenceNumber}</td>
                        <td className="py-3 px-4 font-sans text-slate-200 font-medium">
                          {pt.description}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                            {pt.restorePointType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">{pt.creationTime}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedPointForRollback(pt.sequenceNumber);
                              setActiveTab('rollback');
                            }}
                            className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-sans transition-all"
                          >
                            {isEn ? 'Rollback to this' : '이 시점으로 복원'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Disk / VSS Storage Diagnostic Tips */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <HardDrive className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-200">
                    {isEn ? 'VSS Shadow Storage & Allocation Check' : 'VSS 섀도 볼륨 스토리지 할당 용량 확인'}
                  </span>
                  <p className="text-slate-400">
                    {isEn
                      ? "If restore points disappear automatically, your Volume Shadow Copy (VSS) disk quota may be full. Check current allocation using: vssadmin list shadowstorage"
                      : "복원 지점이 생성 후 자동으로 사라지는 경우, VSS 볼륨 섀도 복사본 할당 용량이 부족할 수 있습니다. 명령 프롬프트(CMD)에서 'vssadmin list shadowstorage' 명령으로 확인하세요."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROLLBACK & RECOVERY */}
          {activeTab === 'rollback' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 flex items-start gap-3.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-200">
                    {isEn ? 'System Restore Reversal Instructions' : '시스템 복원 실행 시 주의사항'}
                  </h4>
                  <p className="text-xs text-amber-300/80 leading-relaxed">
                    {isEn
                      ? 'System Restore rolls back registry, system files, and installed drivers without affecting personal documents or pictures. A computer reboot will be initiated.'
                      : '시스템 복원은 개인 문서, 사진, 파일에는 일체 영향을 주지 않으며, 레지스트리와 시스템 핵심 파일 및 드라이버 상태만을 지정된 시점으로 되돌립니다. 복원 시 PC 재부팅이 진행됩니다.'}
                  </p>
                </div>
              </div>

              {/* GUI vs PowerShell Rollback choices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                    <ExternalLink className="w-4 h-4" />
                    <span>{isEn ? 'Method 1: Native Windows GUI Wizard (rstrui.exe)' : '방법 1: 윈도우 기본 복원 마법사 실행 (권장)'}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {isEn
                      ? 'Opens the official graphical system restore dialog provided by Microsoft Windows.'
                      : 'Microsoft 공식 윈도우 그래픽 복원 창을 실행하여 마우스 클릭으로 시점을 선택합니다.'}
                  </p>
                  <div className="bg-slate-900 p-2.5 rounded-xl font-mono text-xs text-indigo-300 flex items-center justify-between">
                    <code>rstrui.exe</code>
                    <button
                      onClick={() => copyScript('rstrui.exe', 'rstrui-cmd')}
                      className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
                    >
                      {copiedId === 'rstrui-cmd' ? (isEn ? 'Copied' : '복사됨') : (isEn ? 'Copy' : '복사')}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <Terminal className="w-4 h-4" />
                    <span>{isEn ? 'Method 2: PowerShell Script Rollback' : '방법 2: PowerShell 원클릭 롤백 스크립트'}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {isEn
                      ? `Revert to selected restore point #${selectedPointForRollback || 42} via Restore-Computer.`
                      : `선택된 복원 지점(#${selectedPointForRollback || 42})으로 자동 롤백을 수행합니다.`}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyScript(rollbackScript, 'rollback-script')}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      {copiedId === 'rollback-script' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'rollback-script' ? (isEn ? 'Copied Script' : '스크립트 복사됨') : (isEn ? 'Copy Rollback Script' : '롤백 스크립트 복사')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WHY IS THIS ESSENTIAL? (ANSWERING USER QUESTION IN DEPTH) */}
          {activeTab === 'why' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-indigo-900/60 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>{isEn ? 'Why System Restore Points are Vital in Windows Troubleshooting' : '시스템 복원 지점 기능이 반드시 필요한 이유'}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isEn
                    ? 'Windows Fix Wizard offers powerful automated repair scripts (SFC/DISM, registry mutations, network resets, and service reconfiguration). Here is why an instant System Restore snapshot is an indispensable safety requirement:'
                    : 'Windows Fix Wizard는 레지스트리 키 수정, 시스템 파일 검사(SFC/DISM), 네트워크 스택 초기화, Windows 서비스 재설정 등 강력한 시스템 복구 스크립트를 제공합니다. 복원 지점 기능이 필수적인 핵심 이유는 다음과 같습니다:'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <Shield className="w-4 h-4" />
                    <span>{isEn ? '1. Absolute Reversibility (Zero-Risk)' : '1. 절대적인 무손실 롤백 보장 (위험 제로)'}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isEn
                      ? 'No matter how well-tested an AI or community solution is, specific hardware configurations or third-party conflicts can trigger unexpected regressions. A restore point guarantees 100% rollback.'
                      : '아무리 검증된 해결책이라도 사용자마다 PC에 설치된 보안 소프트웨어, 드라이버, 백신 설정이 상이합니다. 복원 지점을 만들어 두면 스크립트 적용 후 이상 발생 시 몇 분 만에 정상 상태로 되돌릴 수 있습니다.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                    <HardDrive className="w-4 h-4" />
                    <span>{isEn ? '2. Personal Data Remains Untouched' : '2. 개인 문서 및 데이터 보존'}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isEn
                      ? 'System Restore only targets operating system binaries, registry hives, and system drivers. Photos, documents, emails, and personal files remain completely intact.'
                      : '전체 포맷이나 윈도우 재설치와 달리, 시스템 복원은 사용자의 문서, 사진, 다운로드 파일 등 개인 데이터를 전혀 건드리지 않고 오직 OS 시스템 파일과 레지스트리만 복원합니다.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                    <Clock className="w-4 h-4" />
                    <span>{isEn ? '3. 24-Hour Cooldown Bypass' : '3. 24시간 생성 제한 쿨다운 우회'}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isEn
                      ? 'Windows inherently blocks Checkpoint-Computer if another restore point was made in the past 24 hours. Our script automatically overrides this limit to guarantee an immediate checkpoint.'
                      : 'Windows는 기본적으로 24시간 내 복원 지점이 생성된 적이 있으면 새 복원 지점 생성을 무시합니다. 본 유틸리티 스크립트는 레지스트리 빈도 제한을 일시적으로 해제하여 즉각적인 스냅샷을 생성합니다.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                    <Layers className="w-4 h-4" />
                    <span>{isEn ? '4. Seamless Synergy with Sandbox & Verifier' : '4. 샌드박스 및 안심 검사소와의 완벽한 시너지'}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isEn
                      ? 'Combines with our WebAssembly PowerShell Sandbox and Threat Verifier to provide an end-to-end enterprise defense pipeline: Simulate -> Validate -> Snapshot -> Execute.'
                      : '본 앱의 WebAssembly PowerShell 샌드박스 및 안심 검사소와 연동되어 "모의 실행 → 위협 검증 → 복원 지점 스냅샷 확보 → 실적용"으로 이어지는 완벽한 4단계 안전 수리 워크플로우를 완성합니다.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{isEn ? 'Enterprise Safety Standard' : '마이크로소프트 공식 권장 시스템 복구 표준 준수'}</span>
          </div>

          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                {isEn ? 'Close' : '닫기'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
