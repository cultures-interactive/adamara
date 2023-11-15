import { MigrationFn } from "umzug";
import { DataTypes, QueryInterface } from "sequelize";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.createTable("character_configuration", {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        animationAssetName: {
            type: DataTypes.STRING,
        },
        animationSkins: {
            type: DataTypes.STRING
        },
        deleted: {
            type: DataTypes.BOOLEAN
        },
        snapshotJSONString: {
            type: DataTypes.TEXT
        }
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("character_configuration");
};
