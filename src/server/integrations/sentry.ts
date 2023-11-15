import * as Sentry from "@sentry/node";
import { dataConstants } from "../../shared/data/dataConstants";
import { logger } from "./logging";

export function startSentry() {
    if (dataConstants.sentryDSN) {
        logger.info("Starting Sentry.");
        Sentry.init({
            dsn: dataConstants.sentryDSN,
            environment: dataConstants.sentryEnvironment,
            release: dataConstants.gitCommitSHA,

            // Set tracesSampleRate to 1.0 to capture 100%
            // of transactions for performance monitoring.
            // We recommend adjusting this value in production
            tracesSampleRate: 1.0,
        });
    } else {
        logger.info("Not starting Sentry because SENTRY_DSN is not set.");
    }
}

export { Sentry };