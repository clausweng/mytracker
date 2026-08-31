import { BadRequestException } from '@nestjs/common';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Clock-skew margin: clients may be at most one day ahead of the server. */
export const MAX_FUTURE_DAYS = 1;

/**
 * Formats a `Date` as `YYYY-MM-DD` using UTC parts.
 */
export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Returns today's date (UTC) as `YYYY-MM-DD`.
 */
export function today(now: Date = new Date()): string {
  return toIsoDate(now);
}

/**
 * Adds (or subtracts, for negative values) whole days to an ISO date string.
 */
export function addDays(isoDate: string, days: number): string {
  const parsed = new Date(`${isoDate}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return toIsoDate(parsed);
}

/**
 * Validates a `YYYY-MM-DD` log date: it must be a real calendar date and must
 * not be further than `MAX_FUTURE_DAYS` in the future.
 */
export function assertValidLogDate(logDate: string, now: Date = new Date()): string {
  if (!ISO_DATE_PATTERN.test(logDate)) {
    throw new BadRequestException(`logDate must be formatted as YYYY-MM-DD, received "${logDate}".`);
  }

  const parsed = new Date(`${logDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || toIsoDate(parsed) !== logDate) {
    throw new BadRequestException(`logDate "${logDate}" is not a valid calendar date.`);
  }

  const latestAllowed = addDays(toIsoDate(now), MAX_FUTURE_DAYS);
  if (logDate > latestAllowed) {
    throw new BadRequestException(`logDate "${logDate}" is too far in the future.`);
  }

  return logDate;
}
