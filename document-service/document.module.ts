import { RedisService } from './redis/redis.service';
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { S3Service } from './s3/s3.service';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MulterModule.register({
      dest: './uploads', // Destination folder for files before being uploaded to S3
    }),
  ],
  controllers: [DocumentController],
  providers: [DocumentService,PrismaService,RedisService, S3Service],
})
export class AppModule {}

