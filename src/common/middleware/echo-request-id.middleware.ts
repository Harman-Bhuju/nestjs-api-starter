import { RequestHandler } from "express";

// Middleware that echoes the request id (req.id) back to the client via header
// so they can reference it
export const echoRequestId: RequestHandler = (req: any, res, next) => {

    if (req.id) {
        res.setHeader('X-Request-Id', req.id)
    }
    
    next();
}