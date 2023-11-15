import { model, Model, modelAction, prop, SnapshotOutOf } from "mobx-keystone";
import { ImagePropertiesModel } from "./ImagePropertiesModel";
import { PlaneTransitModel } from "./PlaneTransitModel";
import { Direction, DirectionHelper } from "./DirectionHelper";
import { computed } from "mobx";
import { getAllNumberEnumValues } from "../helper/generalHelpers";
import { Size3DModel } from "./Size3DModel";
import { TileLayerType } from "./TileLayerType";
import { adjustTileOffsetXY, adjustTileOffsetZ, adjustTileSizeXY, adjustTileSizeZ } from "../data/mapElementSorting";
import { AssetVersion } from "../definitions/socket.io/socketIODefinitions";
import { TranslatedString } from "../game/TranslatedString";
import { TranslateableEntityData } from "../translation/TranslationDataTypes";

export enum TileVisibility {
    ShowAlways,
    ComplexOnly,
    ProductionOnly
}

export const tileVisibilities = getAllNumberEnumValues<TileVisibility>(TileVisibility);

@model("resources/TileAssetModel")
export class TileAssetModel extends Model({
    id: prop<string>("").withSetter(),
    localizedName: prop<TranslatedString>(() => new TranslatedString({})),
    layerType: prop<TileLayerType>(TileLayerType.Ground).withSetter(),
    blockedTiles: prop<Direction[][][]>(() => [[[]]]).withSetter(),
    planeTransit: prop<PlaneTransitModel>().withSetter(),
    imageAssets: prop<ImagePropertiesModel[]>(() => new Array(4)),

    defaultGroundHeight: prop<number>(null).withSetter(),
    tags: prop<string[]>(() => []).withSetter(),

    visibilityInEditor: prop<TileVisibility>(() => TileVisibility.ShowAlways).withSetter(),

    offsetX: prop<number>(0),
    offsetY: prop<number>(0),
    internalOffsetZ: prop<number>(0),
    size: prop<Size3DModel>(() => new Size3DModel({})),
    conflictResolutionOrigin: prop<number>(0.5).withSetter()
}) {

    @computed
    public get tilesX() {
        return Math.max(1, Math.ceil(this.offsetX + this.size.x));
    }

    @computed
    public get tilesY() {
        return Math.max(1, Math.ceil(this.offsetY + this.size.y));
    }

    @computed
    public get offsetZComputed() {
        return ((this.layerType === TileLayerType.Decoration) || this.planeTransit?.isInitialized())
            ? 0
            : -this.size.z;
    }

    @modelAction
    public setImageProperties(imageProperties: ImagePropertiesModel, usage: TileImageUsage) {
        while (this.imageAssets.length <= usage) {
            this.imageAssets.push(null);
        }
        this.imageAssets[usage] = imageProperties;
    }

    public imageProperties(usageIndex: TileImageUsage) {
        if (this.imageAssets.length <= usageIndex) {
            return null;
        }
        return this.imageAssets[usageIndex];
    }

    @modelAction
    public resizeBlockedTilesIfNecessary() {
        const { tilesX, tilesY } = this;

        // Add missing columns
        while (this.blockedTiles.length < tilesX) {
            this.blockedTiles.push([]);
        }

        // Remove overflowing columns
        this.blockedTiles.length = tilesX;

        for (let x = 0; x < tilesX; x++) {
            const column = this.blockedTiles[x];

            // Add missing tiles in rows
            while (column.length < tilesY) {
                column.push([]);
            }

            // Remove overflowing tiles in rows
            column.length = tilesY;
        }
    }

    @modelAction
    public toggleBlockedAtOffset(offsetX: number, offsetY: number, direction: Direction) {
        if (!this.hasTileOffset(offsetX, offsetY))
            throw new Error(`Tile offset outside of range: ${offsetX}|${offsetY} (tile extents is ${this.tilesX}|${this.tilesY})`);

        const blocked = this.blockedTiles[offsetX][offsetY];
        if (blocked.some(d => d === direction)) {
            blocked.splice(blocked.indexOf(direction), 1);
        } else {
            blocked.push(direction);
        }
    }

    public isBlockedAtOffset(direction: Direction, offsetX: number, offsetY: number): boolean {
        if (!this.hasTileOffset(offsetX, offsetY))
            return false;

        const directionComponents = DirectionHelper.getComponents(direction);
        if (directionComponents) {
            return this.isBlockedAtOffset(directionComponents[0], offsetX, offsetY) ||
                this.isBlockedAtOffset(directionComponents[1], offsetX, offsetY);
        }

        const blocked = this.blockedTiles[offsetX][offsetY];
        return blocked.some(d => d === direction);
    }

    public hasTileOffset(offsetX: number, offsetY: number) {
        return (offsetX >= 0) && (offsetX < this.tilesX) &&
            (offsetY >= 0) && (offsetY < this.tilesY);
    }

    @modelAction
    public resetOffset() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.internalOffsetZ = 0;
    }

    @computed
    public get isHeightFlexible() {
        return (this.layerType !== TileLayerType.Ground) || this.planeTransit?.isInitialized() || !Number.isFinite(this.defaultGroundHeight);
    }

    public isMadeForPlane(plane: number) {
        return this.isHeightFlexible || (this.defaultGroundHeight === plane);
    }

    public get isGround() {
        return this.layerType === TileLayerType.Ground;
    }

    @modelAction
    public setOffsetX(value: number) {
        this.offsetX = adjustTileOffsetXY(value);
        this.resizeBlockedTilesIfNecessary();
    }

    @modelAction
    public setOffsetY(value: number) {
        this.offsetY = adjustTileOffsetXY(value);
        this.resizeBlockedTilesIfNecessary();
    }

    @modelAction
    public setInternalOffsetZ(value: number) {
        this.internalOffsetZ = adjustTileOffsetZ(value);
    }

    @modelAction
    public setSizeX(value: number) {
        this.size.x = adjustTileSizeXY(value, this.isGround);
        this.resizeBlockedTilesIfNecessary();
    }

    @modelAction
    public setSizeY(value: number) {
        this.size.y = adjustTileSizeXY(value, this.isGround);
        this.resizeBlockedTilesIfNecessary();
    }

    @modelAction
    public setSizeZ(value: number) {
        this.size.z = adjustTileSizeZ(value);
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Tile",
            translateableStrings: [
                { label: "Name", translatedString: this.localizedName }
            ]
        } as TranslateableEntityData;
    }
}

export type TileAssetGetter = (tileAssetId: string) => TileAssetModel;

export enum TileImageUsage {
    Background,
    WaterMask,
    Foreground,
    WaterMaskForeground
}

export const allTileImageUsages = getAllNumberEnumValues<TileImageUsage>(TileImageUsage);

export const availableImageUsagesForLayerType = new Map<TileLayerType, TileImageUsage[]>();
availableImageUsagesForLayerType.set(TileLayerType.Ground, allTileImageUsages);
availableImageUsagesForLayerType.set(TileLayerType.Decoration, [TileImageUsage.Background]);

export type TileAssetSnapshot = SnapshotOutOf<TileAssetModel>;

export function tileImageIdentificationToKey(id: string, tileImageUsage: TileImageUsage, version: AssetVersion) {
    return `${id}/${tileImageUsage}/${version}`;
}

export function keyToTileImageIdentification(frameId: string) {
    const versionStart = frameId.lastIndexOf("/");
    const tileImageUsageStart = frameId.lastIndexOf("/", versionStart - 1);

    const id = frameId.slice(0, tileImageUsageStart);
    const tileImageUsage = +frameId.slice(tileImageUsageStart + 1, versionStart) as TileImageUsage;
    const version = frameId.slice(versionStart + 1) as AssetVersion;

    return {
        id,
        tileImageUsage,
        version
    };
}

export const tileAssetFloorTag = "Boden";
export const mainCategoryTags = [tileAssetFloorTag];
