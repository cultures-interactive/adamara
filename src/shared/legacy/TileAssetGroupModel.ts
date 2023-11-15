import { model, Model, modelAction, prop, SnapshotOutOf } from "mobx-keystone";
import { getTileLayerType } from "../data/layerConstants";
import { adjustTileOffsetXY, adjustTileOffsetZ, adjustTileSizeXY, adjustTileSizeZ } from "../data/mapElementSorting";
import { PositionModel } from "../game/PositionModel";
import { TileDataModel } from "../game/TileDataModel";
import { ImagePropertiesModel } from "../resources/ImagePropertiesModel";
import { Size3DModel } from "../resources/Size3DModel";
import { TileAssetSnapshot, TileImageUsage } from "../resources/TileAssetModel";
import { TileLayerType } from "../resources/TileLayerType";

const tileAssetGroupModelType = "resources/TileAssetGroupModel";

@model("resources/TileAssetGroupModel")
export class TileAssetGroupModel extends Model({
    id: prop<string>("").withSetter(),
    tiles: prop<TileDataModel[]>(() => []).withSetter(),
    tags: prop<string[]>(() => []).withSetter(),

    /** If the tile asset group was auto-created by cutting images, the original images are saved here to allow for redoing the cut later */
    baseAsset: prop<TileAssetGroupBaseDataModel>(() => new TileAssetGroupBaseDataModel({})).withSetter(),

    offsetX: prop<number>(0),
    offsetY: prop<number>(0),
    internalOffsetZ: prop<number>(0),
    size: prop<Size3DModel>(() => new Size3DModel({})),
    conflictResolutionOrigin: prop<number>(0.5).withSetter()
}) {

    @modelAction
    public setTile(x: number, y: number, layer: number, tileAssetId: string) {
        const tile = this.getTile(x, y, layer);
        if (tile) {
            tile.tileAssetId = tileAssetId;
        } else {
            const newTile = new TileDataModel({
                position: new PositionModel({ x, y, layer }),
                tileAssetId
            });
            this.tiles.push(newTile);
        }
    }

    @modelAction
    public removeTile(x: number, y: number, layer: number) {
        const tile = this.getTile(x, y, layer);

        if (!tile)
            return;

        const index = this.tiles.indexOf(tile);
        this.tiles.splice(index, 1);
    }

    @modelAction
    public resetOffset() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.internalOffsetZ = 0;
    }

    public width() {
        if (this.tiles.length == 0)
            return 1;

        return 1 + this.tiles.reduce((a, b) => a.position.x > b.position.x ? a : b).position.x;
    }

    public height() {
        if (this.tiles.length == 0)
            return 1;

        return 1 + this.tiles.reduce((a, b) => a.position.y > b.position.y ? a : b).position.y;
    }

    public getTile(x: number, y: number, layer: number) {
        return this.tiles.find(e => e.position.x === x && e.position.y === y && e.position.layer === layer);
    }

    public get isGround() {
        return getTileLayerType(this.baseAsset.layer) === TileLayerType.Ground;
    }

    @modelAction
    public setOffsetX(value: number) {
        this.offsetX = adjustTileOffsetXY(value);
    }

    @modelAction
    public setOffsetY(value: number) {
        this.offsetY = adjustTileOffsetXY(value);
    }

    @modelAction
    public setInternalOffsetZ(value: number) {
        this.internalOffsetZ = adjustTileOffsetZ(value);
    }

    @modelAction
    public setSizeX(value: number) {
        this.size.x = adjustTileSizeXY(value, this.isGround);
    }

    @modelAction
    public setSizeY(value: number) {
        this.size.y = adjustTileSizeXY(value, this.isGround);
    }

    @modelAction
    public setSizeZ(value: number) {
        this.size.z = adjustTileSizeZ(value);
    }
}

type TileAssetGroupSnapshot = SnapshotOutOf<TileAssetGroupModel>;

@model("resources/TileAssetGroupBaseAssetModel")
export class TileAssetGroupBaseDataModel extends Model({
    layer: prop<number>(0).withSetter(),
    imageAssets: prop<ImagePropertiesModel[]>(() => new Array(4))
}) {

    @modelAction
    public setImageProperties(imageProperties: ImagePropertiesModel, usage: TileImageUsage) {
        while (this.imageAssets.length <= usage) {
            this.imageAssets.push(null);
        }
        this.imageAssets[usage] = imageProperties;
    }

    public imageProperties(usage: TileImageUsage) {
        if (this.imageAssets.length <= usage) {
            return null;
        }
        return this.imageAssets[usage];
    }

    public get hasImages() {
        return this.imageAssets.some(value => value);
    }
}

interface MatchTileAssetSnapshotTypes {
    includeGroupBaseAssets?: boolean;
    includeDerived?: boolean;
    includeNonDerived?: boolean;
}

type AnyTileAssetSnapshot = TileAssetSnapshot | TileAssetGroupSnapshot;

export function matchTileAssetSnapshot(snapshot: AnyTileAssetSnapshot, types: MatchTileAssetSnapshotTypes) {
    if (isTileAssetGroupSnapshot(snapshot)) {
        return types.includeGroupBaseAssets;
    } else {
        const tileSnapshot = snapshot as (TileAssetSnapshot & { derived: boolean; });
        return (tileSnapshot.derived && types.includeDerived) || (!tileSnapshot.derived && types.includeNonDerived);
    }
}

export function isTileAssetGroupSnapshot(a: AnyTileAssetSnapshot) {
    return a.$modelType === tileAssetGroupModelType;
}
