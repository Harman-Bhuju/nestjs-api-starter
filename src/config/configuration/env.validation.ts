import * as Joi from 'joi';

/**
 * Fails fast on boot if required env vars are missing/malformed,
 * instead of surfacing confusing errors deep inside TypeORM or JwtModule later.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  COOKIE_SECURE: Joi.boolean().default(false),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  ACCESS_TOKEN_EXPIRY: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: Joi.string().default('30d'),

  BCRYPT_SALT_ROUNDS: Joi.number().default(10),
});
