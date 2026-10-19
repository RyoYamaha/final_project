import { IsDivisibleBy, IsInt, Min } from 'class-validator';

export class CreateDepositDto {
  @IsInt()
  @Min(1000)
  @IsDivisibleBy(1000)
  amountVnd: number;
}
