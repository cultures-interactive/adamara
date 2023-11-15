import { Column, CreatedAt, DataType, Model, PrimaryKey, Table, UpdatedAt } from "sequelize-typescript";
import { ItemSnapshot } from "../../../shared/game/ItemModel";

@Table({
    tableName: "item"
})
export class Item extends Model {

    @PrimaryKey
    @Column(DataType.STRING)
    public id: string;

    @Column(DataType.TEXT)
    public snapshotJSONString: string;

    @CreatedAt
    public readonly createdAt: Date;

    @UpdatedAt
    public readonly updatedAt: Date;

    @Column(DataType.BOOLEAN)
    public deleted: boolean;

    public get snapshot(): ItemSnapshot {
        return JSON.parse(this.snapshotJSONString) as ItemSnapshot;
    }

    public set snapshot(value: ItemSnapshot) {
        this.id = value.id;
        this.snapshotJSONString = JSON.stringify(value);
    }

}

