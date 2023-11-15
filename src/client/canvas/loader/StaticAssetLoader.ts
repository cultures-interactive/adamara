import { AnimatedSprite, Loader, Rectangle, Sprite, Texture } from "pixi.js";
import { IMediaInstance, sound } from '@pixi/sound';
import { ImagePropertiesModel } from "../../../shared/resources/ImagePropertiesModel";
import { PixelPositionModel } from "../../../shared/resources/PixelPositionModel";
import { SizeModel } from "../../../shared/resources/SizeModel";
import { gameConstants } from "../../data/gameConstants";
import { errorStore } from "../../stores/ErrorStore";

export const staticImageAssetFolder = "assets/game/images/";
const staticSoundsFolder = "assets/game/sounds/";
const staticFontsFolder = "assets/fonts/";

export const loadingAnimationUrl = staticImageAssetFolder + "loadingAnimation.gif";
const loadingImageSize = 40;
export const loadingAssetData = new ImagePropertiesModel({ size: new SizeModel({ width: loadingImageSize, height: loadingImageSize }), positionOnTile: new PixelPositionModel({ x: gameConstants.tileWidth / 2 - loadingImageSize / 2, y: gameConstants.tileHeight / 2 - loadingImageSize / 2 }) });

interface AnimationData {
    frames: number;
    animationDuration: number;
}

export class StaticAssetLoader {
    private animationFramesByAssetId = new Map<string, Texture[]>();

    public readonly imageProperties = [
        "LightAttack",
        "LightAttack_selected",
        "AreaAttack",
        "AreaAttack_selected",
        "TopBar",
        "TopBar_Background",
        "TopBar_Bar_Attack",
        "TopBar_Bar_Defense",
        "Phase_LongAttack",
        "Phase_LongDefense",
        "Phase_ShortAttack",
        "Phase_ShortDefense",
        "combatState",
        "PhaseTransition_LongAttack",
        "PhaseTransition_LongDefense",
        "PhaseTransition_ShortAttack",
        "PhaseTransition_ShortDefense",
        "Healthbar_Background",
        "Healthbar_Bar",
        "Healthbar_Player_Frame_Foreground",
        "Shield",
        "Water_Waves",
        "loading",
        "trigger_attack",
        "trigger_interact",
        "trigger_look",
        "trigger_speak"
    ];

    public static readonly animationProperties = {
        effect_slash: { frames: 11, animationDuration: 0.5 },
        effect_slash_short: { frames: 11, animationDuration: 0.5 },
        effect_slash_enemy: { frames: 11, animationDuration: 0.5 },
        effect_explosion: { frames: 16, animationDuration: 1 },
        effect_enemy_death: { frames: 10, animationDuration: 1 }
    };

    public staticSounds = [
        "slash",
        "slash2",
        "explosion",
        "damage_taken",
        "shield_short",
        "shield",
        "fail",
        "success"
    ];

    public fontFiles = [
        "ingameFonts.css"
    ];

    public async loadStaticAssets() {
        return new Promise<void>((resolve, reject) => {
            const loader = Loader.shared;

            for (const fontFile of this.fontFiles) {
                loader.add(staticFontsFolder + fontFile);
            }

            // jj: These are all prototype assets right now; to be replaced with the final ones and packaged into atlases
            for (const staticImageId of this.imageProperties) {
                loader.add(staticImageId, staticImageAssetFolder + staticImageId + ".png");
            }
            for (const staticImageId in StaticAssetLoader.animationProperties) {
                loader.add(staticImageId, staticImageAssetFolder + staticImageId + ".png");
            }
            for (const sound of this.staticSounds) {
                loader.add(sound, staticSoundsFolder + sound + ".m4a");
            }

            loader.onError.add((error, loader, resource) => {
                console.error("StaticAssetLoader loading error", { error, loader, resource });
                errorStore.addErrorFromErrorObject(new Error(`[StaticAssetLoader] Error while loading: ${resource.url} (${error.name}: ${error.message})`));
            });

            loader.load(_ => {
                try {
                    for (const staticImageId in StaticAssetLoader.animationProperties) {
                        const { frames: frameCount } = StaticAssetLoader.animationProperties[staticImageId as keyof typeof StaticAssetLoader.animationProperties];
                        const { texture } = loader.resources[staticImageId];
                        if (!texture)
                            throw new Error("Resource not loaded: " + staticImageId);

                        const { baseTexture } = texture;

                        const frameTextures = new Array<Texture>();
                        const frameWidth = baseTexture.width / frameCount;
                        const frameHeight = baseTexture.height;
                        for (let i = 0; i < frameCount; i++) {
                            frameTextures.push(new Texture(baseTexture, new Rectangle(frameWidth * i, 0, frameWidth, frameHeight)));
                        }

                        this.animationFramesByAssetId.set(staticImageId, frameTextures);
                    }

                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    public getTexture(staticAssetId: string) {
        const loader = Loader.shared;
        return loader.resources[staticAssetId].texture;
    }

    public getImage(staticAssetId: string): HTMLImageElement {
        const loader = Loader.shared;
        return loader.resources[staticAssetId].data;
    }

    public createStaticAssetView(staticAssetId: string) {
        return Sprite.from(staticAssetId);
    }

    public createStaticAssetViewAnimated(staticAssetId: keyof typeof StaticAssetLoader.animationProperties) {
        const { frames: frameCount, animationDuration } = StaticAssetLoader.animationProperties[staticAssetId] as AnimationData;

        const textures = this.animationFramesByAssetId.get(staticAssetId);
        const view = new AnimatedSprite(textures, frameCount > 1);

        view.animationSpeed = frameCount / (animationDuration * 60);
        view.gotoAndPlay(0);

        return view;
    }

    public playSound(id: string) {
        const promise = sound.play(id) as Promise<IMediaInstance>;
        if (promise.catch) {
            promise.catch(e => console.error(e));
        }
    }
}

export const staticAssetLoader = new StaticAssetLoader();