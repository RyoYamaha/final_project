import { Module } from '@nestjs/common';
import { CommentController, PublicCommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../user/auth/auth.module';

@Module({
	imports: [PrismaModule, AuthModule],
	controllers: [CommentController, PublicCommentController],
	providers: [CommentService],
})
export class CommentModule {}
