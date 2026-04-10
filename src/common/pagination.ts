import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class PaginationQueryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  pageSize: number = 10;

  @IsString()
  @IsOptional()
  search: string = '';
}

export class PaginationResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}
