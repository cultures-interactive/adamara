import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { runInAction } from "mobx";
import { PlacementSelection, TagSelection, MapRelatedStore } from "../../MapRelatedStore";
import { throwIfAssetsDoNotExist } from "./SetPlacementSelectionOp";
import { getTileLayerType } from "../../../../shared/data/layerConstants";

export function undoableSetTileLayer(mapRelatedStore: MapRelatedStore, layer: number) {
    executeUndoableOperation(new SetTileLayerOp(mapRelatedStore, layer));
}

class SetTileLayerOp extends UndoableOperation {

    private readonly previousTileLayer: number;
    private readonly previousPlacementSelection: PlacementSelection;
    private readonly previousTileAssetTagFilter: TagSelection;

    public constructor(
        private mapRelatedStore: MapRelatedStore,
        private layer: number
    ) {
        super("setTileLayer");
        this.previousTileLayer = mapRelatedStore.selectedLayer;
        this.previousPlacementSelection = mapRelatedStore.placementSelection;
        this.previousTileAssetTagFilter = mapRelatedStore.tileAssetTagFilter;
    }

    public async execute() {
        runInAction(() => {
            // If we switch the layer, deselect the selectedTileAssetId if the layer type is changing
            // (but keep everything else, if there is anything)
            if (getTileLayerType(this.mapRelatedStore.selectedLayer) != getTileLayerType(this.layer)) {
                this.mapRelatedStore.setPlacementSelection({
                    ...this.mapRelatedStore.placementSelection,
                    selectedTileAssetId: undefined
                });
            }

            this.mapRelatedStore.setSelectedLayer(this.layer);

            if (this.mapRelatedStore.filteredTileAssetsWithoutSearch.length === 0) {
                this.mapRelatedStore.setTileAssetTagFilter(null);
            }
        });
    }

    public async reverse() {
        throwIfAssetsDoNotExist(this.previousPlacementSelection);

        runInAction(() => {
            this.mapRelatedStore.setSelectedLayer(this.previousTileLayer);
            this.mapRelatedStore.setPlacementSelection(this.previousPlacementSelection);
            this.mapRelatedStore.setTileAssetTagFilter(this.previousTileAssetTagFilter);
        });
    }
}
