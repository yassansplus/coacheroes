import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AppleVerifier } from './apple-verifier';
@Module({ controllers: [AuthController], providers: [AuthService, AuthGuard, AppleVerifier], exports: [AuthGuard, AuthService] })
export class AuthModule {}
