import { executeUndoableOperation } from "../UndoStore";
import { UndoableOperation } from "../UndoableOperation";
import { AnimationAssetModel } from "../../../../shared/resources/AnimationAssetModel";
import { AnimationSelectionStore } from "../../AnimationSelectionStore";

export function undoableAnimationEditorSelectAnimationState(nextAnimationState: string, store: AnimationSelectionStore) {
    if (store.selectedAnimationState == nextAnimationState) return;
    executeUndoableOperation(new AnimationEditorSelectionOp(
        "animationEditorSelectAnimationState",
        store.selectedAnimation?.animation,
        nextAnimationState,
        store));
}

export function undoableAnimationEditorSelectAnimation(nextAnimation: AnimationAssetModel, store: AnimationSelectionStore) {
    if (store.selectedAnimation?.animation == nextAnimation) return;
    executeUndoableOperation(new AnimationEditorSelectionOp(
        "animationEditorSelectAnimation",
        nextAnimation,
        store.selectedAnimationState,
        store));
}

class AnimationEditorSelectionOp extends UndoableOperation {

    private readonly previousSelectedAnimation: AnimationAssetModel;
    private readonly previousSelectedAnimationState: string;

    public constructor(
        operationNameTranslationKey: string,
        private nextSelectedAnimation: AnimationAssetModel,
        private nextSelectedAnimationState: string,
        private store: AnimationSelectionStore
    ) {
        super(operationNameTranslationKey);
        this.previousSelectedAnimationState = store.selectedAnimationState;
        this.previousSelectedAnimation = store.selectedAnimation?.animation;
    }

    private static async apply(previousAnimation: AnimationAssetModel, nextAnimation: AnimationAssetModel, nextAnimationState: string, store: AnimationSelectionStore) {
        try {
            if (previousAnimation != nextAnimation) await store.setSelectedAnimation(nextAnimation);
            store.setSelectedState(nextAnimationState);
        } catch (e) {
            await store.setSelectedAnimation(previousAnimation); // reset selection in case of an error
            throw e;
        }
    }

    public async execute() {
        await AnimationEditorSelectionOp.apply(this.previousSelectedAnimation, this.nextSelectedAnimation, this.nextSelectedAnimationState, this.store);
    }

    public async reverse() {
        await AnimationEditorSelectionOp.apply(this.nextSelectedAnimation, this.previousSelectedAnimation, this.previousSelectedAnimationState, this.store);
    }
}
