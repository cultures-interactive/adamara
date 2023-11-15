import { AutoIncrement, Column, CreatedAt, DataType, Model, PrimaryKey, Table, Unique, UpdatedAt } from "sequelize-typescript";
import { TextDecoder } from "util";
import { AnimationAssetSnapshot } from "../../../shared/resources/AnimationAssetModel";

const textDecoder = new TextDecoder("utf-8");

@Table({
    tableName: "animation_asset"
})
export class AnimationAsset extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    public id: number;

    @Unique
    @Column(DataType.STRING)
    public name: string;

    @CreatedAt
    public readonly createdAt: Date;

    @UpdatedAt
    public readonly updatedAt: Date;

    @Column(DataType.BLOB("long"))
    public skeleton: ArrayBuffer; // the .json file that contains the bone, skin, interpolation etc. values

    @Column(DataType.BLOB("medium"))
    public atlas: ArrayBuffer; // the .asset file that contains the configuration for the atlas

    @Column(DataType.BLOB("long"))
    public image: ArrayBuffer; // the .png file that contains the image data

    @Column(DataType.BOOLEAN)
    public deleted: boolean;

    @Column(DataType.TEXT)
    public snapshotJSONString: string;

    public get snapshot(): AnimationAssetSnapshot {
        return JSON.parse(this.snapshotJSONString) as AnimationAssetSnapshot;
    }

    public set snapshot(value: AnimationAssetSnapshot) {
        this.snapshotJSONString = JSON.stringify(value);
    }

    public static async persist(snapshot: AnimationAssetSnapshot, skeletonData: ArrayBuffer, imageData: ArrayBuffer,
        atlasData: ArrayBuffer): Promise<AnimationAsset> {
        snapshot.animationNames = this.getAnimationsFromSkeletonData(skeletonData);
        const animationAsset = await AnimationAsset.create({
            name: snapshot.name,
            atlas: atlasData,
            skeleton: skeletonData,
            image: imageData,
            deleted: false
        });
        // workaround to apply the auto generated id to the snapshot.
        snapshot.id = animationAsset.id;
        snapshot.createdAt = animationAsset.createdAt;
        animationAsset.snapshotJSONString = JSON.stringify(snapshot);
        await animationAsset.save(); // using patchedSave is not necessary here because this instance is not referenced anywhere else at this time, so the fields inside could not be changed while this save() is running
        return animationAsset;
    }

    public static getAnimationsFromSkeletonData(skeletonDataArrayBuffer: ArrayBuffer) {
        const skeletonData = JSON.parse(textDecoder.decode(skeletonDataArrayBuffer));
        return Object.keys(skeletonData.animations);
    }
}

