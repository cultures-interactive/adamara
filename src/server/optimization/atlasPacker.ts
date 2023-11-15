import { ServerState } from "../data/ServerState";
import { packAsync, PackerType, TexturePackerOptions } from "free-tex-packer-core";
import { DebugTimer } from "../helper/DebugTimer";
import { tileImageIdentificationToKey } from "../../shared/resources/TileAssetModel";
import { logger } from "../integrations/logging";
import fse from "fs-extra";
import path from "path";
import { AtlasData } from "../../shared/definitions/other/AtlasData";
import { NotFoundError } from "../helper/errors/NotFoundError";
import { tileAssetImageBatchProcessor } from "./optimizationHelpers";
import { thumbnailFolder } from "./thumbnailGenerator";

export const atlasFolder = process.env.ATLAS_FOLDER || "";
const writeAtlasFolder = atlasFolder;
const doneFilename = "delete_this_file_to_regenerate_atlases_on_start";
const doneFileExplanation = "This file was automatically created at the end of the atlas generation process. Delete it to start generating new atlases the next time the app starts.";

const atlasSize = +process.env.ATLAS_SIZE || 2048;

// minAtlasFileCountPerBatch defines how many atlasses will be *at least* filled
// (by counting pixels) by the images that are currently added to the files array,
// and the threshold is exceeded, atlas generation will happen for the current files.
// If those batches are bigger, less atlases will be generated (because more images are
// available to fill them optimally), but more RAM will be needed by the generation process.
//
// Example values from profiling for atlas size of 4096x4096 with around 8000 files
// locally on my machine:
// - No batching:    82 atlasses, 5.4 min generation time, RAM peak 9.5 GB
// - Batches of 20:  89 atlasses, 3.2 min generation time, RAM peak 6.4 GB (+7 atlasses (+9%) compared to "no batching")
// - Batches of 10:  92 atlasses, 2.8 min generation time, RAM peak 4.2 GB (+10 atlasses (+12%) compared to "no batching")
// - Batches of  5:  99 atlasses, 2.8 min generation time, RAM peak 2.5 GB (+17 atlasses (+21%) compared to "no batching")
// - Batches of  2: 120 atlasses, 2.9 min generation time, RAM peak 1.5 GB (+38 atlasses (+46%) compared to "no batching")
// - Batches of  1: 158 atlasses, 2.9 min generation time, RAM peak 1.4 GB (+76 atlasses (+92%) compared to "no batching")
//
// Values for different atlasSizes will differ and should probably be determined by
// profiling several minAtlasFileCountPerBatch values yourself to find the the most
// acceptable compromise between atlas count and necessary RAM.
const minAtlasFileCountPerBatch = +process.env.MIN_ATLAS_FILE_COUNT_PER_BATCH || 20;
const pixelCountThresholdPerBatch = atlasSize * atlasSize * minAtlasFileCountPerBatch;

const tileLoadingBatchSize = 1000;

export async function loadTileAtlasDataIntoServerState(serverState: ServerState) {
    if (!atlasFolder)
        return;

    if (!await fse.pathExists(atlasFolder)) {
        logger.info(`Couldn't find atlas path: ${atlasFolder}`);
        return;
    }

    for (const file of await fse.readdir(atlasFolder)) {
        const { ext } = path.parse(file);
        if (ext !== ".json")
            continue;

        const dataFileBuffer = await fse.readFile(path.join(atlasFolder, file));
        const dataJSONString = dataFileBuffer.toString();
        const data = JSON.parse(dataJSONString) as AtlasData;
        serverState.tileAtlasDataArray.push(data);
    }

    logger.info(`Found ${serverState.tileAtlasDataArray.length} tile atlases in ${atlasFolder}.`);
}

export async function loadTileAtlasImage(atlasImageName: string) {
    if (!atlasFolder)
        throw new NotFoundError();

    return (await fse.readFile(path.join(atlasFolder, atlasImageName))).buffer;
}

export async function shouldPackAtlas() {
    if (!atlasFolder) {
        logger.info("Not generating atlases because ATLAS_FOLDER is not set.");
        return false;
    }

    if (!thumbnailFolder) {
        logger.info("Not generating atlases because THUMBNAIL_FOLDER has to be set too.");
        return false;
    }

    const doneFilenameWithPath = path.join(atlasFolder, doneFilename);
    if (!await fse.pathExists(doneFilenameWithPath)) {
        logger.info(`Generating new atlases because the file "${doneFilenameWithPath}" doesn't exist.`);
        return true;
    }

    logger.info(`Not generating new atlases because the file "${doneFilenameWithPath}" exists. (${doneFileExplanation})`);
    return false;
}

export async function packAtlas() {
    if (!atlasFolder)
        return;

    const timer = new DebugTimer();
    timer.start();

    logger.info("Adding images for texture packing...");

    await fse.ensureDir(writeAtlasFolder);
    await fse.emptyDir(writeAtlasFolder);

    const padding = 2;
    const maxImageSize = atlasSize - padding * 2;

    const atlasBuilderConfig: TexturePackerOptions = {
        width: atlasSize,
        height: atlasSize,
        packer: "OptimalPacker" as PackerType,
        allowRotation: false,
        allowTrim: false,
        padding
    };

    const catcheBustingString = Date.now().toString();

    const files = Array<{ path: string; contents: Buffer; }>();

    let currentPixelCount = 0;
    let batchIndex = 1;

    const triggerBuild = async () => {
        await buildAtlasAndWriteToFolder(files, {
            ...atlasBuilderConfig,
            textureName: `${(batchIndex++).toString().padStart(2, "0")}_${catcheBustingString}_atlas`
        });
        currentPixelCount = 0;
        files.length = 0;
    };

    await tileAssetImageBatchProcessor(
        tileLoadingBatchSize,
        async (tileAssetId, usageIndex, version, imageProperties, imageAsset) => {
            const { width, height } = imageProperties.size;
            if ((width > maxImageSize) || (height > maxImageSize)) {
                logger.warn(`Skipping an image on ${tileAssetId} because it is too big to be packed into an atlas: ${width}x${height}`);
                return;
            }

            const imageBuffer = Buffer.from(imageAsset);
            files.push({
                path: tileImageIdentificationToKey(tileAssetId, usageIndex, version),
                contents: imageBuffer
            });

            currentPixelCount += width * height;
            if (currentPixelCount > pixelCountThresholdPerBatch) {
                await triggerBuild();
            }
        }
    );

    await triggerBuild();

    await fse.writeFile(path.join(writeAtlasFolder, doneFilename), doneFileExplanation);

    logger.info(`Finished atlas generation in ${Math.floor(timer.elapsedTimeS)}s (that's ${(timer.elapsedTimeS / 60).toFixed(1)} min)`);
}

async function buildAtlasAndWriteToFolder(files: Array<{ path: string; contents: Buffer; }>, config: TexturePackerOptions) {
    if (files.length > 0) {
        logger.info(`Starting texture packing for ${files.length} files...`);
        const atlases = await packAsync(files, config);
        await writeAtlasesToFolder(writeAtlasFolder, atlases);
        logger.info(`Done.`);
    }
}

async function writeAtlasesToFolder(folderName: string, atlases: Array<{ name: string; buffer: Buffer; }>) {
    for (const atlas of atlases) {
        await fse.writeFile(path.join(folderName, atlas.name), atlas.buffer);
    }
}
