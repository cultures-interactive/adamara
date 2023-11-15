import { arrayActions, fromSnapshot, getSnapshot } from "mobx-keystone";
import { QueryInterface } from "sequelize";
import { MigrationFn } from "umzug";
import { isTileAssetGroupSnapshot } from "../../../shared/legacy/TileAssetGroupModel";
import { Direction } from "../../../shared/resources/DirectionHelper";
import { TileAssetModel } from "../../../shared/resources/TileAssetModel";
import { sequelize } from "../db";
import { TileAsset } from "../models/TileAsset";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const tileAssets = await TileAsset.findAll();
        for (const tileAsset of tileAssets) {
            const snapshot = tileAsset.snapshot;
            if (isTileAssetGroupSnapshot(snapshot))
                continue;

            const tileAssetInstance = fromSnapshot<TileAssetModel>(snapshot);
            tileAssetInstance.resizeBlockedTilesIfNecessary();
            const oldBlocked = (snapshot as any).blocked as Direction[];
            if (oldBlocked) {
                arrayActions.set(tileAssetInstance.blockedTiles[0], 0, oldBlocked);
            }

            tileAsset.snapshot = getSnapshot(tileAssetInstance);
            await tileAsset.save({ transaction });
        }
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const tileAssets = await TileAsset.findAll();
        for (const tileAsset of tileAssets) {
            const snapshot = tileAsset.snapshot;
            if (isTileAssetGroupSnapshot(snapshot))
                continue;

            (snapshot as any).blocked = (snapshot as any).blockedTiles[0][0];

            tileAsset.snapshot = snapshot;
            await tileAsset.save({ transaction });
        }
    });
};