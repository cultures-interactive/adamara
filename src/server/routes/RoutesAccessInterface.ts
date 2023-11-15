import { ServerState } from "../data/ServerState";

export interface RoutesAccessInterface {
    serverState: ServerState;
    gracefulShutdown: () => void;
}