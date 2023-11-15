import { Server } from "http";
import httpAuth from "http-auth";
import { IS_DEV } from "../config";
import { logger } from "./logging";

export function createAppMetricsDashboard(server: Server, dashboardUsername: string, dashboardPassword: string) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const appmetricsDash = require('appmetrics-dash');

        const passwordProtected = dashboardUsername && dashboardPassword;
        if (!passwordProtected) {
            if (IS_DEV) {
                appmetricsDash.monitor({ server });
            } else {
                logger.error("The application metrics dashboard was requested by APP_METRICS_DASHBOARD=1, but no username/password is set despite being in production mode. Not creating the dashboard.");
                return;
            }
        } else {
            const basicAuth = httpAuth.basic({
            }, (username, password, callback) => {
                callback(username === dashboardUsername && password === dashboardPassword);
            });

            appmetricsDash.monitor({
                server,
                middleware: (req: any, res: any, next: any) => {
                    if (!(req.path as string).startsWith("/appmetrics-dash")) {
                        next();
                        return;
                    }

                    basicAuth.check((req, res) => {
                        next();
                    })(req, res);
                }
            });
        }

        logger.info(`Application metrics dashboard is available at /appmetrics-dash. Password protection is ${passwordProtected ? "on" : "off"}.`);
    } catch (e) {
        logger.error("The application metrics dashboard was requested by APP_METRICS_DASHBOARD=1, but couldn't start, throwing the following error. This was probably due to the appmetrics-dash dependency not correctly installing, which in turn might be due to node-gyp missing dependencies: https://github.com/nodejs/node-gyp#installation. Check the logs and fix the problem, or remove APP_METRICS_DASHBOARD=1.");
        logger.error(e);
        return;
    }
}