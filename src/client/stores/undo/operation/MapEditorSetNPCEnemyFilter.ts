import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { mainMapEditorStore } from "../../MapEditorStore";

export function undoableToggleOnlyShowEnemyCharacters() {
    executeUndoableOperation(new MapEditorSetNPCEnemyFilter());
}

class MapEditorSetNPCEnemyFilter extends UndoableOperation {
    public constructor() {
        super("mapEditorSetNPCEnemyFilter");
    }

    public async execute() {
        mainMapEditorStore.toggleOnlyShowEnemyCharacters();
    }

    public async reverse() {
        mainMapEditorStore.toggleOnlyShowEnemyCharacters();
    }
}
