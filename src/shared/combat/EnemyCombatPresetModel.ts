import { model, Model, modelAction, prop, SnapshotOutOf } from "mobx-keystone";
import { TranslatedString } from "../game/TranslatedString";
import { TranslateableEntityData } from "../translation/TranslationDataTypes";
import { EnemyCombatPresetRoundModel } from "./EnemyCombatPresetRoundModel";

@model("combat/EnemyCombatPresetModel")
export class EnemyCombatPresetModel extends Model({
    name: prop<TranslatedString>(() => new TranslatedString({})),
    rounds: prop<EnemyCombatPresetRoundModel[]>(() => [])
}) {
    @modelAction
    public addRound() {
        this.rounds.push(new EnemyCombatPresetRoundModel({}));
    }

    @modelAction
    public removeRound(index: number) {
        this.rounds.splice(index, 1);
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Enemy Combat Preset",
            translateableStrings: [
                { label: "Name", translatedString: this.name }
            ]
        } as TranslateableEntityData;
    }
}

export type EnemyCombatPresetSnapshot = SnapshotOutOf<EnemyCombatPresetModel>;