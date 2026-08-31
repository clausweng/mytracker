import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/index.js';
import { PeriodService } from './period.service.js';
import { StatsController } from './stats.controller.js';
import { StatsService } from './stats.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [StatsController],
  providers: [StatsService, PeriodService],
  exports: [StatsService],
})
export class StatsModule {}
