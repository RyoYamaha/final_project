import { Body, Controller, Get, Post, Patch, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthorService } from './author.service';
import { CreateFanTranslationDto } from './dto/create-fan-translation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateOriginalContentDto } from './dto/create-original-content.dto';
import { UpdateContentDto } from '../core/content/dto/update-content.dto';

@Controller('author')
@UseGuards(JwtAuthGuard)
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

  @Get('browse-licensed')
  browseLicensed(@Query('search') search?: string) {
    return this.authorService.browseLicensedContents(search);
  }

  // Danh sách tất cả truyện của tác giả (cả Original lẫn FanTranslation)
  @Get('content')
  getMyContents(@CurrentUser('id') userId: string) {
    return this.authorService.getMyContents(userId);
  }

  // Xem chi tiết truyện của tác giả (kèm tất cả chương kể cả PendingReview)
  @Get('content/:id')
  getContentDetail(@CurrentUser('id') userId: string, @Param('id') contentId: string) {
    return this.authorService.getAuthorContentDetail(userId, contentId);
  }

  // Chỉnh sửa truyện (title, synopsis, coverImageUrl, storyStatus, genres, tags)
  @Patch('content/:id')
  updateContent(
    @CurrentUser('id') userId: string,
    @Param('id') contentId: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.authorService.updateContent(userId, contentId, dto);
  }

  @Post('translations')
  createTranslation(@CurrentUser('id') userId: string, @Body() dto: CreateFanTranslationDto) {
    return this.authorService.createFanTranslation(userId, dto);
  }

  @Get('translations')
  getMyTranslations(@CurrentUser('id') userId: string) {
    return this.authorService.getMyTranslations(userId);
  }

  @Post('translations/:id/resubmit')
  resubmit(@CurrentUser('id') userId: string, @Param('id') contentId: string) {
    return this.authorService.resubmitTranslation(userId, contentId);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser('id') userId: string) {
    return this.authorService.getDashboardStats(userId);
  }

  @Post('original-content')
  createOriginalContent(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOriginalContentDto,
  ) {
    return this.authorService.createOriginalContent(userId, dto);
  }

  @Post('upload-cover')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.authorService.uploadCoverImage(file);
  }
}