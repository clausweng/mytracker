import { IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min, validateSync } from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';

/**
 * Validated shape of process.env. `@nestjs/config` runs this validator once
 * at bootstrap and fails fast if any required variable is missing/invalid.
 */
export class EnvironmentVariables {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT = 3000;

  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @IsString()
  CORS_ORIGIN = 'http://localhost:4200';

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_ACCESS_TTL = '15m';

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_REFRESH_TTL = '30d';

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_SECRET?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  GOOGLE_CALLBACK_URL?: string;

  @IsOptional()
  @IsString()
  FACEBOOK_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  FACEBOOK_CLIENT_SECRET?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  FACEBOOK_CALLBACK_URL?: string;
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}
