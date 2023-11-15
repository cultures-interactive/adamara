import { makeAutoObservable } from "mobx";
import { Point } from "pixi.js";
import { CircleGestureModel } from "../../shared/combat/gestures/CircleGestureModel";
import { LineGestureModel } from "../../shared/combat/gestures/LineGestureModel";
import { Gesture } from "../../shared/combat/gestures/GesturePatternModel";
import { StaticAssetLoader } from "../canvas/loader/StaticAssetLoader";
import { CombatConfigurationModel } from "../../shared/combat/CombatConfigurationModel";
import { PlayerAttackModel } from "../../shared/combat/PlayerAttackModel";
import { CombatPhaseLength } from "../../shared/combat/CombatPhaseLength";
import { editorClient } from "../communication/EditorClient";
import { gameStore } from "./GameStore";
import { CombatSounds } from "../canvas/game/combat/CombatSounds";
import { soundCache } from "./SoundCache";

const ticksPerSecond = 60;
const keyStrokesPerSecond = 1;
const patternYCoordinateFactor = 1000;
export const screenToPatternCoordinatesFactor = 9;
export const gesturePatternViewOffset = {
    x: 190,
    y: 100
};

export enum CombatPhase {
    Attack,
    Defense,
    FirstAttack,
    WinCombat,
    LooseCombat
}

export class CombatStore {

    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public config: CombatConfigurationModel;
    public player: Player;
    public enemies: Enemy[] = [];

    public activeSkill: PlayerAttackModel;

    public currentPhase: CombatPhase;
    private enemyIndex: number;
    public inTransition: boolean;
    public currentTimerStart: number;
    public currentTimerTicks: number;
    public currentHitAnimationTimerTicks: number;
    public failedGestureCooldownTicks: number;
    public patternSuccessCooldownTicks: number;

    public expectedGestures: Gesture[];
    public expectedKeySequence: string[];
    public finishedGesture: Gesture;
    public finishedPattern: Gesture[];
    private currentGestureAnalysis: Set<number>[];
    private currentCooldown: number;
    private currentHitAnimationDuration: number;
    private currentPrecision: number;
    private currentMissTollerance: number;
    private misses: number;
    private gesturePerformed = false;

    private finishArenaFight: () => void;

    public get hasConfig() {
        return !!this.config;
    }

    public setConfig(config: CombatConfigurationModel) {
        if (this.config === config)
            return;

        if (this.config) {
            editorClient.stopTrackingCombatConfiguration();
        }

        this.config = config;

        if (this.config) {
            editorClient.startTrackingCombatConfiguration();
        }
    }

    public start(enemies: Enemy[], finishArenaFight: () => void) {
        this.player = new Player();
        this.enemies = enemies;
        this.enemyIndex = 0;
        this.player.activityTimerTicks = 0;
        this.currentCooldown = 0;
        this.currentHitAnimationTimerTicks = 0;
        this.patternSuccessCooldownTicks = 0;
        this.inTransition = true;
        this.setCurrentPhase(CombatPhase.FirstAttack);
        this.restartTimer(this.config.phaseTransitionDuration);
        this.currentGestureAnalysis = [];
        this.activeSkill = this.config.playerAttacks.find(a => a.name === "attack_simple");
        this.finishArenaFight = finishArenaFight;
        this.resetPattern();
    }

    public setSkill(id: string) {
        this.activeSkill = this.config.playerAttacks.find(a => a.name === id);
        if (this.attacking && !this.inColldown()) {
            if (this.expectedGestures?.some(g => g == null)) {
                this.gestureFailed();
            } else {
                this.resetPattern();
            }
        }
    }

    public get active(): boolean {
        return this.enemies.length > 0;
    }

    public get attacking() {
        return this.currentPhase === CombatPhase.Attack || this.currentPhase === CombatPhase.FirstAttack;
    }

    public get currentPhaseLength(): CombatPhaseLength {
        const currentRound = this.currentRound;
        return this.attacking ? currentRound.playerAttackPhaseLength : currentRound.playerDefensePhaseLength;
    }

    private get currentEnemy() {
        return this.enemies[this.enemyIndex];
    }

    private get currentCombatPreset() {
        return this.config.enemyCombatPresets.find(preset => preset.$modelId === this.currentEnemy.combatPresetId);
    }

    private get currentRound() {
        return this.currentCombatPreset.rounds[this.currentEnemy.round];
    }


    private get currentPattern() {
        if (this.attacking) {
            return this.activeSkill.pattern;
        } else {
            if (!this.currentEnemy.defensePatternId) {
                // first defense phase in this fight
                this.currentEnemy.chooseNewRandomDefensePattern(this.currentRound.playerDefenseGesturePatternIds);
            }
            return this.config.findGesturePattern(this.currentEnemy.defensePatternId);
        }
    }

    private finish() {
        const win = this.enemies.every(e => !e.alive);
        if (win) {
            this.enemies.forEach(e => gameStore.gameEngine.gameState.defeatedEnemies.add(e.elementId));
        } else {
            gameStore.gameEngine.gameState.setPlayerHealth(0);
        }
        this.enemies = [];
        this.finishArenaFight();

        this.finishArenaFight = null;
    }

    private restartTimer(time: number) {
        this.currentTimerStart = time * ticksPerSecond;
        this.currentTimerTicks = this.currentTimerStart;
    }

    private resetPattern() {
        this.misses = 0;
        this.currentGestureAnalysis = [];
        this.finishedGesture = null;
        this.finishedPattern = null;
        if (!this.inTransition) {
            const patternDefinition = this.currentPattern;
            this.setExpectedGestures(patternDefinition.gestures.slice());
            this.expectedKeySequence = patternDefinition.keySequence.split("");
            this.currentPrecision = patternDefinition.precision;
            this.currentMissTollerance = patternDefinition.missTolerance;
            if (this.attacking) {
                this.currentCooldown = this.activeSkill.cooldown;
                this.currentHitAnimationDuration = this.activeSkill.hitAnimationDuration;
            } else {
                this.currentCooldown = 1;
                this.currentHitAnimationDuration = 0.8;
            }
        } else {
            this.setExpectedGestures(null);
            this.expectedKeySequence = null;
        }
    }

    private inColldown() {
        if (!this.enemies)
            return false;

        // Cooldown: pattern finished/failed but not yet ready to start new pattern
        return this.patternSuccessCooldownTicks > 0 || this.failedGestureCooldownTicks > 0 || this.currentTimerTicks < ticksPerSecond + 10;
    }

    public reduceTimer(deltaTimeTicks: number) {
        this.player.activityTimerTicks -= deltaTimeTicks;
        this.failedGestureCooldownTicks -= deltaTimeTicks;
        this.currentHitAnimationTimerTicks -= deltaTimeTicks;
        this.patternSuccessCooldownTicks -= deltaTimeTicks;
        if (!this.expectedGestures && !this.inColldown()) {
            // last pattern was completed (or failed) and cooldown is over
            this.resetPattern();
        }

        if (this.checkFinished() && this.currentPhase !== CombatPhase.WinCombat && this.currentPhase !== CombatPhase.LooseCombat) {
            const gameOver = gameStore.gameEngine.gameState.playerHealth <= 1;
            this.setCurrentPhase(gameOver ? CombatPhase.LooseCombat : CombatPhase.WinCombat);
            this.inTransition = true;
            this.restartTimer(gameOver ? 3 : this.config.phaseTransitionDuration);
            this.resetPattern();
            return;
        }

        if (gameStore.accessibilityOptions && this.expectedGestures) {
            if (this.gesturePerformed) {
                this.currentTimerTicks -= ticksPerSecond / keyStrokesPerSecond;
            }
        } else {
            this.currentTimerTicks -= deltaTimeTicks;
        }

        if (this.currentTimerTicks <= 0) {
            if (this.attacking && this.expectedGestures?.some(g => g == null)) {
                this.gestureFailed();
                return;
            }
            if (this.currentPhase === CombatPhase.WinCombat || this.currentPhase === CombatPhase.LooseCombat) {
                this.finish();
                return;
            }
            this.inTransition = !this.inTransition;
            if (this.inTransition) {
                this.transitionToNextPhase();
            } else {
                this.startCurrentPhase();
            }
        }

        this.enemies.forEach(e => this.enemyActivity(e, deltaTimeTicks));

        this.setGesturePerformed(false);
    }

    private checkFinished() {
        return this.enemies.every(e => !e.alive) || gameStore.gameEngine.gameState.playerHealth <= 1;
    }

    private transitionToNextPhase() {
        this.enemies.forEach(e => e.activityTimerTicks = 0);
        this.failedGestureCooldownTicks = 0;
        this.player.setLostHealth(false);

        this.restartTimer(this.config.phaseTransitionDuration);
        if (this.attacking) {
            this.setCurrentPhase(CombatPhase.Defense);
        } else {
            this.setCurrentPhase(CombatPhase.Attack);
        }
        this.resetPattern();
    }

    private startCurrentPhase() {
        if (this.attacking) {
            this.startNextEnemyRoundAttack();
        } else {
            this.startNextEnemyRoundDefend();
        }
        this.resetPattern();
    }

    private nextEnemyIndex() {
        if (this.enemyIndex + 1 === this.enemies.length)
            return 0;

        return this.enemyIndex + 1;
    }

    private selectNextActiveEnemy() {
        // select the next enemy that is still alive
        this.enemyIndex = this.nextEnemyIndex();
        while (!this.enemies[this.enemyIndex].alive) {
            this.enemyIndex = this.nextEnemyIndex();
        }

        // select next round for chosen enemy
        this.currentEnemy.nextRound(this.currentCombatPreset.rounds.length);
        this.currentEnemy.chooseNewRandomDefensePattern(this.currentRound.playerDefenseGesturePatternIds);
    }

    private startNextEnemyRoundAttack() {
        this.selectNextActiveEnemy();

        const phaseDuration = this.currentRound.playerAttackPhaseLength === CombatPhaseLength.Short
            ? this.config.shortPhaseDuration
            : this.config.longPhaseDuration;
        this.restartTimer(phaseDuration);
    }

    private startNextEnemyRoundDefend() {
        const phaseDuration = this.currentRound.playerDefensePhaseLength === CombatPhaseLength.Short
            ? this.config.shortPhaseDuration
            : this.config.longPhaseDuration;
        this.restartTimer(phaseDuration);
        this.currentEnemy.activityTimerTicks = phaseDuration * ticksPerSecond;
    }

    // ==  Methods to handle pattern inputs from the 'Game'
    public gestureStart() {
        if (!this.expectedGestures)
            return;

        this.currentGestureAnalysis = this.expectedGestures.map(gesture => {
            if (gesture instanceof LineGestureModel) {
                return this.pointsOnLine(gesture);
            }
            if (gesture instanceof CircleGestureModel) {
                return this.pointsOnCircle(gesture);
            }
            return null;
        });
    }

    public gestureInput(p: Point) {
        const variation = this.currentPrecision;
        let gestureIndex = 0;

        const xPattern = Math.round(p.x);
        const yPattern = Math.round(p.y);

        let hit = false;

        for (const gesture of this.currentGestureAnalysis) {
            if (gesture) {
                for (let xvar = -variation; xvar < variation; xvar++) {
                    for (let yvar = -variation; yvar < variation; yvar++) {
                        const pos = xPattern + xvar + patternYCoordinateFactor * (yPattern + yvar);
                        hit = gesture.delete(pos) || hit;
                    }
                }
                if (gesture.size === 0) {
                    this.finishedGesture = this.expectedGestures[gestureIndex];
                    hit = true;
                    this.misses = 0;
                    if (this.expectedGestures) {
                        this.expectedGestures[gestureIndex] = null;
                        this.onGestureSuccess();
                    }
                    this.currentGestureAnalysis = [];
                    if (!this.patternCompleted()) {
                        this.doDamageOrDefend(false);
                    }
                    this.setGesturePerformed(true);
                    break;
                }
            }
            gestureIndex++;
        }

        if (this.patternCompleted()) {
            this.finishedPattern = this.currentPattern.gestures;
            this.doDamageOrDefend(true);
            this.setExpectedGestures(null);
        }

        if (this.currentGestureAnalysis.length > 0 && !hit) {
            this.misses++;
            if (this.misses > this.currentMissTollerance) {
                this.gestureFailed();
            }
        }
    }

    public gestureEnd() {
        this.finishedGesture = null;
        if (this.currentGestureAnalysis.length > 0) {
            this.gestureFailed();
        }
    }

    public keyInput(key: string) {
        if (!gameStore.accessibilityOptions)
            return;

        if (!this.expectedKeySequence || this.expectedKeySequence.length === 0)
            return;

        if (this.expectedKeySequence[0] === key) {
            this.expectedKeySequence.shift();
            if (!this.keySequenceCompleted()) {
                this.doDamageOrDefend(false);
            }
            this.onGestureSuccess();
        } else {
            this.gestureFailed();
            this.onGestureFailed();
            if (!this.attacking) {
                this.endDefensePhase(true);
            }
        }

        if (this.keySequenceCompleted()) {
            this.finishedPattern = this.currentPattern.gestures;
            this.doDamageOrDefend(true);
            this.setExpectedGestures(null);
            this.expectedKeySequence = null;
        }

        this.setGesturePerformed(true);
    }

    public patternCompleted() {
        return this.expectedGestures && this.expectedGestures.every(g => g == null);
    }

    private keySequenceCompleted() {
        return this.expectedKeySequence && this.expectedKeySequence.length === 0;
    }

    private gestureFailed() {
        this.failedGestureCooldownTicks = 0.5 * ticksPerSecond;
        if (this.attacking || this.currentTimerTicks > 1.5 * ticksPerSecond) {
            // only reset, if there is enough time to actually redo the pattern before the pattern animation
            this.misses = 0;
            this.setExpectedGestures(null);
            this.expectedKeySequence = null;
            this.currentGestureAnalysis = [];

            this.onGestureFailed();
        }
    }

    private pointsOnLine(gesture: LineGestureModel) {
        const result = new Set<number>();

        const xDirection = gesture.to.x > gesture.from.x ? 1 : -1;
        const yDirection = gesture.to.y > gesture.from.y ? 1 : -1;

        const distX = (gesture.to.x - gesture.from.x) * xDirection;
        const distY = (gesture.to.y - gesture.from.y) * yDirection;

        if (distX > distY) {
            const skew = distY / distX;
            for (let xDelta = 0; xDelta < distX; xDelta++) {
                const x = gesture.from.x + xDelta * xDirection;
                const y = gesture.from.y + Math.round(xDelta * skew) * yDirection;
                result.add(x + patternYCoordinateFactor * y);
            }
        } else {
            const skew = distX / distY;
            for (let yDelta = 0; yDelta < distY; yDelta++) {
                const x = gesture.from.x + Math.round(yDelta * skew) * xDirection;
                const y = gesture.from.y + yDelta * yDirection;
                result.add(x + patternYCoordinateFactor * y);
            }
        }
        return result;
    }

    private pointsOnCircle(gesture: CircleGestureModel) {
        const result = new Set<number>();

        const xc = gesture.center.x;
        const yc = gesture.center.y;

        let x = 0;
        let y = gesture.radius;
        let d = 3 - 2 * gesture.radius;

        while (y >= x) {
            result.add(xc + x + patternYCoordinateFactor * (yc + y));
            result.add(xc - x + patternYCoordinateFactor * (yc + y));
            result.add(xc + x + patternYCoordinateFactor * (yc - y));
            result.add(xc - x + patternYCoordinateFactor * (yc - y));
            result.add(xc + y + patternYCoordinateFactor * (yc + x));
            result.add(xc - y + patternYCoordinateFactor * (yc + x));
            result.add(xc + y + patternYCoordinateFactor * (yc - x));
            result.add(xc - y + patternYCoordinateFactor * (yc - x));

            x++;
            if (d > 0) {
                y--;
                d = d + 4 * (x - y) + 10;
            } else {
                d = d + 4 * x + 6;
            }
        }

        return result;
    }

    // ==  Methods to calculate the damage for the player or the enemies
    private gestureDamage(attackConfig: PlayerAttackModel) {
        return Math.ceil(attackConfig.damage * (1 - this.config.bonusDamage) / attackConfig.pattern.gestures.length);
    }

    private patternCompletionDamage(attackConfig: PlayerAttackModel) {
        // damage of the last gesture + completion bonus
        return attackConfig.damage + Math.ceil(attackConfig.damage * this.config.bonusDamage);
    }

    private doDamageOrDefend(patternCompleted: boolean) {
        if (this.attacking) {
            const multiplier = this.currentRound.playerAttackPhaseLength === CombatPhaseLength.Short
                ? this.config.shortPlayerAttackPhaseDamageMultiplier
                : this.config.longPlayerAttackPhaseDamageMultiplier;
            const damage = multiplier * (patternCompleted ? this.patternCompletionDamage(this.activeSkill) : this.gestureDamage(this.activeSkill));
            const doAreaDamage = this.activeSkill.name === "attack_complex";
            const allEnemiesAlive = this.enemies.filter(enemy => enemy.alive);
            const enemiesToAttack = doAreaDamage ? allEnemiesAlive : [this.currentEnemy];
            const cooldown = patternCompleted ? this.currentCooldown : 0.2;
            this.patternSuccessCooldownTicks = patternCompleted ? cooldown * ticksPerSecond : 0;

            enemiesToAttack.forEach(enemy => {
                enemy.health -= patternCompleted ? damage : Math.min(damage, enemy.health - 1); // keep enemy at '1' health if this is not completion damage (you need to complete a pattern to defeat)
                enemy.activityTimerTicks = patternCompleted ? (this.currentCooldown + StaticAssetLoader.animationProperties.effect_slash.animationDuration) * ticksPerSecond : ticksPerSecond * 0.5;
                if (enemy.health <= 0 && enemy === this.currentEnemy) {
                    this.selectNextActiveEnemy();
                }
            });

            if (patternCompleted) {
                // make sure enough time is left in phase to finish cooldown animation
                this.currentTimerTicks = Math.max(this.currentTimerTicks, cooldown * ticksPerSecond + ticksPerSecond);
            }
        } else if (patternCompleted) {
            // defense phase
            this.endDefensePhase(false);
        }
        if (patternCompleted) {
            this.currentHitAnimationTimerTicks = Math.min(this.currentHitAnimationDuration, this.currentCooldown) * ticksPerSecond;
        }
    }

    private endDefensePhase(letEnemyAttack: boolean) {
        this.player.activityTimerTicks = (this.currentCooldown + StaticAssetLoader.animationProperties.effect_slash.animationDuration) * ticksPerSecond;
        this.currentTimerTicks = this.player.activityTimerTicks; // end the defense phase early as the player defended successfully already
        this.enemies.forEach(e => {
            if (letEnemyAttack && e.activityTimerTicks > 0) {
                e.activityTimerTicks = 1;
            } else {
                e.activityTimerTicks = 0;
            }
        });
        this.patternSuccessCooldownTicks = this.currentTimerTicks + 5;
    }

    private enemyActivity(enemy: Enemy, deltaTimeTicks: number) {
        if (!enemy)
            return;

        if (enemy.activityTimerTicks <= 0)
            return;

        enemy.activityTimerTicks -= deltaTimeTicks;

        if (this.attacking)
            return;

        if (enemy.activityTimerTicks <= 0) {
            // an enemy is attacking in a defense phase
            const round = this.currentRound;
            const factor = round.playerDefensePhaseLength === CombatPhaseLength.Short ? 1 : this.config.longDefensePhaseDamageFactor;

            // we keep the player at "1" health when the fight is lost.
            // She will loose the last health point after the attack animation played.
            gameStore.gameEngine.gameState.changePlayerHealth(-enemy.damage * factor, 1);
            this.player.setLostHealth(true);

            this.player.activityTimerTicks = (this.currentCooldown + StaticAssetLoader.animationProperties.effect_slash.animationDuration) * ticksPerSecond;
            this.currentTimerTicks = this.player.activityTimerTicks;
            this.currentHitAnimationTimerTicks = Math.min(this.currentHitAnimationDuration, this.currentCooldown) * ticksPerSecond;
        }
    }

    public clear() {
        this.enemies = [];
    }

    public setCurrentPhase(combatPhaseToSet: CombatPhase) {
        const previousPhase = this.currentPhase;
        this.currentPhase = combatPhaseToSet; // apply it before calling handle change..
        if (combatPhaseToSet !== previousPhase) this.onCombatPhaseChange(combatPhaseToSet, previousPhase);
    }

    private setExpectedGestures(gestures: Gesture[]) {
        this.expectedGestures = gestures;
    }

    private setGesturePerformed(performed: boolean) {
        this.gesturePerformed = performed;
    }

    private allGesturesSucceeded() {
        return (this.expectedGestures && !this.expectedGestures.some(item => item != null));
    }

    private isActiveBombSkill() {
        return this.activeSkill?.name == "attack_complex";
    }

    private isActiveKnifeSkill() {
        return this.activeSkill?.name == "attack_simple";
    }

    private onGestureSuccess() {
        if (this.allGesturesSucceeded() || this.keySequenceCompleted()) {
            if (this.currentPhase === CombatPhase.Defense) {
                soundCache.playOneOf(CombatSounds.DEFENSE_SUCCESS);
            } else {
                if (this.isActiveBombSkill()) soundCache.playOneOf(CombatSounds.BOMB_ATTACK_SUCCESS);
                if (this.isActiveKnifeSkill()) soundCache.playOneOf(CombatSounds.KNIFE_ATTACK_SUCCESS);
            }
            return;
        }
        if (this.currentPhase === CombatPhase.Attack || this.currentPhase === CombatPhase.FirstAttack) {
            if (this.isActiveBombSkill()) soundCache.playOneOf(CombatSounds.BOMB_ATTACK_ATTEMPT);
            if (this.isActiveKnifeSkill()) soundCache.playOneOf(CombatSounds.KNIFE_ATTACK_ATTEMPT);
        }
        if (this.currentPhase === CombatPhase.Defense) soundCache.playOneOf(CombatSounds.DEFENSE_ATTEMPT);
    }

    private onGestureFailed() {
        if (this.currentPhase === CombatPhase.Attack || this.currentPhase === CombatPhase.FirstAttack) {
            if (this.isActiveBombSkill()) soundCache.playOneOf(CombatSounds.BOMB_ATTACK_FAILED_ATTEMPT);
            if (this.isActiveKnifeSkill()) soundCache.playOneOf(CombatSounds.KNIFE_ATTACK_FAILED_ATTEMPT);
        }
        if (this.currentPhase === CombatPhase.Defense) soundCache.playOneOf(CombatSounds.DEFENSE_ATTEMPT_FAILED);
    }

    private onCombatPhaseChange(current: CombatPhase, previous: CombatPhase) {
        const phaseLength = this.currentPhaseLength;
        if (current === CombatPhase.FirstAttack) soundCache.playOneOf(CombatSounds.START);
        if (current === CombatPhase.WinCombat) soundCache.playOneOf(CombatSounds.SUCCESS);
        if (current === CombatPhase.Defense) {
            if (phaseLength === CombatPhaseLength.Long) soundCache.playOneOf(CombatSounds.ROUND_DEFENSE_LONG);
            if (phaseLength === CombatPhaseLength.Short) soundCache.playOneOf(CombatSounds.ROUND_DEFENSE_SHORT);
        }
        if (current === CombatPhase.Attack) {
            if (phaseLength === CombatPhaseLength.Long) soundCache.playOneOf(CombatSounds.ROUND_ATTACK_LONG);
            if (phaseLength === CombatPhaseLength.Short) soundCache.playOneOf(CombatSounds.ROUND_ATTACK_SHORT);
        }
    }
}


// == Data classes for additional state of the player/enemies that is only needed during combat
export class Enemy {

    public constructor(
        public readonly elementId: string,
        public readonly x: number,
        public readonly y: number,
        public readonly hitPoints: number,
        public readonly combatPresetId: string,
        public readonly damage: number) {

        this.health = hitPoints;
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public activityTimerTicks = 0;
    public round = 0;
    public defensePatternId: string;
    public health: number;

    public get alive() {
        return this.health > 0 || this.activityTimerTicks > 0;
    }

    public nextRound(roundsAvailable: number) {
        this.round++;
        if (this.round === roundsAvailable) {
            this.round = 0;
        }
    }

    public chooseNewRandomDefensePattern(defensePatternIds: string[]) {
        // random defense pattern for round
        this.defensePatternId = defensePatternIds[Math.floor(Math.random() * defensePatternIds.length)];
    }
}

export class Player {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public activityTimerTicks = 0;
    public lostHealth = false;

    public setLostHealth(value: boolean) {
        if (!this.lostHealth && value) {
            soundCache.playOneOf(CombatSounds.PLAYER_LOST_HEALTH);
        }
        this.lostHealth = value;
    }
}

export const combatStore = new CombatStore();