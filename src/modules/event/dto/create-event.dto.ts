import { PayloadDto } from './payload.dto';
import { IsString, IsNotEmpty, IsUUID, IsObject } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsObject()
  @IsNotEmpty()
  payload: PayloadDto;
}
