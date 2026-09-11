import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { ChapterModule } from '../core/chapter/chapter.module';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [ChapterModule, CloudinaryModule],
  controllers: [MangaController],
  providers: [MangaService],
})

export class MangaModule {}