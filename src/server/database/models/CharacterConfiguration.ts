import { AutoIncrement, Column, CreatedAt, DataType, Model, PrimaryKey, Table, UpdatedAt } from "sequelize-typescript";
import { CharacterConfigurationSnapshot } from "../../../shared/resources/CharacterConfigurationModel";

@Table({
    tableName: "character_configuration"
})
export class CharacterConfiguration extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    public id: number;

    @CreatedAt
    public readonly createdAt: Date;

    @UpdatedAt
    public readonly updatedAt: Date;

    @Column(DataType.BOOLEAN)
    public deleted: boolean;

    @Column(DataType.TEXT)
    public snapshotJSONString: string;

    public get snapshot(): CharacterConfigurationSnapshot {
        return JSON.parse(this.snapshotJSONString) as CharacterConfigurationSnapshot;
    }

    public set snapshot(value: CharacterConfigurationSnapshot) {
        this.id = value.id;
        this.snapshotJSONString = JSON.stringify(value);
    }

    public static async persist(snapshot: CharacterConfigurationSnapshot): Promise<CharacterConfiguration> {
        const configuration = await CharacterConfiguration.create({
            animationAssetName: snapshot.animationAssetName,
            animationSkins: snapshot.animationSkins
        });
        snapshot.id = configuration.id;
        configuration.snapshotJSONString = JSON.stringify(snapshot);
        await configuration.save(); // using patchedSave is not necessary here because this instance is not referenced anywhere else at this time, so the fields inside could not be changed while this save() is running
        return configuration;
    }
}
