import { sendToSentryAndLogger } from "../integrations/errorReporting";
import { stringifyStream } from "@discoveryjs/json-ext";
import { startBackgroundTransaction } from "newrelic";

export function regularlyScheduleAsyncBackgroundTransaction(transactionName: string, executor: () => Promise<any>, delayMS: number) {
    const wrappedExecutor = () => {
        return startBackgroundTransaction(transactionName, executor);
    };
    return regularlyScheduleAsync(wrappedExecutor, delayMS);
}

export function regularlyScheduleAsync(executor: () => Promise<any>, delayMS: number) {
    let running = true;
    let timeout: NodeJS.Timeout = undefined;

    const run = () => {
        executor()
            .catch(sendToSentryAndLogger)
            .finally(() => {
                if (running) {
                    timeout = setTimeout(run, delayMS);
                }
            });
    };

    run();

    const stop = () => {
        running = false;
        if (timeout !== undefined) {
            clearTimeout(timeout);
        }
    };

    return stop;
}

export function jsonStringifyAsync(value: any) {
    return streamToString(stringifyStream(value));
}

export async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    await waitImmediate();

    const chunks: Array<any> = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
        await waitImmediate();
    }
    const buffer = Buffer.concat(chunks);
    return buffer.toString("utf-8");
}

export function waitImmediate() {
    return new Promise<void>(setImmediate);
}