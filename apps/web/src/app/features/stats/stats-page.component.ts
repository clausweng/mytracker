import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { StatsPeriod, type StatsSummaryResponse } from '@exercise-tracker/shared-types';
import { StatsApiService } from './stats-api.service';
import { MetaOfflineRepository } from '../../core/offline/meta-offline.repository';
import { toLogDate } from '../../core/offline/log-date';

const STATS_CACHE_KEY = 'stats-summary-cache';

@Component({
  selector: 'app-stats-page',
  imports: [
    FormsModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatTableModule,
  ],
  templateUrl: './stats-page.component.html',
  styleUrl: './stats-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsPageComponent {
  private readonly statsApi = inject(StatsApiService);
  private readonly metaRepo = inject(MetaOfflineRepository);

  protected readonly StatsPeriod = StatsPeriod;
  protected readonly period = signal<StatsPeriod>(StatsPeriod.WEEK);
  protected readonly since = signal<Date | null>(null);
  protected readonly response = signal<StatsSummaryResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly offline = signal(false);

  protected readonly maxReps = computed(() => {
    const entries = this.response()?.entries ?? [];
    return entries.reduce((max, entry) => Math.max(max, entry.totalReps), 0) || 1;
  });

  protected readonly displayedColumns = ['exerciseName', 'totalReps'];

  constructor() {
    void this.load();
  }

  onPeriodChange(period: StatsPeriod): void {
    this.period.set(period);
    void this.load();
  }

  onSinceChange(date: Date | null): void {
    this.since.set(date);
    if (date) {
      void this.load();
    }
  }

  barWidthPercent(totalReps: number): number {
    return Math.max(4, Math.round((totalReps / this.maxReps()) * 100));
  }

  private async load(): Promise<void> {
    const period = this.period();
    if (period === StatsPeriod.SINCE && !this.since()) {
      return;
    }

    this.loading.set(true);
    try {
      const response = await this.statsApi.summary({
        period,
        since: period === StatsPeriod.SINCE && this.since() ? toLogDate(this.since()!) : undefined,
      });
      this.response.set(response);
      this.offline.set(false);
      await this.metaRepo.set(STATS_CACHE_KEY, response);
    } catch {
      const cached = await this.metaRepo.get<StatsSummaryResponse>(STATS_CACHE_KEY);
      if (cached) {
        this.response.set(cached);
        this.offline.set(true);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
