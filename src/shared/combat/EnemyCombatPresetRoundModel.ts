import { computed } from "mobx";
import { model, Model, modelAction, objectMap, prop, SnapshotOutOf } from "mobx-keystone";
import { CombatPhaseLength } from "./CombatPhaseLength";

@model("combat/EnemyCombatPresetRoundModel")
export class EnemyCombatPresetRoundModel extends Model({
    playerAttackPhaseLength: prop<CombatPhaseLength>(() => CombatPhaseLength.Short).withSetter(),
    playerDefensePhaseLength: prop<CombatPhaseLength>(() => CombatPhaseLength.Short).withSetter(),

    // We're simulating a set here by never setting any value to false.
    // Using ArraySet/ asSet is not a good option here, as it doesn't work well with undo/redo.
    playerDefenseGesturePatternIdsAsMap: prop(() => objectMap<boolean>())
}) {
    @modelAction
    public togglePlayerDefensePatternId(id: string) {
        if (this.playerDefenseGesturePatternIdsAsMap.has(id)) {
            this.playerDefenseGesturePatternIdsAsMap.delete(id);
        } else {
            this.playerDefenseGesturePatternIdsAsMap.set(id, true);
        }
    }

    public hasPlayerDefensePatternId(id: string) {
        return this.playerDefenseGesturePatternIdsAsMap.has(id);
    }

    @computed
    public get playerDefenseGesturePatternIds() {
        return [...this.playerDefenseGesturePatternIdsAsMap.keys()];
    }
}

export type EnemyCombatPresetRoundSnapshot = SnapshotOutOf<EnemyCombatPresetRoundModel>;