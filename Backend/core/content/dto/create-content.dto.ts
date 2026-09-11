import { IsString, IsEnum, IsOptional, IsArray, IsUUID, MaxLength } from 'class-validator';
import { ContentType } from '../../../common/constants/content.enum';

export class CreateContentDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  synopsis?: string;

  @IsEnum(ContentType)
  type: ContentType;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  genreIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}