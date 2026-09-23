import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard';
import { ChatService } from './chat.service';
@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}
  @Post('onboarding') prepare(@Req() req: AuthRequest) { return this.chat.prepare(req.session.userId); }
  @Get(':id') get(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.chat.get(req.session.userId, id); }
  @Post(':id/messages') @Throttle({ default: { limit: 12, ttl: 60000 } })
  send(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    const parsed = z.strictObject({ requestId: z.uuid(), text: z.string().trim().min(1).max(2000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException('Écris un message de 1 à 2 000 caractères.');
    return this.chat.send(req.session.userId, id, parsed.data.requestId, parsed.data.text);
  }
}
