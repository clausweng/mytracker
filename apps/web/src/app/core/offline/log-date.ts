/**
 * Local-time `YYYY-MM-DD` date helpers. Never use `new Date()` directly in
 * templates or components — inject `LOG_DATE_CLOCK` (or call `today()`) so
 * tests can control "now" and so we avoid UTC off-by-one when the local day
 * differs from the UTC day.
 */
import { InjectionToken } from '@angular/core';

/** A clock abstraction so components/services never call `new Date()` directly. */
export const LOG_DATE_CLOCK = new InjectionToken<() => Date>('LOG_DATE_CLOCK', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

/** Formats a `Date` as a local `YYYY-MM-DD` string. */
export function toLogDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns today's local date as `YYYY-MM-DD`. */
export function todayLogDate(clock: () => Date = () => new Date()): string {
  return toLogDate(clock());
}
