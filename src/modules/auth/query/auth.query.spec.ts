import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { UnauthorizedException } from '@nestjs/common';

import { User } from '../entity/user.entity';
import { Role } from '@/modules/auth/enum/role.enum';
import { compareWithBcrypt } from '@/common/utils/hash.util';
import { ValidateUserHandler } from './validate-user.query';
import { ValidateJwtUserHandler } from './validate-jwt-user.query';
import { GetMyInfoHandler } from './get-my-info.query';
import { FindAllUsersPaginatedHandler } from './find-all-users-paginated.query';
import { FindUserByEmailHandler } from './find-user-by-email.query';
import { ValidateUserQuery } from './validate-user.query';
import { ValidateJwtUserQuery } from './validate-jwt-user.query';
import { GetMyInfoQuery } from './get-my-info.query';
import { FindAllUsersPaginatedQuery } from './find-all-users-paginated.query';
import { FindUserByEmailQuery } from './find-user-by-email.query';

jest.mock('@/common/utils/hash.util', () => ({
  compareWithBcrypt: jest.fn(),
}));

describe('Auth query handlers', () => {
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

  let validateUserHandler: ValidateUserHandler;
  let validateJwtUserHandler: ValidateJwtUserHandler;
  let getMyInfoHandler: GetMyInfoHandler;
  let findAllUsersPaginatedHandler: FindAllUsersPaginatedHandler;
  let findUserByEmailHandler: FindUserByEmailHandler;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateUserHandler,
        ValidateJwtUserHandler,
        GetMyInfoHandler,
        FindAllUsersPaginatedHandler,
        FindUserByEmailHandler,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    validateUserHandler = module.get(ValidateUserHandler);
    validateJwtUserHandler = module.get(ValidateJwtUserHandler);
    getMyInfoHandler = module.get(GetMyInfoHandler);
    findAllUsersPaginatedHandler = module.get(FindAllUsersPaginatedHandler);
    findUserByEmailHandler = module.get(FindUserByEmailHandler);
  });

  describe('ValidateUserHandler', () => {
    it('should throw UnauthorizedException when password does not match', async () => {
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

    it('should return user when credentials are valid', async () => {
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
    it('should load user by sub, email, and role', async () => {
      const payload = {
        sub: userId,
        email: 'user@example.com',
        role: Role.USER,
        tenantId: 'public',
        scope: 'tenant' as const,
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
    it('should return user dto for id', async () => {
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
    it('should delegate to repository findOneOrFail', async () => {
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
    it('should return users paginated', async () => {
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

    it('should return users paginated with search', async () => {
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
