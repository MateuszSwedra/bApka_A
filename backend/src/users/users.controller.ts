import { Controller, Patch, Post, Get, Delete, Body, UseGuards, Request, HttpCode, Param, Query } from '@nestjs/common';
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

  @Get('me')
  @ApiOperation({ summary: 'Current user (id, email, name, role)' })
  getMe(@Request() req: any) {
    return this.usersService.getProfile(req.user.userId);
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
  updateFcmToken(
    @Request() req: any,
    @Body('fcmToken') fcmToken: string,
    @Body('nativePushToken') nativePushToken?: string,
  ) {
    return this.usersService.updateFcmToken(req.user.userId, fcmToken, nativePushToken);
  }

  @Delete('me/fcm-token')
  @HttpCode(204)
  @ApiOperation({ summary: 'Clear push tokens (e.g. on logout)' })
  clearFcmToken(@Request() req: any) {
    return this.usersService.clearFcmToken(req.user.userId);
  }

  @Post('me/delete-account')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete my account and associated data' })
  deleteMe(@Request() req: any) {
    return this.usersService.deleteOwnAccount(req.user.userId);
  }

  @Post('me/dependents/:dependentId/delete-account')
  @HttpCode(200)
  @ApiOperation({ summary: 'Caretaker permanently deletes a paired dependent account' })
  deleteDependent(@Request() req: any, @Param('dependentId') dependentId: string) {
    return this.usersService.deleteDependentAccount(req.user.userId, dependentId);
  }

  @Post('me/dependents/:dependentId/unpair')
  @HttpCode(200)
  @ApiOperation({ summary: 'Caretaker unpairs a dependent (keeps both accounts)' })
  unpairDependent(@Request() req: any, @Param('dependentId') dependentId: string) {
    return this.usersService.unpairDependent(req.user.userId, dependentId);
  }

  @Patch('me/mood')
  @ApiOperation({ summary: 'Update senior mood' })
  updateMood(@Request() req: any, @Body('mood') mood: string) {
    return this.usersService.updateMood(req.user.userId, mood);
  }

  @Patch('me/name')
  @ApiOperation({ summary: 'Update display name (how we address you)' })
  updateDisplayName(@Request() req: any, @Body('name') name: string) {
    return this.usersService.updateDisplayName(req.user.userId, name);
  }

  @Patch('me/settings')
  @ApiOperation({ summary: 'Update user settings (e.g. moodEnabled)' })
  updateSettings(@Request() req: any, @Body() body: any) {
    return this.usersService.updateSettings(req.user.userId, body);
  }

  @Patch(':dependentId/settings')
  @ApiOperation({ summary: 'Caretaker updates dependent settings' })
  updateDependentSettings(
    @Request() req: any,
    @Param('dependentId') dependentId: string,
    @Body() body: any,
  ) {
    return this.usersService.updateDependentSettingsByCaretaker(
      req.user.userId,
      dependentId,
      body,
    );
  }

  @Get(':id/moods')
  @ApiOperation({ summary: 'Get mood history for a user in given range' })
  getMoodHistory(
    @Request() req: any,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const end = to ? new Date(to) : now;
    const start = from ? new Date(from) : new Date(end.getTime());

    if (!from) {
      start.setDate(start.getDate() - 30);
    }

    return this.usersService.getMoodHistory(req.user.userId, id, start, end);
  }

  @Post('me/sos')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create SOS event (senior)' })
  createSos(@Request() req: any, @Body('note') note?: string) {
    return this.usersService.createSosLog(req.user.userId, note);
  }

  @Get(':id/sos')
  @ApiOperation({ summary: 'List SOS events in range' })
  listSos(
    @Request() req: any,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const end = to ? new Date(to) : now;
    const start = from ? new Date(from) : new Date(end.getTime());
    if (!from) start.setDate(start.getDate() - 30);
    return this.usersService.listSosLogs(req.user.userId, id, start, end);
  }

  @Post('me/metrics')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create health metric entry (senior)' })
  createMetric(@Request() req: any, @Body() body: any) {
    return this.usersService.createHealthMetricLog(req.user.userId, body);
  }

  @Get(':id/metrics')
  @ApiOperation({ summary: 'List health metrics in range' })
  listMetrics(
    @Request() req: any,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
  ) {
    const now = new Date();
    const end = to ? new Date(to) : now;
    const start = from ? new Date(from) : new Date(end.getTime());
    if (!from) start.setDate(start.getDate() - 30);
    return this.usersService.listHealthMetricLogs(req.user.userId, id, start, end, type);
  }

  @Post('me/name')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update display name (POST alias, same path as PATCH)' })
  updateDisplayNamePostOnNamePath(@Request() req: any, @Body('name') name: string) {
    return this.usersService.updateDisplayName(req.user.userId, name);
  }

  @Post('me/display-name')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update display name (POST alias, hyphen path)' })
  updateDisplayNamePost(@Request() req: any, @Body('name') name: string) {
    return this.usersService.updateDisplayName(req.user.userId, name);
  }
}
