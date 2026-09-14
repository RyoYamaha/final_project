import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../core/content/content.service';
import { PublisherService } from '../publisher/publisher.service';

@Injectable()
export class AdminService{
    constructor (private readonly prisma: PrismaService, private readonly contentService: ContentService, private readonly publisherService: PublisherService){}
    ApproveContent(id: string){
        return this.contentService.approve(id);
    }
    RejectContent(id: string ){
        return this.contentService.reject(id);
    }
    HideContent(id: string){
        return this.contentService.hide(id);
    }
    RestoreContent(id: string) {
        return this.contentService.restore(id);
    }
    AprroveVerification(id: string){
        return this.publisherService.approveVerification(id);
    }
    RejectVerification(id: string){
        return this.publisherService.rejectVerification(id);
    }
    // khóa tài khoản user lock và unlock 
    //lock 
    async LockUser(userId: string){
        const user = await this.prisma.user.findUnique({where: {id: userId}});
        if (!user){
            throw new NotFoundException('could not find the person you looking for');
        }
        //thu hồi lại token đăng nhập của người dùng không cho phép đăng nhập nữa 
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: { isLocked: true }, //đánh dấu là tài khoản đã bị khóa trong table
            }),

            this.prisma.refreshToken.updateMany({
                where: { userId, isRevoked: false },
                data: { isRevoked: true }, //thu hồi lại token không cho phép người dùng sử dụng token để đăng nhập nữa 
            }),
        ]);

        return {locked: true};
    }
    async UnlockUser(userId: string){
        const user = await this.prisma.user.findUnique({where: {id: userId}});
        if ( !user){
            throw new NotFoundException('can not find the person you looking for');
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: { isLocked: false },
        });
        return { locked: false };
    }
    
    //reviewquueu tổng hợp 
    async getReviewQueue(){
        const [pendingContent, pendingPublisher ] = await this.prisma.$transaction([
            //tìm content đã được approval
            this.prisma.content.findMany({
                where: {publicationStatus: 'PendingApproval'},
                include: {uploader: {select: { id: true, username: true}}},
                orderBy: {createdAt: 'asc'},
            }),
            //tìm content đã được pending
            this.prisma.publisher.findMany({
                where: {verificationStatus: 'Pending'},
                include:{user:{select: {id: true, username: true, email: true}}},
            }),

        ]);
        return {pendingContent, pendingPublisher}
    }
}