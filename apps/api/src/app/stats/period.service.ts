import { BadRequestException, Injectable } from '@nestjs/common';
import { StatsPeriod } from '@exercise-tracker/shared-types';
import { assertValidLogDate, toIsoDate } from '../common/date.utils.js';

export interface DateRange {
  from: string;
  to: string;
}

/** Postgres `date_trunc` units used for the timeseries buckets. */
export type BucketUnit = 'day' | 'week' | 'month';

function shiftMonths(reference: Date, months: number): Date {
  const shifted = new Date(reference.getTime());
  const targetDay = shifted.getUTCDate();
  shifted.setUTCDate(1);
  shifted.setUTCMonth(shifted.getUTCMonth() + months);
  const lastDayOfTargetMonth = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0),
  ).getUTCDate();
  shifted.setUTCDate(Math.min(targetDay, lastDayOfTargetMonth));
  return shifted;
}

/**
 * Resolves the statistics period presets to concrete, inclusive date ranges
 * ending today, and picks a readable bucket size per period.
 */
@Injectable()
export class PeriodService {
  /**
   * WEEK → the last 7 days, MONTH → the same day one month ago (clamped for
   * short months), YEAR → the same day one year ago, SINCE → the caller's
   * `since` date. All ranges are inclusive and end today.
   */
  resolve(period: StatsPeriod, since: string | undefined, now: Date = new Date()): DateRange {
    const to = toIsoDate(now);

    switch (period) {
      case StatsPeriod.WEEK: {
        const from = new Date(now.getTime());
        from.setUTCDate(from.getUTCDate() - 6);
        return { from: toIsoDate(from), to };
      }
      case StatsPeriod.MONTH:
        return { from: toIsoDate(shiftMonths(now, -1)), to };
      case StatsPeriod.YEAR:
        return { from: toIsoDate(shiftMonths(now, -12)), to };
      case StatsPeriod.SINCE: {
        if (!since) {
          throw new BadRequestException('The "since" query parameter is required when period=SINCE.');
        }
        assertValidLogDate(since, now);
        if (since > to) {
          throw new BadRequestException('The "since" date must not be in the future.');
        }
        return { from: since, to };
      }
      default:
        throw new BadRequestException(`Unsupported period: ${String(period)}.`);
    }
  }

  /**
   * Bucket sizing: a week is read day by day, a month week by week, and
   * long ranges (year/since) month by month.
   */
  bucketFor(period: StatsPeriod): BucketUnit {
    switch (period) {
      case StatsPeriod.WEEK:
        return 'day';
      case StatsPeriod.MONTH:
        return 'week';
      default:
        return 'month';
    }
  }
}
