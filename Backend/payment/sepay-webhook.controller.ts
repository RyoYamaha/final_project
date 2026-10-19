import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { SepayWebhookGuard } from './sepay-webhook.guard';

@Controller('payments/webhook/sepay')
export class SepayWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(SepayWebhookGuard)
  handleWebhook(@Body() payload: unknown) {
    return this.paymentService.handleSepayWebhook(payload);
  }
}
