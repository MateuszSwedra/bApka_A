import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

type AuthRequest = { user: { userId: string; email: string; role: string } };

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Create new inventory item for user' })
  create(
    @Request() req: AuthRequest,
    @Param('userId') userId: string,
    @Body() createInventoryDto: CreateInventoryDto,
  ) {
    return this.inventoryService.create(req.user.userId, userId, createInventoryDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all inventory items for user' })
  findAll(@Request() req: AuthRequest, @Param('userId') userId: string) {
    return this.inventoryService.findAll(req.user.userId, userId);
  }

  @Get(':id/depletion')
  @ApiOperation({ summary: 'Calculate depletion date for inventory item' })
  getDepletion(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.inventoryService.calculateDepletion(req.user.userId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by id' })
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.inventoryService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory item' })
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(req.user.userId, id, updateInventoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory item' })
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.inventoryService.remove(req.user.userId, id);
  }
}
