import { MigrationFn } from "umzug";
import { QueryInterface } from "sequelize";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.renameColumn("workshop", "accesscode", "id");
    await queryInterface.renameColumn("module", "accesscode", "id");
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.renameColumn("workshop", "id", "accesscode");
    await queryInterface.renameColumn("module", "id", "accesscode");
};