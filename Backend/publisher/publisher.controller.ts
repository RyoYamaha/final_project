import { Body, Controller, Get, Post, Param, UseGuards, Patch, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PublisherService } from './publisher.service';
import { RegisterPublisherDto } from './dto/register-publisher.dto';
import { CreatePublisherContentDto } from './dto/create-publisher-content.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateContentDto } from '../core/content/dto/update-content.dto';

@Controller('publisher')
@UseGuards(JwtAuthGuard)
export class PublisherController {
  constructor(private readonly publisherService: PublisherService) {}

  @Post('register')
  register(@CurrentUser('id') userId: string, @Body() dto: RegisterPublisherDto) {
    return this.publisherService.register(userId, dto);
  }

  @Get('me')
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.publisherService.getMyPublisherProfile(userId);
  }

  @Post('content')
  createContent(@CurrentUser('id') userId: string, @Body() dto: CreatePublisherContentDto) {
    return this.publisherService.createContent(userId, dto);
  }

  @Get('content')
  getMyContents(@CurrentUser('id') userId: string) {
    return this.publisherService.getMyContents(userId);
  }

  @Post('content/:id/resubmit')
  resubmit(@CurrentUser('id') userId: string, @Param('id') contentId: string) {
    return this.publisherService.resubmitContent(userId, contentId);
  }

  // Xem chi tiết truyện của publisher (kèm tất cả chương kể cả PendingReview)
  @Get('content/:id')
  getContentDetail(@CurrentUser('id') userId: string, @Param('id') contentId: string) {
    return this.publisherService.getPublisherContentDetail(userId, contentId);
  }

  // Chỉnh sửa truyện (title, synopsis, coverImageUrl, storyStatus, genres, tags)
  @Patch('content/:id')
  updateContent(
    @CurrentUser('id') userId: string,
    @Param('id') contentId: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.publisherService.updateContent(userId, contentId, dto);
  }

  @Post('upload-cover')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.publisherService.uploadCoverImage(file);
  }
}