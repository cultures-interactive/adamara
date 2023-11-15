import path from "path";
import { copy, ensureDir, remove, writeFile } from "fs-extra";
import { allTileImageUsages, TileImageUsage } from "../../shared/resources/TileAssetModel";
import { TileAsset } from "../database/models/TileAsset";
import { AnimationAsset } from "../database/models/AnimationAsset";
import { SOUND_FOLDER } from "../config";
import { logger } from "../integrations/logging";

const exportPath = "temp/export";
const exportPathTiles = path.join(exportPath, "tiles");
const exportPathAnimations = path.join(exportPath, "animations");
const exportPathSounds = path.join(exportPath, "sounds");
const exportPathGameUI = path.join(exportPath, "game-ui");

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