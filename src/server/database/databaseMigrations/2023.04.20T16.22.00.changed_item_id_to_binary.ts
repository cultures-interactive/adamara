import { MigrationFn } from "umzug";
import { DataTypes, QueryInterface } from "sequelize";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    // Make case-sensitive
    await queryInterface.changeColumn("item", "id", {
        type: DataTypes.STRING({
            binary: true
        })
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.changeColumn("item", "id", {
        type: DataTypes.STRING({
            binary: false
        })
    });
};
