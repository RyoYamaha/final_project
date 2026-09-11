import {Injectable, NotFoundException, ConflictException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class BookmarkService{
    constructor(private readonly prisma: PrismaService){}

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
        return this.prisma.bookmark.create({data: {userId, contentId}});
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
}
