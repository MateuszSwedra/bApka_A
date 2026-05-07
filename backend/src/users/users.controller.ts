import { Controller, Patch, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/role')
  @ApiOperation({ summary: 'Update my role' })
  updateRole(@Request() req: any, @Body('role') role: Role) {
    return this.usersService.updateRole(req.user.userId, role);
  }

  @Post('generate-pin')
  @ApiOperation({ summary: 'Generate a pairing PIN for caretaker' })
  generatePin(@Request() req: any) {
    return this.usersService.generatePin(req.user.userId);
  }

  @Post('pair-with-pin')
  @ApiOperation({ summary: 'Dependent enters PIN to pair with caretaker' })
  pairWithPin(@Request() req: any, @Body('pin') pin: string) {
    return this.usersService.pairWithPin(req.user.userId, pin);
  }

  @Get('me/dependents')
  @ApiOperation({ summary: 'Get list of dependents for caretaker' })
  getDependents(@Request() req: any) {
    return this.usersService.getDependents(req.user.userId);
  }

  @Patch('me/fcm-token')
  @ApiOperation({ summary: 'Update push notification token' })
  updateFcmToken(@Request() req: any, @Body('fcmToken') fcmToken: string) {
    return this.usersService.updateFcmToken(req.user.userId, fcmToken);
  }
}
