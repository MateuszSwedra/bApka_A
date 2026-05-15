import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, moodEnabled: true },
    });
    if (!user) {
      throw new NotFoundException('Użytkownik nie istnieje');
    }
    return user;
  }

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
            role: true,
            lastMood: true,
            lastMoodAt: true,
            moodEnabled: true,
          }
        }
      }
    });
    
    return connections.map(conn => conn.dependent);
  }

  async updateMood(userId: string, mood: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        lastMood: mood,
        lastMoodAt: new Date()
      },
      select: { id: true, lastMood: true, lastMoodAt: true }
    });
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
      select: { id: true, email: true }
    });
  }

  /** Imię / forma zwrotu — m.in. przy łączeniu kont i na liście podopiecznych. */
  async updateDisplayName(userId: string, name: string) {
    const trimmed = (name ?? '').trim();
    if (trimmed.length < 2) {
      throw new BadRequestException('Imię musi mieć co najmniej 2 znaki');
    }
    if (trimmed.length > 80) {
      throw new BadRequestException('Imię może mieć co najwyżej 80 znaków');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: trimmed },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async updateSettings(userId: string, settings: { moodEnabled?: boolean }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: settings,
      select: { id: true, moodEnabled: true },
    });
  }
}
