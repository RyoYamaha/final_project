import { Injectable, NotFoundException, ConflictException} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class FavouriteService{
    constructor(private readonly prisma: PrismaService){}
    async AddFavorite(userId: string, contentId: string){
        const content = await this.prisma.favorite.findUnique({where:{userId_contentId:{userId, contentId}}});
        if (content){
            throw new ConflictException('this content already have favourite');
        }
        return this.prisma.favorite.create({data: {userId, contentId}});
    }
    async getContentbyFavorite(userId){
         return this.prisma.favorite.findMany({where: {userId}, include: {content:true}, orderBy: {createdAt: 'desc'} })
    }
    async RemoveFavortie( userId, contentId){
        const existing = await this.prisma.favorite.findUnique({where: {userId_contentId: {userId, contentId}}});
        if (!existing){
            throw new NotFoundException('can not found the favourite of this content');
        }
        this.prisma.favorite.delete({where:{id: existing.id}});
        return {remove: true};
    }
}
