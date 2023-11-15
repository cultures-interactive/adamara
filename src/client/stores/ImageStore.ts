import { makeAutoObservable } from "mobx";
import { fromSnapshot, getSnapshot } from "mobx-keystone";
import { Texture } from "pixi.js";
import { doesImageNeedTexture, ImageModel, ImageSnapshot, ImageUsecase, throwIfImageSizeIsTooBig } from "../../shared/resources/ImageModel";
import { SizeModel } from "../../shared/resources/SizeModel";
import { editorClient } from "../communication/EditorClient";
import { wrapIterator } from "../../shared/helper/IterableIteratorWrapper";
import { resourceGetImage } from "../communication/api";
import { errorStore } from "./ErrorStore";
import { editorStore } from "./EditorStore";

export class ImageStore {
    public constructor() {
        makeAutoObservable(this, {

        }, { autoBind: true });
    }

    private imageMetadata = new Map<number, ImageModel>();
    private imageTextures = new Map<number, Texture>();
    private imageUrls = new Map<number, string>();
    private preloadedUrlOnlyImages = new Array<HTMLImageElement>();

    public loadingPercentage = 0;

    public setLoadingPercentage(value: number) {
        this.loadingPercentage = value;
    }

    public get completelyLoaded() {
        return this.loadingPercentage === 1;
    }

    public getAllImageMetadataOfUsecase(usecase: ImageUsecase): ImageModel[] {
        return wrapIterator(this.imageMetadata.values()).filter(image => image.usecase === usecase);
    }

    public hasImage(id: number) {
        return this.imageMetadata.has(id);
    }

    public getTexture(id: number) {
        return this.imageTextures.get(id);
    }

    public getImageUrl(id: number) {
        return this.imageUrls.get(id);
    }

    private setImage(src: string, texture: Texture, imageSnapshot: ImageSnapshot) {
        const { id } = imageSnapshot;
        this.imageUrls.set(id, src);
        this.imageTextures.set(id, texture);
        this.imageMetadata.set(id, fromSnapshot<ImageModel>(imageSnapshot));
    }

    public async setImageFromBlob(imageSnapshot: ImageSnapshot, blob: Blob) {
        const src = URL.createObjectURL(blob);
        const texture = await Texture.fromURL(src);

        this.setImage(src, texture, imageSnapshot);
    }

    private static getImageServerUrl(id: number) {
        return `/api/resources/image/${id}`;
    }

    public setImageJustWithUrl(imageSnapshot: ImageSnapshot) {
        if (this.hasImage(imageSnapshot.id))
            return;

        const url = ImageStore.getImageServerUrl(imageSnapshot.id);
        this.setImage(url, null, imageSnapshot);
    }

    /**
     * - For images that need textures: Load image from the server. Return false.
     * - For images that don't need textures (and are just used in HTML image elements):
     *   Just set the texture URL. Return true. Preload later with `preloadHTMLImage` if needed.
     * @returns true if the image is new and wasn't preloaded yet.
     */
    public async addImage(imageSnapshot: ImageSnapshot, abortSignal: AbortSignal) {
        if (this.hasImage(imageSnapshot.id))
            return false;

        if (this.imageUrls.has(imageSnapshot.id))
            return false;

        if (doesImageNeedTexture(imageSnapshot)) {
            try {
                const imageBlob = await resourceGetImage(imageSnapshot.id, abortSignal);
                await this.setImageFromBlob(imageSnapshot, imageBlob);
                return false;
            }
            catch (error) {
                errorStore.addErrorFromErrorObject(error);
                return false;
            }
        } else {
            this.setImageJustWithUrl(imageSnapshot);
            return true;
        }
    }

    public preloadHTMLImage(imageSnapshot: ImageSnapshot) {
        return new Promise<void>((resolve, reject) => {
            try {
                // Preload the image, but there is no need to wait until it is actually loaded.
                // Until it is actually shown it probably *will* be loaded, and if not, the image element
                // will work just fine without it for a moment.
                const htmlImage = new Image();
                htmlImage.src = ImageStore.getImageServerUrl(imageSnapshot.id);
                this.preloadedUrlOnlyImages.push(htmlImage);
                htmlImage.onload = () => {
                    resolve();
                };
                htmlImage.onerror = (e) => {
                    reject(new Error("Unknown error while preloading " + htmlImage.src));
                };
            } catch (e) {
                reject(e);
            }
        });
    }

    public async provideImageFromLocalFilesystem(file: File, usecase: ImageUsecase) {
        throwIfImageSizeIsTooBig(usecase, file.size);

        const src = URL.createObjectURL(file);

        return Texture.fromURL(src).then(async (texture) => {
            const clientImageMetadata = new ImageModel({
                size: new SizeModel({ width: texture.width, height: texture.height }),
                usecase: usecase,
                filename: file.name,
                moduleOwner: editorStore.sessionModuleId
            });
            const imageDataBuffer = await file.arrayBuffer();
            const imageSnapshot = await editorClient.createImage(getSnapshot(clientImageMetadata), imageDataBuffer);

            if (!doesImageNeedTexture(imageSnapshot)) {
                texture.destroy(true);
                texture = null;
            }

            this.setImage(src, texture, imageSnapshot);
            return imageSnapshot.id;
        });
    }

    public async deleteImage(imageId: number) {
        await editorClient.deleteImage(imageId);
        this.imageDeleted(imageId);
    }

    public imageDeleted(imageId: number) {
        this.imageMetadata?.delete(imageId);
        this.imageTextures.delete(imageId);
        this.imageUrls.delete(imageId);
    }

    public prune(keepImageIds: Set<number>) {
        for (const existingImageId of this.imageMetadata.keys()) {
            if (!keepImageIds.has(existingImageId)) {
                this.imageDeleted(existingImageId);
            }
        }
    }
}

export const imageStore = new ImageStore();