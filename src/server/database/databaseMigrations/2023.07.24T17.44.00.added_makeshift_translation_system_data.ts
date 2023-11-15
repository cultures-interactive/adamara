import { MigrationFn } from "umzug";
import { DataTypes, QueryInterface } from "sequelize";
import { MakeshiftTranslationSystemData } from "../models/MakeshiftTranslationSystemData";
import { MakeshiftTranslationSystemDataModel } from "../../../shared/translation/MakeshiftTranslationSystemDataModel";
import { getSnapshot } from "mobx-keystone";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.createTable("makeshift_translation_system_data", {
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
            type: DataTypes.TEXT("long")
        }
    });

    await MakeshiftTranslationSystemData.create({
        snapshotJSONString: JSON.stringify(getSnapshot(new MakeshiftTranslationSystemDataModel({})))
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("makeshift_translation_system_data");
};