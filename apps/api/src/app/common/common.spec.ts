import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  type ArgumentsHost,
  type ExecutionContext,
} from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { UserRole } from '@exercise-tracker/shared-types';
import { addDays, assertValidLogDate, MAX_FUTURE_DAYS, today, toIsoDate } from './date.utils.js';
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js';
import { LoggingInterceptor } from './interceptors/logging.interceptor.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { ROLES_KEY, Roles } from './decorators/roles.decorator.js';
import { RolesGuard } from './guards/roles.guard.js';
import type { AuthenticatedUser } from './types/authenticated-user.js';

const NOW = new Date('2026-08-31T10:00:00.000Z');

function executionContext(user?: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, method: 'GET', url: '/api/v1/exercises' }),
      getResponse: () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

describe('date utils', () => {
  it('formats and shifts dates in UTC', () => {
    expect(toIsoDate(NOW)).toBe('2026-08-31');
    expect(today(NOW)).toBe('2026-08-31');
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(MAX_FUTURE_DAYS).toBe(1);
  });

  it('accepts a valid past date', () => {
    expect(assertValidLogDate('2026-08-30', NOW)).toBe('2026-08-30');
  });

  it('defaults to the current clock when no reference date is given', () => {
    expect(assertValidLogDate(today())).toBe(today());
  });

  it.each(['2026/08/30', '20260830', 'yesterday', '2026-13-01', '2026-02-30', '2026-09-05'])(
    'rejects %s',
    (candidate) => {
      expect(() => assertValidLogDate(candidate, NOW)).toThrow(BadRequestException);
    },
  );
});

describe('RolesGuard', () => {
  const reflector = new Reflector();
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(reflector);
    jest.restoreAllMocks();
  });

  it('allows routes that declare no roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(executionContext())).toBe(true);
  });

  it('allows routes declaring an empty role list', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    expect(guard.canActivate(executionContext())).toBe(true);
  });

  it('allows a user holding the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    expect(
      guard.canActivate(executionContext({ userId: 'id', username: 'admin', role: UserRole.ADMIN })),
    ).toBe(true);
  });

  it('rejects a user without the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    expect(() =>
      guard.canActivate(executionContext({ userId: 'id', username: 'jane', role: UserRole.USER })),
    ).toThrow(ForbiddenException);
  });

  it('rejects an anonymous request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(executionContext())).toThrow(ForbiddenException);
  });

  it('exposes the metadata key through the decorator', () => {
    class Target {
      @Roles(UserRole.ADMIN)
      handler(): void {
        /* decorated for metadata only */
      }
    }

    expect(Reflect.getMetadata(ROLES_KEY, Target.prototype.handler)).toEqual([UserRole.ADMIN]);
  });
});

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  function hostWith(): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'POST', url: '/api/v1/auth/login' }),
      }),
    } as unknown as ArgumentsHost;

    return { host, json, status };
  }

  it('normalises a Nest HttpException with an object payload', () => {
    const { host, json, status } = hostWith();

    filter.catch(new UnauthorizedException('Invalid username or password.'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid username or password.',
        error: 'Unauthorized',
        path: '/api/v1/auth/login',
      }),
    );
  });

  it('normalises an HttpException carrying a string payload', () => {
    const { host, json } = hostWith();

    filter.catch(new HttpException('teapot', HttpStatus.I_AM_A_TEAPOT), host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'teapot', error: 'HttpException' }));
  });

  it('hides the details of an unknown error', () => {
    const { host, json, status } = hostWith();

    filter.catch(new Error('connection reset'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error', error: 'InternalServerError' }),
    );
  });

  it('handles a thrown non-error value', () => {
    const { host, json } = hostWith();

    filter.catch('boom', host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR }));
  });

  it('keeps a numeric-array validation message list', () => {
    const { host, json } = hostWith();

    filter.catch(new BadRequestException(['username must be a string']), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ['username must be a string'], error: 'Bad Request' }),
    );
  });
});

describe('LoggingInterceptor', () => {
  it('passes the response through', async () => {
    const interceptor = new LoggingInterceptor();

    const result = await lastValueFrom(
      interceptor.intercept(executionContext(), { handle: () => of({ status: 'ok' }) }),
    );

    expect(result).toEqual({ status: 'ok' });
  });
});

describe('CurrentUser decorator', () => {
  const user: AuthenticatedUser = { userId: 'user-1', username: 'clausi', role: UserRole.USER };

  /** Param decorators are only reachable through their route-args metadata. */
  function factory(): (data: unknown, context: ExecutionContext) => AuthenticatedUser {
    class Probe {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
      handler(@CurrentUser() _current: AuthenticatedUser): void {}
    }

    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, 'handler') as Record<
      string,
      { factory: (data: unknown, context: ExecutionContext) => AuthenticatedUser }
    >;
    return metadata[Object.keys(metadata)[0]].factory;
  }

  function contextWith(request: unknown): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  it('returns the user attached by the JWT guard', () => {
    expect(factory()(undefined, contextWith({ user }))).toEqual(user);
  });

  it('rejects unguarded requests', () => {
    expect(() => factory()(undefined, contextWith({}))).toThrow(UnauthorizedException);
  });
});
