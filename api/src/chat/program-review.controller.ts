import { BadRequestException, Body, Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard';
import { ProgramReviewService } from './program-review.service';
@Controller('program-review')
@UseGuards(AuthGuard)
export class ProgramReviewController {
  constructor(private readonly review: ProgramReviewService) {}
  @Post() open(@Req() req: AuthRequest) { return this.review.open(req.session.userId); }
  @Post(':id/messages') @Throttle({ default: { limit: 12, ttl: 60000 } })
  send(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    const parsed = z.strictObject({ requestId: z.uuid(), proposalId: z.uuid(), text: z.string().trim().min(1).max(2000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException('Message invalide.');
    return this.review.send(req.session.userId, id, parsed.data.requestId, parsed.data.text, parsed.data.proposalId);
  }
}
