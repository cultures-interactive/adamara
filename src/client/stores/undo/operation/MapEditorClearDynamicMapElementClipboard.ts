import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { TranslatedError } from "../../../../shared/definitions/errors/TranslatedError";
import { MapEditorStore } from "../../MapEditorStore";

export function undoableMapEditorClearDynamicMapElementClipboard(mapEditorStore: MapEditorStore) {
    executeUndoableOperation(new MapEditorClearDynamicMapElementClipboard(mapEditorStore));
}

class MapEditorClearDynamicMapElementClipboard extends UndoableOperation {
    private readonly previousCutDynamicMapElementModelId: string;

    public constructor(
        private readonly mapEditorStore: MapEditorStore
    ) {
        super("mapEditorClearDynamicMapElementClipboard");

        this.previousCutDynamicMapElementModelId = this.mapEditorStore.cutDynamicMapElementModelId;
    }

    public async execute() {
        this.mapEditorStore.setCutDynamicMapElementModelId(null);
    }

    public async reverse() {
        this.setCut(this.previousCutDynamicMapElementModelId);
    }

    private setCut(dynamicMapElementModelId: string) {
        const dynamicMapElement = this.mapEditorStore.currentMapStore.currentMap?.getDynamicMapElementByModelId(dynamicMapElementModelId);
        if (!dynamicMapElement)
            throw new TranslatedError("editor.error_dynamic_map_element_does_not_exist");

        this.mapEditorStore.setCutDynamicMapElementModelId(dynamicMapElementModelId);
    }
}