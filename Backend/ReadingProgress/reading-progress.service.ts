import {Injectable, NotFoundException, ForbiddenException} from '@nestjs/common'
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class ReadingProgressService{
    constructor (private readonly prisma: PrismaService){}

    async updateProgress( userId: string, contentId: string, chapterId: string, lastPageNumber?: number,
    ){
        const chapter = await this.prisma.chapter.findUnique({where: {id: chapterId}})
        if (chapter == null){
            throw new NotFoundException('Chapter does not exist');
        }
        if (chapter.contentId !== contentId){
            throw new ForbiddenException('Chapter is not belong to this content')
        }
        return this.prisma.$transaction(async (tx) => {
            const progress = await tx.readingProgress.upsert({
                where: {
                    userId_contentId: { userId, contentId },
                },
                update: {
                    lastChapterId: chapterId,
                    ...(lastPageNumber !== undefined && { lastPageNumber }),
                    lastReadAt: new Date(),
                },
                create: {
                    userId,
                    contentId,
                    lastChapterId: chapterId,
                    lastPageNumber: lastPageNumber ?? null,
                },
            });

            await tx.chapterRead.upsert({
                where: { userId_chapterId: { userId, chapterId } },
                update: {},
                create: { userId, chapterId },
            });

            return progress;
        });
    }
    async getProgress(userId : string , contentId: string){
        const progress = await this.prisma.readingProgress.findUnique({
            where: {
                userId_contentId: {userId, contentId},
            },
            include: { lastChapter: true }
        });
        if (!progress){
            throw new NotFoundException('you do not have reading progress for this content')
        }
        const chapterReads = await this.prisma.chapterRead.findMany({
            where: { userId, chapter: { contentId } },
            select: { chapterId: true },
        });
        return { ...progress, chapterReads };
    }
    getMyProgress(userId: string){
        return this.prisma.readingProgress.findMany({
            where: {userId},
            include: {content: true, lastChapter: true},
            orderBy: {lastReadAt: 'desc'}
        });
    }
    
    async removeProgress (userId: string, contentId: string){
        const progress = await this.prisma.readingProgress.findUnique({
            where: {userId_contentId: {userId, contentId}}
        });
        if (!progress){
            throw new NotFoundException('can not find the reading progress');

        }
        await this.prisma.$transaction([
            this.prisma.chapterRead.deleteMany({
                where: { userId, chapter: { contentId } },
            }),
            this.prisma.readingProgress.delete({ where: { id: progress.id } }),
        ]);
        return {remove:true};
    }
}