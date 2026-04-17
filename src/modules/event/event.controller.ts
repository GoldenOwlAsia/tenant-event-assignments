import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { EventService } from './event.service';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard';
import { RolesGuard } from '@/modules/auth/guard/role.guard';

@Controller('event')
@ApiTags('Event')
@ApiSecurity({ bearer: [], TENANT_ID_HEADER: [] })
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get(':taskId/failure-logs')
  getEventFailureLogs(@Param('taskId') taskId: string) {
    return this.eventService.getEventFailureLogs(taskId);
  }
}
