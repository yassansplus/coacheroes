import 'reflect-metadata';
import { raw } from 'express';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const corsOrigin = config.getOrThrow<string>('CORS_ORIGIN');

  app.use('/api/onboarding/photos', raw({ type: 'application/octet-stream', limit: '8mb' }));
  app.use('/api/nutrition/photos', raw({ type: 'application/octet-stream', limit: '8mb' }));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin:
      corsOrigin === '*'
        ? true
        : corsOrigin.split(',').map((origin) => origin.trim()),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(config.getOrThrow<number>('PORT'));
}

void bootstrap();
