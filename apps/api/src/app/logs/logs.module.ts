import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/index.js';
import { DaysModule } from '../days/index.js';
import { LogsController } from './logs.controller.js';
import { LogsService } from './logs.service.js';

@Module({
  imports: [DatabaseModule, DaysModule],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
