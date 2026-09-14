import { Module } from '@nestjs/common';
import { CommentController, PublicCommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
	imports: [PrismaModule],
	controllers: [CommentController, PublicCommentController],
	providers: [CommentService],
})
export class CommentModule {}
