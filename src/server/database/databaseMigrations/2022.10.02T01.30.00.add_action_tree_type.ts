import { SnapshotOutOfModel, SnapshotOutOfObject } from "mobx-keystone";
import { QueryInterface } from "sequelize";
import { MigrationFn } from "umzug";
import { ActionModel } from "../../../shared/action/ActionModel";
import { ActionTreeModel, ActionTreeType } from "../../../shared/action/ActionTreeModel";
import { logger } from "../../integrations/logging";
import { sequelize } from "../db";
import { ActionTree } from "../models/ActionTree";

type OldAndNewActionTreeModelSnapshot = SnapshotOutOfModel<ActionTreeModel> & {
    actions: SnapshotOutOfObject<ActionModel[]>;
};

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const stats = {
            templates: 0,
            deletedTemplates: 0,
            mainGameRoots: 0,
            deletedMainGameRoot: 0
        };

        const allActionTrees = await ActionTree.findAll();

        for (const actionTree of allActionTrees) {
            const snapshot = actionTree.getSnapshot();

            const hasTreeProperties = (snapshot as OldAndNewActionTreeModelSnapshot).actions.some(a => a.$modelType === "actions/TreePropertiesActionModel");
            snapshot.type = hasTreeProperties
                ? ActionTreeType.TemplateRoot
                : ActionTreeType.MainGameRoot;

            if (snapshot.type === ActionTreeType.MainGameRoot) {
                if (actionTree.deleted) {
                    stats.deletedMainGameRoot++;
                } else {
                    stats.mainGameRoots++;
                }
            } else {
                if (actionTree.deleted) {
                    stats.deletedTemplates++;
                } else {
                    stats.templates++;
                }
            }

            actionTree.setSnapshot(snapshot);
            await actionTree.save({ transaction });
        }

        if (stats.mainGameRoots !== 1) {
            logger.error("Failed action tree migration to the new type system.", stats);
            throw Error(`There should have been exactly one MainGameRoot that is not deleted. Instead, there are ${stats.mainGameRoots}. Please fix this problem before trying again.`);
        }

        logger.info("Successfully migrated action trees to the type system.", stats);
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const allActionTrees = await ActionTree.findAll();

        for (const actionTree of allActionTrees) {
            const snapshot = actionTree.getSnapshot();
            delete snapshot.type;
            actionTree.setSnapshot(snapshot);
            await actionTree.save({ transaction });
        }
    });
};
