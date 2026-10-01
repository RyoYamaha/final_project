import { Module } from '@nestjs/common';
import { CommentController, PublicCommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
	controllers: [CommentController, PublicCommentController],
	providers: [CommentService],
})
export class CommentModule {}
