import { WorkoutAi } from './workout-ai';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkoutController } from './workout.controller';
import { WorkoutService } from './workout.service';
@Module({imports:[AuthModule],controllers:[WorkoutController],providers:[WorkoutService,WorkoutAi],exports:[WorkoutService]})
export class WorkoutModule {}
