import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ContentType, OwnershipTier, PublicationStatus } from '../../../common/constants/content.enum';

export class QueryContentDto {
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @IsOptional()
  @IsEnum(OwnershipTier)
  ownershipTier?: OwnershipTier;

  @IsOptional()
  @IsEnum(PublicationStatus)
  publicationStatus?: PublicationStatus;

  @IsOptional()
  @IsString()
  search?: string; // tìm theo title

  @IsOptional()
  @IsString()
  genreId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}