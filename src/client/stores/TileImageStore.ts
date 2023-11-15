import { AnimatedSprite, BaseTexture, ISpritesheetData, Rectangle, Spritesheet, Texture } from "pixi.js";
import { ImagePropertiesModel } from "../../shared/resources/ImagePropertiesModel";
import { SizeModel } from "../../shared/resources/SizeModel";
import { keyToTileImageIdentification, TileImageUsage } from "../../shared/resources/TileAssetModel";
import { editorClient } from "../communication/EditorClient";
import { makeAutoObservable, observable, runInAction } from "mobx";
import { loadingAssetData, staticAssetLoader } from "../canvas/loader/StaticAssetLoader";
import { getThumbnailUrl, routeConstants } from "../../shared/data/routeConstants";
import { ThumbnailCatalogue } from "../../shared/definitions/other/ThumbnailCatalogue";
import { sharedStore } from "./SharedStore";

type BaseTextureWithMetadata = BaseTexture & {
    isAtlas: boolean;
};

type TextureWithMetadata = Texture & {
    unadjustedFrame: Rectangle;
};

export class TileImageStore {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    private imageTextures: Map<string, TextureWithMetadata> = observable.map();
    private thumbnailUrls: Map<string, string> = observable.map();
    private downloadUrls: Map<string, string> = observable.map();
    private isLoadingSet: Map<string, void> = observable.map(); // HACK tw: should be an observable.set, but: https://github.com/mobxjs/mobx/issues/3369
    private hasFailedSet: Map<string, void> = observable.map(); // HACK tw: should be an observable.set, but: https://github.com/mobxjs/mobx/issues/3369

    private cacheKey(id: string, tileImageUsage: TileImageUsage, frame: number = 0) {
        return id + "_" + tileImageUsage + "_" + frame;
    }

    public setLoading(id: string, tileImageUsage: TileImageUsage) {
        this.isLoadingSet.set(this.cacheKey(id, tileImageUsage));
    }

    public isLoading(id: string, tileImageUsage: TileImageUsage) {
        return this.isLoadingSet.has(this.cacheKey(id, tileImageUsage));
    }

    public setLoadingFailed(id: string, tileImageUsage: TileImageUsage) {
        const key = this.cacheKey(id, tileImageUsage);
        this.isLoadingSet.delete(key);
        this.hasFailedSet.set(key);
    }

    public hasFailed(id: string, tileImageUsage: TileImageUsage) {
        return this.hasFailedSet.has(this.cacheKey(id, tileImageUsage));
    }

    private setTextureAndUrl(id: string, tileImageUsage: TileImageUsage, textureWithoutMetadata: Texture, thumbnailUrl: string, downloadUrl: string) {
        const texture = textureWithoutMetadata as TextureWithMetadata;
        texture.unadjustedFrame = texture.frame.clone();

        const key = this.cacheKey(id, tileImageUsage);

        this.isLoadingSet.delete(key);
        this.hasFailedSet.delete(key);

        let frame = 0;
        while (this.clearTextureIfExists(this.cacheKey(id, tileImageUsage, frame))) {
            frame++;
        }

        this.imageTextures.set(key, texture);
        if (thumbnailUrl) {
            this.thumbnailUrls.set(key, thumbnailUrl);
        }
        if (downloadUrl) {
            this.downloadUrls.set(key, downloadUrl);
        }
    }

    private clearTextureIfExists(key: string) {
        const texture = this.imageTextures.get(key);
        if (!texture)
            return false;

        const destroyBaseTexture = !(texture.baseTexture as BaseTextureWithMetadata).isAtlas;
        texture.destroy(destroyBaseTexture);
        this.imageTextures.delete(key);
        return true;
    }

    public thumbnailUrl(id: string, tileImageUsage: TileImageUsage) {
        const key = this.cacheKey(id, tileImageUsage);
        return this.thumbnailUrls.get(key);
    }

    public setNewThumbnailUrl(id: string, tileImageUsage: TileImageUsage, newThumbnailUrl: string) {
        const key = this.cacheKey(id, tileImageUsage);
        this.thumbnailUrls.set(key, newThumbnailUrl);
    }

    public downloadUrl(id: string, tileImageUsage: TileImageUsage) {
        const key = this.cacheKey(id, tileImageUsage);
        return this.downloadUrls.get(key);
    }

    public getTexture(id: string, tileImageUsage: TileImageUsage, frame?: number) {
        return this.getOrCreateTextureForFrame(id, tileImageUsage, frame);
    }

    private getOrCreateTextureForFrame(id: string, tileImageUsage: TileImageUsage, frame?: number) {
        const key = this.cacheKey(id, tileImageUsage, frame);
        const texture = this.imageTextures.get(key);
        if (texture)
            return texture;

        const frame0 = this.imageTextures.get(this.cacheKey(id, tileImageUsage, 0));
        if (!frame0)
            return null;

        const newFrame = frame0.clone() as TextureWithMetadata;
        newFrame.unadjustedFrame = frame0.unadjustedFrame.clone();

        // Suppress "[MobX] Since strict-mode is enabled, changing (observed) observable values without using an action is not allowed."
        // To be honest, I am not quite sure why this is needed. Shouldn't getOrCreateTextureForFrame() already be an action? Maybe because
        // it is called in a reaction? I can't find anything about this online, but runInAction() seems to work, so there's that.
        runInAction(() => {
            this.imageTextures.set(key, newFrame);
        });

        return newFrame;
    }

    private static adjustAnimationUVCoordinatesIfNecessary(texture: TextureWithMetadata, imageProperties: ImagePropertiesModel, frame: number) {
        const frameWidth = imageProperties.frameWidth();
        const frameX = texture.unadjustedFrame.x + (frameWidth * frame);
        const frameY = texture.unadjustedFrame.y;
        const frameHeight = imageProperties.size.height;
        if ((frameX != texture.frame.x) || (frameY != texture.frame.y) || (frameWidth != texture.frame.width) || (frameHeight != texture.frame.height)) {
            texture.frame.x = frameX;
            texture.frame.y = frameY;
            texture.frame.width = frameWidth;
            texture.frame.height = frameHeight;
            texture.updateUvs();
        }
    }

    public async provideTileAssetFromServer(id: string, tileImageUsage: TileImageUsage, blob: Blob, thumbnailUrl?: string) {
        const src = URL.createObjectURL(blob);
        const texture = await Texture.fromURL(src);

        if (!thumbnailUrl)
            thumbnailUrl = src;

        this.setTextureAndUrl(id, tileImageUsage, texture, thumbnailUrl, src);
    }

    public async provideTileAtlasFromServer(data: ISpritesheetData, blob: Blob, thumbnailCatalogue: ThumbnailCatalogue) {
        const src = URL.createObjectURL(blob);
        const atlasTexture = await Texture.fromURL(src);
        (atlasTexture.baseTexture as BaseTextureWithMetadata).isAtlas = true;

        const atlas = new Spritesheet(atlasTexture, data);
        await atlas.parse();

        for (const textureId in atlas.textures) {
            const texture = atlas.textures[textureId];

            const { id, tileImageUsage, version } = keyToTileImageIdentification(textureId);
            const thumbnailUrl = getThumbnailUrl(thumbnailCatalogue[textureId]);
            const downloadUrl = routeConstants.atlasTileSourceImages(id, tileImageUsage, version);
            this.setTextureAndUrl(id, tileImageUsage, texture, thumbnailUrl, downloadUrl);
        }
    }

    public async provideTileAssetFromLocalFilesystem(id: string, tileImageUsage: TileImageUsage, file: File) {
        if (!file) {
            const tileAsset = sharedStore.getTileAsset(id);
            tileAsset.setImageProperties(null, tileImageUsage);
            editorClient.updateTileAsset(tileAsset, null, null, null, null);
            return;
        }

        const src = URL.createObjectURL(file);
        await Texture.fromURL(src).then(async (texture) => {
            runInAction(() => {
                this.setTextureAndUrl(id, tileImageUsage, texture, src, src);
                this.updateLocalAssetModel(id, tileImageUsage, texture);
            });
            // a local file needs to be sent to the server
            await this.sendToServer(id, file, tileImageUsage);
        });
    }

    public async provideAssetTextureFromCanvas(id: string, imageProperties: ImagePropertiesModel, tileImageUsage: TileImageUsage, canvas: HTMLCanvasElement) {
        const blob = await new Promise<Blob>(resolve => canvas.toBlob(resolve));
        const src = URL.createObjectURL(blob);

        const texture = await Texture.fromURL(src);
        this.setTextureAndUrl(id, tileImageUsage, texture, src, src);

        const tileAsset = sharedStore.getTileAsset(id);
        if (!tileAsset)
            throw new Error("The tile asset doesn't exist anymore");

        tileAsset.setImageProperties(imageProperties, tileImageUsage);

        await this.sendToServer(id, blob, tileImageUsage);
    }

    private updateLocalAssetModel(id: string, tileImageUsage: TileImageUsage, texture: Texture) {
        const tileAsset = sharedStore.getTileAsset(id);
        tileAsset.setImageProperties(new ImagePropertiesModel({ size: new SizeModel({ width: texture.width, height: texture.height }) }), tileImageUsage);
    }

    private async sendToServer(id: string, blob: Blob, tileImageUsage: TileImageUsage) {
        await blob.arrayBuffer().then((buffer) => {
            editorClient.updateTileAsset(sharedStore.getTileAsset(id),
                tileImageUsage === TileImageUsage.Background ? buffer : null,
                tileImageUsage === TileImageUsage.WaterMask ? buffer : null,
                tileImageUsage === TileImageUsage.Foreground ? buffer : null,
                tileImageUsage === TileImageUsage.WaterMaskForeground ? buffer : null
            );
        });
    }

    public adjustTileView(view: AnimatedSprite, assetData: ImagePropertiesModel, tileAssetId: string, tileImageUsage: TileImageUsage) {
        const assetExists = !!assetData;
        view.visible = assetExists;
        if (!assetExists)
            return;

        const isLoading = this.isLoading(tileAssetId, tileImageUsage);
        if (isLoading) {
            assetData = loadingAssetData;
        }

        const textures: Texture[] = [];
        const frameCount = assetData.frames > 0 ? assetData.frames : 1;
        const animationDuration = assetData.animationDuration > 0 ? assetData.animationDuration : 1;
        const frameWidth = assetData.frameWidth();
        for (let i = 0; i < frameCount; i++) {
            if (isLoading) {
                textures.push(staticAssetLoader.getTexture("loading"));
            } else {
                const texture = this.getTexture(tileAssetId, tileImageUsage, i);
                if (!texture)
                    continue;

                TileImageStore.adjustAnimationUVCoordinatesIfNecessary(texture, assetData, i);

                textures.push(texture);
            }
        }

        view.textures = textures.length > 0 ? textures : [Texture.EMPTY];
        view.width = frameWidth;
        view.height = assetData.size.height;
        if (assetData.positionOnTile) {
            view.position.set(assetData.positionOnTile.x, assetData.positionOnTile.y);
        } else {
            view.position.set(0, 0);
        }
        view.animationSpeed = frameCount / (animationDuration * 60);
        view.autoUpdate = frameCount > 1;
        view.gotoAndPlay(0);
    }

    public uniqueAssetId(oldId: string, suggestion: string) {
        if (oldId === suggestion)
            return suggestion;

        if (!sharedStore.isTileAssetIdUsed(suggestion))
            return suggestion;

        if (suggestion.match(/.*\d\d\d\d$/)) {
            suggestion = suggestion.substring(0, suggestion.length - 4);
        }

        let candidate = suggestion;
        let counter = 0;
        while (sharedStore.isTileAssetIdUsed(candidate)) {
            counter++;
            candidate = suggestion + counter.toString().padStart(4, "0");
        }
        return candidate;
    }
}

export const tileImageStore = new TileImageStore();