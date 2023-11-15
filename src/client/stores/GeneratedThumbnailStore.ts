import { makeAutoObservable, ObservableMap, reaction, runInAction } from "mobx";
import { backgroundRendererManager, BackgroundRendererResult } from "../canvas/backgroundRendering/BackgroundRendererManager";
import { editorStore } from "./EditorStore";
import { sharedStore, sharedStoreEventEmitter } from "./SharedStore";
import * as Sentry from "@sentry/react";
import { throttledDelayedCall } from "../helper/generalHelpers";
import { GeneratedImageType, saveInGeneratedImageCache } from "../cache/GeneratedImageCache";
import { errorStore } from "./ErrorStore";
import { loadingAnimationUrl } from "../canvas/loader/StaticAssetLoader";

export enum PreviewImageStatus {
    NotRequested,
    Generating,
    Available,
    DoesNotExist
}

export class GeneratedThumbnailImageStore<TId, TObject> {
    public constructor(
        protected getObject: (id: TId) => TObject,
        protected renderObject: (object: TObject, abortSignal: AbortSignal) => Promise<BackgroundRendererResult>,
        protected saveInCache: (id: TId, result: BackgroundRendererResult) => void
    ) {
        makeAutoObservable(this, {
            getOrGenerateThumbnail: false
        }, { autoBind: true });
    }

    private imageUrlData = new ObservableMap<TId, { url: string; version: string; }>();
    private isLoading = new ObservableMap<TId, AbortController>();

    private getStatus(id: TId) {
        if (!this.getObject(id))
            return PreviewImageStatus.DoesNotExist;

        if (this.imageUrlData.has(id))
            return PreviewImageStatus.Available;

        if (this.isLoading.has(id))
            return PreviewImageStatus.Generating;

        return PreviewImageStatus.NotRequested;
    }

    private setGenerating(id: TId, abortController: AbortController) {
        if (this.getStatus(id) !== PreviewImageStatus.NotRequested)
            return;

        this.isLoading.set(id, abortController);
    }

    private setFailed(id: TId) {
        if (this.getStatus(id) !== PreviewImageStatus.Generating)
            return;

        this.isLoading.delete(id);
        this.imageUrlData.set(id, { url: loadingAnimationUrl, version: "failed" });
    }

    private setAvailable(id: TId, url: string, version: string) {
        if (this.getStatus(id) !== PreviewImageStatus.Generating)
            return;

        this.isLoading.delete(id);
        this.imageUrlData.set(id, { url, version });
    }

    private abortIfLoading(id: TId) {
        const abortSignal = this.isLoading.get(id);
        if (abortSignal) {
            abortSignal.abort();
            this.isLoading.delete(id);
        }
    }

    public clear(id: TId) {
        this.abortIfLoading(id);
        this.imageUrlData.delete(id);
    }

    public isSet(id: TId) {
        return this.imageUrlData.has(id);
    }

    public isSetWithVersion(id: TId, version: string) {
        const object = this.imageUrlData.get(id);
        if (!object)
            return false;

        return object.version === version;
    }

    public setFromCache(id: TId, url: string, version: string) {
        this.abortIfLoading(id);
        this.imageUrlData.set(id, { url, version });
    }

    public getOrGenerateThumbnail(id: TId) {
        const status = this.getStatus(id);

        if ((status === PreviewImageStatus.NotRequested) && editorStore.isConnected) {
            const object = this.getObject(id);
            if (object) {
                const abortController = new AbortController();
                runInAction(() => this.setGenerating(id, abortController));
                this.renderObject(object, abortController.signal)
                    .then(result => {
                        if (result) {
                            this.saveInCache(id, result);
                            this.setAvailable(id, URL.createObjectURL(result.imageBlob), result.version);
                        } else {
                            this.setFailed(id);
                        }
                    })
                    .catch(e => {
                        //errorStore.addErrorFromErrorObject(e);
                        // Failing preview image generation should be reported to Sentry, but not displayed to the user
                        Sentry.captureException(e);
                        console.log(e);
                        this.setFailed(id);
                    });
            }
        }

        return this.imageUrlData.get(id)?.url;
    }
}

export const animationThumbnailStore = new GeneratedThumbnailImageStore<number, string>(
    id => sharedStore.getAnimation(id)?.name,
    (animationName, abortSignal) => backgroundRendererManager.renderAnimation(animationName, abortSignal),
    (id, result) => saveInGeneratedImageCache(id.toString(), GeneratedImageType.AnimationAsset, result.version, result.imageBlob).catch(errorStore.addErrorFromErrorObject)
);

export const characterThumbnailStore = new GeneratedThumbnailImageStore<number, number>(
    id => sharedStore.getCharacter(id)?.id,
    (id, abortSignal) => backgroundRendererManager.renderCharacter(id, abortSignal),
    (id, result) => saveInGeneratedImageCache(id.toString(), GeneratedImageType.CharacterConfig, result.version, result.imageBlob).catch(errorStore.addErrorFromErrorObject)
);

const characterChangeWatcherDisposers = new Map<number, () => void>();

function startWatchingCharacterConfiguration(id: number) {
    // Refresh 2000ms after the *latest* change, and only if no other changes happen
    const throttledClearCharacterPreviewImageStore = throttledDelayedCall(
        () => characterThumbnailStore.clear(id),
        2000
    );

    const disposer = reaction(
        () => {
            const character = sharedStore.characterConfigurations.get(id);
            if (!character)
                return null;

            return {
                animationId: sharedStore.getAnimationByName(character.animationAssetName)?.id,
                animationSkins: character.animationSkins,
                tintColorHex: character.tintColorHex
            };
        },
        () => {
            throttledClearCharacterPreviewImageStore();
        }
    );

    characterChangeWatcherDisposers.set(id, disposer);
}

function stopWatchingCharacterConfiguration(id: number) {
    const disposer = characterChangeWatcherDisposers.get(id);
    if (disposer) {
        disposer();
        characterChangeWatcherDisposers.delete(id);
    }
}

sharedStore.characterConfigurations.forEach(character => startWatchingCharacterConfiguration(character.id));
sharedStoreEventEmitter.on("addedCharacterConfiguration", startWatchingCharacterConfiguration);
sharedStoreEventEmitter.on("removedCharacterConfiguration", stopWatchingCharacterConfiguration);