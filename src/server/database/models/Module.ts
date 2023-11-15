import { Column, CreatedAt, DataType, Model, PrimaryKey, Table, UpdatedAt } from "sequelize-typescript";
import { ModuleSnapshot } from "../../../shared/workshop/ModuleModel";

@Table({
    tableName: "module"
})
export class Module extends Model {

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

    public get snapshot(): ModuleSnapshot {
        return JSON.parse(this.snapshotJSONString) as ModuleSnapshot;
    }

    public set snapshot(value: ModuleSnapshot) {
        this.id = value.$modelId;
        this.snapshotJSONString = JSON.stringify(value);
    }

}