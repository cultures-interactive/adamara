import { makeAutoObservable } from "mobx";
import { MapDataModel } from "../../shared/game/MapDataModel";
import { editorMapStore, MapStatus } from "./EditorMapStore";
import { editorStore } from "./EditorStore";
import { gameStore } from "./GameStore";

export class CurrentMapStore {
    public constructor(
        private mapUsedForGame: boolean
    ) {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public runningMapOperation: boolean;

    public currentMapId: number = null;

    public get hasCurrentMap() {
        return this.currentMapId !== null;
    }

    public get currentMap(): MapDataModel {
        if (!this.hasCurrentMap)
            return null;

        return editorMapStore.maps.get(this.currentMapId);
    }

    public setRunningMapOperation(value: boolean) {
        this.runningMapOperation = value;
    }

    public setCurrentMap(mapId: number) {
        if (this.currentMapId === mapId)
            return;

        if ((mapId !== null) && (editorMapStore.getMapStatus(mapId) !== MapStatus.Loaded))
            throw new Error("Cannot call setCurrentMap with a map that has not been loaded yet.");

        this.currentMapId = mapId;

        if (this.mapUsedForGame) {
            gameStore.setSelectedStartMap(mapId);
        }
    }

    public clearCurrentMap() {
        this.setCurrentMap(null);
    }

    public get isUserAllowedToEditCurrentMap(): boolean {
        return editorStore.isMainGameEditor || this.isCurrentMapPartOfTheModule;
    }

    public get isCurrentMapPartOfTheModule(): boolean {
        return editorStore.sessionModuleId === this.currentMap?.moduleOwner;
    }
}