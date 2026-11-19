import { Test, TestingModule } from '@nestjs/testing';
import { IotController } from './iot.controller';
import { IotService } from './iot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeviceAuthGuard } from './device-auth.guard';

describe('IotController', () => {
  let controller: IotController;
  const iot = {
    prepareDevice: jest.fn(),
    listDevices: jest.fn(),
    deleteDevice: jest.fn(),
    claimDevice: jest.fn(),
    getDeviceState: jest.fn(),
    markDoseFromDevice: jest.fn(),
    moodFromDevice: jest.fn(),
    sosFromDevice: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IotController],
      providers: [{ provide: IotService, useValue: iot }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DeviceAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(IotController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('prepare passes caretaker id and name', async () => {
    iot.prepareDevice.mockResolvedValue({ deviceId: 'd1' });
    await controller.prepare(
      { user: { userId: 'c1' } },
      { name: 'Płytka' },
    );
    expect(iot.prepareDevice).toHaveBeenCalledWith('c1', 'Płytka');
  });

  it('claim passes token', async () => {
    iot.claimDevice.mockResolvedValue({ deviceSecret: 'sec' });
    await controller.claim({ claimToken: 'tok', publicId: 'ABCD' });
    expect(iot.claimDevice).toHaveBeenCalledWith('tok', 'ABCD');
  });

  it('sos uses device from request', async () => {
    const device = { id: 'dev-1' };
    iot.sosFromDevice.mockResolvedValue({ duplicate: false });
    await controller.sos(
      { device },
      { note: 'x', clientEventId: 'evt-1' },
    );
    expect(iot.sosFromDevice).toHaveBeenCalledWith(device, 'x', 'evt-1');
  });
});
