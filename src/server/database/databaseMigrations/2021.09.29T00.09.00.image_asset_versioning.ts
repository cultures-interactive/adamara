import { MigrationFn } from "umzug";
import { DataTypes, QueryInterface } from "sequelize";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.addColumn("tile_asset", "backgroundImageDataVersion", {
        type: DataTypes.INTEGER,
        allowNull: false
    });
    await queryInterface.addColumn("tile_asset", "middleImageDataVersion", {
        type: DataTypes.INTEGER,
        allowNull: false
    });
    await queryInterface.addColumn("tile_asset", "foregroundImageDataVersion", {
        type: DataTypes.INTEGER,
        allowNull: false
    });
    await queryInterface.addColumn("tile_asset", "waterMaskForegroundImageDataVersion", {
        type: DataTypes.INTEGER,
        allowNull: false
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.removeColumn("tile_asset", "backgroundImageDataVersion");
    await queryInterface.removeColumn("tile_asset", "middleImageDataVersion");
    await queryInterface.removeColumn("tile_asset", "foregroundImageDataVersion");
    await queryInterface.removeColumn("tile_asset", "waterMaskForegroundImageDataVersion");
};