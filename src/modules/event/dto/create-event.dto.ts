import { EventType } from '@/common/enum/event.enum';
import { SendMailData, PayLoadData } from './payload.dto';
import { IsString, IsNotEmpty, IsObject, IsEnum } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsEnum(EventType)
  @IsNotEmpty()
  event: EventType;

  @IsObject()
  @IsNotEmpty()
  data: PayLoadData | SendMailData;
}

export class EventPayload {
  eventId: string;
  taskId: string;
  data: PayLoadData | SendMailData;
}
