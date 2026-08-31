import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../database/index.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

/**
 * Authentication feature module: local credentials, JWT access tokens and
 * rotating refresh tokens. OAuth strategies live in `OauthModule`.
 */
@Module({
  imports: [ConfigModule, DatabaseModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokenService, JwtStrategy],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
