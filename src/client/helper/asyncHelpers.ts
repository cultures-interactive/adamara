import { wait } from "../../shared/helper/generalHelpers";

export function spawnAsyncWorkers(workerCount: number, worker: () => Promise<void>) {
    const loadingWorkers = new Array<Promise<void>>();

    for (let i = 0; i < workerCount; i++) {
        loadingWorkers.push(worker());
    }

    return Promise.all(loadingWorkers) as unknown as Promise<void>;
}

export async function repeatCallUntilSuccess<T>(call: () => Promise<T>, cancelled: () => boolean, onError: (error: Error) => void): Promise<T> {
    while (true) {
        if (cancelled())
            return undefined;

        try {
            const result = await call();
            return result;
        } catch (e) {
            onError(e);
            await wait(1000);
        }
    }
}

export class TokenGate {
    private waitingTicketResolve = new Array<() => void>();

    public constructor(
        private tokenCount: number
    ) {
    }

    public async executeWhenTokenIsFree<T>(executor: () => Promise<T>): Promise<T> {
        try {
            await this.getToken();
            return await executor();
        } finally {
            this.freeToken();
        }
    }

    private getToken() {
        if (this.tokenCount > 0) {
            this.tokenCount--;
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            this.waitingTicketResolve.push(resolve);
        });
    }

    private freeToken() {
        if (this.waitingTicketResolve.length > 0) {
            const resolve = this.waitingTicketResolve.shift();
            resolve();
        } else {
            this.tokenCount++;
        }
    }
}