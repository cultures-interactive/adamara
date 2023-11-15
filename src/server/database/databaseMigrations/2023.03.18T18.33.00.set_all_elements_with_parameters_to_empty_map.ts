import { findChildren, getSnapshot } from "mobx-keystone";
import { QueryInterface } from "sequelize";
import { MigrationFn } from "umzug";
import { AnimationElementReferenceModel, MapElementReferenceModel } from "../../../shared/action/MapElementReferenceModel";
import { logger } from "../../integrations/logging";
import { sequelize } from "../db";
import { ActionTree } from "../models/ActionTree";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const stats = {
            changedMapElementReferences: 0,
        };

        const allActionTrees = await ActionTree.findAll();
        for (const databaseActionTree of allActionTrees) {
            const actionTree = databaseActionTree.getSnapshotData();

            let madeChanges = false;

            const mapElementReferences = findChildren<MapElementReferenceModel>(actionTree, object => object instanceof MapElementReferenceModel, { deep: true });
            for (const reference of mapElementReferences) {
                if (reference.isMapSet() && reference.isTreeParameter()) {
                    reference.setMapId(0);
                    madeChanges = true;
                    stats.changedMapElementReferences++;
                }
            }

            const animationElementReferences = findChildren<AnimationElementReferenceModel>(actionTree, object => object instanceof AnimationElementReferenceModel, { deep: true });
            for (const reference of animationElementReferences) {
                if (reference.isMapSet() && reference.isTreeParameter()) {
                    reference.setMapId(0);
                    madeChanges = true;
                    stats.changedMapElementReferences++;
                }
            }

            if (!madeChanges)
                continue;

            databaseActionTree.setSnapshot(getSnapshot(actionTree));
            await databaseActionTree.save({ transaction });
        }

        logger.info(`Set all MapElementReferenceModel/AnimationElementReferenceModel that contain a tree parameter to mapId = 0.`, stats);
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
};