import EventEmitter from "eventemitter3";
import { AnimatedSprite, Container, Texture } from "pixi.js";
import { TileDataInterface } from "../../../../shared/game/TileDataModel";
import { TileImageUsage, TileAssetModel } from "../../../../shared/resources/TileAssetModel";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../../helper/pixiHelpers";
import { tileImageStore } from "../../../stores/TileImageStore";
import { Water } from "./Water";
import { WaterOverlayAnimatedSprite } from "./WaterOverlayAnimatedSprite";

export type TileViewCreator<TileView extends TileViewBase> = (tileData: TileDataInterface, tileAssetData: TileAssetModel, tileImageUsage: TileImageUsage) => TileView;

export interface TileViewBaseEvents {
    tileVisualsUpdated: [];
}

export abstract class TileViewBase extends Container {
    public events = new EventEmitter<TileViewBaseEvents>();

    protected sprite: AnimatedSprite;

    private _partOfLoop = false;

    public constructor(
        protected tileData: TileDataInterface,
        protected tileAssetData: TileAssetModel,
        protected tileImageUsage: TileImageUsage,
        private water: Water
    ) {
        super();

        this.emitTileVisualsUpdated = this.emitTileVisualsUpdated.bind(this);
    }

    protected refreshTileVisuals() {
        if (this.tileAssetData) {
            const isWaterOverlay = (this.tileImageUsage === TileImageUsage.WaterMask) || (this.tileImageUsage === TileImageUsage.WaterMaskForeground);
            this.createSpriteIfNeeded(isWaterOverlay);

            let mainTileImageUsage = this.tileImageUsage;
            if (this.tileImageUsage === TileImageUsage.WaterMask) {
                mainTileImageUsage = TileImageUsage.Background;
            } else if (this.tileImageUsage === TileImageUsage.WaterMaskForeground) {
                mainTileImageUsage = TileImageUsage.Foreground;
            }

            const mainAssetData = this.tileAssetData.imageProperties(mainTileImageUsage);
            tileImageStore.adjustTileView(this.sprite, mainAssetData, this.tileAssetId, mainTileImageUsage);

            if (isWaterOverlay && this.sprite.visible) {
                const waterMaskTexture = tileImageStore.getTexture(this.tileAssetId, this.tileImageUsage);
                this.sprite.visible = !!waterMaskTexture;

                if (waterMaskTexture) {
                    const waterOverlaySprite = (this.sprite as WaterOverlayAnimatedSprite);
                    waterOverlaySprite.waterMaskTexture = waterMaskTexture;

                    const mainTexture = this.sprite.texture;
                    if ((waterMaskTexture.frame.width != mainTexture.frame.width) || (waterMaskTexture.frame.height != mainTexture.frame.height)) {
                        waterMaskTexture.frame.width = mainTexture.frame.width;
                        waterMaskTexture.frame.height = mainTexture.frame.height;
                        waterMaskTexture.updateUvs();
                    }
                }
            }

            const offsetX = this.tileData.additionalOffsetX - this.tileData.additionalOffsetZ;
            const offsetY = this.tileData.additionalOffsetY - this.tileData.additionalOffsetZ;

            if (offsetX || offsetY) {
                this.sprite.position.x += Math.round(tileToWorldPositionX(offsetX, offsetY));
                this.sprite.position.y += Math.round(tileToWorldPositionY(offsetX, offsetY));
            }
        } else {
            // Create placeholder for asset with deleted tileAssetData
            this.createSpriteIfNeeded(false);
            this.sprite.visible = false;
        }

        this.emitTileVisualsUpdated();
    }

    private createSpriteIfNeeded(shouldBeWaterOverlay: boolean) {
        const spriteExists = !!this.sprite;
        const spriteIsWaterOverlay = this.sprite instanceof WaterOverlayAnimatedSprite;
        if (spriteExists && (shouldBeWaterOverlay === spriteIsWaterOverlay))
            return;

        let newSprite: AnimatedSprite = null;
        if (shouldBeWaterOverlay) {
            newSprite = new WaterOverlayAnimatedSprite(this.water, [Texture.EMPTY], false);
        } else {
            newSprite = new AnimatedSprite([Texture.EMPTY], false);
        }

        if (newSprite) {
            if (this.sprite) {
                this.removeChild(this.sprite);
                this.sprite.destroy();
            }

            this.sprite = newSprite;
            this.addChildAt(newSprite, 0);

            this.refreshPartOfLoop();
        }
    }

    public get tilePosition() {
        return this.tileData.position;
    }

    public get tileAssetId() {
        return this.tileData.tileAssetId;
    }

    public get hasVisibleInvalidTexture() {
        if (!this.sprite || !this.sprite.visible)
            return false;

        if (this.sprite instanceof WaterOverlayAnimatedSprite) {
            return !this.sprite.texture?.valid || !this.sprite.waterMaskTexture?.valid;
        } else {
            return !this.sprite.texture?.valid;
        }
    }

    public get partOfLoop() {
        return this._partOfLoop;
    }

    public set partOfLoop(value: boolean) {
        if (this._partOfLoop == value)
            return;

        this._partOfLoop = value;
        this.refreshPartOfLoop();
    }

    protected refreshPartOfLoop() {
    }

    protected emitTileVisualsUpdated() {
        this.events.emit("tileVisualsUpdated");
    }
}