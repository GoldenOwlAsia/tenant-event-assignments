import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogInBodyRequestDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'user@assignment.local' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Password' })
  password: string;
}

export class LogInResponseDto {
  accessToken: string;
}
