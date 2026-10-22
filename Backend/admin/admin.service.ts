

import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../core/content/content.service';
import { ChapterService } from '../core/chapter/chapter.service';
import { PublisherService } from '../publisher/publisher.service';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class AdminService{
    constructor (
        private readonly prisma: PrismaService,
        private readonly contentService: ContentService,
        private readonly chapterService: ChapterService,
        private readonly publisherService: PublisherService,
    ){}
    ApproveContent(id: string){
        return this.contentService.approve(id);
    }
    RejectContent(id: string, reason?: string){
        return this.contentService.reject(id, reason);
    }
    HideContent(id: string){
        return this.contentService.hide(id);
    }
    RestoreContent(id: string) {
        return this.contentService.restore(id);
    }
    ApproveChapter(id: string) {
        return this.chapterService.approvePendingChapter(id);
    }
    GetChapterDetail(id: string) {
        return this.chapterService.findForAdmin(id);
    }
    RejectChapter(id: string) {
        return this.chapterService.rejectPendingChapter(id);
    }
    AprroveVerification(id: string){
        return this.publisherService.approveVerification(id);
    }
    RejectVerification(id: string){
        return this.publisherService.rejectVerification(id);
    }
    // khóa tài khoản user lock và unlock 
    //lock 
    async getAllUsers() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                bio: true,
                isLocked: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateUser(userId: string, dto: UpdateAdminUserDto) {
        const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!existingUser) {
            throw new NotFoundException('Không tìm thấy người dùng');
        }
        if (existingUser.role === 'Admin') {
            throw new ForbiddenException('Không thể chỉnh sửa tài khoản Admin tại đây');
        }

        if (dto.username || dto.email) {
            const conflictingUser = await this.prisma.user.findFirst({
                where: {
                    id: { not: userId },
                    OR: [
                        ...(dto.username ? [{ username: dto.username }] : []),
                        ...(dto.email ? [{ email: dto.email }] : []),
                    ],
                },
                select: { id: true },
            });
            if (conflictingUser) {
                throw new ConflictException('Tên đăng nhập hoặc email đã được sử dụng');
            }
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                username: dto.username,
                email: dto.email,
                role: dto.role,
                bio: dto.bio,
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                bio: true,
                isLocked: true,
                createdAt: true,
            },
        });
    }

    async LockUser(userId: string, adminId: string){
        if (userId === adminId) {
            throw new ForbiddenException('Không thể khóa tài khoản Admin đang đăng nhập');
        }
        const user = await this.prisma.user.findUnique({where: {id: userId}});
        if (!user){
            throw new NotFoundException('Không tìm thấy người dùng');
        }
        if (user.role === 'Admin') {
            throw new ForbiddenException('Không thể khóa tài khoản Admin tại đây');
        }
        //thu hồi lại token đăng nhập của người dùng không cho phép đăng nhập nữa 
        await this.prisma.$transaction([
            this.prisma.user.update({ where: { id: userId },data: { isLocked: true },}), //đánh dấu là tài khoản đã bị khóa trong table

            this.prisma.refreshToken.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true }, }),//thu hồi lại token không cho phép người dùng sử dụng token để đăng nhập nữa 
        ]);

        return {locked: true};
    }
    async UnlockUser(userId: string){
        const user = await this.prisma.user.findUnique({where: {id: userId}});
        if ( !user){
            throw new NotFoundException('can not find the person you looking for');
        }
        await this.prisma.user.update({where: { id: userId }, data: { isLocked: false },});
        return { locked: false };
    }
    
    //reviewquueu tổng hợp 
    async getReviewQueue(){
        const [pendingContent, pendingPublisher] = await this.prisma.$transaction([
            //tìm content đã được approval
            this.prisma.content.findMany({ where: {publicationStatus: 'PendingApproval'}, include: {uploader: {select: { id: true, username: true}}},orderBy: {createdAt: 'asc'},}),
            //tìm content đã được pending
            this.prisma.publisher.findMany({
                where: {verificationStatus: 'Pending'},
                include:{user:{select: {id: true, username: true, email: true}}},
            }),
        ]);
        return {pendingContent, pendingPublisher}
    }

    async getAllContents() {
        return this.prisma.content.findMany({
            include: {
                uploader: { select: { id: true, username: true } },
                publisher: true,
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}