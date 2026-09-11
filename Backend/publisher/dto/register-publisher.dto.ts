import { IsString, MaxLength } from 'class-validator';

export class RegisterPublisherDto {
  @IsString()
  @MaxLength(255)
  organizationName: string;
}