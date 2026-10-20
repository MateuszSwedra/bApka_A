import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { NotificationsService } from '../../../src/notifications/notifications.service';
import { FirebaseSosService } from '../../../src/notifications/firebase-sos.service';
import { CronService } from '../../../src/cron/cron.service';

export type LiveApp = {
  app: INestApplication;
  moduleRef: TestingModule;
};

const notificationsMock = {
  formatMedName: jest.fn((s: { medication?: string | null }) => s.medication || 'lek'),
  formatUserName: jest.fn((u: { name?: string | null; email?: string | null }) =>
    u.name || u.email || 'User',
  ),
  notifyDoseTaken: jest.fn().mockResolvedValue(undefined),
  notifyDoseMissed: jest.fn().mockResolvedValue(undefined),
  notifyDependentDataChanged: jest.fn().mockResolvedValue(undefined),
  processInventoryAlerts: jest.fn().mockResolvedValue(undefined),
  notifySos: jest.fn().mockResolvedValue(undefined),
  notifyMood: jest.fn().mockResolvedValue(undefined),
};

const firebaseMock = {
  onModuleInit: jest.fn(),
  sendSosAlarm: jest.fn().mockResolvedValue({ sent: false }),
};

const cronMock = {
  handleMedicationReminders: jest.fn(),
  handleMoodCheckReminders: jest.fn(),
  markMissedDoses: jest.fn(),
  handleInventoryAlerts: jest.fn(),
};

/**
 * Pełny AppModule + prawdziwy JWT/Prisma; cron i push nadpisane stubami.
 * Wymaga JWT_SECRET / DATABASE_URL z test/e2e/setup.ts (setupFiles).
 */
export async function createLiveApp(): Promise<LiveApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(NotificationsService)
    .useValue(notificationsMock)
    .overrideProvider(FirebaseSosService)
    .useValue(firebaseMock)
    .overrideProvider(CronService)
    .useValue(cronMock)
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();

  return { app, moduleRef };
}

export async function closeLiveApp(live: LiveApp | undefined): Promise<void> {
  if (live?.app) {
    await live.app.close();
  }
}
