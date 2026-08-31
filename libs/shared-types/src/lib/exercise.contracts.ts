import type { ExerciseStatus } from './enums.js';

/**
 * Exercise catalogue entry. `exerciseId` is a numeric serial identifier per
 * the shared contract used throughout logging/sync payloads.
 */
export interface Exercise {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: ExerciseStatus;
  createdByUserId: string | null;
  createdAt: string;
}

export interface CreateExerciseRequest {
  name: string;
  description?: string;
}

export interface ExerciseAutocompleteQuery {
  query: string;
}

/**
 * A user's own exercise list entry (their "standard exercises").
 */
export interface UserExercise {
  exerciseId: number;
  isStandard: boolean;
  sortOrder: number;
}

export interface AddUserExerciseRequest {
  exerciseId: number;
  isStandard?: boolean;
  sortOrder?: number;
}

/**
 * Moderation request used by the admin-only approval endpoint.
 */
export interface UpdateExerciseStatusRequest {
  status: ExerciseStatus;
}
