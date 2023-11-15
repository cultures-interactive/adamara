import { ItemModel } from "../../../../shared/game/ItemModel";
import { editorClient } from "../../../communication/EditorClient";
import { itemStore } from "../../ItemStore";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableDeleteItem(item: ItemModel) {
    executeUndoableOperation(new ItemEditorDeleteItemOp(item));
}

class ItemEditorDeleteItemOp extends UndoableOperation {

    public constructor(
        private readonly item: ItemModel
    ) {
        super("itemEditorDeleteItem");
    }

    public async execute() {
        await editorClient.deleteItem(this.item.id);
        itemStore.deleteItem(this.item);
        itemStore.setSelectedItem(null);
    }

    public async reverse() {
        await editorClient.unDeleteItem(this.item.id);
        itemStore.setSelectedItem(itemStore.getItem(this.item.id));
    }
}