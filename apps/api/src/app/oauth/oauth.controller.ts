import { Controller, Get, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthResponse } from '@exercise-tracker/shared-types';
import { AuthResponseDto } from '../auth/dto/index.js';

type OAuthRequest = Request & { user: AuthResponse };

/**
 * Google sign-in. Only mounted when Google credentials are configured.
 */
@ApiTags('auth')
@Controller('auth/google')
export class GoogleOauthController {
  @Get()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Start the Google OAuth2 flow (redirects to Google).' })
  @ApiResponse({ status: HttpStatus.FOUND, description: 'Redirect to the Google consent screen.' })
  start(): void {
    // Passport issues the redirect; nothing to return.
  }

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 callback issuing the JWT token pair.' })
  @ApiOkResponse({ description: 'Authenticated via Google.', type: AuthResponseDto })
  callback(@Req() request: OAuthRequest): AuthResponse {
    return request.user;
  }
}

/**
 * Facebook sign-in. Only mounted when Facebook credentials are configured.
 */
@ApiTags('auth')
@Controller('auth/facebook')
export class FacebookOauthController {
  @Get()
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Start the Facebook OAuth2 flow (redirects to Facebook).' })
  @ApiResponse({ status: HttpStatus.FOUND, description: 'Redirect to the Facebook consent screen.' })
  start(): void {
    // Passport issues the redirect; nothing to return.
  }

  @Get('callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth2 callback issuing the JWT token pair.' })
  @ApiOkResponse({ description: 'Authenticated via Facebook.', type: AuthResponseDto })
  callback(@Req() request: OAuthRequest): AuthResponse {
    return request.user;
  }
}
