/** Fallback display name when the provider profile exposes none. */
export const FALLBACK_DISPLAY_NAME = 'Athlete';

/**
 * Picks the best available display name from an OAuth profile.
 */
export function resolveDisplayName(displayName?: string, givenName?: string): string {
  return displayName?.trim() || givenName?.trim() || FALLBACK_DISPLAY_NAME;
}
