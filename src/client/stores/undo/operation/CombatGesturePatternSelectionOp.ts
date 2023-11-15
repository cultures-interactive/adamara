import { TranslatedError } from "../../../../shared/definitions/errors/TranslatedError";
import { combatEditorStore } from "../../CombatEditorStore";
import { combatStore } from "../../CombatStore";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableSelectGesturePattern(id: string) {
    executeUndoableOperation(new CombatGesturePatternSelectionOp(id));
}

export function undoableDeselectGesturePattern() {
    executeUndoableOperation(new CombatGesturePatternSelectionOp(null));
}

export function selectGesturePattern(id: string) {
    if (id && !combatStore.config.findGesturePattern(id))
        throw new TranslatedError("editor.error_gesture_pattern_does_not_exist");

    combatEditorStore.setSelectedGesturePattern(id);
}

class CombatGesturePatternSelectionOp extends UndoableOperation {
    private readonly previousId: string;

    public constructor(
        private readonly id: string
    ) {
        super("combatGesturePatternSelection" + (!id ? "Clear" : ""));

        this.previousId = combatEditorStore.selectedGesturePatternId;
    }

    public async execute() {
        selectGesturePattern(this.id);
    }

    public async reverse() {
        selectGesturePattern(this.previousId);
    }
}