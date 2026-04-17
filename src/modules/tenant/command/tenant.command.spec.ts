import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MikroORM } from '@mikro-orm/core';

import { InvalidTenantIdError } from '@/common/tenant/tenant-schema.util';
import {
  CreateTenantCommand,
  CreateTenantHandler,
} from './create-tenant.command';
import {
  DeactivateTenantCommand,
  DeactivateTenantHandler,
} from './deactivate-tenant.command';

describe('Tenant command handlers', () => {
  const mockExecute = jest.fn();
  const mockPersistAndFlush = jest.fn();
  const mockFindOne = jest.fn();
  const mockFlush = jest.fn();

  const mockOrm = {
    em: {
      getConnection: () => ({
        execute: mockExecute,
      }),
      persistAndFlush: mockPersistAndFlush,
      findOne: mockFindOne,
      flush: mockFlush,
    },
  };

  let createTenantHandler: CreateTenantHandler;
  let deactivateTenantHandler: DeactivateTenantHandler;

  beforeEach(async () => {
    jest.clearAllMocks();

    jest.spyOn(MikroORM, 'init').mockResolvedValue({
      migrator: { up: jest.fn().mockResolvedValue(undefined) },
      close: jest.fn().mockResolvedValue(undefined),
    } as unknown as MikroORM);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTenantHandler,
        DeactivateTenantHandler,
        {
          provide: MikroORM,
          useValue: mockOrm,
        },
      ],
    }).compile();

    createTenantHandler = module.get(CreateTenantHandler);
    deactivateTenantHandler = module.get(DeactivateTenantHandler);
  });

  describe('CreateTenantHandler', () => {
    it('should throw InvalidTenantIdError when tenant name is empty', async () => {
      await expect(
        createTenantHandler.execute(
          new CreateTenantCommand({ name: '', fromEmail: 'x@y.z' }),
        ),
      ).rejects.toBeInstanceOf(InvalidTenantIdError);

      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when schema already exists', async () => {
      mockExecute.mockResolvedValueOnce([{ '?column?': 1 }]);

      await expect(
        createTenantHandler.execute(
          new CreateTenantCommand({
            name: 'acme',
            fromEmail: 'noreply@acme.test',
          }),
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should create schema when missing', async () => {
      const mockMigratorUp = jest.fn().mockResolvedValue(undefined);
      const mockTenantOrmClose = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(MikroORM, 'init').mockResolvedValue({
        migrator: { up: mockMigratorUp },
        close: mockTenantOrmClose,
      } as unknown as MikroORM);

      mockExecute.mockResolvedValueOnce([]).mockResolvedValueOnce(undefined);
      mockPersistAndFlush.mockResolvedValueOnce(undefined);

      await createTenantHandler.execute(
        new CreateTenantCommand({
          name: 'acme',
          fromEmail: 'noreply@acme.test',
        }),
      );

      expect(mockExecute).toHaveBeenNthCalledWith(
        1,
        `SELECT 1 FROM information_schema.schemata WHERE schema_name = ? LIMIT 1`,
        ['acme'],
      );
      expect(mockExecute).toHaveBeenNthCalledWith(2, 'CREATE SCHEMA "acme"');
      expect(mockPersistAndFlush).toHaveBeenCalledTimes(1);
      expect(mockMigratorUp).toHaveBeenCalledTimes(1);
      expect(mockTenantOrmClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('DeactivateTenantHandler', () => {
    it('should throw InvalidTenantIdError when tenant name is empty', async () => {
      await expect(
        deactivateTenantHandler.execute(new DeactivateTenantCommand('')),
      ).rejects.toBeInstanceOf(InvalidTenantIdError);

      expect(mockFindOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when tenant is missing', async () => {
      mockFindOne.mockResolvedValueOnce(null);

      await expect(
        deactivateTenantHandler.execute(new DeactivateTenantCommand('acme')),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(mockFindOne).toHaveBeenCalled();
      expect(mockFlush).not.toHaveBeenCalled();
    });

    it('should set active to false and flush', async () => {
      const row = { name: 'acme', active: true };
      mockFindOne.mockResolvedValueOnce(row);
      mockFlush.mockResolvedValueOnce(undefined);

      await deactivateTenantHandler.execute(
        new DeactivateTenantCommand('acme'),
      );

      expect(row).toMatchObject({ active: false });
      expect(mockFlush).toHaveBeenCalledTimes(1);
    });
  });
});
