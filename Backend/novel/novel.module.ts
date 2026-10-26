import { Module } from '@nestjs/common';
import { NovelService } from './novel.service';
import { NovelController } from './novel.controller';
import { ChapterModule } from '../core/chapter/chapter.module';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { UnlockModule } from '../unlock/unlock.module';
import { NovelModerationService } from './novel-moderation.service';

@Module({
  imports: [ChapterModule, CloudinaryModule, UnlockModule],
  controllers: [NovelController],
  providers: [NovelService, NovelModerationService],
  exports: [NovelModerationService],
})
export class NovelModule {}