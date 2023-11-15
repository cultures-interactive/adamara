import { ModuleModel } from "../../../../shared/workshop/ModuleModel";

import { managementClient } from "../../../communication/ManagementClient";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableDeleteModule(module: ModuleModel) {
    executeUndoableOperation(new ModuleDeletionOp(module));
}

class ModuleDeletionOp extends UndoableOperation {
    public constructor(
        private readonly module: ModuleModel
    ) {
        super("moduleDeletion");
    }

    public async execute() {
        await managementClient.deleteModule(this.module.$modelId);
    }

    public async reverse() {
        await managementClient.unDeleteModule(this.module.$modelId);
    }
}