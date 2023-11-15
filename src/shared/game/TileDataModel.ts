import { computed } from "mobx";
import { model, Model, modelAction, prop, SnapshotOutOfModel } from "mobx-keystone";
import { TileAssetGetter } from "../resources/TileAssetModel";
import { PositionInterface, PositionModel, ReadonlyPosition } from "./PositionModel";
import { ReadonlyTileDataInteractionTrigger, TileDataInteractionTriggerInterface, TileDataInteractionTriggerModel } from "./TileDataInteractionTriggerModel";

export interface TileDataInterface {
    readonly position: PositionInterface;
    readonly tileAssetId: string;
    readonly interactionTriggerData: TileDataInteractionTriggerInterface;
    readonly isInteractionTrigger: boolean;
    readonly hasConflictResolutionOriginOverride: boolean;
    readonly conflictResolutionOriginOverride: number;
    readonly conflictResolutionFlatZIndex: number;
    readonly additionalOffsetX: number;
    readonly additionalOffsetY: number;
    readonly additionalOffsetZ: number;
}

export interface ChangeableTileDataSnapshot {
    tileAssetId: string;
    isInteractionTrigger: boolean;
    isModuleGate: boolean;
    interactionTriggerModelId?: string;
    interactionTriggerLabel?: string;
    interactionTriggerTileOffsetX?: number;
    interactionTriggerTileOffsetY?: number;
    conflictResolutionOriginOverride?: number;
    conflictResolutionFlatZIndex: number;
    additionalOffsetX: number;
    additionalOffsetY: number;
    additionalOffsetZ: number;
}

@model("game/TileModel")
export class TileDataModel extends Model({
    position: prop<PositionModel>(),
    tileAssetId: prop<string>(""),
    interactionTriggerData: prop<TileDataInteractionTriggerModel>(),
    conflictResolutionOriginOverride: prop<number>().withSetter(),
    conflictResolutionFlatZIndex: prop<number>(0).withSetter(),
    additionalOffsetX: prop<number>(0).withSetter(),
    additionalOffsetY: prop<number>(0).withSetter(),
    additionalOffsetZ: prop<number>(0).withSetter()
}) implements TileDataInterface {

    @computed
    public get isInteractionTrigger() {
        return !!this.interactionTriggerData?.isInteractionTrigger;
    }

    @computed
    public get isModuleGate() {
        return !!this.interactionTriggerData?.isModuleGate;
    }

    @computed
    public get hasConflictResolutionOriginOverride() {
        return (this.conflictResolutionOriginOverride !== null) && (this.conflictResolutionOriginOverride !== undefined);
    }

    @modelAction
    public applyChangeableTileDataSnapshot(snapshot: ChangeableTileDataSnapshot) {
        this.tileAssetId = snapshot.tileAssetId;

        if (this.interactionTriggerData?.$modelId != snapshot.interactionTriggerModelId) {
            if (!snapshot.interactionTriggerModelId) {
                this.interactionTriggerData = undefined;
            } else {
                this.interactionTriggerData = new TileDataInteractionTriggerModel({
                    $modelId: snapshot.interactionTriggerModelId
                });
            }
        }

        this.interactionTriggerData?.setIsInteractionTrigger(snapshot.isInteractionTrigger);
        this.interactionTriggerData?.setIsModuleGate(snapshot.isModuleGate);
        this.interactionTriggerData?.setLabel(snapshot.interactionTriggerLabel);
        this.interactionTriggerData?.setTileOffsetX(snapshot.interactionTriggerTileOffsetX);
        this.interactionTriggerData?.setTileOffsetY(snapshot.interactionTriggerTileOffsetY);

        this.conflictResolutionOriginOverride = snapshot.conflictResolutionOriginOverride;
        this.conflictResolutionFlatZIndex = snapshot.conflictResolutionFlatZIndex;

        this.additionalOffsetX = snapshot.additionalOffsetX;
        this.additionalOffsetY = snapshot.additionalOffsetY;
        this.additionalOffsetZ = snapshot.additionalOffsetZ;
    }

    public isOnPlaneAndOverlappingXY(x: number, y: number, plane: number, getTileAsset: TileAssetGetter): boolean {
        if (this.position.plane !== plane)
            return false;

        return this.isOverlappingXY(x, y, getTileAsset);
    }

    public isOverlappingXY(x: number, y: number, getTileAsset: TileAssetGetter) {
        if ((this.position.x > x) || (this.position.y > y))
            return false;

        const tileAsset = getTileAsset(this.tileAssetId);
        const tilesX = tileAsset ? tileAsset.tilesX : 1;
        const tilesY = tileAsset ? tileAsset.tilesY : 1;
        return ((this.position.x + tilesX) > x) && ((this.position.y + tilesY) > y);
    }

    public isOnSamePlaneAndIntersectingXY(x: number, y: number, tilesX: number, tilesY: number, plane: number, getTileAsset: TileAssetGetter): boolean {
        if (this.position.plane !== plane)
            return false;

        return this.isIntersectingXY(x, y, tilesX, tilesY, getTileAsset);
    }

    public isIntersectingXY(otherX: number, otherY: number, otherTilesX: number, otherTilesY: number, getTileAsset: TileAssetGetter) {
        if ((this.position.x > (otherX + otherTilesX)) || (this.position.y > (otherY + otherTilesY)))
            return false;

        const tileAsset = getTileAsset(this.tileAssetId);
        const tilesX = tileAsset ? tileAsset.tilesX : 1;
        const tilesY = tileAsset ? tileAsset.tilesY : 1;

        const thisLeft = this.position.x;
        const thisRight = thisLeft + tilesX - 1;
        const thisTop = this.position.y;
        const thisBottom = thisTop + tilesY - 1;

        const otherLeft = otherX;
        const otherRight = otherLeft + otherTilesX - 1;
        const otherTop = otherY;
        const otherBottom = otherTop + otherTilesY - 1;

        return (
            thisLeft <= otherRight &&
            otherLeft <= thisRight &&
            thisTop <= otherBottom &&
            otherTop <= thisBottom
        );
    }
}

export function getChangeableTileDataSnapshot(tileData: TileDataModel): ChangeableTileDataSnapshot {
    if (!tileData)
        return getEmptyChangeableTileDataSnapshot();

    return {
        tileAssetId: tileData.tileAssetId,
        isInteractionTrigger: tileData.isInteractionTrigger,
        isModuleGate: tileData.isModuleGate,
        interactionTriggerModelId: tileData.interactionTriggerData?.$modelId,
        interactionTriggerLabel: tileData.interactionTriggerData?.label,
        interactionTriggerTileOffsetX: tileData.interactionTriggerData?.tileOffsetX,
        interactionTriggerTileOffsetY: tileData.interactionTriggerData?.tileOffsetY,
        conflictResolutionOriginOverride: tileData.conflictResolutionOriginOverride,
        conflictResolutionFlatZIndex: tileData.conflictResolutionFlatZIndex,
        additionalOffsetX: tileData.additionalOffsetX,
        additionalOffsetY: tileData.additionalOffsetY,
        additionalOffsetZ: tileData.additionalOffsetZ
    };
}

export function getEmptyChangeableTileDataSnapshot(): ChangeableTileDataSnapshot {
    return {
        tileAssetId: undefined,
        isInteractionTrigger: false,
        isModuleGate: false,
        conflictResolutionFlatZIndex: 0,
        additionalOffsetX: 0,
        additionalOffsetY: 0,
        additionalOffsetZ: 0
    };
}

export function tileDataEqualsChangeableTileDataSnapshot(tileData: TileDataModel, snapshot: ChangeableTileDataSnapshot) {
    if (!tileData) {
        return snapshot.tileAssetId === undefined;
    }

    return (tileData.tileAssetId == snapshot.tileAssetId) &&
        (tileData.isInteractionTrigger == snapshot.isInteractionTrigger) &&
        (tileData.isModuleGate == snapshot.isModuleGate) &&
        (tileData.interactionTriggerData?.$modelId == snapshot.interactionTriggerModelId) &&
        (tileData.interactionTriggerData?.label == snapshot.interactionTriggerLabel) &&
        (tileData.interactionTriggerData?.tileOffsetX == snapshot.interactionTriggerTileOffsetX) &&
        (tileData.interactionTriggerData?.tileOffsetY == snapshot.interactionTriggerTileOffsetY) &&
        (tileData.conflictResolutionOriginOverride == snapshot.conflictResolutionOriginOverride) &&
        (tileData.conflictResolutionFlatZIndex == snapshot.conflictResolutionFlatZIndex) &&
        (tileData.additionalOffsetX == snapshot.additionalOffsetX) &&
        (tileData.additionalOffsetY == snapshot.additionalOffsetY) &&
        (tileData.additionalOffsetZ == snapshot.additionalOffsetZ);
}

export class ReadonlyTileData implements TileDataInterface {
    public readonly position: ReadonlyPosition;
    public readonly tileAssetId: string;
    public readonly label: string;
    public readonly interactionTriggerData: ReadonlyTileDataInteractionTrigger;
    public readonly isInteractionTrigger: boolean;
    public readonly hasConflictResolutionOriginOverride: boolean;
    public readonly conflictResolutionOriginOverride: number;
    public readonly conflictResolutionFlatZIndex: number;
    public readonly additionalOffsetX: number;
    public readonly additionalOffsetY: number;
    public readonly additionalOffsetZ: number;

    public constructor(data: TileDataInterface) {
        this.position = new ReadonlyPosition(data.position);
        this.tileAssetId = data.tileAssetId;
        this.interactionTriggerData = data.interactionTriggerData && new ReadonlyTileDataInteractionTrigger(data.interactionTriggerData);
        this.isInteractionTrigger = data.isInteractionTrigger;
        this.hasConflictResolutionOriginOverride = data.hasConflictResolutionOriginOverride;
        this.conflictResolutionOriginOverride = data.conflictResolutionOriginOverride;
        this.conflictResolutionFlatZIndex = data.conflictResolutionFlatZIndex;
        this.additionalOffsetX = data.additionalOffsetX;
        this.additionalOffsetY = data.additionalOffsetY;
        this.additionalOffsetZ = data.additionalOffsetZ;
    }
}

export const EMPTY_TILE_DATA_MODEL = new TileDataModel({ position: new PositionModel({}) });

export type TileDataSnapshot = SnapshotOutOfModel<TileDataModel>;