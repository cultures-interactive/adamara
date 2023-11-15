import { AxiosError } from "axios";
import { ServerErrorResult } from "../../shared/definitions/apiResults/ServerErrorResult";
import { TranslatedError } from "../../shared/definitions/errors/TranslatedError";

export function tryToTranslateAxiosError(err: AxiosError): TranslatedError | AxiosError {
    if (err.response) {
        const { status, data, headers } = err.response;
        switch (status) {
            case 401:
                return new TranslatedError("shared.error_401_logged_out");

            case 403:
                return new TranslatedError("shared.error_403_insufficent_rights");

            case 429:
                const retryAfterSeconds = +headers["retry-after"];
                const minutes = Math.floor(retryAfterSeconds / 60);
                const seconds = retryAfterSeconds % 60;
                return new TranslatedError("shared.error_429_too_many_requests", { minutes, seconds });

            case 500:
                if ((data as any).error) {
                    // TODO translated errors
                    const error = (data as ServerErrorResult).error;
                    return new TranslatedError("editor.untranslated_server_error", { error: `${error.name}: ${error.message}` });
                }
                break;
        }
    }

    return err;
}