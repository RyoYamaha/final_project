import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class CommentService{ 
    constructor( private readonly prisma: PrismaService){}
    async CreateComment(userId: string, contentId: string, body: string, parentCommentId?: string,) {
        const content = await this.prisma.content.findUnique({
            where: { id: contentId },
        });
        if (!content) {
            throw new NotFoundException('The content does not exist');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new NotFoundException('The user does not exist');
        }

        if (parentCommentId) {
            const parentComment = await this.prisma.comment.findFirst({
                where: { id: parentCommentId, contentId },
            });
            if (!parentComment) {
                throw new NotFoundException('The parent comment does not exist');
            }
        }

        return this.prisma.comment.create({
            data: { userId, contentId, parentCommentId, body },
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
