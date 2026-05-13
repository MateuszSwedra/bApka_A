import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

function normalizeEmail(email: unknown): string {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  private parseOptionalRole(raw: unknown): Role {
    if (raw === 'CARETAKER' || raw === 'DEPENDENT' || raw === 'HYBRID') {
      return raw;
    }
    return Role.DEPENDENT;
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const trimmed = typeof email === 'string' ? email.trim() : '';
    if (!trimmed) return null;
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: trimmed, mode: 'insensitive' } },
    });
    if (user && user.password && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    };
  }

  async register(data: any) {
    const email = normalizeEmail(data?.email);
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Podaj prawidłowy adres e-mail.');
    }

    const password = data?.password;
    if (typeof password !== 'string' || password.length < 6) {
      throw new BadRequestException('Hasło musi mieć co najmniej 6 znaków.');
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) {
      throw new BadRequestException(
        'Na ten adres e-mail jest już założone konto. Zaloguj się lub użyj innego adresu.',
      );
    }

    const role = this.parseOptionalRole(data?.role);

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
        },
      });
      return this.login(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException(
          'Na ten adres e-mail jest już założone konto. Zaloguj się lub użyj innego adresu.',
        );
      }
      throw e;
    }
  }
}
