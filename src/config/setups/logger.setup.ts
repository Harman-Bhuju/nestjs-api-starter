import { ConsoleLogger, INestApplication } from "@nestjs/common";
import pino from "pino";
import { randomUUID } from 'crypto';

import { PinoNestLogger } from "src/common/logger/pino-nest-logger";
import { CompositeLogger } from "src/common/logger/composite.logger";
import { createHttpLogger } from "src/common/middleware/http-logger.middleware";
import { echoRequestId } from "src/common/middleware/echo-request-id.middleware";

export function setupLogger(app: INestApplication) {
    // Read logging and environment settings before creating the app
    const rawLevel = process.env.LOG_LEVEL ?? 'INFO';
    const level = String(rawLevel).toLowerCase();
    const isProd = process.env.NODE_ENV === 'production';

    // Configure Pino: log level, security identity, secret redaction, and dev/prod output.
    const pinoOptions: pino.LoggerOptions = {

        level, // shorthand for level: level

        // Metadata added to every Pino log.
        base: {
            service: 'learning-auth-api',
            instanceId:  process.env.APP_INSTANCE_ID ?? randomUUID()
        },

        // Never allow passwords, tokens, cookies, or auth headers into logs.
        // Hide sensitive data from logs!
        redact: {
            paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                "req.headers['set-cookie']",
                'res.headers[set-cookie]',
                'req.body.password',
                'req.body.pass',
                'req.body.token',
                'req.body.accessToken',
                'req.body.refreshToken',
            ],
            censor: '[REDACTED]',
        },

        // Pretty logs in development, raw JSON in production
        ...(isProd
            ? {}
            : {
                transport: {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime:
                            'SYS:standard',
                        ignore: 'pid,hostname',
                    },
                },
            }),
    };

    // Create the Pino logger used by the application.
    const logger = pino(pinoOptions);

    // Adapt Pino to NestJS LoggerService interface.
    const pinoAdapter = new PinoNestLogger(logger);

    // Keep NestJS's default console logger too.
    const consoleLogger = new ConsoleLogger();

    // Send NestJS logs to both Pino and the default Nest console.
    app.useLogger(new CompositeLogger([pinoAdapter, consoleLogger]));

    // Get the underlying Express application from NestJS.
    const httpAdapter = app.getHttpAdapter().getInstance();

    // Create middleware that logs every HTTP request/response.
    const httpLogger = createHttpLogger(logger);

    if (typeof httpAdapter.use === 'function') {

        // Log HTTP requests and assign/reuse a request ID.
        httpAdapter.use(httpLogger);

        // Return the request ID to the client in the response header.
        httpAdapter.use(echoRequestId as any);
    }

    return logger;
}
