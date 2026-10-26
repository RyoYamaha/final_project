import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ContentModule } from '../core/content/content.module';
import { PublisherModule } from '../publisher/publisher.module';
import { ChapterModule } from '../core/chapter/chapter.module';
import { NovelModule } from '../novel/novel.module';

@Module({
  imports: [ContentModule, PublisherModule, ChapterModule, NovelModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
