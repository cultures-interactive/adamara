import { MigrationFn } from "umzug";
import { DataTypes, QueryInterface } from "sequelize";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.createTable("item", {
        id: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false
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
    await queryInterface.dropTable("item");
};
