import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ContentModule } from './core/content/content.module';
import { PublisherModule } from './publisher/publisher.module';
import { AuthorModule } from './author/author.module';
import { RatingModule } from './rating/rating.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { CommentModule } from './comment/comment.modult';
import { NotificationModule } from './notification/notification.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ContentModule,
    PublisherModule,
      AuthorModule,
      RatingModule,
      BookmarkModule,
      CommentModule,
      NotificationModule,
      ReportModule,
    // AuthModule sẽ thêm vào đây sau cùng
  ],
})
export class AppModule {}