import { CanceledError } from "axios";

export class ClientDisconnectedError extends Error {
    public constructor() {
        super("socket.io Client Disconnected");
        this.name = "ClientDisconnectedError";
    }
}

export function isDisconnectedOrCancelled(e: Error) {
    return (e instanceof ClientDisconnectedError) || (e instanceof CanceledError);
}