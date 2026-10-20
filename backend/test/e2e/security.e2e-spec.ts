import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { closeLiveApp, createLiveApp, LiveApp } from './helpers/app';
import { closeDbPool, resetDatabase } from './helpers/db';
import { authHeader, registerUser } from './helpers/auth';

describe('API live e2e — security', () => {
  let live: LiveApp;
  let app: INestApplication<App>;

  beforeAll(async () => {
    live = await createLiveApp();
    app = live.app;
  });

  afterAll(async () => {
    await closeLiveApp(live);
    await closeDbPool();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('rejects schedules without Authorization', async () => {
    const dependent = await registerUser(app, {
      email: 'sec.dep@test.pl',
      role: 'DEPENDENT',
    });

    await request(app.getHttpServer())
      .get(`/schedules/user/${dependent.userId}`)
      .expect((res) => {
        expect([401, 403]).toContain(res.status);
      });
  });

  it('forbids unpaired caretaker from creating schedule for dependent', async () => {
    const stranger = await registerUser(app, {
      email: 'sec.stranger@test.pl',
      role: 'CARETAKER',
    });
    const dependent = await registerUser(app, {
      email: 'sec.dep2@test.pl',
      role: 'DEPENDENT',
    });

    await request(app.getHttpServer())
      .post(`/schedules/${dependent.userId}`)
      .set(authHeader(stranger.accessToken))
      .send({ time: '08:00', medication: 'X', dosage: '1' })
      .expect(403);
  });

  it('forbids foreign user from deleting inventory', async () => {
    const owner = await registerUser(app, {
      email: 'sec.owner@test.pl',
      role: 'HYBRID',
    });
    const stranger = await registerUser(app, {
      email: 'sec.thief@test.pl',
      role: 'CARETAKER',
    });

    const inv = await request(app.getHttpServer())
      .post(`/inventory/${owner.userId}`)
      .set(authHeader(owner.accessToken))
      .send({ name: 'Private Med', totalPills: 10 })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/inventory/${inv.body.id}`)
      .set(authHeader(stranger.accessToken))
      .expect(403);
  });

  it('rejects invalid schedule time with 400', async () => {
    const hybrid = await registerUser(app, {
      email: 'sec.hybrid@test.pl',
      role: 'HYBRID',
    });

    await request(app.getHttpServer())
      .post(`/schedules/${hybrid.userId}`)
      .set(authHeader(hybrid.accessToken))
      .send({ time: '9am', medication: 'X' })
      .expect(400);
  });
});
