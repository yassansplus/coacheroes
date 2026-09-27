import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SquadController } from './squad.controller';
import { SquadService } from './squad.service';

@Module({ imports: [AuthModule], controllers: [SquadController], providers: [SquadService] })
export class SquadModule {}
