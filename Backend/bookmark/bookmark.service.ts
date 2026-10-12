import {Injectable, NotFoundException, ConflictException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../common/constants/notification.enum';

@Injectable()
export class BookmarkService{
    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
    ){}

    async addBookmark(userId: string , contentId: string){
        const content = await this.prisma.content.findUnique({
            where: {id: contentId},}
        );
        if (!content){
            throw new NotFoundException('can not found the content you are looking for');
        }
        const existing = await this.prisma.bookmark.findUnique({where: {userId_contentId: {userId, contentId}},
        });
        if (existing){
            throw new ConflictException('Book mark of this content have already existed');
        }
        const bookmark = await this.prisma.bookmark.create({data: {userId, contentId}});
        await this.createBookmarkNotifications(
            userId,
            content.uploaderId,
            `Bạn đã thêm truyện "${content.title}" vào Bookmark.`,
            `Một người đọc đã thêm truyện "${content.title}" vào Bookmark.`,
        );
        return bookmark;
    }
    async getMyContentByBookmark(userId: string){
        return await this.prisma.bookmark.findMany({where: {userId: userId}, include: {content: true }, orderBy: {createdAt:'desc'}});

    }
    async RemoveBookmark(userId: string, contentId:string ){
        const existing = await this.prisma.bookmark.findUnique({where: {userId_contentId: {userId,contentId}}});
        if (!existing){
            throw new NotFoundException(
                'we can not find the bookmark of this content'
            );
        }
        await this.prisma.bookmark.delete({where: {id: existing.id}});
        return {remove: true};
    }

    private async createBookmarkNotifications(
        readerUserId: string,
        contentUploaderId: string,
        readerMessage: string,
        uploaderMessage: string,
    ) {
        await this.createNotificationSafely(
            readerUserId,
            NotificationType.ContentBookmarked,
            readerMessage,
        );
        if (contentUploaderId !== readerUserId) {
            await this.createNotificationSafely(
                contentUploaderId,
                NotificationType.ContentBookmarked,
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
            console.error('Failed to create bookmark notification', error);
        }
    }
}
