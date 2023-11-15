import { createChangeGroupStack, createGroupUndoableChangesFunction, mergeGroupedPatchOp, UndoableOperation, UndoableOperationGroupSideEffect } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { editorClient } from "../../../communication/EditorClient";
import { AugmentedPatch, PatchCheckResult } from "../../../../shared/helper/mobXHelpers";
import { FlowTransform } from "react-flow-renderer";
import { actionTreeSetSelection, getCurrentlySelectedHierarchyIds, getCurrentReactFlowInstanceTransform } from "./actionEditorSupport";
import { actionEditorStore } from "../../ActionEditorStore";
import { TranslatedError } from "../../../../shared/definitions/errors/TranslatedError";
import { errorStore } from "../../ErrorStore";
import { ErrorType } from "../../editor/ErrorNotification";
import { sharedStore } from "../../SharedStore";
import { runInAction } from "mobx";
import { translationStore } from "../../TranslationStore";

export enum ActionEditorChangeGroup {
    None,

    /**
     * UnspecificGroupedNodeChanges should only be used for when several changes are made to a
     * node which should be merged, but should have the same unspecific label as None.
     */
    UnspecificGroupedNodeChanges,

    CreateActionNode,
    DeleteActionNode,
    MoveActionNode,
    CreateEdge,
    DeleteEdge
}

const autoMergableGroups = [
    ActionEditorChangeGroup.UnspecificGroupedNodeChanges,
    ActionEditorChangeGroup.MoveActionNode,
    ActionEditorChangeGroup.CreateActionNode
];

interface ExecuteAsGroupExtraData {
    patches: AugmentedPatch[];
    inversePatches: AugmentedPatch[];
    actionTreeModelId: string;
}

const changeGroupStack = createChangeGroupStack<ActionEditorChangeGroup, ExecuteAsGroupExtraData>(ActionEditorChangeGroup.None);

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
export const groupUndoableActionEditorChanges = createGroupUndoableChangesFunction<ActionEditorChangeGroup, ExecuteAsGroupExtraData>(
    changeGroupStack,
    ActionEditorChangeGroup.None,
    () => ({
        actionTreeModelId: null,
        patches: [],
        inversePatches: []
    }),
    () => {
        const currentStack = changeGroupStack[changeGroupStack.length - 1];
        const { currentChangeGroup, currentGroupId, queuedSideEffects, extraData } = currentStack;

        const { actionTreeModelId, patches, inversePatches } = extraData;
        if ((actionTreeModelId === null) && (patches.length === 0) && (inversePatches.length === 0)) {
            // Nothing happened. While this might be an error, it's also possible that despite starting the
            // group no changes were made at all.
            console.log(`groupUndoableActionEditorChanges: No changes made in a ActionEditorChangeGroup.${ActionEditorChangeGroup[currentChangeGroup]} group.`);
            return;
        }

        executeUndoableOperation(new ActionEditorSubmitChangesOp(
            currentChangeGroup,
            currentGroupId,
            queuedSideEffects,
            actionTreeModelId,
            patches,
            inversePatches
        ));
    }
);

export function undoableActionEditorSubmitChanges(actionTreeModelId: string, patch: AugmentedPatch, inversePatch: AugmentedPatch) {
    // Don't create undo entries while translations are importing
    if (translationStore.isImporting)
        return;

    const currentStack = changeGroupStack[changeGroupStack.length - 1];

    if (currentStack.currentChangeGroup !== ActionEditorChangeGroup.None) {
        currentStack.extraData.patches.push(patch);
        currentStack.extraData.inversePatches.push(inversePatch);

        if (currentStack.extraData.actionTreeModelId !== null && currentStack.extraData.actionTreeModelId !== actionTreeModelId)
            throw new Error("Groups must have the same actionTree");

        currentStack.extraData.actionTreeModelId = actionTreeModelId;
        return;
    }

    const { currentChangeGroup, currentGroupId, queuedSideEffects } = currentStack;
    currentStack.queuedSideEffects = null;

    executeUndoableOperation(new ActionEditorSubmitChangesOp(
        currentChangeGroup,
        currentGroupId,
        queuedSideEffects,
        actionTreeModelId,
        [patch],
        [inversePatch]
    ));
}

class ActionEditorSubmitChangesOp extends UndoableOperation {
    private currentTransform: FlowTransform;
    private hierachyIds: string[];
    private previousSelectedActionModelId: string;
    private previousActionTreeHierarchy: string[];
    private previousTransform: FlowTransform;

    public constructor(
        public group: ActionEditorChangeGroup,
        public groupId: number,
        public sideEffects: UndoableOperationGroupSideEffect[],
        public actionTreeModelId: string,
        public patches: AugmentedPatch[],
        public inversePatches: AugmentedPatch[]
    ) {
        super("actionEditorSubmitChanges/" + ActionEditorChangeGroup[group]);
        this.currentTransform = getCurrentReactFlowInstanceTransform();
        this.hierachyIds = getCurrentlySelectedHierarchyIds();
        this.previousSelectedActionModelId = actionEditorStore.currentAction?.$modelId;
        this.previousActionTreeHierarchy = actionEditorStore.currentActionSelectionHierarchyIdsForUndo || getCurrentlySelectedHierarchyIds();
        this.previousTransform = actionEditorStore.currentActionSelectionTransformForUndo || getCurrentReactFlowInstanceTransform();
    }

    public async execute(isRedo: boolean) {
        const actionTree = sharedStore.actionTreesById.get(this.actionTreeModelId);
        if (!actionTree)
            throw new TranslatedError("editor.error_action_tree_does_not_exist");

        runInAction(() => {
            actionEditorStore.clearClickActions();

            if (!isRedo) {
                this.selectNodeIfCreateNodeAction();
                if (this.group !== ActionEditorChangeGroup.CreateActionNode) {
                    actionTreeSetSelection(this.previousSelectedActionModelId, this.hierachyIds, this.currentTransform);
                }
            }
        });

        const patchResults = await editorClient.submitActionTreeChanges(this.actionTreeModelId, this.patches, this.inversePatches, isRedo);

        runInAction(() => {
            if (!isRedo) {
                let hasError = false;

                // Remove failed patches
                for (let i = patchResults.length - 1; i >= 0; i--) {
                    if (patchResults[i] === PatchCheckResult.ErrorValueWasChanged) {
                        this.patches.splice(i, 1);
                        this.inversePatches.splice(i, 1);
                        hasError = true;
                    }
                }

                if (hasError) {
                    if (this.patches.length === 0) {
                        // All failed, so the undo/redo entry can be removed
                        throw new TranslatedError("editor.error_generic_change_submitted_conflict");
                    } else {
                        // A few patches did not fail, so the undo/redo entry still stands
                        errorStore.addError(ErrorType.General, "editor.error_generic_change_submitted_conflict");
                    }
                }
            }

            if (isRedo) {
                editorClient.patch(actionTree, this.patches);
                this.selectNodeIfCreateNodeAction();
                if (this.group !== ActionEditorChangeGroup.CreateActionNode) {
                    actionTreeSetSelection(this.previousSelectedActionModelId, this.hierachyIds, this.currentTransform);
                }
            }

            this.sideEffects?.forEach(sideEffect => sideEffect.afterExecute(isRedo));
        });
    }

    public async reverse() {
        const actionTree = sharedStore.actionTreesById.get(this.actionTreeModelId);
        if (!actionTree)
            throw new TranslatedError("editor.error_action_tree_does_not_exist");

        actionEditorStore.clearClickActions();

        const reversedInversePatches = this.inversePatches.slice().reverse();
        await editorClient.submitActionTreeChanges(this.actionTreeModelId, reversedInversePatches, this.patches.slice().reverse(), true);

        runInAction(() => {
            editorClient.patch(actionTree, reversedInversePatches);
            actionTreeSetSelection(this.previousSelectedActionModelId, this.hierachyIds, this.currentTransform);

            this.sideEffects?.forEach(sideEffect => sideEffect.afterReverse());
        });
    }

    private selectNodeIfCreateNodeAction() {
        // Select added action node
        if (this.group === ActionEditorChangeGroup.CreateActionNode) {
            const addPatches = this.patches.filter(patch => patch.op === "add");
            if (addPatches.length > 1) {
                console.error("Expected first patch to be an add patch", { this: this });
            }

            if ((this.patches.length > 0) && (this.patches[0].op === "add")) {
                actionTreeSetSelection(this.patches[0].value.$modelId, this.hierachyIds, this.currentTransform);
            }
        }
    }

    public merge(previousOperation: ActionEditorSubmitChangesOp) {
        const merged = mergeGroupedPatchOp(this, previousOperation, autoMergableGroups, ActionEditorChangeGroup.None);
        if (merged) {
            this.currentTransform = previousOperation.currentTransform;
            this.hierachyIds = previousOperation.hierachyIds;
            this.previousSelectedActionModelId = previousOperation.previousSelectedActionModelId;
            this.previousActionTreeHierarchy = previousOperation.previousActionTreeHierarchy;
            this.previousTransform = previousOperation.previousTransform;
        }

        return merged;
    }
}