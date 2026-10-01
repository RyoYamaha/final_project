import { Module } from '@nestjs/common';
import { PublisherService } from './publisher.service';
import { PublisherController } from './publisher.controller';
import { ContentModule } from '../core/content/content.module';

@Module({
  imports: [ContentModule],
  controllers: [PublisherController],
  providers: [PublisherService],
  exports: [PublisherService],
})
export class PublisherModule {}