import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { EditorToolType, mainMapEditorStore, MapEditorStore } from "../../MapEditorStore";
import { doesPlacementSelectionLooselyEqual, OtherPlacementElement, PlacementSelection, MapRelatedStore } from "../../MapRelatedStore";
import { TranslatedError } from "../../../../shared/definitions/errors/TranslatedError";
import { runInAction } from "mobx";
import { sharedStore } from "../../SharedStore";

export function undoableSelectTileAsset(mapRelatedStore: MapRelatedStore, tileAssetId: string) {
    if (tileAssetId == mapRelatedStore.placementSelection.selectedTileAssetId && mapRelatedStore.allowToggleSelection) {
        tileAssetId = tileAssetId == null ? tileAssetId : null;
    }
    undoableApply("changedTileAsset", mapRelatedStore, EditorToolType.PlaceAsset, {
        selectedTileAssetId: tileAssetId
    });
}

export function undoableMapEditorSelectOtherPlacementElement(selectedOtherElement: OtherPlacementElement, mapEditorStore: MapEditorStore) {
    undoableApply("changed" + OtherPlacementElement[selectedOtherElement], mapEditorStore, EditorToolType.PlaceAsset, {
        selectedOtherElement
    });
}

export function undoableMapEditorSelectAreaTriggerWithPrefilledId(id: string, mapEditorStore: MapEditorStore) {
    undoableApply("changed" + OtherPlacementElement[OtherPlacementElement.AreaTrigger], mapEditorStore, EditorToolType.PlaceAsset, {
        selectedOtherElement: OtherPlacementElement.AreaTrigger,
        areaTriggerId: id
    });
}

export function undoableMapEditorSelectCharacterPlacement(selectedCharacterId: number) {
    undoableApply("changedCharacter", mainMapEditorStore, EditorToolType.PlaceAsset, {
        selectedCharacterId
    });
}

export function undoableMapEditorSelectAnimationElementPlacement(selectedAnimationName: string) {
    undoableApply("changedAnimationElement", mainMapEditorStore, EditorToolType.PlaceAsset, {
        selectedAnimationName
    });
}

export function undoableSelectTool(mapRelatedStore: MapRelatedStore, tool: EditorToolType) {
    const operationName = "activated" + MapEditorStore.ToolTypeToName.get(tool);
    undoableApply(operationName, mapRelatedStore, tool, mapRelatedStore.placementSelection);
}

function undoableApply(
    operationNamePostfix: string, mapRelatedStore: MapRelatedStore,
    currentTool: EditorToolType, placementSelection: PlacementSelection
) {
    if ((mapRelatedStore.selectedTool === currentTool) && doesPlacementSelectionLooselyEqual(mapRelatedStore.placementSelection, placementSelection))
        return;

    executeUndoableOperation(new SetPlacementSelectionOp(operationNamePostfix, mapRelatedStore, currentTool, placementSelection));
}

export function throwIfAssetsDoNotExist(placementSelection: PlacementSelection) {
    const { selectedTileAssetId } = placementSelection;

    if (selectedTileAssetId && !sharedStore.getTileAsset(selectedTileAssetId))
        throw new TranslatedError("editor.error_tile_asset_does_not_exist");
}

class SetPlacementSelectionOp extends UndoableOperation {

    private readonly previousTool: EditorToolType;
    private readonly previousPlacementSelection: PlacementSelection;

    public constructor(
        operationNamePostfix: string,
        private mapRelatedStore: MapRelatedStore,
        private toolType: EditorToolType,
        private placementSelection: PlacementSelection
    ) {
        super("setAssetSelection/" + operationNamePostfix);
        this.previousTool = mapRelatedStore.selectedTool;
        this.previousPlacementSelection = mapRelatedStore.placementSelection;
    }

    public async execute() {
        throwIfAssetsDoNotExist(this.placementSelection);
        runInAction(() => {
            this.mapRelatedStore.setTool(this.toolType);
            this.mapRelatedStore.setPlacementSelection(this.placementSelection);
        });
    }

    public async reverse() {
        throwIfAssetsDoNotExist(this.previousPlacementSelection);
        runInAction(() => {
            this.mapRelatedStore.setTool(this.previousTool);
            this.mapRelatedStore.setPlacementSelection(this.previousPlacementSelection);
        });
    }
}