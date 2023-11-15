import { Request, Response, NextFunction } from "express";
import { createRateLimiter, minutesToSeconds, checkRateLimiters, hoursToSeconds, consumeRateLimiters } from "./rateLimitersShared";

// It might be better to make this trigger after a lower number of attempts, but I wouldn't want this to
// be triggered by some school pupils, blocking the whole school just by playing around. 1000 attempts feels
// more like an automated attack than someone trying manually.
//
// Maybe we could have some unblocking functionality later for workshops, and set this to something like
// "100 failed attempts per 1 day since first fail block for 1 hour".
const loginLimiterSlowBruteforceByIP = createRateLimiter({
    points: 1000,                      // After 1000 failed login attempts with this IP...
    duration: 1 * hoursToSeconds,      // ...per 1 hour since first fail...
    blockDuration: 1 * hoursToSeconds, // ...block for 1 hour.
    keyPrefix: "security_login_fail_ip_per_day"
});

const loginLimiterConsecutiveLoginFailuresByUsernameAndIP = createRateLimiter({
    points: 30,                          // After 30 failed login attempts with this IP/username combination...
    duration: 1 * minutesToSeconds,      // ...per 1 minutes since first fail...
    blockDuration: 1 * minutesToSeconds, // ...block for 1 minutes.
    keyPrefix: "security_login_fail_consecutive_username_and_ip"
});

const getUsernameIPKey = (username: string, ip: string) => `${username}_${ip}`;

export async function checkLoginRateLimiters(req: Request, res: Response, next: NextFunction) {
    const ipAddress = req.ip;
    const usernameIPKey = getUsernameIPKey(req.body.username, ipAddress);

    await checkRateLimiters(res, next, [
        { rateLimiter: loginLimiterConsecutiveLoginFailuresByUsernameAndIP, key: usernameIPKey },
        { rateLimiter: loginLimiterSlowBruteforceByIP, key: ipAddress }
    ]);
}

export async function reportLoginSuccess(req: Request) {
    const usernameIPKey = getUsernameIPKey(req.body.username, req.ip);
    await loginLimiterConsecutiveLoginFailuresByUsernameAndIP.delete(usernameIPKey);
}

export async function reportLoginFailure(req: Request, res: Response) {
    const ipAddress = req.ip;
    const usernameIPKey = getUsernameIPKey(req.body.username, ipAddress);

    await consumeRateLimiters(res, [
        { rateLimiter: loginLimiterConsecutiveLoginFailuresByUsernameAndIP, key: usernameIPKey },
        { rateLimiter: loginLimiterSlowBruteforceByIP, key: ipAddress }
    ]);
}