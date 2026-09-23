import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NutritionCoachContext } from '../nutrition/nutrition-coach-context';
import { CoachAi } from './coach-ai';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';

@Module({ imports: [AuthModule], providers: [CoachAi, CoachService, NutritionCoachContext], controllers: [CoachController] })
export class CoachModule {}
