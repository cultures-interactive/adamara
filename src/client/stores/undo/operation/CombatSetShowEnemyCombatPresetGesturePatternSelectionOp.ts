import { EnemyCombatPresetRoundModel } from "../../../../shared/combat/EnemyCombatPresetRoundModel";
import { combatEditorStore } from "../../CombatEditorStore";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableSetShowEnemyCombatPresetGesturePatternSelection(round: EnemyCombatPresetRoundModel) {
    executeUndoableOperation(new CombatSetShowEnemyCombatPresetGesturePatternSelectionOp(round.$modelId));
}

export function undoableClearShowEnemyCombatPresetGesturePatternSelection() {
    executeUndoableOperation(new CombatSetShowEnemyCombatPresetGesturePatternSelectionOp(null));
}

class CombatSetShowEnemyCombatPresetGesturePatternSelectionOp extends UndoableOperation {
    private readonly previousRoundModelId: string;

    public constructor(
        private readonly roundModelId: string
    ) {
        super("combatSetShowEnemyCombatPresetGesturePatternSelection/" + (roundModelId ? "open" : "close"));
        this.previousRoundModelId = combatEditorStore.showEnemyCombatPresetGesturePatternSelectionRoundModelId;
    }

    public async execute() {
        combatEditorStore.setShowEnemyCombatPresetGesturePatternSelectionModelId(this.roundModelId);
    }

    public async reverse() {
        combatEditorStore.setShowEnemyCombatPresetGesturePatternSelectionModelId(this.previousRoundModelId);
    }
}