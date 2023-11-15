import { Table, Model, Column, CreatedAt, UpdatedAt, DataType, PrimaryKey } from "sequelize-typescript";
import { AssetVersion } from "../../../shared/definitions/socket.io/socketIODefinitions";
import { TileAssetSnapshot, TileImageUsage } from "../../../shared/resources/TileAssetModel";

@Table({
    tableName: "tile_asset"
})
export class TileAsset extends Model {
    @PrimaryKey
    @Column(DataType.STRING)
    public id: string;

    @CreatedAt
    public readonly createdAt: Date;

    @UpdatedAt
    public readonly updatedAt: Date;

    @Column(DataType.TEXT)
    public snapshotJSONString: string;

    @Column(DataType.BLOB("long"))
    public backgroundImageData: ArrayBuffer;

    @Column(DataType.UUID)
    public backgroundImageDataVersion: AssetVersion;

    @Column(DataType.BLOB("long"))
    public middleImageData: ArrayBuffer;

    @Column(DataType.UUID)
    public middleImageDataVersion: AssetVersion;

    @Column(DataType.BLOB("long"))
    public foregroundImageData: ArrayBuffer;

    @Column(DataType.UUID)
    public foregroundImageDataVersion: AssetVersion;

    @Column(DataType.BLOB("long"))
    public waterMaskForegroundImageData: ArrayBuffer;

    @Column(DataType.UUID)
    public waterMaskForegroundImageDataVersion: AssetVersion;

    @Column(DataType.BOOLEAN)
    public deleted: boolean;

    public get snapshot(): TileAssetSnapshot {
        return JSON.parse(this.snapshotJSONString) as TileAssetSnapshot;
    }

    public set snapshot(value: TileAssetSnapshot) {
        this.id = value.id;
        this.snapshotJSONString = JSON.stringify(value);
    }

    public getImageData(usage: TileImageUsage) {
        switch (usage) {
            case TileImageUsage.Background:
                return this.backgroundImageData;

            case TileImageUsage.Foreground:
                return this.foregroundImageData;

            case TileImageUsage.WaterMask:
                return this.middleImageData;

            case TileImageUsage.WaterMaskForeground:
                return this.waterMaskForegroundImageData;

            default:
                throw new Error("Not implemented: " + usage);
        }
    }

    public getImageDataVersion(usage: TileImageUsage) {
        // Set the default version from "" to "1" to invalidate all caches that
        // might be impacted by the "server restart sets all versions to empty string" bug.
        const defaultVersion = "1";

        switch (usage) {
            case TileImageUsage.Background:
                return this.backgroundImageDataVersion || defaultVersion;

            case TileImageUsage.Foreground:
                return this.foregroundImageDataVersion || defaultVersion;

            case TileImageUsage.WaterMask:
                return this.middleImageDataVersion || defaultVersion;

            case TileImageUsage.WaterMaskForeground:
                return this.waterMaskForegroundImageDataVersion || defaultVersion;

            default:
                throw new Error("Not implemented: " + usage);
        }
    }
}
