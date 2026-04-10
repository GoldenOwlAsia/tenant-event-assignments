import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { LogInResponseDto } from '../dto/log-in.dto';
import { TokenPayloadDto } from '../dto/token-payload.dto';
import { ILocalStrategy } from '../strategies/local.strategy';

export class LoginCommand {
  constructor(public readonly user: ILocalStrategy) {}
}

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<
  LoginCommand,
  LogInResponseDto
> {
  constructor(private readonly jwtService: JwtService) {}

  async execute(command: LoginCommand): Promise<LogInResponseDto> {
    const req = command.user;
    const payload: TokenPayloadDto = {
      sub: req.id,
      email: req.email,
      role: req.role,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
  }
}
