import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthResponse, HintQuestionResponse } from '@exercise-tracker/shared-types';
import { AuthService } from './auth.service.js';
import {
  AuthResponseDto,
  HintQuestionResponseDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/index.js';

/**
 * Credential endpoints. Rate limited via `ThrottlerGuard` to blunt
 * brute-force attempts against login and password reset.
 */
@ApiTags('auth')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register an anonymous account with a hint question.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Account created.', type: AuthResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Username already taken.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed.' })
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with username and password.' })
  @ApiOkResponse({ description: 'Authenticated.', type: AuthResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid credentials.' })
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new token pair.' })
  @ApiOkResponse({ description: 'New token pair issued.', type: AuthResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Refresh token invalid, revoked or expired.' })
  refresh(@Body() dto: RefreshDto): Promise<AuthResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token.' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Refresh token revoked.' })
  logout(@Body() dto: LogoutDto): Promise<void> {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('hint/:username')
  @ApiOperation({ summary: 'Fetch the password-reset hint question for a username.' })
  @ApiOkResponse({ description: 'Hint question.', type: HintQuestionResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No hint question available.' })
  getHintQuestion(@Param('username') username: string): Promise<HintQuestionResponse> {
    return this.authService.getHintQuestion(username);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset the password by answering the hint question.' })
  @ApiOkResponse({ description: 'Password reset; a fresh token pair is issued.', type: AuthResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Hint answer incorrect.' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<AuthResponse> {
    return this.authService.resetPassword(dto);
  }
}
