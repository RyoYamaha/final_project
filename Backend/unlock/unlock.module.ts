import { Module } from '@nestjs/common';
import { UnlockController } from './unlock.controller';
import { UnlockService } from './unlock.service';

@Module({
  controllers: [UnlockController],
  providers: [UnlockService],
  exports: [UnlockService],
})
export class UnlockModule {}
