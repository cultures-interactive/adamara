import e, { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "passport";
import { IVerifyOptions } from "passport-local";
import { AuthCheckLoginStatusResult } from "../../../shared/definitions/apiResults/AuthCheckLoginStatusResult";
import { expressUserToAuthPublicUser, localStrategyName } from "../../integrations/auth";
import { checkLoginRateLimiters, reportLoginFailure, reportLoginSuccess } from "../../security/rateLimitersLogin";

export function authRoutesNoCSRFProtection() {
    const router = Router();

    // HACK tw: I would prefer to have logout protected against CSRF attacks too, but for some reason sometimes it fails 
    // with "invalid csrf token". I would've assumed that's because the session gets destroyed during logout, but when
    // this "invalid csrf token" problem happens, the user isn't even logged out. Since I can't figure out how to fix it
    // at the moment, for now /logout won't have CSRF protection.
    router.post("/logout", logout);

    return router;
}

export function authRoutesWithCSRFProtection() {
    const router = Router();
    router.post("/login", checkLoginRateLimiters, login);
    router.get("/status", checkLoginStatus);
    return router;
}

function login(req: Request, res: Response, next: NextFunction) {
    const passportAuthenticate = authenticate(localStrategyName, async function (err, user: Express.User, info: IVerifyOptions) {
        try {
            if (err)
                return next(err);

            if (!user) {
                await reportLoginFailure(req, res);

                if (!res.headersSent) {
                    res.sendStatus(401);
                }

                return;
            }

            await reportLoginSuccess(req);

            req.logIn(user, logInError => {
                if (logInError)
                    return next(logInError);

                const result: AuthCheckLoginStatusResult = {
                    user: expressUserToAuthPublicUser(user)
                };
                res.json(result);
            });
        } catch (e) {
            return next(e);
        }
    });

    passportAuthenticate(req, res, next);
}

function logout(req: Request, res: Response) {
    req.logout(err => console.error(err));
    res.sendStatus(200);
}

function checkLoginStatus(req: Request, res: Response) {
    const result: AuthCheckLoginStatusResult = {
        user: expressUserToAuthPublicUser(req.user)
    };
    res.json(result);
}
