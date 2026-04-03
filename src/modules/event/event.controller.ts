import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  create(@Body() bodyRequest: CreateEventDto) {
    return this.eventService.createEvent(bodyRequest);
  }

  @Get(':id/failure-logs')
  getEventFailureLogs(@Param('id') tenantId: string) {
    return this.eventService.getEventFailureLogs(tenantId);
  }
}
