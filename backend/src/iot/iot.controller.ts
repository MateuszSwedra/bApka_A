import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeviceAuthGuard } from './device-auth.guard';
import { IotService } from './iot.service';
import { PrepareDeviceDto } from './dto/prepare-device.dto';
import { ClaimDeviceDto } from './dto/claim-device.dto';
import { DeviceMarkDoseDto } from './dto/device-mark-dose.dto';
import { DeviceMoodDto } from './dto/device-mood.dto';
import { DeviceSosDto } from './dto/device-sos.dto';

@ApiTags('iot')
@Controller('iot')
export class IotController {
  constructor(private readonly iot: IotService) {}

  // ——— Opiekun (JWT) ———

  @Post('devices/prepare')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Przygotuj urządzenie ESP32 (wirtualny DEPENDENT + claim token)',
  })
  prepare(@Request() req: any, @Body() body: PrepareDeviceDto) {
    return this.iot.prepareDevice(req.user.userId, body?.name);
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista urządzeń opiekuna' })
  list(@Request() req: any) {
    return this.iot.listDevices(req.user.userId);
  }

  @Delete('devices/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Usuń urządzenie i wirtualne konto DEPENDENT' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.iot.deleteDevice(req.user.userId, id);
  }

  // ——— Public claim (firmware po SoftAP) ———

  @Post('devices/claim')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Claim urządzenia (claimToken → deviceSecret, jednorazowo)',
  })
  claim(@Body() body: ClaimDeviceDto) {
    return this.iot.claimDevice(body.claimToken, body.publicId);
  }

  // ——— Urządzenie (Bearer deviceSecret) ———

  @Get('device/me/state')
  @UseGuards(DeviceAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stan dnia: dawki, alarm, nastrój' })
  state(@Request() req: any) {
    return this.iot.getDeviceState(req.device);
  }

  @Post('device/me/doses/:scheduleId/mark')
  @UseGuards(DeviceAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Potwierdź / pomiń dawkę (reuse markDose)' })
  markDose(
    @Request() req: any,
    @Param('scheduleId') scheduleId: string,
    @Body() body: DeviceMarkDoseDto,
  ) {
    return this.iot.markDoseFromDevice(
      req.device,
      scheduleId,
      body.status,
      body.clientEventId,
    );
  }

  @Post('device/me/mood')
  @UseGuards(DeviceAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Zapisz nastrój z urządzenia' })
  mood(@Request() req: any, @Body() body: DeviceMoodDto) {
    return this.iot.moodFromDevice(req.device, body.mood, body.clientEventId);
  }

  @Post('device/me/sos')
  @UseGuards(DeviceAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'SOS z urządzenia → FCM opiekuna' })
  sos(@Request() req: any, @Body() body: DeviceSosDto) {
    return this.iot.sosFromDevice(req.device, body.note, body.clientEventId);
  }
}
