import { IsNotEmpty, IsString } from 'class-validator';

export class LogInBodyRequestDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LogInResponseDto {
  accessToken: string;
}
