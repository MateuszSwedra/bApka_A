import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test/helpers/prisma.mock';

describe('JwtStrategy', () => {
  const prisma = createPrismaMock();
  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(prisma as unknown as PrismaService);
  });

  it('returns user payload when user exists', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      role: 'DEPENDENT',
    });
    await expect(strategy.validate({ sub: 'u1' })).resolves.toEqual({
      userId: 'u1',
      email: 'a@b.com',
      role: 'DEPENDENT',
    });
  });

  it('throws when user missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 'missing' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
