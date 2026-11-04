/**
 * Windows Fix Wizard - Browser Hidden ZIP Archive Manager
 * 
 * Compresses obsolete logs (older than 30 days or before deletion) into high-ratio
 * hidden ZIP archives directly in the browser's persistent IndexedDB storage.
 * Saves storage space, safeguards data against accidental loss, and optimizes
 * runtime performance by pruning large log datasets from active memory.
 */

import JSZip from 'jszip';
import { idbSet, idbGet, idbRemove } from './idbStorage';

export interface HiddenLogArchiveMeta {
  id: string;
  createdAt: string;
  title: string;
  cutoffDate: string;
  cutoffDays: number;
  totalArchivedRecords: number;
  recordCounts: {
    visitor: number;
    search: number;
    feedback: number;
    admin: number;
    error: number;
    backend: number;
  };
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: string;
  fileName: string;
  isAutomaticPrune?: boolean;
}

export function parseLogTimestamp(log: any): number | null {
  if (!log) return null;
  const ts = log.timestamp || log.lastActiveAt || log.createdAt || log.firstVisitAt || log.time || log.date;
  if (!ts) return null;
  if (typeof ts === 'number') return ts;
  if (typeof ts?.toMillis === 'function') return ts.toMillis();
  if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
  if (typeof ts?.seconds === 'number') {
    return ts.seconds * 1000 + (ts.nanoseconds ? Math.round(ts.nanoseconds / 1000000) : 0);
  }
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

export function partitionLogsByAge<T = any>(logs: T[], cutoffDays: number = 30): { oldLogs: T[]; recentLogs: T[] } {
  const cutoffMs = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;
  const oldLogs: T[] = [];
  const recentLogs: T[] = [];

  for (const log of logs) {
    const ms = parseLogTimestamp(log);
    // If timestamp cannot be parsed, treat as recent to be safe
    if (ms !== null && ms < cutoffMs) {
      oldLogs.push(log);
    } else {
      recentLogs.push(log);
    }
  }
  return { oldLogs, recentLogs };
}

export interface LogCollectionsMap {
  visitor?: any[];
  search?: any[];
  feedback?: any[];
  admin?: any[];
  error?: any[];
  backend?: any[];
}

/**
 * Compresses specified logs or 30-day old logs into a hidden ZIP archive in IndexedDB.
 */
export async function compressLogsToHiddenZip(
  logCollections: LogCollectionsMap,
  options: {
    cutoffDays?: number;
    title?: string;
    archiveAllGiven?: boolean;
    isAutomaticPrune?: boolean;
  } = {}
): Promise<{
  meta: HiddenLogArchiveMeta | null;
  remainingLogs: LogCollectionsMap;
  archivedCounts: Record<string, number>;
}> {
  const cutoffDays = options.cutoffDays ?? 30;
  const archiveAllGiven = options.archiveAllGiven ?? false;
  const isAutomaticPrune = options.isAutomaticPrune ?? false;

  const partitioned: Record<string, { oldLogs: any[]; recentLogs: any[] }> = {};
  let totalOldCount = 0;
  let originalBytes = 0;
  const recordCounts = {
    visitor: 0,
    search: 0,
    feedback: 0,
    admin: 0,
    error: 0,
    backend: 0
  };

  const keys: (keyof typeof recordCounts)[] = ['visitor', 'search', 'feedback', 'admin', 'error', 'backend'];

  for (const key of keys) {
    const list = logCollections[key] || [];
    if (archiveAllGiven) {
      partitioned[key] = { oldLogs: list, recentLogs: [] };
    } else {
      partitioned[key] = partitionLogsByAge(list, cutoffDays);
    }

    const oldLength = partitioned[key].oldLogs.length;
    recordCounts[key] = oldLength;
    totalOldCount += oldLength;

    if (oldLength > 0) {
      try {
        const jsonStr = JSON.stringify(partitioned[key].oldLogs);
        originalBytes += new Blob([jsonStr]).size;
      } catch (e) {
        console.warn(`[logArchiveManager] Size calculation error for ${key}:`, e);
      }
    }
  }

  // If no logs qualify for archiving, return early
  if (totalOldCount === 0) {
    return {
      meta: null,
      remainingLogs: logCollections,
      archivedCounts: recordCounts
    };
  }

  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, '-');
  const archiveId = `log_archive_${Date.now()}_${cutoffDays}d`;
  const cutoffDateIso = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000).toISOString();
  const fileName = `winfix_hidden_archive_${timestampStr}.zip`;

  // Build JSZip package
  const zip = new JSZip();
  const folderName = `winfix_logs_archive_${now.toISOString().split('T')[0]}`;
  const folder = zip.folder(folderName) || zip;

  for (const key of keys) {
    const oldLogs = partitioned[key].oldLogs;
    if (oldLogs.length > 0) {
      folder.file(`${key}_logs.json`, JSON.stringify(oldLogs, null, 2));
    }
  }

  const manifest = {
    archiveId,
    createdAt: now.toISOString(),
    cutoffDays,
    cutoffDate: cutoffDateIso,
    totalArchivedRecords: totalOldCount,
    recordCounts,
    originalSizeBytes: originalBytes,
    isAutomaticPrune,
    note: 'Browser Hidden Local ZIP Archive (Compressed prior to deletion)'
  };
  folder.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Generate compressed ZIP binary
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  const compressedBytes = zipBlob.size;
  const ratio = originalBytes > 0 
    ? `${(((originalBytes - compressedBytes) / originalBytes) * 100).toFixed(1)}%` 
    : '0%';

  const meta: HiddenLogArchiveMeta = {
    id: archiveId,
    createdAt: now.toISOString(),
    title: options.title || `${cutoffDays}일 이상 경과 로그 압축 보관 (${totalOldCount}건)`,
    cutoffDate: cutoffDateIso,
    cutoffDays,
    totalArchivedRecords: totalOldCount,
    recordCounts,
    originalSizeBytes: originalBytes,
    compressedSizeBytes: compressedBytes,
    compressionRatio: ratio,
    fileName,
    isAutomaticPrune
  };

  // Convert blob to ArrayBuffer for durable storage in IndexedDB
  const arrayBuffer = await zipBlob.arrayBuffer();
  await idbSet(`winfix_archive_blob_${archiveId}`, arrayBuffer);
  await idbSet(`winfix_archive_meta_${archiveId}`, meta);

  // Update master index list
  const existingIndex = (await idbGet<string[]>('winfix_hidden_archive_index')) || [];
  if (!existingIndex.includes(archiveId)) {
    const updated = [archiveId, ...existingIndex];
    await idbSet('winfix_hidden_archive_index', updated);
  }

  const remainingLogs: LogCollectionsMap = {};
  for (const key of keys) {
    remainingLogs[key] = partitioned[key].recentLogs;
  }

  return {
    meta,
    remainingLogs,
    archivedCounts: recordCounts
  };
}

/**
 * Returns all hidden archives currently saved in IndexedDB.
 */
export async function getHiddenArchiveList(): Promise<HiddenLogArchiveMeta[]> {
  try {
    const index = (await idbGet<string[]>('winfix_hidden_archive_index')) || [];
    const list: HiddenLogArchiveMeta[] = [];
    for (const id of index) {
      const meta = await idbGet<HiddenLogArchiveMeta>(`winfix_archive_meta_${id}`);
      if (meta) {
        list.push(meta);
      }
    }
    return list;
  } catch (err) {
    console.warn('[logArchiveManager] Failed to fetch hidden archive list:', err);
    return [];
  }
}

/**
 * Downloads a hidden archive from IndexedDB to the administrator's computer as a ZIP file.
 */
export async function downloadHiddenArchive(archiveId: string): Promise<boolean> {
  try {
    const meta = await idbGet<HiddenLogArchiveMeta>(`winfix_archive_meta_${archiveId}`);
    const buffer = await idbGet<ArrayBuffer>(`winfix_archive_blob_${archiveId}`);
    if (!buffer) return false;

    const blob = new Blob([buffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = meta?.fileName || `winfix_hidden_archive_${archiveId}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('[logArchiveManager] Failed to download hidden archive:', err);
    return false;
  }
}

/**
 * Permanently deletes a hidden archive from browser IndexedDB storage.
 */
export async function deleteHiddenArchive(archiveId: string): Promise<void> {
  try {
    await idbRemove(`winfix_archive_blob_${archiveId}`);
    await idbRemove(`winfix_archive_meta_${archiveId}`);
    const existingIndex = (await idbGet<string[]>('winfix_hidden_archive_index')) || [];
    const filtered = existingIndex.filter(id => id !== archiveId);
    await idbSet('winfix_hidden_archive_index', filtered);
  } catch (err) {
    console.warn(`[logArchiveManager] Failed to delete hidden archive '${archiveId}':`, err);
  }
}

/**
 * Clears all hidden archives from IndexedDB storage.
 */
export async function clearAllHiddenArchives(): Promise<number> {
  try {
    const index = (await idbGet<string[]>('winfix_hidden_archive_index')) || [];
    for (const id of index) {
      await idbRemove(`winfix_archive_blob_${id}`);
      await idbRemove(`winfix_archive_meta_${id}`);
    }
    await idbSet('winfix_hidden_archive_index', []);
    return index.length;
  } catch (err) {
    console.warn('[logArchiveManager] Failed to clear all hidden archives:', err);
    return 0;
  }
}
