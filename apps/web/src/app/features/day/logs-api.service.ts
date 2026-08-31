import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { CreateLogResponse, LogEntryContract, SyncLogsResponse } from '@exercise-tracker/shared-types';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

/** Thin HTTP wrapper over `/logs` and the idempotent `/logs/sync` batch endpoint. */
@Injectable({ providedIn: 'root' })
export class LogsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  create(entry: LogEntryContract): Promise<CreateLogResponse> {
    return firstValueFrom(this.http.post<CreateLogResponse>(`${this.baseUrl}/logs`, entry));
  }

  sync(entries: LogEntryContract[]): Promise<SyncLogsResponse> {
    return firstValueFrom(this.http.post<SyncLogsResponse>(`${this.baseUrl}/logs/sync`, { entries }));
  }
}
