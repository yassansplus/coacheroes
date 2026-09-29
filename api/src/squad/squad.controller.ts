import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard';
import { actionSchema, challengeSchema, createGroupSchema, decisionSchema, idSchema, inviteSchema, preferenceSchema, renameGroupSchema, tokenSchema, transferSchema } from './squad.schema';
import { SquadService } from './squad.service';

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException(result.error.issues[0]?.message ?? 'Donnée invalide.');
  return result.data;
};

@Controller('squad') @UseGuards(AuthGuard)
export class SquadController {
  constructor(private readonly squad: SquadService) {}
  @Get() overview(@Req() req: AuthRequest) { return this.squad.overview(req.session.userId); }
  @Get('avatars/:id/:kind') async avatar(@Req() req: AuthRequest, @Param('id') id: string,
    @Param('kind') kind: string, @Res() res: Response) {
    const image = await this.squad.avatarImage(req.session.userId, parse(idSchema, id), parse(z.enum(['source', 'generated']), kind));
    res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(image);
  }
  @Get('invitations') invitations(@Req() req: AuthRequest) { return this.squad.invitations(req.session.userId); }
  @Post('invitations') invite(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.squad.createInvitation(req.session.userId, parse(inviteSchema, body));
  }
  @Post('invitations/claim/:token') claim(@Req() req: AuthRequest, @Param('token') token: string) {
    return this.squad.claim(req.session.userId, parse(tokenSchema, token));
  }
  @Post('invitations/:id/resolve') resolve(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.squad.resolve(req.session.userId, parse(idSchema, id), parse(decisionSchema, body).accept);
  }
  @Post('groups') createGroup(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.squad.createGroup(req.session.userId, parse(createGroupSchema, body));
  }
  @Get('groups/:id') group(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.squad.group(req.session.userId, parse(idSchema, id));
  }
  @Patch('groups/:id') renameGroup(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.squad.renameGroup(req.session.userId, parse(idSchema, id), parse(renameGroupSchema, body));
  }
  @Post('groups/:id/transfer') transfer(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.squad.transfer(req.session.userId, parse(idSchema, id), parse(transferSchema, body));
  }
  @Post('groups/:id/leave') leave(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.squad.leave(req.session.userId, parse(idSchema, id), parse(actionSchema, body));
  }
  @Post('groups/:id/challenges') challenge(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.squad.createChallenge(req.session.userId, parse(idSchema, id), parse(challengeSchema, body));
  }
  @Put('preferences') preferences(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.squad.preferences(req.session.userId, parse(preferenceSchema, body));
  }
  @Post('friends/:id/remove') removeFriend(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.squad.removeFriend(req.session.userId, parse(idSchema, id), parse(actionSchema, body));
  }
}
