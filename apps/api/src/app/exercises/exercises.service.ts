import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, ilike, like, or } from 'drizzle-orm';
import {
  type AddUserExerciseRequest,
  type CreateExerciseRequest,
  type Exercise,
  type ExerciseStatus,
  type UserExercise,
} from '@exercise-tracker/shared-types';
import { DRIZZLE_DB } from '../database/database.tokens.js';
import type { DrizzleDatabase } from '../database/drizzle.factory.js';
import { exercises, userExercises, type ExerciseRow } from '../database/schema/index.js';
import { slugify, toExercise, toUserExercise, uniqueSlug } from './exercise.mapper.js';

/** Maximum number of autocomplete suggestions returned per request. */
export const AUTOCOMPLETE_LIMIT = 20;

/**
 * Exercise catalogue and per-user exercise list management.
 */
@Injectable()
export class ExercisesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase) {}

  /**
   * Autocomplete search. A user sees approved exercises plus their own
   * submissions, whatever their moderation status.
   */
  async search(userId: string, query: string): Promise<Exercise[]> {
    const rows = await this.db
      .select()
      .from(exercises)
      .where(
        and(
          ilike(exercises.name, `%${query}%`),
          or(eq(exercises.status, 'APPROVED'), eq(exercises.createdByUserId, userId)),
        ),
      )
      .orderBy(asc(exercises.name))
      .limit(AUTOCOMPLETE_LIMIT);

    return rows.map(toExercise);
  }

  async listMine(userId: string): Promise<Exercise[]> {
    const rows = await this.db
      .select()
      .from(exercises)
      .where(eq(exercises.createdByUserId, userId))
      .orderBy(asc(exercises.name));

    return rows.map(toExercise);
  }

  /**
   * Submits a new exercise. It lands as `PENDING` and stays private to its
   * creator until an admin approves it.
   */
  async create(userId: string, request: CreateExerciseRequest): Promise<Exercise> {
    const name = request.name.trim();
    const [duplicate] = await this.db.select().from(exercises).where(ilike(exercises.name, name)).limit(1);
    if (duplicate) {
      throw new ConflictException(`An exercise named "${name}" already exists.`);
    }

    const base = slugify(name);
    const takenRows = await this.db
      .select({ slug: exercises.slug })
      .from(exercises)
      .where(like(exercises.slug, `${base}%`));

    const [created] = await this.db
      .insert(exercises)
      .values({
        name,
        slug: uniqueSlug(
          base,
          takenRows.map((row) => row.slug),
        ),
        description: request.description?.trim() ?? null,
        status: 'PENDING',
        createdByUserId: userId,
      })
      .returning();

    return toExercise(created);
  }

  /**
   * Admin-only moderation transition.
   */
  async updateStatus(exerciseId: number, status: ExerciseStatus): Promise<Exercise> {
    const [updated] = await this.db
      .update(exercises)
      .set({ status })
      .where(eq(exercises.id, exerciseId))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Exercise ${exerciseId} does not exist.`);
    }

    return toExercise(updated);
  }

  async listUserExercises(userId: string): Promise<UserExercise[]> {
    const rows = await this.db
      .select()
      .from(userExercises)
      .where(eq(userExercises.userId, userId))
      .orderBy(asc(userExercises.sortOrder));

    return rows.map(toUserExercise);
  }

  /**
   * Adds (or updates) an entry in the user's own exercise list.
   */
  async addUserExercise(userId: string, request: AddUserExerciseRequest): Promise<UserExercise> {
    const visible = await this.findVisible(userId, request.exerciseId);
    if (!visible) {
      throw new NotFoundException(`Exercise ${request.exerciseId} does not exist or is not visible to you.`);
    }

    const values = {
      userId,
      exerciseId: request.exerciseId,
      isStandard: request.isStandard ?? false,
      sortOrder: request.sortOrder ?? 0,
    };

    const [row] = await this.db
      .insert(userExercises)
      .values(values)
      .onConflictDoUpdate({
        target: [userExercises.userId, userExercises.exerciseId],
        set: { isStandard: values.isStandard, sortOrder: values.sortOrder },
      })
      .returning();

    return toUserExercise(row);
  }

  async removeUserExercise(userId: string, exerciseId: number): Promise<void> {
    const removed = await this.db
      .delete(userExercises)
      .where(and(eq(userExercises.userId, userId), eq(userExercises.exerciseId, exerciseId)))
      .returning({ exerciseId: userExercises.exerciseId });

    if (removed.length === 0) {
      throw new NotFoundException(`Exercise ${exerciseId} is not on your list.`);
    }
  }

  /**
   * The user's standard exercises, used when a new day is created.
   */
  async listStandardExercises(userId: string): Promise<Exercise[]> {
    const rows = await this.db
      .select({ exercise: exercises })
      .from(userExercises)
      .innerJoin(exercises, eq(exercises.id, userExercises.exerciseId))
      .where(and(eq(userExercises.userId, userId), eq(userExercises.isStandard, true)))
      .orderBy(asc(userExercises.sortOrder));

    return rows.map((row) => toExercise(row.exercise));
  }

  private async findVisible(userId: string, exerciseId: number): Promise<ExerciseRow | undefined> {
    const [row] = await this.db
      .select()
      .from(exercises)
      .where(
        and(
          eq(exercises.id, exerciseId),
          or(eq(exercises.status, 'APPROVED'), eq(exercises.createdByUserId, userId)),
        ),
      )
      .limit(1);

    return row;
  }
}
