import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service';
import { QueryContentDto } from './dto/query-content.dto';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // Public — không cần login, ai cũng xem được danh sách/đọc truyện
  @Get()
  findAll(@Query() query: QueryContentDto) {
    return this.contentService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }
}