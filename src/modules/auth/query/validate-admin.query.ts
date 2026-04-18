import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { UnauthorizedException } from '@nestjs/common';

import { compareWithBcrypt } from '@/common/utils/hash.util';
import { Admin } from '../entity/admin.entity';

export class ValidateAdminQuery {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

@QueryHandler(ValidateAdminQuery)
export class ValidateAdminHandler implements IQueryHandler<
  ValidateAdminQuery,
  Admin
> {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: EntityRepository<Admin>,
  ) {}

  async execute(query: ValidateAdminQuery): Promise<Admin> {
    const admin = await this.adminRepository.findOne({
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
