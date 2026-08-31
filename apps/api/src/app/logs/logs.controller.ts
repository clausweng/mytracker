import { Body, Controller, Delete, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { CreateLogResponse, SyncLogsResponse } from '@exercise-tracker/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { LogsService } from './logs.service.js';
import { CreateLogResponseDto, LogEntryDto, SyncLogsDto, SyncLogsResponseDto } from './dto/index.js';

/**
 * Rep logging endpoints, including the idempotent offline batch sync.
 */
@ApiTags('logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post()
  @ApiOperation({ summary: 'Log reps; the day session is created automatically when missing.' })
  @ApiCreatedResponse({ description: "The day's accumulated reps for the exercise.", type: CreateLogResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid payload or log date.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: LogEntryDto): Promise<CreateLogResponse> {
    return this.logsService.create(user.userId, dto);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Idempotent batch sync of offline log entries (last-write-wins).' })
  @ApiOkResponse({ description: 'Per-entry sync outcome.', type: SyncLogsResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid payload or log date.' })
  sync(@CurrentUser() user: AuthenticatedUser, @Body() dto: SyncLogsDto): Promise<SyncLogsResponse> {
    return this.logsService.sync(user.userId, dto.entries);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one of your rep logs.' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Log deleted.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Log not found for this user.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) logId: string): Promise<void> {
    return this.logsService.remove(user.userId, logId);
  }
}
