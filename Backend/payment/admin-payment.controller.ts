import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../common/constants/roles.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AssignBankTransactionDto } from './dto/assign-bank-transaction.dto';
import { ConfirmPaymentOrderDto } from './dto/confirm-payment-order.dto';
import { QueryAdminBankTransactionsDto } from './dto/query-admin-bank-transactions.dto';
import { QueryAdminPaymentOrdersDto } from './dto/query-admin-payment-orders.dto';
import { PaymentService } from './payment.service';

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('orders')
  getPendingOrders(@Query() query: QueryAdminPaymentOrdersDto) {
    return this.paymentService.getAdminPaymentOrders(
      query.page,
      query.limit,
    );
  }

  @Get('bank-transactions')
  getBankTransactions(@Query() query: QueryAdminBankTransactionsDto) {
    return this.paymentService.getAdminBankTransactions(query);
  }

  @Patch('bank-transactions/:id/assign')
  assignBankTransaction(
    @CurrentUser('id') adminId: string,
    @Param('id') bankTransactionId: string,
    @Body() dto: AssignBankTransactionDto,
  ) {
    return this.paymentService.assignBankTransaction(
      adminId,
      bankTransactionId,
      dto,
    );
  }

  @Post('orders/:id/confirm')
  confirmPaymentOrder(
    @CurrentUser('id') adminId: string,
    @Param('id') paymentOrderId: string,
    @Body() dto: ConfirmPaymentOrderDto,
  ) {
    return this.paymentService.confirmPaymentOrderManually(
      adminId,
      paymentOrderId,
      dto,
    );
  }
}
