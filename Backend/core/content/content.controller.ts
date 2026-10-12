import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service';
import { QueryContentDto } from './dto/query-content.dto';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // Lấy danh sách thể loại (/content/genres)
  @Get('genres')
  getGenres() {
    return this.contentService.getGenres();
  }

  // Lấy danh sách thẻ tag (/content/tags)
  @Get('tags')
  getTags() {
    return this.contentService.getTags();
  }

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

@Controller('genres')
export class GenreController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  findAll() {
    return this.contentService.getGenres();
  }
}

@Controller('tags')
export class TagController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  findAll() {
    return this.contentService.getTags();
  }
}