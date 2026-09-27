import { Controller, Get, Headers, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard';
import { ProfileAvatarService } from './profile-avatar.service';

@Controller('profile/avatar') @UseGuards(AuthGuard)
export class ProfileAvatarController {
  constructor(private readonly avatars: ProfileAvatarService) {}
  @Get() async get(@Req() req: AuthRequest, @Res() res: Response) {
    const avatar = await this.avatars.get(req.session.userId);
    return avatar ? res.json(avatar) : res.status(204).send();
  }
  @Post() @Throttle({ default: { limit: 3, ttl: 60000 } })
  upload(@Req() req: AuthRequest, @Headers('x-avatar-platform') platform?: string,
    @Headers('x-avatar-genre') genre?: string, @Headers('x-avatar-art-style') artStyle?: string) {
    return this.avatars.upload(req.session.userId, req.body as Buffer, { platform, genre, artStyle });
  }
  @Post('retry') @Throttle({ default: { limit: 5, ttl: 60000 } })
  retry(@Req() req: AuthRequest) { return this.avatars.retry(req.session.userId); }
  @Get('images/:id/:kind') async image(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string,
    @Param('kind') kind: string, @Res() res: Response) {
    if (kind !== 'source' && kind !== 'generated') return res.status(404).send();
    const image = await this.avatars.image(req.session.userId, id, kind);
    res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(image);
  }
}
