import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { ExceptionHandler } from './common/exceptions/app-exception.filter';
import { setupSwagger } from './config/setups/swagger.setup';
import { useContainer } from 'class-validator';
import { setupLogger } from './config/setups/logger.setup';
import { setupCors } from './config/setups/cors.setup';

async function bootstrap() {

  // bufferLogs holds startup logs until our custom logger is registered.
  const app = await NestFactory.create(AppModule,{ bufferLogs: true });

  const configService = app.get(ConfigService);

  const logger = setupLogger(app)
  setupCors(
    app,
    configService,
    logger,
  );
  setupSwagger(app);


  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  )

  app.useGlobalFilters(new ExceptionHandler(logger));

  const port = configService.get<number>('PORT') || 5000;
  const httpServer = await app.listen(port);

  // Tune Node.js HTTP connection timeouts.
  httpServer.keepAliveTimeout = 65_000; // 65 seconds
  httpServer.headersTimeout = 66_000; //66 seconds

}
bootstrap();
