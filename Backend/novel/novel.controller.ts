import { Controller, Post, Get, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NovelService } from './novel.service';
import { ChapterService } from '../core/chapter/chapter.service';
import { CreateChapterDto } from '../core/chapter/dto/create-chapter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('novel')
@UseGuards(JwtAuthGuard)
export class NovelController {
  constructor(
    private readonly novelService: NovelService,
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

  @Post('chapters/:chapterId/text')
  setText(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
    @Body('textBody') textBody: string,
  ) {
    return this.novelService.setChapterText(chapterId, userId, textBody);
  }

  @Post('chapters/:chapterId/pdf')
  @UseInterceptors(FileInterceptor('file'))
  setFromPdf(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: { buffer: Buffer },
  ) {
    return this.novelService.setChapterFromPdf(chapterId, userId, file.buffer);
  }

  @Get('chapters/:chapterId/pages')
  getPages(@Param('chapterId') chapterId: string) {
    return this.novelService.getChapterPages(chapterId);
  }

  @Get('chapters/:chapterId/text')
  getText(@Param('chapterId') chapterId: string) {
    return this.novelService.getChapterText(chapterId);
  }
}