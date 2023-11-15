import { fromSnapshot, getSnapshot } from "mobx-keystone";
import { Column, CreatedAt, DataType, PrimaryKey, Table, UpdatedAt, Model, AutoIncrement } from "sequelize-typescript";
import { ImageModel, ImageSnapshot } from "../../../shared/resources/ImageModel";


@Table({
    tableName: "image"
})
export class Image extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    public id: number;

    @CreatedAt
    public readonly createdAt: Date;

    @UpdatedAt
    public readonly updatedAt: Date;

    @Column(DataType.BLOB("long"))
    public imageData: ArrayBuffer;

    @Column(DataType.BOOLEAN)
    public deleted: boolean;

    @Column(DataType.TEXT)
    public snapshotJSONString: string;

    public get snapshot(): ImageSnapshot {
        return JSON.parse(this.snapshotJSONString) as ImageSnapshot;
    }

    public set snapshot(value: ImageSnapshot) {
        this.id = value.id;
        this.snapshotJSONString = JSON.stringify(value);
    }

    public static async persist(snapshot: ImageSnapshot, imageData: ArrayBuffer): Promise<Image> {
        const image = await Image.create({
            imageData: imageData,
            deleted: false
        });
        // workaround to apply the auto generated id to the snapshot.
        snapshot.id = image.id;
        image.snapshotJSONString = JSON.stringify(snapshot);
        await image.save(); // using patchedSave is not necessary here because this instance is not referenced anywhere else at this time, so the fields inside could not be changed while this save() is running
        return image;
    }
}