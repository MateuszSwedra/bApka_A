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

  async generatePin(caretakerId: string) {
    // Usunięcie starych, niesparowanych połączeń dla tego opiekuna
    await this.prisma.connection.deleteMany({
      where: {
        caretakerId,
        isPaired: false
      }
    });

    // Generowanie 6-cyfrowego kodu
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    const connection = await this.prisma.connection.create({
      data: {
        caretakerId,
        pin,
        isPaired: false
      }
    });

    return { pin };
  }

  async pairWithPin(dependentId: string, pin: string) {
    const dependent = await this.prisma.user.findUnique({
      where: { id: dependentId }
    });

    if (!dependent || dependent.role !== 'DEPENDENT') {
      throw new NotFoundException('Only dependents can use a pairing PIN');
    }

    const connection = await this.prisma.connection.findUnique({
      where: { pin }
    });

    if (!connection || connection.isPaired) {
      throw new NotFoundException('Invalid or expired PIN');
    }

    return this.prisma.connection.update({
      where: { id: connection.id },
      data: {
        dependentId: dependent.id,
        isPaired: true,
        pin: null // Clear the pin after successful pairing
      }
    });
  }

  async getDependents(caretakerId: string) {
    const connections = await this.prisma.connection.findMany({
      where: {
        caretakerId,
        isPaired: true
      },
      include: {
        dependent: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        }
      }
    });
    
    return connections.map(conn => conn.dependent);
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
      select: { id: true, email: true }
    });
  }
}
