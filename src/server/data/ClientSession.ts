import EventEmitter from "eventemitter3";
import { Socket } from "socket.io";
import { MapWithMetaData } from "./MapWithMetaData";

export class ClientSession extends EventEmitter {
    public static readonly EventJoinedMap = "EventJoinedMap";
    public static readonly EventLeftMap = "EventLeftMap";
    public static readonly EventCurrentMapUserListChanged = "EventCurrentMapUserListChanged";

    private _currentMap: MapWithMetaData;
    private currentMapEventForwardingUnsubscribers: Array<() => void> = [];

    public constructor(
        public readonly userId: number,
        public readonly socket: Socket,
        private _username: string
    ) {
        super();
    }

    public get clientId() {
        return this.socket.handshake.query.clientId as string;
    }

    public get currentMap() {
        return this._currentMap;
    }

    public set currentMap(map: MapWithMetaData) {
        if (this._currentMap === map)
            return;

        if (this._currentMap) {
            this.emit(ClientSession.EventLeftMap, this._currentMap);

            const mapClientSessions = this._currentMap.internalConnectedClientSessions;
            const index = mapClientSessions.indexOf(this);
            mapClientSessions.splice(index, 1);

            this.stopForwardingAllCurrentMapEvents();

            this._currentMap.emitUserListChanged();
        }

        this._currentMap = map;

        if (this._currentMap) {
            const mapClientSessions = this._currentMap.internalConnectedClientSessions;
            mapClientSessions.push(this);

            // Emit "user list changed" *before* subscribing to current map events since it's only for clients that had already joined.
            this._currentMap.emitUserListChanged();

            this.startForwardingCurrentMapEvent(MapWithMetaData.EventUserListChanged, ClientSession.EventCurrentMapUserListChanged);

            this.emit(ClientSession.EventJoinedMap, this._currentMap);
        }
    }

    public get username() {
        return this._username;
    }

    public set username(value: string) {
        this._username = value;
        if (this.currentMap) {
            this.currentMap.emitUserListChanged();
        }
    }

    public dispose() {
        this.currentMap = null;
        super.removeAllListeners();
    }

    private startForwardingCurrentMapEvent(mapWithMetaDataEvent: string, clientSessionEvent: string) {
        const forwardingCallback = (...args: any) => {
            this.emit(clientSessionEvent, ...args);
        };

        this.currentMap.on(mapWithMetaDataEvent, forwardingCallback);

        const unsubscribe = () => {
            this.currentMap.off(mapWithMetaDataEvent, forwardingCallback);
        };

        this.currentMapEventForwardingUnsubscribers.push(unsubscribe);
    }

    private stopForwardingAllCurrentMapEvents() {
        for (const unsubscribe of this.currentMapEventForwardingUnsubscribers) {
            unsubscribe();
        }

        this.currentMapEventForwardingUnsubscribers = [];
    }
}
