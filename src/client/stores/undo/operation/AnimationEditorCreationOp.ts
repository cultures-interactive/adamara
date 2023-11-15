import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { AnimationAssetModel } from "../../../../shared/resources/AnimationAssetModel";
import { editorClient } from "../../../communication/EditorClient";
import { fromSnapshot } from "mobx-keystone";
import { animationEditorStore } from "../../AnimationSelectionStore";
import { sharedStore } from "../../SharedStore";

export function undoableAnimationEditorCreateAnimation(animationAsset: AnimationAssetModel) {
    executeUndoableOperation(new AnimationEditorCreationOp(animationAsset));
}

class AnimationEditorCreationOp extends UndoableOperation {

    private readonly previousSelectedAnimationState: string;
    private readonly previousSelectedAnimation: AnimationAssetModel;
    private readonly animationId: number;

    public constructor(private initialAnimationAsset: AnimationAssetModel) {
        super("animationEditorCreateAnimation");

        this.animationId = this.initialAnimationAsset.id;
        this.previousSelectedAnimationState = animationEditorStore.selectedAnimationState;
        this.previousSelectedAnimation = animationEditorStore.selectedAnimation?.animation;
    }

    public async execute(isRedo: boolean) {
        let animationAsset: AnimationAssetModel;
        if (isRedo) {
            const snapshot = await editorClient.unDeleteAnimationAsset(this.animationId);
            animationAsset = fromSnapshot<AnimationAssetModel>(snapshot);
        } else {
            animationAsset = this.initialAnimationAsset;
        }
        sharedStore.setAnimation(animationAsset);
        await animationEditorStore.setSelectedAnimation(animationAsset);
    }

    public async reverse() {
        await editorClient.deleteAnimationAsset(this.animationId);
        sharedStore.deleteAnimation(this.animationId);
        await animationEditorStore.setSelectedAnimation(this.previousSelectedAnimation);
        animationEditorStore.setSelectedState(this.previousSelectedAnimationState);
    }
}
