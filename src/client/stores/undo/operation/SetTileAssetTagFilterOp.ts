import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { TagSelection, MapRelatedStore } from "../../MapRelatedStore";

export function undoableSetTileAssetTagFilter(mapRelatedStore: MapRelatedStore, tag: TagSelection) {
    executeUndoableOperation(new SetTileAssetTagFilterOp(
        mapRelatedStore.setTileAssetTagFilter.bind(mapRelatedStore),
        tag,
        mapRelatedStore.tileAssetTagFilter
    ));
}

class SetTileAssetTagFilterOp extends UndoableOperation {
    public constructor(
        private setter: (tag: TagSelection) => void,
        private newTileAssetTagFilter: TagSelection,
        private readonly previousTileAssetTagFilter: TagSelection
    ) {
        super("setTileAssetTagFilter");
    }

    public async execute() {
        this.setter(this.newTileAssetTagFilter);
    }

    public async reverse() {
        this.setter(this.previousTileAssetTagFilter);
    }
}
