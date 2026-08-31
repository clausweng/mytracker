import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Base URL for all API requests, e.g. `/api/v1`. Overridable in tests via
 * `{ provide: API_BASE_URL, useValue: '...' }`.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});
