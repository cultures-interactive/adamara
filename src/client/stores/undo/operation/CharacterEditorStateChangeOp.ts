import { executeUndoableOperation } from "../UndoStore";
import { UndoableOperation } from "../UndoableOperation";
import { CharacterEditorStore } from "../../CharacterEditorStore";

export function undoableCharacterEditorSelectSkinClass(skinClassName: string, store: CharacterEditorStore) {
    executeUndoableOperation(new CharacterEditorStateChangeOp(skinClassName, store, "charEditorSkinClassSelected"));
}

class CharacterEditorStateChangeOp extends UndoableOperation {

    private readonly previousClass: string;

    public constructor(private targetClass: string, private store: CharacterEditorStore, operationNameI18nKey: string) {
        super(operationNameI18nKey);
        this.previousClass = store.animationSelectionStore.selectedSkinClass;
    }

    public async execute() {
        this.store.animationSelectionStore.setSelectedSkinClass(this.targetClass);
    }

    public async reverse() {
        this.store.animationSelectionStore.setSelectedSkinClass(this.previousClass);
    }
}
