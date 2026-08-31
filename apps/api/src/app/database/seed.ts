import { config } from 'dotenv';
import { resolve } from 'path';
import { createDrizzleDatabase } from './drizzle.factory.js';
import { exercises } from './schema/index.js';

config({ path: resolve(process.cwd(), '../../.env') });

interface BaselineExercise {
  name: string;
  slug: string;
  description: string;
}

const BASELINE_EXERCISES: BaselineExercise[] = [
  { name: 'Push-ups', slug: 'push-ups', description: 'Standard bodyweight push-up.' },
  { name: 'Pull-ups', slug: 'pull-ups', description: 'Overhand grip pull-up on a bar.' },
  { name: 'Squats', slug: 'squats', description: 'Bodyweight air squat.' },
  { name: 'Sit-ups', slug: 'sit-ups', description: 'Standard abdominal sit-up.' },
  { name: 'Burpees', slug: 'burpees', description: 'Full-body squat-thrust-jump combination.' },
  { name: 'Lunges', slug: 'lunges', description: 'Alternating forward lunge, counted per leg.' },
  { name: 'Plank', slug: 'plank', description: 'Timed isometric plank hold, logged in reps of 10 seconds.' },
  { name: 'Dips', slug: 'dips', description: 'Triceps dip on parallel bars or a bench.' },
];

/**
 * Idempotent seed entry point. Run with `nx run api:db-seed`. Inserts the
 * baseline APPROVED exercise catalogue, skipping any exercise whose slug
 * already exists so the script is safe to re-run.
 */
async function seed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set to run the seed script.');
  }

  const { pool, db } = createDrizzleDatabase(databaseUrl);
  try {
    const inserted = await db
      .insert(exercises)
      .values(
        BASELINE_EXERCISES.map((exercise) => ({
          name: exercise.name,
          slug: exercise.slug,
          description: exercise.description,
          status: 'APPROVED' as const,
          createdByUserId: null,
        })),
      )
      .onConflictDoNothing({ target: exercises.slug })
      .returning({ slug: exercises.slug });

    console.log(`Seed complete: inserted ${inserted.length}/${BASELINE_EXERCISES.length} baseline exercises.`);
  } finally {
    await pool.end();
  }
}

seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
