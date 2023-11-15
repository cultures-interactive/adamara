import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { TranslatedError } from "../../../../shared/definitions/errors/TranslatedError";
import { DynamicMapElementModel } from "../../../../shared/game/dynamicMapElements/DynamicMapElement";
import { MapEditorStore } from "../../MapEditorStore";

export function undoableMapEditorDynamicMapElementCut(dynamicMapElement: DynamicMapElementModel<any>, mapEditorStore: MapEditorStore) {
    executeUndoableOperation(new MapEditorDynamicMapElementCut(dynamicMapElement.$modelId, mapEditorStore));
}

class MapEditorDynamicMapElementCut extends UndoableOperation {
    private readonly previousCutDynamicMapElementModelId: string;

    public constructor(
        private readonly dynamicMapElementModelId: string,
        private readonly mapEditorStore: MapEditorStore
    ) {
        super("mapEditorDynamicMapElementCut");

        this.previousCutDynamicMapElementModelId = this.mapEditorStore.cutDynamicMapElementModelId;
    }

    public async execute() {
        this.setCut(this.dynamicMapElementModelId);
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