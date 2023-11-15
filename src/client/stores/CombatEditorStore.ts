import { makeAutoObservable } from "mobx";
import { combatStore } from "./CombatStore";

export class CombatEditorStore {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public selectedEnemyCombatPresetId: string;
    public selectedGesturePatternId: string;
    public showEnemyCombatPresetGesturePatternSelectionRoundModelId: string;

    public get selectedEnemyCombatPreset() {
        return combatStore.config?.findEnemyCombatPreset(this.selectedEnemyCombatPresetId);
    }

    public setSelectedEnemyCombatPreset(id: string) {
        if (this.selectedEnemyCombatPresetId == id)
            return;

        this.selectedEnemyCombatPresetId = id;
        this.showEnemyCombatPresetGesturePatternSelectionRoundModelId = null;
    }

    public clearSelectedEnemyCombatPreset() {
        this.selectedEnemyCombatPresetId = null;
    }

    public get selectedGesturePattern() {
        return combatStore.config?.findGesturePattern(this.selectedGesturePatternId);
    }

    public setSelectedGesturePattern(id: string) {
        this.selectedGesturePatternId = id;
    }

    public clearSelectedGesturePattern() {
        this.selectedGesturePatternId = null;
    }

    public setShowEnemyCombatPresetGesturePatternSelectionModelId(roundModelId: string) {
        this.showEnemyCombatPresetGesturePatternSelectionRoundModelId = roundModelId;
    }

    public clear() {
        this.selectedEnemyCombatPresetId = null;
        this.selectedGesturePatternId = null;
    }
}

export const combatEditorStore = new CombatEditorStore();