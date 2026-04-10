import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { User } from '../entity/user.entity';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { BadRequestException } from '@nestjs/common';
import { UserDto } from '../dto/user.dto';
import { RegisterBodyDto } from '../dto/register.dto';

export class RegisterUserCommand {
  constructor(public readonly registerDto: RegisterBodyDto) {}
}

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<
  RegisterUserCommand,
  UserDto
> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly em: EntityManager,
  ) {}

  async execute(command: RegisterUserCommand): Promise<UserDto> {
    const { registerDto } = command;
    const existingUser = await this.userRepository.findOne({
      email: registerDto.email,
    });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }
    const user = this.userRepository.create(registerDto);

    await this.em.persist(user).flush();

    return user.toDto();
  }
}
