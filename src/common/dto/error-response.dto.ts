import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Shape returned by ExceptionHandler (see common/exceptions/app-exception.filter.ts)
 * for every thrown error. Used purely for Swagger documentation — the filter
 * builds this shape at runtime, this class is never instantiated in app code.
 */
export class ErrorResponseDto {
  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode!: number;

  @ApiProperty({
    description:
      'Human-readable error message. An array of strings for class-validator failures (one entry per invalid field), a single string otherwise.',
    oneOf: [
      { type: 'string', example: 'Email is already registered' },
      {
        type: 'array',
        items: { type: 'string' },
        example: [
          'email must be an email',
          'password must be longer than or equal to 8 characters',
        ],
      },
    ],
  })
  message!: string | string[];

  @ApiPropertyOptional({
    description:
      'Stack trace. Only present when NODE_ENV is not "production" — never sent in production responses.',
  })
  stack?: string;
}

/**
 * Builds a per-call-site error response config for Api*Response decorators.
 *
 * Referencing `type: ErrorResponseDto` directly (as every decorator here
 * used to) makes Swagger UI render that single class's own baked-in
 * @ApiProperty examples for every single reference — so a 409, a 422, and a
 * 429 all showed the identical "statusCode: 400, message: Email is already
 * registered" example, regardless of which endpoint or status they were
 * actually documenting.
 *
 * This instead builds a `schema` that still $refs ErrorResponseDto (so
 * consumers/codegen still see the real, generic error shape) but overrides
 * the *example* per call site via `allOf` + a sibling `example` key — the
 * standard OpenAPI 3 pattern for "same schema, different example per usage".
 *
 * Requires ErrorResponseDto to be registered as an extra model wherever
 * SwaggerModule.createDocument() is called (see config/setups/swagger.setup.ts)
 * — otherwise the '#/components/schemas/ErrorResponseDto' ref below points
 * at a schema that was never generated. The path is hardcoded rather than
 * built with getSchemaPath(ErrorResponseDto) to avoid importing the class
 * into every call site; it must match ErrorResponseDto's class name exactly
 * if that class is ever renamed.
 */
export function errorExample(
  statusCode: number,
  message: string | string[],
) {
  return {
    schema: {
      allOf: [{ $ref: '#/components/schemas/ErrorResponseDto' }],
      example: { statusCode, message },
    },
  };
}