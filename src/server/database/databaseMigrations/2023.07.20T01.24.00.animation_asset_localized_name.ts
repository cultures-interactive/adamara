import { MigrationFn } from "umzug";
import { QueryInterface } from "sequelize";
import { sequelize } from "../db";
import { TileAsset } from "../models/TileAsset";
import { replaceAll } from "../../../shared/helper/generalHelpers";
import { fromSnapshot, getSnapshot } from "mobx-keystone";
import { TileAssetModel } from "../../../shared/resources/TileAssetModel";
import { AnimationAsset } from "../models/AnimationAsset";
import { AnimationAssetModel } from "../../../shared/resources/AnimationAssetModel";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const animationAssets = await AnimationAsset.findAll();
        for (const animationAsset of animationAssets) {
            const data = fromSnapshot<AnimationAssetModel>(animationAsset.snapshot);

            data.localizedName.set("de", replaceAll(data.name, "_", " "));

            animationAsset.snapshot = getSnapshot(data);
            await animationAsset.save({ transaction });
        }
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const animationAssets = await AnimationAsset.findAll();
        for (const animationAsset of animationAssets) {
            const data = fromSnapshot<AnimationAssetModel>(animationAsset.snapshot);

            delete data.localizedName;

            animationAsset.snapshot = getSnapshot(data);
            await animationAsset.save({ transaction });
        }
    });
};
