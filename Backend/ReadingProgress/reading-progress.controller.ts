import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReadingProgressService } from './reading-progress.service';
import { UpdateReadingProgressDto } from './dto/update-reading-progress.dto';

@UseGuards(JwtAuthGuard)
@Controller('reading-progress')
export class ReadingProgressController{
    constructor(private readonly service: ReadingProgressService){}
    @Put(':contentId')
    updateProgress( @CurrentUser('id') userId: string,  @Param('contentId') contentId: string, @Body() dto: UpdateReadingProgressDto
    ){
        return this.service.updateProgress( userId, contentId,dto.chapterId, dto.lastPageNumber);
    }
    @Get(':contentId')
    getProgress( @CurrentUser('id') userId: string, @Param('contentId') contentId: string 
    ){
        return this.service.getProgress(userId, contentId);
    }
    @Get()
    getMyProgress(@CurrentUser('id') userId: string){
        return this.service.getMyProgress(userId);
    }
    @Delete(':contentId')
    removeProgress(@CurrentUser('id') userId: string , @Param('contentId') contentId: string){
        return this.service.removeProgress(userId, contentId);
    }
}