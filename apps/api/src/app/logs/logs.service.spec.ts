import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SyncEntryStatus, type LogEntryContract } from '@exercise-tracker/shared-types';
import { LogsService } from './logs.service.js';
import type { DaysService } from '../days/days.service.js';
import { createDrizzleMock, type DrizzleMock } from '../../test/drizzle-mock.js';

const USER_ID = '66666666-6666-4666-8666-666666666666';
const NOW = new Date('2026-08-31T10:00:00.000Z');

function entry(overrides: Partial<LogEntryContract> = {}): LogEntryContract {
  return {
    clientLogId: '77777777-7777-4777-8777-777777777777',
    exerciseId: 1,
    reps: 20,
    logDate: '2026-08-31',
    clientTimestamp: 1_788_000_000_000,
    ...overrides,
  };
}

describe('LogsService', () => {
  let drizzle: DrizzleMock;
  let daysService: { ensureDaySession: jest.Mock; accumulatedReps: jest.Mock };
  let service: LogsService;

  beforeEach(() => {
    drizzle = createDrizzleMock();
    daysService = {
      ensureDaySession: jest.fn().mockResolvedValue({ id: 'day-session-id', logDate: '2026-08-31' }),
      accumulatedReps: jest.fn().mockResolvedValue(40),
    };
    service = new LogsService(drizzle.db, daysService as unknown as DaysService);
  });

  describe('create', () => {
    it('auto-creates the day session and returns the accumulated total', async () => {
      const response = await service.create(USER_ID, entry(), NOW);

      expect(daysService.ensureDaySession).toHaveBeenCalledWith(USER_ID, '2026-08-31', NOW);
      expect(drizzle.insert).toHaveBeenCalledTimes(1);
      expect(drizzle.calls.some((call) => call.method === 'onConflictDoUpdate')).toBe(true);
      expect(response).toEqual({ logDate: '2026-08-31', exerciseId: 1, accumulatedReps: 40 });
    });

    it('rejects a future log date', async () => {
      await expect(service.create(USER_ID, entry({ logDate: '2027-01-01' }), NOW)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(drizzle.insert).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the caller"s own log', async () => {
      drizzle.queue([{ id: 'log-id' }]);

      await expect(service.remove(USER_ID, 'log-id')).resolves.toBeUndefined();
      expect(drizzle.delete).toHaveBeenCalledTimes(1);
    });

    it('404s for a log owned by somebody else', async () => {
      drizzle.queue([]);

      await expect(service.remove(USER_ID, 'log-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('sync', () => {
    it('reports new entries as CREATED and writes them once', async () => {
      drizzle.queue([]);

      const response = await service.sync(USER_ID, [entry(), entry({ clientLogId: 'a1111111-1111-4111-8111-111111111111', exerciseId: 2 })], NOW);

      expect(response.results.map((result) => result.status)).toEqual([
        SyncEntryStatus.CREATED,
        SyncEntryStatus.CREATED,
      ]);
      expect(drizzle.insert).toHaveBeenCalledTimes(2);
      expect(daysService.ensureDaySession).toHaveBeenCalledTimes(1);
    });

    it('is idempotent: replaying the same batch reports UPDATED without duplicating reps', async () => {
      drizzle.queue([{ clientLogId: entry().clientLogId, clientTimestamp: entry().clientTimestamp }]);

      const response = await service.sync(USER_ID, [entry()], NOW);

      expect(response.results).toEqual([{ clientLogId: entry().clientLogId, status: SyncEntryStatus.UPDATED }]);
      expect(drizzle.calls.some((call) => call.method === 'onConflictDoUpdate')).toBe(true);
    });

    it('ignores a stale entry (last-write-wins)', async () => {
      drizzle.queue([{ clientLogId: entry().clientLogId, clientTimestamp: 1_788_000_009_999 }]);

      const response = await service.sync(USER_ID, [entry({ clientTimestamp: 1_788_000_000_000 })], NOW);

      expect(response.results).toEqual([{ clientLogId: entry().clientLogId, status: SyncEntryStatus.IGNORED }]);
      expect(drizzle.insert).not.toHaveBeenCalled();
    });

    it('applies a newer entry over a stored one', async () => {
      drizzle.queue([{ clientLogId: entry().clientLogId, clientTimestamp: 1_788_000_000_000 }]);

      const response = await service.sync(USER_ID, [entry({ clientTimestamp: 1_788_000_005_000, reps: 30 })], NOW);

      expect(response.results[0].status).toBe(SyncEntryStatus.UPDATED);
      expect(drizzle.insert).toHaveBeenCalledTimes(1);
    });

    it('deduplicates repeated clientLogIds inside one batch', async () => {
      drizzle.queue([]);

      const response = await service.sync(USER_ID, [entry(), entry({ reps: 25 })], NOW);

      expect(response.results.map((result) => result.status)).toEqual([
        SyncEntryStatus.CREATED,
        SyncEntryStatus.UPDATED,
      ]);
    });

    it('creates one day session per distinct log date', async () => {
      drizzle.queue([]);
      daysService.ensureDaySession.mockResolvedValue({ id: 'day-session-id' });

      await service.sync(
        USER_ID,
        [entry(), entry({ clientLogId: 'a2222222-2222-4222-8222-222222222222', logDate: '2026-08-30' })],
        NOW,
      );

      expect(daysService.ensureDaySession).toHaveBeenCalledTimes(2);
    });

    it('rejects the whole batch when any log date is invalid', async () => {
      await expect(service.sync(USER_ID, [entry({ logDate: '2026-13-01' })], NOW)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(drizzle.insert).not.toHaveBeenCalled();
    });

    it('handles an empty batch without querying', async () => {
      await expect(service.sync(USER_ID, [], NOW)).resolves.toEqual({ results: [] });
      expect(drizzle.select).not.toHaveBeenCalled();
    });
  });
});
