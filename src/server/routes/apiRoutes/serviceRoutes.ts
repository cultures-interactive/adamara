import { NextFunction, Request, Response, Router } from "express";
import { logger } from "../../integrations/logging";
import { reportServiceRouteAPIKeyFailure, reportServiceRouteAPIKeySuccess } from "../../security/rateLimitersServiceRoutes";
import { errorWrapper } from "../../helper/routerUtils";
import { RoutesAccessInterface } from "../RoutesAccessInterface";

const serviceApiKey = process.env.SERVICE_API_KEY;

export function serviceRoutes(access: RoutesAccessInterface) {
    const router = Router();

    router.get("/shutdown", shutdown(access));

    return router;
}

function shutdown(access: RoutesAccessInterface) {
    return errorWrapper(async (req, res) => {
        res.sendStatus(200);
        access.gracefulShutdown();
    });
}

export async function checkServiceApiKey(req: Request, res: Response, next: NextFunction) {
    try {
        if (!serviceApiKey) {
            logger.error("Service API route was called, but this server has no SERVICE_API_KEY set.");
            return res.sendStatus(500);
        }

        const requestServiceApiKey = req.body.serviceApiKey;
        if (serviceApiKey != requestServiceApiKey) {
            logger.error("Service API route was called, but wrong SERVICE_API_KEY was used: " + requestServiceApiKey);

            await reportServiceRouteAPIKeyFailure(req, res);

            if (!res.headersSent) {
                res.sendStatus(403);
            }

            return;
        }

        await reportServiceRouteAPIKeySuccess(req);

        return next();
    } catch (e) {
        next(e);
    }
}
