import { AnimatedSprite, Container, Sprite } from "pixi.js";
import { staticAssetLoader } from "../../loader/StaticAssetLoader";
import { Character } from "./Character";
import { CombatSounds } from "../combat/CombatSounds";
import { soundCache } from "../../../stores/SoundCache";

export class Player extends Character {

    private shield: Sprite;
    private slashEffectEnemy: AnimatedSprite;

    public constructor(overlayContainer: Container = null) {
        super(overlayContainer, false, null);
        this.isPlayer = true;
    }

    public showShield(visible: boolean) {
        this.ensureSpritesExist();
        this.shield.visible = visible;
    }

    public playSlashEffect(hurt: boolean) {
        this.ensureSpritesExist();
        if (this.slashEffectEnemy.playing)
            return false;

        this.slashEffectEnemy.visible = true;
        this.slashEffectEnemy.gotoAndPlay(0);
        if (hurt) {
            soundCache.playOneOf(CombatSounds.DEFENSE_ATTEMPT_FAILED);
            navigator.vibrate(600);
        } else {
            soundCache.playOneOf(CombatSounds.DEFENSE_ATTEMPT);
        }
        return true;
    }

    private ensureSpritesExist() {
        if (!this.slashEffectEnemy) {
            this.slashEffectEnemy = staticAssetLoader.createStaticAssetViewAnimated("effect_slash_enemy");
            this.slashEffectEnemy.anchor.set(0.5, 0.5);
            this.slashEffectEnemy.loop = false;
            this.slashEffectEnemy.stop();
            this.slashEffectEnemy.visible = false;

            this.shield = staticAssetLoader.createStaticAssetView("Shield");
            this.shield.position.set(64, -64);
            this.shield.visible = false;
            this.addChild(this.shield, this.slashEffectEnemy);
        }
    }

}
