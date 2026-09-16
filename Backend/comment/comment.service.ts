import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {NotificationService } from '../notification/notification.service'
import {NotificationType} from '../common/constants/notification.enum'


@Injectable()
export class CommentService{ 
    constructor( private readonly prisma: PrismaService, private readonly notificationservice: NotificationService){}
    async CreateComment(userId: string, contentId: string, body: string, parentCommentId?: string,) {
        const content = await this.prisma.content.findUnique({
            where: { id: contentId },
        });
        if (!content) {
            throw new NotFoundException('The content does not exist');
        }



        if (parentCommentId) {
            const parentComment = await this.prisma.comment.findFirst({
                where: { id: parentCommentId, contentId },
            });
            if (parentComment && parentComment.userId !== userId){
            try{
                await this.notificationservice.create(parentComment.userId, NotificationType.CommentReply, 'some one just reply your comment')
            }
            catch (err){
                console.error('Faild to create notification')
            }
        }
            if (!parentComment) {
                throw new NotFoundException('The parent comment does not exist');
            }
        }
        

        return this.prisma.comment.create({
            data: { userId, contentId, parentCommentId, body, moderationStatus: 'Published' },
        });
        
    }
       
    async GetComment(contentId: string ){
        const comments = await this.prisma.comment.findMany({
            where: { contentId, parentCommentId: null, moderationStatus: 'Published' },
            include: {
                user: { select: { id: true, username: true } },
                replies: {
                    where: { moderationStatus: 'Published' },
                    include: { user: { select: { id: true, username: true } } },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (comments.length === 0) {
            throw new NotFoundException('we could not find any comment of this content');
        }
        return comments;
    }
    async DeleteComment(userId: string, commentId: string){
        const existing = await this.prisma.comment.findFirst({
            where: { id: commentId, userId },
        });
        if (!existing){
            throw new NotFoundException('Comment not found or you are not its owner');
        }

        return this.prisma.comment.update({
            where: { id: commentId },
            data: { moderationStatus: 'Hidden' },
        });
    }
}
