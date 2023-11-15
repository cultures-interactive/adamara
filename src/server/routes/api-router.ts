import express, { NextFunction, Request, Response, Router } from 'express';
import { ServerErrorResult } from '../../shared/definitions/apiResults/ServerErrorResult';
import { NotFoundError } from '../helper/errors/NotFoundError';
import { gameRoutes } from './apiRoutes/gameRoutes';
import { sendToSentryAndLogger } from '../integrations/errorReporting';
import { RoutesAccessInterface } from './RoutesAccessInterface';
import { checkServiceApiKey, serviceRoutes } from './apiRoutes/serviceRoutes';
import { authRoutesWithCSRFProtection, authRoutesNoCSRFProtection } from './apiRoutes/authRoutes';
import { checkServiceRouteRateLimiter } from '../security/rateLimitersServiceRoutes';
import { resourceRoutes } from './apiRoutes/resourceRoutes';
import { diagnosticRoutes } from './apiRoutes/diagnosticRoutes';
import { reportRoutes } from './apiRoutes/reportRoutes';

export function addApiRouteMiddleware() {
    const router = Router();
    router.use(express.json());
    router.use(express.urlencoded({
        extended: true
    }));
    return router;
}

export function apiRouterNoCSRFProtection(access: RoutesAccessInterface) {
    const router = Router();

    router.use("/service", checkServiceRouteRateLimiter, checkServiceApiKey, serviceRoutes(access));
    router.use("/diagnostic", diagnosticRoutes());
    router.use("/auth", authRoutesNoCSRFProtection());

    return router;
}

export function apiRouterWithCSRFProtection(access: RoutesAccessInterface) {
    const router = Router();

    router.use("/auth", authRoutesWithCSRFProtection());
    router.use("/game", gameRoutes(access));
    router.use("/resources", resourceRoutes(access));
    router.use("/report", reportRoutes());
    router.use((_, res) => res.sendStatus(404));

    return router;
}

export function handleError(err: Error, req: Request, res: Response, next: NextFunction) {
    sendToSentryAndLogger(err);

    if (err instanceof NotFoundError) {
        if (!res.headersSent)
            res.sendStatus(404);

        return;
    }

    const serverError: ServerErrorResult = {
        error: {
            name: err.name,
            message: err.message
        }
    };

    if (!res.headersSent)
        res.status(500).send(serverError);
}