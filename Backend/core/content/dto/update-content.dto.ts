import { IsString, IsEnum, IsOptional, IsArray, MaxLength, IsInt, Min, Max,IsBoolean} from 'class-validator';
import {
  ContentPricingType,
  StoryStatus,
} from '../../../common/constants/content.enum';

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
  @IsEnum(ContentPricingType)
  pricingType?: ContentPricingType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  priceCoins?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  freeChapters?: number;

  @IsOptional()
  @IsBoolean()
  allowCommunityTranslation?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genreIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
