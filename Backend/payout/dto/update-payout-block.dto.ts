import { IsBoolean } from 'class-validator';

export class UpdatePayoutBlockDto {
  @IsBoolean()
  payoutBlocked: boolean;
}
