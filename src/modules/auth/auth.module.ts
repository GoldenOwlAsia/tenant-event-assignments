import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { Admin } from './entity/admin.entity';
import { User } from './entity/user.entity';
import { AdminLoginHandler } from './command/admin-login.command';
import { LocalStrategy } from './strategies/local.strategy';
import { LocalAdminStrategy } from './strategies/local-admin.strategy';
import { ValidateAdminHandler } from './query/validate-admin.query';
import { ValidateAdminJwtHandler } from './query/validate-admin-jwt.query';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CqrsModule } from '@nestjs/cqrs';
import { RegisterUserHandler } from './command/register-user.command';
import { LoginHandler } from './command/login.command';
import { ValidateUserHandler } from './query/validate-user.query';
import { ValidateJwtUserHandler } from './query/validate-jwt-user.query';
import { GetMyInfoHandler } from './query/get-my-info.query';
import { FindAllUsersPaginatedHandler } from './query/find-all-users-paginated.query';
import { FindUserByEmailHandler } from './query/find-user-by-email.query';
import { RolesGuard } from './guard/role.guard';

const authHandlers = [
  RegisterUserHandler,
  LoginHandler,
  AdminLoginHandler,
  ValidateUserHandler,
  ValidateJwtUserHandler,
  ValidateAdminHandler,
  ValidateAdminJwtHandler,
  GetMyInfoHandler,
  FindAllUsersPaginatedHandler,
  FindUserByEmailHandler,
];

@Module({
  imports: [
    CqrsModule,
    MikroOrmModule.forFeature([User, Admin]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('jwt.expiresIn') as never,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    ...authHandlers,
    LocalStrategy,
    LocalAdminStrategy,
    JwtStrategy,
    RolesGuard,
  ],
})
export class AuthModule {}
