import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import {CommentService} from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import {JwtAuthGuard} from 'common/guards/jwt-auth.guard';
import { CurrentUser } from 'common/decorators/current-user.decorator';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentController{
    constructor(private readonly service: CommentService){}

    @Post()
    async addComment(@CurrentUser('id') userId: string, @Body() dto: CreateCommentDto) {
        return this.service.CreateComment(userId, dto.contentId, dto.body, dto.parentCommentId);
    }

    @Delete(':commentId')
    async deleteComment(@CurrentUser('id') userId: string, @Param('commentId') commentId: string){
        return this.service.DeleteComment(userId, commentId);
    }
}

@Controller('comments')
export class PublicCommentController {
    constructor(private readonly service: CommentService) {}

    @Get(':contentId')
    async getComment(@Param('contentId') contentId: string) {
        return this.service.GetComment(contentId);
    }
}