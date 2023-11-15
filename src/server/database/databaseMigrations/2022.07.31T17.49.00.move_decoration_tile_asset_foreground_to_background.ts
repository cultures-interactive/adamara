import { QueryInterface } from "sequelize";
import { MigrationFn } from "umzug";
import { TileImageUsage } from "../../../shared/resources/TileAssetModel";
import { TileLayerType } from "../../../shared/resources/TileLayerType";
import { logger } from "../../integrations/logging";
import { sequelize } from "../db";
import { TileAsset } from "../models/TileAsset";
import * as uuid from "uuid";

const background = " Hintergrund";
const foreground = " Vordergrund";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const affectedTileIds = new Array<string>();

        const tileAssets = await TileAsset.findAll();
        for (const tileAsset of tileAssets) {
            const snapshot = tileAsset.snapshot;

            // Only apply to decoration...
            if (snapshot.layerType !== TileLayerType.Decoration)
                continue;

            // ...with a foreground image
            if ((snapshot.imageAssets.length < TileImageUsage.Foreground) ||
                !snapshot.imageAssets[TileImageUsage.Foreground])
                continue;

            affectedTileIds.push(snapshot.id);

            snapshot.conflictResolutionOrigin = 1;

            snapshot.imageAssets[TileImageUsage.Background] = snapshot.imageAssets[TileImageUsage.Foreground];
            snapshot.imageAssets[TileImageUsage.Foreground] = null;

            tileAsset.backgroundImageData = tileAsset.foregroundImageData;
            tileAsset.backgroundImageDataVersion = uuid.v1();
            tileAsset.foregroundImageData = null;
            tileAsset.waterMaskForegroundImageDataVersion = null;

            tileAsset.snapshot = snapshot;
            await tileAsset.save({ transaction });
        }

        logger.info("Moved foreground to background for the following tile assets:");
        for (const tileAssetId of affectedTileIds) {
            logger.info(`- ${tileAssetId}`);
        }
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    logger.warn("We can't really migrate backwards from this.");
};
