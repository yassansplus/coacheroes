import { ProgramReviewService } from './program-review.service';
import { ProgramReviewController } from './program-review.controller';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProgramModule } from '../program/program.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatAi } from './chat-ai';
@Module({ imports: [AuthModule, ProgramModule], controllers: [ChatController, ProgramReviewController], providers: [ChatService, ChatAi, ProgramReviewService] })
export class ChatModule {}
