import { model, Model, modelAction, prop, SnapshotOutOf } from "mobx-keystone";
import { PositionModel, ReadonlyPosition } from "./PositionModel";
import { ChangeableTileDataSnapshot, ReadonlyTileData, TileDataInterface, TileDataModel } from "./TileDataModel";
import { sharedLogger } from "../helper/logger";
import { ReadonlyMapDataProperties, MapDataPropertiesModel, MapDataPropertiesInterface } from "./MapDataPropertiesModel";
import { DynamicMapElementInterface, DynamicMapElementModel } from "./dynamicMapElements/DynamicMapElement";
import { DynamicMapElementNPCInterface, DynamicMapElementNPCModel, ReadonlyDynamicMapElementNPC } from "./dynamicMapElements/DynamicMapElementNPCModel";
import { DynamicMapElementMapMarkerInterface, DynamicMapElementMapMarkerModel } from "./dynamicMapElements/DynamicMapElementMapMarkerModel";
import { DynamicMapElementAreaTriggerInterface, DynamicMapElementAreaTriggerModel } from "./dynamicMapElements/DynamicMapElementAreaTriggerModel";
import { DynamicMapElementAnimationElementInterface, DynamicMapElementAnimationElementModel } from "./dynamicMapElements/DynamicMapElementAnimationElementModel";
import { InteractionTriggerData } from "./InteractionTriggerData";
import { computed } from "mobx";
import { TileAssetGetter } from "../resources/TileAssetModel";

export interface MapDataInterface {
    readonly tiles: ReadonlyArray<TileDataInterface>;
    readonly dynamicMapElements: ReadonlyArray<DynamicMapElementInterface<any>>;
    readonly npcs: ReadonlyArray<DynamicMapElementNPCInterface>;
    readonly animationElements: ReadonlyArray<DynamicMapElementAnimationElementInterface>;
    readonly areaTriggers: ReadonlyArray<DynamicMapElementAreaTriggerInterface>;
    readonly mapMarkers: ReadonlyArray<DynamicMapElementMapMarkerInterface>;
    readonly properties: MapDataPropertiesInterface;
    readonly interactionTriggerTiles: TileDataInterface[];

    getTile(x: number, y: number, layer: number, plane: number): TileDataInterface;

    /**
     * Returns the {@link TileDataModel}s of all layers of the assigned position.
     * @param tileX The tile x position to get the tiles from.
     * @param tileY The tile y position to get the tiles from.
     * @param plane The plane index to get the tiles from.
     * @return An array of {@link TileDataModel} or an empty array.
     */
    getTilesOnPlaneWithXYOverlap(tileX: number, tileY: number, plane: number, getTileAsset: TileAssetGetter): TileDataInterface[];

    /**
     * Returns:
     * - the highest layer=0 (ground) plane for the given x|y tile coordinates, or
     * - undefined if none is found.
     */
    getHighestMainGroundTilePlaneForPosition(x: number, y: number, getTileAsset: TileAssetGetter): number;

    getNPCAtPositionXYPlane(x: number, y: number, plane: number): DynamicMapElementNPCInterface;
}

@model("game/MapModel")
export class MapDataModel extends Model({
    tiles: prop<TileDataModel[]>(() => []),
    dynamicMapElements: prop<DynamicMapElementModel<any>[]>(() => []),
    properties: prop<MapDataPropertiesModel>(() => new MapDataPropertiesModel({})),
    moduleOwner: prop<string>("")
}) implements MapDataInterface {
    @modelAction
    public addDynamicMapElement(dynamicMapElement: DynamicMapElementModel<any>) {
        this.dynamicMapElements.push(dynamicMapElement);
    }

    @modelAction
    public removeDynamicMapElement(dynamicMapElement: DynamicMapElementModel<any>) {
        const index = this.dynamicMapElements.indexOf(dynamicMapElement);
        if (index === -1)
            return;

        this.dynamicMapElements.splice(index, 1);
    }

    public getDynamicMapElementByModelId($modelId: string) {
        return this.dynamicMapElements.find(element => element.$modelId === $modelId);
    }

    @modelAction
    public setTile(x: number, y: number, layer: number, plane: number, newData: ChangeableTileDataSnapshot) {
        const tile = this.getTile(x, y, layer, plane);
        if (newData.tileAssetId == undefined) {
            if (tile) {
                const index = this.tiles.indexOf(tile);
                this.tiles.splice(index, 1);
            }
            return;
        }

        if (tile) {
            tile.applyChangeableTileDataSnapshot(newData);
        } else {
            const newTile = new TileDataModel({
                position: new PositionModel({ x, y, layer, plane })
            });
            newTile.applyChangeableTileDataSnapshot(newData);
            this.tiles.push(newTile);
        }
    }

    public getTile(x: number, y: number, layer: number, plane: number) {
        return this.tiles.find(e => e.position.equals(x, y, layer, plane));
    }

    public getFirstEmptyLayer(x: number, y: number, plane: number, startLayerInclusive: number) {
        const tilesOnPosition = this.tiles.filter(tile => tile.position.equals(x, y, tile.position.layer, plane));

        let layer = startLayerInclusive;
        while (tilesOnPosition.some(tile => tile.position.layer === layer)) {
            layer++;
        }

        return layer;
    }

    public getTilesOnPlaneWithXYOverlap(x: number, y: number, plane: number, getTileAsset: TileAssetGetter): TileDataModel[] {
        return this.tiles.filter(tile => tile.isOnPlaneAndOverlappingXY(x, y, plane, getTileAsset));
    }

    public getTilesWithXYOverlap(x: number, y: number, getTileAsset: TileAssetGetter): TileDataModel[] {
        return this.tiles.filter(tile => tile.isOverlappingXY(x, y, getTileAsset));
    }

    public getHighestMainGroundTilePlaneForPosition(x: number, y: number, getTileAsset: TileAssetGetter) {
        let highestPlane: number = undefined;

        for (const tile of this.tiles) {
            if (tile.position.layer !== 0)
                continue;

            if ((highestPlane !== undefined) && (tile.position.plane <= highestPlane))
                continue;

            if (tile.isOverlappingXY(x, y, getTileAsset)) {
                highestPlane = tile.position.plane;
            }
        }

        return highestPlane;
    }

    @computed
    public get npcs() {
        return this.dynamicMapElements.filter(element => element instanceof DynamicMapElementNPCModel).map(element => element as DynamicMapElementNPCModel);
    }

    public getNPCAtPositionXYPlane(x: number, y: number, plane: number) {
        return this.npcs.filter(npc => (npc.position.x === x) && (npc.position.y === y) && (npc.position.plane === plane))[0];
    }

    @computed
    public get animationElements() {
        return this.dynamicMapElements.filter(element => element instanceof DynamicMapElementAnimationElementModel).map(element => element as DynamicMapElementAnimationElementModel);
    }

    @computed
    public get areaTriggers() {
        return this.dynamicMapElements.filter(element => element instanceof DynamicMapElementAreaTriggerModel).map(element => element as DynamicMapElementAreaTriggerModel);
    }

    @computed
    public get mapMarkers() {
        return this.dynamicMapElements.filter(element => element instanceof DynamicMapElementMapMarkerModel).map(element => element as DynamicMapElementMapMarkerModel);
    }

    public getAllDynamicMapElementsAtPositionXYPlane(x: number, y: number, plane: number) {
        return this.dynamicMapElements.filter(element => (element.position.x === x) && (element.position.y === y) && (element.position.plane === plane));
    }

    public getAllDynamicMapElementsAtPositionXY(x: number, y: number) {
        return this.dynamicMapElements.filter(element => (element.position.x === x) && (element.position.y === y));
    }

    @computed
    public get interactionTriggerTiles() {
        return this.tiles.filter(tile => tile.isInteractionTrigger);
    }

    @computed
    public get interactionTriggerDataArray() {
        const result = this.dynamicMapElements.filter(element => element.isInteractionTrigger) as unknown as InteractionTriggerData[];
        result.push(...this.interactionTriggerTiles.map(tile => tile.interactionTriggerData));
        return result;
    }

    @computed
    public get interactionGateDataArray() {
        const result = this.dynamicMapElements.filter(element => element.isInteractionTrigger && element.isModuleGate) as unknown as InteractionTriggerData[];
        result.push(...this.tiles.filter(tile => tile.isInteractionTrigger && tile.isModuleGate).map(tile => tile.interactionTriggerData));
        return result;
    }
}

export function mapSnapshotHasInteractionGates(mapSnapshot: MapDataSnapshot) {
    return mapSnapshot.dynamicMapElements.some(element => element.isInteractionTrigger && element.isModuleGate) ||
        mapSnapshot.tiles.some(tile => !!tile.interactionTriggerData?.isInteractionTrigger && !!tile.interactionTriggerData?.isModuleGate);
}

function getKeyXYLP(x: number, y: number, layer: number, plane: number) {
    return x + " " + y + " " + layer + " " + plane;
}

function getKeyXYP(x: number, y: number, plane: number) {
    return x + " " + y + " " + plane;
}

function getKeyXY(x: number, y: number) {
    return x + " " + y;
}

export class ReadonlyMapData implements MapDataInterface {
    public readonly tiles: ReadonlyArray<ReadonlyTileData>;
    public readonly dynamicMapElements: ReadonlyArray<DynamicMapElementInterface<any>>;
    public readonly npcs: ReadonlyArray<ReadonlyDynamicMapElementNPC>;
    public readonly animationElements: ReadonlyArray<DynamicMapElementAnimationElementInterface>;
    public readonly areaTriggers: ReadonlyArray<DynamicMapElementAreaTriggerInterface>;
    public readonly mapMarkers: ReadonlyArray<DynamicMapElementMapMarkerInterface>;
    public readonly properties: ReadonlyMapDataProperties;
    public readonly interactionTriggerTiles: ReadonlyTileData[];

    private exactTilesByXYLP: Map<string, ReadonlyTileData> = new Map<string, ReadonlyTileData>();
    private allTilesByXYP: Map<string, ReadonlyTileData[]> = new Map<string, ReadonlyTileData[]>();
    private highestMainGroundPlaneByXY: Map<string, number> = new Map<string, number>();

    public constructor(data: MapDataInterface, getTileAsset: TileAssetGetter) {
        this.tiles = data.tiles.map(tile => new ReadonlyTileData(tile));
        this.dynamicMapElements = data.dynamicMapElements.map(element => element.createReadOnlyVersion());
        this.npcs = data.npcs.map(npc => npc.createReadOnlyVersion());
        this.animationElements = data.animationElements.map(animationElements => animationElements.createReadOnlyVersion());
        this.areaTriggers = data.areaTriggers.map(triggers => triggers.createReadOnlyVersion());
        this.mapMarkers = data.mapMarkers.map(markers => markers.createReadOnlyVersion());
        this.properties = new ReadonlyMapDataProperties(data.properties);
        this.interactionTriggerTiles = data.interactionTriggerTiles.map(tile => new ReadonlyTileData(tile));

        for (const tile of this.tiles) {
            const { x, y, layer, plane } = tile.position;
            this.exactTilesByXYLP.set(getKeyXYLP(x, y, layer, plane), tile);

            const tileAsset = getTileAsset(tile.tileAssetId);
            const tilesX = tileAsset ? tileAsset.tilesX : 1;
            const tilesY = tileAsset ? tileAsset.tilesY : 1;

            for (let offsetX = 0; offsetX < tilesX; offsetX++) {
                for (let offsetY = 0; offsetY < tilesY; offsetY++) {
                    const keyXYP = getKeyXYP(x + offsetX, y + offsetY, plane);
                    if (this.allTilesByXYP.has(keyXYP)) {
                        this.allTilesByXYP.get(keyXYP).push(tile);
                    } else {
                        this.allTilesByXYP.set(keyXYP, [tile]);
                    }

                    if (layer === 0) {
                        const keyXY = getKeyXY(x + offsetX, y + offsetY);
                        const currentHighestPlane = this.highestMainGroundPlaneByXY.get(keyXY);
                        if ((currentHighestPlane === undefined) || (currentHighestPlane < plane)) {
                            this.highestMainGroundPlaneByXY.set(keyXY, plane);
                        }
                    }
                }
            }
        }
    }

    /**
     * Searches for a {@link DynamicMapElementMapMarkerInterface} with the exact $modelId.
     * 
     * @param mapMarkerModelId The $modelId of the map marker to search for
     * @returns 
     */
    public findMapMarkerByModelId(mapMarkerModelId: string) {
        return this.mapMarkers.find(m => m.$modelId === mapMarkerModelId);
    }

    /**
     * Since several Map Markers can have the same label,
     * this only returns the first {@link DynamicMapElementMapMarkerInterface} in the list.
     * 
     * @param mapMarkerLabel The label of the map marker to search for
     */
    private findFirstMapMarkerByLabel(mapMarkerLabel: string) {
        return this.mapMarkers.find(m => m.label === mapMarkerLabel);
    }

    /**
     * Tries to find a start {@link ReadonlyPosition} for on this map.
     *
     * @param startMapMarkerModelId The $modelId of the start map marker.
     */
    public findStartPosition(startMapMarkerModelId: string, defaultStartLabel: string): ReadonlyPosition {
        const startMarker = this.findMapMarkerByModelId(startMapMarkerModelId);
        if (startMarker) {
            return startMarker.position;
        } else {
            const defaultStart = this.findFirstMapMarkerByLabel(defaultStartLabel);
            if (defaultStart)
                return defaultStart.position;
        }

        sharedLogger.error("Starting position invalid.", startMapMarkerModelId, defaultStartLabel);
        return new ReadonlyPosition({ x: 0, y: 0 });
    }

    public getTile(x: number, y: number, layer: number, plane: number): ReadonlyTileData {
        return this.exactTilesByXYLP.get(getKeyXYLP(x, y, layer, plane));
    }

    public getTilesOnPlaneWithXYOverlap(tileX: number, tileY: number, plane: number): TileDataInterface[] {
        return this.allTilesByXYP.get(getKeyXYP(tileX, tileY, plane)) || [];
    }

    public getHighestMainGroundTilePlaneForPosition(x: number, y: number) {
        return this.highestMainGroundPlaneByXY.get(getKeyXY(x, y));
    }

    public getNPCAtPositionXYPlane(x: number, y: number, plane: number) {
        return this.npcs.filter(npc => (npc.position.x === x) && (npc.position.y === y) && (npc.position.plane === plane))[0];
    }

    public getAllAreaTriggersAtPositionXYPlane(x: number, y: number, plane: number) {
        return this.areaTriggers.filter(trigger => (trigger.position.x === x) && (trigger.position.y === y) && (trigger.position.plane === plane));
    }

    public getAllAreaTriggersById(triggerId: string) {
        return this.areaTriggers.filter(trigger => trigger.id === triggerId);
    }

    public getMapMarkersAtPositionXYPlane(x: number, y: number, plane: number) {
        return this.mapMarkers.filter(marker => (marker.position.x === x) && (marker.position.y === y) && (marker.position.plane === plane));
    }
}

export type MapDataSnapshot = SnapshotOutOf<MapDataModel>;