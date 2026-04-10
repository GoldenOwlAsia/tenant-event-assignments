import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { User } from './entity/user.entity';
import { Role } from '@/common/enum/role.enum';
import { compareWithBcrypt } from '@/common/utils/hash.helper';
import { RegisterUserHandler } from './command/register-user.command';
import { LoginHandler } from './command/login.command';
import { ValidateUserHandler } from './query/validate-user.query';
import { ValidateJwtUserHandler } from './query/validate-jwt-user.query';
import { GetMyInfoHandler } from './query/get-my-info.query';
import { FindAllUsersPaginatedHandler } from './query/find-all-users-paginated.query';
import { FindUserByEmailHandler } from './query/find-user-by-email.query';
import { RegisterUserCommand } from './command/register-user.command';
import { LoginCommand } from './command/login.command';
import { ValidateUserQuery } from './query/validate-user.query';
import { ValidateJwtUserQuery } from './query/validate-jwt-user.query';
import { GetMyInfoQuery } from './query/get-my-info.query';
import { FindAllUsersPaginatedQuery } from './query/find-all-users-paginated.query';
import { FindUserByEmailQuery } from './query/find-user-by-email.query';

jest.mock('@/common/utils/hash.helper', () => ({
  compareWithBcrypt: jest.fn(),
}));

describe('Auth CQRS handlers', () => {
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
  let validateUserHandler: ValidateUserHandler;
  let validateJwtUserHandler: ValidateJwtUserHandler;
  let getMyInfoHandler: GetMyInfoHandler;
  let findAllUsersPaginatedHandler: FindAllUsersPaginatedHandler;
  let findUserByEmailHandler: FindUserByEmailHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockEm.persist.mockReturnThis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUserHandler,
        LoginHandler,
        ValidateUserHandler,
        ValidateJwtUserHandler,
        GetMyInfoHandler,
        FindAllUsersPaginatedHandler,
        FindUserByEmailHandler,
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
    validateUserHandler = module.get(ValidateUserHandler);
    validateJwtUserHandler = module.get(ValidateJwtUserHandler);
    getMyInfoHandler = module.get(GetMyInfoHandler);
    findAllUsersPaginatedHandler = module.get(FindAllUsersPaginatedHandler);
    findUserByEmailHandler = module.get(FindUserByEmailHandler);
  });

  describe('RegisterUserHandler', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'password12',
      name: 'New User',
      role: Role.USER,
    };

    it('throws when email is already registered', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

      await expect(
        registerHandler.execute(new RegisterUserCommand(registerDto)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('creates user, persists, and returns dto', async () => {
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
    it('returns access token from jwt sign', async () => {
      const req = {
        id: userId,
        email: 'user@example.com',
        role: Role.USER,
      };

      const result = await loginHandler.execute(new LoginCommand(req));

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: req.id,
        email: req.email,
        role: req.role,
      });
      expect(result).toEqual({ accessToken: 'signed-jwt-token' });
    });
  });

  describe('ValidateUserHandler', () => {
    it('throws UnauthorizedException when password does not match', async () => {
      mockUserRepository.findOneOrFail.mockResolvedValueOnce(mockUser);
      jest.mocked(compareWithBcrypt).mockResolvedValueOnce(false);

      await expect(
        validateUserHandler.execute(
          new ValidateUserQuery('user@example.com', 'wrong'),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(compareWithBcrypt).toHaveBeenCalledWith({
        source: 'wrong',
        target: mockUser.password,
      });
    });

    it('returns user when credentials are valid', async () => {
      mockUserRepository.findOneOrFail.mockResolvedValueOnce(mockUser);
      jest.mocked(compareWithBcrypt).mockResolvedValueOnce(true);

      const result = await validateUserHandler.execute(
        new ValidateUserQuery('user@example.com', 'correct'),
      );

      expect(mockUserRepository.findOneOrFail).toHaveBeenCalledWith({
        email: 'user@example.com',
      });
      expect(result).toBe(mockUser);
    });
  });

  describe('ValidateJwtUserHandler', () => {
    it('loads user by sub, email, and role', async () => {
      const payload = {
        sub: userId,
        email: 'user@example.com',
        role: Role.USER,
      };
      mockUserRepository.findOneOrFail.mockResolvedValueOnce(mockUser);

      const result = await validateJwtUserHandler.execute(
        new ValidateJwtUserQuery(payload),
      );

      expect(mockUserRepository.findOneOrFail).toHaveBeenCalledWith({
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      });
      expect(result).toBe(mockUser);
    });
  });

  describe('GetMyInfoHandler', () => {
    it('returns user dto for id', async () => {
      mockUserRepository.findOneOrFail.mockResolvedValueOnce(mockUser);

      const result = await getMyInfoHandler.execute(new GetMyInfoQuery(userId));

      expect(mockUserRepository.findOneOrFail).toHaveBeenCalledWith({
        id: userId,
      });
      expect(mockUser.toDto).toHaveBeenCalled();
      expect(result).toEqual(mockUserDto);
    });
  });

  describe('FindUserByEmailHandler', () => {
    it('delegates to repository findOneOrFail', async () => {
      mockUserRepository.findOneOrFail.mockResolvedValueOnce(mockUser);

      const result = await findUserByEmailHandler.execute(
        new FindUserByEmailQuery('user@example.com'),
      );

      expect(mockUserRepository.findOneOrFail).toHaveBeenCalledWith({
        email: 'user@example.com',
      });
      expect(result).toBe(mockUser);
    });
  });

  describe('FindAllUsersPaginatedHandler', () => {
    it('returns users paginated', async () => {
      mockUserRepository.findAndCount.mockResolvedValueOnce([[mockUser], 1]);

      const query = { page: 1, pageSize: 10, search: '' };
      const result = await findAllUsersPaginatedHandler.execute(
        new FindAllUsersPaginatedQuery(query),
      );
      expect(result).toMatchObject({ total: 1, page: 1, pageSize: 10 });

      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith(
        {},
        {
          limit: 10,
          offset: 0,
          orderBy: { createdAt: 'DESC' },
        },
      );
    });

    it('returns users paginated with search', async () => {
      mockUserRepository.findAndCount.mockResolvedValueOnce([[mockUser], 1]);

      const query = { page: 1, pageSize: 10, search: 'test' };
      const result = await findAllUsersPaginatedHandler.execute(
        new FindAllUsersPaginatedQuery(query),
      );
      expect(result).toMatchObject({ total: 1, page: 1, pageSize: 10 });
      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith(
        {
          $or: [
            { name: { $ilike: '%test%' } },
            { email: { $ilike: '%test%' } },
          ],
        },
        {
          limit: 10,
          offset: 0,
          orderBy: { createdAt: 'DESC' },
        },
      );
    });
  });
});
