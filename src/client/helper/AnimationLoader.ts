import { TextureAtlas, SkeletonData, Spine, AtlasAttachmentLoader, SkeletonJson, Skin } from '@pixi-spine/all-4.1';
import { editorClient } from "../communication/EditorClient";
import { AnimationAssetModel } from "../../shared/resources/AnimationAssetModel";
import { BaseTexture, Texture } from "pixi.js";
import { createTextureFromBuffer, hexToColor } from "./pixiHelpers";
import { fromSnapshot } from "mobx-keystone";
import { AnimationSkinCombinator } from "../canvas/shared/animation/AnimationSkinCombinator";
import { CharacterConfigurationModel } from "../../shared/resources/CharacterConfigurationModel";
import { dataConstants } from "../../shared/data/dataConstants";
import { applyAnimationTransition, setSkinTint } from "../canvas/game/character/characterAnimationHelper";
import { TranslatedError } from '../../shared/definitions/errors/TranslatedError';
import { gameStore } from '../stores/GameStore';
import { sharedStore } from '../stores/SharedStore';
import { resourceAnimationAtlasBuffer, resourceAnimationImageBuffer, resourceAnimationSkeletonBuffer } from '../communication/api';
import { loadFromAnimationCache, saveInAnimationCache } from '../cache/AnimationCache';
import { errorStore } from '../stores/ErrorStore';

export enum LocalCacheLoadingResult {
    AlreadyLoaded,
    LoadedFromCache,
    NotFoundInCache
}

interface CachedAnimationData {
    texture: Texture;
    skeletonDataText: string;
    atlasDataText: string;
    skins: Skin[];
}

export class AnimationLoader {

    private readonly textDecoder = new TextDecoder("utf-8");

    private readonly animationDataPromiseCache = new Map<number, Promise<CachedAnimationData>>();
    private readonly skeletonDataPromiseCache = new Map<number, Promise<SkeletonData>>();

    /**
     * Loads the {@link AnimationAssetModel} of the assigned id and creates a {@link Spine}
     * object from it. Returns the spine via the assigned callback.
     * Uses a data cache to avoid unnecessary loadings.
     * @param animationId The animation to load.
     * @param scale The scale of the whole animation.
     * @param initialSkins Optional array of skin names that should be applied.
     */
    public async loadSpine(animationId: number, initialSkins?: string[]): Promise<Spine> {
        const skeletonData = await this.getSpineSkeletonData(animationId);
        const spine = new Spine(skeletonData);

        if (initialSkins) {
            const skinCombinator = new AnimationSkinCombinator(spine.spineData.skins);
            skinCombinator.addAll(initialSkins);
            skinCombinator.applyTo(spine.skeleton);
        }
        return spine;
    }

    /**
     * Loads the {@link CachedAnimationData} of the assigned animation id.
     * @param animationId The id for the data to load.
     */
    public async loadAnimationDataCached(animationId: number) {
        let animationDataPromise = this.animationDataPromiseCache.get(animationId);

        if (!animationDataPromise) {
            animationDataPromise = this.loadAnimationData(animationId);
            this.animationDataPromiseCache.set(animationId, animationDataPromise);
            animationDataPromise.catch(() => this.animationDataPromiseCache.delete(animationId));
        }

        return animationDataPromise;
    }

    /**
     * Loads the {@link CachedAnimationData} of the assigned animation id.
     * This is not cached inside animationLoader - use {@link loadAnimationDataCached} instead.
     * @param animationId The id for the data to load.
     */
    private async loadAnimationData(animationId: number): Promise<CachedAnimationData> {
        const imageBufferPromise = resourceAnimationImageBuffer(animationId);
        const atlasBufferPromise = resourceAnimationAtlasBuffer(animationId);
        const skeletonBufferPromise = resourceAnimationSkeletonBuffer(animationId);
        const imageBuffer = await imageBufferPromise;
        const texture = await createTextureFromBuffer(imageBuffer);
        const atlas = await atlasBufferPromise;
        const skeleton = await skeletonBufferPromise;

        saveInAnimationCache(animationId, {
            atlas,
            skeleton,
            imageBuffer
        }).catch(errorStore.addErrorFromErrorObject);

        const atlasDataText = this.textDecoder.decode(atlas);
        const skeletonDataText = this.textDecoder.decode(skeleton);
        const skins = getSkins(skeletonDataText);

        return {
            atlasDataText,
            skeletonDataText,
            texture,
            skins
        };
    }

    public async loadAnimationDataFromLocalCacheIntoAnimationLoaderCache(animationId: number) {
        if (this.animationDataPromiseCache.has(animationId))
            return LocalCacheLoadingResult.AlreadyLoaded;

        const cacheResult = await loadFromAnimationCache(animationId);
        if (!cacheResult)
            return LocalCacheLoadingResult.NotFoundInCache;

        const { atlas, imageBuffer, skeleton } = cacheResult;

        const atlasDataText = this.textDecoder.decode(atlas);
        const skeletonDataText = this.textDecoder.decode(skeleton);
        const skins = getSkins(skeletonDataText);

        this.animationDataPromiseCache.set(animationId, Promise.resolve({
            atlasDataText,
            skeletonDataText,
            texture: await createTextureFromBuffer(imageBuffer),
            skins
        }));

        return LocalCacheLoadingResult.LoadedFromCache;
    }

    private getSpineSkeletonData(animationId: number) {
        let cachedResult = this.skeletonDataPromiseCache.get(animationId);
        if (!cachedResult) {
            cachedResult = this.createSpineSkeletonData(animationId);
            this.skeletonDataPromiseCache.set(animationId, cachedResult);
        }

        return cachedResult;
    }

    private async createSpineSkeletonData(animationId: number) {
        const animationData = await this.loadAnimationDataCached(animationId);
        const { atlasDataText, skeletonDataText, texture } = animationData;
        const textureAtlas = new TextureAtlas(atlasDataText, (path, callback) => callback(texture.baseTexture));
        const skeletonJson = new SkeletonJson(new AtlasAttachmentLoader(textureAtlas));
        skeletonJson.scale = dataConstants.characterAnimationDefaultScale;
        return skeletonJson.readSkeletonData(skeletonDataText);
    }

    /**
     * Clears the animation data of the assigned animation id or the whole
     * cache if no animation id is assigned.
     * @param animationId The id of the animation to clear from the cache.
     */
    public clearAnimationDataCache(animationId = -1) {
        if (animationId > -1) {
            this.animationDataPromiseCache.delete(animationId);
        } else {
            this.animationDataPromiseCache.clear();
        }
    }

    /**
     * Creates and uploads a new animation with the assigned id.
     * @param animationName The name of the animation.
     * @param skeletonFile The skeleton data.
     * @param imageFile The atlas image data.
     * @param atlasFile The atlas configuration data.
     */
    public async uploadNewAnimation(animationName: string, skeletonFile: File, imageFile: File, atlasFile: File): Promise<AnimationAssetModel> {
        const snapshot = AnimationAssetModel.newSnapshot(animationName);
        const skeletonBuffer = await skeletonFile.arrayBuffer();
        const imageBuffer = await imageFile.arrayBuffer();
        const atlasBuffer = await atlasFile.arrayBuffer();
        const serverSnapshot = await editorClient.createAnimationAsset(snapshot, skeletonBuffer, imageBuffer, atlasBuffer);
        return fromSnapshot<AnimationAssetModel>(serverSnapshot);
    }

    /**
     * Loads the animation of a {@link CharacterConfigurationModel} and applies the configured skins.
     * @param model The character to load the animation and apply the configuration.
     * @param scale The scale of the whole animation.
     */
    public async loadCharacterAnimation(model: CharacterConfigurationModel): Promise<Spine> {
        const animation = sharedStore.getAnimationByName(model.animationAssetName);
        if (!animation) {
            throw new TranslatedError("editor.error_animation_for_character_not_found", {
                character: model.localizedName.get(gameStore.languageKey),
                animation: model.animationAssetName
            });
        }

        const spine = await this.loadSpine(animation.id, model.animationSkins.split(","));
        applyAnimationTransition(spine);
        setSkinTint(spine, hexToColor(model.tintColorHex));
        return spine;
    }

    /**
     * Creates an empty {@link Spine} object.
     */
    public createEmptySpine() {
        return new Spine(new SkeletonData());
    }

    /**
     * Returns true if the assigned {@link Spine} is empty.
     * @param spine The {@link Spine} to check.
     */
    public isEmptySpine(spine: Spine) {
        return !spine || !spine.children || spine.children.length == 0;
    }

    public async getSpineFromAnimationName(animationName: string): Promise<Spine> {
        const animation = sharedStore.getAnimationByName(animationName);
        if (!animation) {
            throw new TranslatedError("editor.error_animation_not_found", {
                animation: animationName
            });
        }

        const spine = await this.loadSpine(animation.id);
        return spine;
    }
}

function getSkins(skeletonDataText: string) {
    const skeleton = JSON.parse(skeletonDataText) as SkeletonData;
    return skeleton.skins;
}

export const animationLoader = new AnimationLoader();