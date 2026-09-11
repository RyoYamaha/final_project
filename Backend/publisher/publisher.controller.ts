import { Body, Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { PublisherService } from './publisher.service';
import { RegisterPublisherDto } from './dto/register-publisher.dto';
import { CreatePublisherContentDto } from './dto/create-publisher-content.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

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
}