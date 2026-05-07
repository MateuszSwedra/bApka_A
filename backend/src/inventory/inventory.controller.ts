import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Create new inventory item for user' })
  create(@Param('userId') userId: string, @Body() createInventoryDto: any) {
    return this.inventoryService.create(userId, createInventoryDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all inventory items for user' })
  findAll(@Param('userId') userId: string) {
    return this.inventoryService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by id' })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }
  
  @Get(':id/depletion')
  @ApiOperation({ summary: 'Calculate depletion date for inventory item' })
  getDepletion(@Param('id') id: string) {
    return this.inventoryService.calculateDepletion(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory item' })
  update(@Param('id') id: string, @Body() updateInventoryDto: any) {
    return this.inventoryService.update(id, updateInventoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory item' })
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
