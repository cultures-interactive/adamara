import localforage from "localforage";
import { AtlasData } from "../../shared/definitions/other/AtlasData";
import { AssetVersion } from "../../shared/definitions/socket.io/socketIODefinitions";
import { keyToTileImageIdentification, TileImageUsage } from "../../shared/resources/TileAssetModel";
import { featureSwitchConstants } from "../data/featureSwitchConstants";
import { tileImageCacheKeyPrefix } from "./sharedCacheData";

const { useCache } = featureSwitchConstants;

/* ---------------------- */
/* -- Tile Image Cache -- */
/* ---------------------- */

interface BlobWithVersion {
    blob: Blob;
    version: AssetVersion;
}

interface TileImageIdentifier {
    id: string;
    tileImageUsage: TileImageUsage;
}

export function tileImageCacheKey(id: string, tileImageUsage: TileImageUsage) {
    return `${tileImageCacheKeyPrefix}${id}_${tileImageUsage}`;
}

export function saveInTileImageCache(id: string, tileImageUsage: TileImageUsage, version: AssetVersion, blob: Blob) {
    if (!useCache)
        return Promise.resolve();

    return localforage.setItem<BlobWithVersion>(tileImageCacheKey(id, tileImageUsage), { blob, version });
}

export async function loadFromTileImageCacheIfVersionMatchesElsePrune(id: string, tileImageUsage: TileImageUsage, expectedVersion: AssetVersion) {
    if (!useCache)
        return null;

    const cachedImageData = await localforage.getItem<BlobWithVersion>(tileImageCacheKey(id, tileImageUsage));
    if (cachedImageData && (cachedImageData.version !== expectedVersion)) {
        //console.log(`[Cache] Removed: ${id}:${tileImageUsage} (expected version ${expectedVersion}, but cached was ${cachedImageData.version})`);
        await removeFromTileImageCache(id, tileImageUsage);
        return null;
    }

    return cachedImageData;
}

export function removeFromTileImageCache(id: string, tileImageUsage: TileImageUsage) {
    if (!useCache)
        return Promise.resolve();

    return localforage.removeItem(tileImageCacheKey(id, tileImageUsage));
}

/* ---------------------------- */
/* -- Tile Atlas Image Cache -- */
/* ---------------------------- */

export function tileAtlasImageCacheKey(atlasImageFilename: string) {
    return tileAtlasImageCacheKey + atlasImageFilename;
}

export function saveInTileAtlasImageCache(atlasImageFilename: string, blob: Blob) {
    if (!useCache)
        return Promise.resolve();

    return localforage.setItem<Blob>(tileAtlasImageCacheKey(atlasImageFilename), blob);
}

export function getFromTileAtlasImageCache(atlasImageFilename: string) {
    if (!useCache)
        return null;

    return localforage.getItem<Blob>(tileAtlasImageCacheKey(atlasImageFilename));
}

/* ------------ */
/* -- Shared -- */
/* ------------ */

export async function pruneEverythingFromAllCachesExcept(neededTileImagesNotInAtlasses: TileImageIdentifier[], tileAtlasDataArray: AtlasData[], otherNeededKeys: string[], abortSignal: AbortSignal) {
    let removedCount = 0;

    if (!useCache)
        return Promise.resolve(removedCount);

    const tileImagesInAtlasses = new Set(
        tileAtlasDataArray
            .map(atlas => Object.keys(atlas.frames))
            .flat()
            .map(frameId => keyToTileImageIdentification(frameId))
            .map(tileImageIdentification => tileImageCacheKey(tileImageIdentification.id, tileImageIdentification.tileImageUsage))
    );
    const currentTileAtlasNames = tileAtlasDataArray.map(atlas => atlas.meta.image);

    const neededCacheKeys = new Set<string>(otherNeededKeys);

    for (const neededTileImage of neededTileImagesNotInAtlasses) {
        const cacheKey = tileImageCacheKey(neededTileImage.id, neededTileImage.tileImageUsage);
        if (tileImagesInAtlasses.has(cacheKey))
            continue;

        neededCacheKeys.add(cacheKey);
    }

    for (const neededAtlas of currentTileAtlasNames) {
        neededCacheKeys.add(tileAtlasImageCacheKey(neededAtlas));
    }

    const allCachedKeys = await localforage.keys();

    if (abortSignal.aborted)
        return Promise.resolve(removedCount);

    for (const cachedKey of allCachedKeys) {
        if (neededCacheKeys.has(cachedKey))
            continue;

        removedCount++;
    }

    const clearThreshold = 2000;
    if (removedCount > clearThreshold) {
        console.log(`Completely clearing cache because over ${clearThreshold} entries are obsolete.`);
        removedCount = allCachedKeys.length;
        await localforage.clear();
    } else {
        const promises = Array<Promise<void>>();
        for (const cachedKey of allCachedKeys) {
            if (neededCacheKeys.has(cachedKey))
                continue;

            //console.log(`[Cache] Removed: ${cachedKey} because it is not needed anymore.`);
            promises.push(localforage.removeItem(cachedKey));
        }

        await Promise.all(promises);
    }

    return removedCount;
}
