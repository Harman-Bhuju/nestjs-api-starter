import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';

export function setupCors(
    app: INestApplication,
    configService: ConfigService,
    logger: pino.Logger,
) {

    const isProd =
        process.env.NODE_ENV === 'production';

    // Read allowed frontend origins from the environment.
    const whiteListedDomain = configService.get<string>('WHITELIST');

    if (!whiteListedDomain && isProd) {
        throw new Error(
            'WHITELIST must be configured in production',
        );
    }

    // Configure CORS based on the WHITELIST environment variable.
    if (whiteListedDomain) {

        // Convert "url1,url2,url3" into ["url1", "url2", "url3"].
        const origins = whiteListedDomain
            .split(',')
            .map((domain) => domain.trim());

        app.enableCors({
            origin: origins,
            methods: [
                'GET',
                'POST',
                'PUT',
                'DELETE',
                'PATCH',
            ],
            optionsSuccessStatus: 200,
            credentials: true,
        });

        logger.info({ whitelist: whiteListedDomain }, 'CORS: WHITELIST');

    } else {

        logger.info('CORS: All origins allowed (no WHITELIST specified)');

        // Development fallback: allow requests from any requesting origin.
        app.enableCors({
            origin: true,
            methods: [
                'GET',
                'POST',
                'PUT',
                'DELETE',
                'PATCH'
            ],
            optionsSuccessStatus: 200,
            credentials: true,
        });
    }

}