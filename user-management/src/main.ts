import { NestFactory } from '@nestjs/core';
import { AppModule } from './user-management.module';
import * as dotenv from 'dotenv';

dotenv.config();

const defaultPort = parseInt(process.env.PORT, 10) || 3000;  // Default port from .env or fallback to 3000

async function bootstrap() {
  const app = await NestFactory.create(AppModule);  // Create the Nest application without HTTPS

  await app.listen(defaultPort);  // Listen on the static port
  console.log(`User Management is running on port ${defaultPort} (HTTP)`);
}

bootstrap();
