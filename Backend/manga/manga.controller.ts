import { Body, Controller, Post, Get, Param, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MangaService, UploadedImageFile } from './manga.service';
import { ChapterService } from '../core/chapter/chapter.service';
import { CreateChapterDto } from '../core/chapter/dto/create-chapter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('manga')
@UseGuards(JwtAuthGuard)
export class MangaController {
  constructor(
    private readonly mangaService: MangaService,
    private readonly chapterService: ChapterService,
  ) {}

  @Post('content/:contentId/chapters')
  createChapter(
    @Param('contentId') contentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateChapterDto,
  ) {
    return this.chapterService.createChapter(contentId, userId, dto);
  }

  @Post('chapters/:chapterId/pages')
  @UseInterceptors(FilesInterceptor('pages', 200)) // tối đa 200 trang/chapter
  uploadPages(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: UploadedImageFile[],
  ) {
    return this.mangaService.uploadChapterPages(chapterId, userId, files);
  }

  @Get('chapters/:chapterId/pages')
  getPages(@Param('chapterId') chapterId: string) {
    return this.mangaService.getChapterPages(chapterId);
  }
}