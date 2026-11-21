export const parseJsonResponse = async <T = any>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    if (contentType.includes('application/json')) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }
    throw new Error(`Server returned status ${response.status} (${response.statusText || 'Error'})`);
  }
  if (!contentType.includes('application/json')) {
    throw new Error(`Invalid response format from server (expected JSON, received ${contentType || 'non-JSON'})`);
  }
  return await response.json();
};

export const safeFetchJson = async <T = any>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, options);
  return parseJsonResponse<T>(response);
};

function isEscapedQuote(str: string, quoteIdx: number): boolean {
  let backslashCount = 0;
  let j = quoteIdx - 1;
  while (j >= 0 && str[j] === '\\') {
    backslashCount++;
    j--;
  }
  return backslashCount % 2 === 1;
}

/**
 * Escapes double quotes inside string literals that appear to be unescaped prose/PowerShell quotes
 * rather than valid JSON structural closing quotes (which are followed by whitespace + `,`, `}`, `]`, `:`, or EOF).
 */
function escapeSuspiciousInnerQuotes(str: string): string {
  let result = '';
  let inString = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '"') {
      if (!isEscapedQuote(str, i)) {
        if (!inString) {
          inString = true;
          result += ch;
        } else {
          let lookahead = i + 1;
          while (lookahead < str.length && /\s/.test(str[lookahead])) {
            lookahead++;
          }
          const nextNonWs = lookahead < str.length ? str[lookahead] : '';
          if (
            nextNonWs === '' ||
            nextNonWs === ',' ||
            nextNonWs === '}' ||
            nextNonWs === ']' ||
            nextNonWs === ':'
          ) {
            inString = false;
            result += ch;
          } else {
            result += '\\"';
          }
        }
        continue;
      }
    }
    result += ch;
  }
  return result;
}

function sanitizeJsonString(str: string): string {
  let result = "";
  let inString = false;
  let i = 0;
  while (i < str.length) {
    const char = str[i];

    if (char === '"') {
      if (!isEscapedQuote(str, i)) {
        inString = !inString;
      }
      result += char;
      i++;
      continue;
    }

    if (inString) {
      if (char === '\n') {
        result += '\\n';
        i++;
        continue;
      } else if (char === '\r') {
        result += '\\r';
        i++;
        continue;
      } else if (char === '\t') {
        result += '\\t';
        i++;
        continue;
      } else if (char.charCodeAt(0) < 32) {
        result += ' ';
        i++;
        continue;
      } else if (char === '\\') {
        const next = str[i + 1];
        if (next === '\\') {
          result += '\\\\';
          i += 2;
          continue;
        } else if (next === '"' || next === '/' || next === 'b' || next === 'f' || next === 'n' || next === 'r' || next === 't') {
          result += '\\' + next;
          i += 2;
          continue;
        } else if (next === 'u') {
          const hex = str.substring(i + 2, i + 6);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            result += '\\u' + hex;
            i += 6;
            continue;
          }
        }
        // Any other backslash (e.g. \Windows, \d, \s, \S, \P) must be escaped to \\
        result += '\\\\';
        i++;
        continue;
      }
    }
    result += char;
    i++;
  }
  return result;
}

/**
 * Slices up to the end of the first complete top-level JSON structure if balanced,
 * or repairs an incomplete/truncated tail by closing open strings, trimming dangling keys,
 * and balancing `{`/`[` brackets.
 */
function sliceBalancedOrRepairTruncatedJson(input: string): { balancedSlice: string; repaired: string } {
  const stack: string[] = [];
  let inString = false;
  let completeEnd = -1;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"' && !isEscapedQuote(input, i)) {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{' || ch === '[') {
        stack.push(ch);
      } else if (ch === '}' || ch === ']') {
        const expected = ch === '}' ? '{' : '[';
        if (stack.length > 0 && stack[stack.length - 1] === expected) {
          stack.pop();
          if (stack.length === 0) {
            completeEnd = i;
            break;
          }
        }
      }
    }
  }

  if (completeEnd !== -1) {
    const slice = input.substring(0, completeEnd + 1);
    return { balancedSlice: slice, repaired: slice };
  }

  // Repair truncated JSON tail
  let repaired = input;
  if (inString) {
    // Strip trailing lone backslash before closing quote
    let backslashes = 0;
    let k = repaired.length - 1;
    while (k >= 0 && repaired[k] === '\\') {
      backslashes++;
      k--;
    }
    if (backslashes % 2 === 1) {
      repaired = repaired.slice(0, -1);
    }
    repaired += '"';
  }

  // Clean trailing dangling comma or incomplete key-colon pairs outside strings
  repaired = repaired
    .replace(/,\s*"[^"]*"\s*:\s*$/g, '')
    .replace(/,\s*"[^"]*"\s*$/g, '')
    .replace(/:\s*$/g, ': null')
    .replace(/,\s*$/g, '');

  // Re-compute remaining open stack cleanly on repaired string
  const repairStack: string[] = [];
  let repairInStr = false;
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (ch === '"' && !isEscapedQuote(repaired, i)) {
      repairInStr = !repairInStr;
      continue;
    }
    if (!repairInStr) {
      if (ch === '{' || ch === '[') {
        repairStack.push(ch);
      } else if (ch === '}' || ch === ']') {
        const expected = ch === '}' ? '{' : '[';
        if (repairStack.length > 0 && repairStack[repairStack.length - 1] === expected) {
          repairStack.pop();
        }
      }
    }
  }

  while (repairStack.length > 0) {
    const open = repairStack.pop();
    repaired += open === '{' ? '}' : ']';
  }

  return { balancedSlice: input, repaired };
}

function tryParseJsonCore(str: string): any {
  if (!str || !str.trim()) return null;
  const trimmed = str.trim();

  const attempts = [
    trimmed,
    trimmed.replace(/,\s*([\}\]])/g, '$1'),
    sanitizeJsonString(trimmed),
    sanitizeJsonString(trimmed).replace(/,\s*([\}\]])/g, '$1'),
    escapeSuspiciousInnerQuotes(sanitizeJsonString(trimmed)),
    escapeSuspiciousInnerQuotes(sanitizeJsonString(trimmed)).replace(/,\s*([\}\]])/g, '$1')
  ];

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next recovery strategy
    }
  }
  return null;
}

/**
 * Extracts individual JSON objects { ... } by counting balanced curly braces.
 */
function extractJsonObjects(text: string): any[] {
  const objects: any[] = [];
  let depth = 0;
  let inStr = false;
  let startIndex = -1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && !isEscapedQuote(text, i)) {
      inStr = !inStr;
    }

    if (!inStr) {
      if (char === '{') {
        if (depth === 0) startIndex = i;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && startIndex !== -1) {
          const objStr = text.substring(startIndex, i + 1);
          const parsed = tryParseJsonCore(objStr);
          if (parsed && typeof parsed === 'object') {
            objects.push(parsed);
          }
          startIndex = -1;
        }
      }
    }
  }
  return objects;
}

export function parseAiJson<T = any>(rawText: string): T {
  if (!rawText || !rawText.trim()) throw new Error("Empty AI response text");

  // 1. Clean code fences & standard formatting
  let clean = rawText
    .replace(/^```(?:json)?\s*/gi, "")
    .replace(/\s*```$/gi, "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/gi, "")
    .trim();

  // 2. Strip leading prose before the first JSON delimiter without truncating unclosed tails
  const firstBracket = clean.search(/[\{\[]/);
  if (firstBracket > 0) {
    clean = clean.substring(firstBracket);
  }

  // 3. Slice cleanly at top-level balance or produce repaired version for truncated tails
  const sanitizedPass = escapeSuspiciousInnerQuotes(sanitizeJsonString(clean));
  const { balancedSlice, repaired } = sliceBalancedOrRepairTruncatedJson(clean);
  const { balancedSlice: balancedSanitized, repaired: repairedSanitized } =
    sliceBalancedOrRepairTruncatedJson(sanitizedPass);

  for (const candidate of [balancedSlice, balancedSanitized, clean]) {
    const res = tryParseJsonCore(candidate);
    if (res !== null) {
      return res as T;
    }
  }

  // 4. Truncation Recovery for Arrays: find candidate closing '}' from right to left (keeps only complete items first)
  for (const sourceText of [clean, sanitizedPass]) {
    const firstArrayBracket = sourceText.indexOf('[');
    if (firstArrayBracket !== -1) {
      const arraySlice = sourceText.substring(firstArrayBracket);
      const indicesOfBraces: number[] = [];
      let inString = false;
      for (let i = 0; i < arraySlice.length; i++) {
        const c = arraySlice[i];
        if (c === '"' && !isEscapedQuote(arraySlice, i)) {
          inString = !inString;
        }
        if (!inString && c === '}') {
          indicesOfBraces.push(i);
        }
      }

      for (let i = indicesOfBraces.length - 1; i >= 0; i--) {
        const braceIdx = indicesOfBraces[i];
        const candidate = arraySlice.substring(0, braceIdx + 1) + ']';
        const parsedArray = tryParseJsonCore(candidate);
        if (parsedArray && Array.isArray(parsedArray) && parsedArray.length > 0) {
          console.warn(`Recovered partial JSON array (${parsedArray.length} items) via brace truncation at index ${braceIdx}`);
          return parsedArray as unknown as T;
        }
      }
    }
  }

  // 5. Discrete Object Extraction Fallback
  for (const sourceText of [clean, sanitizedPass]) {
    const extractedObjects = extractJsonObjects(sourceText);
    if (extractedObjects.length > 0) {
      console.warn(`Recovered ${extractedObjects.length} JSON objects via discrete extraction`);
      return extractedObjects as unknown as T;
    }
  }

  // 6. Repaired Tail Recovery (when single object or partial final item had unclosed strings/braces)
  for (const repairedCandidate of [repairedSanitized, repaired]) {
    const repairedRes = tryParseJsonCore(repairedCandidate);
    if (repairedRes !== null) {
      console.warn("Recovered truncated AI JSON payload via tail repair.");
      return repairedRes as T;
    }
  }

  // 7. If all recovery failed, throw descriptive error
  throw new Error(`AI JSON parse failed and recovery was unsuccessful. Original: ${rawText.substring(0, 150)}...`);
}
