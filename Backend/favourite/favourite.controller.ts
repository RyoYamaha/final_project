import {Body, Controller, Delete, Get,Param, Post, UseGuards } from '@nestjs/common';
import { FavouriteService } from './favourite.service';
import { CreateFavouriteDto } from './dto/create-favourite.dto';
import { JwtAuthGuard } from 'common/guards/jwt-auth.guard';
import { CurrentUser } from 'common/decorators/current-user.decorator';

@Controller('Favorite')
@UseGuards(JwtAuthGuard)
export class FavouriteController {
    constructor (private readonly service: FavouriteService){}
    @Post()
    async addFavorite(@CurrentUser ('id') userId: string, @Body() dto: CreateFavouriteDto){
        return await this.service.AddFavorite(userId, dto.contentId);
    }
    @Get()
    async getFavourite(@CurrentUser ('id') userId: string){
        return await this.service.getContentbyFavorite(userId);
    }
    @Delete(':contentId')
    async removiceFavorite(@CurrentUser ('id')userId: string, @Param('contentId') contentId: string){
        return await this.service.RemoveFavortie(userId, contentId);
    }
}
