import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard';
import { ProgramService } from './program.service';
@Controller('program')
@UseGuards(AuthGuard)
export class ProgramController {
  constructor(private readonly program: ProgramService) {}
  @Get() async get(@Req() req: AuthRequest) { return { program: await this.program.get(req.session.userId) }; }
  @Post('accept')
  accept(@Req() req: AuthRequest, @Body() body: unknown) {
    const parsed = z.strictObject({ proposalId: z.uuid() }).safeParse(body);
    if (!parsed.success) throw new BadRequestException('Programme invalide.');
    return this.program.accept(req.session.userId, parsed.data.proposalId);
  }
  @Post('generate')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  generate(@Req() req: AuthRequest, @Body() body: unknown) {
    const parsed = z.strictObject({ retry: z.boolean().optional(), renew: z.boolean().optional() }).safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException('Requête invalide.');
    return this.program.start(req.session.userId, parsed.data.retry, parsed.data.renew);
  }
}
