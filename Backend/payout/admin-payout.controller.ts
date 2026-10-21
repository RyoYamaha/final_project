import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { QueryPayoutRequestsDto } from './dto/query-payout-requests.dto';
import { RejectPayoutDto } from './dto/reject-payout.dto';
import { UpdatePayoutBlockDto } from './dto/update-payout-block.dto';
import { UpdatePayoutSettingsDto } from './dto/update-payout-settings.dto';
import { PayoutService } from './payout.service';

@Controller('admin/payout')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class AdminPayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get('requests')
  getPendingRequests(@Query() query: QueryPayoutRequestsDto) {
    return this.payoutService.getPendingRequests(
      query.page,
      query.limit,
    );
  }

  @Patch('requests/:id/paid')
  markPaid(
    @Param('id') requestId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.payoutService.markPaid(requestId, adminId);
  }

  @Patch('requests/:id/reject')
  reject(
    @Param('id') requestId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectPayoutDto,
  ) {
    return this.payoutService.reject(requestId, adminId, dto);
  }

  @Get('settings')
  getSettings() {
    return this.payoutService.getMinimumPayout();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdatePayoutSettingsDto) {
    return this.payoutService.updateMinimumPayout(dto);
  }

  @Patch('users/:userId/block')
  setPayoutBlocked(
    @Param('userId') userId: string,
    @Body() dto: UpdatePayoutBlockDto,
  ) {
    return this.payoutService.setPayoutBlocked(userId, dto.payoutBlocked);
  }
}
