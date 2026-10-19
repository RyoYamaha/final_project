import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentSettingsController } from './payment-settings.controller';
import { SepayWebhookController } from './sepay-webhook.controller';
import { SepayWebhookGuard } from './sepay-webhook.guard';

@Module({
  controllers: [
    PaymentController,
    PaymentSettingsController,
    SepayWebhookController,
  ],
  providers: [PaymentService, SepayWebhookGuard],
})
export class PaymentModule {}
