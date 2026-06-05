import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    updateRole: jest.fn(),
    getProfile: jest.fn(),
    generatePin: jest.fn(),
    pairWithPin: jest.fn(),
    getDependents: jest.fn(),
    updateFcmToken: jest.fn(),
    updateMood: jest.fn(),
    updateDisplayName: jest.fn(),
    updateSettings: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('getMe returns profile for authenticated user', async () => {
    usersService.getProfile.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const req = { user: { userId: 'u1' } };
    await expect(controller.getMe(req)).resolves.toEqual({ id: 'u1', email: 'a@b.com' });
    expect(usersService.getProfile).toHaveBeenCalledWith('u1');
  });

  it('generatePin delegates to service', async () => {
    usersService.generatePin.mockResolvedValue({ pin: '123456' });
    const req = { user: { userId: 'c1' } };
    await expect(controller.generatePin(req)).resolves.toEqual({ pin: '123456' });
  });
});
