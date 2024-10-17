import { Module } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { UserManagementController } from './user-management.controller';
import { PrismaService } from './prisma/prisma.service'; // Assuming Prisma for DB
import { HttpModule } from '@nestjs/axios'; // Import HttpModule

@Module({
  imports: [
    HttpModule, // Include HttpModule for HTTP requests
  ],
  controllers: [UserManagementController],
  providers: [UserManagementService, PrismaService],
})
export class AppModule {}
