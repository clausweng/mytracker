import type { SyncEntryStatus } from './enums.js';

/**
 * Contract for a single rep-logging entry. Every offline log entry contract
 * MUST include these fields to support idempotent client sync.
 */
export interface LogEntryContract {
  clientLogId: string;
  exerciseId: number;
  reps: number;
  logDate: string;
  clientTimestamp: number;
}

export type CreateLogRequest = LogEntryContract;

export interface CreateLogResponse {
  logDate: string;
  exerciseId: number;
  accumulatedReps: number;
}

export interface SyncLogsRequest {
  entries: LogEntryContract[];
}

export interface SyncEntryResult {
  clientLogId: string;
  status: SyncEntryStatus;
}

export interface SyncLogsResponse {
  results: SyncEntryResult[];
}
