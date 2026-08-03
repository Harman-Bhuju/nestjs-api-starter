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
  LOG_LEVEL: Joi.string()
    .valid('DEBUG', 'INFO', 'WARN', 'ERROR', 'debug', 'info', 'warn', 'error')
    .default('INFO'),
  // Comma-separated list of allowed CORS origins, e.g. "http://localhost:3000,https://app.example.com"
  WHITELIST: Joi.string().allow('').default(''),

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

  // ── Email (Resend) ──
  RESEND_API_KEY: Joi.string().required(),
  RESEND_FROM_EMAIL: Joi.string().email({ tlds: false }).required(),
  APP_NAME: Joi.string().default('NestJs Starter Api'),
  APP_URL: Joi.string().uri().required(),

  // ── File upload (Cloudinary) ──
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
  CLOUDINARY_FOLDER: Joi.string().allow('').default(''),
  FILE_SIZE_LIMIT_MB: Joi.number().default(10),
  // Not read anywhere currently — Nest/multer handle multipart parsing
  // automatically once FileInterceptor is applied to a route, no toggle
  // needed. Kept here only so an existing .env with this var doesn't fail
  // validation; safe to delete from your .env.
  ENABLE_MULTIPART: Joi.boolean().default(true),

  // ── Payments (eSewa) ──
  ESEWA_PRODUCT_CODE: Joi.string().required(),
  ESEWA_SECRET_KEY: Joi.string().required(),
  ESEWA_PAYMENT_URL: Joi.string().uri().required(),
  ESEWA_STATUS_CHECK_URL: Joi.string().uri().required(),
  ESEWA_SUCCESS_URL: Joi.string().uri().required(),
  ESEWA_FAILURE_URL: Joi.string().uri().required(),
  FRONTEND_URL: Joi.string().uri().required(),

  // Ai chat-bot
  AI_BASE_URL: Joi.string().uri().required(),
  AI_MODEL: Joi.string().required(),
  AI_API_KEY: Joi.string().allow('').optional(),
  AI_TIMEOUT: Joi.number().default(30000),
  AI_MAX_TOKENS: Joi.number().default(512),
  AI_TEMPERATURE: Joi.number().min(0).max(2).default(0.3),
});
