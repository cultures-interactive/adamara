import { fromSnapshot, getSnapshot } from "mobx-keystone";
import { Table, Model, Column, CreatedAt, UpdatedAt, DataType } from "sequelize-typescript";
import { MapDataModel, MapDataSnapshot } from "../../../shared/game/MapDataModel";

@Table({
    tableName: "game_map"
})
export class GameMap extends Model {
    public readonly id: number;

    @CreatedAt
    public readonly createdAt: Date;

    @UpdatedAt
    public readonly updatedAt: Date;

    /*
    @ForeignKey(() => GameModule)
    @Column
    public gameModuleId: number;

    @BelongsTo(() => GameModule)
    public gameModule: GameModule;
    */

    @Column(DataType.TEXT({ length: "long" }))
    public snapshotJSONString: string;

    @Column(DataType.BOOLEAN)
    public deleted: boolean;

    public get snapshot(): MapDataSnapshot {
        return JSON.parse(this.snapshotJSONString);
    }

    public set snapshot(value: MapDataSnapshot) {
        this.snapshotJSONString = JSON.stringify(value);
    }

    public get snapshotData(): MapDataModel {
        return fromSnapshot<MapDataModel>(this.snapshot);
    }

    public set snapshotData(value: MapDataModel) {
        this.snapshot = getSnapshot(value);
    }
}
