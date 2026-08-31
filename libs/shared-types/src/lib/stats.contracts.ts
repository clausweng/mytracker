import type { StatsPeriod } from './enums.js';

export interface StatsSummaryQuery {
  period: StatsPeriod;
  since?: string;
  exerciseId?: number;
}

export interface StatsSummaryEntry {
  exerciseId: number;
  exerciseName: string;
  totalReps: number;
}

export interface StatsSummaryResponse {
  period: StatsPeriod;
  from: string;
  to: string;
  entries: StatsSummaryEntry[];
}

export interface StatsTimeseriesQuery {
  period: StatsPeriod;
  since?: string;
  exerciseId?: number;
}

export interface StatsTimeseriesPoint {
  bucket: string;
  totalReps: number;
}

export interface StatsTimeseriesResponse {
  period: StatsPeriod;
  points: StatsTimeseriesPoint[];
}
