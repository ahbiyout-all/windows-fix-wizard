
import { Type } from '@google/genai';

/**
 * Common Operation Types for Firestore Error Handling
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/**
 * Standardized Error Info for Firestore Operations
 */
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
  };
}

/**
 * AI Response Schema for Troubleshooting Wizard
 */
export interface TroubleshootingResult {
  diagnosis: string;
  isScriptApplicable: boolean;
  script: string;
  scriptSafetyWarning: string;
  manualSteps: string[];
  sourceUrls: string[];
}

/**
 * Definition for Known Windows Issues in Firestore
 */
export interface KnownIssue {
  id: string;
  category: string;
  code: string;
  title: string;
  title_en?: string;
  symptoms: string;
  symptoms_en?: string;
  script?: string;
  manualSteps: string[];
  manualSteps_en?: string[];
  sourceUrls: string[];
  source?: string;
  windowsVersions?: string[];
  searchKeywords?: string[];
  upvoteCount?: number;
  upvotedBy?: string[];
  downvotedBy?: string[];
  isLatest?: boolean;
  createdAt?: any;
  updatedAt?: any;
  verifiedAt?: string;
  verificationStatus?: 'pending' | 'verified' | 'needs_update' | 'obsolete';
  aiFeedback?: string;
}

/**
 * Administrative Log entry
 */
export interface AdminLog {
  id?: string;
  action: 'create' | 'update' | 'delete' | 'verify';
  targetId: string;
  details: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: any;
  adminEmail: string;
}

/**
 * User Search Activity Log
 */
export interface SearchLog {
  query: string;
  version: string;
  timestamp: any;
  userId?: string;
}

/**
 * User Feedback on Fixes
 */
export interface FeedbackLog {
  id?: string;
  issueId: string;
  issueTitle?: string;
  isSolved: boolean;
  comment?: string;
  timestamp: any;
  userId?: string;
}

/**
 * User Activity History
 */
export interface UserActivity {
  id?: string;
  userId: string;
  type: 'search' | 'view';
  targetId?: string;
  query?: string;
  timestamp: any;
}

/**
 * Backend Activity/Sync Log
 */
export interface BackendLog {
  id: string;
  type: 'start' | 'success' | 'failure' | 'info';
  source: string;
  message: string;
  timestamp: any;
  details?: any;
}

/**
 * Visitor Session & Activity Log
 */
export interface VisitorLog {
  id?: string;
  visitorId: string;
  userId?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  language?: string;
  activeTab?: string;
  visitCount?: number;
  activityCount?: number;
  entryUrl?: string;
  firstVisitedAt?: any;
  lastActiveAt: any;
  isBlocked?: boolean;
  blockReason?: string;
  autoBlocked?: boolean;
  blockedAt?: string;
}

export interface AutoBlockSettings {
  enableBotFilter: boolean;
  enableBurstFilter: boolean;
  maxRequestsPerMinute: number;
  enableAnomalyFilter: boolean;
}
