import { ExerciseStatus, type Exercise, type UserExercise } from '@exercise-tracker/shared-types';
import type { ExerciseRow, UserExerciseRow } from '../database/schema/index.js';

/**
 * Converts a URL/DB friendly slug from a free-text exercise name.
 */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'exercise';
}

/**
 * Picks the first slug not present in `taken`, appending `-2`, `-3`, … on
 * collision.
 */
export function uniqueSlug(base: string, taken: readonly string[]): string {
  if (!taken.includes(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.includes(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

export function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: ExerciseStatus[row.status],
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toUserExercise(row: UserExerciseRow): UserExercise {
  return {
    exerciseId: row.exerciseId,
    isStandard: row.isStandard,
    sortOrder: row.sortOrder,
  };
}
