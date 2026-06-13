import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { UsersController } from '../../src/users/users.controller';
import { UsersService } from '../../src/users/users.service';
import { SchedulesController } from '../../src/schedules/schedules.controller';
import { SchedulesService } from '../../src/schedules/schedules.service';
import { InventoryController } from '../../src/inventory/inventory.controller';
import { InventoryService } from '../../src/inventory/inventory.service';
import { AppController } from '../../src/app.controller';
import { AppService } from '../../src/app.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { createPrismaMock } from '../helpers/prisma.mock';

/** Integracja HTTP z mockowaną bazą - bez PostgreSQL. */
describe('API (integration)', () => {
  let app: INestApplication<App>;
  const prisma = createPrismaMock();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AppController,
        AuthController,
        UsersController,
        SchedulesController,
        InventoryController,
      ],
      providers: [
        AppService,
        AuthService,
        UsersService,
        SchedulesService,
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('test-jwt-token') },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: { switchToHttp: () => { getRequest: () => object } }) => {
          const req = ctx.switchToHttp().getRequest() as { headers: Record<string, string> };
          const auth = req.headers?.authorization ?? '';
          if (auth === 'Bearer valid-token') {
            Object.assign(req, {
              user: { userId: 'user-1', email: 'u@test.pl', role: 'CARETAKER' },
            });
            return true;
          }
          return false;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('returns hello', () => {
      return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
    });
  });

  describe('POST /auth/register + /auth/login', () => {
    it('registers and returns token', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'reg@test.pl',
        role: 'DEPENDENT',
        name: null,
        password: 'hashed',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'reg@test.pl', password: 'secret99' })
        .expect(201);

      expect(res.body.access_token).toBe('test-jwt-token');
      expect(res.body.user.email).toBe('reg@test.pl');
    });

    it('login rejects bad credentials', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'x@y.pl', password: 'wrong' })
        .expect(401);
    });

    it('login succeeds with valid password', async () => {
      const hash = await bcrypt.hash('secret99', 4);
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'x@y.pl',
        password: hash,
        role: 'DEPENDENT',
        name: 'Jan',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'x@y.pl', password: 'secret99' })
        .expect(201);

      expect(res.body.user.name).toBe('Jan');
    });
  });

  describe('Users (authenticated)', () => {
    it('GET /users/me returns profile', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'u@test.pl',
        name: 'Opiekun',
        role: 'CARETAKER',
        moodEnabled: true,
      });

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body.name).toBe('Opiekun');
    });

    it('GET /users/me without token is forbidden', () => {
      return request(app.getHttpServer()).get('/users/me').expect(403);
    });

    it('POST /users/generate-pin returns pin', async () => {
      prisma.connection.create.mockImplementation(({ data }: { data: { pin: string } }) =>
        Promise.resolve({ pin: data.pin }),
      );

      const res = await request(app.getHttpServer())
        .post('/users/generate-pin')
        .set('Authorization', 'Bearer valid-token')
        .expect(201);

      expect(res.body.pin).toMatch(/^\d{6}$/);
    });
  });

  describe('Schedules', () => {
    it('POST /schedules/:userId creates schedule', async () => {
      prisma.schedule.create.mockResolvedValue({
        id: 's1',
        userId: 'dep-1',
        time: '09:00',
      });

      const res = await request(app.getHttpServer())
        .post('/schedules/dep-1')
        .send({ time: '09:00', medication: 'Vitamin D' })
        .expect(201);

      expect(res.body.id).toBe('s1');
    });

    it('PATCH /schedules/logs/:id/mark marks dose', async () => {
      prisma.doseLog.findFirst.mockResolvedValue(null);
      prisma.doseLog.create.mockResolvedValue({ id: 'log-1', status: 'TAKEN' });

      await request(app.getHttpServer())
        .patch('/schedules/logs/sched-1/mark')
        .send({ status: 'TAKEN' })
        .expect(200);
    });
  });

  describe('Inventory', () => {
    it('POST /inventory/:userId creates item', async () => {
      prisma.inventory.create.mockResolvedValue({
        id: 'inv-1',
        name: 'Aspirin',
      });

      const res = await request(app.getHttpServer())
        .post('/inventory/user-1')
        .send({ name: 'Aspirin', totalPills: 30 })
        .expect(201);

      expect(res.body.name).toBe('Aspirin');
    });

    it('GET /inventory/:id/depletion returns calculation', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        currentPills: 10,
        totalPills: 10,
        schedules: [],
      });

      const res = await request(app.getHttpServer())
        .get('/inventory/inv-1/depletion')
        .expect(200);

      expect(res.body.daysLeft).toBe(999);
    });
  });
});
