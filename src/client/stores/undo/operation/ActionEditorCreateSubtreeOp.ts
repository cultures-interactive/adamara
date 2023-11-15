import { UndoableOperation } from "../UndoableOperation";
import { editorClient } from "../../../communication/EditorClient";
import { executeUndoableOperation } from "../UndoStore";
import { ActionTreeModel, ActionTreeSnapshot } from "../../../../shared/action/ActionTreeModel";
import { actionEditorStore } from "../../ActionEditorStore";
import { sharedStore } from "../../SharedStore";
import { FlowTransform } from "react-flow-renderer";
import { getCurrentReactFlowInstanceTransform, getCurrentlySelectedHierarchyIds, actionTreeSetSelection } from "./actionEditorSupport";
import { getSnapshot } from "mobx-keystone";

export function undoableActionEditorCreateSubtrees(newTrees: ActionTreeModel[]) {
    for (const newTree of newTrees) {
        sharedStore.addActionTree(newTree);
    }
    executeUndoableOperation(new ActionEditorCreateSubtreeOp(newTrees.map(newTree => getSnapshot(newTree))));
}

class ActionEditorCreateSubtreeOp extends UndoableOperation {
    private currentTransform: FlowTransform;
    private hierachyIds: string[];
    private previousSelectedActionModelId: string;

    public constructor(private readonly subtrees: ActionTreeSnapshot[]) {
        super("actionEditorCreateSubtree");
        this.currentTransform = getCurrentReactFlowInstanceTransform();
        this.hierachyIds = getCurrentlySelectedHierarchyIds();
        this.previousSelectedActionModelId = actionEditorStore.currentAction?.$modelId;
    }

    public async execute(isRedo: boolean) {
        actionEditorStore.clearClickActions();
        if (isRedo) {
            await editorClient.unDeleteActionTrees(this.subtrees.map(subtree => subtree.$modelId));
        } else {
            await editorClient.createActionTrees(this.subtrees);
        }
        actionTreeSetSelection(this.subtrees[0].$modelId, this.hierachyIds, this.currentTransform);
    }

    public async reverse() {
        actionEditorStore.clearClickActions();
        await editorClient.deleteActionTrees(this.subtrees);
        actionTreeSetSelection(this.previousSelectedActionModelId, this.hierachyIds, this.currentTransform);
    }
}
