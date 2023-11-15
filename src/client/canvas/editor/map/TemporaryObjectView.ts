import { AnimatedSprite, Container, Texture } from "pixi.js";
import { ImagePropertiesModel } from "../../../../shared/resources/ImagePropertiesModel";
import { TileImageUsage } from "../../../../shared/resources/TileAssetModel";
import { TileHighlight } from "./TileHighlight";
import { UiConstants } from "../../../data/UiConstants";
import { Spine } from "@pixi-spine/all-4.1";
import { animationLoader } from "../../../helper/AnimationLoader";
import { gameConstants } from "../../../data/gameConstants";
import { AreaTriggerVisual } from "./AreaTriggerVisual";
import { MapMarkerVisual } from "./MapMarkerVisual";
import { DebugStartMarkerVisual } from "./DebugStartMarkerVisual";
import { sharedStore } from "../../../stores/SharedStore";
import { tileImageStore } from "../../../stores/TileImageStore";
import { errorStore } from "../../../stores/ErrorStore";
import { EditorOnlyElementViewText } from "./EditorOnlyElementViewText";
import { adjustMapMarkerViewText } from "./MapMarkerView";
import { applyIdleAnimation } from "../../game/character/characterAnimationHelper";

export enum TemporaryObjectViewMode {
    FullyVisible,
    TargetValid,
    TargetInvalid
}

export class TemporaryObjectView extends Container {
    private _mode: TemporaryObjectViewMode;

    private highlightNormal: TileHighlight;
    private highlightInvalid: TileHighlight;

    private tileSpriteBg: AnimatedSprite;
    private tileSpriteFg: AnimatedSprite;

    private areaTriggerGroup: Container;
    private areaTriggerText: EditorOnlyElementViewText;
    private mapMarkerGroup: Container;
    private mapMarkerText: EditorOnlyElementViewText;
    private debugStartMarkerVisual: DebugStartMarkerVisual;

    private spine: Spine;
    private currentLoadingAttempt: number = 0;

    public constructor(mode: TemporaryObjectViewMode) {
        super();

        this._mode = mode;

        this.tileSpriteBg = new AnimatedSprite([Texture.EMPTY], false);
        this.tileSpriteFg = new AnimatedSprite([Texture.EMPTY], false);
        this.addChild(this.tileSpriteBg, this.tileSpriteFg);

        this.areaTriggerGroup = new Container();
        this.areaTriggerGroup.addChild(new AreaTriggerVisual());
        this.areaTriggerText = new EditorOnlyElementViewText(null);
        this.areaTriggerGroup.addChild(this.areaTriggerText);
        this.addChild(this.areaTriggerGroup);

        this.mapMarkerGroup = new Container();
        this.mapMarkerGroup.addChild(new MapMarkerVisual());
        this.mapMarkerText = new EditorOnlyElementViewText(null);
        adjustMapMarkerViewText(this.mapMarkerText);
        this.mapMarkerGroup.addChild(this.mapMarkerText);
        this.addChild(this.mapMarkerGroup);

        this.debugStartMarkerVisual = new DebugStartMarkerVisual();
        this.addChild(this.debugStartMarkerVisual);

        this.highlightNormal = new TileHighlight(4, UiConstants.COLOR_SELECTION_HIGHLIGHT_0x);
        this.addChild(this.highlightNormal);

        this.highlightInvalid = new TileHighlight(4, 0xFF0000, 0xFFAAAA);
        this.addChild(this.highlightInvalid);

        this.refreshMode();
        this.clear();
    }

    public get mode() {
        return this._mode;
    }

    public set mode(value: TemporaryObjectViewMode) {
        if (this._mode === value)
            return;

        this._mode = value;
        this.refreshMode();
    }

    private refreshMode() {
        const isInvalid = this._mode === TemporaryObjectViewMode.TargetInvalid;

        this.alpha = 0.7;
        this.highlightNormal.visible = !isInvalid;
        this.highlightInvalid.visible = isInvalid;
    }

    public clear() {
        this.clearTilePreview();

        this.removeSpineAnimation();
        this.currentLoadingAttempt++;

        this.areaTriggerGroup.visible = false;
        this.mapMarkerGroup.visible = false;
        this.debugStartMarkerVisual.visible = false;
    }

    private clearTilePreview() {
        this.tileSpriteBg.visible = false;
        this.tileSpriteFg.visible = false;
    }

    private removeSpineAnimation() {
        if (!this.spine)
            return;

        this.spine.destroy({
            children: true,
            texture: false,
            baseTexture: false
        });

        this.spine = null;
    }

    public setHeightPlane(heightPlane: number) {
        this.highlightNormal.heightPlane = heightPlane;
        this.highlightInvalid.heightPlane = heightPlane;
    }

    public setTilePreview(id: string, bgAsset: ImagePropertiesModel, fgAsset: ImagePropertiesModel) {
        this.clear();

        if (!bgAsset && !fgAsset)
            return;

        tileImageStore.adjustTileView(this.tileSpriteBg, bgAsset, id, TileImageUsage.Background);
        tileImageStore.adjustTileView(this.tileSpriteFg, fgAsset, id, TileImageUsage.Foreground);
        this.tileSpriteBg.visible = bgAsset != null;
        this.tileSpriteFg.visible = fgAsset != null;
    }

    public setAreaTrigger(id: string) {
        this.clear();
        this.areaTriggerText.visible = Boolean(id);
        this.areaTriggerText.text = id;
        this.areaTriggerGroup.visible = true;
    }

    public setMapMarker(name: string) {
        this.clear();
        this.mapMarkerText.visible = Boolean(name);
        this.mapMarkerText.text = name;
        this.mapMarkerGroup.visible = true;
    }

    public setDebugStartMarker() {
        this.clear();
        this.debugStartMarkerVisual.visible = true;
    }

    public setCharacterPreview(selectedCharacterId: number) {
        this.clear();

        const characterConfiguration = sharedStore.characterConfigurations.get(selectedCharacterId);
        if (characterConfiguration) {
            this.setSpineFromPromise(
                animationLoader.loadCharacterAnimation(characterConfiguration),
                characterConfiguration.animationAssetName
            );
        }
    }

    public setAnimationPreview(selectedAnimationName: string) {
        this.clear();
        this.setSpineFromPromise(animationLoader.getSpineFromAnimationName(selectedAnimationName), selectedAnimationName);
    }

    private setSpineFromPromise(spinePromise: Promise<Spine>, animationName: string) {
        // Track loading attempts
        this.currentLoadingAttempt++;
        const loadingAttempt = this.currentLoadingAttempt;

        spinePromise
            .then(spine => {
                // Only use if we were still expecting this...
                if (this.currentLoadingAttempt === loadingAttempt) {
                    spine.position.set(gameConstants.tileWidth / 2, gameConstants.tileHeight / 2); // to tile center
                    this.addChild(spine);
                    this.spine = spine;

                    const animationData = sharedStore.getAnimationByName(animationName);
                    const { scale } = animationData;
                    this.spine.scale.set(scale, scale);

                    applyIdleAnimation(this.spine);
                } else {
                    // ...else discard.
                    spine.destroy({
                        children: true,
                        texture: false,
                        baseTexture: false
                    });
                }
            })
            .catch(e => errorStore.addErrorFromErrorObject(e));
    }
}