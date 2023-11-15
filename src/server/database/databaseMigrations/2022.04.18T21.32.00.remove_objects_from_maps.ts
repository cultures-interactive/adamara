import { MigrationFn } from "umzug";
import { QueryInterface } from "sequelize";
import { logger } from "../../integrations/logging";
import { GameMap } from "../models/GameMap";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    const gameMaps = await GameMap.findAll();
    for (const gameMap of gameMaps) {
        const snapshot = gameMap.snapshot;
        delete (snapshot as any).objects;
        gameMap.snapshot = snapshot;
        await gameMap.save();
    }
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    logger.warn("We can't really migrate backwards from this as the data is lost.");
};
