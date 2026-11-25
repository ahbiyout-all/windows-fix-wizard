import { PreFlightSafetyReport } from '../types';
import { verifyPowerShellScript } from './psVerifier';
import { analyzePowerShellScript } from './psLinter';

export const ROLLBACK_MARKER_START = '# [WINFIX_ROLLBACK_PREAMBLE_START]';
export const ROLLBACK_MARKER_END = '# [WINFIX_ROLLBACK_PREAMBLE_END]';

const SIGNATURE_BLOCK_REGEX = /#\s*SIG\s*#\s*Begin\s*Signature\s*Block[\s\S]*?#\s*SIG\s*#\s*End\s*Signature\s*Block/i;

/**
 * Normalizes a PowerShell registry path (e.g. HKLM:\SOFTWARE\...) to reg.exe format (HKLM\SOFTWARE\...).
 */
function normalizeRegistryPathForRegExe(rawPath: string): string | null {
  if (!rawPath) return null;
  let cleaned = rawPath
    .trim()
    .replace(/^["'`]+|["'`,;)}\]]+$/g, '')
    .replace(/^(Registry::)?HKEY_LOCAL_MACHINE\\?/i, 'HKLM\\')
    .replace(/^(Registry::)?HKEY_CURRENT_USER\\?/i, 'HKCU\\')
    .replace(/^(Registry::)?HKEY_CLASSES_ROOT\\?/i, 'HKCR\\')
    .replace(/^(Registry::)?HKEY_USERS\\?/i, 'HKU\\')
    .replace(/^HKLM:\\+/i, 'HKLM\\')
    .replace(/^HKCU:\\+/i, 'HKCU\\')
    .replace(/^HKCR:\\+/i, 'HKCR\\')
    .replace(/^HKU:\\+/i, 'HKU\\')
    .replace(/\\+$/, '');

  // Ignore root-only hives so reg export doesn't try to dump an entire 200MB HKLM hive
  const segments = cleaned.split('\\').filter(Boolean);
  if (segments.length < 2) return null;
  if (!/^(HKLM|HKCU|HKCR|HKU)$/i.test(segments[0])) return null;
  return segments.join('\\');
}

/**
 * Extracts unique Windows registry key paths referenced inside a PowerShell script.
 */
export function detectRegistryTargets(scriptText: string | null | undefined): string[] {
  if (!scriptText) return [];
  const bodyOnly = stripRollbackPreamble(scriptText).replace(SIGNATURE_BLOCK_REGEX, '');
  const regex = /(?:HKLM:|HKCU:|HKCR:|HKU:|HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER|HKEY_CLASSES_ROOT|HKEY_USERS)\\[A-Za-z0-9_\\.\-\s{}()]+/gi;
  const matches = bodyOnly.match(regex) || [];
  const unique = new Set<string>();
  for (const m of matches) {
    const normalized = normalizeRegistryTargetsSafe(m);
    if (normalized) {
      unique.add(normalized);
      if (unique.size >= 5) break;
    }
  }
  return Array.from(unique);
}

function normalizeRegistryTargetsSafe(raw: string): string | null {
  // Trim trailing PowerShell switches or variable fragments if captured
  const cutAtSwitch = raw.split(/\s+-[A-Za-z]/)[0];
  return normalizeRegistryPathForRegExe(cutAtSwitch);
}

/**
 * Removes the WinFix safety rollback preamble if already present.
 */
export function stripRollbackPreamble(scriptText: string | null | undefined): string {
  if (!scriptText) return '';
  const startIdx = scriptText.indexOf(ROLLBACK_MARKER_START);
  const endIdx = scriptText.indexOf(ROLLBACK_MARKER_END);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = scriptText.slice(0, startIdx).trimEnd();
    const after = scriptText.slice(endIdx + ROLLBACK_MARKER_END.length).trimStart();
    return [before, after].filter(Boolean).join('\n\n');
  }
  return scriptText;
}

/**
 * Wraps a PowerShell script with an idempotent, best-effort safety & rollback preamble:
 * 1) Checks Administrator role safely.
 * 2) Attempts System Restore Point creation (`Checkpoint-Computer`) inside a non-fatal try/catch.
 * 3) Exports any detected Registry targets via `reg.exe export` to Desktop before modifications.
 */
export function compileScriptWithRollback(
  scriptText: string | null | undefined,
  optionsOrCode:
    | string
    | {
        issueCode?: string;
        includeRestorePoint?: boolean;
        includeRegistryBackup?: boolean;
      } = {}
): string {
  const raw = (scriptText || '').trim();
  if (!raw) return '';

  const options = typeof optionsOrCode === 'string' ? { issueCode: optionsOrCode } : (optionsOrCode || {});
  const includeRestorePoint = options.includeRestorePoint !== false;
  const includeRegistryBackup = options.includeRegistryBackup !== false;
  const cleanBody = stripRollbackPreamble(raw).replace(SIGNATURE_BLOCK_REGEX, '').trim();
  const sigMatch = raw.match(SIGNATURE_BLOCK_REGEX);

  const safeCodeLabel = (options.issueCode || 'WinFix')
    .replace(/[^A-Za-z0-9_.-]/g, '_')
    .slice(0, 32) || 'WinFix';

  const registryTargets = includeRegistryBackup ? detectRegistryTargets(cleanBody) : [];

  const preambleLines: string[] = [
    ROLLBACK_MARKER_START,
    '# Auto-generated Pre-Execution Safety & Rollback Point Guard (Windows Fix Wizard)',
    '$ErrorActionPreference = "Continue"',
    '$winFixIsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)',
    'if (-not $winFixIsAdmin) {',
    '    Write-Warning "[WinFix Safety] Administrator privileges are recommended for full recovery & Restore Point creation."',
    '}',
  ];

  if (includeRestorePoint) {
    preambleLines.push(
      'try {',
      '    $rpSvc = Get-Service -Name "VSS" -ErrorAction SilentlyContinue',
      '    if ($winFixIsAdmin -and $null -ne $rpSvc) {',
      `        $rpDesc = 'WinFix_${safeCodeLabel.replace(/'/g, "''")}_' + (Get-Date -Format 'yyyyMMdd_HHmm')`,
      '        Checkpoint-Computer -Description $rpDesc -RestorePointType "MODIFY_SETTINGS" -ErrorAction Stop',
      '        Write-Host "[WinFix Rollback] System Restore Point created: $rpDesc" -ForegroundColor Green',
      '    } else {',
      '        Write-Host "[WinFix Rollback] Skipping Checkpoint-Computer (non-admin or Restore service unavailable)." -ForegroundColor Yellow',
      '    }',
      '} catch {',
      '    Write-Warning "[WinFix Rollback] Restore Point skipped (e.g. 24h limit, Server SKU, or System Protection disabled): $($_.Exception.Message)"',
      '}'
    );
  }

  if (registryTargets.length > 0) {
    preambleLines.push(
      '$winFixBackupDir = Join-Path ([Environment]::GetFolderPath("Desktop")) ("WinFix_Backup_" + (Get-Date -Format "yyyyMMdd_HHmmss"))',
      'New-Item -Path $winFixBackupDir -ItemType Directory -Force | Out-Null',
      '$winFixRestoreCmd = @()'
    );
    registryTargets.forEach((regKey, idx) => {
      const sanitizedKey = regKey.replace(/["`$]/g, '').replace(/'/g, "''");
      preambleLines.push(
        `try {`,
        `    $regKey_${idx} = '${sanitizedKey}'`,
        `    $regOut_${idx} = Join-Path $winFixBackupDir "reg_backup_${idx + 1}.reg"`,
        `    $null = & reg.exe export $regKey_${idx} $regOut_${idx} /y 2>$null`,
        `    if ($LASTEXITCODE -eq 0 -and (Test-Path $regOut_${idx})) {`,
        `        Write-Host "[WinFix Rollback] Registry backed up: $regKey_${idx}" -ForegroundColor Cyan`,
        `        $winFixRestoreCmd += "reg.exe import \`"$regOut_${idx}\`""`,
        `    }`,
        `} catch {}`
      );
    });
    preambleLines.push(
      'if ($winFixRestoreCmd.Count -gt 0) {',
      '    $winFixRestoreCmd | Out-File -FilePath (Join-Path $winFixBackupDir "Restore_Registry.cmd") -Encoding ascii -Force',
      '    Write-Host "[WinFix Rollback] Undo script ready at: $winFixBackupDir\\Restore_Registry.cmd" -ForegroundColor Green',
      '} else {',
      '    Remove-Item -Path $winFixBackupDir -Force -ErrorAction SilentlyContinue',
      '}'
    );
  }

  preambleLines.push(ROLLBACK_MARKER_END);

  const combined = `${preambleLines.join('\n')}\n\n${cleanBody}`;
  return sigMatch ? `${combined}\n\n${sigMatch[0]}` : combined;
}

/**
 * Runs combined AST Security + PSScriptAnalyzer pre-flight verification before execution/copy.
 */
export function evaluatePreFlightSafety(scriptText: string | null | undefined): PreFlightSafetyReport {
  const raw = (scriptText || '').trim();
  const hasRollbackPreamble = raw.includes(ROLLBACK_MARKER_START) && raw.includes(ROLLBACK_MARKER_END);
  const bodyForAudit = stripRollbackPreamble(raw);

  const verifierReport = verifyPowerShellScript(bodyForAudit);
  const lintReport = analyzePowerShellScript(bodyForAudit);
  const detectedRegistryTargets = detectRegistryTargets(bodyForAudit);

  const blockReasons: string[] = [];
  if (verifierReport.safetyRating === 'HIGH_ALERT') {
    blockReasons.push('고위험 난독화 또는 변조 서명이 탐지되었습니다 (HIGH_ALERT).');
  }
  if (lintReport.errorCount > 0) {
    blockReasons.push(`구문 또는 파괴적 명령 오류 ${lintReport.errorCount}건이 감지되었습니다.`);
  }

  return {
    safetyRating: verifierReport.safetyRating,
    obfuscationScore: verifierReport.obfuscationScore,
    lintQualityScore: lintReport.qualityScore,
    errorCount: lintReport.errorCount,
    warningCount: lintReport.warningCount,
    fixableCount: lintReport.fixableCount,
    detectedRegistryTargets,
    detectedCmdlets: verifierReport.detectedCmdlets,
    hasRollbackPreamble,
    isBlocked: blockReasons.length > 0,
    blockReasons
  };
}
