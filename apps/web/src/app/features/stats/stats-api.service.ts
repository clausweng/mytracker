import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  StatsSummaryQuery,
  StatsSummaryResponse,
  StatsTimeseriesQuery,
  StatsTimeseriesResponse,
} from '@exercise-tracker/shared-types';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

/** Thin HTTP wrapper over `/stats/summary` and `/stats/timeseries`. */
@Injectable({ providedIn: 'root' })
export class StatsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  summary(query: StatsSummaryQuery): Promise<StatsSummaryResponse> {
    return firstValueFrom(
      this.http.get<StatsSummaryResponse>(`${this.baseUrl}/stats/summary`, { params: toParams(query) }),
    );
  }

  timeseries(query: StatsTimeseriesQuery): Promise<StatsTimeseriesResponse> {
    return firstValueFrom(
      this.http.get<StatsTimeseriesResponse>(`${this.baseUrl}/stats/timeseries`, { params: toParams(query) }),
    );
  }
}

function toParams(query: StatsSummaryQuery | StatsTimeseriesQuery): Record<string, string> {
  const params: Record<string, string> = { period: query.period };
  if (query.since) {
    params['since'] = query.since;
  }
  if (query.exerciseId !== undefined) {
    params['exerciseId'] = String(query.exerciseId);
  }
  return params;
}
