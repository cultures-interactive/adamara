import { MigrationFn } from "umzug";
import { DataTypes, QueryInterface } from "sequelize";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.createTable("animation_asset", {
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
        skeleton: {
            type: DataTypes.BLOB("long")
        },
        atlas: {
            type: DataTypes.BLOB("medium")
        },
        image: {
            type: DataTypes.BLOB("long")
        },
        deleted: {
            type: DataTypes.BOOLEAN
        },
        snapshotJSONString: {
            type: DataTypes.TEXT()
        }
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("animation_asset");
};
