import { undoableSelectTileAsset, undoableSelectTool } from "../../../stores/undo/operation/SetPlacementSelectionOp";
import { EditorToolType, MapEditorStore } from "../../../stores/MapEditorStore";
import { undoableSetPlane } from "../../../stores/undo/operation/SetPlaneOp";

export class EditorMapShortcutController {

    public constructor(
        private outputDebugData: () => void,
        private mapEditorStore: MapEditorStore
    ) {
        this.onKeyDown = this.onKeyDown.bind(this);
        window.addEventListener("keydown", this.onKeyDown, false);
    }

    public dispose() {
        window.removeEventListener("keydown", this.onKeyDown, false);
    }

    private onKeyDown(e: KeyboardEvent) {
        const { activeElement } = window.document;
        if ((activeElement instanceof HTMLInputElement) || (activeElement instanceof HTMLTextAreaElement))
            return;

        if (e.key === "b") {
            undoableSelectTool(this.mapEditorStore, EditorToolType.PlaceAsset);
        } else if (e.key === "m") {
            undoableSelectTool(this.mapEditorStore, EditorToolType.SingleSelect);
        } else if (e.key === "D") {
            this.outputDebugData();
        } else if (e.key === "d") {
            undoableSelectTileAsset(this.mapEditorStore, null);
        } else if (e.key === "-") {
            undoableSetPlane(this.mapEditorStore, this.mapEditorStore.selectedPlane - 1);
        } else if (e.key === "+") {
            undoableSetPlane(this.mapEditorStore, this.mapEditorStore.selectedPlane + 1);
        }
    }
}