/**
 * PowerShell Rule-Based Linter and Best-Practices Analyzer
 * Inspired by Microsoft PSScriptAnalyzer rule sets.
 * Provides real-time static analysis, error detection, security warnings,
 * 1-click automated script refactoring, and actionable code recommendations for PowerShell scripts.
 */

export interface PowerShellLintDiagnostic {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleNameKo: string;
  severity: 'error' | 'warning' | 'info';
  line: number;
  column?: number;
  message: string;
  messageKo: string;
  suggestion?: string;
  suggestionKo?: string;
  codeSnippet?: string;
  fixable?: boolean;
}

export interface PowerShellLintReport {
  diagnostics: PowerShellLintDiagnostic[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  fixableCount: number;
  qualityScore: number; // 0 to 100
  passedRulesCount: number;
  totalRulesEvaluated: number;
}

// Approved PowerShell Verbs (subset of standard verbs)
const APPROVED_VERBS = new Set([
  'add', 'approve', 'assert', 'build', 'clear', 'close', 'compare', 'compress',
  'confirm', 'connect', 'copy', 'debug', 'deny', 'disable', 'disconnect',
  'dismount', 'edit', 'enable', 'enter', 'exit', 'expand', 'export', 'find',
  'format', 'get', 'grant', 'group', 'hide', 'import', 'initialize', 'insert',
  'invoke', 'join', 'limit', 'lock', 'mount', 'move', 'new', 'open', 'optimize',
  'out', 'protect', 'publish', 'read', 'receive', 'register', 'remove', 'rename',
  'repair', 'request', 'reset', 'resize', 'resolve', 'restart', 'restore', 'resume',
  'revoke', 'save', 'search', 'select', 'send', 'set', 'show', 'skip', 'split',
  'start', 'step', 'stop', 'submit', 'suspend', 'switch', 'test', 'trace',
  'unshare', 'unlock', 'unprotect', 'unregister', 'update', 'use', 'wait', 'watch', 'write'
]);

// Common Cmdlet Aliases mapping to Full Cmdlets
export const ALIAS_MAP: Record<string, string> = {
  'rm': 'Remove-Item',
  'rmdir': 'Remove-Item',
  'del': 'Remove-Item',
  'rd': 'Remove-Item',
  'cp': 'Copy-Item',
  'copy': 'Copy-Item',
  'ls': 'Get-ChildItem',
  'dir': 'Get-ChildItem',
  'cat': 'Get-Content',
  'type': 'Get-Content',
  'move': 'Move-Item',
  'mv': 'Move-Item',
  'ren': 'Rename-Item',
  'cls': 'Clear-Host',
  'clear': 'Clear-Host',
  'select': 'Select-Object',
  'where': 'Where-Object',
  'foreach': 'ForEach-Object',
  '%': 'ForEach-Object',
  '?': 'Where-Object',
  'curl': 'Invoke-WebRequest',
  'wget': 'Invoke-WebRequest',
  'iwconfig': 'Get-NetIPConfiguration',
  'ps': 'Get-Process',
  'kill': 'Stop-Process',
  'sleep': 'Start-Sleep',
  'history': 'Get-History',
  'h': 'Get-History',
  'r': 'Invoke-History',
  'echo': 'Write-Output'
};

/**
 * Analyzes a PowerShell script against PSScriptAnalyzer best practices rules
 */
export function analyzePowerShellScript(scriptText: string | null | undefined): PowerShellLintReport {
  if (!scriptText || !scriptText.trim()) {
    return {
      diagnostics: [],
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      fixableCount: 0,
      qualityScore: 100,
      passedRulesCount: 17,
      totalRulesEvaluated: 17,
    };
  }

  const diagnostics: PowerShellLintDiagnostic[] = [];
  const lines = scriptText.split('\n');
  let inFunction = false;

  // Syntax check for brackets and quotes balance
  checkSyntaxBalance(scriptText, diagnostics);

  // Line-by-line linting rules
  lines.forEach((lineText, index) => {
    const lineNum = index + 1;
    const trimmed = lineText.trim();

    if (/\bfunction\s+/i.test(trimmed)) {
      inFunction = true;
    }
    if (inFunction && trimmed === '}') {
      inFunction = false;
    }

    if (!trimmed || trimmed.startsWith('#')) return; // Skip empty lines and comments

    // Rule 1: PSAvoidUsingCmdletAliases
    checkAliases(trimmed, lineNum, diagnostics);

    // Rule 2: PSAvoidUsingWMICmdlets
    checkWMICmdlets(trimmed, lineNum, diagnostics);

    // Rule 3: PSUseApprovedVerbs
    checkApprovedVerbs(trimmed, lineNum, diagnostics);

    // Rule 4: PSAvoidUsingInvokeExpression
    checkInvokeExpression(trimmed, lineNum, diagnostics);

    // Rule 5: PSAvoidUsingPlaintextForPassword
    checkPlaintextSecrets(trimmed, lineNum, diagnostics);

    // Rule 6: PSPossibleIncorrectUsageOfAssignmentOperator
    checkAssignmentInIf(trimmed, lineNum, diagnostics);

    // Rule 7: PSAvoidUsingNullComparisonOnRight
    checkNullComparisonOnRight(trimmed, lineNum, diagnostics);

    // Rule 8: PSAvoidUsingEmptyCatchBlock
    checkEmptyCatch(lines, index, diagnostics);

    // Rule 9: PSAvoidGlobalVars
    checkGlobalVars(trimmed, lineNum, diagnostics);

    // Rule 10: PSAvoidUsingDeprecatedSecurityProtocols
    checkDeprecatedTLS(trimmed, lineNum, diagnostics);

    // Rule 11: PSAvoidDestructiveWildcard
    checkDestructiveWildcard(trimmed, lineNum, diagnostics);

    // Rule 12: PSAvoidExecutionPolicyBypass
    checkExecutionPolicyBypass(trimmed, lineNum, diagnostics);

    // Rule 13: PSAvoidHardcodedIPs
    checkHardcodedIPs(trimmed, lineNum, diagnostics);

    // Rule 14: PSAvoidWriteHostInFunctions
    checkWriteHostInFunctions(trimmed, lineNum, inFunction, diagnostics);

    // Rule 15: PSAvoidUsingInternalPing
    checkInternalPing(trimmed, lineNum, diagnostics);

    // Rule 16: PSAvoidUsingRegExeDirectly
    checkRegExeDirectly(trimmed, lineNum, diagnostics);
  });

  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;
  const infoCount = diagnostics.filter(d => d.severity === 'info').length;
  const fixableCount = diagnostics.filter(d => d.fixable).length;

  // Calculate Quality Score (100 - (errors * 22 + warnings * 8 + infos * 3))
  const rawScore = 100 - (errorCount * 22 + warningCount * 8 + infoCount * 3);
  const qualityScore = Math.max(0, Math.min(100, rawScore));

  const totalRulesEvaluated = 17;
  const uniqueRulesTriggered = new Set(diagnostics.map(d => d.ruleId)).size;
  const passedRulesCount = Math.max(0, totalRulesEvaluated - uniqueRulesTriggered);

  return {
    diagnostics,
    errorCount,
    warningCount,
    infoCount,
    fixableCount,
    qualityScore,
    passedRulesCount,
    totalRulesEvaluated
  };
}

/**
 * Auto-fixes a single diagnostic if fixable
 */
export function autoFixDiagnostic(scriptText: string, diagnostic: PowerShellLintDiagnostic): string {
  if (!scriptText || !diagnostic) return scriptText;
  const lines = scriptText.split('\n');
  const targetIndex = diagnostic.line - 1;

  if (targetIndex < 0 || targetIndex >= lines.length) return scriptText;
  let line = lines[targetIndex];

  switch (diagnostic.ruleId) {
    case 'PSAvoidUsingCmdletAliases': {
      const tokens = line.split(/(\s+|\||;)/);
      const updatedTokens = tokens.map(token => {
        const clean = token.toLowerCase();
        if (ALIAS_MAP[clean]) {
          return ALIAS_MAP[clean];
        }
        return token;
      });
      lines[targetIndex] = updatedTokens.join('');
      break;
    }
    case 'PSAvoidUsingWMICmdlets': {
      lines[targetIndex] = line
        .replace(/\bGet-WmiObject\b/gi, 'Get-CimInstance')
        .replace(/\bgwmi\b/gi, 'Get-CimInstance');
      break;
    }
    case 'PSAvoidUsingNullComparisonOnRight': {
      lines[targetIndex] = line.replace(/(\$[a-z0-9_]+)\s+(-eq|-ne)\s+\$null\b/gi, '$null $2 $1');
      break;
    }
    case 'PSAvoidUsingDeprecatedSecurityProtocols': {
      lines[targetIndex] = '# Set TLS 1.2 / TLS 1.3 as standard security protocol\n[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13';
      break;
    }
    case 'PSAvoidUsingInternalPing': {
      lines[targetIndex] = line.replace(/\bping\s+([^\s;|]+)/gi, 'Test-Connection -ComputerName $1 -Count 2');
      break;
    }
    case 'PSPossibleIncorrectUsageOfAssignmentOperator': {
      lines[targetIndex] = line.replace(/(\bif\s*\(\s*\$[a-z0-9_]+)\s*=\s*([^=])/gi, '$1 -eq $2');
      break;
    }
    default:
      return scriptText;
  }

  return lines.join('\n');
}

/**
 * Auto-fixes all fixable diagnostics in one pass
 */
export function autoFixAllFixable(scriptText: string): { fixedScript: string; fixesAppliedCount: number } {
  let currentScript = scriptText;
  let fixesAppliedCount = 0;
  let maxPasses = 5;

  while (maxPasses > 0) {
    const report = analyzePowerShellScript(currentScript);
    const fixableDiag = report.diagnostics.find(d => d.fixable);
    if (!fixableDiag) break;

    const nextScript = autoFixDiagnostic(currentScript, fixableDiag);
    if (nextScript === currentScript) break;

    currentScript = nextScript;
    fixesAppliedCount++;
    maxPasses--;
  }

  return { fixedScript: currentScript, fixesAppliedCount };
}

// -----------------------------------------------------------------------------
// Individual Rule Implementations
// -----------------------------------------------------------------------------

function checkSyntaxBalance(fullScript: string, diagnostics: PowerShellLintDiagnostic[]) {
  let doubleQuotes = 0;
  let singleQuotes = 0;
  let braces = 0;
  let parens = 0;
  let brackets = 0;

  for (let i = 0; i < fullScript.length; i++) {
    const char = fullScript[i];
    const prev = i > 0 ? fullScript[i - 1] : '';

    if (char === '"' && prev !== '`') doubleQuotes++;
    if (char === "'" && prev !== '`') singleQuotes++;
    if (char === '{') braces++;
    if (char === '}') braces--;
    if (char === '(') parens++;
    if (char === ')') parens--;
    if (char === '[') brackets++;
    if (char === ']') brackets--;
  }

  if (doubleQuotes % 2 !== 0) {
    diagnostics.push({
      id: `syntax-quote-double-${Date.now()}`,
      ruleId: 'PSUseConsistentIndentationAndQuotes',
      ruleName: 'Unclosed Double Quote',
      ruleNameKo: '닫히지 않은 큰따옴표 (") 구문 오류',
      severity: 'error',
      line: 1,
      message: 'Detected an unclosed double quote in the script.',
      messageKo: '스크립트 내에 닫히지 않은 큰따옴표(") 구문 오류가 존재합니다.',
      suggestion: 'Ensure every double quote has a matching closing quote.',
      suggestionKo: '모든 큰따옴표(")가 쌍으로 닫혀 있는지 확인하세요.',
      fixable: false
    });
  }

  if (singleQuotes % 2 !== 0) {
    diagnostics.push({
      id: `syntax-quote-single-${Date.now()}`,
      ruleId: 'PSUseConsistentIndentationAndQuotes',
      ruleName: 'Unclosed Single Quote',
      ruleNameKo: '닫히지 않은 작은따옴표 (\') 구문 오류',
      severity: 'error',
      line: 1,
      message: 'Detected an unclosed single quote in the script.',
      messageKo: '스크립트 내에 닫히지 않은 작은따옴표(\') 구문 오류가 존재합니다.',
      suggestion: 'Ensure every single quote has a matching closing quote.',
      suggestionKo: '모든 작은따옴표(\')가 쌍으로 닫혀 있는지 확인하세요.',
      fixable: false
    });
  }

  if (braces !== 0) {
    diagnostics.push({
      id: `syntax-brace-${Date.now()}`,
      ruleId: 'PSUseConsistentIndentationAndQuotes',
      ruleName: 'Unmatched Curly Braces {}',
      ruleNameKo: '중괄호 {} 개수 불일치 오류',
      severity: 'error',
      line: 1,
      message: `Detected unmatched curly braces {}. Net balance: ${braces}`,
      messageKo: `중괄호 {} 개수가 일치하지 않습니다. (열림/닫힘 미스매치: ${braces})`,
      suggestion: 'Check if all script blocks, functions, or if statements close their braces {}.',
      suggestionKo: '모든 함수, if문, 스크립트 블록의 중괄호 {} 가 올바르게 열리고 닫혔는지 확인하세요.',
      fixable: false
    });
  }

  if (parens !== 0) {
    diagnostics.push({
      id: `syntax-paren-${Date.now()}`,
      ruleId: 'PSUseConsistentIndentationAndQuotes',
      ruleName: 'Unmatched Parentheses ()',
      ruleNameKo: '소괄호 () 개수 불일치 오류',
      severity: 'error',
      line: 1,
      message: `Detected unmatched parentheses (). Net balance: ${parens}`,
      messageKo: `소괄호 () 개수가 일치하지 않습니다. (미스매치: ${parens})`,
      suggestion: 'Ensure every opening parenthesis ( has a corresponding closing parenthesis ).',
      suggestionKo: '모든 조건문 및 함수 호출의 소괄호 () 가 닫혔는지 확인하세요.',
      fixable: false
    });
  }
}

function checkAliases(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  const tokens = lineText.split(/\s+|\||;/);
  for (const rawToken of tokens) {
    const cleanToken = rawToken.replace(/^[-({\[]+/, '').replace(/[})\];,]+$/, '').toLowerCase();
    if (ALIAS_MAP[cleanToken]) {
      const canonical = ALIAS_MAP[cleanToken];
      diagnostics.push({
        id: `alias-${lineNum}-${cleanToken}`,
        ruleId: 'PSAvoidUsingCmdletAliases',
        ruleName: 'Avoid Cmdlet Aliases',
        ruleNameKo: '축약 별칭(Alias) 대신 공식 Cmdlet 사용 권장',
        severity: 'info',
        line: lineNum,
        message: `'${cleanToken}' is a PowerShell alias. Use full cmdlet '${canonical}' for production scripts.`,
        messageKo: `'${cleanToken}'은(는) 축약 별칭입니다. 스크립트의 이식성과 명확성을 위해 공식 Cmdlet '${canonical}'을(를) 사용하세요.`,
        suggestion: `Replace '${cleanToken}' with '${canonical}'`,
        suggestionKo: `'${cleanToken}' 대신 '${canonical}'로 변경하세요.`,
        codeSnippet: lineText,
        fixable: true
      });
      break;
    }
  }
}

function checkWMICmdlets(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  if (/\b(get-wmiobject|gwmi|wmic)\b/i.test(lineText)) {
    diagnostics.push({
      id: `wmi-${lineNum}`,
      ruleId: 'PSAvoidUsingWMICmdlets',
      ruleName: 'Avoid Deprecated WMI Cmdlets',
      ruleNameKo: '구형 WMI Cmdlet(Get-WmiObject) 사용 지양',
      severity: 'warning',
      line: lineNum,
      message: 'Get-WmiObject & WMIC are deprecated since PowerShell 3.0+. Use Get-CimInstance instead.',
      messageKo: 'Get-WmiObject 및 wmic는 구형 방식으로 권장되지 않습니다. 더 빠르고 안전한 Get-CimInstance를 사용하세요.',
      suggestion: 'Replace Get-WmiObject with Get-CimInstance',
      suggestionKo: 'Get-WmiObject 대신 Get-CimInstance를 사용하세요.',
      codeSnippet: lineText,
      fixable: true
    });
  }
}

function checkApprovedVerbs(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  const fnMatch = lineText.match(/function\s+([a-z0-9_]+)-([a-z0-9_]+)/i);
  if (fnMatch) {
    const verb = fnMatch[1].toLowerCase();
    if (!APPROVED_VERBS.has(verb)) {
      diagnostics.push({
        id: `verb-${lineNum}-${verb}`,
        ruleId: 'PSUseApprovedVerbs',
        ruleName: 'Use Approved Verbs',
        ruleNameKo: 'PowerShell 표준 승인 동사(Approved Verbs) 사용 권장',
        severity: 'warning',
        line: lineNum,
        message: `'${fnMatch[1]}' is not a standard PowerShell approved verb.`,
        messageKo: `'${fnMatch[1]}'은(는) PowerShell 공식 승인 동사 목록에 없습니다. (Get-, Set-, Start-, Repair-, Invoke- 등 권장)`,
        suggestion: 'Use Get-Verb to see approved verbs like Start-, Repair-, Test-',
        suggestionKo: 'Get-Verb 명령어로 승인된 동사를 확인하고 공식 접두어를 사용하세요.',
        codeSnippet: lineText,
        fixable: false
      });
    }
  }
}

function checkInvokeExpression(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  if (/\b(iex|invoke-expression)\b/i.test(lineText)) {
    diagnostics.push({
      id: `iex-${lineNum}`,
      ruleId: 'PSAvoidUsingInvokeExpression',
      ruleName: 'Avoid Invoke-Expression',
      ruleNameKo: 'Invoke-Expression / iex 동적 실행 위험 경고',
      severity: 'warning',
      line: lineNum,
      message: 'Invoke-Expression can execute arbitrary unvalidated strings and is a high security risk.',
      messageKo: 'Invoke-Expression(iex)은 임의의 문자열을 동적 실행하므로 코드 주입 위험이 높습니다.',
      suggestion: 'Refactor code to use script blocks `& { ... }` or Call operator `&` directly.',
      suggestionKo: '동적 실행 대신 직접 명령어 호출 `&` 또는 스크립트 블록 `{ ... }`을 사용하세요.',
      codeSnippet: lineText,
      fixable: false
    });
  }
}

function checkPlaintextSecrets(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  if (/\$(password|pass|secret|token|apikey|cred|credentials)\s*=\s*["'][^"']{3,}["']/i.test(lineText)) {
    diagnostics.push({
      id: `secret-${lineNum}`,
      ruleId: 'PSAvoidUsingPlaintextForPassword',
      ruleName: 'Avoid Plaintext Passwords / Secrets',
      ruleNameKo: '하드코딩된 일반 텍스트 비밀번호/토큰 주의',
      severity: 'error',
      line: lineNum,
      message: 'Hardcoded plaintext password or sensitive API key detected in script variable.',
      messageKo: '스크립트 변수에 하드코딩된 평문 비밀번호 또는 API 키가 감지되었습니다.',
      suggestion: 'Use Read-Host -AsSecureString or PSCredential instead of plaintext.',
      suggestionKo: '평문 대신 Read-Host -AsSecureString 또는 SecureString 객체를 사용하세요.',
      codeSnippet: lineText,
      fixable: false
    });
  }
}

function checkAssignmentInIf(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  if (/\bif\s*\(\s*\$[a-z0-9_]+\s*=\s*[^=]/i.test(lineText)) {
    diagnostics.push({
      id: `assign-if-${lineNum}`,
      ruleId: 'PSPossibleIncorrectUsageOfAssignmentOperator',
      ruleName: 'Possible Incorrect Assignment in If',
      ruleNameKo: 'if 조건문 내 대입 연산자(=) 오용 주의',
      severity: 'warning',
      line: lineNum,
      message: 'Found assignment operator `=` inside `if (...)`. Did you mean `-eq`?',
      messageKo: 'if 조건문 안에서 `=` 대입 연산자가 발견되었습니다. 동등 비교 연산자 `-eq`를 의도하셨나요?',
      suggestion: 'Use `-eq` for equality comparison in PowerShell conditional statements.',
      suggestionKo: 'PowerShell에서는 동등 비교에 `=` 대신 `-eq` 연산자를 사용합니다.',
      codeSnippet: lineText,
      fixable: true
    });
  }
}

function checkNullComparisonOnRight(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  if (/\$[a-z0-9_]+\s+(-eq|-ne)\s+\$null\b/i.test(lineText)) {
    diagnostics.push({
      id: `null-right-${lineNum}`,
      ruleId: 'PSAvoidUsingNullComparisonOnRight',
      ruleName: 'Place $null on the Left Side of Comparison',
      ruleNameKo: '$null은 비교 연산자 좌측에 위치 권장 ($null -eq $var)',
      severity: 'info',
      line: lineNum,
      message: 'Comparing `$var -eq $null` can cause unexpected array filtering behavior. Place `$null` on the left: `$null -eq $var`.',
      messageKo: '`$var -eq $null` 형태의 비교는 배열 요소를 필터링하는 부작용이 있습니다. `$null -eq $var` 형태로 좌측에 작성하세요.',
      suggestion: 'Change `$var -eq $null` to `$null -eq $var`',
      suggestionKo: '`$null -eq $var` 또는 `$null -ne $var` 형태로 변경하세요.',
      codeSnippet: lineText,
      fixable: true
    });
  }
}

function checkEmptyCatch(lines: string[], currentIndex: number, diagnostics: PowerShellLintDiagnostic[]) {
  const lineText = lines[currentIndex].trim();
  if (/^catch\s*\{?\s*\}?$/i.test(lineText)) {
    const nextLine = lines[currentIndex + 1] ? lines[currentIndex + 1].trim() : '';
    if (nextLine === '}' || lineText.endsWith('{}') || lineText.endsWith('{ }')) {
      diagnostics.push({
        id: `catch-${currentIndex + 1}`,
        ruleId: 'PSAvoidUsingEmptyCatchBlock',
        ruleName: 'Avoid Empty Catch Blocks',
        ruleNameKo: '비어 있는 catch 블록(예외 침묵 처리) 주의',
        severity: 'warning',
        line: currentIndex + 1,
        message: 'Empty catch blocks silently swallow exceptions making debugging difficult.',
        messageKo: '비어 있는 catch 블록은 발생한 오류를 침묵 처리하여 시스템 진단을 방해합니다.',
        suggestion: 'Log the error using `Write-Warning $_.Exception.Message` inside catch block.',
        suggestionKo: 'catch 블록 안에 `Write-Warning $_.Exception.Message` 또는 로그 기록 구문을 작성하세요.',
        codeSnippet: lineText,
        fixable: false
      });
    }
  }
}

function checkGlobalVars(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  if (/\$global:[a-z0-9_]+/i.test(lineText)) {
    diagnostics.push({
      id: `global-${lineNum}`,
      ruleId: 'PSAvoidGlobalVars',
      ruleName: 'Avoid Global Variable Scope Pollution',
      ruleNameKo: '전역 변수 스코프($global:) 오염 주의',
      severity: 'info',
      line: lineNum,
      message: 'Modifying $global: variable scope can interfere with external script environments.',
      messageKo: '$global: 전역 변수 스코프를 수정하면 다른 스크립트 환경이나 시스템 세션에 영향을 줄 수 있습니다.',
      suggestion: 'Use script scope `$script:` or return objects from functions instead of global variables.',
      suggestionKo: '전역 변수 대신 함수의 반환값이나 `$script:` 스코프를 활용하세요.',
      codeSnippet: lineText,
      fixable: false
    });
  }
}

function checkDeprecatedTLS(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  if (/(ssl3|tls1?0?|tls11)\b/i.test(lineText) && /SecurityProtocol/i.test(lineText)) {
    diagnostics.push({
      id: `tls-${lineNum}`,
      ruleId: 'PSAvoidUsingDeprecatedSecurityProtocols',
      ruleName: 'Avoid Deprecated Security Protocols (SSL3 / TLS 1.0)',
      ruleNameKo: '취약한 구형 보안 프로토콜(SSL 3.0 / TLS 1.0) 지정 지양',
      severity: 'warning',
      line: lineNum,
      message: 'SSL3 and TLS 1.0/1.1 protocols are vulnerable to POODLE/BEAST attacks.',
      messageKo: 'SSL 3.0 및 TLS 1.0/1.1은 보안 취약점(POODLE/BEAST)이 존재합니다. TLS 1.2 이상을 강제하세요.',
      suggestion: 'Use [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12',
      suggestionKo: 'TLS 1.2 또는 TLS 1.3 프로토콜을 사용하도록 지정하세요.',
      codeSnippet: lineText,
      fixable: true
    });
  }
}

function checkDestructiveWildcard(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  if (/remove-item\s+-[a-z0-9_-]*\s*["']?c:\\?\*["']?/i.test(lineText) || /rm\s+-rf\s+c:\\/i.test(lineText)) {
    diagnostics.push({
      id: `destructive-${lineNum}`,
      ruleId: 'PSAvoidDestructiveWildcard',
      ruleName: 'High Risk Destructive Deletion on Root Drive',
      ruleNameKo: 'C: 루트 디렉터리 파괴적 삭제 위험 감지',
      severity: 'error',
      line: lineNum,
      message: 'Destructive wildcard deletion targeted at C:\\ root drive directory.',
      messageKo: 'C:\\ 시스템 루트 디렉터리를 대상으로 한 파괴적인 삭제 구문이 감지되었습니다.',
      suggestion: 'Specify exact subfolder paths (e.g. C:\\Temp\\*) and never wipe root drive.',
      suggestionKo: '정확한 하위 폴더 경로(예: C:\\Temp\\*)를 지정하고 루트 디렉터리 굵은 와일드카드는 피하세요.',
      codeSnippet: lineText,
      fixable: false
    });
  }
}

function checkExecutionPolicyBypass(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  if (/-executionpolicy\s+(bypass|unrestricted)/i.test(lineText) || /-ex\s+bypass/i.test(lineText)) {
    diagnostics.push({
      id: `policy-${lineNum}`,
      ruleId: 'PSAvoidExecutionPolicyBypass',
      ruleName: 'Notice Execution Policy Bypass Flag',
      ruleNameKo: 'ExecutionPolicy Bypass 실행 정책 우회 옵션 감지',
      severity: 'info',
      line: lineNum,
      message: 'Script contains -ExecutionPolicy Bypass flag. Useful for deployment but review before execution.',
      messageKo: '스크립트 내에 실행 정책 우회(-ExecutionPolicy Bypass) 옵션이 포함되어 있습니다.',
      suggestion: 'Ensure this script is executed in trusted environments.',
      suggestionKo: '신뢰할 수 있는 관리 환경에서 실행되는지 점검하세요.',
      codeSnippet: lineText,
      fixable: false
    });
  }
}

function checkHardcodedIPs(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  const ipMatch = lineText.match(/\b(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/);
  if (ipMatch) {
    diagnostics.push({
      id: `ip-${lineNum}-${ipMatch[1]}`,
      ruleId: 'PSAvoidHardcodedIPs',
      ruleName: 'Avoid Hardcoded Internal IP Addresses',
      ruleNameKo: '하드코딩된 사설 IP 주소 감지',
      severity: 'info',
      line: lineNum,
      message: `Hardcoded internal IP address '${ipMatch[1]}' detected.`,
      messageKo: `스크립트 내에 하드코딩된 사설 IP 주소 '${ipMatch[1]}'가 포함되어 있습니다.`,
      suggestion: 'Use hostname parameters or configuration objects instead of hardcoding IP addresses.',
      suggestionKo: 'IP 주소 대신 매개변수나 설정 파일 객체를 활용하세요.',
      codeSnippet: lineText,
      fixable: false
    });
  }
}

function checkWriteHostInFunctions(lineText: string, lineNum: number, inFunction: boolean, diagnostics: PowerShellLintDiagnostic[]) {
  if (inFunction && /\bWrite-Host\b/i.test(lineText)) {
    diagnostics.push({
      id: `writehost-fn-${lineNum}`,
      ruleId: 'PSAvoidWriteHostInFunctions',
      ruleName: 'Avoid Write-Host Inside Reusable Functions',
      ruleNameKo: '재사용 가능한 함수 내부 Write-Host 사용 지양',
      severity: 'info',
      line: lineNum,
      message: 'Write-Host bypasses pipeline output stream inside functions.',
      messageKo: '함수 내부에서의 Write-Host는 파이프라인 출력을 우회하므로 Write-Output 또는 Write-Verbose 사용을 권장합니다.',
      suggestion: 'Use Write-Output or Write-Verbose inside module functions.',
      suggestionKo: '함수 내부에서는 Write-Output 또는 Write-Verbose를 사용하세요.',
      codeSnippet: lineText,
      fixable: false
    });
  }
}

function checkInternalPing(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  if (/\bping\s+[a-z0-9_.-]+/i.test(lineText)) {
    diagnostics.push({
      id: `ping-${lineNum}`,
      ruleId: 'PSAvoidUsingInternalPing',
      ruleName: 'Use Test-Connection Instead of Legacy ping.exe',
      ruleNameKo: '구형 ping.exe 대신 Test-Connection Cmdlet 사용 권장',
      severity: 'info',
      line: lineNum,
      message: 'Legacy binary `ping` returns unformatted stdout strings. Use PowerShell Cmdlet `Test-Connection`.',
      messageKo: '구형 `ping.exe` 대신 PowerShell 객체를 반환하는 `Test-Connection` Cmdlet을 사용하세요.',
      suggestion: 'Replace `ping <host>` with `Test-Connection -ComputerName <host> -Count 2`',
      suggestionKo: '`ping <host>` 대신 `Test-Connection -ComputerName <host> -Count 2`로 변경하세요.',
      codeSnippet: lineText,
      fixable: true
    });
  }
}

function checkRegExeDirectly(lineText: string, lineNum: number, diagnostics: PowerShellLintDiagnostic[]) {
  if (/\breg(\.exe)?\s+(add|delete|query)\b/i.test(lineText)) {
    diagnostics.push({
      id: `reg-${lineNum}`,
      ruleId: 'PSAvoidUsingRegExeDirectly',
      ruleName: 'Use Native PowerShell Registry Cmdlets',
      ruleNameKo: '외부 reg.exe 대신 PowerShell 레지스트리 Cmdlet 사용 권장',
      severity: 'info',
      line: lineNum,
      message: 'Direct invocation of reg.exe can be replaced with Get-ItemProperty or Set-ItemProperty.',
      messageKo: '외부 `reg.exe` 바이너리 호출 대신 PowerShell 기본 `Get-ItemProperty` / `Set-ItemProperty`를 사용하세요.',
      suggestion: 'Use HKLM: drive provider cmdlets (Set-ItemProperty / New-Item)',
      suggestionKo: 'HKLM: 드라이브 프로바이더 Cmdlet을 활용하여 레지스트리를 조작하세요.',
      codeSnippet: lineText,
      fixable: false
    });
  }
}

