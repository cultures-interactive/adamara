import { MigrationFn } from "umzug";
import { QueryInterface } from "sequelize";
import { sequelize } from "../db";
import { Workshop } from "../models/Workshop";
import { Module } from "../models/Module";
import { logger } from "../../integrations/logging";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const workshops = await Workshop.findAll();
        for (const workshop of workshops) {
            workshop.deleted = true;
            await workshop.save({ transaction });
        }
    });

    await sequelize.transaction(async transaction => {
        const modules = await Module.findAll();
        for (const module of modules) {
            module.deleted = true;
            await module.save({ transaction });
        }
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    logger.warn("We can't really migrate backwards from this as the data is lost.");
};