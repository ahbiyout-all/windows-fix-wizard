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

function sanitizeJsonString(str: string): string {
  let result = "";
  let inString = false;
  let i = 0;
  while (i < str.length) {
    const char = str[i];
    
    // Check for double quote that is not escaped
    if (char === '"') {
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && str[j] === '\\') {
        backslashCount++;
        j--;
      }
      if (backslashCount % 2 === 0) {
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
        // Drop or escape illegal control characters
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
        // In valid JSON, any other backslash (e.g. \Windows, \d, \s, \S, \P) must be escaped to \\
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

function tryParseJsonCore(str: string): any {
  if (!str || !str.trim()) return null;
  const trimmed = str.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch (e1) {
    // 2. Trailing comma removal
    const noTrailingCommas = trimmed.replace(/,\s*([\}\]])/g, '$1');
    try {
      return JSON.parse(noTrailingCommas);
    } catch (e2) {
      // 3. Sanitized parse
      try {
        const sanitized = sanitizeJsonString(trimmed);
        return JSON.parse(sanitized);
      } catch (e3) {
        // 4. Sanitized + Trailing comma removal
        try {
          const sanitizedNoCommas = sanitizeJsonString(noTrailingCommas);
          return JSON.parse(sanitizedNoCommas);
        } catch (e4) {
          return null;
        }
      }
    }
  }
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
    if (char === '"') {
      let bsCount = 0;
      let j = i - 1;
      while (j >= 0 && text[j] === '\\') {
        bsCount++;
        j--;
      }
      if (bsCount % 2 === 0) {
        inStr = !inStr;
      }
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

  // 2. Extract bounding brackets if present
  const firstBracket = clean.search(/[\{\[]/);
  const lastBracket = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    clean = clean.substring(firstBracket, lastBracket + 1);
  }

  // 3. Attempt direct/sanitized core parse
  const directResult = tryParseJsonCore(clean);
  if (directResult !== null) {
    return directResult as T;
  }

  // 4. Truncation Recovery for Arrays: find candidate closing '}' from right to left
  const firstArrayBracket = clean.indexOf('[');
  if (firstArrayBracket !== -1) {
    const arraySlice = clean.substring(firstArrayBracket);
    const indicesOfBraces: number[] = [];
    let inString = false;
    for (let i = 0; i < arraySlice.length; i++) {
      const c = arraySlice[i];
      if (c === '"') {
        let bsc = 0;
        let j = i - 1;
        while (j >= 0 && arraySlice[j] === '\\') { bsc++; j--; }
        if (bsc % 2 === 0) inString = !inString;
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

  // 5. Discrete Object Extraction Fallback
  const extractedObjects = extractJsonObjects(clean);
  if (extractedObjects.length > 0) {
    console.warn(`Recovered ${extractedObjects.length} JSON objects via discrete extraction`);
    return extractedObjects as unknown as T;
  }

  // 6. If all recovery failed, throw descriptive error
  throw new Error(`AI JSON parse failed and recovery was unsuccessful. Original: ${rawText.substring(0, 150)}...`);
}

