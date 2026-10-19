import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service';
import { QueryContentDto } from './dto/query-content.dto';
import { QueryCatalogSortDto } from './dto/query-catalog-sort.dto';
import { QueryRankingContentDto } from './dto/query-ranking-content.dto';

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
  getTags(@Query() query: QueryCatalogSortDto) {
    return this.contentService.getTags(query.sort);
  }

  @Get('publishers')
  getPublishers(@Query() query: QueryCatalogSortDto) {
    return this.contentService.getPublishers(query.sort);
  }

  @Get('rankings')
  getRankings(@Query() query: QueryRankingContentDto) {
    return this.contentService.getRankedContents(query);
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
  findAll(@Query() query: QueryCatalogSortDto) {
    return this.contentService.getTags(query.sort);
  }
}
