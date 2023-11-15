import { UndoableOperation } from "../UndoableOperation";
import { History } from 'history';
import { executeUndoableOperation } from "../UndoStore";
import { routes } from "../../../data/routes";
import { navigateTo } from "../../../helper/navigationHelpers";
import { charEditorStore } from "../../CharacterEditorStore";
import { sharedStore } from "../../SharedStore";

export function undoableCharacterEditorOpenSelection(characterId: number, history: History) {
    executeUndoableOperation(new CharacterEditorOpenSelectionOp(characterId, history));
}

class CharacterEditorOpenSelectionOp extends UndoableOperation {

    private readonly previousUrl: string;
    private readonly nextUrl: string;
    private history: History;

    private readonly characterIdToSelect: number;
    private readonly previousSelectedCharacterId: number;

    public constructor(characterId: number, history: History) {
        super("characterEditorOpenSelection");
        this.history = history;
        this.nextUrl = routes.editorMap;
        this.previousUrl = this.history.location.pathname;
        this.characterIdToSelect = characterId;
        this.previousSelectedCharacterId = charEditorStore.selectedCharacterConfiguration?.id;
    }

    public async execute() {
        navigateTo(this.history, this.nextUrl);
        charEditorStore.setSelectedCharacter(sharedStore.characterConfigurations.get(this.characterIdToSelect));
    }

    public async reverse() {
        charEditorStore.setSelectedCharacter(sharedStore.characterConfigurations.get(this.previousSelectedCharacterId));
        navigateTo(this.history, this.previousUrl);
    }
}
