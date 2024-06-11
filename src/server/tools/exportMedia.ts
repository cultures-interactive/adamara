import path from "path";
import { copy, ensureDir, remove, writeFile } from "fs-extra";
import { allTileImageUsages, TileImageUsage } from "../../shared/resources/TileAssetModel";
import { TileAsset } from "../database/models/TileAsset";
import { AnimationAsset } from "../database/models/AnimationAsset";
import { SOUND_FOLDER } from "../config";
import { logger } from "../integrations/logging";
import { Item } from "../database/models/Item";
import { Image } from "../database/models/Image";
import { ImageUsecase } from "../../shared/resources/ImageModel";

const exportPath = "temp/export";
const exportPathTiles = path.join(exportPath, "tiles");
const exportPathAnimations = path.join(exportPath, "animations");
const exportPathItems = path.join(exportPath, "items");
const exportPathOther = path.join(exportPath, "other");
const exportPathSounds = path.join(exportPath, "sounds");
const exportPathGameUI = path.join(exportPath, "game-ui");

const filenameSanitizer = /[^A-Za-z0-9 ]/g;

export async function exportMedia() {
    await remove(exportPathTiles);
    await ensureDir(exportPathTiles);

    logger.info("Exporting tiles...");

    for (const tileAsset of await TileAsset.findAll({ where: { deleted: false } })) {
        const { id } = tileAsset;
        for (const usage of allTileImageUsages) {
            const image = tileAsset.getImageData(usage);
            if (image) {
                const usageString = (usage === TileImageUsage.Background) ? "" : `_${TileImageUsage[usage]}`;
                const filename = path.join(exportPathTiles, `${id}${usageString}.png`);
                await writeFile(filename, image);
            }
        }
    }

    logger.info("All tiles exported");

    logger.info("Exporting animations...");

    await remove(exportPathAnimations);
    await ensureDir(exportPathAnimations);

    for (const animation of await AnimationAsset.findAll({ where: { deleted: false } })) {
        const { name } = animation;
        await writeFile(path.join(exportPathAnimations, `${name}.atlas`), animation.atlas);
        await writeFile(path.join(exportPathAnimations, `${name}.json`), animation.skeleton);
        await writeFile(path.join(exportPathAnimations, `${name}.png`), animation.image);
    }

    logger.info("All animations exported.");

    logger.info("Exporting items and other images...");

    await remove(exportPathItems);
    await ensureDir(exportPathItems);

    await remove(exportPathOther);
    await ensureDir(exportPathOther);

    const items = (await Item.findAll({ where: { deleted: false } })).map(item => item.snapshot);
    for (const image of await Image.findAll({ where: { deleted: false } })) {
        const { id, snapshot: { usecase, moduleOwner }, imageData } = image;
        if (moduleOwner)
            continue;

        if (usecase == ImageUsecase.Item) {
            const item = items.find(item => (item.itemImageId == id) && !item.moduleOwner);
            let name = "unused" + id;
            if (item != null) {
                name = item.name.text.items["en"] ?? item.name.text.items["de"] ?? item.id;
                name = name.replace(filenameSanitizer, "_");
            }
            await writeFile(path.join(exportPathItems, `${name}.png`), imageData);
        } else {
            await writeFile(path.join(exportPathOther, `${ImageUsecase[usecase]}_${id}.png`), imageData);
        }
    }

    logger.info("All items and display images exported.");

    logger.info("Copying sounds...");

    await remove(exportPathSounds);
    await copy(SOUND_FOLDER, exportPathSounds);

    logger.info("Sounds copied.");

    logger.info("Copying game UI images...");

    await remove(exportPathGameUI);
    await copy("assets/game/images", exportPathGameUI);

    logger.info("Game UI images copied.");

    logger.info("Media export finished.");
}