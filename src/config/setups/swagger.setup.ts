import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';
import { PaginationMetaDto } from 'src/common/dto/pagination-meta.dto';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('NestJs Starter API')
    .setDescription('My custom user authentication API walkthrough')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter  your JWT access token here',
      },
      'access-token',
    )
    .setExternalDoc('Postman Collection', '/apis-json')
    .build();

  // extraModels registers schemas that are only ever referenced via a raw
  // $ref (e.g. errorExample()'s allOf/$ref pattern in ErrorResponseDto)
  // rather than through a decorator's `type:` option — without this,
  // '#/components/schemas/ErrorResponseDto' would point at nothing.
  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    extraModels: [ErrorResponseDto, PaginationMetaDto],
  });

  const httpAdapter = app.getHttpAdapter().getInstance();

  httpAdapter.get('/apis-json', (_, res) => {
    res.json(document);
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      // Remembers your login/access token when you refresh the page
    },
  });
}
