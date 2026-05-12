import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('WEB_URL', 'http://localhost:5173'),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const swagger = new DocumentBuilder()
    .setTitle('Dranzo Payments API')
    .setDescription('Multi-tenant subscription, billing & compliance API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('api/docs', app, doc);

  const port = config.get<number>('API_PORT', 4000);
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`Swagger:        http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap:', err);
  process.exit(1);
});
