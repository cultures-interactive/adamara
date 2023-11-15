import { model, Model, modelAction, objectMap, prop, SnapshotOutOf } from "mobx-keystone";
import { CircleGestureModel } from "./gestures/CircleGestureModel";
import { LineGestureModel } from "./gestures/LineGestureModel";
import { GesturePointModel } from "./gestures/GesturePointModel";
import { PlayerAttackModel } from "./PlayerAttackModel";
import { GesturePatternModel } from "./gestures/GesturePatternModel";
import { EnemyCombatPresetModel } from "./EnemyCombatPresetModel";
import { EnemyCombatPresetRoundModel } from "./EnemyCombatPresetRoundModel";
import { CombatPhaseLength } from "./CombatPhaseLength";
import { TranslatedString } from "../game/TranslatedString";

@model("combat/CombatConfigurationModel/new")
export class CombatConfigurationModel extends Model({
    shortPhaseDuration: prop<number>(5).withSetter(),
    longPhaseDuration: prop<number>(10).withSetter(),
    shortPlayerAttackPhaseDamageMultiplier: prop<number>(1.2).withSetter(),
    longPlayerAttackPhaseDamageMultiplier: prop<number>(1).withSetter(),
    playerHealth: prop<number>(100).withSetter(),
    phaseTransitionDuration: prop<number>(2).withSetter(),
    bonusDamage: prop<number>(0.4).withSetter(),
    longDefensePhaseDamageFactor: prop<number>(1.2).withSetter(),

    playerAttacks: prop<PlayerAttackModel[]>(() => [
        new PlayerAttackModel({
            name: "attack_simple",
            damage: 10,
            cooldown: 0.2,
            hitAnimationDuration: 0.2,
            pattern: new GesturePatternModel({
                precision: 10,
                missTolerance: 100,
                keySequence: "WASD",
                gestures: [
                    new LineGestureModel({ from: new GesturePointModel({ x: 15, y: 0 }), to: new GesturePointModel({ x: 85, y: 20 }) }),
                    new LineGestureModel({ from: new GesturePointModel({ x: 40, y: 45 }), to: new GesturePointModel({ x: 85, y: 10 }) })
                ]
            })
        }),
        new PlayerAttackModel({
            name: "attack_complex",
            damage: 40,
            cooldown: 2,
            hitAnimationDuration: 1.5,
            pattern: new GesturePatternModel({
                precision: 7,
                missTolerance: 30,
                keySequence: "WASD",
                gestures: [
                    new CircleGestureModel({ center: new GesturePointModel({ x: 50, y: 25 }), radius: 25 }),
                    new LineGestureModel({ from: new GesturePointModel({ x: 35, y: 10 }), to: new GesturePointModel({ x: 47, y: 22 }) }),
                    new LineGestureModel({ from: new GesturePointModel({ x: 65, y: 10 }), to: new GesturePointModel({ x: 52, y: 22 }) }),
                    new LineGestureModel({ from: new GesturePointModel({ x: 65, y: 40 }), to: new GesturePointModel({ x: 52, y: 28 }) }),
                    new LineGestureModel({ from: new GesturePointModel({ x: 35, y: 40 }), to: new GesturePointModel({ x: 47, y: 28 }) }),
                    new LineGestureModel({ from: new GesturePointModel({ x: 5, y: 25 }), to: new GesturePointModel({ x: 30, y: 25 }) }),
                    new LineGestureModel({ from: new GesturePointModel({ x: 95, y: 25 }), to: new GesturePointModel({ x: 70, y: 25 }) }),
                ]
            })
        })
    ]),

    gesturePatterns: prop<GesturePatternModel[]>(() => [
        new GesturePatternModel({
            $modelId: "model-id-for-defense_1",
            //name: createTranslatedString("defense_2"),
            precision: 7,
            missTolerance: 40,
            gestures: [
                new LineGestureModel({ from: new GesturePointModel({ x: 10, y: 5 }), to: new GesturePointModel({ x: 10, y: 45 }) }),
                new LineGestureModel({ from: new GesturePointModel({ x: 50, y: 5 }), to: new GesturePointModel({ x: 50, y: 45 }) }),
                new LineGestureModel({ from: new GesturePointModel({ x: 90, y: 5 }), to: new GesturePointModel({ x: 90, y: 45 }) }),
            ]
        }),
        new GesturePatternModel({
            $modelId: "model-id-for-defense_2",
            //name: createTranslatedString("defense_2"),
            precision: 5,
            missTolerance: 40,
            gestures: [
                new LineGestureModel({ from: new GesturePointModel({ x: 5, y: 25 }), to: new GesturePointModel({ x: 30, y: 25 }) }),
                new CircleGestureModel({ center: new GesturePointModel({ x: 50, y: 25 }), radius: 15 }),
                new LineGestureModel({ from: new GesturePointModel({ x: 95, y: 25 }), to: new GesturePointModel({ x: 70, y: 25 }) })
            ]
        }),
        new GesturePatternModel({
            $modelId: "model-id-for-defense_3",
            //name: createTranslatedString("defense_3"),
            precision: 5,
            missTolerance: 40,
            gestures: [
                new CircleGestureModel({ center: new GesturePointModel({ x: 15, y: 25 }), radius: 15 }),
                new CircleGestureModel({ center: new GesturePointModel({ x: 85, y: 25 }), radius: 15 }),
                new LineGestureModel({ from: new GesturePointModel({ x: 30, y: 15 }), to: new GesturePointModel({ x: 45, y: 0 }) }),
                new LineGestureModel({ from: new GesturePointModel({ x: 30, y: 35 }), to: new GesturePointModel({ x: 45, y: 50 }) }),
                new LineGestureModel({ from: new GesturePointModel({ x: 70, y: 15 }), to: new GesturePointModel({ x: 55, y: 0 }) }),
                new LineGestureModel({ from: new GesturePointModel({ x: 70, y: 33 }), to: new GesturePointModel({ x: 55, y: 50 }) })
            ]
        }),
        new GesturePatternModel({
            $modelId: "model-id-for-defense_4",
            //name: createTranslatedString("defense_4"),
            precision: 10,
            missTolerance: 40,
            gestures: [
                new CircleGestureModel({ center: new GesturePointModel({ x: 25, y: 25 }), radius: 1 }),
                new CircleGestureModel({ center: new GesturePointModel({ x: 75, y: 25 }), radius: 1 }),
                new CircleGestureModel({ center: new GesturePointModel({ x: 50, y: 5 }), radius: 1 }),
                new CircleGestureModel({ center: new GesturePointModel({ x: 50, y: 45 }), radius: 1 }),
            ]
        }),
        new GesturePatternModel({
            $modelId: "model-id-for-defense_5",
            //name: createTranslatedString("defense_5"),
            precision: 15,
            missTolerance: 40,
            gestures: [
                new CircleGestureModel({ center: new GesturePointModel({ x: 50, y: 25 }), radius: 20 }),
                new CircleGestureModel({ center: new GesturePointModel({ x: 2, y: 1 }), radius: 1 }),
                new CircleGestureModel({ center: new GesturePointModel({ x: 2, y: 49 }), radius: 1 }),
                new CircleGestureModel({ center: new GesturePointModel({ x: 98, y: 1 }), radius: 1 }),
                new CircleGestureModel({ center: new GesturePointModel({ x: 98, y: 49 }), radius: 1 }),
                new LineGestureModel({ from: new GesturePointModel({ x: 10, y: 3 }), to: new GesturePointModel({ x: 10, y: 46 }) }),
                new LineGestureModel({ from: new GesturePointModel({ x: 12, y: 48 }), to: new GesturePointModel({ x: 88, y: 48 }) }),
                new LineGestureModel({ from: new GesturePointModel({ x: 12, y: 2 }), to: new GesturePointModel({ x: 88, y: 2 }) }),
                new LineGestureModel({ from: new GesturePointModel({ x: 90, y: 3 }), to: new GesturePointModel({ x: 90, y: 46 }) })
            ]
        })
    ]),

    enemyCombatPresets: prop<EnemyCombatPresetModel[]>(() => [
        new EnemyCombatPresetModel({
            $modelId: "model-id-for-eimerkrabbe",
            name: createTranslatedString("Eimerkrabbe"),
            rounds: [
                new EnemyCombatPresetRoundModel({
                    playerAttackPhaseLength: CombatPhaseLength.Short,
                    playerDefensePhaseLength: CombatPhaseLength.Long,
                    playerDefenseGesturePatternIdsAsMap: createGesturePatternIdMap([
                        "model-id-for-defense_1",
                        "model-id-for-defense_2"
                    ])
                })
            ]
        }),
        new EnemyCombatPresetModel({
            $modelId: "model-id-for-schrottkroete",
            name: createTranslatedString("Schrottkröte"),
            rounds: [
                new EnemyCombatPresetRoundModel({
                    playerAttackPhaseLength: CombatPhaseLength.Long,
                    playerDefensePhaseLength: CombatPhaseLength.Short,
                    playerDefenseGesturePatternIdsAsMap: createGesturePatternIdMap([
                        "model-id-for-defense_3"
                    ])
                }),
                new EnemyCombatPresetRoundModel({
                    playerAttackPhaseLength: CombatPhaseLength.Long,
                    playerDefensePhaseLength: CombatPhaseLength.Long,
                    playerDefenseGesturePatternIdsAsMap: createGesturePatternIdMap([
                        "model-id-for-defense_4"
                    ])
                })
            ]
        })
    ])
}) {
    @modelAction
    public addEnemyCombatPreset(preset: EnemyCombatPresetModel) {
        this.enemyCombatPresets.push(preset);
    }

    @modelAction
    public removeEnemyCombatPreset(preset: EnemyCombatPresetModel) {
        const index = this.enemyCombatPresets.indexOf(preset);
        if (index !== -1) {
            this.enemyCombatPresets.splice(index, 1);
        }
    }

    public findEnemyCombatPreset(id: string) {
        if (!id)
            return null;

        return this.enemyCombatPresets.find(preset => preset.$modelId === id);
    }

    @modelAction
    public addGesturePattern(preset: GesturePatternModel) {
        this.gesturePatterns.push(preset);
    }

    @modelAction
    public removeGesturePattern(preset: GesturePatternModel) {
        const index = this.gesturePatterns.indexOf(preset);
        if (index !== -1) {
            this.gesturePatterns.splice(index, 1);
        }
    }

    public findGesturePattern(id: string) {
        if (!id)
            return null;

        return this.gesturePatterns.find(pattern => pattern.$modelId === id);
    }
}

function createTranslatedString(name: string) {
    return new TranslatedString({ text: objectMap<string>([["de", name]]) });
}

function createGesturePatternIdMap(ids: string[]) {
    return objectMap<boolean>(ids.map(id => [id, false]));
}

export type CombatConfigurationSnaphot = SnapshotOutOf<CombatConfigurationModel>;
