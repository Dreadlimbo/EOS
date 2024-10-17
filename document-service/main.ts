// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './document.module';
import { ValidationPipe } from '@nestjs/common';
const detect = require('detect-port'); 
let port: number;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();
  const defaultPort = 3000;

  try {
    port = await detect(defaultPort);
    await app.listen(port);
    console.log(`DOCUMENT is running on port ${port}`);
  } catch (err) {
    console.error('Error detecting port:', err);
  }
}

bootstrap();

export function getAppPort() {
  return port;
}
