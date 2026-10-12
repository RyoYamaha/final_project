import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsUrl } from 'class-validator';

export class RegisterPublisherExternalDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  organizationName: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  verificationDocumentUrl?: string;
}
