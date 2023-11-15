import EventEmitter from "eventemitter3";
import { UserList } from "../../shared/definitions/socket.io/socketIODefinitions";
import { MapDataModel, mapSnapshotHasInteractionGates } from "../../shared/game/MapDataModel";
import { GameMap } from "../database/models/GameMap";
import { jsonStringifyAsync } from "../helper/asyncUtils";
import { patchedSave } from "../helper/sequelizeUtils";
import { ClientSession } from "./ClientSession";
import { startSegment } from "newrelic";
import { LazyModelInstanceContainer } from "./LazyModelInstanceContainer";

export class MapWithMetaData extends EventEmitter {
    public static readonly EventUserListChanged = "EventUserListChanged";

    private _connectedClientSessions: ClientSession[] = [];

    private container: LazyModelInstanceContainer<MapDataModel>;

    public constructor(
        private gameMap: GameMap
    ) {
        super();

        this.container = new LazyModelInstanceContainer<MapDataModel>(gameMap.snapshot, "Map #" + this.gameMap.id);
    }

    public dispose() {
        this.container.dispose();
    }

    public get mapId() {
        return this.gameMap.id;
    }

    public get moduleOwnerId() {
        return this.mapSnapshot.moduleOwner;
    }

    public get mapSnapshot() {
        return this.container.snapshot;
    }

    public get mapData() {
        return this.container.instance;
    }

    public get deleted() {
        return this.gameMap.deleted;
    }

    public set deleted(value: boolean) {
        this.gameMap.deleted = value;
    }

    public get mightHaveChanges() {
        return this.container.isDirtySinceLastSave || !!this.gameMap.changed();
    }

    public async saveGameMap() {
        return startSegment("ActionTreeWithMetaData.saveGameMap() ID: " + this.gameMap.id, false, async () => {
            if (this.container.isDirtySinceLastSave) {
                this.container.markNotDirty();
                this.gameMap.snapshotJSONString = await jsonStringifyAsync(this.mapSnapshot);
            }

            if (this.gameMap.changed()) {
                await patchedSave(this.gameMap);
            }
        });
    }

    /*
    public async destroyGameMap() {
        await this.gameMap.destroy();
    }
    */

    public get connectedClientSessions(): readonly ClientSession[] {
        return this._connectedClientSessions;
    }

    // Should only be called from ClientSession
    public get internalConnectedClientSessions() {
        return this._connectedClientSessions;
    }

    public get userList(): UserList {
        return this.connectedClientSessions.map(clientSession => ({
            userId: clientSession.userId,
            username: clientSession.username
        }));
    }

    public emitUserListChanged() {
        this.emit(MapWithMetaData.EventUserListChanged, this.userList);
    }

    public get isMainGameMap() {
        return !this.moduleOwnerId;
    }

    public get containsInteractionGates() {
        return mapSnapshotHasInteractionGates(this.mapSnapshot);
    }

    public isOwnedByModule(moduleId: string) {
        return this.moduleOwnerId === moduleId;
    }
}