import { MigrationFn } from "umzug";
import { DataTypes, QueryInterface } from "sequelize";
import { GameMap } from "../models/GameMap";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.addColumn("game_map", "mapCode", {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "-"
    });

    const gameMaps = await GameMap.findAll();
    for (const gameMap of gameMaps) {
        await (gameMap as any).generateAndSaveMapCode();
    }
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.removeColumn("game_map", "mapCode");
};