import { IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min, validateSync } from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';

/**
 * Docker Compose's `${VAR:-}` substitution yields an empty string (not
 * `undefined`) when a variable is unset, which would otherwise fail
 * `@IsOptional()` combined with format validators like `@IsUrl()`. Treat
 * blank strings as "not provided".
 */
const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

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

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_SECRET?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUrl({ require_tld: false })
  GOOGLE_CALLBACK_URL?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  FACEBOOK_CLIENT_ID?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  FACEBOOK_CLIENT_SECRET?: string;

  @Transform(emptyToUndefined)
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
