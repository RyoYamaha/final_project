import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNovelModerationKeywordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  keyword!: string;
}
