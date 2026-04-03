import { EntityRepository } from '@mikro-orm/postgresql';

import { Event } from '../entities/event.entity';

export class EventRepository extends EntityRepository<Event> {}
