import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RegisterBodyDto } from './dto/register.dto';
import { RegisterUserCommand } from './command/register-user.command';
import { LoginCommand } from './command/login.command';
import { GetMyInfoQuery } from './query/get-my-info.query';
import { FindAllUsersPaginatedQuery } from './query/find-all-users-paginated.query';
import { AuthGuard } from '@nestjs/passport';
import { ILocalStrategy } from './strategies/local.strategy';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserDto } from './dto/user.dto';
import { LogInBodyRequestDto, LogInResponseDto } from './dto/log-in.dto';
import { IJwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard, LocalAuthGuard, RolesGuard } from './guard';
import { ReqUser } from '@/common/decorator/api.decorator';
import { PaginationQueryDto, PaginationResponseDto } from '@/common/dto/pagination.dto';
import { Roles } from '@/common/decorator/roles.decorator';
import { Role } from '@/modules/auth/enum/role.enum';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('login')
  @ApiBody({ type: LogInBodyRequestDto })
  @UseGuards(LocalAuthGuard)
  logIn(@ReqUser() user: ILocalStrategy): Promise<LogInResponseDto> {
    return this.commandBus.execute(new LoginCommand(user));
  }

  @Post('register')
  register(@Body() registerDto: RegisterBodyDto): Promise<UserDto> {
    return this.commandBus.execute(new RegisterUserCommand(registerDto));
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  getMyInfo(@ReqUser() user: IJwtStrategy): Promise<UserDto> {
    return this.queryBus.execute(new GetMyInfoQuery(user.id));
  }

  @Get('users')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles([Role.REPORTER])
  findAllUsers(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginationResponseDto<UserDto>> {
    return this.queryBus.execute(new FindAllUsersPaginatedQuery(query));
  }
}
