import { ItemModel } from "../../../../shared/game/ItemModel";
import { editorClient } from "../../../communication/EditorClient";
import { itemStore } from "../../ItemStore";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableCreateItem(item: ItemModel) {
    executeUndoableOperation(new ItemEditorCreateItemOp(item));
}

class ItemEditorCreateItemOp extends UndoableOperation {

    public constructor(
        private readonly item: ItemModel
    ) {
        super("itemEditorCreateItem");
    }

    public async execute(redo: boolean) {
        if (redo) {
            await editorClient.unDeleteItem(this.item.id);
        } else {
            await editorClient.createItem(this.item);
            itemStore.setItem(this.item);
        }
        itemStore.setSelectedItem(itemStore.getItem(this.item.id));
    }

    public async reverse() {
        await editorClient.deleteItem(this.item.id);
        itemStore.deleteItem(this.item);
        if (itemStore.selectedItem.id === this.item.id) {
            itemStore.setSelectedItem(null);
        }
    }
}