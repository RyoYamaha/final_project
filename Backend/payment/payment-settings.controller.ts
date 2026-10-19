import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Role } from '../common/constants/roles.enum';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateBankSettingsDto } from './dto/update-bank-settings.dto';
import { PaymentService } from './payment.service';

@Controller('admin/payment-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class PaymentSettingsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  getBankSettings() {
    return this.paymentService.getBankSettings();
  }

  @Patch()
  updateBankSettings(@Body() dto: UpdateBankSettingsDto) {
    return this.paymentService.updateBankSettings(dto);
  }
}
