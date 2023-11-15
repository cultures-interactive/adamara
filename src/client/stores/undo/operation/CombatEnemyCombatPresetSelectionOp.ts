import { TranslatedError } from "../../../../shared/definitions/errors/TranslatedError";
import { combatEditorStore } from "../../CombatEditorStore";
import { combatStore } from "../../CombatStore";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableSelectEnemyCombatPreset(id: string) {
    executeUndoableOperation(new CombatEnemyCombatPresetSelectionOp(id));
}

export function undoableDeselectEnemyCombatPreset() {
    executeUndoableOperation(new CombatEnemyCombatPresetSelectionOp(null));
}

export function selectEnemyCombatPreset(id: string) {
    if (id && !combatStore.config.findEnemyCombatPreset(id))
        throw new TranslatedError("editor.error_enemy_combat_preset_does_not_exist");

    combatEditorStore.setSelectedEnemyCombatPreset(id);
}

class CombatEnemyCombatPresetSelectionOp extends UndoableOperation {
    private readonly previousId: string;

    public constructor(
        private readonly id: string
    ) {
        super("combatEnemyCombatPresetSelection" + (!id ? "Clear" : ""));

        this.previousId = combatEditorStore.selectedEnemyCombatPresetId;
    }

    public async execute() {
        selectEnemyCombatPreset(this.id);
    }

    public async reverse() {
        selectEnemyCombatPreset(this.previousId);
    }
}