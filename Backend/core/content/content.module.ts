import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentValidationService } from './content-validation.service';
import { ContentController, GenreController, TagController } from './content.controller';

@Module({
  controllers: [ContentController, GenreController, TagController],
  providers: [ContentService, ContentValidationService],
  exports: [ContentService], 
})
export class ContentModule {}