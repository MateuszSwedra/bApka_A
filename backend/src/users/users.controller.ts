import { Controller, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
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

  @Post('pair')
  @ApiOperation({ summary: 'Pair caretaker with dependent using dependent email' })
  pairDependent(@Request() req: any, @Body('dependentEmail') dependentEmail: string) {
    return this.usersService.pairDependent(req.user.userId, dependentEmail);
  }

  @Patch('me/fcm-token')
  @ApiOperation({ summary: 'Update push notification token' })
  updateFcmToken(@Request() req: any, @Body('fcmToken') fcmToken: string) {
    return this.usersService.updateFcmToken(req.user.userId, fcmToken);
  }
}
