import { fromSnapshot } from "mobx-keystone";
import { Table, Model, Column, CreatedAt, UpdatedAt, DataType, PrimaryKey } from "sequelize-typescript";
import { ActionTreeModel, ActionTreeSnapshot } from "../../../shared/action/ActionTreeModel";

@Table({
    tableName: "action_tree"
})
export class ActionTree extends Model {

    @PrimaryKey
    @Column(DataType.STRING)
    public id: string;

    @CreatedAt
    public readonly createdAt: Date;

    @UpdatedAt
    public readonly updatedAt: Date;

    @Column(DataType.TEXT({ length: "long" }))
    public snapshotJSONString: string;

    @Column(DataType.BOOLEAN)
    public deleted: boolean;

    public getSnapshot(): ActionTreeSnapshot {
        return JSON.parse(this.snapshotJSONString);
    }

    public setSnapshot(value: ActionTreeSnapshot) {
        this.snapshotJSONString = JSON.stringify(value);
    }

    public getSnapshotData(): ActionTreeModel {
        return fromSnapshot<ActionTreeModel>(this.getSnapshot());
    }
}
