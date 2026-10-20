process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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
