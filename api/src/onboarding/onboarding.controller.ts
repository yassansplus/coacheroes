import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard';
import { saveSchema } from './onboarding.schema';
import { OnboardingService } from './onboarding.service';
@Controller('onboarding')
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}
  @Get() get(@Req() req: AuthRequest) { return this.onboarding.get(req.session.userId); }
  @Put() save(@Req() req: AuthRequest, @Body() body: unknown) { return this.persist(req, body, false); }
  @Post('complete') complete(@Req() req: AuthRequest, @Body() body: unknown) { return this.persist(req, body, true); }
  private persist(req: AuthRequest, body: unknown, complete: boolean) {
    const result = saveSchema.safeParse(body);
    if (!result.success) throw new BadRequestException('Les réponses contiennent des données invalides. Vérifie les champs.');
    return this.onboarding.save(req.session.userId, result.data, complete);
  }
  @Post('photos') upload(@Req() req: AuthRequest) { return this.onboarding.upload(req.session.userId, req.body as Buffer); }
  @Get('photos/:id') async photo(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const photo = await this.onboarding.photo(req.session.userId, id);
    res.set({ 'Content-Type': photo.contentType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(photo.content);
  }
}
