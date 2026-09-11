import { Body, Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { AuthorService } from './author.service';
import { CreateFanTranslationDto } from './dto/create-fan-translation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('author')
@UseGuards(JwtAuthGuard)
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

  @Get('browse-licensed')
  browseLicensed(@Query('search') search?: string) {
    return this.authorService.browseLicensedContents(search);
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
}