import { getSnapshot } from "mobx-keystone";
import { DataTypes, QueryInterface } from "sequelize";
import { MigrationFn } from "umzug";
import { WorkshopModel } from "../../../shared/workshop/WorkshopModel";
import { ModuleModel } from "../../../shared/workshop/ModuleModel";
import { Workshop } from "../models/Workshop";
import { Module } from "../models/Module";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.createTable("workshop", {
        accesscode: {
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
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        snapshotJSONString: {
            type: DataTypes.TEXT
        }
    });

    await queryInterface.createTable("module", {
        accesscode: {
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
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        snapshotJSONString: {
            type: DataTypes.TEXT
        }
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("workshop");
    await queryInterface.dropTable("module");
};