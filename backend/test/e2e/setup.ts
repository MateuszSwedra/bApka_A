/**
 * Env dla live API e2e — musi być ustawione zanim załaduje się AuthModule (JWT_SECRET).
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'e2e-live-jwt-secret-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.APP_TIMEZONE = process.env.APP_TIMEZONE || 'Europe/Warsaw';
process.env.TZ = process.env.TZ || 'Europe/Warsaw';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://bapka_e2e:bapka_e2e@127.0.0.1:5434/bapka_e2e?schema=public';

// Bez pliku SA — FirebaseSosService tylko loguje warn i działa w trybie disabled.
delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

jest.mock('expo-server-sdk', () => {
  const ExpoMock = jest.fn().mockImplementation(() => ({
    chunkPushNotifications: (messages: unknown[]) => [messages],
    sendPushNotificationsAsync: jest.fn().mockResolvedValue([]),
  }));
  (ExpoMock as jest.Mock & { isExpoPushToken: jest.Mock }).isExpoPushToken = jest
    .fn()
    .mockReturnValue(true);
  return { Expo: ExpoMock, __esModule: true };
});
