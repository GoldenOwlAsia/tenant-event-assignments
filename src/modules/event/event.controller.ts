import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { EventService } from './event.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard';

@Controller('event')
@ApiTags('Event')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get(':taskId/failure-logs')
  getEventFailureLogs(@Param('taskId') taskId: string) {
    return this.eventService.getEventFailureLogs(taskId);
  }
}
