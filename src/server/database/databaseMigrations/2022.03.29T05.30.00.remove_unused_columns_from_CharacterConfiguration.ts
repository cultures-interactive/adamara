import { MigrationFn } from "umzug";
import { DataTypes, QueryInterface } from "sequelize";
import { CharacterConfiguration } from "../models/CharacterConfiguration";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.removeColumn("character_configuration", "animationAssetName");
    await queryInterface.removeColumn("character_configuration", "animationSkins");
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.addColumn("character_configuration", "animationAssetName", {
        type: DataTypes.STRING,
    });
    await queryInterface.addColumn("character_configuration", "animationSkins", {
        type: DataTypes.STRING,
    });

    for (const characterConfiguration of await CharacterConfiguration.findAll()) {
        const { animationAssetName, animationSkins } = characterConfiguration.snapshot;
        await queryInterface.update(characterConfiguration, "character_configuration", {
            "animationAssetName": animationAssetName,
            "animationSkins": animationSkins
        }, {
            id: characterConfiguration.id
        });
    }
};
