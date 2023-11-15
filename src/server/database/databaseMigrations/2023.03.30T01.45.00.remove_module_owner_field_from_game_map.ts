import { MigrationFn } from "umzug";
import { DataTypes, QueryInterface } from "sequelize";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.removeColumn("game_map", "moduleOwner");
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.addColumn("game_map", "moduleOwner", {
        type: DataTypes.TEXT({ length: "tiny" }),
        allowNull: false,
        defaultValue: ""
    });
};