import { runInAction } from "mobx";
import { Socket } from "socket.io-client";
import { dataConstants } from "../../shared/data/dataConstants";
import { SocketIOError, createErrorFromSocketError, SharedClientToServerEvents, SharedServerToClientEvents } from "../../shared/definitions/socket.io/socketIODefinitions";
import { applyPatchesImproved, applyPatchImproved, AugmentedPatch } from "../../shared/helper/mobXHelpers";
import { ErrorType } from "../stores/editor/ErrorNotification";
import { ConnectionStatus, editorStore } from "../stores/EditorStore";
import { errorStore } from "../stores/ErrorStore";
import { networkDiagnosticsStore } from "../stores/NetworkDiagnosticsStore";
import { reportSocketUnexpectedDisconnect, reportSocketConnectionProblem } from "./api";
import { ClientDisconnectedError } from "./editorClient/ClientDisconnectedError";

export const DisconnectReason = {
    IOClientDisconnect: "io client disconnect",
    IOServerDisconnect: "io server disconnect",
    TransportClose: "transport close"
};

export class ClientBase<ListenEvents extends SharedServerToClientEvents, EmitEvents extends SharedClientToServerEvents> {
    protected socket: Socket<ListenEvents, EmitEvents> = null;
    protected disconnectAbortController: AbortController;
    protected rejectOnDisconnect = new Set<(reason?: any) => void>();
    private applyingPatches: boolean;

    public constructor() {
        this.applyingPatchesCallback = this.applyingPatchesCallback.bind(this);
    }

    public applyingPatchesCallback() {
        return this.applyingPatches;
    }

    protected registerBasicCallbacks(afterConnect: () => void, afterDisconnect: (reason: Socket.DisconnectReason) => void, debugOutputIncomingMessages: boolean) {
        console.log("Connecting to the server.");

        editorStore.setConnectionStatus(ConnectionStatus.Connecting);

        this.socket.on("connect", async () => {
            runInAction(() => {
                networkDiagnosticsStore.editorClientConnected();

                this.disconnectAbortController = new AbortController();

                console.log("Client connected. My socket ID is: " + this.socket.id);

                editorStore.setConnectionStatus(ConnectionStatus.Connected);

                afterConnect();
            });
        });

        this.socket.on("disconnect", reason => {
            runInAction(() => {
                console.log("Disconnected: " + reason);

                switch (reason) {
                    case DisconnectReason.IOClientDisconnect:
                        break;

                    case DisconnectReason.IOServerDisconnect:
                        errorStore.addError(ErrorType.SocketIOConnection, "editor.error_socketio_disconnected_by_server");
                        break;

                    case DisconnectReason.TransportClose:
                        errorStore.addError(ErrorType.SocketIOConnection, "editor.error_socketio_disconnected_server_stopped_answering");
                        break;

                    default:
                        errorStore.addError(ErrorType.SocketIOConnection, "editor.error_socketio_disconnected_unknown_reason", { reason });
                        break;
                }

                networkDiagnosticsStore.editorClientDisconnected(reason);
                if (reason != DisconnectReason.IOClientDisconnect) {
                    reportSocketUnexpectedDisconnect(reason);
                }

                this.disconnectAbortController.abort();

                // Reject all running promises on disconnect
                this.rejectOnDisconnect.forEach(reject => reject(new ClientDisconnectedError()));
                this.rejectOnDisconnect.clear();

                afterDisconnect(reason);
            });
        });

        this.socket.on("connect_error", (error: Error) => {
            console.log("connect_error", error);
            errorStore.addError(ErrorType.SocketIOConnection, "editor.error_socketio_cannot_connect", { error: error.toString() });
            networkDiagnosticsStore.addEditorClientConnectError(error);
            reportSocketConnectionProblem(error.toString());

            /*
            if ((error.message === ConnectErrorMessageServerError) || (error.message === ConnectErrorMessageXHRPollError)) {
                editorStore.addConnectionError(`Cannot connect to the server. (${error.message})`);
            } else {
                editorStore.addConnectionError(error.toString());
            }
            */
        });

        this.socket.io.engine.on("connection_error", (error: any) => {
            console.log("connection_error", error);

            /*
            console.log(err.req);	     // the request object
            console.log(err.code);     // the error code, for example 1
            console.log(err.message);  // the error message, for example "Session ID unknown"
            console.log(err.context);  // some additional error context
            */
        });

        this.socket.io.on("error", (error: Error) => {
            console.log("SocketIO Error event", error);
            //gameStateStore.setConnectionError(error);
        });

        this.socket.io.on("reconnect_attempt", () => {
            console.log("Trying to reconnect...");
            editorStore.setConnectionStatus(ConnectionStatus.Connecting);
        });

        if (debugOutputIncomingMessages) {
            this.socket.onAny((name: string) => {
                console.log("Incoming message: " + name);
            });
        }

        const sharedSocket = this.socket as Socket<SharedServerToClientEvents, SharedClientToServerEvents>;

        sharedSocket.on("serverShutdown", () => {
            editorStore.setServerWasShutDown();
        });
    }

    protected actionPromise<T>(executer: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
        let promiseReject: (reason?: any) => void;
        return new Promise<T>((resolve, reject) => {
            promiseReject = reject;
            this.rejectOnDisconnect.add(reject);
            executer(resolve, reject);
        }).finally(() => {
            this.rejectOnDisconnect.delete(promiseReject);
        });
    }

    public patch(modelInstance: any, patchOrPatches: AugmentedPatch | AugmentedPatch[]) {
        this.applyingPatches = true;
        try {
            if (Array.isArray(patchOrPatches)) {
                applyPatchesImproved(modelInstance, patchOrPatches, false);
            } else {
                applyPatchImproved(modelInstance, patchOrPatches);
            }
        } catch (e) {
            console.error(e, { modelInstance, patchOrPatches });
            editorStore.setInconsistentStateReloadNecessary();
        }
        this.applyingPatches = false;
    }

    protected changeWithoutTriggeringPatchTrackers(executor: () => void) {
        this.applyingPatches = true;
        try {
            executor();
        } finally {
            this.applyingPatches = false;
        }
    }

    public disconnect() {
        if (!this.socket)
            return;

        this.socket.disconnect();
        this.socket = null;
    }

    public get isConnected() {
        return this.socket && this.socket.connected;
    }

    protected reactToServerGitCommitSHA(serverGitCommitSHA: string) {
        if (editorStore.serverWasShutDown) {
            console.info("Reloading page...");
            document.location.reload();
            return true;
        } else if (serverGitCommitSHA != dataConstants.gitCommitSHA) {
            console.error("Server was updated", { serverGitCommitSHA, clientGitCommitSHA: dataConstants.gitCommitSHA });
            editorStore.setServerWasUpdatedReloadNecessary();
            this.socket.close();
            return true;
        }

        return false;
    }
}

export function addErrorIfSet(socketIOError: SocketIOError) {
    if (socketIOError) {
        const error = createErrorFromSocketError(socketIOError);
        errorStore.addErrorFromErrorObject(error);
    }
}

export function addErrorWrapper<T>(executer: () => Promise<T>) {
    return async () => executeWithErrorWrapper(executer);
}

export async function executeWithErrorWrapper<T>(executer: () => Promise<T>) {
    try {
        await executer();
    } catch (e) {
        errorStore.addErrorFromErrorObject(e);
    }
}