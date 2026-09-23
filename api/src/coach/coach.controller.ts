import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard';
import { CoachService } from './coach.service';

const sendSchema = z.strictObject({ conversationId: z.uuid().nullable(), requestId: z.uuid(), text: z.string().trim().min(1).max(2000), localDate: z.iso.date() });
const decisionSchema = z.strictObject({ decision: z.enum(['applied', 'declined']) });
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException('Vérifie le message envoyé au coach.');
  return result.data;
}
@Controller('coach') @UseGuards(AuthGuard)
export class CoachController {
  constructor(private readonly coach: CoachService) {}
  @Get('conversations') list(@Req() req: AuthRequest) { return this.coach.list(req.session.userId); }
  @Get('conversations/:id') get(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.coach.get(req.session.userId, id); }
  @Post('messages') @Throttle({ default: { limit: 12, ttl: 60000 } })
  send(@Req() req: AuthRequest, @Body() body: unknown) { const value = parse(sendSchema, body); return this.coach.send(req.session.userId, value.conversationId, value.requestId, value.text, value.localDate); }
  @Post('conversations/:id/proposals/:proposalId/decision')
  decide(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Param('proposalId', ParseUUIDPipe) proposalId: string, @Body() body: unknown) {
    return this.coach.decide(req.session.userId, id, proposalId, parse(decisionSchema, body).decision);
  }
}
