import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(63)
  @ApiProperty({
    example: 'gos',
    description:
      'Tenant identifier (letters, digits, hyphens, underscores); normalized to a safe schema name.',
  })
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    example: 'noreply@gos.example',
    description: 'From address for outbound mail for this tenant.',
  })
  fromEmail!: string;
}
