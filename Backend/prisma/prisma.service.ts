import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Prisma 7 bắt buộc driver adapter — dùng thẳng DATABASE_URL có sẵn trong .env,
    // không cần khai lại từng field (server/port/user/password) riêng lẻ
    const adapter = new PrismaMssql(process.env.DATABASE_URL!);

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to SQL Server (via adapter-mssql)');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}