import { MigrationFn } from "umzug";
import { QueryInterface } from "sequelize";
import { sequelize } from "../db";
import { Module } from "../models/Module";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const modules = await Module.findAll({ transaction });
        for (const module of modules) {
            const snapshot = module.snapshot;
            snapshot.visibleInPublicMenu = (snapshot as any).publiclyPlayable;
            module.snapshot = snapshot;
            await module.save({ transaction });
        }
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    throw new Error("Not implemented");
};