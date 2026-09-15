import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'common/guards/jwt-auth.guard';
import { CurrentUser } from 'common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  async getNotification(@CurrentUser('id') userId: string) {
    return await this.service.getMyNotification(userId);
  }

  @Get('unread-count')
  async readCountNotification(@CurrentUser('id') userId: string) {
    return await this.service.getUnreadCount(userId);
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return await this.service.markAllAsRead(userId);
  }

  @Patch(':id/read')
  async markNotification(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return await this.service.markAsRead(userId, notificationId);
  }
}