import { MigrationFn } from "umzug";
import { DataTypes, QueryInterface } from "sequelize";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.changeColumn("tile_asset", "backgroundImageDataVersion", {
        type: DataTypes.UUID,
        allowNull: false
    });
    await queryInterface.changeColumn("tile_asset", "middleImageDataVersion", {
        type: DataTypes.UUID,
        allowNull: false
    });
    await queryInterface.changeColumn("tile_asset", "foregroundImageDataVersion", {
        type: DataTypes.UUID,
        allowNull: false
    });
    await queryInterface.changeColumn("tile_asset", "waterMaskForegroundImageDataVersion", {
        type: DataTypes.UUID,
        allowNull: false
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.changeColumn("tile_asset", "backgroundImageDataVersion", {
        type: DataTypes.INTEGER,
        allowNull: false
    });
    await queryInterface.changeColumn("tile_asset", "middleImageDataVersion", {
        type: DataTypes.INTEGER,
        allowNull: false
    });
    await queryInterface.changeColumn("tile_asset", "foregroundImageDataVersion", {
        type: DataTypes.INTEGER,
        allowNull: false
    });
    await queryInterface.changeColumn("tile_asset", "waterMaskForegroundImageDataVersion", {
        type: DataTypes.INTEGER,
        allowNull: false
    });
};
