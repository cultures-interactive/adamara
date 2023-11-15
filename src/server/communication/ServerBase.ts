import { Server, Socket } from "socket.io";
import { NextFunction, Request, Response } from "express";
import { RequestHandler as ExpressRequestHandler } from "express";
import { Server as HttpServer } from "http";
import { sendToSentryAndLogger } from "../integrations/errorReporting";
import { Sentry } from "../integrations/sentry";
import { TranslatedError } from "../../shared/definitions/errors/TranslatedError";
import { UserPrivileges } from "../../shared/definitions/apiResults/AuthCheckLoginStatusResult";
import { EditorClientToServerEvents, ManagementClientToServerEvents, EditorServerToClientEvents, ManagementServerToClientEvents, SharedClientToServerEvents, SharedServerToClientEvents } from "../../shared/definitions/socket.io/socketIODefinitions";

declare module "http" {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface IncomingMessage extends Express.Request {
    }
}

type ClientToServerEvents = EditorClientToServerEvents & ManagementClientToServerEvents;
type ServerToClientEvents = EditorServerToClientEvents & ManagementServerToClientEvents;

export class SocketIOServer {
    public io: Server<ClientToServerEvents, ServerToClientEvents>;

    public constructor(httpServer: HttpServer) {
        this.io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
            maxHttpBufferSize: 1e8,
            pingTimeout: 5 * 60 * 1000 // 5 min ping timeout to accomodate slower devices and networks
        });
    }
}

export class ServerBase<ListenEvents extends SharedClientToServerEvents, EmitEvents extends SharedServerToClientEvents> {
    protected io: Server<ListenEvents, EmitEvents>;
    protected nextUserId: number = 1;

    public constructor(
        protected sessionMiddlewares: ExpressRequestHandler[],
        socketIOServer: SocketIOServer
    ) {
        this.io = socketIOServer.io;
    }

    protected init() {
        // Get session at time of connection for each socket
        for (const middleware of this.sessionMiddlewares) {
            this.io.use((socket, next) => {
                middleware(socket.request as Request, {} as Response, next as NextFunction);
            });
        }
    }

    protected connectSocket(socket: Socket<ListenEvents, EmitEvents>) {
        // Refresh session on each message
        // Note: This cannot *switch* sessions, sadly. So on session logout this will trigger the
        // "if (err)" condition if the socket is still connected and a message is received.
        socket.use((__, next) => {

            // We cannot have asynchronous messages - to keep server state integrity, they must be received in exactly
            // the same order as they are sent. If they are not, it will lead to "this data was changed in the meantime"
            // errors. Therefore we have to immediately continue, even if the session was invalidated/changed in the
            // meantime.
            // TODO Find a better solution later. Maybe frequent reloads on a timer? Maybe track sessions automatically on
            // change?
            next();

            // Still, reload the session despite continuing - at least we can log the user out rather quickly after this
            // message.
            socket.request.session.reload((err) => {
                if (err) {
                    sendToSentryAndLogger(err);
                    socket.disconnect();
                }
            });
        });

        let latestEventName = "";
        socket.onAny(eventName => {
            latestEventName = eventName;
        });

        const getLatestEventName = () => {
            return latestEventName;
        };

        const forThisClient = socket;
        const forEveryone = this.io;
        const forEveryoneElse = socket.broadcast;

        const throwIfUserIsNotLoggedIn = () => {
            if (socket.request.isAuthenticated())
                return;

            Sentry.captureMessage("[availableOnlyToLoggedInUser] User was not authenticated on EditorServer call: " + latestEventName);
            throw new TranslatedError("editor.error_not_authenticated");
        };

        const availableOnlyToAdminUser = () => {
            throwIfUserIsNotLoggedIn();
            if (socket.request.user.privilegeLevel === UserPrivileges.Admin)
                return;

            Sentry.captureMessage("[availableOnlyToAdminUser] User was not admin on EditorServer call: " + latestEventName);
            throw new TranslatedError("editor.error_not_authorized");
        };

        return { forThisClient, forEveryone, forEveryoneElse, throwIfUserIsNotLoggedIn, availableOnlyToAdminUser, getLatestEventName };
    }

    public shutdown(callback?: (err?: Error) => void) {
        const sharedIo = this.io as Server<SharedClientToServerEvents, SharedServerToClientEvents>;
        sharedIo.emit("serverShutdown");
        this.io.close(callback);
    }
}