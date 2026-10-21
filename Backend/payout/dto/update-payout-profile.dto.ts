import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdatePayoutProfileDto {
  @IsString()
  @Matches(/\S/)
  @MinLength(2)
  @MaxLength(100)
  bankName: string;

  @IsString()
  @Matches(/\S/)
  @MinLength(1)
  @MaxLength(20)
  bankBin: string;

  @IsString()
  @Matches(/\S/)
  @MinLength(1)
  @MaxLength(30)
  bankAccountNumber: string;

  @IsString()
  @Matches(/\S/)
  @MinLength(2)
  @MaxLength(100)
  bankAccountName: string;
}
