import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';

import { User } from '../entity/user.entity';
import { Role } from '@/modules/auth/enum/role.enum';
import { RegisterUserHandler } from './register-user.command';
import { LoginHandler } from './login.command';
import { RegisterBodyDto } from '../dto/register.dto';
import { RegisterUserCommand } from './register-user.command';
import { LoginCommand } from './login.command';

describe('Auth command handlers', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  const mockUserDto = {
    id: userId,
    email: 'user@example.com',
    name: 'Test User',
    role: Role.USER,
  };

  const mockUser = {
    id: userId,
    email: 'user@example.com',
    name: 'Test User',
    password: 'hashed-password',
    role: Role.USER,
    toDto: jest.fn().mockReturnValue(mockUserDto),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneOrFail: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockEm = {
    persist: jest.fn().mockReturnThis(),
    flush: jest.fn().mockResolvedValue(undefined),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('signed-jwt-token'),
  };

  let registerHandler: RegisterUserHandler;
  let loginHandler: LoginHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockEm.persist.mockReturnThis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUserHandler,
        LoginHandler,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: EntityManager,
          useValue: mockEm,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    registerHandler = module.get(RegisterUserHandler);
    loginHandler = module.get(LoginHandler);
  });

  describe('RegisterUserHandler', () => {
    const registerDto: RegisterBodyDto = {
      email: 'new@example.com',
      password: 'password12',
      name: 'New User',
      role: Role.USER,
    };

    it('should throw when email is already registered', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

      await expect(
        registerHandler.execute(new RegisterUserCommand(registerDto)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should create user, persist, and return dto', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);
      mockUserRepository.create.mockReturnValueOnce(mockUser);

      const result = await registerHandler.execute(
        new RegisterUserCommand(registerDto),
      );

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        email: registerDto.email,
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith(registerDto);
      expect(mockEm.persist).toHaveBeenCalledWith(mockUser);
      expect(mockEm.flush).toHaveBeenCalledTimes(1);
      expect(mockUser.toDto).toHaveBeenCalled();
      expect(result).toEqual(mockUserDto);
    });
  });

  describe('LoginHandler', () => {
    it('should return access token from jwt sign', async () => {
      const req = {
        id: userId,
        email: 'user@example.com',
        role: Role.USER,
        tenantId: 'public',
      };

      const result = await loginHandler.execute(new LoginCommand(req));

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: req.id,
        email: req.email,
        tenantId: req.tenantId,
        role: req.role,
        scope: 'tenant',
      });
      expect(result).toEqual({ accessToken: 'signed-jwt-token' });
    });
  });
});
