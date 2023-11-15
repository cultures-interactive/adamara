import { AugmentedPatch } from "../../../../shared/helper/mobXHelpers";
import { editorClient } from "../../../communication/EditorClient";
import { translationStore } from "../../TranslationStore";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableMakeshiftTranslationSystemDataSubmitChanges(patch: AugmentedPatch, inversePatch: AugmentedPatch) {
    // Don't create undo entries while translations are importing
    if (translationStore.isImporting)
        return;

    executeUndoableOperation(new MakeshiftTranslationSystemDataSubmitChangesOp(patch, inversePatch));
}

class MakeshiftTranslationSystemDataSubmitChangesOp extends UndoableOperation {
    public constructor(
        public patch: AugmentedPatch,
        public inversePatch: AugmentedPatch
    ) {
        super("updateMakeshiftTranslationSystemData");
    }

    public async execute(isRedo: boolean) {
        await editorClient.submitMakeshiftTranslationSystemDataChanges(this.patch, this.inversePatch);
        if (isRedo) {
            editorClient.patch(translationStore.makeshiftTranslationSystemData, this.patch);
        }
    }

    public async reverse() {
        await editorClient.submitMakeshiftTranslationSystemDataChanges(this.inversePatch, this.patch);
        editorClient.patch(translationStore.makeshiftTranslationSystemData, this.inversePatch);
    }
}