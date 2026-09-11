import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';

@Module({
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService], // export để PublisherModule, AuthorModule import và gọi tạo Content
})
export class ContentModule {}