import { MigrationFn } from "umzug";
import { QueryInterface } from "sequelize";
import { GameMap } from "../models/GameMap";
import { sequelize } from "../db";

interface OldMapDataSnapshot {
    name: string;
}

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const gameMaps = await GameMap.findAll();
        for (const gameMap of gameMaps) {
            const snapshot = gameMap.snapshot;
            snapshot.properties.name = (snapshot as unknown as OldMapDataSnapshot).name;
            gameMap.snapshot = snapshot;
            await gameMap.save({ transaction });
        }
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const gameMaps = await GameMap.findAll();
        for (const gameMap of gameMaps) {
            const snapshot = gameMap.snapshot;
            (snapshot as unknown as OldMapDataSnapshot).name = snapshot.properties.name;
            gameMap.snapshot = snapshot;
            await gameMap.save({ transaction });
        }
    });
};