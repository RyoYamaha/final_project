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
        return this.prisma.readingProgress.upsert({
        where: {
            userId_contentId: { userId, contentId },
        },
        //update chạy khi user đã có tiến độ, create chạy khi người dùng chưa từng đọc content đó 
        //update số trang đã đọc xong khi người dùng đã có tiến độ
        update: {
            lastChapterId: chapterId,
            ...(lastPageNumber !== undefined && { lastPageNumber }),
            lastReadAt: new Date(),
        },
        // tạo tiến độ gồm số chap và số trang cuối người dùng đọc nếu người dùng chưa từng đọc qua  
        create:{ 
            userId,
            contentId,
            lastChapterId: chapterId,
            lastPageNumber: lastPageNumber ?? null,
        }


        })
    }
    async getProgress(userId : string , contentId: string){
        const progress = await this.prisma.readingProgress.findUnique({
            where: {
                userId_contentId: {userId, contentId},
            },
            include: { lastChapter: true } //lấy luôn thông tin của chapter thay vì trả về lastChapterId
        });
        if (!progress){
            throw new NotFoundException('you do not have reading progress for this content')
        }
        return progress;
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
        await this.prisma.readingProgress.delete({where: {id:progress.id}});
        return {remove:true};
    }
}