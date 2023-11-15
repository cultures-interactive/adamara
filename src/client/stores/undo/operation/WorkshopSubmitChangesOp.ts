import { AugmentedPatch } from "../../../../shared/helper/mobXHelpers";
import { managementClient } from "../../../communication/ManagementClient";
import { managementStore } from "../../ManagementStore";
import { mergeSinglePatchOp, UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableWorkshopSubmitChanges(workshopId: string, patch: AugmentedPatch, inversePatch: AugmentedPatch) {
    executeUndoableOperation(new WorkshopSubmitChangesOp(workshopId, patch, inversePatch));
}

class WorkshopSubmitChangesOp extends UndoableOperation {
    public constructor(
        public workshopId: string,
        public patch: AugmentedPatch,
        public inversePatch: AugmentedPatch
    ) {
        super("updateWorkshop");
    }

    public async execute(isRedo: boolean) {
        await managementClient.submitWorkshopChanges(this.workshopId, this.patch, this.inversePatch);
        if (isRedo) {
            managementClient.patch(managementStore.getWorkshop(this.workshopId), this.patch);
        }
    }

    public async reverse() {
        await managementClient.submitWorkshopChanges(this.workshopId, this.inversePatch, this.patch);
        managementClient.patch(managementStore.getWorkshop(this.workshopId), this.inversePatch);
    }

    public merge(previousOperation: WorkshopSubmitChangesOp) {
        return mergeSinglePatchOp(this, previousOperation);
    }
}