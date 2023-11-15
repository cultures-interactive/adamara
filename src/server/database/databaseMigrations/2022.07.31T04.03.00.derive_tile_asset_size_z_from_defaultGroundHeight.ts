import { QueryInterface } from "sequelize";
import { MigrationFn } from "umzug";
import { TileLayerType } from "../../../shared/resources/TileLayerType";
import { logger } from "../../integrations/logging";
import { sequelize } from "../db";
import { TileAsset } from "../models/TileAsset";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const tileAssets = await TileAsset.findAll();
        for (const tileAsset of tileAssets) {
            const snapshot = tileAsset.snapshot;

            // Set the Z size only for
            // - ground tiles that
            // - have a defaultGroundHeight bigger than plane 0 and
            // - still have the default Z size
            if ((snapshot.layerType !== TileLayerType.Ground) ||
                (snapshot.defaultGroundHeight == null) ||
                (snapshot.defaultGroundHeight === 0) ||
                (snapshot.size.z !== 1))
                continue;

            snapshot.size.z = snapshot.defaultGroundHeight + 1;

            tileAsset.snapshot = snapshot;
            await tileAsset.save({ transaction });
        }
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    logger.warn("We can't really migrate backwards from this.");
};