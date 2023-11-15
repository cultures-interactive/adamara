import { ServerState } from "../data/ServerState";
import { DebugTimer } from "../helper/DebugTimer";
import { tileImageIdentificationToKey, TileImageUsage } from "../../shared/resources/TileAssetModel";
import { logger } from "../integrations/logging";
import fse from "fs-extra";
import path from "path";
import Jimp from 'jimp';
import { ThumbnailCatalogue } from "../../shared/definitions/other/ThumbnailCatalogue";
import { tileAssetImageBatchProcessor } from "./optimizationHelpers";
import { sendToSentryAndLogger } from "../integrations/errorReporting";
import { dataConstants } from "../../shared/data/dataConstants";

export const thumbnailFolder = process.env.THUMBNAIL_FOLDER || "";

const thumbnailCatalogueFilename = path.join(thumbnailFolder, "thumbnails.json");

const tileLoadingBatchSize = 5000;

export async function loadThumbnailDataIntoServerState(serverState: ServerState) {
    if (!thumbnailFolder)
        return;

    if (!await fse.pathExists(thumbnailFolder)) {
        logger.info(`Couldn't find thumbnail path: ${thumbnailFolder}`);
        return;
    }

    serverState.thumbnailCatalogue = await fse.readJSON(thumbnailCatalogueFilename);

    logger.info(`Found ${Object.keys(serverState.thumbnailCatalogue).length} thumbnails in ${thumbnailFolder}.`);
}

export async function createThumbnails() {
    if (!thumbnailFolder) {
        logger.info("Not generating thumbnails because THUMBNAIL_FOLDER is not set.");
        return;
    }

    const timer = new DebugTimer();
    timer.start();

    logger.info("Generating thumbnails...");

    await fse.ensureDir(thumbnailFolder);

    const catcheBustingString = Date.now().toString();

    let thumbnailCatalogue: ThumbnailCatalogue = {};

    if (await fse.pathExists(thumbnailCatalogueFilename)) {
        thumbnailCatalogue = await fse.readJSON(thumbnailCatalogueFilename);
    }

    const existingUntouchedKeys = new Set(Object.keys(thumbnailCatalogue));

    let thumbnailIndex = 1;

    let newThumbnailCount = 0;
    let deletedThumbnailCount = 0;
    let failedThumbnailCount = 0;

    await tileAssetImageBatchProcessor(
        tileLoadingBatchSize,
        async (tileAssetId, usageIndex, version, imageProperties, imageAsset) => {
            if (((usageIndex === TileImageUsage.Background) || (usageIndex === TileImageUsage.Foreground))) {
                const key = tileImageIdentificationToKey(tileAssetId, usageIndex, version);
                if (existingUntouchedKeys.has(key)) {
                    existingUntouchedKeys.delete(key);
                    return;
                }

                const filename = await createThumbnail(
                    thumbnailIndex++,
                    tileAssetId,
                    usageIndex,
                    Buffer.from(imageAsset),
                    catcheBustingString
                );

                if (filename) {
                    thumbnailCatalogue[key] = filename;
                    newThumbnailCount++;
                } else {
                    failedThumbnailCount++;
                }
            }
        }
    );

    for (const key of existingUntouchedKeys) {
        const filename = thumbnailCatalogue[key];
        delete thumbnailCatalogue[key];

        try {
            await fse.unlink(path.join(thumbnailFolder, filename));
        } catch (e) {
            sendToSentryAndLogger(e);
        }

        deletedThumbnailCount++;
    }

    await writeThumbnailCatalogueToFile(thumbnailCatalogue);

    logger.info(`Finished thumbnail generation in ${Math.floor(timer.elapsedTimeS)}s (that's ${(timer.elapsedTimeS / 60).toFixed(1)} min). Created ${newThumbnailCount}, deleted ${deletedThumbnailCount}.`);

    if (failedThumbnailCount > 0) {
        logger.error(`Generation failed for ${failedThumbnailCount} thumbnails.`);
    }
}

const filenameSanitizer = /[^A-Za-z0-9]/g;

const targetSizeWidth = dataConstants.thumbnailSize.width;
const targetSizeHeight = dataConstants.thumbnailSize.height;

async function createThumbnail(thumbnailIndex: number, tileAssetId: string, usage: TileImageUsage, image: Buffer, cacheBustingPostfix: string) {
    const filename = `${tileAssetId}_${usage}_${thumbnailIndex++}_${cacheBustingPostfix}`.replace(filenameSanitizer, "_") + ".png";

    try {
        const jimpImage = await Jimp.read(image);
        cropTransparentBorder(jimpImage);
        jimpImage.scaleToFit(targetSizeWidth, targetSizeHeight);
        await jimpImage.writeAsync(path.join(thumbnailFolder, filename));
    } catch (e) {
        logger.error(`Thumbnail generation failed for ${filename}:`);
        sendToSentryAndLogger(e);
        return null;
    }

    return filename;
}

async function writeThumbnailCatalogueToFile(thumbnailCatalogue: ThumbnailCatalogue) {
    await fse.writeJSON(thumbnailCatalogueFilename, thumbnailCatalogue);
}

function cropTransparentBorder(jimpImage: Jimp) {
    const width = jimpImage.getWidth();
    const height = jimpImage.getHeight();

    let left = 0;
    let right = width - 1;
    let top = 0;
    let bottom = height - 1;

    while (left < right) {
        if (!isAreaFullyTransparent(jimpImage, left, left, 0, height - 1))
            break;

        left++;
    }

    if (left === right)
        return;

    while (top < bottom) {
        if (!isAreaFullyTransparent(jimpImage, 0, width - 1, top, top))
            break;

        top++;
    }

    if (top === bottom)
        return;

    while (right > left) {
        if (!isAreaFullyTransparent(jimpImage, right, right, 0, height - 1))
            break;

        right--;
    }

    while (bottom > top) {
        if (!isAreaFullyTransparent(jimpImage, 0, width - 1, bottom, bottom))
            break;

        bottom--;
    }

    jimpImage.crop(left, top, right - left + 1, bottom - top + 1);
}

function isAreaFullyTransparent(jimpImage: Jimp, xFrom: number, xTo: number, yFrom: number, yTo: number) {
    for (let x = xFrom; x <= xTo; x++) {
        for (let y = yFrom; y <= yTo; y++) {
            const color = jimpImage.getPixelColor(x, y);
            const rgba = Jimp.intToRGBA(color);
            if (rgba.a !== 0)
                return false;
        }
    }

    return true;
}