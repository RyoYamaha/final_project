import { BadRequestException, Controller, Post, Patch, Get, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NovelService } from './novel.service';
import { ChapterService } from '../core/chapter/chapter.service';
import { CreateChapterDto } from '../core/chapter/dto/create-chapter.dto';
import { UpdateChapterDto } from '../core/chapter/dto/update-chapter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('novel')
export class NovelController {
  constructor(
    private readonly novelService: NovelService,
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
  @Post('chapters/:chapterId/text')
  setText(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
    @Body('textBody') textBody: string,
  ) {
    return this.novelService.setChapterText(chapterId, userId, textBody);
  }

  @UseGuards(JwtAuthGuard)
  @Post('chapters/:chapterId/pdf')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  setFromPdf(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file?: { buffer: Buffer },
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Vui lòng chọn tệp PDF để tải lên');
    }
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

  @UseGuards(JwtAuthGuard)
  @Get('chapters/:chapterId/text/author')
  getTextForAuthor(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.novelService.getChapterTextForAuthor(chapterId, userId);
  }
}