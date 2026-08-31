/**
 * Moderation status of a user-submitted exercise.
 */
export enum ExerciseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Supported OAuth2 identity providers.
 */
export enum AuthProvider {
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
}

/**
 * Authorization role carried on the access token. Regular users get `USER`;
 * `ADMIN` unlocks exercise moderation endpoints.
 */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

/**
 * Preset periods used for statistics aggregation.
 */
export enum StatsPeriod {
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
  SINCE = 'SINCE',
}

/**
 * Outcome of processing a single entry in a batch sync request.
 */
export enum SyncEntryStatus {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  IGNORED = 'IGNORED',
}
