import { WorkshopModel } from "../../../../shared/workshop/WorkshopModel";
import { managementClient } from "../../../communication/ManagementClient";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableDeleteWorkshop(workshop: WorkshopModel) {
    executeUndoableOperation(new WorkshopDeletionOp(workshop));
}

class WorkshopDeletionOp extends UndoableOperation {
    public constructor(
        private readonly workshop: WorkshopModel
    ) {
        super("workshopDeletion");
    }

    public async execute() {
        await managementClient.deleteWorkshop(this.workshop.$modelId);
    }

    public async reverse() {
        await managementClient.unDeleteWorkshop(this.workshop.$modelId);
    }
}