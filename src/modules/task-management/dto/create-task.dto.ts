import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTaskBodyRequestDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Ship release v1.0',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Optional task description',
    example: 'Finalize changelog and smoke tests.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Due date for the task',
    example: '2026-04-15T12:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate()
  @IsNotEmpty()
  dueDate: Date;
}

export class CreateTaskResponseDto {
  message: string;
}
