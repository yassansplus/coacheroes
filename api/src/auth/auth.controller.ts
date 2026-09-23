import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, Length, Matches } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard, type AuthRequest } from './auth.guard';
import { AuthService } from './auth.service';
class AppleLoginDto {
  @IsString() @Length(50, 10000) identityToken!: string;
  @IsOptional() @IsString() @Length(1, 60) firstName?: string;
  @Matches(/^[a-f0-9]{64}$/) nonce!: string;
}
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('apple/challenge') @Throttle({ default: { limit: 10, ttl: 60_000 } })
  challenge() { return this.auth.challenge(); }
  @Post('apple') @Throttle({ default: { limit: 10, ttl: 60_000 } })
  signIn(@Body() body: AppleLoginDto) { return this.auth.signIn(body.identityToken, body.nonce, body.firstName); }
  @Get('me') @UseGuards(AuthGuard)
  me(@Req() req: AuthRequest) { return this.auth.me(req.session.userId); }
  @Post('logout') @HttpCode(204) @UseGuards(AuthGuard)
  signOut(@Req() req: AuthRequest) { return this.auth.signOut(req.session); }
}
