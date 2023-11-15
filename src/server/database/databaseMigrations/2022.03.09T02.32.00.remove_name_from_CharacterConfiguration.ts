import { MigrationFn } from "umzug";
import { DataTypes, QueryInterface } from "sequelize";
import { CharacterConfiguration } from "../models/CharacterConfiguration";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.removeColumn("character_configuration", "name");
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.addColumn("character_configuration", "name", {
        type: DataTypes.STRING,
        allowNull: false
    });
    for (const characterConfiguration of await CharacterConfiguration.findAll()) {
        let name = (characterConfiguration.snapshot as any).name as string;
        if (characterConfiguration.deleted) {
            name += ".deleted" + characterConfiguration.id;
        }
        await queryInterface.update(characterConfiguration, "character_configuration", {
            "name": name
        }, {
            id: characterConfiguration.id
        });
    }
    await queryInterface.changeColumn("character_configuration", "name", {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    });
};
