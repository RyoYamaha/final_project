import { Module } from '@nestjs/common';
import { PublisherService } from './publisher.service';
import { PublisherController } from './publisher.controller';
import { ContentModule } from '../core/content/content.module';
import { AuthModule } from '../user/auth/auth.module';

@Module({
  imports: [ContentModule, AuthModule],
  controllers: [PublisherController],
  providers: [PublisherService],
  exports: [PublisherService],
})
export class PublisherModule {}