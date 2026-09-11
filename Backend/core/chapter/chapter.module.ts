import { Module } from '@nestjs/common';
import { ChapterService } from './chapter.service';

@Module({
  providers: [ChapterService],
  exports: [ChapterService],
})
export class ChapterModule {}