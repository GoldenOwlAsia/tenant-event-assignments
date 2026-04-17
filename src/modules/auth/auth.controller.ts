import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RegisterBodyDto } from './dto/register.dto';
import { RegisterUserCommand } from './command/register-user.command';
import { AdminLoginCommand } from './command/admin-login.command';
import type { IAdminLocalStrategy } from './command/admin-login.command';
import { LoginCommand } from './command/login.command';
import { GetMyInfoQuery } from './query/get-my-info.query';
import { FindAllUsersPaginatedQuery } from './query/find-all-users-paginated.query';
import { ILocalStrategy } from './strategies/local.strategy';
import { ApiBody, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { UserDto } from './dto/user.dto';
import { LogInBodyRequestDto, LogInResponseDto } from './dto/log-in.dto';
import { IJwtStrategy } from './strategies/jwt.strategy';
import {
  AdminLocalAuthGuard,
  JwtAuthGuard,
  LocalAuthGuard,
  RolesGuard,
} from './guard';
import { ReqUser } from '@/common/decorator/api.decorator';
import {
  PaginationQueryDto,
  PaginationResponseDto,
} from '@/common/dto/pagination.dto';
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
  @ApiSecurity('TENANT_ID_HEADER')
  @UseGuards(LocalAuthGuard)
  logIn(@ReqUser() user: ILocalStrategy): Promise<LogInResponseDto> {
    return this.commandBus.execute(new LoginCommand(user));
  }

  @Post('admin/login')
  @ApiBody({ type: LogInBodyRequestDto })
  @UseGuards(AdminLocalAuthGuard)
  adminLogin(@ReqUser() admin: IAdminLocalStrategy): Promise<LogInResponseDto> {
    return this.commandBus.execute(new AdminLoginCommand(admin));
  }

  @Post('register')
  @ApiSecurity({ bearer: [], TENANT_ID_HEADER: [] })
  register(@Body() registerDto: RegisterBodyDto): Promise<UserDto> {
    return this.commandBus.execute(new RegisterUserCommand(registerDto));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles([Role.USER, Role.REPORTER])
  @ApiSecurity({ bearer: [], TENANT_ID_HEADER: [] })
  getMyInfo(@ReqUser() user: IJwtStrategy): Promise<UserDto> {
    return this.queryBus.execute(new GetMyInfoQuery(user.id));
  }

  @Get('users')
  @ApiSecurity({ bearer: [], TENANT_ID_HEADER: [] })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles([Role.REPORTER])
  findAllUsers(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginationResponseDto<UserDto>> {
    return this.queryBus.execute(new FindAllUsersPaginatedQuery(query));
  }
}
