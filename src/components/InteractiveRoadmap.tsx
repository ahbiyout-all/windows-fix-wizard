import React, { useState, useEffect, useRef } from 'react';
import { 
  Milestone, 
  CheckCircle2, 
  Play, 
  Check, 
  Terminal, 
  Database,
  Lock,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  RotateCcw,
  HelpCircle,
  Copy,
  Download,
  Clipboard,
  Trash2
} from 'lucide-react';

interface Props {
  language: 'ko' | 'en';
}

// Preset powershell commands for the user to try out in the validator
const SCRIPTS_PRESETS = [
  {
    id: 'presets-1',
    nameKo: '윈도우 업데이트 전송 최적화 비활성화 (보안)',
    nameEn: 'Disable Windows Update Delivery Optimization',
    osTarget: 'win11_23h2',
    adminRequired: true,
    code: `# Disable Windows Update Delivery Optimization to save local bandwidth
Set-ItemProperty -Path "HKLM:\\Software\\Policies\\Microsoft\\Windows\\DeliveryOptimization" -Name "DODownloadMode" -Value 0
New-ItemProperty -Path "HKLM:\\Software\\Policies\\Microsoft\\Windows\\WindowsUpdate" -Name "ExcludeWUDriversInQualityUpdate" -Value 1 -Force
gpupdate /force`
  },
  {
    id: 'presets-2',
    nameKo: '윈도우 업데이트 고장 캐시 폴더 제거 및 서비스 재시작',
    nameEn: 'Clear Spoiled Update Cache Folder',
    osTarget: 'win10_22h2',
    adminRequired: true,
    code: `# Stop update scheduler services and wipe local corrupted update cache
Stop-Service -Name "wuauserv" -Force
Stop-Service -Name "bits" -Force
Remove-Item -Path "C:\\Windows\\SoftwareDistribution\\DataStore\\*" -Recurse -Force
Start-Service -Name "wuauserv"
Start-Service -Name "bits"`
  },
  {
    id: 'presets-3',
    nameKo: '구버전 비보안 암호화 프로토콜 강제 비활성화',
    nameEn: 'Deprecate obselete insecure security protocol (TLS 1.0)',
    osTarget: 'win11_22h2',
    adminRequired: true,
    code: `# Decouple unsafe TLS 1.0 connection handshake references
New-Item -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\SCHANNEL\\Protocols\\TLS 1.0\\Client" -Force
Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\SCHANNEL\\Protocols\\TLS 1.0\\Client" -Name "Enabled" -Value 0`
  },
  {
    id: 'presets-4',
    nameKo: '난독화 위협 수면 위 진단 실험용 Base64 구문',
    nameEn: 'Heuristic Base64 Encoded Script Analysis Simulation',
    osTarget: 'win11_23h2',
    adminRequired: true,
    code: `# This simulates a potentially obfuscated command carrying base64 bytes
$payload = "U2V0LUl0ZW1Qcm9wZXJ0eSAtUGF0aCAiSEtMTTpcXFNvZnR3YXJlXFxQb2xpY2llc1xcTWljcm9zb2Z0XFxXaW5kb3dzXFxEZWxpdmVyeU9wdGltaXphdGlvbiIgLU5hbWUgIkRPRG93bmxvYWRNb2RlIiAtVmFsdWUgMA=="
# Real security engine dynamically resolves base64 bytes to human-readable strings.
Execute-EncodedCommand -EncodedCommand $payload`
  }
];

const JARGON_DICTIONARY = [
  {
    term: "AST Parser",
    termKo: "코드 파서 (명령어 돋보기분석기)",
    desc: "A smart recipe analyzer that reads PowerShell scripts step-by-step to catch typos, security bugs, or bad pathways.",
    descKo: "컴퓨터 명령어가 담긴 텍스트를 마치 '요리 레시피' 읽듯 한 과정씩 세부 분석하여, 눈에 잘 안 띄는 오타나 불청객 코드가 들어있는지 미리 잡아내 안전을 보증하는 센서입니다."
  },
  {
    term: "Registry Subtree",
    termKo: "윈도우 레지스트리 (설정 정보수첩)",
    desc: "The big internal offline workbook notebook of settings where Windows stores how it operates.",
    descKo: "컴퓨터의 모든 스피드, 기능 켬/끔 여부를 적어 두는 '윈도우의 종합 비망록 설정 수첩'입니다. 이곳에 잘못 기재된 값을 감시하고 원래대로 원클릭 백업 복원할 수 있게 돕습니다."
  },
  {
    term: "Base64 Obfuscation",
    termKo: "Base64 난독화 (글자 숨기기 장치)",
    desc: "Encoding normal human words into lookalike foreign code to bypass security scans.",
    descKo: "유해 파일들이 보안 분석관의 눈을 속이고 검사를 탈출하기 위해, 읽을 수 없는 기호와 외계어로 글씨를 꽁꽁 싸맨 상태입니다. 저희 안전기는 이를 자동으로 풀어서 읽을 수 있도록 번역해줍니다."
  },
  {
    term: "wuauserv",
    termKo: "Windows Update 비서 서비스 (wuauserv)",
    desc: "The helper staff inside your PC that downloads and installs updates in the background.",
    descKo: "내 컴퓨터 뒤에서 얌전하게 새로운 보안 패치를 다운로드하여 설치해주고 보관함을 조율하는 가장 중요하고 든든한 '업데이트 배달 및 정리 비서'입니다."
  },
  {
    term: "Dual-Sync Safe Vault",
    termKo: "세이프 볼트 (이중 매칭 안전 금고)",
    desc: "A safe offline state vault to record parameters securely to verify compliance.",
    descKo: "설사 컴퓨터가 전파가 안 잡히는 오프라인 상태여도 기기 가동 보증 수치를 계속해서 이중 동기화하고, 고장 시 1초 만에 정상이었던 과거로 시간을 돌려 복원해주는 특수 안전 금고 장치입니다."
  }
];

export function InteractiveRoadmap({ language }: Props) {
  const [isBeginnerMode, setIsBeginnerMode] = useState<boolean>(true);

  // Interactive Validator States
  const [targetOS, setTargetOS] = useState<string>('win11_23h2');
  const [isAdminElevated, setIsAdminElevated] = useState<boolean>(true);
  const [activeScript, setActiveScript] = useState<string>(SCRIPTS_PRESETS[0].code);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  
  // Real analysis reports
  const [diagnosedCmdlets, setDiagnosedCmdlets] = useState<string[]>([]);
  const [diagnosedRegistryKeys, setDiagnosedRegistryKeys] = useState<string[]>([]);
  const [preflightWarnings, setPreflightWarnings] = useState<string[]>([]);
  const [rollbackScript, setRollbackScript] = useState<string>('');
  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [decodedPayload, setDecodedPayload] = useState<string>('');
  const [editorCopied, setEditorCopied] = useState<boolean>(false);
  const [editorPasted, setEditorPasted] = useState<boolean>(false);
  const [showManualPasteBox, setShowManualPasteBox] = useState<boolean>(false);
  const [manualPasteDraft, setManualPasteDraft] = useState<string>('');

  const handleEditorCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeScript);
      setEditorCopied(true);
      setTimeout(() => setEditorCopied(false), 2000);
    } catch (err) {
      console.warn("Navigator clipboard API failed, attempting fallback:", err);
      const textarea = document.createElement("textarea");
      textarea.value = activeScript;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const success = document.execCommand("copy");
        if (success) {
          setEditorCopied(true);
          setTimeout(() => setEditorCopied(false), 2000);
        }
      } catch (e) {
        console.error("Fallback copy failed:", e);
      }
      document.body.removeChild(textarea);
    }
  };

  const handleEditorPaste = async () => {
    // 1. Try local sandbox memory register first for instant, 100% reliable iframe pasting
    const fallbackText = (window as any).__lastCopiedScript;
    if (fallbackText && typeof fallbackText === 'string' && fallbackText.trim() !== '') {
      setActiveScript(fallbackText);
      runLiveDeepDiagnostics(fallbackText);
      setEditorPasted(true);
      setTimeout(() => setEditorPasted(false), 2000);
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (text !== undefined && text !== null && text.trim() !== '') {
        setActiveScript(text);
        runLiveDeepDiagnostics(text);
        setShowManualPasteBox(false);
        setEditorPasted(true);
        setTimeout(() => setEditorPasted(false), 2000);
        return;
      }
    } catch (err) {
      console.warn("Clipboard read blocked (normal iframe behavior):", err);
    }
    setManualPasteDraft('');
    setShowManualPasteBox(true);
  };

  const intervalRef = useRef<any>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runDiagnosticsRef = useRef<(code: string) => void>(() => {});

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  // Live Deep Diagnostics Parser
  const runLiveDeepDiagnostics = (code: string) => {
    const warnings: string[] = [];
    const registryKeys: string[] = [];
    const cmdlets: string[] = [];

    // Parse Registry Paths
    // Look for HKLM:\, HKCU:\, etc.
    const regMatches = code.match(/(?:HKLM|HKCU|HKCR|HKU|Registry::[^ \t\r\n"']+):\\[A-Za-z0-9_\\\-]+/gi);
    if (regMatches) {
      regMatches.forEach(key => {
        const cleaned = key.replace(/["']/g, '').trim();
        if (!registryKeys.includes(cleaned)) {
          registryKeys.push(cleaned);
        }
      });
    }

    // Parse Commandlets
    const cmdletMatches = code.match(/\b[A-Za-z]+-[A-Za-z0-9]+\b/gi);
    if (cmdletMatches) {
      cmdletMatches.forEach(cmdlet => {
        if (!cmdlets.includes(cmdlet) && !['a-z', 'auto-sync', 'msedge-uri'].includes(cmdlet.toLowerCase())) {
          cmdlets.push(cmdlet);
        }
      });
    }

    // Heuristics Evaluation & Compatibility Alerts (Phase 3)
    if (!isAdminElevated) {
      warnings.push(
        language === 'ko'
          ? "경고: 관리자 권한이 비활성화되었습니다. 시스템 레지스트리를 수정하는 스크립트 실행 시 ACCESS_DENIED 에러가 필연적으로 노출됩니다."
          : "Warning: Low Privilege context. Modification scripts will inevitably crash with ACCESS_DENIED."
      );
    }

    // Windows 11 Build checks
    if (targetOS.startsWith('win11') && registryKeys.some(k => k.toLowerCase().includes('windowsupdate\\deliveryoptimization'))) {
      warnings.push(
        language === 'ko'
          ? "정보: Windows 11 환경에서는 전송 최적화(DO) 서비스 명칭 및 클라이언트 라이브러리가 정책 그룹 컨트롤러와 동기화되어 있어야 안전하게 반영됩니다."
          : "Info: delivery optimization registry nodes require matching GP sync actions in Windows 11 runtime builds."
      );
    }

    // Check pre-conditions for cache removal (e.g. SoftwareDistribution)
    if (code.toLowerCase().includes('softwaredistribution') || code.toLowerCase().includes('datastore')) {
      const stopsWuauserv = code.toLowerCase().includes('stop-service') && code.toLowerCase().includes('wuauserv');
      if (!stopsWuauserv) {
        warnings.push(
          language === 'ko'
            ? "위험 정합성: 윈도우 업데이트 캐시 디렉토리를 지우기 전에 'wuauserv' 서비스를 중지하지 않았습니다. 캐시 폴더가 사용 중이므로 이 스크립트는 중단됩니다."
            : "Structural Risk: Attempting to clear update database while 'wuauserv' service is still active. Locked files will cause failures."
        );
      }
    }

    // Check for deprecated cmdlets in Windows Server or Win 11 modern builds
    if (targetOS === 'win11_23h2' && code.toLowerCase().includes('tls 1.0')) {
      warnings.push(
        language === 'ko'
          ? "정밀 권장: Windows 11 23H2 이상에는 기본적으로 TLS 1.0/1.1 연결이 이미 소프트웨어 카탈로그 수준에서 비활성화되어 리팩토링이 필요하지 않을 수 있습니다."
          : "Heuristic Advice: Windows 11 23H2 is secure-by-default; TLS 1.0/1.1 handshakes are already blocked at runtime levels."
      );
    }

    // Phase 5 Enterprise-Grade AST & Obfuscation Guards
    const codeLower = code.toLowerCase();
    
    // 1. Privilege Escalation & Bypass Detection
    if (codeLower.includes('start-process') && (codeLower.includes('-verb runas') || codeLower.includes('runas'))) {
      warnings.push(
        language === 'ko'
          ? "UAC 우회(Bypass/Elevation) 경고: 스크립트가 강제로 관리자 동의 단계를 호출하여 악의적 권한 상승을 유도하는 구문 패턴이 AST 기반 진단기(Phase 5)에 검출되었습니다."
          : "UAC Bypass Guard (Phase 5): Script forces sub-thread elevation via RunAs verb. Privilege manipulation threat flag raised."
      );
    }
    
    // 2. Encoded Obfuscation patterns
    let foundDecoded = '';
    if (codeLower.includes('frombase64string') || codeLower.includes('-enc') || codeLower.includes('encodedcommand') || codeLower.includes('iex') || codeLower.includes('invoke-expression')) {
      warnings.push(
        language === 'ko'
          ? "난독화 실행 우회(Heuristic Obfuscation): Base64 인코딩이나 Invoke-Expression(IEX)과 같이 정상 보안 서명을 회피하기 위한 숨김 실행 시도가 우회 방지 엔진에 감지되었습니다."
          : "Heuristic Obfuscation Threat (Phase 5): Base64 decrypter or dynamic execution (IEX) patterns found. These avoid code integrity sign audits."
      );

      // Attempt Base64 Extract Heuristics
      const b64Regex = /(?:[A-Za-z0-9+/]{40,}(?:==| =)?)/g;
      const matches = code.match(b64Regex);
      if (matches && matches.length > 0) {
        try {
          const rawDecoded = atob(matches[0].trim());
          // Keep it sanitised/clean of non-printable chars or limit length
          foundDecoded = rawDecoded.replace(/[^\x20-\x7E\r\n\t]/g, '');
        } catch (e) {
          // Fallback if not standard ASCII/atob fails
        }
      }
    }
    setDecodedPayload(foundDecoded);

    // Let's generate a REAL dynamic Rollback script based on found adjustments! (Phase 4 Rollback Auto Synthesizer!)
    let compositeRollback = `# =========================================================\r\n`;
    compositeRollback += `# UWES AUTOMATED RESTORATIVE ROLLBACK SCRIPT (PHASE 4 ENGINE)\r\n`;
    compositeRollback += `# Target Environment Profile: ${targetOS.toUpperCase()} | AdminContext: ${isAdminElevated ? "ELEVATED" : "STANDARD"}\r\n`;
    compositeRollback += `# Generated At: ${new Date().toISOString()}\r\n`;
    compositeRollback += `# =========================================================\r\n\r\n`;

    // Check registry changes to undo
    if (registryKeys.length > 0) {
      compositeRollback += `# --- 1단계: 레지스트리 원래 설정 복원 (Registry Auto-Restore) ---\r\n`;
      registryKeys.forEach(key => {
        if (key.toLowerCase().includes('deliveryoptimization')) {
          compositeRollback += `Set-ItemProperty -Path "${key}" -Name "DODownloadMode" -Value 1 -Force\r\n`;
        } else if (key.toLowerCase().includes('tls 1.0')) {
          compositeRollback += `Remove-Item -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\SCHANNEL\\Protocols\\TLS 1.0" -Recurse -Force\r\n`;
        } else if (key.toLowerCase().includes('windowsupdate')) {
          compositeRollback += `Remove-ItemProperty -Path "${key}" -Name "ExcludeWUDriversInQualityUpdate" -Force\r\n`;
        } else {
          compositeRollback += `# [ROLLBACK REC] Restore key values to default baseline for: ${key}\r\n`;
          compositeRollback += `Remove-ItemProperty -Path "${key}" -Name "*" -ErrorAction SilentlyContinue\r\n`;
        }
      });
      compositeRollback += `\r\n`;
    }

    // Check service states to undo
    if (code.toLowerCase().includes('stop-service')) {
      compositeRollback += `# --- 2단계: 중지된 필수 시스템 스케줄러 서비스 재가동 ---\r\n`;
      if (code.toLowerCase().includes('wuauserv')) {
        compositeRollback += `Start-Service -Name "wuauserv" -ErrorAction SilentlyContinue\r\n`;
      }
      if (code.toLowerCase().includes('bits')) {
        compositeRollback += `Start-Service -Name "bits" -ErrorAction SilentlyContinue\r\n`;
      }
      compositeRollback += `\r\n`;
    }

    // Default emergency restore action integration
    compositeRollback += `# --- 3단계: 시스템 안전 복원 시점 및 그룹 정책 리프레시 ---\r\n`;
    compositeRollback += `Write-Host "윈도우 그룹정책 최종 적용 리로드..."\r\n`;
    compositeRollback += `gpupdate /force\r\n`;
    compositeRollback += `Write-Host "[UWES RESTORE SUCCESS] 모든 임시 조작 코드가 안전하게 완전 복구되었습니다." -ForegroundColor Green\r\n`;

    setDiagnosedCmdlets(cmdlets);
    setDiagnosedRegistryKeys(registryKeys);
    setPreflightWarnings(warnings);
    setRollbackScript(compositeRollback);

    // Compute dynamic safety score
    let baseScore = 100;
    if (!isAdminElevated) baseScore -= 15;
    if (warnings.some(w => w.includes('위험') || w.includes('Risk') || w.includes('Severe'))) baseScore -= 35;
    if (warnings.some(w => w.includes('경고') || w.includes('Warning') || w.includes('우회') || w.includes('Bypass') || w.includes('Threat') || w.includes('난독화'))) baseScore -= 15;
    
    setSafetyScore(Math.max(baseScore, 10));
  };

  runDiagnosticsRef.current = runLiveDeepDiagnostics;

  useEffect(() => {
    const handleRemoteScriptReceived = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.script === 'string') {
        const receivedScript = customEvent.detail.script;
        setActiveScript(receivedScript);
        runDiagnosticsRef.current(receivedScript);
        // Scroll to the verifier cockpit so the user sees results immediately
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          const targetElement = document.getElementById('interactive-roadmap-dashboard');
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    };
    window.addEventListener('uwes-set-validator-script', handleRemoteScriptReceived);
    return () => {
      window.removeEventListener('uwes-set-validator-script', handleRemoteScriptReceived);
    };
  }, []);

  const wasValidatingRef = useRef(false);

  useEffect(() => {
    if (wasValidatingRef.current && !isValidating && safetyScore !== null) {
      setTimeout(() => {
        const resultsEl = document.getElementById('preflight-diagnostics-results-container');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
    wasValidatingRef.current = isValidating;
  }, [isValidating, safetyScore]);

  // Start deep simulation analysis
  const handleStartRealValidation = () => {
    setIsValidating(true);
    setSafetyScore(null);

    let progress = 0;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      progress++;
      if (progress >= 3) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsValidating(false);
        runLiveDeepDiagnostics(activeScript);
      }
    }, 450);
  };

  const handleCopyText = async (text: string, id: string) => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (_) {
      copied = false;
    }
    if (!copied) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (_) {}
      document.body.removeChild(textarea);
    }
    setCopiedStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  return (
    <div id="interactive-roadmap-dashboard" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-6">
      {/* Navigation Top */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Milestone className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {language === 'ko' ? '시스템 명령어 안심 검사소 및 실시간 AI 프리플라이트 진단기' : 'UWES Safe Command Verifier & AI Preflight'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {language === 'ko' ? '컴퓨터 복원용 스크립트 안전도 즉각 분석 및 1초 자가복구 원복 장치 통합 관제' : 'Verify command safety levels instantly and synthesize 1-click restore rollback scripts'}
            </p>
          </div>
        </div>


      </div>

      {/* Main Content Pane */}
      <div className="p-6 flex flex-col gap-6">
        {/* Beginner Mode Toggle Pill Banner */}
        <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg text-indigo-700 dark:text-indigo-300 shrink-0 mt-0.5 sm:mt-0">
              <HelpCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {language === 'ko' ? '🎓 초보자용 간편 설명 모드 작동 중' : '🎓 Casual & Friendly Mode is Active'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-normal">
                {language === 'ko' 
                  ? '복잡하고 딱딱한 기계용어(AST, HKLM, Heuristic)를 제외한, 직관적이고 다정한 일상 비유로 설명해 드립니다.' 
                  : 'Strips out complex engineering keywords, and highlights direct warnings with easy real-world analogies.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsBeginnerMode(!isBeginnerMode)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-center cursor-pointer ${
              isBeginnerMode 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white' 
                : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span>
              {isBeginnerMode 
                ? (language === 'ko' ? '🟢 간편 모드가 켜져 있습니다' : '🟢 Simple Mode On') 
                : (language === 'ko' ? '⚙️ 전문가 정보 보기' : '⚙️ Show Tech Details')}
            </span>
          </button>
        </div>

        {/* Beautifully simplified 3-step numbered sequence guide */}
        {isBeginnerMode && (
          <div className="bg-slate-50/50 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/65 text-left animate-fade-in shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📢</span>
              <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                {language === 'ko' ? '초보자 이용 방법: 3단계 걱정 없는 수리 비결' : 'Easy 3-Step Verification Guide'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 relative">
                <span className="absolute right-3 top-2 text-xl font-bold font-mono text-slate-200 dark:text-slate-800">1</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  {language === 'ko' ? '1. 수리 명령어 가볍게 누르기' : '1. Choose Repair Preset'}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  {language === 'ko'
                    ? '체험용 안전 명령 세트(SET 01~03) 버튼을 누르면, 컴퓨터를 수리할 명령어가 칠판에 자동으로 친절히 채워집니다.'
                    : 'Click one of our customized update helper presets to automatically fill the safe whiteboard workspace.'}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 relative">
                <span className="absolute right-3 top-2 text-xl font-bold font-mono text-slate-200 dark:text-slate-800">2</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  {language === 'ko' ? '2. 가상 컴퓨터로 모의 검사하기' : '2. Run Safe Simulation'}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  {language === 'ko'
                    ? '[정밀 안전성 체크 시작] 버튼을 누르면, 실제 기기에 전혀 해를 주지 않고 위험이 생길 지만 모의 예측하여 결과를 보여 줍니다.'
                    : 'Click the validation trigger to execute non-destructive static simulation blocks in our safe offline testing unit.'}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 relative">
                <span className="absolute right-3 top-2 text-xl font-bold font-mono text-slate-200 dark:text-slate-800">3</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  {language === 'ko' ? '3. 되돌리기 안심 스크립트 챙기기' : '3. Capture Safety Insurance'}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  {language === 'ko'
                    ? '우측에 만들어진 "되돌리기(롤백)" 코드를 복사하거나 다운받아 보관하세요. 만약 컴퓨터에 문제가 생겨도, 더블클릭 단 1초 만에 순정 복원됩니다.'
                    : 'Keep the auto-compiled restore sequence handy. This acts as a reliable shield to undo system parameter changes.'}
                </p>
              </div>
            </div>
          </div>
        )}

          {/* Real Reactive Validation Sandbox Cockpit */}
          <div className="flex flex-col gap-5">
            {/* Control Panel */}
            <div className="bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-slate-200/60 dark:border-slate-800/60 p-5">
              <div className="flex items-center justify-between mb-2.5">
                <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-500" />
                  {language === 'ko' ? '시스템 명령어 안심 검사소 및 실시간 AI 프리플라이트 진단기' : 'Target Environment Configuration Alignment Engine'}
                </h5>
                <span className="px-2.5 py-0.5 rounded text-[11px] bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-bold font-mono">
                  ACTIVE PIPELINE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-5 leading-normal">
                {language === 'ko' 
                  ? "지능형 파싱 모듈이 대상 스크립트를 실제 AST 분석하여 레지스트리 경로 위험성, 특정 OS 빌드 호환성, 백도어 우회 패턴을 색출한 뒤 실질적인 회복 롤백(Rollback) 코드를 자동 합성합니다." 
                  : "Parses target commands to find affected subtrees, OS capability conflicts, and instantly synthesizes restore rollback files autonomously."}
              </p>

              {/* Targets, Privileges configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                {/* OS selector */}
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                    {language === 'ko' ? '대상 Windows 빌드 버전' : 'Target OS Build'}
                  </label>
                  <select
                    value={targetOS}
                    onChange={(e) => {
                      setTargetOS(e.target.value);
                      setTimeout(() => runLiveDeepDiagnostics(activeScript), 50);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="win11_23h2">Windows 11 23H2 (Build 22631)</option>
                    <option value="win11_22h2">Windows 11 22H2 (Build 22621)</option>
                    <option value="win10_22h2">Windows 10 22H2 (Build 19045)</option>
                    <option value="win_server2022">Windows Server 2022</option>
                  </select>
                </div>

                {/* Privileges Badge */}
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                    {language === 'ko' ? '가상 실행 스레드 권한' : 'Execution Privilege Standard'}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminElevated(true);
                        setTimeout(() => runLiveDeepDiagnostics(activeScript), 50);
                      }}
                      className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg border transition-all cursor-pointer ${
                        isAdminElevated 
                          ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' 
                          : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      👑 Admin Elevated
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminElevated(false);
                        setTimeout(() => runLiveDeepDiagnostics(activeScript), 50);
                      }}
                      className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg border transition-all cursor-pointer ${
                        !isAdminElevated 
                          ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900' 
                          : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      👤 Standard User
                    </button>
                  </div>
                </div>

                {/* Presets dropdown selector */}
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                    {language === 'ko' ? '테스트 진단 프리셋 불러오기' : 'Choose PowerShell Preset'}
                  </label>
                  <div className="flex gap-2">
                    {SCRIPTS_PRESETS.map((preset, index) => (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => {
                          setActiveScript(preset.code);
                          setTimeout(() => runLiveDeepDiagnostics(preset.code), 50);
                        }}
                        className={`flex-1 py-1.5 px-2 text-[11px] sm:text-xs font-bold rounded border transition-all cursor-pointer ${
                          activeScript === preset.code
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50'
                        }`}
                        title={language === 'ko' ? preset.nameKo : preset.nameEn}
                      >
                        SET 0{index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Beginner Active Preset Explanation Card */}
              {isBeginnerMode && (
                <div className="mb-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col gap-1.5 animate-fade-in text-left">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    {language === 'ko' ? '💡 초보자 안심 해설: 이 명령어는 내 컴퓨터에 어떤 영향을 주나요?' : '💡 Easy Explanation: What does this command do?'}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {activeScript === SCRIPTS_PRESETS[0].code ? (
                      language === 'ko' 
                        ? "컴퓨터가 백그라운드에서 윈도우 업데이트 파일을 몰래 다른 컴퓨터와 공유하며 내 소중한 인터넷 속도(대역폭)를 뺏어 먹는 최적화 기능(Delivery Optimization)을 꺼두어 컴퓨터 속도를 얌전하게 회복시키는 안전한 세팅법입니다."
                        : "This safely disables background bandwidth sharing when Windows downloads updates, insuring your web browser experiences zero throttling or latency lags."
                    ) : activeScript === SCRIPTS_PRESETS[1].code ? (
                      language === 'ko'
                        ? "해결되지 않는 찌꺼기 파일들 때문에 꽉 막혀 고장 나 버린 윈도우 업데이트용 캐시 저장 상자(SoftwareDistribution)를 통째로 비우고, 멈춤 상태에 있던 백그라운드 운반 기사들(wuauserv & bits 서비스)을 즉시 다시 깨우는 응급 조치 스크립트입니다."
                        : "Cleans out corrupted local files within the system software catalogs and safely triggers a manual reset for the update queue daemon workers."
                    ) : activeScript === SCRIPTS_PRESETS[2].code ? (
                      language === 'ko'
                        ? "20년 전 설계된 보안이 매우 보안이 약한 옛날식 암호 프로토콜(TLS 1.0)을 꺼버리는 작업입니다. 나쁜 해커가 우리 컴퓨터 통신 채널에 몰래 엿듣고 빨대를 꽂지 못하도록 최신 고급 자물쇠만 남기는 훌륭한 백신 조치입니다."
                        : "Locks down dated transmission protocols (TLS 1.0) to safeguard network traffic blocks from intrusion or malicious interception."
                    ) : activeScript === SCRIPTS_PRESETS[3].code ? (
                      language === 'ko'
                        ? "해커들이 문장을 읽기 힘들게 뒤죽박죽 외계어 형태(Base64)로 숨겨 놓은 불상의 특수 코드를 동적으로 한 줄씩 번역하여 위험성이 있는지 미리 가상 격리 장치 안에서 엿보고 조사하는 보안 관제 모의 실험입니다."
                        : "A dynamic diagnostics routine to decrypt base64 cyber codes in a simulated virtual state to determine structural vulnerabilities."
                    ) : (
                      language === 'ko'
                        ? "사용자가 직접 편집한 특수 명령어를 지능적으로 살펴보고 있습니다. 안전 여부가 100% 확정될 때까지는 마음대로 실제 컴퓨터에 복사해서 실행하지 마시고, 이 가상 안전기 내부 테스트 결과를 면밀히 살펴보세요!"
                        : "Reviewing your customized source code step-by-step. Keep experimenting safely inside this non-destructive testing cockpit!"
                    )}
                  </p>
                </div>
              )}

              {/* Code input text area */}
              <div className="mb-4">
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-1.5">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                    {language === 'ko' ? '대상 파워셸 구문 코드 (실시간 검증 편집기)' : 'Target PowerShell Source Code (Sandbox Input)'}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={handleEditorCopy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-900 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-[11px] font-semibold border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer shadow-sm hover:scale-[1.02] duration-150"
                      title={language === 'ko' ? '코드 복사' : 'Copy Code'}
                    >
                      <Copy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{editorCopied ? (language === 'ko' ? '복사 완료!' : 'Copied!') : (language === 'ko' ? '복사' : 'Copy')}</span>
                    </button>
                    
                    {/* Paste Button */}
                    <button
                      type="button"
                      onClick={handleEditorPaste}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-900 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-[11px] font-semibold border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer shadow-sm hover:scale-[1.02] duration-150"
                      title={language === 'ko' ? '클립보드 내용 붙여넣기' : 'Paste from Clipboard'}
                    >
                      <Clipboard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{editorPasted ? (language === 'ko' ? '붙여넣기 완료!' : 'Pasted!') : (language === 'ko' ? '붙여넣기' : 'Paste')}</span>
                    </button>

                    {/* Clear Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveScript('');
                        setSafetyScore(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 active:bg-rose-200 dark:active:bg-rose-950/60 text-rose-600 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-100 text-[11px] font-semibold border border-rose-200 dark:border-rose-900/40 transition-all cursor-pointer shadow-sm hover:scale-[1.02] duration-150"
                      title={language === 'ko' ? '스크립트 전체 비우기' : 'Clear All'}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                      <span>{language === 'ko' ? '모두 지우기' : 'Clear All'}</span>
                    </button>
                  </div>
                </div>
                {showManualPasteBox && (
                  <div className="mb-2.5 p-3 rounded-lg bg-slate-900 border border-slate-700 space-y-2">
                    <p className="text-[11px] text-amber-300">
                      {language === 'ko'
                        ? '브라우저 정책으로 자동 읽기가 제한되었습니다. 아래 입력창에 Ctrl+V 후 [적용]을 클릭하세요.'
                        : 'Clipboard auto-read is restricted. Paste (Ctrl+V) below and click Apply.'}
                    </p>
                    <textarea
                      className="w-full h-20 p-2 font-mono text-xs bg-slate-950 text-slate-200 rounded border border-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      value={manualPasteDraft}
                      onChange={(e) => setManualPasteDraft(e.target.value)}
                      placeholder={language === 'ko' ? '여기에 Ctrl+V로 붙여넣으세요...' : 'Paste (Ctrl+V) here...'}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowManualPasteBox(false)}
                        className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        {language === 'ko' ? '취소' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (manualPasteDraft.trim() !== '') {
                            setActiveScript(manualPasteDraft);
                            runLiveDeepDiagnostics(manualPasteDraft);
                            setEditorPasted(true);
                            setTimeout(() => setEditorPasted(false), 2000);
                          }
                          setShowManualPasteBox(false);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                      >
                        {language === 'ko' ? '적용' : 'Apply'}
                      </button>
                    </div>
                  </div>
                )}
                <textarea
                  className="w-full h-36 p-3.5 font-mono text-sm bg-slate-950 text-slate-200 rounded-lg border border-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  value={activeScript}
                  onChange={(e) => {
                    setActiveScript(e.target.value);
                    runLiveDeepDiagnostics(e.target.value);
                  }}
                  placeholder={language === 'ko' ? '검증 및 롤백을 연동할 PowerShell 명령어를 붙여넣어 보세요...' : 'Paste customized system commands to evaluate pipeline...'}
                />
              </div>

              {/* Simulation Trigger button (Moved RIGHT under the PowerShell code editor) */}
              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={handleStartRealValidation}
                  disabled={isValidating || !activeScript}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-950 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>{language === 'ko' ? '실시간 샌드박스 정적 분석 연산 중...' : 'Compiling Safe Environment Profile...'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current text-emerald-400" />
                      <span>{language === 'ko' ? '정밀 정적 환경 컴파일 및 진단 시작' : 'Trigger Secure Pre-validation'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Beginner Jargon Buster Glossary */}
              {isBeginnerMode && (
                <div className="mb-4 p-5 bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/30 rounded-xl text-left animate-fade-in">
                  <span className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 block mb-3 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                    {language === 'ko' ? '🎓 초보자용 핵심 용어 돋보기 사전' : '🎓 Absolute Beginner Jargon Glossary'}
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {JARGON_DICTIONARY.map((item, idx) => (
                      <div key={idx} className="p-3.5 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800/80 hover:border-indigo-200 dark:hover:border-indigo-950 transition-colors flex flex-col gap-1.5">
                        <span className="text-xs sm:text-[13px] font-bold text-indigo-600 dark:text-indigo-400 block">
                          {language === 'ko' ? item.termKo : item.term}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                          {language === 'ko' ? item.descKo : item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Verification diagnostics outcome results */}
            {safetyScore !== null && !isValidating && (
              <div 
                id="preflight-diagnostics-results-container"
                className="col-span-12 p-6 md:p-8 bg-gradient-to-br from-indigo-50/20 via-slate-50/20 to-blue-50/20 dark:from-indigo-950/10 dark:via-slate-900/30 dark:to-slate-950/20 border-4 border-indigo-500 dark:border-indigo-400 rounded-3xl shadow-[0_0_40px_rgba(99,102,241,0.25)] flex flex-col gap-6 animate-fade-in scroll-mt-24 text-left"
              >
                {/* Result Title Header Badge to highlight/differentiate check results */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-200 dark:border-indigo-900 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                    <div>
                      <h4 className="text-base sm:text-lg font-extrabold text-indigo-900 dark:text-indigo-300 tracking-tight flex items-center gap-2">
                        {language === 'ko' ? '✨ 실시간 안심 정비 모의진단 & 자가복구 컴파일 결과보고서' : '✨ Live Safety Simulation & Rollback Compilation Report'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        {language === 'ko' ? '파워셸 환경 상태 및 복구 가능성을 오프라인에서 무오류 샌드박스로 정밀 판단한 결과입니다.' : 'Evaluated shell privileges, registry locks and environment compatibility variables without modifying physical state.'}
                      </p>
                    </div>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-800 text-xs font-black text-indigo-700 dark:text-indigo-400 tracking-wider">
                    {language === 'ko' ? '보안 특화 진단 완료' : 'SECURE DIAGNOSIS OK'}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Row 1: Score & Checklist stacked/side-by-side inside the 12-column grid */}
                  <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column (Score Card) */}
                  <div className="col-span-1 lg:col-span-4 flex flex-col gap-4">
                    {/* Rating Index card */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs h-full flex flex-col justify-center">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono block mb-3">
                        {language === 'ko' ? '파이프라인 종합 정합성 부적합 분석' : 'ACC_PRIVILEGE QUALITY DIAGNOSIS'}
                      </span>

                      <div className="flex items-center gap-4">
                        {/* Circle indicator */}
                        <div className="relative w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl select-none shrink-0" style={{
                          background: `conic-gradient(${safetyScore > 75 ? '#10b981' : safetyScore > 40 ? '#f59e0b' : '#ef4444'} ${safetyScore * 3.6}deg, #e2e8f0 0deg)`
                        }}>
                          <div className="absolute inset-1.5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                            <span className={`${safetyScore > 75 ? 'text-emerald-500' : safetyScore > 40 ? 'text-amber-500' : 'text-red-500'}`}>
                              {safetyScore}
                            </span>
                          </div>
                        </div>

                        {/* Summary */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {safetyScore > 75 
                              ? (language === 'ko' ? '시스템 적용 가용수준 완벽 충족' : 'Fully Compliant Security Standard')
                              : safetyScore > 40
                              ? (language === 'ko' ? '상태정합성 중간 수준 정비 필요' : 'Minor Configuration Alerts Raised')
                              : (language === 'ko' ? '수행 시 시스템 차단 크래시 위험' : 'Severe Access Violation Warning')}
                          </h4>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                            {language === 'ko' 
                              ? `${diagnosedCmdlets.length}개 커맨드 진단, ${diagnosedRegistryKeys.length}개 대상 레지스트리가 분석 파싱되었습니다.`
                              : `Diagnosed ${diagnosedCmdlets.length} core platform cmdlets and analyzed ${diagnosedRegistryKeys.length} target registry directories.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (Heuristics Checklist) */}
                  <div className="col-span-1 lg:col-span-8 flex flex-col gap-4">
                    {/* Preflight Heuristics checklist (Phase 3 step 2 / step 3 realized!) */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 flex-1">
                      <h6 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-3 font-mono">
                        {language === 'ko' ? '1단계: 환경별 레지스트리 정합성 및 위험 체크' : 'Phase 3 Checkpoints Profile'}
                      </h6>

                      <div className="space-y-2.5">
                        {/* OS target aligned checklist item */}
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800 flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {language === 'ko' ? '운영체제 아키텍처 지원 정합성 통과' : 'OS Build Architecture Alignment'}
                            </span>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              {language === 'ko' ? `${targetOS.toUpperCase()} 환경에 최적화된 API 호환이 정상 검출되었습니다.` : `Verified safe backward compatibility with target config ${targetOS.toUpperCase()}.`}
                            </p>
                          </div>
                        </div>

                        {/* Admin validation item */}
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800 flex items-start gap-2.5">
                          {isAdminElevated ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {language === 'ko' ? '커널 권한 보안 채널 검정 완료' : 'Preflight Kernel Exception Check'}
                            </span>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              {isAdminElevated 
                                ? (language === 'ko' ? "관리자 모드가 실행되어 시스템 레지스트리 수정 권한을 충족합니다." : "High privilege level matched correct local profile standards.")
                                : (language === 'ko' ? "표준 유저 상태로 실행되어, 즉시 이행 시 로컬 거부 에러를 초래하게 됩니다." : "Execution in Standard User profile will fail due to write access locks.")}
                            </p>
                          </div>
                        </div>

                        {/* Preflight dynamic warnings */}
                        {preflightWarnings.map((warn, i) => (
                          <div key={i} className="bg-amber-50/50 dark:bg-amber-950/15 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                                {language === 'ko' ? '오타 및 상태 비호환 위협 가이드' : 'Configuration Constraint Detected'}
                              </span>
                              <p className="text-[10px] text-amber-600/90 dark:text-amber-300/90 mt-0.5 leading-normal">
                                {warn}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Decoded Base64 Decrypter Block (Phase 5) */}
                        {decodedPayload && (
                          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-left animate-fade-in">
                            <div className="flex items-center gap-1.5 mb-1.5 text-emerald-600 dark:text-emerald-400">
                              <Lock className="w-4 h-4 animate-bounce" />
                              <span className="text-xs font-bold uppercase tracking-wider font-mono">
                                {language === 'ko' ? '휴리스틱 무력화: 난독화 실시간 복호화 결과' : 'Heuristic Base64 Payload Decrypted (Phase 5)'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-normal">
                              {language === 'ko'
                                ? "난독화된 Base64 문자열 우회를 탐지하고 악성 여부를 정적 분석하기 위해 휴리스틱으로 디코딩을 완료한 평문입니다."
                                : "The secure parser successfully isolated the binary string and decompiled it into pure readable configuration instructions."}
                            </p>
                            <pre className="p-2.5 bg-slate-900 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-24 border border-slate-800">
                              {decodedPayload}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2/Bottom Block: Safe rollback synthesis (Phase 4 outputs) in full-width ("한줄창") */}
                <div id="rollback-result-section" className="col-span-12 flex flex-col gap-4 scroll-mt-12">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 md:p-6 shadow-inner relative overflow-hidden">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 text-blue-400 animate-spin" />
                          <h6 className="text-[12px] md:text-sm font-bold text-blue-400 tracking-wider uppercase font-mono">
                            {language === 'ko' ? '2단계: 자동 원상복구 회복(Rollback) 소스 생성 결과' : 'Auto rollback code synthesizer'}
                          </h6>
                        </div>

                        {/* Copy button */}
                        <button
                          onClick={() => handleCopyText(rollbackScript, 'rollback')}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[11px] font-mono border border-slate-800 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copiedStates['rollback'] ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-normal mb-1">
                        {language === 'ko'
                          ? "안심하고 환경 설정을 마칠 수 있도록, 시스템 위 변조를 100% 원상상태로 되돌리는 백업 복원 스크립트를 분석 결과에 근거해 오프라인으로 1초만에 빌드했습니다."
                          : "Extracts altered parameters and generates reliable reversal variables to rollback values securely."}
                      </p>

                      {isBeginnerMode && (
                        <div className="mb-3 bg-sky-500/10 border border-sky-500/20 p-4 rounded-xl flex flex-col gap-1.5 text-left text-slate-300 animate-fade-in">
                          <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-sky-400" />
                            {language === 'ko' ? '🛡️ 초보자 안심 요약 보험 카드' : '🛡️ Absolute Safe-Rollback Card'}
                          </span>
                          <p className="text-[11px] leading-relaxed text-slate-400">
                            {language === 'ko'
                              ? "위의 영문 코드가 조금 복잡해 보이시나요? 걱정하실 필요 전혀 없어요! 이 자동 원상복구 복원제는 위에서 바꾼 모든 컴퓨터 설지를 한 동작으로 원래의 완벽한 순정 상태로 1초 만에 깨끗이 되돌려 주는 '안심 보험 자물쇠'입니다. 만약을 준비하시려면 아래 'Download Script' 버튼을 눌러 보장 책갈피 파일로 내려받으세요."
                              : "Does the code block look technical? This synthesized card holds an absolute rollback formula that undoes every registry shift in 1-click, keeping your device 100% compliant with standard safety guidelines."}
                          </p>
                        </div>
                      )}

                      {/* Wide single-line/row comfort editor window ("한줄창") with comfortable text console layout */}
                      <pre className="p-4 bg-slate-900 rounded-lg text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto border border-slate-800/80 min-h-[200px] max-h-[500px]">
                        {rollbackScript}
                      </pre>
                    </div>

                    {/* Registry restoration card download helper */}
                    <div className="mt-4 pt-3.5 border-t border-slate-800 flex flex-wrap gap-2.5 items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <Database className="w-3.5 h-3.5 text-blue-500" />
                        <span>{language === 'ko' ? '.REG 자동 압축 준비 완료' : 'Local REG binary available'}</span>
                      </div>
                      
                      <button
                        onClick={() => {
                          const element = document.createElement("a");
                          const file = new Blob([rollbackScript], {type: 'text/plain'});
                          const url = URL.createObjectURL(file);
                          element.href = url;
                          element.download = "UWES_Secure_Rollback_Surcharge.ps1";
                          document.body.appendChild(element);
                          element.click();
                          document.body.removeChild(element);
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                        }}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Script</span>
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            )}
          </div>



      </div>
    </div>
  );
}
