import localforage from "localforage";
import { generatedImageCacheKeyPrefix } from "./sharedCacheData";

interface BlobWithVersion {
    blob: Blob;
    version: string;
}

export enum GeneratedImageType {
    AnimationAsset = 0,
    CharacterConfig = 1
}

function generatedImageCachePrefixForType(type: GeneratedImageType) {
    return `${generatedImageCacheKeyPrefix}${type}_`;
}

export function generatedImageCacheKey(id: string, type: GeneratedImageType) {
    return generatedImageCachePrefixForType(type) + id;
}

export function saveInGeneratedImageCache(id: string, type: GeneratedImageType, version: string, blob: Blob) {
    return localforage.setItem<BlobWithVersion>(generatedImageCacheKey(id, type), { blob, version });
}

export async function loadFromGeneratedImageCacheIfVersionMatchesElsePrune(id: string, type: GeneratedImageType, expectedVersion: string) {
    const cachedImageData = await localforage.getItem<BlobWithVersion>(generatedImageCacheKey(id, type));
    if (!cachedImageData)
        return null;

    if (cachedImageData.version !== expectedVersion) {
        await removeFromGeneratedImageCache(id, type);
        return null;
    }

    return cachedImageData.blob;
}

export function removeFromGeneratedImageCache(id: string, type: GeneratedImageType) {
    return localforage.removeItem(generatedImageCacheKey(id, type));
}