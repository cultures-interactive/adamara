import { isErrorTranslated, SocketIOError, errorToSocketIOError } from "../../shared/definitions/socket.io/socketIODefinitions";
import { sendToSentryAndLogger } from "../integrations/errorReporting";

export function handleSocketError(error: Error, args: any[]) {
    if (!isErrorTranslated(error)) {
        // Translated errors are somewhat expected. If an error doesn't have a translation,
        // it should be displayed in the log.
        sendToSentryAndLogger(error);
    }

    const errorCallback = args[args.length - 1] as (error: SocketIOError) => void;
    errorCallback(errorToSocketIOError(error));
}