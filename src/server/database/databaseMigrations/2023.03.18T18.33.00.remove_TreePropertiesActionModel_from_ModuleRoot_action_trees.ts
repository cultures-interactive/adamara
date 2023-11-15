import { QueryInterface } from "sequelize";
import { MigrationFn } from "umzug";
import { ActionTreeType } from "../../../shared/action/ActionTreeModel";
import { logger } from "../../integrations/logging";
import { sequelize } from "../db";
import { ActionTree } from "../models/ActionTree";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const stats = {
            removedTreePropertiesActionModel: 0,
            didNotHaveTreePropertiesActionModel: 0
        };

        const allActionTrees = await ActionTree.findAll();
        for (const actionTree of allActionTrees) {
            const snapshot = actionTree.getSnapshot();
            if (snapshot.type !== ActionTreeType.ModuleRoot)
                continue;

            if (snapshot.nonSubTreeActions[0]?.$modelType === "actions/TreePropertiesActionModel") {
                logger.info("Removing TreePropertiesActionModel: " + snapshot.$modelId);
                snapshot.nonSubTreeActions.splice(0, 1);
                actionTree.setSnapshot(snapshot);
                await actionTree.save({ transaction });
                stats.removedTreePropertiesActionModel++;
            } else {
                logger.info("Doesn't have TreePropertiesActionModel: " + snapshot.$modelId);
                stats.didNotHaveTreePropertiesActionModel++;
            }
        }

        logger.info(`Removed TreePropertiesActionModel from all ModuleRoot subtrees.`, stats);
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
};