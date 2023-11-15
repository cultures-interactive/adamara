import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { editorClient } from "../../../communication/EditorClient";
import { fromSnapshot } from "mobx-keystone";
import { AnimationAssetModel } from "../../../../shared/resources/AnimationAssetModel";
import { animationEditorStore } from "../../AnimationSelectionStore";
import { sharedStore } from "../../SharedStore";

export function undoableAnimationEditorDeleteAnimation(animationId: number) {
    executeUndoableOperation(new AnimationEditorDeletionOp(animationId));
}

class AnimationEditorDeletionOp extends UndoableOperation {

    private readonly selectedAnimationSate: string;

    public constructor(
        private animationId: number,
    ) {
        super("animationEditorDeleteAnimation");
        this.selectedAnimationSate = animationEditorStore.selectedAnimationState;
    }

    public async execute() {
        await editorClient.deleteAnimationAsset(this.animationId);
        await animationEditorStore.setSelectedAnimation(null);
        animationEditorStore.setSelectedState(null);
    }

    public async reverse() {
        const snapshot = await editorClient.unDeleteAnimationAsset(this.animationId);
        const animationAssetModel = fromSnapshot<AnimationAssetModel>(snapshot);
        // will be added by the 'animationAssetUnDeleted' server event for others.
        sharedStore.setAnimation(animationAssetModel);
        await animationEditorStore.setSelectedAnimation(animationAssetModel);
        animationEditorStore.setSelectedState(this.selectedAnimationSate);
    }
}
