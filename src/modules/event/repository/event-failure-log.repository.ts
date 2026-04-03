import { EntityRepository } from '@mikro-orm/postgresql';
import { EventFailureLog } from '../entities/event-failure-log.entity';

export class EventFailureLogRepository extends EntityRepository<EventFailureLog> {}
