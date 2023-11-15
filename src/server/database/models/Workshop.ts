import { Column, CreatedAt, DataType, Model, PrimaryKey, Table, UpdatedAt } from "sequelize-typescript";
import { WorkshopSnapshot } from "../../../shared/workshop/WorkshopModel";

@Table({
    tableName: "workshop"
})
export class Workshop extends Model {

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

    public get snapshot(): WorkshopSnapshot {
        return JSON.parse(this.snapshotJSONString) as WorkshopSnapshot;
    }

    public set snapshot(value: WorkshopSnapshot) {
        this.id = value.$modelId;
        this.snapshotJSONString = JSON.stringify(value);
    }

}