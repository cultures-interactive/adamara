import { makeAutoObservable } from "mobx";
import { TranslatedError } from "../../shared/definitions/errors/TranslatedError";
import { objectContentsEqual } from "../../shared/helper/generalHelpers";
import { ErrorNotification, ErrorType } from "./editor/ErrorNotification";
import * as Sentry from "@sentry/react";
import { CaptureContext } from "@sentry/types";
import { AxiosError } from "axios";
import { dataConstants } from "../../shared/data/dataConstants";
import { isDisconnectedOrCancelled } from "../communication/editorClient/ClientDisconnectedError";
import { tryToTranslateAxiosError } from "../helper/errorHelpers";

enum ErrorMechanismn {
    Caught,
    Uncaught,
    UncaughtAsync
}

export class ErrorStore {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public errors: ErrorNotification[] = [];

    public get hasErrors() {
        return this.errors.length > 0;
    }

    private addErrorObject(newError: ErrorNotification) {
        if (this.errors.length > 0) {
            if (objectContentsEqual(this.errors[this.errors.length - 1], newError))
                return;
        }

        this.errors.push(newError);
    }

    public addError(type: ErrorType, translationKey: string, interpolationOptions: any = {}) {
        this.addErrorObject(new ErrorNotification(type, translationKey, interpolationOptions));
    }

    public addErrorFromAxiosErrorObject(error: AxiosError) {
        this.addErrorFromErrorObject(tryToTranslateAxiosError(error));
    }

    public addErrorFromErrorObject(error: Error, mechanismn = ErrorMechanismn.Caught) {
        try {
            // TranslatedErrors don't have to be reported to Sentry. They are fully expected in the normal flow (that's why
            // they are translated), like e.g. "file size too big" or "cannot modify because another user changed it".
            // The only thing that could really go wrong with TranslatedErrors is if they aren't caught, and then they are
            // automatically reported to Sentry anyway.
            if (error instanceof TranslatedError) {
                const translatedError = error as TranslatedError;
                this.addError(ErrorType.General, translatedError.translationKey, translatedError.interpolationOptions);
                return;
            }

            // Report everything to Sentry (that isn't already reported automatically because it is uncaught),
            // even errors that we are not really interested in. We can ignore them on the Sentry side.
            // Technically we would love to send errors with context again WITH the context, but sadly Sentry
            // will just completely ignore them because ther errors were already sent.
            if (mechanismn === ErrorMechanismn.Caught) {
                let captureContext: CaptureContext = undefined;
                if (error instanceof AxiosError) {
                    captureContext = {
                        tags: {
                            "failed_request_url": error.config.url
                        }
                    };
                }

                Sentry.captureException(error, captureContext);
            }

            // Don't show an error popup for following errors, and only output them to console
            // (unless they were already outputted automatically because they were uncaught):
            // - CancelledError
            // - ClientDisconnectedError
            // - "ResizeObserver loop limit exceeded" in production mode
            if (isDisconnectedOrCancelled(error) ||
                ((error instanceof ErrorEvent) && (error.message === "ResizeObserver loop limit exceeded") && dataConstants.isProduction)) {
                if (mechanismn === ErrorMechanismn.Caught) {
                    console.error(error);
                }
                return;
            }

            // If an error is uncaught, preface it in the error message
            if (mechanismn === ErrorMechanismn.Uncaught) {
                this.addError(ErrorType.General, "editor.uncaught_error");
            } else if (mechanismn === ErrorMechanismn.UncaughtAsync) {
                this.addError(ErrorType.General, "editor.uncaught_async_error");
            }

            if (error?.message) {
                console.error(error);

                let message = error.message;

                if (error instanceof AxiosError) {
                    message += " (" + error.config.url + ")";
                }

                this.addError(ErrorType.General, "editor.untranslated_client_error", { error: message });
            } else {
                console.trace("No message available. Error object: ", error, mechanismn);
                this.addError(ErrorType.General, "editor.untranslated_client_error", { error: "No message available. Error object: " + error });
            }
        } catch (e) {
            console.trace("Processing an error failed", e, error, mechanismn);
            this.addError(ErrorType.General, "editor.untranslated_client_error", { error: "Processing an error failed" });
        }
    }

    public clearErrorsOfType(errorType: ErrorType) {
        while (true) {
            const index = this.errors.findIndex(error => error.type === errorType);
            if (index === -1)
                break;

            this.errors.splice(index, 1);
        }
    }

    public clearErrors() {
        this.errors = [];
    }
}

export const errorStore = new ErrorStore();

const reportedUncaughtErrors = new Set<Error>();

window.addEventListener("error", function (e) {
    const error = e.error || e;

    // For some reason, in Google Chrome (and maybe elsewhere, not tested) this listener will
    // be called twice per uncaught error. Prevent the second time.
    if (reportedUncaughtErrors.has(error))
        return;

    reportedUncaughtErrors.add(error);

    errorStore.addErrorFromErrorObject(error, ErrorMechanismn.Uncaught);
});

window.addEventListener('unhandledrejection', function (e) {
    errorStore.addErrorFromErrorObject(e.reason, ErrorMechanismn.UncaughtAsync);
});