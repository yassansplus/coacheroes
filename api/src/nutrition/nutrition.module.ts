import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NutritionAi } from './nutrition-ai';
import { NutritionCatalog } from './nutrition-catalog';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';
import { NutritionCoachContext } from './nutrition-coach-context';
@Module({ imports: [AuthModule], controllers: [NutritionController], providers: [NutritionAi, NutritionCatalog, NutritionCoachContext, NutritionService] })
export class NutritionModule {}
