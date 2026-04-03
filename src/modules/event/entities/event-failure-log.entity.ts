import { Entity, ManyToOne, Property } from '@mikro-orm/core';

import { Base } from '@/common/entity';
import { EventFailureLogRepository } from '../repository/event-failure-log.repository';
import { Event } from './event.entity';

@Entity({
  tableName: 'event_failure_logs',
  repository: () => EventFailureLogRepository,
})
export class EventFailureLog extends Base {
  @Property({ type: 'string' })
  tenantId: string;

  @Property({ type: 'string' })
  jobId: string;

  @Property({ type: 'number' })
  attempt: number;

  @ManyToOne(() => Event, { nullable: false })
  event: Event;
}
