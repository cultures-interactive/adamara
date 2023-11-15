import { autoDisposeOnDisplayObjectRemoved } from "../../../helper/ReactionDisposerGroup";
import { Container } from "pixi.js";
import { combatStore, Enemy, gesturePatternViewOffset } from "../../../stores/CombatStore";
import { gameCanvasSize } from "../../../data/gameConstants";
import { SkillSelectorView } from "./SkillSelectorView";
import { Player } from "../character/Player";
import { PatternView } from "./PatternView";
import { TimeBarView } from "./TimeBarView";
import { PhaseTransitionView } from "./PhaseTransitionView";
import { FullScreenOverlayView as FullScreenFlashView } from "./FullScreenFlashView";
import { GameMapView } from "../map/GameMapView";
import { FullScreenVignetteView } from "./FullScreenVignetteView";
import { GameNpcView } from "../map/GameNpcView";
import { gameStore } from "../../../stores/GameStore";
import { CombatSounds } from "./CombatSounds";
import { soundCache } from "../../../stores/SoundCache";

export class CombatOverlayView extends Container {
    private readonly timer: TimeBarView;
    private readonly transitionOverlay: PhaseTransitionView;
    private readonly skillSimple: SkillSelectorView;
    private readonly skillComplex: SkillSelectorView;

    public patternView: PatternView;
    private readonly flash: FullScreenFlashView;
    private readonly vignette: FullScreenVignetteView;

    private enemies: GameNpcView[] = [];

    public map: GameMapView;

    public constructor(private player: Player) {
        super();

        this.timer = new TimeBarView();
        this.timer.position.set(284, 5);
        this.addChild(this.timer);

        this.skillSimple = new SkillSelectorView("attack_simple", "LightAttack");
        this.skillComplex = new SkillSelectorView("attack_complex", "AreaAttack");
        this.skillSimple.position.set(480, gameCanvasSize.height - 160);
        this.skillComplex.position.set(640, gameCanvasSize.height - 160);
        this.addChild(this.skillSimple, this.skillComplex);

        this.transitionOverlay = new PhaseTransitionView();
        this.transitionOverlay.position.set(240, 220);
        this.addChild(this.transitionOverlay);

        this.patternView = new PatternView();
        this.patternView.position.set(gesturePatternViewOffset.x, gesturePatternViewOffset.y);
        this.addChild(this.patternView);

        this.flash = new FullScreenFlashView();
        this.vignette = new FullScreenVignetteView();
        this.addChild(this.flash, this.vignette);

        autoDisposeOnDisplayObjectRemoved(this, autoDisposingAutorun => {
            autoDisposingAutorun(this.updateEnemies.bind(this));
            autoDisposingAutorun(this.updatePlayer.bind(this));
            autoDisposingAutorun(this.updateTimer.bind(this));
            autoDisposingAutorun(this.updatePattern.bind(this));
            autoDisposingAutorun(this.updateHitAnimation.bind(this));
        });
    }

    public activate() {
        this.visible = true;
    }

    public deactivate() {
        const win = gameStore.gameEngine?.gameState?.playerHealth > 0;
        if (!win) {
            // enemies reset
            this.enemies.forEach(e => e.showAfterFight());
        }
        this.visible = false;
    }

    public addEnemies(enemies: GameNpcView[]) {
        this.enemies = enemies;
    }

    private updateEnemies() {
        if (combatStore.active) {
            for (let i = 0; i < this.enemies.length; i++) {
                this.updateEnemy(this.enemies[i], combatStore.enemies[i]);
            }
        }
    }

    public updateEnemy(npc: GameNpcView, enemy: Enemy) {
        if (!enemy)
            return;

        if (enemy.activityTimerTicks > 0) {
            if (combatStore.expectedGestures) {
                if (npc.updateHealth(enemy.health / enemy.hitPoints)) {
                    npc.playShortSlashEffect();
                }
            }
            if (combatStore.attacking) {
                this.map.shakeX(((enemy.activityTimerTicks / 2) % 4));
                this.flash.flash(enemy.activityTimerTicks);
            }
            npc.shakeX(((enemy.activityTimerTicks / 4) % 8) / 50);
        } else {
            npc.updateHealth(enemy.health / enemy.hitPoints);
        }
    }

    private updatePlayer() {
        if (!combatStore.active)
            return;

        const { activeSkill: activeSkill, player } = combatStore;

        if (player.activityTimerTicks > 0) {
            this.player.shakeX(((player.activityTimerTicks / 4) % 8) / 50);
            this.map.shakeX(((player.activityTimerTicks / 2) % 4));
            this.flash.flash(player.activityTimerTicks);
        } else {
            if (combatStore.inTransition) {
                this.patternView.stopAnimate();
            }
        }

        if (activeSkill.name === "attack_complex") {
            this.skillComplex.activate();
            this.skillSimple.deactivate();
        } else {
            this.skillComplex.deactivate();
            this.skillSimple.activate();
        }
    }

    private updateTimer() {
        if (!combatStore.active)
            return;

        const { inTransition, currentPhase, currentPhaseLength, currentTimerStart, currentTimerTicks: currentTimer, expectedGestures, failedGestureCooldownTicks: failedGestureCooldown, player } = combatStore;

        if (inTransition) {
            this.player.showShield(false);
            this.transitionOverlay.startTransition(currentPhase, currentPhaseLength);
            this.timer.reset(currentPhase, currentPhaseLength);
        } else {
            this.transitionOverlay.endTransition();
            this.timer.reduce(currentTimer / currentTimerStart);
        }
        if (failedGestureCooldown > 0) {
            this.map.shakeX(((failedGestureCooldown / 2) % 4));
        }

        this.vignette.reset();
        if (!inTransition) {
            if (expectedGestures && !combatStore.patternCompleted()) {
                if (combatStore.attacking) {
                    // an attack pattern was started... preasure to finish it
                    this.vignette.fill(currentTimer, 0x5555EE);
                } else if (expectedGestures.some(g => g == null) && !player.lostHealth) {
                    // defense not yet finished
                    this.vignette.fill(currentTimer, 0xEE5555);
                }
            }
        }
    }

    private updatePattern() {
        if (!combatStore.active)
            return;

        const { attacking, expectedGestures, finishedGesture, finishedPattern, expectedKeySequence } = combatStore;

        const keyInput = gameStore.accessibilityOptions && expectedKeySequence?.length > 0 ? expectedKeySequence[0] : "";
        this.patternView.setGestures(expectedGestures, finishedGesture, finishedPattern, keyInput, attacking ? 0x00008B : 0xFF0000);

        if (!attacking && finishedGesture && !combatStore.patternCompleted()) {
            soundCache.playOneOf(CombatSounds.ROUND_DEFENSE_SHORT);
        }
    }

    private updateHitAnimation() {
        if (!combatStore.active)
            return;

        const { attacking, currentHitAnimationTimerTicks: currentHitAnimationTimer } = combatStore;
        if (currentHitAnimationTimer > 0) {
            if (attacking) {
                for (let i = 0; i < this.enemies.length; i++) {
                    const enemy = combatStore.enemies[i];
                    if (enemy.activityTimerTicks > 0) {
                        const view = this.enemies[i];
                        const deltaX = view.baseTileX - this.player.baseTileX;
                        const deltaY = view.baseTileY - this.player.baseTileY;
                        this.patternView.animate(currentHitAnimationTimer, deltaX, deltaY);
                        break;
                    }
                }
            } else {
                this.patternView.animate(currentHitAnimationTimer, 0, 0);
                this.player.showShield(!combatStore.player.lostHealth);
            }
        } else {
            if (this.patternView.stopAnimate()) {
                if (attacking) {
                    for (let i = 0; i < this.enemies.length; i++) {
                        const view = this.enemies[i];
                        const enemy = combatStore.enemies[i];
                        if (view.updateHealth(enemy.health / enemy.hitPoints)) {
                            if (combatStore.activeSkill.name === "attack_simple") {
                                view.playSlashEffect();
                                break;
                            } else if (combatStore.activeSkill.name === "attack_complex") {
                                this.flash.start(0xFFFFFF, 60);
                                view.playAreaEffect();
                            }
                        }
                    }

                } else {
                    if (combatStore.player.lostHealth) {
                        this.player.playSlashEffect(true);
                        this.flash.start(0xFF0000, 24);
                    } else {
                        this.player.playSlashEffect(false);
                    }
                }
            }
        }

    }
}
