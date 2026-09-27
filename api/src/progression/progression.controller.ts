import { BadRequestException, Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard';
import { boxingKindSchema, boxingSchema, measurementSchema, photoAngleSchema, photoRemoveSchema, photoSchema, progressDateSchema, weightSchema } from './progression.schema';
import { ProgressionService } from './progression.service';

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException(result.error.issues[0]?.message ?? 'Donnée de progression invalide.');
  return result.data;
}

@Controller('progression') @UseGuards(AuthGuard)
export class ProgressionController {
  constructor(private readonly progression: ProgressionService) {}
  @Get() get(@Req() req: AuthRequest) { return this.progression.get(req.session.userId); }
  @Put('weights/:date') weight(@Req() req: AuthRequest, @Param('date') date: string, @Body() body: unknown) {
    return this.progression.weight(req.session.userId, parse(progressDateSchema, date), parse(weightSchema, body));
  }
  @Put('measurements/:date') measurement(@Req() req: AuthRequest, @Param('date') date: string, @Body() body: unknown) {
    return this.progression.measurement(req.session.userId, parse(progressDateSchema, date), parse(measurementSchema, body));
  }
  @Put('photos/:date') photo(@Req() req: AuthRequest, @Param('date') date: string, @Body() body: unknown) {
    return this.progression.photo(req.session.userId, parse(progressDateSchema, date), parse(photoSchema, body));
  }
  @Delete('photos/:date/:angle') removePhoto(@Req() req: AuthRequest, @Param('date') date: string, @Param('angle') angle: string, @Body() body: unknown) {
    return this.progression.removePhoto(req.session.userId, parse(progressDateSchema, date), parse(photoAngleSchema, angle), parse(photoRemoveSchema, body));
  }
  @Put('boxing-tests/:date/:kind') boxing(@Req() req: AuthRequest, @Param('date') date: string, @Param('kind') kind: string, @Body() body: unknown) {
    return this.progression.boxing(req.session.userId, parse(progressDateSchema, date), parse(boxingKindSchema, kind), parse(boxingSchema, body));
  }
}
