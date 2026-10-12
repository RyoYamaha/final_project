import { Injectable, NotFoundException, ConflictException} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../common/constants/notification.enum';

@Injectable()
export class FavouriteService{
    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
    ){}
    async AddFavorite(userId: string, contentId: string){
        const content = await this.prisma.content.findUnique({
            where: { id: contentId },
        });
        if (!content) {
            throw new NotFoundException('The content does not exist');
        }

        const existing = await this.prisma.favorite.findUnique({
            where: { userId_contentId: { userId, contentId } },
        });
        if (existing){
            throw new ConflictException('this content already have favourite');
        }
        const favorite = await this.prisma.favorite.create({data: {userId, contentId}});
        await this.createFavoriteNotifications(
            userId,
            content.uploaderId,
            `Bạn đã thêm truyện "${content.title}" vào danh sách Yêu thích.`,
            `Một người đọc đã thêm truyện "${content.title}" vào danh sách Yêu thích.`,
        );
        return favorite;
    }
    async getContentbyFavorite(userId: string){
         return this.prisma.favorite.findMany({where: {userId}, include: {content:true}, orderBy: {createdAt: 'desc'} })
    }
    async removeFavorite(userId: string, contentId: string){
        const existing = await this.prisma.favorite.findUnique({where: {userId_contentId: {userId, contentId}}});
        if (!existing){
            throw new NotFoundException('can not found the favourite of this content');
        }
        await this.prisma.favorite.delete({where:{id: existing.id}});
        return {remove: true};
    }
    async RemoveFavortie(userId: string, contentId: string){
        return this.removeFavorite(userId, contentId);
    }

    private async createFavoriteNotifications(
        readerUserId: string,
        contentUploaderId: string,
        readerMessage: string,
        uploaderMessage: string,
    ) {
        await this.createNotificationSafely(
            readerUserId,
            NotificationType.ContentFavorited,
            readerMessage,
        );
        if (contentUploaderId !== readerUserId) {
            await this.createNotificationSafely(
                contentUploaderId,
                NotificationType.ContentFavorited,
                uploaderMessage,
            );
        }
    }

    private async createNotificationSafely(
        userId: string,
        type: NotificationType,
        message: string,
    ) {
        try {
            await this.notificationService.create(userId, type, message);
        } catch (error) {
            console.error('Failed to create favorite notification', error);
        }
    }
}
