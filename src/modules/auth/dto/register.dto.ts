import { Role } from '@/modules/auth/enum/role.enum';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';

export class RegisterBodyDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'user@assignment.local' })
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({ example: 'Password' })
  password: string;

  @IsEnum(Role)
  @IsNotEmpty()
  @ApiProperty({ example: 'reporter' })
  role: Role;

  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(32)
  @ApiProperty({ example: 'John Doe' })
  name: string;
}
