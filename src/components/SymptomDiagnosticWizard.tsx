import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Cpu,
  HardDrive,
  Monitor,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wifi,
  Wrench
} from 'lucide-react';
import { KnownIssue } from '../types';
import { evaluatePreFlightSafety, compileScriptWithRollback } from '../utils/psRollback';

interface SymptomDomainConfig {
  id: string;
  labelKo: string;
  labelEn: string;
  descKo: string;
  descEn: string;
  matchCategories: string[];
  keywords: string[];
  symptoms: Array<{ id: string; ko: string; en: string; queryTerms: string[] }>;
}

const SYMPTOM_DOMAINS: SymptomDomainConfig[] = [
  {
    id: 'update',
    labelKo: 'Windows Update 오류',
    labelEn: 'Windows Update Errors',
    descKo: '업데이트 다운로드 중단, 설치 롤백, 0x8007/0x8024 오류',
    descEn: 'Stuck downloads, rollback loops, 0x8007/0x8024 update failures',
    matchCategories: ['업데이트', 'Update'],
    keywords: ['update', '업데이트', 'wuauserv', '0x8007', '0x8024', 'kb'],
    symptoms: [
      { id: 'upd-stuck', ko: '업데이트 진행률 %에서 멈춤', en: 'Update stuck at %', queryTerms: ['멈춤', 'stuck', 'wuauserv', 'SoftwareDistribution'] },
      { id: 'upd-rollback', ko: '설치 실패 후 변경 내용 취소(롤백)', en: 'Undoing changes / rollback', queryTerms: ['롤백', 'undoing', '0x800f', 'dism'] },
      { id: 'upd-0x8007', ko: '0x80070005 / 0x80070422 접근·서비스 오류', en: '0x80070005 / service blocked', queryTerms: ['0x80070005', '0x80070422', 'bits', '서비스'] },
      { id: 'upd-0x8024', ko: '0x8024402f / 업데이트 서버 연결 실패', en: '0x8024402f server connection failed', queryTerms: ['0x8024402f', '0x8024', '서버'] },
      { id: 'upd-defender', ko: '보안 인텔리전스 정의 업데이트 실패', en: 'Defender signature update failed', queryTerms: ['defender', '보안', '정의'] }
    ]
  },
  {
    id: 'network',
    labelKo: '네트워크 · Wi-Fi · DNS',
    labelEn: 'Network · Wi-Fi · DNS',
    descKo: '인터넷 연결 끊김, 어댑터 인식 불가, DNS/VPN 장애',
    descEn: 'No internet access, Wi-Fi drops, DNS & Winsock failures',
    matchCategories: ['네트워크', 'Network'],
    keywords: ['네트워크', 'network', 'wifi', 'dns', 'ip', 'winsock', 'vpn'],
    symptoms: [
      { id: 'net-no-internet', ko: '연결됨 표시되지만 인터넷 안 됨', en: 'Connected, no internet access', queryTerms: ['인터넷', 'dns', 'winsock', 'netsh'] },
      { id: 'net-wifi-drop', ko: 'Wi-Fi 어댑터 사라짐 / 간헐적 끊김', en: 'Wi-Fi adapter missing / drops', queryTerms: ['wifi', '무선', '어댑터', 'wlan'] },
      { id: 'net-dns', ko: '특정 사이트 접속 불가 / DNS 응답 없음', en: 'DNS probe finished / unreachable', queryTerms: ['dns', 'flushdns', '0x80072'] },
      { id: 'net-smb', ko: '사내 공유 폴더(SMB) / VPN 연결 실패', en: 'SMB shared folder / VPN error', queryTerms: ['smb', '공유', 'vpn', '0x80070035'] }
    ]
  },
  {
    id: 'boot-bsod',
    labelKo: '부팅 · 블루스크린(BSOD)',
    labelEn: 'Boot · Blue Screen (BSOD)',
    descKo: '무한 재부팅, 자동 복구 루프, INACCESSIBLE_BOOT_DEVICE 등',
    descEn: 'Boot loops, automatic repair failure, stop codes',
    matchCategories: ['시스템/블루스크린', '시스템', 'Boot', 'BSOD'],
    keywords: ['bsod', '블루스크린', '부팅', 'boot', 'bcd', 'kernel', 'critical', 'memory'],
    symptoms: [
      { id: 'bsod-reboot', ko: '갑작스런 블루스크린 후 재부팅 반복', en: 'Sudden BSOD & reboot loop', queryTerms: ['블루스크린', 'bsod', 'critical_process_died', 'kernel'] },
      { id: 'bsod-boot', ko: '자동 복구 준비 중 / 부팅 실패', en: 'Automatic repair / boot failure', queryTerms: ['부팅', 'boot', 'inaccessible_boot_device', 'bcd'] },
      { id: 'bsod-sfc', ko: '시스템 파일 손상 · explorer.exe 먹통', en: 'Corrupt system files / shell freeze', queryTerms: ['sfc', 'dism', 'explorer', '시스템 파일'] },
      { id: 'bsod-whea', ko: 'WHEA / MEMORY_MANAGEMENT 중지 코드', en: 'WHEA / MEMORY_MANAGEMENT stop code', queryTerms: ['whea', 'memory_management', 'ntoskrnl'] }
    ]
  },
  {
    id: 'performance',
    labelKo: '성능 · 디스크 · 메모리',
    labelEn: 'Performance · Disk · Memory',
    descKo: '디스크 100% 점유, CPU/메모리 누수, 저장소 공간 부족',
    descEn: '100% disk usage, high CPU/RAM spikes, storage corruption',
    matchCategories: ['성능/최적화', '성능/프리징', '파일 시스템/저장소', '디스크', '시스템/블루스크린', 'Performance'],
    keywords: ['디스크', 'disk', 'cpu', '메모리', 'memory', '느려짐', '100%', 'chkdsk', 'ntfs'],
    symptoms: [
      { id: 'perf-disk100', ko: '작업 관리자 디스크 사용량 100% 고정', en: '100% Disk usage in Task Manager', queryTerms: ['디스크', 'disk', 'sysmain', 'storahci'] },
      { id: 'perf-ram', ko: 'RAM 메모리 누수 · 프리징 현상', en: 'RAM memory leak / freezing', queryTerms: ['메모리', 'memory', '누수', '캐시'] },
      { id: 'perf-chkdsk', ko: '드라이브 오류 검사 필요 · 파일 손상', en: 'Drive corruption / RAW partition', queryTerms: ['chkdsk', 'ntfs', '파일 시스템', '볼륨'] },
      { id: 'perf-sleep', ko: '절전 모드 해제 후 먹통 / 배터리 광탈', en: 'Modern standby / wake freeze', queryTerms: ['절전', 'sleep', '전원', 'powercfg'] }
    ]
  },
  {
    id: 'hardware',
    labelKo: '장치 · 드라이버 · 오디오/화면',
    labelEn: 'Devices · Drivers · Audio/Display',
    descKo: '소리 안 남, GPU 드라이버 충돌(Code 43), USB 인식 실패',
    descEn: 'No sound, GPU Code 43 crashes, USB enumeration failures',
    matchCategories: ['오디오/사운드', '디스플레이/그래픽', '하드웨어/드라이버', 'Audio', 'Display'],
    keywords: ['오디오', 'audio', '소리', '그래픽', 'gpu', '디스플레이', 'usb', '드라이버', 'driver', 'code 43'],
    symptoms: [
      { id: 'hw-no-sound', ko: '출력 장치를 찾을 수 없음 / 소리 안 남', en: 'No audio output device / no sound', queryTerms: ['오디오', '소리', 'audiosrv', '사운드'] },
      { id: 'hw-gpu', ko: '화면 깜박임 · 그래픽 드라이버 응답 중지', en: 'Display flicker / GPU driver reset', queryTerms: ['그래픽', '디스플레이', 'nvlddmkm', 'dxgkrnl', 'code 43'] },
      { id: 'hw-usb', ko: 'USB 장치 인식 실패(설명자 요청 실패)', en: 'USB device descriptor failed', queryTerms: ['usb', '장치 관리자', '드라이버', 'pnp'] },
      { id: 'hw-bt', ko: '블루투스 장치 연결 끊김 / 사라짐', en: 'Bluetooth missing or pairing failed', queryTerms: ['bluetooth', '블루투스', 'bthserv'] }
    ]
  },
  {
    id: 'store-app',
    labelKo: 'Microsoft Store · 앱 · 정품인증',
    labelEn: 'Microsoft Store · Apps · Activation',
    descKo: '스토어 앱 실행 불가, AppX 오류, 정품 인증(0xC004) 장애',
    descEn: 'Store crash, AppX package failures, 0xC004 activation errors',
    matchCategories: ['스토어/앱', '정품인증', '보안/백신', 'Store'],
    keywords: ['스토어', 'store', 'appx', 'wsreset', '정품', '0xc004', '0x80073', 'defender'],
    symptoms: [
      { id: 'app-store', ko: 'Microsoft Store 열리지 않음 / 다운로드 대기', en: 'Store won’t open / pending download', queryTerms: ['store', '스토어', 'wsreset', 'appx'] },
      { id: 'app-0x80073', ko: '앱 설치 오류 (0x80073CF3 / 0x80073D02)', en: 'App install error 0x80073CF3/3D02', queryTerms: ['0x80073', 'appx', '패키지'] },
      { id: 'app-act', ko: 'Windows 정품 인증 오류 (0xC004F074 등)', en: 'Windows Activation 0xC004 error', queryTerms: ['정품', '0xc004', 'slmgr', 'sppsvc'] },
      { id: 'app-sec', ko: 'Windows 보안(Defender) 창이 비어 있음', en: 'Windows Security blank screen', queryTerms: ['보안', 'defender', 'securityhealth'] }
    ]
  }
];

const TRIGGER_CONTEXTS = [
  { id: 'after-update', ko: '최근 Windows 업데이트 직후 발생', en: 'Started right after a Windows Update' },
  { id: 'after-driver', ko: '새 드라이버 · 소프트웨어 설치 후 발생', en: 'Started after installing a driver or app' },
  { id: 'after-crash', ko: '강제 종료 · 정전 · 충돌 이후 발생', en: 'Started after unexpected shutdown / crash' },
  { id: 'ongoing', ko: '특정 계기 없이 간헐적 · 지속적으로 발생', en: 'Intermittent or ongoing without recent changes' }
];

interface SymptomDiagnosticWizardProps {
  language: 'ko' | 'en';
  version: string;
  onChangeVersion: (v: string) => void;
  windowsVersions: string[];
  issuesPool: KnownIssue[];
  onSelectIssueSolution: (issue: KnownIssue, includeRollback: boolean) => void;
  onRunAiDiagnosis: (structuredPrompt: string, includeRollback: boolean) => void;
  onSendToSandbox: (script: string) => void;
  isLoadingAi: boolean;
}

export const SymptomDiagnosticWizard: React.FC<SymptomDiagnosticWizardProps> = ({
  language,
  version,
  onChangeVersion,
  windowsVersions,
  issuesPool,
  onSelectIssueSolution,
  onRunAiDiagnosis,
  onSendToSandbox,
  isLoadingAi
}) => {
  const isEn = language === 'en';
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<string[]>([]);
  const [triggerContext, setTriggerContext] = useState<string>('after-update');
  const [extraNote, setExtraNote] = useState<string>('');
  const [hasAdminRights, setHasAdminRights] = useState<boolean>(true);
  const [includeRollback, setIncludeRollback] = useState<boolean>(true);

  const selectedDomain = useMemo(
    () => SYMPTOM_DOMAINS.find((d) => d.id === selectedDomainId) || null,
    [selectedDomainId]
  );

  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const domain of SYMPTOM_DOMAINS) {
      counts[domain.id] = issuesPool.filter((issue) => {
        const cat = (issue.category || '').toLowerCase();
        const blob = `${issue.title} ${issue.title_en || ''} ${issue.symptoms} ${issue.code}`.toLowerCase();
        return (
          domain.matchCategories.some((mc) => cat.includes(mc.toLowerCase())) ||
          domain.keywords.some((kw) => blob.includes(kw.toLowerCase()))
        );
      }).length;
    }
    return counts;
  }, [issuesPool]);

  const rankedMatches = useMemo(() => {
    if (!selectedDomain) return [];
    const activeSymptoms = selectedDomain.symptoms.filter((s) => selectedSymptomIds.includes(s.id));
    const searchTerms = new Set<string>([
      ...selectedDomain.keywords.map((k) => k.toLowerCase()),
      ...activeSymptoms.flatMap((s) => s.queryTerms.map((t) => t.toLowerCase()))
    ]);
    const extraTokens = extraNote
      .toLowerCase()
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);

    const scored = issuesPool
      .map((issue) => {
        let score = 0;
        const cat = (issue.category || '').toLowerCase();
        const textBlob = `${issue.code || ''} ${issue.title || ''} ${issue.title_en || ''} ${issue.symptoms || ''} ${issue.symptoms_en || ''} ${(issue.searchKeywords || []).join(' ')}`.toLowerCase();

        if (selectedDomain.matchCategories.some((mc) => cat.includes(mc.toLowerCase()))) {
          score += 35;
        }
        for (const sym of activeSymptoms) {
          for (const term of sym.queryTerms) {
            if (textBlob.includes(term.toLowerCase())) score += 24;
          }
        }
        for (const term of searchTerms) {
          if (textBlob.includes(term)) score += 6;
        }
        for (const tok of extraTokens) {
          if (textBlob.includes(tok)) score += 18;
        }
        if (Array.isArray(issue.windowsVersions) && issue.windowsVersions.some((wv) => version.toLowerCase().includes(wv.toLowerCase()))) {
          score += 10;
        }
        if (issue.script && issue.script.trim().length > 10) {
          score += 5;
        }
        return { issue, score };
      })
      .filter((entry) => entry.score >= 30)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 4);
  }, [selectedDomain, selectedSymptomIds, extraNote, issuesPool, version]);

  const renderDomainIcon = (domainId: string) => {
    switch (domainId) {
      case 'update':
        return <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'network':
        return <Wifi className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
      case 'boot-bsod':
        return <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      case 'performance':
        return <HardDrive className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'hardware':
        return <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Monitor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  const handleToggleSymptom = (id: string) => {
    setSelectedSymptomIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const buildStructuredAiPrompt = () => {
    const domainLabel = selectedDomain ? (isEn ? selectedDomain.labelEn : selectedDomain.labelKo) : 'General Windows';
    const symptomLabels = selectedDomain
      ? selectedDomain.symptoms
          .filter((s) => selectedSymptomIds.includes(s.id))
          .map((s) => (isEn ? s.en : s.ko))
      : [];
    const triggerLabel = TRIGGER_CONTEXTS.find((t) => t.id === triggerContext);

    return [
      `[Guided Symptom Diagnosis]`,
      `OS: ${version}`,
      `Category: ${domainLabel}`,
      `Observed Symptoms: ${symptomLabels.length > 0 ? symptomLabels.join(', ') : 'General symptom in category'}`,
      `Trigger Context: ${triggerLabel ? (isEn ? triggerLabel.en : triggerLabel.ko) : triggerContext}`,
      `Admin Privileges Available: ${hasAdminRights ? 'Yes' : 'No (prefer non-destructive user-scope or clear elevation guidance)'}`,
      extraNote.trim() ? `Additional Error Code / Details: ${extraNote.trim()}` : ''
    ]
      .filter(Boolean)
      .join(' | ');
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedDomainId(null);
    setSelectedSymptomIds([]);
    setExtraNote('');
  };

  return (
    <section
      aria-label={isEn ? 'Symptom-Driven Guided Diagnostic Wizard' : '증상 선택형 단계별 진단 마법사'}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 mb-6"
    >
      {/* Header & 4-Step Progress Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
              {isEn ? 'Guided Symptom Diagnostic Wizard' : '증상 선택형 단계별 진단 마법사'}
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {step}/4
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEn
              ? 'Don’t know the error code? Narrow down symptoms in 4 steps to get verified fixes with automatic Rollback protection.'
              : '오류 코드를 몰라도 증상 영역부터 4단계로 좁혀 안전 검증·롤백 포인트가 포함된 복구 처방을 바로 받으세요.'}
          </p>
        </div>

        {/* Stepper Pills (Flat clickable steps) */}
        <div className="flex items-center gap-1.5 text-xs">
          {[1, 2, 3, 4].map((num) => {
            const stepNum = num as 1 | 2 | 3 | 4;
            const isCurrent = step === stepNum;
            const isDone = step > stepNum;
            const canJump = stepNum === 1 || (selectedDomain !== null && stepNum <= step);
            return (
              <button
                key={num}
                type="button"
                disabled={!canJump}
                onClick={() => canJump && setStep(stepNum)}
                className={`px-2.5 py-1.5 rounded-lg font-medium font-mono tabular-nums border transition-colors duration-150 ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isDone
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                }`}
              >
                {num}
              </button>
            );
          })}
          {step > 1 && (
            <button
              type="button"
              onClick={resetWizard}
              className="ml-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {isEn ? 'Reset' : '처음으로'}
            </button>
          )}
        </div>
      </div>

      {/* Unboxed Breadcrumb Summary */}
      {selectedDomain && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {isEn ? selectedDomain.labelEn : selectedDomain.labelKo}
          </span>
          <span>·</span>
          <span>{version}</span>
          {selectedSymptomIds.length > 0 && (
            <>
              <span>·</span>
              <span className="font-mono tabular-nums">
                {isEn ? `${selectedSymptomIds.length} symptom(s)` : `세부 증상 ${selectedSymptomIds.length}개`}
              </span>
            </>
          )}
          <span>·</span>
          <span className={includeRollback ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
            {includeRollback
              ? (isEn ? 'Auto-Rollback ON' : '자동 롤백 포함 ON')
              : (isEn ? 'Raw Script Only' : '원본 스크립트만')}
          </span>
        </div>
      )}

      {/* STEP 1: Domain Selection */}
      {step === 1 && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SYMPTOM_DOMAINS.map((domain) => {
            const isSelected = selectedDomainId === domain.id;
            const matchCount = domainCounts[domain.id] || 0;
            return (
              <button
                key={domain.id}
                type="button"
                onClick={() => {
                  setSelectedDomainId(domain.id);
                  setSelectedSymptomIds([]);
                  setStep(2);
                }}
                className={`text-left p-4 rounded-xl border transition-colors duration-150 cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    {renderDomainIcon(domain.id)}
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {matchCount}{isEn ? ' guides' : '건 보유'}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {isEn ? domain.labelEn : domain.labelKo}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {isEn ? domain.descEn : domain.descKo}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* STEP 2: Specific Symptoms & Trigger Context */}
      {step === 2 && selectedDomain && (
        <div className="mt-5 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {isEn ? 'Select matching symptoms (multiple allowed)' : '가장 가까운 세부 증상을 모두 선택하세요 (복수 선택 가능)'}
              </label>
              <span className="text-xs font-mono tabular-nums text-blue-600 dark:text-blue-400">
                {isEn ? `${rankedMatches.length} instant matches` : `실시간 후보 ${rankedMatches.length}건`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {selectedDomain.symptoms.map((sym) => {
                const active = selectedSymptomIds.includes(sym.id);
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => handleToggleSymptom(sym.id)}
                    className={`p-3 rounded-xl border text-left text-xs font-medium flex items-center justify-between gap-2 transition-colors duration-150 cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    <span>{isEn ? sym.en : sym.ko}</span>
                    {active && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                {isEn ? 'When did the issue begin?' : '문제가 주로 언제 시작되었나요?'}
              </label>
              <div className="space-y-2">
                {TRIGGER_CONTEXTS.map((ctx) => (
                  <label
                    key={ctx.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      triggerContext === ctx.id
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-slate-900 dark:text-slate-100 font-medium'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="winfix-trigger-ctx"
                      checked={triggerContext === ctx.id}
                      onChange={() => setTriggerContext(ctx.id)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>{isEn ? ctx.en : ctx.ko}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                {isEn ? 'Optional Error Code or Extra Context' : '화면에 보인 오류 코드나 추가 설명 (선택)'}
              </label>
              <textarea
                rows={4}
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                placeholder={
                  isEn
                    ? 'e.g., 0x80070005, failed after KB5044284, occurs only on Wi-Fi...'
                    : '예: 0x80070005, KB 누적 업데이트 이후 발생, 재부팅해도 동일...'
                }
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isEn ? 'Back' : '이전 단계'}</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>{isEn ? 'Next: Environment & Safety' : '다음: PC 환경·안전 확인'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Environment, Admin Rights & Rollback Configuration */}
      {step === 3 && selectedDomain && (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                {isEn ? 'Target Windows Version' : '대상 Windows 버전'}
              </label>
              <select
                value={version}
                onChange={(e) => onChangeVersion(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2.5 text-xs font-medium text-slate-900 dark:text-slate-100"
              >
                {windowsVersions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>

              <label className="flex items-center justify-between gap-3 pt-2 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {isEn ? 'Administrator Privileges Available' : '관리자 권한 PowerShell 실행 가능'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isEn
                      ? 'Required for DISM, SFC, Winsock reset, and Restore Points.'
                      : '서비스 재시작·DISM·복원 지점 생성 시 관리자 권한이 필요합니다.'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={hasAdminRights}
                  onChange={(e) => setHasAdminRights(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    {isEn ? 'Auto-Inject Safety Rollback Wrapper' : '자동 롤백 포인트 & 레지스트리 백업 포함'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeRollback}
                  onChange={(e) => setIncludeRollback(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-emerald-800/85 dark:text-emerald-300/85 leading-relaxed">
                {isEn
                  ? 'Prepends non-fatal Checkpoint-Computer Restore Point creation and automatic reg.exe backup + Restore_Registry.cmd for any modified registry paths.'
                  : '복구 스크립트 최상단에 안전한 try/catch 기반 시스템 복원 지점 생성(Checkpoint-Computer)과 수정 대상 레지스트리 경로 자동 백업(Restore_Registry.cmd)을 결합합니다.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isEn ? 'Back' : '이전 단계'}</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>{isEn ? 'View Verified Solutions' : '안전 검증 맞춤 처방 보기'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Verified Prescriptions + AI Escalation */}
      {step === 4 && selectedDomain && (
        <div className="mt-5 space-y-4">
          {rankedMatches.length === 0 ? (
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 text-center space-y-3">
              <AlertCircle className="w-7 h-7 text-amber-500 mx-auto" />
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isEn ? 'No exact pre-verified guide matched locally' : '선택 조건과 정확히 일치하는 내장 처방을 찾지 못했습니다'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                {isEn
                  ? 'Run real-time Gemini Search Grounded diagnosis using your 4-step context to synthesize a custom safe PowerShell script.'
                  : '수집된 4단계 증상 컨텍스트를 바탕으로 서버 AI 정밀 진단을 실행해 맞춤 처방과 롤백 스크립트를 생성할 수 있습니다.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {isEn
                    ? `Top ${rankedMatches.length} verified solutions matching your symptoms`
                    : `선택한 증상과 가장 일치하는 검증 완료 처방 Top ${rankedMatches.length}`}
                </span>
                <span className="font-mono tabular-nums">
                  {includeRollback ? 'Rollback Guard: READY' : 'Rollback Guard: OFF'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rankedMatches.map(({ issue, score }) => {
                  const safety = evaluatePreFlightSafety(issue.script || '');
                  const compiledPreview = includeRollback && issue.script
                    ? compileScriptWithRollback(issue.script, { issueCode: issue.code })
                    : (issue.script || '');
                  const brokenCount = Array.isArray(issue.brokenLinks) ? issue.brokenLinks.length : 0;

                  return (
                    <div
                      key={issue.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {issue.code}
                          </span>
                          <div className="flex items-center gap-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            <span>{isEn ? `Match ${Math.min(99, score)}%` : `일치 ${Math.min(99, score)}%`}</span>
                            <span>·</span>
                            <span
                              className={
                                safety.isBlocked
                                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                  : 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              }
                            >
                              {safety.safetyRating}
                            </span>
                          </div>
                        </div>

                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                          {isEn && issue.title_en ? issue.title_en : issue.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {isEn && issue.symptoms_en ? issue.symptoms_en : issue.symptoms}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {issue.script && issue.script.trim() ? (
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                              Lint {safety.lintQualityScore}pt
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                              <Wrench className="w-3.5 h-3.5 text-slate-400" />
                              {isEn ? 'Manual Guide' : '수동 절차 가이드'}
                            </span>
                          )}
                          {safety.detectedRegistryTargets.length > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-indigo-600 dark:text-indigo-400">
                                Reg Backup {safety.detectedRegistryTargets.length}
                              </span>
                            </>
                          )}
                          {brokenCount > 0 ? (
                            <>
                              <span>·</span>
                              <span className="text-amber-600 dark:text-amber-400">
                                {isEn ? `${brokenCount} link(s) pending repair` : `링크 ${brokenCount}건 교정 대기`}
                              </span>
                            </>
                          ) : Array.isArray(issue.sourceUrls) && issue.sourceUrls.length > 0 ? (
                            <>
                              <span>·</span>
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {isEn ? 'Official Link Verified' : '공식 링크 검증됨'}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => onSelectIssueSolution(issue, includeRollback)}
                          className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Load Solution' : '이 처방 적용하기'}</span>
                        </button>
                        {compiledPreview && (
                          <button
                            type="button"
                            onClick={() => onSendToSandbox(compiledPreview)}
                            className="py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title={isEn ? 'Simulate in Sandbox' : '샌드박스 모의 실행'}
                          >
                            <Terminal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                            <span>{isEn ? 'Sandbox' : '샌드박스'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Bar: Back + AI Deep Diagnosis Escalation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isEn ? 'Adjust Environment' : '환경 설정 수정'}</span>
            </button>

            <button
              type="button"
              disabled={isLoadingAi}
              onClick={() => onRunAiDiagnosis(buildStructuredAiPrompt(), includeRollback)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isLoadingAi ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isEn ? 'Running AI Grounded Diagnosis...' : 'AI 정밀 복합 진단 중...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {isEn
                      ? 'Run Deep AI Diagnosis with 4-Step Context'
                      : '수집된 4단계 증상으로 AI 정밀 복합 진단 실행'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
