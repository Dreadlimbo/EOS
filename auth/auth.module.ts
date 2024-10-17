import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { RedisModule } from '../redis/redis.module'; // Ensure the path is correct
import { RedisService } from '../redis/redis.service'; // Import the RedisService
import * as dotenv from 'dotenv';
dotenv.config();

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    RedisModule, // Import the RedisModule here
    HttpModule
  ],
  providers: [AuthService, PrismaService, RedisService], // Add RedisService to providers
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule {}
