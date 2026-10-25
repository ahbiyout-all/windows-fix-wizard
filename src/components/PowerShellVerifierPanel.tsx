import React, { useState, useEffect } from 'react';
import { parseJsonResponse } from '../utils/safeFetch';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Check, 
  AlertTriangle, 
  Cpu, 
  Terminal, 
  Lock, 
  Unlock, 
  RefreshCw, 
  FileSignature, 
  X,
  Sparkles,
  Info,
  Copy,
  Clipboard,
  Trash2
} from 'lucide-react';
import { verifyPowerShellScript, signPowerShellScript, calculateSimpleHash, PowerShellSecurityReport } from '../utils/psVerifier';

interface Props {
  scriptText: string;
  onScriptSigned: (newScript: string) => void;
  language: 'ko' | 'en';
}

export function PowerShellVerifierPanel({ scriptText, onScriptSigned, language }: Props) {
  const [report, setReport] = useState<PowerShellSecurityReport | null>(null);
  const [sandboxText, setSandboxText] = useState<string>('');
  const [sandboxReport, setSandboxReport] = useState<PowerShellSecurityReport | null>(null);
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [isSigningProcess, setIsSigningProcess] = useState(false);

  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sandboxText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Navigator clipboard API failed, attempting fallback:", err);
      // Fallback: copy via standard input selection
      const textarea = document.createElement("textarea");
      textarea.value = sandboxText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const success = document.execCommand("copy");
        if (success) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error("execCommand failed");
        }
      } catch (e) {
        console.error("Fallback copy failed:", e);
      }
      document.body.removeChild(textarea);
    }
  };

  const handlePaste = async () => {
    try {
      setPasteError(null);
      const text = await navigator.clipboard.readText();
      if (text !== undefined && text !== null) {
        handleSandboxChange(text);
        setPasted(true);
        setTimeout(() => setPasted(false), 2000);
      }
    } catch (err) {
      console.warn("Clipboard read blocked (normal iframe behavior):", err);
      // Fallback: prompt the user to input
      const manualText = window.prompt(
        language === 'ko' 
          ? "보안 정책으로 웹페이지에서 직접 붙여넣기가 제한되어 있습니다.\n아래 입력 상자에 코드(Ctrl+V)를 붙여넣은 뒤 [확인]을 클릭해 주세요:" 
          : "Web browser safety policy restricts direct clipboard pasting.\nPlease paste (Ctrl+V) the script content in the input box below:"
      );
      if (manualText !== null) {
        handleSandboxChange(manualText);
        setPasted(true);
        setTimeout(() => setPasted(false), 2000);
      } else {
        setPasteError(
          language === 'ko' 
            ? "클립보드 접근이 거부되었습니다. 편집창(아래)을 클릭하고 키보드의 Ctrl+V를 사용하여 수동으로 붙여넣어 주세요." 
            : "Clipboard read access denied. Click the editor textarea below and press 'Ctrl+V' to paste manually."
        );
      }
    }
  };

  // Analyze script text whenever it changes
  useEffect(() => {
    if (scriptText) {
      const result = verifyPowerShellScript(scriptText);
      setReport(result);
      setSandboxText(scriptText);
      setSandboxReport(result);
    } else {
      setReport(null);
    }
  }, [scriptText]);

  // Handle live edit within sandbox
  const handleSandboxChange = (newVal: string) => {
    setSandboxText(newVal);
    const result = verifyPowerShellScript(newVal);
    setSandboxReport(result);
  };

  // Sign helper
  const handleDigitalSignPress = async () => {
    setIsSigningProcess(true);
    // Simulate certificates binding processing
    await new Promise(r => setTimeout(r, 600));
    try {
      const adminToken = localStorage.getItem('winfix_admin_token') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }
      const response = await fetch('/api/scripts/sign', {
        method: 'POST',
        headers,
        body: JSON.stringify({ script: scriptText })
      });
      const data = await parseJsonResponse(response);
      if (data.success) {
        onScriptSigned(data.signedScript);
      } else {
        // Fallback to client-side signing if server is unreachable or client has local rights
        const fallback = signPowerShellScript(scriptText);
        onScriptSigned(fallback.signedScript);
      }
    } catch (e) {
      const fallback = signPowerShellScript(scriptText);
      onScriptSigned(fallback.signedScript);
    } finally {
      setIsSigningProcess(false);
    }
  };

  if (!scriptText || !report) return null;

  const isSecure = report.safetyRating === 'SECURE';
  const isSuspicious = report.safetyRating === 'SUSPICIOUS';
  const isDanger = report.safetyRating === 'HIGH_ALERT';

  return (
    <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden shadow-sm">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${
            isSecure ? 'text-emerald-500' :
            isDanger ? 'text-red-500 animate-pulse' :
            isSuspicious ? 'text-amber-500' : 'text-blue-500'
          }`} />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {language === 'ko' ? 'PowerShell 스크립트 보안 분석기' : 'PowerShell Script Security Guard'}
          </span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5">
          {report.isSigned ? (
            report.signatureDetails?.isValid ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                <Lock className="w-2.5 h-2.5" />
                {language === 'ko' ? '공식 서명 검증됨' : 'Verified Signature'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/45 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30 animate-pulse">
                <ShieldAlert className="w-2.5 h-2.5" />
                {language === 'ko' ? '서명 위변조 감지(인증실패)' : 'Tampered Signature (Invalid)'}
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/25 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/20">
              <Unlock className="w-2.5 h-2.5" />
              {language === 'ko' ? '미서명 개발자 코드' : 'Unsigned Policy Code'}
            </span>
          )}

          {/* Safety Rating Indicator */}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isSecure ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
            isDanger ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
            isSuspicious ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
          }`}>
            {report.safetyRating}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Metric Scores */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="col-span-1 md:col-span-5 flex flex-col justify-center bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200/60 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-500 font-medium">{language === 'ko' ? '악성 난독화 위험 지수' : 'Malicious Obfuscation Index'}</span>
              <span className={`font-bold ${report.obfuscationScore > 40 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                {report.obfuscationScore}%
              </span>
            </div>
            
            {/* Visual Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  report.obfuscationScore >= 60 ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                  report.obfuscationScore >= 30 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                  'bg-gradient-to-r from-emerald-400 to-emerald-500'
                }`}
                style={{ width: `${Math.max(report.obfuscationScore, 4)}%` }}
              ></div>
            </div>
            <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
              {language === 'ko' ? '* 커맨드 인라인 은닉화, 대소문자 고차난독, Base64 삽입 여부를 동적 점수화 합니다.' : '* Scores obfuscation level based on Base64 flags, casing techniques, and string tricks.'}
            </p>
          </div>

          <div className="col-span-1 md:col-span-7 flex flex-col justify-between bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200/60 dark:border-slate-800">
            <h5 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5 mb-1">
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              {language === 'ko' ? '검출된 주요 명령어 (Cmdlets)' : 'Detected Key Cmdlets'}
            </h5>
            <div className="flex flex-wrap gap-1.5 max-h-[4.5rem] overflow-y-auto pr-1">
              {report.detectedCmdlets.length > 0 ? (
                report.detectedCmdlets.map((cmdlet, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] border border-slate-200/50 dark:border-slate-700/50">
                    {cmdlet}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  {language === 'ko' ? '표준 Cmdlet 없음 (순수 레지스트리 / 파일 작업 등)' : 'No standard cmdlets detected (Raw system/reg operations)'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Security Rule Indicators */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 shadow-inner">
          {report.riskAnalyzers.map((rule, idx) => (
            <div key={idx} className="p-2.5 flex items-start gap-3">
              <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                rule.isSecure 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
              }`}>
                {rule.isSecure ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : (
                  <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                )}
              </span>
              <div>
                <h6 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ko' ? rule.nameKo : rule.name}
                  <span className={`ml-1.5 font-semibold text-[9px] px-1 py-0.2 rounded-md ${
                    rule.isSecure 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600'
                  }`}>
                    {rule.isSecure ? (language === 'ko' ? '안전 완료' : 'SAFE') : (language === 'ko' ? '주의 검출' : 'WARNING')}
                  </span>
                </h6>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                  {language === 'ko' ? rule.descKo : rule.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Signals Warnings Panel */}
        {report.obfuscationSignals.length > 0 && (
          <div className="bg-amber-50/70 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3">
            <h6 className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-4 h-4" />
              {language === 'ko' ? '탐지된 잠재적인 우회 및 은닉 패턴 경고' : 'Heuristics Warnings Identified'}
            </h6>
            <ul className="space-y-1.5 pl-5 list-disc text-[11px] text-amber-700 dark:text-amber-300/95 leading-relaxed">
              {report.obfuscationSignals.map((sig, i) => (
                <li key={i}>
                  <strong className="font-semibold underline decoration-dotted">{sig.pattern}</strong> ({sig.severity === 'high' ? 'High Risk' : 'Medium Risk'}): {language === 'ko' ? sig.descKo : sig.desc}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Signature details */}
        {report.isSigned && report.signatureDetails && (
          <div className={`rounded-lg p-3 border ${
            report.signatureDetails.isValid 
              ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400'
              : 'bg-red-50/40 dark:bg-red-950/10 border-red-200/50 dark:border-red-900/30 text-red-800 dark:text-red-400'
          }`}>
            <h6 className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <FileSignature className="w-4 h-4 text-emerald-500" />
              {language === 'ko' ? '스크립트 전자서명 상세 명세서' : 'Digital Certificate Verification'}
            </h6>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono leading-relaxed">
              <div>
                <span className="opacity-70">{language === 'ko' ? '발급 인증기관:' : 'Signer Authority:'}</span> 
                <br />
                <span className="font-bold">{report.signatureDetails.signer}</span>
              </div>
              <div>
                <span className="opacity-70">{language === 'ko' ? '인증서 고유일련번호:' : 'Certificate Serial No:'}</span>
                <br />
                <span className="font-bold">{report.signatureDetails.serial}</span>
              </div>
              <div>
                <span className="opacity-70">{language === 'ko' ? '서명 시점 (KST):' : 'Timestamp KST:'}</span>
                <br />
                <span className="font-bold">{report.signatureDetails.signedAt}</span>
              </div>
              <div>
                <span className="opacity-70">{language === 'ko' ? '서명 무결성 검사:' : 'Signature Integrity Check:'}</span>
                <br />
                {report.signatureDetails.isValid ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">● PASS ({language === 'ko' ? '변경 내역 없음' : 'Untampered'})</span>
                ) : (
                  <span className="text-red-500 font-bold animate-pulse">▲ FAILURE ({language === 'ko' ? '코드 위변조 감지됨!' : 'Cryptographically Tampered!'})</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic signer actions/Demonstrator */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSandboxMode(!isSandboxMode)}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1.5 rounded"
            >
              <Terminal className="w-3.5 h-3.5" />
              {isSandboxMode 
                ? (language === 'ko' ? '실험 디렉터 닫기' : 'Close Tamper Sandbox')
                : (language === 'ko' ? '코드 위변조 실시간 실험실 열기' : 'Try Real-time Tamper Sandbox')
              }
            </button>
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
          </div>

          {!report.isSigned ? (
            <button
              onClick={handleDigitalSignPress}
              disabled={isSigningProcess}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 rounded transition-all disabled:opacity-50"
            >
              {isSigningProcess ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {language === 'ko' ? '인증 서명 발급 중...' : 'Issuing Certificate...'}
                </>
              ) : (
                <>
                  <FileSignature className="w-3.5 h-3.5 text-emerald-400" />
                  {language === 'ko' ? '플랫폼 보안 디지털 서명(Sign) 적용하기' : 'Apply Secure Certificate Sign'}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                // Remove signature block
                const signatureRegex = /#\s*SIG\s*#\s*Begin\s*Signature\s*Block[\s\S]*?#\s*SIG\s*#\s*End\s*Signature\s*Block/i;
                const clean = scriptText.replace(signatureRegex, '').trim();
                onScriptSigned(clean);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 rounded transition-all"
            >
              <Unlock className="w-3 h-3 text-amber-500" />
              {language === 'ko' ? '서명 제거 (개발용)' : 'Strip Digital Sign (Dev)'}
            </button>
          )}
        </div>

        {/* Dynamic Sandbox Simulator */}
        {isSandboxMode && (
          <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-3.5 border border-slate-800 flex flex-col gap-3 animate-fade-in">
            <div className="flex justify-between items-center">
              <h5 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                {language === 'ko' ? '실시간 위변조 탐지 시뮬레이터 (샌드박스)' : 'Interactive Code Integrity Experiment'}
              </h5>
              <button 
                onClick={() => setIsSandboxMode(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 leading-normal">
              {language === 'ko' ? '코드 영역을 1바이트라도 변경하는 즉시 SHA-256 해시 대조를 통해 디지털 서명이 파괴(Tampered)되는 무결성 체크 메커니즘을 체험해 보세요.' : 'Modify even single character in the script below to immediately see how the integrity checksum breaks and invalidates the digital signature chain!'}
            </p>

            <div className="flex flex-col border border-slate-800 rounded-lg overflow-hidden">
              {/* Header/Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/50 dark:bg-slate-950 border-b border-slate-800/80 px-3 py-2 text-xs">
                <span className="text-[10px] text-slate-300 font-semibold font-mono flex items-center gap-1.5 animate-pulse">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  {language === 'ko' ? '실시간 검증 편집기' : 'REAL-TIME VERIFIER EDITOR'}
                </span>
                
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white text-[11px] font-semibold border border-slate-700/50 dark:border-slate-700/60 transition-all cursor-pointer shadow-sm hover:scale-[1.02] duration-150"
                    title={language === 'ko' ? '코드 복사' : 'Copy Code'}
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{copied ? (language === 'ko' ? '복사 완료!' : 'Copied!') : (language === 'ko' ? '복사' : 'Copy')}</span>
                  </button>
                  
                  {/* Paste Button */}
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white text-[11px] font-semibold border border-slate-700/50 dark:border-slate-700/60 transition-all cursor-pointer shadow-sm hover:scale-[1.02] duration-150"
                    title={language === 'ko' ? '클립보드 내용 붙여넣기' : 'Paste from Clipboard'}
                  >
                    <Clipboard className="w-3.5 h-3.5 text-blue-400" />
                    <span>{pasted ? (language === 'ko' ? '붙이기 완료!' : 'Pasted!') : (language === 'ko' ? '붙이기' : 'Paste')}</span>
                  </button>

                  {/* Clear Button */}
                  <button
                    type="button"
                    onClick={() => {
                      handleSandboxChange('');
                      setPasteError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-955/40 hover:bg-rose-900/40 active:bg-rose-955/60 text-rose-300 hover:text-rose-100 text-[11px] font-semibold border border-rose-910/40 transition-all cursor-pointer shadow-sm hover:scale-[1.02] duration-150"
                    title={language === 'ko' ? '스크립트 전체 비우기' : 'Clear All'}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>{language === 'ko' ? '모두 지우기' : 'Clear All'}</span>
                  </button>
                </div>
              </div>

              {pasteError && (
                <div className="bg-amber-950/40 border-b border-amber-900/30 p-2.5 text-[10px] text-amber-400 leading-normal">
                  {pasteError}
                </div>
              )}

              {/* Text Area */}
              <textarea
                className="w-full h-40 bg-slate-950 text-emerald-400 font-mono text-xs p-3 focus:ring-1 focus:ring-blue-500 focus:outline-none border-0 resize-y"
                value={sandboxText}
                onChange={(e) => handleSandboxChange(e.target.value)}
                placeholder={language === 'ko' ? '여기에 PowerShell 스크립트 코드를 직접 입력하거나 붙여넣으세요.' : 'Type or copy/paste your PowerShell script here.'}
              />
            </div>

            {sandboxText !== scriptText && (
              <button
                onClick={() => {
                  onScriptSigned(sandboxText);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded transition-all duration-150 w-full shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                {language === 'ko' ? '샌드박스에서 수정한 편집 코드를 원본 스크립트에 반영하기' : 'Apply Sandbox Changes to Parent Script'}
              </button>
            )}

            {/* Sandbox Verification Result Panel */}
            {sandboxReport && (
              <div className={`p-2 rounded flex items-center justify-between text-[11px] font-bold ${
                sandboxReport.isSigned 
                  ? (sandboxReport.signatureDetails?.isValid 
                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40' 
                    : 'bg-red-900/30 text-red-400 border border-red-800/40 animate-pulse')
                  : 'bg-amber-900/30 text-amber-400 border border-amber-800/40'
              }`}>
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>
                    {sandboxReport.isSigned ? (
                      sandboxReport.signatureDetails?.isValid 
                        ? (language === 'ko' ? '무결성 완벽 유지 (서명 안전정상)' : 'Integrity verified: Untampered!')
                        : (language === 'ko' ? '위해성/변조 감지: 디지털 서명 무효화!' : 'Tampering detected! Digital Chain broken!')
                    ) : (
                      language === 'ko' ? '서명이 존재하지 않는 일반 스크립트' : 'Unsigned raw script'
                    )}
                  </span>
                </div>
                <div className="font-mono text-[10px]">
                  HASH: {calculateSimpleHash(sandboxText.replace(/#\s*SIG\s*#\s*Begin\s*Signature\s*Block[\s\S]*?#\s*SIG\s*#\s*End\s*Signature\s*Block/i, '').trim())}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
