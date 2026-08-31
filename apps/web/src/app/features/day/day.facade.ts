import { Injectable, inject, signal } from '@angular/core';
import type { DayExerciseSummary } from '@exercise-tracker/shared-types';
import { DaysOfflineRepository } from '../../core/offline/days-offline.repository';
import type { CachedDay } from '../../core/offline/tracker-db';
import { OutboxRepository } from '../../core/offline/outbox.repository';
import { SyncService } from '../../core/offline/sync.service';
import { todayLogDate } from '../../core/offline/log-date';
import { DaysApiService } from './days-api.service';
import { UserExercisesOfflineRepository } from '../../core/offline/user-exercises-offline.repository';

/**
 * Facade for the "Today" screen: starts/loads the day session (offline-first)
 * and applies optimistic rep increments queued to the sync outbox.
 */
@Injectable({ providedIn: 'root' })
export class DayFacade {
  private readonly daysApi = inject(DaysApiService);
  private readonly daysRepo = inject(DaysOfflineRepository);
  private readonly userExercisesRepo = inject(UserExercisesOfflineRepository);
  private readonly outbox = inject(OutboxRepository);
  private readonly sync = inject(SyncService);

  readonly today = signal(todayLogDate());
  readonly day = signal<CachedDay | null>(null);
  readonly loading = signal(false);

  async loadToday(): Promise<void> {
    this.loading.set(true);
    const logDate = this.today();
    try {
      const cached = await this.daysRepo.get(logDate);
      if (cached) {
        this.day.set(cached);
      }

      const fresh = await this.daysApi.getDay(logDate).catch(() => null);
      if (fresh) {
        const cachedDay = toCachedDay(fresh);
        await this.daysRepo.put(cachedDay);
        this.day.set(cachedDay);
      } else if (!cached) {
        this.day.set(null);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async startNewDay(): Promise<void> {
    const logDate = this.today();
    const session = await this.daysApi.createDay(logDate);
    const cachedDay = toCachedDay(session);
    await this.daysRepo.put(cachedDay);
    this.day.set(cachedDay);
  }

  /** Optimistically increments an exercise's reps and queues the write offline. */
  async addReps(exerciseId: number, exerciseName: string, reps: number): Promise<void> {
    const logDate = this.today();
    const clientLogId = generateClientLogId();
    const clientTimestamp = Date.now();

    this.day.update((current) => {
      const base: CachedDay = current ?? {
        id: logDate,
        logDate,
        exercises: [],
        createdAt: new Date(clientTimestamp).toISOString(),
        updatedAt: clientTimestamp,
      };
      const existingIndex = base.exercises.findIndex((entry) => entry.exerciseId === exerciseId);
      const exercises = [...base.exercises];
      if (existingIndex >= 0) {
        exercises[existingIndex] = {
          ...exercises[existingIndex],
          accumulatedReps: exercises[existingIndex].accumulatedReps + reps,
        };
      } else {
        exercises.push({ exerciseId, exerciseName, accumulatedReps: reps });
      }
      return { ...base, exercises, updatedAt: clientTimestamp };
    });

    const updated = this.day();
    if (updated) {
      await this.daysRepo.put(updated);
    }

    await this.outbox.enqueue({ clientLogId, exerciseId, reps, logDate, clientTimestamp });
    void this.sync.flush();
  }

  async standardExercises(): Promise<DayExerciseSummary[]> {
    const entries = await this.userExercisesRepo.getAll();
    return entries
      .filter((entry) => entry.isStandard)
      .map((entry) => ({ exerciseId: entry.exerciseId, exerciseName: entry.exerciseName, accumulatedReps: 0 }));
  }
}

function toCachedDay(session: {
  id: string;
  logDate: string;
  exercises: DayExerciseSummary[];
  createdAt: string;
}): CachedDay {
  return { ...session, updatedAt: Date.now() };
}

function generateClientLogId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
