import { DailyModule } from './daily/daily.module';
import { CoachModule } from './coach/coach.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { WorkoutModule } from './workouts/workout.module';
import { ChatModule } from './chat/chat.module';
import { ProgramModule } from './program/program.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { validateEnvironment } from './config/environment.validation';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnvironment,
    }),
    DatabaseModule, DailyModule, WorkoutModule, AuthModule, OnboardingModule, ProgramModule, ChatModule, NutritionModule, CoachModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  controllers: [AppController],
})
export class AppModule {}
