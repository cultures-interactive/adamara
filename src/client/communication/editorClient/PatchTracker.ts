import { OnPatchesDisposer } from "mobx-keystone";
import { AugmentedPatch, onPatchesImproved } from "../../../shared/helper/mobXHelpers";

export class PatchTracker {
    private trackerDisposer: OnPatchesDisposer;

    public constructor(
        private isTemporarilyDeactivated?: () => boolean
    ) {
    }

    public startTracking(
        targetNode: any,
        callbackSingle: (patch: AugmentedPatch, inversePatch: AugmentedPatch) => void,
        callbackAll?: (patches: AugmentedPatch[], inversePatches: AugmentedPatch[]) => void
    ) {
        if (this.trackerDisposer) {
            console.error("Can only use each PatchTracker once at a time.");
            return;
        }

        this.trackerDisposer = onPatchesImproved(targetNode, (patches, inversePatches) => {
            if (callbackSingle) {
                for (let i = 0; i < patches.length; i++) {
                    callbackSingle(patches[i], inversePatches[i]);
                }
            }

            if (callbackAll)
                callbackAll(patches, inversePatches);
        }, this.isTemporarilyDeactivated); // Ignore if this is triggered e.g. by applyPatches() in EditorClient
    }

    public stopTracking() {
        if (this.trackerDisposer) {
            this.trackerDisposer();
            this.trackerDisposer = null;
        }
    }
}