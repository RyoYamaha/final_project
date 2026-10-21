import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UnlockService } from './unlock.service';

@Controller('unlock')
@UseGuards(JwtAuthGuard)
export class UnlockController {
  constructor(private readonly unlockService: UnlockService) {}

  @Post('content/:contentId/purchase')
  purchaseContent(
    @Param('contentId') contentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.unlockService.purchaseContent(userId, contentId);
  }

  @Get('content/:contentId')
  getContentAccess(
    @Param('contentId') contentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.unlockService.getContentAccess(userId, contentId);
  }
}
