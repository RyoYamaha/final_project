import { Controller, Get, Param, Query, Patch, UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { QueryContentDto } from './dto/query-content.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';

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

  // Chỉ Admin duyệt
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  approve(@Param('id') id: string) {
    return this.contentService.approve(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  reject(@Param('id') id: string) {
    return this.contentService.reject(id);
  }

  @Patch(':id/hide')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  hide(@Param('id') id: string) {
    return this.contentService.hide(id);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  restore(@Param('id') id: string) {
    return this.contentService.restore(id);
  }
}