import { RateLimiterMySQL, RateLimiterRes } from "rate-limiter-flexible";
import { Response, NextFunction } from "express";
import { sequelize } from "../database/db";

const { DB_URL } = process.env;
const databaseName = DB_URL.slice(DB_URL.lastIndexOf("/") + 1);

interface CreateRateLimiterOptions {
    /** Failed attempts */
    points: number;

    /** Time in seconds since first fail */
    duration: number;

    /** Block duration in seconds if points are exceeded during a duration */
    blockDuration: number;

    /** Unique string used to identify this in limiter in the database */
    keyPrefix: string;
}

export function createRateLimiter(options: CreateRateLimiterOptions) {
    return new RateLimiterMySQL({
        storeClient: sequelize,
        dbName: databaseName,
        ...options
    });
}

export const minutesToSeconds = 60;
export const hoursToSeconds = 60 * minutesToSeconds;
export const daysToSeconds = 24 * hoursToSeconds;

interface RateLimiterWithKey {
    rateLimiter: RateLimiterMySQL;
    key: string | number;
}

export async function checkRateLimiters(res: Response, next: NextFunction, rateLimiterCalls: RateLimiterWithKey[]) {
    const rateLimiterResPromiseList = rateLimiterCalls.map(({ rateLimiter, key }) => rateLimiter.get(key));
    const rateLimiterResList = await Promise.all(rateLimiterResPromiseList);

    let retrySeconds = 0;

    for (let i = 0; i < rateLimiterCalls.length; i++) {
        const rateLimiterRes = rateLimiterResList[i];
        if (rateLimiterRes && (rateLimiterRes.consumedPoints > rateLimiterCalls[i].rateLimiter.points)) {
            retrySeconds = Math.max(retrySeconds, calculateRetrySeconds(rateLimiterRes));
        }
    }

    if (retrySeconds > 0) {
        return sendRetryResponse(res, retrySeconds);
    }

    return next();
}

export async function consumeRateLimiters(res: Response, rateLimiterCalls: RateLimiterWithKey[]) {
    const rateLimiterResPromiseList = rateLimiterCalls.map(({ rateLimiter, key }) => rateLimiter.consume(key));

    let retrySeconds = 0;

    for (let i = 0; i < rateLimiterCalls.length; i++) {
        try {
            await rateLimiterResPromiseList[i];
        } catch (error) {
            if (error instanceof RateLimiterRes) {
                retrySeconds = Math.max(retrySeconds, calculateRetrySeconds(error));
            } else {
                throw error;
            }
        }
    }

    if (retrySeconds > 0) {
        return sendRetryResponse(res, retrySeconds);
    }
}

function calculateRetrySeconds(rateLimiterRes: RateLimiterRes) {
    return Math.max(Math.round(rateLimiterRes.msBeforeNext / 1000), 1);
}

function sendRetryResponse(res: Response, retrySeconds: number) {
    res.set("Retry-After", String(retrySeconds));
    res.status(429).send("Too Many Requests");
}