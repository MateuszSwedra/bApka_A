import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private client: PrismaClient;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    this.client = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  get user() { return this.client.user; }
  get inventory() { return this.client.inventory; }
  get schedule() { return this.client.schedule; }
  get doseLog() { return this.client.doseLog; }
  get moodLog() { return this.client.moodLog; }
  get connection() { return this.client.connection; }
  get sosLog() { return this.client.sosLog; }
  get healthMetricLog() { return this.client.healthMetricLog; }
}
