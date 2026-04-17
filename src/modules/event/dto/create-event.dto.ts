import { EventType } from '@/modules/event/enum/event.enum';
import { SendMailData, PayLoadData } from './payload.dto';
import { IsString, IsNotEmpty, IsObject, IsEnum } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsEnum(EventType)
  @IsNotEmpty()
  event: EventType;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsObject()
  @IsNotEmpty()
  data: PayLoadData | SendMailData;
}

export class EventPayload {
  eventId: string;
  tenantId: string;
  taskId: string;
  data: PayLoadData | SendMailData;
}
