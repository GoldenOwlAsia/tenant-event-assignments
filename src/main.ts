import { BadRequestException } from '@nestjs/common';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';

import { AppModule } from './app.module';
import {
  getPublicSchema,
  getRequestPath,
  isPublicManagementPath,
  TENANT_ID_HEADER,
} from './common/tenant';
import {
  InvalidTenantIdError,
  sanitizedTenantName,
} from './common/tenant/tenant-schema.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const orm = app.get(MikroORM);

  const skipTenantForPath = (path: string) =>
    path === '/api/docs' ||
    path.startsWith('/api/docs/') ||
    path === '/api/docs-json';

  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = getRequestPath(req);

    if (skipTenantForPath(path)) {
      return next();
    }

    if (isPublicManagementPath(path)) {
      const publicSchema = getPublicSchema();
      return RequestContext.create(orm.em, next, { schema: publicSchema });
    }

    const rawHeader = req.headers[TENANT_ID_HEADER];
    const raw = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (!raw?.trim()) {
      return res.status(400).json({
        statusCode: 400,
        message: `Missing required header "${TENANT_ID_HEADER}" for this route.`,
      });
    }

    let schema: string;
    try {
      schema = sanitizedTenantName(String(raw));
    } catch (e: unknown) {
      if (e instanceof InvalidTenantIdError) {
        return next(new BadRequestException(e.message));
      }
      throw e;
    }
    RequestContext.create(orm.em, next, { schema });
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Assignment API')
    .setDescription('API documentation for the assignment service')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', in: 'header', name: TENANT_ID_HEADER },
      'TENANT_ID_HEADER',
    )
    .build();

  const swaggerApp = app as any;
  const swaggerDocument = SwaggerModule.createDocument(
    swaggerApp,
    swaggerConfig,
  );
  SwaggerModule.setup('api/docs', swaggerApp, swaggerDocument);

  await app.listen(parseInt(process.env.PORT, 10) || 3000);
}
bootstrap();
