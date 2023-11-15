import { noticeError } from "newrelic";
import { logger } from "./logging";
import { Sentry } from "./sentry";

export function sendToSentryAndLogger(error: Error) {
    Sentry.captureException(error);
    logger.error(error);
    noticeError(error);
}