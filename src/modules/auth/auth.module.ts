import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { User } from './entity/user.entity';
import { LocalStrategy } from './strategies/local.strategy';
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

const authHandlers = [
  RegisterUserHandler,
  LoginHandler,
  ValidateUserHandler,
  ValidateJwtUserHandler,
  GetMyInfoHandler,
  FindAllUsersPaginatedHandler,
  FindUserByEmailHandler,
];

@Module({
  imports: [
    CqrsModule,
    MikroOrmModule.forFeature([User]),
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
  providers: [...authHandlers, LocalStrategy, JwtStrategy],
})
export class AuthModule {}
