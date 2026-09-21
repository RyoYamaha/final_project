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
import { AuthModule } from './user/auth/auth.module';
import { MangaModule } from './manga/manga.module';
import { NovelModule } from './novel/novel.module';
import { HealthModule } from './health/health.module';

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
      AuthModule,
      MangaModule,
      NovelModule,
      HealthModule,
  ],
})
export class AppModule {}