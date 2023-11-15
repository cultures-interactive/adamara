import * as Sentry from "@sentry/react";
import { LogEntry } from "../stores/LogEntry";

export function addSentryDebugBreadcrumb(message: string, data?: Record<string, any>) {
    Sentry.addBreadcrumb({
        category: "Debug",
        level: "debug",
        message,
        data
    });
}

export function addSentryGameLogBreadcrumb(entry: LogEntry) {
    Sentry.addBreadcrumb({
        category: "Game Log",
        level: "debug",
        message: entry.executionType,
        data: entry,
    });
}