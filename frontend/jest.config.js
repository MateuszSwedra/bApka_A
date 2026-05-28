/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    '\\.(ogg|png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/__tests__/mocks/fileMock.js',
  },
  collectCoverageFrom: [
    'utils/**/*.ts',
    'i18n/**/*.ts',
    'constants/notificationSounds.ts',
    '!**/__tests__/**',
  ],
};
