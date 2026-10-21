import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { QueryRevenueHistoryDto } from './dto/query-revenue-history.dto';
import { RevenueService } from './revenue.service';

@Controller('revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Author, Role.Publisher)
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get('me')
  getSummary(@CurrentUser('id') userId: string) {
    return this.revenueService.getSummary(userId);
  }

  @Get('me/history')
  getHistory(
    @CurrentUser('id') userId: string,
    @Query() query: QueryRevenueHistoryDto,
  ) {
    return this.revenueService.getHistory(userId, query);
  }
}
