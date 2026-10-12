import { IsString, IsEnum, IsOptional, IsArray, IsUUID, MaxLength } from 'class-validator';
import { StoryStatus } from '../../../common/constants/content.enum';

export class UpdateContentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  synopsis?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsEnum(StoryStatus)
  storyStatus?: StoryStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genreIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
