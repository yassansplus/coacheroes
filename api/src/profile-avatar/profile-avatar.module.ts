import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProfileAvatarController } from './profile-avatar.controller';
import { ProfileAvatarService } from './profile-avatar.service';

@Module({ imports: [AuthModule], controllers: [ProfileAvatarController], providers: [ProfileAvatarService] })
export class ProfileAvatarModule {}
