import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController, GenreController, TagController } from './content.controller';

@Module({
  controllers: [ContentController, GenreController, TagController],
  providers: [ContentService],
  exports: [ContentService], 
})
export class ContentModule {}