import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { IotService } from './iot.service';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly iot: IotService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = String(req.headers?.authorization || '');
    const match = /^Bearer\s+(.+)$/i.exec(header);
    const secret = match?.[1]?.trim();
    if (!secret) {
      throw new UnauthorizedException('Brak tokenu urządzenia');
    }

    const device = await this.iot.findDeviceBySecret(secret);
    if (!device) {
      throw new UnauthorizedException('Nieprawidłowy token urządzenia');
    }

    req.device = device;
    return true;
  }
}
