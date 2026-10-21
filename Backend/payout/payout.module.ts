import { Module } from '@nestjs/common';
import { AdminPayoutController } from './admin-payout.controller';
import { PayoutController } from './payout.controller';
import { PayoutService } from './payout.service';

@Module({
  controllers: [PayoutController, AdminPayoutController],
  providers: [PayoutService],
})
export class PayoutModule {}
