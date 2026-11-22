
jest.mock('@prisma/client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    clientVersion: string;
    constructor(message: string, opts: { code: string; clientVersion: string }) {
      super(message);
      this.name = 'PrismaClientKnownRequestError';
      this.code = opts.code;
      this.clientVersion = opts.clientVersion;
    }
  }
  return {
    Role: {
      DEPENDENT: 'DEPENDENT',
      CARETAKER: 'CARETAKER',
      HYBRID: 'HYBRID',
    },
    PrismaClient: class PrismaClient {},
    Prisma: {
      PrismaClientKnownRequestError,
    },
  };
});

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const verifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken,
  })),
}));

import {
  BadRequestException,
  ExecutionContext,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import {
  AUTH_EMAIL_LOCAL_MAX_LENGTH,
  AUTH_EMAIL_MAX_LENGTH,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  getAuthCredentialIssue,
  isValidAuthEmail,
  isValidAuthPassword,
  normalizeAuthEmail,
} from './auth-credentials';
import { resolveJwtExpiresIn, resolveJwtSecret } from './jwt-secret';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../test/helpers/prisma.mock';

function makePrismaP2002Error(): Error {
  const { Prisma } = jest.requireMock('@prisma/client') as {
    Prisma: {
      PrismaClientKnownRequestError: new (
        message: string,
        opts: { code: string; clientVersion: string },
      ) => Error;
    };
  };
  return new Prisma.PrismaClientKnownRequestError('dup', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

function makeHttpContext(path: string, ip = '203.0.113.10'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        ip,
        method: 'POST',
        path,
        url: path,
        headers: {},
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('Category B - auth identity and credentials', () => {
  let prisma: PrismaMock;
  let service: AuthService;
  const jwtSign = jest.fn().mockReturnValue('signed-jwt');

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jwtSign } },
      ],
    }).compile();

    service = module.get(AuthService);
  });


  describe('B-01 email normalization', () => {
    it('trims and lowercases email', () => {
      expect(normalizeAuthEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
    });

    it('returns empty string for non-string input', () => {
      expect(normalizeAuthEmail(null)).toBe('');
      expect(normalizeAuthEmail(12)).toBe('');
    });
  });

  describe('B-02 hostile or malformed emails [K]', () => {
    it('accepts typical valid emails', () => {
      expect(isValidAuthEmail('a@b.co')).toBe(true);
      expect(isValidAuthEmail('user.name+tag@example.com')).toBe(true);
    });

    it('accepts hyphens, underscores, subdomains and modern TLDs', () => {
      expect(isValidAuthEmail('jan_kowalski-2@moja-firma.pl')).toBe(true);
      expect(isValidAuthEmail('student@poczta.uniwersytet.edu.pl')).toBe(true);
      expect(isValidAuthEmail('kontakt@projekt.online')).toBe(true);
    });

    it('rejects malformed and hostile emails', () => {
      expect(isValidAuthEmail('bad')).toBe(false);
      expect(isValidAuthEmail('a@b')).toBe(false);
      expect(isValidAuthEmail('a@@b.com')).toBe(false);
      expect(isValidAuthEmail('a@b..com')).toBe(false);
      expect(isValidAuthEmail('a<script>@b.com')).toBe(false);
      expect(getAuthCredentialIssue('a@b.com\u0000', '123456')).toBe('email_invalid');
    });

    it('enforces RFC length bounds (local 64, total 254)', () => {
      const local64 = `${'a'.repeat(AUTH_EMAIL_LOCAL_MAX_LENGTH)}@b.com`;
      const local65 = `${'a'.repeat(AUTH_EMAIL_LOCAL_MAX_LENGTH + 1)}@b.com`;
      expect(isValidAuthEmail(local64)).toBe(true);
      expect(isValidAuthEmail(local65)).toBe(false);
      expect(isValidAuthEmail('x'.repeat(300))).toBe(false);
      expect(isValidAuthEmail(`${'a'.repeat(AUTH_EMAIL_MAX_LENGTH - 5)}@b.co`)).toBe(false);
    });

    it('rejects dots and spaces in bad places, empty sides, empty input', () => {
      expect(isValidAuthEmail('.jan@domena.pl')).toBe(false);
      expect(isValidAuthEmail('jan.@domena.pl')).toBe(false);
      expect(isValidAuthEmail('jan..kowalski@domena.pl')).toBe(false);
      expect(isValidAuthEmail('@domena.pl')).toBe(false);
      expect(isValidAuthEmail('jan@')).toBe(false);
      expect(isValidAuthEmail('jan kowalski@domena.pl')).toBe(false);
      expect(isValidAuthEmail('')).toBe(false);
      expect(isValidAuthEmail('   ')).toBe(false);
    });

    it('rejects CRLF header injection and injection-like local parts [K]', () => {
      expect(isValidAuthEmail('a@b.com\r\nBcc:haker@evil.com')).toBe(false);
      expect(isValidAuthEmail(`"admin"'--@b.com`)).toBe(false);
      expect(isValidAuthEmail('a\\b@b.com')).toBe(false);
    });

    it('rejects unicode spoofing and emoji local-parts [K]', () => {
      expect(isValidAuthEmail('аdmin@b.com')).toBe(false);
      expect(isValidAuthEmail('🔥@b.com')).toBe(false);
    });
  });

  describe('B-03 password length bounds', () => {
    it('rejects short, long and control-character passwords', () => {
      expect(isValidAuthPassword('12345')).toBe(false);
      expect(isValidAuthPassword('x'.repeat(AUTH_PASSWORD_MAX_LENGTH + 1))).toBe(false);
      expect(isValidAuthPassword('12345\n6')).toBe(false);
      expect(isValidAuthPassword('x'.repeat(AUTH_PASSWORD_MIN_LENGTH))).toBe(true);
      expect(getAuthCredentialIssue('a@b.com', '12345')).toBe('password_short');
      expect(
        getAuthCredentialIssue('a@b.com', 'x'.repeat(AUTH_PASSWORD_MAX_LENGTH + 1)),
      ).toBe('password_long');
    });
  });


  describe('B-04 register duplicate email', () => {
    it('rejects when email already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({ email: 'a@b.com', password: '123456' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('maps Prisma P2002 unique violation to BadRequestException', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue(makePrismaP2002Error());

      await expect(
        service.register({ email: 'a@b.com', password: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('B-05 default role DEPENDENT', () => {
    it('creates user as DEPENDENT when role omitted', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-id',
        email: 'new@b.com',
        role: 'DEPENDENT',
        name: null,
        roleSelected: false,
      });

      const out = await service.register({
        email: 'New@B.COM',
        password: '123456',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@b.com',
            role: 'DEPENDENT',
            roleSelected: false,
          }),
        }),
      );
      expect(out.access_token).toBe('signed-jwt');
      expect(out.user.role).toBe('DEPENDENT');
    });
  });

  describe('B-06 wrong password', () => {
    it('returns null when password does not match', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password: await bcrypt.hash('other', 4),
        role: 'DEPENDENT',
      });

      await expect(service.validateUser('a@b.com', 'wrong')).resolves.toBeNull();
    });

    it('returns null for empty/invalid email without hitting DB', async () => {
      await expect(service.validateUser('', 'pass')).resolves.toBeNull();
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('B-07 login OK', () => {
    it('returns access_token and user summary', async () => {
      const out = await service.login({
        id: 'u1',
        email: 'x@y.pl',
        role: 'CARETAKER',
        name: 'Ania',
        roleSelected: true,
      });

      expect(jwtSign).toHaveBeenCalledWith({
        email: 'x@y.pl',
        sub: 'u1',
        role: 'CARETAKER',
      });
      expect(out).toEqual({
        access_token: 'signed-jwt',
        user: {
          id: 'u1',
          email: 'x@y.pl',
          role: 'CARETAKER',
          name: 'Ania',
          roleSelected: true,
        },
      });
    });

    it('validateUser returns user without password when credentials match', async () => {
      const hash = await bcrypt.hash('secret12', 4);
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password: hash,
        role: 'DEPENDENT',
      });

      const result = await service.validateUser('a@b.com', 'secret12');
      expect(result).toMatchObject({ id: 'u1', email: 'a@b.com' });
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('B-08 Google login without verified email', () => {
    const prevGoogle = process.env.GOOGLE_CLIENT_ID;

    beforeEach(() => {
      process.env.GOOGLE_CLIENT_ID = 'test-google-client';
    });

    afterEach(() => {
      if (prevGoogle === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = prevGoogle;
    });

    it('rejects empty id token', async () => {
      await expect(service.loginWithGoogle('')).rejects.toThrow(BadRequestException);
    });

    it('rejects when Google payload has no email', async () => {
      verifyIdToken.mockResolvedValue({
        getPayload: () => ({ sub: 'google-sub-1' }),
      });

      await expect(service.loginWithGoogle('valid-looking-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects when Google email is not verified', async () => {
      verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-1',
          email: 'user@gmail.com',
          email_verified: false,
        }),
      });

      await expect(service.loginWithGoogle('valid-looking-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('logs in existing Google user when email verified', async () => {
      verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-1',
          email: 'User@Gmail.com',
          email_verified: true,
          name: 'Jan',
        }),
      });
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'user@gmail.com',
        googleId: 'google-sub-1',
        role: 'DEPENDENT',
        name: 'Jan',
        roleSelected: false,
      });

      const out = await service.loginWithGoogle('valid-looking-token');
      expect(out.access_token).toBe('signed-jwt');
      expect(out.isNewUser).toBe(false);
      expect(out.user.email).toBe('user@gmail.com');
    });
  });



  describe('B-09 auth rate limit [K]', () => {
    let guard: AuthRateLimitGuard;

    beforeEach(() => {
      guard = new AuthRateLimitGuard();
    });

    it('allows up to 10 login attempts then rejects', () => {
      const ctx = makeHttpContext('/auth/login');
      for (let i = 0; i < 10; i += 1) {
        expect(guard.canActivate(ctx)).toBe(true);
      }
      try {
        guard.canActivate(ctx);
        throw new Error('expected rate limit HttpException');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('allows up to 5 register attempts then rejects', () => {
      const ctx = makeHttpContext('/auth/register');
      for (let i = 0; i < 5; i += 1) {
        expect(guard.canActivate(ctx)).toBe(true);
      }
      expect(() => guard.canActivate(ctx)).toThrow(HttpException);
    });

    it('resets bucket after window expires', () => {
      const ctx = makeHttpContext('/auth/login', '198.51.100.20');
      const realNow = Date.now;
      let now = 1_000_000;
      Date.now = () => now;

      try {
        for (let i = 0; i < 10; i += 1) {
          expect(guard.canActivate(ctx)).toBe(true);
        }
        expect(() => guard.canActivate(ctx)).toThrow(HttpException);

        now += 60_001;
        expect(guard.canActivate(ctx)).toBe(true);
      } finally {
        Date.now = realNow;
      }
    });
  });


  describe('B-10 JWT secret fail-fast', () => {
    const prevSecret = process.env.JWT_SECRET;
    const prevExpires = process.env.JWT_EXPIRES_IN;

    afterEach(() => {
      if (prevSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = prevSecret;
      if (prevExpires === undefined) delete process.env.JWT_EXPIRES_IN;
      else process.env.JWT_EXPIRES_IN = prevExpires;
    });

    it('throws when JWT_SECRET missing', () => {
      delete process.env.JWT_SECRET;
      expect(() => resolveJwtSecret()).toThrow(/JWT_SECRET is required/);
    });

    it('returns trimmed secret', () => {
      process.env.JWT_SECRET = '  abc  ';
      expect(resolveJwtSecret()).toBe('abc');
    });

    it('defaults expiresIn to 7d', () => {
      delete process.env.JWT_EXPIRES_IN;
      expect(resolveJwtExpiresIn()).toBe('7d');
    });
  });
});
