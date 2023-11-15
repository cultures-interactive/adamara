import { getSnapshot, SnapshotOutOfObject } from "mobx-keystone";
import { QueryInterface } from "sequelize";
import { MigrationFn } from "umzug";
import { TreeEnterActionModel, TreeExitActionModel } from "../../../shared/action/ActionModel";
import { TranslatedString } from "../../../shared/game/TranslatedString";
import { logger } from "../../integrations/logging";
import { sequelize } from "../db";
import { ActionTree } from "../models/ActionTree";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const stats = {
            changedEnterActions: 0,
            changedExitActions: 0
        };

        const allActionTrees = await ActionTree.findAll();
        for (const databaseActionTree of allActionTrees) {
            const actionTreeSnapshot = databaseActionTree.getSnapshot();

            let madeChanges = false;

            for (const action of actionTreeSnapshot.nonSubTreeActions) {
                if ((action.$modelType === "actions/TreeEnterActionModel") || (action.$modelType === "actions/TreeExitActionModel")) {
                    const actionSnapshot = action as SnapshotOutOfObject<TreeEnterActionModel | TreeExitActionModel>;
                    const localizedName = new TranslatedString({});
                    const name = (actionSnapshot as any).name as string;
                    if (name !== "-") {
                        localizedName.set("de", (actionSnapshot as any).name);
                    }
                    actionSnapshot.name = getSnapshot(localizedName);
                    madeChanges = true;
                    if (action.$modelType === "actions/TreeEnterActionModel") {
                        stats.changedEnterActions++;
                    } else {
                        stats.changedExitActions++;
                    }
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