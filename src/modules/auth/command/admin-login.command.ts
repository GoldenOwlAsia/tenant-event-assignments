import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';

import { Role } from '@/modules/auth/enum/role.enum';

import { LogInResponseDto } from '../dto/log-in.dto';
import { TokenPayloadDto } from '../dto/token-payload.dto';

export interface IAdminLocalStrategy {
  id: string;
  email: string;
}

export class AdminLoginCommand {
  constructor(public readonly admin: IAdminLocalStrategy) {}
}

@CommandHandler(AdminLoginCommand)
export class AdminLoginHandler implements ICommandHandler<
  AdminLoginCommand,
  LogInResponseDto
> {
  constructor(private readonly jwtService: JwtService) {}

  async execute(command: AdminLoginCommand): Promise<LogInResponseDto> {
    const { id, email } = command.admin;
    const payload: TokenPayloadDto = {
      sub: id,
      email,
      role: Role.ADMIN,
      scope: 'management',
    };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
