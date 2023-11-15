import { makeAutoObservable, ObservableMap, ObservableSet, runInAction } from "mobx";
import { registerRootStore, unregisterRootStore } from "mobx-keystone";
import { MapList } from "../../shared/definitions/socket.io/socketIODefinitions";
import { MapDataModel } from "../../shared/game/MapDataModel";
import { editorClient } from "../communication/EditorClient";
import { ErrorType } from "./editor/ErrorNotification";
import { editorStore } from "./EditorStore";
import { errorStore } from "./ErrorStore";
import { gameStore } from "./GameStore";
import { mapEditorStores } from "./MapEditorStore";
import { undoableMapEditorCloseCurrentMapBecauseOfDeletion } from "./undo/operation/MapEditorCloseCurrentMapOp";

export enum MapStatus {
    NotRequested,
    Loading,
    Loaded,
    DoesNotExist
}

export class EditorMapStore {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public mapList: MapList = [];
    public existingMaps = new ObservableSet<number>();

    public maps = new ObservableMap<number, MapDataModel>();
    public mapLoadingPromises = new ObservableMap<number, Promise<unknown>>();

    public setMapList(mapList: MapList) {
        this.mapList = mapList;

        this.existingMaps.clear();
        for (const map of mapList) {
            this.existingMaps.add(map.id);
        }
    }

    public getMapStatus(mapId: number) {
        if (!this.existingMaps.has(mapId))
            return MapStatus.DoesNotExist;

        if (this.maps.has(mapId))
            return MapStatus.Loaded;

        if (this.mapLoadingPromises.has(mapId))
            return MapStatus.Loading;

        return MapStatus.NotRequested;
    }

    public addMap(mapId: number, mapData: MapDataModel) {
        if (this.maps.has(mapId))
            throw new Error("Tried to add a map which is already added");

        registerRootStore(mapData);

        this.maps.set(mapId, mapData);

        editorClient.startTrackingMap(mapData, mapId);
    }

    public removeMap(mapId: number) {
        if (!this.maps.has(mapId))
            throw new Error("Tried to remove a map which is currently not added");

        const mapData = this.maps.get(mapId);
        unregisterRootStore(mapData);

        this.maps.delete(mapId);
        this.mapLoadingPromises.delete(mapId);

        editorClient.stopTrackingMap(mapId);
    }

    public clearMaps() {
        for (const map of this.maps.values()) {
            unregisterRootStore(map);
        }

        this.maps.clear();
        this.mapLoadingPromises.clear();
        this.setMapList([]);

        editorClient.stopTrackingAllMaps();
    }

    public setMapLoading(mapId: number, loadingPromise: Promise<unknown>) {
        if (this.getMapStatus(mapId) !== MapStatus.NotRequested)
            throw new Error("Can only set MapStatus.Loading if currently MapStatus.NotRequested");

        this.mapLoadingPromises.set(mapId, loadingPromise);
    }

    public setMapFailed(mapId: number) {
        if (this.getMapStatus(mapId) !== MapStatus.Loading)
            throw new Error("Can only call setMapFailed if currently MapStatus.Loading");

        this.mapLoadingPromises.delete(mapId);
    }

    public removeDeletedMap(deletedId: number, deletedByThisUser: boolean) {
        for (const mapEditorStore of mapEditorStores) {
            const { currentMapStore } = mapEditorStore;
            if (currentMapStore.currentMapId === deletedId) {
                if (!deletedByThisUser) {
                    errorStore.addError(ErrorType.General, "editor.error_current_map_deleted");
                    undoableMapEditorCloseCurrentMapBecauseOfDeletion(currentMapStore);
                }
                currentMapStore.clearCurrentMap();
            }
        }

        if (gameStore.selectedStartMap === deletedId) {
            gameStore.clearSelectedStartMap();
        }

        this.setMapList(this.mapList.filter(entry => entry.id !== deletedId));

        if (this.maps.has(deletedId)) {
            this.removeMap(deletedId);
        }
    }

    public getOrLoadMapWithMetaData(mapId: number, loadIfNotLoaded: boolean = true) {
        const mapStatus = this.getMapStatus(mapId);

        if (loadIfNotLoaded && (mapStatus === MapStatus.NotRequested)) {
            // HACK tw: If we are calling getOrLoadMapWithMetaData in an observable, we're getting
            // "Since strict-mode is enabled, changing (observed) observable values without
            // using an action is not allowed." (because of the actions that loadMapIfNotLoaded
            // calls). runInAction() removes that problem, although I am not completely sure why.
            runInAction(() => editorClient.loadMapIfNotLoaded(mapId));
        }

        const map = this.maps.get(mapId);
        return {
            map,
            mapStatus,
            mapDoesNotExist: mapStatus === MapStatus.DoesNotExist
        };
    }

    public isUserAllowedToEditMapWithId(mapId: number): boolean {
        return editorStore.isMainGameEditor || this.isMapPartOfTheModule(mapId);
    }

    public isMapPartOfTheModule(mapId: number): boolean {
        return this.getOrLoadMapWithMetaData(mapId).map?.moduleOwner === editorStore.sessionModuleId;
    }

    public get mapIdsOfSessionModule(): number[] {
        return this.mapList.filter(m => !!m.isOwnedByAModule).map(m => m.id);
    }


    public hasMapId(id: number) {
        return Boolean(this.mapList.find(map => map.id === id));
    }
}

export const editorMapStore = new EditorMapStore();