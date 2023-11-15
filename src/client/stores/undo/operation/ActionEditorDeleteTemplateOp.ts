import { UndoableOperation } from "../UndoableOperation";
import { editorClient } from "../../../communication/EditorClient";
import { executeUndoableOperation } from "../UndoStore";
import { ActionTreeModel, ActionTreeSnapshot } from "../../../../shared/action/ActionTreeModel";
import { actionTreeSetSelection, getCurrentReactFlowInstanceTransform, selectHierarchyFromIds } from "./actionEditorSupport";
import { FlowTransform } from "react-flow-renderer";
import { actionEditorStore } from "../../ActionEditorStore";
import { collectAllSubtreeSnapshots } from "./ActionEditorDeleteSubtreeOp";

export function undoableActionEditorDeleteTemplate(template: ActionTreeModel) {
    const deletedSnapshots = new Array<ActionTreeSnapshot>();
    collectAllSubtreeSnapshots(template, deletedSnapshots);
    executeUndoableOperation(new ActionEditorDeleteTemplateOp(deletedSnapshots));
}

class ActionEditorDeleteTemplateOp extends UndoableOperation {
    private readonly previousActionModelId: string;
    private readonly previousTransform: FlowTransform;

    public constructor(private readonly templateAndSubTrees: ActionTreeSnapshot[]) {
        super("actionEditorDeleteTemplate");
        this.previousActionModelId = actionEditorStore.currentAction?.$modelId;
        this.previousTransform = actionEditorStore.currentActionSelectionTransformForUndo || getCurrentReactFlowInstanceTransform();
    }

    public async execute() {
        actionEditorStore.clearClickActions();
        actionEditorStore.deselectSelectedAction();
        await editorClient.deleteActionTrees(this.templateAndSubTrees);
        selectHierarchyFromIds(null);
    }

    public async reverse() {
        actionEditorStore.clearClickActions();
        await editorClient.unDeleteActionTrees(this.templateAndSubTrees.map(t => t.$modelId));
        actionTreeSetSelection(this.previousActionModelId, [this.templateAndSubTrees[0].$modelId], this.previousTransform);
    }
}
