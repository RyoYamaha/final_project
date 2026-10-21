import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class AssignBankTransactionDto {
  @IsUUID()
  paymentOrderId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
