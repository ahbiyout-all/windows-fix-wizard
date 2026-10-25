import { KnownIssue } from '../types';

export interface ValidationResult {
  isValid: boolean;
  totalRecords: number;
  validCount: number;
  invalidCount: number;
  errors: string[];
  warnings: string[];
  validRecords: KnownIssue[];
  invalidRecords: { index: number; record: any; errors: string[] }[];
}

/**
 * Validates a single object against the KnownIssue schema requirements.
 */
export function validateKnownIssueRecord(item: any, index: number = 0): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const label = `Record #${index + 1}${item?.id ? ` (ID: ${item.id})` : item?.code ? ` (Code: ${item.code})` : ''}`;

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return {
      isValid: false,
      errors: [`${label}: Must be a valid JSON object.`],
      warnings: []
    };
  }

  // Auto-repair and normalize common variations
  if (!item.title && (item.name || item.issueTitle || item.errorName)) {
    item.title = item.name || item.issueTitle || item.errorName;
  }
  if (!item.title || typeof item.title !== 'string' || item.title.trim() === '') {
    errors.push(`${label}: 'title' is required and must be a non-empty string.`);
  }

  if (item.symptoms === undefined || item.symptoms === null || typeof item.symptoms !== 'string') {
    if (item.description && typeof item.description === 'string') {
      item.symptoms = item.description;
    } else if (item.title) {
      item.symptoms = item.title;
    } else {
      errors.push(`${label}: 'symptoms' is required and must be a string.`);
    }
  }

  if (!item.category || typeof item.category !== 'string' || item.category.trim() === '') {
    item.category = '기타/미분류';
  }

  if (item.code === undefined || item.code === null || typeof item.code !== 'string') {
    item.code = 'N/A';
  }

  // Required / Expected Arrays Validation with Auto-Coercion
  if (item.manualSteps === undefined || item.manualSteps === null) {
    item.manualSteps = ['Windows 설정 > 시스템 > 문제 해결 도구를 실행합니다.'];
  } else if (!Array.isArray(item.manualSteps)) {
    if (typeof item.manualSteps === 'string') {
      item.manualSteps = [item.manualSteps];
    } else {
      item.manualSteps = ['Windows 설정 > 시스템 > 문제 해결 도구를 실행합니다.'];
    }
  } else {
    item.manualSteps = item.manualSteps.map((s: any) => typeof s === 'string' ? s : String(s)).filter((s: string) => s.trim().length > 0);
    if (item.manualSteps.length === 0) {
      item.manualSteps = ['Windows 설정 > 시스템 > 문제 해결 도구를 실행합니다.'];
    }
  }

  if (item.sourceUrls !== undefined && item.sourceUrls !== null && !Array.isArray(item.sourceUrls)) {
    if (typeof item.sourceUrls === 'string') {
      item.sourceUrls = [item.sourceUrls];
    } else {
      item.sourceUrls = [];
    }
  }

  // Generate ID if missing
  if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
    item.id = `issue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  // Optional string fields check
  const stringFields = ['title_en', 'symptoms_en', 'script', 'verifiedAt', 'aiFeedback'];
  for (const field of stringFields) {
    if (item[field] !== undefined && item[field] !== null && typeof item[field] !== 'string') {
      errors.push(`${label}: Field '${field}' must be a string.`);
    }
  }

  // Optional array fields check
  const arrayFields = ['manualSteps_en', 'windowsVersions', 'searchKeywords', 'upvotedBy', 'downvotedBy'];
  for (const field of arrayFields) {
    if (item[field] !== undefined && item[field] !== null && !Array.isArray(item[field])) {
      errors.push(`${label}: Field '${field}' must be an Array.`);
    }
  }

  // Optional number fields check
  if (item.upvoteCount !== undefined && item.upvoteCount !== null && typeof item.upvoteCount !== 'number') {
    errors.push(`${label}: 'upvoteCount' must be a number.`);
  }

  // Optional enum field check
  if (item.verificationStatus !== undefined && item.verificationStatus !== null) {
    const validStatuses = ['pending', 'verified', 'needs_update', 'obsolete'];
    if (!validStatuses.includes(item.verificationStatus)) {
      warnings.push(`${label}: 'verificationStatus' is '${item.verificationStatus}', expected one of: ${validStatuses.join(', ')}.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates an array of records against the KnownIssue schema before importing/restoring.
 */
export function validateKnownIssuesData(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validRecords: KnownIssue[] = [];
  const invalidRecords: { index: number; record: any; errors: string[] }[] = [];

  if (!Array.isArray(data)) {
    return {
      isValid: false,
      totalRecords: 0,
      validCount: 0,
      invalidCount: 0,
      errors: ['Imported data payload is not an Array.'],
      warnings: [],
      validRecords: [],
      invalidRecords: []
    };
  }

  data.forEach((item, index) => {
    const res = validateKnownIssueRecord(item, index);
    if (res.isValid) {
      validRecords.push(item as KnownIssue);
      if (res.warnings.length > 0) {
        warnings.push(...res.warnings);
      }
    } else {
      invalidRecords.push({ index, record: item, errors: res.errors });
      errors.push(...res.errors);
      if (res.warnings.length > 0) {
        warnings.push(...res.warnings);
      }
    }
  });

  return {
    isValid: invalidRecords.length === 0,
    totalRecords: data.length,
    validCount: validRecords.length,
    invalidCount: invalidRecords.length,
    errors,
    warnings,
    validRecords,
    invalidRecords
  };
}
