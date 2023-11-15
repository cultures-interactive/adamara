import { UndoableOperation } from "../UndoableOperation";
import { editorClient } from "../../../communication/EditorClient";
import { executeUndoableOperation } from "../UndoStore";
import { ActionTreeModel, ActionTreeSnapshot } from "../../../../shared/action/ActionTreeModel";
import { actionTreeSetSelection, getCurrentlySelectedHierarchyIds, getCurrentReactFlowInstanceTransform } from "./actionEditorSupport";
import { FlowTransform } from "react-flow-renderer";
import { actionEditorStore } from "../../ActionEditorStore";
import { getSnapshot } from "mobx-keystone";

export function undoableActionEditorDeleteSubtree(subtree: ActionTreeModel) {
    const deletedSnapshots = new Array<ActionTreeSnapshot>();
    collectAllSubtreeSnapshots(subtree, deletedSnapshots);
    executeUndoableOperation(new ActionEditorDeleteSubtreeOp(deletedSnapshots));
}

export function collectAllSubtreeSnapshots(currentTree: ActionTreeModel, results: Array<ActionTreeSnapshot>) {
    results.push(getSnapshot(currentTree));
    currentTree.subtreeActions.forEach(subtree => collectAllSubtreeSnapshots(subtree, results));
}

class ActionEditorDeleteSubtreeOp extends UndoableOperation {
    private currentTransform: FlowTransform;
    private hierachyIds: string[];
    private selectedActionModelId: string;

    public constructor(private readonly subtrees: ActionTreeSnapshot[]) {
        super("actionEditorDeleteSubtree");
        this.currentTransform = getCurrentReactFlowInstanceTransform();
        this.hierachyIds = getCurrentlySelectedHierarchyIds();
        this.selectedActionModelId = actionEditorStore.currentAction?.$modelId;
    }

    public async execute() {
        actionEditorStore.clearClickActions();
        actionEditorStore.deselectSelectedAction();
        await editorClient.deleteActionTrees(this.subtrees);
    }

    public async reverse() {
        actionEditorStore.clearClickActions();
        await editorClient.unDeleteActionTrees(this.subtrees.map(snapshot => snapshot.$modelId));
        actionTreeSetSelection(this.selectedActionModelId, this.hierachyIds, this.currentTransform);
    }
}
