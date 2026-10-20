import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { MarkDoseDto } from './dto/mark-dose.dto';

type AuthRequest = { user: { userId: string; email: string; role: string } };

@ApiTags('schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Create schedule for user (self or paired dependent)' })
  create(
    @Request() req: AuthRequest,
    @Param('userId') userId: string,
    @Body() createScheduleDto: CreateScheduleDto,
  ) {
    return this.schedulesService.create(req.user.userId, userId, createScheduleDto);
  }

  @Get('user/:userId/logs')
  @ApiOperation({ summary: 'Dose logs for a calendar day' })
  getTodayDoseLogs(
    @Request() req: AuthRequest,
    @Param('userId') userId: string,
    @Query('date') date?: string,
  ) {
    return this.schedulesService.getTodayDoseLogs(req.user.userId, userId, date);
  }

  @Get('user/:userId/stats')
  @ApiOperation({ summary: 'Dose stats for a date range' })
  getDoseStats(
    @Request() req: AuthRequest,
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const end = to ? new Date(to) : now;
    const start = from ? new Date(from) : new Date(end.getTime());

    if (!from) {
      start.setDate(start.getDate() - 1);
    }

    return this.schedulesService.getDoseStats(req.user.userId, userId, start, end);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'List schedules for user' })
  findAll(@Request() req: AuthRequest, @Param('userId') userId: string) {
    return this.schedulesService.findAll(req.user.userId, userId);
  }

  @Patch('logs/:scheduleId/mark')
  @ApiOperation({ summary: 'Mark today dose as TAKEN or MISSED' })
  markDose(
    @Request() req: AuthRequest,
    @Param('scheduleId') scheduleId: string,
    @Body() body: MarkDoseDto,
  ) {
    return this.schedulesService.markDose(req.user.userId, scheduleId, body.status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule by id' })
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.schedulesService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update schedule' })
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(req.user.userId, id, updateScheduleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete schedule' })
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.schedulesService.remove(req.user.userId, id);
  }
}
