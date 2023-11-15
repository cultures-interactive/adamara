import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { MapEditorComplexity, mainMapEditorStore } from "../../MapEditorStore";
import { doesPlacementSelectionLooselyEqual, PlacementSelection, TagSelection } from "../../MapRelatedStore";
import { runInAction } from "mobx";

export function undoableSetMapEditorComplexity(value: MapEditorComplexity) {
    executeUndoableOperation(new MapEditorSetMapEditorComplexity(value));
}

class MapEditorSetMapEditorComplexity extends UndoableOperation {
    private previousValue: MapEditorComplexity;
    private previousPlane: number;
    private previousTileLayer: number;
    private previousPlacementSelection: PlacementSelection;
    private previousTileAssetTagFilter: TagSelection;

    public constructor(
        private value: MapEditorComplexity
    ) {
        super("mapEditorSetMapEditorComplexity");

        this.previousValue = mainMapEditorStore.mapEditorComplexity;
        this.previousPlane = mainMapEditorStore.selectedPlane;
        this.previousTileLayer = mainMapEditorStore.selectedLayer;
        this.previousPlacementSelection = mainMapEditorStore.placementSelection;
        this.previousTileAssetTagFilter = mainMapEditorStore.tileAssetTagFilter;
    }

    public async execute() {
        mainMapEditorStore.setMapEditorComplexity(this.value);
    }

    public async reverse() {
        mainMapEditorStore.setMapEditorComplexity(this.previousValue);

        runInAction(() => {
            mainMapEditorStore.setPlane(this.previousPlane);
            mainMapEditorStore.setSelectedLayer(this.previousTileLayer);
            mainMapEditorStore.setPlacementSelection(this.previousPlacementSelection);
            mainMapEditorStore.setTileAssetTagFilter(this.previousTileAssetTagFilter);
        });

        if (!doesPlacementSelectionLooselyEqual(this.previousPlacementSelection, mainMapEditorStore.placementSelection)) {
            throw new Error("MapEditorSetMapEditorComplexity: Couldn't properly reset previous selection.");
        }
    }
}
