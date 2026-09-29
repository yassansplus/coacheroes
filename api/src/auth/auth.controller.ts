import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsIn, Length, Matches } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard, type AuthRequest } from './auth.guard';
import { AuthService } from './auth.service';
class AppleLoginDto {
  @IsOptional() @IsIn(['fr', 'en', 'nl']) language?: 'fr' | 'en' | 'nl';
  @IsString() @Length(50, 10000) identityToken!: string;
  @IsOptional() @IsString() @Length(1, 60) firstName?: string;
  @Matches(/^[a-f0-9]{64}$/) nonce!: string;
}
class LanguageDto { @IsIn(['fr', 'en', 'nl']) language!: 'fr' | 'en' | 'nl'; }
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('apple/challenge') @Throttle({ default: { limit: 10, ttl: 60_000 } })
  challenge() { return this.auth.challenge(); }
  @Post('apple') @Throttle({ default: { limit: 10, ttl: 60_000 } })
  signIn(@Body() body: AppleLoginDto) { return this.auth.signIn(body.identityToken, body.nonce, body.firstName, body.language); }
  @Get('me') @UseGuards(AuthGuard)
  me(@Req() req: AuthRequest) { return this.auth.me(req.session.userId); }
  @Post('language') @UseGuards(AuthGuard)
  language(@Req() req: AuthRequest, @Body() body: LanguageDto) { return this.auth.setLanguage(req.session.userId, body.language); }
  @Post('logout') @HttpCode(204) @UseGuards(AuthGuard)
  signOut(@Req() req: AuthRequest) { return this.auth.signOut(req.session); }
}
