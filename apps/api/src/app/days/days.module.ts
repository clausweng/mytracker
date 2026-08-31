import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/index.js';
import { ExercisesModule } from '../exercises/index.js';
import { DaysController } from './days.controller.js';
import { DaysService } from './days.service.js';

@Module({
  imports: [DatabaseModule, ExercisesModule],
  controllers: [DaysController],
  providers: [DaysService],
  exports: [DaysService],
})
export class DaysModule {}
