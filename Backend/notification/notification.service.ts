import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '../common/constants/notification.enum';

@Injectable()
export class NotificationService {
    constructor(private readonly prisma: PrismaService) {}
    //BƯỚC 1: hàm tạo notification , cần có userId , type và dạng message
    async create(userId: string, type: NotificationType, message: string) {
        return this.prisma.notification.create({
            data: { userId, type, message },
        });
    }

    async notifyReadersWhoSavedContent( contentId: string, type: NotificationType,message: string,) {
        try {
            const bookmarks = await this.prisma.bookmark.findMany({ where: { contentId }, select: { userId: true }});
            const favorites = await this.prisma.favorite.findMany({ where: { contentId }, select: { userId: true }});

            const recipientUserIds = new Set<string>();
            //BƯỚC 1: duyệt từng bookmark rôi add vào biến recipepientuserid để tránh trùng lặp user
            for (const bookmark of bookmarks) {
                recipientUserIds.add(bookmark.userId);
            }
            for (const favorite of favorites) {
                recipientUserIds.add(favorite.userId);
            }
            
            for (const recipientUserId of recipientUserIds) {
                //duyệt từng người dùng trong danh sách người dùng 
                try {
                    await this.create(recipientUserId, type, message); //tạo thống báo cho từng người dùng 
                } catch (error) {
                    console.error('Failed to create content notification', error);
                }
            }
        } catch (error) {
            console.error('Failed to notify content followers', error);
        }
    }

    async getMyNotifications(userId: string) {
        return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }});
    }

    async getUnreadCount(userId: string) {
        return this.prisma.notification.count({ where: { userId, isRead: false }});
    }

    async markAsRead(userId: string, notificationId: string) {
        const notification = await this.prisma.notification.findFirst({ where: { id: notificationId, userId }});
        if (!notification) {
            throw new NotFoundException('Không tìm thấy thông báo');
        }
        return this.prisma.notification.update({ where: { id: notificationId }, data: { isRead: true }});
    }

    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
}
