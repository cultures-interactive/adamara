import localforage from "localforage";
import { animationCacheKeyPrefix } from "./sharedCacheData";

export interface CachedAnimationData {
    imageBuffer: ArrayBuffer;
    skeleton: ArrayBuffer;
    atlas: ArrayBuffer;
}

export function animationCacheKey(id: number) {
    return animationCacheKeyPrefix + id;
}

export function saveInAnimationCache(id: number, data: CachedAnimationData) {
    return localforage.setItem<CachedAnimationData>(animationCacheKey(id), data);
}

export async function loadFromAnimationCache(id: number) {
    return await localforage.getItem<CachedAnimationData>(animationCacheKey(id));
}

export function removeFromAnimationCache(id: number) {
    return localforage.removeItem(animationCacheKey(id));
}