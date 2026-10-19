import { IsString, Length, Matches } from 'class-validator';

export class UpdateBankSettingsDto {
  @IsString()
  @Length(1, 100)
  bankName: string;

  @IsString()
  @Matches(/^[A-Za-z0-9]{3,20}$/)
  bankBin: string;

  @IsString()
  @Matches(/^\d{6,30}$/)
  bankAccountNumber: string;

  @IsString()
  @Length(1, 100)
  bankAccountName: string;
}
