import { model, Model, prop, SnapshotOutOf } from "mobx-keystone";
import { GesturePatternModel } from "./gestures/GesturePatternModel";

@model("combat/PlayerAttackModel")
export class PlayerAttackModel extends Model({
    name: prop<string>("").withSetter(),
    damage: prop<number>(0).withSetter(),
    cooldown: prop<number>(0).withSetter(),
    hitAnimationDuration: prop<number>(0.4).withSetter(),
    pattern: prop<GesturePatternModel>(() => new GesturePatternModel({}))
}) {
}

export type PlayerAttackSnapshot = SnapshotOutOf<PlayerAttackModel>;