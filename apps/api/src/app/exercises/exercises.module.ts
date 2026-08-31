import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/index.js';
import { ExercisesController } from './exercises.controller.js';
import { ExercisesService } from './exercises.service.js';
import { UserExercisesController } from './user-exercises.controller.js';

/**
 * Exercise catalogue feature module, including the per-user exercise list.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [ExercisesController, UserExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService],
})
export class ExercisesModule {}
