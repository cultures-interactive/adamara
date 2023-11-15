import { AnimatedSprite, Container, IDestroyOptions } from "pixi.js";
import { DynamicMapElementNPCInterface } from "../../../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { staticAssetLoader } from "../../loader/StaticAssetLoader";
import { NpcViewBase } from "../../shared/map/NpcViewBase";
import { HealthBarView } from "../combat/HealthBarView";
import { GameInteractionTrigger } from "./GameInteractionTrigger";
import { CombatSounds } from "../combat/CombatSounds";
import { soundCache } from "../../../stores/SoundCache";
import { autoDisposeOnDisplayObjectRemoved } from "../../../helper/ReactionDisposerGroup";
import { gameStore } from "../../../stores/GameStore";

export class GameNpcView extends NpcViewBase {
    public hitPoints: number;

    private health: HealthBarView;
    private slashEffectShort: AnimatedSprite;
    private slashEffect: AnimatedSprite;
    private areaEffect: AnimatedSprite;
    private deathEffect: AnimatedSprite;

    public readonly interactionTrigger: GameInteractionTrigger;

    public constructor(
        data: DynamicMapElementNPCInterface,
        overlayContainer: Container,
        repeatLoadingUntilSuccessCancelled: () => boolean,
        interactionTriggerOverlay: Container
    ) {
        super(data, overlayContainer, true, repeatLoadingUntilSuccessCancelled);

        this.baseRefreshMethods.forEach(refresh => refresh.call(this));

        if (this.viewAreaGraphicController.viewAreas.length > 0) {
            this.showViewAreas();

            autoDisposeOnDisplayObjectRemoved(this, autoDisposingAutorun => {
                autoDisposingAutorun(this.refreshViewAreaVisibilityBasedOnActiveTriggers.bind(this));
            });
        }

        if (data.isInteractionTrigger) {
            this.interactionTrigger = new GameInteractionTrigger(data, () => this.baseTilePosition, interactionTriggerOverlay, this, 0, 0);
        }
    }

    public destroy(options?: boolean | IDestroyOptions): void {
        super.destroy(options);
        this.interactionTrigger?.destroy(options);
    }

    private refreshViewAreaVisibilityBasedOnActiveTriggers() {
        const activeLocationTriggers = gameStore.gameEngine.activeLocationTriggerNamesOnCurrentMap;
        this.viewAreaGraphicController.viewAreas.forEach(area => {
            if (activeLocationTriggers.has(area.triggerName)) {
                area.visible = true;
            } else {
                area.visible = false;
            }
        });
    }

    protected updateBox() {
        super.updateBox();
        this.interactionTrigger?.updatePosition();
    }

    protected onConfigurationApplied(): void {
        this.configurationRelatedRefreshMethods.forEach(refresh => refresh.call(this));
    }

    public updateHealth(amount: number) {
        if (!this.health) {
            this.health = new HealthBarView(0.25, false);
            this.health.position.x = -50;
            this.health.position.y = -5;
            this.addChild(this.health);
        }

        if (amount > 0) {
            this.health.visible = true;
        } else {
            this.health.visible = false;
        }
        return this.health.setHealth(amount);
    }

    public playShortSlashEffect() {
        if (!this.slashEffectShort) {
            this.slashEffectShort = staticAssetLoader.createStaticAssetViewAnimated("effect_slash_short");
            this.slashEffectShort.loop = false;
            this.slashEffectShort.position.y = -50;
            this.slashEffectShort.stop();
            this.addChild(this.slashEffectShort);
            soundCache.playOneOf(CombatSounds.KNIFE_ATTACK_ATTEMPT);
        }
        this.slashEffectShort.gotoAndPlay(0);
    }

    public playSlashEffect() {
        if (!this.slashEffect) {
            this.slashEffect = staticAssetLoader.createStaticAssetViewAnimated("effect_slash");
            this.slashEffect.loop = false;
            this.slashEffect.position.y = -50;
            this.slashEffect.stop();
            this.addChild(this.slashEffect);
        }

        if (!this.slashEffect.playing) {
            this.slashEffect.gotoAndPlay(0);
        }
        if (this.health.isDefeated()) {
            this.playDefeatEffectAndHide();
        }
    }

    public playAreaEffect() {
        if (!this.areaEffect) {
            this.areaEffect = staticAssetLoader.createStaticAssetViewAnimated("effect_explosion");
            this.areaEffect.loop = false;
            this.areaEffect.position.y = -50;
            this.areaEffect.stop();
            this.addChild(this.areaEffect);
        }
        if (!this.areaEffect.playing) {
            this.areaEffect.gotoAndPlay(0);
        }
        if (this.health.isDefeated()) {
            this.playDefeatEffectAndHide();
        }
    }

    public playDefeatEffectAndHide() {
        if (!this.deathEffect) {
            this.deathEffect = staticAssetLoader.createStaticAssetViewAnimated("effect_enemy_death");
            this.deathEffect.loop = false;
            this.deathEffect.position.x = 75;
            this.deathEffect.stop();
            this.addChild(this.deathEffect);
        }
        this.deathEffect.gotoAndPlay(0);
        this.hide();
    }

    public showAfterFight() {
        this.health.visible = false;
        this.show();
    }
}
