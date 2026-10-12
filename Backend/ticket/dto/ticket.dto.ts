import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  body: string;
}

export class ReplyTicketDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  body: string;
}
