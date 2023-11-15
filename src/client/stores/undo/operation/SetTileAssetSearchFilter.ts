import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { SearchFilterCategory, MapRelatedStore } from "../../MapRelatedStore";

export function undoableSetTileAssetSearchFilter(mapRelatedStore: MapRelatedStore, category: SearchFilterCategory, value: string) {
    if (mapRelatedStore.getSearchFilter(category) === value)
        return;

    executeUndoableOperation(new SetTileAssetSearchFilterOp(mapRelatedStore, category, value));
}

export function undoableClearTileAssetSearchFilter(mapRelatedStore: MapRelatedStore, category: SearchFilterCategory) {
    undoableSetTileAssetSearchFilter(mapRelatedStore, category, "");
}

class SetTileAssetSearchFilterOp extends UndoableOperation {
    private previousValue: string;

    public constructor(
        private mapRelatedStore: MapRelatedStore,
        private category: SearchFilterCategory,
        private newValue: string
    ) {
        super("setTileAssetSearchFilter");

        this.previousValue = mapRelatedStore.getSearchFilter(category);
    }

    public async execute() {
        this.mapRelatedStore.setSearchFilter(this.category, this.newValue);
    }

    public async reverse() {
        this.mapRelatedStore.setSearchFilter(this.category, this.previousValue);
    }

    public merge(previousOperation: SetTileAssetSearchFilterOp) {
        this.previousValue = previousOperation.previousValue;
        return true;
    }
}
