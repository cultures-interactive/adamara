import { MigrationFn } from "umzug";
import { QueryInterface } from "sequelize";
import { sequelize } from "../db";
import { TileAsset } from "../models/TileAsset";
import { replaceAll } from "../../../shared/helper/generalHelpers";
import { fromSnapshot, getSnapshot } from "mobx-keystone";
import { TileAssetModel } from "../../../shared/resources/TileAssetModel";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const tileAssets = await TileAsset.findAll();
        for (const tileAsset of tileAssets) {
            const data = fromSnapshot<TileAssetModel>(tileAsset.snapshot);

            data.localizedName.set("de", replaceAll(data.id, "_", " "));

            tileAsset.snapshot = getSnapshot(data);
            await tileAsset.save({ transaction });
        }
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const tileAssets = await TileAsset.findAll();
        for (const tileAsset of tileAssets) {
            const snapshot = tileAsset.snapshot;

            delete snapshot.localizedName;

            tileAsset.snapshot = snapshot;
            await tileAsset.save({ transaction });
        }
    });
};
