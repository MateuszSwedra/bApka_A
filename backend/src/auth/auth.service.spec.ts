import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test/helpers/prisma.mock';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = createPrismaMock();
  const jwtSign = jest.fn().mockReturnValue('signed-jwt');

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jwtSign } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('returns null for empty email', async () => {
      await expect(service.validateUser('', 'pass')).resolves.toBeNull();
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('returns user without password when credentials match', async () => {
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

    it('returns null when password does not match', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password: await bcrypt.hash('other', 4),
        role: 'DEPENDENT',
      });
      await expect(service.validateUser('a@b.com', 'wrong')).resolves.toBeNull();
    });
  });

  describe('login', () => {
    it('returns access_token and user summary', async () => {
      const out = await service.login({
        id: 'u1',
        email: 'x@y.pl',
        role: 'CARETAKER',
        name: 'Ania',
      });
      expect(jwtSign).toHaveBeenCalledWith({
        email: 'x@y.pl',
        sub: 'u1',
        role: 'CARETAKER',
      });
      expect(out).toEqual({
        access_token: 'signed-jwt',
        user: { id: 'u1', email: 'x@y.pl', role: 'CARETAKER', name: 'Ania' },
      });
    });
  });

  describe('register', () => {
    it('rejects invalid email', async () => {
      await expect(service.register({ email: 'bad', password: '123456' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects short password', async () => {
      await expect(
        service.register({ email: 'a@b.com', password: '123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate email', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({ email: 'a@b.com', password: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates user and returns login payload', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-id',
        email: 'new@b.com',
        role: 'DEPENDENT',
        name: null,
      });

      const out = await service.register({
        email: 'New@B.COM',
        password: '123456',
        role: 'CARETAKER',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@b.com',
            role: 'CARETAKER',
          }),
        }),
      );
      expect(out.access_token).toBe('signed-jwt');
      expect(out.user.id).toBe('new-id');
    });

    it('maps Prisma unique violation to BadRequestException', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      const err = new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      });
      prisma.user.create.mockRejectedValue(err);

      await expect(
        service.register({ email: 'a@b.com', password: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
