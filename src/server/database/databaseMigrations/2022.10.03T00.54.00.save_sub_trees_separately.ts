import { SnapshotOutOfModel, SnapshotOutOfObject } from "mobx-keystone";
import { QueryInterface } from "sequelize";
import { MigrationFn } from "umzug";
import { ActionModel, TreePropertiesActionModel } from "../../../shared/action/ActionModel";
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
            newTrees: 0,
            newTreesDeleted: 0
        };

        const allActionTrees = await ActionTree.findAll();

        async function processTree(tree: SnapshotOutOfModel<ActionTreeModel>, deleted: boolean) {
            const actions = (tree as OldAndNewActionTreeModelSnapshot).actions as SnapshotOutOfObject<ActionModel[]>;
            delete (tree as OldAndNewActionTreeModelSnapshot).actions;
            tree.nonSubTreeActions = actions.filter(a => a.$modelType !== "actions/ActionTreeModel");

            const subTrees = actions.filter(a => a.$modelType === "actions/ActionTreeModel") as SnapshotOutOfObject<ActionTreeModel>[];

            for (const subTree of subTrees) {
                subTree.parentModelId = tree.$modelId;

                await processTree(subTree, deleted);

                logger.info(`- Saving ${subTree.parentModelId} => ${subTree.$modelId}:`);
                await ActionTree.create({
                    snapshotJSONString: JSON.stringify(subTree),
                    id: subTree.$modelId,
                    deleted
                }, {
                    transaction
                });

                if (deleted) {
                    stats.newTreesDeleted++;
                } else {
                    stats.newTrees++;
                }
            }
        }

        for (const actionTree of allActionTrees) {
            const snapshot = actionTree.getSnapshot();

            logger.info("Now migrating: " + snapshot.$modelId + " / " + ((snapshot as OldAndNewActionTreeModelSnapshot).actions.find(a => a.$modelType === "actions/TreePropertiesActionModel") as any)?.name);

            await processTree(snapshot, actionTree.deleted);

            actionTree.setSnapshot(snapshot);
            await actionTree.save({ transaction });
        }

        logger.info(`Successfully migrated sub trees to be saved separately.`, stats);
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const allActionTrees = await ActionTree.findAll();

        const rootActionTrees = new Array<ActionTree>();
        const allTreesById = new Map<string, SnapshotOutOfModel<ActionTreeModel>>();

        for (const actionTree of allActionTrees) {
            const snapshot = actionTree.getSnapshot();

            allTreesById.set(snapshot.$modelId, snapshot);

            if (snapshot.type == ActionTreeType.SubTree) {
                await actionTree.destroy({ transaction });
            } else {
                rootActionTrees.push(actionTree);
            }
        }

        for (const tree of allTreesById.values()) {
            (tree as OldAndNewActionTreeModelSnapshot).actions = tree.nonSubTreeActions;
        }

        for (const tree of allTreesById.values()) {
            if (!tree.parentModelId)
                continue;

            const parentTree = allTreesById.get(tree.parentModelId);
            (parentTree as OldAndNewActionTreeModelSnapshot).actions.push(tree as any);
            tree.parentModelId = null;
        }

        for (const actionTree of allActionTrees) {
            const originalSnapshot = actionTree.getSnapshot();
            const newSnapshot = allTreesById.get(originalSnapshot.$modelId);
            actionTree.setSnapshot(newSnapshot);
            await actionTree.save({ transaction });
        }
    });
};
