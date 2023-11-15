import { Request, Response, NextFunction } from "express";
import { createRateLimiter, minutesToSeconds, checkRateLimiters, consumeRateLimiters } from "./rateLimitersShared";

const serviceAPIKeyLimiterSlowBruteforceByIP = createRateLimiter({
    points: 10,                           // More than 10 failed attempts at accessing the service routes with a wrong API key from this IP...
    duration: 1 * minutesToSeconds,       // ...per 1 minutes since first fail...
    blockDuration: 10 * minutesToSeconds, // ...block for 10 minutes.
    keyPrefix: "security_service_api_key_fail"
});

export async function checkServiceRouteRateLimiter(req: Request, res: Response, next: NextFunction) {
    await checkRateLimiters(res, next, [
        { rateLimiter: serviceAPIKeyLimiterSlowBruteforceByIP, key: req.ip }
    ]);
}

export async function reportServiceRouteAPIKeySuccess(req: Request) {
    await serviceAPIKeyLimiterSlowBruteforceByIP.delete(req.ip);
}

export async function reportServiceRouteAPIKeyFailure(req: Request, res: Response) {
    await consumeRateLimiters(res, [
        { rateLimiter: serviceAPIKeyLimiterSlowBruteforceByIP, key: req.ip }
    ]);
}