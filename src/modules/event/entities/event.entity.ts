import { Entity, Property } from '@mikro-orm/core';

import { Status } from '@/common/enum/status.enum';
import { Base } from '@/common/entity';
import { PayloadDto } from '../dto';
import { EventRepository } from '../repository/event.repository';

@Entity({ tableName: 'event', repository: () => EventRepository })
export class Event extends Base {
  @Property({ type: 'string', unique: true })
  tenantId: string;

  @Property({ type: 'jsonb', nullable: true })
  payload: PayloadDto;

  @Property({ type: 'string', nullable: false, default: Status.PENDING })
  status: Status;
}
