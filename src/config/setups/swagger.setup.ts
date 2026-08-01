import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupSwagger(app: INestApplication) {

    const config = new DocumentBuilder()
        .setTitle('NestJS Starter API')
        .setDescription('My custom user authentication API walkthrough')
        .setVersion('1.0.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter  your JWT access token here',
            },
            'access-token'
        )
        .setExternalDoc('Postman Collection', '/apis-json')
        .build();

    const document = SwaggerModule.createDocument(app, config, { deepScanRoutes: true, })

    const httpAdapter = app.getHttpAdapter().getInstance();

    httpAdapter.get('/apis-json', (_, res) => {
        res.json(document);
    });

   SwaggerModule.setup('api/docs', app, document,
     {
    swaggerOptions:
     {
      persistAuthorization: true, 
      // Remembers your login/access token when you refresh the page
    },
  }
);

}