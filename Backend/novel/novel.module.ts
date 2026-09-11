import { Module } from '@nestjs/common';
import { NovelService } from './novel.service';
import { NovelController } from './novel.controller';
import { ChapterModule } from '../core/chapter/chapter.module';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [ChapterModule, CloudinaryModule], // MỚI: thêm CloudinaryModule
  controllers: [NovelController],
  providers: [NovelService],
})
export class NovelModule {}