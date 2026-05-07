import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async updateRole(userId: string, role: Role) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true }
    });
  }

  async pairDependent(caretakerId: string, dependentEmail: string) {
    const dependent = await this.prisma.user.findUnique({
      where: { email: dependentEmail }
    });
    
    if (!dependent || dependent.role !== 'DEPENDENT') {
      throw new NotFoundException('Dependent not found or invalid role');
    }

    return this.prisma.connection.create({
      data: {
        caretakerId,
        dependentId: dependent.id,
        isPaired: true
      }
    });
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
      select: { id: true, email: true }
    });
  }
}
