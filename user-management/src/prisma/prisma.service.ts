import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect(); // Connect to MongoDB
  }

  async onModuleDestroy() {
    await this.$disconnect(); // Disconnect from MongoDB when the application shuts down
  }
}
