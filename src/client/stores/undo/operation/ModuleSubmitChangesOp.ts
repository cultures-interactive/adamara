import { AugmentedPatch } from "../../../../shared/helper/mobXHelpers";
import { managementClient } from "../../../communication/ManagementClient";
import { managementStore } from "../../ManagementStore";
import { mergeSinglePatchOp, UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableModuleSubmitChanges(moduleId: string, patch: AugmentedPatch, inversePatch: AugmentedPatch) {
    executeUndoableOperation(new ModuleSubmitChangesOp(moduleId, patch, inversePatch));
}

class ModuleSubmitChangesOp extends UndoableOperation {
    public constructor(
        public moduleId: string,
        public patch: AugmentedPatch,
        public inversePatch: AugmentedPatch
    ) {
        super("updateModule");
    }

    public async execute(isRedo: boolean) {
        await managementClient.submitModuleChanges(this.moduleId, this.patch, this.inversePatch);
        if (isRedo) {
            managementClient.patch(managementStore.getModule(this.moduleId), this.patch);
        }
    }

    public async reverse() {
        await managementClient.submitModuleChanges(this.moduleId, this.inversePatch, this.patch);
        managementClient.patch(managementStore.getModule(this.moduleId), this.inversePatch);
    }

    public merge(previousOperation: ModuleSubmitChangesOp) {
        return mergeSinglePatchOp(this, previousOperation);
    }
}