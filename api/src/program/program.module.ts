import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProgramController } from './program.controller';
import { ProgramService } from './program.service';
import { ProgramGenerator } from './generator';
import { WgerService } from './wger.service';
@Module({ imports: [AuthModule], controllers: [ProgramController], providers: [ProgramService, ProgramGenerator, WgerService], exports: [ProgramService, ProgramGenerator] })
export class ProgramModule {}
