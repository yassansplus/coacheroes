import { BadRequestException, Body, Controller, Get, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard';
import { GameService } from './game.service';
import { badgeTargets, type BadgeId } from './game.badges';

@Controller('game') @UseGuards(AuthGuard)
export class GameController {
  constructor(private readonly game: GameService) {}
  @Put('equipment')
  equip(@Req() req: AuthRequest, @Body() body: unknown) {
    const result = z.strictObject({
      frame: z.enum(['none', 'azur', 'cobalt']),
      title: z.enum(['none', 'confirmed', 'regular']),
      theme: z.enum(['light', 'violet']),
    }).safeParse(body);
    if (!result.success) throw new BadRequestException('Éléments invalides.');
    return this.game.equip(req.session.userId, result.data);
  }
  @Get()
  get(@Req() req: AuthRequest, @Query('after') after?: string) {
    const cursor = after === undefined ? null : /^\d{1,16}$/.test(after) ? Number(after) : null;
    return this.game.get(req.session.userId, cursor);
  }
  @Post('badges/celebrated')
  celebrate(@Req() req: AuthRequest, @Body() body: unknown) {
    const result = z.strictObject({ ids: z.array(z.enum(Object.keys(badgeTargets) as [BadgeId, ...BadgeId[]])).min(1).max(8) }).safeParse(body);
    if (!result.success) throw new BadRequestException('Badges invalides.');
    return this.game.celebrateBadges(req.session.userId, result.data.ids);
  }
}
