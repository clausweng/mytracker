import { Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_DB } from './database.tokens.js';
import { createDrizzleDatabase, type DrizzleConnection } from './drizzle.factory.js';

const PG_CONNECTION = Symbol('PG_CONNECTION');

/**
 * Provides the Drizzle client (`DRIZZLE_DB`) backed by a single pg `Pool` for
 * the process lifetime, and closes the pool on application shutdown.
 */
@Module({
  providers: [
    {
      provide: PG_CONNECTION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): DrizzleConnection =>
        createDrizzleDatabase(configService.getOrThrow<string>('DATABASE_URL')),
    },
    {
      provide: DRIZZLE_DB,
      inject: [PG_CONNECTION],
      useFactory: (connection: DrizzleConnection) => connection.db,
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_CONNECTION) private readonly connection: DrizzleConnection) {}

  async onModuleDestroy(): Promise<void> {
    await this.connection.pool.end();
  }
}
