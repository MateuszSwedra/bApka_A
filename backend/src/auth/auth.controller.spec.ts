import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('login throws when credentials invalid', async () => {
    authService.validateUser.mockResolvedValue(null);
    await expect(
      controller.login({ email: 'a@b.com', password: 'x' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login returns token when valid', async () => {
    authService.validateUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    authService.login.mockResolvedValue({ access_token: 'tok' });
    await expect(controller.login({ email: 'a@b.com', password: 'ok' })).resolves.toEqual({
      access_token: 'tok',
    });
  });

  it('register delegates to service', async () => {
    authService.register.mockResolvedValue({ access_token: 'new' });
    await expect(controller.register({ email: 'n@b.com', password: '123456' })).resolves.toEqual({
      access_token: 'new',
    });
  });
});
