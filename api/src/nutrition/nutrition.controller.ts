import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard';
import { NutritionCatalog } from './nutrition-catalog';
import { NutritionService } from './nutrition.service';
import { mealWriteSchema, nutrientsSchema } from './nutrition.schema';

const analyzeSchema = z.strictObject({ source: z.enum(['text', 'photo']), description: z.string().max(2000).default(''), photoId: z.uuid().optional() });
const manualSchema = z.strictObject({ name: z.string().trim().min(2).max(180), per100: nutrientsSchema, baseUnit: z.enum(['g', 'ml']), portion: z.number().positive().max(2000) });
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new BadRequestException('Vérifie les données nutritionnelles.');
  return parsed.data;
}
@Controller('nutrition') @UseGuards(AuthGuard)
export class NutritionController {
  constructor(private readonly nutrition: NutritionService, private readonly catalog: NutritionCatalog) {}
  @Get() dashboard(@Req() req: AuthRequest) { return this.nutrition.dashboard(req.session.userId); }
  @Post('plan/retry') retry(@Req() req: AuthRequest) { return this.nutrition.retryPlan(req.session.userId); }
  @Get('foods') foods(@Req() req: AuthRequest, @Query('q') query: unknown, @Query('remote') remote: unknown) {
    return this.catalog.search(req.session.userId, parse(z.string().max(100), query ?? ''), remote === '1');
  }
  @Get('foods/barcode/:code') barcode(@Param('code') code: string) { return this.catalog.barcode(code); }
  @Post('foods/manual') manual(@Req() req: AuthRequest, @Body() body: unknown) {
    const input = parse(manualSchema, body);
    return this.catalog.createManual(req.session.userId, input.name, input.per100, input.baseUnit, input.portion);
  }
  @Post('photos') photo(@Req() req: AuthRequest) { return this.nutrition.uploadPhoto(req.session.userId, req.body as Buffer); }
  @Post('analyze') @Throttle({ default: { limit: 12, ttl: 60000 } })
  analyze(@Req() req: AuthRequest, @Body() body: unknown) {
    const input = parse(analyzeSchema, body);
    return this.nutrition.analyze(req.session.userId, input.source, input.description, input.photoId);
  }
  @Put('meals') save(@Req() req: AuthRequest, @Body() body: unknown) { return this.nutrition.saveMeal(req.session.userId, parse(mealWriteSchema, body)); }
  @Post('meals/:id/opinion') @Throttle({ default: { limit: 6, ttl: 60000 } })
  opinion(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.nutrition.opinion(req.session.userId, id); }
  @Delete('meals/:id') delete(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.nutrition.deleteMeal(req.session.userId, id); }
}
