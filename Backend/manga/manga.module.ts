import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { ChapterModule } from '../core/chapter/chapter.module';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { AuthModule } from '../user/auth/auth.module';

@Module({
  imports: [ChapterModule, CloudinaryModule, AuthModule],
  controllers: [MangaController],
  providers: [MangaService],
})

export class MangaModule {}