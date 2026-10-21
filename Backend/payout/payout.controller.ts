import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreatePayoutRequestDto } from './dto/create-payout-request.dto';
import { QueryPayoutRequestsDto } from './dto/query-payout-requests.dto';
import { UpdatePayoutProfileDto } from './dto/update-payout-profile.dto';
import { PayoutService } from './payout.service';

@Controller('payout')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Author, Role.Publisher)
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get('profile')
  getProfile(@CurrentUser('id') userId: string) {
    return this.payoutService.getProfile(userId);
  }

  @Put('profile')
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePayoutProfileDto,
  ) {
    return this.payoutService.updateProfile(userId, dto);
  }

  @Get('minimum')
  getMinimum() {
    return this.payoutService.getMinimumPayout();
  }

  @Post('requests')
  createRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePayoutRequestDto,
  ) {
    return this.payoutService.requestPayout(userId, dto);
  }

  @Get('requests')
  getMyRequests(
    @CurrentUser('id') userId: string,
    @Query() query: QueryPayoutRequestsDto,
  ) {
    return this.payoutService.getMyRequests(
      userId,
      query.page,
      query.limit,
    );
  }
}
