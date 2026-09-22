import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ContentModule } from '../core/content/content.module';
import { PublisherModule } from '../publisher/publisher.module';

@Module({
  imports: [PrismaModule, ContentModule, PublisherModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
