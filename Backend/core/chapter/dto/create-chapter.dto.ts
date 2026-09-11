import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class CreateChapterDto {
  @IsInt()
  @Min(1)
  number: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}