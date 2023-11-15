import { getSnapshot, SnapshotOutOfObject } from "mobx-keystone";
import { QueryInterface } from "sequelize";
import { MigrationFn } from "umzug";
import { TreePropertiesActionModel } from "../../../shared/action/ActionModel";
import { TranslatedString } from "../../../shared/game/TranslatedString";
import { logger } from "../../integrations/logging";
import { sequelize } from "../db";
import { ActionTree } from "../models/ActionTree";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const stats = {
            changedTreePropertiesActionModel: 0
        };

        const allActionTrees = await ActionTree.findAll();
        for (const databaseActionTree of allActionTrees) {
            const actionTreeSnapshot = databaseActionTree.getSnapshot();

            let madeChanges = false;

            for (const action of actionTreeSnapshot.nonSubTreeActions) {
                if (action.$modelType === "actions/TreePropertiesActionModel") {
                    const treePropertiesActionSnapshot = action as SnapshotOutOfObject<TreePropertiesActionModel>;
                    const localizedName = new TranslatedString({});
                    localizedName.set("de", (treePropertiesActionSnapshot as any).name);
                    treePropertiesActionSnapshot.localizedName = getSnapshot(localizedName);
                    madeChanges = true;
                    stats.changedTreePropertiesActionModel++;
                }
            }

            if (!madeChanges)
                continue;

            databaseActionTree.setSnapshot(actionTreeSnapshot);
            await databaseActionTree.save({ transaction });
        }

        logger.info(`Migrated all action trees.`, stats);
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    throw new Error("Not implemented");
};