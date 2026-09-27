import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard';
import { ProgramService } from './program.service';
import { renewalRequestSchema } from './renewal.schema';
@Controller('program')
@UseGuards(AuthGuard)
export class ProgramController {
  constructor(private readonly program: ProgramService) {}
  @Get() async get(@Req() req: AuthRequest) { return { program: await this.program.get(req.session.userId) }; }
  @Get('blocks') blocks(@Req() req: AuthRequest) { return this.program.history(req.session.userId); }
  @Get('blocks/:id') block(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.program.block(req.session.userId, id); }
  @Post('renew')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  renew(@Req() req: AuthRequest, @Body() body: unknown) {
    const parsed = renewalRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Vérifie tes réponses.');
    return this.program.renew(req.session.userId, parsed.data);
  }
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
