import { AssetVersion } from "../../shared/definitions/socket.io/socketIODefinitions";
import { ImagePropertiesSnapshot } from "../../shared/resources/ImagePropertiesModel";
import { TileImageUsage } from "../../shared/resources/TileAssetModel";
import { TileAsset } from "../database/models/TileAsset";

export async function tileAssetImageBatchProcessor(
    batchSize: number,
    process: (tileAssetId: string, usageIndex: TileImageUsage, version: AssetVersion, imageProperties: ImagePropertiesSnapshot, imageAsset: ArrayBuffer) => Promise<void>
) {
    let startIndex = 0;

    while (true) {
        const tileAssets = await TileAsset.findAll({
            offset: (startIndex++) * batchSize,
            limit: batchSize
        });

        for (const tileAsset of tileAssets.filter(tileAsset => !tileAsset.deleted)) {
            if (tileAsset.deleted)
                continue;

            const snapshot = tileAsset.snapshot;

            const imagePropertiesArray = snapshot.imageAssets;
            if (!imagePropertiesArray)
                continue;

            for (let usageIndex = 0; usageIndex < imagePropertiesArray.length; usageIndex++) {
                const imageProperties = imagePropertiesArray[usageIndex];
                if (!imageProperties)
                    continue;

                const imageAsset = tileAsset.getImageData(usageIndex);
                if (!imageAsset)
                    continue;

                const version = tileAsset.getImageDataVersion(usageIndex);

                await process(snapshot.id, usageIndex, version, imageProperties, imageAsset);
            }
        }

        if (tileAssets.length < batchSize)
            break;
    }
}