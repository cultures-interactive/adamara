import { Strategy as LocalStrategy } from "passport-local";
import passport from "passport";
import { Request, Response, NextFunction } from "express";
import { AuthPublicUser } from "../../shared/definitions/apiResults/AuthPublicUser";
import { UserPrivileges } from "../../shared/definitions/apiResults/AuthCheckLoginStatusResult";
import { ServerState } from "../data/ServerState";

export const localStrategyName = "passport-local";

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface User {
            username?: string;
            privilegeLevel?: UserPrivileges;
            moduleId?: string;
            workshopId?: string;
            playAccesscode?: string;
            standaloneModulePlayAccesscode?: string;
        }
    }
}

export function expressUserToAuthPublicUser(user: Express.User): AuthPublicUser {
    if (!user)
        return null;
    return {
        username: user.username,
        privilegeLevel: user.privilegeLevel
    };
}

export enum LoginError {
    MissingCredentials = "Missing credentials", // from Passport
    NotFound = "NotFound",
    WrongPassword = "WrongPassword",
    ModuleNotActive = "ModuleNotActive"
}

export function initializePassportStrategies(serverState: ServerState) {
    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(function (user, done) {
        done(null, user);
    });

    passport.use(
        localStrategyName,
        new LocalStrategy(
            {},
            async function (username, password, done) {
                try {
                    let privilegeLevel: UserPrivileges;
                    let moduleId = "";
                    let workshopId = "";
                    let playAccesscode = "";
                    let standaloneModulePlayAccesscode = "";

                    if (password === "") {
                        return done(null, false, { message: LoginError.MissingCredentials });
                    }

                    // Privileges are ordered from lowest to highest.
                    // We are making sure that no workshop/module/play access code is ever the same as e.g. the admin access code,
                    // but in case this ever somehow goes wrong, we'd rather have admins accidentally log in as workshop players
                    // than the other way around.

                    if (serverState.getActiveWorkshopViaPlayAccessCode(password)) {
                        privilegeLevel = UserPrivileges.WorkshopPlayer;
                        playAccesscode = password;
                    } else if (serverState.getActiveModuleViaStandalonePlayAccessCode(password)) {
                        privilegeLevel = UserPrivileges.WorkshopPlayer;
                        standaloneModulePlayAccesscode = password;
                    } else if (serverState.getActiveModuleViaAccessCode(password)) {
                        const moduleSnapshot = serverState.getActiveModuleViaAccessCode(password).snapshot;

                        if (moduleSnapshot.startDate < Date.now() && moduleSnapshot.endDate + /*1 day in ms:*/ 60 * 60 * 24 * 1000 > Date.now()) {
                            privilegeLevel = UserPrivileges.WorkshopParticipant;
                            moduleId = moduleSnapshot.$modelId;
                        } else {
                            return done(null, false, { message: LoginError.ModuleNotActive });
                        }
                    } else if (serverState.getWorkshopViaAccessCode(password)) {
                        privilegeLevel = UserPrivileges.SingleWorkshopAdmin;
                        workshopId = serverState.getWorkshopViaAccessCode(password).snapshot.$modelId;
                    } else if (password === process.env.ACCESS_CODE) {
                        privilegeLevel = UserPrivileges.Admin;
                    } else {
                        // Wrong password
                        return done(null, false, { message: LoginError.WrongPassword });
                    }

                    // Success!
                    const user = { username, privilegeLevel, moduleId, workshopId, playAccesscode, standaloneModulePlayAccesscode };
                    done(null, user);
                } catch (err) {
                    return done(err);
                }
            }
        )
    );
}

export function isLoggedIn(req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated()) {
        // 401 Unautorized: Not logged in
        return res.sendStatus(401);
    }

    return next();
}