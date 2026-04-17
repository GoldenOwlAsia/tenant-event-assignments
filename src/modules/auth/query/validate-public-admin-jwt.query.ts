import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';

import { TokenPayloadDto } from '../dto/token-payload.dto';
import { PublicAdmin } from '../entity/public-admin.entity';

export class ValidatePublicAdminJwtQuery {
  constructor(public readonly payload: TokenPayloadDto) {}
}

@QueryHandler(ValidatePublicAdminJwtQuery)
export class ValidatePublicAdminJwtHandler implements IQueryHandler<
  ValidatePublicAdminJwtQuery,
  PublicAdmin
> {
  constructor(
    @InjectRepository(PublicAdmin)
    private readonly publicAdminRepository: EntityRepository<PublicAdmin>,
  ) {}

  async execute(query: ValidatePublicAdminJwtQuery): Promise<PublicAdmin> {
    const { sub, email } = query.payload;
    return await this.publicAdminRepository.findOneOrFail({ id: sub, email });
  }
}
