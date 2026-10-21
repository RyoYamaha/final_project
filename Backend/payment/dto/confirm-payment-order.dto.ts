import { IsDivisibleBy, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ConfirmPaymentOrderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  externalId: string;

  @IsInt()
  @Min(1_000)
  @Max(2_147_483_647)
  @IsDivisibleBy(1_000)
  paidAmount: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
