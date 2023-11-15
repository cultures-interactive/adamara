import { AtlasData } from "../../shared/definitions/other/AtlasData";
import { TileAssetImageVersions } from "../../shared/definitions/socket.io/socketIODefinitions";
import { ImagePropertiesModel } from "../../shared/resources/ImagePropertiesModel";
import { allTileImageUsages, TileAssetModel, TileAssetSnapshot, tileImageIdentificationToKey, TileImageUsage } from "../../shared/resources/TileAssetModel";
import { resourceGetTileAssetAtlasImage, resourceGetTileAssetImage } from "./api";
import { editorClient } from "./EditorClient";
import { featureSwitchConstants } from "../data/featureSwitchConstants";
import { getFromTileAtlasImageCache, loadFromTileImageCacheIfVersionMatchesElsePrune, pruneEverythingFromAllCachesExcept, saveInTileAtlasImageCache, saveInTileImageCache } from "../cache/TileImageCache";
import { runInAction } from "mobx";
import { fromSnapshot } from "mobx-keystone";
import { getThumbnailUrl } from "../../shared/data/routeConstants";
import { timeDurationToString } from "../helper/displayHelpers";
import { ThumbnailCatalogue } from "../../shared/definitions/other/ThumbnailCatalogue";
import { editorStore } from "../stores/EditorStore";
import { sharedStore } from "../stores/SharedStore";
import { tileImageStore } from "../stores/TileImageStore";
import { isDisconnectedOrCancelled } from "./editorClient/ClientDisconnectedError";
import { errorStore } from "../stores/ErrorStore";

interface LoadingStats {
    total: number;
    loaded: number;
    error: number;
    fromAtlas: number;
    missingFromAtlasLoadedFromCache: number;
    missingFromAtlasLoadedFromServer: number;
    atlasFromCache: number;
    atlasFromServer: number;
    alreadyLoadedAtlas: number;
    alreadyLoadedSingleImage: number;
}

interface TileImageInfo {
    id: string;
    tileImageUsage: TileImageUsage;
    expectedVersion: string;
}

type ImagePropertiesByIdMap = Map<string, ImagePropertiesModel[]>;

function tileImageKey({ id, tileImageUsage, expectedVersion }: TileImageInfo) {
    // By using the same schema as used in atlas, atlas keys can also be directly used as tileImageKeys
    return tileImageIdentificationToKey(id, tileImageUsage, expectedVersion);
}

class TileImageLoader {
    private loadedTileImages = new Set<string>();
    private loadedTileAtlasesImages = new Set<string>();

    public async allTileAssetsUpdated(tileAssetSnapshots: TileAssetSnapshot[], versions: TileAssetImageVersions, tileAtlasDataArray: AtlasData[], thumbnailCatalogue: ThumbnailCatalogue, queuedTileAssetMessages: Array<() => void>, otherNeededCacheKeys: string[]) {
        const { disconnectAbortSignal } = editorClient;

        const tileAssets = new Map(tileAssetSnapshots.map(a => [a.id, fromSnapshot<TileAssetModel>(a)]));
        const imagePropertiesArrayById = this.getAllImageProperties(tileAssets);
        const allNeededTileImages = this.getNeededImages(imagePropertiesArrayById, versions);

        this.pruneTileAtlasDataArray(tileAtlasDataArray);

        const stats: LoadingStats = {
            total: allNeededTileImages.length,
            loaded: 0,
            error: 0,
            fromAtlas: 0,
            missingFromAtlasLoadedFromCache: 0,
            missingFromAtlasLoadedFromServer: 0,
            atlasFromCache: 0,
            atlasFromServer: 0,
            alreadyLoadedAtlas: 0,
            alreadyLoadedSingleImage: 0
        };

        // Set assets as loading and set tileAssets/tileAssetGroups, so we can already see them loading
        runInAction(() => {
            for (const tileImageInfo of allNeededTileImages) {
                if (this.loadedTileImages.has(tileImageKey(tileImageInfo))) {
                    stats.alreadyLoadedSingleImage++;
                    stats.loaded++;
                } else {
                    tileImageStore.setLoading(tileImageInfo.id, tileImageInfo.tileImageUsage);
                }
            }

            this.refreshThumbnailsIfNecessary(allNeededTileImages, thumbnailCatalogue);

            sharedStore.setResources(tileAssets);
            sharedStore.setTileAssetsInitialized();
        });

        queuedTileAssetMessages.forEach(message => message());
        queuedTileAssetMessages.length = 0;

        const startingTime = Date.now();

        // Prune cache before loading from the server to make sure that the cache is as small as possible
        // and ready to receive new entries
        console.log("Pruning local cache...");
        const removedCount = await pruneEverythingFromAllCachesExcept(allNeededTileImages, tileAtlasDataArray, otherNeededCacheKeys, disconnectAbortSignal);
        if (disconnectAbortSignal.aborted)
            return;

        console.log(`Finished pruning local cache. ${removedCount} entries removed.`);

        await this.loadTileImageAssetsFromCacheOrServer(stats, allNeededTileImages, tileAtlasDataArray, thumbnailCatalogue, disconnectAbortSignal);
        if (disconnectAbortSignal.aborted)
            return;

        const loadingTimeTotalS = (Date.now() - startingTime) / 1000;
        console.log(`Tile asset images loaded in ${timeDurationToString(loadingTimeTotalS, true)}`, stats);

        sharedStore.setAllTileAssetsLoaded();
    }

    private getAllImageProperties(tileAssets: Map<string, TileAssetModel>) {
        const imagePropertiesArrayById: ImagePropertiesByIdMap = new Map();

        for (const tileAsset of tileAssets.values()) {
            if (!tileAsset.imageAssets)
                continue;

            imagePropertiesArrayById.set(tileAsset.id, tileAsset.imageAssets);
        }

        return imagePropertiesArrayById;
    }

    /*
    export function getSimultaneousRequestsFromQuery(defaultValue: number) {
        let simultaneousRequests = defaultValue;
        const query = new URLSearchParams(location.search);
        if (query.has("simultaneousRequests")) {
            simultaneousRequests = Number(query.get("simultaneousRequests"));
        }
        return simultaneousRequests;
    }
    */

    private getNeededImages(imagePropertiesArrayById: ImagePropertiesByIdMap, versions: TileAssetImageVersions) {
        const allNeededTileImages = new Array<TileImageInfo>();

        for (const id of imagePropertiesArrayById.keys()) {
            const imagePropertiesArray = imagePropertiesArrayById.get(id);
            const expectedVersionsForId = versions[id];

            for (const tileImageUsage of allTileImageUsages) {
                if ((imagePropertiesArray.length <= tileImageUsage) || !imagePropertiesArray[tileImageUsage])
                    continue;

                allNeededTileImages.push({
                    id,
                    tileImageUsage,
                    expectedVersion: expectedVersionsForId[tileImageUsage]
                });
            }
        }

        return allNeededTileImages;
    }

    private pruneTileAtlasDataArray(tileAtlasDataArray: AtlasData[]) {
        for (const atlasData of tileAtlasDataArray) {
            const frameKeys = Object.keys(atlasData.frames);
            for (const key of frameKeys) {
                if (this.loadedTileImages.has(key)) {
                    delete atlasData.frames[key];
                }
            }
        }
    }

    private async loadTileImageAssetsFromCacheOrServer(stats: LoadingStats, allNeededTileImages: TileImageInfo[], tileAtlasDataArray: AtlasData[], thumbnailCatalogue: ThumbnailCatalogue, abortSignal: AbortSignal) {
        const simultaneousRequests = 5;

        const leftTileAtlasQueue = tileAtlasDataArray.slice();
        const leftImagesQueue = allNeededTileImages.slice();

        // Load atlases in [simultaneousRequests] simultaneous worker queues
        const atlasImageLoadingPromises = new Array<Promise<void>>();
        for (let i = 0; i < simultaneousRequests; i++) {
            atlasImageLoadingPromises.push(this.atlasImageLoadingWorker(leftTileAtlasQueue, stats, thumbnailCatalogue, abortSignal));
        }

        await Promise.all(atlasImageLoadingPromises);
        if (abortSignal.aborted)
            return;

        // Load missing tile images in [simultaneousRequests] simultaneous worker queues
        const tileImageLoadingPromises = new Array<Promise<void>>();
        for (let i = 0; i < simultaneousRequests; i++) {
            tileImageLoadingPromises.push(this.tileImageLoadingWorker(leftImagesQueue, stats, thumbnailCatalogue, abortSignal));
        }

        await Promise.all(tileImageLoadingPromises);
    }

    private async atlasImageLoadingWorker(leftTileAtlasQueue: AtlasData[], stats: LoadingStats, thumbnailCatalogue: ThumbnailCatalogue, abortSignal: AbortSignal) {
        while (leftTileAtlasQueue.length > 0) {
            const atlasData = leftTileAtlasQueue.shift();
            const atlasImageFilename = atlasData.meta.image;
            const atlasFrameKeys = Object.keys(atlasData.frames);

            if (this.loadedTileAtlasesImages.has(atlasImageFilename) || (atlasFrameKeys.length === 0)) {
                stats.alreadyLoadedAtlas++;
                continue;
            }

            try {
                // Get cached image
                let blob = await getFromTileAtlasImageCache(atlasImageFilename);

                if (blob) {
                    stats.atlasFromCache++;
                } else {
                    // Get image from server
                    if (featureSwitchConstants.loadTileImagesViaGet) {
                        blob = await resourceGetTileAssetAtlasImage(atlasImageFilename, abortSignal);
                    } else {
                        const image = await editorClient.getTileAssetImageAtlasImage(atlasImageFilename);
                        blob = new Blob([image]);
                    }

                    saveInTileAtlasImageCache(atlasImageFilename, blob).catch(errorStore.addErrorFromErrorObject);
                    stats.atlasFromServer++;
                }

                if (abortSignal.aborted)
                    return;

                // Process image
                await tileImageStore.provideTileAtlasFromServer(atlasData, blob, thumbnailCatalogue);
                this.loadedTileAtlasesImages.add(atlasImageFilename);

                for (const imageInAtlas of atlasFrameKeys) {
                    this.loadedTileImages.add(imageInAtlas);
                }

                if (abortSignal.aborted)
                    return;

                const imagesInAtlas = atlasFrameKeys.length;
                stats.loaded += imagesInAtlas;
                stats.fromAtlas += imagesInAtlas;
            } catch (e) {
                if (isDisconnectedOrCancelled(e))
                    return;

                console.error(`Error loading tile atlas '${atlasImageFilename}'`);
                console.error(e);

                errorStore.addErrorFromErrorObject(new Error(`[TileImageLoader] Error while loading atlas: ${atlasImageFilename} (${e.name}: ${e.message})`));
            }

            editorStore.setTileImageLoadingPercentage(stats.loaded / stats.total);
        }
    }

    private async tileImageLoadingWorker(leftImagesQueue: TileImageInfo[], stats: LoadingStats, thumbnailCatalogue: ThumbnailCatalogue, abortSignal: AbortSignal) {
        while (leftImagesQueue.length > 0) {
            const tileImageInfo = leftImagesQueue.shift();
            const { id, tileImageUsage, expectedVersion } = tileImageInfo;

            // Already loaded by an atlas or earlier on?
            if (!tileImageStore.isLoading(id, tileImageUsage))
                continue;

            //console.log("Loading file which wasn't in atlas: " + id + " / " + TileImageUsage[tileImageUsage]);

            try {
                // Get cached image
                const cachedImageData = await loadFromTileImageCacheIfVersionMatchesElsePrune(id, tileImageUsage, expectedVersion);

                let blob: Blob;

                if (cachedImageData) {
                    blob = cachedImageData.blob;
                    stats.missingFromAtlasLoadedFromCache++;
                } else {
                    // Get image from server
                    if (featureSwitchConstants.loadTileImagesViaGet) {
                        blob = await resourceGetTileAssetImage(id, tileImageUsage, expectedVersion, abortSignal);
                    } else {
                        const imageData = await editorClient.getTileAssetImage(id, tileImageUsage);
                        if (imageData && (imageData.version === expectedVersion)) {
                            blob = new Blob([imageData.data]);
                        }
                    }

                    saveInTileImageCache(id, tileImageUsage, expectedVersion, blob).catch(errorStore.addErrorFromErrorObject);
                    //console.log("Missing from atlas loaded from server: " + id + " / " + TileImageUsage[tileImageUsage]);
                    stats.missingFromAtlasLoadedFromServer++;
                }

                if (abortSignal.aborted)
                    return;

                if (blob) {
                    // Process image
                    const thumbnailKey = tileImageIdentificationToKey(id, tileImageUsage, expectedVersion);
                    const thumbnailUrl = getThumbnailUrl(thumbnailCatalogue[thumbnailKey]);
                    await tileImageStore.provideTileAssetFromServer(id, tileImageUsage, blob, thumbnailUrl);
                    this.loadedTileImages.add(tileImageKey(tileImageInfo));
                } else {
                    console.error(`Expected an image for tile asset '${id}' with usage '${TileImageUsage[tileImageUsage]}', but the server said there was no image.`);
                    errorStore.addErrorFromErrorObject(new Error(`Expected an image for tile asset '${id}' with usage '${TileImageUsage[tileImageUsage]}', but the server said there was no image.`));
                }

                if (abortSignal.aborted)
                    return;

            } catch (e) {
                if (isDisconnectedOrCancelled(e))
                    return;

                console.error(`Error loading tile asset '${id}' with usage '${TileImageUsage[tileImageUsage]}'`);
                console.error(e);

                errorStore.addErrorFromErrorObject(new Error(`[TileImageLoader] Error while loading: tile asset '${id}' with usage '${TileImageUsage[tileImageUsage]}' (${e.name}: ${e.message})`));

                tileImageStore.setLoadingFailed(id, tileImageUsage);
                stats.error++;
            }

            stats.loaded++;
            editorStore.setTileImageLoadingPercentage(stats.loaded / stats.total);
        }
    }

    private refreshThumbnailsIfNecessary(allNeededTileImages: TileImageInfo[], thumbnailCatalogue: ThumbnailCatalogue) {
        const hasThumbnailCatalogue = Object.keys(thumbnailCatalogue).length > 0;
        if (!hasThumbnailCatalogue)
            return;

        runInAction(() => {
            for (const { id, tileImageUsage, expectedVersion } of allNeededTileImages) {
                // If the image is still loading, no need to refresh the thumbnail URL
                if (tileImageStore.isLoading(id, tileImageUsage))
                    continue;

                const thumbnailFilename = thumbnailCatalogue[tileImageIdentificationToKey(id, tileImageUsage, expectedVersion)];
                if (!thumbnailFilename)
                    continue;

                const actualThumbnailUrl = getThumbnailUrl(thumbnailFilename);

                if (tileImageStore.thumbnailUrl(id, tileImageUsage) !== actualThumbnailUrl) {
                    tileImageStore.setNewThumbnailUrl(id, tileImageUsage, actualThumbnailUrl);
                }
            }
        });
    }
}

export const tileImageLoader = new TileImageLoader();