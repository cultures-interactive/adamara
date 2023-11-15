import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { mainMapEditorStore, PlacementSelectorCategory } from "../../MapEditorStore";

export function undoableMapEditorSetPlacementSelectorCategory(category: PlacementSelectorCategory) {
    if (mainMapEditorStore.selectedCategory === category)
        return;

    executeUndoableOperation(new MapEditorSetPlacementSelectorCategoryOp(category));
}

class MapEditorSetPlacementSelectorCategoryOp extends UndoableOperation {
    private previousCategory: PlacementSelectorCategory;

    public constructor(
        private newCategory: PlacementSelectorCategory
    ) {
        super("mapEditorSetPlacementSelectorCategory");
        this.previousCategory = mainMapEditorStore.selectedCategory;
    }

    public async execute() {
        mainMapEditorStore.setPlacementSelectorCategory(this.newCategory);
    }

    public async reverse() {
        mainMapEditorStore.setPlacementSelectorCategory(this.previousCategory);
    }
}