import { CharacterEditorStore } from "../../CharacterEditorStore";
import { executeUndoableOperation } from "../UndoStore";
import { UndoableOperation } from "../UndoableOperation";
import { TranslatedError } from "../../../../shared/definitions/errors/TranslatedError";
import { sharedStore } from "../../SharedStore";

export function undoableCharacterEditorSelectCharacter(characterId: number, store: CharacterEditorStore) {
    executeUndoableOperation(new CharacterEditorSelectCharacterOp(characterId, store, "charEditorCharacterSelected"));
}

export function undoableCharacterEditorDeselectCharacter(store: CharacterEditorStore) {
    executeUndoableOperation(new CharacterEditorSelectCharacterOp(null, store, "charEditorCharacterSelected"));
}

class CharacterEditorSelectCharacterOp extends UndoableOperation {
    private readonly previousCharId: number;

    public constructor(private charIdToSelect: number, private store: CharacterEditorStore, operationNameI18nKey: string) {
        super(operationNameI18nKey);
        this.previousCharId = store.selectedCharacterConfiguration?.id;
    }

    public async execute() {
        selectCharacterOrThrow(this.store, this.charIdToSelect);
    }

    public async reverse() {
        selectCharacterOrThrow(this.store, this.previousCharId);
    }
}

export function selectCharacterOrThrow(store: CharacterEditorStore, charId: number) {
    if (store.selectedCharacterConfiguration?.id == charId)
        return;

    if (charId != null) {
        const char = sharedStore.getCharacter(charId);
        if (!char)
            throw new TranslatedError("editor.error_character_does_not_exists");

        store.setSelectedCharacter(char);
    } else {
        store.setSelectedCharacter(null);
    }
}