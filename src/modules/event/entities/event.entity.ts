import { Entity, Property } from '@mikro-orm/core';

import { EventStatus } from '@/common/enum/status.enum';
import { Base } from '@/common/entity';
import { PayLoadData } from '../dto';
import { EventRepository } from '../repository/event.repository';

@Entity({ tableName: 'event', repository: () => EventRepository })
export class Event extends Base {
  @Property({ type: 'string', nullable: false })
  taskId: string;

  @Property({ type: 'jsonb', nullable: true })
  payload: PayLoadData;

  @Property({ type: 'string', nullable: false, default: EventStatus.PENDING })
  status: EventStatus;
}
