import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdatePayoutSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(10)
  minimumCoins: number;
}
