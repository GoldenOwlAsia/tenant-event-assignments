import { EntityRepository } from '@mikro-orm/postgresql';

import { Event } from '../entities/event.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EventRepository extends EntityRepository<Event> {}
