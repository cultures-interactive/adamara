import { MigrationFn } from "umzug";
import { DataTypes, QueryInterface } from "sequelize";
import { GameMap } from "../models/GameMap";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.removeColumn("game_map", "mapCode");
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.addColumn("game_map", "mapCode", {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "-"
    });

    const gameMaps = await GameMap.findAll();
    for (const gameMap of gameMaps) {
        await generateAndSaveMapCode(gameMap);
    }
};

async function generateAndSaveMapCode(gameMap: any) {
    const characters = "abcdefghjkmnopqrstuvwxyz";
    gameMap.mapCode = gameMap.id.toString();
    for (let i = 0; i < 3; i++) {
        gameMap.mapCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    await gameMap.save();
}