import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DailyController } from './daily.controller';
import { DailyService } from './daily.service';
import { DailyReminder } from './daily-reminder';
@Module({imports:[AuthModule],controllers:[DailyController],providers:[DailyService,DailyReminder]})
export class DailyModule {}
