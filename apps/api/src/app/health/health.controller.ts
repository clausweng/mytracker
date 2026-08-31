import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

export interface HealthResponse {
  status: 'ok';
}

/**
 * Liveness probe used by Docker/CI and uptime checks.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe.' })
  @ApiOkResponse({ description: 'The API is up.', schema: { example: { status: 'ok' } } })
  check(): HealthResponse {
    return { status: 'ok' };
  }
}
