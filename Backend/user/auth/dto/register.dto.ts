import { IsEmail, IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';

export enum UserRole {
  Reader = 'Reader',
  Author = 'Author',
  Publisher = 'Publisher',
}

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}