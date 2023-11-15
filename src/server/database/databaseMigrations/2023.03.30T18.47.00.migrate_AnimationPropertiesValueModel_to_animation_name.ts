import { MigrationFn } from "umzug";
import { QueryInterface } from "sequelize";
import { sequelize } from "../db";
import { ActionTree } from "../models/ActionTree";
import { findChildren, getSnapshot } from "mobx-keystone";
import { AnimationPropertiesValueModel } from "../../../shared/action/ValueModel";
import { AnimationAsset } from "../models/AnimationAsset";
import { logger } from "../../integrations/logging";
import { AnimationAssetSnapshot } from "../../../shared/resources/AnimationAssetModel";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await migrate("id", "name", animationSnapshot => ({
        mapFrom: animationSnapshot.id.toString(),
        mapTo: animationSnapshot.name
    }));
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await migrate("name", "id", animationSnapshot => ({
        mapTo: animationSnapshot.name,
        mapFrom: animationSnapshot.id.toString()
    }));
};

async function migrate(from: string, to: string, mapCreator: (animationSnapshot: AnimationAssetSnapshot) => { mapFrom: string; mapTo: string; }) {
    await sequelize.transaction(async transaction => {
        const stats = {
            empty: 0,
            changed: 0,
            notFound: 0
        };

        const animationSnapshots = (await AnimationAsset.findAll()).map(dbAnimationAsset => dbAnimationAsset.snapshot);
        const mapping = new Map<string, string>();
        for (const animationSnapshot of animationSnapshots) {
            const { mapFrom, mapTo } = mapCreator(animationSnapshot);
            mapping.set(mapFrom, mapTo);
        }

        const allActionTrees = await ActionTree.findAll();
        for (const databaseActionTree of allActionTrees) {
            const actionTree = databaseActionTree.getSnapshotData();

            let madeChanges = false;

            const animationPropertiesValue = findChildren<AnimationPropertiesValueModel>(actionTree, object => object instanceof AnimationPropertiesValueModel, { deep: true });
            for (const animationProperties of animationPropertiesValue) {
                const { value } = animationProperties;
                if (value) {
                    if (mapping.has(value)) {
                        const newValue = mapping.get(value);
                        logger.info(`Mapped animation ${from} ${value} to ${to} ${newValue}.`);
                        animationProperties.setValue(newValue);
                        madeChanges = true;
                        stats.changed++;
                    } else {
                        logger.error(`Didn't find animation with ${from} ${value} for AnimationPropertiesValueModel migration.`);
                        stats.notFound++;
                    }
                } else {
                    stats.empty++;
                }
            }

            if (!madeChanges)
                continue;

            databaseActionTree.setSnapshot(getSnapshot(actionTree));
            await databaseActionTree.save({ transaction });
        }

        logger.info(`AnimationPropertiesValueModel: animation ${from} -> ${to}`, stats);
    });
}