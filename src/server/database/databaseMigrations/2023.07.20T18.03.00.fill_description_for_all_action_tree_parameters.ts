import { findChildren, getSnapshot, SnapshotOutOfModel, SnapshotOutOfObject } from "mobx-keystone";
import { QueryInterface } from "sequelize";
import { MigrationFn } from "umzug";
import { TreeParamterActionModel, TreePropertiesActionModel } from "../../../shared/action/ActionModel";
import { AnimationElementReferenceModel, MapElementReferenceModel } from "../../../shared/action/MapElementReferenceModel";
import { TranslatedString } from "../../../shared/game/TranslatedString";
import { logger } from "../../integrations/logging";
import { sequelize } from "../db";
import { ActionTree } from "../models/ActionTree";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const stats = {
            descriptionChanged: 0,
            descriptionAlreadySet: 0
        };

        const allActionTrees = await ActionTree.findAll();
        for (const databaseActionTree of allActionTrees) {
            const actionTree = databaseActionTree.getSnapshotData();

            let madeChanges = false;

            for (const action of actionTree.nonSubTreeActions) {
                if (action instanceof TreeParamterActionModel) {
                    if (action.description.isLanguageEmpty("de")) {
                        action.description.set("de", action.name);
                        madeChanges = true;
                        stats.descriptionChanged++;
                    } else {
                        stats.descriptionAlreadySet++;
                    }
                }
            }

            if (!madeChanges)
                continue;

            databaseActionTree.setSnapshot(getSnapshot(actionTree));
            await databaseActionTree.save({ transaction });
        }

        logger.info(`Migrated all action trees.`, stats);
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    throw new Error("Not implemented");
};