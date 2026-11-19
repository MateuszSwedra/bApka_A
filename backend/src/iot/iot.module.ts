import { Module } from '@nestjs/common';
import { IotController } from './iot.controller';
import { IotService } from './iot.service';
import { DeviceAuthGuard } from './device-auth.guard';
import { UsersModule } from '../users/users.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, UsersModule, SchedulesModule],
  controllers: [IotController],
  providers: [IotService, DeviceAuthGuard],
  exports: [IotService],
})
export class IotModule {}
