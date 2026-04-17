import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MikroORM } from '@mikro-orm/core';

import {
  FindTenantByNameHandler,
  FindTenantByNameQuery,
} from './find-tenant-by-name.query';

describe('Tenant query handlers', () => {
  const mockExecute = jest.fn();
  const mockFindOne = jest.fn();

  const mockOrm = {
    em: {
      findOne: mockFindOne,
      getConnection: () => ({
        execute: mockExecute,
      }),
    },
  };

  let findTenantByNameHandler: FindTenantByNameHandler;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindTenantByNameHandler,
        {
          provide: MikroORM,
          useValue: mockOrm,
        },
      ],
    }).compile();

    findTenantByNameHandler = module.get(FindTenantByNameHandler);
  });

  describe('FindTenantByNameHandler', () => {
    it('should resolve when tenant is registered in public.tenant', async () => {
      mockFindOne.mockResolvedValueOnce({ id: '1', name: 'acme' });

      await findTenantByNameHandler.execute(new FindTenantByNameQuery('acme'));

      expect(mockFindOne).toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should resolve when tenant schema exists (legacy, no registry row)', async () => {
      mockFindOne.mockResolvedValueOnce(null);
      mockExecute.mockResolvedValueOnce([{ '?column?': 1 }]);

      await findTenantByNameHandler.execute(new FindTenantByNameQuery('acme'));

      expect(mockExecute).toHaveBeenCalledWith(
        `SELECT 1 FROM information_schema.schemata WHERE schema_name = ? LIMIT 1`,
        ['acme'],
      );
    });

    it('should throw NotFoundException when schema is missing', async () => {
      mockFindOne.mockResolvedValueOnce(null);
      mockExecute.mockResolvedValueOnce([]);

      await expect(
        findTenantByNameHandler.execute(new FindTenantByNameQuery('missing')),
      ).rejects.toThrow(NotFoundException);

      expect(mockExecute).toHaveBeenCalledWith(
        `SELECT 1 FROM information_schema.schemata WHERE schema_name = ? LIMIT 1`,
        ['missing'],
      );
    });
  });
});
