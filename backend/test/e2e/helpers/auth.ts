import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';

export type AuthSession = {
  accessToken: string;
  userId: string;
  email: string;
  role: string;
};

type Role = 'CARETAKER' | 'DEPENDENT' | 'HYBRID';

export async function registerUser(
  app: INestApplication<App>,
  opts: { email: string; password?: string; role: Role },
): Promise<AuthSession> {
  const password = opts.password ?? 'secret99';
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email: opts.email, password, role: opts.role })
    .expect(201);

  expect(res.body.access_token).toEqual(expect.any(String));
  expect(res.body.user.id).toEqual(expect.any(String));

  return {
    accessToken: res.body.access_token as string,
    userId: res.body.user.id as string,
    email: res.body.user.email as string,
    role: res.body.user.role as string,
  };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/** Lokalne HH:mm w strefie procesu (APP_TIMEZONE / TZ). */
export function localHmNow(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
