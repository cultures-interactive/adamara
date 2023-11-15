import { WorkshopModel } from "../../../../shared/workshop/WorkshopModel";
import { managementClient } from "../../../communication/ManagementClient";
import { managementStore } from "../../ManagementStore";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableCreateWorkshop() {
    executeUndoableOperation(new WorkshopCreationOp());
}

class WorkshopCreationOp extends UndoableOperation {
    private workshop: WorkshopModel;
    public constructor(
    ) {
        super("workshopCreation");
    }

    public async execute(redo: boolean) {
        if (redo) {
            await managementClient.unDeleteWorkshop(this.workshop.$modelId);
        } else {
            this.workshop = await managementClient.createWorkshop();
            managementStore.setWorkshop(this.workshop);
        }
    }

    public async reverse() {
        await managementClient.deleteWorkshop(this.workshop.$modelId);
    }
}