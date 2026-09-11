import {Body, Controller, Delete, Get, Param, Post, UseGuards} from '@nestjs/common';
import { JwtAuthGuard} from 'common/guards/jwt-auth.guard';
import { CurrentUser } from 'common/decorators/current-user.decorator';
import { BookmarkService} from './bookmark.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

@UseGuards(JwtAuthGuard)
@Controller('bookmarks')
export class BookmarkController{
    constructor(private readonly service: BookmarkService){}
    @Post()
    addBookmark(@CurrentUser('id') userId: string, @Body() dto: CreateBookmarkDto){
        return this.service.addBookmark(userId, dto.contentId );
    }
    @Get()
    getBookmark(@CurrentUser('id') userId: string){
        return this.service.getMyContentByBookmark(userId);
    }
    @Delete(':contentId')
    deleteBookmark(@CurrentUser('id') userId: string, @Param('contentId') contentId: string){
        return this.service.RemoveBookmark(userId, contentId);
    }

}