import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';

import { TokenPayloadDto } from '../dto/token-payload.dto';
import { Admin } from '../entity/admin.entity';

export class ValidateAdminJwtQuery {
  constructor(public readonly payload: TokenPayloadDto) {}
}

@QueryHandler(ValidateAdminJwtQuery)
export class ValidateAdminJwtHandler implements IQueryHandler<
  ValidateAdminJwtQuery,
  Admin
> {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: EntityRepository<Admin>,
  ) {}

  async execute(query: ValidateAdminJwtQuery): Promise<Admin> {
    const { sub, email } = query.payload;
    return await this.adminRepository.findOneOrFail({ id: sub, email });
  }
}
