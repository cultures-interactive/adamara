import { UndoableOperation } from "../UndoableOperation";
import { editorClient } from "../../../communication/EditorClient";
import { fromSnapshot } from "mobx-keystone";
import { CharacterEditorStore } from "../../CharacterEditorStore";
import { CharacterConfigurationModel } from "../../../../shared/resources/CharacterConfigurationModel";
import { executeUndoableOperation } from "../UndoStore";
import { sharedStore } from "../../SharedStore";

export function undoableCharacterEditorDeleteCharacter(characterConfigId: number, store: CharacterEditorStore) {
    executeUndoableOperation(new CharacterEditorDeletionOp(characterConfigId, store));
}

class CharacterEditorDeletionOp extends UndoableOperation {

    public constructor(private characterConfigId: number, private store: CharacterEditorStore) {
        super("characterEditorDeleteCharacter");
    }

    public async execute() {
        await editorClient.deleteCharacterConfiguration(this.characterConfigId);
        this.store.setSelectedCharacter(null);
    }

    public async reverse() {
        const snapshot = await editorClient.unDeleteCharacterConfiguration(this.characterConfigId);
        const characterConfiguration = fromSnapshot<CharacterConfigurationModel>(snapshot);
        sharedStore.putCharacter(characterConfiguration);
        this.store.setSelectedCharacter(characterConfiguration);
    }
}
