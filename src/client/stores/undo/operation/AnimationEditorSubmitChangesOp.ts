import { createChangeGroupStack, createGroupUndoableChangesFunction, mergeGroupedPatchOp, UndoableOperation, UndoableOperationGroupSideEffect } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { editorClient } from "../../../communication/EditorClient";
import { AugmentedPatch } from "../../../../shared/helper/mobXHelpers";
import { AnimationAssetModel } from "../../../../shared/resources/AnimationAssetModel";

export enum AnimationEditorChangeGroup {
    None,

    /**
     * UnspecificGroupedNodeChanges should only be used for when several changes are made to a
     * node which should be merged, but should have the same unspecific label as None.
     */
    UnspecificGroupedNodeChanges
}

const autoMergableGroups = [
    AnimationEditorChangeGroup.UnspecificGroupedNodeChanges
];

const changeGroupStack = createChangeGroupStack(AnimationEditorChangeGroup.None);

/**
 * This method groups all changes made inside `executer` and merges them into one undo/redo entry, and labels
 * it appropriately (according to the selected `group`) and executes side effects if necessary.
 * 
 * @see {@link createGroupUndoableChangesFunction} for more information.
 *
 * @param group A group denoting the purpose of the grouped changes in executer
 * @param executer The callback that contains all changes that should be grouped
 * @param sideEffects Side effects to be executed after the first patch (initial run) or after all patches (undo/redo)
 */
export const groupUndoableAnimationEditorChanges = createGroupUndoableChangesFunction(changeGroupStack, AnimationEditorChangeGroup.None);

export function undoableAnimationEditorSubmitChanges(animation: AnimationAssetModel, patch: AugmentedPatch, inversePatch: AugmentedPatch) {
    const currentStack = changeGroupStack[changeGroupStack.length - 1];
    const { currentChangeGroup, currentGroupId, queuedSideEffects } = currentStack;
    currentStack.queuedSideEffects = null;

    executeUndoableOperation(new AnimationEditorSubmitChangesOp(currentChangeGroup, currentGroupId, queuedSideEffects, animation, [patch], [inversePatch]));
}

class AnimationEditorSubmitChangesOp extends UndoableOperation {
    public constructor(
        public group: AnimationEditorChangeGroup,
        public groupId: number,
        public sideEffects: UndoableOperationGroupSideEffect[],
        public animation: AnimationAssetModel,
        public patches: AugmentedPatch[],
        public inversePatches: AugmentedPatch[]
    ) {
        super("animationEditorSubmitChanges/" + AnimationEditorChangeGroup[group]);
    }

    public async execute(isRedo: boolean) {
        await editorClient.submitAnimationChanges(this.animation.id, this.patches, this.inversePatches, isRedo);

        if (isRedo) {
            editorClient.patch(this.animation, this.patches);
        }

        this.sideEffects?.forEach(sideEffect => sideEffect.afterExecute(isRedo));
    }

    public async reverse() {
        const reversedInversePatches = this.inversePatches.slice().reverse();
        await editorClient.submitAnimationChanges(this.animation.id, reversedInversePatches, this.patches.slice().reverse(), true);
        editorClient.patch(this.animation, reversedInversePatches);

        this.sideEffects?.forEach(sideEffect => sideEffect.afterReverse());
    }

    public merge(previousOperation: AnimationEditorSubmitChangesOp) {
        return mergeGroupedPatchOp(this, previousOperation, autoMergableGroups, AnimationEditorChangeGroup.None);
    }
}