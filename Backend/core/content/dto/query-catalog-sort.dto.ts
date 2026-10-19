import { IsIn, IsOptional } from 'class-validator';

export class QueryCatalogSortDto {
  @IsOptional()
  @IsIn(['name', 'popular'])
  sort: 'name' | 'popular' = 'name'; 
}
