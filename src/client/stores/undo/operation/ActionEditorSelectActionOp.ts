import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { ActionModel } from "../../../../shared/action/ActionModel";
import { FlowTransform } from "react-flow-renderer";
import { getCurrentReactFlowInstanceTransform, getCurrentlySelectedHierarchyIds, actionTreeSetSelection } from "./actionEditorSupport";
import { actionEditorStore } from "../../ActionEditorStore";

export function undoableActionEditorSelectAction(action: ActionModel) {
    actionEditorStore.clearClickActions();

    if (actionEditorStore.currentAction == action)
        return;

    executeUndoableOperation(new ActionEditorSelectActionOp(action?.$modelId));
}

export function undoableActionEditorDeselectAction() {
    undoableActionEditorSelectAction(null);
}

class ActionEditorSelectActionOp extends UndoableOperation {
    private currentTransform: FlowTransform;
    private previousActionModelId: string;
    private previousTransform: FlowTransform;
    private hierachyIds: string[];
    private previousActionTreeHierarchy: string[];

    public constructor(
        private actionModelId: string
    ) {
        super(actionModelId ? "actionEditorSelectAction" : "actionEditorDeselectAction");
        this.previousActionModelId = actionEditorStore.currentAction?.$modelId;
        this.currentTransform = getCurrentReactFlowInstanceTransform();
        this.previousTransform = actionEditorStore.currentActionSelectionTransformForUndo || getCurrentReactFlowInstanceTransform();
        this.previousActionTreeHierarchy = actionEditorStore.currentActionSelectionHierarchyIdsForUndo || getCurrentlySelectedHierarchyIds();
        this.hierachyIds = getCurrentlySelectedHierarchyIds();
    }

    public async execute() {
        actionEditorStore.clearClickActions();
        actionTreeSetSelection(this.actionModelId, this.hierachyIds, this.currentTransform);
    }

    public async reverse() {
        actionEditorStore.clearClickActions();
        actionTreeSetSelection(this.previousActionModelId, this.previousActionTreeHierarchy, this.previousTransform);
    }
}