import { logger, logLevelDefault } from "./logging";
import { registerWinstonLogger } from "./newRelicLogging";

const logLevelNewRelic = process.env.LOG_LEVEL_NEW_RELIC || logLevelDefault;

export function startNewRelic() {
    const licenseKeySet = !!process.env.NEW_RELIC_LICENSE_KEY;
    const appNameSet = !!process.env.NEW_RELIC_APP_NAME;

    if (licenseKeySet && appNameSet) {
        logger.info("Starting NewRelic integration.");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const newrelic = require("newrelic");

        if (registerWinstonLogger(newrelic.agent, logger, logLevelNewRelic)) {
            logger.info(" - NewRelic forwarded log level: " + logLevelNewRelic);
        } else {
            logger.info(' - NewRelic log forwarding disabled.');
        }
    } else {
        logger.info("NewRelic integration was not started because NEW_RELIC_LICENSE_KEY and/or NEW_RELIC_APP_NAME are missing.");
    }
}
