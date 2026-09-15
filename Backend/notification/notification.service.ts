import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {NotificationType} from '../common/constants/notification.enum'
@Injectable()
export class NotificationService {
    constructor ( private readonly prisma: PrismaService ){}
    async create(userId: string, type: NotificationType, message: string){
        return this.prisma.notification.create({data: {userId, type, message}})
    }
    async getMyNotification(userId: string){
        return this.prisma.notification.findMany({where: {userId: userId}, orderBy: {createdAt: 'desc'}});
    }
    async getUnreadCount(userId: string) {
        return this.prisma.notification.count({where: {userId: userId, isRead: false}});
    }
    async markAsRead(userId: string, notificationId: string){
        const notification = await this.prisma.notification.findFirst({where: {id: notificationId, userId}});
        if (!notification){
            throw new NotFoundException('notification did not exist')
        }
        return this.prisma.notification.update({where: {id: notificationId}, data: {isRead: true}});
    }
    async markAllAsRead(userId: string){
        return this.prisma.notification.updateMany({where: {userId, isRead: false}, data: {isRead: true} });
    }
}
