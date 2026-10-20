import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { closeLiveApp, createLiveApp, LiveApp } from './helpers/app';
import { closeDbPool, resetDatabase } from './helpers/db';
import { authHeader, localHmNow, registerUser } from './helpers/auth';

describe('API live e2e — domain care flow', () => {
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

  it('caretaker pairs, manages meds/schedule, senior marks dose and SOS', async () => {
    const caretaker = await registerUser(app, {
      email: 'care.e2e@test.pl',
      role: 'CARETAKER',
    });
    const dependent = await registerUser(app, {
      email: 'dep.e2e@test.pl',
      role: 'DEPENDENT',
    });

    expect(caretaker.role).toBe('CARETAKER');
    expect(dependent.role).toBe('DEPENDENT');

    const pinRes = await request(app.getHttpServer())
      .post('/users/generate-pin')
      .set(authHeader(caretaker.accessToken))
      .expect(201);

    const pin = pinRes.body.pin as string;
    expect(pin).toMatch(/^\d{6}$/);

    await request(app.getHttpServer())
      .post('/users/pair-with-pin')
      .set(authHeader(dependent.accessToken))
      .send({ pin })
      .expect(201);

    const invRes = await request(app.getHttpServer())
      .post(`/inventory/${dependent.userId}`)
      .set(authHeader(caretaker.accessToken))
      .send({
        name: 'Aspirin E2E',
        type: 'MEDICATION',
        totalPills: 30,
        pillsPerDose: 1,
      })
      .expect(201);

    const inventoryId = invRes.body.id as string;
    expect(inventoryId).toBeTruthy();

    const time = localHmNow();
    const schedRes = await request(app.getHttpServer())
      .post(`/schedules/${dependent.userId}`)
      .set(authHeader(caretaker.accessToken))
      .send({
        inventoryId,
        medication: 'Aspirin E2E',
        time,
        dosage: '1',
        type: 'DAILY',
      })
      .expect(201);

    const scheduleId = schedRes.body.id as string;
    expect(scheduleId).toBeTruthy();

    const listRes = await request(app.getHttpServer())
      .get(`/schedules/user/${dependent.userId}`)
      .set(authHeader(caretaker.accessToken))
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(scheduleId);

    const markRes = await request(app.getHttpServer())
      .patch(`/schedules/logs/${scheduleId}/mark`)
      .set(authHeader(dependent.accessToken))
      .send({ status: 'TAKEN' })
      .expect(200);

    expect(['TAKEN', 'LATE']).toContain(markRes.body.status);

    const statsRes = await request(app.getHttpServer())
      .get(`/schedules/user/${dependent.userId}/stats`)
      .set(authHeader(caretaker.accessToken))
      .expect(200);

    expect(statsRes.body).toEqual(
      expect.objectContaining({
        range: expect.any(Object),
      }),
    );

    await request(app.getHttpServer())
      .delete(`/inventory/${inventoryId}`)
      .set(authHeader(caretaker.accessToken))
      .expect(200);

    const listAfter = await request(app.getHttpServer())
      .get(`/schedules/user/${dependent.userId}`)
      .set(authHeader(caretaker.accessToken))
      .expect(200);
    expect(listAfter.body).toHaveLength(0);

    const sosRes = await request(app.getHttpServer())
      .post('/users/me/sos')
      .set(authHeader(dependent.accessToken))
      .send({ note: 'e2e sos' })
      .expect(201);

    expect(sosRes.body.id).toBeTruthy();
    expect(sosRes.body.userId).toBe(dependent.userId);

    const sosList = await request(app.getHttpServer())
      .get(`/users/${dependent.userId}/sos`)
      .set(authHeader(caretaker.accessToken))
      .expect(200);

    expect(Array.isArray(sosList.body)).toBe(true);
    expect(sosList.body.length).toBeGreaterThanOrEqual(1);
    expect(sosList.body[0].note).toBe('e2e sos');
  });
});
