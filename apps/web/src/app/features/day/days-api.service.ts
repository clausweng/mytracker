import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { DaySession } from '@exercise-tracker/shared-types';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

/** Thin HTTP wrapper over `/days`. */
@Injectable({ providedIn: 'root' })
export class DaysApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  createDay(logDate: string): Promise<DaySession> {
    return firstValueFrom(this.http.post<DaySession>(`${this.baseUrl}/days`, { logDate }));
  }

  getDay(logDate: string): Promise<DaySession> {
    return firstValueFrom(this.http.get<DaySession>(`${this.baseUrl}/days/${logDate}`));
  }

  listRange(from: string, to: string): Promise<DaySession[]> {
    return firstValueFrom(this.http.get<DaySession[]>(`${this.baseUrl}/days`, { params: { from, to } }));
  }
}
