import { getSnapshot } from "mobx-keystone";
import { DataTypes, QueryInterface } from "sequelize";
import { MigrationFn } from "umzug";
import { GameDesignVariablesModel } from "../../../shared/game/GameDesignVariablesModel";
import { logger } from "../../integrations/logging";
import { GameDesignVariables } from "../models/GameDesignVariables";


export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.createTable("game_design_variables", {
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
    await GameDesignVariables.create({
        snapshotJSONString: JSON.stringify(getSnapshot(new GameDesignVariablesModel({})))
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("game_design_variables");
};