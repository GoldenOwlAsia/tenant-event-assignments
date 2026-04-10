import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, type: Number })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, type: Number })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  pageSize: number = 10;

  @ApiPropertyOptional({ default: '', type: String })
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
