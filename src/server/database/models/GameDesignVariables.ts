import { Table, Model, Column, CreatedAt, UpdatedAt, DataType } from "sequelize-typescript";
import { GameDesignVariablesSnapshot } from "../../../shared/game/GameDesignVariablesModel";

@Table({
    tableName: "game_design_variables"
})
export class GameDesignVariables extends Model {
    public readonly id: number;

    @CreatedAt
    public readonly createdAt: Date;

    @UpdatedAt
    public readonly updatedAt: Date;

    @Column(DataType.TEXT)
    public snapshotJSONString: string;

    public get snapshot(): GameDesignVariablesSnapshot {
        return JSON.parse(this.snapshotJSONString);
    }

    public set snapshot(value: GameDesignVariablesSnapshot) {
        this.snapshotJSONString = JSON.stringify(value);
    }
}
