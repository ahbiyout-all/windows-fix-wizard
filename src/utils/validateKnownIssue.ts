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

  // Required Fields Validation
  if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
    warnings.push(`${label}: 'id' is missing or not a string.`);
  }

  if (!item.title || typeof item.title !== 'string' || item.title.trim() === '') {
    errors.push(`${label}: 'title' is required and must be a non-empty string.`);
  }

  if (item.symptoms === undefined || item.symptoms === null || typeof item.symptoms !== 'string') {
    errors.push(`${label}: 'symptoms' is required and must be a string.`);
  }

  if (!item.category || typeof item.category !== 'string' || item.category.trim() === '') {
    errors.push(`${label}: 'category' is required and must be a non-empty string.`);
  }

  if (item.code === undefined || item.code === null || typeof item.code !== 'string') {
    warnings.push(`${label}: 'code' should be a string.`);
  }

  // Required / Expected Arrays Validation
  if (item.manualSteps === undefined || item.manualSteps === null) {
    errors.push(`${label}: 'manualSteps' is required and must be an Array.`);
  } else if (!Array.isArray(item.manualSteps)) {
    errors.push(`${label}: 'manualSteps' must be an Array.`);
  } else {
    const nonStringStep = item.manualSteps.some((step: any) => typeof step !== 'string');
    if (nonStringStep) {
      errors.push(`${label}: 'manualSteps' elements must all be strings.`);
    }
  }

  if (item.sourceUrls !== undefined && item.sourceUrls !== null && !Array.isArray(item.sourceUrls)) {
    errors.push(`${label}: 'sourceUrls' must be an Array of strings.`);
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
