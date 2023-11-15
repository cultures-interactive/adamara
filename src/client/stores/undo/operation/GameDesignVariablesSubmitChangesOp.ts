import { AugmentedPatch } from "../../../../shared/helper/mobXHelpers";
import { editorClient } from "../../../communication/EditorClient";
import { gameStore } from "../../GameStore";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableGameDesignVariablesSubmitChanges(patch: AugmentedPatch, inversePatch: AugmentedPatch) {
    executeUndoableOperation(new GameDesignVariablesSubmitChangesOp(patch, inversePatch));
}

class GameDesignVariablesSubmitChangesOp extends UndoableOperation {
    public constructor(
        public patch: AugmentedPatch,
        public inversePatch: AugmentedPatch
    ) {
        super("updateGameDesignVariables");
    }

    public async execute(isRedo: boolean) {
        await editorClient.submitGameDesignVariablesChanges(this.patch, this.inversePatch, isRedo);
        if (isRedo) {
            editorClient.patch(gameStore.gameDesignVariables, this.patch);
        }
    }

    public async reverse() {
        await editorClient.submitGameDesignVariablesChanges(this.inversePatch, this.patch, true);
        editorClient.patch(gameStore.gameDesignVariables, this.inversePatch);
    }
}