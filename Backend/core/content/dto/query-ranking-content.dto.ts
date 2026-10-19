import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const RANKING_CATEGORIES = [
  'ongoing',
  'popular-manga',
  'popular-novel',
] as const;

export type RankingCategory = (typeof RANKING_CATEGORIES)[number];

export class QueryRankingContentDto {
  @IsIn(RANKING_CATEGORIES)
  category!: RankingCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
