import { Controller, Get, Param, Post,
Body,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { PaymentService } from './payment.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('deposits')
  createDeposit(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDepositDto,
  ) {
    return this.paymentService.createDeposit(userId, dto);
  }

  @Get(':id')
  getPaymentOrder(
    @CurrentUser('id') userId: string,
    @Param('id') paymentOrderId: string,
  ) {
    return this.paymentService.getPaymentOrder(userId, paymentOrderId);
  }
}
