import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SchedulesService } from './schedules.service';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post(':userId')
  create(@Param('userId') userId: string, @Body() createScheduleDto: any) {
    return this.schedulesService.create(userId, createScheduleDto);
  }

  @Get('user/:userId')
  findAll(@Param('userId') userId: string) {
    return this.schedulesService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateScheduleDto: any) {
    return this.schedulesService.update(id, updateScheduleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(id);
  }

  @Get('user/:userId/logs')
  getTodayDoseLogs(@Param('userId') userId: string, @Query('date') date?: string) {
    return this.schedulesService.getTodayDoseLogs(userId, date);
  }

  @Get('user/:userId/stats')
  getDoseStats(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const end = to ? new Date(to) : now;
    const start = from ? new Date(from) : new Date(end.getTime());

    if (!from) {
      // domyślnie ostatnie 24h, jeśli zakres nie został podany z klienta
      start.setDate(start.getDate() - 1);
    }

    return this.schedulesService.getDoseStats(userId, start, end);
  }

  @Patch('logs/:scheduleId/mark')
  markDose(@Param('scheduleId') scheduleId: string, @Body('status') status: 'TAKEN' | 'MISSED') {
    return this.schedulesService.markDose(scheduleId, status);
  }
}
