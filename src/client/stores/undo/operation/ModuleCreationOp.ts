
import { ModuleModel } from "../../../../shared/workshop/ModuleModel";
import { managementClient } from "../../../communication/ManagementClient";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableCreateModule(workshopId: string) {
    return executeUndoableOperation(new ModuleCreationOp(workshopId));
}

class ModuleCreationOp extends UndoableOperation {
    private module: ModuleModel;

    public constructor(
        private workshopId: string
    ) {
        super("moduleCreation");
    }

    public async execute(redo: boolean) {
        if (redo) {
            await managementClient.unDeleteModule(this.module.$modelId);
        } else {
            this.module = await managementClient.createModule(this.workshopId);
        }
    }

    public async reverse() {
        await managementClient.deleteModule(this.module.$modelId);
    }
}