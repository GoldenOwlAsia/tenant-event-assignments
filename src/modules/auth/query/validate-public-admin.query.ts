import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { UnauthorizedException } from '@nestjs/common';

import { compareWithBcrypt } from '@/common/utils/hash.util';
import { PublicAdmin } from '../entity/public-admin.entity';

export class ValidatePublicAdminQuery {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

@QueryHandler(ValidatePublicAdminQuery)
export class ValidatePublicAdminHandler implements IQueryHandler<
  ValidatePublicAdminQuery,
  PublicAdmin
> {
  constructor(
    @InjectRepository(PublicAdmin)
    private readonly publicAdminRepository: EntityRepository<PublicAdmin>,
  ) {}

  async execute(query: ValidatePublicAdminQuery): Promise<PublicAdmin> {
    const admin = await this.publicAdminRepository.findOne({
      email: query.email,
    });
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await compareWithBcrypt({
      source: query.password,
      target: admin.password,
    });
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return admin;
  }
}
