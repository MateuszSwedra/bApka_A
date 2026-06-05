import { Controller, Patch, Post, Get, Body, UseGuards, Request, HttpCode, Param, Query } from '@nestjs/common';
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
  updateFcmToken(@Request() req: any, @Body('fcmToken') fcmToken: string) {
    return this.usersService.updateFcmToken(req.user.userId, fcmToken);
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

  @Get(':id/moods')
  @ApiOperation({ summary: 'Get mood history for a user in given range' })
  getMoodHistory(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const end = to ? new Date(to) : now;
    const start = from ? new Date(from) : new Date(end.getTime());

    if (!from) {
      // domyślnie ostatnie 30 dni
      start.setDate(start.getDate() - 30);
    }

    return this.usersService.getMoodHistory(id, start, end);
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
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const end = to ? new Date(to) : now;
    const start = from ? new Date(from) : new Date(end.getTime());
    if (!from) start.setDate(start.getDate() - 30);
    return this.usersService.listSosLogs(id, start, end);
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
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
  ) {
    const now = new Date();
    const end = to ? new Date(to) : now;
    const start = from ? new Date(from) : new Date(end.getTime());
    if (!from) start.setDate(start.getDate() - 30);
    return this.usersService.listHealthMetricLogs(id, start, end, type);
  }

  /** POST na tę samą ścieżkę co PATCH — niektóre wdrożenia / cache miały tylko PATCH. */
  @Post('me/name')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update display name (POST alias, same path as PATCH)' })
  updateDisplayNamePostOnNamePath(@Request() req: any, @Body('name') name: string) {
    return this.usersService.updateDisplayName(req.user.userId, name);
  }

  /** POST — alternatywna ścieżka (np. starszy klient). */
  @Post('me/display-name')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update display name (POST alias, hyphen path)' })
  updateDisplayNamePost(@Request() req: any, @Body('name') name: string) {
    return this.usersService.updateDisplayName(req.user.userId, name);
  }
}
