import { MigrationFn } from "umzug";
import { DataTypes, QueryInterface } from "sequelize";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.createTable("action_tree", {
        id: {
            type: DataTypes.STRING,
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
        snapshotJSONString: {
            type: DataTypes.TEXT({ length: "long" })
        },
        deleted: {
            type: DataTypes.BOOLEAN
        }
    });
    await queryInterface.createTable("game_map", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
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
        snapshotJSONString: {
            type: DataTypes.TEXT({ length: "long" })
        }
    });
    await queryInterface.createTable("tile_asset", {
        id: {
            type: DataTypes.STRING,
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
        snapshotJSONString: {
            type: DataTypes.TEXT
        },
        backgroundImageData: {
            type: DataTypes.BLOB("long")
        },
        middleImageData: {
            type: DataTypes.BLOB("long")
        },
        foregroundImageData: {
            type: DataTypes.BLOB("long")
        },
        deleted: {
            type: DataTypes.BOOLEAN
        }
    });
    await queryInterface.createTable("combat_configuration", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
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
        snapshotJSONString: {
            type: DataTypes.TEXT
        }
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("action_tree");
    await queryInterface.dropTable("game_map");
    await queryInterface.dropTable("tile_asset");
    await queryInterface.dropTable("combat_configuration");
};