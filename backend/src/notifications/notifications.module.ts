import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FirebaseSosService } from './firebase-sos.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [NotificationsService, FirebaseSosService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
