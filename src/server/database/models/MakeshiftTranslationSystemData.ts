import { Table, Model, Column, CreatedAt, UpdatedAt, DataType } from "sequelize-typescript";
import { MakeshiftTranslationSystemDataSnapshot } from "../../../shared/translation/MakeshiftTranslationSystemDataModel";

@Table({
    tableName: "makeshift_translation_system_data"
})
export class MakeshiftTranslationSystemData extends Model {
    public readonly id: number;

    @CreatedAt
    public readonly createdAt: Date;

    @UpdatedAt
    public readonly updatedAt: Date;

    @Column(DataType.TEXT)
    public snapshotJSONString: string;

    public get snapshot(): MakeshiftTranslationSystemDataSnapshot {
        return JSON.parse(this.snapshotJSONString);
    }

    public set snapshot(value: MakeshiftTranslationSystemDataSnapshot) {
        this.snapshotJSONString = JSON.stringify(value);
    }
}
