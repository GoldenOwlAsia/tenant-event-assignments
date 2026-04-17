import { Role } from '@/modules/auth/enum/role.enum';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

/** Registration cannot create system admins; use seed or DB. */
const REGISTERABLE_ROLES = [Role.USER, Role.REPORTER] as const;

export class RegisterBodyDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'user@assignment.local' })
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({ example: 'Password' })
  password: string;

  @IsIn(REGISTERABLE_ROLES)
  @IsNotEmpty()
  @ApiProperty({ enum: REGISTERABLE_ROLES, example: 'reporter' })
  role: (typeof REGISTERABLE_ROLES)[number];

  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(32)
  @ApiProperty({ example: 'John Doe' })
  name: string;
}
