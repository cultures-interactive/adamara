import { Table, Model, Column, CreatedAt, UpdatedAt, DataType } from "sequelize-typescript";
import { CombatConfigurationSnaphot } from "../../../shared/combat/CombatConfigurationModel";

@Table({
    tableName: "combat_configuration"
})
export class CombatConfiguration extends Model {
    public readonly id: number;

    @CreatedAt
    public readonly createdAt: Date;

    @UpdatedAt
    public readonly updatedAt: Date;

    @Column(DataType.TEXT)
    public snapshotJSONString: string;

    public get snapshot(): CombatConfigurationSnaphot {
        return JSON.parse(this.snapshotJSONString);
    }

    public set snapshot(value: CombatConfigurationSnaphot) {
        this.snapshotJSONString = JSON.stringify(value);
    }
}
