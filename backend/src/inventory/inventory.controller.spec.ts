import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  const inventoryService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    calculateDepletion: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: inventoryService }],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  it('getDepletion delegates to service with actor', async () => {
    inventoryService.calculateDepletion.mockResolvedValue({
      daysLeft: 7,
      pillsLeft: 14,
    });
    await expect(
      controller.getDepletion(
        { user: { userId: 'actor-1', email: 'a@b.pl', role: 'CARETAKER' } },
        'inv-1',
      ),
    ).resolves.toEqual({
      daysLeft: 7,
      pillsLeft: 14,
    });
    expect(inventoryService.calculateDepletion).toHaveBeenCalledWith(
      'actor-1',
      'inv-1',
    );
  });

  it('findAll filters by user with actor', async () => {
    inventoryService.findAll.mockResolvedValue([]);
    await controller.findAll(
      { user: { userId: 'actor-1', email: 'a@b.pl', role: 'CARETAKER' } },
      'user-1',
    );
    expect(inventoryService.findAll).toHaveBeenCalledWith('actor-1', 'user-1');
  });
});
