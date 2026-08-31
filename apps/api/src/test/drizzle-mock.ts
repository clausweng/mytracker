import type { DrizzleDatabase } from '../app/database/drizzle.factory.js';

/** Chainable builder methods the services actually use. */
const CHAIN_METHODS = [
  'from',
  'where',
  'limit',
  'offset',
  'values',
  'set',
  'returning',
  'onConflictDoNothing',
  'onConflictDoUpdate',
  'orderBy',
  'groupBy',
  'having',
  'innerJoin',
  'leftJoin',
] as const;

export interface RecordedCall {
  method: string;
  args: unknown[];
}

export interface DrizzleMock {
  /** The mocked client, typed as the real Drizzle database. */
  db: DrizzleDatabase;
  /** Queues result rows, consumed in order by each awaited query chain. */
  queue: (...results: unknown[][]) => void;
  /** Every chain method invocation, in call order. */
  calls: RecordedCall[];
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
}

type Chain = Record<string, unknown>;

/**
 * Minimal fake Drizzle query builder: every chain method returns the same
 * chain object, and awaiting the chain resolves to the next queued result.
 * Only the methods the services call are mocked — nothing more.
 */
export function createDrizzleMock(): DrizzleMock {
  const results: unknown[][] = [];
  const calls: RecordedCall[] = [];

  const createChain = (): Chain => {
    const chain: Chain = {};
    for (const method of CHAIN_METHODS) {
      chain[method] = jest.fn((...args: unknown[]) => {
        calls.push({ method, args });
        return chain;
      });
    }
    chain['then'] = (
      onFulfilled: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ): Promise<unknown> => Promise.resolve(results.shift() ?? []).then(onFulfilled, onRejected);
    return chain;
  };

  const entryPoint = (method: string): jest.Mock =>
    jest.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return createChain();
    });

  const select = entryPoint('select');
  const insert = entryPoint('insert');
  const update = entryPoint('update');
  const remove = entryPoint('delete');

  const db = {
    select,
    insert,
    update,
    delete: remove,
    execute: jest.fn(() => Promise.resolve({ rows: results.shift() ?? [] })),
  } as unknown as DrizzleDatabase;

  return {
    db,
    calls,
    select,
    insert,
    update,
    delete: remove,
    queue: (...queued: unknown[][]): void => {
      results.push(...queued);
    },
  };
}
