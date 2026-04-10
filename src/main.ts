import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Assignment API')
    .setDescription('API documentation for the assignment service')
    .setVersion('1.0')
    .addBearerAuth()
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
