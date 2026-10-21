import { Body, Controller, Post, Patch, Get, Delete, Param, UseGuards, UseInterceptors, UploadedFiles, UploadedFile } from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { MangaService, UploadedImageFile } from './manga.service';
import { ChapterService } from '../core/chapter/chapter.service';
import { CreateChapterDto } from '../core/chapter/dto/create-chapter.dto';
import { UpdateChapterDto } from '../core/chapter/dto/update-chapter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('manga')
export class MangaController {
  constructor(
    private readonly mangaService: MangaService,
    private readonly chapterService: ChapterService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('content/:contentId/chapters')
  createChapter(
    @Param('contentId') contentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateChapterDto,
  ) {
    return this.chapterService.createChapter(contentId, userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('chapters/:chapterId')
  updateChapter(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateChapterDto,
  ) {
    return this.chapterService.updateChapter(chapterId, userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('chapters/:chapterId/pages')
  @UseInterceptors(FilesInterceptor('pages', 200)) // tối đa 200 trang/chapter
  uploadPages(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: UploadedImageFile[],
  ) {
    return this.mangaService.uploadChapterPages(chapterId, userId, files);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('chapters/:chapterId/pages')
  getPages(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.mangaService.getChapterPages(chapterId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('chapters/:chapterId/pages/author')
  getPagesForAuthor(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.mangaService.getChapterPagesForAuthor(chapterId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('chapters/:chapterId/pages/:pageId')
  deletePage(
    @Param('chapterId') chapterId: string,
    @Param('pageId') pageId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.mangaService.deleteChapterPage(chapterId, pageId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('chapters/:chapterId/pages/reorder')
  reorderPages(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
    @Body('pageIds') pageIds: string[],
  ) {
    return this.mangaService.reorderChapterPages(chapterId, userId, pageIds);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('chapters/:chapterId/pages/:pageId/image')
  @UseInterceptors(FileInterceptor('page'))
  replaceImage(
    @Param('chapterId') chapterId: string,
    @Param('pageId') pageId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: UploadedImageFile,
  ) {
    return this.mangaService.replaceChapterPageImage(chapterId, pageId, userId, file);
  }
}