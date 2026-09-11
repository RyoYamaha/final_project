import {Body, Delete, Get, Param, Post, Controller, UseGuards} from '@nestjs/common';
import { JwtAuthGuard } from 'common/guards/jwt-auth.guard';
import { CurrentUser } from 'common/decorators/current-user.decorator';
import {RatingService} from './rating.service';
import { CreateRatingDto } from './dto/create-rating.dto';
@UseGuards(JwtAuthGuard)
@Controller('rating') 
export class RatingController{
    constructor (private readonly service: RatingService){}
    @Post()
    async CreateRating(@CurrentUser('id') userId: string, @Body () dto: CreateRatingDto){
        return this.service.UpsertRating(userId, dto.contentId, dto.score);
    }
    @Get(':contentId/summary')
    async getSummary(@Param('contentId') contentId: string){
        return this.service.getSummary(contentId);
    }
    @Get(':contentId')
    async getRating(@CurrentUser ('id') userId: string, @Param('contentId') contentId: string){
        return this.service.getMyRating(userId, contentId);
    }

    @Delete(':contentId')
    async deleteRating(@CurrentUser ('id') userId: string, @Param('contentId') contentId: string){
        return this.service.RemoveRating(userId, contentId);
    }
}