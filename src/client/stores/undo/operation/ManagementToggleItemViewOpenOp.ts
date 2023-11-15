import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { managementStore } from "../../ManagementStore";

export function undoableManagementToggleItemViewOpen(itemId: string) {
    executeUndoableOperation(new ManagementToggleItemViewOpenOp(itemId));
}

class ManagementToggleItemViewOpenOp extends UndoableOperation {
    public constructor(private readonly itemId: string) {
        super("managementToggleItemViewOpen");
    }

    public async execute() {
        managementStore.toggleItemDetailView(this.itemId);
    }

    public async reverse() {
        managementStore.toggleItemDetailView(this.itemId);
    }
}