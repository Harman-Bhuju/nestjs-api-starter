import pino from "pino";
import { pinoHttp } from "pino-http";
import { randomUUID } from 'crypto';


// This logs every incoming HTTP request (GET /login -> 200, etc.)
// factory function that returns middleware.
export function createHttpLogger(logger: pino.Logger) {

    return pinoHttp({

        logger,
        genReqId: (req: any) => {
            // Reuse an existing request ID if the client sent one
            const incoming = req.headers['x-request-id'] || req.headers['x-correlation-id'];

            if (incoming && typeof incoming === 'string') {
                req.id = incoming;
                return incoming;
            }
            // Prefer crypto.randomUUID when available
            const id = randomUUID();
            req.id = id;
            return id;
        },
        // Attach reqId as a top-level property in pino logs for easy filtering
        customProps: (req: any, res: any) => ({ reqId: req.id }),

        customSuccessMessage: (req: any, res: any) => `${req.method} ${req.url} -> ${res.statusCode}`,
    });
}