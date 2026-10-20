import { resolveJwtExpiresIn, resolveJwtSecret } from './jwt-secret';

describe('jwt-secret', () => {
  const prevSecret = process.env.JWT_SECRET;
  const prevExpires = process.env.JWT_EXPIRES_IN;

  afterEach(() => {
    process.env.JWT_SECRET = prevSecret;
    process.env.JWT_EXPIRES_IN = prevExpires;
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
