import { InjectionToken } from '@angular/core';

/** The build's semantic version, surfaced to the UI (e.g. the nav drawer "About" line). */
export const APP_VERSION = new InjectionToken<string>('APP_VERSION');
