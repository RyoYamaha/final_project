import {Injectable, NotFoundException } from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class RatingService {
    constructor (private readonly prisma: PrismaService){}
    async UpsertRating(userId: string, contentId: string, score: number ){
        const content = await this.prisma.content.findUnique({
            where: {id: contentId},
        });
        if (!content){
            throw new NotFoundException('Content không tồn tại');
        }
        return this.prisma.rating.upsert({
            where: {userId_contentId: {userId, contentId}},
            update: {score},
            create: {userId, contentId, score},
        });

    }
    async getSummary(contentId: string){
        const content = await this.prisma.content.findUnique({where: {id: contentId}});
        if (!content){
            throw new NotFoundException('we did not find any content you have rated');
        }
        const result = await this.prisma.rating.aggregate({ where: {contentId}, _avg: {score: true},_count: {score: true},});
        return {
            averageScore: result._avg.score ?? 0,
            totalRatings: result._count.score,
        };
    }
    async getMyRating (userId: string, contentId: string){
        const rating = await this.prisma.rating.findUnique({where: {userId_contentId: {userId,contentId}}});
        if (!rating){
            throw new NotFoundException('you did not rate this content');
        }
        return rating;
    }
    async RemoveRating(userId: string, contentId: string){
        const existing = await this.prisma.rating.findUnique({where: {userId_contentId : {userId, contentId}}});
        if (!existing){
            throw new NotFoundException('can not found the content for delete');
        }
        await this.prisma.rating.delete({where: {id: existing.id}});
        return {remove: true};
    }

}