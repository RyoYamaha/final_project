import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../common/constants/roles.enum';

const manageableRoles = [Role.Reader, Role.Author, Role.Publisher];

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsIn(manageableRoles)
  role?: Role.Reader | Role.Author | Role.Publisher;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;
}
